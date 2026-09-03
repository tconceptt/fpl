import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  BarChart3,
  ChevronRight,
  Frown,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { LivePill } from "@/components/ui/live-pill";
import { DashboardDataSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { getStatsData } from "@/app/stats/getStatData";
import { getLeagueSnapshot } from "@/services/league";
import { leagueConfig } from "@/config/league";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { formatPoints } from "@/lib/fpl";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const QUICK_LINKS = [
  { href: "/", label: "League", description: "Full standings for any gameweek", icon: Trophy },
  { href: "/gameweek", label: "Gameweek", description: "This week's leaders, risers and fallers", icon: Zap },
  { href: "/h2h", label: "H2H", description: "Head-to-head matchups and standings", icon: Swords },
  { href: "/transfers", label: "Transfers", description: "Every transfer made this gameweek", icon: ArrowRightLeft },
  { href: "/stats", label: "Stats", description: "Records, chips, ownership and more", icon: BarChart3 },
];

/**
 * The one heavy section on this page. `getStatsData()` calls
 * `getLeagueSnapshot(selectedGameweek, { includePicks: false })` internally
 * with the same (undefined, false) arguments used here, so — since
 * getLeagueSnapshot is memoised per request via React `cache()` — the two
 * calls below resolve the same promise rather than fetching twice, and
 * neither pays for the 14 picks/fixtures/live calls this page never reads.
 */
async function DashboardData() {
  const { snapshot, statsData } = await withUpstreamCounter(async () => {
    const [snapshot, statsData] = await Promise.all([
      getLeagueSnapshot(undefined, { includePicks: false }),
      getStatsData(),
    ]);
    logTelemetry("/dashboard");
    return { snapshot, statsData };
  });

  const managers = snapshot.managers;
  const isLive = snapshot.liveState === "live";

  const leader =
    managers.length > 0
      ? managers.reduce((best, m) => (m.total_points > best.total_points ? m : best))
      : null;

  const gwLeader =
    managers.length > 0
      ? managers.reduce((best, m) => (m.net_points > best.net_points ? m : best))
      : null;

  const highestGW = statsData.stats.reduce(
    (best, team) =>
      team.bestGameweek.points > best.points
        ? {
            teamId: team.id,
            teamName: team.name,
            managerName: team.managerName,
            gameweek: team.bestGameweek.gameweek,
            points: team.bestGameweek.points,
          }
        : best,
    { teamId: 0, teamName: "", managerName: "", gameweek: 0, points: -1 }
  );

  return (
    <>
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="text-xs text-fg-2">League</div>
          <div className="truncate text-sm font-semibold text-fg">{snapshot.leagueName}</div>
        </div>
        <div className="min-w-0">
          <div className="text-xs text-fg-2">Gameweek</div>
          <div className="text-sm font-semibold text-fg">GW {snapshot.selectedGameweek}</div>
        </div>
        <div className="ml-auto">
          {isLive ? <LivePill /> : <span className="text-xs text-fg-3">Final</span>}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile
          label="League leader"
          value={leader ? formatPoints(leader.total_points) : "–"}
          sub={leader ? `${leader.entry_name} · ${leader.player_name}` : "No standings yet"}
          tone="accent"
          href={leader ? `/team/${leader.entry}` : undefined}
          icon={Trophy}
        />
        <StatTile
          label="Highest GW score"
          value={highestGW.points > 0 ? formatPoints(highestGW.points) : "–"}
          sub={
            highestGW.points > 0
              ? `${highestGW.teamName} · GW ${highestGW.gameweek}`
              : "No data yet"
          }
          href={highestGW.points > 0 ? `/team/${highestGW.teamId}?gw=${highestGW.gameweek}` : undefined}
          icon={Zap}
        />
        <StatTile
          label="This week's leader"
          value={gwLeader ? formatPoints(gwLeader.net_points) : "–"}
          sub={gwLeader ? `${gwLeader.entry_name} · GW ${snapshot.selectedGameweek}` : "No standings yet"}
          href={gwLeader ? `/team/${gwLeader.entry}?gw=${snapshot.selectedGameweek}` : undefined}
          icon={BarChart3}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-fg-3" />
              Reigning Champion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-fg">
              {leagueConfig.reigning.champion}
            </p>
            <p className="mt-1 text-xs text-fg-3">Last season winner</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Frown className="h-4 w-4 text-fg-3" />
              Reigning Qitawrari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-fg">
              {leagueConfig.reigning.qitawrari}
            </p>
            <p className="mt-1 text-xs text-fg-3">{leagueConfig.reigning.qitawrariNote}</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 sm:gap-8">
        <PageHeader title="Dashboard" showGameweekSelector={false} currentGameweek={0} selectedGameweek={0} />

        <Suspense fallback={<DashboardDataSkeleton />}>
          <DashboardData />
        </Suspense>

        <Section title="Explore">
          <Card className="divide-y divide-border p-0">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
              >
                <link.icon className="h-5 w-5 shrink-0 text-fg-3" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg">{link.label}</div>
                  <div className="truncate text-xs text-fg-2">{link.description}</div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-fg-3" />
              </Link>
            ))}
          </Card>
        </Section>
      </div>
    </DashboardLayout>
  );
}
