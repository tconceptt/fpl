import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KitImage } from "@/components/ui/kit-image";
import { ManagerIdentity } from "@/components/ui/manager-identity";
import { StatTile, type Tone } from "@/components/ui/stat-tile";
import { cn } from "@/lib/utils";
import type { ManagerTransfers, TransferPlayerInfo, TransferRow } from "@/services/transfers";

/**
 * Points gained by a single transfer, before any hit — duplicated from
 * `transferGain` in services/transfers.ts rather than imported, so this
 * client component never pulls that server-only module graph (FPL
 * client/Redis cache) into the browser bundle.
 */
function transferGain(row: TransferRow): number {
  return row.playerInPoints - row.playerOutPoints;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function swingTone(value: number): string {
  if (value > 0) return "text-positive";
  if (value < 0) return "text-negative";
  return "text-fg-3";
}

function price(player: TransferPlayerInfo | null): string {
  if (!player) return "";
  return `£${(player.price / 10).toFixed(1)}m`;
}

function transferSummary(row: TransferRow): string {
  const out = row.playerOut?.name ?? "Unknown";
  const inn = row.playerIn?.name ?? "Unknown";
  return `${row.entryName} · ${out} → ${inn}`;
}

function HighlightTile({ label, row, tone }: { label: string; row: TransferRow | null; tone: Tone }) {
  if (!row) {
    return <StatTile label={label} value="–" sub="No transfers this gameweek" />;
  }
  const gain = transferGain(row);
  return (
    <StatTile
      label={label}
      value={`${signed(gain)} pts`}
      sub={transferSummary(row)}
      tone={tone}
      href={`/team/${row.entry}?gw=${row.event}`}
    />
  );
}

export function TransferHighlights({ best, worst }: { best: TransferRow | null; worst: TransferRow | null }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      <HighlightTile label="Transfer of the week" row={best} tone="positive" />
      <HighlightTile label="Worst transfer of the week" row={worst} tone="negative" />
    </div>
  );
}

function TransferLine({ row }: { row: TransferRow }) {
  const gain = transferGain(row);
  return (
    <div className="flex items-center gap-2 py-2.5 sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {row.playerOut && (
          <KitImage player={row.playerOut} size={28} className="h-7 w-7 shrink-0 object-contain" />
        )}
        <div className="min-w-0">
          <div className="truncate text-sm text-fg-2">{row.playerOut?.name ?? "Unknown"}</div>
          <div className="truncate text-xs text-fg-3">
            {row.playerOut?.teamShortName}
            {row.playerOut && <span> · {price(row.playerOut)}</span>}
            <span className="tabular-nums"> · {row.playerOutPoints} pts</span>
          </div>
        </div>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-fg-3" />

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {row.playerIn && (
          <KitImage player={row.playerIn} size={28} className="h-7 w-7 shrink-0 object-contain" />
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-fg">{row.playerIn?.name ?? "Unknown"}</div>
          <div className="truncate text-xs text-fg-3">
            {row.playerIn?.teamShortName}
            {row.playerIn && <span> · {price(row.playerIn)}</span>}
            <span className="tabular-nums"> · {row.playerInPoints} pts</span>
          </div>
        </div>
      </div>

      <div className={cn("shrink-0 text-right text-sm font-semibold tabular-nums", swingTone(gain))}>
        {signed(gain)}
      </div>
    </div>
  );
}

function ManagerGroup({ group, gw }: { group: ManagerTransfers; gw: number }) {
  const afterHit = group.net - group.hitCost;
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4">
        <Link
          href={`/team/${group.entry}?gw=${gw}`}
          className="min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <ManagerIdentity entryName={group.entryName} playerName={group.managerName} />
        </Link>
        {group.hitCost > 0 && (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-negative">-{group.hitCost} hit</span>
        )}
        <div className="shrink-0 text-right">
          <div className={cn("text-base font-semibold leading-none tabular-nums", swingTone(afterHit))}>
            {signed(afterHit)}
          </div>
          <div className="mt-1 text-[11px] leading-none text-fg-3">{group.hitCost > 0 ? "after hit" : "net"}</div>
        </div>
      </div>
      <div className="divide-y divide-border px-3 sm:px-4">
        {group.rows.map((row, i) => (
          <TransferLine key={`${row.playerOut?.id ?? "x"}-${row.playerIn?.id ?? "y"}-${i}`} row={row} />
        ))}
      </div>
    </div>
  );
}

/**
 * Every manager's transfers for the gameweek (Phase 4.4), grouped per
 * manager with the hit they paid and the raw in-minus-out points.
 */
export function TransferFeed({ groups, gw }: { groups: ManagerTransfers[]; gw: number }) {
  const totalMoves = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gameweek {gw} transfers</CardTitle>
        <span className="text-xs text-fg-3">
          {totalMoves} move{totalMoves === 1 ? "" : "s"} · {groups.length} manager{groups.length === 1 ? "" : "s"}
        </span>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <EmptyState title="No transfers" description="Nobody made a transfer this gameweek." />
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <ManagerGroup key={group.entry} group={group} gw={gw} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
