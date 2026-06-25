import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scoreTier,
  pointsForTier,
  bracketPointsForRound,
  teamsReachingRounds,
} from "./scoring";
import type { Settings, Match } from "@/db/schema";

const settings: Settings = {
  id: 1,
  ptsExact: 4,
  ptsGoalDiff: 3,
  ptsOutcome: 2,
  ptsBracketR32: 1,
  ptsBracketR16: 2,
  ptsBracketQf: 4,
  ptsBracketSf: 6,
  ptsBracketFinal: 8,
  ptsBracketWinner: 12,
  bracketLockAt: null,
  lastSyncedAt: null,
  liveSyncSeconds: 30,
  roomPasswordHash: null,
};

test("scoreTier: exact match", () => {
  assert.equal(scoreTier(2, 1, 2, 1), "exact");
  assert.equal(scoreTier(0, 0, 0, 0), "exact");
});

test("scoreTier: correct goal difference (non-exact)", () => {
  assert.equal(scoreTier(2, 1, 3, 2), "goal_diff"); // both +1 home
  assert.equal(scoreTier(0, 1, 1, 2), "goal_diff"); // both -1 away, different score
});

test("scoreTier: correct outcome only", () => {
  assert.equal(scoreTier(1, 0, 3, 0), "outcome"); // home win, wrong margin
  assert.equal(scoreTier(0, 1, 0, 3), "outcome"); // away win, wrong margin
  // A correctly-called draw with the wrong scoreline is "outcome", not goal_diff
  // (a draw has no winning margin to reward).
  assert.equal(scoreTier(1, 1, 2, 2), "outcome");
  assert.equal(scoreTier(0, 0, 1, 1), "outcome");
});

test("scoreTier: wrong", () => {
  assert.equal(scoreTier(2, 0, 0, 2), "none"); // predicted home win, away won
  assert.equal(scoreTier(1, 1, 2, 0), "none"); // predicted draw, home won
});

test("pointsForTier maps to settings", () => {
  assert.equal(pointsForTier("exact", settings), 4);
  assert.equal(pointsForTier("goal_diff", settings), 3);
  assert.equal(pointsForTier("outcome", settings), 2);
  assert.equal(pointsForTier("none", settings), 0);
});

test("bracketPointsForRound escalates", () => {
  assert.equal(bracketPointsForRound("LAST_32", settings), 1);
  assert.equal(bracketPointsForRound("LAST_16", settings), 2);
  assert.equal(bracketPointsForRound("QUARTER_FINALS", settings), 4);
  assert.equal(bracketPointsForRound("SEMI_FINALS", settings), 6);
  assert.equal(bracketPointsForRound("FINAL", settings), 8);
  assert.equal(bracketPointsForRound("WINNER", settings), 12);
});

function m(partial: Partial<Match>): Match {
  return {
    id: 1,
    stage: "QUARTER_FINALS",
    groupLabel: null,
    matchday: null,
    homeTeamId: null,
    awayTeamId: null,
    homePlaceholder: null,
    awayPlaceholder: null,
    kickoffAt: new Date(),
    status: "SCHEDULED",
    homeScore: null,
    awayScore: null,
    homePens: null,
    awayPens: null,
    minute: null,
    injuryTime: null,
    advancingTeamId: null,
    source: "api",
    updatedAt: new Date(),
    ...partial,
  };
}

test("teamsReachingRounds collects participants per stage and the winner", () => {
  const matches: Match[] = [
    m({ id: 1, stage: "QUARTER_FINALS", homeTeamId: 10, awayTeamId: 20 }),
    m({ id: 2, stage: "SEMI_FINALS", homeTeamId: 10, awayTeamId: 30 }),
    m({ id: 3, stage: "FINAL", homeTeamId: 10, awayTeamId: 40, advancingTeamId: 10 }),
  ];
  const reached = teamsReachingRounds(matches);
  assert.deepEqual([...reached.get("QUARTER_FINALS")!].sort((a, b) => a - b), [10, 20]);
  assert.deepEqual([...reached.get("SEMI_FINALS")!].sort((a, b) => a - b), [10, 30]);
  assert.deepEqual([...reached.get("FINAL")!].sort((a, b) => a - b), [10, 40]);
  assert.deepEqual([...reached.get("WINNER")!], [10]);
});
