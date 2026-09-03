"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KitImage } from "@/components/ui/kit-image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Player = {
  id: number;
  name: string;
  position: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  multiplier: number;
  total: number;
  metrics: Record<string, number>;
  rawTotal: number;
  rawMetrics: Record<string, number>;
  elementType?: number;
  clubShortName?: string;
  clubCode?: number;
  teamId?: number;
  actualMinutes?: number;
  autoSubIn?: boolean;
  autoSubOut?: boolean;
  opponentShortName?: string;
  fixtureStarted?: boolean;
};

const POSITION_ORDER = [1, 2, 3, 4] as const;
const POSITION_LABEL: Record<number, string> = {
  1: "Goalkeeper",
  2: "Defenders",
  3: "Midfielders",
  4: "Forwards",
};

const metricsLabel: Record<string, string> = {
  minutes: "Minutes",
  clean_sheets: "Clean sheet",
  goals_scored: "Goals scored",
  assists: "Assists",
  bonus: "Bonus",
  saves: "Saves",
  penalties_saved: "Penalties saved",
  penalties_missed: "Penalties missed",
  yellow_cards: "Yellow cards",
  red_cards: "Red cards",
  own_goals: "Own goals",
  goals_conceded: "Goals conceded",
  defensive_contribution: "Defensive contribution",
  points_modification: "Points adjustment",
};

type OwnerRow = { teamId: number; teamName: string; managerName: string; netPoints: number };

function toKitPlayer(p: Pick<Player, "elementType" | "clubShortName" | "clubCode" | "teamId">) {
  return {
    elementType: p.elementType ?? 0,
    team: p.teamId ?? 0,
    teamShortName: p.clubShortName,
    teamCode: p.clubCode,
  };
}

export function BreakdownTable({
  players,
  compact = false,
  activeChip,
}: {
  players: Player[];
  compact?: boolean;
  activeChip?: string | null;
}) {
  const starters = players.filter((p) => p.position <= 11);
  const bench = players.filter((p) => p.position > 11);
  const isBenchBoostActive = activeChip === "bboost";

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [ownershipByElement, setOwnershipByElement] = useState<Map<number, OwnerRow[]> | null>(null);
  const [isLoadingOwnership, setIsLoadingOwnership] = useState(false);
  const searchParams = useSearchParams();
  const gw = searchParams.get("gw");

  // Fetched once per gameweek — not per player click — since the bounded
  // /api/ownership/[gw] route already covers every element in one response.
  useEffect(() => {
    if (!gw) {
      setOwnershipByElement(null);
      return;
    }
    setIsLoadingOwnership(true);
    fetch(`/api/ownership/${gw}`)
      .then((res) => res.json())
      .then((data) => {
        const entries: Array<{ elementId: number; owners: OwnerRow[] }> = data.ownership || [];
        setOwnershipByElement(new Map(entries.map((e) => [e.elementId, e.owners])));
      })
      .catch((err) => console.error("Failed to fetch ownership:", err))
      .finally(() => setIsLoadingOwnership(false));
  }, [gw]);

  const startingTeams = selectedPlayer ? ownershipByElement?.get(selectedPlayer.id) ?? [] : [];
  const isLoadingTeams = isLoadingOwnership && ownershipByElement === null;
  const selectedPlayerIsTripleCaptain = selectedPlayer
    ? selectedPlayer.isCaptain && activeChip === "3xc"
    : false;

  const colSpan = compact ? 2 : 3;

  const openPlayer = (p: Player) => setSelectedPlayer(p);
  const handleRowKeyDown = (e: React.KeyboardEvent, p: Player) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPlayer(p);
    }
  };

  return (
    <>
      <Table>
        <caption className="sr-only">Team breakdown for this gameweek</caption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-9" />
            <TableHead>Player</TableHead>
            {!compact && <TableHead className="hidden w-14 text-center sm:table-cell">Mins</TableHead>}
            <TableHead className="w-10 text-right">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {POSITION_ORDER.map((elementType) => {
            const group = starters.filter((p) => (p.elementType ?? 0) === elementType);
            if (group.length === 0) return null;
            return (
              <PositionGroup key={elementType} label={POSITION_LABEL[elementType]} colSpan={colSpan}>
                {group.map((p) => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    compact={compact}
                    activeChip={activeChip}
                    onOpen={openPlayer}
                    onKeyDown={handleRowKeyDown}
                  />
                ))}
              </PositionGroup>
            );
          })}

          {bench.length > 0 && (
            <PositionGroup
              label={
                <span className="flex items-center gap-2">
                  Bench
                  {isBenchBoostActive && (
                    <span className="rounded-sm border border-[rgba(96,165,250,0.3)] bg-info-soft px-1.5 py-0.5 text-[10px] font-bold text-info">
                      Active
                    </span>
                  )}
                </span>
              }
              colSpan={colSpan}
              divider
            >
              {bench.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  compact={compact}
                  activeChip={activeChip}
                  bench
                  onOpen={openPlayer}
                  onKeyDown={handleRowKeyDown}
                />
              ))}
            </PositionGroup>
          )}
        </TableBody>
      </Table>

      {selectedPlayer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-bg/80" onClick={() => setSelectedPlayer(null)} />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-lg border border-border bg-surface-3 shadow-pop">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2.5">
                <KitImage player={toKitPlayer(selectedPlayer)} size={24} className="object-contain" />
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-fg">{selectedPlayer.name}</div>
                  {selectedPlayerIsTripleCaptain && (
                    <span className="rounded-sm border border-[rgba(167,139,250,0.3)] bg-violet-soft px-2 py-0.5 text-[10px] font-bold text-violet">
                      Triple captain
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto">
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 text-left text-[11px] font-medium uppercase tracking-wide text-fg-3">
                        Stat
                      </th>
                      <th className="py-2 text-right text-[11px] font-medium uppercase tracking-wide text-fg-3">
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(
                      selectedPlayer.isCaptain ? selectedPlayer.rawMetrics : selectedPlayer.metrics
                    )
                      .filter(([, v]) => v !== 0)
                      .map(([k, v]) => (
                        <tr key={k} className="border-b border-border">
                          <td className="py-2.5 text-fg-2">{metricsLabel[k] ?? k}</td>
                          <td className="py-2.5 text-right font-medium tabular-nums text-fg">{v}</td>
                        </tr>
                      ))}
                    <tr className="border-t-2 border-border">
                      <td className="py-2.5 font-semibold text-fg">Total</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums text-fg">
                        {selectedPlayer.isCaptain ? selectedPlayer.rawTotal || 0 : selectedPlayer.total || 0}
                        {selectedPlayerIsTripleCaptain && (
                          <span className="ml-2 text-xs font-normal text-fg-3">
                            (×3 = {(selectedPlayer.rawTotal || 0) * 3})
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {Object.keys(selectedPlayer.metrics).filter((k) => selectedPlayer.metrics[k] !== 0).length ===
                  0 && (
                  <div className="py-6 text-center text-sm text-fg-2">No points scored this gameweek</div>
                )}
              </div>

              <div className="border-t border-border bg-surface-2 p-4">
                <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-fg-3">
                  Teams starting this player
                </h3>
                {isLoadingTeams ? (
                  <div className="flex justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-fg-3" />
                  </div>
                ) : startingTeams.length > 0 ? (
                  <div className="space-y-1">
                    {startingTeams.map((team) => (
                      <Link
                        key={team.teamId}
                        href={`/team/${team.teamId}?gw=${gw}`}
                        className="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-fg">{team.teamName}</span>
                          <span className="truncate text-xs text-fg-3">{team.managerName}</span>
                        </div>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-fg">
                          {team.netPoints} pts
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-2 text-center text-sm text-fg-3">No other teams started this player</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PositionGroup({
  label,
  colSpan,
  divider,
  children,
}: {
  label: React.ReactNode;
  colSpan: number;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <TableRow className={cn("bg-surface-2 hover:bg-surface-2", divider && "border-t-2 border-t-border")}>
        <TableCell
          colSpan={colSpan}
          className="py-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-3"
        >
          {label}
        </TableCell>
      </TableRow>
      {children}
    </>
  );
}

function PlayerRow({
  player: p,
  compact,
  activeChip,
  bench = false,
  onOpen,
  onKeyDown,
}: {
  player: Player;
  compact: boolean;
  activeChip?: string | null;
  bench?: boolean;
  onOpen: (p: Player) => void;
  onKeyDown: (e: React.KeyboardEvent, p: Player) => void;
}) {
  const minutes = p.actualMinutes ?? 0;
  const isTripleCaptain = p.isCaptain && activeChip === "3xc";
  const isBenchBoostActive = activeChip === "bboost";
  const points = bench && !isBenchBoostActive ? p.rawTotal || 0 : p.total || 0;

  return (
    <TableRow
      role="button"
      tabIndex={0}
      onClick={() => onOpen(p)}
      onKeyDown={(e) => onKeyDown(e, p)}
      className={cn(
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        isTripleCaptain && "bg-violet-soft hover:bg-violet-soft",
        bench && !isBenchBoostActive && "text-fg-2"
      )}
    >
      <TableCell className="py-1.5">
        <KitImage
          player={toKitPlayer(p)}
          size={20}
          className={cn("object-contain", isTripleCaptain && "rounded ring-2 ring-violet/50")}
        />
      </TableCell>
      <TableCell className="min-w-0 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn("truncate text-sm", isTripleCaptain ? "font-semibold text-violet" : "font-medium text-fg")}>
            {p.name}
          </span>
          {p.isCaptain && (
            <span className="flex shrink-0 items-center gap-1">
              <Image src="/Images/captain-band.png" alt="Captain" width={14} height={14} className="object-contain" />
              {isTripleCaptain && (
                <span className="rounded-sm border border-[rgba(167,139,250,0.3)] bg-violet-soft px-1 py-0.5 text-[10px] font-bold leading-none text-violet">
                  3×
                </span>
              )}
            </span>
          )}
          {!p.isCaptain && p.multiplier > 1 && (
            <span className="shrink-0 text-xs font-semibold text-accent">×{p.multiplier}</span>
          )}
          {p.autoSubIn && <ChevronUp className="h-3.5 w-3.5 shrink-0 text-positive" />}
          {p.autoSubOut && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-negative" />}
        </div>
      </TableCell>
      {!compact && (
        <TableCell className="hidden text-center text-xs font-medium tabular-nums sm:table-cell">
          {p.fixtureStarted === false && p.opponentShortName ? (
            <span className="text-fg-3">v {p.opponentShortName}</span>
          ) : (
            <span className={minutes >= 60 ? "text-positive" : minutes > 0 ? "text-accent" : "text-negative"}>
              {minutes}&apos;
            </span>
          )}
        </TableCell>
      )}
      <TableCell className={cn("text-right text-sm font-semibold tabular-nums", isTripleCaptain ? "text-violet" : "text-fg")}>
        {points}
      </TableCell>
    </TableRow>
  );
}
