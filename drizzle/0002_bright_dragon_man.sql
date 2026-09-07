CREATE TABLE "avatars" (
	"id" text PRIMARY KEY NOT NULL,
	"uploader_id" text NOT NULL,
	"path" text NOT NULL,
	"upload_id" text,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avatars_path_unique" UNIQUE("path")
);
--> statement-breakpoint
ALTER TABLE "avatars" ADD CONSTRAINT "avatars_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "avatars_uploader_idx" ON "avatars" USING btree ("uploader_id");--> statement-breakpoint
CREATE UNIQUE INDEX "avatars_active_user_idx" ON "avatars" USING btree ("uploader_id") WHERE "avatars"."status" = 'active';