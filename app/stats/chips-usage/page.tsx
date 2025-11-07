import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wand2 } from "lucide-react";
import { getStatsData } from "../getStatData";
import { getUrlParam } from "@/lib/helpers";
import Link from "next/link";

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
}

export default async function ChipsUsagePage() {
  // Get gameweek from URL params
  const gameweekParam = await getUrlParam("gameweek");
  
  // First, get current gameweek by fetching data once
  const initialData = await getStatsData();
  
  // Determine selected gameweek (default to current active gameweek)
  const selectedGameweek = gameweekParam 
    ? parseInt(gameweekParam as string, 10) 
    : initialData.currentGameweek;
  
  // Validate selected gameweek
  const validSelectedGameweek = (selectedGameweek >= 1 && selectedGameweek <= initialData.currentGameweek && !isNaN(selectedGameweek))
    ? selectedGameweek
    : initialData.currentGameweek;
  
  // Fetch data filtered by selected gameweek (only if different from initial fetch)
  const data = validSelectedGameweek === initialData.currentGameweek && !gameweekParam
    ? initialData
    : await getStatsData(validSelectedGameweek);

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
            <div className="flex font-bold text-gray-300 px-2 py-1.5 border-b border-gray-700 items-center bg-gradient-to-r from-gray-800 to-gray-900 text-[10.5px]">
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
                    <span className="font-bold text-[10.5px]">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 ml-2">
                    <div className="font-semibold text-[10.5px] truncate text-white leading-tight">
                      {team.name}
                    </div>
                    <div className="text-white/60 truncate text-[8.5px] leading-tight">
                      {team.managerName}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {team.chips.map((chip, chipIndex) => (
                        <span
                          key={chipIndex}
                          className="inline-flex items-center rounded bg-white/10 px-1 py-0.5 text-[8px]"
                        >
                          <span className="font-semibold text-white/90">{chip.name}</span>
                          <span className="ml-0.5 text-white/60">(GW{chip.gameweek})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="w-12 text-right font-bold text-[11.5px] text-white">
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