"use client";

import { StatsPageShell } from "@/components/stats/stats-page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ManagerIdentity } from "@/components/ui/manager-identity";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowLink } from "@/components/stats/row-link";
import { useGameweekData } from "@/hooks/use-gameweek-data";
import type { TemplateTeamStat } from "./page";

async function fetchTemplateData(gw: number): Promise<TemplateTeamStat[]> {
  const resp = await fetch(`/api/template/${gw}`, { cache: "no-store" });
  if (!resp.ok) throw new Error(`Failed to load gameweek ${gw}`);
  const json = await resp.json();
  return json.data ?? [];
}

export function TemplateLeaderboardClient({
  data,
  currentGameweek,
  selectedGameweek,
}: {
  data: TemplateTeamStat[];
  currentGameweek: number;
  selectedGameweek: number;
}) {
  const { data: teams, gw, setGw } = useGameweekData<TemplateTeamStat[]>({
    cacheKey: "template",
    initial: data,
    initialGw: selectedGameweek,
    currentGameweek,
    fetcher: fetchTemplateData,
  });

  return (
    <StatsPageShell
      title="Template Leaderboard"
      description={`Ranked by average ownership of the entire squad (15 players${
        gw < currentGameweek ? `, GW ${gw}` : ", current GW"
      })`}
      currentGameweek={currentGameweek}
      selectedGameweek={gw}
      onGameweekChange={setGw}
    >
      <Card>
        <CardContent className="p-0">
          {teams.length === 0 ? (
            <EmptyState title="No squads found" description="No manager had a squad set for this gameweek." />
          ) : (
            <Table>
              <caption className="sr-only">Template leaderboard, average squad ownership</caption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Avg ownership</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team, index) => (
                  <TableRow key={team.id} className="relative">
                    <TableCell className="font-semibold tabular-nums text-fg">{index + 1}</TableCell>
                    <TableCell className="min-w-0">
                      <ManagerIdentity entryName={team.name} playerName={team.managerName} />
                    </TableCell>
                    <TableCell className="text-right font-semibold text-fg">
                      <RowLink href={`/team/${team.id}?gw=${gw}`} label={`${team.name} team page`} />
                      {team.averageOwnership.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </StatsPageShell>
  );
}
