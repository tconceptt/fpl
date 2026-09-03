/**
 * The 5-minute tick (Phase 5.5), called by .github/workflows/tick.yml with
 * `Authorization: Bearer $CRON_SECRET`. Two idempotent checks — the
 * deadline reminder and the final-whistle recap — each guarded by a Redis
 * `SET NX` claim so overlapping or repeated ticks never double-post.
 * Everything it reads is the same cached data the pages use.
 */

import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import { claimOnce, releaseClaim } from "@/lib/bot-state";
import { sendMessage, telegramConfigured } from "@/lib/telegram";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { formatDeadlineReminder } from "@/services/bot-replies";
import { getRecap, recapToTelegramHtml } from "@/services/recap";
import { decideTick } from "@/services/tick";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const REMINDER_CLAIM_TTL = 7 * 24 * 60 * 60;
const RECAP_CLAIM_TTL = 30 * 24 * 60 * 60;

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

      logTelemetry("/api/cron/tick");
      return NextResponse.json({
        now: now.toISOString(),
        nextGameweek: nextEvent?.id ?? null,
        currentGameweek: currentEvent?.id ?? null,
        reminder,
        recap,
      });
    } catch (error) {
      console.error("GET /api/cron/tick failed:", error);
      logTelemetry("/api/cron/tick");
      return NextResponse.json({ error: "FPL API unavailable" }, { status: 502 });
    }
  });
}
