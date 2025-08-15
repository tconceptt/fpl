import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, BarChart, Zap, Trophy } from "lucide-react"
import { FootballHero } from "@/components/ui/shape-landing-hero"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getStatsData } from "@/app/stats/getStatData"
import { getLeagueData } from "@/services/league-service"
import { GameweekStanding } from "@/types/league"

export default async function HomePage() {
  const statsData = await getStatsData();
  const leagueResponse = await getLeagueData();
  const leagueStandings: GameweekStanding[] = leagueResponse?.standings || [];

  const topThree = leagueStandings.slice(0, 3).map(p => ({
    playerName: p.player_name,
    teamName: p.entry_name,
    points: p.total_points
  }));

  // No banter board on the new-season homepage

  return (
    <DashboardLayout>
      {/* Hero Section */}
      <div className="-mt-14">
        <FootballHero 
          badge="Qitawrari League" 
          title1="Fresh New Season" 
          title2="Let the Games Begin!" 
          subtitle="Keep tabs on your team, see who's on top, see who sucks."
        />
      </div>

      <div className="flex flex-col gap-8 mt-6">
        {/* Navigation Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-400/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-medium">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/gameweek" className="flex-1">
                <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 border-white/10">
                  <Zap className="h-5 w-5 text-blue-400" />
                  <span>Gameweek</span>
                </Button>
              </Link>
              <Link href="/stats" className="flex-1">
                <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 border-white/10">
                  <BarChart className="h-5 w-5 text-blue-400" />
                  <span>Stats</span>
                </Button>
              </Link>
              <Link href="/league" className="flex-1">
                <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 border-white/10">
                  <Crown className="h-5 w-5 text-blue-400" />
                  <span>League Table</span>
                </Button>
              </Link>
            </div>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
        </Card>

        {/* Season Kickoff Section */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* League Overview */}
          <Card className="lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-indigo-500/25 to-blue-500/25 border border-indigo-400/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-indigo-300">Season Kickoff</CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <div className="space-y-2 text-white/80">
                <p className="text-lg">{leagueResponse.leagueName}</p>
                <p>Current Gameweek: <span className="font-semibold text-indigo-300">{leagueResponse.currentGameweek}</span></p>
                <p>Finished Gameweeks: <span className="font-semibold text-indigo-300">{statsData.finishedGameweeks || 0}</span></p>
              </div>
              <div className="mt-4 flex gap-3">
                <Link href="/gameweek">
                  <Button variant="outline" className="border-indigo-400 text-indigo-200 hover:bg-indigo-500/10">Go to Gameweek</Button>
                </Link>
                <Link href="/league">
                  <Button variant="outline" className="border-indigo-400 text-indigo-200 hover:bg-indigo-500/10">View League</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Early Leaders */}
          <Card className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-indigo-500/25 to-blue-500/25 border border-indigo-400/40">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-2xl font-bold text-indigo-300">Early Leaders</CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              {topThree.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {topThree.map((p, idx) => (
                    <div key={idx} className="rounded-lg bg-white/5 p-4">
                      <div className="text-sm text-white/60">#{idx + 1}</div>
                      <div className="mt-1 text-lg font-semibold">{p.playerName}</div>
                      <div className="text-white/70">{p.teamName}</div>
                      {p.points !== undefined && (
                        <div className="mt-2 text-sm text-white/60">Points: {p.points}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-white/70">Standings will appear once the first gameweek is underway.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Row */}
        <div className="grid gap-6 md:grid-cols-1">
          {/* Prizes Preview - REMOVED */}
        </div>
        
        {/* Hall of Fame / Shame */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="relative overflow-hidden bg-gradient-to-br from-green-500/20 to-teal-500/20 border border-green-400/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-medium text-green-300">
                <Trophy className="h-6 w-6" />
                Reigning Champion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">T</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-400/30">
            <CardHeader>
              <CardTitle className="text-xl font-medium text-red-300">Reigning Qitawrari</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">ቤቢ ነው</p>
              <p className="text-sm text-white/70 mt-2">
                Yes, he did actually finish below Eyosyas 🤯
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  )
}

