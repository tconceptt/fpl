import { fplApiRoutes } from "@/lib/routes";
import { getPlayerName } from "@/services/get-player-name";
import { cache } from 'react';

// NEW INTERFACE for Tie Break Details
export interface TieBreakDetail {
  gameweek: number;
  initiallyTiedTeams: Array<{ id: number; name: string; managerName: string; score: number }>;
  winningTeam: { id: number; name: string; managerName: string; };
  resolutionMethod: string; // e.g., "Won in GW X+1", "Coin Toss"
  resolutionGameweek?: number; // The GW that broke the tie
  details: string; // Narrative description, e.g. "Player A (100pts) vs Player B (90pts) in GW Y"
}

// NEW INTERFACE for Unresolved Ties
export interface UnresolvedTie {
  gameweeks: number[]; // Can be multiple consecutive GWs with same teams tied
  tiedTeams: Array<{ id: number; name: string; managerName: string; netPoints: number }>;
}

// Use React cache for request deduplication
export const getStatsData = cache(async (selectedGameweek?: number) => {
  try {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    };
    // Fetch league standings and bootstrap data with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const [leagueData, bootstrapData] = await Promise.all([
      fetch(fplApiRoutes.standings(process.env.FPL_LEAGUE_ID || ""), {
        headers,
        signal: controller.signal,
      }),
      fetch(fplApiRoutes.bootstrap, { 
        headers,
        signal: controller.signal,
      }),
    ]);

    clearTimeout(timeoutId);

    if (!leagueData.ok) {
      throw new Error(`Failed to fetch league data: ${leagueData.status} ${leagueData.statusText}`);
    }
    
    if (!bootstrapData.ok) {
      throw new Error(`Failed to fetch bootstrap data: ${bootstrapData.status} ${bootstrapData.statusText}`);
    }

    const { standings } = await leagueData.json();
    const { events } = await bootstrapData.json();

    // Get current active gameweek
    const currentEvent = events.find((e: { is_current: boolean }) => e.is_current) 
      || events.find((e: { is_next: boolean }) => e.is_next) 
      || [...events].reverse().find((e: { finished: boolean }) => e.finished);
    const currentGameweek = currentEvent ? currentEvent.id : 1;

    // Get finished gameweeks, filtered by selectedGameweek if provided
    let finishedGameweeks = events
      .filter((event: { finished: boolean }) => event.finished)
      .map((event: { id: number }) => event.id)
      .sort((a: number, b: number) => a - b); // Ensure sorted
    
    // If selectedGameweek is provided, filter to only include gameweeks up to that
    if (selectedGameweek !== undefined) {
      finishedGameweeks = finishedGameweeks.filter((gw: number) => gw <= selectedGameweek);
    }

    // Extract team data
    const teams: TeamData[] = standings.results.map(
      (result: StandingsResult) => ({
        id: result.entry,
        name: result.entry_name,
        managerName: result.player_name,
      })
    );

    // Fetch history for all teams with timeout
    const teamHistories = new Map<number, TeamHistory>();
    await Promise.all(
      teams.map(async (team) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout per team
        
        try {
          const response = await fetch(
            fplApiRoutes.teamHistory(team.id.toString()),
            { 
              headers,
              signal: controller.signal,
            }
          );
          if (response.ok) {
            const data = await response.json();
            teamHistories.set(team.id, {
              current: data.current || [],
              chips: data.chips || [],
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch history for team ${team.id}:`, error);
        } finally {
          clearTimeout(timeoutId);
        }
      })
    );

    // Initialize team stats and chip usage maps
    const teamStatsMap = new Map<number, TeamStats>();
    const chipUsageMap = new Map<number, ChipUsage>();
    const hitsStatsMap = new Map<number, HitsStats>();
    const tieBreakDetailsList: TieBreakDetail[] = []; // To store details of ties
    const unresolvedTies: UnresolvedTie[] = []; // To store unresolved ties

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

      hitsStatsMap.set(team.id, {
        id: team.id,
        name: team.name,
        managerName: team.managerName,
        gameweeksWithHits: 0,
        totalTransferCost: 0,
        totalTransfers: 0,
        gameweekHits: [],
      });
    });

    // Process chips usage
    teams.forEach((team) => {
      const history = teamHistories.get(team.id);
      if (!history) return;

      const chipUsage = chipUsageMap.get(team.id);
      if (!chipUsage) return;

      // Get chips from history and process them, filtering by selectedGameweek if provided
      let validChips = history.chips
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
      
      // Filter chips by selectedGameweek if provided
      if (selectedGameweek !== undefined) {
        validChips = validChips.filter((chip) => chip.gameweek <= selectedGameweek);
      }

      chipUsage.chips = validChips;
      chipUsage.totalChipsUsed = validChips.length;
    });

    // Process hits data
    teams.forEach((team) => {
      const history = teamHistories.get(team.id);
      if (!history) return;

      const hitsStats = hitsStatsMap.get(team.id);
      if (!hitsStats) return;

      let gameweeksWithHits = 0;
      let totalTransferCost = 0;
      let totalTransfers = 0;
      const gameweekHits: Array<{
        gameweek: number;
        transfers: number;
        cost: number;
      }> = [];

      history.current.forEach((gameweek) => {
        // Filter by selectedGameweek if provided
        if (selectedGameweek !== undefined && gameweek.event > selectedGameweek) {
          return;
        }
        
        const cost = gameweek.event_transfers_cost || 0;
        const gameweekTransfers = gameweek.event_transfers || 0;
        
        // Count all transfers made (including free ones)
        totalTransfers += gameweekTransfers;
        
        if (cost > 0) {
          gameweeksWithHits++;
          totalTransferCost += cost;
          gameweekHits.push({
            gameweek: gameweek.event,
            transfers: gameweekTransfers, // Use the actual total transfers made in the gameweek
            cost,
          });
        }
      });

      hitsStats.gameweeksWithHits = gameweeksWithHits;
      hitsStats.totalTransferCost = totalTransferCost;
      hitsStats.totalTransfers = totalTransfers;
      hitsStats.gameweekHits = gameweekHits.sort((a, b) => b.cost - a.cost);
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

    // MODIFIED: resolveTieForGameweek to return details and all tied gameweeks
    const resolveTieForGameweek = (
      tiedGameweek: number,
      initialPotentialWinners: { id: number; points: number; net_points: number }[],
      histories: Map<number, TeamHistory>,
      allFinishedGWs: number[],
      teamDataMap: Map<number, TeamData>, // Pass team data for names
      gameweekHighestScorers: Map<number, { id: number; points: number; net_points: number }[]> // To check if subsequent GWs also tied
    ): { winnerId: number; detail: TieBreakDetail | null; tiedGameweeks: number[] } => { // Return type changed to include tiedGameweeks
      
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
      const consecutiveTiedGameweeks: number[] = [tiedGameweek]; // Track all GWs where these teams were tied

      const subsequentGameweeks = allFinishedGWs.filter(gw => gw > tiedGameweek);

      for (const subsequentGW of subsequentGameweeks) {
        let maxPointsInSubsequentGW = -Infinity;
        const NULL_POINTS_VALUE = -Infinity - 1;
        let winnersInSubsequentGW: { id: number; pointsInSubsequent: number | null}[] = [];
        let teamsWithDataCount = 0;
        const pointsNarrative: string[] = [];

        // Check if this subsequent GW also had these teams as the highest scorers (another tie in the league)
        const subsequentGWHighestScorers = gameweekHighestScorers.get(subsequentGW);
        const tiedTeamIds = new Set(currentTiedEntries.map(e => e.id));
        const subsequentGWHighestScorerIds = new Set(subsequentGWHighestScorers?.map(s => s.id) || []);
        
        // If the same teams are the highest scorers in the subsequent GW, this GW is also part of the tie chain
        const isConsecutiveTie = subsequentGWHighestScorers && 
                                  subsequentGWHighestScorers.length > 1 &&
                                  tiedTeamIds.size === subsequentGWHighestScorerIds.size &&
                                  [...tiedTeamIds].every(id => subsequentGWHighestScorerIds.has(id));

        if (isConsecutiveTie) {
          consecutiveTiedGameweeks.push(subsequentGW);
        }

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
          const gwsText = consecutiveTiedGameweeks.length > 1 
            ? `GWs ${consecutiveTiedGameweeks.join(', ')}` 
            : `GW${tiedGameweek}`;
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
            details: `Won ${gwsText} with ${winnersInSubsequentGW[0].pointsInSubsequent}pts in GW${subsequentGW}. Scores: ${pointsNarrative.join(', ')}.`
          };
          return { winnerId, detail: resolutionDetail, tiedGameweeks: consecutiveTiedGameweeks };
        }
        if (maxPointsInSubsequentGW === NULL_POINTS_VALUE && winnersInSubsequentGW.length === currentTiedEntries.length) continue;
        if (winnersInSubsequentGW.length === 1) { // Tie broken
            const winnerId = winnersInSubsequentGW[0].id;
            const winnerTeamInfo = teamDataMap.get(winnerId);
            const gwsText = consecutiveTiedGameweeks.length > 1 
              ? `GWs ${consecutiveTiedGameweeks.join(', ')}` 
              : `GW${tiedGameweek}`;
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
                details: `Won ${gwsText} with ${winnersInSubsequentGW[0].pointsInSubsequent}pts in GW${subsequentGW}. Scores: ${pointsNarrative.join(', ')}.`
            };
            return { winnerId, detail: resolutionDetail, tiedGameweeks: consecutiveTiedGameweeks };
        }
        if (winnersInSubsequentGW.length > 0 && winnersInSubsequentGW.length < currentTiedEntries.length) {
          currentTiedEntries = winnersInSubsequentGW.map(w => ({id: w.id, originalNetPoints: currentTiedEntries.find(ce => ce.id === w.id)?.originalNetPoints || 0 }));
          if (currentTiedEntries.length === 1) { // Should have been caught by winnersInSubsequentGW.length === 1
            const winnerId = currentTiedEntries[0].id;
            const winnerTeamInfo = teamDataMap.get(winnerId);
            const finalWinnerPoints = getNetPointsForTeamInGameweek(winnerId, subsequentGW, histories);
            const gwsText = consecutiveTiedGameweeks.length > 1 
              ? `GWs ${consecutiveTiedGameweeks.join(', ')}` 
              : `GW${tiedGameweek}`;
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
                details: `Won ${gwsText} with ${finalWinnerPoints}pts in GW${subsequentGW}. Final comparison: ${pointsNarrative.join(', ')}.`
            };
            return { winnerId, detail: resolutionDetail, tiedGameweeks: consecutiveTiedGameweeks };
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
      const gwsText = consecutiveTiedGameweeks.length > 1 
        ? `GWs ${consecutiveTiedGameweeks.join(', ')}` 
        : `GW${tiedGameweek}`;
      resolutionDetail = {
        gameweek: tiedGameweek,
        initiallyTiedTeams: initiallyTiedTeamsForDetail,
        winningTeam: { 
          id: winnerId, 
          name: winnerTeamInfo?.name || 'Unknown', 
          managerName: winnerTeamInfo?.managerName || 'Unknown' 
        },
        resolutionMethod: "Coin Toss",
        details: `Tie persisted through all subsequent gameweeks. Winner of ${gwsText} chosen by virtual coin toss from ${currentTiedEntries.length} teams.`
      };
      return { winnerId, detail: resolutionDetail, tiedGameweeks: consecutiveTiedGameweeks };
    };
    
    // Process each finished gameweek for wins, points, etc.
    // The gameweekWinnerMap is for a different purpose (manager chip) and its original logic is preserved.
    const gameweekWinnerMap = new Map<number, { id: number; managerName: string; points: number }>();
    const teamDataMap = new Map<number, TeamData>(teams.map(t => [t.id, t]));
    
    // First pass: Build a map of highest scorers for each gameweek
    const gameweekHighestScorers = new Map<number, { id: number; points: number; net_points: number }[]>();
    
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

        if (net_points > highestNetPointsThisGameweek) {
          highestNetPointsThisGameweek = net_points;
          potentialWinnersData = [{ id: team.id, points, net_points }];
        } else if (net_points === highestNetPointsThisGameweek) {
          potentialWinnersData.push({ id: team.id, points, net_points });
        }
      });
      
      gameweekHighestScorers.set(gameweek, potentialWinnersData);
    });
    
    // Second pass: Process wins, tracking which gameweeks have been awarded
    const awardedGameweeks = new Set<number>();

    finishedGameweeks.forEach((gameweek: number) => {
      // Skip if this gameweek was already awarded as part of a multi-gameweek tie resolution
      if (awardedGameweeks.has(gameweek)) {
        return;
      }
      
      const potentialWinnersData = gameweekHighestScorers.get(gameweek) || [];
      
      // Update team stats (total points, bench points, best gameweek)
      teams.forEach((team) => {
        const history = teamHistories.get(team.id);
        if (!history) return;
        const gameweekData = history.current.find((gw) => gw.event === gameweek);
        if (!gameweekData) return;

        const points = gameweekData.points;
        
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
        let actualWinnerId: number | null = null;
        let winnerDataForGameweek: { id: number; points: number; net_points: number } | null = null;

        if (potentialWinnersData.length === 1) {
          // Clear winner, no tie
          actualWinnerId = potentialWinnersData[0].id;
          winnerDataForGameweek = potentialWinnersData[0];
        } else {
          // There's a tie - check if next gameweek is finished
          const nextGameweek = gameweek + 1;
          const nextGameweekFinished = finishedGameweeks.includes(nextGameweek);
          
          if (nextGameweekFinished) {
            // Next gameweek has been played, we can resolve the tie
            const resolutionResult = resolveTieForGameweek(gameweek, potentialWinnersData, teamHistories, finishedGameweeks, teamDataMap, gameweekHighestScorers);
            actualWinnerId = resolutionResult.winnerId;
            
            // Mark all tied gameweeks as awarded
            resolutionResult.tiedGameweeks.forEach(gw => awardedGameweeks.add(gw));
            
            if (resolutionResult.detail) {
              tieBreakDetailsList.push(resolutionResult.detail); // Store the detail
            }
            
            // Award wins for ALL the tied gameweeks to the winner
            const teamStats = teamStatsMap.get(actualWinnerId);
            if (teamStats) {
              resolutionResult.tiedGameweeks.forEach(tiedGW => {
                const tiedGWWinnersData = gameweekHighestScorers.get(tiedGW);
                const tiedGWWinnerData = tiedGWWinnersData?.find(w => w.id === actualWinnerId);
                
                if (tiedGWWinnerData) {
                  teamStats.wins++;
                  teamStats.gameweekWins.push({
                    gameweek: tiedGW,
                    teamId: teamStats.id,
                    teamName: teamStats.name,
                    managerName: teamStats.managerName,
                    points: tiedGWWinnerData.points,
                    net_points: tiedGWWinnerData.net_points
                  });
                }
              });
            }
            
            // Set to null so we don't award again below
            actualWinnerId = null;
            winnerDataForGameweek = null;
          } else {
            // Next gameweek hasn't been played yet, don't award win to anyone
            // actualWinnerId remains null, so no win will be recorded
            // Track this as an unresolved tie
            unresolvedTies.push({
              gameweeks: [gameweek],
              tiedTeams: potentialWinnersData.map(w => {
                const teamInfo = teamDataMap.get(w.id);
                return {
                  id: w.id,
                  name: teamInfo?.name || 'Unknown Team',
                  managerName: teamInfo?.managerName || 'Unknown Manager',
                  netPoints: w.net_points
                };
              })
            });
          }
        }

        // Only award the win if we have a winner (no unresolved tie and not already awarded as part of multi-GW resolution)
        if (actualWinnerId !== null && winnerDataForGameweek !== null) {
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
          awardedGameweeks.add(gameweek);
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
        try {
          // Find the first gameweek where the manager chip was activated
          let startGW: number | null = null;
          for (const gw of relevantGameweeks) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
              const resp = await fetch(
                fplApiRoutes.teamDetails(team.id.toString(), gw.toString()),
                { 
                  headers,
                  signal: controller.signal,
                }
              );
              if (!resp.ok) continue;
              const data = await resp.json();
              if (data.active_chip === "manager") {
                startGW = gw;
                break;
              }
            } catch (error) {
              console.warn(`Failed to fetch team details for team ${team.id} GW ${gw}:`, error);
            } finally {
              clearTimeout(timeoutId);
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
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              
              try {
                const resp = await fetch(
                  fplApiRoutes.teamDetails(team.id.toString(), gw.toString()),
                  { 
                    headers,
                    signal: controller.signal,
                  }
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
                  const summaryController = new AbortController();
                  const summaryTimeoutId = setTimeout(() => summaryController.abort(), 5000);
                  
                  try {
                    const summaryResp = await fetch(`https://fantasy.premierleague.com/api/element-summary/${managerPick.element}/`, { 
                      headers,
                      signal: summaryController.signal,
                    });
                    if (summaryResp.ok) {
                      const summary = await summaryResp.json();
                      // Sum all fixtures in the same round to account for double gameweeks
                      const roundPoints = summary.history
                        .filter((h: { round: number; total_points: number }) => h.round === gw)
                        .reduce((sum: number, h: { total_points: number }) => sum + h.total_points, 0);
                      managerPoints = roundPoints;
                    }
                  } catch (error) {
                    console.warn(`Failed to fetch player summary for ${managerPick.element}:`, error);
                  } finally {
                    clearTimeout(summaryTimeoutId);
                  }
                }
                return { gameweek: gw, selectedManager, points: managerPoints };
              } catch (error) {
                console.warn(`Failed to fetch team details for team ${team.id} GW ${gw}:`, error);
                return { gameweek: gw, selectedManager: 'Unknown', points: 0 };
              } finally {
                clearTimeout(timeoutId);
              }
            })
          );
          stats.selections = selections;
          stats.totalPoints = selections.reduce((sum, sel) => sum + sel.points, 0);
        } catch (error) {
          console.warn(`Failed to process assistant manager stats for team ${team.id}:`, error);
        }
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

    const hitsStats = Array.from(hitsStatsMap.values()).sort(
      (a, b) => b.totalTransferCost - a.totalTransferCost
    );

    // Group consecutive unresolved ties with same teams
    const groupedUnresolvedTies: UnresolvedTie[] = [];
    const processedUnresolvedGWs = new Set<number>();
    
    unresolvedTies.forEach(tie => {
      const tieGameweek = tie.gameweeks[0]; // Each unresolved tie starts with one gameweek
      if (processedUnresolvedGWs.has(tieGameweek)) return;
      
      // Find all consecutive gameweeks with the same tied teams
      const consecutiveGWs = [tieGameweek];
      processedUnresolvedGWs.add(tieGameweek);
      
      const tiedTeamIds = new Set(tie.tiedTeams.map(t => t.id));
      let currentGW = tieGameweek;
      
      // Look ahead for consecutive gameweeks with same teams tied
      while (true) {
        const nextGW = currentGW + 1;
        const nextTie = unresolvedTies.find(t => t.gameweeks[0] === nextGW);
        
        if (!nextTie) break;
        
        const nextTiedTeamIds = new Set(nextTie.tiedTeams.map(t => t.id));
        
        // Check if same teams are tied
        if (tiedTeamIds.size === nextTiedTeamIds.size && 
            [...tiedTeamIds].every(id => nextTiedTeamIds.has(id))) {
          consecutiveGWs.push(nextGW);
          processedUnresolvedGWs.add(nextGW);
          currentGW = nextGW;
        } else {
          break;
        }
      }
      
      // Use the latest gameweek's net points for display
      const latestGW = consecutiveGWs[consecutiveGWs.length - 1];
      const latestTie = unresolvedTies.find(t => t.gameweeks[0] === latestGW);
      
      if (latestTie) {
        groupedUnresolvedTies.push({
          gameweeks: consecutiveGWs,
          tiedTeams: latestTie.tiedTeams
        });
      }
    });

    return {
      stats,
      chipStats,
      benchStats,
      hitsStats,
      assistantManagerStats,
      finishedGameweeks: finishedGameweeks.length,
      currentGameweek, // Add current active gameweek
      tieBreakDetails: tieBreakDetailsList, // ADDED tieBreakDetailsList
      unresolvedTies: groupedUnresolvedTies, // ADDED groupedUnresolvedTies
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    
    // Return empty data structure to prevent build failures
    return {
      stats: [],
      chipStats: [],
      benchStats: [],
      hitsStats: [],
      assistantManagerStats: [],
      finishedGameweeks: 0,
      currentGameweek: 1, // Default to 1 on error
      tieBreakDetails: [],
      unresolvedTies: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
});


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
    event_transfers: number;
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

export interface HitsStats {
  id: number;
  name: string;
  managerName: string;
  gameweeksWithHits: number;
  totalTransferCost: number;
  totalTransfers: number;
  gameweekHits: Array<{
    gameweek: number;
    transfers: number;
    cost: number;
  }>;
}