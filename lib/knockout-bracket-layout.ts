import type { Stage } from "@/db/schema";
import type { KnockoutRound } from "@/lib/queries";

/** Main bracket path (third place is shown separately below the final). */
export const MAIN_BRACKET_STAGES: Stage[] = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "FINAL",
];

export const BRACKET_SLOT_WIDTH_PX = 208;
export const BRACKET_SLOT_HEIGHT_PX = 72;
export const BRACKET_UNIT_PX = 36;
export const BRACKET_CONNECTOR_WIDTH_PX = 32;

export interface BracketHalf {
  /** Rounds from the outside in (R32 → semi). */
  rounds: KnockoutRound[];
}

export interface KnockoutBracketLayout {
  left: BracketHalf;
  right: BracketHalf;
  final: KnockoutRound | null;
  thirdPlace: KnockoutRound | null;
  /** log₂ of the first-round match count on each half (e.g. 3 for 8 R32 slots). */
  depth: number;
}

function byStage(rounds: KnockoutRound[]): Map<Stage, KnockoutRound> {
  return new Map(rounds.map((r) => [r.stage, r]));
}

/** Split each main round into left / right halves for a symmetrical bracket. */
export function buildKnockoutBracketLayout(rounds: KnockoutRound[]): KnockoutBracketLayout | null {
  const map = byStage(rounds);
  const r32 = map.get("LAST_32");
  if (!r32 || r32.matches.length === 0) return null;

  const half = r32.matches.length / 2;
  if (!Number.isInteger(half) || half < 1) return null;

  const depth = Math.log2(half);
  if (!Number.isInteger(depth)) return null;

  const splitRound = (round: KnockoutRound | undefined): [KnockoutRound, KnockoutRound] | null => {
    if (!round) return null;
    const mid = round.matches.length / 2;
    if (!Number.isInteger(mid) || mid === 0) return null;
    return [
      { ...round, matches: round.matches.slice(0, mid) },
      { ...round, matches: round.matches.slice(mid) },
    ];
  };

  const leftRounds: KnockoutRound[] = [];
  const rightRounds: KnockoutRound[] = [];

  for (const stage of MAIN_BRACKET_STAGES) {
    if (stage === "FINAL") continue;
    const round = map.get(stage);
    if (!round) break;
    const halves = splitRound(round);
    if (!halves) break;
    leftRounds.push(halves[0]);
    rightRounds.push(halves[1]);
  }

  return {
    left: { rounds: leftRounds },
    right: { rounds: rightRounds },
    final: map.get("FINAL") ?? null,
    thirdPlace: map.get("THIRD_PLACE") ?? null,
    depth,
  };
}

/** Vertical offset for a match slot within a bracket column. */
export function bracketSlotTop(roundIndex: number, matchIndex: number): number {
  return (2 * matchIndex + 1) * 2 ** roundIndex * BRACKET_UNIT_PX - BRACKET_SLOT_HEIGHT_PX / 2;
}

/** Total column height for one bracket half. */
export function bracketColumnHeight(matchCount: number): number {
  if (matchCount <= 0) return BRACKET_SLOT_HEIGHT_PX;
  const roundIndex = Math.log2(matchCount);
  const lastTop = bracketSlotTop(roundIndex, matchCount - 1);
  return lastTop + BRACKET_SLOT_HEIGHT_PX;
}
