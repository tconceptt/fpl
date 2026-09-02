/**
 * Season records and copy that used to be hardcoded across the dashboard and
 * Qitawrari pages. One place to update each season instead of two.
 */

export interface SeasonRecord {
  season: string;
  champion?: string;
  qitawrari?: string;
  note?: string;
}

export interface LeagueConfig {
  appTitle: string;
  records: SeasonRecord[];
  /** The dashboard's "Reigning Champion" / "Reigning Qitawrari" cards. */
  reigning: {
    champion: string;
    qitawrari: string;
    qitawrariNote: string;
  };
  /** The Qitawrari hub's own "Reigning Qitawrari" hero card. */
  qitawrariHub: {
    name: string;
    tagline: string;
    quote: string;
  };
}

export const leagueConfig: LeagueConfig = {
  appTitle: "FPL Companion for the Qitawrari League",
  records: [
    {
      season: "2022/23",
      qitawrari: "T",
      note: "The Original Qitawrari",
    },
    {
      season: "2023/24",
      qitawrari: "Eyosyas Kebede",
      note: "The Current Holder",
    },
    {
      season: "2024/25",
      qitawrari: "To be determined...",
      note: "The Next Legend",
    },
  ],
  reigning: {
    champion: "T",
    qitawrari: "ቤቢ ነው",
    qitawrariNote: "Yes, he did actually finish below Eyosyas 🤯",
  },
  qitawrariHub: {
    name: "Eyosyas Kebede",
    tagline: "The one who defied all odds... by finishing last",
    quote: "With great power comes great responsibility to do better next season",
  },
};
