import { fplApiRoutes } from "@/lib/routes";
import { getPlayerName } from "@/services/get-player-name";

export async function getStatsData() {
  try {
    // Fetch league standings and bootstrap data
    const [leagueData, bootstrapData] = await Promise.all([
      fetch(fplApiRoutes.standings(process.env.FPL_LEAGUE_ID || "")),
      fetch(fplApiRoutes.bootstrap),
    ]);

    if (!leagueData.ok || !bootstrapData.ok) {
      throw new Error("Failed to fetch data");
    }

    const { standings } = await leagueData.json();
    const { events } = await bootstrapData.json();

    // Get finished gameweeks
    const finishedGameweeks = events
      .filter((event: { finished: boolean }) => event.finished)
      .map((event: { id: number }) => event.id);

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
          fplApiRoutes.teamHistory(team.id.toString())
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
          points: 0,
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

    // Process each finished gameweek and record the top performer for manager chip use
    const gameweekWinnerMap = new Map<number, { id: number; managerName: string; points: number }>();
    finishedGameweeks.forEach((gameweek: number) => {
      let highestNetPoints = -Infinity;  
      let winners: { id: number; points: number; net_points: number }[] = [];

      // Find highest net points for the gameweek
      teams.forEach((team) => {
        const history = teamHistories.get(team.id);
        if (!history) return;

        const gameweekData = history.current.find(
          (gw) => gw.event === gameweek
        );
        if (!gameweekData) return;

        const points = gameweekData.points;
        const net_points = gameweekData.points - (gameweekData.event_transfers_cost || 0);
        const teamStats = teamStatsMap.get(team.id);
        if (!teamStats) return;

        // Update team's total points and bench points
        teamStats.totalPoints += points;
        teamStats.benchPoints += gameweekData.points_on_bench || 0;

        // Track highest net points and winners
        if (net_points > highestNetPoints) {
          highestNetPoints = net_points;
          winners = [{ id: team.id, points, net_points }];
        } else if (net_points === highestNetPoints) {
          winners.push({ id: team.id, points, net_points });
        }
      });

      // Record the top winner for this gameweek
      if (winners.length > 0) {
        const firstWinner = winners[0];
        const ts = teamStatsMap.get(firstWinner.id);
        if (ts) {
          gameweekWinnerMap.set(gameweek, {
            id: ts.id,
            managerName: ts.managerName,
            points: firstWinner.points
          });
        }
      }
      // Award wins to all teams that tied for highest net points
      winners.forEach((winner) => {
        const teamStats = teamStatsMap.get(winner.id);
        if (!teamStats) return;

        teamStats.wins++;
        teamStats.gameweekWins.push({
          gameweek,
          teamId: teamStats.id,
          teamName: teamStats.name,
          managerName: teamStats.managerName,
          points: winner.points,
          net_points: winner.net_points
        });
      });
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
          const resp = await fetch(fplApiRoutes.teamDetails(team.id.toString(), gw.toString()));
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
            const resp = await fetch(fplApiRoutes.teamDetails(team.id.toString(), gw.toString()));
            if (!resp.ok) {
              return { gameweek: gw, selectedManager: 'Unknown', points: 0 };
            }
            const data = await resp.json();
            const entryHistory = data.entry_history;
            // The 16th pick (position 16) is the real-world manager
            const managerPick = data.picks.find((p: { element: number; position: number }) => p.position === 16);
            let selectedManager = 'Unknown Manager';
            if (managerPick) {
              selectedManager = await getPlayerName(managerPick.element, 'full_name');
            }
            const points = entryHistory?.points ?? 0;
            return { gameweek: gw, selectedManager, points };
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
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      stats: [],
      chipStats: [],
      benchStats: [],
      assistantManagerStats: [],
      finishedGameweeks: 0,
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