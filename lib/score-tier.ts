// Pure scoring helpers — no DB imports, safe to use in client components.

export type ScoreTier = "exact" | "goal_diff" | "outcome" | "none";

/**
 * Determine the highest matching scoring tier for a single match prediction.
 * Tiers are mutually exclusive — the highest applicable one is awarded.
 */
export function scoreTier(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
): ScoreTier {
  if (predHome === actualHome && predAway === actualAway) return "exact";

  const predDiff = predHome - predAway;
  const actualDiff = actualHome - actualAway;

  // Correct goal difference: same margin AND same winner (covers draws of a
  // different scoreline, since both diffs are 0).
  if (predDiff === actualDiff) return "goal_diff";

  // Correct outcome (tendency): right side wins / right draw, wrong margin.
  if (Math.sign(predDiff) === Math.sign(actualDiff)) return "outcome";

  return "none";
}
