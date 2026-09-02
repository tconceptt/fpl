/**
 * `/api/team/[id]/[gw]` (Phase 2.4), optionally `?compare=<id>` — the team
 * page's data. Replaces `/api/points-breakdown` and
 * `/api/template-leaderboard/team`; `mainTeam.players[].ownership` is what
 * the latter returned, now folded into the same payload the team page
 * server-renders from.
 */

import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cachedKind, resolveTtl } from "@/lib/fpl/cache";
import { getTeamPageData } from "@/services/team-page-service";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import {
  cacheControlHeader,
  getCurrentGameweek,
  invalidGameweek,
  isLeagueMember,
  parseGw,
  requireLeagueId,
  teamNotInLeague,
  upstreamUnavailable,
} from "@/lib/api";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; gw: string }> }
) {
  const { id, gw: gwParam } = await params;
  const { searchParams } = new URL(request.url);
  const compareParam = searchParams.get("compare") ?? undefined;
  const path = `/api/team/${id}/${gwParam}`;

  return withUpstreamCounter(async () => {
    try {
      const currentGameweek = await getCurrentGameweek();
      const gw = parseGw(gwParam, currentGameweek);
      if (gw === null) {
        logTelemetry(path);
        return invalidGameweek();
      }

      const leagueId = requireLeagueId();
      const standings = await cachedKind("standings", `standings:${leagueId}`, () =>
        client.classicStandings(leagueId)
      );
      const memberEntries = standings.standings.results.map((t) => t.entry);

      if (!isLeagueMember(Number(id), memberEntries)) {
        logTelemetry(path);
        return teamNotInLeague();
      }
      if (compareParam !== undefined && !isLeagueMember(Number(compareParam), memberEntries)) {
        logTelemetry(path);
        return teamNotInLeague();
      }

      const data = await getTeamPageData(id, String(gw), compareParam);
      const ttl = await resolveTtl("picks");
      logTelemetry(path);

      return NextResponse.json(data, { headers: { "Cache-Control": cacheControlHeader(ttl) } });
    } catch (error) {
      console.error("GET /api/team/[id]/[gw] failed:", error);
      logTelemetry(path);
      return upstreamUnavailable();
    }
  });
}
