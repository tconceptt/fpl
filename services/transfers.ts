/**
 * Transfer feed (Phase 4.4).
 *
 * Every manager's transfers for one gameweek, joined to names, prices and
 * the raw gameweek points of the player in and out, plus the hit cost from
 * the manager's picks. `/api/transfers/[gw]` and `/transfers` both render
 * from `getTransferFeed`; `summarizeTransfers` and `groupTransfersByManager`
 * are pure and tested against fixtures.
 *
 * Transfers are cached until the next deadline, and picks/live share keys
 * with the league snapshot, so after the first call each gameweek this is
 * all Redis reads.
 */

import * as client from "@/lib/fpl/client";
import { cachedKind, cachedManyKind } from "@/lib/fpl/cache";
import { buildLivePointsMap } from "@/services/fpl-live";
import { fetchPicks } from "@/services/league";
import { requireLeagueId } from "@/lib/api";
import type { EntryTransfer } from "@/lib/fpl/types";

export interface TransferPlayerInfo {
  id: number;
  name: string;
  team: number;
  teamShortName: string;
  teamCode: number;
  elementType: number;
  /** Price in tenths of a million, as FPL reports `now_cost`. */
  price: number;
}

export interface TransferRow {
  entry: number;
  entryName: string;
  managerName: string;
  event: number;
  playerIn: TransferPlayerInfo | null;
  playerOut: TransferPlayerInfo | null;
  playerInPoints: number;
  playerOutPoints: number;
  /** The manager's total hit for the gameweek — the same on every one of their rows. */
  hitCost: number;
}

export interface TransferFeed {
  selectedGameweek: number;
  rows: TransferRow[];
}

export interface ManagerTransfers {
  entry: number;
  entryName: string;
  managerName: string;
  hitCost: number;
  rows: TransferRow[];
  pointsIn: number;
  pointsOut: number;
  /** In minus out, before the hit. */
  net: number;
}

/** Points gained by a single transfer, before any hit. */
export function transferGain(row: TransferRow): number {
  return row.playerInPoints - row.playerOutPoints;
}

function compareRows(a: TransferRow, b: TransferRow): number {
  return (
    a.managerName.localeCompare(b.managerName) ||
    (a.playerIn?.name ?? "").localeCompare(b.playerIn?.name ?? "")
  );
}

/**
 * Best and worst single transfer of the week by points gained, with ties
 * broken by manager name then player name so reloads never swap the tiles.
 * Both are null when nobody moved; the same row when only one did.
 */
export function summarizeTransfers(rows: TransferRow[]): { best: TransferRow | null; worst: TransferRow | null } {
  if (rows.length === 0) return { best: null, worst: null };

  const best = [...rows].sort((a, b) => transferGain(b) - transferGain(a) || compareRows(a, b))[0];
  const worst = [...rows].sort((a, b) => transferGain(a) - transferGain(b) || compareRows(a, b))[0];
  return { best, worst };
}

/** Rows grouped per manager, biggest net gain first, then by manager name. */
export function groupTransfersByManager(rows: TransferRow[]): ManagerTransfers[] {
  const groups = new Map<number, ManagerTransfers>();

  for (const row of rows) {
    const group = groups.get(row.entry) ?? {
      entry: row.entry,
      entryName: row.entryName,
      managerName: row.managerName,
      hitCost: row.hitCost,
      rows: [],
      pointsIn: 0,
      pointsOut: 0,
      net: 0,
    };
    group.rows.push(row);
    group.pointsIn += row.playerInPoints;
    group.pointsOut += row.playerOutPoints;
    group.net = group.pointsIn - group.pointsOut;
    groups.set(row.entry, group);
  }

  return [...groups.values()].sort(
    (a, b) => b.net - a.net || a.managerName.localeCompare(b.managerName)
  );
}

async function fetchTransfers(entries: number[]): Promise<Map<number, EntryTransfer[]>> {
  const keys = entries.map((entry) => `transfers:${entry}`);
  const byKey = await cachedManyKind<EntryTransfer[]>("transfers", keys, async (missingKeys) => {
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
  });

  const byEntry = new Map<number, EntryTransfer[]>();
  for (const [key, value] of byKey) {
    byEntry.set(Number(key.split(":")[1]), value);
  }
  return byEntry;
}

/**
 * The feed for one gameweek. `entryFilter` narrows it to one manager (the
 * team page's transfers popup); callers validate membership before passing
 * it. `gw` must already be validated against the current gameweek.
 */
export async function getTransferFeed(gw: number, entryFilter: number | null = null): Promise<TransferFeed> {
  const leagueId = requireLeagueId();
  const [standings, bootstrap] = await Promise.all([
    cachedKind("standings", `standings:${leagueId}`, () => client.classicStandings(leagueId)),
    cachedKind("bootstrap", "bootstrap", () => client.bootstrap()),
  ]);

  const teams = standings.standings.results.filter(
    (t) => entryFilter === null || t.entry === entryFilter
  );
  if (teams.length === 0) return { selectedGameweek: gw, rows: [] };

  const entries = teams.map((t) => t.entry);
  const [transfersByEntry, liveData, picksByEntry] = await Promise.all([
    fetchTransfers(entries),
    cachedKind("live", `live:${gw}`, () => client.live(gw)),
    fetchPicks(entries, gw),
  ]);

  const playersMap = new Map(bootstrap.elements.map((p) => [p.id, p]));
  const teamsMap = new Map(bootstrap.teams.map((t) => [t.id, t]));
  const livePoints = buildLivePointsMap(liveData);

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
  for (const team of teams) {
    const hitCost = picksByEntry.get(team.entry)?.entry_history.event_transfers_cost ?? 0;
    const gwTransfers = (transfersByEntry.get(team.entry) ?? []).filter((t) => t.event === gw);

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

  return { selectedGameweek: gw, rows };
}
