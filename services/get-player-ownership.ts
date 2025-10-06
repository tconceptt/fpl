import { fplApiRoutes } from "@/lib/routes";

interface PlayerElement {
  id: number;
  selected_by_percent: string; // e.g. "45.6"
}

interface BootstrapResponse {
  elements: PlayerElement[];
}

// Cache ownership data to avoid repeated API calls
let ownershipCache: Map<number, number> | null = null;

async function initializeOwnershipCache(): Promise<Map<number, number>> {
  if (ownershipCache) return ownershipCache;

  // Add headers and basic retry for reliability
  const headers = {
    'User-Agent': 'Mozilla/5.0',
    'Origin': 'https://fantasy.premierleague.com',
    'Referer': 'https://fantasy.premierleague.com/'
  };

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(fplApiRoutes.bootstrap, {
        next: { revalidate: 3600 },
        headers,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch bootstrap data: ${response.status}`);
      }
      const data: BootstrapResponse = await response.json();
      ownershipCache = new Map(
        data.elements.map((el) => [el.id, Number.parseFloat(el.selected_by_percent || "0") || 0])
      );
      return ownershipCache;
    } catch (err) {
      lastError = err;
      await new Promise(res => setTimeout(res, 500));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to initialize ownership cache');
}

/**
 * Returns the percentage ownership for a given player (0..100).
 */
export async function getPlayerOwnership(playerId: number): Promise<number> {
  try {
    const cache = await initializeOwnershipCache();
    return cache.get(playerId) ?? 0;
  } catch (error) {
    console.error("Error getting player ownership:", error);
    return 0;
  }
}

/**
 * Returns a map of playerId -> percentage ownership (0..100) for all players.
 */
export async function getAllPlayersOwnership(): Promise<Map<number, number>> {
  try {
    return await initializeOwnershipCache();
  } catch (error) {
    console.error("Error getting all players ownership:", error);
    return new Map();
  }
}


