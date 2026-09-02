/**
 * Live points cross-check.
 *
 * Now that we take points straight from the API rather than scoring gameweeks
 * ourselves, this route exists to answer one question: do FPL's three views of
 * a team's gameweek agree with each other, and how fresh is each one?
 *
 *   liveSum       - sum of live `total_points` x pick multiplier (what the app shows)
 *   entryPoints   - `entry_history.points` from the picks endpoint
 *   standingsTotal- `event_total` from the classic league table
 *
 * All three are gross, before any transfer hit, so they should be identical.
 * A gap between liveSum and standingsTotal during a match is the league table
 * lagging, which is exactly what we want to measure. Poll this while fixtures
 * are in play and watch `lag`.
 */

import { NextResponse } from "next/server";
import { fplApiRoutes } from "@/lib/routes";
import { createRequestCache } from "@/services/fpl-data-cache";
import { buildLivePointsMap, sumPicks } from "@/services/fpl-live";

interface EventStatus {
    status: Array<{ date: string; event: number; points: string; bonus_added: boolean }>;
    leagues: string;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const gwParam = searchParams.get("gw");

        const leagueId = process.env.FPL_LEAGUE_ID;
        if (!leagueId) {
            return NextResponse.json({ error: "FPL_LEAGUE_ID not configured" }, { status: 500 });
        }

        const cache = createRequestCache();
        const currentGameweek = await cache.getCurrentGameweek();
        const gameweek = gwParam ? Number.parseInt(gwParam, 10) : currentGameweek;
        const gw = gameweek.toString();

        const [standings, live, fixtures, eventStatus] = await Promise.all([
            cache.getLeagueStandings(leagueId),
            cache.getLiveData(gw),
            cache.getFixtures(gw),
            fetch(fplApiRoutes.eventStatus, { cache: "no-store" })
                .then(r => (r.ok ? (r.json() as Promise<EventStatus>) : null))
                .catch(() => null),
        ]);

        const livePoints = buildLivePointsMap(live);
        // The league table only ever carries the current gameweek's `event_total`,
        // so comparing it against a past gameweek would be meaningless.
        const isCurrentGameweek = gameweek === currentGameweek;
        const standingsByEntry = new Map(standings.standings.results.map(r => [r.entry, r]));

        const teams = await Promise.all(
            standings.standings.results.map(async row => {
                const teamDetails = await cache.getTeamDetails(row.entry.toString(), gw);

                const liveSum = sumPicks(teamDetails.picks, livePoints);
                const entryPoints = teamDetails.entry_history.points;
                const standingsTotal = isCurrentGameweek
                    ? standingsByEntry.get(row.entry)?.event_total ?? null
                    : null;

                return {
                    teamId: row.entry,
                    teamName: row.entry_name,
                    activeChip: teamDetails.active_chip,
                    transferCost: teamDetails.entry_history.event_transfers_cost,
                    liveSum,
                    entryPoints,
                    standingsTotal,
                    // Non-zero means the picks endpoint trails the live feed.
                    entryDrift: entryPoints - liveSum,
                    // Non-zero means the league table trails the live feed.
                    lag: standingsTotal === null ? null : standingsTotal - liveSum,
                };
            })
        );

        return NextResponse.json({
            gameweek,
            currentGameweek,
            // `standingsTotal`/`lag` are only reported for the current gameweek.
            standingsComparable: isCurrentGameweek,
            checkedAt: new Date().toISOString(),
            fixtures: {
                total: fixtures.length,
                started: fixtures.filter(f => f.started).length,
                finished: fixtures.filter(f => f.finished).length,
                inPlay: fixtures.filter(f => f.started && !f.finished).length,
            },
            // "Updating" means FPL is still recalculating league tables, so a
            // non-zero lag below is expected rather than a bug.
            leaguesStatus: eventStatus?.leagues ?? null,
            // Per-day scoring state: l = live, p = provisional, r = confirmed.
            dayStatus: eventStatus?.status ?? null,
            standingsLastUpdated: standings.last_updated_data ?? null,
            teamsChecked: teams.length,
            entryDriftCount: teams.filter(t => t.entryDrift !== 0).length,
            lagCount: teams.filter(t => t.lag !== 0 && t.lag !== null).length,
            teams,
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message || "Unknown error" }, { status: 500 });
    }
}
