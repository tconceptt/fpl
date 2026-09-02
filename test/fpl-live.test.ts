import { describe, expect, it } from "vitest";
import {
    autoSubSets,
    buildLiveMetricsMap,
    buildLivePointsMap,
    countPlayersToStart,
    sumPicks,
} from "@/services/fpl-live";
import type {
    BootstrapPlayer,
    Fixture,
    LiveGameweekData,
    TeamDetails,
    TeamPick,
} from "@/lib/fpl/types";

import bootstrapSlim from "./fixtures/bootstrap-slim.json";
import liveGw2 from "./fixtures/live-gw2.json";
import fixturesGw3 from "./fixtures/fixtures-gw3.json";
import picksGw2Bboost from "./fixtures/picks-gw2-bboost.json";

const live = liveGw2 as unknown as LiveGameweekData;
const fixtures = fixturesGw3 as unknown as Fixture[];
const picks = picksGw2Bboost as unknown as TeamDetails;

const playersMap: Map<number, BootstrapPlayer> = new Map(
    bootstrapSlim.elements.map((el) => [el.id, el as unknown as BootstrapPlayer])
);

describe("buildLivePointsMap", () => {
    it("maps element id to total_points", () => {
        const map = buildLivePointsMap(live);
        // Element 1 in the GW2 live fixture scored 6 points.
        expect(map.get(1)).toBe(6);
        expect(map.size).toBe(live.elements.length);
    });
});

describe("buildLiveMetricsMap", () => {
    it("flattens a single fixture's explain stats into identifier -> points", () => {
        const map = buildLiveMetricsMap(live);
        const element1 = map.get(1);
        expect(element1).toEqual({ minutes: 2, clean_sheets: 4 });
    });

    it("sums the same identifier across multiple fixtures (double gameweek)", () => {
        const synthetic: LiveGameweekData = {
            elements: [
                {
                    id: 9001,
                    stats: { minutes: 180, bonus: 0, bps: 0, total_points: 8 },
                    explain: [
                        {
                            fixture: 1,
                            stats: [{ identifier: "minutes", points: 2, value: 90 }],
                        },
                        {
                            fixture: 2,
                            stats: [{ identifier: "minutes", points: 2, value: 90 }],
                        },
                    ],
                },
            ],
        };

        const map = buildLiveMetricsMap(synthetic);
        expect(map.get(9001)).toEqual({ minutes: 4 });
    });

    it("includes points_modification only when non-zero", () => {
        const synthetic: LiveGameweekData = {
            elements: [
                {
                    id: 9002,
                    stats: { minutes: 90, bonus: 0, bps: 0, total_points: 2 },
                    explain: [
                        {
                            fixture: 1,
                            stats: [
                                {
                                    identifier: "minutes",
                                    points: 2,
                                    value: 90,
                                    points_modification: 0,
                                },
                            ],
                        },
                    ],
                },
                {
                    id: 9003,
                    stats: { minutes: 90, bonus: 0, bps: 0, total_points: 3 },
                    explain: [
                        {
                            fixture: 1,
                            stats: [
                                {
                                    identifier: "minutes",
                                    points: 2,
                                    value: 90,
                                    points_modification: 1,
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const map = buildLiveMetricsMap(synthetic);
        // Zero points_modification is dropped entirely.
        expect(map.get(9002)).toEqual({ minutes: 2 });
        // Non-zero points_modification is kept and summed separately.
        expect(map.get(9003)).toEqual({ minutes: 2, points_modification: 1 });
    });
});

describe("sumPicks", () => {
    it("matches entry_history.points for a Bench Boost gameweek", () => {
        const livePoints = buildLivePointsMap(live);
        const total = sumPicks(picks.picks, livePoints);
        // This entry played Bench Boost in GW2 — every pick counts, bench included.
        expect(total).toBe(picks.entry_history.points);
        expect(total).toBe(130);
    });
});

describe("autoSubSets", () => {
    it("reads element_in/element_out from automatic_subs", () => {
        const teamDetails: TeamDetails = {
            active_chip: null,
            automatic_subs: [
                { entry: 1, element_in: 100, element_out: 200, event: 2 },
                { entry: 1, element_in: 101, element_out: 201, event: 2 },
            ],
            entry_history: { event_transfers: 0, event_transfers_cost: 0, points_on_bench: 0, points: 0 },
            picks: [],
        };

        const subs = autoSubSets(teamDetails);
        expect(subs.in.has(100)).toBe(true);
        expect(subs.in.has(101)).toBe(true);
        expect(subs.out.has(200)).toBe(true);
        expect(subs.out.has(201)).toBe(true);
        expect(subs.in.has(200)).toBe(false);
    });

    it("returns empty sets when there are no automatic subs", () => {
        const subs = autoSubSets(picks);
        expect(subs.in.size).toBe(0);
        expect(subs.out.size).toBe(0);
    });
});

describe("countPlayersToStart", () => {
    it("counts 0 for GW2 Bench Boost picks against GW3 fixtures — everyone already played", () => {
        // GW3 fixtures haven't kicked off (all `started: false`), but every picked
        // player already has live minutes > 0 from GW2, so nobody is "to start".
        const toStart = countPlayersToStart(picks.picks, live, fixtures, playersMap);
        expect(toStart).toBe(0);
    });

    it("counts a player with 0 minutes and an unstarted fixture", () => {
        const syntheticPicks: TeamPick[] = [
            { element: 9101, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
        ];

        const syntheticLive: LiveGameweekData = {
            elements: [
                {
                    id: 9101,
                    stats: { minutes: 0, bonus: 0, bps: 0, total_points: 0 },
                    explain: [],
                },
            ],
        };

        const syntheticFixtures: Fixture[] = [
            {
                id: 1,
                kickoff_time: "2026-09-04T19:00:00Z",
                started: false,
                finished: false,
                team_h: 500,
                team_a: 501,
                stats: [],
            },
        ];

        const syntheticPlayersMap = new Map<number, BootstrapPlayer>([
            [
                9101,
                {
                    id: 9101,
                    web_name: "Synthetic",
                    first_name: "Test",
                    second_name: "Player",
                    element_type: 4,
                    code: 999999,
                    now_cost: 45,
                    selected_by_percent: "0.1",
                    status: "a",
                    news: "",
                    team: 500,
                },
            ],
        ]);

        const toStart = countPlayersToStart(syntheticPicks, syntheticLive, syntheticFixtures, syntheticPlayersMap);
        expect(toStart).toBe(1);
    });
});
