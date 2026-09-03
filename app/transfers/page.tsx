import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { TransferFeed, TransferHighlights } from "@/components/transfers/transfer-feed";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { getLeagueSnapshot, InvalidGameweekError } from "@/services/league";
import { getTransferFeed, groupTransfersByManager, summarizeTransfers, type TransferFeed as Feed } from "@/services/transfers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function TransfersRoute({ searchParams }: { searchParams: Promise<GwSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const gameweekParam = resolveGwParam("/transfers", resolvedSearchParams);
  const parsedGameweek = gameweekParam ? parseInt(gameweekParam, 10) : undefined;

  if (gameweekParam !== null && (parsedGameweek === undefined || Number.isNaN(parsedGameweek) || parsedGameweek < 1)) {
    notFound();
  }

  let feed: Feed;
  let currentGameweek: number;
  let leagueName: string;
  try {
    ({ feed, currentGameweek, leagueName } = await withUpstreamCounter(async () => {
      try {
        // The snapshot validates the gameweek and warms bootstrap, standings
        // and picks in the request memo; skip nothing here — the feed reads
        // picks for the hit cost anyway.
        const snapshot = await getLeagueSnapshot(parsedGameweek);
        const feed = await getTransferFeed(snapshot.selectedGameweek);
        return { feed, currentGameweek: snapshot.currentGameweek, leagueName: snapshot.leagueName };
      } finally {
        logTelemetry("/transfers");
      }
    }));
  } catch (error) {
    if (error instanceof InvalidGameweekError) {
      notFound();
    }
    throw error;
  }

  const { best, worst } = summarizeTransfers(feed.rows);
  const groups = groupTransfersByManager(feed.rows);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Transfers"
          description={`Every move in ${leagueName} for gameweek ${feed.selectedGameweek}, with the points each one earned`}
          currentGameweek={currentGameweek}
          selectedGameweek={feed.selectedGameweek}
          showGameweekSelector
        />
        <TransferHighlights best={best} worst={worst} />
        <TransferFeed groups={groups} gw={feed.selectedGameweek} />
      </div>
    </DashboardLayout>
  );
}
