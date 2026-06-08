/**
 * End-to-end smoke test against a real (Neon) test database.
 *
 * Unlike the Docker-backed integration suite (scripts/test-integration.mjs),
 * this runs against the live DATABASE_TEST_URL — which already has the schema
 * applied — to prove the full stack works end-to-end with the production
 * neon-http driver: seed teams/matches/users/predictions, set win/lose/draw
 * results, run the REAL recomputeScores(), and assert the REAL getLeaderboard()
 * returns the hand-computed standings.
 *
 * Usage:  pnpm test:smoke
 *
 * Safety: it only ever connects to DATABASE_TEST_URL and refuses to run if that
 * happens to equal DATABASE_URL (your prod/dev DB), because it TRUNCATEs tables.
 */
import "dotenv/config";

// ---- Resolve the target DB BEFORE importing anything that opens a connection.
const TEST_URL = process.env.DATABASE_TEST_URL;
if (!TEST_URL) {
  console.error("✗ DATABASE_TEST_URL is not set. Add it to your .env and retry.");
  process.exit(1);
}
if (TEST_URL === process.env.DATABASE_URL) {
  console.error(
    "✗ DATABASE_TEST_URL equals DATABASE_URL. Refusing to seed/TRUNCATE the primary database.",
  );
  process.exit(1);
}
// The db module reads DATABASE_URL lazily on first query — repoint it at the
// test DB and keep the production neon-http driver (no DB_DRIVER=pg here).
process.env.DATABASE_URL = TEST_URL;

// Imported inside run() (after DATABASE_URL is set, before any query) and shared
// with the helpers below via this single binding.
type Mods = {
  sql: typeof import("drizzle-orm").sql;
  eq: typeof import("drizzle-orm").eq;
  db: typeof import("@/db").db;
  schema: typeof import("@/db/schema");
  recomputeScores: typeof import("@/lib/scoring").recomputeScores;
  getLeaderboard: typeof import("@/lib/queries").getLeaderboard;
};
let m!: Mods;

async function loadModules(): Promise<void> {
  const drizzle = await import("drizzle-orm");
  const dbMod = await import("@/db");
  const schema = await import("@/db/schema");
  const scoring = await import("@/lib/scoring");
  const queries = await import("@/lib/queries");
  m = {
    sql: drizzle.sql,
    eq: drizzle.eq,
    db: dbMod.db,
    schema,
    recomputeScores: scoring.recomputeScores,
    getLeaderboard: queries.getLeaderboard,
  };
}

// ---------------------------------------------------------------------------
// Tiny assertion harness — collect failures, exit non-zero if any.
// ---------------------------------------------------------------------------
let passed = 0;
const failures: string[] = [];
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}\n      expected ${e}\n      actual   ${a}`);
    console.log(`  ✗ ${label} — expected ${e}, got ${a}`);
  }
}

// Real football-data.org team ids (mirrors the integration fixtures).
const BRA = 764, SRB = 762, ESP = 760, CRO = 799, FRA = 773, MAR = 815, POR = 765, ARG = 758;

async function reset() {
  const { db, sql } = m;
  // Belt-and-braces: confirm we're on the test host before truncating.
  const host = new URL(TEST_URL!).hostname;
  console.log(`\nResetting test DB (${host})…`);
  await db.execute(
    sql`TRUNCATE TABLE scores, bracket_predictions, score_predictions, matches, teams, users, settings RESTART IDENTITY CASCADE`,
  );
}

async function seed() {
  const { db } = m;
  const { users, teams, matches, scorePredictions, bracketPredictions, scores, settings } = m.schema;
  console.log("Seeding teams, matches, users, predictions…");

  // Default scoring settings (exact 4, goal_diff 3, outcome 2; bracket 1/2/4/6/8/12).
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();

  await db.insert(teams).values([
    { id: BRA, name: "Brazil", tla: "BRA", groupLabel: "G" },
    { id: SRB, name: "Serbia", tla: "SRB", groupLabel: "G" },
    { id: ESP, name: "Spain", tla: "ESP", groupLabel: "E" },
    { id: CRO, name: "Croatia", tla: "CRO", groupLabel: "E" },
    { id: FRA, name: "France", tla: "FRA", groupLabel: "C" },
    { id: MAR, name: "Morocco", tla: "MAR", groupLabel: "C" },
    { id: POR, name: "Portugal", tla: "POR", groupLabel: "F" },
    { id: ARG, name: "Argentina", tla: "ARG", groupLabel: "A" },
  ]);

  const ko = (id: number) => new Date(`2026-07-0${id}T18:00:00Z`);
  await db.insert(matches).values([
    // Finished group games: home win, draw, home win.
    { id: 1, stage: "GROUP_STAGE", status: "FINISHED", kickoffAt: ko(1), homeTeamId: BRA, awayTeamId: SRB, homeScore: 2, awayScore: 0 },
    { id: 2, stage: "GROUP_STAGE", status: "FINISHED", kickoffAt: ko(2), homeTeamId: ESP, awayTeamId: CRO, homeScore: 1, awayScore: 1 },
    { id: 3, stage: "GROUP_STAGE", status: "FINISHED", kickoffAt: ko(3), homeTeamId: FRA, awayTeamId: MAR, homeScore: 3, awayScore: 1 },
    // Not finished — any prediction on it must be ignored by scoring.
    { id: 4, stage: "GROUP_STAGE", status: "SCHEDULED", kickoffAt: new Date(Date.now() + 86_400_000), homeTeamId: BRA, awayTeamId: ESP },
    // Knockout ladder, France runs the table (advancingTeamId on each).
    { id: 100, stage: "LAST_16", status: "FINISHED", kickoffAt: ko(4), homeTeamId: FRA, awayTeamId: MAR, homeScore: 2, awayScore: 1, advancingTeamId: FRA },
    { id: 110, stage: "QUARTER_FINALS", status: "FINISHED", kickoffAt: ko(5), homeTeamId: FRA, awayTeamId: POR, homeScore: 1, awayScore: 0, advancingTeamId: FRA },
    { id: 120, stage: "SEMI_FINALS", status: "FINISHED", kickoffAt: ko(6), homeTeamId: FRA, awayTeamId: ESP, homeScore: 2, awayScore: 1, advancingTeamId: FRA },
    { id: 200, stage: "FINAL", status: "FINISHED", kickoffAt: ko(7), homeTeamId: FRA, awayTeamId: ARG, homeScore: 0, awayScore: 0, homePens: 4, awayPens: 2, advancingTeamId: FRA },
  ]);

  // Players, with explicit join times to exercise the leaderboard tiebreak.
  const seedUser = async (displayName: string, createdAt: string, isAdmin = false) => {
    const [u] = await db.insert(users).values({ displayName, isAdmin, createdAt: new Date(createdAt) }).returning();
    await db.insert(scores).values({ userId: u.id }).onConflictDoNothing();
    return u;
  };
  const ada = await seedUser("Ada", "2026-01-01T00:00:00Z");
  const dee = await seedUser("Dee", "2026-01-15T00:00:00Z", true); // admin
  const bo = await seedUser("Bo", "2026-02-01T00:00:00Z");
  const cy = await seedUser("Cy", "2026-03-01T00:00:00Z");

  const pred = (userId: string, matchId: number, h: number, a: number) =>
    db.insert(scorePredictions).values({ userId, matchId, homeScore: h, awayScore: a });

  // M1 Brazil 2-0 (home win, GD+2)
  await pred(ada.id, 1, 2, 0); // exact      +4
  await pred(bo.id, 1, 1, 0);  // outcome    +2
  await pred(cy.id, 1, 3, 1);  // goal_diff  +3
  await pred(dee.id, 1, 0, 1); // miss (away)+0
  // M2 Spain 1-1 (draw)
  await pred(ada.id, 2, 0, 0); // goal_diff  +3
  await pred(bo.id, 2, 1, 1);  // exact      +4
  await pred(cy.id, 2, 2, 2);  // goal_diff  +3
  await pred(dee.id, 2, 1, 0); // miss (home)+0
  // M3 France 3-1 (home win, GD+2)
  await pred(ada.id, 3, 3, 1); // exact      +4
  await pred(bo.id, 3, 2, 1);  // outcome    +2
  await pred(cy.id, 3, 1, 0);  // outcome    +2
  await pred(dee.id, 3, 3, 1); // exact      +4
  // M4 not finished — must be ignored.
  await pred(ada.id, 4, 1, 0);

  // Bracket: reached sets are L16{FRA,MAR} QF{FRA,POR} SF{FRA,ESP} FINAL{FRA,ARG} WINNER{FRA}.
  const bpick = (userId: string, round: string, slot: string, pickedTeamId: number) =>
    db.insert(bracketPredictions).values({ userId, round: round as never, slot, pickedTeamId });
  // Ada: France L16 (+2), Portugal QF (+4), France winner (+12) = 18
  await bpick(ada.id, "LAST_16", "1", FRA);
  await bpick(ada.id, "QUARTER_FINALS", "1", POR);
  await bpick(ada.id, "WINNER", "1", FRA);
  // Bo: Serbia L16 (miss 0), Argentina FINAL (+8) = 8
  await bpick(bo.id, "LAST_16", "1", SRB);
  await bpick(bo.id, "FINAL", "1", ARG);
  // Cy: Spain SF (+6), Portugal winner (miss 0) = 6
  await bpick(cy.id, "SEMI_FINALS", "1", ESP);
  await bpick(cy.id, "WINNER", "1", POR);
  // Dee: France winner (+12) = 12
  await bpick(dee.id, "WINNER", "1", FRA);

  return { ada, bo, cy, dee };
}

async function main() {
  await loadModules();
  const { db, sql, eq, recomputeScores, getLeaderboard } = m;
  const { matches, scores } = m.schema;

  await reset();
  const { ada, bo, cy, dee } = await seed();

  console.log("\nRunning recomputeScores()…");
  await recomputeScores();

  console.log("\nVerifying seeded row counts:");
  const count = async (t: string) =>
    Number((await db.execute(sql`SELECT count(*)::int AS n FROM ${sql.raw(t)}`)).rows[0].n);
  check("teams seeded", await count("teams"), 8);
  check("matches seeded", await count("matches"), 8);
  check("users seeded", await count("users"), 4);
  check("score predictions seeded", await count("score_predictions"), 13);
  check("bracket predictions seeded", await count("bracket_predictions"), 8);

  const scoreFor = async (userId: string) =>
    (await db.select().from(scores).where(eq(scores.userId, userId)))[0];

  console.log("\nVerifying per-player scores (match / bracket / total / exact):");
  const sa = await scoreFor(ada.id);
  check("Ada match points", sa.matchPoints, 11);
  check("Ada bracket points", sa.bracketPoints, 18);
  check("Ada total points", sa.totalPoints, 29);
  check("Ada exact count", sa.exactCount, 2);

  const sb = await scoreFor(bo.id);
  check("Bo match points", sb.matchPoints, 8);
  check("Bo bracket points", sb.bracketPoints, 8);
  check("Bo total points", sb.totalPoints, 16);
  check("Bo exact count", sb.exactCount, 1);

  const sc = await scoreFor(cy.id);
  check("Cy match points", sc.matchPoints, 8);
  check("Cy bracket points", sc.bracketPoints, 6);
  check("Cy total points", sc.totalPoints, 14);
  check("Cy exact count", sc.exactCount, 0);

  const sd = await scoreFor(dee.id);
  check("Dee match points", sd.matchPoints, 4);
  check("Dee bracket points", sd.bracketPoints, 12);
  check("Dee total points", sd.totalPoints, 16);
  check("Dee exact count", sd.exactCount, 1);

  console.log("\nVerifying leaderboard ordering (total ▸ exact ▸ join time):");
  const board = await getLeaderboard();
  // Ada 29 leads; Dee & Bo tie on 16/1 → earlier join (Dee) wins; Cy 14 last.
  check("leaderboard order", board.map((r) => r.displayName), ["Ada", "Dee", "Bo", "Cy"]);
  check("leaderboard ranks", board.map((r) => r.rank), [1, 2, 3, 4]);
  check("leaderboard totals", board.map((r) => r.totalPoints), [29, 16, 16, 14]);

  console.log("\nVerifying idempotency (recompute twice ⇒ same standings):");
  await recomputeScores();
  const board2 = await getLeaderboard();
  check("standings stable after recompute", board2.map((r) => [r.displayName, r.totalPoints]),
    board.map((r) => [r.displayName, r.totalPoints]));

  console.log("\nVerifying corrected result re-scores:");
  // Drop Brazil 2-0 → 1-0; Ada's 2-0 exact becomes mere outcome (4 → 2).
  await db.update(matches).set({ homeScore: 1, awayScore: 0 }).where(eq(matches.id, 1));
  await recomputeScores();
  const saAfter = await scoreFor(ada.id);
  check("Ada match points after correction", saAfter.matchPoints, 9); // 11 - 2
  check("Ada exact count after correction", saAfter.exactCount, 1); // 2 - 1

  // ---- summary
  console.log("\n" + "─".repeat(48));
  if (failures.length === 0) {
    console.log(`✅ SMOKE TEST PASSED — ${passed} checks against the test DB.`);
    process.exit(0);
  }
  console.log(`❌ SMOKE TEST FAILED — ${failures.length} of ${passed + failures.length} checks failed:`);
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}

main().catch((err) => {
  console.error("\n✗ Smoke test crashed:", err);
  process.exit(1);
});
