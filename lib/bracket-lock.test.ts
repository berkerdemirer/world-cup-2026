import test from "node:test";
import assert from "node:assert/strict";
import {
  BRACKET_LOCK_GRACE_UNTIL,
  isBracketLocked,
  latestBracketLockAt,
} from "./bracket-lock";

test("latestBracketLockAt returns the latest valid deadline", () => {
  const earlier = new Date("2026-06-20T00:00:00Z");
  const later = new Date("2026-07-02T18:00:00Z");
  assert.equal(latestBracketLockAt(earlier, later)?.getTime(), later.getTime());
  assert.equal(latestBracketLockAt(later, earlier)?.getTime(), later.getTime());
  assert.equal(latestBracketLockAt(null, earlier)?.getTime(), earlier.getTime());
  assert.equal(latestBracketLockAt(undefined, null), null);
});

test("BRACKET_LOCK_GRACE_UNTIL is 19:30 EEST on 29 Jun 2026", () => {
  assert.equal(BRACKET_LOCK_GRACE_UNTIL.toISOString(), "2026-06-29T16:30:00.000Z");
});

test("isBracketLocked respects the effective lock time", () => {
  assert.equal(isBracketLocked(null), false);
  assert.equal(isBracketLocked(new Date(Date.now() + 60_000)), false);
  assert.equal(isBracketLocked(new Date(Date.now() - 60_000)), true);
});
