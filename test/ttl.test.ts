import { describe, expect, it } from "vitest";
import { ttlFor } from "@/lib/fpl/ttl";

describe("ttlFor", () => {
  it("matches the documented table for stateful kinds", () => {
    expect(ttlFor("eventStatus", "live")).toBe(60);
    expect(ttlFor("eventStatus", "quiet")).toBe(60);
    expect(ttlFor("eventStatus", "checked")).toBe(60);

    expect(ttlFor("bootstrap", "live")).toBe(60);
    expect(ttlFor("bootstrap", "quiet")).toBe(300);
    expect(ttlFor("bootstrap", "checked")).toBe(300);

    expect(ttlFor("live", "live")).toBe(30);
    expect(ttlFor("live", "quiet")).toBe(600);
    expect(ttlFor("live", "checked")).toBe(86400);

    expect(ttlFor("fixtures", "live")).toBe(60);
    expect(ttlFor("fixtures", "quiet")).toBe(600);
    expect(ttlFor("fixtures", "checked")).toBe(86400);

    expect(ttlFor("picks", "live")).toBe(60);
    expect(ttlFor("picks", "quiet")).toBe(600);
    expect(ttlFor("picks", "checked")).toBe(86400);

    expect(ttlFor("history", "live")).toBe(300);
    expect(ttlFor("history", "quiet")).toBe(300);
    expect(ttlFor("history", "checked")).toBe(300);

    expect(ttlFor("standings", "live")).toBe(300);
    expect(ttlFor("standings", "quiet")).toBe(300);
    expect(ttlFor("standings", "checked")).toBe(300);

    expect(ttlFor("h2h", "live")).toBe(300);
    expect(ttlFor("h2h", "quiet")).toBe(300);
    expect(ttlFor("h2h", "checked")).toBe(300);
  });

  describe("transfers", () => {
    it("is the seconds until the next deadline", () => {
      const now = new Date("2026-09-04T17:00:00Z");
      const deadline = new Date("2026-09-04T17:30:00Z");
      expect(ttlFor("transfers", "quiet", { now, nextDeadline: deadline })).toBe(30 * 60);
    });

    it("clamps to a 60 second minimum when the deadline is imminent or passed", () => {
      const now = new Date("2026-09-04T17:29:50Z");
      const deadline = new Date("2026-09-04T17:30:00Z");
      expect(ttlFor("transfers", "live", { now, nextDeadline: deadline })).toBe(60);

      const pastDeadline = new Date("2026-09-04T16:00:00Z");
      expect(ttlFor("transfers", "live", { now, nextDeadline: pastDeadline })).toBe(60);
    });

    it("clamps to a 7 day maximum for a far-off deadline", () => {
      const now = new Date("2026-09-04T17:00:00Z");
      const deadline = new Date("2026-12-04T17:00:00Z");
      expect(ttlFor("transfers", "quiet", { now, nextDeadline: deadline })).toBe(7 * 24 * 60 * 60);
    });

    it("falls back to 60 seconds when there is no next deadline", () => {
      expect(ttlFor("transfers", "quiet", { nextDeadline: null })).toBe(60);
      expect(ttlFor("transfers", "quiet")).toBe(60);
    });
  });
});
