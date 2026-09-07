-- Reauthorize affected subscriptions without interrupting unrelated sockets.
CREATE OR REPLACE FUNCTION drocsid_notify_access() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r jsonb; event jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN r := to_jsonb(OLD); ELSE r := to_jsonb(NEW); END IF;
  IF TG_TABLE_NAME = 'community_members' THEN
    event := jsonb_build_object('type', 'access', 'userIds', jsonb_build_array(r->>'user_id'), 'communityId', r->>'community_id');
  ELSIF TG_TABLE_NAME = 'conversation_members' THEN
    event := jsonb_build_object('type', 'access', 'userIds', jsonb_build_array(r->>'user_id'), 'conversationId', r->>'conversation_id');
  ELSIF TG_TABLE_NAME = 'blocked_users' THEN
    event := jsonb_build_object('type', 'access', 'userIds', jsonb_build_array(r->>'user_id', r->>'target_id'));
  ELSE
    -- Topic/name edits do not change access or typing permissions.
    IF TG_OP = 'UPDATE' AND (OLD.private, OLD.channel_id, OLD.dm_status, OLD.dm_initiator_id) IS NOT DISTINCT FROM (NEW.private, NEW.channel_id, NEW.dm_status, NEW.dm_initiator_id) THEN RETURN NULL; END IF;
    event := jsonb_build_object('type', 'access', 'conversationId', r->>'id');
  END IF;
  PERFORM pg_notify('drocsid_live', event::text);
  RETURN NULL;
END $$;
