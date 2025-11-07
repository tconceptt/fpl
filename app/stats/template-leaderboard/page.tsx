import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { fplApiRoutes } from "@/lib/routes";
import { getAllPlayersOwnership } from "@/services/get-player-ownership";
import { getCurrentGameweek } from "@/services/league-service";
import { getUrlParam } from "@/lib/helpers";
import { TemplateLeaderboardClient } from "./template-leaderboard-client";

interface StandingsResult {
  entry: number;
  entry_name: string;
  player_name: string;
}

interface LeagueStandingsResponse {
  standings: {
    results: StandingsResult[];
  };
}

interface TeamDetailsResponse {
  picks: Array<{ element: number; position: number }>;
}

export interface TemplateTeamStat {
  id: number;
  name: string;
  managerName: string;
  averageOwnership: number; // 0..100
  playersCount: number;
}

export default async function TemplateLeaderboardPage() {
  // Get gameweek from URL params, default to current active gameweek
  const gameweekParam = await getUrlParam("gameweek");
  const currentGameweek = await getCurrentGameweek();
  
  // Determine selected gameweek (default to current active gameweek)
  const selectedGameweek = gameweekParam 
    ? parseInt(gameweekParam as string, 10) 
    : currentGameweek;
  
  // Validate selected gameweek
  const validSelectedGameweek = (selectedGameweek >= 1 && selectedGameweek <= currentGameweek && !isNaN(selectedGameweek))
    ? selectedGameweek
    : currentGameweek;
  
  const ownershipMap = await getAllPlayersOwnership();

  // Fetch league standings to get team IDs and names
  const leagueId = process.env.FPL_LEAGUE_ID;
  if (!leagueId) {
    throw new Error("FPL_LEAGUE_ID environment variable is not set.");
  }

  const standingsResp = await fetch(fplApiRoutes.standings(leagueId), {
    cache: "no-store",
  });
  if (!standingsResp.ok) {
    throw new Error(`Failed to fetch standings: ${standingsResp.status} ${standingsResp.statusText}`);
  }
  const standingsJson: LeagueStandingsResponse = await standingsResp.json();
  const teams = standingsJson.standings.results;

  // For each team, fetch picks for current GW and compute average ownership for entire squad (positions <= 15)
  const teamStats: TemplateTeamStat[] = await Promise.all(
    teams.map(async (team) => {
      try {
        const tdResp = await fetch(
          fplApiRoutes.teamDetails(team.entry.toString(), validSelectedGameweek.toString()),
          { cache: "no-store" }
        );
        if (!tdResp.ok) {
          return {
            id: team.entry,
            name: team.entry_name,
            managerName: team.player_name,
            averageOwnership: 0,
            playersCount: 0,
          };
        }
        const teamDetails: TeamDetailsResponse = await tdResp.json();
        const squad = teamDetails.picks.filter((p) => p.position <= 15);
        const ownershipValues = squad.map((p) => ownershipMap.get(p.element) || 0);
        const playersCount = ownershipValues.length || 0;
        const averageOwnership = playersCount === 0
          ? 0
          : ownershipValues.reduce((sum, v) => sum + v, 0) / playersCount;

        return {
          id: team.entry,
          name: team.entry_name,
          managerName: team.player_name,
          averageOwnership,
          playersCount,
        };
      } catch {
        return {
          id: team.entry,
          name: team.entry_name,
          managerName: team.player_name,
          averageOwnership: 0,
          playersCount: 0,
        };
      }
    })
  );

  // Sort from lowest average ownership (most differential) to highest
  const sorted = teamStats
    .slice()
    .sort((a, b) => a.averageOwnership - b.averageOwnership);

  return (
    <DashboardLayout>
      <PageHeader
        title="Template Leaderboard"
        description={`Ranked by average ownership of entire squad (15 players${validSelectedGameweek < currentGameweek ? `, GW ${validSelectedGameweek}` : ', current GW'})`}
        currentGameweek={currentGameweek}
        selectedGameweek={validSelectedGameweek}
        showGameweekSelector={true}
      />
      <div className="mb-6">
        <Link href="/stats" className="text-sm text-blue-400 hover:underline">← Back to Stats</Link>
      </div>
      <TemplateLeaderboardClient data={sorted} currentGameweek={currentGameweek} selectedGameweek={validSelectedGameweek} />
    </DashboardLayout>
  );
}


