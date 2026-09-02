/**
 * Phase 2b: one gameweek param, `gw`, read from `searchParams` everywhere.
 *
 * Old links used `?gameweek=N`. When a page receives that and no `gw`, this
 * redirects to the same path with `gw` in its place instead of quietly
 * reading `gameweek` forever.
 */

import { redirect } from "next/navigation";

export interface GwSearchParams {
  gw?: string;
  gameweek?: string;
}

/**
 * Returns the `gw` value to use (possibly empty string, for the pages that
 * treat that as invalid input), or null when neither param is present.
 * Throws Next's redirect control-flow error when only the legacy `gameweek`
 * param is present.
 */
export function resolveGwParam(pathname: string, searchParams: GwSearchParams): string | null {
  if (searchParams.gw !== undefined) return searchParams.gw;

  if (searchParams.gameweek !== undefined) {
    redirect(`${pathname}?gw=${encodeURIComponent(searchParams.gameweek)}`);
  }

  return null;
}
