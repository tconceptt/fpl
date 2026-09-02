/**
 * Optimized League Service
 * 
 * This is a performance-optimized version of league-service.ts that uses
 * the centralized FPL data caching layer to eliminate redundant API calls.
 * 
 * Key optimizations:
 * 1. Single bootstrap fetch for all operations
 * 2. Parallel fetching with deduplication
 * 3. Shared data passed through function calls
 * 4. Batch player name resolution
 */

import {
    createRequestCache,
    getH2HRanks,
    RequestScopedCache,
    Fixture,
    LiveGameweekData
} from "@/services/fpl-data-cache";
import { buildLivePointsMap, countPlayersToStart, sumPicks } from "@/services/fpl-live";
import { GameweekStanding, LeagueData, LeagueStanding } from "@/types/league";

function time<T>(fn: () => Promise<T>, name: string): Promise<T> {
    const start = Date.now();
    return fn().finally(() => {
        const duration = Date.now() - start;
        console.log(`[OPTIMIZED] ${name} took ${duration}ms`);
    });
}

/**
 * Live points for a single team, using shared cache data.
 *
 * The API scores the gameweek for us: live `total_points` already includes
 * provisional bonus, and pick multipliers already encode auto-subs and chips.
 * See services/fpl-live.ts.
 */
async function calculateLivePointsWithCache(
    cache: RequestScopedCache,
    teamId: string,
    gameweekId: string,
    liveData: LiveGameweekData
): Promise<{ totalPoints: number; transferCost: number }> {
    const teamDetails = await cache.getTeamDetails(teamId, gameweekId);

    return {
        totalPoints: sumPicks(teamDetails.picks, buildLivePointsMap(liveData)),
        transferCost: teamDetails.entry_history.event_transfers_cost
    };
}

/**
 * Optimized historical standings fetcher
 */
export async function getHistoricalStandingsOptimized(
    cache: RequestScopedCache,
    teamIds: number[],
    selectedGameweek: number,
    teamInfo: LeagueStanding[],
    isCurrentGameweek: boolean
): Promise<GameweekStanding[]> {
    return time(async () => {
        // Fetch all required data in parallel
        const [teamsHistory, playersMap] = await Promise.all([
            Promise.all(teamIds.map(id =>
                cache.getTeamHistory(id.toString()).catch((err: unknown) => {
                    console.error(`Failed to fetch history for team ${id}:`, err);
                    return null;
                })
            )),
            cache.getPlayersMap()
        ]);

        let liveData: LiveGameweekData = { elements: [] };
        let fixtures: Fixture[] = [];
        let finishedAllFixtures = false;

        if (isCurrentGameweek) {
            [liveData, fixtures] = await Promise.all([
                cache.getLiveData(selectedGameweek.toString()),
                cache.getFixtures(selectedGameweek.toString())
            ]);
            finishedAllFixtures = fixtures.length > 0 && fixtures.every(f => f.finished);
        }

        const useLiveForCurrent = isCurrentGameweek && !finishedAllFixtures;

        // Fetch team details for all teams in parallel
        const teamDetailsResults = await Promise.all(
            teamIds.map(async teamId => {
                try {
                    const teamDetails = await cache.getTeamDetails(teamId.toString(), selectedGameweek.toString());
                    const captain = teamDetails.picks.find(pick => pick.is_captain);
                    const captainName = captain ? await cache.getPlayerName(captain.element) : null;

                    // Multipliers already reflect auto-subs and chips, so the
                    // counted squad is whatever the API says it is.
                    const playersToStart = isCurrentGameweek
                        ? countPlayersToStart(teamDetails.picks, liveData, fixtures, playersMap)
                        : 0;

                    return {
                        teamId,
                        captainName,
                        active_chip: teamDetails.active_chip,
                        playersToStart,
                        transferCost: teamDetails.entry_history.event_transfers_cost,
                    };
                } catch (error) {
                    console.error(`Failed to fetch team details for team ${teamId}:`, error);
                    return null;
                }
            })
        );

        // Calculate live points if needed
        const livePointsMap = new Map<number, number>();
        const transferCostMap = new Map<number, number>();

        if (useLiveForCurrent) {
            const livePointsResults = await Promise.all(
                teamIds.map(teamId =>
                    calculateLivePointsWithCache(
                        cache,
                        teamId.toString(),
                        selectedGameweek.toString(),
                        liveData
                    ).catch(err => {
                        console.error(`Failed to calculate live points for team ${teamId}:`, err);
                        return null;
                    })
                )
            );

            livePointsResults.forEach((result, index) => {
                if (result) {
                    livePointsMap.set(teamIds[index], result.totalPoints);
                    transferCostMap.set(teamIds[index], result.transferCost);
                }
            });
        }

        // Build captain and chip maps
        const captainMap = new Map<number, string | null>(
            teamDetailsResults
                .filter((r): r is NonNullable<typeof r> => r !== null && r.captainName !== null)
                .map(r => [r.teamId, r.captainName])
        );

        const chipMap = new Map<number, string | null>(
            teamDetailsResults
                .filter((r): r is NonNullable<typeof r> => r !== null)
                .map(r => [r.teamId, r.active_chip])
        );

        const playersToStartMap = new Map<number, number>(
            teamDetailsResults
                .filter((r): r is NonNullable<typeof r> => r !== null)
                .map(r => [r.teamId, r.playersToStart])
        );

        // Build standings
        type TeamHistoryData = { current: Array<{ event: number; points: number; total_points: number; event_transfers_cost: number }> } | null;
        const standings = (teamsHistory as TeamHistoryData[])
            .map((history: TeamHistoryData, index: number) => {
                if (!history) return null;

                const gameweekData = history.current.find((gw: { event: number }) => gw.event === selectedGameweek);
                if (!gameweekData) return null;

                const team = teamInfo.find(t => t.entry === teamIds[index]);
                if (!team) return null;

                const event_total = useLiveForCurrent
                    ? (livePointsMap.get(teamIds[index]) || gameweekData.points)
                    : gameweekData.points;

                const transferCost = useLiveForCurrent
                    ? (transferCostMap.get(teamIds[index]) || gameweekData.event_transfers_cost)
                    : gameweekData.event_transfers_cost;

                const net_points = event_total - transferCost;

                const previousGWData = selectedGameweek > 1
                    ? history.current.find((gw: { event: number }) => gw.event === selectedGameweek - 1)
                    : null;
                const previousGWTotal = previousGWData?.total_points || 0;

                return {
                    entry: teamIds[index],
                    entry_name: team.entry_name,
                    player_name: team.player_name,
                    event_total,
                    total_points: useLiveForCurrent
                        ? (previousGWTotal + net_points)
                        : gameweekData.total_points,
                    net_points,
                    rank: 0,
                    last_rank: 0,
                    captain_name: captainMap.get(teamIds[index]) ?? undefined,
                    active_chip: chipMap.get(teamIds[index]),
                    transfer_cost: transferCost,
                    playersToStart: playersToStartMap.get(teamIds[index]) || 0,
                };
            })
            .filter((s): s is NonNullable<typeof s> => s !== null);

        // Calculate previous ranks
        if (selectedGameweek > 1) {
            const previousStandings = (teamsHistory as TeamHistoryData[])
                .map((history: TeamHistoryData, index: number) => {
                    if (!history) return null;
                    const prev = history.current.find((gw: { event: number }) => gw.event === selectedGameweek - 1);
                    if (!prev) return null;
                    return { entry: teamIds[index], total_points: prev.total_points };
                })
                .filter((s: { entry: number; total_points: number } | null): s is { entry: number; total_points: number } => s !== null)
                .sort((a: { total_points: number }, b: { total_points: number }) => b.total_points - a.total_points);

            const previousRanks = new Map<number, number>(
                previousStandings.map((s: { entry: number; total_points: number }, i: number): [number, number] => [s.entry, i + 1])
            );

            standings.forEach((s: { entry: number; last_rank: number; rank: number }) => {
                s.last_rank = previousRanks.get(s.entry) || s.rank;
            });
        }

        return standings
            .sort((a: { total_points: number }, b: { total_points: number }) => b.total_points - a.total_points)
            .map((s: GameweekStanding, i: number) => ({ ...s, rank: i + 1 }));
    }, 'getHistoricalStandingsOptimized');
}

/**
 * Optimized league data fetcher
 */
export async function getLeagueDataOptimized(selectedGameweek?: number): Promise<LeagueData> {
    return time(async () => {
        const cache = createRequestCache();

        const leagueId = process.env.FPL_LEAGUE_ID;

        if (!leagueId) {
            throw new Error('FPL_LEAGUE_ID environment variable is not set.');
        }

        try {
            // Fetch league standings and current gameweek in parallel
            const [leagueStandings, currentGameweek] = await Promise.all([
                cache.getLeagueStandings(leagueId),
                cache.getCurrentGameweek()
            ]);

            const gameweek = selectedGameweek || currentGameweek;
            const teamIds = leagueStandings.standings.results.map(t => t.entry);

            const h2hRanks = await getH2HRanks(cache);

            // Get historical standings
            const historicalStandings = await getHistoricalStandingsOptimized(
                cache,
                teamIds,
                gameweek,
                leagueStandings.standings.results as LeagueStanding[],
                gameweek === currentGameweek
            );

            // Add H2H ranks
            const standingsWithH2H = historicalStandings.map(s => ({
                ...s,
                h2h_rank: h2hRanks.get(s.entry),
            }));

            return {
                leagueName: leagueStandings.league.name,
                currentGameweek,
                selectedGameweek: gameweek,
                standings: standingsWithH2H
            };
        } catch (error) {
            console.error("Error fetching league data:", error);
            return {
                leagueName: "FPL League",
                currentGameweek: 1,
                selectedGameweek: 1,
                standings: []
            };
        }
    }, 'getLeagueDataOptimized');
}

// Re-export the createRequestCache for use in other modules
export { createRequestCache };
