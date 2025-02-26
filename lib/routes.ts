export const fplApiRoutes = {
  standings: (leagueId: string) =>
    `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/`,
  bootstrap: "https://fantasy.premierleague.com/api/bootstrap-static/",
  teamHistory: (teamId: string) =>
    `https://fantasy.premierleague.com/api/entry/${teamId}/history/`,
  liveStandings: (gameweekId: string) =>
    `https://fantasy.premierleague.com/api/event/${gameweekId}/live/`,
  teamDetails: (teamId: string, gameweekId: string) =>
    `https://fantasy.premierleague.com/api/entry/${teamId}/event/${gameweekId}/picks/`,

};
