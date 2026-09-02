import { NextRequest, NextResponse } from "next/server";
import { fplApiRoutes } from "@/lib/routes";
import { createRequestCache } from "@/services/fpl-data-cache";
import { buildLivePointsMap, sumPicks } from "@/services/fpl-live";


export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get("playerId");
    const gw = searchParams.get("gw");

    if (!playerId || !gw) {
        return NextResponse.json(
            { error: "Missing playerId or gw parameter" },
            { status: 400 }
        );
    }

    const leagueId = process.env.FPL_LEAGUE_ID;
    if (!leagueId) {
        return NextResponse.json(
            { error: "FPL_LEAGUE_ID not configured" },
            { status: 500 }
        );
    }

    try {
        // 1. Fetch league standings and the gameweek's live points once
        const cache = createRequestCache();
        const [standingsResponse, liveData] = await Promise.all([
            fetch(fplApiRoutes.standings(leagueId), { cache: "no-store" }),
            cache.getLiveData(gw),
        ]);

        if (!standingsResponse.ok) {
            throw new Error("Failed to fetch standings");
        }

        const standingsData = await standingsResponse.json();
        const teams = standingsData.standings.results;
        const livePoints = buildLivePointsMap(liveData);

        // 2. Fetch picks for each team and check if they started the player
        const teamsStartingPlayer = await Promise.all(
            teams.map(async (team: { entry: number; entry_name: string; player_name: string }) => {
                try {
                    const picksResponse = await fetch(
                        fplApiRoutes.teamDetails(team.entry.toString(), gw),
                        { cache: "no-store" }
                    );

                    if (!picksResponse.ok) return null;

                    const picksData = await picksResponse.json();
                    const picks = picksData.picks;
                    const entryHistory = picksData.entry_history;

                    // Check if player is in starting XI (position 1-11)
                    const isStarting = picks.some(
                        (pick: { element: number; position: number }) =>
                            pick.element === Number(playerId) && pick.position <= 11
                    );

                    if (isStarting) {
                        const netPoints = sumPicks(picks, livePoints) - entryHistory.event_transfers_cost;
                        return {
                            teamId: team.entry,
                            teamName: team.entry_name,
                            managerName: team.player_name,
                            netPoints,
                        };
                    };
                } catch (error) {
                    console.error(`Error checking team ${team.entry}:`, error);
                }
                return null;
            })
        );

        // Filter out nulls
        const results = teamsStartingPlayer.filter((t) => t !== null);

        return NextResponse.json({ teams: results });
    } catch (error) {
        console.error("Error fetching player ownership:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
