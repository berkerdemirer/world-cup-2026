// Pure bracket pick feedback — safe for client components.

export type BracketPickOutcome = "hit" | "miss" | "pending";

/** Whether a saved pick has been confirmed, ruled out, or is still possible. */
export function bracketPickOutcome(
  teamId: number,
  selected: boolean,
  reachedIds: readonly number[],
  outOfRoundIds: readonly number[],
): BracketPickOutcome | null {
  if (!selected) return null;
  const reached = new Set(reachedIds);
  const out = new Set(outOfRoundIds);
  if (reached.has(teamId)) return "hit";
  if (out.has(teamId)) return "miss";
  return "pending";
}
