import type { BracketRound } from "bracketkit";
import type { KnockoutRound } from "@/lib/queries";
import type { MatchWithTeams } from "@/lib/queries";
import { KNOCKOUT_STAGES, STAGE_LABELS, compareMatchesByKickoff } from "@/lib/format";
import type { Stage } from "@/db/schema";

const MAIN_BRACKET_STAGES: Stage[] = KNOCKOUT_STAGES.filter((s) => s !== "THIRD_PLACE");

/**
 * bracketkit pairs adjacent matches (2i, 2i+1) into the next round. FIFA's 2026
 * bracket crosses paths — both R32 and R16 are reordered so that:
 *   - Each R32 pair is vertically aligned with the R16 match they feed.
 *   - R16 pairs are grouped so QF 9/7 + QF 10/7 share one SF, and
 *     QF 12/7(×2) share the other (matching the official bracket halves).
 *
 * R16 display order: Canada/Morocco, Paraguay, Spain/Portugal, Belgium/USA,
 *                    Brazil, Mexico/England, Australia/Argentina, Switzerland/Colombia
 * R32 feeders: 89←73+76, 90←75+78, 93←83+84, 94←81+82,
 *              91←74+77, 92←79+80, 95←86+87, 96←85+88
 *
 * @see https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/knockout-stage-match-schedule-bracket
 */
const BRACKET_DISPLAY_ORDER: Partial<Record<Stage, readonly number[]>> = {
  LAST_32: [0, 3, 2, 5, 10, 11, 8, 9, 1, 4, 6, 7, 13, 14, 12, 15],
  // Swap middle pairs so Spain/Belgium section feeds QF 10/7 before Brazil/Mexico section feeds QF 12/7
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

  const ordered: BracketRound<MatchWithTeams>[] = MAIN_BRACKET_STAGES.flatMap((stage) => {
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

  // football-data.org resolves future-round participants lazily — fill in team
  // slots from the previous round's advancingTeamId when the API hasn't done it yet.
  for (let ri = 1; ri < ordered.length; ri++) {
    const prev = ordered[ri - 1]!;
    const curr = ordered[ri]!;
    for (let i = 0; i < curr.matches.length; i++) {
      const match = curr.matches[i]!;
      const feederHome = prev.matches[2 * i];
      const feederAway = prev.matches[2 * i + 1];

      let updated = match;
      if (match.homeTeam == null && feederHome?.advancingTeamId != null) {
        const team =
          feederHome.advancingTeamId === feederHome.homeTeamId
            ? feederHome.homeTeam
            : feederHome.awayTeam;
        updated = { ...updated, homeTeam: team, homeTeamId: feederHome.advancingTeamId };
      }
      if (match.awayTeam == null && feederAway?.advancingTeamId != null) {
        const team =
          feederAway.advancingTeamId === feederAway.homeTeamId
            ? feederAway.homeTeam
            : feederAway.awayTeam;
        updated = { ...updated, awayTeam: team, awayTeamId: feederAway.advancingTeamId };
      }
      if (updated !== match) curr.matches[i] = updated;
    }
  }

  return ordered;
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
