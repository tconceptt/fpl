/**
 * One snapshot for every page (Phase 2.3).
 *
 * `getLeagueSnapshot(gw)` is the single source of truth for the league
 * table, the gameweek page, the dashboard and the stats hub. It preserves
 * the scoring semantics of the old services/league-service-optimized.ts:
 * live totals for the current, unfinished gameweek (`useLiveForCurrent`),
 * history totals otherwise, and ranks/`last_rank` derived from each
 * manager's `total_points` at the selected and previous gameweek.
 *
 * Fetch order: bootstrap + standings + H2H in parallel, then history for
 * every manager via `cachedManyKind`, then — unless the caller opted out
 * with `includePicks: false` — fixtures + picks (+ live, when the
 * gameweek is live) too. Stats pages only ever read a manager's history and
 * chips, so they pass `includePicks: false` to skip fetching 14 managers'
 * picks (and fixtures/live) for fields they never look at.
 *
 * `getLeagueSnapshot` itself is memoised per request (React `cache()`,
 * keyed on the two plain arguments below) so calling it more than once in
 * the same request — e.g. the dashboard calling it directly and via
 * `getStatsData` — does the work exactly once.
 */

import { cache as reactCache } from "react";
import * as client from "@/lib/fpl/client";
import { cachedKind, cachedManyKind, getLiveState } from "@/lib/fpl/cache";
import type { LiveState } from "@/lib/fpl/ttl";
import { buildLivePointsMap, countPlayersToStart, sumPicks } from "@/services/fpl-live";
import type {
  BootstrapEvent,
  Fixture,
  H2HStandings,
  LiveGameweekData,
  TeamDetails,
  TeamHistory,
} from "@/lib/fpl/types";
import type { GameweekStanding } from "@/types/league";

export interface ManagerSnapshot {
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  last_rank: number;
  /** Gross gameweek points (live when the gameweek is live, else FPL's own). */
  event_total: number;
  /** `event_total` minus this gameweek's transfer hit. */
  net_points: number;
  /** Season total through the selected gameweek, net of hits. */
  total_points: number;
  transfer_cost: number;
  captain: { id: number; web_name: string } | null;
  active_chip: string | null;
  players_to_start: number;
  h2h_rank: number | null;
  /** Every gameweek's history row, for stats pages that need the full season. */
  history: TeamHistory["current"];
  chips: TeamHistory["chips"];
}

export interface LeagueSnapshot {
  leagueName: string;
  currentGameweek: number;
  selectedGameweek: number;
  liveState: LiveState;
  managers: ManagerSnapshot[];
}

export interface GetLeagueSnapshotOptions {
  /**
   * Fetch picks (and therefore fixtures/live, captain, active_chip,
   * players_to_start, and live gameweek totals) for every manager.
   * Defaults to true. Stats pages, which only read `history`/`chips`,
   * should pass `false` — it skips 14 picks calls plus fixtures and live.
   */
  includePicks?: boolean;
}

/**
 * Thrown by `getLeagueSnapshot` when `gw` is out of range — before any
 * per-manager fetching. Pages that call `getLeagueSnapshot` directly with
 * an unvalidated gw (app/page.tsx, app/gameweek/page.tsx) should catch
 * this and call `notFound()`; the API routes already validate `gw` against
 * the current gameweek before calling the snapshot, so they never trigger
 * it.
 */
export class InvalidGameweekError extends Error {
  constructor(gw: number, currentGameweek: number) {
    super(`Invalid gameweek ${gw}: current gameweek is ${currentGameweek}`);
    this.name = "InvalidGameweekError";
  }
}

async function getH2HRanksSnapshot(): Promise<Map<number, number>> {
  const leagueId = process.env.FPL_H2H_LEAGUE_ID;
  const ranks = new Map<number, number>();
  if (!leagueId) return ranks;

  let data: H2HStandings | null;
  try {
    data = await cachedKind("h2h", `h2h:${leagueId}`, () => client.h2hStandings(leagueId));
  } catch (error) {
    console.error("Failed to fetch H2H standings:", error);
    return ranks;
  }

  if (!data?.standings) return ranks;

  const results = Array.isArray(data.standings) ? data.standings : data.standings.results ?? [];
  for (const team of results) {
    if (typeof team.entry !== "number") continue;
    ranks.set(team.entry, team.rank);
  }
  return ranks;
}

/** History for every manager, batched through one MGET / pipeline. */
async function fetchHistories(entries: number[]): Promise<Map<number, TeamHistory>> {
  const keys = entries.map((entry) => `history:${entry}`);
  const byKey = await cachedManyKind<TeamHistory>("history", keys, async (missingKeys) => {
    const fetched = new Map<string, TeamHistory>();
    await Promise.all(
      missingKeys.map(async (key) => {
        const entry = Number(key.split(":")[1]);
        try {
          fetched.set(key, await client.history(entry));
        } catch (error) {
          console.error(`Failed to fetch history for ${entry}:`, error);
        }
      })
    );
    return fetched;
  });

  const byEntry = new Map<number, TeamHistory>();
  for (const [key, value] of byKey) {
    byEntry.set(Number(key.split(":")[1]), value);
  }
  return byEntry;
}

/** Picks for every manager at one gameweek, batched through one MGET / pipeline. */
async function fetchPicks(entries: number[], gw: number): Promise<Map<number, TeamDetails>> {
  const keys = entries.map((entry) => `picks:${entry}:${gw}`);
  const byKey = await cachedManyKind<TeamDetails>("picks", keys, async (missingKeys) => {
    const fetched = new Map<string, TeamDetails>();
    await Promise.all(
      missingKeys.map(async (key) => {
        const [, entryStr, gwStr] = key.split(":");
        try {
          fetched.set(key, await client.picks(Number(entryStr), Number(gwStr)));
        } catch (error) {
          console.error(`Failed to fetch picks for ${entryStr} gw${gwStr}:`, error);
        }
      })
    );
    return fetched;
  });

  const byEntry = new Map<number, TeamDetails>();
  for (const [key, value] of byKey) {
    byEntry.set(Number(key.split(":")[1]), value);
  }
  return byEntry;
}

function findCurrentEvent(events: BootstrapEvent[]): BootstrapEvent | undefined {
  return (
    events.find((e) => e.is_current) ??
    events.find((e) => e.is_next) ??
    [...events].reverse().find((e) => e.finished)
  );
}

async function computeLeagueSnapshot(gw: number | undefined, includePicks: boolean): Promise<LeagueSnapshot> {
  const leagueId = process.env.FPL_LEAGUE_ID;
  if (!leagueId) {
    throw new Error("FPL_LEAGUE_ID environment variable is not set.");
  }

  const [bootstrap, standings, h2hRanks, liveState] = await Promise.all([
    cachedKind("bootstrap", "bootstrap", () => client.bootstrap()),
    cachedKind("standings", `standings:${leagueId}`, () => client.classicStandings(leagueId)),
    getH2HRanksSnapshot(),
    getLiveState(),
  ]);

  const currentEvent = findCurrentEvent(bootstrap.events);
  const currentGameweek = currentEvent ? currentEvent.id : 1;

  // Validated here, before any per-manager fan-out (history/picks/fixtures)
  // — an out-of-range gw would otherwise still trigger 14 history calls
  // and (with includePicks) 14 more picks calls, all for data the caller
  // is about to discard via notFound().
  if (gw !== undefined && (gw < 1 || gw > currentGameweek)) {
    throw new InvalidGameweekError(gw, currentGameweek);
  }

  const selectedGameweek = gw ?? currentGameweek;
  const isCurrentGameweek = selectedGameweek === currentGameweek;

  const teamIds = standings.standings.results.map((t) => t.entry);
  const playersMap = new Map(bootstrap.elements.map((el) => [el.id, el]));

  // Fixtures only matter for deciding `useLiveForCurrent` for the current
  // gameweek, and only when the caller actually wants picks/live totals.
  let fixtures: Fixture[] = [];
  if (includePicks && isCurrentGameweek) {
    fixtures = await cachedKind("fixtures", `fixtures:${selectedGameweek}`, () =>
      client.fixtures(selectedGameweek)
    );
  }

  const finishedAllFixtures = fixtures.length > 0 && fixtures.every((f) => f.finished);
  const useLiveForCurrent = includePicks && isCurrentGameweek && !finishedAllFixtures;

  const [histories, picks] = await Promise.all([
    fetchHistories(teamIds),
    includePicks ? fetchPicks(teamIds, selectedGameweek) : Promise.resolve(new Map<number, TeamDetails>()),
  ]);

  let liveData: LiveGameweekData = { elements: [] };
  if (useLiveForCurrent) {
    liveData = await cachedKind("live", `live:${selectedGameweek}`, () => client.live(selectedGameweek));
  }
  const livePointsMap = buildLivePointsMap(liveData);

  const managers: ManagerSnapshot[] = [];

  for (const teamId of teamIds) {
    const history = histories.get(teamId);
    if (!history) continue;

    const gwData = history.current.find((g) => g.event === selectedGameweek);
    if (!gwData) continue;

    const team = standings.standings.results.find((t) => t.entry === teamId);
    if (!team) continue;

    const teamPicks = picks.get(teamId);

    const event_total =
      useLiveForCurrent && teamPicks ? sumPicks(teamPicks.picks, livePointsMap) : gwData.points;

    const transferCost =
      useLiveForCurrent && teamPicks
        ? teamPicks.entry_history.event_transfers_cost
        : gwData.event_transfers_cost ?? 0;

    const net_points = event_total - transferCost;

    const previousGWData =
      selectedGameweek > 1 ? history.current.find((g) => g.event === selectedGameweek - 1) : null;
    const previousGWTotal = previousGWData?.total_points ?? 0;

    const total_points = useLiveForCurrent ? previousGWTotal + net_points : gwData.total_points;

    const captainPick = teamPicks?.picks.find((p) => p.is_captain);
    const captainPlayer = captainPick ? playersMap.get(captainPick.element) : undefined;

    const playersToStart =
      includePicks && isCurrentGameweek && teamPicks
        ? countPlayersToStart(teamPicks.picks, liveData, fixtures, playersMap)
        : 0;

    managers.push({
      entry: teamId,
      entry_name: team.entry_name,
      player_name: team.player_name,
      rank: 0,
      last_rank: 0,
      event_total,
      net_points,
      total_points,
      transfer_cost: transferCost,
      captain: captainPlayer ? { id: captainPlayer.id, web_name: captainPlayer.web_name } : null,
      active_chip: teamPicks?.active_chip ?? null,
      players_to_start: playersToStart,
      h2h_rank: h2hRanks.get(teamId) ?? null,
      history: history.current,
      chips: history.chips,
    });
  }

  // Final ranks, before last_rank so its fallback below can use the real
  // current rank rather than the placeholder 0 every manager was pushed
  // with.
  managers.sort((a, b) => b.total_points - a.total_points);
  managers.forEach((m, i) => {
    m.rank = i + 1;
  });

  // Previous ranks, from each manager's total_points at gw - 1. At gw 1
  // there is no previous gameweek, and a manager can be missing gw - 1
  // history entirely — both cases mean "no movement", so last_rank mirrors
  // the current rank rather than reading as a false full-field fall
  // against the placeholder 0.
  if (selectedGameweek > 1) {
    const previousStandings = teamIds
      .map((teamId) => {
        const prev = histories.get(teamId)?.current.find((g) => g.event === selectedGameweek - 1);
        return prev ? { entry: teamId, total_points: prev.total_points } : null;
      })
      .filter((s): s is { entry: number; total_points: number } => s !== null)
      .sort((a, b) => b.total_points - a.total_points);

    const previousRanks = new Map<number, number>(
      previousStandings.map((s, i) => [s.entry, i + 1])
    );

    managers.forEach((m) => {
      m.last_rank = previousRanks.get(m.entry) ?? m.rank;
    });
  } else {
    managers.forEach((m) => {
      m.last_rank = m.rank;
    });
  }

  return {
    leagueName: standings.league.name,
    currentGameweek,
    selectedGameweek,
    liveState,
    managers,
  };
}

// Memoised per request on plain primitive arguments — an object argument
// (e.g. `{ includePicks: false }`) would be a fresh reference on every call
// and defeat React's per-argument memoization.
const getLeagueSnapshotMemoized = reactCache(computeLeagueSnapshot);

export function getLeagueSnapshot(
  gw?: number,
  opts: GetLeagueSnapshotOptions = {}
): Promise<LeagueSnapshot> {
  return getLeagueSnapshotMemoized(gw, opts.includePicks ?? true);
}

/**
 * The mapping from a snapshot's managers to the shape the league table (and
 * `/api/league/[gw]`, Phase 2.4) render. Factored out of app/page.tsx so the
 * page and the route build the exact same standings from the exact same
 * snapshot.
 */
export function toStandings(snapshot: LeagueSnapshot): GameweekStanding[] {
  return snapshot.managers.map((m) => ({
    entry: m.entry,
    entry_name: m.entry_name,
    player_name: m.player_name,
    event_total: m.event_total,
    total_points: m.total_points,
    net_points: m.net_points,
    rank: m.rank,
    last_rank: m.last_rank,
    captain_name: m.captain?.web_name,
    active_chip: m.active_chip,
    transfer_cost: m.transfer_cost,
    playersToStart: m.players_to_start,
    h2h_rank: m.h2h_rank ?? undefined,
  }));
}
