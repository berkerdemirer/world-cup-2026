/** One-off grace: allow bracket edits until 19:30 Estonian time (EEST, UTC+3) on 29 Jun 2026. */
export const BRACKET_LOCK_GRACE_UNTIL = new Date("2026-06-29T16:30:00.000Z");

/** Active grace deadline; omitted in tests so lock rules stay deterministic. */
export function bracketLockGraceUntil(): Date | null {
  if (process.env.NODE_ENV === "test") return null;
  return BRACKET_LOCK_GRACE_UNTIL;
}

/** Effective lock is the latest deadline among all configured sources. */
export function latestBracketLockAt(...candidates: (Date | null | undefined)[]): Date | null {
  let latestMs = Number.NEGATIVE_INFINITY;
  let found = false;
  for (const candidate of candidates) {
    if (!candidate || Number.isNaN(candidate.getTime())) continue;
    found = true;
    if (candidate.getTime() > latestMs) latestMs = candidate.getTime();
  }
  return found ? new Date(latestMs) : null;
}

/** The bracket locks globally once the effective lock time has passed. */
export function isBracketLocked(lockAt: Date | null): boolean {
  return !!lockAt && Date.now() >= lockAt.getTime();
}
