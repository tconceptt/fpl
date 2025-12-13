/**
 * Centralized FPL Data Fetching Layer
 * 
 * This module provides request-scoped caching and deduplication for FPL API calls.
 * It ensures that expensive API calls (especially bootstrap-static) are only made once
 * per request lifecycle, dramatically improving performance.
 */

import { fplApiRoutes } from "@/lib/routes";

// Types
export interface BootstrapPlayer {
    id: number;
    web_name: string;
    first_name: string;
    second_name: string;
    element_type: number;
    team: number;
}

export interface BootstrapTeam {
    id: number;
    short_name: string;
    name: string;
}

export interface BootstrapEvent {
    id: number;
    is_current: boolean;
    is_next: boolean;
    finished: boolean;
}

export interface BootstrapData {
    elements: BootstrapPlayer[];
    teams: BootstrapTeam[];
    events: BootstrapEvent[];
}

export interface Fixture {
    id: number;
    kickoff_time: string;
    started: boolean;
    finished: boolean;
    team_h: number;
    team_a: number;
    stats: FixtureStat[];
}

export interface FixtureStat {
    identifier: string;
    a: { value: number; element: number }[];
    h: { value: number; element: number }[];
}

export interface LivePlayerStats {
    minutes: number;
    clean_sheets: number;
    goals_conceded: number;
    saves: number;
    total_points: number;
}

export interface LivePlayer {
    id: number;
    stats: LivePlayerStats;
    explain: Array<{ fixture: number }>;
}

export interface LiveGameweekData {
    elements: LivePlayer[];
}

export interface TeamPick {
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
    autoSubIn?: boolean;
    autoSubOut?: boolean;
}

export interface TeamDetails {
    active_chip: string | null;
    automatic_subs: Array<{
        entry: number;
        element_in: number;
        element_out: number;
        event: number;
    }>;
    entry_history: {
        event_transfers: number;
        event_transfers_cost: number;
        points_on_bench: number;
        points: number;
    };
    picks: TeamPick[];
}

export interface TeamHistory {
    current: Array<{
        event: number;
        points: number;
        total_points: number;
        event_transfers_cost: number;
        event_transfers: number;
        rank: number;
        overall_rank: number;
    }>;
    past: Array<{
        season_name: string;
        total_points: number;
        rank: number;
    }>;
    chips: Array<{
        name: string;
        event: number;
        time: string;
    }>;
}

export interface LeagueStandings {
    league: { name: string };
    standings: {
        results: Array<{
            entry: number;
            entry_name: string;
            player_name: string;
            rank: number;
            total: number;
        }>;
    };
}

// Module-level cache for bootstrap data (survives across requests in the same process)
// Uses a timestamp to invalidate after a certain period
let bootstrapCache: {
    data: BootstrapData | null;
    timestamp: number;
    promise: Promise<BootstrapData> | null;
} = {
    data: null,
    timestamp: 0,
    promise: null,
};

const BOOTSTRAP_CACHE_TTL = 60 * 1000; // 1 minute cache for bootstrap

// Request-scoped cache for deduplicating calls within the same request
// Using a WeakMap pattern for automatic cleanup
export class RequestScopedCache {
    private liveDataCache = new Map<string, Promise<LiveGameweekData>>();
    private fixturesCache = new Map<string, Promise<Fixture[]>>();
    private teamDetailsCache = new Map<string, Promise<TeamDetails>>();
    private teamHistoryCache = new Map<string, Promise<TeamHistory>>();
    private leagueStandingsCache = new Map<string, Promise<LeagueStandings>>();
    private h2hStandingsCache = new Map<string, Promise<unknown>>();

    // Precomputed maps from bootstrap data
    private playersMap: Map<number, BootstrapPlayer> | null = null;
    private teamsMap: Map<number, BootstrapTeam> | null = null;

    async getBootstrapData(): Promise<BootstrapData> {
        const now = Date.now();

        // Return cached data if still valid
        if (bootstrapCache.data && (now - bootstrapCache.timestamp) < BOOTSTRAP_CACHE_TTL) {
            return bootstrapCache.data;
        }

        // If there's already a fetch in progress, wait for it
        if (bootstrapCache.promise) {
            return bootstrapCache.promise;
        }

        // Start a new fetch
        bootstrapCache.promise = this.fetchBootstrap();

        try {
            const data = await bootstrapCache.promise;
            bootstrapCache.data = data;
            bootstrapCache.timestamp = now;
            return data;
        } finally {
            bootstrapCache.promise = null;
        }
    }

    private async fetchBootstrap(): Promise<BootstrapData> {
        const headers = {
            'User-Agent': 'Mozilla/5.0',
            'Origin': 'https://fantasy.premierleague.com',
            'Referer': 'https://fantasy.premierleague.com/'
        };

        let lastError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const response = await fetch(fplApiRoutes.bootstrap, {
                    cache: 'no-store',
                    headers,
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch bootstrap data: ${response.status}`);
                }

                return await response.json();
            } catch (err) {
                lastError = err;
                await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
            }
        }
        throw lastError instanceof Error ? lastError : new Error('Failed to fetch bootstrap data');
    }

    async getPlayersMap(): Promise<Map<number, BootstrapPlayer>> {
        if (this.playersMap) return this.playersMap;
        const bootstrap = await this.getBootstrapData();
        this.playersMap = new Map(bootstrap.elements.map(p => [p.id, p]));
        return this.playersMap;
    }

    async getTeamsMap(): Promise<Map<number, BootstrapTeam>> {
        if (this.teamsMap) return this.teamsMap;
        const bootstrap = await this.getBootstrapData();
        this.teamsMap = new Map(bootstrap.teams.map(t => [t.id, t]));
        return this.teamsMap;
    }

    async getCurrentGameweek(): Promise<number> {
        const bootstrap = await this.getBootstrapData();
        const events = bootstrap.events || [];

        const current = events.find((e) => e.is_current);
        if (current) return current.id;

        const next = events.find((e) => e.is_next);
        if (next) return next.id;

        const lastFinished = [...events].reverse().find((e) => e.finished);
        if (lastFinished) return lastFinished.id;

        return 1;
    }

    async getLiveData(gameweekId: string): Promise<LiveGameweekData> {
        const cached = this.liveDataCache.get(gameweekId);
        if (cached) return cached;

        const promise = this.fetchLiveData(gameweekId);
        this.liveDataCache.set(gameweekId, promise);
        return promise;
    }

    private async fetchLiveData(gameweekId: string): Promise<LiveGameweekData> {
        const response = await fetch(fplApiRoutes.liveStandings(gameweekId), {
            next: { revalidate: 30 },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch live data: ${response.status}`);
        }
        return response.json();
    }

    async getFixtures(gameweekId: string): Promise<Fixture[]> {
        const cached = this.fixturesCache.get(gameweekId);
        if (cached) return cached;

        const promise = this.fetchFixtures(gameweekId);
        this.fixturesCache.set(gameweekId, promise);
        return promise;
    }

    private async fetchFixtures(gameweekId: string): Promise<Fixture[]> {
        const response = await fetch(fplApiRoutes.fixtures(gameweekId), {
            next: { revalidate: 30 },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch fixtures: ${response.status}`);
        }
        return response.json();
    }

    async getTeamDetails(teamId: string, gameweekId: string): Promise<TeamDetails> {
        const key = `${teamId}-${gameweekId}`;
        const cached = this.teamDetailsCache.get(key);
        if (cached) return cached;

        const promise = this.fetchTeamDetails(teamId, gameweekId);
        this.teamDetailsCache.set(key, promise);
        return promise;
    }

    private async fetchTeamDetails(teamId: string, gameweekId: string): Promise<TeamDetails> {
        const response = await fetch(fplApiRoutes.teamDetails(teamId, gameweekId), {
            cache: 'no-store',
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch team details: ${response.status}`);
        }
        return response.json();
    }

    async getTeamHistory(teamId: string): Promise<TeamHistory> {
        const cached = this.teamHistoryCache.get(teamId);
        if (cached) return cached;

        const promise = this.fetchTeamHistory(teamId);
        this.teamHistoryCache.set(teamId, promise);
        return promise;
    }

    private async fetchTeamHistory(teamId: string): Promise<TeamHistory> {
        const response = await fetch(fplApiRoutes.teamHistory(teamId), {
            next: { revalidate: 300 },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch team history: ${response.status}`);
        }
        return response.json();
    }

    async getLeagueStandings(leagueId: string): Promise<LeagueStandings> {
        const cached = this.leagueStandingsCache.get(leagueId);
        if (cached) return cached;

        const promise = this.fetchLeagueStandings(leagueId);
        this.leagueStandingsCache.set(leagueId, promise);
        return promise;
    }

    private async fetchLeagueStandings(leagueId: string): Promise<LeagueStandings> {
        const headers = {
            'User-Agent': 'Mozilla/5.0',
            'Origin': 'https://fantasy.premierleague.com',
            'Referer': 'https://fantasy.premierleague.com/'
        };

        const response = await fetch(fplApiRoutes.standings(leagueId), {
            cache: 'no-store',
            headers,
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch league standings: ${response.status}`);
        }
        return response.json();
    }

    async getH2HStandings(leagueId: string): Promise<unknown> {
        const cached = this.h2hStandingsCache.get(leagueId);
        if (cached) return cached;

        const promise = this.fetchH2HStandings(leagueId);
        this.h2hStandingsCache.set(leagueId, promise);
        return promise;
    }

    private async fetchH2HStandings(leagueId: string): Promise<unknown> {
        const headers = {
            'User-Agent': 'Mozilla/5.0',
            'Origin': 'https://fantasy.premierleague.com',
            'Referer': 'https://fantasy.premierleague.com/'
        };

        const response = await fetch(fplApiRoutes.h2hStandings(leagueId), {
            cache: 'no-store',
            headers,
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch H2H standings: ${response.status}`);
        }
        return response.json();
    }

    // Helper to get player name directly from cached bootstrap
    async getPlayerName(playerId: number, nameType: 'web_name' | 'full_name' | 'first_name' | 'second_name' = 'web_name'): Promise<string> {
        const players = await this.getPlayersMap();
        const player = players.get(playerId);

        if (!player) {
            return 'Unknown Player';
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
    }

    // Batch get player names - more efficient than individual calls
    async getPlayerNames(playerIds: number[], nameType: 'web_name' | 'full_name' | 'first_name' | 'second_name' = 'web_name'): Promise<Map<number, string>> {
        const players = await this.getPlayersMap();
        const result = new Map<number, string>();

        for (const id of playerIds) {
            const player = players.get(id);
            if (player) {
                switch (nameType) {
                    case 'full_name':
                        result.set(id, `${player.first_name} ${player.second_name}`);
                        break;
                    case 'first_name':
                        result.set(id, player.first_name);
                        break;
                    case 'second_name':
                        result.set(id, player.second_name);
                        break;
                    default:
                        result.set(id, player.web_name);
                }
            } else {
                result.set(id, 'Unknown Player');
            }
        }

        return result;
    }
}

// Factory function to create a new cache instance per request
export function createRequestCache(): RequestScopedCache {
    return new RequestScopedCache();
}

// Singleton for simpler use cases (when you just need one cache per module execution)
let defaultCache: RequestScopedCache | null = null;

export function getDefaultCache(): RequestScopedCache {
    if (!defaultCache) {
        defaultCache = new RequestScopedCache();
    }
    return defaultCache;
}

// Clear the default cache (useful for testing or long-running processes)
export function clearDefaultCache(): void {
    defaultCache = null;
}
