import type { ChipHalf, ChipStatusResult } from "@/lib/chips";
import { cn } from "@/lib/utils";

const CHIP_ABBR: Record<string, string> = {
  wildcard: "WC",
  freehit: "FH",
  bboost: "BB",
  "3xc": "TC",
};

export interface ChipsGridManager {
  id: number;
  name: string;
  managerName: string;
  chipStatuses: ChipStatusResult[];
}

interface ChipsGridProps {
  managers: ChipsGridManager[];
  halves: ChipHalf[];
  currentGameweek: number;
}

function findStatus(
  statuses: ChipStatusResult[],
  name: string,
  stopEvent: number
): ChipStatusResult | undefined {
  return statuses.find((s) => s.window.name === name && s.window.stopEvent === stopEvent);
}

/**
 * Manager × chip × half (Phase 4.3). Used cells show the gameweek the chip
 * was played, available cells a dot, and expired cells a dash. The manager
 * column is sticky so the grid scrolls sideways on a phone without losing
 * the row labels.
 */
export function ChipsGrid({ managers, halves, currentGameweek }: ChipsGridProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[420px] border-collapse text-xs text-white">
        <thead>
          <tr className="bg-gradient-to-r from-gray-800 to-gray-900 text-gray-300">
            <th
              rowSpan={2}
              className="sticky left-0 z-10 bg-gray-900 px-3 py-2 text-left font-bold align-bottom border-b border-gray-700"
            >
              Manager
            </th>
            {halves.map((half) => {
              const isCurrent = currentGameweek >= half.startEvent && currentGameweek <= half.stopEvent;
              return (
                <th
                  key={half.stopEvent}
                  colSpan={half.windows.length}
                  className={cn(
                    "px-2 py-1.5 text-center font-bold uppercase tracking-wide border-b border-l border-gray-700",
                    isCurrent ? "text-purple-300" : "text-gray-400"
                  )}
                >
                  {half.label}
                </th>
              );
            })}
          </tr>
          <tr className="bg-gradient-to-r from-gray-800 to-gray-900 text-gray-300">
            {halves.map((half) =>
              half.windows.map((window, i) => (
                <th
                  key={`${half.stopEvent}-${window.name}`}
                  title={window.label}
                  className={cn(
                    "w-11 px-1 py-1.5 text-center font-semibold border-b border-gray-700",
                    i === 0 && "border-l"
                  )}
                >
                  {CHIP_ABBR[window.name] ?? window.name}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {managers.map((manager, rowIndex) => (
            <tr
              key={manager.id}
              className={cn("border-b border-white/5", rowIndex % 2 === 0 ? "bg-gray-800/50" : "bg-gray-900/50")}
            >
              <td
                className={cn(
                  "sticky left-0 z-10 px-3 py-2 max-w-[140px]",
                  rowIndex % 2 === 0 ? "bg-gray-800" : "bg-gray-900"
                )}
              >
                <div className="truncate font-semibold leading-tight">{manager.name}</div>
                <div className="truncate text-white/60 leading-tight">{manager.managerName}</div>
              </td>
              {halves.map((half) =>
                half.windows.map((window, i) => {
                  const status = findStatus(manager.chipStatuses, window.name, window.stopEvent);
                  return (
                    <td
                      key={`${manager.id}-${half.stopEvent}-${window.name}`}
                      className={cn("px-1 py-2 text-center tabular-nums", i === 0 && "border-l border-gray-700")}
                    >
                      {status?.status === "used" ? (
                        <span
                          className="inline-flex items-center justify-center rounded bg-purple-500/20 border border-purple-500/30 px-1 py-0.5 font-bold text-purple-300 leading-none"
                          title={`${window.label} played in gameweek ${status.usedInGameweek}`}
                        >
                          GW{status.usedInGameweek}
                        </span>
                      ) : status?.status === "expired" ? (
                        <span className="text-white/30" title={`${window.label} expired unused`}>
                          —
                        </span>
                      ) : (
                        <span
                          className="inline-block h-2 w-2 rounded-full bg-green-400/80"
                          title={`${window.label} available`}
                          aria-label="available"
                        />
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-xs text-white/50 border-t border-white/10">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-green-400/80" /> available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-purple-500/20 border border-purple-500/30 px-1 font-bold text-purple-300">GWn</span> played
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-white/30">—</span> expired
        </span>
      </div>
    </div>
  );
}
