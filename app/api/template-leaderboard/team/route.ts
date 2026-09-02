import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cached } from "@/lib/fpl/cache";
import { ttlFor } from "@/lib/fpl/ttl";

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

    const [bootstrap, teamDetails] = await Promise.all([
      cached("bootstrap", ttlFor("bootstrap", "quiet"), () => client.bootstrap()),
      cached(`picks:${teamId}:${gameweek}`, ttlFor("picks", "quiet"), () =>
        client.picks(teamId, gameweek)
      ),
    ]);

    const squad = teamDetails.picks.filter((p) => p.position <= 15);
    const playersMap = new Map(bootstrap.elements.map((el) => [el.id, el]));

    const players = squad
      .map((p) => {
        const player = playersMap.get(p.element);
        return {
          id: p.element,
          name: player?.web_name ?? "Unknown",
          ownership: Number.parseFloat(player?.selected_by_percent || "0") || 0,
          position: p.position,
        };
      })
      .sort((a, b) => a.position - b.position);

    return NextResponse.json({ players });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Unknown error" }, { status: 500 });
  }
}
