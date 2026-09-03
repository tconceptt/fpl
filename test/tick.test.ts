import { describe, expect, it } from "vitest";
import { decideTick } from "@/services/tick";
import bootstrapSlim from "./fixtures/bootstrap-slim.json";
import fixturesGw3 from "./fixtures/fixtures-gw3.json";
import type { Fixture, SlimBootstrap } from "@/lib/fpl/types";

const bootstrap = bootstrapSlim as unknown as SlimBootstrap;
const gw3Fixtures = fixturesGw3 as unknown as Fixture[];
const nextEvent = bootstrap.events.find((e) => e.is_next)!; // GW3, deadline 2026-09-04T17:30:00Z
const currentEvent = bootstrap.events.find((e) => e.is_current)!; // GW2, finished and checked

describe("decideTick reminder", () => {
  it("is not due more than 30 minutes before the deadline", () => {
    const now = new Date("2026-09-04T16:59:00Z");
    expect(decideTick({ now, nextEvent, currentEvent, fixtures: [] }).reminder).toBeNull();
  });

  it("is due inside the last 30 minutes, with the minutes left", () => {
    const now = new Date("2026-09-04T17:04:30Z");
    const { reminder } = decideTick({ now, nextEvent, currentEvent, fixtures: [] });
    expect(reminder).toEqual({ gw: 3, deadline: new Date("2026-09-04T17:30:00Z"), minutesLeft: 25 });
  });

  it("is skipped rather than sent late once the deadline has passed", () => {
    const now = new Date("2026-09-04T17:30:01Z");
    expect(decideTick({ now, nextEvent, currentEvent, fixtures: [] }).reminder).toBeNull();
  });

  it("is not due when there is no next event", () => {
    const now = new Date("2026-09-04T17:20:00Z");
    expect(decideTick({ now, nextEvent: undefined, currentEvent, fixtures: [] }).reminder).toBeNull();
  });
});

describe("decideTick recap", () => {
  const now = new Date("2026-09-06T18:00:00Z");
  const unchecked = { id: 3, finished: false, data_checked: false };

  it("waits while any fixture is still to be played", () => {
    // The GW3 fixture file was captured before kickoff: nothing has started.
    expect(decideTick({ now, nextEvent: undefined, currentEvent: unchecked, fixtures: gw3Fixtures }).recap).toBeNull();
    const oneLeft = gw3Fixtures.map((f, i) => ({ ...f, finished_provisional: i !== 0 }));
    expect(decideTick({ now, nextEvent: undefined, currentEvent: unchecked, fixtures: oneLeft }).recap).toBeNull();
  });

  it("fires at the final whistle of the last fixture, on provisional bonus", () => {
    const allDone = gw3Fixtures.map((f) => ({ ...f, finished_provisional: true, finished: false }));
    expect(decideTick({ now, nextEvent: undefined, currentEvent: unchecked, fixtures: allDone }).recap).toEqual({ gw: 3 });
  });

  it("never recaps a gameweek FPL has already checked", () => {
    const allDone = gw3Fixtures.map((f) => ({ ...f, finished_provisional: true, finished: true }));
    expect(decideTick({ now, nextEvent: undefined, currentEvent, fixtures: allDone }).recap).toBeNull();
  });

  it("needs at least one fixture in the event", () => {
    expect(decideTick({ now, nextEvent: undefined, currentEvent: unchecked, fixtures: [] }).recap).toBeNull();
  });
});
