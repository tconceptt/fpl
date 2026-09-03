import { Suspense } from "react";
import { notFound } from "next/navigation";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/page-header";
import { TeamBreakdownClient } from "@/components/team/team-breakdown-client";
import { TeamComparisonClient } from "@/components/team/team-comparison-client";
import { TeamStatsClient } from "@/components/team/team-stats-client";
import { TeamPageSkeleton } from "@/components/team/team-page-skeleton";
import { getTeamPageData } from "@/services/team-page-service";
import { getHeaderContext } from "@/services/league";
import { resolveGwParam } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { formatPoints } from "@/lib/fpl";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function TeamPageContent({
  teamId,
  gw,
  compareTeamId,
}: {
  teamId: string;
  gw: string;
  compareTeamId?: string;
}) {
  const { currentGameweek, mainTeam, compareTeam } = await withUpstreamCounter(async () => {
    const result = await getTeamPageData(teamId, gw, compareTeamId);
    logTelemetry(`/team/${teamId}`);
    return result;
  });

  // The gameweek in the URL is only checked for shape (a positive integer)
  // before this fetch — validate it against the real current gameweek here,
  // now that we have it, the same way every other gw-aware page does.
  if (Number(gw) > currentGameweek) {
    notFound();
  }

  const title = compareTeam ? "Team comparison" : mainTeam.teamName;
  const description = compareTeam
    ? `${mainTeam.teamName} vs ${compareTeam.teamName} · GW ${gw}`
    : [
        mainTeam.managerName,
        mainTeam.overallRank ? `Rank ${mainTeam.overallRank.toLocaleString()}` : null,
        `${formatPoints(mainTeam.seasonTotal)} pts`,
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-start gap-2">
        <BackButton href="/" />
        <PageHeader
          title={title}
          description={description}
          currentGameweek={currentGameweek}
          selectedGameweek={Number(gw)}
        />
      </div>

      {!compareTeam && (
        <TeamStatsClient
          overallRank={mainTeam.overallRank}
          h2hRank={mainTeam.h2hRank}
          transfers={mainTeam.transfers}
          transferCost={mainTeam.transferCost}
          startersTotal={mainTeam.startersTotal}
          teamId={teamId}
          gameweek={gw}
          activeChip={mainTeam.activeChip}
        />
      )}

      {compareTeam ? (
        <TeamComparisonClient team1={mainTeam} team2={compareTeam} />
      ) : (
        <TeamBreakdownClient players={mainTeam.players} teamId={teamId} activeChip={mainTeam.activeChip} />
      )}
    </div>
  );
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gw?: string; gameweek?: string; compare?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const teamId = resolvedParams.id;
  if (!teamId) notFound();

  // resolveGwParam returns null when neither `gw` nor the legacy `gameweek`
  // param is present. Every other gw-aware page in the app treats that as
  // "use the current gameweek" — this page used to instead 404
  // (`if (!teamId || !gw) return notFound()`), which was a bug: following a
  // league-table link without an explicit gw (or typing `/team/<id>` by
  // hand) always 404'd. Fixed here to match the rest of the app.
  const gwParam = resolveGwParam(`/team/${teamId}`, resolvedSearchParams);
  let gw = gwParam;
  if (gw === null) {
    const header = await getHeaderContext();
    gw = String(header.currentGameweek);
  }

  const parsedGw = parseInt(gw, 10);
  if (Number.isNaN(parsedGw) || parsedGw < 1) notFound();

  const compareTeamId = resolvedSearchParams.compare;

  return (
    <DashboardLayout>
      <Suspense fallback={<TeamPageSkeleton compare={Boolean(compareTeamId)} />}>
        <TeamPageContent teamId={teamId} gw={String(parsedGw)} compareTeamId={compareTeamId} />
      </Suspense>
    </DashboardLayout>
  );
}
