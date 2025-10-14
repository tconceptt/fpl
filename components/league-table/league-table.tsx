"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPoints } from "@/lib/fpl";
import { cn } from "@/lib/utils";
import { Trophy, Star, ArrowDownUp } from "lucide-react";
import { GameweekStanding } from "@/types/league";
import { RankMovement } from "@/components/ui/rank-movement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GameweekSelector } from "../gameweek-selector";

interface LeagueTableProps {
  standings: GameweekStanding[];
  currentGameweek: number;
  selectedGameweek: number;
  className?: string;
}

function getChipInfo(chipName: string | null | undefined) {
  if (!chipName) return null;
  
  switch (chipName) {
    case "wildcard":
      return { abbr: "WC", color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Wildcard" };
    case "3xc":
      return { abbr: "TC", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Triple Captain" };
    case "bboost":
      return { abbr: "BB", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Bench Boost" };
    case "freehit":
      return { abbr: "FH", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Free Hit" };
    default:
      return null;
  }
}

function getCustomRank(rank: number, totalTeams: number) {
  if (rank === totalTeams) {
    return "Eyosi";
  }
  return rank;
}

function toAmharic(num: number): string {
  const amharicNumerals: { [key: number]: string } = {
    1: '፩',
    2: '፪',
    3: '፫',
    4: '፬',
    5: '፭',
    6: '፮',
    7: '፯',
    8: '፰',
    9: '፱',
    10: '፲',
    11: '፲፩',
    12: '፲፪',
    13: '፲፫',
    14: '፲፬',
    15: '፲፭',
    16: '፲፮',
    17: '፲፯',
    18: '፲፰',
    19: '፲፱',
    20: '፳',
    21: '፳፩',
    22: '፳፪',
    23: '፳፫',
    24: '፳፬',
    25: '፳፭',
    30: '፴',
    40: '፵',
    50: '፶',
    60: '፷',
    70: '፸',
    80: '፹',
    90: '፺',
    100: '፻'
  };
  
  // For numbers beyond 100, we'll use a simpler approach
  if (num > 100) {
    return num.toString(); // Fall back to Arabic for very high numbers
  }
  
  return amharicNumerals[num] || num.toString();
}


export function LeagueTable({ standings, currentGameweek, selectedGameweek, className }: LeagueTableProps) {
  const [view, setView] = useState<"full" | "compact">("compact");
  const [sortByGW, setSortByGW] = useState(false);
  const router = useRouter();

  // Sort standings based on sortByGW state and assign GW ranks
  const sortedStandings = sortByGW
    ? [...standings]
        .sort((a, b) => {
          const aPoints = a.net_points !== null ? a.net_points : a.event_total;
          const bPoints = b.net_points !== null ? b.net_points : b.event_total;
          return bPoints - aPoints;
        })
        .map((team, index) => ({
          ...team,
          gwRank: index + 1, // Add GW-specific rank
        }))
    : standings.map((team) => ({ ...team, gwRank: team.rank })); // Use league rank when not sorting by GW

  function openBreakdown(teamId: number) {
    // Navigate to team page instead of opening popup
    router.push(`/team/${teamId}?gw=${selectedGameweek}`);
  }



  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 pb-2 sm:pb-3 pt-2 sm:pt-6 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg">
          <Trophy className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-yellow-500" />
          League Standings
        </CardTitle>
        <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-3 flex-wrap">
          <GameweekSelector
            currentGameweek={currentGameweek}
            selectedGameweek={selectedGameweek}
            className="w-auto"
          />
          {/* Sleek view toggle with sort icon */}
          <div className="flex items-center gap-1 bg-gray-800/50 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setView("compact")}
              className={cn(
                "px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[9px] sm:text-xs font-medium transition-all",
                view === "compact"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              Compact
            </button>
            <button
              onClick={() => setView("full")}
              className={cn(
                "px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[9px] sm:text-xs font-medium transition-all",
                view === "full"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              Full
            </button>
            {/* Sort by GW - with mobile-friendly label */}
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSortByGW(!sortByGW)}
                    className={cn(
                      "flex items-center gap-1 px-1.5 sm:p-1.5 py-1 sm:py-1.5 rounded-md transition-all",
                      sortByGW
                        ? "bg-green-600 text-white shadow-lg"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <ArrowDownUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-[8px] sm:hidden font-medium">GW</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{sortByGW ? "Sort by Rank" : "Sort by GW Points"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
                </div>
              </div>
      </CardHeader>
      <CardContent className="px-0 sm:px-6 py-0 sm:py-6">
        {view === "compact" ? (
          <CompactView standings={sortedStandings} onTeamClick={openBreakdown} />
        ) : (
          <FullView standings={sortedStandings} onTeamClick={openBreakdown} />
        )}

      </CardContent>
    </Card>
  );
}

function CompactView({ standings, onTeamClick }: { standings: Array<GameweekStanding & { gwRank: number }>; onTeamClick: (teamId: number) => void }) {
    return (
        <div className="text-white text-xs sm:text-sm rounded-lg overflow-hidden border border-white/10">
            {/* Header */}
            <div className="flex font-bold text-gray-300 px-1.5 sm:px-3 py-1 sm:py-2 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900 text-[10.5px] sm:text-xs">
                <div className="w-6 sm:w-10 text-center">#</div>
                <div className="flex-1">Team</div>
                <div className="w-10 sm:w-12 text-center">H2H</div>
                <div className="w-10 sm:w-12 text-center">Chip</div>
                <div className="w-10 sm:w-12 text-right">GW</div>
                <div className="w-12 sm:w-14 text-right">Total</div>
            </div>
            
            {/* Rows */}
            <div className="overflow-y-auto">
                {standings.map((team, index) => {
                    const chipInfo = getChipInfo(team.active_chip);
                    const isFirst = team.gwRank === 1;
                    const isLast = team.gwRank === standings.length;
                    
                    return (
                        <div
                            key={team.entry}
                            className={cn(
                                "flex items-center px-1.5 sm:px-3 py-1 sm:py-2 border-b border-white/5 cursor-pointer transition-all",
                                index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50',
                                "hover:bg-purple-900/20 active:scale-[0.99]",
                                isFirst && "bg-gradient-to-r from-yellow-900/20 to-transparent",
                                isLast && "bg-gradient-to-r from-red-900/20 to-transparent"
                            )}
                            onClick={() => onTeamClick(team.entry)}
                        >
                            {/* Rank - clean and symmetrical */}
                            <div className="w-6 sm:w-10 flex items-center justify-center">
                                <span className={cn(
                                    "font-bold text-[10.5px] sm:text-sm",
                                    isFirst && "text-yellow-400",
                                    isLast && "text-red-400"
                                )}>
                                    {getCustomRank(team.gwRank, standings.length)}
                                </span>
                            </div>
                            
                            {/* Team info with movement indicator */}
                            <div className="flex-1 min-w-0 ml-1 sm:ml-2">
                                <div className="font-semibold text-[10.5px] sm:text-sm truncate text-white leading-tight flex items-center gap-1">
                                    <span className="truncate">{team.entry_name}</span>
                                    <RankMovement currentRank={team.rank} lastRank={team.last_rank} showDiff={false} compact={true} />
                                </div>
                                <div className="text-white/60 truncate text-[8.5px] sm:text-xs leading-tight">
                                    {team.player_name}
                                </div>
                                {team.captain_name && (
                                    <div className="text-yellow-400 text-[8.5px] sm:text-xs flex items-center leading-tight">
                                        <Star className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5 fill-yellow-400" />
                                        <span className="truncate font-medium">{team.captain_name}</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* H2H Rank */}
                            <div className="w-10 sm:w-12 text-center flex items-center justify-center">
                                {team.h2h_rank && (
                                    <span className="text-[10px] sm:text-xs font-semibold text-blue-400">
                                        {toAmharic(team.h2h_rank)}
                                    </span>
                                )}
                            </div>
                            
                            {/* Chip badge */}
                            <div className="w-10 sm:w-12 text-center flex items-center justify-center">
                                {chipInfo && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <span className={cn(
                                                    "text-[7px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded border",
                                                    chipInfo.color
                                                )}>
                                                    {chipInfo.abbr}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{chipInfo.label}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            
                            {/* GW Points */}
                            <div className="w-10 sm:w-12 text-right font-semibold text-[10.5px] sm:text-sm text-white">
                                {team.net_points !== null ? formatPoints(team.net_points) : formatPoints(team.event_total)}
                            </div>
                            
                            {/* Total Points */}
                            <div className="w-12 sm:w-14 text-right font-bold text-[11.5px] sm:text-base text-white">
                                {formatPoints(team.total_points)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function FullView({ standings, onTeamClick }: { standings: Array<GameweekStanding & { gwRank: number }>; onTeamClick: (teamId: number) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 bg-gradient-to-r from-gray-800 to-gray-900 hover:bg-gradient-to-r">
            <TableHead className="w-16 text-gray-300 font-bold">Rank</TableHead>
            <TableHead className="text-gray-300 font-bold">Team</TableHead>
            <TableHead className="text-center text-gray-300 font-bold">H2H</TableHead>
            <TableHead className="text-right text-gray-300 font-bold">GW</TableHead>
            <TableHead className="text-right text-gray-300 font-bold">GW Net</TableHead>
            <TableHead className="text-center text-gray-300 font-bold leading-tight"><div>In</div><div>Play</div></TableHead>
            <TableHead className="text-center text-gray-300 font-bold leading-tight"><div>To</div><div>Start</div></TableHead>
            <TableHead className="text-right text-gray-300 font-bold">Total</TableHead>
            <TableHead className="w-24 text-right text-gray-300 font-bold">Movement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((team, index) => {
            const chipInfo = getChipInfo(team.active_chip);
            const isFirst = team.gwRank === 1;
            
            return (
              <TableRow 
                key={team.entry} 
                className={cn(
                  "border-white/5 cursor-pointer transition-all",
                  index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50',
                  "hover:bg-purple-900/20"
                )}
                onClick={() => onTeamClick(team.entry)}
              >
                <TableCell className="font-bold py-3">
                    <div className="flex items-center gap-2">
                    {isFirst && <Trophy className="h-4 w-4 text-yellow-400" />}
                    {getCustomRank(team.gwRank, standings.length)}
                    </div>
                </TableCell>
                <TableCell className="py-3">
                  <div>
                    <div className="font-semibold flex items-center gap-2 text-white">
                      {team.entry_name}
                      {chipInfo && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded border pointer-events-none",
                                chipInfo.color
                              )}>
                                {chipInfo.abbr}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{chipInfo.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="text-sm text-white/60 mt-0.5">
                      {team.player_name}
                      {team.captain_name && (
                        <span className="ml-2 text-yellow-400">
                          <span className="inline-flex items-center">
                            <Star className="h-3 w-3 mr-0.5 fill-yellow-400" />
                            {team.captain_name}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold py-3">
                  {team.h2h_rank && (
                    <span className="text-blue-400">
                      {toAmharic(team.h2h_rank)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold py-3 text-white">
                  {formatPoints(team.event_total)}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-semibold py-3",
                  team.net_points !== null && team.net_points !== team.event_total ? "text-yellow-400" : "text-white"
                )}>
                  {team.net_points !== null ? formatPoints(team.net_points) : formatPoints(team.event_total)}
                </TableCell>
                <TableCell className="text-center font-medium py-3 text-white/80">
                  {team.playersInPlay}
                </TableCell>
                <TableCell className="text-center font-medium py-3 text-white/80">
                  {team.playersToStart}
                </TableCell>
                <TableCell className="text-right font-bold py-3 text-base text-white">
                  {formatPoints(team.total_points)}
                </TableCell>
                <TableCell className="text-right py-3">
                  <RankMovement currentRank={team.rank} lastRank={team.last_rank} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
} 