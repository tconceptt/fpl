import { describe, expect, it } from "vitest";
import { computeGameweekStats } from "@/services/gameweek-stats";
import type { GameweekStanding } from "@/types/league";

function standing(overrides: Partial<GameweekStanding>): GameweekStanding {
  return {
    entry: 1,
    entry_name: "Team",
    player_name: "Manager",
    event_total: 50,
    total_points: 500,
    net_points: 50,
    rank: 1,
    last_rank: 1,
    captain_name: undefined,
    active_chip: null,
    transfer_cost: 0,
    playersToStart: 0,
    h2h_rank: undefined,
    ...overrides,
  };
}

describe("computeGameweekStats", () => {
  it("returns placeholder values with no managers", () => {
    const stats = computeGameweekStats([], 5, 5);
    expect(stats.currentLeader).toEqual({ name: "-", team: "-", points: 0, net_points: 0, chipUsed: null });
    expect(stats.lowestPoints).toEqual({ name: "-", team: "-", points: 0, net_points: 0 });
    expect(stats.highestRiser).toEqual({ name: "-", team: "-", movement: 0 });
    expect(stats.steepestFaller).toEqual({ name: "-", team: "-", movement: 0 });
    expect(stats.mostCaptained).toBeUndefined();
    expect(stats.chipsSummary).toHaveLength(4);
    expect(stats.chipsSummary.every((c) => c.count === 0)).toBe(true);
  });

  it("picks the leader and struggler by net points, falling back to gross when net is null", () => {
    const standings = [
      standing({ entry: 1, entry_name: "Alpha", player_name: "A", event_total: 60, net_points: 56 }),
      standing({ entry: 2, entry_name: "Beta", player_name: "B", event_total: 70, net_points: null }),
      standing({ entry: 3, entry_name: "Gamma", player_name: "C", event_total: 30, net_points: 30 }),
    ];
    const stats = computeGameweekStats(standings, 5, 5);
    // Beta's net falls back to its gross (70), the highest.
    expect(stats.currentLeader.team).toBe("Beta");
    expect(stats.currentLeader.net_points).toBe(70);
    expect(stats.lowestPoints.team).toBe("Gamma");
    expect(stats.lowestPoints.net_points).toBe(30);
  });

  it("reports a hit as gross minus net via the leader/struggler net points", () => {
    const standings = [
      standing({ entry: 1, entry_name: "Hitter", event_total: 66, net_points: 62 }),
    ];
    const stats = computeGameweekStats(standings, 5, 5);
    expect(stats.currentLeader.points).toBe(66);
    expect(stats.currentLeader.net_points).toBe(62);
  });

  it("computes riser and faller from rank vs last_rank, ignoring last_rank 0", () => {
    const standings = [
      standing({ entry: 1, entry_name: "Riser", rank: 1, last_rank: 4 }),
      standing({ entry: 2, entry_name: "Faller", rank: 4, last_rank: 1 }),
      standing({ entry: 3, entry_name: "NoHistory", rank: 2, last_rank: 0 }),
    ];
    const stats = computeGameweekStats(standings, 5, 5);
    expect(stats.highestRiser.team).toBe("Riser");
    expect(stats.highestRiser.movement).toBe(3);
    expect(stats.steepestFaller.team).toBe("Faller");
    expect(stats.steepestFaller.movement).toBe(-3);
  });

  it("finds the most captained player from captain_name", () => {
    const standings = [
      standing({ entry: 1, captain_name: "Salah" }),
      standing({ entry: 2, captain_name: "Salah" }),
      standing({ entry: 3, captain_name: "Haaland" }),
    ];
    const stats = computeGameweekStats(standings, 5, 5);
    expect(stats.mostCaptained).toEqual({ player: "Salah", count: 2, percentage: 67 });
  });

  it("counts chips used from active_chip", () => {
    const standings = [
      standing({ entry: 1, active_chip: "wildcard" }),
      standing({ entry: 2, active_chip: "3xc" }),
      standing({ entry: 3, active_chip: "3xc" }),
      standing({ entry: 4, active_chip: null }),
    ];
    const stats = computeGameweekStats(standings, 5, 5);
    const wildcard = stats.chipsSummary.find((c) => c.type === "Wildcard");
    const tripleCaptain = stats.chipsSummary.find((c) => c.type === "Triple Captain");
    expect(wildcard?.count).toBe(1);
    expect(tripleCaptain?.count).toBe(2);
  });
});
