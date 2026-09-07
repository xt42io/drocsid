ALTER TABLE "rate_limit" ALTER COLUMN "last_request" SET DATA TYPE bigint USING (extract(epoch FROM "last_request") * 1000)::bigint;--> statement-breakpoint
ALTER TABLE "rate_limit" ALTER COLUMN "last_request" SET NOT NULL;
