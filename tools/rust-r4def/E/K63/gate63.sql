-- OPTIONAL ROOT-REVIEWED ENVIRONMENT GATE TEMPLATES; NOT EXECUTED BY AUTHOR.
-- This is not a migration or one-shot script. Root binds/runs each named block
-- under its owned PG15/25433 namespace admission. No POMS business DML here.
-- Keep all table RLS flags, policies, owner, table/column ACL raw originals first.
-- $1/$2 in parameterized statements below are bindings, not string interpolation.

-- INSTALL-1 on a fresh owned infrastructure schema. Refuse if schema exists.
DO $guard63$
BEGIN
  IF current_database()<>'poms_r4def_rust'
     OR current_user<>'poms_r0e_owner'
     OR current_setting('port')<>'15432'
     OR current_setting('server_version_num')<>'150012'
     OR current_setting('poms.r0e_isolated',true) IS DISTINCT FROM 'on'
     OR (SELECT count(*) FROM r4def_control.marker
         WHERE namespace='poms-r4def'
           AND source_base='756d813c9578090fcf8e56821acce01b46b40420')<>1
  THEN RAISE EXCEPTION 'K63 owned PG15 namespace admission failed'; END IF;
  IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='r4def_k63_gate')
  THEN RAISE EXCEPTION 'K63 infrastructure scope already exists; refuse reuse'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='poms_r4def_rust_app'
                AND NOT rolsuper AND NOT rolbypassrls)
     OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               JOIN pg_roles r ON r.oid=c.relowner
               WHERE n.nspname='poms' AND c.relname='attachment_storage_provider_config'
                 AND r.rolname='poms_r4def_rust_app')
  THEN RAISE EXCEPTION 'K63 app role must really be subject to RLS'; END IF;
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='poms' AND c.relname='attachment_storage_provider_config'
               AND (c.relrowsecurity OR c.relforcerowsecurity))
     OR EXISTS(SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
                JOIN pg_namespace n ON n.oid=c.relnamespace
                WHERE n.nspname='poms' AND c.relname='attachment_storage_provider_config')
  THEN RAISE EXCEPTION 'K63 template requires original RLS off/no policies; review another state separately'; END IF;
END $guard63$;
CREATE SCHEMA r4def_k63_gate AUTHORIZATION poms_r0e_owner;
CREATE TABLE r4def_k63_gate.control (
  singleton boolean PRIMARY KEY CHECK(singleton),
  namespace text NOT NULL CHECK(namespace='poms-r4def'),
  blocked_backend_pid integer NULL CHECK(blocked_backend_pid>0),
  config_id uuid NOT NULL,
  advisory_key bigint NOT NULL
);
-- INSTALL-2, separate bound statement: $1 actual API-created local config UUID;
-- $2 Root fresh unused positive bigint advisory key. Infrastructure row only.
INSERT INTO r4def_k63_gate.control(singleton,namespace,config_id,advisory_key)
VALUES(true,'poms-r4def',$1::uuid,$2::bigint);

-- INSTALL-3. No business data is read/written by the gate function.
CREATE FUNCTION r4def_k63_gate.allow_location_read(config uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog AS $function63$
DECLARE gate record;
BEGIN
  SELECT blocked_backend_pid,config_id,advisory_key INTO STRICT gate
  FROM r4def_k63_gate.control WHERE singleton;
  IF pg_backend_pid()=gate.blocked_backend_pid AND config=gate.config_id THEN
    PERFORM pg_advisory_xact_lock(gate.advisory_key);
  END IF;
  RETURN true;
END $function63$;
REVOKE ALL ON FUNCTION r4def_k63_gate.allow_location_read(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA r4def_k63_gate TO poms_r4def_rust_app;
GRANT EXECUTE ON FUNCTION r4def_k63_gate.allow_location_read(uuid) TO poms_r4def_rust_app;

-- HOLDER connection H: $1 same actual control.advisory_key; retain H until release.
SELECT pg_advisory_lock($1::bigint);

-- ARM transaction C: its AccessExclusive is short and released before A starts.
-- Start PUT-B only AFTER C acquired this table lock. B has already performed
-- Session/can_receive/checksum-null work when its location_runtime SELECT waits.
BEGIN;
LOCK TABLE poms.attachment_storage_provider_config IN ACCESS EXCLUSIVE MODE;
-- Root independent observer discovers ONLY actual B waiting SELECT below; bind
-- its real backend PID to the next infrastructure statement ($1), never guess.
UPDATE r4def_k63_gate.control SET blocked_backend_pid=$1::integer WHERE singleton;
CREATE POLICY r4def_k63_allow_select
  ON poms.attachment_storage_provider_config AS PERMISSIVE FOR SELECT
  TO poms_r4def_rust_app USING(true);
CREATE POLICY r4def_k63_location_gate
  ON poms.attachment_storage_provider_config AS RESTRICTIVE FOR SELECT
  TO poms_r4def_rust_app USING(r4def_k63_gate.allow_location_read(id));
ALTER TABLE poms.attachment_storage_provider_config ENABLE ROW LEVEL SECURITY;
COMMIT;
-- Root now MUST observe actual B blocked on the advisory key held by H, same PID.
-- Only after that proof start A PUT+complete. Gate returns true for all other PIDs.

-- DISCOVERY on independent owner observer, $1 exact ARM-C backend PID.
SELECT a.pid,a.usename,a.application_name,a.state,a.wait_event_type,a.wait_event,
       pg_blocking_pids(a.pid) AS blockers,a.query
FROM pg_stat_activity a
WHERE a.datname='poms_r4def_rust' AND a.usename='poms_r4def_rust_app'
  AND a.query LIKE 'SELECT to_jsonb(c) AS data FROM poms.attachment_storage_provider_config c%'
  AND $1::integer=ANY(pg_blocking_pids(a.pid));
-- Require exactly ONE in-flight candidate while all other client traffic idle.
-- Capture pg_locks relation wait followed by advisory wait; no sleep-based proof.

-- RELEASE on H only after real A complete ACK and final/download PG+bytes proof.
SELECT pg_advisory_unlock($1::bigint);
-- Then await actual B response (expected409), terminal Session remains completed,
-- no new Attachment/audit. Staging may be B64; actual final/download must be A64.

-- FINALLY RESTORE (even assertion/HTTP timeout failure): release H, settle B,
-- stop new test traffic, then remove ONLY these owned policies/function/schema.
BEGIN;
DROP POLICY r4def_k63_location_gate ON poms.attachment_storage_provider_config;
DROP POLICY r4def_k63_allow_select ON poms.attachment_storage_provider_config;
-- INSTALL guard required original RLS/force off and no policies; restore exactly.
ALTER TABLE poms.attachment_storage_provider_config DISABLE ROW LEVEL SECURITY;
-- Original relforcerowsecurity was not changed; compare it and all ACL/policies.
DROP FUNCTION r4def_k63_gate.allow_location_read(uuid);
DROP TABLE r4def_k63_gate.control;
DROP SCHEMA r4def_k63_gate RESTRICT;
COMMIT;
-- Original policies/table+column ACL/owner/flags must compare exactly afterward.
-- No CASCADE, unknown PID termination, private credential SELECT or business DML.
