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
import type { EntryTransfer, Fixture } from "@/lib/fpl/types";

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
  /**
   * True while the player's club has fixtures this gameweek and none has
   * kicked off, so the points above are not yet meaningful. A blank
   * gameweek (no fixture at all) is not "yet to play": those 0 points stand.
   */
  playerInYetToPlay: boolean;
  playerOutYetToPlay: boolean;
  /** The manager's total hit for the gameweek — the same on every one of their rows. */
  hitCost: number;
  /** The chip the manager played this gameweek, as FPL names it, or null. */
  activeChip: string | null;
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
  activeChip: string | null;
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

/** A transfer whose gain is final enough to rank: both players have kicked off (or have no fixture). */
export function transferSettled(row: TransferRow): boolean {
  return !row.playerInYetToPlay && !row.playerOutYetToPlay;
}

/**
 * Club ids whose gameweek has not started: they have at least one fixture and
 * none of them has kicked off. Clubs on a blank are deliberately excluded.
 */
export function clubsYetToPlay(fixtures: Pick<Fixture, "team_h" | "team_a" | "started">[]): Set<number> {
  const started = new Set<number>();
  const scheduled = new Set<number>();
  for (const f of fixtures) {
    for (const team of [f.team_h, f.team_a]) {
      scheduled.add(team);
      if (f.started) started.add(team);
    }
  }
  return new Set([...scheduled].filter((team) => !started.has(team)));
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
 * Transfers where either player is yet to play are left out, so a 0 from a
 * Monday-night player is never "worst transfer" on Saturday. Both are null
 * when nobody moved (or nothing has settled); the same row when only one did.
 */
export function summarizeTransfers(rows: TransferRow[]): { best: TransferRow | null; worst: TransferRow | null } {
  rows = rows.filter(transferSettled);
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
      activeChip: row.activeChip,
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
  const [transfersByEntry, liveData, picksByEntry, fixtures] = await Promise.all([
    fetchTransfers(entries),
    cachedKind("live", `live:${gw}`, () => client.live(gw)),
    fetchPicks(entries, gw),
    cachedKind("fixtures", `fixtures:${gw}`, () => client.fixtures(gw)),
  ]);
  const yetToPlay = clubsYetToPlay(fixtures);

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

  const isYetToPlay = (elementId: number): boolean => {
    const player = playersMap.get(elementId);
    return player ? yetToPlay.has(player.team) : false;
  };

  const rows: TransferRow[] = [];
  for (const team of teams) {
    const picks = picksByEntry.get(team.entry);
    const hitCost = picks?.entry_history.event_transfers_cost ?? 0;
    const activeChip = picks?.active_chip ?? null;
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
        playerInYetToPlay: isYetToPlay(t.element_in),
        playerOutYetToPlay: isYetToPlay(t.element_out),
        hitCost,
        activeChip,
      });
    }
  }

  return { selectedGameweek: gw, rows };
}
