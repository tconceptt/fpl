"use client";

import { useGameweekData, type UseGameweekDataResult } from "@/hooks/use-gameweek-data";
import type { GameweekStanding } from "@/types/league";

export interface LeagueApiResponse {
  leagueName: string;
  currentGameweek: number;
  selectedGameweek: number;
  liveState: string;
  standings: GameweekStanding[];
}

type UseLeagueResult = UseGameweekDataResult<LeagueApiResponse>;

async function fetchLeagueGameweek(gw: number): Promise<LeagueApiResponse> {
  const res = await fetch(`/api/league/${gw}`);
  if (!res.ok) throw new Error(`Failed to load gameweek ${gw}`);
  return res.json();
}

/**
 * Client-side gameweek switching for the league table. Thin wrapper over
 * the generic `useGameweekData` (hooks/use-gameweek-data.ts) — same public
 * shape and behaviour as before: seeds the cache with the server-rendered
 * `initial` response (instant first paint), then on `setGw` serves from the
 * cache or fetches `/api/league/[gw]`, and syncs the URL via
 * `history.replaceState`.
 */
export function useLeague(initial: LeagueApiResponse): UseLeagueResult {
  return useGameweekData({
    cacheKey: "league",
    initial,
    initialGw: initial.selectedGameweek,
    currentGameweek: initial.currentGameweek,
    fetcher: fetchLeagueGameweek,
  });
}
