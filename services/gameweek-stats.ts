/**
 * Pure computation of the gameweek page's stats cards from the standings
 * shape returned by `/api/league/[gw]` (`toStandings` in services/league.ts).
 * Extracted so both the server-rendered gameweek page and the client-side
 * gameweek switcher can compute the same numbers from the same response,
 * without re-fetching or duplicating the logic.
 */

import { chipLabel } from "@/lib/chips";
import type { GameweekStanding } from "@/types/league";

export interface GameweekLeaderInfo {
  name: string;
  points: number;
  net_points: number;
  team: string;
  chipUsed: string | null;
}

export interface GameweekStrugglerInfo {
  name: string;
  points: number;
  net_points: number;
  team: string;
}

export interface GameweekMovementInfo {
  name: string;
  team: string;
  movement: number;
}

export interface GameweekChipSummary {
  type: string;
  count: number;
  users: string;
}

export interface GameweekMostCaptained {
  player: string;
  count: number;
  percentage: number;
}

export interface GameweekStats {
  currentGameweek: number;
  selectedGameweek: number;
  currentLeader: GameweekLeaderInfo;
  lowestPoints: GameweekStrugglerInfo;
  chipsSummary: GameweekChipSummary[];
  highestRiser: GameweekMovementInfo;
  steepestFaller: GameweekMovementInfo;
  mostCaptained?: GameweekMostCaptained;
}

/** Net points for a standing row, falling back to gross when net is unset. */
function netOrGross(s: GameweekStanding): number {
  return s.net_points !== null ? s.net_points : s.event_total;
}

/**
 * Rank movement from the standing's own `rank`/`last_rank` (identical
 * criterion to the league table: rank by total_points at the selected and
 * previous gameweek). `last_rank` 0 means "no previous data" — no movement.
 */
function movementFor(standing: GameweekStanding): number {
  if (standing.last_rank === 0) return 0;
  return standing.last_rank - standing.rank;
}

export function computeGameweekStats(
  standings: GameweekStanding[],
  currentGameweek: number,
  selectedGameweek: number
): GameweekStats {
  const hasData = standings.length > 0;

  const sortedByNetPoints = [...standings].sort((a, b) => netOrGross(b) - netOrGross(a));
  const currentLeader = hasData ? sortedByNetPoints[0] : null;
  const lowestPoints = hasData ? sortedByNetPoints[sortedByNetPoints.length - 1] : null;

  const teamsWithMovement = standings.map((s) => ({
    name: s.player_name,
    team: s.entry_name,
    movement: movementFor(s),
  }));

  const highestRiser = hasData
    ? [...teamsWithMovement].sort((a, b) => b.movement - a.movement)[0]
    : { name: "-", team: "-", movement: 0 };
  const steepestFaller = hasData
    ? [...teamsWithMovement].sort((a, b) => a.movement - b.movement)[0]
    : { name: "-", team: "-", movement: 0 };

  // Count chips used in the selected gameweek.
  const chipCounts = { wildcard: 0, "3xc": 0, bboost: 0, freehit: 0 };
  const chipUsers = { wildcard: [] as string[], "3xc": [] as string[], bboost: [] as string[], freehit: [] as string[] };

  standings.forEach((s) => {
    const chipType = s.active_chip?.toLowerCase();
    switch (chipType) {
      case "wildcard":
        chipCounts.wildcard++;
        chipUsers.wildcard.push(s.player_name);
        break;
      case "3xc":
        chipCounts["3xc"]++;
        chipUsers["3xc"].push(s.player_name);
        break;
      case "bboost":
        chipCounts.bboost++;
        chipUsers.bboost.push(s.player_name);
        break;
      case "freehit":
        chipCounts.freehit++;
        chipUsers.freehit.push(s.player_name);
        break;
    }
  });

  // Most captained player (by web_name — standings only carry the web name).
  const captainCounts = new Map<string, number>();
  standings.forEach((s) => {
    if (!s.captain_name) return;
    captainCounts.set(s.captain_name, (captainCounts.get(s.captain_name) ?? 0) + 1);
  });

  let mostCaptainedInfo: GameweekMostCaptained | undefined;
  if (captainCounts.size > 0) {
    let mostCaptainedName = "";
    let highestCount = 0;
    captainCounts.forEach((count, name) => {
      if (count > highestCount) {
        highestCount = count;
        mostCaptainedName = name;
      }
    });
    if (mostCaptainedName) {
      mostCaptainedInfo = {
        player: mostCaptainedName,
        count: highestCount,
        percentage: Math.round((highestCount / standings.length) * 100),
      };
    }
  }

  const chipsSummary: GameweekChipSummary[] = [
    { type: chipLabel("wildcard"), count: chipCounts.wildcard, users: chipUsers.wildcard.join(", ") },
    { type: chipLabel("3xc"), count: chipCounts["3xc"], users: chipUsers["3xc"].join(", ") },
    { type: chipLabel("bboost"), count: chipCounts.bboost, users: chipUsers.bboost.join(", ") },
    { type: chipLabel("freehit"), count: chipCounts.freehit, users: chipUsers.freehit.join(", ") },
  ];

  return {
    currentGameweek,
    selectedGameweek,
    currentLeader: currentLeader
      ? {
          name: currentLeader.player_name,
          team: currentLeader.entry_name,
          points: currentLeader.event_total,
          net_points: netOrGross(currentLeader),
          chipUsed: currentLeader.active_chip ?? null,
        }
      : { name: "-", team: "-", points: 0, net_points: 0, chipUsed: null },
    lowestPoints: lowestPoints
      ? {
          name: lowestPoints.player_name,
          team: lowestPoints.entry_name,
          points: lowestPoints.event_total,
          net_points: netOrGross(lowestPoints),
        }
      : { name: "-", team: "-", points: 0, net_points: 0 },
    chipsSummary,
    highestRiser,
    steepestFaller,
    mostCaptained: mostCaptainedInfo,
  };
}
