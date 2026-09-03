import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  CalendarDays,
  ChevronRight,
  Layers,
  PieChart,
  TrendingDown,
  Trophy,
  Users,
  Wand2,
} from "lucide-react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { getHeaderContext } from "@/services/league";
import { getStatsData } from "./getStatData";
import { formatPoints } from "@/lib/fpl";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LINKS = [
  {
    href: "/stats/gameweek-winners",
    icon: CalendarDays,
    title: "Gameweek winners",
    description: "Weekly winners for every finished gameweek.",
  },
  {
    href: "/stats/chips-usage",
    icon: Wand2,
    title: "Chips usage",
    description: "Who's played what, and what's left this half.",
  },
  {
    href: "/stats/bench-points",
    icon: Layers,
    title: "Bench points",
    description: "Who's scored the most points warming the bench.",
  },
  {
    href: "/stats/hits-leaderboard",
    icon: TrendingDown,
    title: "Hits leaderboard",
    description: "Who's taken the most transfer hits.",
  },
  {
    href: "/stats/template-leaderboard",
    icon: Users,
    title: "Template leaderboard",
    description: "Ranked by average ownership of the entire squad.",
  },
  {
    href: "/stats/ownership",
    icon: PieChart,
    title: "Effective ownership",
    description: "Who the league is riding, and the differentials.",
  },
  {
    href: "/transfers",
    icon: ArrowRightLeft,
    title: "Transfer feed",
    description: "Every move this gameweek, best and worst included.",
  },
] as const;

export default async function StatsLandingPage() {
  const header = await getHeaderContext();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Stats"
          description="League highlights and detailed statistics"
          currentGameweek={header.currentGameweek}
          selectedGameweek={header.currentGameweek}
          showGameweekSelector={false}
        />
        <Suspense fallback={<RecordsStripSkeleton />}>
          <RecordsStrip />
        </Suspense>
        <Card>
          <CardContent className="p-0">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-12 items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:px-5"
              >
                <link.icon className="h-5 w-5 shrink-0 text-fg-3" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg">{link.title}</div>
                  <div className="truncate text-xs text-fg-2">{link.description}</div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-fg-3" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

async function RecordsStrip() {
  const data = await withUpstreamCounter(async () => {
    const result = await getStatsData();
    logTelemetry("/stats");
    return result;
  });

  const mostWins = data.stats[0];
  const mostChips = data.chipStats[0];
  const mostBench = data.benchStats[0];

  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      <StatTile
        label="Most wins"
        value={mostWins?.wins ?? 0}
        sub={mostWins ? `${mostWins.name} · ${mostWins.managerName}` : undefined}
        href="/stats/gameweek-winners"
        icon={Trophy}
      />
      <StatTile
        label="Most chips used"
        value={mostChips?.totalChipsUsed ?? 0}
        sub={mostChips ? `${mostChips.name} · ${mostChips.managerName}` : undefined}
        href="/stats/chips-usage"
        icon={Wand2}
      />
      <StatTile
        label="Most bench points"
        value={formatPoints(mostBench?.benchPoints)}
        sub={mostBench ? `${mostBench.name} · ${mostBench.managerName}` : undefined}
        href="/stats/bench-points"
        icon={Layers}
      />
    </div>
  );
}

function RecordsStripSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-8 w-16" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
