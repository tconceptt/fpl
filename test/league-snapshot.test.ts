import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Fixture,
  H2HStandings,
  LeagueStandings,
  LiveGameweekData,
  SlimBootstrap,
  TeamDetails,
  TeamHistory,
} from "@/lib/fpl/types";

import bootstrapSlim from "./fixtures/bootstrap-slim.json";
import liveGw2 from "./fixtures/live-gw2.json";
import fixturesGw3 from "./fixtures/fixtures-gw3.json";
import picksGw2Bboost from "./fixtures/picks-gw2-bboost.json";
import historyFixture from "./fixtures/history.json";

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

// Imported after the mock so it picks up the mocked module.
import * as client from "@/lib/fpl/client";
import { getLeagueSnapshot } from "@/services/league";

const bootstrap = bootstrapSlim as unknown as SlimBootstrap;
const live = liveGw2 as unknown as LiveGameweekData;
const fixtures = fixturesGw3 as unknown as Fixture[];
const bboostPicks = picksGw2Bboost as unknown as TeamDetails;
const bboostHistory = historyFixture as unknown as TeamHistory;

/** A plain manager with no chip and a much smaller gross gameweek total. */
const plainHistory: TeamHistory = {
  current: [
    { event: 1, points: 40, total_points: 40, rank: 1, rank_sort: 1, overall_rank: 1, event_transfers: 0, event_transfers_cost: 0, points_on_bench: 2 } as TeamHistory["current"][number],
    { event: 2, points: 60, total_points: 100, rank: 1, rank_sort: 1, overall_rank: 1, event_transfers: 1, event_transfers_cost: 0, points_on_bench: 3 } as TeamHistory["current"][number],
  ],
  past: [],
  chips: [],
};

const plainPicks: TeamDetails = {
  active_chip: null,
  automatic_subs: [],
  entry_history: { event_transfers: 1, event_transfers_cost: 0, points_on_bench: 3, points: 60 },
  // Elements 1 and 2 both appear in the GW2 live fixture with non-zero points.
  picks: [
    { element: 1, position: 1, multiplier: 1, is_captain: true, is_vice_captain: false },
    { element: 2, position: 2, multiplier: 1, is_captain: false, is_vice_captain: false },
  ],
};

const BBOOST_ENTRY = 2002;
const PLAIN_ENTRIES = [2001, 2003, 2004];
const ALL_ENTRIES = [2001, BBOOST_ENTRY, 2003, 2004];

function buildStandings(): LeagueStandings {
  return {
    league: { name: "Test League" },
    last_updated_data: null,
    standings: {
      results: ALL_ENTRIES.map((entry) => ({
        entry,
        entry_name: `Team ${entry}`,
        player_name: `Manager ${entry}`,
        rank: 0,
        last_rank: 0,
        event_total: 0,
        total: 0,
      })),
    },
  };
}

describe("getLeagueSnapshot", () => {
  beforeEach(() => {
    process.env.FPL_LEAGUE_ID = "test-league";
    delete process.env.FPL_H2H_LEAGUE_ID;

    vi.mocked(client.bootstrap).mockResolvedValue(bootstrap);
    vi.mocked(client.classicStandings).mockResolvedValue(buildStandings());
    vi.mocked(client.fixtures).mockResolvedValue(fixtures);
    vi.mocked(client.live).mockResolvedValue(live);
    vi.mocked(client.eventStatus).mockResolvedValue([]);
    vi.mocked(client.h2hStandings).mockResolvedValue(null as unknown as H2HStandings);

    vi.mocked(client.history).mockImplementation(async (entry: number) =>
      entry === BBOOST_ENTRY ? bboostHistory : plainHistory
    );
    vi.mocked(client.picks).mockImplementation(async (entry: number) =>
      entry === BBOOST_ENTRY ? bboostPicks : plainPicks
    );
  });

  it("uses live picks for the current, unfinished gameweek and matches entry_history.points for the Bench Boost entry", async () => {
    // bootstrap-slim.json has GW2 as is_current, so gw=2 is "the current gameweek".
    // fixtures-gw3.json is all `started: false`, so the gameweek reads as
    // unfinished and the snapshot must sum live points rather than trust
    // (possibly stale) history.
    const snapshot = await getLeagueSnapshot(2);

    expect(snapshot.selectedGameweek).toBe(2);
    expect(snapshot.currentGameweek).toBe(2);

    const bboostManager = snapshot.managers.find((m) => m.entry === BBOOST_ENTRY);
    expect(bboostManager).toBeDefined();
    // Gross gameweek total via sumPicks, matching entry_history.points from
    // the fixture (verified against the FPL API separately, see fpl-live.test.ts).
    expect(bboostManager!.event_total).toBe(130);
    expect(bboostManager!.active_chip).toBe("bboost");
  });

  it("produces dense 1..N ranks with no gaps", async () => {
    const snapshot = await getLeagueSnapshot(2);
    const ranks = snapshot.managers.map((m) => m.rank).sort((a, b) => a - b);
    expect(ranks).toEqual(ALL_ENTRIES.map((_, i) => i + 1));

    const lastRanks = snapshot.managers.map((m) => m.last_rank).sort((a, b) => a - b);
    // last_rank is also a dense 1..N permutation once GW1 data exists for everyone.
    expect(lastRanks).toEqual(ALL_ENTRIES.map((_, i) => i + 1));
  });

  it("ranks the Bench Boost manager's big gameweek above the plain managers", async () => {
    const snapshot = await getLeagueSnapshot(2);
    const bboostManager = snapshot.managers.find((m) => m.entry === BBOOST_ENTRY)!;
    const plainManagers = snapshot.managers.filter((m) => PLAIN_ENTRIES.includes(m.entry));

    for (const plain of plainManagers) {
      expect(bboostManager.rank).toBeLessThan(plain.rank);
      expect(bboostManager.total_points).toBeGreaterThan(plain.total_points);
    }
  });

  it("carries each manager's full history and chips", async () => {
    const snapshot = await getLeagueSnapshot(2);
    const bboostManager = snapshot.managers.find((m) => m.entry === BBOOST_ENTRY)!;
    expect(bboostManager.history).toEqual(bboostHistory.current);
    expect(bboostManager.chips).toEqual(bboostHistory.chips);
  });
});
