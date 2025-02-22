import { formatPoints } from "@/lib/fpl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { NavigationTabs } from "../components/navigation-tabs"
import { Trophy, Wand2, Medal, TrendingUp, TrendingDown } from "lucide-react"

interface TeamData {
  id: number
  name: string
  managerName: string
}

interface TeamHistory {
  current: Array<{
    event: number
    points: number
    points_on_bench: number
  }>
  chips: Array<{
    name: string
    event: number
  }>
}

interface StandingsResult {
  entry: number
  entry_name: string
  player_name: string
  event_total: number
  total: number
  rank: number
  last_rank: number
}

interface TeamStats {
  id: number
  name: string
  managerName: string
  wins: number
  totalPoints: number
  benchPoints: number
  bestGameweek: {
    gameweek: number
    points: number
  }
  gameweekWins: Array<{
    gameweek: number
    teamId: number
    teamName: string
    managerName: string
    points: number
  }>
}

interface ChipUsage {
  id: number
  name: string
  managerName: string
  totalChipsUsed: number
  chips: Array<{
    name: string
    gameweek: number
  }>
}

async function getStatsData() {
  try {
    // Fetch league standings and bootstrap data
    const [leagueData, bootstrapData] = await Promise.all([
      fetch(`https://fantasy.premierleague.com/api/leagues-classic/${process.env.FPL_LEAGUE_ID}/standings/`),
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/')
    ])

    if (!leagueData.ok || !bootstrapData.ok) {
      throw new Error('Failed to fetch data')
    }

    const { standings } = await leagueData.json()
    const { events } = await bootstrapData.json()

    // Get finished gameweeks
    const finishedGameweeks = events
      .filter((event: { finished: boolean }) => event.finished)
      .map((event: { id: number }) => event.id)

    // Extract team data
    const teams: TeamData[] = standings.results.map((result: StandingsResult) => ({
      id: result.entry,
      name: result.entry_name,
      managerName: result.player_name
    }))

    // Fetch history for all teams
    const teamHistories = new Map<number, TeamHistory>()
    await Promise.all(
      teams.map(async (team) => {
        const response = await fetch(`https://fantasy.premierleague.com/api/entry/${team.id}/history/`)
        if (response.ok) {
          const data = await response.json()
          teamHistories.set(team.id, {
            current: data.current || [],
            chips: data.chips || []
          })
        }
      })
    )

    // Initialize team stats and chip usage maps
    const teamStatsMap = new Map<number, TeamStats>()
    const chipUsageMap = new Map<number, ChipUsage>()
    
    teams.forEach((team: TeamData) => {
      teamStatsMap.set(team.id, {
        id: team.id,
        name: team.name,
        managerName: team.managerName,
        wins: 0,
        totalPoints: 0,
        benchPoints: 0,
        bestGameweek: {
          gameweek: 0,
          points: 0
        },
        gameweekWins: []
      })
      
      chipUsageMap.set(team.id, {
        id: team.id,
        name: team.name,
        managerName: team.managerName,
        totalChipsUsed: 0,
        chips: []
      })
    })

    // Process chips usage
    teams.forEach(team => {
      const history = teamHistories.get(team.id)
      if (!history) return

      const chipUsage = chipUsageMap.get(team.id)
      if (!chipUsage) return

      // Get chips from history and process them
      const validChips = history.chips
        .map(chip => ({
          name: chip.name === 'wildcard' ? 'Wildcard' :
                chip.name === '3xc' ? 'Triple Captain' :
                chip.name === 'bboost' ? 'Bench Boost' :
                chip.name === 'freehit' ? 'Free Hit' :
                chip.name === 'manager' ? 'Manager' :
                chip.name === 'assistant_manager' ? 'Assistant Manager' : chip.name,
          gameweek: chip.event
        }))
        .sort((a, b) => a.gameweek - b.gameweek)

      chipUsage.chips = validChips
      chipUsage.totalChipsUsed = validChips.length
    })

    // Process each finished gameweek
    finishedGameweeks.forEach((gameweek: number) => {
      let highestPoints = 0
      let winners: { id: number; points: number }[] = []

      // Find highest points for the gameweek
      teams.forEach(team => {
        const history = teamHistories.get(team.id)
        if (!history) return

        const gameweekData = history.current.find(gw => gw.event === gameweek)
        if (!gameweekData) return

        const points = gameweekData.points
        const teamStats = teamStatsMap.get(team.id)
        if (!teamStats) return

        // Update team's total points, bench points, and best gameweek
        teamStats.totalPoints += points
        teamStats.benchPoints += gameweekData.points_on_bench || 0
        if (points > teamStats.bestGameweek.points) {
          teamStats.bestGameweek = { gameweek, points }
        }

        // Track highest points and winners
        if (points > highestPoints) {
          highestPoints = points
          winners = [{ id: team.id, points }]
        } else if (points === highestPoints) {
          winners.push({ id: team.id, points })
        }
      })

      // Award wins to all teams that tied for highest points
      winners.forEach(winner => {
        const teamStats = teamStatsMap.get(winner.id)
        if (!teamStats) return

        teamStats.wins++
        teamStats.gameweekWins.push({
          gameweek,
          teamId: teamStats.id,
          teamName: teamStats.name,
          managerName: teamStats.managerName,
          points: winner.points
        })
      })
    })

    // Convert maps to arrays and sort
    const stats = Array.from(teamStatsMap.values())
      .sort((a, b) => b.wins - a.wins || b.totalPoints - a.totalPoints)

    const chipStats = Array.from(chipUsageMap.values())
      .sort((a, b) => b.totalChipsUsed - a.totalChipsUsed)

    const benchStats = Array.from(teamStatsMap.values())
      .sort((a, b) => b.benchPoints - a.benchPoints)

    return {
      stats,
      chipStats,
      benchStats,
      finishedGameweeks: finishedGameweeks.length
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
    return {
      stats: [],
      chipStats: [],
      benchStats: [],
      finishedGameweeks: 0
    }
  }
}

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

        <NavigationTabs />

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
                              title={`${formatPoints(win.points)} points`}
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