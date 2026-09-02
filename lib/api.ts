/**
 * Shared validation and response rules for the bounded API routes
 * (Phase 2.4). Every route under app/api validates `gw` and any entry/team
 * id the same way, and returns the same error shapes — implemented once
 * here so no route re-derives its own rules.
 */

import { NextResponse } from "next/server";
import * as client from "@/lib/fpl/client";
import { cachedKind } from "@/lib/fpl/cache";
import type { BootstrapEvent } from "@/lib/fpl/types";

/**
 * The same "current gameweek" resolution used by services/league.ts and
 * services/team-page-service.ts: the current event, else the next one, else
 * the most recently finished one.
 */
function findCurrentEvent(events: BootstrapEvent[]): BootstrapEvent | undefined {
  return (
    events.find((e) => e.is_current) ??
    events.find((e) => e.is_next) ??
    [...events].reverse().find((e) => e.finished)
  );
}

export async function getCurrentGameweek(): Promise<number> {
  const bootstrap = await cachedKind("bootstrap", "bootstrap", () => client.bootstrap());
  const currentEvent = findCurrentEvent(bootstrap.events);
  return currentEvent ? currentEvent.id : 1;
}

/**
 * Parse a `gw` route param and validate it against the current gameweek in
 * one step: digits only, and 1..currentGameweek inclusive. Returns null for
 * anything else — empty, "abc", "1.5", "0", "-1", or out of range — so every
 * route can respond with the same 400 without re-deriving these rules.
 */
export function parseGw(raw: string, currentGameweek: number): number | null {
  if (!/^[0-9]+$/.test(raw)) return null;
  const gw = Number.parseInt(raw, 10);
  if (gw < 1 || gw > currentGameweek) return null;
  return gw;
}

/** Whether `entry` is one of the league's own team ids. */
export function isLeagueMember(entry: number, memberEntries: number[]): boolean {
  return memberEntries.includes(entry);
}

export function invalidGameweek(): NextResponse {
  return NextResponse.json({ error: "Invalid gameweek" }, { status: 400 });
}

export function teamNotInLeague(): NextResponse {
  return NextResponse.json({ error: "Team not in league" }, { status: 404 });
}

/** Upstream failures return a plain message, never the upstream's own. */
export function upstreamUnavailable(): NextResponse {
  return NextResponse.json({ error: "FPL API unavailable" }, { status: 502 });
}

/** `Cache-Control` for a successful response: `s-maxage` matching the Redis TTL it was cached with. */
export function cacheControlHeader(ttlSeconds: number): string {
  return `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds}`;
}

export function requireLeagueId(): string {
  const leagueId = process.env.FPL_LEAGUE_ID;
  if (!leagueId) {
    throw new Error("FPL_LEAGUE_ID environment variable is not set.");
  }
  return leagueId;
}
