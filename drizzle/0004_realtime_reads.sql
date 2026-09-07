CREATE FUNCTION drocsid_notify_read() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('drocsid_live', json_build_object('type', 'read', 'userId', NEW.user_id,
    'conversation', NEW.conversation_id, 'through', NEW.read_at)::text);
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER reads_live AFTER INSERT OR UPDATE ON conversation_read_states FOR EACH ROW EXECUTE FUNCTION drocsid_notify_read();
