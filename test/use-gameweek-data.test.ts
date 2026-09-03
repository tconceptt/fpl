import { describe, expect, it, vi } from "vitest";
import {
  dedupedFetch,
  gameweekCacheKey,
  isValidGameweek,
  RequestGuard,
  sharedGameweekCache,
  sharedInFlightRequests,
} from "@/hooks/gameweek-data-core";

// hooks/use-gameweek-data.ts itself is a "use client" React hook and can't
// be exercised directly — vitest.config.mts runs in the "node" environment,
// not jsdom (confirmed: no jsdom dependency/setup in this repo). Its
// non-React logic (cache keys, stale-response guarding, in-flight
// de-duplication) is factored into hooks/gameweek-data-core.ts precisely so
// it can be tested here without a DOM.

describe("gameweekCacheKey", () => {
  it("namespaces by cacheKey and gw", () => {
    expect(gameweekCacheKey("league", 3)).toBe("league:3");
    expect(gameweekCacheKey("h2h", 3)).toBe("h2h:3");
    expect(gameweekCacheKey("league", 4)).toBe("league:4");
  });
});

describe("isValidGameweek", () => {
  it("rejects non-integers and gws below 1", () => {
    expect(isValidGameweek(1.5)).toBe(false);
    expect(isValidGameweek(0)).toBe(false);
    expect(isValidGameweek(-1)).toBe(false);
    expect(isValidGameweek(1)).toBe(true);
  });

  it("bounds against currentGameweek when provided", () => {
    expect(isValidGameweek(5, 4)).toBe(false);
    expect(isValidGameweek(4, 4)).toBe(true);
    expect(isValidGameweek(3, 4)).toBe(true);
  });

  it("has no upper bound when currentGameweek is omitted", () => {
    expect(isValidGameweek(999)).toBe(true);
  });
});

describe("RequestGuard", () => {
  it("only the most recently started token is current", () => {
    const guard = new RequestGuard();
    const first = guard.start();
    const second = guard.start();

    expect(first).not.toBe(second);
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it("simulates stale-response protection: an earlier request resolving after a later one is ignored", () => {
    // Mirrors the hook's usage: start a request for gw A, then switch to
    // gw B before A resolves. When A's promise finally settles, its token
    // is no longer current and the result must be discarded.
    const guard = new RequestGuard();
    const tokenForGwA = guard.start();
    const tokenForGwB = guard.start();

    const results: string[] = [];
    function onResolve(token: number, label: string) {
      if (!guard.isCurrent(token)) return;
      results.push(label);
    }

    onResolve(tokenForGwA, "A resolved late");
    onResolve(tokenForGwB, "B resolved");

    expect(results).toEqual(["B resolved"]);
  });
});

describe("dedupedFetch", () => {
  it("shares one in-flight call across concurrent requests for the same key", async () => {
    const fetcher = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return "value";
    });

    const [a, b] = await Promise.all([
      dedupedFetch("dedup:1", fetcher),
      dedupedFetch("dedup:1", fetcher),
    ]);

    expect(a).toBe("value");
    expect(b).toBe("value");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("removes the in-flight entry once settled, so the next call fetches again", async () => {
    const fetcher = vi.fn(async () => "value");

    await dedupedFetch("dedup:2", fetcher);
    expect(sharedInFlightRequests.has("dedup:2")).toBe(false);

    await dedupedFetch("dedup:2", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not cache a rejection — a failed fetch is retried on the next call", async () => {
    let attempt = 0;
    const fetcher = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("network error");
      return "recovered";
    });

    await expect(dedupedFetch("dedup:3", fetcher)).rejects.toThrow("network error");
    expect(sharedInFlightRequests.has("dedup:3")).toBe(false);

    const result = await dedupedFetch("dedup:3", fetcher);
    expect(result).toBe("recovered");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not de-dupe requests for different keys", async () => {
    const fetcherA = vi.fn(async () => "a");
    const fetcherB = vi.fn(async () => "b");

    const [a, b] = await Promise.all([
      dedupedFetch("dedup:key-a", fetcherA),
      dedupedFetch("dedup:key-b", fetcherB),
    ]);

    expect(a).toBe("a");
    expect(b).toBe("b");
    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).toHaveBeenCalledTimes(1);
  });
});

describe("sharedGameweekCache", () => {
  it("namespaces entries by the full cache key so different cacheKeys/gws never collide", () => {
    sharedGameweekCache.set(gameweekCacheKey("league", 1), { a: 1 });
    sharedGameweekCache.set(gameweekCacheKey("h2h", 1), { b: 2 });

    expect(sharedGameweekCache.get(gameweekCacheKey("league", 1))).toEqual({ a: 1 });
    expect(sharedGameweekCache.get(gameweekCacheKey("h2h", 1))).toEqual({ b: 2 });
    expect(sharedGameweekCache.get(gameweekCacheKey("league", 2))).toBeUndefined();
  });
});
