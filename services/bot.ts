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
import { getPrizes } from "@/services/prizes";
import { getStatsData } from "@/app/stats/getStatData";
import { getRecap, recapToTelegramHtml } from "@/services/recap";
import { getSettlement } from "@/services/settled";
import { getTransferFeed, groupTransfersByManager } from "@/services/transfers";
import {
  formatChips,
  formatDeadline,
  formatGwSummary,
  formatH2H,
  formatPrizes,
  formatTable,
  formatTransfers,
  formatWinners,
  helpText,
} from "@/services/bot-replies";

export const BOT_COMMANDS = ["table", "gw", "h2h", "chips", "transfers", "recap", "winners", "prizes", "deadline", "help", "start"] as const;
export type BotCommand = (typeof BOT_COMMANDS)[number];

export interface ParsedCommand {
  command: BotCommand;
  arg: string | null;
}

/** "/recap@QitawrariBot 3" -> { command: "recap", arg: "3" }; null for anything that isn't a known command. */
export function parseCommand(text: string | undefined): ParsedCommand | null {
  if (!text) return null;
  const match = /^\/([a-z0-9_]+)(?:@\w+)?(?:\s+(.*))?$/i.exec(text.trim());
  if (!match) return null;
  const command = match[1].toLowerCase();
  if (!(BOT_COMMANDS as readonly string[]).includes(command)) return null;
  const arg = match[2]?.trim() || null;
  return { command: command as BotCommand, arg };
}

/**
 * The gameweek `/recap` means with no argument: the latest settled one —
 * the current gameweek once its last match has been played, else the one
 * before it (services/settled.ts).
 */
export async function defaultRecapGameweek(): Promise<number | undefined> {
  const settlement = await getSettlement();
  return settlement.settledGameweeks[settlement.settledGameweeks.length - 1];
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
    case "winners": {
      const stats = await getStatsData();
      return formatWinners(
        stats.stats.map((t) => ({
          player_name: t.managerName,
          entry_name: t.name,
          wins: t.wins,
          gameweeks: t.gameweekWins.map((w) => w.gameweek),
        })),
        stats.finishedGameweeks,
        stats.unresolvedTies.map((t) => ({ gameweeks: t.gameweeks, names: t.tiedTeams.map((x) => x.managerName) }))
      );
    }
    case "prizes": {
      return formatPrizes(await getPrizes());
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
