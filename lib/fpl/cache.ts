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
 */

import { Redis } from "@upstash/redis";
import { cache as reactCache } from "react";
import { countCacheHit, countCacheMiss } from "@/lib/fpl/telemetry";
import type { EventStatusRow } from "@/lib/fpl/types";
import { ttlFor, type LiveState, type TtlKind, type TransfersTtlOptions } from "@/lib/fpl/ttl";
import * as client from "@/lib/fpl/client";

// Bumped in Phase 2.4 (live payload slimming) so no v1 raw `live` payloads —
// or anything else cached under the old prefix — are ever read back.
const KEY_PREFIX = "fpl:v2:";

/** Values are wrapped so a legitimately cached `null`/`undefined` is distinguishable from a cache miss. */
interface Envelope<T> {
  v: T;
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

  if (redis) {
    try {
      const cachedValue = await redis.get<Envelope<T>>(fullKey);
      if (cachedValue !== null && cachedValue !== undefined) {
        countCacheHit();
        return cachedValue.v;
      }
    } catch (err) {
      if (isDynamicServerUsageError(err)) throw err;
      warnRedisFailure(err);
    }
  } else {
    const cachedValue = memGet<T>(fullKey);
    if (cachedValue !== undefined) {
      countCacheHit();
      return cachedValue.v;
    }
  }

  countCacheMiss();
  // Never cache a rejection — let it propagate so callers see the real error.
  const fresh = await fn();

  if (redis) {
    try {
      await redis.set(fullKey, { v: fresh } satisfies Envelope<T>, { ex: ttlSeconds });
    } catch (err) {
      if (isDynamicServerUsageError(err)) throw err;
      warnRedisFailure(err);
    }
  } else {
    memSet(fullKey, { v: fresh }, ttlSeconds);
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

      if (redis) {
        const fullKeys = toFetch.map((k) => KEY_PREFIX + k);
        try {
          const values = await redis.mget<Array<Envelope<T> | null>>(...fullKeys);
          values.forEach((value, i) => {
            if (value !== null && value !== undefined) {
              batchResult.set(toFetch[i], value.v);
              countCacheHit();
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
            batchResult.set(key, cachedValue.v);
            countCacheHit();
          } else {
            missingKeys.push(key);
          }
        }
      }

      if (missingKeys.length > 0) {
        countCacheMiss(missingKeys.length);
        const fresh = await fetchMissing(missingKeys);

        for (const [key, value] of fresh) {
          batchResult.set(key, value);
        }

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
                pipeline.set(KEY_PREFIX + key, { v: value } satisfies Envelope<T>, { ex: ttlSeconds });
              }
              await pipeline.exec();
            } catch (err) {
              if (isDynamicServerUsageError(err)) throw err;
              warnRedisFailure(err);
            }
          } else {
            for (const [key, value] of fresh) {
              memSet(KEY_PREFIX + key, { v: value }, ttlSeconds);
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
