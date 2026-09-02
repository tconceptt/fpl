import { describe, expect, it } from "vitest";
import {
  resolveTieForGameweek,
  type TeamData,
  type TeamHistory,
} from "@/app/stats/getStatData";

function history(entries: Array<{ event: number; points: number; cost?: number }>): TeamHistory {
  return {
    current: entries.map((e) => ({
      event: e.event,
      points: e.points,
      points_on_bench: 0,
      event_transfers_cost: e.cost ?? 0,
      event_transfers: 0,
    })),
    chips: [],
  };
}

const teamDataMap = new Map<number, TeamData>([
  [1, { id: 1, name: "Team A", managerName: "Alice" }],
  [2, { id: 2, name: "Team B", managerName: "Bob" }],
]);

describe("resolveTieForGameweek", () => {
  it("resolves a tie using the higher score in the next finished gameweek", () => {
    const histories = new Map<number, TeamHistory>([
      [1, history([{ event: 1, points: 50 }, { event: 2, points: 60 }])],
      [2, history([{ event: 1, points: 50 }, { event: 2, points: 40 }])],
    ]);
    const gameweekHighestScorers = new Map([
      [2, [{ id: 1, points: 60, net_points: 60 }]],
    ]);

    const result = resolveTieForGameweek(
      1,
      [
        { id: 1, points: 50, net_points: 50 },
        { id: 2, points: 50, net_points: 50 },
      ],
      histories,
      [1, 2],
      teamDataMap,
      gameweekHighestScorers
    );

    expect(result.winnerId).toBe(1);
    expect(result.detail?.resolutionMethod).toBe("Higher score in GW2");
    expect(result.tiedGameweeks).toEqual([1]);
  });

  it("leaves the tie unresolved when it survives every finished subsequent gameweek", () => {
    const histories = new Map<number, TeamHistory>([
      [1, history([{ event: 1, points: 50 }, { event: 2, points: 45 }])],
      [2, history([{ event: 1, points: 50 }, { event: 2, points: 45 }])],
    ]);
    const gameweekHighestScorers = new Map([
      [
        2,
        [
          { id: 1, points: 45, net_points: 45 },
          { id: 2, points: 45, net_points: 45 },
        ],
      ],
    ]);

    const result = resolveTieForGameweek(
      1,
      [
        { id: 1, points: 50, net_points: 50 },
        { id: 2, points: 50, net_points: 50 },
      ],
      histories,
      [1, 2],
      teamDataMap,
      gameweekHighestScorers
    );

    expect(result.winnerId).toBeNull();
    expect(result.detail).toBeNull();
    // The tied teams also tied GW2, so both gameweeks are part of the chain.
    expect(result.tiedGameweeks).toEqual([1, 2]);
  });
});
