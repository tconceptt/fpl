"use client";

import { Swords } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { H2HMatchups, H2HTable } from "@/components/h2h/h2h-matchups";
import { useGameweekData } from "@/hooks/use-gameweek-data";
import { cn } from "@/lib/utils";
import type { H2HMatch, H2HStandings } from "@/lib/fpl/types";
import type { H2HMatchup, H2HPage, H2HSide, H2HTableRow, MatchupState } from "@/services/h2h";

/**
 * `/api/h2h/[gw]`'s response shape — a thin pass-through of FPL's own H2H
 * standings and fixtures, not the built `H2HPage` the server page renders
 * from `getH2HPage`. It carries no manager snapshot (live net points,
 * captain, chip, classic rank), so a gameweek switched to client-side falls
 * back to FPL's own recorded `entry_*_points` for the matchup cards — the
 * same numbers, just not live-updating mid-match. Historical gameweeks
 * (the common case for switching) are unaffected since those are already
 * final.
 */
interface H2HApiResponse {
  standings: H2HStandings | null;
  matches: H2HMatch[];
}

function matchState(home: number, away: number): MatchupState {
  if (home > away) return "leading";
  if (home < away) return "trailing";
  return "level";
}

function matchupsFromRaw(matches: H2HMatch[]): H2HMatchup[] {
  return matches
    .map((m) => {
      const home: H2HSide = {
        entry: m.entry_1_entry,
        entryName: m.entry_1_name,
        playerName: m.entry_1_player_name,
        points: m.entry_1_points,
        rank: null,
        captain: null,
        activeChip: null,
        playersToStart: 0,
      };
      const away: H2HSide = {
        entry: m.entry_2_entry,
        entryName: m.entry_2_name,
        playerName: m.entry_2_player_name,
        points: m.entry_2_points,
        rank: null,
        captain: null,
        activeChip: null,
        playersToStart: 0,
      };
      return {
        id: m.id,
        home,
        away,
        state: matchState(home.points, away.points),
        isBye: m.is_bye === true || m.entry_1_entry === null || m.entry_2_entry === null,
      };
    })
    .sort((a, b) => a.id - b.id);
}

function tableFromRaw(standings: H2HStandings | null): H2HTableRow[] {
  if (!standings?.standings) return [];
  const rows = Array.isArray(standings.standings) ? standings.standings : standings.standings.results ?? [];
  return rows
    .map((row) => ({
      rank: row.rank,
      lastRank: row.last_rank ?? row.rank,
      entry: row.entry,
      entryName: row.entry_name,
      playerName: row.player_name ?? "",
      played: row.matches_played ?? 0,
      won: row.matches_won ?? 0,
      drawn: row.matches_drawn ?? 0,
      lost: row.matches_lost ?? 0,
      pointsFor: row.points_for ?? 0,
      total: row.total ?? 0,
    }))
    .sort((a, b) => a.rank - b.rank);
}

async function fetchH2H(gw: number, leagueName: string, currentGameweek: number): Promise<H2HPage> {
  const res = await fetch(`/api/h2h/${gw}`);
  if (!res.ok) throw new Error(`Failed to load gameweek ${gw}`);
  const json: H2HApiResponse = await res.json();
  return {
    leagueName,
    currentGameweek,
    selectedGameweek: gw,
    live: gw === currentGameweek,
    configured: json.standings !== null,
    matchups: matchupsFromRaw(json.matches),
    table: tableFromRaw(json.standings),
  };
}

/**
 * Client-side gameweek switching for `/h2h`. `initial` is the server-built
 * `H2HPage` from `getH2HPage` (full fidelity, live-aware); switching
 * gameweeks after that reads `/api/h2h/[gw]` and adapts its raw shape above.
 */
export function H2HView({ initial }: { initial: H2HPage }) {
  const { data, gw, setGw, loading, error } = useGameweekData<H2HPage>({
    cacheKey: "h2h",
    initial,
    initialGw: initial.selectedGameweek,
    currentGameweek: initial.currentGameweek,
    fetcher: (targetGw) => fetchH2H(targetGw, initial.leagueName, initial.currentGameweek),
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Head to Head"
        description={
          data.live
            ? "Live net scores from this gameweek's picks"
            : `Final scores for gameweek ${data.selectedGameweek}`
        }
        currentGameweek={data.currentGameweek}
        selectedGameweek={gw}
        showGameweekSelector
        onGameweekChange={setGw}
      />

      {error && (
        <div className="rounded-md border border-negative/30 bg-negative-soft px-3 py-2 text-xs text-negative">
          {error}
        </div>
      )}

      {!data.configured ? (
        <EmptyState
          icon={Swords}
          title="No head-to-head league"
          description="No head-to-head league is configured for this season."
        />
      ) : (
        <div className={cn("space-y-6 sm:space-y-8 transition-opacity", loading && "opacity-60")}>
          <H2HMatchups matchups={data.matchups} live={data.live} gw={data.selectedGameweek} />
          <H2HTable rows={data.table} />
        </div>
      )}
    </div>
  );
}
