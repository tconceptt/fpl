export interface FplManager {
  id: number
  player_name: string
  entry_name: string
  total_points: number
  rank: number
  last_rank: number
  event_total: number
}

export interface LeagueStandings {
  has_next: boolean
  page: number
  results: FplManager[]
}

export interface LeagueInfo {
  id: number
  name: string
  created: string
  closed: boolean
}

export interface GameweekLive {
  id: number
  stats: {
    minutes: number
    goals_scored: number
    assists: number
    clean_sheets: number
    goals_conceded: number
    own_goals: number
    penalties_saved: number
    penalties_missed: number
    yellow_cards: number
    red_cards: number
    saves: number
    bonus: number
    bps: number
    influence: string
    creativity: string
    threat: string
    ict_index: string
  }
  explain: Array<{
    fixture: number
    stats: Array<{
      identifier: string
      points: number
      value: number
    }>
  }>
}

export interface ManagerHistory {
  current: Array<{
    event: number
    points: number
    total_points: number
    rank: number
    rank_sort: number
    overall_rank: number
    bank: number
    value: number
    event_transfers: number
    event_transfers_cost: number
    points_on_bench: number
  }>
  past: Array<{
    season_name: string
    total_points: number
    rank: number
  }>
  chips: Array<{
    name: string
    time: string
    event: number
  }>
}

export interface LeagueTeam {
  entry: number
  entry_name: string
  player_name: string
  rank: number
  last_rank: number
  total: number
  event_total: number
}

export interface TeamWithGameweek extends Omit<LeagueTeam, 'entry_name' | 'player_name'> {
  id: number
  name: string
  playerName: string
  gameweek: number
  movement: "up" | "down" | "none"
}

export async function fetchWithCache(url: string, revalidate = 300) {
  const response = await fetch(url, {
    next: { revalidate },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }

  return response.json()
}

export function calculateMovement(currentRank: number, lastRank: number): 'up' | 'down' | 'none' {
  if (lastRank > currentRank) return 'up'
  if (lastRank < currentRank) return 'down'
  return 'none'
}

export function formatPoints(points: number): string {
  return points.toLocaleString()
}

export function getAvatarInitial(name: string): string {
  return name.charAt(0).toUpperCase()
} 