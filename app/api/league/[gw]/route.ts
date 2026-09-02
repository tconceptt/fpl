/**
 * `/api/league/[gw]` (Phase 2.4) — the standings for one gameweek, the same
 * mapping app/page.tsx renders from `getLeagueSnapshot`. This is what
 * Phase 3's client-side gameweek switching reads, and the team selector
 * reads the team list from `standings`.
 */

import { NextResponse } from "next/server";
import { getLeagueSnapshot, toStandings } from "@/services/league";
import { resolveTtl } from "@/lib/fpl/cache";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import {
  cacheControlHeader,
  getCurrentGameweek,
  invalidGameweek,
  parseGw,
  upstreamUnavailable,
} from "@/lib/api";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ gw: string }> }) {
  const { gw: gwParam } = await params;
  const path = `/api/league/${gwParam}`;

  return withUpstreamCounter(async () => {
    try {
      const currentGameweek = await getCurrentGameweek();
      const gw = parseGw(gwParam, currentGameweek);
      if (gw === null) {
        logTelemetry(path);
        return invalidGameweek();
      }

      const snapshot = await getLeagueSnapshot(gw);
      const ttl = await resolveTtl("picks");
      logTelemetry(path);

      return NextResponse.json(
        {
          leagueName: snapshot.leagueName,
          currentGameweek: snapshot.currentGameweek,
          selectedGameweek: snapshot.selectedGameweek,
          liveState: snapshot.liveState,
          standings: toStandings(snapshot),
        },
        { headers: { "Cache-Control": cacheControlHeader(ttl) } }
      );
    } catch (error) {
      console.error("GET /api/league/[gw] failed:", error);
      logTelemetry(path);
      return upstreamUnavailable();
    }
  });
}
