import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wand2 } from "lucide-react";
import { getStatsData } from "../getStatData";
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

function ChipsUsageCard({ team, rank }: { team: ChipStats; rank: number }) {
  return (
    <div className="bg-white/5 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">{rank}</span>
        <span className="text-lg font-bold">{team.totalChipsUsed} chips</span>
      </div>
      <div>
        <div className="font-medium">{team.name}</div>
        <div className="text-sm text-white/60">{team.managerName}</div>
      </div>
      <div className="flex flex-wrap gap-1">
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
    </div>
  );
}

export default async function ChipsUsagePage() {
  const data = await getStatsData();

  return (
    <DashboardLayout>
      <PageHeader
        title="Chips Usage"
        description={`After ${data.finishedGameweeks} completed gameweeks`}
        currentGameweek={data.finishedGameweeks}
        selectedGameweek={data.finishedGameweeks}
        showGameweekSelector={false}
      />
      <div className="mb-6">
        <Link href="/stats" className="text-sm text-blue-400 hover:underline">← Back to Stats</Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-5 w-5 text-purple-500" />
            Chips Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="space-y-3 sm:hidden">
            {data.chipStats.map((team: ChipStats, index: number) => (
              <ChipsUsageCard key={team.id} team={team} rank={index + 1} />
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="w-12 text-white/60">Rank</TableHead>
                  <TableHead className="text-white/60">Team</TableHead>
                  <TableHead className="text-right text-white/60">Used</TableHead>
                  <TableHead className="text-right text-white/60">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.chipStats.map((team: ChipStats, index: number) => (
                  <TableRow key={team.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-white/60">{team.managerName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">{team.totalChipsUsed}</TableCell>
                    <TableCell>
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