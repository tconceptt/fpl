/**
 * Shared FPL API types.
 *
 * Migrated from services/fpl-data-cache.ts as part of Phase 2.1 (one typed
 * client). This is the single source of truth for the shapes returned by
 * lib/fpl/client.ts.
 */

export interface BootstrapPlayer {
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

export interface BootstrapTeam {
  id: number;
  name: string;
  short_name: string;
  code: number;
}

export interface BootstrapEvent {
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

export interface BootstrapChip {
  name: string;
  start_event: number;
  stop_event: number;
  number: number;
}

export interface BootstrapData {
  elements: BootstrapPlayer[];
  teams: BootstrapTeam[];
  events: BootstrapEvent[];
  chips: BootstrapChip[];
  game_settings: { cup_start_event_id: number | null };
}

/** Alias kept for readability at call sites that only ever see the slimmed shape. */
export type SlimBootstrap = BootstrapData;

export interface FixtureStat {
  identifier: string;
  a: { value: number; element: number }[];
  h: { value: number; element: number }[];
}

export interface Fixture {
  id: number;
  kickoff_time: string;
  started: boolean;
  finished: boolean;
  team_h: number;
  team_a: number;
  stats: FixtureStat[];
}

export interface LivePlayerStats {
  minutes: number;
  bonus: number;
  bps: number;
  /** Gameweek points as scored by FPL, with provisional bonus included. */
  total_points: number;
}

export interface LiveExplainStat {
  identifier: string;
  points: number;
  value: number;
  /** Retroactive correction applied by FPL, if any. */
  points_modification?: number;
}

export interface LivePlayer {
  id: number;
  stats: LivePlayerStats;
  /** One entry per fixture the player featured in this gameweek. */
  explain: Array<{ fixture: number; stats: LiveExplainStat[] }>;
}

export interface LiveGameweekData {
  elements: LivePlayer[];
}

export interface TeamPick {
  element: number;
  position: number;
  /** Auto-subs and chips are already applied by the API. */
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface TeamDetails {
  active_chip: string | null;
  automatic_subs: Array<{
    entry: number;
    element_in: number;
    element_out: number;
    event: number;
  }>;
  entry_history: {
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
    points: number;
  };
  picks: TeamPick[];
}

export interface TeamHistory {
  current: Array<{
    event: number;
    points: number;
    total_points: number;
    event_transfers_cost: number;
    event_transfers: number;
    rank: number;
    overall_rank: number;
    points_on_bench: number;
  }>;
  past: Array<{
    season_name: string;
    total_points: number;
    rank: number;
  }>;
  chips: Array<{
    name: string;
    event: number;
    time: string;
  }>;
}

export interface EntryDetails {
  id: number;
  player_first_name: string;
  player_last_name: string;
  name: string;
  summary_overall_points: number;
  summary_overall_rank: number;
}

export interface EntryTransfer {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  entry: number;
  event: number;
  time: string;
}

export interface LeagueStandings {
  league: { name: string };
  standings: {
    results: Array<{
      entry: number;
      entry_name: string;
      player_name: string;
      rank: number;
      last_rank: number;
      /** Gameweek points, gross — transfer hits are not deducted here. */
      event_total: number;
      /** Season total, net of transfer hits. */
      total: number;
    }>;
  };
  /** When FPL last recalculated this league's table. */
  last_updated_data: string | null;
}

/**
 * H2H standings come back with `standings` as either an object with `results`
 * or, occasionally, a bare array.
 *
 * Leagues with an odd number of teams include an "AVERAGE" row — the bye
 * opponent — which has a null `entry`.
 */
export interface H2HStandingsRow {
  entry: number | null;
  entry_name: string;
  player_name?: string;
  rank: number;
  last_rank?: number;
  matches_played?: number;
  matches_won?: number;
  matches_drawn?: number;
  matches_lost?: number;
  /** Sum of gameweek points across every H2H match. */
  points_for?: number;
  /** H2H league points: 3 per win, 1 per draw. */
  total?: number;
}

export interface H2HStandings {
  standings: { results: H2HStandingsRow[] } | H2HStandingsRow[];
}

/**
 * One H2H fixture. There is no `finished` flag on this payload — whether a
 * match is over is the gameweek's own state. `entry_*_points` is FPL's
 * recorded score, which lags live play; `is_bye` marks the odd-league bye
 * against the "AVERAGE" entry (null `entry_2_entry`).
 */
export interface H2HMatch {
  id: number;
  entry_1_entry: number | null;
  entry_1_name: string;
  entry_1_player_name: string;
  entry_1_points: number;
  entry_1_win?: number;
  entry_1_draw?: number;
  entry_1_loss?: number;
  entry_1_total?: number;
  entry_2_entry: number | null;
  entry_2_name: string;
  entry_2_player_name: string;
  entry_2_points: number;
  entry_2_win?: number;
  entry_2_draw?: number;
  entry_2_loss?: number;
  entry_2_total?: number;
  event: number;
  is_bye?: boolean;
  is_knockout?: boolean;
}

export interface EventStatusRow {
  bonus_added: boolean;
  date: string;
  event: number;
  points: string;
}

export interface EventStatusResponse {
  status: EventStatusRow[];
  leagues: string;
}
