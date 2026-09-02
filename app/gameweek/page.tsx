import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPoints } from "@/lib/fpl";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { chipLabel } from "@/lib/chips";
import { getLeagueSnapshot, type ManagerSnapshot } from "@/services/league";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { ArrowDown, ArrowUp, Flame, Star, Trophy } from "lucide-react";
import { notFound } from "next/navigation";
import { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

/**
 * Rank movement, from the snapshot's own league ranks (identical criterion
 * to the old per-page computation: rank by total_points at the selected and
 * previous gameweek). `last_rank` 0 means "no previous data" — no movement,
 * matching the old fallback of comparing a rank to itself.
 */
function movementFor(manager: ManagerSnapshot): number {
  if (manager.last_rank === 0) return 0;
  return manager.last_rank - manager.rank;
}

function buildGameweekStats(
  managers: ManagerSnapshot[],
  currentGameweek: number,
  selectedGameweek: number
): GameweekStats {
  const hasData = managers.length > 0;

  const sortedByNetPoints = [...managers].sort((a, b) => b.net_points - a.net_points);
  const currentLeader = hasData
    ? sortedByNetPoints[0]
    : { player_name: "-", entry_name: "-", event_total: 0, net_points: 0, active_chip: null as string | null };
  const lowestPoints = hasData
    ? sortedByNetPoints[sortedByNetPoints.length - 1]
    : { player_name: "-", entry_name: "-", event_total: 0, net_points: 0 };

  const teamsWithMovement = managers.map((m) => ({
    name: m.player_name,
    team: m.entry_name,
    movement: movementFor(m),
  }));

  const highestRiser = hasData
    ? [...teamsWithMovement].sort((a, b) => b.movement - a.movement)[0]
    : { name: "-", team: "-", movement: 0 };
  const steepestFaller = hasData
    ? [...teamsWithMovement].sort((a, b) => a.movement - b.movement)[0]
    : { name: "-", team: "-", movement: 0 };

  // Count chips used in the selected gameweek.
  const chipCounts = { wildcard: 0, "3xc": 0, bboost: 0, freehit: 0 };
  const chipUsers = { wildcard: [] as string[], "3xc": [] as string[], bboost: [] as string[], freehit: [] as string[] };

  managers.forEach((m) => {
    const chipType = m.active_chip?.toLowerCase();
    switch (chipType) {
      case "wildcard":
        chipCounts.wildcard++;
        chipUsers.wildcard.push(m.player_name);
        break;
      case "3xc":
        chipCounts["3xc"]++;
        chipUsers["3xc"].push(m.player_name);
        break;
      case "bboost":
        chipCounts.bboost++;
        chipUsers.bboost.push(m.player_name);
        break;
      case "freehit":
        chipCounts.freehit++;
        chipUsers.freehit.push(m.player_name);
        break;
    }
  });

  // Most captained player (by web_name — the snapshot doesn't carry full names).
  const captainCounts = new Map<string, number>();
  managers.forEach((m) => {
    if (!m.captain) return;
    captainCounts.set(m.captain.web_name, (captainCounts.get(m.captain.web_name) ?? 0) + 1);
  });

  let mostCaptainedInfo: GameweekStats["mostCaptained"] = undefined;
  if (captainCounts.size > 0) {
    let mostCaptainedName = "";
    let highestCount = 0;
    captainCounts.forEach((count, name) => {
      if (count > highestCount) {
        highestCount = count;
        mostCaptainedName = name;
      }
    });
    if (mostCaptainedName) {
      mostCaptainedInfo = {
        player: mostCaptainedName,
        count: highestCount,
        percentage: Math.round((highestCount / managers.length) * 100),
      };
    }
  }

  const chipsSummary = [
    { type: chipLabel("wildcard"), count: chipCounts.wildcard, users: chipUsers.wildcard.join(", ") },
    { type: chipLabel("3xc"), count: chipCounts["3xc"], users: chipUsers["3xc"].join(", ") },
    { type: chipLabel("bboost"), count: chipCounts.bboost, users: chipUsers.bboost.join(", ") },
    { type: chipLabel("freehit"), count: chipCounts.freehit, users: chipUsers.freehit.join(", ") },
  ];

  return {
    currentGameweek,
    selectedGameweek,
    currentLeader: {
      name: currentLeader.player_name,
      team: currentLeader.entry_name,
      points: currentLeader.event_total,
      net_points: currentLeader.net_points,
      chipUsed: "active_chip" in currentLeader ? currentLeader.active_chip : null,
    },
    lowestPoints: {
      name: lowestPoints.player_name,
      team: lowestPoints.entry_name,
      points: lowestPoints.event_total,
      net_points: lowestPoints.net_points,
    },
    chipsSummary,
    highestRiser,
    steepestFaller,
    mostCaptained: mostCaptainedInfo,
  };
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

export default async function GameweekPage({
  searchParams,
}: {
  searchParams: Promise<GwSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const gameweekParam = resolveGwParam("/gameweek", resolvedSearchParams);
  const parsedGameweek = gameweekParam ? parseInt(gameweekParam, 10) : undefined;

  const { snapshot, stats } = await withUpstreamCounter(async () => {
    const snapshot = await getLeagueSnapshot(parsedGameweek);
    logTelemetry("/gameweek");
    const stats = buildGameweekStats(snapshot.managers, snapshot.currentGameweek, snapshot.selectedGameweek);
    return { snapshot, stats };
  });

  // Validate the requested gameweek only against a successfully fetched current gameweek.
  if (
    gameweekParam !== null &&
    (parsedGameweek === undefined ||
      Number.isNaN(parsedGameweek) ||
      parsedGameweek < 1 ||
      parsedGameweek > snapshot.currentGameweek)
  ) {
    notFound();
  }

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
          currentGameweek={snapshot.currentGameweek}
          selectedGameweek={snapshot.selectedGameweek}
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
