import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { getStatsData } from "../getStatData";
import { formatPoints } from "@/lib/fpl";
import Link from "next/link";

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

function GameweekWinnerCard({ team, rank }: { team: TeamStats; rank: number }) {
  return (
    <div className="bg-white/5 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {rank === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
          <span className="text-sm text-white/60">{rank}</span>
        </div>
        <span className="text-lg font-bold">{team.wins} wins</span>
      </div>
      <div>
        <div className="font-medium">{team.name}</div>
        <div className="text-sm text-white/60">{team.managerName}</div>
      </div>
      <div className="flex flex-wrap gap-1">
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
    </div>
  );
}

export default async function GameweekWinnersPage() {
  const data = await getStatsData();

  return (
    <DashboardLayout>
      <PageHeader
        title="Gameweek Winners"
        description={`After ${data.finishedGameweeks} completed gameweeks`}
        currentGameweek={data.finishedGameweeks}
        selectedGameweek={data.finishedGameweeks}
        showGameweekSelector={false}
      />
      <div className="mb-6">
        <Link href="/stats" className="text-sm text-blue-400 hover:underline">← Back to Stats</Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Gameweek Winners
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="space-y-3 sm:hidden">
            {data.stats.map((team: TeamStats, index: number) => (
              <GameweekWinnerCard key={team.id} team={team} rank={index + 1} />
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="w-12 text-white/60">Rank</TableHead>
                  <TableHead className="text-white/60">Team</TableHead>
                  <TableHead className="text-right text-white/60">Wins</TableHead>
                  <TableHead className="text-right text-white/60">Gameweeks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.stats.map((team: TeamStats, index: number) => (
                  <TableRow key={team.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium">
                      {index === 0 ? (
                        <div className="flex items-center gap-2">
                          {index + 1}
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        </div>
                      ) : (
                        index + 1
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-white/60">{team.managerName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">{team.wins}</TableCell>
                    <TableCell>
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
    </DashboardLayout>
  );
} 