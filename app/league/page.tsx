import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LeagueTable } from "@/components/league-table/league-table";
import { getLeagueData } from "@/services/league-service";
import { notFound } from "next/navigation";
import { getUrlParam } from "@/lib/helpers";

export const revalidate = 0;

export default async function LeaguePage() {
  const gameweekParam = await getUrlParam("gameweek");
  const requestedGameweek = gameweekParam ? parseInt(gameweekParam) : undefined;
  const data = await getLeagueData(requestedGameweek);

  if (
    requestedGameweek &&
    (requestedGameweek < 1 || requestedGameweek > data.currentGameweek)
  ) {
    notFound();
  }

  return (
    <DashboardLayout>
      <LeagueTable 
        standings={data.standings}
        currentGameweek={data.currentGameweek}
        selectedGameweek={data.selectedGameweek}
      />
    </DashboardLayout>
  );
}
