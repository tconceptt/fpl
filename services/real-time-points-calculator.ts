import { fplApiRoutes } from "@/lib/routes";
import { getPlayerName } from "./get-player-name";

interface Fixture {
  id: number;
  kickoff_time: string;
  started: boolean;
  finished: boolean;
  team_h: number;
  team_a: number;
  stats: FixtureStat[];
}

interface FixtureStat {
  identifier: string;
  a: { value: number; element: number }[];
  h: { value: number; element: number }[];
}

interface Player {
  id: number;
  element_type: number; // Position ID
  team: number;
}

interface BootstrapData {
  elements: Player[];
}

interface LivePlayerStats {
  minutes: number;
  clean_sheets: number;
  goals_conceded: number;
  saves: number;
}

interface LivePlayer {
  id: number;
  stats: LivePlayerStats;
}

interface LiveGameweekData {
  elements: LivePlayer[];
}

export async function getFixtures(gameweekId: string): Promise<Fixture[]> {
  const response = await fetch(fplApiRoutes.fixtures(gameweekId), {
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch fixtures: ${response.status}`);
  }

  return response.json();
}

async function getLiveGameweekData(gameweekId: string): Promise<LiveGameweekData> {
  const response = await fetch(fplApiRoutes.liveStandings(gameweekId));
  if (!response.ok) {
    throw new Error("Failed to fetch live gameweek data");
  }
  return response.json();
}

async function getBootstrapPlayers(): Promise<Map<number, Player>> {
  const response = await fetch(fplApiRoutes.bootstrap);
  if (!response.ok) {
    throw new Error("Failed to fetch bootstrap data");
  }
  const data: BootstrapData = await response.json();
  return new Map(data.elements.map((player) => [player.id, player]));
}

export async function calculateRealTimePoints(teamId: string, gameweekId: string) {
  const [fixtures, bootstrapPlayers, liveData] = await Promise.all([
    getFixtures(gameweekId),
    getBootstrapPlayers(),
    getLiveGameweekData(gameweekId),
  ]);

  const playerPoints = new Map<number, number>();

  const livePlayerStatsMap = new Map(liveData.elements.map(p => [p.id, p.stats]));
  
  const teamToPlayersMap = new Map<number, number[]>();
    for (const player of bootstrapPlayers.values()) {
        if (!teamToPlayersMap.has(player.team)) {
            teamToPlayersMap.set(player.team, []);
        }
        teamToPlayersMap.get(player.team)!.push(player.id);
    }

  // Process live data for minutes, clean sheets, and goals conceded
  for (const player of liveData.elements) {
    let points = 0;
    const position = bootstrapPlayers.get(player.id)?.element_type;

    // Minutes played
    if (player.stats.minutes > 0 && player.stats.minutes < 60) {
      points += 1;
    } else if (player.stats.minutes >= 60) {
      points += 2;
    }

    // Clean sheets (must play 60+ minutes)
    if (player.stats.clean_sheets === 1 && player.stats.minutes >= 60) {
      if (position === 1 || position === 2) { // Goalkeeper or Defender
        points += 4;
      } else if (position === 3) { // Midfielder
        points += 1;
      }
    }

    // Goals conceded (only for Goalkeepers and Defenders)
    if (position === 1 || position === 2) {
      points -= Math.floor(player.stats.goals_conceded / 2);
    }
    
    // Saves (only for Goalkeepers)
    if (position === 1) {
      points += Math.floor(player.stats.saves / 3);
    }

    playerPoints.set(player.id, (playerPoints.get(player.id) || 0) + points);
  }

  for (const fixture of fixtures) {
    if (!fixture.started) continue;

    const homePlayerIds = teamToPlayersMap.get(fixture.team_h) || [];
    const awayPlayerIds = teamToPlayersMap.get(fixture.team_a) || [];
    const fixturePlayerIds = [...homePlayerIds, ...awayPlayerIds];

    let maxMinutes = 0;
    for (const playerId of fixturePlayerIds) {
        const stats = livePlayerStatsMap.get(playerId);
        if (stats && stats.minutes > maxMinutes) {
            maxMinutes = stats.minutes;
        }
    }

    for (const stat of fixture.stats) {
      switch (stat.identifier) {
        case "goals_scored":
          for (const player of [...stat.a, ...stat.h]) {
            const position = bootstrapPlayers.get(player.element)?.element_type;
            let points = 0;
            if (position === 1) points = 6; // Goalkeeper
            else if (position === 2) points = 6; // Defender
            else if (position === 3) points = 5; // Midfielder
            else if (position === 4) points = 4; // Forward
            playerPoints.set(
              player.element,
              (playerPoints.get(player.element) || 0) + points * player.value
            );
          }
          break;
        case "assists":
          for (const player of [...stat.a, ...stat.h]) {
            playerPoints.set(
              player.element,
              (playerPoints.get(player.element) || 0) + 3 * player.value
            );
          }
          break;
        case "yellow_cards":
          for (const player of [...stat.a, ...stat.h]) {
            playerPoints.set(
              player.element,
              (playerPoints.get(player.element) || 0) - 1 * player.value
            );
          }
          break;
        case "red_cards":
          for (const player of [...stat.a, ...stat.h]) {
            playerPoints.set(
              player.element,
              (playerPoints.get(player.element) || 0) - 3 * player.value
            );
          }
          break;
        case "penalties_saved":
          for (const player of [...stat.a, ...stat.h]) {
            playerPoints.set(
              player.element,
              (playerPoints.get(player.element) || 0) + 5 * player.value
            );
          }
          break;
        case "penalties_missed":
          for (const player of [...stat.a, ...stat.h]) {
            playerPoints.set(
              player.element,
              (playerPoints.get(player.element) || 0) - 2 * player.value
            );
          }
          break;
        case "own_goals":
          for (const player of [...stat.a, ...stat.h]) {
            playerPoints.set(
              player.element,
              (playerPoints.get(player.element) || 0) - 2 * player.value
            );
          }
          break;
        case "defensive_contribution":
            for (const player of [...stat.a, ...stat.h]) {
                const position = bootstrapPlayers.get(player.element)?.element_type;
                let points = 0;
                if (position === 2 && player.value > 10) { // Defender
                    points = 2;
                } else if (position === 3 && player.value > 12) { // Midfielder
                    points = 2;
                }
                playerPoints.set(
                    player.element,
                    (playerPoints.get(player.element) || 0) + points
                );
            }
            break;
        case "bps":
            {
                if (maxMinutes < 60) break;
                
                const allPlayers = [...stat.a, ...stat.h].filter(p => p.value > 0);
                if (allPlayers.length === 0) break;

                const sortedPlayers = allPlayers.sort((a, b) => b.value - a.value);
                const uniqueScores = [...new Set(sortedPlayers.map(p => p.value))];

                const ranks = uniqueScores.slice(0, 3).map(score =>
                    sortedPlayers.filter(p => p.value === score)
                );

                const rank1Players = ranks[0] || [];
                const rank2Players = ranks[1] || [];
                const rank3Players = ranks[2] || [];

                if (rank1Players.length === 0) break;

                if (rank1Players.length > 1) {
                    // Tie for 1st place
                    rank1Players.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 3));
                    rank2Players.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 1));
                } else {
                    // Clear 1st place
                    rank1Players.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 3));

                    if (rank2Players.length > 1) {
                        // Tie for 2nd place
                        rank2Players.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 2));
                    } else {
                        // Clear 2nd place
                        rank2Players.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 2));
                        // 3rd place (tie or not)
                        rank3Players.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 1));
                    }
                }
            }
            break;
      }
    }
  }

  // Now, fetch the manager's team and calculate the total points
  const teamDetailsResponse = await fetch(
    fplApiRoutes.teamDetails(teamId, gameweekId)
  );
  if (!teamDetailsResponse.ok) {
    throw new Error("Failed to fetch team details");
  }
  const teamDetails = await teamDetailsResponse.json();

  let totalPoints = 0;
  for (const pick of teamDetails.picks) {
    if (pick.position <= 11) { // Only count starters
      totalPoints += (playerPoints.get(pick.element) || 0) * pick.multiplier;
    }
  }

  return { totalPoints, playerPoints };
}
