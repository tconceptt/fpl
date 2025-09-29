"use client";

import { useState } from "react";
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

export function LeagueTable({ standings, currentGameweek, selectedGameweek, className }: LeagueTableProps) {
  const [view, setView] = useState<"full" | "compact">("compact");
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          League Standings
        </CardTitle>
        <div className="flex w-full sm:w-auto items-center gap-2">
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compact">Compact</TabsTrigger>
              <TabsTrigger value="full">Full</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        {view === "compact" ? (
          <CompactView standings={standings} />
        ) : (
          <FullView standings={standings} />
        )}
      </CardContent>
    </Card>
  );
}

function CompactView({ standings }: { standings: GameweekStanding[] }) {
    return (
        <div className="text-white text-xs">
            <div className="flex font-bold text-gray-400 px-2 py-1 border-b border-gray-700 items-center">
                <div className="w-8 text-center">#</div>
                <div className="flex-1">Team</div>
                <div className="w-10 text-center">Chip</div>
                <div className="w-10 text-center leading-tight"><div>In</div><div>Play</div></div>
                <div className="w-8 text-center leading-tight"><div>To</div><div>Start</div></div>
                <div className="w-10 text-right">GW</div>
                <div className="w-12 text-right">Total</div>
            </div>
            <div className="overflow-y-auto">
                {standings.map((team, index) => {
                    const chipInfo = getChipIcon(team.active_chip);
                    return (
                        <div
                            key={team.entry}
                            className={`flex items-center px-2 py-1.5 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}`}
                        >
                            <div className="w-8 text-center flex items-center justify-center gap-1">
                                <span className="font-bold">{team.rank}</span>
                                <RankMovement currentRank={team.rank} lastRank={team.last_rank} showDiff={false} />
                            </div>
                            <div className="flex-1 min-w-0 ml-2">
                                <div className="font-bold">{team.entry_name}</div>
                                <div className="text-gray-400 truncate text-[10px]">{team.player_name}</div>
                                {team.captain_name && (
                                    <div className="text-yellow-400 text-[10px] flex items-center">
                                        <Star className="h-3 w-3 mr-0.5" />
                                        {team.captain_name}
                                    </div>
                                )}
                            </div>
                            <div className="w-10 text-center flex items-center justify-center">
                                {chipInfo && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <chipInfo.icon className={`h-4 w-4 ${chipInfo.color}`} />
                                            </TooltipTrigger>
                                            <TooltipContent><p>{chipInfo.label}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <div className="w-10 text-center font-medium">
                                {team.playersInPlay}
                            </div>
                            <div className="w-8 text-center font-medium">
                                {team.playersToStart}
                            </div>
                            <div className="w-10 text-right font-medium">
                                {team.net_points !== null ? formatPoints(team.net_points) : formatPoints(team.event_total)}
                            </div>
                            <div className="w-12 text-right font-bold">
                                {formatPoints(team.total_points)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function FullView({ standings }: { standings: GameweekStanding[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10">
            <TableHead className="w-12 text-white/60">Rank</TableHead>
            <TableHead className="text-white/60">Team</TableHead>
            <TableHead className="text-right text-white/60">GW</TableHead>
            <TableHead className="text-right text-white/60">GW Net</TableHead>
            <TableHead className="text-center text-white/60 leading-tight"><div>In</div><div>Play</div></TableHead>
            <TableHead className="text-center text-white/60 leading-tight"><div>To</div><div>Start</div></TableHead>
            <TableHead className="text-right text-white/60">Total</TableHead>
            <TableHead className="w-20 text-right text-white/60">Movement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((team) => {
            const chipInfo = getChipIcon(team.active_chip);
            
            return (
              <TableRow key={team.entry} className="border-white/10 hover:bg-white/5">
                <TableCell className="font-medium py-2">
                  {team.rank === 1 ? (
                    <div className="flex items-center gap-2">
                      {team.rank}
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    </div>
                  ) : team.rank}
                </TableCell>
                <TableCell className="py-2">
                  <div>
                    <div className="font-medium flex items-center gap-1">
                      {team.entry_name}
                      {chipInfo && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <chipInfo.icon className={`h-4 w-4 ${chipInfo.color} ml-1`} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{chipInfo.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="text-sm text-white/60">
                      {team.player_name}
                      {team.captain_name && (
                        <span className="ml-1">
                          (C: <span className="inline-flex items-center">
                            <Star className="h-3 w-3 mr-0.5 text-yellow-500" />
                            {team.captain_name}
                          </span>)
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium py-2">
                  {formatPoints(team.event_total)}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-medium py-2",
                  team.net_points !== null && team.net_points !== team.event_total && "text-yellow-500"
                )}>
                  {team.net_points !== null ? formatPoints(team.net_points) : formatPoints(team.event_total)}
                </TableCell>
                <TableCell className="text-center font-medium py-2">
                  {team.playersInPlay}
                </TableCell>
                <TableCell className="text-center font-medium py-2">
                  {team.playersToStart}
                </TableCell>
                <TableCell className="text-right font-bold py-2">
                  {formatPoints(team.total_points)}
                </TableCell>
                <TableCell className="text-right py-2">
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