import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUp, Trophy, TrendingUp, Users, Frown } from "lucide-react"
import { calculateMovement, formatPoints } from "@/lib/fpl"

interface LeagueTeam {
  entry: number
  entry_name: string
  player_name: string
  rank: number
  last_rank: number
  total: number
  event_total: number
}

interface TeamWithGameweek extends Omit<LeagueTeam, 'entry_name' | 'player_name'> {
  id: number
  name: string
  playerName: string
  gameweek: number
  movement: "up" | "down" | "none"
}

async function getLeagueData() {
  const [leagueResponse, gameweekResponse] = await Promise.all([
    fetch('http://localhost:3000/api/fpl/league', { next: { revalidate: 300 } }),
    fetch('http://localhost:3000/api/fpl/gameweek/current', { next: { revalidate: 300 } })
  ])

  if (!leagueResponse.ok || !gameweekResponse.ok) {
    throw new Error('Failed to fetch data')
  }

  const [leagueData, gameweekData] = await Promise.all([
    leagueResponse.json(),
    gameweekResponse.json()
  ])

  const standings: TeamWithGameweek[] = leagueData.standings.results.map((team: LeagueTeam) => ({
    id: team.entry,
    rank: team.rank,
    name: team.entry_name,
    playerName: team.player_name,
    gameweek: team.event_total,
    total: team.total,
    movement: calculateMovement(team.rank, team.last_rank),
    ...team
  }))

  // Find the highest gameweek score from all teams
  const highestGameweek = standings.reduce((highest, team) => (
    team.event_total > highest.score ? 
    { score: team.event_total, team: team.name } : 
    highest
  ), { score: 0, team: '' })

  // Get the last place team (highest rank number)
  const lastPlace = standings[standings.length - 1]

  return {
    leagueName: leagueData.league.name,
    currentGameweek: gameweekData.currentGameweek,
    standings,
    stats: {
      highestGameweek,
      lastPlace,
      totalPlayers: standings.length
    }
  }
}

export default async function Page() {
  const data = await getLeagueData()
  const leagueLeader = data.standings[0]

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="relative h-[200px] bg-[#4A8B8C] text-white">
        <div className="container h-full px-4">
          <div className="flex h-full flex-col justify-center gap-2">
            <h1 className="text-3xl font-bold">{data.leagueName}</h1>
            <p className="text-teal-100">2023/24 Mini-League • Gameweek {data.currentGameweek}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50/50 to-transparent" />
      </div>

      <div className="container px-4 py-8">
        <Tabs defaultValue="standings" className="space-y-8">
          <TabsList className="bg-white">
            <TabsTrigger value="standings">Standings</TabsTrigger>
            <TabsTrigger value="gameweek">Gameweek</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="head2head">Head to Head</TabsTrigger>
          </TabsList>

          <TabsContent value="standings" className="space-y-8">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">League Leader</CardTitle>
                  <Trophy className="h-4 w-4 text-[#4A8B8C]" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src="/placeholder.svg" />
                      <AvatarFallback>{leagueLeader.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold">{leagueLeader.name}</div>
                      <div className="text-sm text-muted-foreground">{formatPoints(leagueLeader.total)} points</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Highest Gameweek</CardTitle>
                  <TrendingUp className="h-4 w-4 text-[#4A8B8C]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.stats.highestGameweek.score} points</div>
                  <p className="text-xs text-muted-foreground">{data.stats.highestGameweek.team}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Kitawrari</CardTitle>
                  <Frown className="h-4 w-4 text-[#4A8B8C]" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{data.stats.lastPlace.name} 😢</div>
                  <p className="text-xs text-muted-foreground">{formatPoints(data.stats.lastPlace.total)} points</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Players</CardTitle>
                  <Users className="h-4 w-4 text-[#4A8B8C]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.stats.totalPlayers}</div>
                  <p className="text-xs text-muted-foreground">Active managers</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>League Standings</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">GW</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.standings.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">
                          {team.movement === "up" ? (
                            <ArrowUp className="h-4 w-4 text-green-500" />
                          ) : team.movement === "down" ? (
                            <ArrowUp className="h-4 w-4 rotate-180 text-red-500" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                          {team.rank}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="/placeholder.svg" />
                              <AvatarFallback>{team.name[0]}</AvatarFallback>
                            </Avatar>
                            {team.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{team.gameweek}</TableCell>
                        <TableCell className="text-right">{formatPoints(team.total)}</TableCell>
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
  )
}

