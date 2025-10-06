import { NextResponse } from "next/server";
import { fplApiRoutes } from "@/lib/routes";
import { getPlayerName } from "@/services/get-player-name";
import { getAllPlayersOwnership } from "@/services/get-player-ownership";

interface TeamDetailsResponse {
  picks: Array<{ element: number; position: number }>;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamIdParam = searchParams.get("teamId");
    const gwParam = searchParams.get("gw");

    if (!teamIdParam || !gwParam) {
      return NextResponse.json({ error: "Missing teamId or gw parameter" }, { status: 400 });
    }
    const teamId = Number.parseInt(teamIdParam, 10);
    const gameweek = Number.parseInt(gwParam, 10);
    if (!Number.isFinite(teamId) || !Number.isFinite(gameweek)) {
      return NextResponse.json({ error: "Invalid teamId or gw parameter" }, { status: 400 });
    }

    // We will compute league ownership within this endpoint too
    const tdResp = await fetch(fplApiRoutes.teamDetails(teamId.toString(), gameweek.toString()), { cache: "no-store" });

    if (!tdResp.ok) {
      return NextResponse.json({ error: `Failed to fetch team details: ${tdResp.status}` }, { status: 502 });
    }
    const teamDetails: TeamDetailsResponse = await tdResp.json();
    const squad = teamDetails.picks.filter((p) => p.position <= 15);

    // Use global bootstrap ownership for player rows
    const ownershipPercent = await getAllPlayersOwnership();

    const players = await Promise.all(
      squad.map(async (p) => {
        const name = await getPlayerName(p.element, 'web_name');
        const ownership = ownershipPercent.get(p.element) ?? 0;
        return { id: p.element, name, ownership, position: p.position };
      })
    );

    // Sort by position ascending
    players.sort((a, b) => a.position - b.position);

    return NextResponse.json({ players });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Unknown error" }, { status: 500 });
  }
}


