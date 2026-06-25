ALTER TABLE "settings" ALTER COLUMN "live_sync_seconds" SET DEFAULT 20;--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "goal_diff_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "outcome_count" integer DEFAULT 0 NOT NULL;