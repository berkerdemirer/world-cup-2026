import type { MatchWithTeams } from "@/lib/queries";
import { pointsForTier } from "@/lib/scoring";
import { scoreTier, type ScoreTier } from "@/lib/score-tier";
import type { Settings } from "@/db/schema";

export type PredPick = { homeScore: number; awayScore: number };

export type HistoryItem = {
  match: MatchWithTeams;
  prediction: PredPick;
  tier: ScoreTier;
  points: number;
};

export function buildPredictionHistory(
  allMatches: MatchWithTeams[],
  predictions: Map<number, PredPick>,
  settings: Settings,
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
      const tier = scoreTier(
        prediction.homeScore,
        prediction.awayScore,
        m.homeScore!,
        m.awayScore!,
      );
      return { match: m, prediction, tier, points: pointsForTier(tier, settings) };
    });
}
