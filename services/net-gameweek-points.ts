import { fplApiRoutes } from "@/lib/routes";

interface GameweekHistory {
  event: number;
  points: number;
  total_points: number;
  event_transfers_cost: number;
  event_transfers: number;
  rank: number;
  overall_rank: number;
}

interface PastHistory {
  season_name: string;
  total_points: number;
  rank: number;
}

interface TeamHistory {
  current: GameweekHistory[];
  past: PastHistory[];
  chips: {
    name: string;
    event: number;
    time: string;
  }[];
}

export async function getTeamHistory(teamId: string): Promise<TeamHistory> {
  const response = await fetch(fplApiRoutes.teamHistory(teamId), {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch team history: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function calculateNetGameweekPoints(history: TeamHistory, gameweek: number): number | null {
  const gameweekData = history.current.find(gw => gw.event === gameweek);
  
  if (!gameweekData) {
    return null;
  }

  return gameweekData.points - gameweekData.event_transfers_cost;
}

export async function getNetGameweekPoints(teamId: string, gameweek: number): Promise<number | null> {
  try {
    const history = await getTeamHistory(teamId);
    return calculateNetGameweekPoints(history, gameweek);
  } catch (error) {
    console.error(`Error getting net gameweek points for team ${teamId}:`, error);
    return null;
  }
}
