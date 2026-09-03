import { LayoutGrid } from "lucide-react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsPageShell } from "@/components/stats/stats-page-shell";
import { RowLink } from "@/components/stats/row-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ManagerIdentity } from "@/components/ui/manager-identity";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadStatsData } from "../getStatData";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { chipDisplayOrder, groupChipWindowsByHalf, type ChipStatusResult } from "@/lib/chips";
import { ChipsGrid } from "@/components/stats/chips-grid";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChipInfo {
  name: string;
  gameweek: number;
}

interface ChipStats {
  id: number;
  name: string;
  managerName: string;
  totalChipsUsed: number;
  chips: ChipInfo[];
  chipStatuses?: ChipStatusResult[];
}

const CHIP_ABBR: Record<string, string> = {
  wildcard: "WC",
  freehit: "FH",
  bboost: "BB",
  "3xc": "TC",
};

/** "WC, FH left" for the chips still available in the current half, in a fixed WC/FH/BB/TC order. */
function remainingChipsLine(chipStatuses: ChipStatusResult[] | undefined, currentGameweek: number): string {
  if (!chipStatuses) return "";
  const currentHalfAvailable = chipStatuses.filter(
    (s) =>
      s.status === "available" &&
      s.window.startEvent <= currentGameweek &&
      currentGameweek <= s.window.stopEvent
  );
  if (currentHalfAvailable.length === 0) return "None left this half";
  const availableNames = new Set(currentHalfAvailable.map((s) => s.window.name));
  const abbrs = chipDisplayOrder
    .filter((name) => availableNames.has(name))
    .map((name) => CHIP_ABBR[name] ?? name);
  return `${abbrs.join(", ")} left`;
}

export default async function ChipsUsagePage({
  searchParams,
}: {
  searchParams: Promise<GwSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const gameweekParam = resolveGwParam("/stats/chips-usage", resolvedSearchParams);

  const { data, validSelectedGameweek } = await withUpstreamCounter(async () => {
    const result = await loadStatsData(gameweekParam);
    logTelemetry("/stats/chips-usage");
    return result;
  });

  const halves = groupChipWindowsByHalf(data.chipWindows);
  const gridManagers = [...data.chipStats]
    .sort((a: ChipStats, b: ChipStats) => a.name.localeCompare(b.name))
    .map((team: ChipStats) => ({
      id: team.id,
      name: team.name,
      managerName: team.managerName,
      chipStatuses: team.chipStatuses ?? [],
    }));

  return (
    <DashboardLayout>
      <StatsPageShell
        title="Chips Usage"
        description={`After ${data.finishedGameweeks} completed gameweeks${
          validSelectedGameweek < data.currentGameweek ? ` (as of GW ${validSelectedGameweek})` : ""
        }`}
        currentGameweek={data.currentGameweek}
        selectedGameweek={validSelectedGameweek}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-fg-3" />
              Chips remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-fg-2">
              Every chip comes twice this season. A used dot shows the gameweek it was played on hover.
            </p>
            <ChipsGrid managers={gridManagers} halves={halves} currentGameweek={data.currentGameweek} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {data.chipStats.length === 0 ? (
              <EmptyState title="No chips played" description="No manager has played a chip yet." />
            ) : (
              <Table>
                <caption className="sr-only">Chips used by manager</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="hidden sm:table-cell">Remaining</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.chipStats.map((team: ChipStats, index: number) => (
                    <TableRow key={team.id} className="relative">
                      <TableCell className="font-semibold tabular-nums text-fg">{index + 1}</TableCell>
                      <TableCell className="min-w-0">
                        <ManagerIdentity entryName={team.name} playerName={team.managerName} />
                      </TableCell>
                      <TableCell className="hidden text-xs text-fg-2 sm:table-cell">
                        {remainingChipsLine(team.chipStatuses, data.currentGameweek)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-fg">
                        <RowLink href={`/team/${team.id}`} label={`${team.name} team page`} />
                        {team.totalChipsUsed}
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
