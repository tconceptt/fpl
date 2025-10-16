import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, BarChart, Zap, Trophy } from "lucide-react"
import { FootballHero } from "@/components/ui/shape-landing-hero"
import Link from "next/link"
import { getStatsData } from "@/app/stats/getStatData"
import { getLeagueData } from "@/services/league-service"
import { GameweekStanding } from "@/types/league"

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const statsData = await getStatsData();
  const leagueResponse = await getLeagueData();
  const leagueStandings: GameweekStanding[] = leagueResponse?.standings || [];

  const topThree = leagueStandings.slice(0, 3).map(p => ({
    playerName: p.player_name,
    teamName: p.entry_name,
    points: p.total_points
  }));

  // Find the highest gameweek score across all teams
  const highestGWScore = statsData.stats.reduce((best, team) => {
    if (team.bestGameweek.points > best.points) {
      return {
        teamId: team.id,
        teamName: team.name,
        managerName: team.managerName,
        gameweek: team.bestGameweek.gameweek,
        points: team.bestGameweek.points
      };
    }
    return best;
  }, { teamId: 0, teamName: '', managerName: '', gameweek: 0, points: -1 });

  return (
    <DashboardLayout>
      <div className="-mt-14">
        <FootballHero 
          badge="Qitawrari League" 
          title1="Qitawrari League" 
          title2="Track Your FPL Standings" 
          subtitle="Live gameweek points, detailed stats, and league history."
          showBadge={false}
        />
      </div>

      <div className="flex flex-col gap-4 sm:gap-6 mt-6">
        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Link href="/gameweek" className="group block">
            <Card className="border-blue-500/30 sm:border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl hover:border-blue-500/50 hover:bg-gray-800/60 h-full cursor-pointer active:scale-95 sm:active:scale-[0.98]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 border-b border-white/10 bg-gradient-to-r from-blue-900/20 sm:from-gray-800 to-gray-900 group-hover:from-blue-900/20 transition-colors">
                <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                  <span className="bg-blue-500/20 sm:bg-blue-500/10 p-1.5 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                    <Zap className="h-4 w-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
                  </span>
                  Gameweek Stats
                </CardTitle>
                <span className="text-xl group-hover:scale-110 transition-transform">⚡</span>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4 flex items-center justify-between">
                <p className="text-xs sm:text-sm text-white/60 group-hover:text-white/80 transition-colors">View weekly performance</p>
                <svg className="h-4 w-4 text-blue-400 sm:hidden flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          </Link>

          <Link href="/stats" className="group block">
            <Card className="border-purple-500/30 sm:border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl hover:border-purple-500/50 hover:bg-gray-800/60 h-full cursor-pointer active:scale-95 sm:active:scale-[0.98]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 border-b border-white/10 bg-gradient-to-r from-purple-900/20 sm:from-gray-800 to-gray-900 group-hover:from-purple-900/20 transition-colors">
                <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                  <span className="bg-purple-500/20 sm:bg-purple-500/10 p-1.5 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                    <BarChart className="h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                  </span>
                  Stats & Records
                </CardTitle>
                <span className="text-xl group-hover:scale-110 transition-transform">📊</span>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4 flex items-center justify-between">
                <p className="text-xs sm:text-sm text-white/60 group-hover:text-white/80 transition-colors">Explore league statistics</p>
                <svg className="h-4 w-4 text-purple-400 sm:hidden flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          </Link>

          <Link href="/" className="group block">
            <Card className="border-yellow-500/30 sm:border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl hover:border-yellow-500/50 hover:bg-gray-800/60 h-full cursor-pointer active:scale-95 sm:active:scale-[0.98]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 border-b border-white/10 bg-gradient-to-r from-yellow-900/20 sm:from-gray-800 to-gray-900 group-hover:from-yellow-900/20 transition-colors">
                <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                  <span className="bg-yellow-500/20 sm:bg-yellow-500/10 p-1.5 rounded-lg group-hover:bg-yellow-500/30 transition-colors">
                    <Crown className="h-4 w-4 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                  </span>
                  League Table
                </CardTitle>
                <span className="text-xl group-hover:scale-110 transition-transform">🏆</span>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4 flex items-center justify-between">
                <p className="text-xs sm:text-sm text-white/60 group-hover:text-white/80 transition-colors">Check current standings</p>
                <svg className="h-4 w-4 text-yellow-400 sm:hidden flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Season Overview & Current Leaders */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Season Overview */}
          <Card className="lg:col-span-1 border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg">
            <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-gray-800 to-gray-900">
              <CardTitle className="text-base sm:text-lg font-semibold text-white">Season Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 space-y-4">
              <div>
                <p className="text-sm text-white/60 mb-1">League Name</p>
                <p className="text-base sm:text-lg font-semibold text-white">{leagueResponse.leagueName}</p>
              </div>
              
              {/* Highest Gameweek Score */}
              {highestGWScore.points > 0 && (
                <Link href={`/team/${highestGWScore.teamId}?gw=${highestGWScore.gameweek}`} className="block group">
                  <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg p-4 transition-all hover:scale-[1.02] hover:border-orange-500/50 hover:shadow-lg cursor-pointer active:scale-95">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-orange-400 font-semibold">🔥 Highest GW Score</p>
                      <svg className="h-4 w-4 text-orange-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="text-3xl font-bold text-orange-300 mb-1">{highestGWScore.points} pts</p>
                    <p className="text-sm font-semibold text-white truncate">{highestGWScore.teamName}</p>
                    <p className="text-xs text-white/60 truncate">{highestGWScore.managerName}</p>
                    <p className="text-xs text-orange-400 mt-2">GW {highestGWScore.gameweek}</p>
                  </div>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Current Leaders */}
          <Card className="lg:col-span-2 border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg">
            <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-gray-800 to-gray-900">
              <CardTitle className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                Current Leaders
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              {topThree.length > 0 ? (
                <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
                  {topThree.map((p, idx) => {
                    const colors = [
                      { bg: "from-yellow-500/20 to-yellow-600/20", border: "border-yellow-500/30", text: "text-yellow-400" },
                      { bg: "from-gray-400/20 to-gray-500/20", border: "border-gray-400/30", text: "text-gray-300" },
                      { bg: "from-orange-500/20 to-orange-600/20", border: "border-orange-500/30", text: "text-orange-400" }
                    ];
                    const color = colors[idx];
                    
                    return (
                      <div key={idx} className={`rounded-lg bg-gradient-to-br ${color.bg} border ${color.border} p-4 transition-all hover:scale-[1.02]`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-2xl font-bold ${color.text}`}>#{idx + 1}</span>
                          {idx === 0 && <span className="text-xl">🏆</span>}
                          {idx === 1 && <span className="text-xl">🥈</span>}
                          {idx === 2 && <span className="text-xl">🥉</span>}
                        </div>
                        <div className="font-bold text-base sm:text-lg text-white truncate">{p.playerName}</div>
                        <div className="text-xs sm:text-sm text-white/60 truncate mb-2">{p.teamName}</div>
                        {p.points !== undefined && (
                          <div className={`text-xl sm:text-2xl font-bold ${color.text}`}>{p.points} pts</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-white/70 text-center py-8">Standings will appear once the first gameweek is underway.</div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Hall of Fame */}
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          <Card className="border-green-500/30 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02]">
            <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-green-900/30 to-gray-900">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
                <Trophy className="h-5 w-5 text-green-400" />
                Reigning Champion
                <span className="text-xl ml-auto">👑</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 sm:p-6">
                <p className="text-3xl sm:text-4xl font-bold text-green-300 mb-2">T</p>
                <p className="text-xs sm:text-sm text-white/60">Last Season Winner</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/30 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02]">
            <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-red-900/30 to-gray-900">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
                Reigning Qitawrari
                <span className="text-xl ml-auto">💩</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 sm:p-6">
                <p className="text-3xl sm:text-4xl font-bold text-red-300 mb-2">ቤቢ ነው</p>
                <p className="text-xs sm:text-sm text-white/60 italic">
                  Yes, he did actually finish below Eyosyas 🤯
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  )
}
