import { describe, expect, it } from "vitest";
import { parseCommand } from "@/services/bot";
import { formatChips, formatDeadline, formatDeadlineReminder, formatGwSummary, formatH2H, formatTable, formatTransfers } from "@/services/bot-replies";
import { chipWindowsFromBootstrap } from "@/lib/chips";
import type { LeagueSnapshot, ManagerSnapshot } from "@/services/league";
import type { H2HPage } from "@/services/h2h";
import type { SlimBootstrap } from "@/lib/fpl/types";
import bootstrapSlim from "./fixtures/bootstrap-slim.json";
import history from "./fixtures/history.json";

const bootstrap = bootstrapSlim as unknown as SlimBootstrap;

describe("parseCommand", () => {
  it("reads the command, the bot suffix and an argument", () => {
    expect(parseCommand("/table")).toEqual({ command: "table", arg: null });
    expect(parseCommand("/recap@QitawrariBot 3")).toEqual({ command: "recap", arg: "3" });
    expect(parseCommand("  /GW  ")).toEqual({ command: "gw", arg: null });
  });

  it("ignores plain chat and unknown commands", () => {
    expect(parseCommand("who is top?")).toBeNull();
    expect(parseCommand("/dance")).toBeNull();
    expect(parseCommand(undefined)).toBeNull();
  });
});

function m(entry: number, name: string, rank: number, lastRank: number, net: number, total: number, extra: Partial<ManagerSnapshot> = {}): ManagerSnapshot {
  return {
    entry,
    entry_name: `${name} <FC>`,
    player_name: name,
    rank,
    last_rank: lastRank,
    event_total: net,
    net_points: net,
    total_points: total,
    transfer_cost: 0,
    captain: { id: 1, web_name: "Haaland" },
    active_chip: null,
    players_to_start: 0,
    h2h_rank: null,
    history: [],
    chips: [],
    ...extra,
  };
}

const snapshot: LeagueSnapshot = {
  leagueName: "Qitawrari & Co",
  currentGameweek: 3,
  selectedGameweek: 3,
  liveState: "live",
  managers: [
    m(1, "Amy", 1, 2, 70, 190, { active_chip: "bboost" }),
    m(2, "Ben", 2, 1, 40, 180, { captain: { id: 2, web_name: "Salah" } }),
    m(3, "Cara", 3, 3, 55, 170),
  ],
};

describe("formatTable", () => {
  it("lists ranks with movement arrows and escapes names", () => {
    const text = formatTable(snapshot);
    expect(text.split("\n")[0]).toBe("<b>Qitawrari &amp; Co</b> — after GW3");
    expect(text).toContain("1. ▲ <b>Amy &lt;FC&gt;</b> · Amy · GW 70 · 190");
    expect(text).toContain("2. ▼ <b>Ben &lt;FC&gt;</b>");
    expect(text).toContain("3. ▬ <b>Cara &lt;FC&gt;</b>");
    expect(text.endsWith("<i>Live — scores can still move.</i>")).toBe(true);
  });
});

describe("formatGwSummary", () => {
  it("names leader, struggler, most captained and chips", () => {
    const text = formatGwSummary(snapshot);
    expect(text).toContain("🔥 Leader: <b>Amy &lt;FC&gt;</b> (Amy) — 70 pts");
    expect(text).toContain("💩 Struggler: <b>Ben &lt;FC&gt;</b> (Ben) — 40 pts");
    expect(text).toContain("⭐ Most captained: Haaland (2)");
    expect(text).toContain("🃏 Chips: Amy (BB)");
  });
});

describe("formatChips", () => {
  it("shows what is left in the current half from the bootstrap windows", () => {
    const windows = chipWindowsFromBootstrap(bootstrap.chips);
    const text = formatChips(
      [
        { player_name: "Zed", entry_name: "Boosters", chips: history.chips },
        { player_name: "Amy", entry_name: "Fresh", chips: [] },
      ],
      windows,
      3
    );
    expect(text).toBe("<b>Chips remaining (GW1–19)</b>\nAmy: WC, FH, BB, TC\nZed: WC, FH, TC");
  });
});

describe("formatH2H", () => {
  it("bolds the leading side and marks byes and draws", () => {
    const page: H2HPage = {
      leagueName: "L",
      currentGameweek: 3,
      selectedGameweek: 3,
      live: true,
      configured: true,
      matchups: [
        { id: 1, home: { entry: 1, entryName: "A", playerName: "", points: 60, rank: null, captain: null, activeChip: null, playersToStart: 0 }, away: { entry: 2, entryName: "B", playerName: "", points: 50, rank: null, captain: null, activeChip: null, playersToStart: 0 }, state: "leading", isBye: false },
        { id: 2, home: { entry: 3, entryName: "C", playerName: "", points: 40, rank: null, captain: null, activeChip: null, playersToStart: 0 }, away: { entry: null, entryName: "AVERAGE", playerName: "", points: 45, rank: null, captain: null, activeChip: null, playersToStart: 0 }, state: "trailing", isBye: true },
      ],
      table: [{ rank: 1, lastRank: 1, entry: 1, entryName: "A", playerName: "", played: 2, won: 2, drawn: 0, lost: 0, pointsFor: 120, total: 6 }],
    };
    const text = formatH2H(page);
    expect(text).toContain("<b>GW3 head to head</b> <i>(live)</i>");
    expect(text).toContain("<b>A</b> 60 – 50 B");
    expect(text).toContain("C 40 – 45 <b>AVERAGE</b> (bye)");
    expect(text).toContain("1. A — 6 pts (2W 0D 0L)");
  });

  it("explains an unconfigured league", () => {
    expect(formatH2H({ leagueName: "", currentGameweek: 1, selectedGameweek: 1, live: false, configured: false, matchups: [], table: [] })).toMatch(/No head-to-head league/);
  });
});

describe("formatTransfers", () => {
  it("lists moves per manager with gains and hits", () => {
    const text = formatTransfers(
      [
        {
          entry: 1,
          entryName: "X",
          managerName: "Amy",
          hitCost: 4,
          activeChip: "3xc",
          pointsIn: 12,
          pointsOut: 3,
          net: 9,
          rows: [
            { entry: 1, entryName: "X", managerName: "Amy", event: 3, playerIn: { id: 1, name: "Palmer", team: 1, teamShortName: "CHE", teamCode: 8, elementType: 3, price: 100 }, playerOut: { id: 2, name: "Saka", team: 2, teamShortName: "ARS", teamCode: 3, elementType: 3, price: 100 }, playerInPoints: 12, playerOutPoints: 3, playerInYetToPlay: false, playerOutYetToPlay: false, hitCost: 4, activeChip: null },
          ],
        },
      ],
      3
    );
    expect(text).toBe("<b>GW3 transfers</b>\n<b>Amy</b> [TC] <i>-4 hit</i>: Saka → Palmer (+9)");
    expect(formatTransfers([], 3)).toBe("No transfers yet for GW3.");
    const pending = formatTransfers(
      [
        {
          entry: 1, entryName: "X", managerName: "Amy", hitCost: 0, activeChip: null, pointsIn: 0, pointsOut: 3, net: -3,
          rows: [
            { entry: 1, entryName: "X", managerName: "Amy", event: 3, playerIn: { id: 1, name: "Palmer", team: 1, teamShortName: "CHE", teamCode: 8, elementType: 3, price: 100 }, playerOut: { id: 2, name: "Saka", team: 2, teamShortName: "ARS", teamCode: 3, elementType: 3, price: 100 }, playerInPoints: 0, playerOutPoints: 3, playerInYetToPlay: true, playerOutYetToPlay: false, hitCost: 0, activeChip: null },
          ],
        },
      ],
      3
    );
    expect(pending).toBe("<b>GW3 transfers</b>\n<b>Amy</b>: Saka → Palmer⏳ (yet to play)");
  });
});

describe("deadline replies", () => {
  const next = bootstrap.events.find((e) => e.is_next)!;

  it("gives the deadline in EAT with time remaining", () => {
    const now = new Date("2026-09-03T07:30:00Z");
    expect(formatDeadline(next, now)).toBe("⏰ <b>GW3 deadline</b>: Fri 4 Sep, 8:30 PM EAT — 1d 10h left");
    expect(formatDeadline(next, new Date("2026-09-04T18:00:00Z"))).toBe("GW3 deadline has passed (Fri 4 Sep, 8:30 PM EAT).");
    expect(formatDeadline(undefined)).toMatch(/season is over/);
  });

  it("phrases the 30-minute reminder in minutes", () => {
    expect(formatDeadlineReminder(next, new Date("2026-09-04T17:04:00Z"))).toBe(
      "⏰ <b>GW3 deadline in 26 minutes</b> — Fri 4 Sep, 8:30 PM EAT. Set your team!"
    );
  });
});
