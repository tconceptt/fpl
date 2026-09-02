import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LeagueTable } from "@/components/league-table/league-table";
import { getLeagueSnapshot, InvalidGameweekError, toStandings, type LeagueSnapshot } from "@/services/league";
import { notFound } from "next/navigation";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";

export const revalidate = 0;
export const maxDuration = 60;

export default async function LeaguePage({
  searchParams,
}: {
  searchParams: Promise<GwSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const gameweekParam = resolveGwParam("/", resolvedSearchParams);
  const parsedGameweek = gameweekParam ? parseInt(gameweekParam, 10) : undefined;
  const requestedGameweek = Number.isNaN(parsedGameweek) ? undefined : parsedGameweek;

  // getLeagueSnapshot throws on failure — app/error.tsx renders the real error
  // rather than a silent, misleading empty league — except InvalidGameweekError
  // (an out-of-range gw, rejected before any per-manager fetching), which is a
  // 404, not a failure. Telemetry is still logged either way.
  let snapshot: LeagueSnapshot;
  try {
    snapshot = await withUpstreamCounter(async () => {
      try {
        return await getLeagueSnapshot(requestedGameweek);
      } finally {
        logTelemetry("/");
      }
    });
  } catch (error) {
    if (error instanceof InvalidGameweekError) {
      notFound();
    }
    throw error;
  }

  // parsedGameweek is undefined only when gameweekParam was an empty string,
  // which is itself invalid input — treat that the same as NaN. (The numeric,
  // out-of-range case is now caught above via InvalidGameweekError.)
  const gwValue = parsedGameweek ?? NaN;
  if (
    gameweekParam !== null &&
    (Number.isNaN(gwValue) || gwValue < 1 || gwValue > snapshot.currentGameweek)
  ) {
    notFound();
  }

  const standings = toStandings(snapshot);

  return (
    <DashboardLayout>
      <LeagueTable
        standings={standings}
        currentGameweek={snapshot.currentGameweek}
        selectedGameweek={snapshot.selectedGameweek}
      />
    </DashboardLayout>
  );
}
