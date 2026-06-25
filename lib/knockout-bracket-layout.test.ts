import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bracketColumnHeight,
  bracketSlotTop,
  buildKnockoutBracketLayout,
} from "./knockout-bracket-layout";
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

test("buildKnockoutBracketLayout splits rounds into symmetrical halves", () => {
  const layout = buildKnockoutBracketLayout([
    round("LAST_32", 16),
    round("LAST_16", 8),
    round("QUARTER_FINALS", 4),
    round("SEMI_FINALS", 2),
    round("THIRD_PLACE", 1),
    round("FINAL", 1),
  ]);

  assert.ok(layout);
  assert.equal(layout.depth, 3);
  assert.equal(layout.left.rounds.length, 4);
  assert.equal(layout.left.rounds[0].matches.length, 8);
  assert.equal(layout.left.rounds[1].matches.length, 4);
  assert.equal(layout.left.rounds[2].matches.length, 2);
  assert.equal(layout.left.rounds[3].matches.length, 1);
  assert.equal(layout.right.rounds[0].matches[0].id, 9);
  assert.equal(layout.final?.matches.length, 1);
  assert.equal(layout.thirdPlace?.matches.length, 1);
});

test("bracketSlotTop centers later rounds between feeder pairs", () => {
  assert.equal(bracketSlotTop(0, 0), 0);
  assert.equal(bracketSlotTop(0, 1), 72);
  assert.equal(bracketSlotTop(1, 0), 36);
});

test("bracketColumnHeight fits all slots in the first round", () => {
  const height = bracketColumnHeight(8);
  assert.ok(height >= bracketSlotTop(0, 7) + 72);
});
