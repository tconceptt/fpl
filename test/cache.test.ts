import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cached, cachedMany } from "@/lib/fpl/cache";

describe("cachedMany", () => {
  it("does not throw when fetchMissing resolves nothing to write (e.g. every fetch 404s)", async () => {
    // Regression test: an out-of-range gameweek makes every per-manager
    // picks fetch 404, so `fetchMissing` legitimately returns an empty
    // Map. That must not attempt to write anything back to the store —
    // against real Redis this used to throw "Pipeline is empty" from
    // `pipeline.exec()`, which was then misreported as a Redis failure.
    const result = await cachedMany<number>(["a:1", "a:2"], 60, async () => new Map());

    expect(result.size).toBe(2);
    expect(result.get("a:1")).toBeUndefined();
    expect(result.get("a:2")).toBeUndefined();
  });

  it("still writes and returns whatever fetchMissing does resolve", async () => {
    const result = await cachedMany<number>(["b:1", "b:2"], 60, async (missing) => {
      const map = new Map<string, number>();
      for (const key of missing) map.set(key, 42);
      return map;
    });

    expect(result.get("b:1")).toBe(42);
    expect(result.get("b:2")).toBe(42);
  });
});

describe("stale-if-error", () => {
  // These use lib/fpl/cache.ts's in-memory fallback store (test/setup.ts
  // deletes the Redis env vars), which keys entries by the exact string
  // passed to `cached`/`cachedMany` — a fresh key per test avoids
  // cross-test collisions in that shared module-level Map.
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("serves a fresh hit without calling fn again", async () => {
    const fn = vi.fn(async () => "v1");
    const first = await cached("stale-fresh-hit", 60, fn);
    expect(first).toBe("v1");

    // Still well within the 60s logical TTL.
    vi.advanceTimersByTime(5_000);

    const fn2 = vi.fn(async () => "v2");
    const second = await cached("stale-fresh-hit", 60, fn2);

    expect(second).toBe("v1");
    expect(fn2).not.toHaveBeenCalled();
  });

  it("serves the last stored value when a refetch past the logical TTL fails", async () => {
    const seed = await cached("stale-on-error", 1, async () => "good-value");
    expect(seed).toBe("good-value");

    // Past the 1s logical TTL, but nowhere near the 24h physical floor the
    // value was actually stored with — it's still physically present.
    vi.advanceTimersByTime(2_000);

    const result = await cached("stale-on-error", 1, async () => {
      throw new Error("upstream timed out");
    });

    expect(result).toBe("good-value");
  });

  it("propagates the error when there is no stale value to fall back to", async () => {
    await expect(
      cached("stale-none-available", 60, async () => {
        throw new Error("upstream unavailable");
      })
    ).rejects.toThrow("upstream unavailable");
  });

  it("cachedMany: falls back to stale per-key when fetchMissing omits an entry, and still returns fresh keys normally", async () => {
    const seeded = await cachedMany<string>(["stale-many:1", "stale-many:2"], 1, async (missing) => {
      const map = new Map<string, string>();
      for (const key of missing) map.set(key, `${key}:v1`);
      return map;
    });
    expect(seeded.get("stale-many:1")).toBe("stale-many:1:v1");
    expect(seeded.get("stale-many:2")).toBe("stale-many:2:v1");

    // Past the 1s logical TTL for both keys, but still physically present.
    vi.advanceTimersByTime(2_000);

    // Simulate a partial failure the way services/league.ts's
    // fetchHistories/fetchPicks do: a per-key try/catch that just omits the
    // key it failed to fetch, rather than rejecting the whole batch.
    const result = await cachedMany<string>(["stale-many:1", "stale-many:2"], 1, async (missing) => {
      const map = new Map<string, string>();
      for (const key of missing) {
        if (key === "stale-many:2") continue; // simulated failure, omitted
        map.set(key, `${key}:v2`);
      }
      return map;
    });

    expect(result.get("stale-many:1")).toBe("stale-many:1:v2"); // refetched fresh
    expect(result.get("stale-many:2")).toBe("stale-many:2:v1"); // stale fallback
  });
});
