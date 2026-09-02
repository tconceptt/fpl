import { describe, expect, it } from "vitest";
import { cachedMany } from "@/lib/fpl/cache";

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
