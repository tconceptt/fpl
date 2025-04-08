import { getCurrentGameweek, getLeagueData } from "@/services/league-service";
import { fplApiRoutes } from "@/lib/routes";
import { getPlayerName } from "@/services/get-player-name";

export interface PrizeWinner {
  playerName: string;
  teamName: string;
  points?: number;
  captainName?: string;
  gameweek?: number;
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
async function getHighestBenchBoost(): Promise<(PrizeWinner & { gameweek?: number }) | null> {
  try {
    const currentGameweek = await getCurrentGameweek();
    let highestScore: (PrizeWinner & { gameweek?: number }) | null = null;
    
    // Iterate through all gameweeks to find the highest bench boost score
    for (let gw = 1; gw <= currentGameweek; gw++) {
      const leagueData = await getLeagueData(gw);
      
      // Check each team's data for the gameweek
      for (const standing of leagueData.standings) {
        // Only consider if they used bench boost this gameweek
        if (standing.active_chip === 'bboost') {
          const points = standing.event_total;
          
          // Update highest score if this is higher
          if (!highestScore || points > (highestScore.points || 0)) {
            highestScore = {
              playerName: standing.player_name,
              teamName: standing.entry_name,
              points: points,
              gameweek: gw
            };
          }
        }
      }
    }
    
    return highestScore;
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
    const currentGameweek = await getCurrentGameweek();
    let highestScore: PrizeWinner | null = null;
    
    // Iterate through all gameweeks to find the highest triple captain score
    for (let gw = 1; gw <= currentGameweek; gw++) {
      const leagueData = await getLeagueData(gw);
      
      // Check each team's data for the gameweek
      for (const standing of leagueData.standings) {
        // Only consider if they used triple captain this gameweek
        if (standing.active_chip === '3xc') {
          try {
            // Get team details to find the captain's player ID
            const teamDetailsResponse = await fetch(
              fplApiRoutes.teamDetails(standing.entry.toString(), gw.toString()),
              { next: { revalidate: 30 } }
            );
            
            if (!teamDetailsResponse.ok) continue;
            
            const teamDetails = await teamDetailsResponse.json();
            const captain = teamDetails.picks.find((pick: { is_captain: boolean }) => pick.is_captain);
            
            if (!captain) continue;
            
            // Get live standings to get the captain's actual points
            const liveStandingsResponse = await fetch(
              fplApiRoutes.liveStandings(gw.toString()),
              { next: { revalidate: 30 } }
            );
            
            if (!liveStandingsResponse.ok) continue;
            
            const liveStandings = await liveStandingsResponse.json();
            const captainStats = liveStandings.elements.find(
              (element: { id: number }) => element.id === captain.element
            );
            
            if (!captainStats) continue;
            
            // Calculate triple captain points (base points × 3)
            const triplePoints = captainStats.stats.total_points * 3;
            
            // Update highest score if this is higher
            if (!highestScore || triplePoints > (highestScore.points || 0)) {
              // Get captain's name
              const captainName = await getPlayerName(captain.element);
              
              highestScore = {
                playerName: standing.player_name,
                teamName: standing.entry_name,
                points: triplePoints,
                captainName: captainName,
                gameweek: gw
              };
            }
          } catch (error) {
            console.error(`Error processing triple captain for team ${standing.entry} in gameweek ${gw}:`, error);
            continue;
          }
        }
      }
    }
    
    return highestScore;
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