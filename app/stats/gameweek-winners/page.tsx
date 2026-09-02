import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { loadStatsData } from "../getStatData";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import Link from "next/link";
import { Suspense } from "react";
import { GameweekWinnersClient } from "./gameweek-winners-client";
import { Loader2 } from "lucide-react";

// Enable dynamic rendering for URL params
export const dynamic = 'force-dynamic';
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

export default function GameweekWinnersPage({
  searchParams,
}: {
  searchParams: Promise<GwSearchParams>;
}) {
  return (
    <DashboardLayout>
      <Suspense fallback={<LoadingFallback />}>
        <GameweekWinnersContent searchParams={searchParams} />
      </Suspense>
    </DashboardLayout>
  );
} 