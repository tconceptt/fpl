"use client";

import { useState } from "react";
import { StatTile } from "@/components/ui/stat-tile";
import { TransfersPopup } from "./transfers-popup";
import { cn } from "@/lib/utils";

interface TeamStatsProps {
  overallRank: number | null;
  h2hRank: number | null;
  transfers: number;
  transferCost: number;
  startersTotal: number;
  teamId: string;
  gameweek: string;
  activeChip?: string | null;
}

export function TeamStatsClient({
  overallRank,
  h2hRank,
  transfers,
  transferCost,
  startersTotal,
  teamId,
  gameweek,
  activeChip,
}: TeamStatsProps) {
  const [showTransfers, setShowTransfers] = useState(false);
  const isBenchBoostActive = activeChip === "bboost";

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {overallRank !== null && (
          <StatTile label="Overall rank" value={overallRank.toLocaleString()} />
        )}
        {h2hRank !== null && <StatTile label="H2H rank" value={`#${h2hRank}`} />}

        {/* Not a plain StatTile: it opens the transfers popup on click, which
            the StatTile contract doesn't support (only a `href` Link). Kept
            visually identical to StatTile so the row still reads as one
            family of tiles. */}
        <button
          type="button"
          onClick={() => transfers > 0 && setShowTransfers(true)}
          disabled={transfers === 0}
          aria-haspopup="dialog"
          className={cn(
            "flex min-h-[76px] flex-col items-start rounded-lg border border-border bg-surface p-4 text-left transition-colors sm:p-5",
            transfers > 0 &&
              "hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          )}
        >
          <span className="text-xs text-fg-2">Transfers</span>
          <span className="mt-1 text-2xl font-semibold tabular-nums text-fg sm:text-3xl">
            {transfers}
            {transferCost > 0 && (
              <span className="ml-1.5 text-sm font-medium text-negative">-{transferCost}</span>
            )}
          </span>
        </button>

        <StatTile
          label="GW total"
          value={startersTotal}
          tone="positive"
          sub={isBenchBoostActive ? "Bench boost active" : undefined}
        />
      </div>

      <TransfersPopup
        isOpen={showTransfers}
        onClose={() => setShowTransfers(false)}
        teamId={teamId}
        gameweek={gameweek}
      />
    </>
  );
}
