import Link from "next/link";
import { ArrowRight, ArrowRightLeft, ThumbsDown, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KitImage } from "@/components/ui/kit-image";
import { ChipBadge } from "@/components/ui/chip-badge";
import { getChipInfo } from "@/lib/chip-info";
import { cn } from "@/lib/utils";
import { transferGain, transferSettled, type ManagerTransfers, type TransferPlayerInfo, type TransferRow } from "@/services/transfers";

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function gainColor(value: number): string {
  if (value > 0) return "text-green-400";
  if (value < 0) return "text-red-400";
  return "text-white/60";
}

function price(player: TransferPlayerInfo | null): string {
  if (!player) return "";
  return `£${(player.price / 10).toFixed(1)}m`;
}

function PlayerCell({
  player,
  points,
  yetToPlay,
  align,
}: {
  player: TransferPlayerInfo | null;
  points: number;
  yetToPlay: boolean;
  align: "left" | "right";
}) {
  const right = align === "right";
  return (
    <div className={cn("flex items-center gap-2 min-w-0 flex-1", right && "flex-row-reverse text-right")}>
      {player && (
        <div className="shrink-0 w-8 h-8 flex items-center justify-center">
          <KitImage player={player} className="w-7 h-7 object-contain" size={28} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white truncate leading-tight">{player?.name ?? "Unknown"}</div>
        <div className="text-xs text-white/50 leading-tight">
          {player?.teamShortName}
          {player && <span className="text-white/30"> · {price(player)}</span>}
        </div>
      </div>
      {yetToPlay ? (
        <span
          className="shrink-0 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60"
          title="This player's match has not kicked off yet"
        >
          Yet to play
        </span>
      ) : (
        <div className={cn("shrink-0 text-base font-bold tabular-nums", right ? "text-green-400" : "text-red-400")}>{points}</div>
      )}
    </div>
  );
}

function TransferLine({ row }: { row: TransferRow }) {
  const gain = transferGain(row);
  const settled = transferSettled(row);
  return (
    <div className="flex items-center gap-2 py-2">
      <PlayerCell player={row.playerOut} points={row.playerOutPoints} yetToPlay={row.playerOutYetToPlay} align="left" />
      <div className="shrink-0 flex flex-col items-center text-white/30">
        <ArrowRight className="h-4 w-4" />
        {/* The gain only means something once both players have kicked off. */}
        {settled ? (
          <span className={cn("text-xs font-bold tabular-nums", gainColor(gain))}>{signed(gain)}</span>
        ) : (
          <span className="text-xs font-bold text-white/30" title="Both players need to have played">–</span>
        )}
      </div>
      <PlayerCell player={row.playerIn} points={row.playerInPoints} yetToPlay={row.playerInYetToPlay} align="right" />
    </div>
  );
}

function HighlightTile({
  title,
  row,
  tone,
  icon: Icon,
}: {
  title: string;
  row: TransferRow | null;
  tone: "good" | "bad";
  icon: typeof ThumbsUp;
}) {
  const border = tone === "good" ? "border-green-500/30" : "border-red-500/30";
  const header = tone === "good" ? "from-green-900/30 to-green-800/20" : "from-red-900/30 to-red-800/20";
  const iconColor = tone === "good" ? "text-green-400" : "text-red-400";

  return (
    <Card className={cn("border bg-gray-900/50 backdrop-blur-sm shadow-lg", border)}>
      <CardHeader className={cn("pb-2 pt-3 px-4 border-b border-white/10 bg-gradient-to-r", header)}>
        <CardTitle className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
          <Icon className={cn("h-4 w-4", iconColor)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-3 pb-3">
        {row ? (
          <>
            <Link href={`/team/${row.entry}?gw=${row.event}`} className="text-xs text-white/60 hover:text-white truncate block">
              {row.managerName} · {row.entryName}
            </Link>
            <TransferLine row={row} />
          </>
        ) : (
          <p className="text-sm text-white/60 py-2">No transfer where both players have played yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function TransferHighlights({ best, worst }: { best: TransferRow | null; worst: TransferRow | null }) {
  return (
    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
      <HighlightTile title="Transfer of the week" row={best} tone="good" icon={ThumbsUp} />
      <HighlightTile title="Worst transfer of the week" row={worst} tone="bad" icon={ThumbsDown} />
    </div>
  );
}

/**
 * Every manager's transfers for the gameweek (Phase 4.4), grouped per
 * manager with the hit they paid and the raw in-minus-out points.
 */
export function TransferFeed({ groups, gw }: { groups: ManagerTransfers[]; gw: number }) {
  return (
    <Card className="border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-6 px-3 sm:px-6 border-b border-white/10 bg-gradient-to-r from-gray-800 to-gray-900">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-lg font-semibold text-white">
          <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
          Gameweek {gw} transfers
          <span className="ml-auto text-xs font-normal text-white/50">
            {groups.reduce((n, g) => n + g.rows.length, 0)} moves · {groups.length} managers
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {groups.length === 0 ? (
          <p className="text-sm text-white/60 text-center py-8">Nobody made a transfer this gameweek.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const afterHit = group.net - group.hitCost;
              const chip = getChipInfo(group.activeChip);
              return (
                <div key={group.entry} className="rounded-lg border border-white/10 bg-gray-800/40 px-3 py-2">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <Link href={`/team/${group.entry}?gw=${gw}`} className="min-w-0 flex-1 hover:underline">
                      <div className="text-sm font-semibold text-white truncate leading-tight">{group.entryName}</div>
                      <div className="text-xs text-white/60 truncate leading-tight">{group.managerName}</div>
                    </Link>
                    {chip && <ChipBadge abbr={chip.abbr} label={chip.label} color={chip.color} />}
                    {group.hitCost > 0 && (
                      <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-xs font-bold text-red-300">
                        -{group.hitCost} hit
                      </span>
                    )}
                    <div className="text-right">
                      <div className={cn("text-base font-bold tabular-nums leading-tight", gainColor(afterHit))}>{signed(afterHit)}</div>
                      <div className="text-xs text-white/40 leading-tight">{group.hitCost > 0 ? "after hit" : "net"}</div>
                    </div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {group.rows.map((row, i) => (
                      <TransferLine key={`${row.playerOut?.id ?? "x"}-${row.playerIn?.id ?? "y"}-${i}`} row={row} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
