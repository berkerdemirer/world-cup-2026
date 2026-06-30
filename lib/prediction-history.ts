import type { MatchWithTeams } from "@/lib/queries";
import {
  pointsForTier,
  bracketPointsForRound,
  STAGE_TO_BRACKET_ROUND,
  NEXT_BRACKET_ROUND,
} from "@/lib/scoring";
import { scoreTier, type ScoreTier } from "@/lib/score-tier";
import { postExtraTimeScore, advancingTeamFromResult } from "@/lib/match-result";
import type { Settings, BracketRound } from "@/db/schema";

export type PredPick = { homeScore: number; awayScore: number };

export type HistoryItem = {
  match: MatchWithTeams;
  prediction: PredPick;
  tier: ScoreTier;
  points: number;
  /** Points earned from the bracket pick for the advancing team. null = group stage / not applicable. */
  bracketPoints: number | null;
};

export function buildPredictionHistory(
  allMatches: MatchWithTeams[],
  predictions: Map<number, PredPick>,
  settings: Settings,
  bracketPicksByRound?: Map<BracketRound, Set<number>>,
): HistoryItem[] {
  return allMatches
    .filter(
      (m) =>
        m.status === "FINISHED" &&
        m.homeScore != null &&
        m.awayScore != null &&
        predictions.has(m.id),
    )
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
    .map((m) => {
      const prediction = predictions.get(m.id)!;
      const actual = postExtraTimeScore(m)!;
      const tier = scoreTier(
        prediction.homeScore,
        prediction.awayScore,
        actual.home,
        actual.away,
      );

      let bracketPoints: number | null = null;
      const currentRound = STAGE_TO_BRACKET_ROUND[m.stage];
      if (currentRound && bracketPicksByRound) {
        const nextRd = NEXT_BRACKET_ROUND[currentRound];
        const advancer = advancingTeamFromResult({
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          homePens: m.homePens,
          awayPens: m.awayPens,
        });
        if (nextRd && advancer != null) {
          bracketPoints = bracketPicksByRound.get(nextRd)?.has(advancer)
            ? bracketPointsForRound(nextRd, settings)
            : 0;
        }
      }

      return { match: m, prediction, tier, points: pointsForTier(tier, settings), bracketPoints };
    });
}
