/**
 * Telegram Bot API over `fetch` (Phase 5.2). One group chat, HTML parse
 * mode, messages split at Telegram's 4096-character limit on line breaks,
 * and a retry on 429 that honours `retry_after`.
 *
 * `sendMessage` throws when Telegram is not configured or the send fails
 * after retries, so callers that must not double-post (the tick route) can
 * release their once-only claim.
 */

const MAX_MESSAGE_LENGTH = 4096;
const MAX_ATTEMPTS = 3;

export interface SendMessageOptions {
  /** Defaults to `TELEGRAM_CHAT_ID`. */
  chatId?: string | number;
  replyToMessageId?: number;
  disableNotification?: boolean;
}

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/** Escape the three characters Telegram's HTML parse mode treats specially. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Split `text` into chunks of at most `max` characters, breaking on the
 * last line break before the limit so a line (and its tags) is never cut
 * in half. A single line longer than `max` is hard-cut as a last resort.
 */
export function splitMessage(text: string, max = MAX_MESSAGE_LENGTH): string[] {
  const chunks: string[] = [];
  let rest = text;

  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut <= 0) cut = max;
    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).replace(/^\n+/, "");
  }

  if (rest.length > 0 || chunks.length === 0) chunks.push(rest);
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TelegramErrorBody {
  ok?: boolean;
  description?: string;
  parameters?: { retry_after?: number };
}

async function postChunk(token: string, body: Record<string, unknown>): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) return;

    let parsed: TelegramErrorBody = {};
    try {
      parsed = (await response.json()) as TelegramErrorBody;
    } catch {
      // Non-JSON error body; fall through with the status alone.
    }

    lastError = new Error(`Telegram ${response.status}: ${parsed.description ?? "sendMessage failed"}`);

    if (response.status === 429 && attempt < MAX_ATTEMPTS - 1) {
      const retryAfter = parsed.parameters?.retry_after ?? 1;
      await sleep(retryAfter * 1000);
      continue;
    }

    if (response.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
      await sleep(500 * (attempt + 1));
      continue;
    }

    throw lastError;
  }

  throw lastError instanceof Error ? lastError : new Error("Telegram sendMessage failed");
}

/** Send an HTML message to the league group, in as many chunks as it needs. */
export async function sendMessage(text: string, opts: SendMessageOptions = {}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = opts.chatId ?? process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("Telegram is not configured: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.");
  }

  const chunks = splitMessage(text);
  for (let i = 0; i < chunks.length; i++) {
    await postChunk(token, {
      chat_id: chatId,
      text: chunks[i],
      parse_mode: "HTML",
      disable_web_page_preview: true,
      disable_notification: opts.disableNotification ?? false,
      // Only the first chunk replies to the command; the rest just follow it.
      ...(i === 0 && opts.replyToMessageId ? { reply_to_message_id: opts.replyToMessageId } : {}),
    });
  }
}
