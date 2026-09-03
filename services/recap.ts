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

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

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
      lines.push(`💩 ${who(strugglers[0])} propped it up with ${pts(min)}`);
    } else {
      lines.push(`💩 Bottom of the week: ${strugglers.map(who).join(", ")} on ${pts(min)}`);
    }
  }
  return { title: "The week", lines };
}

function tableMovement(managers: RecapManager[]): RecapSection {
  const lines: string[] = [];
  const moved = managers.filter((m) => m.lastRank !== m.rank);

  if (moved.length === 0) {
    lines.push("No movement in the table");
  } else {
    const risers = moved.filter((m) => m.rank < m.lastRank).sort((a, b) => b.lastRank - b.rank - (a.lastRank - a.rank) || byName(a, b));
    const fallers = moved.filter((m) => m.rank > m.lastRank).sort((a, b) => b.rank - b.lastRank - (a.rank - a.lastRank) || byName(a, b));
    if (risers.length > 0) {
      const r = risers[0];
      lines.push(`📈 Biggest riser: ${who(r)}, up ${r.lastRank - r.rank} to #${r.rank}`);
    }
    if (fallers.length > 0) {
      const f = fallers[0];
      lines.push(`📉 Biggest faller: ${who(f)}, down ${f.rank - f.lastRank} to #${f.rank}`);
    }
  }

  const leader = managers.find((m) => m.rank === 1);
  if (leader) {
    lines.push(
      leader.lastRank === 1
        ? `👑 ${who(leader)} stays top on ${leader.totalPoints}`
        : `👑 New leader: ${who(leader)} on ${leader.totalPoints} (was #${leader.lastRank})`
    );
  }
  return { title: "Table", lines };
}

function captaincy(managers: RecapManager[]): RecapSection {
  const withCaptain = managers.filter((m) => m.captainName !== null && m.captainPoints !== null);
  if (withCaptain.length === 0) return { title: "Captaincy", lines: ["No captain data"] };

  const counts = new Map<string, { name: string; count: number; points: number }>();
  for (const m of withCaptain) {
    const entry = counts.get(m.captainName!) ?? { name: m.captainName!, count: 0, points: m.captainPoints! };
    entry.count += 1;
    counts.set(m.captainName!, entry);
  }
  const captains = [...counts.values()];
  const most = [...captains].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];
  const best = [...captains].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))[0];
  const worst = [...captains].sort((a, b) => a.points - b.points || a.name.localeCompare(b.name))[0];

  const namesFor = (captain: string) =>
    withCaptain
      .filter((m) => m.captainName === captain)
      .sort(byName)
      .map((m) => m.playerName)
      .join(", ");

  const lines = [`⭐ Most captained: ${most.name}, ${most.count} manager${most.count === 1 ? "" : "s"}`];
  if (captains.length === 1) {
    lines.push(`Everyone went the same way: ${most.name} returned ${pts(most.points)}`);
  } else {
    lines.push(`✅ Best call: ${best.name}, ${pts(best.points)} (${namesFor(best.name)})`);
    lines.push(`❌ Worst call: ${worst.name}, ${pts(worst.points)} (${namesFor(worst.name)})`);
  }
  return { title: "Captaincy", lines };
}

function benchWaste(managers: RecapManager[]): RecapSection {
  const top = managers
    .filter((m) => m.benchPoints > 0)
    .sort((a, b) => b.benchPoints - a.benchPoints || byName(a, b))
    .slice(0, 3);
  if (top.length === 0) return { title: "Bench", lines: ["Nobody left points on the bench"] };
  return {
    title: "Bench",
    lines: top.map((m) => `🪑 ${m.playerName} left ${pts(m.benchPoints)} on the bench`),
  };
}

function hits(transfers: ManagerTransfers[]): RecapSection {
  const withHits = transfers.filter((t) => t.hitCost > 0).sort((a, b) => b.net - b.hitCost - (a.net - a.hitCost) || a.managerName.localeCompare(b.managerName));
  if (withHits.length === 0) return { title: "Hits", lines: ["No hits taken"] };
  return {
    title: "Hits",
    lines: withHits.map((t) => {
      const after = t.net - t.hitCost;
      const verdict = after > 0 ? "paid off" : after === 0 ? "broke even" : "didn't pay off";
      return `${after > 0 ? "💸" : "🔥"} ${t.managerName} took a -${t.hitCost} for ${signed(t.net)} in points: ${verdict} (${signed(after)})`;
    }),
  };
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

function headToHead(matchups: H2HMatchup[]): RecapSection | null {
  if (matchups.length === 0) return null;
  return {
    title: "Head to head",
    lines: matchups.map((m) => {
      const line = `${m.home.entryName} ${m.home.points} – ${m.away.points} ${m.away.entryName}`;
      return m.state === "level" ? `${line} (draw)` : line;
    }),
  };
}

function standings(managers: RecapManager[]): RecapSection {
  const ordered = [...managers].sort((a, b) => a.rank - b.rank);
  const lines = ordered.slice(0, 3).map((m) => `${m.rank}. ${who(m)} — ${m.totalPoints}`);
  if (ordered.length > 4) lines.push("…");
  if (ordered.length > 3) {
    const last = ordered[ordered.length - 1];
    lines.push(`${last.rank}. ${who(last)} — ${last.totalPoints}`);
  }
  return { title: "Standings", lines };
}

export function buildRecap(input: RecapInput): Recap {
  const sections: RecapSection[] = [];
  if (input.managers.length === 0) {
    return { gw: input.gw, leagueName: input.leagueName, provisional: input.provisional, sections: [{ title: "The week", lines: ["No scores yet"] }] };
  }

  sections.push(winnerAndStruggler(input.managers));
  sections.push(tableMovement(input.managers));
  sections.push(captaincy(input.managers));
  sections.push(benchWaste(input.managers));
  sections.push(hits(input.transfers));
  sections.push(chipsPlayed(input.managers));
  const h2h = headToHead(input.matchups);
  if (h2h) sections.push(h2h);
  sections.push(standings(input.managers));

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
