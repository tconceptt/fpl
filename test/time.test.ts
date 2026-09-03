import { describe, expect, it } from "vitest";
import { formatEat, formatEatDate, formatRemaining } from "@/lib/time";

describe("EAT formatting", () => {
  // GW3 deadline from the bootstrap fixture: 17:30 UTC is 20:30 in Nairobi.
  const deadline = new Date("2026-09-04T17:30:00Z");

  it("shows a 12-hour clock in East Africa Time", () => {
    expect(formatEat(deadline)).toBe("Fri 8:30 PM");
    expect(formatEatDate(deadline)).toBe("Fri 4 Sep, 8:30 PM");
  });

  it("handles morning times and the day rollover", () => {
    expect(formatEat(new Date("2026-09-12T12:30:00Z"))).toBe("Sat 3:30 PM");
    expect(formatEat(new Date("2026-09-12T22:00:00Z"))).toBe("Sun 1:00 AM");
  });
});

describe("formatRemaining", () => {
  it("picks the coarsest useful unit", () => {
    expect(formatRemaining(3 * 86_400_000 + 4 * 3_600_000)).toBe("3d 4h");
    expect(formatRemaining(65 * 60_000)).toBe("1h 05m");
    expect(formatRemaining(25 * 60_000)).toBe("25m");
    expect(formatRemaining(30_000)).toBe("less than a minute");
    expect(formatRemaining(-5_000)).toBe("less than a minute");
  });
});
