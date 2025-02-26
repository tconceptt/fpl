import { GameweekSelector } from "@/components/gameweek-selector";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeagueTeam } from "@/lib/fpl";
import { formatPoints } from "@/lib/fpl";
import { ArrowDown, ArrowUp, Flame, Star, Trophy } from "lucide-react";
import { fplApiRoutes } from "@/lib/routes";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import { getPlayerName } from "@/services/get-player-name";
import { calculateLivePoints } from "@/services/live-points-calculator";

interface GameweekTeamData {
  name: string;
  team: string;
  entry: number;
  points: number;
  net_points: number;
  total_points: number;
  chip: string | null;
  captain?: number;
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
  mostCaptained?: {
    player: string;
    count: number;
    percentage: number;
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
    const currentGameweek = bootstrapData.events.find((e: BootstrapEvent) => e.is_current).id;
    const isCurrentGameweek = selectedGameweek === currentGameweek;

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

    // Fetch team details to get captain information
    const teamDetailsPromises = standings.map((team: LeagueTeam) =>
      fetch(fplApiRoutes.teamDetails(team.entry.toString(), selectedGameweek.toString()), {
        next: { revalidate: 30 },
      })
        .then((res) => {
          if (!res.ok)
            throw new Error(
              `Failed to fetch team details for manager ${team.entry}`
            );
          return res.json();
        })
        .catch((error) => {
          console.error(error);
          return null;
        })
    );

    const teamDetails = await Promise.all(teamDetailsPromises);

    // Fetch live points if it's the current gameweek
    const livePointsMap = new Map<number, number>();
    const transferCostMap = new Map<number, number>();
    
    if (isCurrentGameweek) {
      const livePointsPromises = standings.map((team: LeagueTeam) =>
        calculateLivePoints(team.entry.toString(), selectedGameweek.toString())
          .catch((error) => {
            console.error(error);
            return null;
          })
      );

      const livePointsResults = await Promise.all(livePointsPromises);
      
      livePointsResults.forEach((result, index) => {
        if (result) {
          livePointsMap.set(standings[index].entry, result.totalPoints);
          transferCostMap.set(standings[index].entry, result.transferCost || 0);
        }
      });
    }

    // Process historical data for the selected gameweek
    const gameweekData = standings.map((team: LeagueTeam, index: number) => {
      const history = managersHistory[index];
      if (!history) return null;

      const gameweekHistory = history.current.find(
        (gw: { event: number; points: number; total_points: number; event_transfers_cost: number }) => gw.event === selectedGameweek
      );

      if (!gameweekHistory) return null;

      // Get captain information
      const teamDetail = teamDetails[index];
      let captainId = null;
      if (teamDetail && teamDetail.picks) {
        const captain = teamDetail.picks.find((pick: { is_captain: boolean }) => pick.is_captain);
        if (captain) {
          captainId = captain.element;
        }
      }

      // Use live points if available for current gameweek
      const points = isCurrentGameweek
        ? (livePointsMap.get(team.entry) || gameweekHistory.points)
        : gameweekHistory.points;
      
      const transferCost = isCurrentGameweek
        ? (transferCostMap.get(team.entry) || gameweekHistory.event_transfers_cost || 0)
        : (gameweekHistory.event_transfers_cost || 0);

      return {
        name: team.player_name,
        team: team.entry_name,
        entry: team.entry,
        points: points,
        net_points: points - transferCost,
        total_points: gameweekHistory.total_points,
        chip: history.chips.find(
          (chip: { event: number }) => chip.event === selectedGameweek
        )?.name || null,
        captain: captainId,
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

    // Find most captained player
    const captainCounts = new Map<number, number>();
    let mostCaptainedInfo = undefined;
    
    // Count captains
    gameweekData.forEach((team: GameweekTeamData) => {
      if (team.captain) {
        const count = captainCounts.get(team.captain) || 0;
        captainCounts.set(team.captain, count + 1);
      }
    });
    
    // Find the most captained player
    if (captainCounts.size > 0) {
      let mostCaptainedId = 0;
      let highestCount = 0;
      
      captainCounts.forEach((count, playerId) => {
        if (count > highestCount) {
          highestCount = count;
          mostCaptainedId = playerId;
        }
      });
      
      if (mostCaptainedId > 0) {
        const playerName = await getPlayerName(mostCaptainedId, 'full_name');
        mostCaptainedInfo = {
          player: playerName,
          count: highestCount,
          percentage: Math.round((highestCount / gameweekData.length) * 100)
        };
      }
    }

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
      mostCaptained: mostCaptainedInfo,
    };
  } catch (error) {
    console.error("Error in getGameweekStats:", error);
    throw new Error("Failed to fetch gameweek stats");
  }
}


// Add interface for GameweekCard props
interface GameweekCardProps {
  title: string;
  icon: ReactNode;
  emoji: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  teamName: string;
  playerName: string;
  points?: number;
  rawPoints?: number;
  movement?: number;
  textColor: string;
  prefix?: string;
  suffix?: string;
}

export default async function GameweekPage({ searchParams }: PageProps) {
  // First, get the current gameweek
  const gameweek = await getUrlParam("gameweek");
  const currentGameweek = await getCurrentGameweek();

  // Then, determine the selected gameweek
  const requestedGameweek = gameweek ? parseInt(gameweek as string) : currentGameweek;
  
  // Validate the requested gameweek
  if (requestedGameweek < 1 || requestedGameweek > currentGameweek) {
    notFound();
  }

  const stats = await getGameweekStats(requestedGameweek);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={`Gameweek ${stats.selectedGameweek} Stats`}
          description={
            stats.selectedGameweek === stats.currentGameweek 
              ? "Live updates and insights"
              : "Historical gameweek data"
          }
          currentGameweek={currentGameweek}
          selectedGameweek={requestedGameweek}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <GameweekCard
            title="Current Gameweek Leader"
            icon={<Flame className="h-4 w-4 text-orange-500" />}
            emoji="🔥"
            bgColor="bg-orange-500/10"
            gradientFrom="from-orange-500"
            gradientTo="to-orange-600"
            teamName={stats.currentLeader.team}
            playerName={stats.currentLeader.name}
            points={stats.currentLeader.net_points}
            rawPoints={stats.currentLeader.points}
            textColor="text-orange-500"
          />

          <GameweekCard
            title="Gameweek Struggler"
            icon={<Trophy className="h-4 w-4 text-red-500" />}
            emoji="💩"
            bgColor="bg-red-500/10"
            gradientFrom="from-red-500"
            gradientTo="to-red-600"
            teamName={stats.lowestPoints.team}
            playerName={stats.lowestPoints.name}
            points={stats.lowestPoints.net_points}
            rawPoints={stats.lowestPoints.points}
            textColor="text-red-500"
          />

          {stats.mostCaptained && (
            <GameweekCard
              title="Most Captained Player"
              icon={<Star className="h-4 w-4 text-yellow-500" />}
              emoji="👑"
              bgColor="bg-yellow-500/10"
              gradientFrom="from-yellow-500"
              gradientTo="to-yellow-600"
              teamName={stats.mostCaptained.player}
              playerName={`${stats.mostCaptained.count} managers (${stats.mostCaptained.percentage}%)`}
              textColor="text-yellow-500"
              prefix=""
              suffix=""
            />
          )}

          <GameweekCard
            title="Highest Riser"
            icon={<ArrowUp className="h-4 w-4 text-emerald-500" />}
            emoji="📈"
            bgColor="bg-emerald-500/10"
            gradientFrom="from-emerald-500"
            gradientTo="to-emerald-600"
            teamName={stats.highestRiser.team}
            playerName={stats.highestRiser.name}
            movement={stats.highestRiser.movement}
            textColor="text-emerald-500"
            prefix="+"
            suffix="positions"
          />

          <GameweekCard
            title="Steepest Faller"
            icon={<ArrowDown className="h-4 w-4 text-blue-500" />}
            emoji="📉"
            bgColor="bg-blue-500/10"
            gradientFrom="from-blue-500"
            gradientTo="to-blue-600"
            teamName={stats.steepestFaller.team}
            playerName={stats.steepestFaller.name}
            movement={stats.steepestFaller.movement}
            textColor="text-blue-500"
            suffix="positions"
          />
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
                  className="flex flex-col items-center justify-center rounded-lg bg-white/5 p-4"
                >
                  <div className="mb-2 text-2xl">
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

function GameweekCard({
  title,
  icon,
  emoji,
  bgColor,
  gradientFrom,
  gradientTo,
  teamName,
  playerName,
  points,
  rawPoints,
  movement,
  textColor,
  prefix = "",
  suffix = "pts"
}: GameweekCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${bgColor} text-2xl`}>
            {emoji}
          </div>
          <div>
            <div className="font-bold text-lg">
              {teamName}
            </div>
            <div className="text-white/60">{playerName}</div>
            <div className={`text-2xl font-bold ${textColor}`}>
              {points !== undefined && (
                <>
                  {prefix}{points} {suffix}
                  {rawPoints !== undefined && rawPoints !== points && (
                    <span className="ml-2 text-sm text-white/60">
                      ({formatPoints(rawPoints)} raw)
                    </span>
                  )}
                </>
              )}
              {movement !== undefined && (
                <>
                  {prefix}{movement} {suffix}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${gradientFrom} ${gradientTo}`} />
    </Card>
  );
}
