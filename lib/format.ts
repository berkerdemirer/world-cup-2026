import type { Stage } from "@/db/schema";

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
