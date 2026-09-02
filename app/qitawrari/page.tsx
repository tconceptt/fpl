import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, Timer } from "lucide-react"

import { ImageSlideshow } from "./image-slideshow"
import { leagueConfig } from "@/config/league"
import * as client from "@/lib/fpl/client"
import { cached } from "@/lib/fpl/cache"
import { ttlFor } from "@/lib/fpl/ttl"
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry"

export const maxDuration = 60;

const HALL_OF_QITAWRARI_ICONS = ["🏆", "👑", "❓"]
const HALL_OF_QITAWRARI_STYLES = [
  "bg-gradient-to-r from-amber-500/20 to-orange-500/20",
  "bg-white/5",
  "bg-white/5",
]
const HALL_OF_QITAWRARI_VALUE_STYLES = ["text-amber-500", "text-orange-500", "text-white/40"]

function daysUntil(targetDate: Date): number {
  const today = new Date()
  const diffTime = targetDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

async function getCupCountdown(): Promise<{ days: number | null; underway: boolean; announced: boolean }> {
  const bootstrap = await cached("bootstrap", ttlFor("bootstrap", "quiet"), () => client.bootstrap())

  const cupEventId = bootstrap.game_settings?.cup_start_event_id
  if (!cupEventId) {
    return { days: null, underway: false, announced: false }
  }

  const cupEvent = bootstrap.events.find((e) => e.id === cupEventId)
  if (!cupEvent?.deadline_time) {
    return { days: null, underway: false, announced: false }
  }

  const days = daysUntil(new Date(cupEvent.deadline_time))
  if (days < 0) {
    return { days: null, underway: true, announced: true }
  }

  return { days, underway: false, announced: true }
}

export default async function QitawrariPage() {
  const cupCountdown = await withUpstreamCounter(async () => {
    const result = await getCupCountdown()
    logTelemetry("/qitawrari")
    return result
  })

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Qitawrari Hub</h1>
          <p className="text-lg text-white/60">
            Where legends are made (or not) 🏆
          </p>
        </div>

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
                      {leagueConfig.qitawrariHub.name}
                    </div>
                    <div className="text-lg text-white/60">
                      {leagueConfig.qitawrariHub.tagline}
                    </div>
                    <div className="text-sm text-white/40 italic">
                      &ldquo;{leagueConfig.qitawrariHub.quote}&rdquo;
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
                    {cupCountdown.announced ? (
                      cupCountdown.underway ? (
                        <>
                          <div className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                            Cup underway
                          </div>
                          <div className="text-lg text-white/60">
                            The FPL Cup has begun!
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                            {cupCountdown.days} Days
                          </div>
                          <div className="text-lg text-white/60">
                            Until the FPL Cup begins!
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <div className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                          Cup dates not announced yet
                        </div>
                        <div className="text-lg text-white/60">
                          Check back once FPL schedules the cup.
                        </div>
                      </>
                    )}
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
                {leagueConfig.records.map((record, index) => (
                  <div
                    key={record.season}
                    className={`flex items-center gap-4 p-4 rounded-lg ${HALL_OF_QITAWRARI_STYLES[index] ?? "bg-white/5"}`}
                  >
                    <div className="text-2xl">{HALL_OF_QITAWRARI_ICONS[index] ?? "❓"}</div>
                    <div>
                      <div className="font-medium">Season {record.season}</div>
                      <div className="text-white/60">{record.note}</div>
                    </div>
                    <div className={`ml-auto font-bold ${HALL_OF_QITAWRARI_VALUE_STYLES[index] ?? "text-white/40"}`}>
                      {record.qitawrari}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
