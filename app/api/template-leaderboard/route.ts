import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gwParam = searchParams.get("gw");
    if (!gwParam) {
      return NextResponse.json({ error: "Missing gw parameter" }, { status: 400 });
    }
    const gameweek = Number.parseInt(gwParam, 10);
    if (!Number.isFinite(gameweek) || gameweek < 1) {
      return NextResponse.json({ error: "Invalid gw parameter" }, { status: 400 });
    }

    const leagueId = process.env.FPL_LEAGUE_ID;
    if (!leagueId) {
      return NextResponse.json({ error: "FPL_LEAGUE_ID not set" }, { status: 500 });
    }

    const [bootstrap, standings] = await Promise.all([
      cachedKind("bootstrap", "bootstrap", () => client.bootstrap()),
      cachedKind("standings", `standings:${leagueId}`, () =>
        client.classicStandings(leagueId)
      ),
    ]);

    const ownershipMap = new Map<number, number>(
      bootstrap.elements.map((el) => [el.id, Number.parseFloat(el.selected_by_percent || "0") || 0])
    );
    const teams = standings.standings.results;

    // Fetch picks for all teams once and compute average using global ownership from bootstrap
    const data = await Promise.all(
      teams.map(async (team) => {
        try {
          const teamDetails = await cachedKind(
            "picks",
            `picks:${team.entry}:${gameweek}`,
            () => client.picks(team.entry, gameweek)
          );
          const squad = teamDetails.picks.filter((p) => p.position <= 15).map((p) => p.element);
          const ownershipValues = squad.map((el) => ownershipMap.get(el) || 0);
          const playersCount = ownershipValues.length || 0;
          const averageOwnership = playersCount === 0
            ? 0
            : ownershipValues.reduce((sum, v) => sum + v, 0) / playersCount;
          return {
            id: team.entry,
            name: team.entry_name,
            managerName: team.player_name,
            averageOwnership,
            playersCount,
          };
        } catch {
          return {
            id: team.entry,
            name: team.entry_name,
            managerName: team.player_name,
            averageOwnership: 0,
            playersCount: 0,
          };
        }
      })
    );

    const sorted = data.slice().sort((a, b) => a.averageOwnership - b.averageOwnership);
    return NextResponse.json({ data: sorted });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Unknown error" }, { status: 500 });
  }
}
