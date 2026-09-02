import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { loadStatsData } from "../getStatData";
import { getUrlParam } from "@/lib/helpers";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import Link from "next/link";
import { HitsLeaderboardClient } from "./hits-leaderboard-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function HitsLeaderboardPage() {
  const gameweekParam = await getUrlParam("gameweek");

  const { data, validSelectedGameweek } = await withUpstreamCounter(async () => {
    const result = await loadStatsData(gameweekParam);
    logTelemetry("/stats/hits-leaderboard");
    return result;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Hits Leaderboard"
        description={`Transfer hits taken after ${data.finishedGameweeks} completed gameweeks${validSelectedGameweek < data.currentGameweek ? ` (as of GW ${validSelectedGameweek})` : ''}`}
        currentGameweek={data.currentGameweek}
        selectedGameweek={validSelectedGameweek}
        showGameweekSelector={true}
      />
      <div className="mb-6">
        <Link href="/stats" className="text-sm text-blue-400 hover:underline">← Back to Stats</Link>
      </div>
      <HitsLeaderboardClient hitsStats={data.hitsStats} />
    </DashboardLayout>
  );
}
