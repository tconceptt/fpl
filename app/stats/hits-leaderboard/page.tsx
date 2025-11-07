import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { getStatsData } from "../getStatData";
import { getUrlParam } from "@/lib/helpers";
import Link from "next/link";
import { HitsLeaderboardClient } from "./hits-leaderboard-client";

export default async function HitsLeaderboardPage() {
  // Get gameweek from URL params
  const gameweekParam = await getUrlParam("gameweek");
  
  // First, get current gameweek by fetching data once
  const initialData = await getStatsData();
  
  // Determine selected gameweek (default to current active gameweek)
  const selectedGameweek = gameweekParam 
    ? parseInt(gameweekParam as string, 10) 
    : initialData.currentGameweek;
  
  // Validate selected gameweek
  const validSelectedGameweek = (selectedGameweek >= 1 && selectedGameweek <= initialData.currentGameweek && !isNaN(selectedGameweek))
    ? selectedGameweek
    : initialData.currentGameweek;
  
  // Fetch data filtered by selected gameweek (only if different from initial fetch)
  const data = validSelectedGameweek === initialData.currentGameweek && !gameweekParam
    ? initialData
    : await getStatsData(validSelectedGameweek);

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
