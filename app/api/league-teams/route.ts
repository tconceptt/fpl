import { NextResponse } from "next/server";
import { fplApiRoutes } from "@/lib/routes";

export async function GET() {
  try {
    const leagueId = process.env.FPL_LEAGUE_ID;
    if (!leagueId) {
      return NextResponse.json({ error: "League ID not configured" }, { status: 500 });
    }

    const response = await fetch(fplApiRoutes.standings(leagueId), {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch league standings" }, { status: response.status });
    }

    const data = await response.json();
    const teams = data.standings.results.map((team: { entry: number; entry_name: string; player_name: string }) => ({
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

