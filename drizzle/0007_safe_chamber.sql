CREATE INDEX "blocked_target_idx" ON "blocked_users" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "friendship_recipient_idx" ON "friendships" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "message_search_idx" ON "messages" USING gin (to_tsvector('simple', "content")) WHERE "messages"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "message_unread_idx" ON "messages" USING btree ("conversation_id","created_at","author_id") WHERE "messages"."deleted_at" is null;