export const fplApiRoutes = {
  standings: (leagueId: string) =>
    `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/`,
  h2hStandings: (leagueId: string) =>
    `https://fantasy.premierleague.com/api/leagues-h2h/${leagueId}/standings/`,
  h2hMatches: (leagueId: string, gw: string) =>
    `https://fantasy.premierleague.com/api/leagues-h2h-matches/league/${leagueId}/?event=${gw}`,
  bootstrap: "https://fantasy.premierleague.com/api/bootstrap-static/",
  teamHistory: (teamId: string) =>
    `https://fantasy.premierleague.com/api/entry/${teamId}/history/`,
  liveStandings: (gameweekId: string) =>
    `https://fantasy.premierleague.com/api/event/${gameweekId}/live/`,
  fixtures: (gameweekId: string) =>
    `https://fantasy.premierleague.com/api/fixtures/?event=${gameweekId}`,
  teamDetails: (teamId: string, gameweekId: string) =>
    `https://fantasy.premierleague.com/api/entry/${teamId}/event/${gameweekId}/picks/`,
  teamTransfers: (teamId: string) =>
    `https://fantasy.premierleague.com/api/entry/${teamId}/transfers/`,
  entry: (teamId: string) =>
    `https://fantasy.premierleague.com/api/entry/${teamId}/`,
  // Per-day scoring state for the current gameweek, plus whether FPL is
  // mid-recalculation of league tables ("Updating" vs "Updated").
  eventStatus: "https://fantasy.premierleague.com/api/event-status/",
};
