import { describe, expect, it } from "vitest";
import { clubsFromBootstrap, kitSources } from "@/lib/clubs";
import bootstrapSlim from "./fixtures/bootstrap-slim.json";

describe("clubsFromBootstrap", () => {
  it("yields all 20 clubs from the bootstrap teams array", () => {
    const clubs = clubsFromBootstrap(bootstrapSlim.teams);
    expect(clubs).toHaveLength(20);
  });

  it("includes the promoted clubs Coventry, Hull and Ipswich", () => {
    const clubs = clubsFromBootstrap(bootstrapSlim.teams);
    const shortNames = clubs.map((c) => c.shortName);
    expect(shortNames).toContain("COV");
    expect(shortNames).toContain("HUL");
    expect(shortNames).toContain("IPS");
  });
});

describe("kitSources", () => {
  const clubs = clubsFromBootstrap(bootstrapSlim.teams);
  const arsenal = clubs.find((c) => c.shortName === "ARS");
  const hull = clubs.find((c) => c.shortName === "HUL");

  it("puts the local outfield kit first, then the official shirt image", () => {
    expect(arsenal).toBeDefined();
    const sources = kitSources(arsenal, false);
    expect(sources[0]).toBe("/Images/kits/ARS-home.png");
    expect(sources[1]).toBe(
      "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_3-66.png"
    );
  });

  it("skips straight to the official shirt for a club with no local kit file", () => {
    expect(hull).toBeDefined();
    const sources = kitSources(hull, true);
    // Hull has no public/Images/kits/HUL-*.png, so the local candidate must
    // not appear at all (it would 404 through the image optimizer) — the
    // official goalkeeper shirt is first.
    expect(sources[0]).toBe(
      "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_88_1-66.png"
    );
    expect(sources.some((s) => s.includes("/Images/kits/HUL-"))).toBe(false);
  });

  it("falls back to only the placeholder when no club is known", () => {
    expect(kitSources(undefined, false)).toEqual(["/Images/kits/placeholder.png"]);
  });
});
