"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ManagerIdentity } from "@/components/ui/manager-identity";
import { RankCell } from "@/components/ui/rank-cell";
import { RowLink } from "@/components/stats/row-link";
import { formatPoints } from "@/lib/fpl";
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

interface GameweekWinnerRow extends GameweekWin {
  teamId: number;
  teamName: string;
  managerName: string;
}

type View = "manager" | "gameweek";

export function GameweekWinnersClient({ stats, unresolvedTies }: GameweekWinnersClientProps) {
  const [view, setView] = useState<View>("manager");

  const winnersByGameweek = useMemo<GameweekWinnerRow[]>(() => {
    return stats
      .flatMap((team) =>
        team.gameweekWins.map((win) => ({
          ...win,
          teamId: team.id,
          teamName: team.name,
          managerName: team.managerName,
        }))
      )
      .sort((a, b) => a.gameweek - b.gameweek);
  }, [stats]);

  return (
    <div className="space-y-6">
      {unresolvedTies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-fg-3" />
              Unresolved ties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-fg-2">
              These gameweeks are tied and will resolve once the next gameweek finishes.
            </p>
            {unresolvedTies.map((tie) => (
              <div key={tie.gameweeks.join("-")}>
                <div className="text-xs font-medium text-fg-2">
                  {tie.gameweeks.length === 1
                    ? `Gameweek ${tie.gameweeks[0]}`
                    : `Gameweeks ${tie.gameweeks.join(", ")}`}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {tie.tiedTeams.map((team) => (
                    <span key={team.id} className="text-sm text-fg">
                      {team.name}{" "}
                      <span className="tabular-nums text-fg-3">{formatPoints(team.netPoints)}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button
          variant={view === "manager" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setView("manager")}
        >
          By manager
        </Button>
        <Button
          variant={view === "gameweek" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setView("gameweek")}
        >
          By gameweek
        </Button>
      </div>

      {view === "manager" ? (
        <Card>
          <CardContent className="p-0">
            {stats.length === 0 ? (
              <EmptyState title="No wins yet" description="Wins will show up once a gameweek finishes." />
            ) : (
              <Table>
                <caption className="sr-only">Wins by manager</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Gameweeks</TableHead>
                    <TableHead className="text-right">Wins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((team, index) => (
                    <TableRow key={team.id} className="relative">
                      <TableCell>
                        <RankCell rank={index + 1} total={stats.length} />
                      </TableCell>
                      <TableCell className="min-w-0">
                        <ManagerIdentity entryName={team.name} playerName={team.managerName} />
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">
                        <div className="flex flex-wrap justify-end gap-1">
                          {team.gameweekWins.map((win) => (
                            <span
                              key={win.gameweek}
                              title={`${formatPoints(win.points)} pts (${formatPoints(win.net_points)} net)`}
                              className="inline-flex items-center rounded-sm bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-2"
                            >
                              GW{win.gameweek}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-fg">
                        <RowLink href={`/team/${team.id}`} label={`${team.name} team page`} />
                        {team.wins}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {winnersByGameweek.length === 0 ? (
              <EmptyState title="No gameweeks finished" description="Winners appear once a gameweek is checked." />
            ) : (
              <Table>
                <caption className="sr-only">Winners by gameweek</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">GW</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Net points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {winnersByGameweek.map((win) => (
                    <TableRow key={win.gameweek} className="relative">
                      <TableCell className="font-semibold tabular-nums text-fg">GW{win.gameweek}</TableCell>
                      <TableCell className="min-w-0">
                        <ManagerIdentity entryName={win.teamName} playerName={win.managerName} />
                      </TableCell>
                      <TableCell className="text-right font-semibold text-fg">
                        <RowLink
                          href={`/team/${win.teamId}?gw=${win.gameweek}`}
                          label={`${win.teamName} team page, GW${win.gameweek}`}
                        />
                        {formatPoints(win.net_points)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
