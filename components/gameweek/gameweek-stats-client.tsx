"use client";

import { ArrowDown, ArrowUp, Flame, Frown, Layers, Star } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { LivePill } from "@/components/ui/live-pill";
import { chipMeta } from "@/components/ui/chip-badge";
import { RecapCard } from "@/components/gameweek/recap-card";
import { useLeague, type LeagueApiResponse } from "@/hooks/use-league";
import { computeGameweekStats } from "@/services/gameweek-stats";
import { cn } from "@/lib/utils";

/** Fixed order matching `computeGameweekStats`' `chipsSummary` array. */
const CHIP_KEYS = ["wildcard", "3xc", "bboost", "freehit"] as const;

export function GameweekStatsClient({ initial }: { initial: LeagueApiResponse }) {
  const { data, gw, setGw, loading, error } = useLeague(initial);
  const stats = computeGameweekStats(data.standings, data.currentGameweek, gw);
  const isLive = gw === data.currentGameweek && data.liveState !== "checked";
  const totalChips = stats.chipsSummary.reduce((sum, chip) => sum + chip.count, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={`Gameweek ${gw}`}
        description={
          isLive
            ? "Live scores and standings, updating as matches finish"
            : `Final scores for gameweek ${gw}`
        }
        currentGameweek={data.currentGameweek}
        selectedGameweek={gw}
        showGameweekSelector
        onGameweekChange={setGw}
        actions={isLive ? <LivePill /> : undefined}
      />

      {error && (
        <div className="rounded-md border border-negative/30 bg-negative-soft px-3 py-2 text-xs text-negative">
          {error}
        </div>
      )}

      <div className={cn("space-y-6 sm:space-y-8 transition-opacity", loading && "opacity-60")}>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatTile
            label="GW leader"
            value={`${stats.currentLeader.net_points} pts`}
            sub={`${stats.currentLeader.team} — ${stats.currentLeader.name}`}
            tone="accent"
            icon={Flame}
          />
          <StatTile
            label="GW struggler"
            value={`${stats.lowestPoints.net_points} pts`}
            sub={`${stats.lowestPoints.team} — ${stats.lowestPoints.name}`}
            tone="negative"
            icon={Frown}
          />
          <StatTile
            label="Most captained"
            value={stats.mostCaptained ? `${stats.mostCaptained.percentage}%` : "–"}
            sub={
              stats.mostCaptained
                ? `${stats.mostCaptained.player} · ${stats.mostCaptained.count} managers`
                : "No captain data"
            }
            icon={Star}
          />
          <StatTile
            label="Highest riser"
            value={
              stats.highestRiser.movement > 0
                ? `+${stats.highestRiser.movement}`
                : String(stats.highestRiser.movement)
            }
            sub={`${stats.highestRiser.team} — ${stats.highestRiser.name}`}
            tone="positive"
            icon={ArrowUp}
          />
          <StatTile
            label="Steepest faller"
            value={String(stats.steepestFaller.movement)}
            sub={`${stats.steepestFaller.team} — ${stats.steepestFaller.name}`}
            tone="negative"
            icon={ArrowDown}
          />
          <StatTile
            label="Chips played"
            value={totalChips}
            sub="Across the whole league"
            icon={Layers}
          />
        </div>

        <RecapCard gw={gw} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.chipsSummary.map((chip, i) => {
            const meta = chipMeta(CHIP_KEYS[i]);
            return (
              <div
                key={meta.abbr}
                className="rounded-lg border border-border bg-surface px-4 py-3 text-center"
              >
                <div className="text-xs text-fg-2">{meta.label}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-fg">{chip.count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
