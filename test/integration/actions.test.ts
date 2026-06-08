import { test, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { scorePredictions, bracketPredictions } from "@/db/schema";
import {
  resetDb,
  seedUser,
  seedTeam,
  seedMatch,
  setSettings,
} from "./helpers";

// The prediction actions depend on the iron-session helper (cookie-bound) and on
// next/cache's revalidatePath, neither of which exists outside a Next request.
// We mock both so the action's *own* logic — validation, lock enforcement, and
// the DB upsert/replace — is exercised against the real database.
let currentUser: { userId: string; displayName: string; isAdmin?: boolean } | null = null;

mock.module("next/cache", {
  namedExports: { revalidatePath: () => {}, revalidateTag: () => {} },
});
mock.module("@/lib/session", {
  namedExports: {
    requireUser: async () => {
      if (!currentUser) throw new Error("requireUser: no session in test");
      return currentUser;
    },
    getCurrentUser: async () => currentUser,
    requireAdmin: async () => {
      if (!currentUser?.isAdmin) throw new Error("requireAdmin: not admin in test");
      return currentUser;
    },
  },
});

// Imported after the mocks are registered (in before()), since the action module
// pulls in next/cache and the session helper at module load.
type Actions = typeof import("@/app/actions/predictions");
let submitScorePrediction: Actions["submitScorePrediction"];
let submitBracketPicks: Actions["submitBracketPicks"];
let resetBracketPicks: Actions["resetBracketPicks"];

const HOUR = 3600_000;

function scoreForm(matchId: number, homeScore: number | string, awayScore: number | string) {
  const fd = new FormData();
  fd.set("matchId", String(matchId));
  fd.set("homeScore", String(homeScore));
  fd.set("awayScore", String(awayScore));
  return fd;
}

before(async () => {
  assert.equal(process.env.DB_DRIVER, "pg", "integration tests must run via pnpm test:integration");
  ({ submitScorePrediction, submitBracketPicks, resetBracketPicks } = await import(
    "@/app/actions/predictions"
  ));
});

beforeEach(async () => {
  await resetDb();
  const u = await seedUser("Actor");
  currentUser = { userId: u.id, displayName: u.displayName };
});

test("submitScorePrediction stores a prediction for an open match", async () => {
  await seedMatch({ id: 1, status: "TIMED", kickoffAt: new Date(Date.now() + HOUR) });

  const res = await submitScorePrediction({ ok: false }, scoreForm(1, 2, 1));
  assert.deepEqual(res, { ok: true });

  const [row] = await db
    .select()
    .from(scorePredictions)
    .where(eq(scorePredictions.matchId, 1));
  assert.equal(row.homeScore, 2);
  assert.equal(row.awayScore, 1);
});

test("submitScorePrediction upserts on resubmission (no duplicate rows)", async () => {
  await seedMatch({ id: 1, status: "TIMED", kickoffAt: new Date(Date.now() + HOUR) });

  await submitScorePrediction({ ok: false }, scoreForm(1, 2, 1));
  const res = await submitScorePrediction({ ok: false }, scoreForm(1, 3, 0));
  assert.deepEqual(res, { ok: true });

  const rows = await db.select().from(scorePredictions).where(eq(scorePredictions.matchId, 1));
  assert.equal(rows.length, 1, "resubmitting updates the same row");
  assert.equal(rows[0].homeScore, 3);
  assert.equal(rows[0].awayScore, 0);
});

test("submitScorePrediction refuses a match that has kicked off", async () => {
  await seedMatch({ id: 1, status: "TIMED", kickoffAt: new Date(Date.now() - HOUR) });

  const res = await submitScorePrediction({ ok: false }, scoreForm(1, 2, 1));
  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /locked|kicked off/i);

  const rows = await db.select().from(scorePredictions).where(eq(scorePredictions.matchId, 1));
  assert.equal(rows.length, 0);
});

test("submitScorePrediction refuses an in-play / finished match", async () => {
  await seedMatch({ id: 1, status: "IN_PLAY", kickoffAt: new Date(Date.now() + HOUR) });
  const res = await submitScorePrediction({ ok: false }, scoreForm(1, 1, 1));
  assert.equal(res.ok, false);
});

test("submitScorePrediction rejects out-of-range scores", async () => {
  await seedMatch({ id: 1, status: "TIMED", kickoffAt: new Date(Date.now() + HOUR) });
  const res = await submitScorePrediction({ ok: false }, scoreForm(1, 99, 1));
  assert.equal(res.ok, false);
  assert.ok(res.error);
  const rows = await db.select().from(scorePredictions);
  assert.equal(rows.length, 0);
});

test("submitScorePrediction reports a missing match", async () => {
  const res = await submitScorePrediction({ ok: false }, scoreForm(9999, 1, 0));
  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /not found/i);
});

test("submitBracketPicks replaces the round and de-duplicates team ids", async () => {
  await Promise.all([seedTeam(1), seedTeam(2), seedTeam(3)]);
  // Bracket open: no LAST_32 fixtures and no explicit lock.

  const res = await submitBracketPicks("LAST_16", [1, 2, 2, 3]);
  assert.deepEqual(res, { ok: true });

  const picks = await db
    .select()
    .from(bracketPredictions)
    .where(eq(bracketPredictions.userId, currentUser!.userId));
  assert.equal(picks.length, 3, "duplicate team id collapsed to one slot");
  assert.deepEqual(picks.map((p) => p.pickedTeamId).sort((a, b) => a - b), [1, 2, 3]);

  // Resubmitting the round replaces the prior set entirely.
  const res2 = await submitBracketPicks("LAST_16", [3]);
  assert.deepEqual(res2, { ok: true });
  const after = await db
    .select()
    .from(bracketPredictions)
    .where(
      and(
        eq(bracketPredictions.userId, currentUser!.userId),
        eq(bracketPredictions.round, "LAST_16"),
      ),
    );
  assert.equal(after.length, 1);
  assert.equal(after[0].pickedTeamId, 3);
});

test("submitBracketPicks is rejected once the bracket is locked", async () => {
  await seedTeam(1);
  await setSettings({ bracketLockAt: new Date(Date.now() - HOUR) });

  const res = await submitBracketPicks("WINNER", [1]);
  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /lock/i);

  const picks = await db.select().from(bracketPredictions);
  assert.equal(picks.length, 0);
});

test("resetBracketPicks clears every round for the user", async () => {
  await Promise.all([seedTeam(1), seedTeam(2)]);
  await submitBracketPicks("LAST_16", [1, 2]);
  await submitBracketPicks("WINNER", [1]);

  let picks = await db.select().from(bracketPredictions);
  assert.equal(picks.length, 3);

  const res = await resetBracketPicks();
  assert.deepEqual(res, { ok: true });

  picks = await db.select().from(bracketPredictions);
  assert.equal(picks.length, 0);
});

test("another user's picks are untouched by reset", async () => {
  await Promise.all([seedTeam(1), seedTeam(2)]);
  const other = await seedUser("Other");
  await db.insert(bracketPredictions).values({ userId: other.id, round: "WINNER", slot: "1", pickedTeamId: 2 });

  await submitBracketPicks("WINNER", [1]);
  await resetBracketPicks();

  const remaining = await db.select().from(bracketPredictions);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].userId, other.id);
});
