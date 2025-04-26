import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStatsData } from "../getStatData";
import { formatPoints } from "@/lib/fpl";
import Link from "next/link";

interface AssistantManagerStats {
  id: number;
  name: string;
  managerName: string;
  hasUsed: boolean;
  totalPoints: number;
  startGameweek: number | null;
  selections: { gameweek: number; selectedManager: string; points: number }[];
}

function AssistantManagerCard({ team, rank }: { team: AssistantManagerStats; rank: number }) {
  return (
    <div className="bg-white/5 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">{rank}</span>
        <span className="text-lg font-bold">{team.hasUsed ? `${formatPoints(team.totalPoints)} pts` : "Not Used"}</span>
      </div>
      <div>
        <div className="font-medium">{team.name}</div>
        <div className="text-sm text-white/60">{team.managerName}</div>
      </div>
      {team.hasUsed && team.startGameweek && (
        <div className="space-y-2">
          <div className="text-sm text-white/60">Started GW{team.startGameweek}</div>
          <div className="space-y-1">
            {team.selections.map((selection) => (
              <div 
                key={selection.gameweek} 
                className="grid grid-cols-[auto,1fr,auto] gap-2 items-center text-xs bg-white/5 rounded px-2 py-1"
              >
                <span className="text-white/60">GW{selection.gameweek}</span>
                <span className="font-medium truncate">{selection.selectedManager}</span>
                <span className="text-white/60">{formatPoints(selection.points)} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function AssistantManagerPage() {
  const data = await getStatsData();

  return (
    <DashboardLayout>
      <PageHeader
        title="Assistant Manager Chip Usage"
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
            Assistant Manager Chip Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="space-y-3 sm:hidden">
            {data.assistantManagerStats.map((team: AssistantManagerStats, index: number) => (
              <AssistantManagerCard key={team.id} team={team} rank={index + 1} />
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="w-12 text-white/60">Rank</TableHead>
                  <TableHead className="text-white/60">Team</TableHead>
                  <TableHead className="text-right text-white/60">Total Points</TableHead>
                  <TableHead className="text-white/60">Manager Selections</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.assistantManagerStats.map((team: AssistantManagerStats, index: number) => (
                  <TableRow key={team.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-white/60">{team.managerName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {team.hasUsed ? formatPoints(team.totalPoints) : "Not Used"}
                    </TableCell>
                    <TableCell>
                      {team.hasUsed && team.selections.length > 0 && (
                        <div className="space-y-1">
                          {team.selections.map((selection) => (
                            <div 
                              key={selection.gameweek}
                              className="flex items-center justify-between gap-2 text-xs bg-white/5 rounded px-2 py-1"
                            >
                              <span className="text-white/60">GW{selection.gameweek}</span>
                              <span className="font-medium">{selection.selectedManager}</span>
                              <span className="text-white/60">{formatPoints(selection.points)} pts</span>
                            </div>
                          ))}
                        </div>
                      )}
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