import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { TeamSquad } from "@/components/team/team-squad";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { getTeamView } from "@/services/team-service";
import { getCurrentGameweek } from "@/services/league-service";
import { getUrlParam } from "@/lib/helpers";

export default async function TeamPage({ params }: { params: { entry: string } }) {
  const entryId = params.entry;
  const gameweekParam = await getUrlParam("gameweek");
  const currentGw = await getCurrentGameweek();
  const gameweek = gameweekParam ? parseInt(gameweekParam) : currentGw;

  const team = await getTeamView(entryId, gameweek);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={`Team #${team.entryId}`}
          description={`Gameweek ${team.gameweek} • ${team.activeChip ? `Chip: ${team.activeChip}` : "No chip"}`}
          currentGameweek={currentGw}
          selectedGameweek={team.gameweek}
        />

        <div className="flex items-center justify-between">
          <Link href={`/league?gameweek=${team.gameweek}`} className="text-sm text-white/70 hover:text-white">← Back to League</Link>
          <div className="text-sm text-white/70">GW Points: <span className="font-medium text-white">{team.totalPoints}</span>{team.transferCost ? <span className="ml-2">(-{team.transferCost})</span> : null}</div>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <TeamSquad starters={team.starters} bench={team.bench} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


