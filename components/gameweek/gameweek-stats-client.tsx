"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameweekSelector } from "@/components/gameweek-selector";
import { formatPoints } from "@/lib/fpl";
import { computeGameweekStats } from "@/services/gameweek-stats";
import { useLeague, type LeagueApiResponse } from "@/hooks/use-league";
import { ArrowDown, ArrowUp, Flame, Loader2, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

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

const colorSchemes = {
  orange: {
    border: "border-orange-500/30",
    text: "text-orange-400",
    iconBg: "bg-orange-500/10",
    headerGradient: "from-orange-900/30 to-orange-800/30",
  },
  red: {
    border: "border-red-500/30",
    text: "text-red-400",
    iconBg: "bg-red-500/10",
    headerGradient: "from-red-900/30 to-red-800/30",
  },
  yellow: {
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    iconBg: "bg-yellow-500/10",
    headerGradient: "from-yellow-900/30 to-yellow-800/30",
  },
  green: {
    border: "border-green-500/30",
    text: "text-green-400",
    iconBg: "bg-green-500/10",
    headerGradient: "from-green-900/30 to-green-800/30",
  },
  blue: {
    border: "border-blue-500/30",
    text: "text-blue-400",
    iconBg: "bg-blue-500/10",
    headerGradient: "from-blue-900/30 to-blue-800/30",
  },
};

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
  compact = false,
}: GameweekCardProps) {
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
          <div className={`text-white/60 ${compact ? 'text-xs' : 'text-xs sm:text-sm'} truncate`}>
            {playerName}
          </div>
          <div className={`font-bold ${colors.text} ${compact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} mt-1 sm:mt-2 tabular-nums`}>
            {points !== undefined && (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span>{prefix}{points}{suffix}</span>
                {rawPoints !== undefined && rawPoints !== points && (
                  <span className="text-xs text-white/50 font-medium">
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

const chipColors: Record<string, string> = {
  "Wildcard": "from-green-500/20 to-green-600/20 border-green-500/30",
  "Triple Captain": "from-purple-500/20 to-purple-600/20 border-purple-500/30",
  "Bench Boost": "from-blue-500/20 to-blue-600/20 border-blue-500/30",
  "Free Hit": "from-amber-500/20 to-amber-600/20 border-amber-500/30",
};

const chipEmoji: Record<string, string> = {
  "Wildcard": "🃏",
  "Triple Captain": "👑",
  "Bench Boost": "💪",
  "Free Hit": "🔄",
};

export function GameweekStatsClient({ initial }: { initial: LeagueApiResponse }) {
  const { data, gw, setGw, loading, error } = useLeague(initial);
  const stats = computeGameweekStats(data.standings, data.currentGameweek, gw);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">Gameweek {stats.selectedGameweek} Stats</h1>
            <GameweekSelector
              currentGameweek={data.currentGameweek}
              selectedGameweek={gw}
              onChange={setGw}
              className="w-auto"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-white/50" />}
          </div>
          <p className="text-sm text-white/60 mt-1">
            {stats.selectedGameweek === stats.currentGameweek
              ? "Live updates and insights"
              : "Historical gameweek data"}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className={cn("space-y-4 sm:space-y-6 transition-opacity", loading && "opacity-60")}>
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
              {stats.chipsSummary.map((chip) => (
                <div
                  key={chip.type}
                  className={`flex flex-col items-center justify-center rounded-lg bg-gradient-to-br ${chipColors[chip.type]} border p-4 sm:p-5 transition-all hover:scale-105`}
                >
                  <div className="mb-2 text-2xl sm:text-3xl">{chipEmoji[chip.type]}</div>
                  <div className="text-xs font-medium text-white/70 text-center">{chip.type}</div>
                  <div className="text-2xl sm:text-3xl font-bold text-white mt-1 tabular-nums">{chip.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
