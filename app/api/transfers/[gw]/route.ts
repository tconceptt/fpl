/**
 * `/api/transfers/[gw]` (Phase 2.4), optionally `?entry=<id>` — transfers
 * for the gameweek across the league, joined to player names, prices and
 * raw gameweek points, plus the hit cost from picks
 * `entry_history.event_transfers_cost`. `?entry=` narrows to one manager's
 * rows (the transfers popup); the unfiltered form is Phase 4's league-wide
 * feed.
 *
 * Transfers are fetched for every relevant entry with one
 * `cachedManyKind("transfers", ...)` batch — the transfers TTL runs until
 * the next deadline, so this is cheap after the first call each gameweek.
 */

import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cachedKind, cachedManyKind, resolveTtl } from "@/lib/fpl/cache";
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
import type { EntryTransfer, TeamDetails } from "@/lib/fpl/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface TransferPlayerInfo {
  id: number;
  name: string;
  team: number;
  teamShortName: string;
  teamCode: number;
  elementType: number;
  price: number;
}

interface TransferRow {
  entry: number;
  entryName: string;
  managerName: string;
  event: number;
  playerIn: TransferPlayerInfo | null;
  playerOut: TransferPlayerInfo | null;
  playerInPoints: number;
  playerOutPoints: number;
  hitCost: number;
}

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

      const leagueId = requireLeagueId();
      const standings = await cachedKind("standings", `standings:${leagueId}`, () =>
        client.classicStandings(leagueId)
      );
      const teams = standings.standings.results;

      let entryFilter: number | null = null;
      if (entryParam !== null) {
        entryFilter = Number(entryParam);
        if (!isLeagueMember(entryFilter, teams.map((t) => t.entry))) {
          logTelemetry(path);
          return teamNotInLeague();
        }
      }

      const relevantTeams = entryFilter !== null ? teams.filter((t) => t.entry === entryFilter) : teams;

      const bootstrap = await cachedKind("bootstrap", "bootstrap", () => client.bootstrap());
      const playersMap = new Map(bootstrap.elements.map((p) => [p.id, p]));
      const teamsMap = new Map(bootstrap.teams.map((t) => [t.id, t]));

      const transfersKeys = relevantTeams.map((t) => `transfers:${t.entry}`);
      const transfersByKey = await cachedManyKind<EntryTransfer[]>(
        "transfers",
        transfersKeys,
        async (missingKeys) => {
          const fetched = new Map<string, EntryTransfer[]>();
          await Promise.all(
            missingKeys.map(async (key) => {
              const entry = Number(key.split(":")[1]);
              try {
                fetched.set(key, await client.entryTransfers(entry));
              } catch (error) {
                console.error(`Failed to fetch transfers for ${entry}:`, error);
                fetched.set(key, []);
              }
            })
          );
          return fetched;
        }
      );

      const liveData =
        relevantTeams.length > 0
          ? await cachedKind("live", `live:${gw}`, () => client.live(gw))
          : { elements: [] };
      const livePoints = new Map<number, number>(liveData.elements.map((e) => [e.id, e.stats.total_points]));

      const picksKeys = relevantTeams.map((t) => `picks:${t.entry}:${gw}`);
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

      const toPlayerInfo = (elementId: number): TransferPlayerInfo | null => {
        const player = playersMap.get(elementId);
        if (!player) return null;
        const club = teamsMap.get(player.team);
        return {
          id: player.id,
          name: player.web_name,
          team: player.team,
          teamShortName: club?.short_name ?? "",
          teamCode: club?.code ?? 0,
          elementType: player.element_type,
          price: player.now_cost,
        };
      };

      const rows: TransferRow[] = [];
      for (const team of relevantTeams) {
        const transfers = transfersByKey.get(`transfers:${team.entry}`) ?? [];
        const gwTransfers = transfers.filter((t) => t.event === gw);
        const picksData = picksByKey.get(`picks:${team.entry}:${gw}`);
        const hitCost = picksData?.entry_history.event_transfers_cost ?? 0;

        for (const t of gwTransfers) {
          rows.push({
            entry: team.entry,
            entryName: team.entry_name,
            managerName: team.player_name,
            event: t.event,
            playerIn: toPlayerInfo(t.element_in),
            playerOut: toPlayerInfo(t.element_out),
            playerInPoints: livePoints.get(t.element_in) ?? 0,
            playerOutPoints: livePoints.get(t.element_out) ?? 0,
            hitCost,
          });
        }
      }

      const responseBody: {
        transfers: TransferRow[];
        totalIn?: number;
        totalOut?: number;
        netPoints?: number;
        hitCost?: number;
      } = { transfers: rows };

      if (entryFilter !== null) {
        const totalIn = rows.reduce((sum, r) => sum + r.playerInPoints, 0);
        const totalOut = rows.reduce((sum, r) => sum + r.playerOutPoints, 0);
        responseBody.totalIn = totalIn;
        responseBody.totalOut = totalOut;
        responseBody.netPoints = totalIn - totalOut;
        responseBody.hitCost = picksByKey.get(`picks:${entryFilter}:${gw}`)?.entry_history.event_transfers_cost ?? 0;
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
