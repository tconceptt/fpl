// Minimal home kit color mapping for Premier League teams by FPL team id.
// Primary and secondary are used to render the jersey.
export type KitColors = {
  primary: string;
  secondary: string;
};

export const defaultKit: KitColors = {
  primary: "#777777",
  secondary: "#FFFFFF",
};

// Note: IDs come from bootstrap-static `teams[].id`.
export const teamKits: Record<number, KitColors> = {
  1: { primary: "#D71920", secondary: "#FFFFFF" }, // Arsenal
  2: { primary: "#6CABDD", secondary: "#1C2C5B" }, // Aston Villa (approx claret/blue)
  3: { primary: "#6CABDD", secondary: "#1C2C5B" }, // Bournemouth (red/black) – using blue as placeholder
  4: { primary: "#034694", secondary: "#FFFFFF" }, // Brentford (red/white) – using Chelsea blue as placeholder
  5: { primary: "#DA291C", secondary: "#FFFFFF" }, // Brighton
  6: { primary: "#034694", secondary: "#FFFFFF" }, // Chelsea
  7: { primary: "#6C1D45", secondary: "#1BB1E7" }, // Crystal Palace
  8: { primary: "#003A6C", secondary: "#FFFFFF" }, // Everton
  9: { primary: "#DA291C", secondary: "#FFFFFF" }, // Fulham
  10: { primary: "#EE2737", secondary: "#FFFFFF" }, // Ipswich
  11: { primary: "#DA291C", secondary: "#000000" }, // Leicester
  12: { primary: "#C8102E", secondary: "#FFFFFF" }, // Liverpool
  13: { primary: "#1B458F", secondary: "#FFFFFF" }, // Man City
  14: { primary: "#DA291C", secondary: "#000000" }, // Man United
  15: { primary: "#001C58", secondary: "#FFFFFF" }, // Newcastle
  16: { primary: "#FFCD00", secondary: "#000000" }, // Nottingham Forest (approx)
  17: { primary: "#034694", secondary: "#FFFFFF" }, // Southampton (approx)
  18: { primary: "#132257", secondary: "#FFFFFF" }, // Spurs
  19: { primary: "#6CABDD", secondary: "#1C2C5B" }, // West Ham (claret/blue)
  20: { primary: "#FDB913", secondary: "#1F2041" }, // Wolves
};

export function getKitForTeam(teamId?: number | null): KitColors {
  if (!teamId) return defaultKit;
  return teamKits[teamId] || defaultKit;
}


