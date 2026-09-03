import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsPageShell } from "@/components/stats/stats-page-shell";
import { loadStatsData } from "../getStatData";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { HitsLeaderboardClient } from "./hits-leaderboard-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function HitsLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<GwSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const gameweekParam = resolveGwParam("/stats/hits-leaderboard", resolvedSearchParams);

  const { data, validSelectedGameweek } = await withUpstreamCounter(async () => {
    const result = await loadStatsData(gameweekParam);
    logTelemetry("/stats/hits-leaderboard");
    return result;
  });

  return (
    <DashboardLayout>
      <StatsPageShell
        title="Hits Leaderboard"
        description={`Transfer hits taken after ${data.finishedGameweeks} completed gameweeks${
          validSelectedGameweek < data.currentGameweek ? ` (as of GW ${validSelectedGameweek})` : ""
        }`}
        currentGameweek={data.currentGameweek}
        selectedGameweek={validSelectedGameweek}
      >
        <HitsLeaderboardClient hitsStats={data.hitsStats} />
      </StatsPageShell>
    </DashboardLayout>
  );
}
