import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LeagueTable } from "@/components/league-table/league-table";
import { LeagueTableSkeleton } from "@/components/league-table/league-table-skeleton";
import { getLeagueSnapshot, InvalidGameweekError, toStandings, type LeagueSnapshot } from "@/services/league";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";

export const revalidate = 0;
export const maxDuration = 60;

/**
 * The data-dependent half of the page, inside <Suspense> so DashboardLayout
 * (and its nav) paint immediately while the snapshot fan-out resolves.
 * PageHeader lives inside LeagueTable itself (see that file) rather than
 * here, because its gameweek selector is wired to useLeague.setGw — state
 * that only exists in that client component.
 */
async function LeagueTableSection({
  gameweekParam,
  requestedGameweek,
}: {
  gameweekParam: string | null;
  requestedGameweek: number | undefined;
}) {
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

  // requestedGameweek is undefined only when gameweekParam was an empty
  // string, which is itself invalid input — treat that the same as NaN.
  // (The numeric, out-of-range case is now caught above via
  // InvalidGameweekError.)
  const gwValue = requestedGameweek ?? NaN;
  if (
    gameweekParam !== null &&
    (Number.isNaN(gwValue) || gwValue < 1 || gwValue > snapshot.currentGameweek)
  ) {
    notFound();
  }

  return (
    <LeagueTable
      initial={{
        leagueName: snapshot.leagueName,
        currentGameweek: snapshot.currentGameweek,
        selectedGameweek: snapshot.selectedGameweek,
        liveState: snapshot.liveState,
        standings: toStandings(snapshot),
      }}
    />
  );
}

export default async function LeaguePage({
  searchParams,
}: {
  searchParams: Promise<GwSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const gameweekParam = resolveGwParam("/", resolvedSearchParams);
  const parsedGameweek = gameweekParam ? parseInt(gameweekParam, 10) : undefined;
  const requestedGameweek = Number.isNaN(parsedGameweek) ? undefined : parsedGameweek;

  return (
    <DashboardLayout>
      <Suspense fallback={<LeagueTableSkeleton />}>
        <LeagueTableSection
          gameweekParam={gameweekParam}
          requestedGameweek={requestedGameweek}
        />
      </Suspense>
    </DashboardLayout>
  );
}
