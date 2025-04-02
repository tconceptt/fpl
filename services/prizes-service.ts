import { getCurrentGameweek, getLeagueData } from "@/services/league-service";

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
    // This would typically involve fetching all teams' history and filtering for bench boost use
    // For now, returning a placeholder
    return {
      playerName: "Abel Hailu",
      teamName: "Abel United",
      points: 42,
    };
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