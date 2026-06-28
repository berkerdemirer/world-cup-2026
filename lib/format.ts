import type { MatchStatus, Stage } from "@/db/schema";

/** Host-region timezone for server-rendered fixture day headers (WC 2026). */
export const FIXTURE_TZ = "America/New_York";

export const STAGE_LABELS: Record<Stage, string> = {
  GROUP_STAGE: "Group Stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  THIRD_PLACE: "Third-place play-off",
  FINAL: "Final",
};

/** Live match clock label, e.g. "67'" or "45+2'". Returns null when minute is unknown. */
export function formatLiveMinute(match: {
  minute: number | null;
  injuryTime: number | null;
}): string | null {
  if (match.minute == null) return null;
  if (match.injuryTime != null && match.injuryTime > 0) {
    return `${match.minute}+${match.injuryTime}'`;
  }
  return `${match.minute}'`;
}

/** Live label for badges — shows HT during the break, otherwise the match clock. */
export function formatLiveClock(match: {
  status: MatchStatus;
  minute: number | null;
  injuryTime: number | null;
}): string | null {
  if (match.status === "PAUSED") return "HT";
  return formatLiveMinute(match);
}

/** Knockout rounds in bracket order (excludes group stage). */
export const KNOCKOUT_STAGES: Stage[] = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];

export function stageGroupHeading(stage: Stage, groupLabel: string | null, matchday: number | null): string {
  if (stage === "GROUP_STAGE") {
    const md = matchday ? ` · Matchday ${matchday}` : "";
    return groupLabel ? `Group ${groupLabel}${md}` : `Group Stage${md}`;
  }
  return STAGE_LABELS[stage];
}

function fixtureDayParts(date: Date, timeZone?: string): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  const year = pick("year");
  const month = pick("month");
  const day = pick("day");
  if (!year || !month || !day) {
    throw new Error("fixtureDayParts: missing calendar fields");
  }
  return { year, month, day };
}

/** Calendar-day key for grouping group-stage fixtures in a timezone. */
export function fixtureDayKey(date: Date, timeZone?: string): string {
  const { year, month, day } = fixtureDayParts(date, timeZone);
  return `d${year}${month}${day}`;
}

/** Fixture kickoff time in the viewer's local timezone (render only after client mount). */
export function formatFixtureTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Bracket lock deadline in the viewer's local timezone (render only after client mount). */
export function formatBracketLockDeadline(date: Date): string {
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
  return `${datePart} at ${timePart}`;
}

/** Fixture calendar date in the viewer's local timezone (render only after client mount). */
export function formatFixtureDate(date: Date, options?: { uppercase?: boolean }): string {
  const label = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return options?.uppercase ? label.toUpperCase() : label;
}

/** Stable fixture list order: kickoff time, then football-data.org match id. */
export function compareMatchesByKickoff(
  a: { kickoffAt: Date | string; id: number },
  b: { kickoffAt: Date | string; id: number },
): number {
  const diff = new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
  if (diff !== 0) return diff;
  return a.id - b.id;
}

/** Group-stage matches group by calendar day; knockout matches by round. */
export function fixtureSectionOf(
  m: { stage: Stage; kickoffAt: Date | string },
  options?: { timeZone?: string; weekday?: "short" | "long" },
): { key: string; label: string } {
  if (m.stage === "GROUP_STAGE") {
    const d = new Date(m.kickoffAt);
    const timeZone = options?.timeZone;
    const weekday = options?.weekday ?? "short";
    return {
      key: fixtureDayKey(d, timeZone),
      label: d.toLocaleDateString("en-US", {
        timeZone,
        weekday,
        month: "short",
        day: "numeric",
      }),
    };
  }
  return { key: m.stage, label: STAGE_LABELS[m.stage] };
}
