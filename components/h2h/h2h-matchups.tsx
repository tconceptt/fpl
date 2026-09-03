import Link from "next/link";
import { Star, Swords, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChipBadge } from "@/components/ui/chip-badge";
import { formatPoints } from "@/lib/fpl";
import { cn } from "@/lib/utils";
import type { H2HMatchup, H2HSide, H2HTableRow, MatchupState } from "@/services/h2h";

const CHIP_STYLE: Record<string, { abbr: string; label: string; color: string }> = {
  wildcard: { abbr: "WC", label: "Wildcard", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  "3xc": { abbr: "TC", label: "Triple Captain", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  bboost: { abbr: "BB", label: "Bench Boost", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  freehit: { abbr: "FH", label: "Free Hit", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

function sideState(state: MatchupState, isHome: boolean): MatchupState {
  if (state === "level") return "level";
  if (isHome) return state;
  return state === "leading" ? "trailing" : "leading";
}

const STATE_TEXT: Record<MatchupState, string> = {
  leading: "text-green-400",
  level: "text-amber-300",
  trailing: "text-white/50",
};

const STATE_LABEL: Record<MatchupState, { live: string; final: string }> = {
  leading: { live: "Leading", final: "Won" },
  level: { live: "Level", final: "Drew" },
  trailing: { live: "Trailing", final: "Lost" },
};

function Side({
  side,
  state,
  align,
  live,
  gw,
}: {
  side: H2HSide;
  state: MatchupState;
  align: "left" | "right";
  live: boolean;
  gw: number;
}) {
  const chip = side.activeChip ? CHIP_STYLE[side.activeChip] : undefined;
  const right = align === "right";

  const body = (
    <div className={cn("min-w-0 flex-1", right && "text-right")}>
      <div className="font-semibold text-sm text-white truncate leading-tight">{side.entryName}</div>
      <div className="text-xs text-white/60 truncate leading-tight">
        {side.playerName}
        {side.rank !== null && <span className="text-white/40"> · #{side.rank}</span>}
      </div>
      <div className={cn("mt-1 flex items-center gap-1.5 flex-wrap", right && "justify-end")}>
        {side.captain && (
          <span className="text-xs text-yellow-400 flex items-center leading-tight">
            <Star className="h-2.5 w-2.5 mr-0.5 fill-yellow-400 shrink-0" />
            <span className="truncate font-medium">{side.captain}</span>
          </span>
        )}
        {chip && <ChipBadge abbr={chip.abbr} label={chip.label} color={chip.color} />}
        {live && side.entry !== null && (
          <span className="text-xs text-white/40 leading-tight">{side.playersToStart} to play</span>
        )}
      </div>
    </div>
  );

  const score = (
    <div className={cn("shrink-0 text-2xl font-bold tabular-nums leading-none", STATE_TEXT[state])}>
      {formatPoints(side.points)}
    </div>
  );

  const content = (
    <div className={cn("flex items-center gap-3", right && "flex-row-reverse")}>
      {body}
      {score}
    </div>
  );

  if (side.entry === null) {
    return <div className="flex-1 min-w-0">{content}</div>;
  }

  return (
    <Link
      href={`/team/${side.entry}?gw=${gw}`}
      className="flex-1 min-w-0 rounded-md -m-1 p-1 hover:bg-white/5 transition-colors"
    >
      {content}
    </Link>
  );
}

export function H2HMatchups({ matchups, live, gw }: { matchups: H2HMatchup[]; live: boolean; gw: number }) {
  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-6 px-3 sm:px-6 border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
          <Swords className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
          Gameweek {gw} matchups
          {live && (
            <span className="ml-auto text-xs font-medium text-green-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {matchups.length === 0 ? (
          <p className="text-sm text-white/60 text-center py-6">No matchups for this gameweek.</p>
        ) : (
          <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
            {matchups.map((matchup) => {
              const homeState = sideState(matchup.state, true);
              const awayState = sideState(matchup.state, false);
              return (
                <div
                  key={matchup.id}
                  className="min-w-0 rounded-lg border border-white/10 bg-gray-900/50 px-3 py-2.5 sm:px-4 sm:py-3"
                >
                  <div className="flex items-center gap-3">
                    <Side side={matchup.home} state={homeState} align="left" live={live} gw={gw} />
                    <div className="shrink-0 text-xs font-bold uppercase tracking-wide text-white/30">v</div>
                    <Side side={matchup.away} state={awayState} align="right" live={live} gw={gw} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={STATE_TEXT[homeState]}>
                      {STATE_LABEL[homeState][live ? "live" : "final"]}
                    </span>
                    {matchup.isBye && <span className="text-white/40">bye week</span>}
                    <span className={STATE_TEXT[awayState]}>
                      {STATE_LABEL[awayState][live ? "live" : "final"]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Shared column widths so the header and rows line up at every breakpoint. */
const COL = {
  rank: "w-8 shrink-0",
  /** Phones only: a single "W-D-L" record column. */
  record: "w-14 shrink-0 sm:hidden",
  /** Tablets and up: one column per counter. */
  stat: "hidden sm:block w-8 md:w-10 shrink-0",
  pf: "hidden sm:block w-14 md:w-16 shrink-0",
  pts: "w-11 sm:w-12 shrink-0",
} as const;

export function H2HTable({ rows }: { rows: H2HTableRow[] }) {
  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-6 px-3 sm:px-6 border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
          H2H table
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 sm:px-6 py-0 sm:py-6">
        <div className="text-white text-sm sm:rounded-lg overflow-hidden sm:border border-white/10">
          <div className="flex font-bold text-gray-300 px-3 py-2 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900 text-xs">
            <div className={cn(COL.rank, "text-center")}>#</div>
            <div className="flex-1 min-w-0 ml-1">Team</div>
            <div className={cn(COL.record, "text-center")}>W-D-L</div>
            <div className={cn(COL.stat, "text-center")}>P</div>
            <div className={cn(COL.stat, "text-center")}>W</div>
            <div className={cn(COL.stat, "text-center")}>D</div>
            <div className={cn(COL.stat, "text-center")}>L</div>
            <div className={cn(COL.pf, "text-right")}>PF</div>
            <div className={cn(COL.pts, "text-right")}>Pts</div>
          </div>
          {rows.length === 0 && (
            <p className="text-sm text-white/60 text-center py-6">No table yet.</p>
          )}
          {rows.map((row, index) => {
            const isFirst = row.rank === 1;
            const isLast = row.rank === rows.length && rows.length > 1;
            const moved = row.lastRank !== row.rank;
            const movedUp = row.lastRank > row.rank;
            const inner = (
              <>
                <div className={cn(COL.rank, "flex flex-col items-center justify-center")}>
                  <span className={cn("font-bold tabular-nums", isFirst && "text-yellow-400", isLast && "text-red-400")}>
                    {row.rank}
                  </span>
                  {moved && (
                    <span
                      aria-label={movedUp ? "Moved up" : "Moved down"}
                      className={cn("text-xs leading-none", movedUp ? "text-emerald-500" : "text-red-500")}
                    >
                      {movedUp ? "▲" : "▼"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 ml-1">
                  <div className="font-semibold truncate leading-tight">{row.entryName}</div>
                  <div className="flex items-center gap-1.5 text-xs text-white/60 leading-tight">
                    <span className="truncate">{row.playerName}</span>
                    {/* PF has no column on phones, so it rides along the manager line. */}
                    <span className="sm:hidden shrink-0 text-white/40 tabular-nums">
                      PF {formatPoints(row.pointsFor)}
                    </span>
                  </div>
                </div>

                {/* Phones: one record column, with games played underneath. */}
                <div className={cn(COL.record, "flex flex-col items-center justify-center")}>
                  <span className="tabular-nums text-xs font-semibold leading-tight">
                    <span className="text-green-400">{row.won}</span>
                    <span className="text-white/30">-</span>
                    <span className="text-amber-300">{row.drawn}</span>
                    <span className="text-white/30">-</span>
                    <span className="text-red-400">{row.lost}</span>
                  </span>
                  <span className="text-[10px] text-white/40 tabular-nums leading-tight">P {row.played}</span>
                </div>

                {/* Tablets and up: the full breakdown. */}
                <div className={cn(COL.stat, "text-center tabular-nums text-white/70")}>{row.played}</div>
                <div className={cn(COL.stat, "text-center tabular-nums text-green-400")}>{row.won}</div>
                <div className={cn(COL.stat, "text-center tabular-nums text-amber-300")}>{row.drawn}</div>
                <div className={cn(COL.stat, "text-center tabular-nums text-red-400")}>{row.lost}</div>
                <div className={cn(COL.pf, "text-right tabular-nums text-white/70")}>{formatPoints(row.pointsFor)}</div>
                <div className={cn(COL.pts, "text-right font-bold tabular-nums")}>{row.total}</div>
              </>
            );
            const className = cn(
              "flex items-center px-3 py-2 border-b border-white/5 last:border-b-0 transition-colors hover:bg-purple-900/20",
              index % 2 === 0 ? "bg-gray-800/50" : "bg-gray-900/50",
              isFirst && "bg-gradient-to-r from-yellow-900/20 to-transparent",
              isLast && "bg-gradient-to-r from-red-900/20 to-transparent"
            );
            return row.entry !== null ? (
              <Link key={row.rank} href={`/team/${row.entry}`} className={className}>
                {inner}
              </Link>
            ) : (
              <div key={row.rank} className={className}>
                {inner}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
