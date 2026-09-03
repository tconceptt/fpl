/**
 * `/api/transfers/[gw]` (Phase 2.4), optionally `?entry=<id>` — transfers
 * for the gameweek across the league, joined to player names, prices and
 * raw gameweek points, plus the hit cost from picks. `?entry=` narrows to
 * one manager's rows (the transfers popup); the unfiltered form is the
 * `/transfers` feed (Phase 4.4). The work lives in services/transfers.ts so
 * the page and the route render the same rows.
 */

import { NextResponse } from "next/server";
import { resolveTtl } from "@/lib/fpl/cache";
import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { getTransferFeed, summarizeTransfers, type TransferRow } from "@/services/transfers";
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

export async function GET(request: Request, { params }: { params: Promise<{ gw: string }> }) {
  const { gw: gwParam } = await params;
  const { searchParams } = new URL(request.url);
  const entryParam = searchParams.get("entry");
  const path = `/api/transfers/${gwParam}`;

  return withUpstreamCounter(async () => {
    try {
      const currentGameweek = await getCurrentGameweek();
      const gw = parseGw(gwParam, currentGameweek);
      if (gw === null) {
        logTelemetry(path);
        return invalidGameweek();
      }

      let entryFilter: number | null = null;
      if (entryParam !== null) {
        const leagueId = requireLeagueId();
        const standings = await cachedKind("standings", `standings:${leagueId}`, () =>
          client.classicStandings(leagueId)
        );
        entryFilter = Number(entryParam);
        if (!isLeagueMember(entryFilter, standings.standings.results.map((t) => t.entry))) {
          logTelemetry(path);
          return teamNotInLeague();
        }
      }

      const feed = await getTransferFeed(gw, entryFilter);
      const rows = feed.rows;

      const responseBody: {
        transfers: TransferRow[];
        best: TransferRow | null;
        worst: TransferRow | null;
        totalIn?: number;
        totalOut?: number;
        netPoints?: number;
        hitCost?: number;
      } = { transfers: rows, ...summarizeTransfers(rows) };

      if (entryFilter !== null) {
        const totalIn = rows.reduce((sum, r) => sum + r.playerInPoints, 0);
        const totalOut = rows.reduce((sum, r) => sum + r.playerOutPoints, 0);
        responseBody.totalIn = totalIn;
        responseBody.totalOut = totalOut;
        responseBody.netPoints = totalIn - totalOut;
        responseBody.hitCost = rows[0]?.hitCost ?? 0;
      }

      const ttl = await resolveTtl("transfers");
      logTelemetry(path);

      return NextResponse.json(responseBody, { headers: { "Cache-Control": cacheControlHeader(ttl) } });
    } catch (error) {
      console.error("GET /api/transfers/[gw] failed:", error);
      logTelemetry(path);
      return upstreamUnavailable();
    }
  });
}
