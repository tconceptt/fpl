/**
 * `/api/recap/[gw]` — the structured recap for one gameweek, for the recap
 * card on the gameweek page. Same text the bot posts, built from the same
 * cached data.
 */

import { NextResponse } from "next/server";
import { resolveTtl } from "@/lib/fpl/cache";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { cacheControlHeader, getCurrentGameweek, invalidGameweek, parseGw, upstreamUnavailable } from "@/lib/api";
import { getRecap } from "@/services/recap";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ gw: string }> }) {
  const { gw: gwParam } = await params;
  const path = `/api/recap/${gwParam}`;

  return withUpstreamCounter(async () => {
    try {
      const currentGameweek = await getCurrentGameweek();
      const gw = parseGw(gwParam, currentGameweek);
      if (gw === null) {
        logTelemetry(path);
        return invalidGameweek();
      }

      const recap = await getRecap(gw);
      const ttl = await resolveTtl("picks");
      logTelemetry(path);
      return NextResponse.json(recap, { headers: { "Cache-Control": cacheControlHeader(ttl) } });
    } catch (error) {
      console.error("GET /api/recap/[gw] failed:", error);
      logTelemetry(path);
      return upstreamUnavailable();
    }
  });
}
