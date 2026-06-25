import type { BracketRound } from "bracketkit";
import type { KnockoutRound } from "@/lib/queries";
import type { MatchWithTeams } from "@/lib/queries";
import { KNOCKOUT_STAGES, STAGE_LABELS } from "@/lib/format";
import type { Stage } from "@/db/schema";

const MAIN_BRACKET_STAGES: Stage[] = KNOCKOUT_STAGES.filter((s) => s !== "THIRD_PLACE");

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
        matches: round.matches,
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
