/**
 * `/api/ownership/[gw]` (Phase 2.4) — per-element league ownership for the
 * gameweek: which of the league's teams started each player (with that
 * team's net points), and how many captained them. Replaces
 * `/api/league/player-ownership` (which took a `playerId` and returned this
 * for one player); this returns every element in one bounded response so
 * `breakdown-table.tsx` fetches once per gameweek instead of once per click.
 *
 * Phase 4.2 adds `players`: the effective-ownership rows the
 * `/stats/ownership` page renders, built from the same picks by
 * services/ownership.ts.
 */

import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cachedKind, resolveTtl } from "@/lib/fpl/cache";
import { buildLivePointsMap, sumPicks } from "@/services/fpl-live";
import { fetchPicks } from "@/services/league";
import { buildEffectiveOwnership } from "@/services/ownership";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import {
  cacheControlHeader,
  getCurrentGameweek,
  invalidGameweek,
  parseGw,
  requireLeagueId,
  upstreamUnavailable,
} from "@/lib/api";

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
      const [standings, liveData, bootstrap] = await Promise.all([
        cachedKind("standings", `standings:${leagueId}`, () => client.classicStandings(leagueId)),
        cachedKind("live", `live:${gw}`, () => client.live(gw)),
        cachedKind("bootstrap", "bootstrap", () => client.bootstrap()),
      ]);
      const teams = standings.standings.results;
      const livePoints = buildLivePointsMap(liveData);

      const picksByEntry = await fetchPicks(
        teams.map((t) => t.entry),
        gw
      );

      const ownership = new Map<number, ElementOwnership>();

      for (const team of teams) {
        const picksData = picksByEntry.get(team.entry);
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

      const players = buildEffectiveOwnership(
        picksByEntry,
        teams.map((t) => ({ entry: t.entry, entryName: t.entry_name, playerName: t.player_name })),
        livePoints,
        new Map(bootstrap.elements.map((p) => [p.id, p])),
        new Map(bootstrap.teams.map((t) => [t.id, t]))
      );

      const ttl = await resolveTtl("picks");
      logTelemetry(path);

      return NextResponse.json(
        { ownership: Array.from(ownership.values()), players, managerCount: teams.length },
        { headers: { "Cache-Control": cacheControlHeader(ttl) } }
      );
    } catch (error) {
      console.error("GET /api/ownership/[gw] failed:", error);
      logTelemetry(path);
      return upstreamUnavailable();
    }
  });
}
