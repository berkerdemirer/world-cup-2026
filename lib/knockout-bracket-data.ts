import type { BracketRound } from "bracketkit";
import type { KnockoutRound } from "@/lib/queries";
import type { MatchWithTeams } from "@/lib/queries";
import { KNOCKOUT_STAGES, STAGE_LABELS, compareMatchesByKickoff } from "@/lib/format";
import type { Stage } from "@/db/schema";

const MAIN_BRACKET_STAGES: Stage[] = KNOCKOUT_STAGES.filter((s) => s !== "THIRD_PLACE");

/**
 * bracketkit pairs adjacent matches (2i, 2i+1) into the next round. FIFA's 2026
 * bracket crosses paths instead — e.g. R16 M89 is W74 vs W77, not W74 vs W75.
 * Indices refer to kickoff order within the round (M73..M88).
 *
 * Only R32 is reordered: later rounds must stay in kickoff order so each match
 * stays vertically aligned with its two feeders from the previous column.
 * (Reordering R16 for QF crossover paths would shift fixtures away from their
 * R32 winners — e.g. M91 would no longer sit between the M76/M78 feeders.)
 *
 * @see https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/knockout-stage-match-schedule-bracket
 */
const BRACKET_DISPLAY_ORDER: Partial<Record<Stage, readonly number[]>> = {
  // R16 feeders (R16 in kickoff order): 89←73+76, 90←75+78, 91←74+77, 92←79+80, 93←83+84, 94←81+82, 95←86+87, 96←85+88
  LAST_32: [0, 3, 2, 5, 1, 4, 6, 7, 10, 11, 8, 9, 13, 14, 12, 15],
};

/** Reorder a round's matches so bracketkit connectors match FIFA's knockout tree. */
export function orderMatchesForBracketDisplay(
  stage: Stage,
  matches: MatchWithTeams[],
): MatchWithTeams[] {
  const sorted = [...matches].sort(compareMatchesByKickoff);
  const order = BRACKET_DISPLAY_ORDER[stage];
  if (!order || order.length !== sorted.length) return sorted;

  return order.map((i) => {
    const match = sorted[i];
    if (!match) {
      throw new Error(`Invalid bracket display index ${i} for ${stage} (${sorted.length} matches)`);
    }
    return match;
  });
}

/** Knockout rounds in bracketkit shape (R32 → Final; third place handled separately). */
export function toBracketkitRounds(rounds: KnockoutRound[]): BracketRound<MatchWithTeams>[] {
  const byStage = new Map(rounds.map((r) => [r.stage, r]));

  return MAIN_BRACKET_STAGES.flatMap((stage) => {
    const round = byStage.get(stage);
    if (!round || round.matches.length === 0) return [];
    return [
      {
        id: stage,
        name: STAGE_LABELS[stage],
        matches: orderMatchesForBracketDisplay(stage, round.matches),
      },
    ];
  });
}

export function getThirdPlaceMatch(rounds: KnockoutRound[]): MatchWithTeams | null {
  return rounds.find((r) => r.stage === "THIRD_PLACE")?.matches[0] ?? null;
}

/** True when we have a complete single-elimination tree (each round half the previous). */
export function isValidBracketTree(rounds: BracketRound<MatchWithTeams>[]): boolean {
  if (rounds.length === 0) return false;
  for (let i = 1; i < rounds.length; i++) {
    if (rounds[i].matches.length * 2 !== rounds[i - 1].matches.length) return false;
  }
  return true;
}
