ALTER TABLE "profiles" ALTER COLUMN "handle" DROP NOT NULL;--> statement-breakpoint
UPDATE "profiles"
SET "handle" = NULL, "onboarding_complete" = false
WHERE "handle" ~ '^user_[a-z0-9]{19}$';
