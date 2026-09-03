import { describe, expect, it } from "vitest";
import { buildEffectiveOwnership, differentials, highestOwnership } from "@/services/ownership";
import { buildLivePointsMap } from "@/services/fpl-live";
import type { LiveGameweekData, SlimBootstrap, TeamDetails } from "@/lib/fpl/types";
import bootstrapSlim from "./fixtures/bootstrap-slim.json";
import liveGw2 from "./fixtures/live-gw2.json";
import picksGw2Bboost from "./fixtures/picks-gw2-bboost.json";

const bootstrap = bootstrapSlim as unknown as SlimBootstrap;
const livePoints = buildLivePointsMap(liveGw2 as unknown as LiveGameweekData);
const playersMap = new Map(bootstrap.elements.map((p) => [p.id, p]));
const teamsMap = new Map(bootstrap.teams.map((t) => [t.id, t]));

const bboostPicks = picksGw2Bboost as unknown as TeamDetails;

/** Triple-captains B.Fernandes (426), starts Raya (1), benches Arrizabalaga (2). */
const tcPicks: TeamDetails = {
  active_chip: "3xc",
  automatic_subs: [],
  entry_history: { event_transfers: 0, event_transfers_cost: 0, points_on_bench: 0, points: 0 },
  picks: [
    { element: 426, position: 1, multiplier: 3, is_captain: true, is_vice_captain: false },
    { element: 1, position: 2, multiplier: 1, is_captain: false, is_vice_captain: true },
    { element: 2, position: 12, multiplier: 0, is_captain: false, is_vice_captain: false },
  ],
};

const managers = [
  { entry: 2002, entryName: "Bench Boosters", playerName: "Zed" },
  { entry: 2001, entryName: "Triple Trouble", playerName: "Amy" },
];
const picksByEntry = new Map<number, TeamDetails>([
  [2002, bboostPicks],
  [2001, tcPicks],
]);

const rows = buildEffectiveOwnership(picksByEntry, managers, livePoints, playersMap, teamsMap);
const byId = new Map(rows.map((r) => [r.elementId, r]));

describe("buildEffectiveOwnership", () => {
  it("counts captains through multipliers and scales swing by them", () => {
    // 426 scored 23 in GW2; owned by both, captained (x2) and triple captained (x3).
    const fernandes = byId.get(426)!;
    expect(fernandes).toMatchObject({ name: "B.Fernandes", clubShortName: "MUN", owners: 2, captains: 2, points: 23 });
    expect(fernandes.effectiveOwnership).toBe(250);
    expect(fernandes.swing).toBe(57.5);
    expect(fernandes.ownerNames).toEqual(["Amy (C)", "Zed (C)"]);
  });

  it("gives a plain double-owned player 100% and a swing equal to their points", () => {
    const raya = byId.get(1)!;
    expect(raya).toMatchObject({ owners: 2, captains: 0, effectiveOwnership: 100, points: 6, swing: 6 });
    expect(raya.ownerNames).toEqual(["Amy", "Zed"]);
  });

  it("ignores benched players with a zero multiplier", () => {
    expect(byId.has(2)).toBe(false);
  });

  it("counts every Bench Boost pick as an owner", () => {
    // 15 picks from the bboost entry, plus nothing new from the TC entry
    // (426 and 1 are already in the bboost squad; 2 is benched).
    expect(rows).toHaveLength(15);
    expect(byId.get(175)).toMatchObject({ name: "van Ewijk", clubShortName: "COV", owners: 1, effectiveOwnership: 50 });
  });

  it("returns nothing when there are no managers", () => {
    expect(buildEffectiveOwnership(picksByEntry, [], livePoints, playersMap, teamsMap)).toEqual([]);
  });
});

describe("views", () => {
  it("highestOwnership sorts by effective ownership, then points, then name", () => {
    const view = highestOwnership(rows);
    expect(view[0].elementId).toBe(426);
    expect(view[1].elementId).toBe(1);
    // Among the 50% players, the 11-point pair comes before the rest.
    expect(view[2].points).toBe(11);
    expect(view[2].name < view[3].name).toBe(true);
  });

  it("differentials keeps only single-owner players, best scorers first", () => {
    const view = differentials(rows);
    expect(view.every((r) => r.owners === 1)).toBe(true);
    expect(view).toHaveLength(13);
    expect(view[0].points).toBe(11);
    expect(view.map((r) => r.points)).toEqual([...view.map((r) => r.points)].sort((a, b) => b - a));
  });
});
