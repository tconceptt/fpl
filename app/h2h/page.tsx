import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { H2HMatchups, H2HTable } from "@/components/h2h/h2h-matchups";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { InvalidGameweekError } from "@/services/league";
import { getH2HPage, type H2HPage } from "@/services/h2h";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function H2HRoute({ searchParams }: { searchParams: Promise<GwSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const gameweekParam = resolveGwParam("/h2h", resolvedSearchParams);
  const parsedGameweek = gameweekParam ? parseInt(gameweekParam, 10) : undefined;

  if (gameweekParam !== null && (parsedGameweek === undefined || Number.isNaN(parsedGameweek) || parsedGameweek < 1)) {
    notFound();
  }

  let page: H2HPage;
  try {
    page = await withUpstreamCounter(async () => {
      try {
        return await getH2HPage(parsedGameweek);
      } finally {
        logTelemetry("/h2h");
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
          title="Head to Head"
          description={
            page.live
              ? "Live net scores from this gameweek's picks"
              : `Final scores for gameweek ${page.selectedGameweek}`
          }
          currentGameweek={page.currentGameweek}
          selectedGameweek={page.selectedGameweek}
          showGameweekSelector
        />

        {!page.configured ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-white/60">
              No head-to-head league is configured for this season.
            </CardContent>
          </Card>
        ) : (
          <>
            <H2HMatchups matchups={page.matchups} live={page.live} gw={page.selectedGameweek} />
            <H2HTable rows={page.table} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
