import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { OwnershipClient } from "./ownership-client";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { InvalidGameweekError } from "@/services/league";
import { differentials, getOwnershipPage, highestOwnership, type OwnershipPage } from "@/services/ownership";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function OwnershipRoute({ searchParams }: { searchParams: Promise<GwSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const gameweekParam = resolveGwParam("/stats/ownership", resolvedSearchParams);
  const parsedGameweek = gameweekParam ? parseInt(gameweekParam, 10) : undefined;

  if (gameweekParam !== null && (parsedGameweek === undefined || Number.isNaN(parsedGameweek) || parsedGameweek < 1)) {
    notFound();
  }

  let page: OwnershipPage;
  try {
    page = await withUpstreamCounter(async () => {
      try {
        return await getOwnershipPage(parsedGameweek);
      } finally {
        logTelemetry("/stats/ownership");
      }
    });
  } catch (error) {
    if (error instanceof InvalidGameweekError) {
      notFound();
    }
    throw error;
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Effective Ownership"
          description={`Who the league is riding in gameweek ${page.selectedGameweek}, across ${page.managerCount} managers`}
          currentGameweek={page.currentGameweek}
          selectedGameweek={page.selectedGameweek}
          showGameweekSelector
        />
        <div>
          <Link href="/stats" className="text-sm text-blue-400 hover:underline">
            ← Back to Stats
          </Link>
        </div>
        <OwnershipClient
          highest={highestOwnership(page.rows)}
          differentials={differentials(page.rows)}
          managerCount={page.managerCount}
        />
      </div>
    </DashboardLayout>
  );
}
