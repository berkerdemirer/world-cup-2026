import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  assertMatchOpen,
  assertBracketOpen,
  isBracketLocked,
  getBracketLockAt,
  getSettings,
  LockedError,
} from "@/lib/scoring";
import {
  getMatchesWithTeams,
  getMatchPredictions,
  getUserBracketPicks,
  isMatchLocked,
} from "@/lib/queries";
import {
  resetDb,
  seedUser,
  seedTeam,
  seedMatch,
  seedScorePrediction,
  seedBracketPick,
  setSettings,
} from "./helpers";

const HOUR = 3600_000;

before(() => {
  assert.equal(process.env.DB_DRIVER, "pg", "integration tests must run via pnpm test:integration");
});

beforeEach(async () => {
  await resetDb();
});

test("assertMatchOpen allows a scheduled future match", () => {
  assert.doesNotThrow(() =>
    assertMatchOpen({ status: "TIMED", kickoffAt: new Date(Date.now() + HOUR) }),
  );
  assert.doesNotThrow(() =>
    assertMatchOpen({ status: "SCHEDULED", kickoffAt: new Date(Date.now() + HOUR) }),
  );
});

test("assertMatchOpen locks once kickoff has passed", () => {
  assert.throws(
    () => assertMatchOpen({ status: "TIMED", kickoffAt: new Date(Date.now() - HOUR) }),
    LockedError,
  );
});

test("assertMatchOpen locks any non-scheduled status (in play / finished)", () => {
  for (const status of ["IN_PLAY", "PAUSED", "FINISHED", "SUSPENDED"] as const) {
    assert.throws(
      () => assertMatchOpen({ status, kickoffAt: new Date(Date.now() + HOUR) }),
      LockedError,
      `status ${status} should lock`,
    );
  }
});

test("isMatchLocked mirrors assertMatchOpen", () => {
  assert.equal(isMatchLocked({ status: "TIMED", kickoffAt: new Date(Date.now() + HOUR) }), false);
  assert.equal(isMatchLocked({ status: "TIMED", kickoffAt: new Date(Date.now() - HOUR) }), true);
  assert.equal(isMatchLocked({ status: "FINISHED", kickoffAt: new Date(Date.now() + HOUR) }), true);
});

test("isBracketLocked compares against the lock time", () => {
  assert.equal(isBracketLocked(null), false);
  assert.equal(isBracketLocked(new Date(Date.now() + HOUR)), false);
  assert.equal(isBracketLocked(new Date(Date.now() - HOUR)), true);
});

test("getBracketLockAt derives from the first LAST_32 kickoff when unset", async () => {
  const s = await getSettings();
  assert.equal(s.bracketLockAt, null);

  // No knockout fixtures yet -> no derivable lock.
  assert.equal(await getBracketLockAt(s), null);

  const firstKnockout = new Date("2026-07-01T18:00:00Z");
  await seedMatch({ id: 500, stage: "LAST_32", status: "SCHEDULED", kickoffAt: new Date("2026-07-02T18:00:00Z") });
  await seedMatch({ id: 501, stage: "LAST_32", status: "SCHEDULED", kickoffAt: firstKnockout });

  const derived = await getBracketLockAt(s);
  assert.ok(derived);
  assert.equal(derived.getTime(), firstKnockout.getTime(), "uses the earliest LAST_32 kickoff");
});

test("getBracketLockAt prefers an explicit setting over the derived time", async () => {
  const explicit = new Date("2026-06-20T00:00:00Z");
  await setSettings({ bracketLockAt: explicit });
  await seedMatch({ id: 502, stage: "LAST_32", status: "SCHEDULED", kickoffAt: new Date("2026-07-02T18:00:00Z") });

  const s = await getSettings();
  const lock = await getBracketLockAt(s);
  assert.ok(lock);
  assert.equal(lock.getTime(), explicit.getTime());
});

test("assertBracketOpen throws once the bracket lock has passed", () => {
  assert.doesNotThrow(() => assertBracketOpen(new Date(Date.now() + HOUR)));
  assert.doesNotThrow(() => assertBracketOpen(null));
  assert.throws(() => assertBracketOpen(new Date(Date.now() - HOUR)), LockedError);
});

test("getMatchesWithTeams joins team rows and preserves placeholders", async () => {
  await seedTeam(764, "Brazil");
  await seedTeam(762, "Serbia");
  await seedMatch({ id: 1, status: "FINISHED", homeTeamId: 764, awayTeamId: 762, kickoffAt: new Date(Date.now() - HOUR) });
  // A match with an unresolved away side.
  const future = await seedMatch({ id: 2, stage: "LAST_16", homeTeamId: 764, awayTeamId: null, kickoffAt: new Date(Date.now() + HOUR) });
  void future;

  const rows = await getMatchesWithTeams();
  assert.equal(rows.length, 2);
  // Ordered by kickoff ascending: the past match (1) comes first.
  assert.equal(rows[0].id, 1);
  assert.equal(rows[0].homeTeam?.name, "Brazil");
  assert.equal(rows[0].awayTeam?.name, "Serbia");
  assert.equal(rows[1].awayTeam, null);
});

test("getMatchPredictions returns everyone's picks for a match, sorted by name", async () => {
  await seedTeam(764, "Brazil");
  await seedTeam(762, "Serbia");
  await seedMatch({ id: 1, status: "FINISHED", homeTeamId: 764, awayTeamId: 762 });

  const zoe = await seedUser("Zoe");
  const ann = await seedUser("Ann");
  await seedScorePrediction(zoe.id, 1, 1, 1);
  await seedScorePrediction(ann.id, 1, 2, 0);

  const preds = await getMatchPredictions(1);
  assert.deepEqual(preds.map((p) => p.displayName), ["Ann", "Zoe"]);
  assert.deepEqual(preds[0], { displayName: "Ann", homeScore: 2, awayScore: 0 });
});

test("getUserBracketPicks groups picks by round", async () => {
  await seedTeam(773, "France");
  await seedTeam(765, "Portugal");
  const u = await seedUser("Picker");
  await seedBracketPick(u.id, "LAST_16", "1", 773);
  await seedBracketPick(u.id, "LAST_16", "2", 765);
  await seedBracketPick(u.id, "WINNER", "1", 773);

  const picks = await getUserBracketPicks(u.id);
  assert.deepEqual([...picks.LAST_16].sort((a, b) => a - b), [765, 773]);
  assert.deepEqual(picks.WINNER, [773]);
});
