import { fplApiRoutes } from "@/lib/routes";
import { getCurrentGameweek } from "@/services/league-service";

type BootstrapElement = {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number; // FPL team id
  element_type: 1 | 2 | 3 | 4; // 1:GKP, 2:DEF, 3:MID, 4:FWD
};

type BootstrapTeam = {
  id: number;
  name: string;
  short_name: string;
};

type TeamDetailsResponse = {
  picks: Array<{
    element: number;
    position: number; // 1..15
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
  entry_history: {
    points: number;
    event_transfers_cost: number;
    bank: number;
    value: number;
  };
  active_chip?: string | null;
};

type LiveElement = {
  id: number;
  stats: {
    total_points: number;
    minutes: number;
  };
};

type LiveResponse = {
  elements: LiveElement[];
};

export type TeamViewPlayer = {
  elementId: number;
  name: string;
  teamId: number;
  teamShortName: string;
  positionType: "GKP" | "DEF" | "MID" | "FWD";
  isCaptain: boolean;
  isViceCaptain: boolean;
  multiplier: number;
  order: number; // 1..15
  livePoints: number;
  effectivePoints: number; // livePoints * multiplier
};

export type TeamViewData = {
  entryId: number;
  gameweek: number;
  activeChip?: string | null;
  totalPoints: number; // from entry_history.points
  transferCost: number; // from entry_history.event_transfers_cost
  starters: TeamViewPlayer[]; // order by element_type rows
  bench: TeamViewPlayer[]; // order by order asc
};

async function getBootstrap() {
  const response = await fetch(fplApiRoutes.bootstrap, { next: { revalidate: 3600, tags: ["bootstrap"] } });
  if (!response.ok) throw new Error(`Failed to fetch bootstrap: ${response.status}`);
  const data = await response.json();
  const elements: BootstrapElement[] = data.elements || [];
  const teams: BootstrapTeam[] = data.teams || [];
  const elementMap = new Map<number, BootstrapElement>(elements.map((e) => [e.id, e]));
  const teamMap = new Map<number, BootstrapTeam>(teams.map((t) => [t.id, t]));
  return { elementMap, teamMap };
}

function positionTypeFromElementType(type: 1 | 2 | 3 | 4): "GKP" | "DEF" | "MID" | "FWD" {
  switch (type) {
    case 1:
      return "GKP";
    case 2:
      return "DEF";
    case 3:
      return "MID";
    case 4:
    default:
      return "FWD";
  }
}

export async function getTeamView(entryId: string | number, maybeGameweek?: number): Promise<TeamViewData> {
  const entry = typeof entryId === "string" ? parseInt(entryId) : entryId;
  const gameweek = maybeGameweek || (await getCurrentGameweek());

  const [teamDetailsRes, liveRes, { elementMap, teamMap }] = await Promise.all([
    fetch(fplApiRoutes.teamDetails(String(entry), String(gameweek)), { next: { revalidate: 30 } }),
    fetch(fplApiRoutes.liveStandings(String(gameweek)), { next: { revalidate: 30 } }),
    getBootstrap(),
  ]);

  if (!teamDetailsRes.ok) throw new Error(`Failed to fetch team details: ${teamDetailsRes.status}`);
  if (!liveRes.ok) throw new Error(`Failed to fetch live standings: ${liveRes.status}`);

  const teamDetails: TeamDetailsResponse = await teamDetailsRes.json();
  const live: LiveResponse = await liveRes.json();

  const livePointsMap = new Map<number, number>(
    (live.elements || []).map((e) => [e.id, e.stats?.total_points ?? 0])
  );

  const players: TeamViewPlayer[] = teamDetails.picks.map((p) => {
    const element = elementMap.get(p.element);
    const livePoints = livePointsMap.get(p.element) ?? 0;
    const name = element ? element.web_name : `#${p.element}`;
    const teamId = element ? element.team : 0;
    const teamShortName = teamMap.get(teamId)?.short_name || "";
    const positionType = element ? positionTypeFromElementType(element.element_type) : "MID";
    const effectivePoints = livePoints * (p.multiplier ?? 1);
    return {
      elementId: p.element,
      name,
      teamId,
      teamShortName,
      positionType,
      isCaptain: p.is_captain,
      isViceCaptain: p.is_vice_captain,
      multiplier: p.multiplier,
      order: p.position,
      livePoints,
      effectivePoints,
    };
  });

  const starters = players
    .filter((pl) => pl.order <= 11)
    .sort((a, b) => {
      // GK first, then DEF, MID, FWD; then by order to keep FPL placement
      const posRank = { GKP: 0, DEF: 1, MID: 2, FWD: 3 } as const;
      const dr = posRank[a.positionType] - posRank[b.positionType];
      if (dr !== 0) return dr;
      return a.order - b.order;
    });

  const bench = players
    .filter((pl) => pl.order > 11)
    .sort((a, b) => a.order - b.order);

  return {
    entryId: entry,
    gameweek,
    activeChip: teamDetails.active_chip ?? null,
    totalPoints: teamDetails.entry_history?.points ?? 0,
    transferCost: teamDetails.entry_history?.event_transfers_cost ?? 0,
    starters,
    bench,
  };
}


