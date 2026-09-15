/**
 * When a gameweek counts.
 *
 * FPL flips an event's `finished`/`data_checked` flags hours — sometimes a
 * day — after its last match, when it processes auto-subs and re-checks
 * bonus. The league wants winners, months and recaps the moment the last
 * whistle goes, so a gameweek is *settled* here as soon as every fixture in
 * it has been played (`finished` or `finished_provisional`), or FPL has
 * checked it. The gap between the two is the *provisional* gameweek: its
 * numbers come from live data with our own auto-subs applied
 * (`resolveProvisionalPicks`), and the tick compares them against FPL's
 * final figures once `data_checked` flips (see services/tick.ts).
 *
 * `settleGameweeks` is pure; `getSettlement` loads what it needs from the
 * cache. `applyProvisionalHistory` overlays a snapshot's live totals onto
 * each manager's history so season stats computed from history rows (the
 * stats hub, manager of the month) count the provisional gameweek with the
 * same numbers the table shows.
 */

import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import type { BootstrapEvent, Fixture } from "@/lib/fpl/types";
import type { LeagueSnapshot, ManagerSnapshot } from "@/services/league";

export interface Settlement {
  currentGameweek: number;
  /** Every gameweek that counts, ascending. */
  settledGameweeks: number[];
  /** The settled gameweek FPL has not checked yet, if any. */
  provisionalGameweek: number | null;
}

export function fixturesAllPlayed(fixtures: Pick<Fixture, "finished" | "finished_provisional">[]): boolean {
  return fixtures.length > 0 && fixtures.every((f) => f.finished === true || f.finished_provisional === true);
}

export function findCurrentEvent(events: BootstrapEvent[]): BootstrapEvent | undefined {
  return (
    events.find((e) => e.is_current) ??
    events.find((e) => e.is_next) ??
    [...events].reverse().find((e) => e.finished)
  );
}

/** Pure: which gameweeks count, given bootstrap events and the current event's fixtures. */
export function settleGameweeks(
  events: BootstrapEvent[],
  currentFixtures: Pick<Fixture, "finished" | "finished_provisional">[]
): Settlement {
  const current = findCurrentEvent(events);
  const currentGameweek = current?.id ?? 1;
  const settled = events.filter((e) => e.data_checked).map((e) => e.id);
  let provisional: number | null = null;
  if (current && !current.data_checked && fixturesAllPlayed(currentFixtures)) {
    settled.push(current.id);
    provisional = current.id;
  }
  return { currentGameweek, settledGameweeks: settled.sort((a, b) => a - b), provisionalGameweek: provisional };
}

export async function getSettlement(): Promise<Settlement> {
  const bootstrap = await cachedKind("bootstrap", "bootstrap", () => client.bootstrap());
  const current = findCurrentEvent(bootstrap.events);
  const fixtures =
    current && !current.data_checked
      ? await cachedKind("fixtures", `fixtures:${current.id}`, () => client.fixtures(current.id))
      : [];
  return settleGameweeks(bootstrap.events, fixtures);
}

/**
 * Managers whose history row for the snapshot's gameweek carries the
 * snapshot's live totals. A no-op unless the snapshot was built from live
 * data (`liveTotals`), i.e. the gameweek is still provisional.
 */
export function applyProvisionalHistory(snapshot: LeagueSnapshot): ManagerSnapshot[] {
  if (!snapshot.liveTotals) return snapshot.managers;
  const gw = snapshot.selectedGameweek;
  return snapshot.managers.map((m) => {
    const existing = m.history.find((g) => g.event === gw);
    const row = {
      ...(existing ?? { event: gw, points_on_bench: 0, event_transfers: 0, rank: 0, overall_rank: 0 }),
      event: gw,
      points: m.event_total,
      event_transfers_cost: m.transfer_cost,
      total_points: m.total_points,
    };
    const history = existing ? m.history.map((g) => (g.event === gw ? row : g)) : [...m.history, row];
    return { ...m, history };
  });
}
