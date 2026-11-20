-- G1 PROPOSAL ONLY. NOT EXECUTED. Queries below are separate prepared statements.
-- All reads/writes borrow the caller's CommonSession.connection. Never BEGIN here.

-- S1: Project key from a child, never from body-supplied owner/project claims.
-- assignment $1=id:
SELECT project_id FROM poms.commission_role_assignment WHERE id=$1;
-- archive $1=id:
SELECT project_id FROM poms.project_archive_record WHERE id=$1;
-- condition $1=completionRecordId, $2=id (condition): both named keys must match.
SELECT cc.project_id, cc.completion_record_id, cc.responsible_user_id,
       cc.status, cc.row_version, cr.producer_version, cr.completion_result
FROM poms.project_completion_condition cc
JOIN poms.project_completion_record cr ON cr.id=cc.completion_record_id AND cr.project_id=cc.project_id
WHERE cr.id=$1 AND cc.id=$2;

-- S2: $1=resolved project id. Read mode omits FOR UPDATE; write mode locks first.
SELECT id,owner_user_id,owner_org_id,created_by,created_at,source_lead_id,
       current_stage,status,row_version
FROM poms.project WHERE id=$1 FOR UPDATE;

-- S3: $1=array of actor/current-owner/target-owner ids, stable sort.
SELECT id,is_active,row_version,primary_org_unit_id
FROM poms.platform_user WHERE id=ANY($1::uuid[]) ORDER BY id FOR SHARE;

-- S4: Fresh current organization facts. Profile orgUnits/primary pointer alone
-- are not an authority. Primary and secondary are exact registered values.
SELECT m.id,m.user_id,m.org_unit_id,m.membership_type,m.status,m.revoked_at,
       o.is_active AS org_is_active,o.row_version AS org_row_version
FROM poms.user_org_membership m
JOIN poms.org_unit o ON o.id=m.org_unit_id
WHERE m.user_id=ANY($1::uuid[]) AND m.status='active' AND m.revoked_at IS NULL
  AND m.membership_type IN ('primary','secondary') AND o.is_active
ORDER BY m.user_id,m.org_unit_id,m.id FOR SHARE OF m,o;

-- S5: EXACT current true producer only. Do not choose historical latest fallback.
-- $1=project id, $2=actor id. Hash(payload) verification runs in Rust using
-- contract_support::canonical_hash; SQL does not invent a cryptographic proof.
SELECT h.id,h.project_id,h.version,h.row_version,h.status,h.execution_owner_user_id,
       h.confirmation_record_id,h.basis_snapshot_id,h.source_payload_hash,
       b.source_payload,b.payload_hash,b.source_hash,
       c.id AS c_id,c.status AS c_status,c.row_version AS c_version,
       cp.id AS cp_id,cp.participant_id,cp.participant_status,cp.row_version AS cp_version,
       r.id AS duty_id,r.role_key,r.responsibility_summary
FROM poms.project_handover h
JOIN poms.project p ON p.id=h.project_id
JOIN poms.project_handover_basis_snapshot b ON b.id=h.basis_snapshot_id AND b.project_id=p.id
JOIN poms.confirmation_record c ON c.id=h.confirmation_record_id
 AND c.project_id=p.id AND c.target_type='project-handover' AND c.target_id=h.id
JOIN poms.project_handover_participant_role r ON r.handover_id=h.id
 AND r.confirmation_record_id=c.id AND r.participant_user_id=$2
JOIN poms.confirmation_participant cp ON cp.id=r.confirmation_participant_id
 AND cp.confirmation_record_id=c.id AND cp.participant_id=$2
WHERE h.project_id=$1 AND h.is_current AND h.producer_version=1
  AND h.status IN ('draft','confirmed') AND c.status IN ('pending','confirmed')
  AND cp.participant_status IN ('pending','confirmed')
  AND r.role_key IN ('sales-owner','execution-owner','business-admin','technical-support','finance')
  AND b.source_payload->>'projectId'=p.id::text
  AND b.source_payload->>'salesOwnerUserId'=p.owner_user_id::text
  AND b.source_hash=h.source_payload_hash
ORDER BY h.id,cp.id,r.id;
-- Write caller locks the same h/c/cp/b rows in stable order after resolving
-- authoritative ids, then re-runs relation/hash validation. Merely joined rows
-- are not proof of full current contract/receivable/source freshness.

-- S6: Scoped completion read for a condition-only actor; no full-project grant.
-- $1=project id, $2=actor. Full-project actors use their separately proven scope.
SELECT cr.*
FROM poms.project_completion_record cr
WHERE cr.project_id=$1 AND cr.producer_version=1
  AND EXISTS (SELECT 1 FROM poms.project_completion_condition cc
              WHERE cc.completion_record_id=cr.id AND cc.project_id=cr.project_id
                AND cc.responsible_user_id=$2)
ORDER BY cr.completed_at DESC,cr.created_at DESC,cr.id;
SELECT cc.* FROM poms.project_completion_condition cc
WHERE cc.project_id=$1 AND cc.responsible_user_id=$2
ORDER BY cc.completion_record_id,cc.sort_order,cc.id;
-- conditionStatus remains calculated from ALL conditions of that completion,
-- not only the filtered rows returned to this actor.

-- DDL delta: minimal provenance for ONCE-ONLY creator bootstrap.
-- Root owns formal migration/entity/contract registration. No historical INSERT.
CREATE TABLE poms.project_ownership_origin (
    project_id uuid PRIMARY KEY REFERENCES poms.project(id) ON DELETE RESTRICT,
    producer_version integer NOT NULL CHECK (producer_version=1),
    creator_user_id uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
    source_type text NOT NULL CHECK (source_type IN ('direct-create','lead-conversion')),
    source_record_id uuid NOT NULL,
    initial_kind text NOT NULL CHECK (initial_kind IN ('personal','org-owned')),
    initial_owner_user_id uuid NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
    initial_owner_org_id uuid NULL REFERENCES poms.org_unit(id) ON DELETE RESTRICT,
    source_payload jsonb NOT NULL,
    source_payload_hash varchar(64) NOT NULL CHECK (source_payload_hash ~ '^[0-9a-f]{64}$'),
    bootstrap_state text NOT NULL CHECK (bootstrap_state IN ('available','consumed')),
    first_personal_owner_user_id uuid NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
    first_personal_assigned_at timestamptz NULL,
    bootstrap_consumed_at timestamptz NULL,
    bootstrap_assignment_record_id uuid NULL REFERENCES poms.project_owner_reassignment_record(id) ON DELETE RESTRICT,
    row_version integer NOT NULL DEFAULT 1 CHECK (row_version>0),
    created_at timestamptz NOT NULL,
    CHECK ((initial_kind='personal' AND initial_owner_user_id IS NOT NULL)
        OR (initial_kind='org-owned' AND initial_owner_user_id IS NULL AND initial_owner_org_id IS NOT NULL)),
    CHECK ((bootstrap_state='available' AND initial_kind='org-owned'
         AND first_personal_owner_user_id IS NULL AND first_personal_assigned_at IS NULL
         AND bootstrap_consumed_at IS NULL AND bootstrap_assignment_record_id IS NULL)
        OR (bootstrap_state='consumed' AND first_personal_owner_user_id IS NOT NULL
         AND first_personal_assigned_at IS NOT NULL AND bootstrap_consumed_at IS NOT NULL)),
    CHECK (initial_kind<>'personal' OR (bootstrap_state='consumed'
         AND first_personal_owner_user_id=initial_owner_user_id)),
    CHECK (initial_kind<>'org-owned' OR bootstrap_state<>'consumed'
         OR bootstrap_assignment_record_id IS NOT NULL)
);
-- Origin creator/source/initial fields are immutable. Only available->consumed
-- may update once; consumed state is terminal. Enforce in the private store API
-- and production regression; no ordinary update/delete/return-to-org handler
-- may reset this record. Root may add a DB immutability trigger in final DDL.

-- S7: bootstrap candidate $1=project, $2=actor. Check raw source payload/hash and
-- source_record_id == project.id for direct-create / source_lead_id for conversion
-- again in Rust. Old createdBy equality/absence of history cannot replace origin.
SELECT p.id,p.owner_org_id,p.created_by,p.row_version,origin.*
FROM poms.project p
JOIN poms.project_ownership_origin origin ON origin.project_id=p.id
WHERE p.id=$1 AND p.owner_user_id IS NULL AND p.owner_org_id IS NOT NULL
  AND origin.producer_version=1 AND origin.initial_kind='org-owned'
  AND origin.initial_owner_user_id IS NULL AND origin.initial_owner_org_id=p.owner_org_id
  AND origin.bootstrap_state='available'
  AND origin.first_personal_owner_user_id IS NULL AND origin.first_personal_assigned_at IS NULL
  AND origin.creator_user_id=$2 AND p.created_by=$2
  AND NOT EXISTS (SELECT 1 FROM poms.project_owner_reassignment_record rr
      WHERE rr.project_id=p.id AND (rr.previous_owner_user_id IS NOT NULL OR rr.new_owner_user_id IS NOT NULL))
FOR UPDATE OF p,origin;
-- Also require exact current ownerOrg in S4(actor), active target-person S3,
-- and same ownerOrg in S4(target). Explicit client expectedVersion is mandatory.

-- W1/W2 shown as one transaction's CAS steps, not independently executable work.
-- The service inserts existing project_owner_reassignment_record and audit in
-- this same outer TX. $1 project, $2 target user, $3 actor, $4 expected project rv.
UPDATE poms.project
SET owner_user_id=$2,updated_by=$3,updated_at=now(),row_version=row_version+1
WHERE id=$1 AND row_version=$4 AND owner_user_id IS NULL
RETURNING row_version;
-- $1 project, $2 first target, $3 new history record, $4 expected origin rv.
UPDATE poms.project_ownership_origin
SET bootstrap_state='consumed',first_personal_owner_user_id=$2,
    first_personal_assigned_at=now(),bootstrap_consumed_at=now(),
    bootstrap_assignment_record_id=$3,row_version=row_version+1
WHERE project_id=$1 AND row_version=$4 AND bootstrap_state='available'
  AND first_personal_owner_user_id IS NULL
RETURNING row_version;
-- Require each affected row count = 1, or rollback project/history/origin/audit.
-- After first assignment creator gets no retained power. Future return-to-org
-- changes project current owner only; origin remains consumed forever.

-- Initialization occurs ONLY inside real project creation/conversion TX:
-- direct create currently begins personal with owner=actor/createdBy=actor:
-- origin.initial_kind=personal, initial_owner=actor, first_personal=actor,
-- bootstrap_state=consumed, consumed_at=project.created_at.
-- lead conversion uses actual conversion operator as creator, and source lead's
-- actual initial owner fields. initial org-owned may begin available. No source
-- with missing both person and organization can mint available bootstrap.
-- No migration/backfill creates origin for legacy/manual/seed projects.
