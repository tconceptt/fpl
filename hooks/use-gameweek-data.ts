"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  dedupedFetch,
  gameweekCacheKey,
  isValidGameweek,
  RequestGuard,
  sharedGameweekCache,
} from "@/hooks/gameweek-data-core";

export interface UseGameweekDataOptions<T> {
  /**
   * Namespaces this hook's module-level cache/in-flight entries from any
   * other `useGameweekData` caller sharing the same cache (e.g. `"league"`,
   * `"h2h"`). Combined with `gw` as `${cacheKey}:${gw}`.
   */
  cacheKey: string;
  /** Server-rendered payload for `initialGw`, seeded into the cache for an instant first paint. */
  initial: T;
  initialGw: number;
  /**
   * Used to bound `setGw`: a target beyond `currentGameweek` (or below 1,
   * or non-integer) is ignored rather than fetched. Omit to skip this check.
   */
  currentGameweek?: number;
  fetcher: (gw: number) => Promise<T>;
  /** Query-string param name synced via `history.replaceState`. Defaults to `"gw"`. */
  param?: string;
}

export interface UseGameweekDataResult<T> {
  data: T;
  gw: number;
  setGw: (gw: number) => void;
  loading: boolean;
  error: string | null;
}

/**
 * Generic client-side gameweek switching, factored out of the league
 * table's original `useLeague` (hooks/use-league.ts, now a thin wrapper over
 * this). Seeds a module-level cache with the server-rendered `initial`
 * response (instant first paint), then on `setGw` serves from the cache or
 * calls `fetcher(gw)`, syncing the URL via `history.replaceState` — no
 * server round trip, and the `?gw=` link stays shareable (Next 15 keeps
 * `useSearchParams` in sync with native history calls).
 *
 * Also de-dupes concurrent in-flight requests for the same gameweek across
 * hook instances (`dedupedFetch`), and guards against a stale response
 * (a fetch that resolves after the user has since switched to a different
 * gameweek) clobbering newer state.
 */
export function useGameweekData<T>(options: UseGameweekDataOptions<T>): UseGameweekDataResult<T> {
  const { cacheKey, initial, initialGw, currentGameweek, fetcher, param = "gw" } = options;

  const initialCacheKey = gameweekCacheKey(cacheKey, initialGw);
  if (!sharedGameweekCache.has(initialCacheKey)) {
    sharedGameweekCache.set(initialCacheKey, initial);
  }

  const [gw, setGwState] = useState(initialGw);
  const [data, setData] = useState<T>((sharedGameweekCache.get(initialCacheKey) as T | undefined) ?? initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardRef = useRef<RequestGuard | null>(null);
  if (!guardRef.current) guardRef.current = new RequestGuard();

  const setGw = useCallback(
    (nextGw: number) => {
      if (nextGw === gw) return;
      if (!isValidGameweek(nextGw, currentGameweek)) return;

      setGwState(nextGw);
      setError(null);

      const params = new URLSearchParams(window.location.search);
      params.set(param, String(nextGw));
      window.history.replaceState(null, "", `?${params.toString()}`);

      const key = gameweekCacheKey(cacheKey, nextGw);
      const cachedValue = sharedGameweekCache.get(key);
      if (cachedValue !== undefined) {
        setData(cachedValue as T);
        return;
      }

      const token = guardRef.current!.start();
      setLoading(true);

      dedupedFetch(key, () => fetcher(nextGw))
        .then((result) => {
          if (!guardRef.current!.isCurrent(token)) return;
          sharedGameweekCache.set(key, result);
          setData(result as T);
        })
        .catch((err) => {
          if (!guardRef.current!.isCurrent(token)) return;
          setError(err instanceof Error ? err.message : `Failed to load gameweek ${nextGw}`);
        })
        .finally(() => {
          if (!guardRef.current!.isCurrent(token)) return;
          setLoading(false);
        });
    },
    [gw, cacheKey, currentGameweek, fetcher, param]
  );

  // If the server re-renders with a different initial payload (e.g. the
  // page itself was navigated to a new `?gw=`), pick that up too.
  useEffect(() => {
    const key = gameweekCacheKey(cacheKey, initialGw);
    if (initialGw !== gw && !sharedGameweekCache.has(key)) {
      sharedGameweekCache.set(key, initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, initialGw, cacheKey]);

  return { data, gw, setGw, loading, error };
}
