/**
 * Telegram command dispatch (Phase 5.3). `parseCommand` is pure;
 * `handleBotCommand` loads what each command needs from the cache-backed
 * services and formats the reply. Every reply comes from Redis-backed data,
 * so it returns well inside Telegram's webhook timeout once the cache is
 * warm.
 */

import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import { chipWindowsFromBootstrap } from "@/lib/chips";
import { getH2HPage } from "@/services/h2h";
import { getLeagueSnapshot } from "@/services/league";
import { getRecap, recapToTelegramHtml } from "@/services/recap";
import { getTransferFeed, groupTransfersByManager } from "@/services/transfers";
import {
  formatChips,
  formatDeadline,
  formatGwSummary,
  formatH2H,
  formatTable,
  formatTransfers,
  helpText,
} from "@/services/bot-replies";

export const BOT_COMMANDS = ["table", "gw", "h2h", "chips", "transfers", "recap", "deadline", "help", "start"] as const;
export type BotCommand = (typeof BOT_COMMANDS)[number];

export interface ParsedCommand {
  command: BotCommand;
  arg: string | null;
}

/** "/recap@QitawrariBot 3" -> { command: "recap", arg: "3" }; null for anything that isn't a known command. */
export function parseCommand(text: string | undefined): ParsedCommand | null {
  if (!text) return null;
  const match = /^\/([a-z_]+)(?:@\w+)?(?:\s+(.*))?$/i.exec(text.trim());
  if (!match) return null;
  const command = match[1].toLowerCase();
  if (!(BOT_COMMANDS as readonly string[]).includes(command)) return null;
  const arg = match[2]?.trim() || null;
  return { command: command as BotCommand, arg };
}

/** The last gameweek FPL has checked, else the current one. */
async function defaultRecapGameweek(): Promise<number | undefined> {
  const bootstrap = await cachedKind("bootstrap", "bootstrap", () => client.bootstrap());
  const checked = [...bootstrap.events].reverse().find((e) => e.data_checked);
  return checked?.id;
}

export async function handleBotCommand(parsed: ParsedCommand): Promise<string> {
  switch (parsed.command) {
    case "table": {
      const snapshot = await getLeagueSnapshot();
      return formatTable(snapshot);
    }
    case "gw": {
      const snapshot = await getLeagueSnapshot();
      return formatGwSummary(snapshot);
    }
    case "h2h": {
      const page = await getH2HPage();
      return formatH2H(page);
    }
    case "chips": {
      const [snapshot, bootstrap] = await Promise.all([
        getLeagueSnapshot(undefined, { includePicks: false }),
        cachedKind("bootstrap", "bootstrap", () => client.bootstrap()),
      ]);
      return formatChips(snapshot.managers, chipWindowsFromBootstrap(bootstrap.chips), snapshot.currentGameweek);
    }
    case "transfers": {
      const snapshot = await getLeagueSnapshot(undefined, { includePicks: false });
      const feed = await getTransferFeed(snapshot.currentGameweek);
      return formatTransfers(groupTransfersByManager(feed.rows), snapshot.currentGameweek);
    }
    case "recap": {
      let gw: number | undefined;
      if (parsed.arg) {
        const parsedGw = Number.parseInt(parsed.arg, 10);
        if (!/^[0-9]+$/.test(parsed.arg) || parsedGw < 1) return "Usage: /recap [gameweek], e.g. /recap 3";
        gw = parsedGw;
      } else {
        gw = await defaultRecapGameweek();
      }
      const recap = await getRecap(gw);
      return recapToTelegramHtml(recap);
    }
    case "deadline": {
      const bootstrap = await cachedKind("bootstrap", "bootstrap", () => client.bootstrap());
      const next = bootstrap.events.find((e) => e.is_next) ?? bootstrap.events.find((e) => e.is_current && !e.finished);
      return formatDeadline(next);
    }
    case "help":
    case "start":
      return helpText();
  }
}
