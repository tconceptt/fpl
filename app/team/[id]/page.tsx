import { notFound } from "next/navigation";
import { calculateRealTimePointsBreakdown } from "@/services/real-time-points-calculator";
import { getPlayerName } from "@/services/get-player-name";
import { AutoHideBottomNav } from "@/components/layout/auto-hide-bottom-nav";
import { BackButton } from "@/components/layout/back-button";
import { GameweekNav } from "@/components/layout/gameweek-nav";
import { TeamBreakdownClient } from "@/components/team/team-breakdown-client";
import { fplApiRoutes } from "@/lib/routes";

async function getCurrentGameweek(): Promise<number> {
  try {
    const response = await fetch(fplApiRoutes.bootstrap, {
      cache: "no-store",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch bootstrap data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const events: Array<{ id: number; is_current: boolean; is_next: boolean; finished: boolean }> = data.events || [];
    const current = events.find((e) => e.is_current);
    if (current) return current.id;
    const next = events.find((e) => e.is_next);
    if (next) return next.id;
    const lastFinished = [...events].reverse().find((e) => e.finished);
    if (lastFinished) return lastFinished.id;
    return 1;
  } catch (error) {
    console.error("Error fetching current gameweek:", error);
    return 1;
  }
}

export default async function TeamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ gw?: string }> }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const teamId = resolvedParams.id;
  const gw = resolvedSearchParams.gw || "";
  if (!teamId || !gw) return notFound();
  
  // Get current gameweek for navigation limits
  const currentGameweek = await getCurrentGameweek();
  
  // Fetch league standings to get the team name (entry_name) and manager name (player_name)
  const leagueId = process.env.FPL_LEAGUE_ID;
  const h2hLeagueId = "2489497"; // Head to Head league ID
  let teamName = `Team ${teamId}`;
  let managerName = "";
  let h2hRank: number | null = null;
  
  if (leagueId) {
    try {
      const standingsResponse = await fetch(fplApiRoutes.standings(leagueId), { cache: "no-store" });
      if (standingsResponse.ok) {
        const standingsData = await standingsResponse.json();
        const team = standingsData.standings.results.find((t: { entry: number; entry_name: string; player_name: string }) => t.entry === Number(teamId));
        if (team) {
          teamName = team.entry_name;
          managerName = team.player_name;
        }
      }
    } catch (error) {
      console.error("Failed to fetch team name from standings:", error);
    }
  }
  
  // Fetch H2H league standings
  try {
    const h2hResponse = await fetch(fplApiRoutes.h2hStandings(h2hLeagueId), { cache: "no-store" });
    if (h2hResponse.ok) {
      const h2hData = await h2hResponse.json();
      // H2H API structure: check if standings exists and has results
      if (h2hData.standings?.results) {
        const teamStanding = h2hData.standings.results.find((t: { entry: number; rank: number }) => t.entry === Number(teamId));
        if (teamStanding) {
          h2hRank = teamStanding.rank;
        }
      } else if (Array.isArray(h2hData.standings)) {
        // Sometimes standings is directly an array
        const teamStanding = h2hData.standings.find((t: { entry: number; rank: number }) => t.entry === Number(teamId));
        if (teamStanding) {
          h2hRank = teamStanding.rank;
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch H2H rank:", error, h2hLeagueId);
  }
  
  // Fetch team history for overall rank and transfer info
  let overallRank: number | null = null;
  let transfers = 0;
  let transferCost = 0;
  
  try {
    const historyResponse = await fetch(fplApiRoutes.teamHistory(teamId), { cache: "no-store" });
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      const gameweekData = historyData.current.find((g: { event: number; overall_rank: number; event_transfers: number; event_transfers_cost: number }) => g.event === Number(gw));
      if (gameweekData) {
        overallRank = gameweekData.overall_rank;
        transfers = gameweekData.event_transfers;
        transferCost = gameweekData.event_transfers_cost;
      }
    }
  } catch (error) {
    console.error("Failed to fetch team history:", error);
  }
  
  const breakdown = await calculateRealTimePointsBreakdown(teamId, gw);
  if (!breakdown) return notFound();
  const players = await Promise.all(
    breakdown.map(async (p) => ({ ...p, name: await getPlayerName(p.id, 'web_name') }))
  );
  const starters = players.filter((p: { position: number }) => p.position <= 11);
  const startersTotal = starters.reduce((s: number, p: { total?: number }) => s + (p.total || 0), 0);

  return (
    <>
      <div className="max-w-2xl mx-auto text-white px-3 py-2.5 pb-20">
        {/* Header with back button and gameweek selector */}
        <div className="flex items-center gap-2 mb-2">
          <BackButton />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{teamName}</div>
            <div className="text-[10px] text-white/60">{managerName}</div>
          </div>
          <GameweekNav currentGameweek={currentGameweek} />
        </div>

        {/* Team stats and total points - visually enhanced */}
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-lg p-2.5 mb-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              {overallRank && (
                <div className="flex flex-col">
                  <span className="text-[9px] text-white/50 uppercase tracking-wide">Overall Rank</span>
                  <span className="text-xs font-bold text-white">{overallRank.toLocaleString()}</span>
                </div>
              )}
              {h2hRank && (
                <div className="flex flex-col">
                  <span className="text-[9px] text-white/50 uppercase tracking-wide">H2H Rank</span>
                  <span className="text-xs font-bold text-white">#{h2hRank}</span>
                </div>
              )}
              {transfers > 0 && (
                <div className="flex flex-col">
                  <span className="text-[9px] text-white/50 uppercase tracking-wide">Transfers</span>
                  <span className="text-xs font-bold text-white">
                    {transfers}
                    {transferCost > 0 && (
                      <span className="text-red-400 ml-0.5">(-{transferCost})</span>
                    )}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-white/50 uppercase tracking-wide">GW Total</span>
              <span className="text-xl font-bold text-green-400">{startersTotal}</span>
            </div>
          </div>
        </div>

        <TeamBreakdownClient players={players} />
      </div>
      
      {/* Auto-hide bottom navigation */}
      <AutoHideBottomNav />
    </>
  );
}


