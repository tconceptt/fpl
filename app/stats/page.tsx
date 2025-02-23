import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPoints } from "@/lib/fpl"
import { Medal, TrendingDown, TrendingUp, Trophy, Wand2 } from "lucide-react"
import { getStatsData } from "./getStatData"

export default async function StatsPage() {
  const data = await getStatsData()

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Stats & Records</h1>
          <p className="text-lg text-white/60">
            After {data.finishedGameweeks} completed gameweeks
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Most Wins</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-2xl font-bold">
                  {data.stats[0]?.wins}
                </div>
                <div>
                  <div className="font-bold text-lg">{data.stats[0]?.name}</div>
                  <div className="text-white/60">{data.stats[0]?.managerName}</div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Most Chips Used</CardTitle>
              <Wand2 className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10 text-2xl font-bold">
                  {data.chipStats[0]?.totalChipsUsed}
                </div>
                <div>
                  <div className="font-bold text-lg">{data.chipStats[0]?.name}</div>
                  <div className="text-white/60">{data.chipStats[0]?.managerName}</div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Most Points on Bench</CardTitle>
              <Medal className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-2xl font-bold">
                  {formatPoints(data.benchStats[0]?.benchPoints)}
                </div>
                <div>
                  <div className="font-bold text-lg">{data.benchStats[0]?.name}</div>
                  <div className="text-white/60">{data.benchStats[0]?.managerName}</div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Gameweek Winners
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  {data.stats.map((team, index) => (
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
                          {team.gameweekWins.map(win => (
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-purple-500" />
                Chips Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="w-12 text-white/60">Rank</TableHead>
                    <TableHead className="text-white/60">Team</TableHead>
                    <TableHead className="text-right text-white/60">Used</TableHead>
                    <TableHead className="text-right text-white/60">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.chipStats.map((team, index) => (
                    <TableRow key={team.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{team.name}</div>
                          <div className="text-sm text-white/60">{team.managerName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">{team.totalChipsUsed}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          {team.chips.map((chip, chipIndex) => (
                            <span
                              key={chipIndex}
                              className="inline-flex items-center rounded bg-white/10 px-2 py-1 text-xs"
                            >
                              <span className="font-semibold text-white/90">{chip.name}</span>
                              <span className="ml-1 text-white/60">(GW{chip.gameweek})</span>
                            </span>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-blue-500" />
              Points on Bench
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                {data.benchStats.map((team, index) => (
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 