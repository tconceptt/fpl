import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeagueTeam } from "@/lib/fpl";
import { formatPoints } from "@/lib/fpl";
import { ArrowDown, ArrowUp, Flame, Trophy } from "lucide-react";
import { fplApiRoutes } from "@/lib/routes";
import { GameweekSelector } from "@/components/gameweek-selector";
import { notFound } from "next/navigation";

interface GameweekTeamData {
  name: string;
  team: string;
  entry: number;
  points: number;
  net_points: number;
  total_points: number;
  chip: string | null;
}

interface GameweekStats {
  currentGameweek: number;
  selectedGameweek: number;
  currentLeader: {
    name: string;
    points: number;
    net_points: number;
    team: string;
    chipUsed: string | null;
  };
  lowestPoints: {
    name: string;
    points: number;
    net_points: number;
    team: string;
  };
  chipsSummary: {
    type: string;
    count: number;
    users: string;
  }[];
  highestRiser: {
    name: string;
    team: string;
    movement: number;
  };
  steepestFaller: {
    name: string;
    team: string;
    movement: number;
  };
}

interface ChipPlay {
  chip_name: string;
  num_played: number;
}

interface TopElementInfo {
  id: number;
  points: number;
}

interface BootstrapEvent {
  id: number;
  name: string;
  deadline_time: string;
  average_entry_score: number;
  finished: boolean;
  data_checked: boolean;
  highest_scoring_entry: number;
  deadline_time_epoch: number;
  deadline_time_game_offset: number;
  highest_score: number;
  is_previous: boolean;
  is_current: boolean;
  is_next: boolean;
  chip_plays: ChipPlay[];
  most_selected: number;
  most_transferred_in: number;
  top_element: number;
  top_element_info: TopElementInfo;
  transfers_made: number;
  most_captained: number;
  most_vice_captained: number;
}

async function getCurrentGameweek(): Promise<number> {
  try {
    const response = await fetch(fplApiRoutes.bootstrap, {
      next: { revalidate: 300 },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch bootstrap data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.events.find((event: BootstrapEvent) => event.is_current).id;
  } catch (error) {
    console.error("Error fetching current gameweek:", error);
    throw error;
  }
}

async function getGameweekStats(selectedGameweek: number): Promise<GameweekStats> {
  try {
    const leagueId = process.env.FPL_LEAGUE_ID;
    if (!leagueId) {
      throw new Error("FPL_LEAGUE_ID environment variable is not set");
    }

    // First get the league standings to get all team IDs
    const leagueResponse = await fetch(fplApiRoutes.standings(leagueId), {
      next: { revalidate: 300 },
    });
    
    if (!leagueResponse.ok) {
      throw new Error(`Failed to fetch league data: ${leagueResponse.status} ${leagueResponse.statusText}`);
    }

    const leagueData = await leagueResponse.json();
    const standings = leagueData.standings.results;

    // Fetch bootstrap data for current gameweek info
    const bootstrapResponse = await fetch(fplApiRoutes.bootstrap, {
      next: { revalidate: 300 },
    });
    
    if (!bootstrapResponse.ok) {
      throw new Error(`Failed to fetch bootstrap data: ${bootstrapResponse.status} ${bootstrapResponse.statusText}`);
    }

    const bootstrapData = await bootstrapResponse.json();

    // Fetch historical data for all managers
    const managerHistoryPromises = standings.map((team: LeagueTeam) =>
      fetch(fplApiRoutes.teamHistory(team.entry.toString()), {
        next: { revalidate: 300 },
      })
        .then((res) => {
          if (!res.ok)
            throw new Error(
              `Failed to fetch history for manager ${team.entry}`
            );
          return res.json();
        })
        .catch((error) => {
          console.error(error);
          return null;
        })
    );

    const managersHistory = await Promise.all(managerHistoryPromises);

    // Process historical data for the selected gameweek
    const gameweekData = standings.map((team: LeagueTeam, index: number) => {
      const history = managersHistory[index];
      if (!history) return null;

      const gameweekHistory = history.current.find(
        (gw: { event: number; points: number; total_points: number; event_transfers_cost: number }) => gw.event === selectedGameweek
      );

      if (!gameweekHistory) return null;

      return {
        name: team.player_name,
        team: team.entry_name,
        entry: team.entry,
        points: gameweekHistory.points,
        net_points: gameweekHistory.points - (gameweekHistory.event_transfers_cost || 0),
        total_points: gameweekHistory.total_points,
        chip: history.chips.find(
          (chip: { event: number }) => chip.event === selectedGameweek
        )?.name || null,
      };
    }).filter(Boolean);

    // Sort by total points to get current ranks
    const sortedByPoints = [...gameweekData]
      .sort((a, b) => b.total_points - a.total_points)
      .map((team, index) => ({
        ...team,
        currentLeagueRank: index + 1
      }));

    // If not gameweek 1, get previous gameweek data for rank movement
    let previousGameweekRanks = new Map();
    if (selectedGameweek > 1) {
      const previousGameweekData = standings.map((team: LeagueTeam, index: number) => {
        const history = managersHistory[index];
        if (!history) return null;

        const previousGameweekHistory = history.current.find(
          (gw: { event: number; total_points: number }) => gw.event === selectedGameweek - 1
        );

        if (!previousGameweekHistory) return null;

        return {
          entry: team.entry,
          total_points: previousGameweekHistory.total_points,
        };
      }).filter(Boolean);

      // Sort by total points to get previous ranks
      const sortedPreviousGameweek = [...previousGameweekData]
        .sort((a, b) => b.total_points - a.total_points);

      // Create map of entry to previous rank
      previousGameweekRanks = new Map(
        sortedPreviousGameweek.map((team, index) => [team.entry, index + 1])
      );
    }

    // Calculate rank movements and find highest riser and steepest faller
    const teamsWithMovement = sortedByPoints.map(team => {
      const previousRank = previousGameweekRanks.get(team.entry) || team.currentLeagueRank;
      const movement = previousRank - team.currentLeagueRank;
      return {
        name: team.name,
        team: team.team,
        movement
      };
    });

    const highestRiser = [...teamsWithMovement].sort((a, b) => b.movement - a.movement)[0];
    const steepestFaller = [...teamsWithMovement].sort((a, b) => a.movement - b.movement)[0];

    // Get current leader and struggler based on net points
    const sortedByNetPoints = [...gameweekData].sort((a, b) => b.net_points - a.net_points);
    const currentLeader = sortedByNetPoints[0];
    const lowestPoints = sortedByNetPoints[sortedByNetPoints.length - 1];

    // Count chips used in selected gameweek
    const chipCounts = {
      wildcard: 0,
      "3xc": 0,
      bboost: 0,
      freehit: 0,
    };

    const chipUsers = {
      wildcard: [] as string[],
      "3xc": [] as string[],
      bboost: [] as string[],
      freehit: [] as string[],
    };

    gameweekData.forEach((team: GameweekTeamData) => {
      if (team.chip) {
        const chipType = team.chip.toLowerCase();
        switch (chipType) {
          case "wildcard":
            chipCounts.wildcard++;
            chipUsers.wildcard.push(team.name);
            break;
          case "3xc":
            chipCounts["3xc"]++;
            chipUsers["3xc"].push(team.name);
            break;
          case "bboost":
            chipCounts.bboost++;
            chipUsers.bboost.push(team.name);
            break;
          case "freehit":
            chipCounts.freehit++;
            chipUsers.freehit.push(team.name);
            break;
        }
      }
    });

    const chipsSummary = [
      {
        type: "Wildcard",
        count: chipCounts.wildcard,
        users: chipUsers.wildcard.join(", "),
      },
      {
        type: "Triple Captain",
        count: chipCounts["3xc"],
        users: chipUsers["3xc"].join(", "),
      },
      {
        type: "Bench Boost",
        count: chipCounts.bboost,
        users: chipUsers.bboost.join(", "),
      },
      {
        type: "Free Hit",
        count: chipCounts.freehit,
        users: chipUsers.freehit.join(", "),
      },
    ];

    return {
      currentGameweek: bootstrapData.events.find((e: BootstrapEvent) => e.is_current).id,
      selectedGameweek,
      currentLeader: {
        name: currentLeader.name,
        team: currentLeader.team,
        points: currentLeader.points,
        net_points: currentLeader.net_points,
        chipUsed: currentLeader.chip,
      },
      lowestPoints: {
        name: lowestPoints.name,
        team: lowestPoints.team,
        points: lowestPoints.points,
        net_points: lowestPoints.net_points,
      },
      chipsSummary,
      highestRiser,
      steepestFaller,
    };
  } catch (error) {
    console.error("Error in getGameweekStats:", error);
    throw new Error("Failed to fetch gameweek stats");
  }
}

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function GameweekPage({ searchParams }: PageProps) {
  // First, get the current gameweek
  const currentGameweek = await getCurrentGameweek();
  
  // Then, determine the selected gameweek
  const requestedGameweek = searchParams.gameweek ? parseInt(searchParams.gameweek as string) : currentGameweek;
  
  // Validate the requested gameweek
  if (requestedGameweek < 1 || requestedGameweek > currentGameweek) {
    notFound();
  }

  const stats = await getGameweekStats(requestedGameweek);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">
              Gameweek {stats.selectedGameweek} Stats
            </h1>
            <GameweekSelector 
              currentGameweek={currentGameweek}
              selectedGameweek={requestedGameweek}
              className="w-[180px]"
            />
          </div>
          <p className="text-lg text-white/60">
            {stats.selectedGameweek === stats.currentGameweek 
              ? "Live updates and insights"
              : "Historical gameweek data"
            }
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Current Gameweek Leader
              </CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 text-2xl">
                  🔥
                </div>
                <div>
                  <div className="font-bold text-lg">
                    {stats.currentLeader.team}
                  </div>
                  <div className="text-white/60">
                    {stats.currentLeader.name}
                  </div>
                  <div className="text-2xl font-bold text-orange-500">
                    {formatPoints(stats.currentLeader.net_points)} pts
                    {stats.currentLeader.net_points !== stats.currentLeader.points && (
                      <span className="ml-2 text-sm text-white/60">
                        ({formatPoints(stats.currentLeader.points)} raw)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Gameweek Struggler
              </CardTitle>
              <Trophy className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-2xl">
                  💩
                </div>
                <div>
                  <div className="font-bold text-lg">
                    {stats.lowestPoints.team}
                  </div>
                  <div className="text-white/60">{stats.lowestPoints.name}</div>
                  <div className="text-2xl font-bold text-red-500">
                    {formatPoints(stats.lowestPoints.net_points)} pts
                    {stats.lowestPoints.net_points !== stats.lowestPoints.points && (
                      <span className="ml-2 text-sm text-white/60">
                        ({formatPoints(stats.lowestPoints.points)} raw)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500 to-red-600" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Highest Riser
              </CardTitle>
              <ArrowUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-2xl">
                  📈
                </div>
                <div>
                  <div className="font-bold text-lg">
                    {stats.highestRiser.team}
                  </div>
                  <div className="text-white/60">{stats.highestRiser.name}</div>
                  <div className="text-2xl font-bold text-emerald-500">
                    +{stats.highestRiser.movement} positions
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Steepest Faller
              </CardTitle>
              <ArrowDown className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-2xl">
                  📉
                </div>
                <div>
                  <div className="font-bold text-lg">
                    {stats.steepestFaller.team}
                  </div>
                  <div className="text-white/60">
                    {stats.steepestFaller.name}
                  </div>
                  <div className="text-2xl font-bold text-blue-500">
                    {stats.steepestFaller.movement} positions
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Chip Usage This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.chipsSummary.map((chip) => (
                <div
                  key={chip.type}
                  className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg"
                >
                  <div className="text-2xl mb-2">
                    {chip.type === "Wildcard"
                      ? "🃏"
                      : chip.type === "Triple Captain"
                      ? "👑"
                      : chip.type === "Bench Boost"
                      ? "💪"
                      : "🔄"}
                  </div>
                  <div className="text-sm font-medium">{chip.type}</div>
                  <div className="text-2xl font-bold">{chip.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
