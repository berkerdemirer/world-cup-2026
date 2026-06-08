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

  // Correct goal difference: same winner AND same margin. Draws are excluded
  // here (actualDiff === 0) — a draw has no winning margin to call, so a correct
  // but wrong-scoreline draw falls to the "outcome" tier below, keeping it
  // symmetric with a wrong-margin win.
  if (actualDiff !== 0 && predDiff === actualDiff) return "goal_diff";

  // Correct outcome (tendency): right side wins, or a correctly-called draw with
  // the wrong scoreline.
  if (Math.sign(predDiff) === Math.sign(actualDiff)) return "outcome";

  return "none";
}
