/**
 * The one FPL client (Phase 2.1). Every upstream call to the FPL API goes
 * through here — pages and services never call `fetch` directly.
 *
 * - Browser-shaped headers (the raw FPL API 403s without them from some
 *   networks).
 * - 3 attempts with 500ms/1000ms/2000ms backoff. A 404 never retries — it
 *   throws `FplNotFoundError` immediately, since retrying a "this league
 *   doesn't exist" response wastes the whole backoff window for nothing.
 * - A 10 second AbortController timeout per attempt.
 * - A small semaphore caps in-flight upstream requests at 8, so fanning out
 *   to 14 managers at once doesn't burst past what FPL tolerates.
 * - Every successful upstream round trip increments the per-request counter
 *   in lib/fpl/telemetry.ts.
 */

import { fplApiRoutes } from "@/lib/routes";
import { countUpstream } from "@/lib/fpl/telemetry";
import type {
  EntryDetails,
  EntryTransfer,
  EventStatusResponse,
  EventStatusRow,
  Fixture,
  H2HMatch,
  H2HStandings,
  LeagueStandings,
  LiveGameweekData,
  SlimBootstrap,
  TeamDetails,
  TeamHistory,
} from "@/lib/fpl/types";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  Origin: "https://fantasy.premierleague.com",
  Referer: "https://fantasy.premierleague.com/",
};

const RETRY_BACKOFF_MS = [500, 1000, 2000];
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_CONCURRENT_REQUESTS = 8;

export class FplNotFoundError extends Error {
  constructor(url: string) {
    super(`FPL API 404: ${url}`);
    this.name = "FplNotFoundError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- A small semaphore capping in-flight upstream requests. ---

let activeRequests = 0;
const waiters: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  activeRequests++;
}

function releaseSlot(): void {
  activeRequests--;
  const next = waiters.shift();
  if (next) next();
}

/** Fetch and parse one JSON endpoint, with retries, timeout and the semaphore. */
async function fetchJson<T>(url: string): Promise<T> {
  await acquireSlot();
  try {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          cache: "no-store",
          headers: BROWSER_HEADERS,
          signal: controller.signal,
        });

        countUpstream();

        if (response.status === 404) {
          throw new FplNotFoundError(url);
        }
        if (!response.ok) {
          throw new Error(`FPL API ${response.status} for ${url}`);
        }

        return (await response.json()) as T;
      } catch (err) {
        if (err instanceof FplNotFoundError) throw err;
        lastError = err;
        if (attempt < RETRY_BACKOFF_MS.length - 1) {
          await sleep(RETRY_BACKOFF_MS[attempt]);
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
  } finally {
    releaseSlot();
  }
}

// --- Bootstrap slimming (2.1: ~150KB instead of ~1.6MB) ---

interface RawBootstrapEvent {
  id: number;
  name: string;
  deadline_time: string;
  is_previous: boolean;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
  data_checked: boolean;
  average_entry_score: number;
  highest_score: number | null;
}

interface RawBootstrapTeam {
  id: number;
  name: string;
  short_name: string;
  code: number;
}

interface RawBootstrapChip {
  name: string;
  start_event: number;
  stop_event: number;
  number: number;
}

interface RawBootstrapElement {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: number;
  code: number;
  now_cost: number;
  selected_by_percent: string;
  status: string;
  news: string;
}

interface RawBootstrap {
  events: RawBootstrapEvent[];
  teams: RawBootstrapTeam[];
  chips: RawBootstrapChip[];
  game_settings?: { cup_start_event_id: number | null };
  elements: RawBootstrapElement[];
}

function slimBootstrap(raw: RawBootstrap): SlimBootstrap {
  return {
    events: raw.events.map((e) => ({
      id: e.id,
      name: e.name,
      deadline_time: e.deadline_time,
      is_previous: e.is_previous,
      is_current: e.is_current,
      is_next: e.is_next,
      finished: e.finished,
      data_checked: e.data_checked,
      average_entry_score: e.average_entry_score,
      highest_score: e.highest_score,
    })),
    teams: raw.teams.map((t) => ({
      id: t.id,
      name: t.name,
      short_name: t.short_name,
      code: t.code,
    })),
    chips: raw.chips.map((c) => ({
      name: c.name,
      start_event: c.start_event,
      stop_event: c.stop_event,
      number: c.number,
    })),
    game_settings: { cup_start_event_id: raw.game_settings?.cup_start_event_id ?? null },
    elements: raw.elements.map((el) => ({
      id: el.id,
      web_name: el.web_name,
      first_name: el.first_name,
      second_name: el.second_name,
      team: el.team,
      element_type: el.element_type,
      code: el.code,
      now_cost: el.now_cost,
      selected_by_percent: el.selected_by_percent,
      status: el.status,
      news: el.news,
    })),
  };
}

// --- Live payload slimming (Phase 2.4: ~444KB raw, stored/read from Redis
// whole, down to the handful of fields the app actually reads). ---

interface RawLiveStats {
  minutes: number;
  total_points: number;
  bonus: number;
  bps: number;
  // influence/creativity/threat/ict_index/expected_*/in_dreamteam/played/etc
  // — never read, so never kept.
  [key: string]: unknown;
}

interface RawLiveExplainStat {
  identifier: string;
  points: number;
  value: number;
  points_modification?: number;
}

interface RawLiveExplainFixture {
  fixture: number;
  stats: RawLiveExplainStat[];
}

interface RawLivePlayer {
  id: number;
  stats: RawLiveStats;
  explain: RawLiveExplainFixture[];
  // `modified` (and anything else FPL adds) is dropped.
  [key: string]: unknown;
}

interface RawLiveGameweekData {
  elements: RawLivePlayer[];
}

/** Keep only what services/fpl-live.ts and services/team-page-service.ts read. */
export function slimLive(raw: RawLiveGameweekData): LiveGameweekData {
  return {
    elements: raw.elements.map((el) => ({
      id: el.id,
      stats: {
        minutes: el.stats.minutes,
        total_points: el.stats.total_points,
        bonus: el.stats.bonus,
        bps: el.stats.bps,
      },
      explain: (el.explain ?? []).map((fixture) => ({
        fixture: fixture.fixture,
        stats: (fixture.stats ?? []).map((stat) => ({
          identifier: stat.identifier,
          points: stat.points,
          value: stat.value,
          points_modification: stat.points_modification,
        })),
      })),
    })),
  };
}

// Warn once per process rather than on every request.
const warnedMissingH2HLeagues = new Set<string>();

function warnMissingH2HLeague(leagueId: string): void {
  if (warnedMissingH2HLeagues.has(leagueId)) return;
  warnedMissingH2HLeagues.add(leagueId);
  console.warn(
    `H2H league ${leagueId} does not exist (404). H2H leagues are recreated each ` +
      `season, so this is likely a stale id — update FPL_H2H_LEAGUE_ID or unset it. ` +
      `H2H ranks will be omitted.`
  );
}

export async function bootstrap(): Promise<SlimBootstrap> {
  const raw = await fetchJson<RawBootstrap>(fplApiRoutes.bootstrap);
  return slimBootstrap(raw);
}

export async function fixtures(gw: number): Promise<Fixture[]> {
  return fetchJson<Fixture[]>(fplApiRoutes.fixtures(String(gw)));
}

export async function live(gw: number): Promise<LiveGameweekData> {
  const raw = await fetchJson<RawLiveGameweekData>(fplApiRoutes.liveStandings(String(gw)));
  return slimLive(raw);
}

export async function picks(entry: number, gw: number): Promise<TeamDetails> {
  return fetchJson<TeamDetails>(fplApiRoutes.teamDetails(String(entry), String(gw)));
}

export async function history(entry: number): Promise<TeamHistory> {
  return fetchJson<TeamHistory>(fplApiRoutes.teamHistory(String(entry)));
}

export async function entryTransfers(entry: number): Promise<EntryTransfer[]> {
  return fetchJson<EntryTransfer[]>(fplApiRoutes.teamTransfers(String(entry)));
}

export async function entry(entryId: number): Promise<EntryDetails> {
  return fetchJson<EntryDetails>(fplApiRoutes.entry(String(entryId)));
}

export async function classicStandings(leagueId: string): Promise<LeagueStandings> {
  return fetchJson<LeagueStandings>(fplApiRoutes.standings(leagueId));
}

/**
 * H2H standings, or null when there is no H2H league to read.
 *
 * A missing or expired league is a normal state — H2H leagues do not carry
 * over between seasons — so this resolves to null rather than throwing.
 */
export async function h2hStandings(leagueId: string): Promise<H2HStandings | null> {
  try {
    return await fetchJson<H2HStandings>(fplApiRoutes.h2hStandings(leagueId));
  } catch (err) {
    if (err instanceof FplNotFoundError) {
      warnMissingH2HLeague(leagueId);
      return null;
    }
    throw err;
  }
}

export async function h2hMatches(leagueId: string, gw: number): Promise<H2HMatch[]> {
  const response = await fetchJson<{ results: H2HMatch[] }>(
    fplApiRoutes.h2hMatches(leagueId, String(gw))
  );
  return response.results ?? [];
}

export async function eventStatus(): Promise<EventStatusRow[]> {
  const response = await fetchJson<EventStatusResponse>(fplApiRoutes.eventStatus);
  return response.status ?? [];
}
