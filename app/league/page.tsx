import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { LeagueTable } from "@/components/league-table/league-table"
import { PageHeader } from "@/components/page-header"
import { getLeagueData } from "@/services/league-service"
import { notFound } from "next/navigation"

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function LeaguePage({ searchParams }: PageProps) {
  const requestedGameweek = searchParams.gameweek ? parseInt(searchParams.gameweek as string) : undefined;
  const data = await getLeagueData(requestedGameweek);

  // Validate the requested gameweek
  if (requestedGameweek && (requestedGameweek < 1 || requestedGameweek > data.currentGameweek)) {
    notFound();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader 
          title={data.leagueName}
          description={
            data.selectedGameweek === data.currentGameweek 
              ? "Live League Standings"
              : `League Standings as of Gameweek ${data.selectedGameweek}`
          }
          currentGameweek={data.currentGameweek}
          selectedGameweek={data.selectedGameweek}
        />

        <LeagueTable standings={data.standings} />
      </div>
    </DashboardLayout>
  )
} 