import { test } from "node:test";
import assert from "node:assert/strict";
import { isMatchLive } from "./match-status";

const kickoff = new Date("2026-06-15T18:00:00.000Z");

test("isMatchLive is true for IN_PLAY and PAUSED", () => {
  assert.equal(isMatchLive({ status: "IN_PLAY", kickoffAt: kickoff }), true);
  assert.equal(isMatchLive({ status: "PAUSED", kickoffAt: kickoff }), true);
});

test("isMatchLive is false for finished or cancelled matches", () => {
  assert.equal(isMatchLive({ status: "FINISHED", kickoffAt: kickoff }), false);
  assert.equal(isMatchLive({ status: "CANCELLED", kickoffAt: kickoff }), false);
});

test("isMatchLive treats post-kickoff TIMED matches as live until the API updates", () => {
  const future = new Date(Date.now() + 3_600_000);
  const past = new Date(Date.now() - 3_600_000);
  assert.equal(isMatchLive({ status: "TIMED", kickoffAt: future }), false);
  assert.equal(isMatchLive({ status: "TIMED", kickoffAt: past }), true);
});
