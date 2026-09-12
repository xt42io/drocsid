ALTER TABLE "community_bans" ADD COLUMN "role" text DEFAULT 'Admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "community_bans" ALTER COLUMN "role" SET DEFAULT 'Member';
