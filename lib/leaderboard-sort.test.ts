import assert from "node:assert/strict";
import test from "node:test";
import type { LeaderboardRow } from "@/lib/queries";
import {
  DEFAULT_LEADERBOARD_DIRECTION,
  DEFAULT_LEADERBOARD_SORT,
  sortLeaderboardRows,
} from "@/lib/leaderboard-sort";

const rows: LeaderboardRow[] = [
  {
    userId: "1",
    displayName: "Zoe",
    rank: 1,
    totalPoints: 30,
    matchPoints: 20,
    bracketPoints: 10,
    exactCount: 3,
    goalDiffCount: 2,
    outcomeCount: 1,
  },
  {
    userId: "2",
    displayName: "Amy",
    rank: 2,
    totalPoints: 25,
    matchPoints: 15,
    bracketPoints: 10,
    exactCount: 5,
    goalDiffCount: 1,
    outcomeCount: 0,
  },
  {
    userId: "3",
    displayName: "Ben",
    rank: 3,
    totalPoints: 20,
    matchPoints: 10,
    bracketPoints: 10,
    exactCount: 1,
    goalDiffCount: 4,
    outcomeCount: 2,
  },
];

test("sortLeaderboardRows keeps server rank order by default", () => {
  const sorted = sortLeaderboardRows(
    rows,
    DEFAULT_LEADERBOARD_SORT,
    DEFAULT_LEADERBOARD_DIRECTION,
    30,
  );
  assert.deepEqual(
    sorted.map((row) => row.displayName),
    ["Zoe", "Amy", "Ben"],
  );
});

test("sortLeaderboardRows can sort by exact count descending", () => {
  const sorted = sortLeaderboardRows(rows, "exactCount", "desc", 30);
  assert.deepEqual(
    sorted.map((row) => row.displayName),
    ["Amy", "Zoe", "Ben"],
  );
});

test("sortLeaderboardRows can sort by player name ascending", () => {
  const sorted = sortLeaderboardRows(rows, "displayName", "asc", 30);
  assert.deepEqual(
    sorted.map((row) => row.displayName),
    ["Amy", "Ben", "Zoe"],
  );
});

test("sortLeaderboardRows can sort by points behind the leader", () => {
  const sorted = sortLeaderboardRows(rows, "behind", "asc", 30);
  assert.deepEqual(
    sorted.map((row) => row.displayName),
    ["Zoe", "Amy", "Ben"],
  );
});
