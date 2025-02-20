import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { NavigationTabs } from "@/components/navigation-tabs"
import type { LeagueTeam } from "@/lib/fpl"
import { calculateMovement } from "@/lib/fpl"

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
    name: team.entry_name,
    playerName: team.player_name,
    gameweek: team.event_total,
    movement: calculateMovement(team.rank, team.last_rank),
    ...team
  }))

  const highestGameweek = standings.reduce((highest, team) => (
    team.event_total > highest.score ? 
    { score: team.event_total, team: team.name } : 
    highest
  ), { score: 0, team: '' })

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
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight">{data.leagueName}</h1>
          <p className="text-lg text-white/60">2024/25 Season • Gameweek {data.currentGameweek}</p>
        </div>

        <NavigationTabs
          leagueLeader={leagueLeader}
          standings={data.standings}
          stats={data.stats}
        />
      </div>
    </DashboardLayout>
  )
}

