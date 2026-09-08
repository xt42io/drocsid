WITH "legacy_communities" AS (
	SELECT "community_id"
	FROM "channel_categories"
	GROUP BY "community_id"
	HAVING count(*) FILTER (WHERE "name" = 'START HERE') > 0
		AND count(*) FILTER (WHERE "name" = 'THE COMMON ROOM') > 0
)
UPDATE "conversations"
SET "category_id" = NULL
FROM "channel_categories", "legacy_communities"
WHERE "conversations"."category_id" = "channel_categories"."id"
	AND "channel_categories"."community_id" = "legacy_communities"."community_id"
	AND "channel_categories"."name" IN ('START HERE', 'THE COMMON ROOM');
--> statement-breakpoint
WITH "legacy_communities" AS (
	SELECT "community_id"
	FROM "channel_categories"
	GROUP BY "community_id"
	HAVING count(*) FILTER (WHERE "name" = 'START HERE') > 0
		AND count(*) FILTER (WHERE "name" = 'THE COMMON ROOM') > 0
)
DELETE FROM "channel_categories"
USING "legacy_communities"
WHERE "channel_categories"."community_id" = "legacy_communities"."community_id"
	AND "channel_categories"."name" IN ('START HERE', 'THE COMMON ROOM');
