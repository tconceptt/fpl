import { fplApiRoutes } from "@/lib/routes";

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

    // Process each finished gameweek
    finishedGameweeks.forEach((gameweek: number) => {
      let highestPoints = 0;
      let winners: { id: number; points: number }[] = [];

      // Find highest points for the gameweek
      teams.forEach((team) => {
        const history = teamHistories.get(team.id);
        if (!history) return;

        const gameweekData = history.current.find(
          (gw) => gw.event === gameweek
        );
        if (!gameweekData) return;

        const points = gameweekData.points;
        const teamStats = teamStatsMap.get(team.id);
        if (!teamStats) return;

        // Update team's total points, bench points, and best gameweek
        teamStats.totalPoints += points;
        teamStats.benchPoints += gameweekData.points_on_bench || 0;
        if (points > teamStats.bestGameweek.points) {
          teamStats.bestGameweek = { gameweek, points };
        }

        // Track highest points and winners
        if (points > highestPoints) {
          highestPoints = points;
          winners = [{ id: team.id, points }];
        } else if (points === highestPoints) {
          winners.push({ id: team.id, points });
        }
      });

      // Award wins to all teams that tied for highest points
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
        });
      });
    });

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
      finishedGameweeks: finishedGameweeks.length,
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      stats: [],
      chipStats: [],
      benchStats: [],
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