import type { Match, MatchStatus } from "@/db/schema";

const TERMINAL_STATUSES = new Set<MatchStatus>([
  "FINISHED",
  "CANCELLED",
  "POSTPONED",
  "SUSPENDED",
]);

/** True while a match is underway (or kickoff has passed but the API hasn't caught up). */
export function isMatchLive(m: Pick<Match, "kickoffAt" | "status">): boolean {
  if (m.status === "IN_PLAY" || m.status === "PAUSED") return true;
  if (TERMINAL_STATUSES.has(m.status)) return false;
  return Date.now() >= new Date(m.kickoffAt).getTime();
}
