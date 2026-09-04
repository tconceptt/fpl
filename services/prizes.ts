/**
 * The league's computed prizes, for the bot's `/prizes` command.
 *
 * Two prizes are derived from FPL data:
 *
 *  - **Manager of the Month.** The manager with the most gameweek wins in a
 *    Gregorian calendar month, ties broken by the most net points scored
 *    across that month's gameweeks. A gameweek belongs to the month its
 *    deadline falls in (East Africa Time), so a gameweek that starts on
 *    30 September and ends on 2 October is a September gameweek. A gameweek
 *    win is the highest net score (after transfer hits); when managers tie
 *    for the top score, every one of them is credited with the win here,
 *    unlike the stats page which resolves the tie in the next gameweek. A
 *    month is only awarded once it has ended on the calendar and FPL has
 *    checked every gameweek in it.
 *
 *  - **Chip Master.** One prize for the whole season: the most points earned
 *    from chips. Triple Captain counts the tripled captain score, Bench
 *    Boost counts the bench's points, Free Hit counts the whole team's
 *    points. The wildcard earns nothing. Only managers who have played at
 *    least one counting chip appear. A chip played in a gameweek that has
 *    not finished is included with provisional points and flagged.
 *
 * The computations are pure functions of already-loaded data; `getPrizes`
 * does the loading through the same cached client every other service uses.
 */

import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import { chipLabel, type ChipName } from "@/lib/chips";
import type { BootstrapEvent, LiveGameweekData, TeamDetails, TeamHistory } from "@/lib/fpl/types";
import { EAT_TIME_ZONE } from "@/lib/time";
import { buildLivePointsMap } from "@/services/fpl-live";
import { fetchPicks, getLeagueSnapshot } from "@/services/league";

// ---------------------------------------------------------------------------
// Manager of the Month
// ---------------------------------------------------------------------------

export interface MonthManager {
  entry: number;
  player_name: string;
  entry_name: string;
  history: TeamHistory["current"];
}

export interface MonthStanding {
  entry: number;
  player_name: string;
  entry_name: string;
  wins: number;
  /** Net points across the month's gameweeks. */
  points: number;
  /** The gameweeks this manager won (or shared) in the month. */
  wonGameweeks: number[];
}

export interface ManagerOfTheMonth {
  /** "2026-08" — sorts chronologically. */
  key: string;
  /** "August 2026" */
  label: string;
  gameweeks: number[];
  /** Ranked by wins, then month points. */
  standings: MonthStanding[];
  /** Everyone on top after both criteria; more than one only on a dead heat. */
  winners: MonthStanding[];
}

interface MonthKey {
  key: string;
  label: string;
}

/** The EAT calendar month a moment falls in. */
export function monthOf(date: Date): MonthKey {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: EAT_TIME_ZONE, year: "numeric", month: "long" });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const monthNumber = new Date(`${parts.month} 1, 2000`).getMonth() + 1;
  return { key: `${parts.year}-${String(monthNumber).padStart(2, "0")}`, label: `${parts.month} ${parts.year}` };
}

function netPoints(history: TeamHistory["current"], gw: number): number | null {
  const row = history.find((g) => g.event === gw);
  if (!row) return null;
  return row.points - (row.event_transfers_cost || 0);
}

/**
 * Managers of the month for every month that has ended, earliest first.
 * A month has ended when the EAT calendar has moved past it and every
 * gameweek whose deadline fell in it is `data_checked`.
 */
export function computeManagersOfTheMonth(
  managers: MonthManager[],
  events: BootstrapEvent[],
  now: Date = new Date()
): ManagerOfTheMonth[] {
  const currentMonth = monthOf(now).key;
  const months = new Map<string, { label: string; events: BootstrapEvent[] }>();
  for (const event of events) {
    const month = monthOf(new Date(event.deadline_time));
    const bucket = months.get(month.key) ?? { label: month.label, events: [] };
    bucket.events.push(event);
    months.set(month.key, bucket);
  }

  const results: ManagerOfTheMonth[] = [];
  for (const [key, { label, events: monthEvents }] of [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (key >= currentMonth) continue;
    if (!monthEvents.every((e) => e.data_checked)) continue;

    const gameweeks = monthEvents.map((e) => e.id).sort((a, b) => a - b);
    const standings = new Map<number, MonthStanding>(
      managers.map((m) => [
        m.entry,
        { entry: m.entry, player_name: m.player_name, entry_name: m.entry_name, wins: 0, points: 0, wonGameweeks: [] },
      ])
    );

    for (const gw of gameweeks) {
      let best = -Infinity;
      let winners: number[] = [];
      for (const m of managers) {
        const net = netPoints(m.history, gw);
        if (net === null) continue;
        standings.get(m.entry)!.points += net;
        if (net > best) {
          best = net;
          winners = [m.entry];
        } else if (net === best) {
          winners.push(m.entry);
        }
      }
      for (const entry of winners) {
        const row = standings.get(entry)!;
        row.wins += 1;
        row.wonGameweeks.push(gw);
      }
    }

    const ranked = [...standings.values()].sort(
      (a, b) => b.wins - a.wins || b.points - a.points || a.player_name.localeCompare(b.player_name)
    );
    if (ranked.length === 0) continue;
    const top = ranked[0];
    const winners = ranked.filter((r) => r.wins === top.wins && r.points === top.points);
    results.push({ key, label, gameweeks, standings: ranked, winners });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Chip Master
// ---------------------------------------------------------------------------

export type CountingChip = Exclude<ChipName, "wildcard">;

export interface ChipPlayInput {
  entry: number;
  player_name: string;
  entry_name: string;
  chip: CountingChip;
  gameweek: number;
  picks: TeamDetails;
  live: LiveGameweekData;
  /** False while the gameweek's fixtures are still being played. */
  finished: boolean;
  /** elementId -> web_name, for the triple captain line. */
  playerNames: Map<number, string>;
}

export interface ChipPlay {
  chip: CountingChip;
  label: string;
  gameweek: number;
  points: number;
  /** "Haaland 13 × 3" for triple captain, else "bench" or "team". */
  detail: string;
  provisional: boolean;
}

export interface ChipMasterRow {
  entry: number;
  player_name: string;
  entry_name: string;
  total: number;
  plays: ChipPlay[];
  /** True when any play is from an unfinished gameweek. */
  provisional: boolean;
}

export function isCountingChip(name: string): name is CountingChip {
  return name === "3xc" || name === "bboost" || name === "freehit";
}

/** Points one chip play earned, from that gameweek's picks and live scores. */
export function scoreChipPlay(input: ChipPlayInput): ChipPlay {
  const live = buildLivePointsMap(input.live);
  const points = (element: number) => live.get(element) ?? 0;
  const base = { chip: input.chip, label: chipLabel(input.chip), gameweek: input.gameweek, provisional: !input.finished };

  switch (input.chip) {
    case "3xc": {
      // The API has already moved the armband to the vice-captain when the
      // captain did not play, so the pick with the tripled multiplier is the
      // one that scored; fall back to is_captain before kick-off.
      const captain =
        input.picks.picks.find((p) => p.multiplier === 3) ?? input.picks.picks.find((p) => p.is_captain);
      if (!captain) return { ...base, points: 0, detail: "no captain" };
      const raw = points(captain.element);
      const name = input.playerNames.get(captain.element) ?? `#${captain.element}`;
      return { ...base, points: raw * 3, detail: `${name} ${raw} × 3` };
    }
    case "bboost": {
      const bench = input.picks.picks.filter((p) => p.position >= 12).reduce((sum, p) => sum + points(p.element), 0);
      return { ...base, points: bench, detail: "bench" };
    }
    case "freehit": {
      const team = input.picks.picks.reduce((sum, p) => sum + points(p.element) * p.multiplier, 0);
      return { ...base, points: team, detail: "team" };
    }
  }
}

/** The chip master leaderboard: managers with at least one counting chip, most chip points first. */
export function computeChipMaster(plays: ChipPlayInput[]): ChipMasterRow[] {
  const rows = new Map<number, ChipMasterRow>();
  for (const input of plays) {
    const row = rows.get(input.entry) ?? {
      entry: input.entry,
      player_name: input.player_name,
      entry_name: input.entry_name,
      total: 0,
      plays: [],
      provisional: false,
    };
    const play = scoreChipPlay(input);
    row.plays.push(play);
    row.total += play.points;
    row.provisional = row.provisional || play.provisional;
    rows.set(input.entry, row);
  }
  return [...rows.values()]
    .map((row) => ({ ...row, plays: [...row.plays].sort((a, b) => a.gameweek - b.gameweek) }))
    .sort((a, b) => b.total - a.total || a.player_name.localeCompare(b.player_name));
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export interface Prizes {
  currentGameweek: number;
  managersOfTheMonth: ManagerOfTheMonth[];
  chipMaster: ChipMasterRow[];
}

export async function getPrizes(now: Date = new Date()): Promise<Prizes> {
  const [bootstrap, snapshot] = await Promise.all([
    cachedKind("bootstrap", "bootstrap", () => client.bootstrap()),
    getLeagueSnapshot(undefined, { includePicks: false }),
  ]);

  const managersOfTheMonth = computeManagersOfTheMonth(snapshot.managers, bootstrap.events, now);

  // Every counting chip played so far, grouped by gameweek so picks for a
  // gameweek are one batched read and live data is fetched once per gameweek.
  const played = snapshot.managers.flatMap((m) =>
    m.chips
      .filter((c) => isCountingChip(c.name) && c.event <= snapshot.currentGameweek)
      .map((c) => ({ manager: m, chip: c.name as CountingChip, gameweek: c.event }))
  );
  const byGameweek = new Map<number, typeof played>();
  for (const play of played) {
    byGameweek.set(play.gameweek, [...(byGameweek.get(play.gameweek) ?? []), play]);
  }

  const playerNames = new Map(bootstrap.elements.map((el) => [el.id, el.web_name]));
  const eventsById = new Map(bootstrap.events.map((e) => [e.id, e]));

  const inputs = await Promise.all(
    [...byGameweek.entries()].map(async ([gw, plays]) => {
      const [live, picks] = await Promise.all([
        cachedKind("live", `live:${gw}`, () => client.live(gw)),
        fetchPicks(plays.map((p) => p.manager.entry), gw),
      ]);
      const finished = eventsById.get(gw)?.finished ?? false;
      return plays.flatMap((p): ChipPlayInput[] => {
        const teamPicks = picks.get(p.manager.entry);
        if (!teamPicks) return [];
        return [
          {
            entry: p.manager.entry,
            player_name: p.manager.player_name,
            entry_name: p.manager.entry_name,
            chip: p.chip,
            gameweek: gw,
            picks: teamPicks,
            live,
            finished,
            playerNames,
          },
        ];
      });
    })
  );

  return {
    currentGameweek: snapshot.currentGameweek,
    managersOfTheMonth,
    chipMaster: computeChipMaster(inputs.flat()),
  };
}
