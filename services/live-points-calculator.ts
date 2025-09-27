import { fplApiRoutes } from "@/lib/routes";
import { calculateRealTimePoints } from "./real-time-points-calculator";

interface TeamPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface AutomaticSub {
  entry: number;
  element_in: number;
  element_out: number;
  event: number;
}

interface TeamDetails {
  active_chip: string | null;
  automatic_subs: AutomaticSub[];
  entry_history: {
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: TeamPick[];
}

interface ExplainStats {
  identifier: string;
  points: number;
  value: number;
}

interface LiveStandingsElement {
  id: number;
  stats: {
    total_points: number;
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    goals_conceded: number;
    own_goals: number;
    penalties_saved: number;
    penalties_missed: number;
    yellow_cards: number;
    red_cards: number;
    saves: number;
    bonus: number;
    bps: number;
  };
  explain: ExplainStats[];
}

interface LiveStandings {
  elements: LiveStandingsElement[];
}

export async function calculateLivePoints(teamId: string, gameweekId: string): Promise<{
  totalPoints: number;
  starters: Array<{ position: number; points: number }>;
  bench: Array<{ position: number; points: number }>;
  captain?: { position: number; points: number };
  viceCaptain?: { position: number; points: number };
  transferCost: number;
}> {
  try {
    const { totalPoints, playerPoints } = await calculateRealTimePoints(teamId, gameweekId);

    // We still need team details for captaincy and bench
    const teamDetailsResponse = await fetch(fplApiRoutes.teamDetails(teamId, gameweekId), {
      next: { revalidate: 30 },
    });
    if (!teamDetailsResponse.ok) {
      throw new Error(`Failed to fetch team details: ${teamDetailsResponse.status}`);
    }
    const teamDetails: TeamDetails = await teamDetailsResponse.json();

    const starters: Array<{ position: number; points: number }> = [];
    const bench: Array<{ position: number; points: number }> = [];
    let captain: { position: number; points: number } | undefined;
    let viceCaptain: { position: number; points: number } | undefined;

    teamDetails.picks.forEach(pick => {
      const points = (playerPoints.get(pick.element) || 0) * pick.multiplier;
      const playerInfo = { position: pick.position, points };

      if (pick.is_captain) {
        captain = playerInfo;
      }
      if (pick.is_vice_captain) {
        viceCaptain = playerInfo;
      }

      if (pick.position <= 11) {
        starters.push(playerInfo);
      } else if (pick.position <= 15) {
        bench.push(playerInfo);
      }
    });

    return {
      totalPoints,
      starters,
      bench,
      captain,
      viceCaptain,
      transferCost: teamDetails.entry_history.event_transfers_cost,
    };
  } catch (error) {
    console.error("Error calculating live points:", error);
    return {
      totalPoints: 0,
      starters: [],
      bench: [],
      transferCost: 0,
    };
  }
}
