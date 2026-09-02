import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cached } from "@/lib/fpl/cache";
import { ttlFor } from "@/lib/fpl/ttl";

export async function GET() {
  try {
    const leagueId = process.env.FPL_LEAGUE_ID;
    if (!leagueId) {
      return NextResponse.json({ error: "League ID not configured" }, { status: 500 });
    }

    const data = await cached(`standings:${leagueId}`, ttlFor("standings", "quiet"), () =>
      client.classicStandings(leagueId)
    );

    const teams = data.standings.results.map((team) => ({
      entry: team.entry,
      entry_name: team.entry_name,
      player_name: team.player_name,
    }));

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Error fetching league teams:", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}
