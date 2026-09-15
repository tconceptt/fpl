import { describe, expect, it } from "vitest";
import {
    autoSubSets,
    buildLiveMetricsMap,
    buildLivePointsMap,
    countPlayersToStart,
    resolveProvisionalPicks,
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

describe("resolveProvisionalPicks", () => {
    // Players: 1 GK, 2 DEF (one bench), 3 MID, 1 FWD... a minimal 15 built from
    // synthetic element types so the formation rules are exercised directly.
    const players: Map<number, BootstrapPlayer> = new Map(
        [
            [101, 1, 1], [102, 1, 2], // GKs: 101 starts (club 1), 102 bench (club 2)
            [201, 2, 1], [202, 2, 1], [203, 2, 1], [204, 2, 3], // DEFs: 204 bench (club 3)
            [301, 3, 1], [302, 3, 1], [303, 3, 2], [304, 3, 1], [305, 3, 4], // MIDs: 305 bench (club 4)
            [401, 4, 1], [402, 4, 2], [403, 4, 3], // FWDs: 403 bench (club 3)
            [999, 3, 1], // extra mid, bench
        ].map(([id, element_type, team]) => [
            id,
            { id, element_type, team, web_name: String(id) } as unknown as BootstrapPlayer,
        ])
    );

    const clubDone = (team: number, provisional = false): Fixture =>
        ({ id: team, team_h: team, team_a: 99, started: true, finished: !provisional, finished_provisional: true } as Fixture);
    const clubPending = (team: number): Fixture =>
        ({ id: team, team_h: team, team_a: 99, started: false, finished: false, finished_provisional: false } as Fixture);

    const liveWith = (minutes: Record<number, number>): LiveGameweekData => ({
        elements: [...players.keys()].map((id) => ({
            id,
            stats: { minutes: minutes[id] ?? 90, total_points: 2, bonus: 0, bps: 0 },
            explain: [],
        })),
    });

    const pick = (element: number, position: number, extra: Partial<TeamPick> = {}): TeamPick => ({
        element,
        position,
        multiplier: position <= 11 ? 1 : 0,
        is_captain: false,
        is_vice_captain: false,
        ...extra,
    });

    const team = (overrides: Partial<TeamDetails> = {}): TeamDetails => ({
        active_chip: null,
        automatic_subs: [],
        entry_history: { event_transfers: 0, event_transfers_cost: 0, points_on_bench: 0, points: 0 },
        picks: [
            pick(101, 1),
            pick(201, 2), pick(202, 3), pick(203, 4),
            pick(301, 5, { is_captain: true, multiplier: 2 }), pick(302, 6, { is_vice_captain: true }), pick(303, 7), pick(304, 8),
            pick(401, 9), pick(402, 10), pick(999, 11),
            pick(102, 12), pick(204, 13), pick(305, 14), pick(403, 15),
        ],
        ...overrides,
    });

    const mult = (picks: TeamPick[], element: number) => picks.find((p) => p.element === element)!.multiplier;

    it("subs a blanked starter for the first bench player who played, once their club is done", () => {
        // 303 (club 2, MID) blanked and club 2 is done; bench order 204 (DEF, played), 305, 403.
        const out = resolveProvisionalPicks(team(), liveWith({ 303: 0 }), [clubDone(1), clubDone(2, true), clubDone(3), clubDone(4)], players);
        expect(mult(out, 303)).toBe(0);
        expect(mult(out, 204)).toBe(1);
        expect(mult(out, 305)).toBe(0);
    });

    it("leaves the starter in while their club still has a fixture to play", () => {
        const out = resolveProvisionalPicks(team(), liveWith({ 303: 0 }), [clubDone(1), clubPending(2), clubDone(3), clubDone(4)], players);
        expect(mult(out, 303)).toBe(1);
        expect(mult(out, 204)).toBe(0);
    });

    it("waits on a bench player whose fixture is still to come rather than skipping past them", () => {
        // 204's club 3 hasn't played: don't jump to 305, hold the sub.
        const out = resolveProvisionalPicks(team(), liveWith({ 303: 0, 204: 0 }), [clubDone(1), clubDone(2), clubPending(3), clubDone(4)], players);
        expect(mult(out, 303)).toBe(1);
        expect(mult(out, 305)).toBe(0);
    });

    it("skips a bench player who also blanked and keeps the formation legal", () => {
        // 402 (FWD, club 2) blanked; 204 blanked too; 305 (MID) would leave 1 FWD → fine since 401 remains.
        // Then 401 (FWD) also blanked: 403 (FWD) must come in, not another MID that would drop FWD to 0.
        const out = resolveProvisionalPicks(
            team(),
            liveWith({ 402: 0, 204: 0, 401: 0 }),
            [clubDone(1), clubDone(2), clubDone(3), clubDone(4)],
            players
        );
        expect(mult(out, 402)).toBe(0);
        expect(mult(out, 305)).toBe(1); // replaces 402 (FWD count 2 → 1, still legal)
        expect(mult(out, 401)).toBe(0);
        expect(mult(out, 403)).toBe(1); // only a FWD keeps ≥1 FWD
        expect(mult(out, 204)).toBe(0);
    });

    it("only swaps a goalkeeper for the bench goalkeeper", () => {
        const out = resolveProvisionalPicks(team(), liveWith({ 101: 0 }), [clubDone(1), clubDone(2), clubDone(3), clubDone(4)], players);
        expect(mult(out, 101)).toBe(0);
        expect(mult(out, 102)).toBe(1);
        expect(mult(out, 204)).toBe(0);
    });

    it("moves the armband to the vice-captain, keeping a Triple Captain's ×3", () => {
        const tc = team({ active_chip: "3xc" });
        tc.picks.find((p) => p.is_captain)!.multiplier = 3;
        const out = resolveProvisionalPicks(tc, liveWith({ 301: 0 }), [clubDone(1), clubDone(2), clubDone(3), clubDone(4)], players);
        expect(mult(out, 302)).toBe(3);
        expect(mult(out, 301)).toBe(0); // subbed out for 204 as well
        expect(mult(out, 204)).toBe(1);
    });

    it("is a no-op once the API has applied its own subs, under Bench Boost, or without a fixture list", () => {
        const done = team({ automatic_subs: [{ entry: 1, element_in: 204, element_out: 303, event: 1 }] });
        expect(resolveProvisionalPicks(done, liveWith({ 303: 0 }), [clubDone(2)], players).map((p) => p.multiplier)).toEqual(done.picks.map((p) => p.multiplier));
        const bb = team({ active_chip: "bboost" });
        expect(mult(resolveProvisionalPicks(bb, liveWith({ 303: 0 }), [clubDone(2)], players), 303)).toBe(1);
        expect(mult(resolveProvisionalPicks(team(), liveWith({ 303: 0 }), [], players), 303)).toBe(1);
    });
});
