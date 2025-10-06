import { fplApiRoutes } from "@/lib/routes";

interface Player {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
}

interface BootstrapResponse {
  elements: Player[];
}

// Cache player data to avoid repeated API calls
let playerCache: Map<number, Player> | null = null;

async function initializePlayerCache(): Promise<Map<number, Player>> {
  if (playerCache) return playerCache;

  // Add headers and simple retry for robustness
  const headers = {
    'User-Agent': 'Mozilla/5.0',
    'Origin': 'https://fantasy.premierleague.com',
    'Referer': 'https://fantasy.premierleague.com/'
  };

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(fplApiRoutes.bootstrap, {
        next: { revalidate: 3600 }, // Cache for 1 hour
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch player data: ${response.status}`);
      }

      const data: BootstrapResponse = await response.json();
      playerCache = new Map(data.elements.map(player => [player.id, player]));
      return playerCache;
    } catch (err) {
      lastError = err;
      await new Promise(res => setTimeout(res, 500));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to initialize player cache');
}

export async function getPlayerName(playerId: number, nameType: 'web_name' | 'full_name' | 'first_name' | 'second_name' = 'web_name'): Promise<string> {
  try {
    const players = await initializePlayerCache();
    const player = players.get(playerId);

    if (!player) {
      throw new Error(`Player with ID ${playerId} not found`);
    }

    switch (nameType) {
      case 'full_name':
        return `${player.first_name} ${player.second_name}`;
      case 'first_name':
        return player.first_name;
      case 'second_name':
        return player.second_name;
      default:
        return player.web_name;
    }
  } catch (error) {
    console.error('Error getting player name:', error);
    return 'Unknown Player';
  }
}
