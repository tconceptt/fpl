import { describe, expect, it } from "vitest";
import { buildH2HMatchups, buildH2HTable, matchupState } from "@/services/h2h";
import type { ManagerSnapshot } from "@/services/league";
import type { H2HMatch, H2HStandings } from "@/lib/fpl/types";

function manager(entry: number, netPoints: number, rank: number, extra: Partial<ManagerSnapshot> = {}): ManagerSnapshot {
  return {
    entry,
    entry_name: `Team ${entry}`,
    player_name: `Manager ${entry}`,
    rank,
    last_rank: rank,
    event_total: netPoints,
    net_points: netPoints,
    total_points: 100 + netPoints,
    transfer_cost: 0,
    captain: { id: 426, web_name: "B.Fernandes" },
    active_chip: null,
    players_to_start: 3,
    h2h_rank: null,
    history: [],
    chips: [],
    ...extra,
  };
}

function match(id: number, home: number | null, away: number | null, homePts: number, awayPts: number, isBye = false): H2HMatch {
  return {
    id,
    entry_1_entry: home,
    entry_1_name: home === null ? "AVERAGE" : `Old name ${home}`,
    entry_1_player_name: home === null ? "" : `Old manager ${home}`,
    entry_1_points: homePts,
    entry_2_entry: away,
    entry_2_name: away === null ? "AVERAGE" : `Old name ${away}`,
    entry_2_player_name: away === null ? "" : `Old manager ${away}`,
    entry_2_points: awayPts,
    event: 2,
    is_bye: isBye,
  };
}

describe("matchupState", () => {
  it("reads from the home side's perspective", () => {
    expect(matchupState(60, 50)).toBe("leading");
    expect(matchupState(50, 60)).toBe("trailing");
    expect(matchupState(55, 55)).toBe("level");
  });
});

describe("buildH2HMatchups", () => {
  const managers = [manager(1, 70, 1, { active_chip: "bboost" }), manager(2, 44, 2), manager(3, 44, 3)];

  it("scores each side from the snapshot's net points, not FPL's recorded points", () => {
    const [m] = buildH2HMatchups([match(10, 1, 2, 0, 0)], managers);
    expect(m.home.points).toBe(70);
    expect(m.away.points).toBe(44);
    expect(m.state).toBe("leading");
    expect(m.isBye).toBe(false);
    expect(m.home.activeChip).toBe("bboost");
    expect(m.home.captain).toBe("B.Fernandes");
    expect(m.home.rank).toBe(1);
    // Names come from the snapshot too, so a renamed team shows its current name.
    expect(m.home.entryName).toBe("Team 1");
  });

  it("falls back to the recorded points for the AVERAGE bye side", () => {
    const [m] = buildH2HMatchups([match(11, 3, null, 0, 51, true)], managers);
    expect(m.isBye).toBe(true);
    expect(m.away.entry).toBeNull();
    expect(m.away.points).toBe(51);
    expect(m.away.rank).toBeNull();
    expect(m.state).toBe("trailing");
  });

  it("marks equal scores level and orders matchups by id", () => {
    const result = buildH2HMatchups([match(20, 2, 3, 0, 0), match(5, 1, 2, 0, 0)], managers);
    expect(result.map((m) => m.id)).toEqual([5, 20]);
    expect(result[1].state).toBe("level");
  });
});

describe("buildH2HTable", () => {
  const rows = [
    { entry: 2, entry_name: "B", player_name: "Bee", rank: 2, last_rank: 1, matches_played: 2, matches_won: 1, matches_drawn: 0, matches_lost: 1, points_for: 120, total: 3 },
    { entry: 1, entry_name: "A", player_name: "Ay", rank: 1, last_rank: 2, matches_played: 2, matches_won: 2, matches_drawn: 0, matches_lost: 0, points_for: 130, total: 6 },
  ];

  it("accepts the object form and sorts by rank", () => {
    const table = buildH2HTable({ standings: { results: rows } } as H2HStandings);
    expect(table.map((r) => r.entryName)).toEqual(["A", "B"]);
    expect(table[0]).toMatchObject({ rank: 1, lastRank: 2, won: 2, pointsFor: 130, total: 6 });
  });

  it("accepts the bare-array form and normalises missing counters to zero", () => {
    const table = buildH2HTable({ standings: [{ entry: null, entry_name: "AVERAGE", rank: 3 }] } as H2HStandings);
    expect(table).toEqual([
      { rank: 3, lastRank: 3, entry: null, entryName: "AVERAGE", playerName: "", played: 0, won: 0, drawn: 0, lost: 0, pointsFor: 0, total: 0 },
    ]);
  });

  it("returns an empty table when there is no H2H league", () => {
    expect(buildH2HTable(null)).toEqual([]);
  });
});
