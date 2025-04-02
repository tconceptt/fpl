import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Trophy, Star, ZapOff, Zap, Award, Gift } from "lucide-react";
import { getPrizesData, WeeklyWinner } from "@/services/prizes-service";

export default async function PrizesPage() {
  const prizesData = await getPrizesData();
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Qitawrari League Prizes"
          description="Current prize winners if the league ended today"
          currentGameweek={prizesData.currentGameweek}
          selectedGameweek={prizesData.currentGameweek}
        />
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="overview">Prize Overview</TabsTrigger>
            <TabsTrigger value="details">Detailed Breakdown</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Top 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Second Place */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-slate-500/20 to-gray-500/20 border-gray-700">
                <div className="absolute top-2 right-2">
                  <Award className="h-6 w-6 text-slate-400" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Second Place</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-24 h-24 relative flex items-center justify-center rounded-full bg-gradient-to-br from-slate-500/30 to-gray-500/30 text-4xl mb-4">
                      <span className="text-5xl">🥈</span>
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-400 to-gray-200 bg-clip-text text-transparent">
                      {prizesData.secondPlace?.playerName || "TBD"}
                    </h3>
                    <p className="text-sm text-white/60">{prizesData.secondPlace?.teamName || ""}</p>
                    <div className="mt-3 text-lg font-semibold text-green-400">4,000 ETB</div>
                  </div>
                </CardContent>
              </Card>
              
              {/* First Place - Larger */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-yellow-700 transform md:scale-110 z-10">
                <div className="absolute top-2 right-2">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">ዝሆኔ 🐘</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-28 h-28 relative flex items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-yellow-500/30 text-4xl mb-4">
                      <span className="text-6xl">🏆</span>
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">
                      {prizesData.firstPlace?.playerName || "TBD"}
                    </h3>
                    <p className="text-sm text-white/60">{prizesData.firstPlace?.teamName || ""}</p>
                    <div className="mt-3 text-lg font-semibold text-green-400">17,000 ETB</div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Third Place */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-amber-700/20 to-orange-700/20 border-orange-800">
                <div className="absolute top-2 right-2">
                  <Award className="h-6 w-6 text-amber-700" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Third Place</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-24 h-24 relative flex items-center justify-center rounded-full bg-gradient-to-br from-amber-700/30 to-orange-700/30 text-4xl mb-4">
                      <span className="text-5xl">🥉</span>
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-400 bg-clip-text text-transparent">
                      {prizesData.thirdPlace?.playerName || "TBD"}
                    </h3>
                    <p className="text-sm text-white/60">{prizesData.thirdPlace?.teamName || ""}</p>
                    <div className="mt-3 text-lg font-semibold text-white/70">&ldquo;ሩቅ አሳቢ ቅርብ አዳሪ&rdquo; mug</div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Special Prizes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Highest Bench Boost */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-700">
                <div className="absolute top-2 right-2">
                  <Zap className="h-6 w-6 text-blue-400" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Highest Bench Boost</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-20 h-20 relative flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 text-4xl mb-3">
                      <span className="text-4xl">🔋</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      {prizesData.highestBenchBoost?.playerName || "TBD"}
                    </h3>
                    <p className="text-sm text-white/60">{prizesData.highestBenchBoost?.teamName || ""}</p>
                    <p className="text-white/70 mt-1">{prizesData.highestBenchBoost?.points || 0} points</p>
                    <div className="mt-2 text-lg font-semibold text-green-400">2,000 ETB</div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Highest Triple Captain */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-700">
                <div className="absolute top-2 right-2">
                  <Crown className="h-6 w-6 text-purple-400" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Highest Triple Captain</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-20 h-20 relative flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 text-4xl mb-3">
                      <span className="text-4xl">👑</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      {prizesData.highestTripleCaptain?.playerName || "TBD"}
                    </h3>
                    <p className="text-sm text-white/60">{prizesData.highestTripleCaptain?.teamName || ""}</p>
                    <p className="text-white/70 mt-1">
                      {prizesData.highestTripleCaptain?.playerName ? `${prizesData.highestTripleCaptain.captainName} (${prizesData.highestTripleCaptain.points}pts)` : ""}
                    </p>
                    <div className="mt-2 text-lg font-semibold text-green-400">2,000 ETB</div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Last Place (12th) */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-700">
                <div className="absolute top-2 right-2">
                  <ZapOff className="h-6 w-6 text-red-400" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Last Place (12th)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-20 h-20 relative flex items-center justify-center rounded-full bg-gradient-to-br from-red-500/30 to-orange-500/30 text-4xl mb-3">
                      <span className="text-4xl">😅</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      {prizesData.lastPlace?.playerName || "TBD"}
                    </h3>
                    <p className="text-sm text-white/60">{prizesData.lastPlace?.teamName || ""}</p>
                    <div className="mt-3 text-lg font-semibold text-white/70">&ldquo;የተከበሩ ቂጥ አውራሪ&rdquo; mug</div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Weekly Winners Summary */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-700">
              <div className="absolute top-2 right-2">
                <Gift className="h-6 w-6 text-green-400" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Weekly Winners Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {prizesData.weeklyWinners.map((winner: WeeklyWinner, index: number) => (
                    <div key={index} className="p-3 rounded-lg bg-white/5 flex flex-col items-center">
                      <div className="text-sm text-white/60">Gameweek {winner.gameweek}</div>
                      <div className="font-medium text-white">{winner.playerName}</div>
                      <div className="text-sm text-white/60 mt-1">{winner.points} pts</div>
                      <div className="mt-1 text-sm font-semibold text-green-400">140 ETB</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            {/* Prize Details */}
            <Card>
              <CardHeader>
                <CardTitle>Prize Distribution Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-400" /> 
                      Season Placement Prizes
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
                        <div className="font-semibold">Overall Winner</div>
                        <div className="text-lg text-green-400">17,000 ETB</div>
                        <div className="mt-1 text-white/60">Current: {prizesData.firstPlace?.playerName || "TBD"}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-slate-500/20 to-gray-500/20">
                        <div className="font-semibold">Second Place</div>
                        <div className="text-lg text-green-400">4,000 ETB</div>
                        <div className="mt-1 text-white/60">Current: {prizesData.secondPlace?.playerName || "TBD"}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-amber-700/20 to-orange-700/20">
                        <div className="font-semibold">Third Place</div>
                        <div className="text-lg text-white/70">&ldquo;ሩቅ አሳቢ ቅርብ አዳሪ&rdquo; mug</div>
                        <div className="mt-1 text-white/60">Current: {prizesData.thirdPlace?.playerName || "TBD"}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-400" /> 
                      Special Achievement Prizes
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                        <div className="font-semibold">Highest Bench Boost</div>
                        <div className="text-lg text-green-400">2,000 ETB</div>
                        <div className="mt-1 text-white/60">
                          Current: {prizesData.highestBenchBoost?.playerName || "TBD"} 
                          {prizesData.highestBenchBoost?.points ? ` (${prizesData.highestBenchBoost.points}pts)` : ""}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <div className="font-semibold">Highest Triple Captain</div>
                        <div className="text-lg text-green-400">2,000 ETB</div>
                        <div className="mt-1 text-white/60">
                          Current: {prizesData.highestTripleCaptain?.playerName || "TBD"} 
                          {prizesData.highestTripleCaptain?.points ? ` (${prizesData.highestTripleCaptain.points}pts)` : ""}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20">
                        <div className="font-semibold">Last Place (12th)</div>
                        <div className="text-lg text-white/70">&ldquo;የተከበሩ ቂጥ አውራሪ&rdquo; mug</div>
                        <div className="mt-1 text-white/60">Current: {prizesData.lastPlace?.playerName || "TBD"}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Star className="h-5 w-5 text-emerald-400" /> 
                      Weekly Winners Prize
                    </h3>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                      <div className="font-semibold">Weekly Winner</div>
                      <div className="text-lg text-green-400">140 ETB per gameweek win</div>
                      <div className="mt-2 text-white/60 text-sm">
                        Total prize pot for weekly winners: {prizesData.currentGameweek * 140} ETB
                      </div>
                      <div className="mt-3 text-white/80 text-sm">
                        Weekly prizes are awarded to the manager with the highest points in each gameweek.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Rules Reference */}
            <Card className="bg-black/20">
              <CardHeader>
                <CardTitle>Prize Rules Reference</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-white/70">
                  <p>🚀🌟 Total Overall Winner - 17K 💥💥</p>
                  <p>🚀🌟 Second Place - 4K 💥💥</p>
                  <p>🚀🌟 Third Place - &ldquo;ሩቅ አሳቢ ቅርብ አዳሪ&rdquo; mug</p>
                  <p>🚀🌟 Weekly winners - 140 birr per gameweek win</p>
                  <p>🚀🌟 Highest BenchBoost Points - 2K (highest points by a team when bench boost was activated)</p>
                  <p>🚀🌟 Highest Triple Captain - 2K (highest points gained by a triple captained player)</p>
                  <p>🚀🌟 Last place, 12th - &ldquo;የተከበሩ ቂጥ አውራሪ&rdquo; mug</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
