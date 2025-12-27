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
    RequestScopedCache,
    BootstrapPlayer,
    Fixture,
    LivePlayer,
    LiveGameweekData,
    TeamDetails,
    TeamHistory,
    TeamPick,
    LivePlayerStats
} from "@/services/fpl-data-cache";
import { performAutoSubstitutions } from "@/services/real-time-points-calculator";
import { GameweekStanding, LeagueData, LeagueStanding } from "@/types/league";

function time<T>(fn: () => Promise<T>, name: string): Promise<T> {
    const start = Date.now();
    return fn().finally(() => {
        const duration = Date.now() - start;
        console.log(`[OPTIMIZED] ${name} took ${duration}ms`);
    });
}

/**
 * Calculate live points for a single team using shared cache data
 */
async function calculateLivePointsWithCache(
    cache: RequestScopedCache,
    teamId: string,
    gameweekId: string,
    liveData: LiveGameweekData,
    fixtures: Fixture[],
    playersMap: Map<number, BootstrapPlayer>
): Promise<{ totalPoints: number; transferCost: number }> {
    const teamDetails = await cache.getTeamDetails(teamId, gameweekId);

    // Build live stats map
    const livePlayerStatsMap = new Map<number, LivePlayerStats>();
    for (const p of liveData.elements) {
        livePlayerStatsMap.set(p.id, p.stats);
    }

    // Build team to players map for fixture processing
    const teamToPlayersMap = new Map<number, number[]>();
    for (const player of playersMap.values()) {
        if (!teamToPlayersMap.has(player.team)) {
            teamToPlayersMap.set(player.team, []);
        }
        teamToPlayersMap.get(player.team)!.push(player.id);
    }

    // Calculate points for each player
    const playerPoints = new Map<number, number>();

    // Live-based metrics (minutes, clean sheets, goals conceded, saves)
    for (const player of liveData.elements) {
        let points = 0;
        const position = playersMap.get(player.id)?.element_type;
        const stats = player.stats;

        // Minutes played
        if (stats.minutes > 0 && stats.minutes < 60) {
            points += 1;
        } else if (stats.minutes >= 60) {
            points += 2;
        }

        // Clean sheets (must play 60+ minutes)
        if (stats.clean_sheets === 1 && stats.minutes >= 60) {
            if (position === 1 || position === 2) points += 4;
            else if (position === 3) points += 1;
        }

        // Goals conceded (only for GK and DEF)
        if (position === 1 || position === 2) {
            points -= Math.floor(stats.goals_conceded / 2);
        }

        // Saves (only for GK)
        if (position === 1) {
            points += Math.floor(stats.saves / 3);
        }

        playerPoints.set(player.id, points);
    }

    // Fixture stats
    for (const fixture of fixtures) {
        if (!fixture.started) continue;

        const homePlayerIds = teamToPlayersMap.get(fixture.team_h) || [];
        const awayPlayerIds = teamToPlayersMap.get(fixture.team_a) || [];
        const fixturePlayerIds = [...homePlayerIds, ...awayPlayerIds];

        let maxMinutes = 0;
        for (const playerId of fixturePlayerIds) {
            const stats = livePlayerStatsMap.get(playerId);
            if (stats && stats.minutes > maxMinutes) {
                maxMinutes = stats.minutes;
            }
        }

        for (const stat of fixture.stats) {
            const allPlayers = [...stat.a, ...stat.h];

            switch (stat.identifier) {
                case "goals_scored":
                    for (const p of allPlayers) {
                        const position = playersMap.get(p.element)?.element_type;
                        let pts = 0;
                        if (position === 1 || position === 2) pts = 6;
                        else if (position === 3) pts = 5;
                        else if (position === 4) pts = 4;
                        playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + pts * p.value);
                    }
                    break;
                case "assists":
                    for (const p of allPlayers) {
                        playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 3 * p.value);
                    }
                    break;
                case "yellow_cards":
                    for (const p of allPlayers) {
                        playerPoints.set(p.element, (playerPoints.get(p.element) || 0) - 1 * p.value);
                    }
                    break;
                case "red_cards":
                    for (const p of allPlayers) {
                        playerPoints.set(p.element, (playerPoints.get(p.element) || 0) - 3 * p.value);
                    }
                    break;
                case "penalties_saved":
                    for (const p of allPlayers) {
                        playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 5 * p.value);
                    }
                    break;
                case "penalties_missed":
                    for (const p of allPlayers) {
                        playerPoints.set(p.element, (playerPoints.get(p.element) || 0) - 2 * p.value);
                    }
                    break;
                case "own_goals":
                    for (const p of allPlayers) {
                        playerPoints.set(p.element, (playerPoints.get(p.element) || 0) - 2 * p.value);
                    }
                    break;
                case "defensive_contribution":
                    for (const p of allPlayers) {
                        const position = playersMap.get(p.element)?.element_type;
                        let pts = 0;
                        if (position === 2 && p.value >= 10) { // Defender
                            pts = 2;
                        } else if (position === 3 && p.value >= 12) { // Midfielder
                            pts = 2;
                        }
                        playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + pts);
                    }
                    break;
                case "bps":
                    if (maxMinutes >= 60) {
                        const bpsPlayers = allPlayers.filter(p => p.value > 0);
                        if (bpsPlayers.length > 0) {
                            const sorted = bpsPlayers.sort((a, b) => b.value - a.value);
                            const uniqueScores = [...new Set(sorted.map(p => p.value))];
                            const ranks = uniqueScores.slice(0, 3).map(score => sorted.filter(p => p.value === score));

                            const rank1 = ranks[0] || [];
                            const rank2 = ranks[1] || [];
                            const rank3 = ranks[2] || [];

                            if (rank1.length > 1) {
                                rank1.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 3));
                                rank2.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 1));
                            } else {
                                rank1.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 3));
                                if (rank2.length > 1) {
                                    rank2.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 2));
                                } else if (rank2.length === 1) {
                                    rank2.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 2));
                                    rank3.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 1));
                                }
                            }
                        }
                    }
                    break;
            }
        }
    }

    // Perform auto-subs and calculate total
    const adjustedPicks = performAutoSubstitutions(
        teamDetails.picks,
        livePlayerStatsMap,
        playersMap as Map<number, { id: number; element_type: number; team: number }>,
        fixtures
    );

    let totalPoints = 0;
    for (const pick of adjustedPicks) {
        if (pick.position <= 11) {
            totalPoints += (playerPoints.get(pick.element) || 0) * pick.multiplier;
        }
    }

    return {
        totalPoints,
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

        // Build lookup maps
        const livePlayerMap = new Map(liveData.elements.map(p => [p.id, p]));
        const fixtureStatusMap = new Map(fixtures.map(f => [f.id, { started: f.started, finished: f.finished }]));
        const livePlayerStatsMap = new Map<number, LivePlayerStats>();
        for (const p of liveData.elements) {
            livePlayerStatsMap.set(p.id, p.stats);
        }

        // Team fixture status map
        const teamFixtureFinished = new Map<number, boolean>();
        for (const fixture of fixtures) {
            teamFixtureFinished.set(fixture.team_h, fixture.finished);
            teamFixtureFinished.set(fixture.team_a, fixture.finished);
        }

        const useLiveForCurrent = isCurrentGameweek && !finishedAllFixtures;

        // Fetch team details for all teams in parallel
        const teamDetailsResults = await Promise.all(
            teamIds.map(async teamId => {
                try {
                    const teamDetails = await cache.getTeamDetails(teamId.toString(), selectedGameweek.toString());
                    const captain = teamDetails.picks.find(pick => pick.is_captain);
                    const captainName = captain ? await cache.getPlayerName(captain.element) : null;

                    let playersToStart = 0;
                    if (isCurrentGameweek) {
                        // Check if bench boost is active - if so, all 15 players count and auto-subs don't apply
                        const isBenchBoostActive = teamDetails.active_chip === "bboost";

                        // Only perform auto-subs if bench boost is NOT active
                        const picksToCheck = isBenchBoostActive
                            ? teamDetails.picks
                            : performAutoSubstitutions(
                                teamDetails.picks,
                                livePlayerStatsMap,
                                playersMap as Map<number, { id: number; element_type: number; team: number }>,
                                fixtures
                            );

                        const maxPositionToCheck = isBenchBoostActive ? 15 : 11;

                        for (const pick of picksToCheck) {
                            if (pick.position <= maxPositionToCheck) {
                                const livePlayer = livePlayerMap.get(pick.element);
                                if (livePlayer) {
                                    if (livePlayer.stats.minutes === 0) {
                                        let fixtureId = -1;
                                        if (livePlayer.explain.length > 0) {
                                            fixtureId = livePlayer.explain[0].fixture;
                                        }

                                        if (fixtureId !== -1) {
                                            const fixtureStatus = fixtureStatusMap.get(fixtureId);
                                            if (fixtureStatus && !fixtureStatus.started) {
                                                playersToStart++;
                                            }
                                        } else {
                                            const player = playersMap.get(pick.element);
                                            if (player) {
                                                const fixture = fixtures.find(f => f.team_h === player.team || f.team_a === player.team);
                                                if (fixture && !fixture.started) {
                                                    playersToStart++;
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    playersToStart++;
                                }
                            }
                        }
                    }

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
                        liveData,
                        fixtures,
                        playersMap
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
        const h2hLeagueId = "2489497";

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

            // Fetch H2H standings
            const h2hRanks = new Map<number, number>();
            try {
                const h2hData = await cache.getH2HStandings(h2hLeagueId) as { standings?: { results?: Array<{ entry: number; rank: number }> } | Array<{ entry: number; rank: number }> };

                if (h2hData.standings) {
                    const results = Array.isArray(h2hData.standings)
                        ? h2hData.standings
                        : h2hData.standings.results || [];

                    results.forEach(team => {
                        h2hRanks.set(team.entry, team.rank);
                    });
                }
            } catch (error) {
                console.error("Failed to fetch H2H standings:", error);
            }

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
