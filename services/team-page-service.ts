/**
 * Optimized Team Page Data Fetcher
 * 
 * This module provides optimized data fetching for the team page,
 * eliminating redundant API calls when loading team details and comparisons.
 */

import {
    createRequestCache,
    RequestScopedCache,
    BootstrapPlayer,
    Fixture,
    LiveGameweekData,
    LivePlayerStats,
    TeamDetails
} from "@/services/fpl-data-cache";
import { performAutoSubstitutions } from "@/services/real-time-points-calculator";

export interface PlayerBreakdown {
    id: number;
    position: number;
    isCaptain: boolean;
    isViceCaptain: boolean;
    multiplier: number;
    total: number;
    metrics: Record<string, number>;
    rawTotal: number;
    rawMetrics: Record<string, number>;
    elementType: number;
    clubName: string;
    teamId: number;
    actualMinutes: number;
    name: string;
    autoSubIn?: boolean;
    autoSubOut?: boolean;
    opponentShortName?: string;
    fixtureStarted?: boolean;
}

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
 * Calculate points breakdown for players using shared cache data
 */
async function calculatePointsBreakdownWithCache(
    cache: RequestScopedCache,
    teamId: string,
    gameweekId: string,
    liveData: LiveGameweekData,
    fixtures: Fixture[],
    playersMap: Map<number, BootstrapPlayer>,
    teamsMap: Map<number, { id: number; short_name: string; name: string }>
): Promise<PlayerBreakdown[]> {
    const teamDetails = await cache.getTeamDetails(teamId, gameweekId);

    // Build live stats map
    const livePlayerStatsMap = new Map<number, LivePlayerStats>();
    for (const p of liveData.elements) {
        livePlayerStatsMap.set(p.id, p.stats);
    }

    // Build team to players map
    const teamToPlayersMap = new Map<number, number[]>();
    for (const player of playersMap.values()) {
        if (!teamToPlayersMap.has(player.team)) {
            teamToPlayersMap.set(player.team, []);
        }
        teamToPlayersMap.get(player.team)!.push(player.id);
    }

    // Calculate metrics for all players
    const metricsMap = new Map<number, Record<string, number>>();

    // Live-based metrics
    for (const player of liveData.elements) {
        const position = playersMap.get(player.id)?.element_type;
        const m: Record<string, number> = {};
        const stats = player.stats;

        if (stats.minutes > 0 && stats.minutes < 60) {
            m.minutes = 1;
        } else if (stats.minutes >= 60) {
            m.minutes = 2;
        }

        if (stats.clean_sheets === 1 && stats.minutes >= 60) {
            if (position === 1 || position === 2) m.clean_sheet = 4;
            else if (position === 3) m.clean_sheet = 1;
        }

        if (position === 1 || position === 2) {
            const deduction = Math.floor(stats.goals_conceded / 2);
            if (deduction > 0) m.goals_conceded = -deduction;
        }

        if (position === 1) {
            const savePts = Math.floor(stats.saves / 3);
            if (savePts) m.saves = savePts;
        }

        if (Object.keys(m).length > 0) {
            metricsMap.set(player.id, m);
        }
    }

    // Fixture-based stats
    for (const fixture of fixtures) {
        if (!fixture.started) continue;

        const homePlayerIds = teamToPlayersMap.get(fixture.team_h) || [];
        const awayPlayerIds = teamToPlayersMap.get(fixture.team_a) || [];
        const fixturePlayerIds = [...homePlayerIds, ...awayPlayerIds];

        let maxMinutes = 0;
        for (const playerId of fixturePlayerIds) {
            const stats = livePlayerStatsMap.get(playerId);
            if (stats && stats.minutes > maxMinutes) maxMinutes = stats.minutes;
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
                        const m = metricsMap.get(p.element) || {};
                        m.goals_scored = (m.goals_scored || 0) + pts * p.value;
                        metricsMap.set(p.element, m);
                    }
                    break;
                case "assists":
                    for (const p of allPlayers) {
                        const m = metricsMap.get(p.element) || {};
                        m.assists = (m.assists || 0) + 3 * p.value;
                        metricsMap.set(p.element, m);
                    }
                    break;
                case "yellow_cards":
                    for (const p of allPlayers) {
                        const m = metricsMap.get(p.element) || {};
                        m.yellow_cards = (m.yellow_cards || 0) - 1 * p.value;
                        metricsMap.set(p.element, m);
                    }
                    break;
                case "red_cards":
                    for (const p of allPlayers) {
                        const m = metricsMap.get(p.element) || {};
                        m.red_cards = (m.red_cards || 0) - 3 * p.value;
                        metricsMap.set(p.element, m);
                    }
                    break;
                case "penalties_saved":
                    for (const p of allPlayers) {
                        const m = metricsMap.get(p.element) || {};
                        m.penalties_saved = (m.penalties_saved || 0) + 5 * p.value;
                        metricsMap.set(p.element, m);
                    }
                    break;
                case "penalties_missed":
                    for (const p of allPlayers) {
                        const m = metricsMap.get(p.element) || {};
                        m.penalties_missed = (m.penalties_missed || 0) - 2 * p.value;
                        metricsMap.set(p.element, m);
                    }
                    break;
                case "own_goals":
                    for (const p of allPlayers) {
                        const m = metricsMap.get(p.element) || {};
                        m.own_goals = (m.own_goals || 0) - 2 * p.value;
                        metricsMap.set(p.element, m);
                    }
                    break;
                case "defensive_contribution":
                    for (const p of allPlayers) {
                        const position = playersMap.get(p.element)?.element_type;
                        let pts = 0;
                        if (position === 2 && p.value >= 10) pts = 2;
                        else if (position === 3 && p.value >= 12) pts = 2;
                        if (pts) {
                            const m = metricsMap.get(p.element) || {};
                            m.defensive_contribution = (m.defensive_contribution || 0) + pts;
                            metricsMap.set(p.element, m);
                        }
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
                                rank1.forEach(p => {
                                    const m = metricsMap.get(p.element) || {};
                                    m.bonus = (m.bonus || 0) + 3;
                                    metricsMap.set(p.element, m);
                                });
                                rank2.forEach(p => {
                                    const m = metricsMap.get(p.element) || {};
                                    m.bonus = (m.bonus || 0) + 1;
                                    metricsMap.set(p.element, m);
                                });
                            } else {
                                rank1.forEach(p => {
                                    const m = metricsMap.get(p.element) || {};
                                    m.bonus = (m.bonus || 0) + 3;
                                    metricsMap.set(p.element, m);
                                });
                                if (rank2.length > 1) {
                                    rank2.forEach(p => {
                                        const m = metricsMap.get(p.element) || {};
                                        m.bonus = (m.bonus || 0) + 2;
                                        metricsMap.set(p.element, m);
                                    });
                                } else if (rank2.length === 1) {
                                    rank2.forEach(p => {
                                        const m = metricsMap.get(p.element) || {};
                                        m.bonus = (m.bonus || 0) + 2;
                                        metricsMap.set(p.element, m);
                                    });
                                    rank3.forEach(p => {
                                        const m = metricsMap.get(p.element) || {};
                                        m.bonus = (m.bonus || 0) + 1;
                                        metricsMap.set(p.element, m);
                                    });
                                }
                            }
                        }
                    }
                    break;
            }
        }
    }

    // Perform auto-substitutions
    const adjustedPicks = performAutoSubstitutions(
        teamDetails.picks,
        livePlayerStatsMap,
        playersMap as Map<number, { id: number; element_type: number; team: number }>,
        fixtures
    );

    // Build result
    const result: PlayerBreakdown[] = [];

    for (const pick of adjustedPicks) {
        const baseMetrics = metricsMap.get(pick.element) || {};
        const rawMetrics: Record<string, number> = {};
        for (const [k, v] of Object.entries(baseMetrics)) {
            if (v !== 0) rawMetrics[k] = v;
        }
        const rawTotal = Object.values(rawMetrics).reduce((a, b) => a + b, 0);

        const metricsApplied: Record<string, number> = {};
        for (const [k, v] of Object.entries(rawMetrics)) {
            const val = v * pick.multiplier;
            if (val !== 0) metricsApplied[k] = val;
        }
        const total = Object.values(metricsApplied).reduce((a, b) => a + b, 0);

        const element = playersMap.get(pick.element);
        const elementType = element?.element_type ?? 0;
        const teamIdForElement = element?.team ?? -1;
        const actualMinutes = livePlayerStatsMap.get(pick.element)?.minutes ?? 0;
        const playerName = element?.web_name ?? 'Unknown';

        const item: PlayerBreakdown = {
            id: pick.element,
            position: pick.position,
            isCaptain: Boolean(pick.is_captain),
            isViceCaptain: Boolean(pick.is_vice_captain),
            multiplier: pick.multiplier,
            total,
            metrics: metricsApplied,
            rawTotal,
            rawMetrics,
            elementType,
            clubName: String(teamIdForElement),
            teamId: teamIdForElement,
            actualMinutes,
            name: playerName,
            autoSubIn: pick.autoSubIn,
            autoSubOut: pick.autoSubOut,
        };

        // Add opponent info
        const fixture = fixtures.find(f => f.team_h === teamIdForElement || f.team_a === teamIdForElement);
        if (fixture) {
            const isHome = fixture.team_h === teamIdForElement;
            const opponentId = isHome ? fixture.team_a : fixture.team_h;
            const opponent = teamsMap.get(opponentId);
            if (opponent) {
                item.opponentShortName = opponent.short_name;
                item.fixtureStarted = fixture.started;
            }
        }

        result.push(item);
    }

    return result.sort((a, b) => a.position - b.position);
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
    const h2hLeagueId = "2489497";

    // Fetch all base data in parallel
    const [
        currentGameweek,
        playersMap,
        teamsMap,
        liveData,
        fixtures,
        leagueStandings,
        h2hStandingsRaw
    ] = await Promise.all([
        cache.getCurrentGameweek(),
        cache.getPlayersMap(),
        cache.getTeamsMap(),
        cache.getLiveData(gameweekId),
        cache.getFixtures(gameweekId),
        leagueId ? cache.getLeagueStandings(leagueId).catch(() => null) : Promise.resolve(null),
        cache.getH2HStandings(h2hLeagueId).catch(() => null)
    ]);

    // Parse H2H standings
    const h2hRanks = new Map<number, number>();
    if (h2hStandingsRaw) {
        const h2hData = h2hStandingsRaw as { standings?: { results?: Array<{ entry: number; rank: number }> } | Array<{ entry: number; rank: number }> };
        if (h2hData.standings) {
            const results = Array.isArray(h2hData.standings)
                ? h2hData.standings
                : h2hData.standings.results || [];
            results.forEach(team => h2hRanks.set(team.entry, team.rank));
        }
    }

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

        const starters = players.filter(p => p.position <= 11);
        const startersTotal = starters.reduce((sum, p) => sum + (p.total || 0), 0);

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
