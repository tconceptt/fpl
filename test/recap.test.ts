import { describe, expect, it } from "vitest";
import {
  buildRecap,
  recapInputFromSnapshot,
  recapToPlainText,
  recapToTelegramHtml,
  type RecapInput,
  type RecapManager,
} from "@/services/recap";
import { buildLivePointsMap } from "@/services/fpl-live";
import type { LeagueSnapshot, ManagerSnapshot } from "@/services/league";
import type { ManagerTransfers, TransferRow } from "@/services/transfers";
import type { H2HMatchup } from "@/services/h2h";
import type { LiveGameweekData, SlimBootstrap, TeamDetails } from "@/lib/fpl/types";
import bootstrapSlim from "./fixtures/bootstrap-slim.json";
import liveGw2 from "./fixtures/live-gw2.json";
import picksGw2Bboost from "./fixtures/picks-gw2-bboost.json";

function manager(overrides: Partial<RecapManager> & Pick<RecapManager, "entry" | "playerName" | "rank" | "netPoints">): RecapManager {
  return {
    entryName: `${overrides.playerName} FC`,
    lastRank: overrides.rank,
    totalPoints: 100 + overrides.netPoints,
    transferCost: 0,
    captainName: "Haaland",
    captainPoints: 9,
    activeChip: null,
    benchPoints: 0,
    ...overrides,
  };
}

function transferRow(entry: number, managerName: string, inPts: number, outPts: number, hitCost: number): TransferRow {
  return {
    entry,
    entryName: `${managerName} FC`,
    managerName,
    event: 2,
    playerIn: { id: 1, name: "In", team: 1, teamShortName: "ARS", teamCode: 3, elementType: 3, price: 60 },
    playerOut: { id: 2, name: "Out", team: 1, teamShortName: "ARS", teamCode: 3, elementType: 3, price: 55 },
    playerInPoints: inPts,
    playerOutPoints: outPts,
    hitCost,
  };
}

function group(entry: number, managerName: string, inPts: number, outPts: number, hitCost: number): ManagerTransfers {
  const row = transferRow(entry, managerName, inPts, outPts, hitCost);
  return { entry, entryName: row.entryName, managerName, hitCost, rows: [row], pointsIn: inPts, pointsOut: outPts, net: inPts - outPts };
}

const input: RecapInput = {
  gw: 2,
  leagueName: "Qitawrari & Co",
  provisional: false,
  managers: [
    manager({ entry: 1, playerName: "Amy", rank: 1, lastRank: 3, netPoints: 88, captainName: "B.Fernandes", captainPoints: 23, activeChip: "bboost", benchPoints: 0 }),
    manager({ entry: 2, playerName: "Ben", rank: 2, lastRank: 1, netPoints: 60, benchPoints: 12 }),
    manager({ entry: 3, playerName: "Cara", rank: 3, lastRank: 2, netPoints: 55, captainName: "Salah", captainPoints: 2, benchPoints: 5 }),
    manager({ entry: 4, playerName: "Dan", rank: 4, lastRank: 4, netPoints: 41, benchPoints: 12 }),
    manager({ entry: 5, playerName: "Eve", rank: 5, lastRank: 5, netPoints: 41, benchPoints: 1, activeChip: "3xc", captainName: "Haaland", captainPoints: 9 }),
  ],
  transfers: [group(2, "Ben", 10, 2, 4), group(3, "Cara", 1, 5, 4), group(4, "Dan", 6, 2, 0)],
  matchups: [
    { id: 1, home: side(1, "Amy FC", 88), away: side(2, "Ben FC", 60), state: "leading", isBye: false },
    { id: 2, home: side(3, "Cara FC", 55), away: side(4, "Dan FC", 55), state: "level", isBye: false },
  ],
};

function side(entry: number | null, entryName: string, points: number): H2HMatchup["home"] {
  return { entry, entryName, playerName: "", points, rank: null, captain: null, activeChip: null, playersToStart: 0 };
}

describe("buildRecap", () => {
  const recap = buildRecap(input);
  const section = (title: string) => recap.sections.find((s) => s.title === title)!.lines;

  it("names the winner and the shared Qitawrari of the week", () => {
    expect(section("The week")).toEqual([
      "🏆 Amy FC (Amy) won the week with 88 pts",
      "💩 Qitawrari of the week: Dan FC (Dan), Eve FC (Eve) on 41 pts",
    ]);
  });

  it("names a single Qitawrari when the bottom is not shared", () => {
    const single = buildRecap({ ...input, managers: input.managers.map((m) => (m.playerName === "Eve" ? { ...m, netPoints: 50 } : m)) });
    expect(single.sections[0].lines[1]).toBe("💩 Qitawrari of the week: Dan FC (Dan) with 41 pts");
  });

  it("has no table or captaincy section", () => {
    expect(recap.sections.map((s) => s.title)).toEqual(["The week", "Chips", "Biggest H2H thrashing", "Bench", "Top 3"]);
  });

  it("names only the worst bench waste, with a name tie-break, skipping Bench Boost", () => {
    expect(section("Bench")).toEqual(["🪑 Ben left 12 pts on the bench"]);
    const boosted = buildRecap({
      ...input,
      managers: input.managers.map((m) => (m.playerName === "Eve" ? { ...m, activeChip: "bboost", benchPoints: 30 } : m)),
    });
    expect(boosted.sections.find((s) => s.title === "Bench")!.lines).toEqual(["🪑 Ben left 12 pts on the bench"]);
  });

  it("ranks the week on net points, so a hit can cost the win", () => {
    // Amy scores 90 raw but took a -4 (net 86); Ben scores 88 raw with no hit.
    const hit = buildRecap({
      ...input,
      managers: input.managers.map((m) =>
        m.playerName === "Amy" ? { ...m, netPoints: 86, transferCost: 4 } : m.playerName === "Ben" ? { ...m, netPoints: 88 } : m
      ),
    });
    expect(hit.sections[0].lines[0]).toBe("🏆 Ben FC (Ben) won the week with 88 pts");
  });

  it("groups chips by label and names only the biggest H2H thrashing", () => {
    expect(section("Chips")).toEqual(["🃏 Bench Boost: Amy", "🃏 Triple Captain: Eve"]);
    expect(section("Biggest H2H thrashing")).toEqual(["💥 Amy FC 88 – 60 Ben FC, won by 28"]);
    expect(recap.sections.map((s) => s.title)).not.toContain("Head to head");
  });

  it("picks the widest margin regardless of home/away and ignores byes against AVERAGE", () => {
    const bye = { ...side(null, "AVERAGE", 10), entry: null };
    const withBye = buildRecap({
      ...input,
      matchups: [
        { id: 1, home: side(1, "Amy FC", 88), away: side(2, "Ben FC", 60), state: "leading", isBye: false },
        { id: 2, home: side(3, "Cara FC", 55), away: side(4, "Dan FC", 90), state: "trailing", isBye: false },
        { id: 3, home: side(5, "Eve FC", 99), away: bye, state: "leading", isBye: true },
      ],
    });
    expect(withBye.sections.find((s) => s.title === "Biggest H2H thrashing")!.lines).toEqual(["💥 Dan FC 90 – 55 Cara FC, won by 35"]);
  });

  it("ends with the top three only", () => {
    expect(section("Top 3")).toEqual(["1. Amy FC (Amy) — 188", "2. Ben FC (Ben) — 160", "3. Cara FC (Cara) — 155"]);
    expect(recap.sections.map((s) => s.title)).not.toContain("Standings");
    expect(recap.sections[recap.sections.length - 1].title).toBe("Top 3");
  });

  it("is deterministic and drops the thrashing section when there are no decisive matchups", () => {
    expect(buildRecap(input)).toEqual(recap);
    const noH2H = buildRecap({ ...input, matchups: [] });
    expect(noH2H.sections.map((s) => s.title)).not.toContain("Biggest H2H thrashing");
    const allDraws = buildRecap({
      ...input,
      matchups: [{ id: 2, home: side(3, "Cara FC", 55), away: side(4, "Dan FC", 55), state: "level", isBye: false }],
    });
    expect(allDraws.sections.map((s) => s.title)).not.toContain("Biggest H2H thrashing");
  });

  it("says so when nothing happened", () => {
    const quiet = buildRecap({
      ...input,
      managers: input.managers.map((m) => ({ ...m, lastRank: m.rank, activeChip: null, benchPoints: 0 })),
      transfers: [],
      matchups: [],
    });
    const lines = (title: string) => quiet.sections.find((s) => s.title === title)!.lines;
    expect(lines("Bench")).toEqual(["Nobody left points on the bench"]);
    expect(lines("Chips")).toEqual(["No chips played"]);
  });
});

describe("rendering", () => {
  it("escapes HTML in Telegram output and flags provisional bonus", () => {
    const html = recapToTelegramHtml(buildRecap({ ...input, leagueName: "A & B", provisional: true }));
    expect(html.startsWith("<b>Gameweek 2 recap</b> — A &amp; B")).toBe(true);
    expect(html).toContain("<b>The week</b>\n🏆 Amy FC (Amy) won the week with 88 pts");
    expect(html.endsWith("<i>Bonus is provisional until FPL confirms it.</i>")).toBe(true);
  });

  it("plain text has no tags", () => {
    const text = recapToPlainText(buildRecap(input));
    expect(text).not.toMatch(/<[a-z]/);
    expect(text).toContain("Top 3\n1. Amy FC (Amy) — 188");
  });
});

describe("recapInputFromSnapshot", () => {
  const bootstrap = bootstrapSlim as unknown as SlimBootstrap;
  const livePoints = buildLivePointsMap(liveGw2 as unknown as LiveGameweekData);
  const playersMap = new Map(bootstrap.elements.map((p) => [p.id, p]));
  const bboostPicks = picksGw2Bboost as unknown as TeamDetails;

  /** Captain 1 (Raya) blanked to 0 minutes? No — give the armband to the vice via multipliers. */
  const viceTookOver: TeamDetails = {
    active_chip: null,
    automatic_subs: [],
    entry_history: { event_transfers: 0, event_transfers_cost: 0, points_on_bench: 0, points: 0 },
    picks: [
      { element: 2, position: 1, multiplier: 0, is_captain: true, is_vice_captain: false },
      { element: 426, position: 2, multiplier: 2, is_captain: false, is_vice_captain: true },
      { element: 8, position: 12, multiplier: 0, is_captain: false, is_vice_captain: false },
      { element: 10, position: 13, multiplier: 0, is_captain: false, is_vice_captain: false },
    ],
  };

  const managers: ManagerSnapshot[] = [
    { entry: 2002, entry_name: "Boosters", player_name: "Zed", rank: 1, last_rank: 2, event_total: 130, net_points: 130, total_points: 186, transfer_cost: 0, captain: { id: 426, web_name: "B.Fernandes" }, active_chip: "bboost", players_to_start: 0, h2h_rank: null, history: [], chips: [] },
    { entry: 2001, entry_name: "Vice Squad", player_name: "Amy", rank: 2, last_rank: 1, event_total: 46, net_points: 42, total_points: 100, transfer_cost: 4, captain: { id: 2, web_name: "Arrizabalaga" }, active_chip: null, players_to_start: 0, h2h_rank: null, history: [], chips: [] },
  ];
  const snapshot: LeagueSnapshot = { leagueName: "Test", currentGameweek: 2, selectedGameweek: 2, liveState: "checked", managers };

  const result = recapInputFromSnapshot(
    snapshot,
    new Map([
      [2002, bboostPicks],
      [2001, viceTookOver],
    ]),
    livePoints,
    playersMap,
    [],
    [],
    false
  );

  it("uses the pick that actually carried the armband, and sums the bench from live points", () => {
    const zed = result.managers.find((m) => m.entry === 2002)!;
    expect(zed).toMatchObject({ captainName: "B.Fernandes", captainPoints: 23, benchPoints: 0, activeChip: "bboost" });

    const amy = result.managers.find((m) => m.entry === 2001)!;
    // The named captain (2) blanked, so the vice (426) carried the x2 — that is the captain choice that counts.
    expect(amy).toMatchObject({ captainName: "B.Fernandes", captainPoints: 23, transferCost: 4 });
    // Bench: element 8 (11) + element 10 (7); the benched captain scored 0.
    expect(amy.benchPoints).toBe(18);
  });

  it("carries the gameweek, league and provisional flag", () => {
    expect(result).toMatchObject({ gw: 2, leagueName: "Test", provisional: false });
  });
});
