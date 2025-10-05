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
      <PageHeader title="Stats & Records" description="Choose a stats category below" currentGameweek={data.finishedGameweeks} selectedGameweek={data.finishedGameweeks} showGameweekSelector={false} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <Link href="/stats/gameweek-winners">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2 pb-2">
              <CalendarDays className="h-4 w-4 text-green-500" />
              <CardTitle className="text-sm font-medium">Gameweek Winners</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/60">View weekly winners for each gameweek.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/stats/chips-usage">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2 pb-2">
              <Zap className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm font-medium">Chips Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/60">Analyze chip usage across managers.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/stats/bench-points">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2 pb-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm font-medium">Bench Points</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/60">See who scored the most on the bench.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/stats/hits-leaderboard">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center space-x-2 pb-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <CardTitle className="text-sm font-medium">Hits Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/60">See who&apos;s taken the most transfer hits.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </DashboardLayout>
  );
} 