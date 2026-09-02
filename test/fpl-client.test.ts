import { describe, expect, it } from "vitest";
import { slimLive } from "@/lib/fpl/client";
import liveGw2 from "./fixtures/live-gw2.json";

describe("slimLive", () => {
  it("keeps element count and total_points, and drops other stat fields", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = liveGw2 as any;
    const slim = slimLive(raw);

    expect(slim.elements.length).toBe(raw.elements.length);

    const rawFirst = raw.elements[0];
    const slimFirst = slim.elements.find((el) => el.id === rawFirst.id);
    expect(slimFirst).toBeDefined();
    expect(slimFirst!.stats.total_points).toBe(rawFirst.stats.total_points);
    expect(slimFirst!.stats.minutes).toBe(rawFirst.stats.minutes);
    expect(slimFirst!.stats.bonus).toBe(rawFirst.stats.bonus);
    expect(slimFirst!.stats.bps).toBe(rawFirst.stats.bps);

    // Only the four documented stat fields survive.
    expect(Object.keys(slimFirst!.stats).sort()).toEqual(["bonus", "bps", "minutes", "total_points"]);
    expect(slimFirst!.stats).not.toHaveProperty("influence");
    expect(slimFirst!.stats).not.toHaveProperty("goals_scored");

    // `explain` keeps only fixture + the documented per-stat fields.
    expect(slimFirst).not.toHaveProperty("modified");
    const explainStat = slimFirst!.explain[0].stats[0];
    expect(Object.keys(explainStat).sort()).toEqual(["identifier", "points", "points_modification", "value"]);
  });
});
