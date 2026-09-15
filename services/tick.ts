/**
 * The scheduler's decisions (Phase 5.5), as a pure function so they can be
 * tested against fixtures. `/api/cron/tick` gathers the inputs, calls
 * `decideTick`, and then claims and sends.
 *
 * - Deadline reminder: the next deadline is 30 minutes or less away and
 *   still in the future. A GitHub schedule that slips past the deadline
 *   skips the reminder rather than sending it late.
 * - Recap: every fixture in the current event has `finished_provisional`
 *   (the final whistle of the last match, with provisional bonus) and FPL
 *   has not yet checked the gameweek. Once `data_checked` flips the moment
 *   has passed — the recap is skipped rather than posted a day late, and
 *   an already-checked gameweek on first deploy is never recapped by
 *   surprise. Fixtures FPL moves out of the event are no longer in the
 *   list, so a postponed match does not hold the recap back.
 * - Score check: at that same final whistle the tick stores every manager's
 *   provisional net points (live data with our own auto-subs). When FPL
 *   later checks the gameweek it compares them with FPL's final history and
 *   posts the differences, if any — silently confirming otherwise. Any
 *   change to the gameweek winner is called out. `diffScores` and
 *   `formatScoreChanges` are the pure halves of that.
 */

import type { BootstrapEvent, Fixture } from "@/lib/fpl/types";

export const REMINDER_WINDOW_MS = 30 * 60 * 1000;

export interface TickInput {
  now: Date;
  /** The event with `is_next`, i.e. the upcoming deadline. */
  nextEvent: Pick<BootstrapEvent, "id" | "deadline_time"> | undefined;
  /** The event being played (or most recently played). */
  currentEvent: Pick<BootstrapEvent, "id" | "finished" | "data_checked"> | undefined;
  /** Fixtures for `currentEvent`. */
  fixtures: Pick<Fixture, "id" | "finished" | "finished_provisional">[];
}

export interface TickDecision {
  reminder: { gw: number; deadline: Date; minutesLeft: number } | null;
  recap: { gw: number } | null;
}

export function decideTick(input: TickInput): TickDecision {
  let reminder: TickDecision["reminder"] = null;
  if (input.nextEvent) {
    const deadline = new Date(input.nextEvent.deadline_time);
    const remaining = deadline.getTime() - input.now.getTime();
    if (remaining > 0 && remaining <= REMINDER_WINDOW_MS) {
      reminder = { gw: input.nextEvent.id, deadline, minutesLeft: Math.max(1, Math.floor(remaining / 60_000)) };
    }
  }

  let recap: TickDecision["recap"] = null;
  if (
    input.currentEvent &&
    !input.currentEvent.data_checked &&
    input.fixtures.length > 0 &&
    input.fixtures.every((f) => f.finished_provisional === true || f.finished === true)
  ) {
    recap = { gw: input.currentEvent.id };
  }

  return { reminder, recap };
}

// --- Score check ---

export interface StoredScore {
  player_name: string;
  entry_name: string;
  net_points: number;
}

/** entry -> provisional score, as stored at the final whistle. */
export type StoredScores = Record<string, StoredScore>;

export interface ScoreChange {
  entry: number;
  player_name: string;
  before: number;
  after: number;
}

export interface ScoreDiff {
  changes: ScoreChange[];
  /** Winners (by net points) before and after; more than one means a tie. */
  winnersBefore: string[];
  winnersAfter: string[];
}

function topNames(scores: Array<{ player_name: string; net_points: number }>): string[] {
  const max = Math.max(...scores.map((s) => s.net_points));
  return scores
    .filter((s) => s.net_points === max)
    .map((s) => s.player_name)
    .sort((a, b) => a.localeCompare(b));
}

/** Compare the stored provisional scores with FPL's final net points (entry -> net). */
export function diffScores(stored: StoredScores, official: Map<number, number>): ScoreDiff {
  const before: Array<{ player_name: string; net_points: number }> = [];
  const after: Array<{ player_name: string; net_points: number }> = [];
  const changes: ScoreChange[] = [];

  for (const [entryStr, s] of Object.entries(stored)) {
    const entry = Number(entryStr);
    const final = official.get(entry);
    if (final === undefined) continue;
    before.push({ player_name: s.player_name, net_points: s.net_points });
    after.push({ player_name: s.player_name, net_points: final });
    if (final !== s.net_points) changes.push({ entry, player_name: s.player_name, before: s.net_points, after: final });
  }
  changes.sort((a, b) => a.player_name.localeCompare(b.player_name));

  return {
    changes,
    winnersBefore: before.length > 0 ? topNames(before) : [],
    winnersAfter: after.length > 0 ? topNames(after) : [],
  };
}

function sameNames(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((name, i) => name === b[i]);
}

/** Telegram HTML for a score check that found changes; null when nothing moved. */
export function formatScoreChanges(gw: number, diff: ScoreDiff, escape: (s: string) => string = (s) => s): string | null {
  if (diff.changes.length === 0) return null;
  const lines = diff.changes.map((c) => {
    const delta = c.after - c.before;
    return `${escape(c.player_name)}: ${c.before} → <b>${c.after}</b> (${delta > 0 ? "+" : "−"}${Math.abs(delta)})`;
  });
  const parts = [`📋 <b>FPL has finalised GW${gw}</b> — ${lines.length} score${lines.length === 1 ? "" : "s"} changed`, ...lines];
  if (!sameNames(diff.winnersBefore, diff.winnersAfter)) {
    parts.push(
      "",
      `🏆 GW${gw} winner is now <b>${diff.winnersAfter.map(escape).join(" & ")}</b> (was ${diff.winnersBefore.map(escape).join(" & ")})`
    );
  }
  return parts.join("\n");
}
