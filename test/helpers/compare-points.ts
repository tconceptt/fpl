/**
 * Live points cross-check.
 *
 * Kept from the old `/api/debug/compare-points` route (removed in Phase 0
 * housekeeping — it was a publicly reachable debug endpoint) as a plain
 * helper so the point-comparison logic stays available for spot checks
 * during live gameweeks without exposing a route.
 *
 * Compares three views of a team's gross gameweek points, which should
 * always agree:
 *
 *   liveSum        - sum of live `total_points` x pick multiplier
 *   entryPoints    - `entry_history.points` from the picks endpoint
 *   standingsTotal - `event_total` from the classic league table (current
 *                    gameweek only)
 *
 * A gap between liveSum and standingsTotal during a match is the league
 * table lagging, which is what you want to see while spot-checking a live
 * gameweek.
 */

import { LivePointsMap, sumPicks } from "@/services/fpl-live";
import { TeamPick } from "@/lib/fpl/types";

export interface TeamPointsComparison {
    teamId: number;
    teamName: string;
    activeChip: string | null;
    transferCost: number;
    liveSum: number;
    entryPoints: number;
    standingsTotal: number | null;
    /** Non-zero means the picks endpoint trails the live feed. */
    entryDrift: number;
    /** Non-zero means the league table trails the live feed. Null when not comparable. */
    lag: number | null;
}

export interface TeamPointsInput {
    teamId: number;
    teamName: string;
    activeChip: string | null;
    picks: TeamPick[];
    entryHistoryPoints: number;
    transferCost: number;
    /** `event_total` from the classic standings row, when comparable. */
    standingsEventTotal: number | null;
}

/**
 * Build the per-team comparison for one team. Pure — all fetching is done by
 * the caller.
 */
export function comparePoints(
    input: TeamPointsInput,
    livePoints: LivePointsMap,
    isCurrentGameweek: boolean
): TeamPointsComparison {
    const liveSum = sumPicks(input.picks, livePoints);
    const standingsTotal = isCurrentGameweek ? input.standingsEventTotal : null;

    return {
        teamId: input.teamId,
        teamName: input.teamName,
        activeChip: input.activeChip,
        transferCost: input.transferCost,
        liveSum,
        entryPoints: input.entryHistoryPoints,
        standingsTotal,
        entryDrift: input.entryHistoryPoints - liveSum,
        lag: standingsTotal === null ? null : standingsTotal - liveSum,
    };
}

/** Compare every team in a league in one pass. */
export function compareLeaguePoints(
    inputs: TeamPointsInput[],
    livePoints: LivePointsMap,
    isCurrentGameweek: boolean
): TeamPointsComparison[] {
    return inputs.map((input) => comparePoints(input, livePoints, isCurrentGameweek));
}
