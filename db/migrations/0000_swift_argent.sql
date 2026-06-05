CREATE TABLE "bracket_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"round" text NOT NULL,
	"slot" text NOT NULL,
	"picked_team_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" integer PRIMARY KEY NOT NULL,
	"stage" text NOT NULL,
	"group_label" text,
	"matchday" integer,
	"home_team_id" integer,
	"away_team_id" integer,
	"home_placeholder" text,
	"away_placeholder" text,
	"kickoff_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'SCHEDULED' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"home_pens" integer,
	"away_pens" integer,
	"advancing_team_id" integer,
	"source" text DEFAULT 'api' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"match_id" integer NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"match_points" integer DEFAULT 0 NOT NULL,
	"bracket_points" integer DEFAULT 0 NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"exact_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"pts_exact" integer DEFAULT 4 NOT NULL,
	"pts_goal_diff" integer DEFAULT 3 NOT NULL,
	"pts_outcome" integer DEFAULT 2 NOT NULL,
	"pts_bracket_r32" integer DEFAULT 1 NOT NULL,
	"pts_bracket_r16" integer DEFAULT 2 NOT NULL,
	"pts_bracket_qf" integer DEFAULT 4 NOT NULL,
	"pts_bracket_sf" integer DEFAULT 6 NOT NULL,
	"pts_bracket_final" integer DEFAULT 8 NOT NULL,
	"pts_bracket_winner" integer DEFAULT 12 NOT NULL,
	"bracket_lock_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"tla" text,
	"crest_url" text,
	"group_label" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"pin_hash" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_display_name_unique" UNIQUE("display_name")
);
--> statement-breakpoint
ALTER TABLE "bracket_predictions" ADD CONSTRAINT "bracket_predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_predictions" ADD CONSTRAINT "bracket_predictions_picked_team_id_teams_id_fk" FOREIGN KEY ("picked_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_advancing_team_id_teams_id_fk" FOREIGN KEY ("advancing_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_predictions" ADD CONSTRAINT "score_predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_predictions" ADD CONSTRAINT "score_predictions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bracket_pred_user_round_slot" ON "bracket_predictions" USING btree ("user_id","round","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "score_pred_user_match" ON "score_predictions" USING btree ("user_id","match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scores_user" ON "scores" USING btree ("user_id");