import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wand2 } from "lucide-react";
import { loadStatsData } from "../getStatData";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import Link from "next/link";
import { chipDisplayOrder, type ChipStatusResult } from "@/lib/chips";

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
  return `${abbrs.join(", ")} left (${currentHalfAvailable.length})`;
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

  return (
    <DashboardLayout>
      <PageHeader
        title="Chips Usage"
        description={`After ${data.finishedGameweeks} completed gameweeks${validSelectedGameweek < data.currentGameweek ? ` (as of GW ${validSelectedGameweek})` : ''}`}
        currentGameweek={data.currentGameweek}
        selectedGameweek={validSelectedGameweek}
        showGameweekSelector={true}
      />
      <div className="mb-6">
        <Link href="/stats" className="text-sm text-blue-400 hover:underline">← Back to Stats</Link>
      </div>
      <Card className="border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-gray-800 to-gray-900">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
            <Wand2 className="h-5 w-5 text-purple-500" />
            Chips Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 py-0 sm:py-6">
          {/* Mobile View - Compact Table */}
          <div className="sm:hidden text-white text-xs rounded-lg overflow-hidden border border-white/10">
            {/* Header */}
            <div className="flex font-bold text-gray-300 px-2 py-1.5 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900 text-xs">
              <div className="w-8 text-center">#</div>
              <div className="flex-1">Team</div>
              <div className="w-12 text-right">Used</div>
            </div>
            {/* Rows */}
            <div className="overflow-y-auto">
              {data.chipStats.map((team: ChipStats, index: number) => (
                <div
                  key={team.id}
                  className={`flex items-center px-2 py-1.5 border-b border-white/5 ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50'}`}
                >
                  <div className="w-8 flex items-center justify-center">
                    <span className="font-bold text-xs">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 ml-2">
                    <div className="font-semibold text-xs truncate text-white leading-tight">
                      {team.name}
                    </div>
                    <div className="text-white/60 truncate text-xs leading-tight">
                      {team.managerName}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {team.chips.map((chip, chipIndex) => (
                        <span
                          key={chipIndex}
                          className="inline-flex items-center rounded bg-white/10 px-1 py-0.5 text-xs"
                        >
                          <span className="font-semibold text-white/90">{chip.name}</span>
                          <span className="ml-0.5 text-white/60">(GW{chip.gameweek})</span>
                        </span>
                      ))}
                    </div>
                    <div className="text-purple-300/80 text-xs mt-1">
                      {remainingChipsLine(team.chipStatuses, data.currentGameweek)}
                    </div>
                  </div>
                  <div className="w-12 text-right font-bold text-xs text-white">
                    {team.totalChipsUsed}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 bg-gradient-to-r from-gray-800 to-gray-900 hover:bg-gradient-to-r">
                  <TableHead className="w-12 text-gray-300 font-bold">Rank</TableHead>
                  <TableHead className="text-gray-300 font-bold">Team</TableHead>
                  <TableHead className="text-right text-gray-300 font-bold">Used</TableHead>
                  <TableHead className="text-right text-gray-300 font-bold">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.chipStats.map((team: ChipStats, index: number) => (
                  <TableRow key={team.id} className={`border-white/5 transition-all ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-900/50'} hover:bg-purple-900/20`}>
                    <TableCell className="font-bold py-3">{index + 1}</TableCell>
                    <TableCell className="py-3">
                      <div>
                        <div className="font-medium text-white">{team.name}</div>
                        <div className="text-sm text-white/60">{team.managerName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold py-3 text-white">{team.totalChipsUsed}</TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        {team.chips.map((chip, chipIndex) => (
                          <span
                            key={chipIndex}
                            className="inline-flex items-center rounded bg-white/10 px-2 py-1 text-xs"
                          >
                            <span className="font-semibold text-white/90">{chip.name}</span>
                            <span className="ml-1 text-white/60">(GW{chip.gameweek})</span>
                          </span>
                        ))}
                      </div>
                      <div className="text-right text-purple-300/80 text-xs mt-1">
                        {remainingChipsLine(team.chipStatuses, data.currentGameweek)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
} 