/**
 * Shared cache policy (Phase 2.2).
 *
 * Backed by Upstash Redis (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) when
 * configured, falling back to an in-process Map with TTLs otherwise — local
 * dev without Redis and the test suite both work without it. A Redis
 * failure degrades to fetching upstream (logged once), never to a 500, and
 * a rejected `fn()` is never cached.
 */

import { Redis } from "@upstash/redis";
import { cache as reactCache } from "react";
import { countCacheHit, countCacheMiss } from "@/lib/fpl/telemetry";
import type { EventStatusRow, Fixture, BootstrapEvent } from "@/lib/fpl/types";
import type { LiveState } from "@/lib/fpl/ttl";
import * as client from "@/lib/fpl/client";

const KEY_PREFIX = "fpl:v1:";

/** Values are wrapped so a legitimately cached `null`/`undefined` is distinguishable from a cache miss. */
interface Envelope<T> {
  v: T;
}

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

let warnedRedisFailure = false;
function warnRedisFailure(err: unknown): void {
  if (warnedRedisFailure) return;
  warnedRedisFailure = true;
  console.warn("[fpl cache] Redis failed, falling back to fetching upstream directly:", err);
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
 */
export async function cachedMany<T>(
  keys: string[],
  ttlSeconds: number,
  fetchMissing: (missingKeys: string[]) => Promise<Map<string, T>>
): Promise<Map<string, T>> {
  if (keys.length === 0) return new Map();

  const result = new Map<string, T>();
  const redis = getRedis();
  let missingKeys: string[] = [];

  if (redis) {
    const fullKeys = keys.map((k) => KEY_PREFIX + k);
    try {
      const values = await redis.mget<Array<Envelope<T> | null>>(...fullKeys);
      values.forEach((value, i) => {
        if (value !== null && value !== undefined) {
          result.set(keys[i], value.v);
          countCacheHit();
        } else {
          missingKeys.push(keys[i]);
        }
      });
    } catch (err) {
      warnRedisFailure(err);
      missingKeys = [...keys];
    }
  } else {
    for (const key of keys) {
      const cachedValue = memGet<T>(KEY_PREFIX + key);
      if (cachedValue !== undefined) {
        result.set(key, cachedValue.v);
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
      result.set(key, value);
    }

    if (redis) {
      try {
        const pipeline = redis.pipeline();
        for (const [key, value] of fresh) {
          pipeline.set(KEY_PREFIX + key, { v: value } satisfies Envelope<T>, { ex: ttlSeconds });
        }
        await pipeline.exec();
      } catch (err) {
        warnRedisFailure(err);
      }
    } else {
      for (const [key, value] of fresh) {
        memSet(KEY_PREFIX + key, { v: value }, ttlSeconds);
      }
    }
  }

  return result;
}

// --- Live state ---

/** Event-status is cheap and short-lived (60s), so this always uses that TTL. */
export async function getEventStatus(): Promise<EventStatusRow[]> {
  return cached("event-status", 60, () => client.eventStatus());
}

/**
 * "live" when today's event-status row hasn't finished adding bonus, or any
 * fixture in the current gameweek has kicked off and not finished.
 * "checked" when FPL has finalised the current event's data.
 * "quiet" otherwise.
 */
export function computeLiveState(
  eventStatus: EventStatusRow[],
  currentEvent: Pick<BootstrapEvent, "data_checked"> | undefined,
  fixtures: Fixture[]
): LiveState {
  const today = new Date().toISOString().slice(0, 10);
  const todaysRow = eventStatus.find((row) => row.date === today);
  const liveByStatus = todaysRow ? todaysRow.bonus_added === false : false;
  const liveByFixture = fixtures.some((f) => f.started && !f.finished);

  if (liveByStatus || liveByFixture) return "live";
  if (currentEvent?.data_checked) return "checked";
  return "quiet";
}
