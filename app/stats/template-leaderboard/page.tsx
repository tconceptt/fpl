import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { getUrlParam } from "@/lib/helpers";
import { TemplateLeaderboardClient } from "./template-leaderboard-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export interface TemplateTeamStat {
  id: number;
  name: string;
  managerName: string;
  averageOwnership: number; // 0..100
  playersCount: number;
}

export default async function TemplateLeaderboardPage() {
  const gameweekParam = await getUrlParam("gameweek");

  const { currentGameweek, validSelectedGameweek, sorted } = await withUpstreamCounter(async () => {
    const leagueId = process.env.FPL_LEAGUE_ID;
    if (!leagueId) {
      throw new Error("FPL_LEAGUE_ID environment variable is not set.");
    }

    const bootstrap = await cachedKind("bootstrap", "bootstrap", () => client.bootstrap());
    const currentEvent =
      bootstrap.events.find((e) => e.is_current) ??
      bootstrap.events.find((e) => e.is_next) ??
      [...bootstrap.events].reverse().find((e) => e.finished);
    const currentGameweek = currentEvent ? currentEvent.id : 1;

    const parsedGameweek = gameweekParam ? parseInt(gameweekParam, 10) : currentGameweek;
    const validSelectedGameweek =
      parsedGameweek >= 1 && parsedGameweek <= currentGameweek && !Number.isNaN(parsedGameweek)
        ? parsedGameweek
        : currentGameweek;

    const ownershipMap = new Map<number, number>(
      bootstrap.elements.map((el) => [el.id, Number.parseFloat(el.selected_by_percent || "0") || 0])
    );

    const standings = await cachedKind("standings", `standings:${leagueId}`, () =>
      client.classicStandings(leagueId)
    );
    const teams = standings.standings.results;

    const teamStats: TemplateTeamStat[] = await Promise.all(
      teams.map(async (team) => {
        try {
          const teamDetails = await cachedKind(
            "picks",
            `picks:${team.entry}:${validSelectedGameweek}`,
            () => client.picks(team.entry, validSelectedGameweek)
          );
          const squad = teamDetails.picks.filter((p) => p.position <= 15);
          const ownershipValues = squad.map((p) => ownershipMap.get(p.element) || 0);
          const playersCount = ownershipValues.length || 0;
          const averageOwnership =
            playersCount === 0 ? 0 : ownershipValues.reduce((sum, v) => sum + v, 0) / playersCount;

          return {
            id: team.entry,
            name: team.entry_name,
            managerName: team.player_name,
            averageOwnership,
            playersCount,
          };
        } catch {
          return {
            id: team.entry,
            name: team.entry_name,
            managerName: team.player_name,
            averageOwnership: 0,
            playersCount: 0,
          };
        }
      })
    );

    const sorted = teamStats.slice().sort((a, b) => a.averageOwnership - b.averageOwnership);
    logTelemetry("/stats/template-leaderboard");
    return { currentGameweek, validSelectedGameweek, sorted };
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Template Leaderboard"
        description={`Ranked by average ownership of entire squad (15 players${validSelectedGameweek < currentGameweek ? `, GW ${validSelectedGameweek}` : ', current GW'})`}
        currentGameweek={currentGameweek}
        selectedGameweek={validSelectedGameweek}
        showGameweekSelector={true}
      />
      <div className="mb-6">
        <Link href="/stats" className="text-sm text-blue-400 hover:underline">← Back to Stats</Link>
      </div>
      <TemplateLeaderboardClient data={sorted} currentGameweek={currentGameweek} selectedGameweek={validSelectedGameweek} />
    </DashboardLayout>
  );
}
