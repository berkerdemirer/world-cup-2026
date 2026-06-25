import { test } from "node:test";
import assert from "node:assert/strict";
import { compareMatchesByKickoff, fixtureSectionOf, formatFixtureDate, formatFixtureTime, formatLiveMinute, formatLiveClock } from "./format";

test("formatFixtureTime and formatFixtureDate use host timezone, not runtime local", () => {
  // 9pm Eastern on Monday = Tuesday 01:00 UTC.
  const kickoff = new Date("2026-06-16T01:00:00.000Z");

  assert.equal(formatFixtureTime(kickoff), "21:00");
  assert.equal(formatFixtureDate(kickoff), "Jun 15");
  assert.equal(formatFixtureDate(kickoff, { uppercase: true }), "JUN 15");
});

test("compareMatchesByKickoff orders by kickoff then match id", () => {
  const kickoff = new Date("2026-06-15T18:00:00Z");
  const later = new Date("2026-06-15T21:00:00Z");

  assert.equal(
    compareMatchesByKickoff({ kickoffAt: kickoff, id: 20 }, { kickoffAt: kickoff, id: 10 }),
    10,
  );
  assert.ok(
    compareMatchesByKickoff({ kickoffAt: kickoff, id: 10 }, { kickoffAt: later, id: 5 }) < 0,
  );
});

test("fixtureSectionOf groups evening kickoffs by host calendar day, not UTC", () => {
  // 9pm Eastern on Monday = Tuesday 01:00 UTC — common "night game" boundary.
  const kickoff = new Date("2026-06-16T01:00:00.000Z");

  const host = fixtureSectionOf(
    { stage: "GROUP_STAGE", kickoffAt: kickoff },
    { timeZone: "America/New_York" },
  );
  assert.equal(host.key, "d20260615");
  assert.match(host.label, /^Mon/);

  const utc = fixtureSectionOf(
    { stage: "GROUP_STAGE", kickoffAt: kickoff },
    { timeZone: "UTC" },
  );
  assert.equal(utc.key, "d20260616");
  assert.match(utc.label, /^Tue/);
});

test("fixtureSectionOf leaves knockout matches grouped by stage", () => {
  const section = fixtureSectionOf({
    stage: "LAST_16",
    kickoffAt: new Date("2026-07-05T01:00:00.000Z"),
  });
  assert.equal(section.key, "LAST_16");
  assert.equal(section.label, "Round of 16");
});

test("formatLiveMinute renders regulation minutes", () => {
  assert.equal(formatLiveMinute({ minute: 67, injuryTime: null }), "67'");
});

test("formatLiveMinute renders stoppage time", () => {
  assert.equal(formatLiveMinute({ minute: 45, injuryTime: 2 }), "45+2'");
});

test("formatLiveMinute returns null when minute is unknown", () => {
  assert.equal(formatLiveMinute({ minute: null, injuryTime: null }), null);
});

test("formatLiveClock shows HT when the match is paused for half-time", () => {
  assert.equal(
    formatLiveClock({ status: "PAUSED", minute: 45, injuryTime: 3 }),
    "HT",
  );
});

test("formatLiveClock shows the minute while the match is in play", () => {
  assert.equal(
    formatLiveClock({ status: "IN_PLAY", minute: 67, injuryTime: null }),
    "67'",
  );
});
