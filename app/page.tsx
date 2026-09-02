import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LeagueTable } from "@/components/league-table/league-table";
import { getLeagueSnapshot } from "@/services/league";
import { notFound } from "next/navigation";
import { getUrlParam } from "@/lib/helpers";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import type { GameweekStanding } from "@/types/league";

export const revalidate = 0;
export const maxDuration = 60;

export default async function LeaguePage() {
  const gameweekParam = await getUrlParam("gameweek");
  const parsedGameweek = gameweekParam ? parseInt(gameweekParam, 10) : undefined;
  const requestedGameweek = Number.isNaN(parsedGameweek) ? undefined : parsedGameweek;

  // getLeagueSnapshot throws on failure — app/error.tsx renders the real error
  // rather than a silent, misleading empty league. The gameweek check below
  // only runs once that fetch has actually succeeded.
  const snapshot = await withUpstreamCounter(async () => {
    const result = await getLeagueSnapshot(requestedGameweek);
    logTelemetry("/");
    return result;
  });

  // parsedGameweek is undefined only when gameweekParam was an empty string,
  // which is itself invalid input — treat that the same as NaN.
  const gwValue = parsedGameweek ?? NaN;
  if (
    gameweekParam !== null &&
    (Number.isNaN(gwValue) || gwValue < 1 || gwValue > snapshot.currentGameweek)
  ) {
    notFound();
  }

  const standings: GameweekStanding[] = snapshot.managers.map((m) => ({
    entry: m.entry,
    entry_name: m.entry_name,
    player_name: m.player_name,
    event_total: m.event_total,
    total_points: m.total_points,
    net_points: m.net_points,
    rank: m.rank,
    last_rank: m.last_rank,
    captain_name: m.captain?.web_name,
    active_chip: m.active_chip,
    transfer_cost: m.transfer_cost,
    playersToStart: m.players_to_start,
    h2h_rank: m.h2h_rank ?? undefined,
  }));

  return (
    <DashboardLayout>
      <LeagueTable
        standings={standings}
        currentGameweek={snapshot.currentGameweek}
        selectedGameweek={snapshot.selectedGameweek}
      />
    </DashboardLayout>
  );
}
