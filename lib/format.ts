import type { Stage } from "@/db/schema";

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
