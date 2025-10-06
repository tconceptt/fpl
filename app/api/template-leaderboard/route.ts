import { NextResponse } from "next/server";
import { fplApiRoutes } from "@/lib/routes";
import { getAllPlayersOwnership } from "@/services/get-player-ownership";

interface StandingsResult {
  entry: number;
  entry_name: string;
  player_name: string;
}

interface LeagueStandingsResponse {
  standings: {
    results: StandingsResult[];
  };
}

interface TeamDetailsResponse {
  picks: Array<{ element: number; position: number }>;
}

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

    const [ownershipMap, standingsResp] = await Promise.all([
      getAllPlayersOwnership(),
      fetch(fplApiRoutes.standings(leagueId), { cache: "no-store" }),
    ]);

    if (!standingsResp.ok) {
      return NextResponse.json({ error: `Failed to fetch standings: ${standingsResp.status}` }, { status: 502 });
    }
    const standingsJson: LeagueStandingsResponse = await standingsResp.json();
    const teams = standingsJson.standings.results;

    // Fetch picks for all teams once and compute average using global ownership from bootstrap
    const data = await Promise.all(
      teams.map(async (team) => {
        try {
          const resp = await fetch(
            fplApiRoutes.teamDetails(team.entry.toString(), gameweek.toString()),
            { cache: "no-store" }
          );
          if (!resp.ok) {
            return {
              id: team.entry,
              name: team.entry_name,
              managerName: team.player_name,
              averageOwnership: 0,
              playersCount: 0,
            };
          }
          const json: TeamDetailsResponse = await resp.json();
          const squad = json.picks.filter((p) => p.position <= 15).map((p) => p.element);
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


