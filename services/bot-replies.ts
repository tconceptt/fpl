/**
 * Pure formatters for the bot's command replies (Phase 5.3). Each takes
 * already-loaded data and returns Telegram HTML; services/bot.ts does the
 * loading. Kept free of fetching so every reply is testable from fixtures.
 */

import { chipDisplayOrder, chipLabel, chipStatus, groupChipWindowsByHalf, type ChipWindow } from "@/lib/chips";
import { escapeHtml } from "@/lib/telegram";
import { formatEatDate, formatRemaining } from "@/lib/time";
import type { H2HPage } from "@/services/h2h";
import type { LeagueSnapshot, ManagerSnapshot } from "@/services/league";
import type { ManagerTransfers } from "@/services/transfers";

const CHIP_ABBR: Record<string, string> = { wildcard: "WC", freehit: "FH", bboost: "BB", "3xc": "TC" };

function e(text: string): string {
  return escapeHtml(text);
}

function arrow(m: { rank: number; last_rank: number }): string {
  if (m.rank < m.last_rank) return "▲";
  if (m.rank > m.last_rank) return "▼";
  return "▬";
}

function liveNote(snapshot: LeagueSnapshot): string {
  if (snapshot.selectedGameweek !== snapshot.currentGameweek) return "";
  if (snapshot.liveState === "live") return "\n<i>Live — scores can still move.</i>";
  if (snapshot.liveState === "quiet") return "\n<i>Provisional until FPL confirms bonus.</i>";
  return "";
}

export function formatTable(snapshot: LeagueSnapshot): string {
  const rows = [...snapshot.managers].sort((a, b) => a.rank - b.rank);
  const lines = rows.map(
    (m) => `${m.rank}. ${arrow(m)} <b>${e(m.entry_name)}</b> · ${e(m.player_name)} · GW ${m.net_points} · ${m.total_points}`
  );
  return `<b>${e(snapshot.leagueName)}</b> — after GW${snapshot.selectedGameweek}\n${lines.join("\n")}${liveNote(snapshot)}`;
}

export function formatGwSummary(snapshot: LeagueSnapshot): string {
  const managers = snapshot.managers;
  if (managers.length === 0) return `No scores yet for GW${snapshot.selectedGameweek}.`;

  const byNet = [...managers].sort((a, b) => b.net_points - a.net_points || a.player_name.localeCompare(b.player_name));
  const leader = byNet[0];
  const struggler = byNet[byNet.length - 1];

  const captainCounts = new Map<string, number>();
  for (const m of managers) {
    if (m.captain) captainCounts.set(m.captain.web_name, (captainCounts.get(m.captain.web_name) ?? 0) + 1);
  }
  const mostCaptained = [...captainCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

  const chips = managers
    .filter((m) => m.active_chip)
    .sort((a, b) => a.player_name.localeCompare(b.player_name))
    .map((m) => `${e(m.player_name)} (${CHIP_ABBR[m.active_chip!] ?? e(m.active_chip!)})`);

  const lines = [
    `<b>Gameweek ${snapshot.selectedGameweek}</b>`,
    `🔥 Leader: <b>${e(leader.entry_name)}</b> (${e(leader.player_name)}) — ${leader.net_points} pts`,
    `💩 Struggler: <b>${e(struggler.entry_name)}</b> (${e(struggler.player_name)}) — ${struggler.net_points} pts`,
    mostCaptained ? `⭐ Most captained: ${e(mostCaptained[0])} (${mostCaptained[1]})` : "⭐ No captain data yet",
    chips.length > 0 ? `🃏 Chips: ${chips.join(", ")}` : "🃏 No chips played",
  ];
  return lines.join("\n") + liveNote(snapshot);
}

export function formatH2H(page: H2HPage): string {
  if (!page.configured) return "No head-to-head league is configured this season.";
  const header = `<b>GW${page.selectedGameweek} head to head</b>${page.live ? " <i>(live)</i>" : ""}`;
  const matchLines =
    page.matchups.length === 0
      ? ["No matchups this gameweek."]
      : page.matchups.map((m) => {
          const home = m.state === "leading" ? `<b>${e(m.home.entryName)}</b>` : e(m.home.entryName);
          const away = m.state === "trailing" ? `<b>${e(m.away.entryName)}</b>` : e(m.away.entryName);
          return `${home} ${m.home.points} – ${m.away.points} ${away}${m.isBye ? " (bye)" : ""}`;
        });
  const top = page.table.slice(0, 3).map((r) => `${r.rank}. ${e(r.entryName)} — ${r.total} pts (${r.won}W ${r.drawn}D ${r.lost}L)`);
  const tableBlock = top.length > 0 ? `\n\n<b>Table</b>\n${top.join("\n")}` : "";
  return `${header}\n${matchLines.join("\n")}${tableBlock}`;
}

export function formatChips(
  managers: Array<Pick<ManagerSnapshot, "player_name" | "entry_name" | "chips">>,
  windows: ChipWindow[],
  currentGameweek: number
): string {
  const half = groupChipWindowsByHalf(windows).find(
    (h) => h.startEvent <= currentGameweek && currentGameweek <= h.stopEvent
  );
  const lines = [...managers]
    .sort((a, b) => a.player_name.localeCompare(b.player_name))
    .map((m) => {
      const available = new Set(
        chipStatus(m.chips, windows, currentGameweek)
          .filter((s) => s.status === "available" && (!half || s.window.stopEvent === half.stopEvent))
          .map((s) => s.window.name)
      );
      const left = chipDisplayOrder.filter((name) => available.has(name)).map((name) => CHIP_ABBR[name]);
      return `${e(m.player_name)}: ${left.length > 0 ? left.join(", ") : "none left"}`;
    });
  return `<b>Chips remaining (${half?.label ?? "this half"})</b>\n${lines.join("\n")}`;
}

export function formatTransfers(groups: ManagerTransfers[], gw: number): string {
  if (groups.length === 0) return `No transfers yet for GW${gw}.`;
  const lines = groups.map((g) => {
    const moves = g.rows
      .map((r) => {
        const gain = r.playerInPoints - r.playerOutPoints;
        return `${e(r.playerOut?.name ?? "?")} → ${e(r.playerIn?.name ?? "?")} (${gain > 0 ? "+" : ""}${gain})`;
      })
      .join(", ");
    const hit = g.hitCost > 0 ? ` <i>-${g.hitCost} hit</i>` : "";
    return `<b>${e(g.managerName)}</b>${hit}: ${moves}`;
  });
  return `<b>GW${gw} transfers</b>\n${lines.join("\n")}`;
}

export function formatDeadline(
  nextEvent: { id: number; deadline_time: string } | undefined,
  now: Date = new Date()
): string {
  if (!nextEvent) return "No upcoming deadline — the season is over.";
  const deadline = new Date(nextEvent.deadline_time);
  const remaining = deadline.getTime() - now.getTime();
  if (remaining <= 0) return `GW${nextEvent.id} deadline has passed (${formatEatDate(deadline)} EAT).`;
  return `⏰ <b>GW${nextEvent.id} deadline</b>: ${formatEatDate(deadline)} EAT — ${formatRemaining(remaining)} left`;
}

export function formatDeadlineReminder(nextEvent: { id: number; deadline_time: string }, now: Date = new Date()): string {
  const deadline = new Date(nextEvent.deadline_time);
  const minutes = Math.max(1, Math.floor((deadline.getTime() - now.getTime()) / 60_000));
  return `⏰ <b>GW${nextEvent.id} deadline in ${minutes} minute${minutes === 1 ? "" : "s"}</b> — ${formatEatDate(deadline)} EAT. Set your team!`;
}

export function helpText(): string {
  return [
    "<b>Commands</b>",
    "/table — the league table",
    "/gw — this gameweek at a glance",
    "/h2h — head-to-head matchups",
    "/chips — chips remaining this half",
    "/transfers — this week's transfers",
    "/recap [gw] — the gameweek recap",
    "/deadline — the next deadline",
    `Chip labels: ${chipDisplayOrder.map((n) => `${CHIP_ABBR[n]} ${chipLabel(n)}`).join(", ")}`,
  ].join("\n");
}
