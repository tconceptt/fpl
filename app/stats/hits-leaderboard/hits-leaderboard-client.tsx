"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ManagerIdentity } from "@/components/ui/manager-identity";
import { RowLink } from "@/components/stats/row-link";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/fpl";

interface HitsStats {
  id: number;
  name: string;
  managerName: string;
  gameweeksWithHits: number;
  totalTransferCost: number;
  totalTransfers: number;
  gameweekHits: Array<{
    gameweek: number;
    transfers: number;
    cost: number;
  }>;
}

interface HitsLeaderboardClientProps {
  hitsStats: HitsStats[];
}

type SortOption = "cost" | "transfers";

export function HitsLeaderboardClient({ hitsStats }: HitsLeaderboardClientProps) {
  const [sortBy, setSortBy] = useState<SortOption>("cost");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sortedHitsStats = [...hitsStats].sort((a, b) =>
    sortBy === "transfers" ? b.totalTransfers - a.totalTransfers : b.totalTransferCost - a.totalTransferCost
  );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-end gap-2 border-b border-border px-4 py-3 sm:px-5">
          <Button variant={sortBy === "cost" ? "primary" : "secondary"} size="sm" onClick={() => setSortBy("cost")}>
            Sort by cost
          </Button>
          <Button
            variant={sortBy === "transfers" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setSortBy("transfers")}
          >
            Sort by transfers
          </Button>
        </div>
        {sortedHitsStats.length === 0 ? (
          <EmptyState title="No hits taken" description="No manager has taken a transfer hit yet." />
        ) : (
          <Table>
            <caption className="sr-only">Transfer hits taken</caption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="hidden text-right sm:table-cell">GWs</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Transfers</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="w-10" aria-hidden />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedHitsStats.map((team, index) => {
                const isOpen = expanded.has(team.id);
                return (
                  <Fragment key={team.id}>
                    <TableRow className="relative">
                      <TableCell className="font-semibold tabular-nums text-fg">{index + 1}</TableCell>
                      <TableCell className="min-w-0">
                        <ManagerIdentity entryName={team.name} playerName={team.managerName} />
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">{team.gameweeksWithHits}</TableCell>
                      <TableCell className="hidden text-right sm:table-cell">{team.totalTransfers}</TableCell>
                      <TableCell className="text-right font-semibold text-fg">
                        <RowLink href={`/team/${team.id}`} label={`${team.name} team page`} />
                        {formatPoints(team.totalTransferCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => toggle(team.id)}
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? "Hide" : "Show"} hit breakdown for ${team.name}`}
                          className="relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                        >
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                        </button>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-surface-2 p-0">
                          {team.gameweekHits.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-fg-3 sm:px-5">No hits taken.</div>
                          ) : (
                            <div className="divide-y divide-border px-4 sm:px-5">
                              {team.gameweekHits.map((hit) => (
                                <div key={hit.gameweek} className="flex items-center justify-between gap-3 py-2 text-xs">
                                  <span className="text-fg-2">GW {hit.gameweek}</span>
                                  <span className="text-fg-3">{hit.transfers} transfers</span>
                                  <span className="font-semibold tabular-nums text-negative">
                                    -{formatPoints(hit.cost)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
