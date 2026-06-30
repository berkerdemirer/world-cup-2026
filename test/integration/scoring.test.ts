import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, scores } from "@/db/schema";
import { recomputeScores } from "@/lib/scoring";
import { getLeaderboard } from "@/lib/queries";
import {
  resetDb,
  seedUser,
  seedTeam,
  seedMatch,
  seedScorePrediction,
  seedBracketPick,
} from "./helpers";

// Default settings points (from the schema): exact 4, goal_diff 3, outcome 2;
// bracket R32 1, R16 2, QF 4, SF 6, FINAL 8, WINNER 12.

before(() => {
  assert.equal(process.env.DB_DRIVER, "pg", "integration tests must run via pnpm test:integration");
});

beforeEach(async () => {
  await resetDb();
});

async function scoreFor(userId: string) {
  const [row] = await db.select().from(scores).where(eq(scores.userId, userId));
  return row;
}

test("recomputeScores awards match points by tier and counts exacts", async () => {
  const [bra, srb, esp, cro] = await Promise.all([
    seedTeam(764, "Brazil"),
    seedTeam(762, "Serbia"),
    seedTeam(760, "Spain"),
    seedTeam(799, "Croatia"),
  ]);
  void bra; void srb; void esp; void cro;

  await seedMatch({ id: 1, status: "FINISHED", homeTeamId: 764, awayTeamId: 762, homeScore: 2, awayScore: 0 });
  await seedMatch({ id: 2, status: "FINISHED", homeTeamId: 760, awayTeamId: 799, homeScore: 1, awayScore: 1 });
  // Not finished — predictions on it must not score.
  await seedMatch({ id: 3, status: "TIMED", homeTeamId: 764, awayTeamId: 760, homeScore: null, awayScore: null });

  const a = await seedUser("Ada");
  const b = await seedUser("Bo");
  const c = await seedUser("Cy");

  // Match 1 (actual 2-0)
  await seedScorePrediction(a.id, 1, 2, 0); // exact
  await seedScorePrediction(b.id, 1, 1, 0); // outcome (home win, wrong margin)
  await seedScorePrediction(c.id, 1, 0, 1); // none (predicted away win)
  // Match 2 (actual 1-1 draw) — a correct-but-wrong-score draw scores at the
  // outcome tier, not goal_diff (a draw has no winning margin to reward).
  await seedScorePrediction(a.id, 2, 0, 0); // outcome (draw, wrong score)
  await seedScorePrediction(b.id, 2, 2, 2); // outcome (draw, wrong score)
  // Match 3 not finished
  await seedScorePrediction(a.id, 3, 1, 0); // ignored

  await recomputeScores();

  const sa = await scoreFor(a.id);
  assert.equal(sa.matchPoints, 4 + 2, "exact + outcome");
  assert.equal(sa.exactCount, 1);
  assert.equal(sa.goalDiffCount, 0);
  assert.equal(sa.outcomeCount, 1);
  assert.equal(sa.bracketPoints, 0);
  assert.equal(sa.totalPoints, 6);

  const sb = await scoreFor(b.id);
  assert.equal(sb.matchPoints, 2 + 2, "outcome + outcome");
  assert.equal(sb.exactCount, 0);
  assert.equal(sb.goalDiffCount, 0);
  assert.equal(sb.outcomeCount, 2);

  const sc = await scoreFor(c.id);
  assert.equal(sc.matchPoints, 0);
  assert.equal(sc.totalPoints, 0);
});

test("recomputeScores awards bracket points using teams that reached each round", async () => {
  await Promise.all([
    seedTeam(773, "France"),
    seedTeam(815, "Morocco"),
    seedTeam(765, "Portugal"),
    seedTeam(762, "Serbia"),
  ]);

  // France & Morocco reached LAST_16; France & Portugal reached the FINAL;
  // France is the tournament winner (advancingTeamId of the FINAL).
  await seedMatch({ id: 100, stage: "LAST_16", status: "FINISHED", homeTeamId: 773, awayTeamId: 815, homeScore: 2, awayScore: 1, advancingTeamId: 773 });
  await seedMatch({ id: 200, stage: "FINAL", status: "FINISHED", homeTeamId: 773, awayTeamId: 765, homeScore: 3, awayScore: 1, advancingTeamId: 773 });

  const u = await seedUser("Bracketeer");
  await seedBracketPick(u.id, "LAST_16", "1", 773); // France reached -> +2
  await seedBracketPick(u.id, "LAST_16", "2", 762); // Serbia did NOT -> 0
  await seedBracketPick(u.id, "FINAL", "1", 765);    // Portugal reached final -> +8
  await seedBracketPick(u.id, "WINNER", "1", 773);   // France won -> +12

  await recomputeScores();

  const s = await scoreFor(u.id);
  assert.equal(s.bracketPoints, 2 + 8 + 12);
  assert.equal(s.matchPoints, 0);
  assert.equal(s.totalPoints, 22);
});

test("recomputeScores is idempotent and reflects corrected results", async () => {
  await seedTeam(764, "Brazil");
  await seedTeam(762, "Serbia");
  await seedMatch({ id: 1, status: "FINISHED", homeTeamId: 764, awayTeamId: 762, homeScore: 2, awayScore: 0 });
  const u = await seedUser("Re");
  await seedScorePrediction(u.id, 1, 2, 0); // exact under the first result

  await recomputeScores();
  assert.equal((await scoreFor(u.id)).totalPoints, 4);

  // Running again changes nothing.
  await recomputeScores();
  assert.equal((await scoreFor(u.id)).totalPoints, 4);

  // Admin corrects the score to 1-0; the same prediction is now only "outcome".
  await db.update(matches).set({ homeScore: 1, awayScore: 0 }).where(eq(matches.id, 1));
  await recomputeScores();
  const s = await scoreFor(u.id);
  assert.equal(s.totalPoints, 2, "recompute must reflect the corrected result");
  assert.equal(s.exactCount, 0);
});

test("recomputeScores writes a zero row for users with no correct predictions", async () => {
  await seedTeam(764, "Brazil");
  await seedTeam(762, "Serbia");
  await seedMatch({ id: 1, status: "FINISHED", homeTeamId: 764, awayTeamId: 762, homeScore: 2, awayScore: 0 });

  const winner = await seedUser("Win");
  const loser = await seedUser("Lose");
  await seedScorePrediction(winner.id, 1, 2, 0);
  await seedScorePrediction(loser.id, 1, 0, 2);

  await recomputeScores();

  assert.equal((await scoreFor(winner.id)).totalPoints, 4);
  const sl = await scoreFor(loser.id);
  assert.ok(sl, "a row should still exist for the losing predictor");
  assert.equal(sl.totalPoints, 0);
});

test("recomputeScores grades knockouts on post-extra-time score, not pens", async () => {
  await seedTeam(1, "Germany");
  await seedTeam(2, "Paraguay");
  // football-data.org stored fullTime with pens baked in (5-6); actual post-ET was 1-1.
  await seedMatch({
    id: 50,
    stage: "LAST_32",
    status: "FINISHED",
    homeTeamId: 1,
    awayTeamId: 2,
    homeScore: 5,
    awayScore: 6,
    homePens: 4,
    awayPens: 5,
    advancingTeamId: 2,
  });

  const andrei = await seedUser("Andrei");
  const cardo = await seedUser("Cardo");
  await seedScorePrediction(andrei.id, 50, 2, 3); // would match GD -1 on 5-6, not on 1-1
  await seedScorePrediction(cardo.id, 50, 2, 2); // correct draw outcome after ET

  await recomputeScores();

  assert.equal((await scoreFor(andrei.id)).totalPoints, 0);
  assert.equal((await scoreFor(cardo.id)).totalPoints, 2, "2-2 vs 1-1 is a correct draw outcome");
});

test("recomputeScores awards bracket points to pen winners before next-round fixtures exist", async () => {
  await seedTeam(100, "Germany");
  await seedTeam(200, "Paraguay");
  await seedMatch({
    id: 50,
    stage: "LAST_32",
    status: "FINISHED",
    homeTeamId: 100,
    awayTeamId: 200,
    homeScore: 1,
    awayScore: 1,
    homePens: 4,
    awayPens: 5,
    advancingTeamId: null,
  });

  const u = await seedUser("Bracket");
  await seedBracketPick(u.id, "LAST_16", "1", 200);

  await recomputeScores();

  assert.equal((await scoreFor(u.id)).bracketPoints, 2, "Paraguay reached R16 via pens");
});

test("getLeaderboard ranks by total, then exact count, then join time", async () => {
  await seedTeam(764, "Brazil");
  await seedTeam(762, "Serbia");
  await seedTeam(760, "Spain");
  await seedTeam(799, "Croatia");
  await seedMatch({ id: 1, status: "FINISHED", homeTeamId: 764, awayTeamId: 762, homeScore: 2, awayScore: 0 });
  await seedMatch({ id: 2, status: "FINISHED", homeTeamId: 760, awayTeamId: 799, homeScore: 3, awayScore: 1 });

  const early = await seedUser("Early", { createdAt: new Date("2026-01-01T00:00:00Z") });
  const late = await seedUser("Late", { createdAt: new Date("2026-02-01T00:00:00Z") });
  const top = await seedUser("Top", { createdAt: new Date("2026-03-01T00:00:00Z") });

  // Top: two exacts -> 8 pts.
  await seedScorePrediction(top.id, 1, 2, 0);
  await seedScorePrediction(top.id, 2, 3, 1);
  // Early & Late: same 4-pt total, but Early has the exact, Late only goal_diff(+outcome).
  await seedScorePrediction(early.id, 1, 2, 0); // exact (4)
  await seedScorePrediction(late.id, 1, 1, 0);  // outcome (2)
  await seedScorePrediction(late.id, 2, 1, 0);  // outcome (2) -> total 4, 0 exacts

  await recomputeScores();
  const board = await getLeaderboard();

  assert.deepEqual(
    board.map((r) => r.displayName),
    ["Top", "Early", "Late"],
  );
  assert.deepEqual(board.map((r) => r.rank), [1, 2, 3]);
  assert.equal(board[0].totalPoints, 8);
  assert.equal(board[1].totalPoints, 4);
  assert.equal(board[1].exactCount, 1);
  assert.equal(board[2].totalPoints, 4);
  assert.equal(board[2].exactCount, 0);
});
