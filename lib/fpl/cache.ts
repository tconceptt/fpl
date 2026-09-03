/**
 * Shared cache policy (Phase 2.2).
 *
 * Backed by Upstash Redis (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) when
 * configured, falling back to an in-process Map with TTLs otherwise — local
 * dev without Redis and the test suite both work without it. A Redis
 * failure degrades to fetching upstream (logged once), never to a 500, and
 * a rejected `fn()` is never cached.
 *
 * TTL selection is centralized here via `cachedKind`/`cachedManyKind` so no
 * call site picks its own TTL (and no two call sites can write the same key
 * with two different TTLs depending on who got there first).
 *
 * Stale-if-error: every value is stored with a *physical* TTL of
 * `max(logicalTtlSeconds, STALE_FLOOR_SECONDS)` — longer than the logical
 * freshness window it was written with (`ttl` in the envelope, `storedAt`
 * for when). A read within `ttl` of `storedAt` is a normal fresh hit. A read
 * past that window but still physically present is *stale but available*:
 * it is not returned directly (a miss is still counted and a fresh fetch
 * attempted, keeping the normal "TTL controls freshness" behaviour), but if
 * the fresh fetch throws — upstream 5xx, timeout, network error — that stale
 * value is served instead of propagating the error, and the serve is
 * recorded via `countStaleServe` (`lib/fpl/telemetry.ts`). A rejection is
 * still never cached: nothing is written back when `fn()`/`fetchMissing`
 * fails, stale or not. When there is no stale value to fall back to, a
 * failure propagates exactly as before.
 */

import { Redis } from "@upstash/redis";
import { cache as reactCache } from "react";
import { countCacheHit, countCacheMiss, countStaleServe } from "@/lib/fpl/telemetry";
import type { EventStatusRow } from "@/lib/fpl/types";
import { ttlFor, type LiveState, type TtlKind, type TransfersTtlOptions } from "@/lib/fpl/ttl";
import * as client from "@/lib/fpl/client";

// Bumped in Phase 2.4 (live payload slimming) so no v1 raw `live` payloads —
// or anything else cached under the old prefix — are ever read back.
const KEY_PREFIX = "fpl:v2:";

/**
 * A physical copy is kept for at least this long regardless of the logical
 * TTL it was written with, so a short-lived kind (e.g. `live` at 30s during
 * a live gameweek) still has a same-day stale-if-error fallback available
 * well after its freshness window has passed.
 */
const STALE_FLOOR_SECONDS = 24 * 60 * 60;

/**
 * Values are wrapped so a legitimately cached `null`/`undefined` is
 * distinguishable from a cache miss, and so freshness (`storedAt`/`ttl`) can
 * be judged independently of Redis's own physical expiry (see the
 * stale-if-error note above).
 */
interface Envelope<T> {
  v: T;
  storedAt: number;
  ttl: number;
}

function isFresh(envelope: Envelope<unknown>): boolean {
  return Date.now() - envelope.storedAt < envelope.ttl * 1000;
}

function wrap<T>(value: T, ttlSeconds: number): Envelope<T> {
  return { v: value, storedAt: Date.now(), ttl: ttlSeconds };
}

function physicalTtl(ttlSeconds: number): number {
  return Math.max(ttlSeconds, STALE_FLOOR_SECONDS);
}

let redisSingleton: Redis | null | undefined;

/** The shared Upstash client, or null when Redis is not configured. Also used by lib/bot-state.ts. */
export function getRedis(): Redis | null {
  if (redisSingleton !== undefined) return redisSingleton;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  redisSingleton = url && token ? new Redis({ url, token }) : null;
  return redisSingleton;
}

let warnedRedisFailure = false;
function warnRedisFailure(err: unknown): void {
  if (warnedRedisFailure) return;
  warnedRedisFailure = true;
  console.warn("[fpl cache] Redis failed, falling back to fetching upstream directly:", err);
}

/**
 * Next throws a special control-flow error (digest `DYNAMIC_SERVER_USAGE`)
 * when a `no-store` fetch happens during static generation, so the route
 * gets marked dynamic instead of prerendered. That is not a Redis failure —
 * rethrow it so Next can act on it, rather than swallowing it as one.
 */
function isDynamicServerUsageError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if ((err as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE") return true;
  return err.message.startsWith("Dynamic server usage");
}

// --- In-process fallback store (no Redis configured) ---

interface MemEntry {
  value: unknown;
  expiresAt: number;
}

const memStore = new Map<string, MemEntry>();

function memGet<T>(key: string): Envelope<T> | undefined {
  const entry = memStore.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    memStore.delete(key);
    return undefined;
  }
  return entry.value as Envelope<T>;
}

function memSet<T>(key: string, value: Envelope<T>, ttlSeconds: number): void {
  memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

// --- Process-wide single-flight: dedupe concurrent misses for the same key. ---

const inflight = new Map<string, Promise<unknown>>();

async function fetchAndStore<T>(fullKey: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const redis = getRedis();
  // A value found but past its logical `ttl` — physically present only
  // because of the longer stale-if-error floor. Held onto so a failed
  // refetch below can fall back to it instead of propagating.
  let staleEnvelope: Envelope<T> | undefined;

  if (redis) {
    try {
      const cachedValue = await redis.get<Envelope<T>>(fullKey);
      if (cachedValue !== null && cachedValue !== undefined) {
        if (isFresh(cachedValue)) {
          countCacheHit();
          return cachedValue.v;
        }
        staleEnvelope = cachedValue;
      }
    } catch (err) {
      if (isDynamicServerUsageError(err)) throw err;
      warnRedisFailure(err);
    }
  } else {
    const cachedValue = memGet<T>(fullKey);
    if (cachedValue !== undefined) {
      if (isFresh(cachedValue)) {
        countCacheHit();
        return cachedValue.v;
      }
      staleEnvelope = cachedValue;
    }
  }

  countCacheMiss();
  // Never cache a rejection — let it propagate so callers see the real
  // error, unless a stale (but still physically present) value can stand
  // in for it instead.
  let fresh: T;
  try {
    fresh = await fn();
  } catch (err) {
    if (staleEnvelope !== undefined) {
      countStaleServe();
      return staleEnvelope.v;
    }
    throw err;
  }

  const envelope = wrap(fresh, ttlSeconds);

  if (redis) {
    try {
      await redis.set(fullKey, envelope satisfies Envelope<T>, { ex: physicalTtl(ttlSeconds) });
    } catch (err) {
      if (isDynamicServerUsageError(err)) throw err;
      warnRedisFailure(err);
    }
  } else {
    memSet(fullKey, envelope, physicalTtl(ttlSeconds));
  }

  return fresh;
}

function dedupedFetch<T>(fullKey: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(fullKey);
  if (existing) return existing as Promise<T>;

  const promise = fetchAndStore(fullKey, ttlSeconds, fn).finally(() => {
    inflight.delete(fullKey);
  });
  inflight.set(fullKey, promise);
  return promise;
}

// --- Request-scoped memo: one request never reads the same key twice. ---
// `reactCache` returns the SAME Map for every call within one render/request
// and a fresh Map for the next one. Outside of a render (e.g. in tests) it
// degrades to "no memo" rather than throwing.
const getRequestMemo = reactCache(() => new Map<string, Promise<unknown>>());

/**
 * Read-through cache: `key` is prefixed with `fpl:v1:`, values are JSON.
 * Concurrent misses for the same key are deduped process-wide, and a single
 * request never reads the same key from Redis twice.
 */
export async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const fullKey = KEY_PREFIX + key;
  const memo = getRequestMemo();

  const existing = memo.get(fullKey);
  if (existing) return existing as Promise<T>;

  const promise = dedupedFetch(fullKey, ttlSeconds, fn);
  memo.set(fullKey, promise);
  return promise;
}

/**
 * Batch read-through cache for a set of keys sharing one TTL — one `MGET`
 * for the batch, then one pipelined write for whatever was missing. This is
 * what picks/history for a 14-manager league use, to stay well inside the
 * Upstash free tier's monthly command budget.
 *
 * Shares the same request-scoped memo as `cached`: a key already read this
 * request (individually, or as part of an earlier batch) is never read from
 * Redis twice, and concurrent batches with overlapping keys dedupe too.
 */
export async function cachedMany<T>(
  keys: string[],
  ttlSeconds: number,
  fetchMissing: (missingKeys: string[]) => Promise<Map<string, T>>
): Promise<Map<string, T>> {
  if (keys.length === 0) return new Map();

  const memo = getRequestMemo();
  const toFetch = keys.filter((key) => !memo.has(KEY_PREFIX + key));

  if (toFetch.length > 0) {
    // Register a placeholder promise for every key in this batch right away,
    // so a concurrent `cached`/`cachedMany` call for the same key in this
    // request dedupes against this batch instead of starting its own.
    let resolveBatch!: () => void;
    let rejectBatch!: (err: unknown) => void;
    const batchSettled = new Promise<void>((resolve, reject) => {
      resolveBatch = resolve;
      rejectBatch = reject;
    });
    const batchResult = new Map<string, T>();

    for (const key of toFetch) {
      memo.set(
        KEY_PREFIX + key,
        batchSettled.then(() => batchResult.get(key) as T)
      );
    }

    try {
      const redis = getRedis();
      let missingKeys: string[] = [];

      // Keys found but past their logical `ttl` — physically present only
      // because of the longer stale-if-error floor. Treated as misses for
      // freshness purposes, but held onto so a `fetchMissing` failure (or
      // partial success — a per-key try/catch inside `fetchMissing` that
      // simply omits a failed entry) can fall back to them below.
      const staleValues = new Map<string, T>();

      if (redis) {
        const fullKeys = toFetch.map((k) => KEY_PREFIX + k);
        try {
          const values = await redis.mget<Array<Envelope<T> | null>>(...fullKeys);
          values.forEach((value, i) => {
            if (value !== null && value !== undefined) {
              if (isFresh(value)) {
                batchResult.set(toFetch[i], value.v);
                countCacheHit();
              } else {
                staleValues.set(toFetch[i], value.v);
                missingKeys.push(toFetch[i]);
              }
            } else {
              missingKeys.push(toFetch[i]);
            }
          });
        } catch (err) {
          if (isDynamicServerUsageError(err)) throw err;
          warnRedisFailure(err);
          missingKeys = [...toFetch];
        }
      } else {
        for (const key of toFetch) {
          const cachedValue = memGet<T>(KEY_PREFIX + key);
          if (cachedValue !== undefined) {
            if (isFresh(cachedValue)) {
              batchResult.set(key, cachedValue.v);
              countCacheHit();
            } else {
              staleValues.set(key, cachedValue.v);
              missingKeys.push(key);
            }
          } else {
            missingKeys.push(key);
          }
        }
      }

      if (missingKeys.length > 0) {
        countCacheMiss(missingKeys.length);

        let fresh: Map<string, T>;
        try {
          fresh = await fetchMissing(missingKeys);
        } catch (err) {
          // A full-batch failure with no stale fallback anywhere must still
          // propagate — never silently return an incomplete result. With at
          // least one stale value available, fall through to the same
          // "missing from fresh" stale-serve logic below instead.
          if (staleValues.size === 0) throw err;
          fresh = new Map();
        }

        for (const [key, value] of fresh) {
          batchResult.set(key, value);
        }

        // Stale-if-error: any requested key that fetchMissing did not
        // resolve — whether the whole call threw above, or (more commonly)
        // its own per-key try/catch just omitted a failed entry — falls
        // back to the last stored value, if one is still physically
        // present. Never re-stored: it keeps aging from its original
        // `storedAt` so the next read attempts a fresh fetch again.
        let staleServed = 0;
        for (const key of missingKeys) {
          if (fresh.has(key)) continue;
          const stale = staleValues.get(key);
          if (stale !== undefined) {
            batchResult.set(key, stale);
            staleServed++;
          }
        }
        if (staleServed > 0) countStaleServe(staleServed);

        // A `fetchMissing` that resolves everything to nothing to write —
        // e.g. every entry in the batch 404s, as happens for an
        // out-of-range gameweek — must not touch Redis at all: an empty
        // pipeline throws on `.exec()`, which would otherwise be
        // misreported as a Redis failure and (once) suppress the real
        // warning for the rest of the process.
        if (fresh.size > 0) {
          if (redis) {
            try {
              const pipeline = redis.pipeline();
              for (const [key, value] of fresh) {
                pipeline.set(KEY_PREFIX + key, wrap(value, ttlSeconds) satisfies Envelope<T>, {
                  ex: physicalTtl(ttlSeconds),
                });
              }
              await pipeline.exec();
            } catch (err) {
              if (isDynamicServerUsageError(err)) throw err;
              warnRedisFailure(err);
            }
          } else {
            for (const [key, value] of fresh) {
              memSet(KEY_PREFIX + key, wrap(value, ttlSeconds), physicalTtl(ttlSeconds));
            }
          }
        }
      }

      resolveBatch();
    } catch (err) {
      // Never cache a rejection, and don't leave dangling memo promises for
      // keys this batch failed to resolve.
      for (const key of toFetch) memo.delete(KEY_PREFIX + key);
      rejectBatch(err);
      throw err;
    }
  }

  const result = new Map<string, T>();
  await Promise.all(
    keys.map(async (key) => {
      result.set(key, (await memo.get(KEY_PREFIX + key)) as T);
    })
  );
  return result;
}

// --- Live state ---

/** Event-status is cheap and short-lived (60s), so this always uses that TTL. */
export async function getEventStatus(): Promise<EventStatusRow[]> {
  return cached("event-status", 60, () => client.eventStatus());
}

/**
 * The event-status-only half of live state: "live" if any row hasn't
 * finished adding bonus yet, "quiet" otherwise. Bootstrap's own TTL uses
 * this — not the full 3-state `getLiveState` — because bootstrap's TTL
 * table gives "quiet" and "checked" the same value (5 minutes), so this
 * loses no information while avoiding "bootstrap's TTL depends on
 * bootstrap" circularity.
 */
async function getEventStatusLiveState(): Promise<"live" | "quiet"> {
  const eventStatus = await getEventStatus();
  return eventStatus.some((row) => row.bonus_added === false) ? "live" : "quiet";
}

/**
 * "live" when any event-status row hasn't finished adding bonus. "checked"
 * when FPL has finalised the current bootstrap event's data. "quiet"
 * otherwise. Deliberately fixture-free — fixtures are still read directly
 * by services/league.ts to decide `useLiveForCurrent`, which is a separate
 * concern from cache TTLs.
 *
 * Memoised per request: every `cachedKind`/`cachedManyKind` call in one
 * request resolves state once.
 */
export const getLiveState = reactCache(async (): Promise<LiveState> => {
  const [state, bootstrap] = await Promise.all([
    getEventStatusLiveState(),
    cachedKind("bootstrap", "bootstrap", () => client.bootstrap()),
  ]);
  if (state === "live") return "live";

  const currentEvent =
    bootstrap.events.find((e) => e.is_current) ??
    bootstrap.events.find((e) => e.is_next) ??
    [...bootstrap.events].reverse().find((e) => e.finished);

  return currentEvent?.data_checked ? "checked" : "quiet";
});

async function getNextDeadline(): Promise<Date | null> {
  const bootstrap = await cachedKind("bootstrap", "bootstrap", () => client.bootstrap());
  const next = bootstrap.events.find((e) => e.is_next);
  if (next?.deadline_time) return new Date(next.deadline_time);

  const current = bootstrap.events.find((e) => e.is_current);
  if (current?.deadline_time && !current.finished) return new Date(current.deadline_time);

  return null;
}

/**
 * `cached`, but the TTL is resolved internally from `kind` and the league's
 * current live state — no call site picks its own TTL, so the same key is
 * never written with two different TTLs depending on who got there first.
 */
export async function cachedKind<T>(
  kind: TtlKind,
  key: string,
  fn: () => Promise<T>,
  opts: TransfersTtlOptions = {}
): Promise<T> {
  const ttl = await resolveTtl(kind, opts);
  return cached(key, ttl, fn);
}

/** `cachedMany`, with the TTL resolved the same way as `cachedKind`. */
export async function cachedManyKind<T>(
  kind: TtlKind,
  keys: string[],
  fetchMissing: (missingKeys: string[]) => Promise<Map<string, T>>
): Promise<Map<string, T>> {
  const ttl = await resolveTtl(kind);
  return cachedMany(keys, ttl, fetchMissing);
}

/**
 * Exposed (Phase 2.4) so API routes can compute the same TTL they cached
 * with, for the `Cache-Control: s-maxage` header — without duplicating the
 * per-kind live-state logic above.
 */
export async function resolveTtl(kind: TtlKind, opts: TransfersTtlOptions = {}): Promise<number> {
  if (kind === "eventStatus") {
    // ttlFor("eventStatus", *) is 60s regardless of state, and resolving
    // state here would call back into getEventStatus — skip the round trip.
    return ttlFor("eventStatus", "quiet");
  }

  if (kind === "bootstrap") {
    // See getEventStatusLiveState's doc comment for why this avoids the
    // circular "bootstrap's TTL needs bootstrap" dependency.
    const state = await getEventStatusLiveState();
    return ttlFor("bootstrap", state);
  }

  if (kind === "transfers") {
    const [state, nextDeadline] = await Promise.all([
      getLiveState(),
      opts.nextDeadline !== undefined ? Promise.resolve(opts.nextDeadline) : getNextDeadline(),
    ]);
    return ttlFor("transfers", state, { nextDeadline, now: opts.now });
  }

  const state = await getLiveState();
  return ttlFor(kind, state);
}
