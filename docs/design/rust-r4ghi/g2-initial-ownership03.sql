-- Forward M97: approved optional organization-owned project creation.
-- M95/M96 remain immutable; no table, column, existing data or origin backfill.
CREATE OR REPLACE FUNCTION poms.jghi_ownership_origin_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p record;
BEGIN
 SELECT p0.*,p0.xmin::text AS creation_xid INTO p FROM poms.project p0 WHERE p0.id=NEW.project_id;
 IF p.id IS NULL OR p.creation_xid IS DISTINCT FROM (txid_current() % 4294967296)::text
  OR p.row_version<>1 OR p.current_stage<>'assessment' THEN
  RAISE EXCEPTION 'ownership origin requires the actual newly inserted project in this outer transaction' USING ERRCODE='23514';
 END IF;
 IF p.id IS NULL OR p.created_by IS DISTINCT FROM NEW.creator_user_id
  OR p.owner_user_id IS DISTINCT FROM NEW.initial_owner_user_id OR p.owner_org_id IS DISTINCT FROM NEW.initial_owner_org_id
  OR p.created_at IS DISTINCT FROM NEW.created_at
  OR NOT ((NEW.source_type='direct-create' AND NEW.source_record_id=p.id AND p.source_lead_id IS NULL
          AND ((NEW.initial_kind='personal' AND NEW.initial_owner_user_id=NEW.creator_user_id)
            OR (NEW.initial_kind='org-owned' AND NEW.initial_owner_user_id IS NULL AND NEW.initial_owner_org_id IS NOT NULL)))
       OR (NEW.source_type='lead-conversion' AND p.source_lead_id IS NOT NULL AND NEW.source_record_id=p.source_lead_id)) THEN
  RAISE EXCEPTION 'ownership origin must match actual new creation/conversion facts' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
