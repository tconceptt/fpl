/**
 * The 5-minute tick (Phase 5.5), called by .github/workflows/tick.yml with
 * `Authorization: Bearer $CRON_SECRET`. Two idempotent checks — the
 * deadline reminder and the final-whistle recap — each guarded by a Redis
 * `SET NX` claim so overlapping or repeated ticks never double-post.
 * Everything it reads is the same cached data the pages use. An FPL outage
 * answers 200 with `ok: false`, never 502, so external schedulers don't
 * count it as a failure and switch the job off.
 */

import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import { claimOnce, deleteState, getState, releaseClaim, setState } from "@/lib/bot-state";
import { escapeHtml, sendMessage, telegramConfigured } from "@/lib/telegram";
import { getLeagueSnapshot } from "@/services/league";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { formatDeadlineReminder } from "@/services/bot-replies";
import { getRecap, recapToTelegramHtml } from "@/services/recap";
import { decideTick, diffScores, formatScoreChanges, type StoredScores } from "@/services/tick";
import { findCurrentEvent, fixturesAllPlayed } from "@/services/settled";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const REMINDER_CLAIM_TTL = 7 * 24 * 60 * 60;
const RECAP_CLAIM_TTL = 30 * 24 * 60 * 60;
const PROVISIONAL_TTL = 30 * 24 * 60 * 60;

/**
 * Store the provisional scores at the final whistle (once), and once FPL
 * has checked the gameweek compare them against its final history. Reads
 * history straight from FPL rather than the cache so a row cached minutes
 * before FPL processed the gameweek can't masquerade as a change.
 */
async function checkScores(
  events: Awaited<ReturnType<typeof client.bootstrap>>["events"],
  currentFixtures: Awaited<ReturnType<typeof client.fixtures>>
): Promise<Outcome> {
  const current = findCurrentEvent(events);
  if (!current) return "not-due";

  if (!current.data_checked) {
    if (!fixturesAllPlayed(currentFixtures)) return "not-due";
    const key = `provisional:${current.id}`;
    if (await getState<StoredScores>(key)) return "already-sent";
    const snapshot = await getLeagueSnapshot(current.id);
    const scores: StoredScores = {};
    for (const m of snapshot.managers) {
      scores[m.entry] = { player_name: m.player_name, entry_name: m.entry_name, net_points: m.net_points };
    }
    await setState(key, scores, PROVISIONAL_TTL);
    return "sent";
  }

  // Checked: compare the current event and the one before it (in case the
  // flip landed right around a deadline, when `is_current` moves on).
  for (const gw of [current.id, current.id - 1]) {
    const event = events.find((e) => e.id === gw);
    if (!event?.data_checked) continue;
    const stored = await getState<StoredScores>(`provisional:${gw}`);
    if (!stored) continue;
    if (!(await claimOnce(`settled:${gw}`, RECAP_CLAIM_TTL))) continue;
    try {
      const official = new Map<number, number>();
      await Promise.all(
        Object.keys(stored).map(async (entryStr) => {
          const entry = Number(entryStr);
          const history = await client.history(entry);
          const row = history.current.find((g) => g.event === gw);
          if (row) official.set(entry, row.points - (row.event_transfers_cost || 0));
        })
      );
      const text = formatScoreChanges(gw, diffScores(stored, official), escapeHtml);
      if (text) await sendMessage(text);
      await deleteState(`provisional:${gw}`);
      return text ? "sent" : "not-due";
    } catch (error) {
      console.error(`Score check for GW${gw} failed:`, error);
      await releaseClaim(`settled:${gw}`);
      return "failed";
    }
  }
  return "not-due";
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
}

type Outcome = "sent" | "already-sent" | "not-due" | "failed";

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!telegramConfigured()) {
    return NextResponse.json({ error: "Telegram is not configured" }, { status: 503 });
  }

  return withUpstreamCounter(async () => {
    try {
      const bootstrap = await cachedKind("bootstrap", "bootstrap", () => client.bootstrap());
      const nextEvent = bootstrap.events.find((e) => e.is_next);
      const currentEvent =
        bootstrap.events.find((e) => e.is_current) ?? [...bootstrap.events].reverse().find((e) => e.finished);
      const fixtures = currentEvent
        ? await cachedKind("fixtures", `fixtures:${currentEvent.id}`, () => client.fixtures(currentEvent.id))
        : [];

      const now = new Date();
      const decision = decideTick({ now, nextEvent, currentEvent, fixtures });

      let reminder: Outcome = "not-due";
      if (decision.reminder && nextEvent) {
        const key = `reminder:${decision.reminder.gw}`;
        if (await claimOnce(key, REMINDER_CLAIM_TTL)) {
          try {
            await sendMessage(formatDeadlineReminder(nextEvent, now));
            reminder = "sent";
          } catch (error) {
            console.error("Deadline reminder failed:", error);
            await releaseClaim(key);
            reminder = "failed";
          }
        } else {
          reminder = "already-sent";
        }
      }

      let recap: Outcome = "not-due";
      if (decision.recap) {
        const key = `recap:${decision.recap.gw}`;
        if (await claimOnce(key, RECAP_CLAIM_TTL)) {
          try {
            const text = recapToTelegramHtml(await getRecap(decision.recap.gw));
            await sendMessage(text);
            recap = "sent";
          } catch (error) {
            console.error("Recap failed:", error);
            await releaseClaim(key);
            recap = "failed";
          }
        } else {
          recap = "already-sent";
        }
      }

      let scoreCheck: Outcome = "not-due";
      try {
        scoreCheck = await checkScores(bootstrap.events, fixtures);
      } catch (error) {
        console.error("Score check failed:", error);
        scoreCheck = "failed";
      }

      logTelemetry("/api/cron/tick");
      return NextResponse.json({
        now: now.toISOString(),
        nextGameweek: nextEvent?.id ?? null,
        currentGameweek: currentEvent?.id ?? null,
        reminder,
        recap,
        scoreCheck,
      });
    } catch (error) {
      // Deliberately 200, not 502: FPL goes down for maintenance most
      // nights, and cron-job.org disables a job after a run of HTTP
      // failures (it did so on 2026-09-18 after 3.5 hours of 502s, which is
      // why no deadline reminder was ever sent). The scheduler is not at
      // fault when upstream is; the next tick simply tries again.
      console.error("GET /api/cron/tick failed:", error);
      logTelemetry("/api/cron/tick");
      return NextResponse.json({ ok: false, error: "FPL API unavailable" });
    }
  });
}
