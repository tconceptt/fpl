/**
 * Data for the team page, rewired (Phase 2.3) onto the one FPL client and
 * shared cache instead of the old per-request RequestScopedCache.
 */

import * as client from "@/lib/fpl/client";
import { cached } from "@/lib/fpl/cache";
import { ttlFor } from "@/lib/fpl/ttl";
import { buildTeamBreakdown, PlayerBreakdown as LivePlayerBreakdown } from "@/services/fpl-live";
import type { BootstrapPlayer, BootstrapTeam } from "@/lib/fpl/types";

/** A live breakdown row with the player's name resolved. */
export type PlayerBreakdown = LivePlayerBreakdown & { name: string };

export interface TeamPageData {
  teamId: string;
  teamName: string;
  managerName: string;
  overallRank: number | null;
  h2hRank: number | null;
  transfers: number;
  transferCost: number;
  startersTotal: number;
  players: PlayerBreakdown[];
  seasonTotal: number;
  gamesPlayed: number;
  activeChip: string | null;
}

async function getH2HRanks(): Promise<Map<number, number>> {
  const leagueId = process.env.FPL_H2H_LEAGUE_ID;
  const ranks = new Map<number, number>();
  if (!leagueId) return ranks;

  let data;
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

/**
 * Fetch all data for the team page with the shared cache. gameweekId is a
 * string here to match the page's own `searchParams.gw` shape.
 */
export async function getTeamPageDataOptimized(
  teamId: string,
  gameweekId: string,
  compareTeamId?: string
): Promise<{
  currentGameweek: number;
  mainTeam: TeamPageData;
  compareTeam: TeamPageData | null;
}> {
  const leagueId = process.env.FPL_LEAGUE_ID;
  const gw = Number(gameweekId);

  // TTLs here use "quiet" rather than the precise live state — the team page
  // is a single-team, low-traffic view, so the small amount of extra
  // staleness during a live match is an acceptable trade for not having to
  // fetch event-status + fixtures twice (services/league.ts already does the
  // precise version for the league-wide snapshot).
  const [bootstrap, liveData, fixtures, leagueStandings, h2hRanks] = await Promise.all([
    cached("bootstrap", ttlFor("bootstrap", "quiet"), () => client.bootstrap()),
    cached(`live:${gw}`, ttlFor("live", "quiet"), () => client.live(gw)),
    cached(`fixtures:${gw}`, ttlFor("fixtures", "quiet"), () => client.fixtures(gw)),
    leagueId
      ? cached(`standings:${leagueId}`, ttlFor("standings", "quiet"), () =>
          client.classicStandings(leagueId)
        ).catch(() => null)
      : Promise.resolve(null),
    getH2HRanks(),
  ]);

  const currentEvent =
    bootstrap.events.find((e) => e.is_current) ??
    bootstrap.events.find((e) => e.is_next) ??
    [...bootstrap.events].reverse().find((e) => e.finished);
  const currentGameweek = currentEvent ? currentEvent.id : 1;

  const playersMap = new Map<number, BootstrapPlayer>(bootstrap.elements.map((p) => [p.id, p]));
  const teamsMap = new Map<number, BootstrapTeam>(bootstrap.teams.map((t) => [t.id, t]));

  const getTeamInfo = (id: string) => {
    if (!leagueStandings) return { teamName: `Team ${id}`, managerName: "" };
    const team = leagueStandings.standings.results.find((t) => t.entry === Number(id));
    return team
      ? { teamName: team.entry_name, managerName: team.player_name }
      : { teamName: `Team ${id}`, managerName: "" };
  };

  const fetchTeamData = async (id: string): Promise<TeamPageData> => {
    const [teamHistory, teamDetails] = await Promise.all([
      cached(`history:${id}`, ttlFor("history", "quiet"), () => client.history(Number(id))).catch(
        () => null
      ),
      cached(`picks:${id}:${gw}`, ttlFor("picks", "quiet"), () => client.picks(Number(id), gw)),
    ]);

    const breakdown = buildTeamBreakdown(teamDetails, liveData, fixtures, playersMap, teamsMap);
    const players: PlayerBreakdown[] = breakdown.map((player) => ({
      ...player,
      name: playersMap.get(player.id)?.web_name ?? "Unknown",
    }));

    const { teamName, managerName } = getTeamInfo(id);
    const gwData = teamHistory?.current.find((g) => g.event === Number(gameweekId));

    // Multipliers already encode the chip, so bench players score 0 unless
    // Bench Boost is active. Summing every pick is correct either way.
    const startersTotal = players.reduce((sum, p) => sum + (p.total || 0), 0);

    const seasonTotal = teamHistory?.current.reduce((sum, g) => sum + g.points, 0) || 0;
    const gamesPlayed = teamHistory?.current.length || 0;

    return {
      teamId: id,
      teamName,
      managerName,
      overallRank: gwData?.overall_rank ?? null,
      h2hRank: h2hRanks.get(Number(id)) ?? null,
      transfers: gwData?.event_transfers ?? 0,
      transferCost: gwData?.event_transfers_cost ?? 0,
      startersTotal,
      players,
      seasonTotal,
      gamesPlayed,
      activeChip: teamDetails.active_chip,
    };
  };

  const [mainTeam, compareTeam] = await Promise.all([
    fetchTeamData(teamId),
    compareTeamId ? fetchTeamData(compareTeamId) : Promise.resolve(null),
  ]);

  return {
    currentGameweek,
    mainTeam,
    compareTeam,
  };
}
