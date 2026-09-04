/**
 * Gameweek recap (Phase 5.4).
 *
 * `buildRecap` is a pure function from a `RecapInput` to structured
 * sections, rendered as Telegram HTML by `recapToTelegramHtml` and as
 * plain text by `recapToPlainText`; the gameweek page's recap card renders
 * the sections directly. `recapInputFromSnapshot` is the pure adapter from
 * the league snapshot (plus picks, live points, transfers and H2H
 * matchups) and `getRecap` is the loader the bot, the tick route and the
 * recap API use.
 *
 * Every list is sorted with a name tie-break, so the same input always
 * produces the same text.
 */

import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import { chipLabel } from "@/lib/chips";
import { escapeHtml } from "@/lib/telegram";
import { buildLivePointsMap, type LivePointsMap } from "@/services/fpl-live";
import { buildH2HMatchups, type H2HMatchup } from "@/services/h2h";
import { fetchPicks, getLeagueSnapshot, type LeagueSnapshot } from "@/services/league";
import { getTransferFeed, groupTransfersByManager, type ManagerTransfers } from "@/services/transfers";
import type { BootstrapPlayer, TeamDetails } from "@/lib/fpl/types";

export interface RecapManager {
  entry: number;
  entryName: string;
  playerName: string;
  rank: number;
  lastRank: number;
  /** Gameweek points net of hits. */
  netPoints: number;
  totalPoints: number;
  transferCost: number;
  /** The player who actually carried the armband (vice if the captain blanked). */
  captainName: string | null;
  /** That player's raw gameweek points. */
  captainPoints: number | null;
  activeChip: string | null;
  /** Raw points left on the bench (0 under Bench Boost). */
  benchPoints: number;
}

export interface RecapInput {
  gw: number;
  leagueName: string;
  managers: RecapManager[];
  transfers: ManagerTransfers[];
  matchups: H2HMatchup[];
  /** True until FPL has checked the gameweek's data (bonus can still move). */
  provisional: boolean;
}

export interface RecapSection {
  title: string;
  lines: string[];
}

export interface Recap {
  gw: number;
  leagueName: string;
  provisional: boolean;
  sections: RecapSection[];
}

function byName(a: { playerName: string }, b: { playerName: string }): number {
  return a.playerName.localeCompare(b.playerName);
}

function who(m: { entryName: string; playerName: string }): string {
  return `${m.entryName} (${m.playerName})`;
}

function pts(n: number): string {
  return `${n} pt${n === 1 ? "" : "s"}`;
}

/** Winner and Qitawrari by net points, i.e. after transfer hits are deducted. */
function winnerAndStruggler(managers: RecapManager[]): RecapSection {
  const max = Math.max(...managers.map((m) => m.netPoints));
  const min = Math.min(...managers.map((m) => m.netPoints));
  const winners = managers.filter((m) => m.netPoints === max).sort(byName);
  const strugglers = managers.filter((m) => m.netPoints === min).sort(byName);

  const lines: string[] = [];
  if (winners.length === 1) {
    lines.push(`🏆 ${who(winners[0])} won the week with ${pts(max)}`);
  } else {
    lines.push(`🏆 Shared week: ${winners.map(who).join(", ")} on ${pts(max)}`);
  }
  if (max !== min) {
    if (strugglers.length === 1) {
      lines.push(`💩 Qitawrari of the week: ${who(strugglers[0])} with ${pts(min)}`);
    } else {
      lines.push(`💩 Qitawrari of the week: ${strugglers.map(who).join(", ")} on ${pts(min)}`);
    }
  }
  return { title: "The week", lines };
}

/** Worst bench waste. Bench Boost players are skipped: their bench scored for them. */
function benchWaste(managers: RecapManager[]): RecapSection {
  const worst = managers
    .filter((m) => m.benchPoints > 0 && m.activeChip !== "bboost")
    .sort((a, b) => b.benchPoints - a.benchPoints || byName(a, b))[0];
  if (!worst) return { title: "Bench", lines: ["Nobody left points on the bench"] };
  return { title: "Bench", lines: [`🪑 ${worst.playerName} left ${pts(worst.benchPoints)} on the bench`] };
}

function chipsPlayed(managers: RecapManager[]): RecapSection {
  const byChip = new Map<string, string[]>();
  for (const m of managers) {
    if (!m.activeChip) continue;
    const label = chipLabel(m.activeChip);
    byChip.set(label, [...(byChip.get(label) ?? []), m.playerName]);
  }
  if (byChip.size === 0) return { title: "Chips", lines: ["No chips played"] };
  return {
    title: "Chips",
    lines: [...byChip.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, names]) => `🃏 ${label}: ${[...names].sort().join(", ")}`),
  };
}

/**
 * The most one-sided H2H result of the week, as a single line. Byes against
 * "AVERAGE" are ignored, and a week of nothing but draws yields no section.
 */
function biggestThrashing(matchups: H2HMatchup[]): RecapSection | null {
  const decisive = matchups
    .filter((m) => !m.isBye && m.home.entry !== null && m.away.entry !== null && m.home.points !== m.away.points)
    .map((m) => {
      const [winner, loser] = m.home.points > m.away.points ? [m.home, m.away] : [m.away, m.home];
      return { winner, loser, margin: winner.points - loser.points };
    })
    .sort((a, b) => b.margin - a.margin || a.winner.entryName.localeCompare(b.winner.entryName));
  if (decisive.length === 0) return null;
  const { winner, loser, margin } = decisive[0];
  return {
    title: "Biggest H2H thrashing",
    lines: [`💥 ${winner.entryName} ${winner.points} – ${loser.points} ${loser.entryName}, won by ${margin}`],
  };
}

function topThree(managers: RecapManager[]): RecapSection {
  const ordered = [...managers].sort((a, b) => a.rank - b.rank || byName(a, b));
  return { title: "Top 3", lines: ordered.slice(0, 3).map((m) => `${m.rank}. ${who(m)} — ${m.totalPoints}`) };
}

export function buildRecap(input: RecapInput): Recap {
  const sections: RecapSection[] = [];
  if (input.managers.length === 0) {
    return { gw: input.gw, leagueName: input.leagueName, provisional: input.provisional, sections: [{ title: "The week", lines: ["No scores yet"] }] };
  }

  sections.push(winnerAndStruggler(input.managers));
  sections.push(chipsPlayed(input.managers));
  const thrashing = biggestThrashing(input.matchups);
  if (thrashing) sections.push(thrashing);
  sections.push(benchWaste(input.managers));
  sections.push(topThree(input.managers));

  return { gw: input.gw, leagueName: input.leagueName, provisional: input.provisional, sections };
}

export function recapToTelegramHtml(recap: Recap): string {
  const parts = [`<b>Gameweek ${recap.gw} recap</b> — ${escapeHtml(recap.leagueName)}`];
  for (const section of recap.sections) {
    parts.push(`<b>${escapeHtml(section.title)}</b>\n${section.lines.map(escapeHtml).join("\n")}`);
  }
  if (recap.provisional) parts.push("<i>Bonus is provisional until FPL confirms it.</i>");
  return parts.join("\n\n");
}

export function recapToPlainText(recap: Recap): string {
  const parts = [`Gameweek ${recap.gw} recap — ${recap.leagueName}`];
  for (const section of recap.sections) {
    parts.push(`${section.title}\n${section.lines.join("\n")}`);
  }
  if (recap.provisional) parts.push("Bonus is provisional until FPL confirms it.");
  return parts.join("\n\n");
}

/** The pick that carried the armband: the multiplied one, else the named captain. */
function effectiveCaptain(picks: TeamDetails | undefined): { element: number } | null {
  if (!picks) return null;
  return picks.picks.find((p) => p.multiplier >= 2) ?? picks.picks.find((p) => p.is_captain) ?? null;
}

export function recapInputFromSnapshot(
  snapshot: LeagueSnapshot,
  picksByEntry: Map<number, TeamDetails>,
  livePoints: LivePointsMap,
  playersMap: Map<number, BootstrapPlayer>,
  transfers: ManagerTransfers[],
  matchups: H2HMatchup[],
  provisional: boolean
): RecapInput {
  const managers: RecapManager[] = snapshot.managers.map((m) => {
    const picks = picksByEntry.get(m.entry);
    const captain = effectiveCaptain(picks);
    const captainPlayer = captain ? playersMap.get(captain.element) : undefined;
    const benchPoints = (picks?.picks ?? [])
      .filter((p) => p.multiplier === 0)
      .reduce((sum, p) => sum + (livePoints.get(p.element) ?? 0), 0);

    return {
      entry: m.entry,
      entryName: m.entry_name,
      playerName: m.player_name,
      rank: m.rank,
      lastRank: m.last_rank,
      netPoints: m.net_points,
      totalPoints: m.total_points,
      transferCost: m.transfer_cost,
      captainName: captainPlayer?.web_name ?? m.captain?.web_name ?? null,
      captainPoints: captain ? livePoints.get(captain.element) ?? 0 : null,
      activeChip: m.active_chip,
      benchPoints,
    };
  });

  return {
    gw: snapshot.selectedGameweek,
    leagueName: snapshot.leagueName,
    managers,
    transfers,
    matchups,
    provisional,
  };
}

/** The recap for `gw` (default: the current gameweek), from cached data. */
export async function getRecap(gw?: number): Promise<Recap> {
  const snapshot = await getLeagueSnapshot(gw);
  const selected = snapshot.selectedGameweek;
  const entries = snapshot.managers.map((m) => m.entry);
  const h2hLeagueId = process.env.FPL_H2H_LEAGUE_ID;

  const [bootstrap, live, picks, feed, matches] = await Promise.all([
    cachedKind("bootstrap", "bootstrap", () => client.bootstrap()),
    cachedKind("live", `live:${selected}`, () => client.live(selected)),
    fetchPicks(entries, selected),
    getTransferFeed(selected),
    h2hLeagueId
      ? cachedKind("h2h", `h2h-matches:${h2hLeagueId}:${selected}`, () => client.h2hMatches(h2hLeagueId, selected)).catch(
          (error) => {
            console.error("Failed to fetch H2H matches for recap:", error);
            return [];
          }
        )
      : Promise.resolve([]),
  ]);

  const event = bootstrap.events.find((e) => e.id === selected);
  const provisional = !(event?.data_checked ?? false);

  const input = recapInputFromSnapshot(
    snapshot,
    picks,
    buildLivePointsMap(live),
    new Map(bootstrap.elements.map((p) => [p.id, p])),
    groupTransfersByManager(feed.rows),
    buildH2HMatchups(matches, snapshot.managers),
    provisional
  );
  return buildRecap(input);
}
