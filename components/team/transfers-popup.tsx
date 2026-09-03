"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Minus, TrendingDown, TrendingUp, X } from "lucide-react";
import { KitImage } from "@/components/ui/kit-image";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface PlayerKitInfo {
  id: number;
  name: string;
  team: number;
  teamShortName?: string;
  teamCode?: number;
  elementType: number;
}

interface TransferWithDetails {
  playerIn: PlayerKitInfo | null;
  playerOut: PlayerKitInfo | null;
  playerInPoints: number;
  playerOutPoints: number;
  event: number;
}

interface TransfersPopupProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  gameweek: string;
}

export function TransfersPopup({ isOpen, onClose, teamId, gameweek }: TransfersPopupProps) {
  const [transfers, setTransfers] = useState<TransferWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/transfers/${gameweek}?entry=${teamId}`);
      if (!response.ok) throw new Error("Failed to fetch transfers");
      const data = await response.json();

      setTransfers(data.transfers || []);
      setTotalIn(data.totalIn || 0);
      setTotalOut(data.totalOut || 0);
    } catch (error) {
      console.error("Failed to fetch transfers:", error);
    } finally {
      setLoading(false);
    }
  }, [teamId, gameweek]);

  useEffect(() => {
    if (isOpen) {
      fetchTransfers();
    }
  }, [isOpen, fetchTransfers]);

  if (!isOpen) return null;

  const netPoints = totalIn - totalOut;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-surface-3 shadow-pop">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-border bg-surface-2 p-2">
              <ArrowRightLeft className="h-4 w-4 text-fg-3" />
            </div>
            <h3 className="text-base font-semibold text-fg">Gameweek {gameweek} transfers</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center gap-3 p-12 text-sm text-fg-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-fg-3" />
              Loading transfers…
            </div>
          ) : transfers.length === 0 ? (
            <EmptyState title="No transfers" description="No transfers were made this gameweek." />
          ) : (
            <div className="divide-y divide-border">
              {transfers.map((transfer, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-[1fr,auto,1fr] sm:items-center sm:gap-4 sm:p-4">
                  <div className="flex items-center gap-3 rounded-md border border-negative/20 bg-negative-soft p-3">
                    {transfer.playerOut && (
                      <KitImage player={transfer.playerOut} size={28} className="shrink-0 object-contain" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-fg">
                        {transfer.playerOut?.name || "Unknown"}
                      </div>
                      <div className="mt-0.5 text-xs text-fg-3">
                        Out ·{" "}
                        <span className="font-semibold tabular-nums text-negative">
                          {transfer.playerOutPoints} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center py-1 sm:py-0">
                    <ArrowRightLeft className="h-3.5 w-3.5 rotate-90 text-fg-3 sm:rotate-0" />
                  </div>

                  <div className="flex items-center gap-3 rounded-md border border-positive/20 bg-positive-soft p-3">
                    {transfer.playerIn && (
                      <KitImage player={transfer.playerIn} size={28} className="shrink-0 object-contain" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-fg">
                        {transfer.playerIn?.name || "Unknown"}
                      </div>
                      <div className="mt-0.5 text-xs text-fg-3">
                        In ·{" "}
                        <span className="font-semibold tabular-nums text-positive">
                          {transfer.playerInPoints} pts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && transfers.length > 0 && (
          <div className="flex shrink-0 items-center justify-around gap-4 border-t border-border bg-surface-2 px-6 py-4 text-center">
            <div>
              <div className="mb-1 text-xs text-fg-2">Out total</div>
              <div className="text-xl font-semibold tabular-nums text-negative">{totalOut}</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="mb-1 text-xs text-fg-2">In total</div>
              <div className="text-xl font-semibold tabular-nums text-positive">{totalIn}</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="mb-1 text-xs text-fg-2">Net gain</div>
              <div
                className={cn(
                  "flex items-center justify-center gap-1.5 text-xl font-semibold tabular-nums",
                  netPoints > 0 ? "text-positive" : netPoints < 0 ? "text-negative" : "text-fg-2"
                )}
              >
                {netPoints > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : netPoints < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                {netPoints > 0 ? "+" : ""}
                {netPoints}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
