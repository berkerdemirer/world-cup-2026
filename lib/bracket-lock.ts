/** The bracket locks globally at the knockout start time. */
export function isBracketLocked(lockAt: Date | null): boolean {
  return !!lockAt && Date.now() >= lockAt.getTime();
}
