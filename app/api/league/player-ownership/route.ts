import { NextRequest, NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
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

    const gwNumber = Number(gw);

    try {
        // 1. Fetch league standings and the gameweek's live points once
        const [standings, liveData] = await Promise.all([
            cachedKind("standings", `standings:${leagueId}`, () =>
                client.classicStandings(leagueId)
            ),
            cachedKind("live", `live:${gwNumber}`, () => client.live(gwNumber)),
        ]);

        const teams = standings.standings.results;
        const livePoints = buildLivePointsMap(liveData);

        // 2. Fetch picks for each team and check if they started the player
        const teamsStartingPlayer = await Promise.all(
            teams.map(async (team) => {
                try {
                    const picksData = await cachedKind(
                        "picks",
                        `picks:${team.entry}:${gwNumber}`,
                        () => client.picks(team.entry, gwNumber)
                    );
                    const picks = picksData.picks;
                    const entryHistory = picksData.entry_history;

                    // Check if player is in starting XI (position 1-11)
                    const isStarting = picks.some(
                        (pick) => pick.element === Number(playerId) && pick.position <= 11
                    );

                    if (isStarting) {
                        const netPoints = sumPicks(picks, livePoints) - entryHistory.event_transfers_cost;
                        return {
                            teamId: team.entry,
                            teamName: team.entry_name,
                            managerName: team.player_name,
                            netPoints,
                        };
                    }
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
