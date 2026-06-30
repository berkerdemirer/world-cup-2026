import assert from "node:assert/strict";
import test from "node:test";
import { postExtraTimeScore, advancingTeamFromResult } from "./match-result";

test("postExtraTimeScore returns stored score when no penalties", () => {
  assert.deepEqual(postExtraTimeScore({ homeScore: 2, awayScore: 1 }), { home: 2, away: 1 });
});

test("postExtraTimeScore keeps a correctly stored post-ET draw with pens", () => {
  assert.deepEqual(
    postExtraTimeScore({ homeScore: 1, awayScore: 1, homePens: 4, awayPens: 2 }),
    { home: 1, away: 1 },
  );
});

test("postExtraTimeScore strips pens baked into fullTime (1-1 after ET, pens 4-5)", () => {
  assert.deepEqual(
    postExtraTimeScore({ homeScore: 5, awayScore: 6, homePens: 4, awayPens: 5 }),
    { home: 1, away: 1 },
  );
});

test("postExtraTimeScore strips pens baked into fullTime (0-0 after ET, pens 4-5)", () => {
  assert.deepEqual(
    postExtraTimeScore({ homeScore: 4, awayScore: 5, homePens: 4, awayPens: 5 }),
    { home: 0, away: 0 },
  );
});

test("postExtraTimeScore strips pens from football-data fullTime (1-1 ET, pens 6-5)", () => {
  assert.deepEqual(
    postExtraTimeScore({ homeScore: 7, awayScore: 6, homePens: 6, awayPens: 5 }),
    { home: 1, away: 1 },
  );
});

test("advancingTeamFromResult picks regulation/extra-time winner", () => {
  assert.equal(
    advancingTeamFromResult({ homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 }),
    1,
  );
});

test("advancingTeamFromResult picks pen winner after a draw", () => {
  assert.equal(
    advancingTeamFromResult({
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 1,
      awayScore: 1,
      homePens: 4,
      awayPens: 5,
    }),
    2,
  );
});

test("advancingTeamFromResult does not use fullTime that includes pens for ET draws", () => {
  // 3-3 after ET, away wins pens 5-4 — folded fullTime 7-8 must not pick home.
  assert.equal(
    advancingTeamFromResult({
      homeTeamId: 10,
      awayTeamId: 20,
      homeScore: 7,
      awayScore: 8,
      homePens: 4,
      awayPens: 5,
    }),
    20,
  );
});
