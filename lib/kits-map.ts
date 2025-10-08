// Centralized helpers for mapping FPL team names/ids to kit image basenames

// Known canonical basenames as they exist in public/Images/kits
// Keep this list aligned with actual filenames to avoid mismatch
export const CANONICAL_BASENAMES = new Set<string>([
  "Arsenal",
  "Aston Villa",
  "Bournemouth",
  "Brentford",
  "Brighton",
  "Burnley",
  "Chelsea",
  "Crystal Palace",
  "Everton",
  "Fulham",
  "Leeds United",
  "Liverpool",
  "Manchester City",
  "Manchester United",
  "Newcastle",
  "Nottingham Forest",
  "Spurs",
  "Sunderland",
  "West Ham",
  "Wolves",
  "Placeholder",
]);

// Common name normalizations from FPL bootstrap `teams.name`
const NAME_NORMALIZERS: Array<[RegExp, string]> = [
  [/^tottenham\s*hotspur/i, "Spurs"],
  [/^newcastle(\s+united)?/i, "Newcastle"],
  [/^west\s+ham(\s+united)?/i, "West Ham"],
  [/^wolverhampton(\s+wanderers)?/i, "Wolves"],
  [/^brighton(\s+and\s+hove\s+albion|\s*&\s*hove\s*albion)?/i, "Brighton"],
  [/^afc\s*bournemouth/i, "Bournemouth"],
  [/^manchester\s*city/i, "Manchester City"],
  [/^manchester\s*united/i, "Manchester United"],
  [/^nottingham\s*forest/i, "Nottingham Forest"],
  [/^leeds(\s+united)?/i, "Leeds United"],
  [/^sunderland(\s+afc)?/i, "Sunderland"],
];

// Accept teamId as string or full club name; prefer explicit id mapping when possible
const TEAMID_TO_BASENAME = new Map<string, string>([
  ["1", "Arsenal"],
  ["2", "Aston Villa"],
  ["3", "Bournemouth"],
  ["4", "Brentford"],
  ["5", "Brighton"],
  ["6", "Burnley"],
  ["7", "Chelsea"],
  ["8", "Crystal Palace"],
  ["9", "Everton"],
  ["10", "Fulham"],
  ["11", "Liverpool"],
  ["12", "Manchester City"],
  ["13", "Manchester United"],
  ["14", "Newcastle"],
  ["15", "Nottingham Forest"],
  ["16", "Spurs"],
  ["17", "West Ham"],
  ["18", "Wolves"],
  // Extras available in your kit set
  ["19", "Leeds United"],
  ["20", "Sunderland"],
]);

export function normalizeTeamBasename(input: string | undefined | null): string {
  const raw = (input || "").trim();
  if (!raw) return "Placeholder";
  // If it's a numeric team id from bootstrap
  if (/^\d+$/.test(raw)) {
    return TEAMID_TO_BASENAME.get(raw) || "Placeholder";
  }
  for (const [pattern, replacement] of NAME_NORMALIZERS) {
    if (pattern.test(raw)) return replacement;
  }
  // Capitalization & spacing safety
  const candidate = raw
    .replace(/\s+/g, " ")
    .replace(/\s*&\s*/g, " and ")
    .replace(/\bfc\b/gi, "")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
  return CANONICAL_BASENAMES.has(candidate) ? candidate : "Placeholder";
}

export function buildKitFilenames(basename: string, isGoalkeeper: boolean): string[] {
  // Match actual files e.g. "ManchesterCity(Home).png" and cases with a space: "Fulham (Home).png"
  const homeNoSpace = `${basename}(Home).png`;
  const homeSpace = `${basename} (Home).png`;
  const gkNoSpace = `${basename}(GK).png`;
  const gkSpace = `${basename} (GK).png`;
  const plain = `${basename}.png`; // e.g., Newcastle.png

  const candidates: string[] = [];
  if (isGoalkeeper) {
    candidates.push(gkNoSpace, gkSpace, homeNoSpace, homeSpace, plain);
  } else {
    candidates.push(homeNoSpace, homeSpace, plain, gkNoSpace, gkSpace);
  }
  // Always fallback to Placeholder.png as the last resort
  candidates.push(`Placeholder.png`);
  return candidates;
}


