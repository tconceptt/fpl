import { LucideIcon } from "lucide-react";

export interface LeagueStanding {
  id: number;
  event_total: number;
  player_name: string;
  rank: number;
  last_rank: number;
  total: number;
  entry: number;
  entry_name: string;
  has_played: boolean;
}

export interface GameweekStanding {
  entry: number;
  entry_name: string;
  player_name: string;
  event_total: number;
  total_points: number;
  net_points: number | null;
  rank: number;
  last_rank: number;
  captain_name?: string;
  active_chip?: string | null;
  transfer_cost: number;
  playersToStart: number;
  playersInPlay: number;
  h2h_rank?: number;
}

export interface RankMovement {
  icon: LucideIcon;
  color: string;
  diff: number;
}

export interface LeagueData {
  leagueName: string;
  currentGameweek: number;
  selectedGameweek: number;
  standings: GameweekStanding[];
} 