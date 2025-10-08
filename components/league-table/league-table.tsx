"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPoints } from "@/lib/fpl";
import { cn } from "@/lib/utils";
import { Trophy, Star, Zap, Sparkles, Rocket, Wand2 } from "lucide-react";
import { GameweekStanding } from "@/types/league";
import { RankMovement } from "@/components/ui/rank-movement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

function getChipIcon(chipName: string | null | undefined) {
  if (!chipName) return null;
  
  switch (chipName) {
    case "wildcard":
      return { icon: Wand2, color: "text-green-500", label: "Wildcard" };
    case "3xc":
      return { icon: Sparkles, color: "text-purple-500", label: "Triple Captain" };
    case "bboost":
      return { icon: Rocket, color: "text-blue-500", label: "Bench Boost" };
    case "freehit":
      return { icon: Zap, color: "text-amber-500", label: "Free Hit" };
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


export function LeagueTable({ standings, currentGameweek, selectedGameweek, className }: LeagueTableProps) {
  const [view, setView] = useState<"full" | "compact">("compact");
  const router = useRouter();

  function openBreakdown(teamId: number) {
    // Navigate to team page instead of opening popup
    router.push(`/team/${teamId}?gw=${selectedGameweek}`);
  }



  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2 pb-1.5 sm:pb-2 pt-2 sm:pt-6 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg">
          <Trophy className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-yellow-500" />
          League Standings
        </CardTitle>
        <div className="flex w-full sm:w-auto items-center gap-1.5 sm:gap-2">
          <GameweekSelector
            currentGameweek={currentGameweek}
            selectedGameweek={selectedGameweek}
            className="w-auto"
          />
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as "full" | "compact")}
            className="w-full sm:w-[200px] flex-1"
          >
            <TabsList className="grid w-full grid-cols-2 h-7 sm:h-10">
              <TabsTrigger value="compact" className="text-[9px] sm:text-sm">Compact</TabsTrigger>
              <TabsTrigger value="full" className="text-[9px] sm:text-sm">Full</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="px-0 sm:px-6 py-0 sm:py-6">
        {view === "compact" ? (
          <CompactView standings={standings} onTeamClick={openBreakdown} />
        ) : (
          <FullView standings={standings} onTeamClick={openBreakdown} />
        )}

      </CardContent>
    </Card>
  );
}

function CompactView({ standings, onTeamClick }: { standings: GameweekStanding[]; onTeamClick: (teamId: number) => void }) {
    return (
        <div className="text-white text-xs sm:text-sm rounded-lg overflow-hidden border border-white/10">
            {/* Header */}
            <div className="flex font-bold text-gray-300 px-1.5 sm:px-3 py-1 sm:py-2 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900 text-[10px] sm:text-xs">
                <div className="w-6 sm:w-10 text-center">#</div>
                <div className="flex-1">Team</div>
                <div className="w-6 sm:w-10 text-center">Chip</div>
                <div className="w-7 sm:w-12 text-right">GW</div>
                <div className="w-9 sm:w-14 text-right">Total</div>
            </div>
            
            {/* Rows */}
            <div className="overflow-y-auto">
                {standings.map((team, index) => {
                    const chipInfo = getChipIcon(team.active_chip);
                    const isFirst = team.rank === 1;
                    const isLast = team.rank === standings.length;
                    
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
                            {/* Rank with movement */}
                            <div className="w-6 sm:w-10 flex items-center justify-center gap-0.5">
                                <span className={cn(
                                    "font-bold text-[10px] sm:text-sm",
                                    isFirst && "text-yellow-400",
                                    isLast && "text-red-400"
                                )}>
                                    {isFirst && <Trophy className="h-2.5 w-2.5 sm:h-4 sm:w-4 inline mr-0.5" />}
                                    {getCustomRank(team.rank, standings.length)}
                                </span>
                                <RankMovement currentRank={team.rank} lastRank={team.last_rank} showDiff={false} />
                            </div>
                            
                            {/* Team info */}
                            <div className="flex-1 min-w-0 ml-1 sm:ml-2">
                                <div className="font-semibold text-[10px] sm:text-sm truncate text-white leading-tight">
                                    {team.entry_name}
                                </div>
                                <div className="text-white/60 truncate text-[8px] sm:text-xs leading-tight">
                                    {team.player_name}
                                </div>
                                {team.captain_name && (
                                    <div className="text-yellow-400 text-[8px] sm:text-xs flex items-center leading-tight">
                                        <Star className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5 fill-yellow-400" />
                                        <span className="truncate font-medium">{team.captain_name}</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Chip icon */}
                            <div className="w-6 sm:w-10 text-center flex items-center justify-center">
                                {chipInfo && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <chipInfo.icon className={cn("h-3 w-3 sm:h-4 sm:w-4", chipInfo.color)} />
                                            </TooltipTrigger>
                                            <TooltipContent><p>{chipInfo.label}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            
                            {/* GW Points */}
                            <div className="w-7 sm:w-12 text-right font-semibold text-[10px] sm:text-sm text-white">
                                {team.net_points !== null ? formatPoints(team.net_points) : formatPoints(team.event_total)}
                            </div>
                            
                            {/* Total Points */}
                            <div className="w-9 sm:w-14 text-right font-bold text-[11px] sm:text-base text-white">
                                {formatPoints(team.total_points)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function FullView({ standings, onTeamClick }: { standings: GameweekStanding[]; onTeamClick: (teamId: number) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 bg-gradient-to-r from-gray-800 to-gray-900 hover:bg-gradient-to-r">
            <TableHead className="w-16 text-gray-300 font-bold">Rank</TableHead>
            <TableHead className="text-gray-300 font-bold">Team</TableHead>
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
            const chipInfo = getChipIcon(team.active_chip);
            const isFirst = team.rank === 1;
            const isLast = team.rank === standings.length;
            
            return (
              <TableRow 
                key={team.entry} 
                className={cn(
                  "border-white/5 cursor-pointer transition-all",
                  index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50',
                  "hover:bg-purple-900/20",
                  isFirst && "bg-gradient-to-r from-yellow-900/20 to-transparent hover:from-yellow-900/30",
                  isLast && "bg-gradient-to-r from-red-900/20 to-transparent hover:from-red-900/30"
                )}
                onClick={() => onTeamClick(team.entry)}
              >
                <TableCell className={cn(
                  "font-bold py-3",
                  isFirst && "text-yellow-400",
                  isLast && "text-red-400"
                )}>
                  <div className="flex items-center gap-2">
                    {isFirst && <Trophy className="h-4 w-4 text-yellow-400" />}
                    {getCustomRank(team.rank, standings.length)}
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
                              <chipInfo.icon className={cn("h-4 w-4", chipInfo.color)} />
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