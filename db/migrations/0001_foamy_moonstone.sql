ALTER TABLE "settings" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "live_sync_seconds" integer DEFAULT 30 NOT NULL;