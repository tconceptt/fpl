import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeagueTeam } from "@/lib/fpl";
import { formatPoints } from "@/lib/fpl";
import { getUrlParam } from "@/lib/helpers";
import { fplApiRoutes } from "@/lib/routes";
import { getPlayerName } from "@/services/get-player-name";
import { calculateLivePoints } from "@/services/live-points-calculator";
import { ArrowDown, ArrowUp, Flame, Star, Trophy } from "lucide-react";
import { notFound } from "next/navigation";
import { ReactNode } from "react";

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

interface GameweekData {
  name: string;
  team: string;
  entry: number;
  points: number;
  net_points: number;
  total_points: number;
  chip: string | null;
  captain?: number;
  currentLeagueRank?: number;
  movement?: number;
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
    const events: BootstrapEvent[] = data.events || [];
    const current = events.find((e) => e.is_current);
    if (current) return current.id;
    const next = events.find((e) => e.is_next);
    if (next) return next.id;
    const lastFinished = [...events].reverse().find((e) => e.finished);
    if (lastFinished) return lastFinished.id;
    return 1;
  } catch (error) {
    console.error("Error fetching current gameweek:", error);
    return 1;
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
    const events: BootstrapEvent[] = bootstrapData.events || [];
    const currentEvent = events.find((e) => e.is_current) || events.find((e) => e.is_next) || [...events].reverse().find((e) => e.finished);
    const currentGameweek = currentEvent ? currentEvent.id : 1;
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

    const hasData = (gameweekData as unknown[]).length > 0;

    // Sort by total points to get current ranks
    const sortedByPoints = hasData
      ? [...(gameweekData as GameweekData[])]
          .sort((a, b) => b.total_points - a.total_points)
          .map((team, index) => ({
            ...team,
            currentLeagueRank: index + 1
          }))
      : [];

    // If not gameweek 1, get previous gameweek data for rank movement
    let previousGameweekRanks = new Map();
    if (hasData && selectedGameweek > 1) {
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
    const teamsWithMovement = hasData
      ? (sortedByPoints as GameweekData[]).map(team => {
          const previousRank = previousGameweekRanks.get(team.entry) || team.currentLeagueRank!;
          const movement = previousRank - team.currentLeagueRank!;
          return {
            name: team.name,
            team: team.team,
            movement
          };
        })
      : [];

    const highestRiser = hasData ? [...teamsWithMovement].sort((a, b) => b.movement - a.movement)[0] : { name: "-", team: "-", movement: 0 };
    const steepestFaller = hasData ? [...teamsWithMovement].sort((a, b) => a.movement - b.movement)[0] : { name: "-", team: "-", movement: 0 };

    // Get current leader and struggler based on net points
    const sortedByNetPoints = hasData ? [...(gameweekData as GameweekData[])].sort((a, b) => b.net_points - a.net_points) : [];
    const currentLeader = hasData ? sortedByNetPoints[0] : { name: "-", team: "-", points: 0, net_points: 0, chip: null };
    const lowestPoints = hasData ? sortedByNetPoints[sortedByNetPoints.length - 1] : { name: "-", team: "-", points: 0, net_points: 0 };

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

    (gameweekData as GameweekData[]).forEach((team: GameweekTeamData) => {
      if (team && team.chip) {
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
    (gameweekData as GameweekData[]).forEach((team: GameweekTeamData) => {
      if (team && team.captain) {
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
      currentGameweek,
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
  teamName: string;
  playerName: string;
  points?: number;
  rawPoints?: number;
  movement?: number;
  colorScheme: "orange" | "red" | "yellow" | "green" | "blue";
  prefix?: string;
  suffix?: string;
  compact?: boolean;
}

export default async function GameweekPage() {
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
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title={`Gameweek ${stats.selectedGameweek} Stats`}
          description={
            stats.selectedGameweek === stats.currentGameweek 
              ? "Live updates and insights"
              : "Historical gameweek data"
          }
          currentGameweek={currentGameweek}
          selectedGameweek={requestedGameweek}
          simpleSelector={true}
        />

        {/* Leader & Struggler - Prominent Display */}
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          <GameweekCard
            title="GW Leader"
            icon={<Flame className="h-4 w-4" />}
            emoji="🔥"
            teamName={stats.currentLeader.team}
            playerName={stats.currentLeader.name}
            points={stats.currentLeader.net_points}
            rawPoints={stats.currentLeader.points}
            colorScheme="orange"
          />

          <GameweekCard
            title="GW Struggler"
            icon={<Trophy className="h-4 w-4" />}
            emoji="💩"
            teamName={stats.lowestPoints.team}
            playerName={stats.lowestPoints.name}
            points={stats.lowestPoints.net_points}
            rawPoints={stats.lowestPoints.points}
            colorScheme="red"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {stats.mostCaptained && (
            <GameweekCard
              title="Most Captained"
              icon={<Star className="h-4 w-4" />}
              emoji="⚡"
              teamName={stats.mostCaptained.player}
              playerName={`${stats.mostCaptained.count} managers (${stats.mostCaptained.percentage}%)`}
              colorScheme="yellow"
              compact
            />
          )}

          <GameweekCard
            title="Highest Riser"
            icon={<ArrowUp className="h-4 w-4" />}
            emoji="📈"
            teamName={stats.highestRiser.team}
            playerName={stats.highestRiser.name}
            movement={stats.highestRiser.movement}
            colorScheme="green"
            prefix="+"
            suffix=" spots"
            compact
          />

          <GameweekCard
            title="Steepest Faller"
            icon={<ArrowDown className="h-4 w-4" />}
            emoji="📉"
            teamName={stats.steepestFaller.team}
            playerName={stats.steepestFaller.name}
            movement={stats.steepestFaller.movement}
            colorScheme="blue"
            suffix=" spots"
            compact
          />
        </div>

        {/* Chip Usage Card */}
        <Card className="border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-gray-800 to-gray-900">
            <CardTitle className="text-base sm:text-lg font-semibold text-white">Chip Usage</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
              {stats.chipsSummary.map((chip) => {
                const chipColors = {
                  "Wildcard": "from-green-500/20 to-green-600/20 border-green-500/30",
                  "Triple Captain": "from-purple-500/20 to-purple-600/20 border-purple-500/30",
                  "Bench Boost": "from-blue-500/20 to-blue-600/20 border-blue-500/30",
                  "Free Hit": "from-amber-500/20 to-amber-600/20 border-amber-500/30"
                };
                
                return (
                  <div
                    key={chip.type}
                    className={`flex flex-col items-center justify-center rounded-lg bg-gradient-to-br ${chipColors[chip.type as keyof typeof chipColors]} border p-4 sm:p-5 transition-all hover:scale-105`}
                  >
                    <div className="mb-2 text-2xl sm:text-3xl">
                      {chip.type === "Wildcard"
                        ? "🃏"
                        : chip.type === "Triple Captain"
                        ? "👑"
                        : chip.type === "Bench Boost"
                        ? "💪"
                        : "🔄"}
                    </div>
                    <div className="text-[10px] sm:text-xs font-medium text-white/70 text-center">{chip.type}</div>
                    <div className="text-2xl sm:text-3xl font-bold text-white mt-1">{chip.count}</div>
                  </div>
                );
              })}
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
  teamName,
  playerName,
  points,
  rawPoints,
  movement,
  colorScheme,
  prefix = "",
  suffix = "pts",
  compact = false
}: GameweekCardProps) {
  const colorSchemes = {
    orange: {
      gradient: "from-orange-500/20 to-orange-600/20",
      border: "border-orange-500/30",
      text: "text-orange-400",
      iconBg: "bg-orange-500/10",
      headerGradient: "from-orange-900/30 to-orange-800/30"
    },
    red: {
      gradient: "from-red-500/20 to-red-600/20",
      border: "border-red-500/30",
      text: "text-red-400",
      iconBg: "bg-red-500/10",
      headerGradient: "from-red-900/30 to-red-800/30"
    },
    yellow: {
      gradient: "from-yellow-500/20 to-yellow-600/20",
      border: "border-yellow-500/30",
      text: "text-yellow-400",
      iconBg: "bg-yellow-500/10",
      headerGradient: "from-yellow-900/30 to-yellow-800/30"
    },
    green: {
      gradient: "from-green-500/20 to-green-600/20",
      border: "border-green-500/30",
      text: "text-green-400",
      iconBg: "bg-green-500/10",
      headerGradient: "from-green-900/30 to-green-800/30"
    },
    blue: {
      gradient: "from-blue-500/20 to-blue-600/20",
      border: "border-blue-500/30",
      text: "text-blue-400",
      iconBg: "bg-blue-500/10",
      headerGradient: "from-blue-900/30 to-blue-800/30"
    }
  };

  const colors = colorSchemes[colorScheme];

  return (
    <Card className={`relative overflow-hidden border ${colors.border} bg-gray-900/50 backdrop-blur-sm transition-all hover:scale-[1.02] shadow-lg`}>
      <CardHeader className={`flex flex-row items-center justify-between pb-2 sm:pb-3 border-b border-white/10 bg-gradient-to-r ${colors.headerGradient} ${compact ? 'pt-3' : 'pt-4'}`}>
        <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
          <span className={colors.iconBg + " p-1.5 rounded-lg"}>
            {icon}
          </span>
          {title}
        </CardTitle>
        <span className="text-2xl sm:text-3xl">{emoji}</span>
      </CardHeader>
      <CardContent className={compact ? "pb-3 pt-3" : "pb-4 pt-4"}>
        <div className={compact ? "space-y-1" : "space-y-2"}>
          <div className={`font-bold ${compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} text-white truncate`}>
            {teamName}
          </div>
          <div className={`text-white/60 ${compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'} truncate`}>
            {playerName}
          </div>
          <div className={`font-bold ${colors.text} ${compact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} mt-1 sm:mt-2`}>
            {points !== undefined && (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span>{prefix}{points}{suffix}</span>
                {rawPoints !== undefined && rawPoints !== points && (
                  <span className="text-[10px] sm:text-xs text-white/50 font-medium">
                    ({formatPoints(rawPoints)} raw)
                  </span>
                )}
              </div>
            )}
            {movement !== undefined && (
              <span>{prefix}{movement}{suffix}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
