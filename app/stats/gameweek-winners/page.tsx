import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { getStatsData } from "../getStatData";
import { getUrlParam } from "@/lib/helpers";
import Link from "next/link";
import { Suspense } from "react";
import { GameweekWinnersClient } from "./gameweek-winners-client";
import { Loader2 } from "lucide-react";

// Enable dynamic rendering for URL params
export const dynamic = 'force-dynamic';
export const revalidate = 300; // Revalidate every 5 minutes

async function GameweekWinnersContent() {
  // Get gameweek from URL params
  const gameweekParam = await getUrlParam("gameweek");
  
  // Get current gameweek first to determine what to fetch
  const currentData = await getStatsData();
  
  // Determine selected gameweek (default to current active gameweek)
  const selectedGameweek = gameweekParam 
    ? parseInt(gameweekParam as string, 10) 
    : currentData.currentGameweek;
  
  // Validate selected gameweek
  const validSelectedGameweek = (selectedGameweek >= 1 && selectedGameweek <= currentData.currentGameweek && !isNaN(selectedGameweek))
    ? selectedGameweek
    : currentData.currentGameweek;
  
  // Only fetch again if a different gameweek is selected
  const data = validSelectedGameweek === currentData.currentGameweek
    ? currentData
    : await getStatsData(validSelectedGameweek);

  return (
    <>
      <PageHeader
        title="Gameweek Winners"
        description={`After ${data.finishedGameweeks} completed gameweeks${validSelectedGameweek < data.currentGameweek ? ` (as of GW ${validSelectedGameweek})` : ''}`}
        currentGameweek={data.currentGameweek}
        selectedGameweek={validSelectedGameweek}
        showGameweekSelector={true}
      />
      <div className="mb-6">
        <Link href="/stats" className="text-sm text-blue-400 hover:underline">← Back to Stats</Link>
      </div>
      <GameweekWinnersClient
        stats={data.stats}
        unresolvedTies={data.unresolvedTies}
      />
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
      <p className="text-white text-lg font-medium">Loading gameweek winners...</p>
    </div>
  );
}

export default function GameweekWinnersPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<LoadingFallback />}>
        <GameweekWinnersContent />
      </Suspense>
    </DashboardLayout>
  );
} 