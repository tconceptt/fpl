/**
 * Cache TTL policy (Phase 2.2), as a pure function of the kind of data and
 * the league's live state.
 *
 * | Data | Live | Quiet | Checked |
 * |---|---|---|---|
 * | event-status | 60s | 60s | 60s |
 * | bootstrap slim | 60s | 5 min | 5 min |
 * | live points | 30s | 10 min | 24h |
 * | fixtures | 60s | 10 min | 24h |
 * | picks | 60s | 10 min | 24h |
 * | history | 5 min | 5 min | 5 min |
 * | standings, H2H | 5 min | 5 min | 5 min |
 * | transfers | until next deadline (min 60s, max 7 days) | | |
 */

export type LiveState = "live" | "quiet" | "checked";

export type TtlKind =
  | "eventStatus"
  | "bootstrap"
  | "live"
  | "fixtures"
  | "picks"
  | "history"
  | "standings"
  | "h2h"
  | "transfers";

const MIN_TRANSFERS_TTL_SECONDS = 60;
const MAX_TRANSFERS_TTL_SECONDS = 7 * 24 * 60 * 60;

type StatefulKind = Exclude<TtlKind, "transfers">;

const TTL_TABLE: Record<StatefulKind, Record<LiveState, number>> = {
  eventStatus: { live: 60, quiet: 60, checked: 60 },
  bootstrap: { live: 60, quiet: 300, checked: 300 },
  live: { live: 30, quiet: 600, checked: 86400 },
  fixtures: { live: 60, quiet: 600, checked: 86400 },
  picks: { live: 60, quiet: 600, checked: 86400 },
  history: { live: 300, quiet: 300, checked: 300 },
  standings: { live: 300, quiet: 300, checked: 300 },
  h2h: { live: 300, quiet: 300, checked: 300 },
};

export interface TransfersTtlOptions {
  /** The next upcoming deadline, or null/undefined when there isn't one (season over). */
  nextDeadline?: Date | null;
  now?: Date;
}

/**
 * TTL in seconds for a given kind of FPL data at a given live state.
 *
 * `transfers` ignores `state` and instead needs `opts.nextDeadline` — it is
 * cached until the next gameweek deadline, clamped to [60s, 7 days].
 */
export function ttlFor(kind: TtlKind, state: LiveState, opts: TransfersTtlOptions = {}): number {
  if (kind === "transfers") {
    const now = opts.now ?? new Date();
    if (!opts.nextDeadline) return MIN_TRANSFERS_TTL_SECONDS;

    const seconds = Math.floor((opts.nextDeadline.getTime() - now.getTime()) / 1000);
    return Math.min(Math.max(seconds, MIN_TRANSFERS_TTL_SECONDS), MAX_TRANSFERS_TTL_SECONDS);
  }

  return TTL_TABLE[kind][state];
}
