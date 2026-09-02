import { describe, expect, it } from "vitest";
import { cacheControlHeader, isLeagueMember, parseGw } from "@/lib/api";

describe("parseGw", () => {
  it("parses a valid integer within range", () => {
    expect(parseGw("1", 5)).toBe(1);
    expect(parseGw("5", 5)).toBe(5);
    expect(parseGw("3", 5)).toBe(3);
  });

  it("rejects non-integer input", () => {
    expect(parseGw("abc", 5)).toBeNull();
    expect(parseGw("1.5", 5)).toBeNull();
    expect(parseGw("", 5)).toBeNull();
    expect(parseGw(" 1", 5)).toBeNull();
    expect(parseGw("1 ", 5)).toBeNull();
    expect(parseGw("-1", 5)).toBeNull();
    expect(parseGw("1e2", 5)).toBeNull();
  });

  it("rejects out-of-range input", () => {
    expect(parseGw("0", 5)).toBeNull();
    expect(parseGw("6", 5)).toBeNull();
    expect(parseGw("99", 5)).toBeNull();
  });
});

describe("isLeagueMember", () => {
  it("is true when the entry id is in the member list", () => {
    expect(isLeagueMember(2727420, [111, 2727420, 222])).toBe(true);
  });

  it("is false otherwise", () => {
    expect(isLeagueMember(1, [111, 222])).toBe(false);
    expect(isLeagueMember(1, [])).toBe(false);
  });
});

describe("cacheControlHeader", () => {
  it("formats a public s-maxage header with a matching stale-while-revalidate", () => {
    expect(cacheControlHeader(60)).toBe("public, s-maxage=60, stale-while-revalidate=60");
    expect(cacheControlHeader(86400)).toBe("public, s-maxage=86400, stale-while-revalidate=86400");
  });
});
