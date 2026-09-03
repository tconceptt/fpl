import { DashboardLayout } from "@/components/layout/dashboard-layout";
import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { resolveGwParam, type GwSearchParams } from "@/lib/gw-param";
import { fetchPicks } from "@/services/league";
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

export default async function TemplateLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<GwSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const gameweekParam = resolveGwParam("/stats/template-leaderboard", resolvedSearchParams);

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

    // Batched MGET across every manager's picks for this gameweek, instead
    // of one cachedKind call per team (perf-research §5 item 3) — same
    // cache keys (`picks:{entry}:{gw}`), same shape.
    const picksByEntry = await fetchPicks(
      teams.map((t) => t.entry),
      validSelectedGameweek
    );

    const teamStats: TemplateTeamStat[] = teams.map((team) => {
      const teamDetails = picksByEntry.get(team.entry);
      const squad = teamDetails ? teamDetails.picks.filter((p) => p.position <= 15) : [];
      const ownershipValues = squad.map((p) => ownershipMap.get(p.element) || 0);
      const playersCount = ownershipValues.length;
      const averageOwnership =
        playersCount === 0 ? 0 : ownershipValues.reduce((sum, v) => sum + v, 0) / playersCount;

      return {
        id: team.entry,
        name: team.entry_name,
        managerName: team.player_name,
        averageOwnership,
        playersCount,
      };
    });

    const sorted = teamStats.slice().sort((a, b) => a.averageOwnership - b.averageOwnership);
    logTelemetry("/stats/template-leaderboard");
    return { currentGameweek, validSelectedGameweek, sorted };
  });

  return (
    <DashboardLayout>
      <TemplateLeaderboardClient
        data={sorted}
        currentGameweek={currentGameweek}
        selectedGameweek={validSelectedGameweek}
      />
    </DashboardLayout>
  );
}
