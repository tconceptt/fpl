// FPL Premier League teams (from bootstrap-static)
// Fill in kitBasename with the EXACT basename in public/Images/kits
// Example: "Tottenham Hotspur" images are stored under basename "Spurs" in your set

export type TeamKitMapping = {
  id: number;
  name: string;
  short: string;
  kitBasename: string; // ← fill me
};

export const TEAM_IDS: TeamKitMapping[] = [
  { id: 1, name: "Arsenal", short: "ARS", kitBasename: "Arsenal" },
  { id: 2, name: "Aston Villa", short: "AVL", kitBasename: "AstonVilla" },
  { id: 3, name: "Burnley", short: "BUR", kitBasename: "Burnley" },
  { id: 4, name: "Bournemouth", short: "BOU", kitBasename: "Bournemouth" },
  { id: 5, name: "Brentford", short: "BRE", kitBasename: "Brentford" },
  { id: 6, name: "Brighton", short: "BHA", kitBasename: "Brighton" },
  { id: 7, name: "Chelsea", short: "CHE", kitBasename: "Chelsea" },
  { id: 8, name: "Crystal Palace", short: "CRY", kitBasename: "CrystalPalace" },
  { id: 9, name: "Everton", short: "EVE", kitBasename: "Everton" },
  { id: 10, name: "Fulham", short: "FUL", kitBasename: "Fulham" },
  { id: 11, name: "Leeds", short: "LEE", kitBasename: "LeedsUnited" },
  { id: 12, name: "Liverpool", short: "LIV", kitBasename: "Liverpool" },
  { id: 13, name: "Man City", short: "MCI", kitBasename: "ManchesterCity" },
  { id: 14, name: "Man Utd", short: "MUN", kitBasename: "ManchesterUnited" },
  { id: 15, name: "Newcastle", short: "NEW", kitBasename: "Newcastle" },
  { id: 16, name: "Nott'm Forest", short: "NFO", kitBasename: "NottinghamForest" },
  { id: 17, name: "Sunderland", short: "SUN", kitBasename: "Sunderland" },
  { id: 18, name: "Spurs", short: "TOT", kitBasename: "Spurs" },
  { id: 19, name: "West Ham", short: "WHU", kitBasename: "WestHam" },
  { id: 20, name: "Wolves", short: "WOL", kitBasename: "Wolves" },
];


