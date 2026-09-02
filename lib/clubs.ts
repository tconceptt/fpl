/**
 * Clubs, derived from bootstrap `teams` at runtime.
 *
 * 26/27 shifted every club id from 6 upward and added Coventry, Hull and
 * Ipswich, so nothing here is a hardcoded id table. Kits are keyed by
 * `short_name` (local files) and `code` (the official fallback image).
 */

export interface Club {
  id: number;
  name: string;
  shortName: string;
  code: number;
}

interface BootstrapTeamLike {
  id: number;
  name: string;
  short_name: string;
  code: number;
}

export function clubsFromBootstrap(teams: BootstrapTeamLike[]): Club[] {
  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    shortName: team.short_name,
    code: team.code,
  }));
}

const OFFICIAL_SHIRTS_BASE = "https://fantasy.premierleague.com/dist/img/shirts/standard";
const PLACEHOLDER_KIT = "/Images/kits/placeholder.png";

/**
 * Candidate kit image URLs, in the order they should be tried.
 *
 * 1. The local file for this club, if one has been drawn.
 * 2. FPL's own shirt image for the club's `code` (covers every club,
 *    including ones we haven't drawn a local kit for, e.g. promoted sides).
 * 3. A local placeholder, as a last resort.
 */
export function kitSources(club: Club | undefined, isGoalkeeper: boolean): string[] {
  if (!club) return [PLACEHOLDER_KIT];

  const local = isGoalkeeper
    ? `/Images/kits/${club.shortName}-gk.png`
    : `/Images/kits/${club.shortName}-home.png`;

  const official = isGoalkeeper
    ? `${OFFICIAL_SHIRTS_BASE}/shirt_${club.code}_1-66.png`
    : `${OFFICIAL_SHIRTS_BASE}/shirt_${club.code}-66.png`;

  return [local, official, PLACEHOLDER_KIT];
}
