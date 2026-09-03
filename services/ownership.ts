/**
 * Effective ownership (Phase 4.2).
 *
 * For every player any manager in the league fielded this gameweek: how
 * many managers own them, how many captained them, their effective
 * ownership, their raw gameweek points, and the league swing those points
 * caused.
 *
 * Everything is read off pick multipliers, which the FPL API has already
 * resolved for auto-subs and chips: a benched player carries 0 (unless Bench
 * Boost), a captain 2, a Triple Captain 3, and a captain who blanked hands
 * the armband — and the multiplier — to the vice. So:
 *
 *   owners             = managers with multiplier > 0
 *   captains           = managers with multiplier >= 2
 *   effectiveOwnership = Σ multiplier / managers × 100
 *   swing              = points × Σ multiplier / managers
 *
 * which is the plan's "points × (owners + captains) ÷ 14" once a captain's
 * extra multiplier is counted as their +1.
 *
 * `buildEffectiveOwnership` is pure and tested against fixtures;
 * `getOwnershipPage` is the loader.
 */

import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import { buildLivePointsMap } from "@/services/fpl-live";
import { fetchPicks, getLeagueSnapshot } from "@/services/league";
import type { BootstrapPlayer, BootstrapTeam, TeamDetails } from "@/lib/fpl/types";

export interface OwnershipManager {
  entry: number;
  entryName: string;
  playerName: string;
}

export interface EffectiveOwnershipRow {
  elementId: number;
  name: string;
  clubShortName: string;
  clubCode: number;
  elementType: number;
  owners: number;
  captains: number;
  /** Percentage of the league, multipliers included. */
  effectiveOwnership: number;
  /** Raw gameweek points, before any multiplier. */
  points: number;
  /** Points this player moved the average manager by. */
  swing: number;
  /** Managers who fielded the player, captains first, then alphabetical. */
  ownerNames: string[];
}

export interface OwnershipPage {
  leagueName: string;
  currentGameweek: number;
  selectedGameweek: number;
  managerCount: number;
  rows: EffectiveOwnershipRow[];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildEffectiveOwnership(
  picksByEntry: Map<number, TeamDetails>,
  managers: OwnershipManager[],
  livePoints: Map<number, number>,
  playersMap: Map<number, BootstrapPlayer>,
  teamsMap: Map<number, BootstrapTeam>
): EffectiveOwnershipRow[] {
  const managerCount = managers.length;
  if (managerCount === 0) return [];

  interface Tally {
    owners: number;
    captains: number;
    multiplierSum: number;
    ownerNames: Array<{ name: string; captain: boolean }>;
  }
  const tallies = new Map<number, Tally>();

  for (const manager of managers) {
    const picks = picksByEntry.get(manager.entry);
    if (!picks) continue;

    for (const pick of picks.picks) {
      if (pick.multiplier <= 0) continue;

      const tally = tallies.get(pick.element) ?? { owners: 0, captains: 0, multiplierSum: 0, ownerNames: [] };
      tally.owners += 1;
      tally.multiplierSum += pick.multiplier;
      const captain = pick.multiplier >= 2;
      if (captain) tally.captains += 1;
      tally.ownerNames.push({ name: manager.playerName, captain });
      tallies.set(pick.element, tally);
    }
  }

  const rows: EffectiveOwnershipRow[] = [];
  for (const [elementId, tally] of tallies) {
    const player = playersMap.get(elementId);
    const club = player ? teamsMap.get(player.team) : undefined;
    const points = livePoints.get(elementId) ?? 0;

    rows.push({
      elementId,
      name: player?.web_name ?? `#${elementId}`,
      clubShortName: club?.short_name ?? "",
      clubCode: club?.code ?? 0,
      elementType: player?.element_type ?? 0,
      owners: tally.owners,
      captains: tally.captains,
      effectiveOwnership: round1((tally.multiplierSum / managerCount) * 100),
      points,
      swing: round1((points * tally.multiplierSum) / managerCount),
      ownerNames: tally.ownerNames
        .sort((a, b) => Number(b.captain) - Number(a.captain) || a.name.localeCompare(b.name))
        .map((o) => (o.captain ? `${o.name} (C)` : o.name)),
    });
  }

  return rows.sort(
    (a, b) =>
      b.effectiveOwnership - a.effectiveOwnership ||
      b.points - a.points ||
      a.name.localeCompare(b.name)
  );
}

/** The "highest ownership" view: everyone, most owned first. */
export function highestOwnership(rows: EffectiveOwnershipRow[]): EffectiveOwnershipRow[] {
  return [...rows].sort(
    (a, b) =>
      b.effectiveOwnership - a.effectiveOwnership ||
      b.points - a.points ||
      a.name.localeCompare(b.name)
  );
}

/** The "differentials" view: players fielded by exactly one manager, best scorers first. */
export function differentials(rows: EffectiveOwnershipRow[]): EffectiveOwnershipRow[] {
  return rows
    .filter((row) => row.owners === 1)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

export async function getOwnershipPage(gw?: number): Promise<OwnershipPage> {
  // The snapshot brings bootstrap, standings and this gameweek's picks into
  // the request memo, so the reads below are free after it.
  const snapshot = await getLeagueSnapshot(gw);
  const selectedGameweek = snapshot.selectedGameweek;
  const entries = snapshot.managers.map((m) => m.entry);

  const [bootstrap, liveData, picks] = await Promise.all([
    cachedKind("bootstrap", "bootstrap", () => client.bootstrap()),
    cachedKind("live", `live:${selectedGameweek}`, () => client.live(selectedGameweek)),
    fetchPicks(entries, selectedGameweek),
  ]);

  const rows = buildEffectiveOwnership(
    picks,
    snapshot.managers.map((m) => ({ entry: m.entry, entryName: m.entry_name, playerName: m.player_name })),
    buildLivePointsMap(liveData),
    new Map(bootstrap.elements.map((p) => [p.id, p])),
    new Map(bootstrap.teams.map((t) => [t.id, t]))
  );

  return {
    leagueName: snapshot.leagueName,
    currentGameweek: snapshot.currentGameweek,
    selectedGameweek,
    managerCount: snapshot.managers.length,
    rows,
  };
}
