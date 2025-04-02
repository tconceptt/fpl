import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatPoints } from "@/lib/fpl"
import { Medal, TrendingDown, TrendingUp, Trophy, Wand2 } from "lucide-react"
import { getStatsData } from "./getStatData"
import { ReactNode } from "react"

// StatsCard component for reusability
interface StatsCardProps {
  title: string;
  icon: ReactNode;
  value: string | number;
  label: string;
  sublabel: string;
  bgColorClass: string;
  gradientFromClass: string;
  gradientToClass: string;
}

function StatsCard({
  title, 
  icon,
  value,
  label,
  sublabel,
  bgColorClass,
  gradientFromClass,
  gradientToClass
}: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${bgColorClass} text-2xl font-bold`}>
            {value}
          </div>
          <div>
            <div className="font-bold text-lg">{label}</div>
            <div className="text-white/60">{sublabel}</div>
          </div>
        </div>
      </CardContent>
      <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${gradientFromClass} ${gradientToClass}`} />
    </Card>
  )
}

export default async function StatsPage() {
  const data = await getStatsData()

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Stats & Records"
          description={`After ${data.finishedGameweeks} completed gameweeks`}
          currentGameweek={data.finishedGameweeks}
          selectedGameweek={data.finishedGameweeks}
          showGameweekSelector={false}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Most Wins"
            icon={<Trophy className="h-4 w-4 text-yellow-500" />}
            value={data.stats[0]?.wins}
            label={data.stats[0]?.name}
            sublabel={data.stats[0]?.managerName}
            bgColorClass="bg-yellow-500/10"
            gradientFromClass="from-yellow-500"
            gradientToClass="to-yellow-600"
          />

          <StatsCard
            title="Most Chips Used"
            icon={<Wand2 className="h-4 w-4 text-purple-500" />}
            value={data.chipStats[0]?.totalChipsUsed}
            label={data.chipStats[0]?.name}
            sublabel={data.chipStats[0]?.managerName}
            bgColorClass="bg-purple-500/10"
            gradientFromClass="from-purple-500"
            gradientToClass="to-purple-600"
          />

          <StatsCard
            title="Most Points on Bench"
            icon={<Medal className="h-4 w-4 text-blue-500" />}
            value={formatPoints(data.benchStats[0]?.benchPoints)}
            label={data.benchStats[0]?.name}
            sublabel={data.benchStats[0]?.managerName}
            bgColorClass="bg-blue-500/10"
            gradientFromClass="from-blue-500"
            gradientToClass="to-blue-600"
          />
        </div>

        <div className="space-y-6">
          <Tabs defaultValue="gameweek-winners" className="w-full">
            <TabsList className="w-full h-11 p-1 bg-white/5 border border-white/10 rounded-lg">
              <TabsTrigger 
                value="gameweek-winners"
                className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span>Gameweek Winners</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="chips-usage"
                className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all"
              >
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-purple-500" />
                  <span>Chips Usage</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="bench-points"
                className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all"
              >
                <div className="flex items-center gap-2">
                  <Medal className="h-4 w-4 text-blue-500" />
                  <span>Bench Points</span>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gameweek-winners">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Gameweek Winners
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
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
            </TabsContent>

            <TabsContent value="chips-usage">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wand2 className="h-5 w-5 text-purple-500" />
                    Chips Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
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
            </TabsContent>

            <TabsContent value="bench-points">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Medal className="h-5 w-5 text-blue-500" />
                    Points on Bench
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
} 