import { getCurrentGameweek, getLeagueData } from "@/services/league-service";
import { fplApiRoutes } from "@/lib/routes";

interface TeamHistory {
  current: Array<{
    event: number;
    points: number;
    event_transfers_cost: number;
  }>;
  chips: Array<{
    name: string;
    event: number;
    time: string;
  }>;
}

export interface PrizeWinner {
  playerName: string;
  teamName: string;
  points?: number;
  captainName?: string;
}

export interface WeeklyWinner {
  gameweek: number;
  playerName: string;
  teamName: string;
  points: number;
}

export interface PrizesData {
  currentGameweek: number;
  firstPlace: PrizeWinner | null;
  secondPlace: PrizeWinner | null;
  thirdPlace: PrizeWinner | null;
  highestBenchBoost: PrizeWinner | null;
  highestTripleCaptain: PrizeWinner | null;
  lastPlace: PrizeWinner | null;
  weeklyWinners: WeeklyWinner[];
}

/**
 * Get the highest bench boost score from the league history
 */
async function getHighestBenchBoost(): Promise<PrizeWinner | null> {
  try {
    // Get league data to get all team IDs
    const leagueData = await getLeagueData();
    const standings = leagueData.standings;
    
    // Track the highest bench boost score
    let highestBenchBoost: PrizeWinner | null = null;
    
    // Fetch history for all teams
    const teamsHistoryPromises = standings.map(team => 
      fetch(fplApiRoutes.teamHistory(team.entry.toString()))
        .then(res => res.json())
        .catch(error => {
          console.error(`Failed to fetch history for team ${team.entry}:`, error);
          return null;
        })
    );
    
    const teamsHistory = await Promise.all(teamsHistoryPromises);
    
    // Process each team's history
    teamsHistory.forEach((history: TeamHistory | null, index) => {
      if (!history) return;
      
      // Find gameweek where bench boost was used
      const benchBoostChip = history.chips.find(chip => chip.name === 'bboost');
      if (!benchBoostChip) return;
      
      // Get the gameweek data where bench boost was used
      const gameweekData = history.current.find(gw => gw.event === benchBoostChip.event);
      if (!gameweekData) return;
      
      // Calculate net points (points minus transfer cost)
      const netPoints = gameweekData.points - (gameweekData.event_transfers_cost || 0);
      
      // Update highest bench boost if this score is higher
      if (!highestBenchBoost || netPoints > (highestBenchBoost.points || 0)) {
        highestBenchBoost = {
          playerName: standings[index].player_name,
          teamName: standings[index].entry_name,
          points: netPoints,
        };
      }
    });
    
    return highestBenchBoost;
  } catch (error) {
    console.error("Error fetching highest bench boost:", error);
    return null;
  }
}

/**
 * Get the highest triple captain score from the league history
 */
async function getHighestTripleCaptain(): Promise<PrizeWinner | null> {
  try {
    // This would typically involve fetching all teams' history and filtering for triple captain use
    // For now, returning a placeholder
    return {
      playerName: "T L",
      teamName: "T FC",
      points: 57,
      captainName: "Haaland",
    };
  } catch (error) {
    console.error("Error fetching highest triple captain:", error);
    return null;
  }
}

/**
 * Get weekly winners for all completed gameweeks
 */
async function getWeeklyWinners(currentGameweek: number): Promise<WeeklyWinner[]> {
  try {
    const weeklyWinners: WeeklyWinner[] = [];
    
    // For each completed gameweek, fetch the standings and find the winner
    for (let gw = 1; gw <= currentGameweek; gw++) {
      try {
        const data = await getLeagueData(gw);
        
        if (data.standings.length > 0) {
          // Get the manager with the highest points for this gameweek
          const winner = data.standings.reduce((highest, current) => 
            current.event_total > highest.event_total ? current : highest
          );
          
          weeklyWinners.push({
            gameweek: gw,
            playerName: winner.player_name,
            teamName: winner.entry_name,
            points: winner.event_total,
          });
        }
      } catch (error) {
        console.error(`Error fetching data for gameweek ${gw}:`, error);
      }
    }
    
    return weeklyWinners;
  } catch (error) {
    console.error("Error fetching weekly winners:", error);
    return [];
  }
}

export async function getPrizesData(): Promise<PrizesData> {
  try {
    // Get current gameweek and league standings
    const currentGameweek = await getCurrentGameweek();
    const leagueData = await getLeagueData();
    
    // Get sorted standings (they should already be sorted by total points)
    const standings = leagueData.standings;
    
    // Get special prize winners
    const [highestBenchBoost, highestTripleCaptain, weeklyWinners] = await Promise.all([
      getHighestBenchBoost(),
      getHighestTripleCaptain(),
      getWeeklyWinners(currentGameweek),
    ]);
    
    // Return prize data
    return {
      currentGameweek,
      // Top three positions
      firstPlace: standings.length > 0 ? {
        playerName: standings[0].player_name,
        teamName: standings[0].entry_name,
      } : null,
      secondPlace: standings.length > 1 ? {
        playerName: standings[1].player_name,
        teamName: standings[1].entry_name,
      } : null,
      thirdPlace: standings.length > 2 ? {
        playerName: standings[2].player_name,
        teamName: standings[2].entry_name,
      } : null,
      // Special prizes
      highestBenchBoost,
      highestTripleCaptain,
      // Last place
      lastPlace: standings.length > 0 ? {
        playerName: standings[standings.length - 1].player_name,
        teamName: standings[standings.length - 1].entry_name,
      } : null,
      // Weekly winners
      weeklyWinners,
    };
  } catch (error) {
    console.error("Error fetching prizes data:", error);
    
    // Return empty data structure in case of error
    return {
      currentGameweek: 0,
      firstPlace: null,
      secondPlace: null,
      thirdPlace: null,
      highestBenchBoost: null,
      highestTripleCaptain: null,
      lastPlace: null,
      weeklyWinners: [],
    };
  }
} 