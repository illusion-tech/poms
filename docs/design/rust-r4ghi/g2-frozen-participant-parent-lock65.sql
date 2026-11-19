-- CONDITIONAL FORWARD CANDIDATE ONLY. Root decides registration/application.
-- Keep M95/M97, existing triggers, frozen columns and deferred totals unchanged.
-- No table/column/data/origin backfill. Only replace this existing guard body.
CREATE OR REPLACE FUNCTION poms.jghi_assignment_participant_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
 parent_ids uuid[];
 parent_row record;
 has_frozen_parent boolean := false;
 expected_parent_count integer := 0;
 locked_parent_count integer := 0;
BEGIN
 IF TG_OP='INSERT' THEN
  parent_ids := ARRAY[NEW.assignment_id];
 ELSIF TG_OP='DELETE' THEN
  parent_ids := ARRAY[OLD.assignment_id];
 ELSE
  parent_ids := ARRAY[OLD.assignment_id,NEW.assignment_id];
 END IF;

 SELECT count(DISTINCT p.id)::integer INTO expected_parent_count
 FROM unnest(parent_ids) AS p(id) WHERE p.id IS NOT NULL;

 -- One deterministic order, with duplicate IDs naturally removed by the PK
 -- lookup. Take every existing OLD/NEW parent lock before making a decision.
 FOR parent_row IN
  SELECT a.id,a.status
  FROM poms.commission_role_assignment a
  WHERE a.id=ANY(parent_ids)
  ORDER BY a.id
  FOR UPDATE OF a
 LOOP
  locked_parent_count := locked_parent_count+1;
  has_frozen_parent := has_frozen_parent OR parent_row.status='frozen';
 END LOOP;

 -- Moving any participant, including zero weight and draft-to-draft, remains
 -- forbidden. Preserve the existing SQLSTATE and diagnostic text.
 IF TG_OP='UPDATE' AND NEW.assignment_id IS DISTINCT FROM OLD.assignment_id THEN
  RAISE EXCEPTION 'assignment participant cannot be reparented' USING ERRCODE='23514';
 END IF;
 -- I/U must have locked every nonnull actual parent. Preserve DELETE's
 -- previous missing-parent behavior and let original not-null handle NULL.
 IF TG_OP IN ('INSERT','UPDATE') AND locked_parent_count<>expected_parent_count THEN
  RAISE EXCEPTION 'assignment participant parent unavailable' USING ERRCODE='23503';
 END IF;
 IF has_frozen_parent THEN
  RAISE EXCEPTION 'frozen assignment participants immutable' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
