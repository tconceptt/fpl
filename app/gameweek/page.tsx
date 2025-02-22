import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ArrowUp, ArrowDown, Flame, Trophy } from "lucide-react"
import { formatPoints } from "@/lib/fpl"
import type { LeagueTeam } from "@/lib/fpl"
import { NavigationTabs } from "../components/navigation-tabs"

interface GameweekStats {
  currentGameweek: number
  currentLeader: {
    name: string
    points: number
    team: string
    chipUsed: string | null
  }
  lowestPoints: {
    name: string
    points: number
    team: string
  }
  chipsSummary: {
    type: string
    count: number
    users: string
  }[]
  highestRiser: {
    name: string
    team: string
    movement: number
  }
  steepestFaller: {
    name: string
    team: string
    movement: number
  }
}

async function getGameweekStats(): Promise<GameweekStats> {
  try {
    const [leagueResponse, gameweekResponse] = await Promise.all([
      fetch('http://localhost:3000/api/fpl/league', { next: { revalidate: 300 } }),
      fetch('http://localhost:3000/api/fpl/gameweek/current', { next: { revalidate: 300 } })
    ])

    if (!leagueResponse.ok || !gameweekResponse.ok) {
      throw new Error('Failed to fetch initial data')
    }

    const [leagueData, gameweekData] = await Promise.all([
      leagueResponse.json(),
      gameweekResponse.json()
    ])

    const standings = leagueData.standings.results
    
    // Sort by gameweek points to find current leader and lowest points
    const sortedByGameweek = [...standings].sort((a, b) => b.event_total - a.event_total)
    const currentLeader = sortedByGameweek[0]
    const lowestPoints = sortedByGameweek[sortedByGameweek.length - 1]

    // Calculate rank movements
    const movements = standings.map((team: LeagueTeam) => ({
      name: team.player_name,
      team: team.entry_name,
      movement: team.last_rank - team.rank
    }))

    const highestRiser = [...movements].sort((a, b) => b.movement - a.movement)[0]
    const steepestFaller = [...movements].sort((a, b) => a.movement - b.movement)[0]

    // Fetch chip usage for all managers with error handling
    const managerHistoryPromises = standings.map((team: LeagueTeam) => 
      fetch(`http://localhost:3000/api/fpl/manager/${team.entry}/history`)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch history for manager ${team.entry}`)
          return res.json()
        })
        .catch(error => {
          console.error(error)
          return null // Return null for failed requests
        })
    )
    
    const managersHistory = await Promise.all(managerHistoryPromises)
    
    // Count chips used in current gameweek
    const chipCounts = {
      "wildcard": 0,
      "3xc": 0,
      "bboost": 0,
      "freehit": 0
    }

    const chipUsers = {
      "wildcard": [] as string[],
      "3xc": [] as string[],
      "bboost": [] as string[],
      "freehit": [] as string[]
    }

    managersHistory.forEach((history, index) => {
      if (!history) return // Skip failed requests

      const team = standings[index]
      const currentGameweekChip = history.history.chips.find(
        (chip: { event: number; name: string }) => chip.event === gameweekData.currentGameweek
      )
      
      if (currentGameweekChip) {
        const chipType = currentGameweekChip.name.toLowerCase()
        switch (chipType) {
          case 'wildcard':
            chipCounts.wildcard++
            chipUsers.wildcard.push(team.player_name)
            break
          case '3xc':
            chipCounts["3xc"]++
            chipUsers["3xc"].push(team.player_name)
            break
          case 'bboost':
            chipCounts.bboost++
            chipUsers.bboost.push(team.player_name)
            break
          case 'freehit':
            chipCounts.freehit++
            chipUsers.freehit.push(team.player_name)
            break
        }
      }
    })

    const chipsSummary = [
      { 
        type: "Wildcard",
        count: chipCounts.wildcard,
        users: chipUsers.wildcard.join(", ")
      },
      { 
        type: "Triple Captain",
        count: chipCounts["3xc"],
        users: chipUsers["3xc"].join(", ")
      },
      { 
        type: "Bench Boost",
        count: chipCounts.bboost,
        users: chipUsers.bboost.join(", ")
      },
      { 
        type: "Free Hit",
        count: chipCounts.freehit,
        users: chipUsers.freehit.join(", ")
      }
    ]

    return {
      currentGameweek: gameweekData.currentGameweek,
      currentLeader: {
        name: currentLeader.player_name,
        team: currentLeader.entry_name,
        points: currentLeader.event_total,
        chipUsed: null
      },
      lowestPoints: {
        name: lowestPoints.player_name,
        team: lowestPoints.entry_name,
        points: lowestPoints.event_total
      },
      chipsSummary,
      highestRiser,
      steepestFaller
    }
  } catch (error) {
    console.error('Error in getGameweekStats:', error)
    throw new Error('Failed to fetch gameweek stats')
  }
}

export default async function GameweekPage() {
  const stats = await getGameweekStats()

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight">Gameweek {stats.currentGameweek} Stats</h1>
          <p className="text-lg text-white/60">Live updates and insights</p>
        </div>

        <NavigationTabs />

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Gameweek Leader</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 text-2xl">
                  🔥
                </div>
                <div>
                  <div className="font-bold text-lg">{stats.currentLeader.team}</div>
                  <div className="text-white/60">{stats.currentLeader.name}</div>
                  <div className="text-2xl font-bold text-orange-500">{formatPoints(stats.currentLeader.points)} pts</div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gameweek Struggler</CardTitle>
              <Trophy className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-2xl">
                  💩
                </div>
                <div>
                  <div className="font-bold text-lg">{stats.lowestPoints.team}</div>
                  <div className="text-white/60">{stats.lowestPoints.name}</div>
                  <div className="text-2xl font-bold text-red-500">{formatPoints(stats.lowestPoints.points)} pts</div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500 to-red-600" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Highest Riser</CardTitle>
              <ArrowUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-2xl">
                  📈
                </div>
                <div>
                  <div className="font-bold text-lg">{stats.highestRiser.team}</div>
                  <div className="text-white/60">{stats.highestRiser.name}</div>
                  <div className="text-2xl font-bold text-emerald-500">+{stats.highestRiser.movement} positions</div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Steepest Faller</CardTitle>
              <ArrowDown className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-2xl">
                  📉
                </div>
                <div>
                  <div className="font-bold text-lg">{stats.steepestFaller.team}</div>
                  <div className="text-white/60">{stats.steepestFaller.name}</div>
                  <div className="text-2xl font-bold text-blue-500">{stats.steepestFaller.movement} positions</div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Chip Usage This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.chipsSummary.map((chip) => (
                <div key={chip.type} className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl mb-2">
                    {chip.type === "Wildcard" ? "🃏" :
                     chip.type === "Triple Captain" ? "👑" :
                     chip.type === "Bench Boost" ? "💪" : "🔄"}
                  </div>
                  <div className="text-sm font-medium">{chip.type}</div>
                  <div className="text-2xl font-bold">{chip.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 