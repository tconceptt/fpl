import { describe, expect, it } from "vitest";
import { applyProvisionalHistory, settleGameweeks } from "@/services/settled";
import type { BootstrapEvent } from "@/lib/fpl/types";
import type { LeagueSnapshot, ManagerSnapshot } from "@/services/league";

const event = (id: number, extra: Partial<BootstrapEvent> = {}): BootstrapEvent =>
  ({ id, name: `GW${id}`, deadline_time: "2026-09-12T12:30:00Z", finished: false, data_checked: false, is_current: false, is_next: false, is_previous: false, ...extra }) as BootstrapEvent;

const events = [event(1, { finished: true, data_checked: true }), event(2, { finished: true, data_checked: true }), event(3, { is_current: true }), event(4, { is_next: true })];

describe("settleGameweeks", () => {
  it("counts the current gameweek as soon as every fixture is played, and marks it provisional", () => {
    const fixtures = [{ finished: true }, { finished: false, finished_provisional: true }];
    expect(settleGameweeks(events, fixtures)).toEqual({ currentGameweek: 3, settledGameweeks: [1, 2, 3], provisionalGameweek: 3 });
  });

  it("waits while a fixture is still to be played", () => {
    const fixtures = [{ finished: true }, { finished: false, finished_provisional: false }];
    expect(settleGameweeks(events, fixtures)).toEqual({ currentGameweek: 3, settledGameweeks: [1, 2], provisionalGameweek: null });
  });

  it("is no longer provisional once FPL has checked it", () => {
    const checked = events.map((e) => (e.id === 3 ? { ...e, data_checked: true } : e));
    expect(settleGameweeks(checked, [])).toEqual({ currentGameweek: 3, settledGameweeks: [1, 2, 3], provisionalGameweek: null });
  });
});

describe("applyProvisionalHistory", () => {
  const manager: ManagerSnapshot = {
    entry: 1, entry_name: "A", player_name: "Amy", rank: 1, last_rank: 1, event_total: 113, net_points: 109, total_points: 280, transfer_cost: 4,
    captain: null, active_chip: null, players_to_start: 0, h2h_rank: null, chips: [],
    history: [{ event: 3, points: 97, total_points: 264, event_transfers_cost: 4, event_transfers: 1, rank: 0, overall_rank: 0, points_on_bench: 0 }],
  };
  const base: LeagueSnapshot = { leagueName: "L", currentGameweek: 3, selectedGameweek: 3, liveState: "quiet", liveTotals: true, managers: [manager] };

  it("overlays live totals onto the gameweek's history row when the snapshot is live", () => {
    const [m] = applyProvisionalHistory(base);
    expect(m.history[0]).toMatchObject({ event: 3, points: 113, event_transfers_cost: 4, total_points: 280, event_transfers: 1 });
  });

  it("leaves history alone once totals come from FPL", () => {
    expect(applyProvisionalHistory({ ...base, liveTotals: false })[0].history[0].points).toBe(97);
  });
});
