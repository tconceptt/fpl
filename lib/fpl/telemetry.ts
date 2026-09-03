/**
 * Per-request telemetry for upstream FPL calls and Redis cache hits/misses.
 *
 * AsyncLocalStorage-based so it survives across the `await` boundaries of a
 * single page render without needing to be threaded through every function
 * call. `withUpstreamCounter` opens a scope for one request; `countUpstream`,
 * `countCacheHit`, `countCacheMiss` and `countStaleServe` are cheap no-ops
 * outside of one.
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface TelemetryCounters {
  upstream: number;
  cacheHits: number;
  cacheMisses: number;
  /**
   * Reads served from `lib/fpl/cache.ts`'s stale-if-error fallback — the
   * upstream fetch for a kind failed or timed out, and the last stored
   * (past-freshness but not yet physically expired) value was served
   * instead of propagating the error.
   */
  staleServed: number;
}

const storage = new AsyncLocalStorage<TelemetryCounters>();

/** Run `fn` inside a fresh telemetry scope, e.g. once per page render. */
export function withUpstreamCounter<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({ upstream: 0, cacheHits: 0, cacheMisses: 0, staleServed: 0 }, fn);
}

export function countUpstream(n = 1): void {
  const store = storage.getStore();
  if (store) store.upstream += n;
}

export function countCacheHit(n = 1): void {
  const store = storage.getStore();
  if (store) store.cacheHits += n;
}

export function countCacheMiss(n = 1): void {
  const store = storage.getStore();
  if (store) store.cacheMisses += n;
}

/** Count `n` keys served from the stale-if-error fallback (see `TelemetryCounters.staleServed`). */
export function countStaleServe(n = 1): void {
  const store = storage.getStore();
  if (store) store.staleServed += n;
}

export function getTelemetry(): TelemetryCounters | undefined {
  return storage.getStore();
}

/** One-line summary for the current scope, e.g. `[fpl] / upstream=12 cache=8/4 stale=1`. */
export function logTelemetry(path: string): void {
  const t = getTelemetry();
  console.log(
    `[fpl] ${path} upstream=${t?.upstream ?? 0} cache=${t?.cacheHits ?? 0}/${t?.cacheMisses ?? 0} stale=${t?.staleServed ?? 0}`
  );
}
