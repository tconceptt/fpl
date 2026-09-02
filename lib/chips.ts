/**
 * Chips, modelled from bootstrap `chips` windows.
 *
 * Every chip exists twice in 26/27 — once for gameweeks 1 to 19 and again for
 * 20 to 38 — so nothing here is a fixed list of four. Wildcard opens at GW2.
 */

export type ChipName = "wildcard" | "freehit" | "bboost" | "3xc";

const CHIP_LABELS: Record<ChipName, string> = {
  wildcard: "Wildcard",
  freehit: "Free Hit",
  bboost: "Bench Boost",
  "3xc": "Triple Captain",
};

function isChipName(name: string): name is ChipName {
  return name in CHIP_LABELS;
}

/** Fixed display order for chip abbreviations: WC, FH, BB, TC. */
export const chipDisplayOrder: ChipName[] = ["wildcard", "freehit", "bboost", "3xc"];

/** The display label for a chip's raw API name, e.g. "3xc" -> "Triple Captain". */
export function chipLabel(name: string): string {
  return isChipName(name) ? CHIP_LABELS[name] : name;
}

export interface ChipWindow {
  name: ChipName;
  label: string;
  startEvent: number;
  stopEvent: number;
}

interface BootstrapChipLike {
  name: string;
  start_event: number;
  stop_event: number;
}

export function chipWindowsFromBootstrap(chips: BootstrapChipLike[]): ChipWindow[] {
  return chips
    .filter((chip) => isChipName(chip.name))
    .map((chip) => ({
      name: chip.name as ChipName,
      label: chipLabel(chip.name),
      startEvent: chip.start_event,
      stopEvent: chip.stop_event,
    }))
    .sort((a, b) => a.startEvent - b.startEvent || a.name.localeCompare(b.name));
}

export type ChipUsageStatus = "used" | "available" | "expired";

export interface ChipStatusResult {
  window: ChipWindow;
  status: ChipUsageStatus;
  usedInGameweek?: number;
}

export interface PlayedChip {
  name: string;
  event: number;
}

/**
 * Per manager, per chip window: used at GW n, still available, or expired
 * (the window closed without the chip being played).
 */
export function chipStatus(
  playedChips: PlayedChip[],
  windows: ChipWindow[],
  currentGameweek: number
): ChipStatusResult[] {
  return windows.map((window) => {
    const used = playedChips.find(
      (chip) =>
        chip.name === window.name &&
        chip.event >= window.startEvent &&
        chip.event <= window.stopEvent
    );

    if (used) {
      return { window, status: "used", usedInGameweek: used.event };
    }

    if (currentGameweek > window.stopEvent) {
      return { window, status: "expired" };
    }

    return { window, status: "available" };
  });
}
