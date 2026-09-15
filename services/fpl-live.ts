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
 * rules and no deriving bonus from BPS on our side.
 *
 * One caveat: the API only applies auto-subs and the vice-captain swap when it
 * processes the gameweek, hours after the last final whistle. Between a
 * starter's blank and that processing the multipliers are still the manager's
 * own, so `resolveProvisionalPicks` below re-derives what FPL will settle on.
 *
 * Verified against `entry_history.points` for GW1 and GW2 of 26/27 across a
 * spread of entries (bench boost, triple captain, transfer hits, multiple
 * auto-subs): exact match every time.
 */

import type {
    BootstrapPlayer,
    BootstrapTeam,
    Fixture,
    LiveGameweekData,
    TeamDetails,
    TeamPick,
} from "@/lib/fpl/types";

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
    clubShortName: string;
    clubCode: number;
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

/**
 * Resolve the picks FPL *will* settle on once it processes the gameweek.
 *
 * The API only applies automatic substitutions and the vice-captain swap when
 * it processes the whole gameweek, hours after the final whistle. Until then
 * the picks endpoint still carries the manager's own multipliers, so a live
 * dot product undercounts anyone whose starter blanked while a bench player
 * scored. This mirrors FPL's own rules on the live data instead:
 *
 *  - A starter is "out" once they have 0 minutes and every fixture their club
 *    has in the gameweek is over (`finished` or `finished_provisional`), or
 *    their club has no fixture at all.
 *  - Bench players are tried in bench order. A bench player who played comes
 *    in if the formation stays legal (GK for GK; ≥3 DEF, ≥2 MID, ≥1 FWD).
 *    One whose fixture is still to come is left pending — the starter stays
 *    put until we know — and one who also blanked is skipped.
 *  - The armband moves to the vice-captain when the captain is out and the
 *    vice played, keeping the captain's multiplier (3 under Triple Captain).
 *
 * Once the API has applied its own subs (`automatic_subs` non-empty, or a
 * captain multiplier already moved) the picks are returned untouched, so this
 * is safe to run on finished gameweeks too. Bench Boost has no bench to sub
 * from, so it is also a no-op.
 */
export function resolveProvisionalPicks(
    teamDetails: TeamDetails,
    live: LiveGameweekData,
    fixtures: Fixture[],
    playersMap: Map<number, BootstrapPlayer>
): TeamPick[] {
    const picks = teamDetails.picks.map(p => ({ ...p })).sort((a, b) => a.position - b.position);
    if ((teamDetails.automatic_subs ?? []).length > 0 || teamDetails.active_chip === "bboost") {
        return picks;
    }

    const liveMinutes = buildLiveMinutesMap(live);
    const isOver = (f: Fixture) => f.finished === true || f.finished_provisional === true;
    const clubFixtures = (element: number): Fixture[] => {
        const team = playersMap.get(element)?.team;
        return team === undefined ? [] : fixtures.filter(f => f.team_h === team || f.team_a === team);
    };
    /** Played, or could still play. */
    const hasPlayed = (element: number) => (liveMinutes.get(element) ?? 0) > 0;
    const isOut = (element: number) => {
        if (hasPlayed(element)) return false;
        if (fixtures.length === 0) return false; // no fixture list — nothing is decided yet
        return clubFixtures(element).every(isOver);
    };
    const typeOf = (element: number) => playersMap.get(element)?.element_type ?? 0;

    const captain = picks.find(p => p.is_captain);
    const vice = picks.find(p => p.is_vice_captain);
    // Read before the sub loop: a subbed-out captain drops to 0 below.
    const armband = captain?.multiplier ?? 0;

    const starters = picks.filter(p => p.position <= 11);
    const bench = picks.filter(p => p.position > 11);
    const usedBench = new Set<number>();

    const formationOk = (outElement: number, inElement: number): boolean => {
        const counts = [0, 0, 0, 0, 0];
        for (const s of starters) {
            const el = s.element === outElement ? inElement : s.element;
            counts[typeOf(el)]++;
        }
        return counts[1] === 1 && counts[2] >= 3 && counts[3] >= 2 && counts[4] >= 1;
    };

    for (const starter of starters) {
        if (starter.multiplier === 0 || !isOut(starter.element)) continue;
        const starterIsGk = typeOf(starter.element) === 1;

        for (const sub of bench) {
            if (usedBench.has(sub.element)) continue;
            const subIsGk = typeOf(sub.element) === 1;
            if (starterIsGk !== subIsGk) continue;

            if (isOut(sub.element)) continue; // blanked too — try the next one
            if (!hasPlayed(sub.element)) break; // still to play — wait for them
            if (!formationOk(starter.element, sub.element)) continue;

            usedBench.add(sub.element);
            sub.multiplier = 1;
            starter.multiplier = 0;
            break;
        }
    }

    if (captain && vice && armband >= 2 && isOut(captain.element) && hasPlayed(vice.element) && vice.multiplier > 0) {
        vice.multiplier = armband;
        captain.multiplier = captain.multiplier === 0 ? 0 : 1;
    }

    return picks;
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
        const club = teamsMap.get(elementTeamId);

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
            clubShortName: club?.short_name ?? "",
            clubCode: club?.code ?? 0,
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

// Fetching convenience wrappers used to live here too. They now live next to
// their callers (services/team-page-service.ts, app/api/points-breakdown)
// and are built from lib/fpl/client.ts and lib/fpl/cache.ts, so this module
// stays pure and its tests stay fixture-only.
