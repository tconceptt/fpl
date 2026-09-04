import { describe, expect, it } from "vitest";
import { computeChipMaster, computeManagersOfTheMonth, monthOf, scoreChipPlay, type ChipPlayInput } from "@/services/prizes";
import { formatPrizes } from "@/services/bot-replies";
import type { BootstrapEvent, LiveGameweekData, TeamDetails } from "@/lib/fpl/types";
import liveGw2 from "./fixtures/live-gw2.json";
import picksGw2Bboost from "./fixtures/picks-gw2-bboost.json";

const live = liveGw2 as unknown as LiveGameweekData;
const bboostPicks = picksGw2Bboost as unknown as TeamDetails;

function event(id: number, deadline: string, checked = true): BootstrapEvent {
  return {
    id,
    name: `Gameweek ${id}`,
    deadline_time: deadline,
    is_previous: false,
    is_current: false,
    is_next: false,
    finished: checked,
    data_checked: checked,
    average_entry_score: 0,
    highest_score: null,
  };
}

function manager(entry: number, name: string, rows: Array<[number, number, number?]>) {
  return {
    entry,
    player_name: name,
    entry_name: `${name} FC`,
    history: rows.map(([gw, points, hit = 0]) => ({
      event: gw,
      points,
      total_points: 0,
      event_transfers_cost: hit,
      event_transfers: 0,
      rank: 0,
      overall_rank: 0,
      points_on_bench: 0,
    })),
  };
}

// GW1 and GW2 deadlines in August EAT; GW3's deadline is 31 Aug 22:30 UTC,
// which is already 1 September in East Africa Time.
const events = [
  event(1, "2026-08-21T17:30:00Z"),
  event(2, "2026-08-28T17:30:00Z"),
  event(3, "2026-08-31T22:30:00Z"),
  event(4, "2026-09-12T12:30:00Z", false),
];
const october = new Date("2026-10-05T10:00:00Z");

describe("monthOf", () => {
  it("assigns a gameweek to the EAT month its deadline falls in", () => {
    expect(monthOf(new Date("2026-08-31T22:30:00Z"))).toEqual({ key: "2026-09", label: "September 2026" });
    expect(monthOf(new Date("2026-08-21T17:30:00Z"))).toEqual({ key: "2026-08", label: "August 2026" });
  });
});

describe("computeManagersOfTheMonth", () => {
  it("awards the month on gameweek wins, net of hits, with ties broken by month points", () => {
    const managers = [
      manager(1, "Amy", [[1, 60], [2, 50, 4], [3, 40]]), // wins GW1; GW2 net 46
      manager(2, "Ben", [[1, 55], [2, 48], [3, 70]]), // wins GW2 on net; wins GW3
      manager(3, "Cara", [[1, 30], [2, 30], [3, 30]]),
    ];
    const months = computeManagersOfTheMonth(managers, events, october);
    expect(months.map((m) => m.label)).toEqual(["August 2026"]);
    const august = months[0];
    expect(august.gameweeks).toEqual([1, 2]);
    expect(august.standings.map((s) => [s.player_name, s.wins, s.points])).toEqual([
      ["Amy", 1, 106],
      ["Ben", 1, 103],
      ["Cara", 0, 60],
    ]);
    expect(august.winners.map((w) => w.player_name)).toEqual(["Amy"]);
  });

  it("credits every manager tied on the top score with the gameweek win", () => {
    const managers = [
      manager(1, "Amy", [[1, 60], [2, 40]]),
      manager(2, "Ben", [[1, 60], [2, 50]]),
    ];
    const [august] = computeManagersOfTheMonth(managers, events.slice(0, 2), october);
    expect(august.standings.map((s) => [s.player_name, s.wins, s.wonGameweeks])).toEqual([
      ["Ben", 2, [1, 2]],
      ["Amy", 1, [1]],
    ]);
  });

  it("skips the current month and any month FPL has not finished checking", () => {
    const managers = [manager(1, "Amy", [[1, 60], [2, 40], [3, 50], [4, 20]])];
    expect(computeManagersOfTheMonth(managers, events, new Date("2026-09-20T10:00:00Z"))).toHaveLength(1);
    const unchecked = [event(1, "2026-08-21T17:30:00Z"), event(2, "2026-08-28T17:30:00Z", false)];
    expect(computeManagersOfTheMonth(managers, unchecked, october)).toHaveLength(0);
  });
});

function play(chip: ChipPlayInput["chip"], picks: TeamDetails, finished = true, entry = 1): ChipPlayInput {
  return {
    entry,
    player_name: entry === 1 ? "Amy" : "Ben",
    entry_name: "FC",
    chip,
    gameweek: 2,
    picks,
    live,
    finished,
    playerNames: new Map(live.elements.map((el) => [el.id, `P${el.id}`])),
  };
}

const livePoints = new Map(live.elements.map((el) => [el.id, el.stats.total_points]));

describe("scoreChipPlay", () => {
  it("bench boost counts the four bench players' points", () => {
    const expected = bboostPicks.picks.filter((p) => p.position >= 12).reduce((s, p) => s + (livePoints.get(p.element) ?? 0), 0);
    const scored = scoreChipPlay(play("bboost", bboostPicks));
    expect(scored.points).toBe(expected);
    expect(scored.detail).toBe("bench");
  });

  it("triple captain counts the tripled captain score", () => {
    const captain = bboostPicks.picks.find((p) => p.is_captain)!;
    const picks: TeamDetails = {
      ...bboostPicks,
      active_chip: "3xc",
      picks: bboostPicks.picks.map((p) => (p.is_captain ? { ...p, multiplier: 3 } : p)),
    };
    const raw = livePoints.get(captain.element) ?? 0;
    const scored = scoreChipPlay(play("3xc", picks));
    expect(scored.points).toBe(raw * 3);
    expect(scored.detail).toBe(`P${captain.element} ${raw} × 3`);
  });

  it("free hit counts the whole team's points and flags an unfinished gameweek", () => {
    const expected = bboostPicks.picks.reduce((s, p) => s + (livePoints.get(p.element) ?? 0) * p.multiplier, 0);
    const scored = scoreChipPlay(play("freehit", bboostPicks, false));
    expect(scored.points).toBe(expected);
    expect(scored.provisional).toBe(true);
  });
});

describe("computeChipMaster", () => {
  it("ranks managers by total chip points and keeps the per-chip breakdown", () => {
    const rows = computeChipMaster([play("bboost", bboostPicks, true, 1), play("freehit", bboostPicks, false, 2)]);
    expect(rows.map((r) => r.player_name)).toEqual(["Ben", "Amy"]);
    expect(rows[0].provisional).toBe(true);
    expect(rows[1].plays).toHaveLength(1);
  });
});

describe("formatPrizes", () => {
  it("renders months, the chip leaderboard and the provisional marker", () => {
    const text = formatPrizes({
      currentGameweek: 3,
      managersOfTheMonth: [
        {
          key: "2026-08",
          label: "August 2026",
          gameweeks: [1, 2],
          standings: [
            { entry: 1, player_name: "Amy", entry_name: "A", wins: 2, points: 120, wonGameweeks: [1, 2] },
            { entry: 2, player_name: "Ben", entry_name: "B", wins: 0, points: 100, wonGameweeks: [] },
          ],
          winners: [{ entry: 1, player_name: "Amy", entry_name: "A", wins: 2, points: 120, wonGameweeks: [1, 2] }],
        },
      ],
      chipMaster: [
        {
          entry: 1,
          player_name: "Amy",
          entry_name: "A",
          total: 39,
          provisional: true,
          plays: [{ chip: "3xc", label: "Triple Captain", gameweek: 3, points: 39, detail: "Haaland 13 × 3", provisional: true }],
        },
      ],
    });
    expect(text).toContain("August 2026 (GW1–2): <b>Amy</b> — 2 wins, 120 pts · next Ben 0W 100 pts");
    expect(text).toContain("1. <b>Amy</b> — 39* (TC GW3 Haaland 13 × 3 = 39*)");
    expect(text).toContain("* gameweek still in play");
  });

  it("says so when nothing has been decided yet", () => {
    const text = formatPrizes({ currentGameweek: 1, managersOfTheMonth: [], chipMaster: [] });
    expect(text).toContain("No month has finished yet.");
    expect(text).toContain("No counting chips played yet.");
  });
});
