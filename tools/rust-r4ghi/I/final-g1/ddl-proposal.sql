-- REVIEW PROPOSAL ONLY. NOT EXECUTED. NOT A REGISTERED MIGRATION.
-- Root owns final migration/entity/shared-schema alignment and metadata rows.
-- No seeded business facts, role freezes, advanced stages or approvals.

CREATE TABLE poms.project_stage_record (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES poms.project(id) ON DELETE RESTRICT,
    sequence_no integer NOT NULL CHECK (sequence_no > 0),
    event_type text NOT NULL CHECK (event_type IN ('stage-entered','stage-requalified')),
    from_stage text NOT NULL,
    to_stage text NOT NULL CHECK (to_stage IN ('handover','execution','acceptance','completed')),
    previous_stage_record_id uuid REFERENCES poms.project_stage_record(id) ON DELETE RESTRICT,
    source_handover_id uuid NOT NULL REFERENCES poms.project_handover(id) ON DELETE RESTRICT,
    source_role_assignment_id uuid REFERENCES poms.commission_role_assignment(id) ON DELETE RESTRICT,
    source_completion_record_id uuid REFERENCES poms.project_completion_record(id) ON DELETE RESTRICT,
    summary_snapshot_id uuid NOT NULL REFERENCES poms.approval_summary_snapshot(id) ON DELETE RESTRICT,
    project_row_version_before integer NOT NULL CHECK (project_row_version_before > 0),
    project_row_version_after integer NOT NULL,
    entered_at timestamptz NOT NULL,
    entered_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
    reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 2000),
    source_payload jsonb NOT NULL,
    source_payload_hash varchar(64) NOT NULL CHECK (source_payload_hash ~ '^[0-9a-f]{64}$'),
    producer_version integer NOT NULL CHECK (producer_version = 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id,sequence_no),
    UNIQUE (id,project_id),
    CHECK (previous_stage_record_id IS DISTINCT FROM id),
    CHECK (project_row_version_after = project_row_version_before + 1),
    CHECK (
        (to_stage='handover' AND from_stage IN ('assessment','scope-confirmation','commercial-closure','contracting','handover'))
        OR (to_stage='execution' AND from_stage='handover' AND previous_stage_record_id IS NOT NULL AND source_role_assignment_id IS NOT NULL)
        OR (to_stage='acceptance' AND from_stage='execution' AND previous_stage_record_id IS NOT NULL AND source_role_assignment_id IS NOT NULL)
        OR (to_stage='completed' AND from_stage='acceptance' AND previous_stage_record_id IS NOT NULL AND source_role_assignment_id IS NOT NULL AND source_completion_record_id IS NOT NULL)
    ),
    CHECK ((event_type='stage-requalified') = (from_stage='handover' AND to_stage='handover'))
);
ALTER TABLE poms.project ADD COLUMN current_stage_record_id uuid NULL;
ALTER TABLE poms.project ADD CONSTRAINT project_current_stage_record_same_project_fk
    FOREIGN KEY (current_stage_record_id,id) REFERENCES poms.project_stage_record(id,project_id) ON DELETE RESTRICT;

ALTER TABLE poms.commission_role_assignment
    ADD COLUMN producer_version integer NULL,
    ADD COLUMN weights_policy_version text NULL,
    ADD COLUMN freeze_payload_id uuid NULL;
CREATE TABLE poms.commission_role_assignment_participant (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES poms.commission_role_assignment(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
    role_type varchar(64) NOT NULL CHECK (length(btrim(role_type)) > 0),
    responsibility_summary text NOT NULL CHECK (length(btrim(responsibility_summary)) BETWEEN 1 AND 2000),
    weight_units integer NOT NULL CHECK (weight_units BETWEEN 0 AND 1000000),
    zero_weight_reason text NULL,
    display_name_at_assignment text NOT NULL,
    sort_order integer NOT NULL CHECK (sort_order >= 0),
    UNIQUE (assignment_id,user_id,role_type),
    UNIQUE (assignment_id,sort_order),
    CHECK ((weight_units=0 AND zero_weight_reason IS NOT NULL AND length(btrim(zero_weight_reason)) BETWEEN 1 AND 1000)
        OR (weight_units>0 AND zero_weight_reason IS NULL))
);
-- Freeze validates SUM(weight_units)=1000000 while holding project+assignment locks.
-- Frozen participant rows are immutable through every product entrypoint.
-- No CommissionRuleVersion FK: tier/rate/payout rules enter only at calculation.
CREATE TABLE poms.commission_role_assignment_freeze_payload (
    assignment_id uuid PRIMARY KEY REFERENCES poms.commission_role_assignment(id) ON DELETE RESTRICT,
    project_id uuid NOT NULL REFERENCES poms.project(id) ON DELETE RESTRICT,
    handover_id uuid NOT NULL REFERENCES poms.project_handover(id) ON DELETE RESTRICT,
    handover_basis_snapshot_id uuid NOT NULL REFERENCES poms.project_handover_basis_snapshot(id) ON DELETE RESTRICT,
    receipt_judgment_freeze_id uuid NOT NULL REFERENCES poms.project_receipt_judgment_freeze(id) ON DELETE RESTRICT,
    contract_summary_snapshot_id uuid NOT NULL REFERENCES poms.approval_summary_snapshot(id) ON DELETE RESTRICT,
    handover_summary_snapshot_id uuid NOT NULL REFERENCES poms.approval_summary_snapshot(id) ON DELETE RESTRICT,
    freeze_summary_snapshot_id uuid NOT NULL UNIQUE REFERENCES poms.approval_summary_snapshot(id) ON DELETE RESTRICT,
    weights_policy_version text NOT NULL CHECK (weights_policy_version='normalized-six-v1-zero-reason'),
    source_payload jsonb NOT NULL,
    source_payload_hash varchar(64) NOT NULL CHECK (source_payload_hash ~ '^[0-9a-f]{64}$'),
    frozen_at timestamptz NOT NULL,
    frozen_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
    CHECK (freeze_summary_snapshot_id <> handover_summary_snapshot_id)
);
ALTER TABLE poms.commission_role_assignment ADD CONSTRAINT cra_freeze_payload_fk
    FOREIGN KEY (freeze_payload_id) REFERENCES poms.commission_role_assignment_freeze_payload(assignment_id) ON DELETE RESTRICT;
ALTER TABLE poms.commission_role_assignment ADD CONSTRAINT cra_new_producer_qualification_check CHECK (
    producer_version IS NULL OR
    (producer_version=1 AND weights_policy_version IS NOT NULL AND weights_policy_version='normalized-six-v1-zero-reason'
     AND (status<>'frozen' OR (freeze_payload_id IS NOT NULL AND freeze_payload_id=id AND frozen_at IS NOT NULL AND frozen_by IS NOT NULL
         AND source_handover_id IS NOT NULL AND contract_summary_snapshot_id IS NOT NULL
         AND handover_summary_snapshot_id IS NOT NULL AND effective_handover_baseline_snapshot_id IS NOT NULL)))
);
-- Keep existing commission_role_assignment_project_version_unique and
-- uq_commission_role_assignment_project_current. Draft replacement uses CAS;
-- current frozen may only change through the separately governed dispute chain.

ALTER TABLE poms.acceptance_record
    ADD COLUMN producer_version integer NULL,
    ADD COLUMN source_stage_record_id uuid NULL REFERENCES poms.project_stage_record(id) ON DELETE RESTRICT,
    ADD COLUMN source_payload_hash varchar(64) NULL,
    ADD COLUMN conditional_summary text NULL;
ALTER TABLE poms.acceptance_record ADD CONSTRAINT acceptance_new_producer_check CHECK (
    producer_version IS NULL OR (producer_version=1 AND source_stage_record_id IS NOT NULL
    AND source_payload_hash IS NOT NULL AND source_payload_hash ~ '^[0-9a-f]{64}$' AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL
    AND acceptance_type IN ('stage-outcome','stage-acceptance','final-acceptance')
    AND acceptance_result IN ('accepted','conditional','rejected')
    AND (acceptance_result<>'conditional' OR (conditional_summary IS NOT NULL AND length(btrim(conditional_summary))>0)))
);
ALTER TABLE poms.project_completion_record
    ADD COLUMN producer_version integer NULL,
    ADD COLUMN source_stage_record_id uuid NULL REFERENCES poms.project_stage_record(id) ON DELETE RESTRICT,
    ADD COLUMN source_payload_hash varchar(64) NULL,
    ADD COLUMN condition_status text NULL;
ALTER TABLE poms.project_completion_record ADD CONSTRAINT completion_new_producer_check CHECK (
    producer_version IS NULL OR (producer_version=1 AND source_stage_record_id IS NOT NULL
    AND source_payload_hash IS NOT NULL AND source_payload_hash ~ '^[0-9a-f]{64}$' AND completed_by IS NOT NULL AND condition_status IS NOT NULL
    AND ((completion_result='completed' AND condition_status='not-applicable')
      OR (completion_result='conditional-completed' AND condition_status IN ('pending','closed'))))
);
CREATE UNIQUE INDEX uq_completion_project_new_confirmed ON poms.project_completion_record(project_id)
    WHERE producer_version=1 AND status='confirmed';
CREATE TABLE poms.project_completion_condition (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES poms.project(id) ON DELETE RESTRICT,
    completion_record_id uuid NOT NULL REFERENCES poms.project_completion_record(id) ON DELETE RESTRICT,
    sort_order integer NOT NULL CHECK (sort_order >= 0),
    summary text NOT NULL CHECK (length(btrim(summary)) BETWEEN 1 AND 2000),
    responsible_user_id uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
    due_at timestamptz NOT NULL,
    status text NOT NULL CHECK (status IN ('pending','closed')),
    closure_record_id uuid NULL,
    closed_at timestamptz NULL,
    closed_by uuid NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
    row_version integer NOT NULL DEFAULT 1 CHECK (row_version > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
    UNIQUE (completion_record_id,sort_order),
    CHECK ((status='pending' AND closure_record_id IS NULL AND closed_at IS NULL AND closed_by IS NULL)
      OR (status='closed' AND closure_record_id IS NOT NULL AND closed_at IS NOT NULL AND closed_by IS NOT NULL AND closed_by=responsible_user_id))
);
CREATE TABLE poms.project_completion_condition_closure (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_id uuid NOT NULL UNIQUE REFERENCES poms.project_completion_condition(id) ON DELETE RESTRICT,
    project_id uuid NOT NULL REFERENCES poms.project(id) ON DELETE RESTRICT,
    completion_record_id uuid NOT NULL REFERENCES poms.project_completion_record(id) ON DELETE RESTRICT,
    closed_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
    closed_at timestamptz NOT NULL,
    closure_summary text NOT NULL CHECK (length(btrim(closure_summary)) BETWEEN 1 AND 2000),
    source_payload jsonb NOT NULL,
    source_payload_hash varchar(64) NOT NULL CHECK (source_payload_hash ~ '^[0-9a-f]{64}$')
);
ALTER TABLE poms.project_completion_condition ADD CONSTRAINT completion_condition_closure_fk
    FOREIGN KEY (closure_record_id) REFERENCES poms.project_completion_condition_closure(id) ON DELETE RESTRICT;

ALTER TABLE poms.project_archive_record
    ADD COLUMN producer_version integer NULL,
    ADD COLUMN source_stage_record_id uuid NULL REFERENCES poms.project_stage_record(id) ON DELETE RESTRICT,
    ADD COLUMN source_payload_hash varchar(64) NULL,
    ADD COLUMN source_qualification text NULL;
ALTER TABLE poms.project_archive_record ADD CONSTRAINT archive_new_producer_check CHECK (
    producer_version IS NULL OR (producer_version=1
    AND source_payload_hash IS NOT NULL AND source_payload_hash ~ '^[0-9a-f]{64}$' AND archived_by IS NOT NULL
    AND source_qualification IS NOT NULL
    AND ((archive_anchor_stage='completed' AND archive_anchor_source_type='project-completion-record'
         AND ((source_stage_record_id IS NOT NULL AND source_qualification='verified-producer') OR source_qualification='legacy-unverified'))
      OR (archive_anchor_stage IN ('closed-lost','closed-terminated') AND archive_anchor_source_type='project'
         AND source_qualification='legacy-unverified')))
);
-- Keep uq_project_archive_record_project_current_recorded WHERE status='recorded'.
-- New closed-lost/terminated production requires a separate real close producer.
-- A legacy closed source may support an explicitly labelled archive compatibility
-- write only when status=closed, closedAt/close source evidence are real. This
-- certifies the new archive fact, not the upstream fresh-project close workflow.

CREATE TABLE poms.project_lifecycle_evidence_ref (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES poms.project(id) ON DELETE RESTRICT,
    stage_record_id uuid NULL REFERENCES poms.project_stage_record(id) ON DELETE RESTRICT,
    acceptance_record_id uuid NULL REFERENCES poms.acceptance_record(id) ON DELETE RESTRICT,
    completion_record_id uuid NULL REFERENCES poms.project_completion_record(id) ON DELETE RESTRICT,
    completion_condition_id uuid NULL REFERENCES poms.project_completion_condition(id) ON DELETE RESTRICT,
    condition_closure_id uuid NULL REFERENCES poms.project_completion_condition_closure(id) ON DELETE RESTRICT,
    archive_record_id uuid NULL REFERENCES poms.project_archive_record(id) ON DELETE RESTRICT,
    attachment_link_id uuid NOT NULL,
    attachment_id uuid NOT NULL REFERENCES poms.attachment(id) ON DELETE RESTRICT,
    attachment_row_version integer NOT NULL CHECK (attachment_row_version>0),
    checksum_sha256 varchar(64) NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
    file_name text NOT NULL,
    source_payload jsonb NOT NULL,
    source_payload_hash varchar(64) NOT NULL CHECK (source_payload_hash ~ '^[0-9a-f]{64}$'),
    frozen_at timestamptz NOT NULL,
    frozen_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
    CHECK (num_nonnulls(stage_record_id,acceptance_record_id,completion_record_id,completion_condition_id,condition_closure_id,archive_record_id)=1)
);
-- Preserve the original link ID as source evidence, without making normal
-- attachment unlink erase the frozen source. Snapshot includes original project
-- target/link status and verified object checksum. Never accept an arbitrary ID.
CREATE UNIQUE INDEX lifecycle_evidence_stage_attachment ON poms.project_lifecycle_evidence_ref(stage_record_id,attachment_id) WHERE stage_record_id IS NOT NULL;
CREATE UNIQUE INDEX lifecycle_evidence_acceptance_attachment ON poms.project_lifecycle_evidence_ref(acceptance_record_id,attachment_id) WHERE acceptance_record_id IS NOT NULL;
CREATE UNIQUE INDEX lifecycle_evidence_completion_attachment ON poms.project_lifecycle_evidence_ref(completion_record_id,attachment_id) WHERE completion_record_id IS NOT NULL;
CREATE UNIQUE INDEX lifecycle_evidence_condition_attachment ON poms.project_lifecycle_evidence_ref(completion_condition_id,attachment_id) WHERE completion_condition_id IS NOT NULL;
CREATE UNIQUE INDEX lifecycle_evidence_closure_attachment ON poms.project_lifecycle_evidence_ref(condition_closure_id,attachment_id) WHERE condition_closure_id IS NOT NULL;
CREATE UNIQUE INDEX lifecycle_evidence_archive_attachment ON poms.project_lifecycle_evidence_ref(archive_record_id,attachment_id) WHERE archive_record_id IS NOT NULL;

-- Root must freeze metadata/enum registration for the real summary definitions:
-- commission-role-freeze-confirmation / commission-role-freeze / commission-controlled;
-- project-handover-stage / project-execution-admission / project-acceptance-admission.
-- Metadata is deployed by a production migration; never by seeded approvals or
-- per-test business facts. All snapshot/payload/field-projection writes borrow
-- the same outer transaction and bind actual source hashes.
