import { TrendingDown, TrendingUp } from "lucide-react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsPageShell } from "@/components/stats/stats-page-shell";
import { RowLink } from "@/components/stats/row-link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ManagerIdentity } from "@/components/ui/manager-identity";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadStatsData } from "../getStatData";
import { formatPoints, perGameweek } from "@/lib/fpl";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function BenchPointsPage({
  searchParams,
}: {
  searchParams: Promise<GwSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const gameweekParam = resolveGwParam("/stats/bench-points", resolvedSearchParams);

  const { data, validSelectedGameweek } = await withUpstreamCounter(async () => {
    const result = await loadStatsData(gameweekParam);
    logTelemetry("/stats/bench-points");
    return result;
  });

  return (
    <DashboardLayout>
      <StatsPageShell
        title="Bench Points"
        description={`After ${data.finishedGameweeks} completed gameweeks${
          validSelectedGameweek < data.currentGameweek ? ` (as of GW ${validSelectedGameweek})` : ""
        }`}
        currentGameweek={data.currentGameweek}
        selectedGameweek={validSelectedGameweek}
      >
        <Card>
          <CardContent className="p-0">
            {data.benchStats.length === 0 ? (
              <EmptyState title="No data yet" description="Bench points appear once a gameweek finishes." />
            ) : (
              <Table>
                <caption className="sr-only">Points left on the bench</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Per GW</TableHead>
                    <TableHead className="hidden w-10 sm:table-cell" aria-hidden />
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.benchStats.map((team, index) => (
                    <TableRow key={team.id} className="relative">
                      <TableCell className="font-semibold tabular-nums text-fg">{index + 1}</TableCell>
                      <TableCell className="min-w-0">
                        <ManagerIdentity entryName={team.name} playerName={team.managerName} />
                      </TableCell>
                      <TableCell className="hidden text-right text-fg-2 sm:table-cell">
                        {perGameweek(team.benchPoints, data.finishedGameweeks)}
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">
                        {index === 0 ? (
                          <TrendingUp className="ml-auto h-4 w-4 text-positive" />
                        ) : index === data.benchStats.length - 1 ? (
                          <TrendingDown className="ml-auto h-4 w-4 text-negative" />
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-fg">
                        <RowLink href={`/team/${team.id}`} label={`${team.name} team page`} />
                        {formatPoints(team.benchPoints)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </StatsPageShell>
    </DashboardLayout>
  );
}
