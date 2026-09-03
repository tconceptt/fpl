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
