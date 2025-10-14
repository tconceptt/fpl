import { NextResponse } from "next/server";
import { getLeagueData } from "@/services/league-service";
import { getTeamHistory } from "@/services/net-gameweek-points";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gwParam = searchParams.get("gw");
    const gw = gwParam ? Number.parseInt(gwParam, 10) : undefined;

    // Get league standings (this includes our computed total column for the selected gameweek)
    const league = await getLeagueData(gw);

    const results = [] as Array<{
      teamId: number;
      teamName: string;
      selectedGameweek: number;
      ourTotal: number;
      officialTotal: number;
      diff: number;
    }>;

    for (const standing of league.standings) {
      const teamId = standing.entry;
      let officialTotal = 0;
      try {
        const history = await getTeamHistory(teamId.toString());
        const gwData = history.current.find((g: { event: number; total_points: number }) => g.event === league.selectedGameweek);
        officialTotal = gwData?.total_points ?? 0;
      } catch {
        officialTotal = 0;
      }

      const ourTotal = standing.total_points;
      results.push({
        teamId,
        teamName: standing.entry_name,
        selectedGameweek: league.selectedGameweek,
        ourTotal,
        officialTotal,
        diff: ourTotal - officialTotal,
      });
    }

    const mismatches = results.filter(r => r.diff !== 0);
    return NextResponse.json({
      gameweek: league.selectedGameweek,
      totalTeams: results.length,
      mismatchesCount: mismatches.length,
      mismatches,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Unknown error" }, { status: 500 });
  }
}



