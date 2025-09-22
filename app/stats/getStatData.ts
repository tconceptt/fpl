import { fplApiRoutes } from "@/lib/routes";
import { getPlayerName } from "@/services/get-player-name";

// NEW INTERFACE for Tie Break Details
export interface TieBreakDetail {
  gameweek: number;
  initiallyTiedTeams: Array<{ id: number; name: string; managerName: string; score: number }>;
  winningTeam: { id: number; name: string; managerName: string; };
  resolutionMethod: string; // e.g., "Won in GW X+1", "Coin Toss"
  resolutionGameweek?: number; // The GW that broke the tie
  details: string; // Narrative description, e.g. "Player A (100pts) vs Player B (90pts) in GW Y"
}

export async function getStatsData() {
  try {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    };
    // Fetch league standings and bootstrap data
    const [leagueData, bootstrapData] = await Promise.all([
      fetch(fplApiRoutes.standings(process.env.FPL_LEAGUE_ID || ""), {
        headers,
      }),
      fetch(fplApiRoutes.bootstrap, { headers }),
    ]);

    if (!leagueData.ok || !bootstrapData.ok) {
      throw new Error("Failed to fetch data");
    }

    const { standings } = await leagueData.json();
    const { events } = await bootstrapData.json();

    // Get finished gameweeks
    const finishedGameweeks = events
      .filter((event: { finished: boolean }) => event.finished)
      .map((event: { id: number }) => event.id)
      .sort((a: number, b: number) => a - b); // Ensure sorted

    // Extract team data
    const teams: TeamData[] = standings.results.map(
      (result: StandingsResult) => ({
        id: result.entry,
        name: result.entry_name,
        managerName: result.player_name,
      })
    );

    // Fetch history for all teams
    const teamHistories = new Map<number, TeamHistory>();
    await Promise.all(
      teams.map(async (team) => {
        const response = await fetch(
          fplApiRoutes.teamHistory(team.id.toString()),
          { headers }
        );
        if (response.ok) {
          const data = await response.json();
          teamHistories.set(team.id, {
            current: data.current || [],
            chips: data.chips || [],
          });
        }
      })
    );

    // Initialize team stats and chip usage maps
    const teamStatsMap = new Map<number, TeamStats>();
    const chipUsageMap = new Map<number, ChipUsage>();
    const tieBreakDetailsList: TieBreakDetail[] = []; // To store details of ties

    teams.forEach((team: TeamData) => {
      teamStatsMap.set(team.id, {
        id: team.id,
        name: team.name,
        managerName: team.managerName,
        wins: 0,
        totalPoints: 0,
        benchPoints: 0,
        bestGameweek: {
          gameweek: 0,
          points: -1, // Initialize with a value lower than any possible score
        },
        gameweekWins: [],
      });

      chipUsageMap.set(team.id, {
        id: team.id,
        name: team.name,
        managerName: team.managerName,
        totalChipsUsed: 0,
        chips: [],
      });
    });

    // Process chips usage
    teams.forEach((team) => {
      const history = teamHistories.get(team.id);
      if (!history) return;

      const chipUsage = chipUsageMap.get(team.id);
      if (!chipUsage) return;

      // Get chips from history and process them
      const validChips = history.chips
        .map((chip) => ({
          name:
            chip.name === "wildcard"
              ? "Wildcard"
              : chip.name === "3xc"
              ? "Triple Captain"
              : chip.name === "bboost"
              ? "Bench Boost"
              : chip.name === "freehit"
              ? "Free Hit"
              : chip.name === "manager"
              ? "Manager"
              : chip.name === "assistant_manager"
              ? "Assistant Manager"
              : chip.name,
          gameweek: chip.event,
        }))
        .sort((a, b) => a.gameweek - b.gameweek);

      chipUsage.chips = validChips;
      chipUsage.totalChipsUsed = validChips.length;
    });

    // Helper function to get net points for a team in a specific gameweek
    const getNetPointsForTeamInGameweek = (
      teamId: number,
      gameweek: number,
      histories: Map<number, TeamHistory>
    ): number | null => {
      const history = histories.get(teamId);
      const gwData = history?.current.find((g) => g.event === gameweek);
      if (gwData) {
        return gwData.points - (gwData.event_transfers_cost || 0);
      }
      return null; // Team might not have data for this gameweek
    };

    // MODIFIED: resolveTieForGameweek to return details
    const resolveTieForGameweek = (
      tiedGameweek: number,
      initialPotentialWinners: { id: number; points: number; net_points: number }[],
      histories: Map<number, TeamHistory>,
      allFinishedGWs: number[],
      teamDataMap: Map<number, TeamData> // Pass team data for names
    ): { winnerId: number; detail: TieBreakDetail | null } => { // Return type changed
      
      let currentTiedEntries = initialPotentialWinners.map(w => ({ // Keep full entry data
          id: w.id,
          originalNetPoints: w.net_points 
      }));

      const initiallyTiedTeamsForDetail = initialPotentialWinners.map(w => {
        const teamInfo = teamDataMap.get(w.id);
        return { 
          id: w.id, 
          name: teamInfo?.name || 'Unknown Team', 
          managerName: teamInfo?.managerName || 'Unknown Manager', 
          score: w.net_points 
        };
      });
      
      let resolutionDetail: TieBreakDetail | null = null;

      const subsequentGameweeks = allFinishedGWs.filter(gw => gw > tiedGameweek);

      for (const subsequentGW of subsequentGameweeks) {
        let maxPointsInSubsequentGW = -Infinity;
        const NULL_POINTS_VALUE = -Infinity - 1;
        let winnersInSubsequentGW: { id: number; pointsInSubsequent: number | null}[] = [];
        let teamsWithDataCount = 0;
        const pointsNarrative: string[] = [];


        for (const entry of currentTiedEntries) {
          const points = getNetPointsForTeamInGameweek(entry.id, subsequentGW, histories);
          const currentComparisonPoints = points === null ? NULL_POINTS_VALUE : points;
          const teamInfo = teamDataMap.get(entry.id);
          pointsNarrative.push(`${teamInfo?.managerName || entry.id}: ${points === null ? 'N/A' : points + 'pts'}`);


          if (points !== null) {
            teamsWithDataCount++;
          }

          if (currentComparisonPoints > maxPointsInSubsequentGW) {
            maxPointsInSubsequentGW = currentComparisonPoints;
            winnersInSubsequentGW = [{id: entry.id, pointsInSubsequent: points}];
          } else if (currentComparisonPoints === maxPointsInSubsequentGW) {
            winnersInSubsequentGW.push({id: entry.id, pointsInSubsequent: points});
          }
        }

        if (teamsWithDataCount === 0 && currentTiedEntries.length > 0) continue;
        if (winnersInSubsequentGW.length === 1 && maxPointsInSubsequentGW > NULL_POINTS_VALUE) {
          const winnerId = winnersInSubsequentGW[0].id;
          const winnerTeamInfo = teamDataMap.get(winnerId);
          resolutionDetail = {
            gameweek: tiedGameweek,
            initiallyTiedTeams: initiallyTiedTeamsForDetail,
            winningTeam: { 
              id: winnerId, 
              name: winnerTeamInfo?.name || 'Unknown', 
              managerName: winnerTeamInfo?.managerName || 'Unknown' 
            },
            resolutionMethod: `Higher score in GW${subsequentGW}`,
            resolutionGameweek: subsequentGW,
            details: `Won with ${winnersInSubsequentGW[0].pointsInSubsequent}pts in GW${subsequentGW}. Scores: ${pointsNarrative.join(', ')}.`
          };
          return { winnerId, detail: resolutionDetail };
        }
        if (maxPointsInSubsequentGW === NULL_POINTS_VALUE && winnersInSubsequentGW.length === currentTiedEntries.length) continue;
        if (winnersInSubsequentGW.length === 1) { // Tie broken
            const winnerId = winnersInSubsequentGW[0].id;
            const winnerTeamInfo = teamDataMap.get(winnerId);
            resolutionDetail = {
                gameweek: tiedGameweek,
                initiallyTiedTeams: initiallyTiedTeamsForDetail,
                winningTeam: { 
                    id: winnerId, 
                    name: winnerTeamInfo?.name || 'Unknown', 
                    managerName: winnerTeamInfo?.managerName || 'Unknown' 
                },
                resolutionMethod: `Higher score in GW${subsequentGW}`,
                resolutionGameweek: subsequentGW,
                details: `Won with ${winnersInSubsequentGW[0].pointsInSubsequent}pts in GW${subsequentGW}. Scores: ${pointsNarrative.join(', ')}.`
            };
            return { winnerId, detail: resolutionDetail };
        }
        if (winnersInSubsequentGW.length > 0 && winnersInSubsequentGW.length < currentTiedEntries.length) {
          currentTiedEntries = winnersInSubsequentGW.map(w => ({id: w.id, originalNetPoints: currentTiedEntries.find(ce => ce.id === w.id)?.originalNetPoints || 0 }));
          if (currentTiedEntries.length === 1) { // Should have been caught by winnersInSubsequentGW.length === 1
            const winnerId = currentTiedEntries[0].id;
            const winnerTeamInfo = teamDataMap.get(winnerId);
            const finalWinnerPoints = getNetPointsForTeamInGameweek(winnerId, subsequentGW, histories);
             resolutionDetail = {
                gameweek: tiedGameweek,
                initiallyTiedTeams: initiallyTiedTeamsForDetail,
                winningTeam: { 
                    id: winnerId, 
                    name: winnerTeamInfo?.name || 'Unknown', 
                    managerName: winnerTeamInfo?.managerName || 'Unknown' 
                },
                resolutionMethod: `Higher score in GW${subsequentGW}`,
                resolutionGameweek: subsequentGW,
                details: `Won with ${finalWinnerPoints}pts in GW${subsequentGW}. Final comparison: ${pointsNarrative.join(', ')}.`
            };
            return { winnerId, detail: resolutionDetail };
          }
           if (currentTiedEntries.length === 0) {
               currentTiedEntries = initialPotentialWinners.map(w => ({id: w.id, originalNetPoints: w.net_points})); // Fallback
               break; 
           }
        } else if (winnersInSubsequentGW.length === currentTiedEntries.length) {
          // Tie persists
        } else if (winnersInSubsequentGW.length === 0 && currentTiedEntries.length > 0) {
            continue;
        }
      }

      // Coin toss
      const randomIndex = Math.floor(Math.random() * currentTiedEntries.length);
      const winnerId = currentTiedEntries[randomIndex].id;
      const winnerTeamInfo = teamDataMap.get(winnerId);
      resolutionDetail = {
        gameweek: tiedGameweek,
        initiallyTiedTeams: initiallyTiedTeamsForDetail,
        winningTeam: { 
          id: winnerId, 
          name: winnerTeamInfo?.name || 'Unknown', 
          managerName: winnerTeamInfo?.managerName || 'Unknown' 
        },
        resolutionMethod: "Coin Toss",
        details: `Tie persisted through all subsequent gameweeks. Winner chosen by virtual coin toss from ${currentTiedEntries.length} teams.`
      };
      return { winnerId, detail: resolutionDetail };
    };
    
    // Process each finished gameweek for wins, points, etc.
    // The gameweekWinnerMap is for a different purpose (manager chip) and its original logic is preserved.
    const gameweekWinnerMap = new Map<number, { id: number; managerName: string; points: number }>();
    const teamDataMap = new Map<number, TeamData>(teams.map(t => [t.id, t]));

    finishedGameweeks.forEach((gameweek: number) => {
      let highestNetPointsThisGameweek = -Infinity;
      let potentialWinnersData: { id: number; points: number; net_points: number }[] = [];

      teams.forEach((team) => {
        const history = teamHistories.get(team.id);
        if (!history) return;
        const gameweekData = history.current.find((gw) => gw.event === gameweek);
        if (!gameweekData) return;

        const points = gameweekData.points;
        const net_points = gameweekData.points - (gameweekData.event_transfers_cost || 0);
        
        const currentTeamStats = teamStatsMap.get(team.id);
        if (currentTeamStats) {
          currentTeamStats.totalPoints += points;
          currentTeamStats.benchPoints += gameweekData.points_on_bench || 0;
          if (points > currentTeamStats.bestGameweek.points) {
            currentTeamStats.bestGameweek = { gameweek, points };
          } else if (points === currentTeamStats.bestGameweek.points && gameweek < currentTeamStats.bestGameweek.gameweek) {
            currentTeamStats.bestGameweek = { gameweek, points };
          }
        }

        if (net_points > highestNetPointsThisGameweek) {
          highestNetPointsThisGameweek = net_points;
          potentialWinnersData = [{ id: team.id, points, net_points }];
        } else if (net_points === highestNetPointsThisGameweek) {
          potentialWinnersData.push({ id: team.id, points, net_points });
        }
      });

      // Original gameweekWinnerMap logic (for manager chip context, uses first winner in case of tie)
      if (potentialWinnersData.length > 0) {
        const firstPotWinner = potentialWinnersData[0];
        const ts = teamStatsMap.get(firstPotWinner.id);
        if (ts) {
            gameweekWinnerMap.set(gameweek, {
                id: ts.id,
                managerName: ts.managerName,
                points: firstPotWinner.points 
            });
        }
      }
      
      // New logic: Resolve ties and award a single win
      if (potentialWinnersData.length > 0) {
        let actualWinnerId: number;
        let winnerDataForGameweek: { id: number; points: number; net_points: number };

        if (potentialWinnersData.length === 1) {
          actualWinnerId = potentialWinnersData[0].id;
        } else {
          // Pass teamDataMap for names
          const resolutionResult = resolveTieForGameweek(gameweek, potentialWinnersData, teamHistories, finishedGameweeks, teamDataMap);
          actualWinnerId = resolutionResult.winnerId;
          if (resolutionResult.detail) {
            tieBreakDetailsList.push(resolutionResult.detail); // Store the detail
          }
        }
        
        // Find the original points data for the actual winner for this gameweek
        const foundWinnerData = potentialWinnersData.find(w => w.id === actualWinnerId);
        if (foundWinnerData) {
            winnerDataForGameweek = foundWinnerData;
        } else {
            // Should not happen if resolveTieForGameweek returns an ID from the initial list
            // As a robust fallback, use the first potential winner if something went wrong.
            // console.error(`Error: Winner ID ${actualWinnerId} from tie-resolution not in potential winners for GW ${gameweek}.`);
            winnerDataForGameweek = potentialWinnersData[0]; 
            actualWinnerId = potentialWinnersData[0].id; // Ensure consistency
        }

        const teamStats = teamStatsMap.get(actualWinnerId);
        if (teamStats) {
          teamStats.wins++;
          teamStats.gameweekWins.push({
            gameweek,
            teamId: teamStats.id,
            teamName: teamStats.name,
            managerName: teamStats.managerName,
            points: winnerDataForGameweek.points,      // Points from the original tied gameweek
            net_points: winnerDataForGameweek.net_points // Net points from the original tied gameweek
          });
        }
      }
    });

    // --- Manager Chip Usage Logic ---
    const assistantManagerMap = new Map<number, AssistantManagerStats>();
    teams.forEach((team) => {
      assistantManagerMap.set(team.id, {
        id: team.id,
        name: team.name,
        managerName: team.managerName,
        hasUsed: false,
        totalPoints: 0,
        startGameweek: null,
        selections: [],
      });
    });

    // Only check gameweeks 23 and up for Manager chip
    const relevantGameweeks = events
      .filter((e: { id: number }) => e.id >= 23)
      .map((e: { id: number }) => e.id);
    await Promise.all(
      teams.map(async (team) => {
        // Find the first gameweek where the manager chip was activated
        let startGW: number | null = null;
        for (const gw of relevantGameweeks) {
          const resp = await fetch(
            fplApiRoutes.teamDetails(team.id.toString(), gw.toString()),
            { headers }
          );
          if (!resp.ok) continue;
          const data = await resp.json();
          if (data.active_chip === "manager") {
            startGW = gw;
            break;
          }
        }
        if (!startGW) return;

        const stats = assistantManagerMap.get(team.id);
        if (!stats) return;
        stats.hasUsed = true;
        stats.startGameweek = startGW;
        const chipWeeks = [startGW, startGW + 1, startGW + 2];
        const selections = await Promise.all(
          chipWeeks.map(async (gw) => {
            const resp = await fetch(
              fplApiRoutes.teamDetails(team.id.toString(), gw.toString()),
              { headers }
            );
            if (!resp.ok) {
              return { gameweek: gw, selectedManager: 'Unknown', points: 0 };
            }
            const data = await resp.json();
            // The 16th pick (position 16) is the real-world manager
            const managerPick = data.picks.find((p: { element: number; position: number }) => p.position === 16);
            let selectedManager = 'Unknown Manager';
            let managerPoints = 0;
            if (managerPick) {
              // Lookup the manager card's own points for this GW
              selectedManager = await getPlayerName(managerPick.element, 'full_name');
              const summaryResp = await fetch(`https://fantasy.premierleague.com/api/element-summary/${managerPick.element}/`, { headers });
              if (summaryResp.ok) {
                const summary = await summaryResp.json();
                // Sum all fixtures in the same round to account for double gameweeks
                const roundPoints = summary.history
                  .filter((h: { round: number; total_points: number }) => h.round === gw)
                  .reduce((sum: number, h: { total_points: number }) => sum + h.total_points, 0);
                managerPoints = roundPoints;
              }
            }
            return { gameweek: gw, selectedManager, points: managerPoints };
          })
        );
        stats.selections = selections;
        stats.totalPoints = selections.reduce((sum, sel) => sum + sel.points, 0);
      })
    );
    const assistantManagerStats = Array.from(assistantManagerMap.values()).sort((a, b) =>
      a.hasUsed === b.hasUsed ? b.totalPoints - a.totalPoints : (b.hasUsed ? -1 : 1)
    );

    // Convert maps to arrays and sort
    const stats = Array.from(teamStatsMap.values()).sort(
      (a, b) => b.wins - a.wins || b.totalPoints - a.totalPoints
    );

    const chipStats = Array.from(chipUsageMap.values()).sort(
      (a, b) => b.totalChipsUsed - a.totalChipsUsed
    );

    const benchStats = Array.from(teamStatsMap.values()).sort(
      (a, b) => b.benchPoints - a.benchPoints
    );

    return {
      stats,
      chipStats,
      benchStats,
      assistantManagerStats,
      finishedGameweeks: finishedGameweeks.length,
      tieBreakDetails: tieBreakDetailsList, // ADDED tieBreakDetailsList
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      stats: [],
      chipStats: [],
      benchStats: [],
      assistantManagerStats: [],
      finishedGameweeks: 0,
      tieBreakDetails: [], // Ensure it's present in error case too
      error: (error as Error).message,
    };
  }
}


export interface TeamData {
  id: number;
  name: string;
  managerName: string;
}

export interface TeamHistory {
  current: Array<{
    event: number;
    points: number;
    points_on_bench: number;
    event_transfers_cost: number;
  }>;
  chips: Array<{
    name: string;
    event: number;
  }>;
}

export interface StandingsResult {
  entry: number;
  entry_name: string;
  player_name: string;
  event_total: number;
  total: number;
  rank: number;
  last_rank: number;
}

export interface TeamStats {
  id: number;
  name: string;
  managerName: string;
  wins: number;
  totalPoints: number;
  benchPoints: number;
  bestGameweek: {
    gameweek: number;
    points: number;
  };
  gameweekWins: Array<{
    gameweek: number;
    teamId: number;
    teamName: string;
    managerName: string;
    points: number;
    net_points: number;
  }>;
}

export interface ChipUsage {
  id: number;
  name: string;
  managerName: string;
  totalChipsUsed: number;
  chips: Array<{
    name: string;
    gameweek: number;
  }>;
}

export interface AssistantManagerStats {
  id: number;
  name: string;
  managerName: string;
  hasUsed: boolean;
  totalPoints: number;
  startGameweek: number | null;
  selections: { gameweek: number; selectedManager: string; points: number }[];
}