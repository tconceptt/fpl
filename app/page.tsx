import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { NavigationTabs } from "./components/navigation-tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, ArrowUp, ArrowDown, Minus } from "lucide-react"
import { formatPoints } from "@/lib/fpl"
import { cn } from "@/lib/utils"

interface LeagueStanding {
  id: number
  event_total: number
  player_name: string
  rank: number
  last_rank: number
  total: number
  entry: number
  entry_name: string
  has_played: boolean
}

async function getLeagueData() {
  const response = await fetch(`http://localhost:3000/api/fpl/league`, {
    next: { revalidate: 300 }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch data')
  }

  const data = await response.json()
  return {
    leagueName: data.league.name,
    standings: data.standings.results as LeagueStanding[]
  }
}

function getRankMovement(currentRank: number, lastRank: number) {
  if (currentRank < lastRank) {
    return { icon: ArrowUp, color: "text-emerald-500", diff: lastRank - currentRank }
  } else if (currentRank > lastRank) {
    return { icon: ArrowDown, color: "text-red-500", diff: currentRank - lastRank }
  }
  return { icon: Minus, color: "text-white/60", diff: 0 }
}

export default async function Page() {
  const data = await getLeagueData()

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight">{data.leagueName}</h1>
          <p className="text-lg text-white/60">Live League Standings</p>
        </div>

        <NavigationTabs />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              League Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="w-12 text-white/60">Rank</TableHead>
                  <TableHead className="text-white/60">Team</TableHead>
                  <TableHead className="text-right text-white/60">GW</TableHead>
                  <TableHead className="text-right text-white/60">Total</TableHead>
                  <TableHead className="w-20 text-right text-white/60">Movement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.standings.map((team) => {
                  const movement = getRankMovement(team.rank, team.last_rank)
                  const MovementIcon = movement.icon
                  
                  return (
                    <TableRow key={team.entry} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium">
                        {team.rank === 1 ? (
                          <div className="flex items-center gap-2">
                            {team.rank}
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          </div>
                        ) : team.rank}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{team.entry_name}</div>
                          <div className="text-sm text-white/60">{team.player_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPoints(team.event_total)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatPoints(team.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {movement.diff > 0 && (
                          <div className="flex items-center justify-end gap-1">
                            <span className={movement.color}>{movement.diff}</span>
                            <MovementIcon className={cn("h-4 w-4", movement.color)} />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

