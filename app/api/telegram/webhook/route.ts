/**
 * Telegram webhook (Phase 5.3). Registered with `setWebhook` and a
 * `secret_token`; every update must carry that token in
 * `X-Telegram-Bot-Api-Secret-Token`. Only messages from the league group
 * (`TELEGRAM_CHAT_ID`) are answered — anything else is acknowledged and
 * dropped so Telegram doesn't retry it.
 *
 * Always returns 200 once the update has been read: a non-2xx makes
 * Telegram redeliver the same update, which would repeat a reply that
 * failed halfway.
 */

import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram";
import { withUpstreamCounter, logTelemetry } from "@/lib/fpl/telemetry";
import { handleBotCommand, parseCommand } from "@/services/bot";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface TelegramUpdate {
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number | string; type: string };
  };
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true, ignored: "bad json" });
  }

  const message = update.message;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!message || !chatId || String(message.chat.id) !== String(chatId)) {
    return NextResponse.json({ ok: true, ignored: "chat" });
  }

  const parsed = parseCommand(message.text);
  if (!parsed) {
    return NextResponse.json({ ok: true, ignored: "not a command" });
  }

  const path = `/api/telegram/webhook (${parsed.command})`;
  return withUpstreamCounter(async () => {
    let reply: string;
    try {
      reply = await handleBotCommand(parsed);
    } catch (error) {
      console.error(`Bot command /${parsed.command} failed:`, error);
      reply = "Couldn't reach FPL just now — try again in a minute.";
    } finally {
      logTelemetry(path);
    }

    try {
      await sendMessage(reply, { chatId: message.chat.id, replyToMessageId: message.message_id });
    } catch (error) {
      console.error("Telegram sendMessage failed:", error);
    }
    return NextResponse.json({ ok: true, command: parsed.command });
  });
}
