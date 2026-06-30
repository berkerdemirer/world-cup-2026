import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getThirdPlaceMatch,
  isValidBracketTree,
  orderMatchesForBracketDisplay,
  toBracketkitRounds,
} from "./knockout-bracket-data";
import type { KnockoutRound } from "@/lib/queries";
import type { MatchWithTeams } from "@/lib/queries";

function match(id: number, kickoffAt = new Date("2026-07-01T18:00:00Z")): MatchWithTeams {
  return {
    id,
    stage: "LAST_32",
    groupLabel: null,
    matchday: null,
    homeTeamId: null,
    awayTeamId: null,
    homePlaceholder: null,
    awayPlaceholder: null,
    kickoffAt,
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

/** Build 16 R32 fixtures in FIFA kickoff order (M73..M88). */
function fifaR32Matches(): MatchWithTeams[] {
  return Array.from({ length: 16 }, (_, i) =>
    match(73 + i, new Date(`2026-06-28T${String(12 + i).padStart(2, "0")}:00:00Z`)),
  );
}

test("orderMatchesForBracketDisplay pairs M73 with M76 for R16 M89", () => {
  const ordered = orderMatchesForBracketDisplay("LAST_32", fifaR32Matches());
  // bracketkit feeds adjacent slots into the same R16 tie — M89 is W73 vs W76.
  assert.deepEqual(ordered.slice(0, 2).map((m) => m.id), [73, 76]);
  assert.deepEqual(ordered.slice(2, 4).map((m) => m.id), [75, 78]);
});

test("orderMatchesForBracketDisplay keeps R16 in kickoff order for feeder alignment", () => {
  const r16 = Array.from({ length: 8 }, (_, i) =>
    match(89 + i, new Date(`2026-07-04T${String(12 + i).padStart(2, "0")}:00:00Z`)),
  );
  const ordered = orderMatchesForBracketDisplay("LAST_16", r16);
  assert.deepEqual(ordered.map((m) => m.id), [89, 90, 91, 92, 93, 94, 95, 96]);
});

test("R32 display order feeds the correct R16 fixture for each bracketkit pair", () => {
  const orderedR32 = orderMatchesForBracketDisplay("LAST_32", fifaR32Matches());
  const orderedR16 = orderMatchesForBracketDisplay(
    "LAST_16",
    Array.from({ length: 8 }, (_, i) =>
      match(89 + i, new Date(`2026-07-04T${String(12 + i).padStart(2, "0")}:00:00Z`)),
    ),
  );

  const feeders: [r16: number, m1: number, m2: number][] = [
    [89, 73, 76],
    [90, 75, 78],
    [91, 74, 77],
    [92, 79, 82],
    [93, 81, 80],
    [94, 83, 86],
    [95, 85, 88],
    [96, 87, 84],
  ];

  for (let i = 0; i < feeders.length; i++) {
    const [r16Id, m1, m2] = feeders[i]!;
    assert.equal(orderedR16[i]?.id, r16Id);
    assert.deepEqual(orderedR32.slice(i * 2, i * 2 + 2).map((m) => m.id), [m1, m2]);
  }
});

test("orderMatchesForBracketDisplay leaves other rounds in kickoff order", () => {
  const qf = [
    match(97, new Date("2026-07-09T18:00:00Z")),
    match(98, new Date("2026-07-10T18:00:00Z")),
    match(99, new Date("2026-07-11T12:00:00Z")),
    match(100, new Date("2026-07-11T18:00:00Z")),
  ];
  const ordered = orderMatchesForBracketDisplay("QUARTER_FINALS", qf);
  assert.deepEqual(ordered.map((m) => m.id), [97, 98, 99, 100]);
});

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
