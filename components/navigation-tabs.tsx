'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUp, Trophy, TrendingUp, Users, Frown } from "lucide-react"
import { formatPoints } from "@/lib/fpl"
import type { TeamWithGameweek } from "@/lib/fpl"

interface NavigationTabsProps {
  leagueLeader: TeamWithGameweek
  standings: TeamWithGameweek[]
  stats: {
    highestGameweek: {
      score: number
      team: string
    }
    lastPlace: TeamWithGameweek
    totalPlayers: number
  }
}

export function NavigationTabs({ leagueLeader, standings, stats }: NavigationTabsProps) {
  const router = useRouter()

  return (
    <Tabs 
      defaultValue="standings" 
      className="space-y-6"
      onValueChange={(value) => {
        if (value === "gameweek") {
          router.push("/gameweek")
        }
      }}
    >
      <TabsList className="bg-white/5 border border-white/10">
        <TabsTrigger value="standings">Standings</TabsTrigger>
        <TabsTrigger value="gameweek">Gameweek</TabsTrigger>
        <TabsTrigger value="stats">Stats</TabsTrigger>
        <TabsTrigger value="head2head">Head to Head</TabsTrigger>
      </TabsList>

      <TabsContent value="standings" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">League Leader</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-yellow-500">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback>{leagueLeader.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-lg">{leagueLeader.name}</div>
                  <div className="text-white/60">{formatPoints(leagueLeader.total)} points</div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Highest Gameweek</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.highestGameweek.score} points</div>
              <p className="text-white/60">{stats.highestGameweek.team}</p>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Kitawrari</CardTitle>
              <Frown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stats.lastPlace.name} 😢</div>
              <p className="text-white/60">{formatPoints(stats.lastPlace.total)} points</p>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500 to-red-600" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Players</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPlayers}</div>
              <p className="text-white/60">Active managers</p>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>League Standings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="w-12 text-white/60">Rank</TableHead>
                  <TableHead className="text-white/60">Team</TableHead>
                  <TableHead className="text-right text-white/60">GW</TableHead>
                  <TableHead className="text-right text-white/60">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((team) => (
                  <TableRow key={team.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {team.movement === "up" ? (
                          <ArrowUp className="h-4 w-4 text-emerald-500" />
                        ) : team.movement === "down" ? (
                          <ArrowUp className="h-4 w-4 rotate-180 text-red-500" />
                        ) : (
                          <span className="text-white/20">-</span>
                        )}
                        {team.rank}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-white/10">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback>{team.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{team.gameweek}</TableCell>
                    <TableCell className="text-right font-medium">{formatPoints(team.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
} 