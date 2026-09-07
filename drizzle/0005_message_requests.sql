ALTER TABLE "conversations" ADD COLUMN "dm_initiator_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "dm_status" text DEFAULT 'accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_dm_initiator_id_user_id_fk" FOREIGN KEY ("dm_initiator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Preserve established conversations, but move unanswered non-friend DMs into requests.
UPDATE conversations c SET
  dm_initiator_id = (SELECT m.author_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at, m.id LIMIT 1),
  dm_status = CASE WHEN
    (SELECT count(DISTINCT m.author_id) FROM messages m WHERE m.conversation_id = c.id) > 1
    OR EXISTS (
      SELECT 1 FROM friendships f
      JOIN conversation_members sender ON sender.conversation_id = c.id AND sender.user_id = f.sender_id
      JOIN conversation_members recipient ON recipient.conversation_id = c.id AND recipient.user_id = f.recipient_id
      WHERE f.accepted
    ) THEN 'accepted' ELSE 'pending' END
WHERE c.kind = 'dm';
