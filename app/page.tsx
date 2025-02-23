import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPoints } from "@/lib/fpl"
import { fplApiRoutes } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { ArrowDown, ArrowUp, Minus, Trophy } from "lucide-react"
import { getTeamHistory } from "@/services/net-gameweek-points"
import { GameweekSelector } from "@/components/gameweek-selector"
import { notFound } from "next/navigation"

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

interface GameweekStanding {
  entry: number;
  entry_name: string;
  player_name: string;
  event_total: number;
  total_points: number;
  net_points: number | null;
  rank: number;
  last_rank: number;
}

async function getCurrentGameweek(): Promise<number> {
  const response = await fetch(fplApiRoutes.bootstrap, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch bootstrap data');
  }

  const data = await response.json();
  return data.events.find((event: { id: number; is_current: boolean }) => event.is_current).id;
}

async function getHistoricalStandings(teamIds: number[], selectedGameweek: number, teamInfo: LeagueStanding[]): Promise<GameweekStanding[]> {
  // Fetch historical data for all teams
  const teamsHistory = await Promise.all(
    teamIds.map(teamId => 
      getTeamHistory(teamId.toString())
        .catch(error => {
          console.error(`Failed to fetch history for team ${teamId}:`, error);
          return null;
        })
    )
  );

  // Get gameweek data for each team
  const standings = teamsHistory
    .map((history, index) => {
      if (!history) return null;

      const gameweekData = history.current.find(gw => gw.event === selectedGameweek);
      if (!gameweekData) return null;

      const team = teamInfo.find(t => t.entry === teamIds[index]);
      if (!team) return null;

      return {
        entry: teamIds[index],
        entry_name: team.entry_name,
        player_name: team.player_name,
        event_total: gameweekData.points,
        total_points: gameweekData.total_points,
        net_points: gameweekData.points - gameweekData.event_transfers_cost,
        rank: 0, // Will be calculated after sorting
        last_rank: 0, // Will be calculated after getting previous gameweek standings
      };
    })
    .filter((standing): standing is NonNullable<typeof standing> => standing !== null);

  // If it's not gameweek 1, get previous gameweek standings to calculate last_rank
  if (selectedGameweek > 1) {
    const previousStandings = teamsHistory
      .map((history, index) => {
        if (!history) return null;

        const previousGameweekData = history.current.find(gw => gw.event === selectedGameweek - 1);
        if (!previousGameweekData) return null;

        return {
          entry: teamIds[index],
          total_points: previousGameweekData.total_points,
        };
      })
      .filter((standing): standing is NonNullable<typeof standing> => standing !== null)
      .sort((a, b) => b.total_points - a.total_points);

    // Create a map of entry to previous rank
    const previousRanks = new Map(
      previousStandings.map((standing, index) => [standing.entry, index + 1])
    );

    // Update last_rank for each team
    standings.forEach(standing => {
      standing.last_rank = previousRanks.get(standing.entry) || standing.rank;
    });
  }

  // Sort by total points and assign current ranks
  return standings
    .sort((a, b) => b.total_points - a.total_points)
    .map((standing, index) => ({
      ...standing,
      rank: index + 1,
    }));
}

async function getLeagueData(selectedGameweek?: number) {
  const [response, currentGameweek] = await Promise.all([
    fetch(
      fplApiRoutes.standings(process.env.FPL_LEAGUE_ID || ""),
      {
        next: { revalidate: 300 },
      }
    ),
    getCurrentGameweek()
  ]);

  if (!response.ok) {
    throw new Error('Failed to fetch data')
  }

  const data = await response.json();
  const gameweek = selectedGameweek || currentGameweek;

  // Get team IDs from current standings
  const teamIds = data.standings.results.map((team: LeagueStanding) => team.entry);

  // Get historical standings for selected gameweek
  const historicalStandings = await getHistoricalStandings(teamIds, gameweek, data.standings.results);

  return {
    leagueName: data.league.name,
    currentGameweek,
    selectedGameweek: gameweek,
    standings: historicalStandings
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

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function Page({ searchParams }: PageProps) {
  const requestedGameweek = searchParams.gameweek ? parseInt(searchParams.gameweek as string) : undefined;
  const data = await getLeagueData(requestedGameweek);

  // Validate the requested gameweek
  if (requestedGameweek && (requestedGameweek < 1 || requestedGameweek > data.currentGameweek)) {
    notFound();
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{data.leagueName}</h1>
            <GameweekSelector 
              currentGameweek={data.currentGameweek}
              selectedGameweek={data.selectedGameweek}
              className="w-[180px]"
            />
          </div>
          <p className="text-lg text-white/60">
            {data.selectedGameweek === data.currentGameweek 
              ? "Live League Standings"
              : `League Standings as of Gameweek ${data.selectedGameweek}`
            }
          </p>
        </div>

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
                  <TableHead className="text-right text-white/60">GW Net</TableHead>
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
                      <TableCell className={cn(
                        "text-right font-medium",
                        team.net_points !== null && team.net_points !== team.event_total && "text-yellow-500"
                      )}>
                        {team.net_points !== null ? formatPoints(team.net_points) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatPoints(team.total_points)}
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

