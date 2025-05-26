import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPrizesData } from "@/services/prizes-service";
import { getStatsData } from "@/app/stats/getStatData";
import { Award, Crown, Trophy, Zap, ZapOff } from "lucide-react";

export default async function PrizesPage() {
  const prizesData = await getPrizesData();
  const statsData = await getStatsData();
  
  // Calculate total winnings for each player
  const totalWinnings = new Map<string, { 
    playerName: string, 
    teamName: string, 
    prizeAmount: number, 
    weeklyWins: number,
    weeklyAmount: number,
    totalAmount: number,
    prizes: string[]
  }>();
  
  // Add first place prize (17,000)
  if (prizesData.firstPlace) {
    totalWinnings.set(prizesData.firstPlace.playerName, {
      playerName: prizesData.firstPlace.playerName,
      teamName: prizesData.firstPlace.teamName,
      prizeAmount: 17000,
      weeklyWins: 0,
      weeklyAmount: 0,
      totalAmount: 17000,
      prizes: ["Overall Winner (17,000)"]
    });
  }
  
  // Add second place prize (4,000)
  if (prizesData.secondPlace) {
    totalWinnings.set(prizesData.secondPlace.playerName, {
      playerName: prizesData.secondPlace.playerName,
      teamName: prizesData.secondPlace.teamName,
      prizeAmount: 4000,
      weeklyWins: 0,
      weeklyAmount: 0,
      totalAmount: 4000,
      prizes: ["Second Place (4,000)"]
    });
  }
  
  // Add highest bench boost prize (2,000)
  if (prizesData.highestBenchBoost && prizesData.highestBenchBoost.playerName) {
    const existing = totalWinnings.get(prizesData.highestBenchBoost.playerName);
    if (existing) {
      existing.prizeAmount += 2000;
      existing.totalAmount += 2000;
      existing.prizes.push(`Highest Bench Boost (2,000)`);
    } else {
      totalWinnings.set(prizesData.highestBenchBoost.playerName, {
        playerName: prizesData.highestBenchBoost.playerName,
        teamName: prizesData.highestBenchBoost.teamName,
        prizeAmount: 2000,
        weeklyWins: 0,
        weeklyAmount: 0,
        totalAmount: 2000,
        prizes: [`Highest Bench Boost (2,000)`]
      });
    }
  }
  
  // Add highest triple captain prize (2,000)
  if (prizesData.highestTripleCaptain && prizesData.highestTripleCaptain.playerName) {
    const existing = totalWinnings.get(prizesData.highestTripleCaptain.playerName);
    if (existing) {
      existing.prizeAmount += 2000;
      existing.totalAmount += 2000;
      existing.prizes.push(`Highest Triple Captain (2,000)`);
    } else {
      totalWinnings.set(prizesData.highestTripleCaptain.playerName, {
        playerName: prizesData.highestTripleCaptain.playerName,
        teamName: prizesData.highestTripleCaptain.teamName,
        prizeAmount: 2000,
        weeklyWins: 0,
        weeklyAmount: 0,
        totalAmount: 2000,
        prizes: [`Highest Triple Captain (2,000)`]
      });
    }
  }
  
  // Add Cup Winner prize (5,000)
  const cupWinnerName = "Thijs Dekker";
  const cupPrizeAmount = 5000;
  
  let determinedTeamNameForCupWinner = "Unknown Team"; // Default
  if (prizesData.firstPlace?.playerName === cupWinnerName) determinedTeamNameForCupWinner = prizesData.firstPlace.teamName;
  else if (prizesData.secondPlace?.playerName === cupWinnerName) determinedTeamNameForCupWinner = prizesData.secondPlace.teamName;
  else if (prizesData.highestBenchBoost?.playerName === cupWinnerName) determinedTeamNameForCupWinner = prizesData.highestBenchBoost.teamName;
  else if (prizesData.highestTripleCaptain?.playerName === cupWinnerName) determinedTeamNameForCupWinner = prizesData.highestTripleCaptain.teamName;
  else {
      const statEntry = statsData?.stats?.find(s => s.managerName === cupWinnerName);
      if (statEntry) {
          determinedTeamNameForCupWinner = statEntry.name;
      }
  }

  const existingCupWinnerEntry = totalWinnings.get(cupWinnerName);
  if (existingCupWinnerEntry) {
    existingCupWinnerEntry.prizeAmount += cupPrizeAmount;
    existingCupWinnerEntry.totalAmount += cupPrizeAmount;
    existingCupWinnerEntry.prizes.push(`Cup Winner (5,000)`);
    if ((existingCupWinnerEntry.teamName === "Unknown Team" || existingCupWinnerEntry.teamName === "N/A") && determinedTeamNameForCupWinner !== "Unknown Team") {
        existingCupWinnerEntry.teamName = determinedTeamNameForCupWinner;
    }
  } else {
    totalWinnings.set(cupWinnerName, {
      playerName: cupWinnerName,
      teamName: determinedTeamNameForCupWinner,
      prizeAmount: cupPrizeAmount,
      weeklyWins: 0,
      weeklyAmount: 0,
      totalAmount: cupPrizeAmount,
      prizes: [`Cup Winner (5,000)`]
    });
  }
  
  // Add weekly wins (140 each)
  if (statsData && statsData.stats) {
    statsData.stats.forEach(stat => {
      if (stat && stat.managerName) {
        const existing = totalWinnings.get(stat.managerName);
        const weeklyAmount = stat.wins * 140;
        
        if (existing) {
          existing.weeklyWins = stat.wins;
          existing.weeklyAmount = weeklyAmount;
          existing.totalAmount += weeklyAmount;
          if (stat.wins > 0) {
            existing.prizes.push(`${stat.wins} Weekly Wins (${weeklyAmount})`);
          }
        } else {
          totalWinnings.set(stat.managerName, {
            playerName: stat.managerName,
            teamName: stat.name,
            prizeAmount: 0,
            weeklyWins: stat.wins,
            weeklyAmount: weeklyAmount,
            totalAmount: weeklyAmount,
            prizes: stat.wins > 0 ? [`${stat.wins} Weekly Wins (${weeklyAmount})`] : []
          });
        }
      }
    });
  }
  
  // Convert to array and sort by total amount
  const sortedWinnings = Array.from(totalWinnings.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .filter(w => w.totalAmount > 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Qitawrari League Final Prizes"
          description="Final prize standings for the season."
          currentGameweek={prizesData.currentGameweek}
          selectedGameweek={prizesData.currentGameweek}
        />
        
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="details">Prize Details</TabsTrigger>
            <TabsTrigger value="overview">Prize Overview</TabsTrigger>
          </TabsList>
          
          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            {/* Prize Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Final Prize Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Mobile View - Cards */}
                <div className="space-y-3 sm:hidden">
                  {sortedWinnings.map((winner) => (
                    <div key={winner.playerName} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{winner.playerName}</div>
                          <div className="text-sm text-white/60">{winner.teamName}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{winner.totalAmount} ETB</div>
                          {winner.weeklyWins > 0 && (
                            <div className="text-sm text-white/60">
                              {winner.weeklyWins} weekly wins
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-white/60">
                        {winner.prizes.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View - Table */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white/60">Player</TableHead>
                        <TableHead className="text-right text-white/60">Weekly Wins</TableHead>
                        <TableHead className="text-right text-white/60">Total</TableHead>
                        <TableHead className="text-white/60">Breakdown</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedWinnings.map((winner) => (
                        <TableRow key={winner.playerName} className="border-white/10">
                          <TableCell>
                            <div>
                              <div className="font-medium">{winner.playerName}</div>
                              <div className="text-sm text-white/60">{winner.teamName}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{winner.weeklyWins || '-'}</TableCell>
                          <TableCell className="text-right font-bold">{winner.totalAmount} ETB</TableCell>
                          <TableCell>
                            <div className="text-sm text-white/60">
                              {winner.prizes.join(', ')}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            
            {/* Rules Reference */}
            <Card className="bg-black/20">
              <CardHeader>
                <CardTitle>Prize Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-white/70">
                  <p>🏆 Overall Winner - 17,000 ETB</p>
                  <p>🥈 Second Place - 4,000 ETB</p>
                  <p>🥉 Third Place - &ldquo;ሩቅ አሳቢ ቅርብ አዳሪ&rdquo; mug</p>
                  <p>💸 Weekly Wins - 140 ETB per gameweek win</p>
                  <p>🏅 Cup Winner - 5,000 ETB</p>
                  <p>🚀 Highest Bench Boost - 2,000 ETB</p>
                  <p>👑 Highest Triple Captain - 2,000 ETB</p>
                  <p>🥄 12th Place - &ldquo;የተከበሩ ቂጥ አውራሪ&rdquo; mug</p>
                  <p className="text-sm italic mt-4 text-white/50">* Final standings as of GW{prizesData.currentGameweek}.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
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
                  <CardTitle className="text-xl">Overall Winner</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-28 h-28 relative flex items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-yellow-500/30 text-4xl mb-4">
                      <span className="text-6xl">🏆</span>
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">
                      {prizesData.firstPlace?.playerName || "Still up for grabs!"}
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
                    <p className="text-sm text-white/60">GW {prizesData.highestBenchBoost?.gameweek || "?"}</p>
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
                  <CardTitle className="text-xl">12th Place</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-20 h-20 relative flex items-center justify-center rounded-full bg-gradient-to-br from-red-500/30 to-orange-500/30 text-4xl mb-3">
                      <span className="text-4xl">🙈</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      {prizesData.lastPlace?.playerName || "N/A"}
                    </h3>
                    <p className="text-sm text-white/60">{prizesData.lastPlace?.teamName || ""}</p>
                    <div className="mt-3 text-lg font-semibold text-white/70">&ldquo;የተከበሩ ቂጥ አውራሪ&rdquo; mug</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
