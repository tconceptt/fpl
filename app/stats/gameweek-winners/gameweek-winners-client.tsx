'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, AlertCircle } from "lucide-react";
import { formatPoints } from "@/lib/fpl";
import { Fragment } from "react";
import type { UnresolvedTie } from "../getStatData";

interface GameweekWin {
  gameweek: number;
  points: number;
  net_points: number;
}

interface TeamStats {
  id: number;
  name: string;
  managerName: string;
  wins: number;
  gameweekWins: GameweekWin[];
}

interface GameweekWinnersClientProps {
  stats: TeamStats[];
  unresolvedTies: UnresolvedTie[];
}

export function GameweekWinnersClient({ 
  stats, 
  unresolvedTies
}: GameweekWinnersClientProps) {
  return (
    <div className="relative">

      {/* Unresolved Ties Section */}
      {unresolvedTies && unresolvedTies.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-900/20 backdrop-blur-sm shadow-lg mb-6">
          <CardHeader className="pb-3 border-b border-amber-500/20 bg-gradient-to-r from-amber-900/30 to-amber-800/30">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Unresolved Gameweek Ties
            </CardTitle>
            <p className="text-xs sm:text-sm text-amber-300/80 mt-1">
              These gameweeks have tied scores and will be resolved when the next gameweek completes
            </p>
          </CardHeader>
          <CardContent className="px-0 sm:px-6 py-0 sm:py-6">
            {/* Mobile View */}
            <div className="sm:hidden text-white text-xs rounded-lg overflow-hidden border border-amber-500/20">
              {unresolvedTies.map((tie: UnresolvedTie) => (
                <div key={tie.gameweeks.join('-')} className="border-b border-amber-500/20 last:border-b-0 bg-amber-900/10">
                  <div className="px-3 py-2 bg-amber-800/30 font-bold text-amber-200">
                    {tie.gameweeks.length === 1 
                      ? `Gameweek ${tie.gameweeks[0]}`
                      : `Gameweeks ${tie.gameweeks.join(', ')}`
                    }
                  </div>
                  {tie.tiedTeams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between px-3 py-2 border-t border-amber-500/10">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[10.5px] truncate text-white leading-tight">
                          {team.name}
                        </div>
                        <div className="text-white/60 truncate text-[8.5px] leading-tight">
                          {team.managerName}
                        </div>
                      </div>
                      <div className="text-right font-bold text-[11.5px] text-amber-300 ml-2">
                        {formatPoints(team.netPoints)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-amber-500/20">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-500/20 bg-gradient-to-r from-amber-800/30 to-amber-900/30 hover:bg-gradient-to-r">
                    <TableHead className="text-amber-300 font-bold">Gameweek(s)</TableHead>
                    <TableHead className="text-amber-300 font-bold">Team</TableHead>
                    <TableHead className="text-right text-amber-300 font-bold">Net Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unresolvedTies.map((tie: UnresolvedTie) => (
                    <Fragment key={tie.gameweeks.join('-')}>
                      {tie.tiedTeams.map((team, idx) => (
                        <TableRow 
                          key={`${tie.gameweeks.join('-')}-${team.id}`} 
                          className={`border-amber-500/10 transition-all ${
                            idx === 0 ? 'bg-amber-900/20' : 'bg-amber-900/10'
                          } hover:bg-amber-800/30`}
                        >
                          {idx === 0 && (
                            <TableCell 
                              className="font-bold py-3 text-amber-200" 
                              rowSpan={tie.tiedTeams.length}
                            >
                              {tie.gameweeks.length === 1 
                                ? `GW ${tie.gameweeks[0]}`
                                : `GWs ${tie.gameweeks.join(', ')}`
                              }
                            </TableCell>
                          )}
                          <TableCell className="py-3">
                            <div>
                              <div className="font-medium text-white">{team.name}</div>
                              <div className="text-sm text-white/60">{team.managerName}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold py-3 text-amber-300">
                            {formatPoints(team.netPoints)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gameweek Winners Table */}
      <Card className="border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-gray-800 to-gray-900">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Gameweek Winners
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 py-0 sm:py-6">
          {/* Mobile View - Compact Table */}
          <div className="sm:hidden text-white text-xs rounded-lg overflow-hidden border border-white/10">
            {/* Header */}
            <div className="flex font-bold text-gray-300 px-2 py-1.5 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900 text-[10.5px]">
              <div className="w-8 text-center">#</div>
              <div className="flex-1">Team</div>
              <div className="w-12 text-right">Wins</div>
            </div>
            {/* Rows */}
            <div className="overflow-y-auto">
              {stats.map((team: TeamStats, index: number) => (
                <div
                  key={team.id}
                  className={`flex items-center px-2 py-1.5 border-b border-white/5 ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50'}`}
                >
                  <div className="w-8 flex items-center justify-center">
                    <span className={`font-bold text-[10.5px] ${index === 0 ? 'text-yellow-400' : ''}`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 ml-2">
                    <div className="font-semibold text-[10.5px] truncate text-white leading-tight">
                      {team.name}
                    </div>
                    <div className="text-white/60 truncate text-[8.5px] leading-tight">
                      {team.managerName}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {team.gameweekWins.map((win) => (
                        <span
                          key={win.gameweek}
                          className="inline-flex items-center rounded bg-white/10 px-1 py-0.5 text-[8px]"
                          title={`${formatPoints(win.points)} points (${formatPoints(win.net_points)} net)`}
                        >
                          {win.gameweek}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="w-12 text-right font-bold text-[11.5px] text-white">
                    {team.wins}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 bg-gradient-to-r from-gray-800 to-gray-900 hover:bg-gradient-to-r">
                  <TableHead className="w-12 text-gray-300 font-bold">Rank</TableHead>
                  <TableHead className="text-gray-300 font-bold">Team</TableHead>
                  <TableHead className="text-right text-gray-300 font-bold">Wins</TableHead>
                  <TableHead className="text-right text-gray-300 font-bold">Gameweeks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((team: TeamStats, index: number) => (
                  <TableRow key={team.id} className={`border-white/5 transition-all ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50'} hover:bg-purple-900/20`}>
                    <TableCell className="font-bold py-3">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Trophy className="h-4 w-4 text-yellow-400" />}
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div>
                        <div className="font-medium text-white">{team.name}</div>
                        <div className="text-sm text-white/60">{team.managerName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold py-3 text-white">{team.wins}</TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        {team.gameweekWins.map((win) => (
                          <span
                            key={win.gameweek}
                            className="inline-flex items-center rounded bg-white/10 px-1.5 py-0.5 text-xs"
                            title={`${formatPoints(win.points)} points (${formatPoints(win.net_points)} net)`}
                          >
                            {win.gameweek}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

