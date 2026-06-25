import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getThirdPlaceMatch,
  isValidBracketTree,
  toBracketkitRounds,
} from "./knockout-bracket-data";
import type { KnockoutRound } from "@/lib/queries";
import type { MatchWithTeams } from "@/lib/queries";

function match(id: number): MatchWithTeams {
  return {
    id,
    stage: "LAST_32",
    groupLabel: null,
    matchday: null,
    homeTeamId: null,
    awayTeamId: null,
    homePlaceholder: null,
    awayPlaceholder: null,
    kickoffAt: new Date("2026-07-01T18:00:00Z"),
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
    homeTeam: null,
    awayTeam: null,
  };
}

function round(stage: KnockoutRound["stage"], count: number): KnockoutRound {
  return {
    stage,
    label: stage,
    matches: Array.from({ length: count }, (_, i) => match(i + 1)),
  };
}

test("toBracketkitRounds maps main stages and skips third place", () => {
  const rounds = toBracketkitRounds([
    round("LAST_32", 16),
    round("LAST_16", 8),
    round("QUARTER_FINALS", 4),
    round("SEMI_FINALS", 2),
    round("THIRD_PLACE", 1),
    round("FINAL", 1),
  ]);

  assert.equal(rounds.length, 5);
  assert.equal(rounds[0].id, "LAST_32");
  assert.equal(rounds[0].matches.length, 16);
  assert.equal(rounds[4].id, "FINAL");
  assert.deepEqual(rounds.map((r) => r.id), [
    "LAST_32",
    "LAST_16",
    "QUARTER_FINALS",
    "SEMI_FINALS",
    "FINAL",
  ]);
});

test("getThirdPlaceMatch returns the third-place fixture", () => {
  const third = match(99);
  const rounds: KnockoutRound[] = [
    round("FINAL", 1),
    { stage: "THIRD_PLACE", label: "3rd", matches: [third] },
  ];
  assert.equal(getThirdPlaceMatch(rounds)?.id, 99);
});

test("isValidBracketTree checks halving between rounds", () => {
  assert.equal(
    isValidBracketTree([
      { id: "a", matches: [match(1), match(2), match(3), match(4)] },
      { id: "b", matches: [match(5), match(6)] },
      { id: "c", matches: [match(7)] },
    ]),
    true,
  );
  assert.equal(
    isValidBracketTree([
      { id: "a", matches: [match(1), match(2), match(3)] },
      { id: "b", matches: [match(4)] },
    ]),
    false,
  );
});
