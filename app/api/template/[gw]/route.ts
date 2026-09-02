/**
 * `/api/template/[gw]` (Phase 2.4) — average ownership of each team's full
 * 15-player squad for the gameweek, sorted lowest (most "differential")
 * first. Replaces `/api/template-leaderboard`; the per-team player list
 * that route's `/team` sub-route returned now lives on
 * `/api/team/[id]/[gw]`.
 */

import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cachedKind, cachedManyKind, resolveTtl } from "@/lib/fpl/cache";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import {
  cacheControlHeader,
  getCurrentGameweek,
  invalidGameweek,
  parseGw,
  requireLeagueId,
  upstreamUnavailable,
} from "@/lib/api";
import type { TeamDetails } from "@/lib/fpl/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ gw: string }> }) {
  const { gw: gwParam } = await params;
  const path = `/api/template/${gwParam}`;

  return withUpstreamCounter(async () => {
    try {
      const currentGameweek = await getCurrentGameweek();
      const gw = parseGw(gwParam, currentGameweek);
      if (gw === null) {
        logTelemetry(path);
        return invalidGameweek();
      }

      const leagueId = requireLeagueId();
      const [bootstrap, standings] = await Promise.all([
        cachedKind("bootstrap", "bootstrap", () => client.bootstrap()),
        cachedKind("standings", `standings:${leagueId}`, () => client.classicStandings(leagueId)),
      ]);

      const ownershipMap = new Map<number, number>(
        bootstrap.elements.map((el) => [el.id, Number.parseFloat(el.selected_by_percent || "0") || 0])
      );
      const teams = standings.standings.results;

      const picksKeys = teams.map((t) => `picks:${t.entry}:${gw}`);
      const picksByKey = await cachedManyKind<TeamDetails>("picks", picksKeys, async (missingKeys) => {
        const fetched = new Map<string, TeamDetails>();
        await Promise.all(
          missingKeys.map(async (key) => {
            const [, entryStr, gwStr] = key.split(":");
            try {
              fetched.set(key, await client.picks(Number(entryStr), Number(gwStr)));
            } catch (error) {
              console.error(`Failed to fetch picks for ${entryStr} gw${gwStr}:`, error);
            }
          })
        );
        return fetched;
      });

      const data = teams.map((team) => {
        const picksData = picksByKey.get(`picks:${team.entry}:${gw}`);
        const squad = picksData ? picksData.picks.filter((p) => p.position <= 15).map((p) => p.element) : [];
        const ownershipValues = squad.map((el) => ownershipMap.get(el) || 0);
        const playersCount = ownershipValues.length;
        const averageOwnership =
          playersCount === 0 ? 0 : ownershipValues.reduce((sum, v) => sum + v, 0) / playersCount;

        return {
          id: team.entry,
          name: team.entry_name,
          managerName: team.player_name,
          averageOwnership,
          playersCount,
        };
      });

      const sorted = data.slice().sort((a, b) => a.averageOwnership - b.averageOwnership);
      const ttl = await resolveTtl("picks");
      logTelemetry(path);

      return NextResponse.json({ data: sorted }, { headers: { "Cache-Control": cacheControlHeader(ttl) } });
    } catch (error) {
      console.error("GET /api/template/[gw] failed:", error);
      logTelemetry(path);
      return upstreamUnavailable();
    }
  });
}
