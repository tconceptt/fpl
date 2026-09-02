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
 * Fetch order: bootstrap + standings + H2H + event-status in parallel, then
 * history and picks for every manager via `cachedMany`, then live +
 * fixtures only when the selected gameweek is the current, unfinished one.
 */

import * as client from "@/lib/fpl/client";
import { cached, cachedMany, computeLiveState, getEventStatus } from "@/lib/fpl/cache";
import { ttlFor, type LiveState } from "@/lib/fpl/ttl";
import { buildLivePointsMap, countPlayersToStart, sumPicks } from "@/services/fpl-live";
import type {
  BootstrapEvent,
  Fixture,
  H2HStandings,
  LiveGameweekData,
  TeamDetails,
  TeamHistory,
} from "@/lib/fpl/types";

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

async function getH2HRanksSnapshot(): Promise<Map<number, number>> {
  const leagueId = process.env.FPL_H2H_LEAGUE_ID;
  const ranks = new Map<number, number>();
  if (!leagueId) return ranks;

  let data: H2HStandings | null;
  try {
    data = await cached(`h2h:${leagueId}`, ttlFor("h2h", "quiet"), () =>
      client.h2hStandings(leagueId)
    );
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
  const ttl = ttlFor("history", "quiet"); // constant across live states
  const byKey = await cachedMany<TeamHistory>(keys, ttl, async (missingKeys) => {
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
async function fetchPicks(
  entries: number[],
  gw: number,
  liveState: LiveState
): Promise<Map<number, TeamDetails>> {
  const keys = entries.map((entry) => `picks:${entry}:${gw}`);
  const ttl = ttlFor("picks", liveState);
  const byKey = await cachedMany<TeamDetails>(keys, ttl, async (missingKeys) => {
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

export async function getLeagueSnapshot(gw?: number): Promise<LeagueSnapshot> {
  const leagueId = process.env.FPL_LEAGUE_ID;
  if (!leagueId) {
    throw new Error("FPL_LEAGUE_ID environment variable is not set.");
  }

  // Bootstrap, standings, H2H and event-status all in parallel. Bootstrap's
  // TTL genuinely depends on live state (60s live vs 5min otherwise), but
  // that state can only be known once bootstrap itself has told us the
  // current gameweek — so the very first read of a cold cache uses the
  // "quiet" TTL for bootstrap. Once warm, subsequent requests within that
  // window keep reading the same cached copy regardless.
  const [bootstrap, standings, h2hRanks, eventStatus] = await Promise.all([
    cached("bootstrap", ttlFor("bootstrap", "quiet"), () => client.bootstrap()),
    cached(`standings:${leagueId}`, ttlFor("standings", "quiet"), () =>
      client.classicStandings(leagueId)
    ),
    getH2HRanksSnapshot(),
    getEventStatus(),
  ]);

  const currentEvent = findCurrentEvent(bootstrap.events);
  const currentGameweek = currentEvent ? currentEvent.id : 1;
  const selectedGameweek = gw ?? currentGameweek;
  const isCurrentGameweek = selectedGameweek === currentGameweek;

  const teamIds = standings.standings.results.map((t) => t.entry);
  const playersMap = new Map(bootstrap.elements.map((el) => [el.id, el]));

  // Fixtures (and therefore precise live state) only matter for the current
  // gameweek — a historical gameweek is always "checked" or "quiet".
  let fixtures: Fixture[] = [];
  let liveState: LiveState;
  if (isCurrentGameweek) {
    fixtures = await cached(`fixtures:${selectedGameweek}`, ttlFor("fixtures", "quiet"), () =>
      client.fixtures(selectedGameweek)
    );
    liveState = computeLiveState(eventStatus, currentEvent, fixtures);
  } else {
    liveState = currentEvent?.data_checked ? "checked" : "quiet";
  }

  const finishedAllFixtures = fixtures.length > 0 && fixtures.every((f) => f.finished);
  const useLiveForCurrent = isCurrentGameweek && !finishedAllFixtures;

  const [histories, picks] = await Promise.all([
    fetchHistories(teamIds),
    fetchPicks(teamIds, selectedGameweek, liveState),
  ]);

  let liveData: LiveGameweekData = { elements: [] };
  if (useLiveForCurrent) {
    liveData = await cached(`live:${selectedGameweek}`, ttlFor("live", liveState), () =>
      client.live(selectedGameweek)
    );
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
      isCurrentGameweek && teamPicks
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

  // Previous ranks, from each manager's total_points at gw - 1.
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
  }

  managers.sort((a, b) => b.total_points - a.total_points);
  managers.forEach((m, i) => {
    m.rank = i + 1;
  });

  return {
    leagueName: standings.league.name,
    currentGameweek,
    selectedGameweek,
    liveState,
    managers,
  };
}
