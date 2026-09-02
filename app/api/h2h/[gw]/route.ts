/**
 * `/api/h2h/[gw]` (Phase 2.4) — thin pass-through of the H2H standings and
 * this gameweek's matches. `{ standings: null, matches: [] }` when
 * `FPL_H2H_LEAGUE_ID` is unset, which is a normal state (H2H leagues don't
 * carry over between seasons). Phase 4 builds the `/h2h` page on this.
 */

import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cachedKind, resolveTtl } from "@/lib/fpl/cache";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { cacheControlHeader, getCurrentGameweek, invalidGameweek, parseGw, upstreamUnavailable } from "@/lib/api";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ gw: string }> }) {
  const { gw: gwParam } = await params;
  const path = `/api/h2h/${gwParam}`;

  return withUpstreamCounter(async () => {
    try {
      const currentGameweek = await getCurrentGameweek();
      const gw = parseGw(gwParam, currentGameweek);
      if (gw === null) {
        logTelemetry(path);
        return invalidGameweek();
      }

      const ttl = await resolveTtl("h2h");
      const leagueId = process.env.FPL_H2H_LEAGUE_ID;

      if (!leagueId) {
        logTelemetry(path);
        return NextResponse.json(
          { standings: null, matches: [] },
          { headers: { "Cache-Control": cacheControlHeader(ttl) } }
        );
      }

      const [standings, matches] = await Promise.all([
        cachedKind("h2h", `h2h:${leagueId}`, () => client.h2hStandings(leagueId)),
        cachedKind("h2h", `h2h-matches:${leagueId}:${gw}`, () => client.h2hMatches(leagueId, gw)),
      ]);

      logTelemetry(path);
      return NextResponse.json({ standings, matches }, { headers: { "Cache-Control": cacheControlHeader(ttl) } });
    } catch (error) {
      console.error("GET /api/h2h/[gw] failed:", error);
      logTelemetry(path);
      return upstreamUnavailable();
    }
  });
}
