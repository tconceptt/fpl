/**
 * Optimized Team Page Data Fetcher
 * 
 * This module provides optimized data fetching for the team page,
 * eliminating redundant API calls when loading team details and comparisons.
 */

import {
    createRequestCache,
    getH2HRanks,
    RequestScopedCache,
    BootstrapPlayer,
    BootstrapTeam,
    Fixture,
    LiveGameweekData
} from "@/services/fpl-data-cache";
import { buildTeamBreakdown, PlayerBreakdown as LivePlayerBreakdown } from "@/services/fpl-live";

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
    seasonTotal?: number;
    gamesPlayed?: number;
}

/**
 * Per-player points breakdown for a team, using shared cache data.
 *
 * Points and their itemisation come from `event/{gw}/live/` (`explain`), and
 * multipliers come from the picks endpoint with auto-subs already applied.
 * See services/fpl-live.ts.
 */
async function calculatePointsBreakdownWithCache(
    cache: RequestScopedCache,
    teamId: string,
    gameweekId: string,
    liveData: LiveGameweekData,
    fixtures: Fixture[],
    playersMap: Map<number, BootstrapPlayer>,
    teamsMap: Map<number, BootstrapTeam>
): Promise<PlayerBreakdown[]> {
    const teamDetails = await cache.getTeamDetails(teamId, gameweekId);
    const breakdown = buildTeamBreakdown(teamDetails, liveData, fixtures, playersMap, teamsMap);

    return breakdown.map(player => ({
        ...player,
        name: playersMap.get(player.id)?.web_name ?? 'Unknown',
    }));
}

/**
 * Fetch all data for team page with optimized caching
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
    const cache = createRequestCache();
    const leagueId = process.env.FPL_LEAGUE_ID;

    // Fetch all base data in parallel
    const [
        currentGameweek,
        playersMap,
        teamsMap,
        liveData,
        fixtures,
        leagueStandings,
        h2hRanks
    ] = await Promise.all([
        cache.getCurrentGameweek(),
        cache.getPlayersMap(),
        cache.getTeamsMap(),
        cache.getLiveData(gameweekId),
        cache.getFixtures(gameweekId),
        leagueId ? cache.getLeagueStandings(leagueId).catch(() => null) : Promise.resolve(null),
        getH2HRanks(cache)
    ]);

    // Helper to get team info from standings
    const getTeamInfo = (id: string) => {
        if (!leagueStandings) return { teamName: `Team ${id}`, managerName: '' };
        const team = leagueStandings.standings.results.find(t => t.entry === Number(id));
        return team
            ? { teamName: team.entry_name, managerName: team.player_name }
            : { teamName: `Team ${id}`, managerName: '' };
    };

    // Helper to fetch team data
    const fetchTeamData = async (id: string): Promise<TeamPageData> => {
        const [teamHistory, players] = await Promise.all([
            cache.getTeamHistory(id).catch(() => null),
            calculatePointsBreakdownWithCache(cache, id, gameweekId, liveData, fixtures, playersMap, teamsMap)
        ]);

        const { teamName, managerName } = getTeamInfo(id);
        const gwData = teamHistory?.current.find((g: { event: number; overall_rank: number; event_transfers: number; event_transfers_cost: number }) => g.event === Number(gameweekId));

        // Multipliers already encode the chip, so bench players score 0 unless
        // Bench Boost is active. Summing every pick is correct either way.
        const startersTotal = players.reduce((sum, p) => sum + (p.total || 0), 0);

        const seasonTotal = teamHistory?.current.reduce((sum: number, gw: { points: number }) => sum + gw.points, 0) || 0;
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
        };
    };

    // Fetch main team and compare team in parallel
    const [mainTeam, compareTeam] = await Promise.all([
        fetchTeamData(teamId),
        compareTeamId ? fetchTeamData(compareTeamId) : Promise.resolve(null)
    ]);

    return {
        currentGameweek,
        mainTeam,
        compareTeam,
    };
}
