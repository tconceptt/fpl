import { chipLabel, chipStatus, chipWindowsFromBootstrap, type ChipStatusResult, type ChipWindow } from "@/lib/chips";
import { cached } from "@/lib/fpl/cache";
import { ttlFor } from "@/lib/fpl/ttl";
import * as client from "@/lib/fpl/client";
import { getLeagueSnapshot } from "@/services/league";
import { cache } from 'react';

// NEW INTERFACE for Tie Break Details
export interface TieBreakDetail {
  gameweek: number;
  initiallyTiedTeams: Array<{ id: number; name: string; managerName: string; score: number }>;
  winningTeam: { id: number; name: string; managerName: string; };
  resolutionMethod: string; // e.g., "Won in GW X+1"
  resolutionGameweek?: number; // The GW that broke the tie
  details: string; // Narrative description, e.g. "Player A (100pts) vs Player B (90pts) in GW Y"
}

// NEW INTERFACE for Unresolved Ties
export interface UnresolvedTie {
  gameweeks: number[]; // Can be multiple consecutive GWs with same teams tied
  tiedTeams: Array<{ id: number; name: string; managerName: string; netPoints: number }>;
  // Set when a tie persisted through every finished subsequent gameweek, as
  // opposed to simply waiting on the next gameweek to finish.
  resolutionMethod?: string;
}

/**
 * Net points (gross minus transfer cost) for one team in one gameweek, or
 * null if that team has no history for it.
 */
export function getNetPointsForTeamInGameweek(
  teamId: number,
  gameweek: number,
  histories: Map<number, TeamHistory>
): number | null {
  const history = histories.get(teamId);
  const gwData = history?.current.find((g) => g.event === gameweek);
  if (gwData) {
    return gwData.points - (gwData.event_transfers_cost || 0);
  }
  return null; // Team might not have data for this gameweek
}

/**
 * Resolve a gameweek tie by the tied managers' scores in the following
 * finished gameweeks, until one is higher.
 *
 * If the tie survives every finished subsequent gameweek, `winnerId` is
 * null and the caller should record it as an unresolved tie rather than
 * picking a winner.
 */
export function resolveTieForGameweek(
  tiedGameweek: number,
  initialPotentialWinners: { id: number; points: number; net_points: number }[],
  histories: Map<number, TeamHistory>,
  allFinishedGWs: number[],
  teamDataMap: Map<number, TeamData>, // Pass team data for names
  gameweekHighestScorers: Map<number, { id: number; points: number; net_points: number }[]> // To check if subsequent GWs also tied
): { winnerId: number | null; detail: TieBreakDetail | null; tiedGameweeks: number[] } {
  
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

  // The tie survived every finished subsequent gameweek. Leave it
  // unresolved rather than picking a winner at random — the caller
  // records this as an unresolved tie, same as a tie still waiting on
  // the next gameweek to finish.
  return { winnerId: null, detail: null, tiedGameweeks: consecutiveTiedGameweeks };
}

// Use React cache for request deduplication
export const getStatsData = cache(async (selectedGameweek?: number) => {
  // The snapshot already fetched bootstrap, standings, and every manager's
  // full-season history and chips — reuse it rather than fanning out again.
  // Fetching bootstrap here too is cheap: it hits the same request-scoped
  // cache memo as the snapshot's own bootstrap read.
  const [snapshot, bootstrap] = await Promise.all([
    getLeagueSnapshot(selectedGameweek),
    cached("bootstrap", ttlFor("bootstrap", "quiet"), () => client.bootstrap()),
  ]);

  const currentGameweek = snapshot.currentGameweek;
  const chips = bootstrap.chips;

  // Get finished gameweeks, filtered by selectedGameweek if provided.
  // "Finished" here means FPL has checked the data (bonus finalised), not
  // merely that full time has been reached — otherwise wins can be awarded
  // before bonus points are confirmed.
  let finishedGameweeks = bootstrap.events
    .filter((event) => event.data_checked)
    .map((event) => event.id)
    .sort((a, b) => a - b); // Ensure sorted

  // If selectedGameweek is provided, filter to only include gameweeks up to that
  if (selectedGameweek !== undefined) {
    finishedGameweeks = finishedGameweeks.filter((gw: number) => gw <= selectedGameweek);
  }

  // Extract team data
  const teams: TeamData[] = snapshot.managers.map((m) => ({
    id: m.entry,
    name: m.entry_name,
    managerName: m.player_name,
  }));

  // Every manager's full-season history and chips, already fetched by the snapshot.
  const teamHistories = new Map<number, TeamHistory>();
  snapshot.managers.forEach((m) => {
    teamHistories.set(m.entry, { current: m.history, chips: m.chips });
  });

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
        name: chipLabel(chip.name),
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

  // Process each finished gameweek for wins, points, etc.
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

    // Resolve ties and award a single win
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
          // Next gameweek has been played, we can attempt to resolve the tie
          const resolutionResult = resolveTieForGameweek(gameweek, potentialWinnersData, teamHistories, finishedGameweeks, teamDataMap, gameweekHighestScorers);

          // Mark all tied gameweeks as processed either way, so the outer
          // loop doesn't reprocess them as separate ties.
          resolutionResult.tiedGameweeks.forEach(gw => awardedGameweeks.add(gw));

          if (resolutionResult.winnerId !== null) {
            const winnerId = resolutionResult.winnerId;

            if (resolutionResult.detail) {
              tieBreakDetailsList.push(resolutionResult.detail); // Store the detail
            }

            // Award wins for ALL the tied gameweeks to the winner
            const teamStats = teamStatsMap.get(winnerId);
            if (teamStats) {
              resolutionResult.tiedGameweeks.forEach(tiedGW => {
                const tiedGWWinnersData = gameweekHighestScorers.get(tiedGW);
                const tiedGWWinnerData = tiedGWWinnersData?.find(w => w.id === winnerId);

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
          } else {
            // The tie persisted through every finished subsequent
            // gameweek. Record each tied gameweek as unresolved, using
            // that gameweek's own scores rather than the first tied
            // gameweek's.
            resolutionResult.tiedGameweeks.forEach(tiedGW => {
              const tiedGWWinnersData = gameweekHighestScorers.get(tiedGW) || [];
              unresolvedTies.push({
                gameweeks: [tiedGW],
                tiedTeams: tiedGWWinnersData.map(w => {
                  const teamInfo = teamDataMap.get(w.id);
                  return {
                    id: w.id,
                    name: teamInfo?.name || 'Unknown Team',
                    managerName: teamInfo?.managerName || 'Unknown Manager',
                    netPoints: w.net_points
                  };
                }),
                resolutionMethod: "Awaiting next gameweek",
              });
            });
          }

          // Neither branch awards below — a resolved tie already awarded
          // wins above, and an unresolved one awards nothing.
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
            }),
            resolutionMethod: "Awaiting next gameweek",
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

  // Convert maps to arrays and sort. Ties fall back to manager name so
  // reloads never reorder a leaderboard on their own.
  const stats = Array.from(teamStatsMap.values()).sort(
    (a, b) => b.wins - a.wins || b.totalPoints - a.totalPoints || a.managerName.localeCompare(b.managerName)
  );

  // Chip windows for the season (two halves per chip) and, per manager,
  // which of those windows are used, available, or expired.
  const chipWindows: ChipWindow[] = chipWindowsFromBootstrap(chips || []);
  const chipStatusMap = new Map<number, ChipStatusResult[]>();
  teams.forEach((team) => {
    const history = teamHistories.get(team.id);
    const playedChips = (history?.chips || []).map((c) => ({ name: c.name, event: c.event }));
    chipStatusMap.set(team.id, chipStatus(playedChips, chipWindows, currentGameweek));
  });

  chipUsageMap.forEach((chipUsage, teamId) => {
    chipUsage.chipStatuses = chipStatusMap.get(teamId) || [];
  });

  const chipStats = Array.from(chipUsageMap.values()).sort(
    (a, b) => b.totalChipsUsed - a.totalChipsUsed || a.managerName.localeCompare(b.managerName)
  );

  const benchStats = Array.from(teamStatsMap.values()).sort(
    (a, b) => b.benchPoints - a.benchPoints || a.managerName.localeCompare(b.managerName)
  );

  const hitsStats = Array.from(hitsStatsMap.values()).sort(
    (a, b) => b.totalTransferCost - a.totalTransferCost || a.managerName.localeCompare(b.managerName)
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
    chipWindows,
    finishedGameweeks: finishedGameweeks.length,
    currentGameweek, // Add current active gameweek
    tieBreakDetails: tieBreakDetailsList, // ADDED tieBreakDetailsList
    unresolvedTies: groupedUnresolvedTies, // ADDED groupedUnresolvedTies
  };
});

export type StatsData = Awaited<ReturnType<typeof getStatsData>>;

/**
 * Resolve the `?gameweek=` URL param into stats data with exactly one call
 * to getStatsData in the common case (no param, or a param that's already
 * within range). Out-of-range input still self-corrects, at the cost of a
 * second call — better than silently rendering an empty page.
 */
export async function loadStatsData(
  gameweekParam: string | null
): Promise<{ data: StatsData; validSelectedGameweek: number }> {
  const parsedGameweek = gameweekParam ? parseInt(gameweekParam, 10) : undefined;
  const requestedGameweek =
    parsedGameweek !== undefined && !Number.isNaN(parsedGameweek) && parsedGameweek >= 1
      ? parsedGameweek
      : undefined;

  let data = await getStatsData(requestedGameweek);
  if (requestedGameweek !== undefined && requestedGameweek > data.currentGameweek) {
    data = await getStatsData(data.currentGameweek);
  }

  const validSelectedGameweek =
    requestedGameweek !== undefined && requestedGameweek <= data.currentGameweek
      ? requestedGameweek
      : data.currentGameweek;

  return { data, validSelectedGameweek };
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
  /** Per chip window: used/available/expired for the current half and next. */
  chipStatuses?: ChipStatusResult[];
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