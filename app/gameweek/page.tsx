import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { GameweekStatsClient } from "@/components/gameweek/gameweek-stats-client";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { getLeagueSnapshot, InvalidGameweekError, toStandings, type LeagueSnapshot } from "@/services/league";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function GameweekPage({
  searchParams,
}: {
  searchParams: Promise<GwSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const gameweekParam = resolveGwParam("/gameweek", resolvedSearchParams);
  const parsedGameweek = gameweekParam ? parseInt(gameweekParam, 10) : undefined;

  // getLeagueSnapshot rejects an out-of-range (but numeric) gw with
  // InvalidGameweekError before any per-manager fetching — a 404, not a
  // failure. Telemetry is still logged either way.
  let snapshot: LeagueSnapshot;
  try {
    snapshot = await withUpstreamCounter(async () => {
      try {
        return await getLeagueSnapshot(parsedGameweek);
      } finally {
        logTelemetry("/gameweek");
      }
    });
  } catch (error) {
    if (error instanceof InvalidGameweekError) {
      notFound();
    }
    throw error;
  }

  // Validate the requested gameweek only against a successfully fetched current
  // gameweek. (The numeric, out-of-range case is now caught above via
  // InvalidGameweekError; this still catches NaN, e.g. `?gw=abc`.)
  if (
    gameweekParam !== null &&
    (parsedGameweek === undefined ||
      Number.isNaN(parsedGameweek) ||
      parsedGameweek < 1 ||
      parsedGameweek > snapshot.currentGameweek)
  ) {
    notFound();
  }

  return (
    <DashboardLayout>
      <GameweekStatsClient
        initial={{
          leagueName: snapshot.leagueName,
          currentGameweek: snapshot.currentGameweek,
          selectedGameweek: snapshot.selectedGameweek,
          liveState: snapshot.liveState,
          standings: toStandings(snapshot),
        }}
      />
    </DashboardLayout>
  );
}
