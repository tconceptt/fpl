import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Wand2, Medal } from "lucide-react";
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
      <div className="flex flex-col gap-4 mt-8">
        <Link href="/stats/gameweek-winners" className="text-lg font-bold hover:underline">Gameweek Winners</Link>
        <Link href="/stats/chips-usage" className="text-lg font-bold hover:underline">Chips Usage</Link>
        <Link href="/stats/bench-points" className="text-lg font-bold hover:underline">Bench Points</Link>
        <Link href="/stats/assistant-manager" className="text-lg font-bold hover:underline">Assistant Manager Chip Usage</Link>
      </div>
    </DashboardLayout>
  );
} 