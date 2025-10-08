import { NextResponse } from "next/server";
import { calculateRealTimePointsBreakdown } from "@/services/real-time-points-calculator";
import { getPlayerName } from "@/services/get-player-name";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const gw = searchParams.get("gw");

    if (!teamId || !gw) {
      return NextResponse.json({ error: "Missing teamId or gw parameter" }, { status: 400 });
    }

    const breakdown = await calculateRealTimePointsBreakdown(teamId, gw);

    const withNames = await Promise.all(
      breakdown.map(async (p) => ({
        ...p,
        name: await getPlayerName(p.id, 'web_name'),
      }))
    );

    return NextResponse.json({ players: withNames });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Unknown error" }, { status: 500 });
  }
}



