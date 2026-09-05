"use client";
import { useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPoints } from "@/lib/fpl";
import { cn } from "@/lib/utils";
import { Trophy, Star, ArrowDownUp, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { GameweekStanding } from "@/types/league";
import { RankMovement } from "@/components/ui/rank-movement";
import { ChipBadge } from "@/components/ui/chip-badge";
import { getChipInfo } from "@/lib/chip-info";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GameweekSelector } from "../gameweek-selector";
import { useLeague, type LeagueApiResponse } from "@/hooks/use-league";

interface LeagueTableProps {
  initial: LeagueApiResponse;
  className?: string;
}

function getCustomRank(rank: number, totalTeams: number) {
  if (rank === totalTeams) {
    return "Eyosi";
  }
  return rank;
}

function toAmharic(num: number): string {
  const amharicNumerals: { [key: number]: string } = {
    1: '፩', 2: '፪', 3: '፫', 4: '፬', 5: '፭', 6: '፮', 7: '፯', 8: '፰', 9: '፱', 10: '፲',
    11: '፲፩', 12: '፲፪', 13: '፲፫', 14: '፲፬', 15: '፲፭', 16: '፲፮', 17: '፲፯', 18: '፲፰', 19: '፲፱', 20: '፳',
    21: '፳፩', 22: '፳፪', 23: '፳፫', 24: '፳፬', 25: '፳፭', 30: '፴', 40: '፵', 50: '፶', 60: '፷', 70: '፸',
    80: '፹', 90: '፺', 100: '፻'
  };

  // For numbers beyond 100, we'll use a simpler approach
  if (num > 100) {
    return num.toString(); // Fall back to Arabic for very high numbers
  }

  return amharicNumerals[num] || num.toString();
}

export function LeagueTable({ initial, className }: LeagueTableProps) {
  const [view, setView] = useState<"full" | "compact">("compact");
  const [sortByGW, setSortByGW] = useState(false);
  const { data, gw, setGw, loading, error } = useLeague(initial);
  const { standings, currentGameweek } = data;

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

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 pb-2 sm:pb-3 pt-2 sm:pt-6 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg">
          <Trophy className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-yellow-500" />
          League Standings
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/50" />}
        </CardTitle>
        <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-3 flex-wrap">
          <GameweekSelector
            currentGameweek={currentGameweek}
            selectedGameweek={gw}
            onChange={setGw}
            className="w-auto"
          />
          {/* Sleek view toggle with sort icon — Compact/Full toggle only on md+, phones always get the list */}
          <div className="flex items-center gap-1 bg-gray-800/50 border border-white/10 rounded-lg p-0.5">
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setView("compact")}
                className={cn(
                  "px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-medium transition-all",
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
                  "px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-medium transition-all",
                  view === "full"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                Full
              </button>
              <div className="w-px h-5 bg-white/10 mx-0.5" />
            </div>
            {/* Sort by GW */}
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
                    <span className="text-xs sm:hidden font-medium">GW</span>
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
      <CardContent
        className={cn(
          "px-0 sm:px-6 py-0 sm:py-6 transition-opacity",
          loading && "opacity-60"
        )}
      >
        {error && (
          <div className="mx-3 sm:mx-0 mb-2 rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        {/* Phones always get the list; the Full table stays for tablets and up. */}
        <div className="md:hidden">
          <MobileList standings={sortedStandings} selectedGameweek={gw} />
        </div>
        <div className="hidden md:block">
          {view === "compact" ? (
            <FullList standings={sortedStandings} selectedGameweek={gw} />
          ) : (
            <FullView standings={sortedStandings} selectedGameweek={gw} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The phone list: rank + movement, team line (name / manager / captain /
 * chip), GW net (with gross when a hit was taken) and season total. Tapping
 * a row expands an inline detail panel instead of navigating.
 */
function MobileList({
  standings,
  selectedGameweek,
}: {
  standings: Array<GameweekStanding & { gwRank: number }>;
  selectedGameweek: number;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="text-white text-sm rounded-lg overflow-hidden border border-white/10">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex font-bold text-gray-300 px-3 py-2 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900 text-xs">
        <div className="w-9 text-center">#</div>
        <div className="flex-1">Team</div>
        <div className="w-14 text-right">GW</div>
        <div className="w-14 text-right">Total</div>
      </div>

      <div>
        {standings.map((team, index) => {
          const chipInfo = getChipInfo(team.active_chip);
          const isFirst = team.gwRank === 1;
          const isLast = team.gwRank === standings.length;
          const isExpanded = expandedId === team.entry;
          const net = team.net_points !== null ? team.net_points : team.event_total;
          const hasHit = team.net_points !== null && team.net_points !== team.event_total;

          return (
            <div key={team.entry} className="border-b border-white/5 last:border-b-0">
              {/* A div, not a <button>: the ChipBadge inside is a button, and a
                  button nested in a button is invalid HTML that breaks the
                  server-rendered markup (rows spill out below the footer). */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isExpanded ? null : team.entry)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : team.entry);
                  }
                }}
                aria-expanded={isExpanded}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-left transition-all active:scale-[0.99] cursor-pointer select-none",
                  index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50',
                  "hover:bg-purple-900/20",
                  isFirst && "bg-gradient-to-r from-yellow-900/20 to-transparent",
                  isLast && "bg-gradient-to-r from-red-900/20 to-transparent"
                )}
              >
                {/* Rank + movement */}
                <div className="w-9 flex flex-col items-center justify-center shrink-0">
                  <span className={cn(
                    "font-bold text-sm tabular-nums",
                    isFirst && "text-yellow-400",
                    isLast && "text-red-400"
                  )}>
                    {getCustomRank(team.gwRank, standings.length)}
                  </span>
                  <RankMovement currentRank={team.rank} lastRank={team.last_rank} compact />
                </div>

                {/* Team info */}
                <div className="flex-1 min-w-0 ml-2">
                  <div className="font-semibold text-sm truncate text-white leading-tight">
                    {team.entry_name}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-white/60 truncate leading-tight">
                      {team.player_name}
                    </span>
                    {team.captain_name && (
                      <span className="text-xs text-yellow-400 flex items-center leading-tight">
                        <Star className="h-2.5 w-2.5 mr-0.5 fill-yellow-400 shrink-0" />
                        <span className="truncate font-medium">C · {team.captain_name}</span>
                      </span>
                    )}
                    {chipInfo && (
                      <ChipBadge abbr={chipInfo.abbr} label={chipInfo.label} color={chipInfo.color} />
                    )}
                  </div>
                </div>

                {/* GW Points */}
                <div className="w-14 text-right shrink-0">
                  <div className="font-semibold text-[13px] tabular-nums text-white leading-tight">
                    {formatPoints(net)}
                  </div>
                  {hasHit && (
                    <div className="text-xs text-white/50 tabular-nums leading-tight">
                      ({formatPoints(team.event_total)})
                    </div>
                  )}
                </div>

                {/* Total Points */}
                <div className="w-14 text-right shrink-0 flex items-center justify-end gap-1">
                  <span className="font-bold text-sm tabular-nums text-white">
                    {formatPoints(team.total_points)}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-white/40" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-white/40" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 py-3 bg-black/30 border-t border-white/10 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-white/5 px-2.5 py-2">
                      <div className="text-white/50 uppercase tracking-wide">Gross / Net</div>
                      <div className="text-sm font-semibold text-white tabular-nums mt-0.5">
                        {formatPoints(team.event_total)} / {formatPoints(net)}
                        {hasHit && (
                          <span className="text-red-400 font-medium ml-1">
                            (-{formatPoints(team.transfer_cost)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-md bg-white/5 px-2.5 py-2">
                      <div className="text-white/50 uppercase tracking-wide">H2H Rank</div>
                      <div className="text-sm font-semibold text-blue-400 tabular-nums mt-0.5">
                        {team.h2h_rank ? toAmharic(team.h2h_rank) : "–"}
                      </div>
                    </div>
                    <div className="rounded-md bg-white/5 px-2.5 py-2 col-span-2">
                      <div className="text-white/50 uppercase tracking-wide">Players still to play</div>
                      <div className="text-sm font-semibold text-white tabular-nums mt-0.5">
                        {team.playersToStart}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/team/${team.entry}?gw=${selectedGameweek}`}
                    className="block w-full text-center px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
                  >
                    Open team
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The old "Compact" table view, kept for tablets and up (md:). */
function FullList({
  standings,
  selectedGameweek,
}: {
  standings: Array<GameweekStanding & { gwRank: number }>;
  selectedGameweek: number;
}) {
  return (
    <div className="text-white text-sm rounded-lg overflow-hidden border border-white/10">
      {/* Header */}
      <div className="sticky top-0 z-10 flex font-bold text-gray-300 px-3 py-2 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900 text-xs">
        <div className="w-10 text-center">#</div>
        <div className="flex-1">Team</div>
        <div className="w-12 text-center">H2H</div>
        <div className="w-12 text-center">Chip</div>
        <div className="w-10 text-center leading-tight"><div>To</div><div>Start</div></div>
        <div className="w-12 text-right">GW</div>
        <div className="w-14 text-right">Total</div>
      </div>

      <div>
        {standings.map((team, index) => {
          const chipInfo = getChipInfo(team.active_chip);
          const isFirst = team.gwRank === 1;
          const isLast = team.gwRank === standings.length;

          return (
            <Link
              key={team.entry}
              href={`/team/${team.entry}?gw=${selectedGameweek}`}
              className={cn(
                "flex items-center px-3 py-2 border-b border-white/5 transition-all",
                index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50',
                "hover:bg-purple-900/20",
                isFirst && "bg-gradient-to-r from-yellow-900/20 to-transparent",
                isLast && "bg-gradient-to-r from-red-900/20 to-transparent"
              )}
            >
              <div className="w-10 flex items-center justify-center">
                <span className={cn(
                  "font-bold text-sm tabular-nums",
                  isFirst && "text-yellow-400",
                  isLast && "text-red-400"
                )}>
                  {getCustomRank(team.gwRank, standings.length)}
                </span>
              </div>

              <div className="flex-1 min-w-0 ml-2">
                <div className="font-semibold text-sm truncate text-white leading-tight flex items-center gap-1">
                  <span className="truncate">{team.entry_name}</span>
                  <RankMovement currentRank={team.rank} lastRank={team.last_rank} showDiff={false} compact={true} />
                </div>
                <div className="text-white/60 truncate text-xs leading-tight">
                  {team.player_name}
                </div>
                {team.captain_name && (
                  <div className="text-yellow-400 text-xs flex items-center leading-tight">
                    <Star className="h-3 w-3 mr-0.5 fill-yellow-400" />
                    <span className="truncate font-medium">{team.captain_name}</span>
                  </div>
                )}
              </div>

              <div className="w-12 text-center flex items-center justify-center">
                {team.h2h_rank && (
                  <span className="text-xs font-semibold text-blue-400 tabular-nums">
                    {toAmharic(team.h2h_rank)}
                  </span>
                )}
              </div>

              <div className="w-12 text-center flex items-center justify-center">
                {chipInfo && (
                  <ChipBadge abbr={chipInfo.abbr} label={chipInfo.label} color={chipInfo.color} />
                )}
              </div>

              <div className="w-10 text-center font-medium text-sm text-white/80 tabular-nums">
                {team.playersToStart}
              </div>

              <div className="w-12 text-right font-semibold text-sm text-white tabular-nums">
                {team.net_points !== null ? formatPoints(team.net_points) : formatPoints(team.event_total)}
              </div>

              <div className="w-14 text-right font-bold text-base text-white tabular-nums">
                {formatPoints(team.total_points)}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function FullView({ standings, selectedGameweek }: { standings: Array<GameweekStanding & { gwRank: number }>; selectedGameweek: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <Table>
        <TableHeader>
          <TableRow className="sticky top-0 z-10 border-white/10 bg-gradient-to-r from-gray-800 to-gray-900 hover:bg-gradient-to-r">
            <TableHead className="w-16 text-gray-300 font-bold">Rank</TableHead>
            <TableHead className="text-gray-300 font-bold">Team</TableHead>
            <TableHead className="text-center text-gray-300 font-bold">H2H</TableHead>
            <TableHead className="text-right text-gray-300 font-bold">GW</TableHead>
            <TableHead className="text-right text-gray-300 font-bold">GW Net</TableHead>

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
              >
                <TableCell className="font-bold py-3 tabular-nums">
                  <Link href={`/team/${team.entry}?gw=${selectedGameweek}`} className="flex items-center gap-2">
                    {isFirst && <Trophy className="h-4 w-4 text-yellow-400" />}
                    {getCustomRank(team.gwRank, standings.length)}
                  </Link>
                </TableCell>
                <TableCell className="py-3">
                  <Link href={`/team/${team.entry}?gw=${selectedGameweek}`} className="block">
                    <div className="font-semibold flex items-center gap-2 text-white">
                      {team.entry_name}
                      {chipInfo && (
                        <ChipBadge abbr={chipInfo.abbr} label={chipInfo.label} color={chipInfo.color} />
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
                  </Link>
                </TableCell>
                <TableCell className="text-center font-semibold py-3 tabular-nums">
                  {team.h2h_rank && (
                    <span className="text-blue-400">
                      {toAmharic(team.h2h_rank)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold py-3 text-white tabular-nums">
                  {formatPoints(team.event_total)}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-semibold py-3 tabular-nums",
                  team.net_points !== null && team.net_points !== team.event_total ? "text-yellow-400" : "text-white"
                )}>
                  {team.net_points !== null ? formatPoints(team.net_points) : formatPoints(team.event_total)}
                </TableCell>

                <TableCell className="text-center font-medium py-3 text-white/80 tabular-nums">
                  {team.playersToStart}
                </TableCell>
                <TableCell className="text-right font-bold py-3 text-base text-white tabular-nums">
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
