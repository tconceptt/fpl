import { fplApiRoutes } from "@/lib/routes";

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
  const response = await fetch(fplApiRoutes.bootstrap, { cache: 'no-store' });
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
                if (position === 2 && player.value >= 10) { // Defender
                    points = 2;
                } else if (position === 3 && player.value >= 12) { // Midfielder
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
                    // Tie for 1st place: Players 1 & 2 get 3 points, Player 3 gets 1 point
                    rank1Players.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 3));
                    rank2Players.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 1));
                } else {
                    // Clear 1st place: Player 1 gets 3 points
                    rank1Players.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 3));

                    if (rank2Players.length > 1) {
                        // Tie for 2nd place: Player 1 gets 3 points, Players 2 & 3 get 2 points each (no one gets 1 point)
                        rank2Players.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 2));
                        // rank3Players get nothing when there's a tie for 2nd
                    } else if (rank2Players.length === 1) {
                        // Clear 2nd place: Player 2 gets 2 points
                        rank2Players.forEach(p => playerPoints.set(p.element, (playerPoints.get(p.element) || 0) + 2));
                        // 3rd place gets 1 point (tie or not)
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

export async function calculateRealTimePointsBreakdown(teamId: string, gameweekId: string): Promise<Array<{
  id: number;
  position: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  multiplier: number;
  total: number; // applied total (after multiplier)
  metrics: Record<string, number>; // applied metrics
  rawTotal: number; // raw total (before multiplier)
  rawMetrics: Record<string, number>; // raw metrics
  elementType: number; // 1 GK, 2 DEF, 3 MID, 4 FWD
  clubName: string; // mapped for kit
  teamId: number; // canonical FPL team id
}>> {
  const [fixtures, liveData, bootstrapPlayersResp, teamDetailsResp] = await Promise.all([
    getFixtures(gameweekId),
    (async () => {
      const res = await fetch(fplApiRoutes.liveStandings(gameweekId));
      if (!res.ok) throw new Error("Failed to fetch live gameweek data");
      return res.json() as Promise<LiveGameweekData>;
    })(),
    (async () => {
      const res = await fetch(fplApiRoutes.bootstrap, { cache: 'no-store' });
      if (!res.ok) throw new Error("Failed to fetch bootstrap data");
      const data: BootstrapData = await res.json();
      return new Map(data.elements.map((player) => [player.id, player]));
    })(),
    (async () => {
      const res = await fetch(fplApiRoutes.teamDetails(teamId, gameweekId), { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch team details");
      return res.json();
    })(),
  ]);

  const bootstrapPlayers = bootstrapPlayersResp;
  const livePlayerStatsMap = new Map(liveData.elements.map(p => [p.id, p.stats]));

  const teamToPlayersMap = new Map<number, number[]>();
  for (const player of bootstrapPlayers.values()) {
    if (!teamToPlayersMap.has(player.team)) {
      teamToPlayersMap.set(player.team, []);
    }
    teamToPlayersMap.get(player.team)!.push(player.id);
  }

  const metricsMap = new Map<number, Record<string, number>>();

  // Live-based metrics
  for (const player of liveData.elements) {
    const position = bootstrapPlayers.get(player.id)?.element_type;
    const m = metricsMap.get(player.id) || {};

    // Minutes
    if (player.stats.minutes > 0 && player.stats.minutes < 60) {
      m.minutes = (m.minutes || 0) + 1;
    } else if (player.stats.minutes >= 60) {
      m.minutes = (m.minutes || 0) + 2;
    }

    // Clean sheet
    if (player.stats.clean_sheets === 1 && player.stats.minutes >= 60) {
      if (position === 1 || position === 2) {
        m.clean_sheet = (m.clean_sheet || 0) + 4;
      } else if (position === 3) {
        m.clean_sheet = (m.clean_sheet || 0) + 1;
      }
    }

    // Goals conceded
    if (position === 1 || position === 2) {
      const deduction = Math.floor(player.stats.goals_conceded / 2);
      if (deduction > 0) m.goals_conceded = (m.goals_conceded || 0) - deduction;
    }

    // Saves
    if (position === 1) {
      const savePts = Math.floor(player.stats.saves / 3);
      if (savePts) m.saves = (m.saves || 0) + savePts;
    }

    metricsMap.set(player.id, m);
  }

  // Fixture stats (goals, assists, cards, pens, OG, bonus, defensive_contribution)
  for (const fixture of fixtures) {
    if (!fixture.started) continue;

    let maxMinutes = 0;
    const homePlayerIds = teamToPlayersMap.get(fixture.team_h) || [];
    const awayPlayerIds = teamToPlayersMap.get(fixture.team_a) || [];
    const fixturePlayerIds = [...homePlayerIds, ...awayPlayerIds];
    for (const playerId of fixturePlayerIds) {
      const stats = livePlayerStatsMap.get(playerId);
      if (stats && stats.minutes > maxMinutes) maxMinutes = stats.minutes;
    }

    for (const stat of fixture.stats) {
      switch (stat.identifier) {
        case "goals_scored":
          for (const p of [...stat.a, ...stat.h]) {
            const position = bootstrapPlayers.get(p.element)?.element_type;
            let points = 0;
            if (position === 1 || position === 2) points = 6;
            else if (position === 3) points = 5;
            else if (position === 4) points = 4;
            const m = metricsMap.get(p.element) || {};
            m.goals_scored = (m.goals_scored || 0) + points * p.value;
            metricsMap.set(p.element, m);
          }
          break;
        case "assists":
          for (const p of [...stat.a, ...stat.h]) {
            const m = metricsMap.get(p.element) || {};
            m.assists = (m.assists || 0) + 3 * p.value;
            metricsMap.set(p.element, m);
          }
          break;
        case "yellow_cards":
          for (const p of [...stat.a, ...stat.h]) {
            const m = metricsMap.get(p.element) || {};
            m.yellow_cards = (m.yellow_cards || 0) - 1 * p.value;
            metricsMap.set(p.element, m);
          }
          break;
        case "red_cards":
          for (const p of [...stat.a, ...stat.h]) {
            const m = metricsMap.get(p.element) || {};
            m.red_cards = (m.red_cards || 0) - 3 * p.value;
            metricsMap.set(p.element, m);
          }
          break;
        case "penalties_saved":
          for (const p of [...stat.a, ...stat.h]) {
            const m = metricsMap.get(p.element) || {};
            m.penalties_saved = (m.penalties_saved || 0) + 5 * p.value;
            metricsMap.set(p.element, m);
          }
          break;
        case "penalties_missed":
          for (const p of [...stat.a, ...stat.h]) {
            const m = metricsMap.get(p.element) || {};
            m.penalties_missed = (m.penalties_missed || 0) - 2 * p.value;
            metricsMap.set(p.element, m);
          }
          break;
        case "own_goals":
          for (const p of [...stat.a, ...stat.h]) {
            const m = metricsMap.get(p.element) || {};
            m.own_goals = (m.own_goals || 0) - 2 * p.value;
            metricsMap.set(p.element, m);
          }
          break;
        case "defensive_contribution":
          for (const p of [...stat.a, ...stat.h]) {
            const position = bootstrapPlayers.get(p.element)?.element_type;
            let points = 0;
            if (position === 2 && p.value >= 10) points = 2;
            else if (position === 3 && p.value >= 12) points = 2;
            if (points) {
              const m = metricsMap.get(p.element) || {};
              m.defensive_contribution = (m.defensive_contribution || 0) + points;
              metricsMap.set(p.element, m);
            }
          }
          break;
        case "bps": {
          if (maxMinutes < 60) break;
          const allPlayers = [...stat.a, ...stat.h].filter(p => p.value > 0);
          if (allPlayers.length === 0) break;
          const sortedPlayers = allPlayers.sort((a, b) => b.value - a.value);
          const uniqueScores = [...new Set(sortedPlayers.map(p => p.value))];
          const ranks = uniqueScores.slice(0, 3).map(score => sortedPlayers.filter(p => p.value === score));
          const rank1Players = ranks[0] || [];
          const rank2Players = ranks[1] || [];
          const rank3Players = ranks[2] || [];
          if (rank1Players.length === 0) break;
          if (rank1Players.length > 1) {
            // Tie for 1st place: Players 1 & 2 get 3 points, Player 3 gets 1 point
            for (const p of rank1Players) {
              const m = metricsMap.get(p.element) || {};
              m.bonus = (m.bonus || 0) + 3;
              metricsMap.set(p.element, m);
            }
            for (const p of rank2Players) {
              const m = metricsMap.get(p.element) || {};
              m.bonus = (m.bonus || 0) + 1;
              metricsMap.set(p.element, m);
            }
          } else {
            // Clear 1st place: Player 1 gets 3 points
            for (const p of rank1Players) {
              const m = metricsMap.get(p.element) || {};
              m.bonus = (m.bonus || 0) + 3;
              metricsMap.set(p.element, m);
            }
            if (rank2Players.length > 1) {
              // Tie for 2nd place: Player 1 gets 3 points, Players 2 & 3 get 2 points each (no one gets 1 point)
              for (const p of rank2Players) {
                const m = metricsMap.get(p.element) || {};
                m.bonus = (m.bonus || 0) + 2;
                metricsMap.set(p.element, m);
              }
              // rank3Players get nothing when there's a tie for 2nd
            } else if (rank2Players.length === 1) {
              // Clear 2nd place: Player 2 gets 2 points
              for (const p of rank2Players) {
                const m = metricsMap.get(p.element) || {};
                m.bonus = (m.bonus || 0) + 2;
                metricsMap.set(p.element, m);
              }
              // 3rd place gets 1 point (tie or not)
              for (const p of rank3Players) {
                const m = metricsMap.get(p.element) || {};
                m.bonus = (m.bonus || 0) + 1;
                metricsMap.set(p.element, m);
              }
            }
          }
          break;
        }
      }
    }
  }

  // Filter to team picks and apply multipliers per metric
  type TeamPick = { element: number; position: number; is_captain: boolean; is_vice_captain: boolean; multiplier: number };
  const rawPicks: unknown = (teamDetailsResp as { picks?: unknown }).picks ?? [];
  const picks = (rawPicks as TeamPick[]).filter((p) => p.position <= 15);
  const result: Array<{
    id: number;
    position: number;
    isCaptain: boolean;
    isViceCaptain: boolean;
    multiplier: number;
    total: number;
    metrics: Record<string, number>;
    rawTotal: number;
    rawMetrics: Record<string, number>;
    elementType: number;
    clubName: string;
    teamId: number;
  }> = [];

  // No hard-coded names here anymore; we will normalize on the client via kits-map
  for (const pick of picks) {
    const baseMetrics = metricsMap.get(pick.element) || {};
    const rawMetrics: Record<string, number> = {};
    for (const [k, v] of Object.entries(baseMetrics)) {
      if (v !== 0) rawMetrics[k] = v;
    }
    const rawTotal = Object.values(rawMetrics).reduce((a, b) => a + b, 0);

    const metricsApplied: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawMetrics)) {
      const val = v * pick.multiplier;
      if (val !== 0) metricsApplied[k] = val;
    }
    const total = Object.values(metricsApplied).reduce((a, b) => a + b, 0);
    const element = bootstrapPlayers.get(pick.element);
    const elementType = element?.element_type ?? 0;
    const teamIdForElement = element?.team ?? -1;
    const clubName = String(teamIdForElement); // temporary label; UI will normalize by teamId

    result.push({
      id: pick.element,
      position: pick.position,
      isCaptain: Boolean(pick.is_captain),
      isViceCaptain: Boolean(pick.is_vice_captain),
      multiplier: pick.multiplier,
      total,
      metrics: metricsApplied,
      rawTotal,
      rawMetrics,
      elementType,
      clubName,
      teamId: teamIdForElement,
    });
  }

  // Sort by position
  result.sort((a, b) => a.position - b.position);
  return result;
}
