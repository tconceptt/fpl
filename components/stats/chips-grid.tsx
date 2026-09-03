import type { ChipHalf, ChipStatusResult, ChipUsageStatus, ChipWindow } from "@/lib/chips";
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

function StatusDot({ status, window, usedInGameweek }: { status: ChipUsageStatus; window: ChipWindow; usedInGameweek?: number }) {
  if (status === "used") {
    return (
      <span
        className="inline-block h-2 w-2 rounded-full bg-positive"
        title={`${window.label} played in GW${usedInGameweek}`}
        aria-label={`${window.label} played in gameweek ${usedInGameweek}`}
      />
    );
  }
  if (status === "expired") {
    return (
      <span
        className="inline-block h-2 w-2 rounded-full bg-fg-3"
        title={`${window.label} expired unused`}
        aria-label={`${window.label} expired unused`}
      />
    );
  }
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-surface ring-2 ring-positive-soft"
      title={`${window.label} available`}
      aria-label={`${window.label} available`}
    />
  );
}

function ManagerCell({ manager }: { manager: ChipsGridManager }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-semibold text-fg">{manager.name}</div>
      <div className="truncate text-xs text-fg-2">{manager.managerName}</div>
    </div>
  );
}

/**
 * Manager × chip × half. Below `sm` the two half-season blocks stack
 * vertically (5 columns each: manager + WC/FH/BB/TC) so nothing needs to
 * scroll sideways on a phone; at `sm` and up they combine into one wide
 * table. A dot shows availability: a hollow ring for available, a filled
 * dot (gameweek number on hover) for used, and a muted dot for expired.
 */
export function ChipsGrid({ managers, halves, currentGameweek }: ChipsGridProps) {
  return (
    <div className="rounded-lg border border-border">
      {/* Mobile: one stacked block per half */}
      <div className="divide-y divide-border sm:hidden">
        {halves.map((half) => {
          const isCurrent = currentGameweek >= half.startEvent && currentGameweek <= half.stopEvent;
          return (
            <div key={half.stopEvent}>
              <div
                className={cn(
                  "border-b border-border bg-surface-2 px-3 py-2 text-[11px] font-medium uppercase tracking-wide",
                  isCurrent ? "text-accent" : "text-fg-3"
                )}
              >
                {half.label}
              </div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-2 text-[11px] uppercase tracking-wide text-fg-3">
                    <th className="px-3 py-1.5 text-left font-medium">Manager</th>
                    {half.windows.map((window) => (
                      <th key={window.name} className="px-1 py-1.5 text-center font-medium">
                        {CHIP_ABBR[window.name] ?? window.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {managers.map((manager) => (
                    <tr key={manager.id} className="border-t border-border">
                      <td className="max-w-[160px] px-3 py-2">
                        <ManagerCell manager={manager} />
                      </td>
                      {half.windows.map((window) => {
                        const status = findStatus(manager.chipStatuses, window.name, window.stopEvent);
                        return (
                          <td key={window.name} className="px-1 py-2 text-center">
                            <div className="flex items-center justify-center">
                              <StatusDot
                                status={status?.status ?? "available"}
                                window={window}
                                usedInGameweek={status?.usedInGameweek}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Desktop: one combined table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-2 text-[11px] uppercase tracking-wide text-fg-3">
              <th rowSpan={2} className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-left align-bottom font-medium">
                Manager
              </th>
              {halves.map((half) => {
                const isCurrent = currentGameweek >= half.startEvent && currentGameweek <= half.stopEvent;
                return (
                  <th
                    key={half.stopEvent}
                    colSpan={half.windows.length}
                    className={cn(
                      "border-l border-border px-2 py-1.5 text-center font-medium",
                      isCurrent ? "text-accent" : "text-fg-3"
                    )}
                  >
                    {half.label}
                  </th>
                );
              })}
            </tr>
            <tr className="bg-surface-2 text-[11px] uppercase tracking-wide text-fg-3">
              {halves.map((half) =>
                half.windows.map((window, i) => (
                  <th
                    key={`${half.stopEvent}-${window.name}`}
                    title={window.label}
                    className={cn("w-11 px-1 py-1.5 text-center font-medium", i === 0 && "border-l border-border")}
                  >
                    {CHIP_ABBR[window.name] ?? window.name}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {managers.map((manager) => (
              <tr key={manager.id} className="border-t border-border hover:bg-surface-2">
                <td className="sticky left-0 z-10 max-w-[160px] bg-surface px-3 py-2">
                  <ManagerCell manager={manager} />
                </td>
                {halves.map((half) =>
                  half.windows.map((window, i) => {
                    const status = findStatus(manager.chipStatuses, window.name, window.stopEvent);
                    return (
                      <td
                        key={`${manager.id}-${half.stopEvent}-${window.name}`}
                        className={cn("px-1 py-2 text-center", i === 0 && "border-l border-border")}
                      >
                        <div className="flex items-center justify-center">
                          <StatusDot
                            status={status?.status ?? "available"}
                            window={window}
                            usedInGameweek={status?.usedInGameweek}
                          />
                        </div>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-xs text-fg-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-surface ring-2 ring-positive-soft" /> available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-positive" /> used (hover for GW)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-fg-3" /> expired
        </span>
      </div>
    </div>
  );
}
