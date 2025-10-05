import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { getStatsData } from "../getStatData";
import Link from "next/link";
import { HitsLeaderboardClient } from "./hits-leaderboard-client";

export default async function HitsLeaderboardPage() {
  const data = await getStatsData();

  return (
    <DashboardLayout>
      <PageHeader
        title="Hits Leaderboard"
        description={`Transfer hits taken after ${data.finishedGameweeks} completed gameweeks`}
        currentGameweek={data.finishedGameweeks}
        selectedGameweek={data.finishedGameweeks}
        showGameweekSelector={false}
      />
      <div className="mb-6">
        <Link href="/stats" className="text-sm text-blue-400 hover:underline">← Back to Stats</Link>
      </div>
      <HitsLeaderboardClient hitsStats={data.hitsStats} />
    </DashboardLayout>
  );
}
