import { notFound } from "next/navigation";
import { getTeamPageDataOptimized } from "@/services/team-page-service";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { BottomNav } from "@/components/layout/bottom-nav";
import { BackButton } from "@/components/layout/back-button";
import { GameweekNav } from "@/components/layout/gameweek-nav";
import { TeamBreakdownClient } from "@/components/team/team-breakdown-client";
import { TeamComparisonClient } from "@/components/team/team-comparison-client";
import { TeamStatsClient } from "@/components/team/team-stats-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function TeamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ gw?: string; compare?: string }> }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const teamId = resolvedParams.id;
  const gw = resolvedSearchParams.gw || "";
  const compareTeamId = resolvedSearchParams.compare;
  if (!teamId || !gw) return notFound();

  const { currentGameweek, mainTeam, compareTeam } = await withUpstreamCounter(async () => {
    const result = await getTeamPageDataOptimized(teamId, gw, compareTeamId);
    logTelemetry(`/team/${teamId}`);
    return result;
  });

  const gwTotal = mainTeam.startersTotal;

  return (
    <>
      <div className={compareTeam ? "max-w-7xl mx-auto text-white px-3 py-2.5 pb-20" : "max-w-2xl mx-auto text-white px-3 py-2.5 pb-20"}>
        {/* Header with back button and gameweek selector */}
        <div className="flex items-center gap-2 mb-2">
          <BackButton />
          <div className="flex-1 min-w-0">
            {!compareTeam ? (
              <>
                <div className="text-sm font-bold truncate">{mainTeam.teamName}</div>
                <div className="text-[10px] text-white/60">{mainTeam.managerName}</div>
              </>
            ) : (
              <div className="text-sm font-bold">Team Comparison</div>
            )}
          </div>
          <GameweekNav currentGameweek={currentGameweek} />
        </div>

        {/* Team stats - only show in single team view */}
        {!compareTeam && (
          <TeamStatsClient
            overallRank={mainTeam.overallRank}
            h2hRank={mainTeam.h2hRank}
            transfers={mainTeam.transfers}
            transferCost={mainTeam.transferCost}
            startersTotal={gwTotal}
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

      {/* Bottom navigation */}
      <BottomNav />
    </>
  );
}
