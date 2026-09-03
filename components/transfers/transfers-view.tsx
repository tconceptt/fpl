"use client";

import { PageHeader } from "@/components/page-header";
import { TransferFeed, TransferHighlights } from "@/components/transfers/transfer-feed";
import { useGameweekData } from "@/hooks/use-gameweek-data";
import { cn } from "@/lib/utils";
import type { ManagerTransfers, TransferRow } from "@/services/transfers";

export interface TransfersPageData {
  leagueName: string;
  currentGameweek: number;
  selectedGameweek: number;
  best: TransferRow | null;
  worst: TransferRow | null;
  groups: ManagerTransfers[];
}

/** `/api/transfers/[gw]`'s (unfiltered) response shape. */
interface TransfersApiResponse {
  transfers: TransferRow[];
  best: TransferRow | null;
  worst: TransferRow | null;
}

/**
 * Rows grouped per manager, biggest net gain first, then by manager name —
 * mirrors `groupTransfersByManager` in services/transfers.ts. Duplicated
 * (rather than imported) so this client component never pulls the
 * server-only `services/transfers.ts` module graph (Redis/FPL client) into
 * the browser bundle; `best`/`worst` come pre-computed from the route
 * instead of being recomputed here.
 */
function groupByManager(rows: TransferRow[]): ManagerTransfers[] {
  const groups = new Map<number, ManagerTransfers>();

  for (const row of rows) {
    const group = groups.get(row.entry) ?? {
      entry: row.entry,
      entryName: row.entryName,
      managerName: row.managerName,
      hitCost: row.hitCost,
      rows: [],
      pointsIn: 0,
      pointsOut: 0,
      net: 0,
    };
    group.rows.push(row);
    group.pointsIn += row.playerInPoints;
    group.pointsOut += row.playerOutPoints;
    group.net = group.pointsIn - group.pointsOut;
    groups.set(row.entry, group);
  }

  return [...groups.values()].sort((a, b) => b.net - a.net || a.managerName.localeCompare(b.managerName));
}

async function fetchTransfers(gw: number, leagueName: string, currentGameweek: number): Promise<TransfersPageData> {
  const res = await fetch(`/api/transfers/${gw}`);
  if (!res.ok) throw new Error(`Failed to load gameweek ${gw}`);
  const json: TransfersApiResponse = await res.json();
  return {
    leagueName,
    currentGameweek,
    selectedGameweek: gw,
    best: json.best,
    worst: json.worst,
    groups: groupByManager(json.transfers),
  };
}

/** Client-side gameweek switching for `/transfers`, same pattern as `/h2h`. */
export function TransfersView({ initial }: { initial: TransfersPageData }) {
  const { data, gw, setGw, loading, error } = useGameweekData<TransfersPageData>({
    cacheKey: "transfers",
    initial,
    initialGw: initial.selectedGameweek,
    currentGameweek: initial.currentGameweek,
    fetcher: (targetGw) => fetchTransfers(targetGw, initial.leagueName, initial.currentGameweek),
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Transfers"
        description={`Every move in ${data.leagueName} for gameweek ${data.selectedGameweek}, with the points each one earned`}
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

      <div className={cn("space-y-6 sm:space-y-8 transition-opacity", loading && "opacity-60")}>
        <TransferHighlights best={data.best} worst={data.worst} />
        <TransferFeed groups={data.groups} gw={data.selectedGameweek} />
      </div>
    </div>
  );
}
