/**
 * Live points, straight from the FPL API.
 *
 * As of the 26/27 season the FPL API scores gameweeks live, so there is nothing
 * left for us to compute:
 *
 *  - `event/{gw}/live/` returns each player's `total_points` with provisional
 *    bonus already applied (awarded once a match passes 20 minutes), and an
 *    `explain` array that itemises where those points came from.
 *  - `entry/{id}/event/{gw}/picks/` returns multipliers with auto-subs already
 *    resolved: a subbed-out player drops to 0, the player who replaced them
 *    goes to 1, and their positions are swapped so the XI is positions 1-11.
 *    Chips are baked in too (Bench Boost gives the bench multiplier 1, Triple
 *    Captain gives the captain 3).
 *
 * So a team's gameweek total is just the dot product of picks and live points.
 * That is exactly what the official FPL web app does, and it means no scoring
 * rules, no deriving bonus from BPS, and no simulating auto-subs on our side.
 *
 * Verified against `entry_history.points` for GW1 and GW2 of 26/27 across a
 * spread of entries (bench boost, triple captain, transfer hits, multiple
 * auto-subs): exact match every time.
 */

import {
    createRequestCache,
    RequestScopedCache,
    BootstrapPlayer,
    BootstrapTeam,
    Fixture,
    LiveGameweekData,
    TeamDetails,
    TeamPick,
} from "@/services/fpl-data-cache";

/** elementId -> live total points for the gameweek (bonus included). */
export type LivePointsMap = Map<number, number>;

/** elementId -> { explain identifier: points }, merged across fixtures. */
export type LiveMetricsMap = Map<number, Record<string, number>>;

export interface PlayerBreakdown {
    id: number;
    position: number;
    isCaptain: boolean;
    isViceCaptain: boolean;
    multiplier: number;
    /** Points after the pick multiplier. */
    total: number;
    /** Per-stat points after the pick multiplier. */
    metrics: Record<string, number>;
    /** Points before the pick multiplier, as the API reports them. */
    rawTotal: number;
    /** Per-stat points before the pick multiplier. */
    rawMetrics: Record<string, number>;
    elementType: number;
    clubName: string;
    teamId: number;
    actualMinutes: number;
    autoSubIn?: boolean;
    autoSubOut?: boolean;
    opponentShortName?: string;
    fixtureStarted?: boolean;
}

export function buildLivePointsMap(live: LiveGameweekData): LivePointsMap {
    return new Map(live.elements.map(el => [el.id, el.stats.total_points]));
}

export function buildLiveMinutesMap(live: LiveGameweekData): Map<number, number> {
    return new Map(live.elements.map(el => [el.id, el.stats.minutes]));
}

/**
 * Turn each player's `explain` array into a flat identifier -> points record.
 * A player can appear in more than one fixture in a double gameweek, so points
 * for the same identifier are summed across fixtures.
 */
export function buildLiveMetricsMap(live: LiveGameweekData): LiveMetricsMap {
    const map: LiveMetricsMap = new Map();

    for (const el of live.elements) {
        const metrics: Record<string, number> = {};

        for (const fixture of el.explain ?? []) {
            for (const stat of fixture.stats ?? []) {
                if (stat.points) {
                    metrics[stat.identifier] = (metrics[stat.identifier] ?? 0) + stat.points;
                }
                // Retroactive adjustments (currently always 0, but the field exists
                // so FPL can correct points after the fact).
                if (stat.points_modification) {
                    metrics.points_modification =
                        (metrics.points_modification ?? 0) + stat.points_modification;
                }
            }
        }

        map.set(el.id, metrics);
    }

    return map;
}

/**
 * A team's gameweek points. Multipliers already encode auto-subs and chips, so
 * every pick is summed — bench players carry multiplier 0 unless Bench Boost is
 * active, in which case they legitimately count.
 *
 * This is the gross total, before any transfer hit.
 */
export function sumPicks(picks: TeamPick[], livePoints: LivePointsMap): number {
    return picks.reduce(
        (total, pick) => total + (livePoints.get(pick.element) ?? 0) * pick.multiplier,
        0
    );
}

/** Which elements the API auto-subbed in and out for this team. */
export function autoSubSets(teamDetails: TeamDetails): { in: Set<number>; out: Set<number> } {
    return {
        in: new Set((teamDetails.automatic_subs ?? []).map(s => s.element_in)),
        out: new Set((teamDetails.automatic_subs ?? []).map(s => s.element_out)),
    };
}

/**
 * Build the per-player breakdown for a team from live data and picks.
 * Pure — all fetching is done by the caller so a single live payload can be
 * shared across every team in a league.
 */
export function buildTeamBreakdown(
    teamDetails: TeamDetails,
    live: LiveGameweekData,
    fixtures: Fixture[],
    playersMap: Map<number, BootstrapPlayer>,
    teamsMap: Map<number, BootstrapTeam>
): PlayerBreakdown[] {
    const livePoints = buildLivePointsMap(live);
    const liveMetrics = buildLiveMetricsMap(live);
    const liveMinutes = buildLiveMinutesMap(live);
    const subs = autoSubSets(teamDetails);

    const breakdown = teamDetails.picks.map(pick => {
        const rawMetrics = liveMetrics.get(pick.element) ?? {};
        const rawTotal = livePoints.get(pick.element) ?? 0;

        const metrics: Record<string, number> = {};
        for (const [identifier, points] of Object.entries(rawMetrics)) {
            const applied = points * pick.multiplier;
            if (applied !== 0) metrics[identifier] = applied;
        }

        const element = playersMap.get(pick.element);
        const elementTeamId = element?.team ?? -1;

        const item: PlayerBreakdown = {
            id: pick.element,
            position: pick.position,
            isCaptain: Boolean(pick.is_captain),
            isViceCaptain: Boolean(pick.is_vice_captain),
            multiplier: pick.multiplier,
            total: rawTotal * pick.multiplier,
            metrics,
            rawTotal,
            rawMetrics,
            elementType: element?.element_type ?? 0,
            // Temporary label; the UI normalises to a kit by teamId.
            clubName: String(elementTeamId),
            teamId: elementTeamId,
            actualMinutes: liveMinutes.get(pick.element) ?? 0,
            autoSubIn: subs.in.has(pick.element) || undefined,
            autoSubOut: subs.out.has(pick.element) || undefined,
        };

        const fixture = fixtures.find(f => f.team_h === elementTeamId || f.team_a === elementTeamId);
        if (fixture) {
            const opponentId = fixture.team_h === elementTeamId ? fixture.team_a : fixture.team_h;
            const opponent = teamsMap.get(opponentId);
            if (opponent) {
                item.opponentShortName = opponent.short_name;
                item.fixtureStarted = fixture.started;
            }
        }

        return item;
    });

    return breakdown.sort((a, b) => a.position - b.position);
}

/**
 * Count picks that are still to play — counted players (multiplier > 0) who
 * have not kicked a ball and whose fixture has not started yet.
 *
 * Players already ruled out for the gameweek are excluded for free: once their
 * fixture finishes the API auto-subs them to multiplier 0.
 */
export function countPlayersToStart(
    picks: TeamPick[],
    live: LiveGameweekData,
    fixtures: Fixture[],
    playersMap: Map<number, BootstrapPlayer>
): number {
    const liveMinutes = buildLiveMinutesMap(live);
    const knownElements = new Set(live.elements.map(el => el.id));

    let toStart = 0;
    for (const pick of picks) {
        if (pick.multiplier <= 0) continue;

        // No live entry at all — treat as yet to play.
        if (!knownElements.has(pick.element)) {
            toStart++;
            continue;
        }

        if ((liveMinutes.get(pick.element) ?? 0) > 0) continue;

        const team = playersMap.get(pick.element)?.team;
        if (team === undefined) continue;

        const playerFixtures = fixtures.filter(f => f.team_h === team || f.team_a === team);
        if (playerFixtures.length > 0 && playerFixtures.some(f => !f.started)) {
            toStart++;
        }
    }

    return toStart;
}

/**
 * A single team's live gameweek points, fetching what it needs.
 * Prefer the pure helpers above when handling several teams at once — they let
 * one live payload serve the whole league.
 */
export async function getTeamGameweekPoints(
    teamId: string,
    gameweekId: string,
    cache: RequestScopedCache = createRequestCache()
): Promise<{
    totalPoints: number;
    transferCost: number;
    activeChip: string | null;
    picks: TeamPick[];
}> {
    const [live, teamDetails] = await Promise.all([
        cache.getLiveData(gameweekId),
        cache.getTeamDetails(teamId, gameweekId),
    ]);

    return {
        totalPoints: sumPicks(teamDetails.picks, buildLivePointsMap(live)),
        transferCost: teamDetails.entry_history.event_transfers_cost,
        activeChip: teamDetails.active_chip,
        picks: teamDetails.picks,
    };
}

/** A single team's per-player breakdown, fetching what it needs. */
export async function getTeamGameweekBreakdown(
    teamId: string,
    gameweekId: string,
    cache: RequestScopedCache = createRequestCache()
): Promise<{ breakdown: PlayerBreakdown[]; activeChip: string | null }> {
    const [live, fixtures, playersMap, teamsMap, teamDetails] = await Promise.all([
        cache.getLiveData(gameweekId),
        cache.getFixtures(gameweekId),
        cache.getPlayersMap(),
        cache.getTeamsMap(),
        cache.getTeamDetails(teamId, gameweekId),
    ]);

    return {
        breakdown: buildTeamBreakdown(teamDetails, live, fixtures, playersMap, teamsMap),
        activeChip: teamDetails.active_chip,
    };
}
