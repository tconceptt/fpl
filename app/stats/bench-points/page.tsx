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
      <Card className="border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-gray-800 to-gray-900">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
            <Medal className="h-5 w-5 text-blue-500" />
            Points on Bench
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 py-0 sm:py-6">
          {/* Mobile View - Compact Table */}
          <div className="sm:hidden text-white text-xs rounded-lg overflow-hidden border border-white/10">
            {/* Header */}
            <div className="flex font-bold text-gray-300 px-2 py-1.5 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900 text-[10.5px]">
              <div className="w-8 text-center">#</div>
              <div className="flex-1">Team</div>
              <div className="w-14 text-right">Total</div>
              <div className="w-12 text-right">Per GW</div>
            </div>
            {/* Rows */}
            <div className="overflow-y-auto">
              {data.benchStats.map((team: BenchStats, index: number) => (
                <div
                  key={team.id}
                  className={`flex items-center px-2 py-1.5 border-b border-white/5 ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50'}`}
                >
                  <div className="w-8 flex items-center justify-center">
                    <span className="font-bold text-[10.5px]">
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
                  </div>
                  <div className="w-14 text-right font-bold text-[11.5px] text-white">
                    {formatPoints(team.benchPoints)}
                  </div>
                  <div className="w-12 text-right font-semibold text-[10.5px] text-white/80">
                    {formatPoints(Math.round(team.benchPoints / data.finishedGameweeks))}
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
                  <TableHead className="text-right text-gray-300 font-bold">Total</TableHead>
                  <TableHead className="text-right text-gray-300 font-bold">Per GW</TableHead>
                  <TableHead className="text-right text-gray-300 font-bold">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.benchStats.map((team: BenchStats, index: number) => (
                  <TableRow key={team.id} className={`border-white/5 transition-all ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50'} hover:bg-purple-900/20`}>
                    <TableCell className="font-bold py-3">{index + 1}</TableCell>
                    <TableCell className="py-3">
                      <div>
                        <div className="font-medium text-white">{team.name}</div>
                        <div className="text-sm text-white/60">{team.managerName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold py-3 text-white">{formatPoints(team.benchPoints)}</TableCell>
                    <TableCell className="text-right py-3 text-white/80">
                      {formatPoints(Math.round(team.benchPoints / data.finishedGameweeks))}
                    </TableCell>
                    <TableCell className="text-right py-3">
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