"use client";

import { useState } from "react";
import { ChevronDown, Crown, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KitImage } from "@/components/ui/kit-image";
import { cn } from "@/lib/utils";
import type { EffectiveOwnershipRow } from "@/services/ownership";

type View = "highest" | "differentials";

interface OwnershipClientProps {
  highest: EffectiveOwnershipRow[];
  differentials: EffectiveOwnershipRow[];
  managerCount: number;
}

function signed(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

function swingColor(value: number): string {
  if (value > 0) return "text-green-400";
  if (value < 0) return "text-red-400";
  return "text-white/60";
}

function OwnershipRow({
  row,
  index,
  view,
  open,
  onToggle,
}: {
  row: EffectiveOwnershipRow;
  index: number;
  view: View;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn("border-b border-white/5 last:border-b-0", index % 2 === 0 ? "bg-gray-800/50" : "bg-gray-900/50")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-2 sm:px-3 py-2 text-left text-xs sm:text-sm text-white transition-colors hover:bg-purple-900/20"
      >
        <div className="w-6 text-center font-bold tabular-nums text-white/70">{index + 1}</div>
        <div className="w-8 h-8 shrink-0 flex items-center justify-center">
          <KitImage
            player={{ elementType: row.elementType, team: 0, teamShortName: row.clubShortName, teamCode: row.clubCode }}
            className="w-7 h-7 object-contain"
            size={28}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate leading-tight">{row.name}</div>
          <div className="text-xs text-white/60 leading-tight">
            {row.clubShortName}
            {view === "highest" && (
              <span className="text-white/40">
                {" "}· {row.owners} own{row.captains > 0 ? `, ${row.captains} C` : ""}
              </span>
            )}
            {view === "differentials" && <span className="text-white/40"> · {row.ownerNames[0]}</span>}
          </div>
        </div>
        {view === "highest" && (
          <div className="w-14 text-right tabular-nums font-semibold text-purple-300">{row.effectiveOwnership}%</div>
        )}
        <div className="w-10 text-right tabular-nums font-bold">{row.points}</div>
        <div className={cn("w-14 text-right tabular-nums font-semibold", swingColor(row.swing))}>{signed(row.swing)}</div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-white/40 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 text-xs text-white/70">
          <div className="mb-1 text-white/50 uppercase tracking-wide">
            {row.owners === 1 ? "Owned by" : `Owned by ${row.owners}`}
          </div>
          <div className="flex flex-wrap gap-1">
            {row.ownerNames.map((name) => (
              <span
                key={name}
                className={cn(
                  "rounded border px-1.5 py-0.5",
                  name.endsWith("(C)")
                    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                    : "border-white/10 bg-white/5"
                )}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Effective ownership (Phase 4.2). Two views: everyone by effective
 * ownership, and differentials fielded by exactly one manager. Tapping a
 * row lists who owns the player, captains first.
 */
export function OwnershipClient({ highest, differentials, managerCount }: OwnershipClientProps) {
  const [view, setView] = useState<View>("highest");
  const [openId, setOpenId] = useState<number | null>(null);

  const rows = view === "highest" ? highest : differentials;

  const switchView = (next: View) => {
    setView(next);
    setOpenId(null);
  };

  return (
    <Card className="border-white/10 bg-gray-900/50 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-gray-800 to-gray-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
            {view === "highest" ? (
              <Users className="h-5 w-5 text-purple-400" />
            ) : (
              <Crown className="h-5 w-5 text-yellow-400" />
            )}
            {view === "highest" ? "Most owned" : "Differentials"}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={view === "highest" ? "default" : "outline"}
              size="sm"
              onClick={() => switchView("highest")}
              className="text-xs flex-1 sm:flex-none"
            >
              Most owned
            </Button>
            <Button
              variant={view === "differentials" ? "default" : "outline"}
              size="sm"
              onClick={() => switchView("differentials")}
              className="text-xs flex-1 sm:flex-none"
            >
              Differentials
            </Button>
          </div>
        </div>
        <p className="text-xs text-white/50 mt-2">
          {view === "highest"
            ? `Effective ownership counts captains twice and Triple Captain three times, across ${managerCount} managers. Swing is how many points the player moved the average manager by.`
            : "Players fielded by exactly one manager this gameweek, best scorers first."}
        </p>
      </CardHeader>
      <CardContent className="px-0 sm:px-6 py-0 sm:py-6">
        <div className="text-white sm:rounded-lg overflow-hidden sm:border border-white/10">
          <div className="flex items-center gap-2 px-2 sm:px-3 py-2 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900 text-xs font-bold text-gray-300">
            <div className="w-6 text-center">#</div>
            <div className="w-8" />
            <div className="flex-1">Player</div>
            {view === "highest" && <div className="w-14 text-right">EO</div>}
            <div className="w-10 text-right">Pts</div>
            <div className="w-14 text-right">Swing</div>
            <div className="w-4" />
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-white/60 text-center py-8">
              {view === "highest" ? "No picks found for this gameweek." : "No differentials this gameweek — everyone is owned twice or more."}
            </p>
          ) : (
            rows.map((row, index) => (
              <OwnershipRow
                key={row.elementId}
                row={row}
                index={index}
                view={view}
                open={openId === row.elementId}
                onToggle={() => setOpenId(openId === row.elementId ? null : row.elementId)}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
