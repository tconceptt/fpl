"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameweekStanding } from "@/types/league";

export interface LeagueApiResponse {
  leagueName: string;
  currentGameweek: number;
  selectedGameweek: number;
  liveState: string;
  standings: GameweekStanding[];
}

/**
 * Module-level cache of `/api/league/[gw]` responses, keyed by gameweek.
 * Shared across every `useLeague` instance on the page so switching back
 * to a gameweek already visited this session is instant, and survives
 * remounts of the league table within the same page load.
 */
const leagueCache = new Map<number, LeagueApiResponse>();

interface UseLeagueResult {
  data: LeagueApiResponse;
  gw: number;
  setGw: (gw: number) => void;
  loading: boolean;
  error: string | null;
}

/**
 * Client-side gameweek switching for the league table. Seeds the cache with
 * the server-rendered `initial` response (instant first paint), then on
 * `setGw` serves from the cache or fetches `/api/league/[gw]`, and syncs the
 * URL via `history.replaceState` — no server round trip, and the `?gw=`
 * link stays shareable (Next 15 keeps `useSearchParams` in sync with native
 * history calls).
 */
export function useLeague(initial: LeagueApiResponse): UseLeagueResult {
  if (!leagueCache.has(initial.selectedGameweek)) {
    leagueCache.set(initial.selectedGameweek, initial);
  }

  const [gw, setGwState] = useState(initial.selectedGameweek);
  const [data, setData] = useState<LeagueApiResponse>(
    leagueCache.get(initial.selectedGameweek) ?? initial
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const setGw = useCallback((nextGw: number) => {
    if (nextGw === gw) return;

    setGwState(nextGw);
    setError(null);

    const params = new URLSearchParams(window.location.search);
    params.set("gw", String(nextGw));
    window.history.replaceState(null, "", `?${params.toString()}`);

    const cached = leagueCache.get(nextGw);
    if (cached) {
      setData(cached);
      return;
    }

    const thisRequest = ++requestId.current;
    setLoading(true);
    fetch(`/api/league/${nextGw}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load gameweek ${nextGw}`);
        return res.json();
      })
      .then((json: LeagueApiResponse) => {
        if (requestId.current !== thisRequest) return;
        leagueCache.set(nextGw, json);
        setData(json);
      })
      .catch((err) => {
        if (requestId.current !== thisRequest) return;
        setError(err instanceof Error ? err.message : "Failed to load gameweek");
      })
      .finally(() => {
        if (requestId.current !== thisRequest) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gw]);

  // If the server re-renders with a different initial snapshot (e.g. the
  // page itself was navigated to a new `?gw=`), pick that up too.
  useEffect(() => {
    if (initial.selectedGameweek !== gw && !leagueCache.has(initial.selectedGameweek)) {
      leagueCache.set(initial.selectedGameweek, initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return { data, gw, setGw, loading, error };
}
