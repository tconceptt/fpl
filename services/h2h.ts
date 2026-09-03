/**
 * H2H matchups and table (Phase 4.1).
 *
 * The matchup list pairs FPL's fixture list for the gameweek with the league
 * snapshot's per-manager net points, so a card during a live gameweek shows
 * the same number as the league table rather than FPL's lagging
 * `entry_*_points`. H2H scoring is net of transfer hits, which is exactly
 * what `ManagerSnapshot.net_points` holds; for a finished gameweek the two
 * sources agree.
 *
 * `buildH2HMatchups` and `buildH2HTable` are pure and tested against
 * fixtures; `getH2HPage` is the loader the page and bot use.
 */

import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import { getLeagueSnapshot, type LeagueSnapshot, type ManagerSnapshot } from "@/services/league";
import type { H2HMatch, H2HStandings, H2HStandingsRow } from "@/lib/fpl/types";

export type MatchupState = "leading" | "level" | "trailing";

export interface H2HSide {
  /** null for the "AVERAGE" bye opponent in odd-sized leagues. */
  entry: number | null;
  entryName: string;
  playerName: string;
  /** Net gameweek points: live from the snapshot when possible, FPL's recorded score otherwise. */
  points: number;
  /** Classic league rank, for context. null for the bye side or a manager missing from the snapshot. */
  rank: number | null;
  captain: string | null;
  activeChip: string | null;
  playersToStart: number;
}

export interface H2HMatchup {
  id: number;
  home: H2HSide;
  away: H2HSide;
  /** From the home side's perspective. */
  state: MatchupState;
  isBye: boolean;
}

export interface H2HTableRow {
  rank: number;
  lastRank: number;
  entry: number | null;
  entryName: string;
  playerName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsFor: number;
  total: number;
}

export interface H2HPage {
  leagueName: string;
  currentGameweek: number;
  selectedGameweek: number;
  /** True when the matchup scores come from live picks rather than FPL's recorded results. */
  live: boolean;
  /** False when `FPL_H2H_LEAGUE_ID` is unset or the league no longer exists. */
  configured: boolean;
  matchups: H2HMatchup[];
  table: H2HTableRow[];
}

function sideFromMatch(
  entry: number | null,
  entryName: string,
  playerName: string,
  recordedPoints: number,
  managers: Map<number, ManagerSnapshot>
): H2HSide {
  const manager = entry !== null ? managers.get(entry) : undefined;
  return {
    entry,
    entryName: manager?.entry_name ?? entryName,
    playerName: manager?.player_name ?? playerName,
    points: manager ? manager.net_points : recordedPoints,
    rank: manager?.rank ?? null,
    captain: manager?.captain?.web_name ?? null,
    activeChip: manager?.active_chip ?? null,
    playersToStart: manager?.players_to_start ?? 0,
  };
}

export function matchupState(homePoints: number, awayPoints: number): MatchupState {
  if (homePoints > awayPoints) return "leading";
  if (homePoints < awayPoints) return "trailing";
  return "level";
}

/**
 * Pair each H2H fixture with the snapshot's managers. Points come from the
 * snapshot whenever the manager is in it (live during play, FPL's own once
 * finished) and fall back to the match's recorded points otherwise — the
 * bye "AVERAGE" side, or a manager who has left the classic league.
 */
export function buildH2HMatchups(matches: H2HMatch[], managers: ManagerSnapshot[]): H2HMatchup[] {
  const byEntry = new Map(managers.map((m) => [m.entry, m]));

  return matches
    .map((match) => {
      const home = sideFromMatch(
        match.entry_1_entry,
        match.entry_1_name,
        match.entry_1_player_name,
        match.entry_1_points,
        byEntry
      );
      const away = sideFromMatch(
        match.entry_2_entry,
        match.entry_2_name,
        match.entry_2_player_name,
        match.entry_2_points,
        byEntry
      );
      return {
        id: match.id,
        home,
        away,
        state: matchupState(home.points, away.points),
        isBye: match.is_bye === true || match.entry_1_entry === null || match.entry_2_entry === null,
      };
    })
    .sort((a, b) => a.id - b.id);
}

function standingsRows(standings: H2HStandings | null): H2HStandingsRow[] {
  if (!standings?.standings) return [];
  return Array.isArray(standings.standings) ? standings.standings : standings.standings.results ?? [];
}

/** The H2H table in FPL's own order, with the counters normalised to numbers. */
export function buildH2HTable(standings: H2HStandings | null): H2HTableRow[] {
  return standingsRows(standings)
    .map((row) => ({
      rank: row.rank,
      lastRank: row.last_rank ?? row.rank,
      entry: row.entry,
      entryName: row.entry_name,
      playerName: row.player_name ?? "",
      played: row.matches_played ?? 0,
      won: row.matches_won ?? 0,
      drawn: row.matches_drawn ?? 0,
      lost: row.matches_lost ?? 0,
      pointsFor: row.points_for ?? 0,
      total: row.total ?? 0,
    }))
    .sort((a, b) => a.rank - b.rank);
}

export async function getH2HPage(gw?: number): Promise<H2HPage> {
  const snapshot: LeagueSnapshot = await getLeagueSnapshot(gw);
  const selectedGameweek = snapshot.selectedGameweek;
  const leagueId = process.env.FPL_H2H_LEAGUE_ID;

  const base = {
    leagueName: snapshot.leagueName,
    currentGameweek: snapshot.currentGameweek,
    selectedGameweek,
    live: selectedGameweek === snapshot.currentGameweek && snapshot.liveState !== "checked",
  };

  if (!leagueId) {
    return { ...base, configured: false, matchups: [], table: [] };
  }

  // Same keys as the snapshot and /api/h2h — the standings read is a
  // request-memo hit, and the matches read is shared with the API route.
  const [standings, matches] = await Promise.all([
    cachedKind("h2h", `h2h:${leagueId}`, () => client.h2hStandings(leagueId)),
    cachedKind("h2h", `h2h-matches:${leagueId}:${selectedGameweek}`, () =>
      client.h2hMatches(leagueId, selectedGameweek)
    ),
  ]);

  if (!standings) {
    return { ...base, configured: false, matchups: [], table: [] };
  }

  return {
    ...base,
    configured: true,
    matchups: buildH2HMatchups(matches, snapshot.managers),
    table: buildH2HTable(standings),
  };
}
