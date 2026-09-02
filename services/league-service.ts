import { fplApiRoutes } from "@/lib/routes";

function time<T>(fn: () => Promise<T>, name: string): Promise<T> {
  const start = Date.now();
  try {
    return fn();
  } finally {
    const duration = Date.now() - start;
    console.log(`${name} took ${duration}ms`);
  }
}

export async function getCurrentGameweek(): Promise<number> {
  return time(async () => {
    const response = await fetch(fplApiRoutes.bootstrap, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bootstrap data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const events: Array<{ id: number; is_current: boolean; is_next: boolean; finished: boolean }> = data.events || [];
    // Handle preseason or downtime gracefully
    const current = events.find((e) => e.is_current);
    if (current) return current.id;
    const next = events.find((e) => e.is_next);
    if (next) return next.id;
    const lastFinished = [...events].reverse().find((e) => e.finished);
    if (lastFinished) return lastFinished.id;
    // Fallback to GW1 if nothing else is available
    return 1;
  }, 'getCurrentGameweek');
}

// Use the optimized version for better performance
// The optimized version reduces API calls from ~100+ to ~25 for a 20-team league
// by using request-scoped caching and deduplication
export { getLeagueDataOptimized as getLeagueData } from "./league-service-optimized";
