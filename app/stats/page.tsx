import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Wand2, Medal, CalendarDays, Zap, Layers, TrendingUp } from "lucide-react";
import { getStatsData } from "./getStatData";
import { formatPoints } from "@/lib/fpl";

export default async function StatsLandingPage() {
  const data = await getStatsData();
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Stats & Records" description="League highlights and detailed statistics" currentGameweek={data.finishedGameweeks} selectedGameweek={data.finishedGameweeks} showGameweekSelector={false} />
        
        {/* Top Stats Cards */}
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="relative overflow-hidden border border-yellow-500/30 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 border-b border-white/10 bg-gradient-to-r from-yellow-900/30 to-yellow-800/30">
              <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                <span className="bg-yellow-500/10 p-1.5 rounded-lg">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                </span>
                Most Wins
              </CardTitle>
              <span className="text-2xl">🏆</span>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-yellow-500/20 border border-yellow-500/30 text-xl sm:text-2xl font-bold text-yellow-400">
                  {data.stats[0]?.wins}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base sm:text-lg text-white truncate">{data.stats[0]?.name}</div>
                  <div className="text-xs sm:text-sm text-white/60 truncate">{data.stats[0]?.managerName}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-purple-500/30 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 border-b border-white/10 bg-gradient-to-r from-purple-900/30 to-purple-800/30">
              <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                <span className="bg-purple-500/10 p-1.5 rounded-lg">
                  <Wand2 className="h-4 w-4 text-purple-400" />
                </span>
                Most Chips Used
              </CardTitle>
              <span className="text-2xl">✨</span>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-purple-500/20 border border-purple-500/30 text-xl sm:text-2xl font-bold text-purple-400">
                  {data.chipStats[0]?.totalChipsUsed}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base sm:text-lg text-white truncate">{data.chipStats[0]?.name}</div>
                  <div className="text-xs sm:text-sm text-white/60 truncate">{data.chipStats[0]?.managerName}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-blue-500/30 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 border-b border-white/10 bg-gradient-to-r from-blue-900/30 to-blue-800/30">
              <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                <span className="bg-blue-500/10 p-1.5 rounded-lg">
                  <Medal className="h-4 w-4 text-blue-400" />
                </span>
                Most Bench Points
              </CardTitle>
              <span className="text-2xl">💺</span>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-blue-500/20 border border-blue-500/30 text-xl sm:text-2xl font-bold text-blue-400">
                  {formatPoints(data.benchStats[0]?.benchPoints)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base sm:text-lg text-white truncate">{data.benchStats[0]?.name}</div>
                  <div className="text-xs sm:text-sm text-white/60 truncate">{data.benchStats[0]?.managerName}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Link href="/stats/gameweek-winners" className="group block">
            <Card className="border-green-500/30 sm:border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl hover:border-green-500/50 hover:bg-gray-800/60 h-full cursor-pointer active:scale-95 sm:active:scale-[0.98]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 border-b border-white/10 bg-gradient-to-r from-green-900/20 sm:from-gray-800 to-gray-900 group-hover:from-green-900/20 transition-colors">
                <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                  <span className="bg-green-500/20 sm:bg-green-500/10 p-1.5 rounded-lg group-hover:bg-green-500/30 transition-colors">
                    <CalendarDays className="h-4 w-4 text-green-400 group-hover:text-green-300 transition-colors" />
                  </span>
                  Gameweek Winners
                </CardTitle>
                <span className="text-xl group-hover:scale-110 transition-transform">📅</span>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4 flex items-center justify-between">
                <p className="text-xs sm:text-sm text-white/60 group-hover:text-white/80 transition-colors">View weekly winners for each gameweek.</p>
                <svg className="h-4 w-4 text-green-400 sm:hidden flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          </Link>

          <Link href="/stats/chips-usage" className="group block">
            <Card className="border-purple-500/30 sm:border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl hover:border-purple-500/50 hover:bg-gray-800/60 h-full cursor-pointer active:scale-95 sm:active:scale-[0.98]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 border-b border-white/10 bg-gradient-to-r from-purple-900/20 sm:from-gray-800 to-gray-900 group-hover:from-purple-900/20 transition-colors">
                <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                  <span className="bg-purple-500/20 sm:bg-purple-500/10 p-1.5 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                    <Zap className="h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                  </span>
                  Chips Usage
                </CardTitle>
                <span className="text-xl group-hover:scale-110 transition-transform">⚡</span>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4 flex items-center justify-between">
                <p className="text-xs sm:text-sm text-white/60 group-hover:text-white/80 transition-colors">Analyze chip usage across managers.</p>
                <svg className="h-4 w-4 text-purple-400 sm:hidden flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          </Link>

          <Link href="/stats/bench-points" className="group block">
            <Card className="border-blue-500/30 sm:border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl hover:border-blue-500/50 hover:bg-gray-800/60 h-full cursor-pointer active:scale-95 sm:active:scale-[0.98]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 border-b border-white/10 bg-gradient-to-r from-blue-900/20 sm:from-gray-800 to-gray-900 group-hover:from-blue-900/20 transition-colors">
                <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                  <span className="bg-blue-500/20 sm:bg-blue-500/10 p-1.5 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                    <Layers className="h-4 w-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
                  </span>
                  Bench Points
                </CardTitle>
                <span className="text-xl group-hover:scale-110 transition-transform">💺</span>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4 flex items-center justify-between">
                <p className="text-xs sm:text-sm text-white/60 group-hover:text-white/80 transition-colors">See who scored the most on the bench.</p>
                <svg className="h-4 w-4 text-blue-400 sm:hidden flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          </Link>

          <Link href="/stats/hits-leaderboard" className="group block">
            <Card className="border-red-500/30 sm:border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl hover:border-red-500/50 hover:bg-gray-800/60 h-full cursor-pointer active:scale-95 sm:active:scale-[0.98]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 border-b border-white/10 bg-gradient-to-r from-red-900/20 sm:from-gray-800 to-gray-900 group-hover:from-red-900/20 transition-colors">
                <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                  <span className="bg-red-500/20 sm:bg-red-500/10 p-1.5 rounded-lg group-hover:bg-red-500/30 transition-colors">
                    <TrendingUp className="h-4 w-4 text-red-400 group-hover:text-red-300 transition-colors" />
                  </span>
                  Hits Leaderboard
                </CardTitle>
                <span className="text-xl group-hover:scale-110 transition-transform">📉</span>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4 flex items-center justify-between">
                <p className="text-xs sm:text-sm text-white/60 group-hover:text-white/80 transition-colors">See who&apos;s taken the most transfer hits.</p>
                <svg className="h-4 w-4 text-red-400 sm:hidden flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          </Link>

          <Link href="/stats/template-leaderboard" className="group block">
            <Card className="border-green-500/30 sm:border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl hover:border-green-500/50 hover:bg-gray-800/60 h-full cursor-pointer active:scale-95 sm:active:scale-[0.98]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 border-b border-white/10 bg-gradient-to-r from-green-900/20 sm:from-gray-800 to-gray-900 group-hover:from-green-900/20 transition-colors">
                <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                  <span className="bg-green-500/20 sm:bg-green-500/10 p-1.5 rounded-lg group-hover:bg-green-500/30 transition-colors">
                    <Layers className="h-4 w-4 text-green-400 group-hover:text-green-300 transition-colors" />
                  </span>
                  Template Leaderboard
                </CardTitle>
                <span className="text-xl group-hover:scale-110 transition-transform">📊</span>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4 flex items-center justify-between">
                <p className="text-xs sm:text-sm text-white/60 group-hover:text-white/80 transition-colors">Ranked by average ownership of entire squad.</p>
                <svg className="h-4 w-4 text-green-400 sm:hidden flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
} 