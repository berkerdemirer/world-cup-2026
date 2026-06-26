import type { BracketRound } from "bracketkit";
import type { KnockoutRound } from "@/lib/queries";
import type { MatchWithTeams } from "@/lib/queries";
import { KNOCKOUT_STAGES, STAGE_LABELS, compareMatchesByKickoff } from "@/lib/format";
import type { Stage } from "@/db/schema";

const MAIN_BRACKET_STAGES: Stage[] = KNOCKOUT_STAGES.filter((s) => s !== "THIRD_PLACE");

/**
 * bracketkit pairs adjacent matches (2i, 2i+1) into the next round. FIFA's 2026
 * bracket crosses paths instead — e.g. R16 M89 is W74 vs W77, not W74 vs W75.
 * Indices refer to kickoff order within the round (M73..M88, M89..M96, etc.).
 *
 * @see https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/knockout-stage-match-schedule-bracket
 */
const BRACKET_DISPLAY_ORDER: Partial<Record<Stage, readonly number[]>> = {
  // R16 feeders: 89←74+77, 90←73+75, 91←76+78, 92←79+80, 93←83+84, 94←81+82, 95←86+88, 96←85+87
  LAST_32: [1, 4, 0, 2, 3, 5, 6, 7, 10, 11, 8, 9, 12, 14, 13, 15],
  // QF feeders: 97←89+90, 98←93+94, 99←91+92, 100←95+96
  LAST_16: [0, 1, 4, 5, 2, 3, 6, 7],
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
