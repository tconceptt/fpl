import { Suspense } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsPageShell } from "@/components/stats/stats-page-shell";
import { LeaderboardSkeleton } from "@/components/stats/stats-skeletons";
import { loadStatsData } from "../getStatData";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { GameweekWinnersClient } from "./gameweek-winners-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function GameweekWinnersContent({
  searchParams,
}: {
  searchParams: Promise<GwSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const gameweekParam = resolveGwParam("/stats/gameweek-winners", resolvedSearchParams);

  const { data, validSelectedGameweek } = await withUpstreamCounter(async () => {
    const result = await loadStatsData(gameweekParam);
    logTelemetry("/stats/gameweek-winners");
    return result;
  });

  return (
    <StatsPageShell
      title="Gameweek Winners"
      description={`After ${data.finishedGameweeks} completed gameweeks${
        validSelectedGameweek < data.currentGameweek ? ` (as of GW ${validSelectedGameweek})` : ""
      }`}
      currentGameweek={data.currentGameweek}
      selectedGameweek={validSelectedGameweek}
    >
      <GameweekWinnersClient stats={data.stats} unresolvedTies={data.unresolvedTies} />
    </StatsPageShell>
  );
}

export default function GameweekWinnersPage({
  searchParams,
}: {
  searchParams: Promise<GwSearchParams>;
}) {
  return (
    <DashboardLayout>
      <Suspense fallback={<LeaderboardSkeleton rows={14} columns={3} />}>
        <GameweekWinnersContent searchParams={searchParams} />
      </Suspense>
    </DashboardLayout>
  );
}
