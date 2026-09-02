import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LeagueTable } from "@/components/league-table/league-table";
import { getLeagueData } from "@/services/league-service";
import { notFound } from "next/navigation";
import { getUrlParam } from "@/lib/helpers";

export const revalidate = 0;

export default async function LeaguePage() {
  const gameweekParam = await getUrlParam("gameweek");
  const parsedGameweek = gameweekParam ? parseInt(gameweekParam, 10) : undefined;
  const requestedGameweek = Number.isNaN(parsedGameweek) ? undefined : parsedGameweek;

  // getLeagueData throws on failure — app/error.tsx renders the real error
  // rather than a silent, misleading empty league. The gameweek check below
  // only runs once that fetch has actually succeeded.
  const data = await getLeagueData(requestedGameweek);

  // parsedGameweek is undefined only when gameweekParam was an empty string,
  // which is itself invalid input — treat that the same as NaN.
  const gwValue = parsedGameweek ?? NaN;
  if (
    gameweekParam !== null &&
    (Number.isNaN(gwValue) || gwValue < 1 || gwValue > data.currentGameweek)
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

