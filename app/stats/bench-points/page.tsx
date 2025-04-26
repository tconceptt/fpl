import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Medal, TrendingDown, TrendingUp } from "lucide-react";
import { getStatsData } from "../getStatData";
import { formatPoints } from "@/lib/fpl";
import Link from "next/link";

interface BenchStats {
  id: number;
  name: string;
  managerName: string;
  benchPoints: number;
}

function BenchPointsCard({ team, rank, finishedGameweeks, totalTeams }: { team: BenchStats; rank: number; finishedGameweeks: number; totalTeams: number; }) {
  return (
    <div className="bg-white/5 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">{rank}</span>
        <div className="text-right">
          {rank === 1 ? (
            <TrendingUp className="ml-auto h-4 w-4 text-emerald-500" />
          ) : rank === totalTeams ? (
            <TrendingDown className="ml-auto h-4 w-4 text-red-500" />
          ) : null}
        </div>
      </div>
      <div>
        <div className="font-medium">{team.name}</div>
        <div className="text-sm text-white/60">{team.managerName}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded p-2">
          <div className="text-sm text-white/60">Total</div>
          <div className="font-bold">{formatPoints(team.benchPoints)}</div>
        </div>
        <div className="bg-white/5 rounded p-2">
          <div className="text-sm text-white/60">Per GW</div>
          <div className="font-bold">{formatPoints(Math.round(team.benchPoints / finishedGameweeks))}</div>
        </div>
      </div>
    </div>
  );
}

export default async function BenchPointsPage() {
  const data = await getStatsData();

  return (
    <DashboardLayout>
      <PageHeader
        title="Bench Points"
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
            <Medal className="h-5 w-5 text-blue-500" />
            Points on Bench
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="space-y-3 sm:hidden">
            {data.benchStats.map((team: BenchStats, index: number) => (
              <BenchPointsCard
                key={team.id}
                team={team}
                rank={index + 1}
                finishedGameweeks={data.finishedGameweeks}
                totalTeams={data.benchStats.length}
              />
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="w-12 text-white/60">Rank</TableHead>
                  <TableHead className="text-white/60">Team</TableHead>
                  <TableHead className="text-right text-white/60">Total</TableHead>
                  <TableHead className="text-right text-white/60">Per GW</TableHead>
                  <TableHead className="text-right text-white/60">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.benchStats.map((team: BenchStats, index: number) => (
                  <TableRow key={team.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-white/60">{team.managerName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatPoints(team.benchPoints)}</TableCell>
                    <TableCell className="text-right">
                      {formatPoints(Math.round(team.benchPoints / data.finishedGameweeks))}
                    </TableCell>
                    <TableCell className="text-right">
                      {index === 0 ? (
                        <TrendingUp className="ml-auto h-4 w-4 text-emerald-500" />
                      ) : index === data.benchStats.length - 1 ? (
                        <TrendingDown className="ml-auto h-4 w-4 text-red-500" />
                      ) : null}
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