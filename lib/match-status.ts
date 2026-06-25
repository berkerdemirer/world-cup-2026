import type { Match, MatchStatus } from "@/db/schema";

const TERMINAL_STATUSES = new Set<MatchStatus>([
  "FINISHED",
  "CANCELLED",
  "POSTPONED",
  "SUSPENDED",
]);

/** True before the match has kicked off (still pickable until lock rules apply). */
export function isMatchUnplayed(m: Pick<Match, "status">): boolean {
  return m.status === "SCHEDULED" || m.status === "TIMED";
}

/** True while a match is underway (or kickoff has passed but the API hasn't caught up). */
export function isMatchLive(m: Pick<Match, "kickoffAt" | "status">): boolean {
  if (m.status === "IN_PLAY" || m.status === "PAUSED") return true;
  if (TERMINAL_STATUSES.has(m.status)) return false;
  return Date.now() >= new Date(m.kickoffAt).getTime();
}

/** True for upcoming picks and live games — the fixtures schedule, not finished results. */
export function isFixtureActive(m: Pick<Match, "kickoffAt" | "status">): boolean {
  return isMatchUnplayed(m) || isMatchLive(m);
}
