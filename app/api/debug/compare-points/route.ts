import { NextResponse } from "next/server";
import { getLeagueData } from "@/services/league-service";
import { calculateLivePoints } from "@/services/live-points-calculator";
import { calculateRealTimePointsBreakdown } from "@/services/real-time-points-calculator";
import { getTeamHistory } from "@/services/net-gameweek-points";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gwParam = searchParams.get("gw");
    const gw = gwParam ? Number.parseInt(gwParam, 10) : undefined;

    const league = await getLeagueData(gw);
    const teamIds = league.standings.map((s) => s.entry);

    const results = [] as Array<{
      teamId: number;
      teamName: string;
      liveTotal: number;
      breakdownStartersTotal: number;
      officialTotal: number;
      diffBreakdownVsLive: number;
      diffBreakdownVsOfficial: number;
      players?: Array<{ id: number; position: number; isCaptain: boolean; isViceCaptain: boolean; multiplier: number; total: number; metrics: Record<string, number>; rawTotal: number; rawMetrics: Record<string, number>; elementType: number; clubName: string; teamId: number }>
    }>;

    for (const teamId of teamIds) {
      const live = await calculateLivePoints(teamId.toString(), (league.selectedGameweek).toString());
      const breakdownPlayers = await calculateRealTimePointsBreakdown(teamId.toString(), (league.selectedGameweek).toString());

      const starters = breakdownPlayers.filter((p) => p.position <= 11);
      const startersTotal = starters.reduce((sum, p) => sum + (p.total || 0), 0);

      // Official points from FPL history (finalized values after GW end)
      let officialTotal = 0;
      try {
        const history = await getTeamHistory(teamId.toString());
        const gwData = history.current.find((g: { event: number; points: number }) => g.event === league.selectedGameweek);
        officialTotal = gwData?.points ?? 0;
      } catch {
        officialTotal = 0;
      }

      results.push({
        teamId,
        teamName: league.standings.find(s => s.entry === teamId)?.entry_name || String(teamId),
        liveTotal: live.totalPoints,
        breakdownStartersTotal: startersTotal,
        officialTotal,
        diffBreakdownVsLive: startersTotal - live.totalPoints,
        diffBreakdownVsOfficial: startersTotal - officialTotal,
        players: starters,
      });
    }

    const mismatches = results.filter(r => r.diffBreakdownVsLive !== 0 || r.diffBreakdownVsOfficial !== 0);
    return NextResponse.json({
      gameweek: league.selectedGameweek,
      totalTeams: teamIds.length,
      mismatchesCount: mismatches.length,
      mismatches,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Unknown error" }, { status: 500 });
  }
}



