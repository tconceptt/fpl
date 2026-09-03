import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, sendMessage, splitMessage } from "@/lib/telegram";

describe("escapeHtml", () => {
  it("escapes the characters Telegram's HTML mode cares about", () => {
    expect(escapeHtml("A & B <C>")).toBe("A &amp; B &lt;C&gt;");
  });
});

describe("splitMessage", () => {
  it("returns a short message unchanged", () => {
    expect(splitMessage("hello")).toEqual(["hello"]);
    expect(splitMessage("")).toEqual([""]);
  });

  it("splits on the last line break before the limit", () => {
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i} <b>x</b>`);
    const chunks = splitMessage(lines.join("\n"), 40);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(40);
      // Never cut inside a line, so tags stay balanced.
      expect(chunk.split("\n").every((l) => lines.includes(l))).toBe(true);
    }
    expect(chunks.join("\n")).toBe(lines.join("\n"));
  });

  it("hard-cuts a single line that is longer than the limit", () => {
    const chunks = splitMessage("x".repeat(100), 40);
    expect(chunks).toEqual(["x".repeat(40), "x".repeat(40), "x".repeat(20)]);
  });
});

describe("sendMessage", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "token";
    process.env.TELEGRAM_CHAT_ID = "-100";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when not configured", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    await expect(sendMessage("hi")).rejects.toThrow(/not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts HTML to the group and replies to the command on the first chunk only", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    const text = `${"a".repeat(4000)}\n${"b".repeat(4000)}`;
    await sendMessage(text, { replyToMessageId: 7 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/bottoken/sendMessage");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ chat_id: "-100", parse_mode: "HTML", reply_to_message_id: 7 });
    expect(body.text).toBe("a".repeat(4000));
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.reply_to_message_id).toBeUndefined();
    expect(second.text).toBe("b".repeat(4000));
  });

  it("retries a 429 after retry_after seconds", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ ok: false, parameters: { retry_after: 2 } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) });

    const pending = sendMessage("hi");
    await vi.advanceTimersByTimeAsync(2_000);
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("does not retry a 400", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ ok: false, description: "Bad Request: can't parse entities" }) });
    await expect(sendMessage("<b>oops")).rejects.toThrow(/can't parse entities/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
