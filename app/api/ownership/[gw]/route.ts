/**
 * `/api/ownership/[gw]` (Phase 2.4) — per-element league ownership for the
 * gameweek: which of the league's teams started each player (with that
 * team's net points), and how many captained them. Replaces
 * `/api/league/player-ownership` (which took a `playerId` and returned this
 * for one player); this returns every element in one bounded response so
 * `breakdown-table.tsx` fetches once per gameweek instead of once per click,
 * and Phase 4's effective-ownership page can build on the same shape.
 */

import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cachedKind, cachedManyKind, resolveTtl } from "@/lib/fpl/cache";
import { buildLivePointsMap, sumPicks } from "@/services/fpl-live";
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

interface OwnerRow {
  teamId: number;
  teamName: string;
  managerName: string;
  netPoints: number;
  isCaptain: boolean;
}

interface ElementOwnership {
  elementId: number;
  owners: OwnerRow[];
  captains: number;
}

async function fetchPicksByKey(
  keys: string[]
): Promise<Map<string, TeamDetails>> {
  return cachedManyKind<TeamDetails>("picks", keys, async (missingKeys) => {
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
}

export async function GET(_request: Request, { params }: { params: Promise<{ gw: string }> }) {
  const { gw: gwParam } = await params;
  const path = `/api/ownership/${gwParam}`;

  return withUpstreamCounter(async () => {
    try {
      const currentGameweek = await getCurrentGameweek();
      const gw = parseGw(gwParam, currentGameweek);
      if (gw === null) {
        logTelemetry(path);
        return invalidGameweek();
      }

      const leagueId = requireLeagueId();
      const [standings, liveData] = await Promise.all([
        cachedKind("standings", `standings:${leagueId}`, () => client.classicStandings(leagueId)),
        cachedKind("live", `live:${gw}`, () => client.live(gw)),
      ]);
      const teams = standings.standings.results;
      const livePoints = buildLivePointsMap(liveData);

      const picksByKey = await fetchPicksByKey(teams.map((t) => `picks:${t.entry}:${gw}`));

      const ownership = new Map<number, ElementOwnership>();

      for (const team of teams) {
        const picksData = picksByKey.get(`picks:${team.entry}:${gw}`);
        if (!picksData) continue;

        const netPoints = sumPicks(picksData.picks, livePoints) - picksData.entry_history.event_transfers_cost;

        for (const pick of picksData.picks) {
          if (pick.position > 11) continue; // starting XI only — same semantics as the route this replaces.

          const entry = ownership.get(pick.element) ?? {
            elementId: pick.element,
            owners: [],
            captains: 0,
          };
          entry.owners.push({
            teamId: team.entry,
            teamName: team.entry_name,
            managerName: team.player_name,
            netPoints,
            isCaptain: pick.is_captain,
          });
          if (pick.is_captain) entry.captains++;
          ownership.set(pick.element, entry);
        }
      }

      const ttl = await resolveTtl("picks");
      logTelemetry(path);

      return NextResponse.json(
        { ownership: Array.from(ownership.values()) },
        { headers: { "Cache-Control": cacheControlHeader(ttl) } }
      );
    } catch (error) {
      console.error("GET /api/ownership/[gw] failed:", error);
      logTelemetry(path);
      return upstreamUnavailable();
    }
  });
}
