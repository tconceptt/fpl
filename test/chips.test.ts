import { describe, expect, it } from "vitest";
import { chipDisplayOrder, chipStatus, chipWindowsFromBootstrap } from "@/lib/chips";
import bootstrapSlim from "./fixtures/bootstrap-slim.json";
import history from "./fixtures/history.json";

const windows = chipWindowsFromBootstrap(bootstrapSlim.chips);
const playedChips = history.chips;

describe("chipDisplayOrder", () => {
  it("is the fixed WC, FH, BB, TC order", () => {
    expect(chipDisplayOrder).toEqual(["wildcard", "freehit", "bboost", "3xc"]);
  });
});

describe("chipWindowsFromBootstrap", () => {
  it("builds a window per chip half from the bootstrap chips array", () => {
    expect(windows).toHaveLength(8);
    const bboostWindows = windows.filter((w) => w.name === "bboost");
    expect(bboostWindows).toEqual([
      { name: "bboost", label: "Bench Boost", startEvent: 1, stopEvent: 19 },
      { name: "bboost", label: "Bench Boost", startEvent: 20, stopEvent: 38 },
    ]);
  });
});

describe("chipStatus", () => {
  it("marks the first-half Bench Boost used in GW2", () => {
    const statuses = chipStatus(playedChips, windows, 3);
    const firstHalfBboost = statuses.find(
      (s) => s.window.name === "bboost" && s.window.startEvent === 1
    );
    expect(firstHalfBboost?.status).toBe("used");
    expect(firstHalfBboost?.usedInGameweek).toBe(2);
  });

  it("leaves the second-half Bench Boost available", () => {
    const statuses = chipStatus(playedChips, windows, 3);
    const secondHalfBboost = statuses.find(
      (s) => s.window.name === "bboost" && s.window.startEvent === 20
    );
    expect(secondHalfBboost?.status).toBe("available");
  });

  it("leaves the first-half Wildcard available at GW3", () => {
    const statuses = chipStatus(playedChips, windows, 3);
    const firstHalfWildcard = statuses.find(
      (s) => s.window.name === "wildcard" && s.window.startEvent === 2
    );
    expect(firstHalfWildcard?.status).toBe("available");
  });

  it("expires every unused first-half window once GW25 arrives", () => {
    const statuses = chipStatus(playedChips, windows, 25);
    const firstHalfWindows = statuses.filter((s) => s.window.stopEvent === 19);
    for (const status of firstHalfWindows) {
      if (status.window.name === "bboost") {
        // Already used in GW2, so it stays "used" rather than "expired".
        expect(status.status).toBe("used");
      } else {
        expect(status.status).toBe("expired");
      }
    }
  });
});

describe("groupChipWindowsByHalf", () => {
  it("groups the eight windows into two halves keyed on their stop gameweek", async () => {
    const { groupChipWindowsByHalf } = await import("@/lib/chips");
    const halves = groupChipWindowsByHalf(windows);

    expect(halves.map((h) => h.label)).toEqual(["GW1–19", "GW20–38"]);
    // The first half starts at GW1 even though the wildcard and free hit open at GW2.
    expect(halves[0]).toMatchObject({ startEvent: 1, stopEvent: 19 });
    expect(halves[1]).toMatchObject({ startEvent: 20, stopEvent: 38 });
    for (const half of halves) {
      expect(half.windows.map((w) => w.name)).toEqual(chipDisplayOrder);
    }
  });
});
