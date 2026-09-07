-- Notifications are delivered only after commit. IDs, never message text, travel
-- through Postgres; each WebSocket recipient gets a fresh authorized projection.
CREATE FUNCTION drocsid_notify_message() RETURNS trigger LANGUAGE plpgsql AS $$
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
    PERFORM pg_notify('drocsid_live', json_build_object('type', 'message', 'id', message_id, 'conversationId', conversation_id)::text);
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER messages_live AFTER INSERT OR UPDATE OR DELETE ON messages FOR EACH ROW EXECUTE FUNCTION drocsid_notify_message();
--> statement-breakpoint
CREATE TRIGGER reactions_live AFTER INSERT OR UPDATE OR DELETE ON message_reactions FOR EACH ROW EXECUTE FUNCTION drocsid_notify_message();
--> statement-breakpoint
CREATE TRIGGER saves_live AFTER INSERT OR DELETE ON saved_messages FOR EACH ROW EXECUTE FUNCTION drocsid_notify_message();
--> statement-breakpoint
CREATE TRIGGER attachments_live AFTER INSERT OR UPDATE OR DELETE ON attachments FOR EACH ROW EXECUTE FUNCTION drocsid_notify_message();
--> statement-breakpoint
CREATE FUNCTION drocsid_notify_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('drocsid_live', json_build_object('type', 'invalidate', 'userId', NEW.user_id)::text);
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER events_live AFTER INSERT ON app_events FOR EACH ROW EXECUTE FUNCTION drocsid_notify_state();
--> statement-breakpoint
CREATE TRIGGER notifications_live AFTER INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION drocsid_notify_state();
--> statement-breakpoint
CREATE FUNCTION drocsid_notify_access() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('drocsid_live', '{"type":"access"}');
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER members_live AFTER INSERT OR UPDATE OR DELETE ON community_members FOR EACH ROW EXECUTE FUNCTION drocsid_notify_access();
--> statement-breakpoint
CREATE TRIGGER participants_live AFTER INSERT OR UPDATE OR DELETE ON conversation_members FOR EACH ROW EXECUTE FUNCTION drocsid_notify_access();
--> statement-breakpoint
CREATE TRIGGER channels_live AFTER UPDATE OR DELETE ON conversations FOR EACH ROW EXECUTE FUNCTION drocsid_notify_access();
--> statement-breakpoint
CREATE TRIGGER blocks_live AFTER INSERT OR DELETE ON blocked_users FOR EACH ROW EXECUTE FUNCTION drocsid_notify_access();
--> statement-breakpoint
CREATE FUNCTION drocsid_notify_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('drocsid_live', json_build_object('type', 'session', 'id', OLD.id)::text);
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER session_live AFTER DELETE ON session FOR EACH ROW EXECUTE FUNCTION drocsid_notify_session();
--> statement-breakpoint
CREATE FUNCTION drocsid_notify_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('drocsid_live', json_build_object('type', 'identity', 'userId', NEW.user_id)::text);
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER identity_live AFTER UPDATE OF status ON profiles FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION drocsid_notify_identity();
