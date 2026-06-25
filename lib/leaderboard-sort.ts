import type { LeaderboardRow } from "@/lib/queries";

export type LeaderboardSortKey =
  | "rank"
  | "displayName"
  | "exactCount"
  | "goalDiffCount"
  | "outcomeCount"
  | "matchPoints"
  | "bracketPoints"
  | "behind"
  | "totalPoints";

export type SortDirection = "asc" | "desc";

export const DEFAULT_LEADERBOARD_SORT: LeaderboardSortKey = "rank";
export const DEFAULT_LEADERBOARD_DIRECTION: SortDirection = "asc";

export function defaultDirectionForSortKey(key: LeaderboardSortKey): SortDirection {
  return key === "displayName" ? "asc" : "desc";
}

function compareValues(a: number | string, b: number | string, direction: SortDirection): number {
  const cmp =
    typeof a === "string" && typeof b === "string"
      ? a.localeCompare(b, undefined, { sensitivity: "base" })
      : Number(a) - Number(b);
  return direction === "asc" ? cmp : -cmp;
}

function valueForSortKey(
  row: LeaderboardRow,
  key: LeaderboardSortKey,
  leaderTotal: number,
): number | string {
  switch (key) {
    case "rank":
      return row.rank;
    case "displayName":
      return row.displayName;
    case "exactCount":
      return row.exactCount;
    case "goalDiffCount":
      return row.goalDiffCount;
    case "outcomeCount":
      return row.outcomeCount;
    case "matchPoints":
      return row.matchPoints;
    case "bracketPoints":
      return row.bracketPoints;
    case "behind":
      return leaderTotal - row.totalPoints;
    case "totalPoints":
      return row.totalPoints;
    default: {
      const exhaustive: never = key;
      return exhaustive;
    }
  }
}

export function sortLeaderboardRows(
  rows: LeaderboardRow[],
  sortKey: LeaderboardSortKey,
  direction: SortDirection,
  leaderTotal: number,
): LeaderboardRow[] {
  return [...rows].sort((a, b) => {
    const primary = compareValues(
      valueForSortKey(a, sortKey, leaderTotal),
      valueForSortKey(b, sortKey, leaderTotal),
      direction,
    );
    if (primary !== 0) return primary;

    if (sortKey !== "rank") {
      const byRank = compareValues(a.rank, b.rank, "asc");
      if (byRank !== 0) return byRank;
    }

    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
  });
}
