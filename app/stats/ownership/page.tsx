import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { OwnershipClient } from "./ownership-client";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { InvalidGameweekError } from "@/services/league";
import { getOwnershipPage, type OwnershipPage } from "@/services/ownership";

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
      <OwnershipClient
        initial={page.rows}
        initialGw={page.selectedGameweek}
        currentGameweek={page.currentGameweek}
        managerCount={page.managerCount}
      />
    </DashboardLayout>
  );
}
