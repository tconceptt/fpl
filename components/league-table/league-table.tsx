"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownUp, ChevronDown, ChevronUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RankCell } from "@/components/ui/rank-cell";
import { ManagerIdentity } from "@/components/ui/manager-identity";
import { LivePill } from "@/components/ui/live-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useLeague, type LeagueApiResponse } from "@/hooks/use-league";
import { formatPoints } from "@/lib/fpl";
import { cn } from "@/lib/utils";

interface LeagueTableProps {
  initial: LeagueApiResponse;
  className?: string;
}

type SortMode = "rank" | "gw";

/**
 * The league page's header (PageHeader) and standings table live in one
 * client component rather than being split across the server/Suspense
 * boundary: the gameweek selector's onChange is wired to `useLeague.setGw`,
 * and that state only exists inside this client boundary. The server page
 * (app/page.tsx) still streams the whole thing behind a Suspense fallback
 * that mirrors this shape (league-table-skeleton.tsx).
 */
export function LeagueTable({ initial, className }: LeagueTableProps) {
  const [sortMode, setSortMode] = React.useState<SortMode>("rank");
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const { data, gw, setGw, loading, error } = useLeague(initial);
  const { standings, currentGameweek, leagueName, liveState } = data;
  const isLive = liveState === "live";

  const rows = React.useMemo(() => {
    if (sortMode !== "gw") {
      return standings.map((team) => ({ ...team, displayRank: team.rank }));
    }
    return [...standings]
      .sort((a, b) => {
        const aPts = a.net_points ?? a.event_total;
        const bPts = b.net_points ?? b.event_total;
        return bPts - aPts;
      })
      .map((team, index) => ({ ...team, displayRank: index + 1 }));
  }, [standings, sortMode]);

  return (
    <div className={cn("flex flex-col gap-4 sm:gap-6", className)}>
      <PageHeader
        title="League"
        description={leagueName}
        currentGameweek={currentGameweek}
        selectedGameweek={gw}
        onGameweekChange={setGw}
        actions={
          isLive ? (
            <LivePill />
          ) : (
            <span className="text-xs text-fg-3">Final</span>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
          <div className="flex shrink-0 items-center gap-3">
            {loading && <span className="text-xs text-fg-3">Updating…</span>}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-pressed={sortMode === "gw"}
              onClick={() => setSortMode((m) => (m === "gw" ? "rank" : "gw"))}
              className="gap-1.5"
            >
              <ArrowDownUp className="h-4 w-4" />
              {sortMode === "gw" ? "GW" : "Total"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="border-b border-border bg-negative-soft px-4 py-2 text-xs text-negative sm:px-5">
              {error}
            </div>
          )}

          {rows.length === 0 ? (
            <EmptyState
              title="No standings yet"
              description="Standings will appear once the first gameweek is underway."
            />
          ) : (
            <Table>
              <caption className="sr-only">
                League standings for gameweek {gw}
              </caption>
              <TableHeader className="sticky top-0 z-10 bg-surface-2 md:top-14">
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Team</TableHead>
                  {isLive && (
                    <TableHead className="hidden w-20 text-right leading-tight sm:table-cell">
                      To start
                    </TableHead>
                  )}
                  <TableHead className="w-16 text-right">GW</TableHead>
                  <TableHead className="w-16 text-right">Total</TableHead>
                  <TableHead className="w-8 p-0 sm:hidden">
                    <span className="sr-only">Details</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody
                className={cn(
                  "transition-opacity",
                  loading && "opacity-60"
                )}
              >
                {rows.map((team) => {
                  const net = team.net_points ?? team.event_total;
                  const hasHit =
                    team.net_points !== null && team.net_points !== team.event_total;
                  const isExpanded = expandedId === team.entry;
                  const isLast = team.displayRank === rows.length;

                  return (
                    <React.Fragment key={team.entry}>
                      <TableRow className="relative">
                        <TableCell>
                          {/* Full-row link overlay: absolutely positioned
                              against this <tr> (which is `relative`), so the
                              whole row is a real, single <Link> — not a
                              <button> wrapping other interactive elements.
                              Anything meant to stay independently clickable
                              (the chip badge, the mobile expand toggle)
                              gets its own `relative z-10` stacking context
                              below, which paints above this z-0 link. */}
                          <Link
                            href={`/team/${team.entry}?gw=${gw}`}
                            aria-label={`Open ${team.entry_name}`}
                            className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          />
                          <RankCell
                            rank={team.displayRank}
                            lastRank={sortMode === "rank" ? team.last_rank : undefined}
                            label={isLast ? "Eyosi" : undefined}
                            total={rows.length}
                          />
                        </TableCell>
                        <TableCell className="min-w-0">
                          <div className="relative z-10 min-w-0">
                            <ManagerIdentity
                              entryName={team.entry_name}
                              playerName={team.player_name}
                              captain={team.captain_name}
                              chip={team.active_chip}
                            />
                          </div>
                        </TableCell>
                        {isLive && (
                          <TableCell className="hidden text-right sm:table-cell">
                            {team.playersToStart}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <span className="font-medium">{formatPoints(net)}</span>
                          {hasHit && (
                            <span className="ml-1 text-xs text-fg-3">
                              ({formatPoints(team.event_total)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPoints(team.total_points)}
                        </TableCell>
                        <TableCell className="p-0 text-right sm:hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : team.entry)
                            }
                            aria-expanded={isExpanded}
                            aria-label={
                              isExpanded
                                ? `Hide details for ${team.entry_name}`
                                : `Show details for ${team.entry_name}`
                            }
                            className="relative z-10 flex h-10 w-10 items-center justify-center text-fg-3 transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-surface-2 sm:hidden">
                          <TableCell colSpan={5} className="py-3">
                            <dl className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <dt className="text-fg-3">Gross / net</dt>
                                <dd className="mt-0.5 tabular-nums text-fg">
                                  {formatPoints(team.event_total)} / {formatPoints(net)}
                                  {hasHit && (
                                    <span className="ml-1 text-negative">
                                      (-{formatPoints(team.transfer_cost)})
                                    </span>
                                  )}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-fg-3">Players to start</dt>
                                <dd className="mt-0.5 tabular-nums text-fg">
                                  {team.playersToStart}
                                </dd>
                              </div>
                            </dl>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
