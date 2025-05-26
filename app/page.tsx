import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, BarChart, Zap, Trophy, User, Sparkles, Award as AwardIcon } from "lucide-react"
import { FootballHero } from "@/components/ui/shape-landing-hero"
import { ImageSlideshow } from "./qitawrari/image-slideshow"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getPrizesData } from "@/services/prizes-service"
import { getStatsData, TeamStats } from "@/app/stats/getStatData"
import { getLeagueData } from "@/services/league-service"
import { GameweekStanding } from "@/types/league"

const ROOKIE_PLAYER_ID = 1734709;
const ROOKIE_PLAYER_NAME = "Bk";
const CUP_WINNER_NAME = "Thijs Dekker";

export default async function HomePage() {
  const prizesData = await getPrizesData();
  const statsData = await getStatsData();
  const leagueResponse = await getLeagueData();
  const leagueStandings: GameweekStanding[] = leagueResponse?.standings || [];

  const championData = prizesData.firstPlace;
  const qitawrari = prizesData.lastPlace;
  const cupWinnerTeamName = statsData.stats?.find(s => s.managerName === CUP_WINNER_NAME)?.name || "Team Unknown";

  let rookieStats: TeamStats | undefined;
  let rookieRank: number | string = "N/A";

  if (statsData && statsData.stats) {
    rookieStats = statsData.stats.find(stat => stat.id === ROOKIE_PLAYER_ID);
  }

  if (leagueStandings.length > 0 && rookieStats) {
    const rookieInStandings = leagueStandings.find((p: GameweekStanding) => p.entry === ROOKIE_PLAYER_ID);
    if (rookieInStandings) {
        rookieRank = rookieInStandings.rank;
    } 
  } 

  let championTotalPoints: number | string = "N/A";
  if (championData && leagueStandings.length > 0) {
    const championInLeague = leagueStandings.find(
      (s: GameweekStanding) => s.player_name === championData.playerName && s.entry_name === championData.teamName
    );
    if (championInLeague) {
        championTotalPoints = championInLeague.total_points;
    }
  } else if (championData?.points) {
      championTotalPoints = championData.points;
  }

  return (
    <DashboardLayout>
      {/* Hero Section */}
      <div className="-mt-14">
        <FootballHero 
          badge="Qitawrari League: Season Concluded!" 
          title1="The Final Whistle" 
          title2="Has Blown!" 
        />
      </div>

      <div className="flex flex-col gap-8 mt-6">
        {/* Navigation Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-medium">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/gameweek" className="flex-1">
                <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 border-white/10">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span>Gameweek Details</span>
                </Button>
              </Link>
              <Link href="/stats" className="flex-1">
                <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 border-white/10">
                  <BarChart className="h-5 w-5 text-blue-500" />
                  <span>Season Statistics</span>
                </Button>
              </Link>
              <Link href="/league" className="flex-1">
                <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 border-white/10">
                  <Crown className="h-5 w-5 text-purple-500" />
                  <span>League Table</span>
                </Button>
              </Link>
              <Link href="/prizes" className="flex-1">
                <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 border-white/10">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span>Final Prizes</span>
                </Button>
              </Link>
            </div>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-green-500" />
        </Card>

        {/* Season Highlights Section */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Champion Card */}
          <Card className="lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-amber-500/30 to-yellow-500/30 border-2 border-amber-400 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-2xl font-bold text-amber-300">League Champion</CardTitle>
              <Trophy className="h-8 w-8 text-amber-300 animate-pulse" />
            </CardHeader>
            <CardContent className="text-center py-6">
              <div className="text-3xl font-extrabold bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">
                {championData ? championData.playerName : "To Be Announced"}
              </div>
              <p className="text-lg text-white/80">{championData ? championData.teamName : "-"}</p>
              {championTotalPoints !== "N/A" && (
                 <p className="text-md text-white/60 mt-2">{championTotalPoints} Points</p>
              )}
              <Link href="/prizes" className="mt-4 inline-block">
                <Button variant="outline" className="bg-amber-500/20 hover:bg-amber-500/30 border-amber-400 text-amber-200">
                  View All Prizes
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Cup Winner Card */}
          <Card className="lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-green-500/30 to-emerald-500/30 border-2 border-green-400 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-2xl font-bold text-green-300">Cup Winner</CardTitle>
              <AwardIcon className="h-8 w-8 text-green-300" />
            </CardHeader>
            <CardContent className="text-center py-6">
              <div className="text-3xl font-extrabold bg-gradient-to-r from-green-300 to-emerald-200 bg-clip-text text-transparent">
                {CUP_WINNER_NAME}
              </div>
              <p className="text-lg text-white/80">{cupWinnerTeamName}</p>
              <p className="text-md text-white/60 mt-2">Victory in the Knockouts!</p>
            </CardContent>
          </Card>

          {/* Rookie Spotlight Card */}
          <Card className="lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-sky-500/30 to-cyan-500/30 border-2 border-sky-400 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-2xl font-bold text-sky-300">Rookie of the Season</CardTitle>
              <Sparkles className="h-8 w-8 text-sky-300" />
            </CardHeader>
            <CardContent className="text-center py-6">
              <div className="text-3xl font-extrabold bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-transparent">
                {ROOKIE_PLAYER_NAME}
              </div>
              <p className="text-lg text-white/80">{rookieStats ? rookieStats.name : "Team Unknown"}</p>
              <p className="text-md text-white/60 mt-2">Final Rank: {rookieRank}</p>
              <p className="text-sm text-white/70">Total Points: {rookieStats ? rookieStats.totalPoints : "N/A"}</p>
              <p className="text-sm text-white/70">Weekly Wins: {rookieStats ? rookieStats.wins : "N/A"}</p>
              <p className="text-sm text-white/70">
                Best GW: {rookieStats && rookieStats.bestGameweek.points > 0 ? 
                  `${rookieStats.bestGameweek.points}pts (GW${rookieStats.bestGameweek.gameweek})` : 
                  "N/A"}
              </p>
              <p className="mt-3 text-xs text-white/50 italic">Not bad for a rookie!</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 mt-8">
          <ImageSlideshow />

          <div className="grid gap-6 md:grid-cols-2">
            {/* This Season's Qitawrari Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-rose-500/20 to-pink-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-medium">This Season&apos;s Qitawrari</CardTitle>
                <User className="h-6 w-6 text-pink-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/30 to-pink-500/30 text-4xl">
                    🥄
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
                      {qitawrari ? qitawrari.playerName : "To Be Confirmed"}
                    </div>
                    <div className="text-lg text-white/60">
                      {qitawrari ? qitawrari.teamName : "-"}
                    </div>
                    <div className="text-sm text-white/40 italic">
                      The honorary spoon holder for the season!
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
            </Card>
            
            {/* Final Prize Pool Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-medium">Final Prize Pool</CardTitle>
                <Trophy className="h-6 w-6 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-yellow-500/30 text-4xl">
                    💰
                  </div>
                  <div className="space-y-3 text-center md:text-left">
                    <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">
                      Over 35K ETB Awarded!
                    </div>
                    <div className="text-lg text-white/60">
                      Weekly prizes, special achievements, and overall winners!
                    </div>
                    <Link href="/prizes">
                      <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600">
                        View Full Prize Breakdown
                      </Button>
                    </Link>
                  </div>
                </div>
                 <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-white/5 text-center">
                    <div className="text-2xl mb-1">🏆</div>
                    <div className="text-sm text-white/60">Champion</div>
                    <div className="font-semibold text-amber-400">17K</div>
                  </div>
                   <div className="p-3 rounded-lg bg-white/5 text-center">
                    <div className="text-2xl mb-1">🏅</div>
                    <div className="text-sm text-white/60">Cup Winner</div>
                    <div className="font-semibold text-amber-400">5K</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 text-center">
                    <div className="text-2xl mb-1">⚡</div>
                    <div className="text-sm text-white/60">BB/TC Master</div>
                    <div className="font-semibold text-amber-400">2K each</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 text-center">
                    <div className="text-2xl mb-1">💸</div>
                    <div className="text-sm text-white/60">Weekly Wins</div>
                    <div className="font-semibold text-amber-400">140 ETB</div>
                  </div>
                </div>
              </CardContent>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
            </Card>
          </div>

          {/* Qitawrari Archives Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-slate-600/20 to-gray-700/20">
            <CardHeader>
              <CardTitle className="text-xl">Qitawrari Archives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                  <div className="text-xl">🥄</div>
                  <div>
                    <div className="font-medium">Season 2022/23</div>
                    <div className="text-xs text-white/50">The Original</div>
                  </div>
                  <div className="ml-auto font-semibold text-white/70">T</div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                  <div className="text-xl">🥄</div>
                  <div>
                    <div className="font-medium">Season 2023/24</div>
                    <div className="text-xs text-white/50">Predecessor</div>
                  </div>
                  <div className="ml-auto font-semibold text-white/70">Eyosyas Kebede</div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/50">
                  <div className="text-2xl">🥄</div>
                  <div>
                    <div className="font-medium text-rose-300">Season 2024/25</div>
                    <div className="text-sm text-white/60">Newly Crowned!</div>
                  </div>
                  <div className="ml-auto font-bold text-rose-300">
                    {qitawrari ? qitawrari.playerName : "To Be Confirmed"}
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-slate-600 to-gray-700" />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

