import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, Timer, BarChart, Zap } from "lucide-react"
import { FootballHero } from "@/components/ui/shape-landing-hero"
import { ImageSlideshow } from "./qitawrari/image-slideshow"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function calculateDaysToEvent(targetDate: string) {
  const today = new Date()
  const eventDate = new Date(targetDate)
  const diffTime = Math.abs(eventDate.getTime() - today.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export default function HomePage() {
  const daysToFPLCup = calculateDaysToEvent("2025-05-10")

  return (
    <DashboardLayout>
      {/* Hero Section */}
      <div className="-mt-14">
        <FootballHero 
          badge="Qitawrari Hub" 
          title1="Where Legends" 
          title2="Are Made" 
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
            </div>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-green-500" />
        </Card>

        <div className="grid gap-8">
          <ImageSlideshow />

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="relative overflow-hidden bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-medium">Reigning Qitawrari</CardTitle>
                <Crown className="h-6 w-6 text-fuchsia-500 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-4xl">
                    👑
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                      Eyosyas Kebede
                    </div>
                    <div className="text-lg text-white/60">
                      The one who defied all odds... by finishing last
                    </div>
                    <div className="text-sm text-white/40 italic">
                      &ldquo;With great power comes great responsibility to do better next season&rdquo;
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-medium">FPL Cup Countdown</CardTitle>
                <Timer className="h-6 w-6 text-cyan-500 animate-spin-slow" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 text-4xl">
                    ⚔️
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                      {daysToFPLCup} Days
                    </div>
                    <div className="text-lg text-white/60">
                      Until the FPL Cup begins!
                    </div>
                    <div className="text-sm text-white/40">
                      Starting May 10, 2025 - May the odds be ever in your favor
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
            </Card>
          </div>

         

          <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <CardHeader>
              <CardTitle className="text-xl">Hall of Qitawrari</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                  <div className="text-2xl">🏆</div>
                  <div>
                    <div className="font-medium">Season 2022/23</div>
                    <div className="text-white/60">The Original Qitawrari</div>
                  </div>
                  <div className="ml-auto font-bold text-amber-500">T</div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                  <div className="text-2xl">👑</div>
                  <div>
                    <div className="font-medium">Season 2023/24</div>
                    <div className="text-white/60">The Current Holder</div>
                  </div>
                  <div className="ml-auto font-bold text-orange-500">Eyosyas Kebede</div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                  <div className="text-2xl">❓</div>
                  <div>
                    <div className="font-medium">Season 2024/25</div>
                    <div className="text-white/60">The Next Legend</div>
                  </div>
                  <div className="ml-auto font-bold text-white/40">To be determined...</div>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

