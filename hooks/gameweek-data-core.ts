/**
 * Pure, DOM-free helpers behind `useGameweekData` (hooks/use-gameweek-data.ts).
 * Split out so the cache-key/stale-response/in-flight-dedup logic can be
 * unit tested without a React/DOM environment — this repo's vitest config
 * (vitest.config.mts) runs tests in `"node"`, not `jsdom`, so anything that
 * needs `useState`/`useEffect` can't be exercised directly in this suite.
 */

/** The module-level cache/in-flight key for one gameweek's data under one hook's `cacheKey`. */
export function gameweekCacheKey(cacheKey: string, gw: number): string {
  return `${cacheKey}:${gw}`;
}

/** Whether `gw` is a fetchable target: a positive integer, and within `[1, currentGameweek]` when known. */
export function isValidGameweek(gw: number, currentGameweek?: number): boolean {
  if (!Number.isInteger(gw) || gw < 1) return false;
  if (currentGameweek !== undefined && gw > currentGameweek) return false;
  return true;
}

/**
 * Tracks the most recently started request per hook instance so a fetch
 * that resolves after the user has since navigated to a different
 * gameweek (or a different hook instance was mounted) can be detected and
 * ignored — "stale-response protection" — rather than clobbering newer
 * state with an out-of-date result.
 */
export class RequestGuard {
  private latest = 0;

  /** Call when starting a new request; returns a token to check on resolution. */
  start(): number {
    this.latest += 1;
    return this.latest;
  }

  /** True if `token` is still the most recently started request. */
  isCurrent(token: number): boolean {
    return token === this.latest;
  }
}

/**
 * Module-level cache shared by every `useGameweekData` instance on a page,
 * namespaced per-hook by the caller-supplied `cacheKey` (see
 * `gameweekCacheKey`). Untyped at this layer — each hook instance only ever
 * reads/writes its own `cacheKey` prefix, so callers cast at the edge the
 * same way `hooks/use-league.ts` used to keep its own typed `Map`.
 */
export const sharedGameweekCache = new Map<string, unknown>();

/**
 * In-flight request de-duplication: concurrent `setGw` calls (from
 * different hook instances, or a re-render before the first request
 * settles) for the same cache key share one underlying `fetcher` call
 * instead of firing it twice.
 */
export const sharedInFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Runs `fetcher()` for `key`, deduping against any in-flight request for
 * the same key. The shared promise is never cached on rejection — it's
 * removed from the in-flight map as soon as it settles either way, so a
 * failed request doesn't poison later attempts.
 */
export function dedupedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = sharedInFlightRequests.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher().finally(() => {
    sharedInFlightRequests.delete(key);
  });
  sharedInFlightRequests.set(key, promise);
  return promise;
}
