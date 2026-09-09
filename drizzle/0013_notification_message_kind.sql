-- Let realtime clients distinguish a newly inserted message from edits,
-- reactions, saves, attachment updates, and deletions for notification sounds.
CREATE OR REPLACE FUNCTION drocsid_notify_message() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE row_data jsonb; message_id text; conversation_id text;
BEGIN
  IF TG_OP = 'DELETE' THEN row_data := to_jsonb(OLD); ELSE row_data := to_jsonb(NEW); END IF;
  IF TG_TABLE_NAME = 'messages' THEN
    message_id := row_data->>'id'; conversation_id := row_data->>'conversation_id';
  ELSE
    message_id := row_data->>'message_id';
    SELECT m.conversation_id INTO conversation_id FROM messages m WHERE m.id = message_id;
  END IF;
  IF message_id IS NOT NULL AND conversation_id IS NOT NULL THEN
    PERFORM pg_notify('drocsid_live', json_build_object(
      'type', 'message',
      'id', message_id,
      'conversationId', conversation_id,
      'newMessage', TG_TABLE_NAME = 'messages' AND TG_OP = 'INSERT'
    )::text);
  END IF;
  RETURN NULL;
END $$;
