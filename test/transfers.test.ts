import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EntryTransfer, LeagueStandings, LiveGameweekData, SlimBootstrap, TeamDetails } from "@/lib/fpl/types";
import bootstrapSlim from "./fixtures/bootstrap-slim.json";
import liveGw2 from "./fixtures/live-gw2.json";
import picksGw2Bboost from "./fixtures/picks-gw2-bboost.json";

vi.mock("@/lib/fpl/client", () => ({
  bootstrap: vi.fn(),
  classicStandings: vi.fn(),
  fixtures: vi.fn(),
  live: vi.fn(),
  picks: vi.fn(),
  history: vi.fn(),
  entry: vi.fn(),
  entryTransfers: vi.fn(),
  h2hStandings: vi.fn(),
  h2hMatches: vi.fn(),
  eventStatus: vi.fn(),
  FplNotFoundError: class FplNotFoundError extends Error {},
}));

import * as client from "@/lib/fpl/client";
import {
  getTransferFeed,
  groupTransfersByManager,
  summarizeTransfers,
  transferGain,
  type TransferRow,
} from "@/services/transfers";

const bootstrap = bootstrapSlim as unknown as SlimBootstrap;
const live = liveGw2 as unknown as LiveGameweekData;
const bboostPicks = picksGw2Bboost as unknown as TeamDetails;

function row(entry: number, managerName: string, inPts: number, outPts: number, hitCost = 0, inName = "In"): TransferRow {
  return {
    entry,
    entryName: `Team ${entry}`,
    managerName,
    event: 2,
    playerIn: { id: 1, name: inName, team: 1, teamShortName: "ARS", teamCode: 3, elementType: 3, price: 60 },
    playerOut: { id: 2, name: "Out", team: 1, teamShortName: "ARS", teamCode: 3, elementType: 3, price: 55 },
    playerInPoints: inPts,
    playerOutPoints: outPts,
    hitCost,
  };
}

describe("summarizeTransfers", () => {
  it("returns nulls when nobody moved", () => {
    expect(summarizeTransfers([])).toEqual({ best: null, worst: null });
  });

  it("picks the biggest and smallest gain, breaking ties by manager then player", () => {
    const rows = [
      row(1, "Zed", 10, 2),
      row(2, "Amy", 10, 2, 0, "Bravo"),
      row(2, "Amy", 10, 2, 0, "Alpha"),
      row(3, "Kim", 1, 9),
    ];
    const { best, worst } = summarizeTransfers(rows);
    expect(transferGain(best!)).toBe(8);
    expect(best!.managerName).toBe("Amy");
    expect(best!.playerIn!.name).toBe("Alpha");
    expect(worst!.managerName).toBe("Kim");
    expect(transferGain(worst!)).toBe(-8);
  });

  it("uses the same row for best and worst when only one transfer was made", () => {
    const only = row(1, "Zed", 5, 5);
    expect(summarizeTransfers([only])).toEqual({ best: only, worst: only });
  });
});

describe("groupTransfersByManager", () => {
  it("sums each manager's in and out points and orders by net gain", () => {
    const groups = groupTransfersByManager([
      row(1, "Zed", 4, 6, 4),
      row(1, "Zed", 9, 1, 4),
      row(2, "Amy", 2, 2),
    ]);
    expect(groups.map((g) => g.managerName)).toEqual(["Zed", "Amy"]);
    expect(groups[0]).toMatchObject({ pointsIn: 13, pointsOut: 7, net: 6, hitCost: 4 });
    expect(groups[0].rows).toHaveLength(2);
    expect(groups[1]).toMatchObject({ net: 0, hitCost: 0 });
  });
});

describe("getTransferFeed", () => {
  const ENTRY = 2002;
  const OTHER = 2001;

  beforeEach(() => {
    process.env.FPL_LEAGUE_ID = "test-league";
    vi.mocked(client.bootstrap).mockResolvedValue(bootstrap);
    vi.mocked(client.eventStatus).mockResolvedValue([]);
    vi.mocked(client.live).mockResolvedValue(live);
    vi.mocked(client.picks).mockResolvedValue(bboostPicks);
    vi.mocked(client.classicStandings).mockResolvedValue({
      league: { name: "Test League" },
      last_updated_data: null,
      standings: {
        results: [ENTRY, OTHER].map((entry) => ({
          entry,
          entry_name: `Team ${entry}`,
          player_name: `Manager ${entry}`,
          rank: 1,
          last_rank: 1,
          event_total: 0,
          total: 0,
        })),
      },
    } satisfies LeagueStandings);
    vi.mocked(client.entryTransfers).mockImplementation(async (entry: number): Promise<EntryTransfer[]> =>
      entry === ENTRY
        ? [
            { element_in: 426, element_in_cost: 120, element_out: 8, element_out_cost: 56, entry, event: 2, time: "" },
            { element_in: 1, element_in_cost: 60, element_out: 2, element_out_cost: 45, entry, event: 1, time: "" },
          ]
        : []
    );
  });

  it("joins this gameweek's transfers to names, clubs, prices and live points", async () => {
    const feed = await getTransferFeed(2);
    expect(feed.selectedGameweek).toBe(2);
    expect(feed.rows).toHaveLength(1);
    const [only] = feed.rows;
    expect(only).toMatchObject({
      entry: ENTRY,
      managerName: `Manager ${ENTRY}`,
      event: 2,
      playerInPoints: 23,
      playerOutPoints: 11,
      hitCost: 0,
    });
    expect(only.playerIn).toMatchObject({ name: "B.Fernandes", teamShortName: "MUN", price: 120, elementType: 3 });
    expect(only.playerOut).toMatchObject({ name: "Calafiori", teamShortName: "ARS" });
    expect(transferGain(only)).toBe(12);
  });

  it("narrows to one manager and returns no rows for a manager outside the filter", async () => {
    expect((await getTransferFeed(2, OTHER)).rows).toEqual([]);
    expect((await getTransferFeed(2, 999)).rows).toEqual([]);
  });
});
