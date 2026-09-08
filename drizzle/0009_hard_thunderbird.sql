CREATE TABLE IF NOT EXISTS "community_icons" (
	"id" text PRIMARY KEY NOT NULL,
	"uploader_id" text,
	"community_id" text,
	"path" text NOT NULL,
	"upload_id" text,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_icons_path_unique" UNIQUE("path")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "community_icons" ADD CONSTRAINT "community_icons_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "community_icons" ADD CONSTRAINT "community_icons_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_icons_uploader_idx" ON "community_icons" USING btree ("uploader_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "community_icons_active_idx" ON "community_icons" USING btree ("community_id") WHERE "community_icons"."status" = 'active';
