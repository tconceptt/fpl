import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import { buildTeamBreakdown } from "@/services/fpl-live";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const gw = searchParams.get("gw");

    if (!teamId || !gw) {
      return NextResponse.json({ error: "Missing teamId or gw parameter" }, { status: 400 });
    }

    const gwNumber = Number(gw);
    const entry = Number(teamId);

    const [bootstrap, live, fixtures, teamDetails] = await Promise.all([
      cachedKind("bootstrap", "bootstrap", () => client.bootstrap()),
      cachedKind("live", `live:${gwNumber}`, () => client.live(gwNumber)),
      cachedKind("fixtures", `fixtures:${gwNumber}`, () => client.fixtures(gwNumber)),
      cachedKind("picks", `picks:${entry}:${gwNumber}`, () => client.picks(entry, gwNumber)),
    ]);

    const playersMap = new Map(bootstrap.elements.map((p) => [p.id, p]));
    const teamsMap = new Map(bootstrap.teams.map((t) => [t.id, t]));

    const breakdown = buildTeamBreakdown(teamDetails, live, fixtures, playersMap, teamsMap);
    const withNames = breakdown.map((p) => ({
      ...p,
      name: playersMap.get(p.id)?.web_name ?? "Unknown",
    }));

    return NextResponse.json({ players: withNames });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Unknown error" }, { status: 500 });
  }
}
