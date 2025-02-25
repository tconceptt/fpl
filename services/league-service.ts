import { fplApiRoutes } from "@/lib/routes";
import { calculateLivePoints } from "@/services/live-points-calculator";
import { getPlayerName } from "@/services/get-player-name";
import { getTeamHistory } from "@/services/net-gameweek-points";
import { GameweekStanding, LeagueData, LeagueStanding } from "@/types/league";

export async function getCurrentGameweek(): Promise<number> {
  const response = await fetch(fplApiRoutes.bootstrap, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch bootstrap data');
  }

  const data = await response.json();
  return data.events.find((event: { id: number; is_current: boolean }) => event.is_current).id;
}

export async function getHistoricalStandings(
  teamIds: number[], 
  selectedGameweek: number, 
  teamInfo: LeagueStanding[], 
  isCurrentGameweek: boolean
): Promise<GameweekStanding[]> {
  // Fetch historical data for all teams
  const teamsHistory = await Promise.all(
    teamIds.map(teamId => 
      getTeamHistory(teamId.toString())
        .catch(error => {
          console.error(`Failed to fetch history for team ${teamId}:`, error);
          return null;
        })
    )
  );

  // If it's the current gameweek, fetch live points and team details for all teams
  const livePointsMap = new Map<number, number>();
  let captainMap = new Map<number, string>();
  const transferCostMap = new Map<number, number>();
  
  if (isCurrentGameweek) {
    const [livePointsResults, teamDetailsResults] = await Promise.all([
      // Fetch live points
      Promise.all(
        teamIds.map(teamId =>
          calculateLivePoints(teamId.toString(), selectedGameweek.toString())
            .catch(error => {
              console.error(`Failed to fetch live points for team ${teamId}:`, error);
              return null;
            })
        )
      ),
      // Fetch team details to get captains
      Promise.all(
        teamIds.map(async teamId => {
          try {
            const response = await fetch(fplApiRoutes.teamDetails(teamId.toString(), selectedGameweek.toString()), {
              next: { revalidate: 30 },
            });
            if (!response.ok) return null;
            const data = await response.json();
            const captain = data.picks.find((pick: { is_captain: boolean }) => pick.is_captain);
            if (!captain) return null;
            const captainName = await getPlayerName(captain.element);
            return { teamId, captainName };
          } catch (error) {
            console.error(`Failed to fetch team details for team ${teamId}:`, error);
            return null;
          }
        })
      ),
    ]);

    // Process live points and transfer costs
    livePointsResults.forEach((result, index) => {
      if (result) {
        livePointsMap.set(teamIds[index], result.totalPoints);
        transferCostMap.set(teamIds[index], result.transferCost || 0);
      }
    });

    // Process captain names
    captainMap = new Map(
      teamDetailsResults
        .filter((result): result is { teamId: number; captainName: string } => 
          result !== null && result.captainName !== null
        )
        .map(result => [result.teamId, result.captainName])
    );
  }

  // Get gameweek data for each team
  const standings = teamsHistory
    .map((history, index) => {
      if (!history) return null;

      const gameweekData = history.current.find(gw => gw.event === selectedGameweek);
      if (!gameweekData) return null;

      const team = teamInfo.find(t => t.entry === teamIds[index]);
      if (!team) return null;

      // Use live points if available, otherwise use historical points
      const event_total = isCurrentGameweek
        ? (livePointsMap.get(teamIds[index]) || gameweekData.points)
        : gameweekData.points;

      // Calculate net points based on live data if it's the current gameweek
      const transferCost = isCurrentGameweek
        ? (transferCostMap.get(teamIds[index]) || gameweekData.event_transfers_cost)
        : gameweekData.event_transfers_cost;
      
      const net_points = event_total - transferCost;

      return {
        entry: teamIds[index],
        entry_name: team.entry_name,
        player_name: team.player_name,
        event_total,
        total_points: isCurrentGameweek 
          ? (team.total - gameweekData.points + event_total) 
          : gameweekData.total_points,
        net_points,
        rank: 0, // Will be calculated after sorting
        last_rank: 0, // Will be calculated after getting previous gameweek standings
        captain_name: captainMap.get(teamIds[index]),
      };
    })
    .filter((standing): standing is NonNullable<typeof standing> => standing !== null);

  // If it's not gameweek 1, get previous gameweek standings to calculate last_rank
  if (selectedGameweek > 1) {
    const previousStandings = teamsHistory
      .map((history, index) => {
        if (!history) return null;

        const previousGameweekData = history.current.find(gw => gw.event === selectedGameweek - 1);
        if (!previousGameweekData) return null;

        return {
          entry: teamIds[index],
          total_points: previousGameweekData.total_points,
        };
      })
      .filter((standing): standing is NonNullable<typeof standing> => standing !== null)
      .sort((a, b) => b.total_points - a.total_points);

    // Create a map of entry to previous rank
    const previousRanks = new Map(
      previousStandings.map((standing, index) => [standing.entry, index + 1])
    );

    // Update last_rank for each team
    standings.forEach(standing => {
      standing.last_rank = previousRanks.get(standing.entry) || standing.rank;
    });
  }

  // Sort by total points and assign current ranks
  return standings
    .sort((a, b) => b.total_points - a.total_points)
    .map((standing, index) => ({
      ...standing,
      rank: index + 1,
    }));
}

export async function getLeagueData(selectedGameweek?: number): Promise<LeagueData> {
  try {
    const [response, currentGameweek] = await Promise.all([
      fetch(
        fplApiRoutes.standings(process.env.FPL_LEAGUE_ID || ""),
        {
          next: { revalidate: 300 },
        }
      ),
      getCurrentGameweek()
    ]);

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const data = await response.json();
    const gameweek = selectedGameweek || currentGameweek;

    // Get team IDs from current standings
    const teamIds = data.standings.results.map((team: LeagueStanding) => team.entry);

    // Get historical standings for selected gameweek
    const historicalStandings = await getHistoricalStandings(
      teamIds,
      gameweek,
      data.standings.results,
      gameweek === currentGameweek
    );

    return {
      leagueName: data.league.name,
      currentGameweek,
      selectedGameweek: gameweek,
      standings: historicalStandings
    };
  } catch (error) {
    console.error("Error fetching league data:", error);
    // Return fallback data
    return {
      leagueName: "FPL League",
      currentGameweek: 1,
      selectedGameweek: 1,
      standings: []
    };
  }
} 