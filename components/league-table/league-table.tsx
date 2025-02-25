"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPoints } from "@/lib/fpl";
import { cn } from "@/lib/utils";
import { Trophy, Star } from "lucide-react";
import { GameweekStanding } from "@/types/league";
import { RankMovement } from "@/components/ui/rank-movement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface LeagueTableProps {
  standings: GameweekStanding[];
  className?: string;
}

export function LeagueTable({ standings, className }: LeagueTableProps) {
  const [view, setView] = useState<"full" | "compact">("compact");
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          League Table
        </CardTitle>
        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "full" | "compact")}
          className="w-[200px]"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compact">Compact</TabsTrigger>
            <TabsTrigger value="full">Full</TabsTrigger>
          </TabsList>
        </Tabs>
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
    <div className="space-y-2 px-4 sm:px-0">
      {standings.map((team) => (
        <div key={team.entry} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
              {team.rank === 1 ? (
                <Trophy className="h-4 w-4 text-yellow-500" />
              ) : (
                team.rank
              )}
            </div>
            <div>
              <div className="font-medium">{team.entry_name}</div>
              <div className="text-xs text-white/60">
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
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-bold">{formatPoints(team.total_points)}</div>
              <div className="text-xs text-white/60">Total</div>
            </div>
            <RankMovement currentRank={team.rank} lastRank={team.last_rank} />
          </div>
        </div>
      ))}
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
            <TableHead className="text-right text-white/60">Total</TableHead>
            <TableHead className="w-20 text-right text-white/60">Movement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((team) => (
            <TableRow key={team.entry} className="border-white/10 hover:bg-white/5">
              <TableCell className="font-medium">
                {team.rank === 1 ? (
                  <div className="flex items-center gap-2">
                    {team.rank}
                    <Trophy className="h-4 w-4 text-yellow-500" />
                  </div>
                ) : team.rank}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{team.entry_name}</div>
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
              <TableCell className="text-right font-medium">
                {formatPoints(team.event_total)}
              </TableCell>
              <TableCell className={cn(
                "text-right font-medium",
                team.net_points !== null && team.net_points !== team.event_total && "text-yellow-500"
              )}>
                {team.net_points !== null ? formatPoints(team.net_points) : formatPoints(team.event_total)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatPoints(team.total_points)}
              </TableCell>
              <TableCell className="text-right">
                <RankMovement currentRank={team.rank} lastRank={team.last_rank} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 