import { fplApiRoutes } from "@/lib/routes";
import { calculateLivePoints } from "@/services/live-points-calculator";
import { getPlayerName } from "@/services/get-player-name";
import { getTeamHistory } from "@/services/net-gameweek-points";
import { GameweekStanding, LeagueData, LeagueStanding } from "@/types/league";

export async function getCurrentGameweek(): Promise<number> {
  const response = await fetch(fplApiRoutes.bootstrap, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bootstrap data: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const events: Array<{ id: number; is_current: boolean; is_next: boolean; finished: boolean }> = data.events || [];
  // Handle preseason or downtime gracefully
  const current = events.find((e) => e.is_current);
  if (current) return current.id;
  const next = events.find((e) => e.is_next);
  if (next) return next.id;
  const lastFinished = [...events].reverse().find((e) => e.finished);
  if (lastFinished) return lastFinished.id;
  // Fallback to GW1 if nothing else is available
  return 1;
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
  let chipMap = new Map<number, string | null>();
  
  // Fetch team details for all teams to get captains and chips
  const teamDetailsResults = await Promise.all(
    teamIds.map(async teamId => {
      try {
        const response = await fetch(fplApiRoutes.teamDetails(teamId.toString(), selectedGameweek.toString()), {
          cache: "no-store",
        });
        if (!response.ok) return null;
        const data = await response.json();
        const captain = data.picks.find((pick: { is_captain: boolean }) => pick.is_captain);
        const captainName = captain ? await getPlayerName(captain.element) : null;
        return { 
          teamId, 
          captainName,
          active_chip: data.active_chip 
        };
      } catch (error) {
        console.error(`Failed to fetch team details for team ${teamId}:`, error);
        return null;
      }
    })
  );
  
  if (isCurrentGameweek) {
    // Fetch live points
    const livePointsResults = await Promise.all(
      teamIds.map(teamId =>
        calculateLivePoints(teamId.toString(), selectedGameweek.toString())
          .catch(error => {
            console.error(`Failed to fetch live points for team ${teamId}:`, error);
            return null;
          })
      )
    );

    // Process live points and transfer costs
    livePointsResults.forEach((result, index) => {
      if (result) {
        livePointsMap.set(teamIds[index], result.totalPoints);
        transferCostMap.set(teamIds[index], result.transferCost || 0);
      }
    });
  }

  // Process captain names and chips
  captainMap = new Map(
    teamDetailsResults
      .filter((result): result is { teamId: number; captainName: string; active_chip: string | null } => 
        result !== null && result.captainName !== null
      )
      .map(result => [result.teamId, result.captainName])
  );
  
  chipMap = new Map(
    teamDetailsResults
      .filter((result): result is { teamId: number; captainName: string | null; active_chip: string | null } => 
        result !== null
      )
      .map(result => [result.teamId, result.active_chip])
  );

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
        active_chip: chipMap.get(teamIds[index]),
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
  const retryFetch = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
    try {
      // Add authentication headers
      const headers = {
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://fantasy.premierleague.com',
        'Referer': 'https://fantasy.premierleague.com/'
      };

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {})
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Resource not found. Please check if FPL_LEAGUE_ID is set correctly in your environment variables.`);
        }
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      return response;
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying... ${retries} attempts left`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return retryFetch(url, options, retries - 1);
      }
      throw error;
    }
  };

  try {
    const leagueId = process.env.FPL_LEAGUE_ID;
    if (!leagueId) {
      throw new Error('FPL_LEAGUE_ID environment variable is not set. Please set it in your .env.local file.');
    }

    const [response, currentGameweek] = await Promise.all([
      retryFetch(fplApiRoutes.standings(leagueId), {
        cache: "no-store",
      }),
      getCurrentGameweek(),
    ]);

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