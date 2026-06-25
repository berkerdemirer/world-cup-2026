import {
  pgTable,
  integer,
  text,
  boolean,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Tournament stages as they come from football-data.org (48-team 2026 format).
export type Stage =
  | "GROUP_STAGE"
  | "LAST_32"
  | "LAST_16"
  | "QUARTER_FINALS"
  | "SEMI_FINALS"
  | "THIRD_PLACE"
  | "FINAL";

export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "SUSPENDED"
  | "CANCELLED";

// Knockout rounds players pick advancing teams for, in bracket_predictions.
export type BracketRound =
  | "LAST_32"
  | "LAST_16"
  | "QUARTER_FINALS"
  | "SEMI_FINALS"
  | "FINAL"
  | "WINNER";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: text("display_name").notNull().unique(),
  pinHash: text("pin_hash"), // null = no PIN set, login is name-only
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teams = pgTable("teams", {
  id: integer("id").primaryKey(), // football-data.org team id
  name: text("name").notNull(),
  shortName: text("short_name"),
  tla: text("tla"),
  crestUrl: text("crest_url"),
  groupLabel: text("group_label"), // 'A'..'L' during group stage
});

export const matches = pgTable("matches", {
  id: integer("id").primaryKey(), // football-data.org match id
  stage: text("stage").$type<Stage>().notNull(),
  groupLabel: text("group_label"), // set for group stage
  matchday: integer("matchday"),
  homeTeamId: integer("home_team_id").references(() => teams.id),
  awayTeamId: integer("away_team_id").references(() => teams.id),
  homePlaceholder: text("home_placeholder"), // e.g. "Winner Group A" before teams known
  awayPlaceholder: text("away_placeholder"),
  kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
  status: text("status").$type<MatchStatus>().notNull().default("SCHEDULED"),
  homeScore: integer("home_score"), // full-time (incl. extra time) result
  awayScore: integer("away_score"),
  homePens: integer("home_pens"),
  awayPens: integer("away_pens"),
  advancingTeamId: integer("advancing_team_id").references(() => teams.id),
  source: text("source").$type<"api" | "manual">().notNull().default("api"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scorePredictions = pgTable(
  "score_predictions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("score_pred_user_match").on(t.userId, t.matchId)],
);

export const bracketPredictions = pgTable(
  "bracket_predictions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    round: text("round").$type<BracketRound>().notNull(),
    slot: text("slot").notNull(), // stable slot id within the round, e.g. "QF1"
    pickedTeamId: integer("picked_team_id")
      .notNull()
      .references(() => teams.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("bracket_pred_user_round_slot").on(t.userId, t.round, t.slot)],
);

// Denormalized leaderboard cache. Fully recomputable from predictions + matches.
export const scores = pgTable(
  "scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchPoints: integer("match_points").notNull().default(0),
    bracketPoints: integer("bracket_points").notNull().default(0),
    totalPoints: integer("total_points").notNull().default(0),
    exactCount: integer("exact_count").notNull().default(0), // tiebreaker
    goalDiffCount: integer("goal_diff_count").notNull().default(0),
    outcomeCount: integer("outcome_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("scores_user").on(t.userId)],
);

// Single-row (id=1) tunable configuration so scoring changes need no redeploy.
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  ptsExact: integer("pts_exact").notNull().default(4),
  ptsGoalDiff: integer("pts_goal_diff").notNull().default(3),
  ptsOutcome: integer("pts_outcome").notNull().default(2),
  ptsBracketR32: integer("pts_bracket_r32").notNull().default(1),
  ptsBracketR16: integer("pts_bracket_r16").notNull().default(2),
  ptsBracketQf: integer("pts_bracket_qf").notNull().default(4),
  ptsBracketSf: integer("pts_bracket_sf").notNull().default(6),
  ptsBracketFinal: integer("pts_bracket_final").notNull().default(8),
  ptsBracketWinner: integer("pts_bracket_winner").notNull().default(12),
  bracketLockAt: timestamp("bracket_lock_at", { withTimezone: true }), // null = derive from first LAST_32 kickoff
  // Live-sync throttle: a single shared clock so the external API is called at
  // most once per `liveSyncSeconds`, regardless of how many clients are polling.
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  liveSyncSeconds: integer("live_sync_seconds").notNull().default(20),
  // Shared "room password" gate. When set (or ROOM_PASSWORD env is set), every
  // login must supply it. null + no env = open registration.
  roomPasswordHash: text("room_password_hash"),
});

export type User = typeof users.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type ScorePrediction = typeof scorePredictions.$inferSelect;
export type BracketPrediction = typeof bracketPredictions.$inferSelect;
export type Score = typeof scores.$inferSelect;
export type Settings = typeof settings.$inferSelect;
