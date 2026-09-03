"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Crown, Users } from "lucide-react";

import { StatsPageShell } from "@/components/stats/stats-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { KitImage } from "@/components/ui/kit-image";
import { useGameweekData } from "@/hooks/use-gameweek-data";
import { cn } from "@/lib/utils";
import type { EffectiveOwnershipRow } from "@/services/ownership";

type View = "highest" | "differentials";

const PAGE_SIZE = 20;

async function fetchOwnershipRows(gw: number): Promise<EffectiveOwnershipRow[]> {
  const resp = await fetch(`/api/ownership/${gw}`, { cache: "no-store" });
  if (!resp.ok) throw new Error(`Failed to load gameweek ${gw}`);
  const json = await resp.json();
  return json.players ?? [];
}

/** Mirrors services/ownership.ts's highestOwnership — duplicated rather than
 * imported so this client bundle doesn't pull in that file's server-only
 * imports (lib/fpl/client, lib/fpl/cache). */
function sortByOwnership(rows: EffectiveOwnershipRow[]): EffectiveOwnershipRow[] {
  return [...rows].sort(
    (a, b) => b.effectiveOwnership - a.effectiveOwnership || b.points - a.points || a.name.localeCompare(b.name)
  );
}

/** Mirrors services/ownership.ts's differentials — see note above. */
function onlyDifferentials(rows: EffectiveOwnershipRow[]): EffectiveOwnershipRow[] {
  return rows.filter((row) => row.owners === 1).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function swingTone(value: number): string {
  if (value > 0) return "text-positive";
  if (value < 0) return "text-negative";
  return "text-fg-3";
}

/**
 * Effective ownership. Two views: everyone by effective ownership, and
 * differentials fielded by exactly one manager. Tapping a row lists who
 * owns the player, captains first. Gameweek switching goes through
 * `useGameweekData` over `/api/ownership/[gw]` so it never re-renders the
 * server page.
 */
export function OwnershipClient({
  initial,
  initialGw,
  currentGameweek,
  managerCount,
}: {
  initial: EffectiveOwnershipRow[];
  initialGw: number;
  currentGameweek: number;
  managerCount: number;
}) {
  const { data: rows, gw, setGw } = useGameweekData<EffectiveOwnershipRow[]>({
    cacheKey: "ownership",
    initial,
    initialGw,
    currentGameweek,
    fetcher: fetchOwnershipRows,
  });

  const [view, setView] = useState<View>("highest");
  const [openId, setOpenId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const switchView = (next: View) => {
    setView(next);
    setOpenId(null);
    setShowAll(false);
  };

  const rowsForView = useMemo(
    () => (view === "highest" ? sortByOwnership(rows) : onlyDifferentials(rows)),
    [rows, view]
  );
  const visibleRows = showAll ? rowsForView : rowsForView.slice(0, PAGE_SIZE);

  return (
    <StatsPageShell
      title="Effective Ownership"
      description={`Who the league is riding in gameweek ${gw}, across ${managerCount} managers`}
      currentGameweek={currentGameweek}
      selectedGameweek={gw}
      onGameweekChange={setGw}
    >
      <Card>
        <CardHeader className="flex-col items-stretch gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            {view === "highest" ? <Users className="h-4 w-4 text-fg-3" /> : <Crown className="h-4 w-4 text-fg-3" />}
            {view === "highest" ? "Most owned" : "Differentials"}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={view === "highest" ? "primary" : "secondary"}
              size="sm"
              onClick={() => switchView("highest")}
              className="flex-1 sm:flex-none"
            >
              Most owned
            </Button>
            <Button
              variant={view === "differentials" ? "primary" : "secondary"}
              size="sm"
              onClick={() => switchView("differentials")}
              className="flex-1 sm:flex-none"
            >
              Differentials
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <p className="px-4 pb-3 pt-3 text-xs text-fg-2 sm:px-5">
            {view === "highest"
              ? `Effective ownership counts captains twice and Triple Captain three times, across ${managerCount} managers. Swing is how many points the player moved the average manager by.`
              : "Players fielded by exactly one manager this gameweek, best scorers first."}
          </p>
          {rowsForView.length === 0 ? (
            <EmptyState
              title={view === "highest" ? "No picks found" : "No differentials"}
              description={
                view === "highest"
                  ? "No picks were found for this gameweek."
                  : "Everyone is owned twice or more this gameweek."
              }
            />
          ) : (
            <>
              <div className="flex items-center gap-2 border-y border-border bg-surface-2 px-4 py-2 text-[11px] uppercase tracking-wide text-fg-3 sm:px-5">
                <div className="w-6 text-center">#</div>
                <div className="w-8 shrink-0" />
                <div className="flex-1">Player</div>
                {view === "highest" && <div className="w-14 text-right">EO</div>}
                <div className="w-10 text-right">Pts</div>
                <div className="w-14 text-right">Swing</div>
                <div className="w-6 shrink-0" />
              </div>
              <div>
                {visibleRows.map((row, index) => (
                  <OwnershipRow
                    key={row.elementId}
                    row={row}
                    index={index}
                    view={view}
                    open={openId === row.elementId}
                    onToggle={() => setOpenId(openId === row.elementId ? null : row.elementId)}
                  />
                ))}
              </div>
              {rowsForView.length > PAGE_SIZE && (
                <div className="border-t border-border px-4 py-3 sm:px-5">
                  <Button variant="secondary" size="sm" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Show top 20" : `Show all ${rowsForView.length}`}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </StatsPageShell>
  );
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
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${row.name}, ${open ? "hide" : "show"} owners`}
        className="flex min-h-11 w-full items-center gap-2 px-4 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
      >
        <div className="w-6 shrink-0 text-center text-xs tabular-nums text-fg-3">{index + 1}</div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          <KitImage
            player={{ elementType: row.elementType, team: 0, teamShortName: row.clubShortName, teamCode: row.clubCode }}
            size={28}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium leading-tight text-fg">{row.name}</div>
          <div className="truncate text-xs leading-tight text-fg-2">
            {row.clubShortName}
            {view === "highest" && (
              <span className="text-fg-3">
                {" "}
                · {row.owners} own{row.captains > 0 ? `, ${row.captains} C` : ""}
              </span>
            )}
            {view === "differentials" && <span className="text-fg-3"> · {row.ownerNames[0]}</span>}
          </div>
        </div>
        {view === "highest" && (
          <div className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-accent">
            {row.effectiveOwnership}%
          </div>
        )}
        <div className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-fg">{row.points}</div>
        <div className={cn("w-14 shrink-0 text-right text-sm font-semibold tabular-nums", swingTone(row.swing))}>
          {signed(row.swing)}
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-fg-3 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 text-xs text-fg-2 sm:px-5">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-fg-3">
            {row.owners === 1 ? "Owned by" : `Owned by ${row.owners}`}
          </div>
          <div className="flex flex-wrap gap-1">
            {row.ownerNames.map((name) => (
              <span
                key={name}
                className={cn(
                  "rounded-sm border px-1.5 py-0.5",
                  name.endsWith("(C)")
                    ? "border-accent-soft bg-accent-soft text-accent"
                    : "border-border bg-surface-2 text-fg-2"
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
