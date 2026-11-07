-- Additive correction after the already executed GHI migration95.
-- No old upload is certified or rebound; ordinary uploads remain version0/null.
ALTER TABLE poms.attachment_upload_session
 ADD COLUMN project_scope_context_version integer NOT NULL DEFAULT 0,
 ADD COLUMN completion_record_id uuid NULL,
 ADD COLUMN completion_condition_id uuid NULL,
 ADD CONSTRAINT chk_jghi_upload_condition_context CHECK (
   (project_scope_context_version=0 AND completion_record_id IS NULL AND completion_condition_id IS NULL)
   OR (project_scope_context_version=1 AND completion_record_id IS NOT NULL AND completion_condition_id IS NOT NULL
       AND target_type='project' AND target_id IS NOT NULL AND operation_type='create-attachment')),
 ADD CONSTRAINT fk_jghi_upload_condition_scope
   FOREIGN KEY(completion_condition_id,completion_record_id,target_id)
   REFERENCES poms.project_completion_condition(id,completion_record_id,project_id) ON DELETE RESTRICT;

CREATE FUNCTION poms.jghi_upload_condition_context_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.project_scope_context_version,NEW.completion_record_id,NEW.completion_condition_id)
    IS DISTINCT FROM ROW(OLD.project_scope_context_version,OLD.completion_record_id,OLD.completion_condition_id) THEN
   RAISE EXCEPTION 'upload condition authorization context is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER jghi_upload_condition_context_immutable BEFORE UPDATE ON poms.attachment_upload_session
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_upload_condition_context_immutable();
