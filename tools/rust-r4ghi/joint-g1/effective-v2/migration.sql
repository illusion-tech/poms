-- JOINT G1 REVIEW INPUT ONLY. NOT EXECUTED / NOT A REGISTERED MIGRATION.
-- Proposed one forward migration: 94 -> 95. Root promotes after independent G1.
-- Never run this file as an ad-hoc tool. Existing facts remain legacy version 0.
-- Existing semantic current/version indexes remain authoritative.
-- Runtime semantic predicates are enumerated in blueprint.json migration.runtimePredicates.
-- This draft fixes structural constraints; source hashes use the shared Rust
-- canonical serializer, never jsonb::text or a second SQL policy calculator.

-- G source and capture DDL.
-- G FINAL G1 TARGET ONLY. NOT EXECUTED. NOT A MIGRATION ENTRY POINT.
-- Root owns canonical/DTO/SQL-first migration/ORM/role grants and independent G1.
-- Preserve legacy rows as producer_version=0/null; no synthetic fact/backfill.
-- Reuse existing contract(id,project_id), term_snapshot(id,contract_id) scope keys.

ALTER TABLE poms.receipt_record
  ADD CONSTRAINT uq_r4g_receipt_scope UNIQUE(id,project_id,contract_id);

CREATE TABLE poms.receipt_accounting_basis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL UNIQUE,
  project_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  receipt_row_version integer NOT NULL CHECK(receipt_row_version>0),
  term_snapshot_id uuid NOT NULL,
  term_snapshot_version integer NOT NULL CHECK(term_snapshot_version>0),
  term_snapshot_row_version integer NOT NULL CHECK(term_snapshot_row_version>0),
  term_payload_hash varchar(64) NOT NULL CHECK(term_payload_hash~'^[0-9a-f]{64}$'),
  currency varchar(3) NOT NULL CHECK(currency~'^[A-Z]{3}$'),
  currency_source_kind varchar(64) NOT NULL,
  currency_source_id uuid NOT NULL,
  currency_source_version integer NOT NULL CHECK(currency_source_version>0),
  currency_source_hash varchar(64) NOT NULL CHECK(currency_source_hash~'^[0-9a-f]{64}$'),
  cash_gross numeric(18,2) NOT NULL CHECK(cash_gross>0),
  amount_excluding_tax numeric(18,2) NOT NULL CHECK(amount_excluding_tax>=0),
  tax_amount numeric(18,2) NOT NULL CHECK(tax_amount>=0),
  tax_rate numeric(5,4) NOT NULL CHECK(tax_rate>=0 AND tax_rate<=1),
  capture_mode varchar(32) NOT NULL CHECK(capture_mode IN ('confirm','certify-existing-basis')),
  selection_policy varchar(64) NOT NULL CHECK(selection_policy IN ('receipt-date-effective-terms','explicit-activated-terms-evidence')),
  rounding_policy varchar(64) NOT NULL CHECK(rounding_policy='gross-net-HALF_UP-cents-v1'),
  reason text NOT NULL CHECK(length(btrim(reason))>0),
  evidence_refs jsonb NOT NULL CHECK(jsonb_typeof(evidence_refs)='array'),
  frozen_payload jsonb NOT NULL CHECK(jsonb_typeof(frozen_payload)='object'),
  payload_hash varchar(64) NOT NULL CHECK(payload_hash~'^[0-9a-f]{64}$'),
  producer_version smallint NOT NULL CHECK(producer_version=1),
  row_version integer NOT NULL DEFAULT 1 CHECK(row_version=1),
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4g_receipt_basis_receipt FOREIGN KEY(receipt_id,project_id,contract_id)
    REFERENCES poms.receipt_record(id,project_id,contract_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4g_receipt_basis_terms FOREIGN KEY(term_snapshot_id,contract_id)
    REFERENCES poms.contract_term_snapshot(id,contract_id) ON DELETE RESTRICT,
  CONSTRAINT chk_r4g_receipt_split CHECK(cash_gross=amount_excluding_tax+tax_amount),
  CONSTRAINT uq_r4g_receipt_basis_project UNIQUE(id,project_id)
);
-- New actual activation may freeze currency on term snapshot. Old nulls stay null.
ALTER TABLE poms.contract_term_snapshot ADD COLUMN currency_code varchar(3) NULL;
ALTER TABLE poms.contract_term_snapshot ADD CONSTRAINT chk_r4g_term_currency
  CHECK(currency_code IS NULL OR currency_code~'^[A-Z]{3}$');
-- Basis command may instead use the existing immutable activated commercial
-- baseline currency with exact linkage/version/hash; never an unproven fallback.

CREATE TABLE poms.operating_baseline_source (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES poms.project(id) ON DELETE RESTRICT,
  original_cost_package_id uuid NOT NULL REFERENCES poms.project_technical_cost_package(id) ON DELETE RESTRICT,
  original_cost_package_version integer NOT NULL CHECK(original_cost_package_version>0),
  current_cost_package_id uuid NOT NULL REFERENCES poms.project_technical_cost_package(id) ON DELETE RESTRICT,
  current_cost_package_version integer NOT NULL CHECK(current_cost_package_version>0),
  handover_basis_id uuid NULL REFERENCES poms.project_handover_basis_snapshot(id) ON DELETE RESTRICT,
  handover_rebaseline_id uuid NULL REFERENCES poms.contract_handover_rebaseline_record(id) ON DELETE RESTRICT,
  currency varchar(3) NOT NULL CHECK(currency~'^[A-Z]{3}$'),
  approved_transitions jsonb NOT NULL CHECK(jsonb_typeof(approved_transitions)='array'),
  frozen_payload jsonb NOT NULL CHECK(jsonb_typeof(frozen_payload)='object'),
  source_hash varchar(64) NOT NULL CHECK(source_hash~'^[0-9a-f]{64}$'),
  payload_hash varchar(64) NOT NULL CHECK(payload_hash~'^[0-9a-f]{64}$'),
  producer_version smallint NOT NULL CHECK(producer_version=1),
  row_version integer NOT NULL DEFAULT 1 CHECK(row_version=1),
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
  CONSTRAINT uq_r4g_baseline_source_project UNIQUE(id,project_id)
);
ALTER TABLE poms.operating_baseline_package
  ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
  ADD COLUMN source_context_id uuid NULL,
  ADD COLUMN currency varchar(3) NULL,
  ADD COLUMN source_hash varchar(64) NULL,
  ADD COLUMN handover_baseline_cost numeric(18,2) NULL,
  ADD COLUMN execution_change_package_total numeric(18,2) NULL,
  ADD CONSTRAINT uq_r4g_baseline_package_project UNIQUE(id,project_id),
  ADD CONSTRAINT fk_r4g_baseline_source FOREIGN KEY(source_context_id,project_id)
    REFERENCES poms.operating_baseline_source(id,project_id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_r4g_baseline_certified CHECK(producer_version=0 OR
    (producer_version=1 AND source_context_id IS NOT NULL AND currency IS NOT NULL
     AND currency~'^[A-Z]{3}$' AND source_hash IS NOT NULL AND source_hash~'^[0-9a-f]{64}$'
     AND handover_baseline_cost IS NOT NULL AND execution_change_package_total IS NOT NULL));
ALTER TABLE poms.change_package_baseline
  ADD COLUMN source_kind varchar(64) NULL,
  ADD COLUMN source_id uuid NULL,
  ADD COLUMN source_row_version integer NULL,
  ADD COLUMN before_cost_package_id uuid NULL REFERENCES poms.project_technical_cost_package(id) ON DELETE RESTRICT,
  ADD COLUMN after_cost_package_id uuid NULL REFERENCES poms.project_technical_cost_package(id) ON DELETE RESTRICT,
  ADD COLUMN source_payload_hash varchar(64) NULL;
CREATE UNIQUE INDEX uq_r4g_change_transition ON poms.change_package_baseline
  (baseline_package_id,before_cost_package_id,after_cost_package_id)
  WHERE before_cost_package_id IS NOT NULL AND after_cost_package_id IS NOT NULL;
-- change_amount is server-derived project-cost successor delta, one verified
-- transition once; never signed contract amount delta or a repeated total.

CREATE TABLE poms.project_cost_inclusion_decision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES poms.project(id) ON DELETE RESTRICT,
  unit_key varchar(192) NOT NULL,
  source_chain_key varchar(192) NULL,
  cost_record_id uuid NULL REFERENCES poms.project_actual_cost_record(id) ON DELETE RESTRICT,
  allocation_result_id uuid NULL REFERENCES poms.shared_cost_allocation_result(id) ON DELETE RESTRICT,
  source_row_version integer NOT NULL CHECK(source_row_version>0),
  decision varchar(16) NOT NULL CHECK(decision IN ('include','exclude')),
  recognition_role varchar(32) NOT NULL CHECK(recognition_role IN ('direct-source','allocation-share','tax-support','evidence-only')),
  primary_cost_id uuid NULL REFERENCES poms.project_actual_cost_record(id) ON DELETE RESTRICT,
  reason_code varchar(64) NOT NULL,
  reason_text text NOT NULL CHECK(length(btrim(reason_text))>0),
  supporting_source_refs jsonb NOT NULL CHECK(jsonb_typeof(supporting_source_refs)='array'),
  evidence_refs jsonb NOT NULL CHECK(jsonb_typeof(evidence_refs)='array'),
  frozen_payload jsonb NOT NULL CHECK(jsonb_typeof(frozen_payload)='object'),
  payload_hash varchar(64) NOT NULL CHECK(payload_hash~'^[0-9a-f]{64}$'),
  supersedes_id uuid NULL REFERENCES poms.project_cost_inclusion_decision(id) ON DELETE RESTRICT,
  producer_version smallint NOT NULL CHECK(producer_version=1),
  row_version integer NOT NULL DEFAULT 1 CHECK(row_version=1),
  decided_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
  CONSTRAINT chk_r4g_inclusion_target CHECK((cost_record_id IS NULL)<>(allocation_result_id IS NULL)),
  CONSTRAINT chk_r4g_support_not_primary CHECK(recognition_role NOT IN ('tax-support','evidence-only') OR decision='exclude'),
  CONSTRAINT uq_r4g_inclusion_project_unit UNIQUE(id,project_id,unit_key)
);
CREATE UNIQUE INDEX uq_r4g_decision_successor ON poms.project_cost_inclusion_decision(supersedes_id) WHERE supersedes_id IS NOT NULL;
CREATE TABLE poms.project_cost_inclusion_head (
  project_id uuid NOT NULL REFERENCES poms.project(id) ON DELETE RESTRICT,
  unit_key varchar(192) NOT NULL,
  decision_id uuid NOT NULL,
  row_version integer NOT NULL CHECK(row_version>0),
  PRIMARY KEY(project_id,unit_key),
  FOREIGN KEY(decision_id,project_id,unit_key)
    REFERENCES poms.project_cost_inclusion_decision(id,project_id,unit_key) ON DELETE RESTRICT
);
ALTER TABLE poms.shared_cost_allocation_result
  ADD COLUMN is_included_in_project_cost boolean NOT NULL DEFAULT false,
  ADD COLUMN included_at timestamptz NULL,
  ADD COLUMN included_by uuid NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT;
-- Pool source ProjectActualCostRecord stays confirmed/not direct included;
-- actual result CAS above is the project-share inclusion fact.

CREATE TABLE poms.operating_source_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES poms.project(id) ON DELETE RESTRICT,
  snapshot_id uuid NOT NULL,
  schema_version smallint NOT NULL CHECK(schema_version=1),
  producer_version smallint NOT NULL CHECK(producer_version=1),
  policy_version varchar(64) NOT NULL,
  policy_hash varchar(64) NOT NULL CHECK(policy_hash~'^[0-9a-f]{64}$'),
  currency varchar(3) NOT NULL CHECK(currency~'^[A-Z]{3}$'),
  business_cutoff date NOT NULL,
  knowledge_cutoff timestamptz NOT NULL,
  business_timezone varchar(64) NOT NULL CHECK(business_timezone='Asia/Hong_Kong'),
  scope_hash varchar(64) NOT NULL CHECK(scope_hash~'^[0-9a-f]{64}$'),
  source_hash varchar(64) NOT NULL CHECK(source_hash~'^[0-9a-f]{64}$'),
  payload_hash varchar(64) NOT NULL CHECK(payload_hash~'^[0-9a-f]{64}$'),
  frozen_payload jsonb NOT NULL CHECK(jsonb_typeof(frozen_payload)='object'),
  formal_eligibility varchar(32) NOT NULL CHECK(formal_eligibility='eligible'),
  contains_labor varchar(16) NOT NULL CHECK(contains_labor IN ('yes','no','unknown')),
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
  row_version integer NOT NULL DEFAULT 1 CHECK(row_version=1),
  CONSTRAINT uq_r4g_context_snapshot UNIQUE(snapshot_id),
  CONSTRAINT uq_r4g_context_scope UNIQUE(id,project_id,snapshot_id)
);
ALTER TABLE poms.project_operating_snapshot
  ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
  ADD COLUMN captured_row_version integer NULL,
  ADD COLUMN source_context_id uuid NULL,
  ADD COLUMN source_hash varchar(64) NULL,
  ADD COLUMN currency varchar(3) NULL,
  ADD COLUMN period_end_snapshot_id uuid NULL,
  ADD COLUMN root_snapshot_id uuid NULL,
  ADD CONSTRAINT uq_r4g_project_snapshot_scope UNIQUE(id,project_id),
  ADD CONSTRAINT fk_r4g_snapshot_context FOREIGN KEY(source_context_id,project_id,id)
    REFERENCES poms.operating_source_context(id,project_id,snapshot_id)
    DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT fk_r4g_snapshot_supersedes FOREIGN KEY(supersedes_id,project_id)
    REFERENCES poms.project_operating_snapshot(id,project_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_r4g_snapshot_root FOREIGN KEY(root_snapshot_id,project_id)
    REFERENCES poms.project_operating_snapshot(id,project_id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_r4g_snapshot_verified CHECK(producer_version=0 OR
    (producer_version=1 AND captured_row_version IS NOT NULL AND captured_row_version=1
     AND source_context_id IS NOT NULL AND source_hash IS NOT NULL
     AND source_hash~'^[0-9a-f]{64}$' AND currency IS NOT NULL AND currency~'^[A-Z]{3}$'));
ALTER TABLE poms.operating_source_context
  ADD CONSTRAINT fk_r4g_context_snapshot FOREIGN KEY(snapshot_id,project_id)
    REFERENCES poms.project_operating_snapshot(id,project_id)
    DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX uq_r4g_snapshot_successor ON poms.project_operating_snapshot(supersedes_id)
  WHERE producer_version=1 AND supersedes_id IS NOT NULL;
-- Only derived ratio widens. Contract/tax/cost-rate precision remains frozen.
ALTER TABLE poms.project_operating_snapshot ALTER COLUMN gross_margin_rate TYPE numeric(38,6);
ALTER TABLE poms.period_closing_snapshot ALTER COLUMN gross_margin_rate TYPE numeric(38,6);

CREATE TABLE poms.operating_snapshot_cost_member (
  snapshot_id uuid NOT NULL,
  project_id uuid NOT NULL,
  unit_key varchar(192) NOT NULL,
  decision_id uuid NOT NULL,
  captured_source_version integer NOT NULL CHECK(captured_source_version>0),
  captured_payload_hash varchar(64) NOT NULL CHECK(captured_payload_hash~'^[0-9a-f]{64}$'),
  net_knowledge varchar(16) NOT NULL CHECK(net_knowledge IN ('known','unknown')),
  amount_excluding_tax numeric(18,2) NULL,
  tax_cost_amount numeric(18,2) NULL,
  amount_including_tax numeric(18,2) NULL,
  frozen_payload jsonb NOT NULL CHECK(jsonb_typeof(frozen_payload)='object'),
  PRIMARY KEY(snapshot_id,unit_key),
  FOREIGN KEY(snapshot_id,project_id) REFERENCES poms.project_operating_snapshot(id,project_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(decision_id,project_id,unit_key) REFERENCES poms.project_cost_inclusion_decision(id,project_id,unit_key),
  CHECK((net_knowledge='known')=(amount_excluding_tax IS NOT NULL))
);
CREATE TABLE poms.operating_source_member (
  context_id uuid NOT NULL REFERENCES poms.operating_source_context(id) ON DELETE RESTRICT,
  member_key varchar(256) NOT NULL,
  source_kind varchar(64) NOT NULL,
  source_id uuid NOT NULL,
  source_row_version integer NOT NULL CHECK(source_row_version>0),
  source_payload_hash varchar(64) NOT NULL CHECK(source_payload_hash~'^[0-9a-f]{64}$'),
  captured_payload jsonb NOT NULL CHECK(jsonb_typeof(captured_payload)='object'),
  PRIMARY KEY(context_id,member_key)
);

ALTER TABLE poms.period_closing_snapshot
  ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
  ADD COLUMN project_snapshot_id uuid NULL,
  ADD COLUMN period_start date NULL,
  ADD COLUMN period_end date NULL,
  ADD COLUMN business_timezone varchar(64) NULL,
  ADD COLUMN source_context_id uuid NULL,
  ADD COLUMN source_hash varchar(64) NULL,
  ADD CONSTRAINT uq_r4g_period_project UNIQUE(id,project_id),
  ADD CONSTRAINT fk_r4g_period_snapshot FOREIGN KEY(project_snapshot_id,project_id)
    REFERENCES poms.project_operating_snapshot(id,project_id) DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT fk_r4g_period_context FOREIGN KEY(source_context_id,project_id,project_snapshot_id)
    REFERENCES poms.operating_source_context(id,project_id,snapshot_id) DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT chk_r4g_period_verified CHECK(producer_version=0 OR
    (producer_version=1 AND project_snapshot_id IS NOT NULL AND period_start IS NOT NULL
     AND period_end IS NOT NULL AND period_start<=period_end AND source_context_id IS NOT NULL
     AND source_hash IS NOT NULL AND source_hash~'^[0-9a-f]{64}$'
     AND business_timezone IS NOT NULL AND business_timezone='Asia/Hong_Kong'));
ALTER TABLE poms.project_operating_snapshot ADD CONSTRAINT fk_r4g_snapshot_period
  FOREIGN KEY(period_end_snapshot_id,project_id) REFERENCES poms.period_closing_snapshot(id,project_id)
  DEFERRABLE INITIALLY DEFERRED;
-- Live correction must not fabricate a period. Null is explicit live scope.
ALTER TABLE poms.operating_restatement_record ALTER COLUMN period_end_snapshot_id DROP NOT NULL;
ALTER TABLE poms.operating_restatement_record
  ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
  ADD COLUMN restatement_scope varchar(16) NULL,
  ADD COLUMN root_snapshot_id uuid NULL,
  ADD COLUMN causal_source_refs jsonb NULL,
  ADD COLUMN before_source_hash varchar(64) NULL,
  ADD COLUMN after_source_hash varchar(64) NULL,
  ADD COLUMN restatement_batch_id uuid NULL,
  ADD CONSTRAINT fk_r4g_restatement_period FOREIGN KEY(period_end_snapshot_id,project_id)
    REFERENCES poms.period_closing_snapshot(id,project_id),
  ADD CONSTRAINT fk_r4g_restatement_before FOREIGN KEY(restates_snapshot_id,project_id)
    REFERENCES poms.project_operating_snapshot(id,project_id),
  ADD CONSTRAINT fk_r4g_restatement_after FOREIGN KEY(restated_snapshot_id,project_id)
    REFERENCES poms.project_operating_snapshot(id,project_id),
  ADD CONSTRAINT fk_r4g_restatement_root FOREIGN KEY(root_snapshot_id,project_id)
    REFERENCES poms.project_operating_snapshot(id,project_id),
  ADD CONSTRAINT chk_r4g_restatement_verified CHECK(producer_version=0 OR
    (producer_version=1 AND restatement_scope IS NOT NULL AND restatement_scope IN ('live','period') AND root_snapshot_id IS NOT NULL
     AND (restatement_scope='period')=(period_end_snapshot_id IS NOT NULL)
     AND causal_source_refs IS NOT NULL AND jsonb_typeof(causal_source_refs)='array'
     AND before_source_hash IS NOT NULL AND before_source_hash~'^[0-9a-f]{64}$'
     AND after_source_hash IS NOT NULL AND after_source_hash~'^[0-9a-f]{64}$' AND restatement_batch_id IS NOT NULL));
CREATE TABLE poms.project_operating_head (
  project_id uuid PRIMARY KEY REFERENCES poms.project(id) ON DELETE RESTRICT,
  baseline_package_id uuid NULL,
  current_snapshot_id uuid NULL,
  row_version integer NOT NULL DEFAULT 0 CHECK(row_version>=0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL REFERENCES poms.platform_user(id),
  FOREIGN KEY(baseline_package_id,project_id) REFERENCES poms.operating_baseline_package(id,project_id),
  FOREIGN KEY(current_snapshot_id,project_id) REFERENCES poms.project_operating_snapshot(id,project_id)
);


-- I lifecycle and minimal R5 DDL.
-- REVIEW PROPOSAL ONLY. NOT EXECUTED. NOT A REGISTERED MIGRATION.
-- Root owns final migration/entity/shared-schema alignment and metadata rows.
-- No seeded business facts, role freezes, advanced stages or approvals.

CREATE TABLE poms.project_stage_record (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES poms.project(id) ON DELETE RESTRICT,
    sequence_no integer NOT NULL CHECK (sequence_no > 0),
    event_type text NOT NULL CHECK (event_type IN ('stage-entered','stage-requalified')),
    from_stage text NOT NULL,
    to_stage text NOT NULL CHECK (to_stage IN ('handover','execution','acceptance','completed','conditional-completed')),
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
        OR (to_stage IN ('completed','conditional-completed') AND from_stage='acceptance' AND previous_stage_record_id IS NOT NULL AND source_role_assignment_id IS NOT NULL AND source_completion_record_id IS NOT NULL)
    ),
    CHECK ((event_type='stage-requalified') = (from_stage='handover' AND to_stage='handover'))
);
ALTER TABLE poms.project ADD COLUMN current_stage_record_id uuid NULL;
ALTER TABLE poms.project ADD CONSTRAINT project_current_stage_record_same_project_fk
    FOREIGN KEY (current_stage_record_id,id) REFERENCES poms.project_stage_record(id,project_id) ON DELETE RESTRICT;

ALTER TABLE poms.commission_role_assignment
    ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
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
    producer_version=0 OR
    (producer_version=1 AND weights_policy_version IS NOT NULL AND weights_policy_version='normalized-six-v1-zero-reason'
     AND (status<>'frozen' OR (freeze_payload_id IS NOT NULL AND freeze_payload_id=id AND frozen_at IS NOT NULL AND frozen_by IS NOT NULL
         AND source_handover_id IS NOT NULL AND contract_summary_snapshot_id IS NOT NULL
         AND handover_summary_snapshot_id IS NOT NULL AND effective_handover_baseline_snapshot_id IS NOT NULL)))
);
-- Keep existing commission_role_assignment_project_version_unique and
-- uq_commission_role_assignment_project_current. Draft replacement uses CAS;
-- current frozen may only change through the separately governed dispute chain.

ALTER TABLE poms.acceptance_record
    ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
    ADD COLUMN source_stage_record_id uuid NULL REFERENCES poms.project_stage_record(id) ON DELETE RESTRICT,
    ADD COLUMN source_payload_hash varchar(64) NULL,
    ADD COLUMN conditional_summary text NULL;
ALTER TABLE poms.acceptance_record ADD CONSTRAINT acceptance_new_producer_check CHECK (
    producer_version=0 OR (producer_version=1 AND source_stage_record_id IS NOT NULL
    AND source_payload_hash IS NOT NULL AND source_payload_hash ~ '^[0-9a-f]{64}$' AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL
    AND acceptance_type IN ('stage-outcome','stage-acceptance','final-acceptance')
    AND acceptance_result IN ('accepted','conditional','rejected')
    AND (acceptance_result<>'conditional' OR (conditional_summary IS NOT NULL AND length(btrim(conditional_summary))>0)))
);
ALTER TABLE poms.project_completion_record
    ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
    ADD COLUMN source_stage_record_id uuid NULL REFERENCES poms.project_stage_record(id) ON DELETE RESTRICT,
    ADD COLUMN source_payload_hash varchar(64) NULL,
    ADD COLUMN condition_status text NULL;
ALTER TABLE poms.project_completion_record ADD CONSTRAINT completion_new_producer_check CHECK (
    producer_version=0 OR (producer_version=1 AND source_stage_record_id IS NOT NULL
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
    ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
    ADD COLUMN source_stage_record_id uuid NULL REFERENCES poms.project_stage_record(id) ON DELETE RESTRICT,
    ADD COLUMN source_payload_hash varchar(64) NULL,
    ADD COLUMN source_qualification text NULL;
ALTER TABLE poms.project_archive_record ADD CONSTRAINT archive_new_producer_check CHECK (
    producer_version=0 OR (producer_version=1
    AND source_payload_hash IS NOT NULL AND source_payload_hash ~ '^[0-9a-f]{64}$' AND archived_by IS NOT NULL
    AND source_qualification IS NOT NULL
    AND ((archive_anchor_stage IN ('completed','conditional-completed') AND archive_anchor_source_type='project-completion-record'
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



-- H immutable policy output and same-source review overlays.
CREATE TABLE poms.operating_evaluation_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL,
 snapshot_id uuid NOT NULL, source_context_id uuid NOT NULL,
 producer_version smallint NOT NULL CHECK(producer_version=1),
 policy_version varchar(64) NOT NULL CHECK(policy_version='r4h-operating-v1'),
 policy_hash varchar(64) NOT NULL CHECK(policy_hash~'^[0-9a-f]{64}$'),
 source_hash varchar(64) NOT NULL CHECK(source_hash~'^[0-9a-f]{64}$'),
 evaluation_hash varchar(64) NOT NULL CHECK(evaluation_hash~'^[0-9a-f]{64}$'),
 frozen_output jsonb NOT NULL CHECK(jsonb_typeof(frozen_output)='object'),
 output_payload_hash varchar(64) NOT NULL CHECK(output_payload_hash~'^[0-9a-f]{64}$'),
 contains_labor varchar(16) NOT NULL CHECK(contains_labor IN ('yes','no','unknown')),
 evaluated_at timestamptz NOT NULL, evaluated_by uuid NOT NULL REFERENCES poms.platform_user(id),
 row_version integer NOT NULL DEFAULT 1 CHECK(row_version=1),
 UNIQUE(id,project_id,snapshot_id), UNIQUE(snapshot_id,policy_version),
 FOREIGN KEY(source_context_id,project_id,snapshot_id)
   REFERENCES poms.operating_source_context(id,project_id,snapshot_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE poms.operating_evaluation_reason (
 evidence_id uuid NOT NULL REFERENCES poms.operating_evaluation_evidence(id),
 reason_index integer NOT NULL CHECK(reason_index>=0), rule_id varchar(8) NOT NULL,
 reason_code varchar(128) NOT NULL CHECK(length(btrim(reason_code))>0),
 project_action varchar(16) NOT NULL CHECK(project_action IN ('prompt','review','block')),
 stage_actions jsonb NOT NULL CHECK(jsonb_typeof(stage_actions)='object'),
 project_primary boolean NOT NULL, stage_primaries jsonb NOT NULL CHECK(jsonb_typeof(stage_primaries)='array'),
 source_refs jsonb NOT NULL CHECK(jsonb_typeof(source_refs)='array'),
 frozen_payload jsonb NOT NULL CHECK(jsonb_typeof(frozen_payload)='object'),
 payload_hash varchar(64) NOT NULL CHECK(payload_hash~'^[0-9a-f]{64}$'),
 PRIMARY KEY(evidence_id,reason_index), CHECK(rule_id IN ('H01','H02','H03','H04','H05','H06','H07','H08','H09','H10','H11'))
);
ALTER TABLE poms.data_maturity_evaluation_result
 ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
 ADD COLUMN evidence_id uuid NULL,
 ADD COLUMN tax_pending_knowledge varchar(16) NULL,
 ADD CONSTRAINT uq_jghi_dmer_scope UNIQUE(id,project_id,referenced_snapshot_id),
 ADD CONSTRAINT fk_jghi_dmer_evidence FOREIGN KEY(evidence_id,project_id,referenced_snapshot_id)
  REFERENCES poms.operating_evaluation_evidence(id,project_id,snapshot_id),
 ADD CONSTRAINT ck_jghi_dmer_v1 CHECK(producer_version=0 OR (producer_version=1 AND evidence_id IS NOT NULL
  AND tax_pending_knowledge IS NOT NULL AND tax_pending_knowledge IN ('known','unknown')
  AND ((tax_pending_knowledge='known' AND tax_impact_pending_amount IS NOT NULL)
    OR (tax_pending_knowledge='unknown' AND tax_impact_pending_amount IS NULL))));
ALTER TABLE poms.data_maturity_evaluation_result ALTER COLUMN tax_impact_pending_amount DROP NOT NULL;
ALTER TABLE poms.operating_signal_evaluation_result
 ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
 ADD COLUMN evidence_id uuid NULL,
 ADD CONSTRAINT uq_jghi_oser_scope UNIQUE(id,project_id,referenced_snapshot_id),
 ADD CONSTRAINT fk_jghi_oser_evidence FOREIGN KEY(evidence_id,project_id,referenced_snapshot_id)
  REFERENCES poms.operating_evaluation_evidence(id,project_id,snapshot_id),
 ADD CONSTRAINT fk_jghi_oser_maturity_scope FOREIGN KEY(data_maturity_evaluation_id,project_id,referenced_snapshot_id)
  REFERENCES poms.data_maturity_evaluation_result(id,project_id,referenced_snapshot_id) NOT VALID,
 ADD CONSTRAINT ck_jghi_oser_v1 CHECK(producer_version=0 OR (producer_version=1 AND evidence_id IS NOT NULL));
ALTER TABLE poms.operating_signal_review_record
 ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
 ADD COLUMN evidence_id uuid NULL REFERENCES poms.operating_evaluation_evidence(id),
 ADD COLUMN source_hash varchar(64) NULL, ADD COLUMN evaluation_hash varchar(64) NULL,
 ADD COLUMN expected_signal_version integer NULL,
 ADD COLUMN review_payload jsonb NULL, ADD COLUMN payload_hash varchar(64) NULL,
 ADD COLUMN supersedes_id uuid NULL REFERENCES poms.operating_signal_review_record(id),
 ADD CONSTRAINT ck_jghi_osreview_v1 CHECK(producer_version=0 OR
  (producer_version=1 AND evidence_id IS NOT NULL AND source_hash IS NOT NULL AND source_hash~'^[0-9a-f]{64}$'
   AND evaluation_hash IS NOT NULL AND evaluation_hash~'^[0-9a-f]{64}$'
   AND expected_signal_version IS NOT NULL AND expected_signal_version>0
   AND review_payload IS NOT NULL AND jsonb_typeof(review_payload)='object'
   AND payload_hash IS NOT NULL AND payload_hash~'^[0-9a-f]{64}$' AND handled_by IS NOT NULL));
CREATE UNIQUE INDEX uq_jghi_signal_review_current ON poms.operating_signal_review_record(signal_evaluation_id)
 WHERE producer_version=1 AND status='active';
CREATE UNIQUE INDEX uq_jghi_signal_review_successor ON poms.operating_signal_review_record(supersedes_id)
 WHERE supersedes_id IS NOT NULL;
ALTER TABLE poms.operating_signal_gate_binding
 ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
 ADD COLUMN evidence_id uuid NULL REFERENCES poms.operating_evaluation_evidence(id),
 ADD COLUMN signal_review_id uuid NULL REFERENCES poms.operating_signal_review_record(id),
 ADD COLUMN system_binding_action varchar(16) NULL,
 ADD COLUMN tax_pending_knowledge varchar(16) NULL,
 ADD COLUMN evaluation_hash varchar(64) NULL,
 ADD COLUMN current_summary_id uuid NULL REFERENCES poms.approval_summary_snapshot(id) DEFERRABLE INITIALLY DEFERRED,
 ADD COLUMN supersedes_id uuid NULL REFERENCES poms.operating_signal_gate_binding(id),
 ADD CONSTRAINT uq_jghi_binding_project UNIQUE(id,project_id),
 ADD CONSTRAINT ck_jghi_binding_v1 CHECK(producer_version=0 OR
  (producer_version=1 AND evidence_id IS NOT NULL AND system_binding_action IS NOT NULL
   AND system_binding_action IN ('prompt','review','block') AND gate_stage_type IN ('first','second','final','retention')
   AND evaluation_hash IS NOT NULL AND evaluation_hash~'^[0-9a-f]{64}$' AND current_summary_id IS NOT NULL
   AND tax_pending_knowledge IS NOT NULL AND tax_pending_knowledge IN ('known','unknown')
   AND ((tax_pending_knowledge='known' AND tax_impact_pending_amount IS NOT NULL)
     OR (tax_pending_knowledge='unknown' AND tax_impact_pending_amount IS NULL))));
ALTER TABLE poms.operating_signal_gate_binding ALTER COLUMN tax_impact_pending_amount DROP NOT NULL;
ALTER TABLE poms.commission_gate_review_record
 ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
 ADD COLUMN evidence_id uuid NULL REFERENCES poms.operating_evaluation_evidence(id),
 ADD COLUMN source_summary_snapshot_id uuid NULL REFERENCES poms.approval_summary_snapshot(id),
 ADD COLUMN source_hash varchar(64) NULL, ADD COLUMN evaluation_hash varchar(64) NULL,
 ADD COLUMN policy_hash varchar(64) NULL, ADD COLUMN evidence_hash varchar(64) NULL,
 ADD COLUMN review_action varchar(32) NULL, ADD COLUMN review_payload jsonb NULL,
 ADD COLUMN supersedes_id uuid NULL REFERENCES poms.commission_gate_review_record(id),
 ADD CONSTRAINT ck_jghi_gate_review_v1 CHECK(producer_version=0 OR
  (producer_version=1 AND evidence_id IS NOT NULL AND source_summary_snapshot_id IS NOT NULL
   AND source_hash IS NOT NULL AND source_hash~'^[0-9a-f]{64}$'
   AND evaluation_hash IS NOT NULL AND evaluation_hash~'^[0-9a-f]{64}$'
   AND policy_hash IS NOT NULL AND policy_hash~'^[0-9a-f]{64}$'
   AND evidence_hash IS NOT NULL AND evidence_hash~'^[0-9a-f]{64}$'
   AND review_action IS NOT NULL AND review_action IN ('acknowledge','tighten-review','tighten-block')
   AND review_payload IS NOT NULL AND jsonb_typeof(review_payload)='object' AND handled_by IS NOT NULL));
CREATE UNIQUE INDEX uq_jghi_gate_review_current ON poms.commission_gate_review_record(binding_id)
 WHERE producer_version=1 AND status='active';
CREATE TABLE poms.operating_gate_summary_payload (
 summary_snapshot_id uuid PRIMARY KEY REFERENCES poms.approval_summary_snapshot(id),
 binding_id uuid NOT NULL, binding_row_version integer NOT NULL CHECK(binding_row_version>0),
 project_id uuid NOT NULL, gate_stage_type varchar(32) NOT NULL CHECK(gate_stage_type IN ('first','second','final','retention')),
 snapshot_id uuid NOT NULL, evidence_id uuid NOT NULL,
 source_hash varchar(64) NOT NULL CHECK(source_hash~'^[0-9a-f]{64}$'),
 evaluation_hash varchar(64) NOT NULL CHECK(evaluation_hash~'^[0-9a-f]{64}$'),
 policy_version varchar(64) NOT NULL, policy_hash varchar(64) NOT NULL CHECK(policy_hash~'^[0-9a-f]{64}$'),
 source_summary_snapshot_id uuid NULL REFERENCES poms.approval_summary_snapshot(id),
 signal_review_id uuid NULL REFERENCES poms.operating_signal_review_record(id),
 gate_review_id uuid NULL REFERENCES poms.commission_gate_review_record(id) DEFERRABLE INITIALLY DEFERRED,
 frozen_payload jsonb NOT NULL CHECK(jsonb_typeof(frozen_payload)='object'),
 payload_hash varchar(64) NOT NULL CHECK(payload_hash~'^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL, created_by uuid NOT NULL REFERENCES poms.platform_user(id),
 FOREIGN KEY(binding_id,project_id) REFERENCES poms.operating_signal_gate_binding(id,project_id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(evidence_id,project_id,snapshot_id) REFERENCES poms.operating_evaluation_evidence(id,project_id,snapshot_id)
);
CREATE TABLE poms.operating_command_receipt (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id varchar(160) NOT NULL,
 target_scope varchar(192) NOT NULL, actor_id uuid NOT NULL REFERENCES poms.platform_user(id),
 request_key uuid NOT NULL, request_hash varchar(64) NOT NULL CHECK(request_hash~'^[0-9a-f]{64}$'),
 authorized_response jsonb NOT NULL CHECK(jsonb_typeof(authorized_response)='object'),
 http_status integer NOT NULL CHECK(http_status BETWEEN 200 AND 299),
 source_hash varchar(64) NOT NULL CHECK(source_hash~'^[0-9a-f]{64}$'),
 evaluation_hash varchar(64) NOT NULL CHECK(evaluation_hash~'^[0-9a-f]{64}$'),
 committed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(operation_id,target_scope,actor_id,request_key)
);

-- Existing lower-case enum checks may be named by the direct-cutover migration.
-- Exact constraint names from the migration ancestry are dropped only for these
-- two fields; unknown/normal do not extend maturity or arbitrary stage enums.
ALTER TABLE poms.operating_signal_evaluation_result
 DROP CONSTRAINT IF EXISTS chk_operating_signal_evaluation_result_signal_level,
 DROP CONSTRAINT IF EXISTS chk_operating_signal_evaluation_result_risk_level;
ALTER TABLE poms.operating_signal_evaluation_result
 ADD CONSTRAINT ck_jghi_signal_level CHECK(signal_level IN ('attention','alert','normal','unknown')),
 ADD CONSTRAINT ck_jghi_risk_level CHECK(risk_level IN ('attention','risk','normal','unknown'));

-- Structural same-project constraints supplement the existing single-id FKs.
ALTER TABLE poms.project_handover ADD CONSTRAINT uq_jghi_handover_project UNIQUE(id,project_id);
ALTER TABLE poms.commission_role_assignment ADD CONSTRAINT uq_jghi_assignment_project UNIQUE(id,project_id);
ALTER TABLE poms.acceptance_record ADD CONSTRAINT uq_jghi_acceptance_project UNIQUE(id,project_id);
ALTER TABLE poms.project_completion_record ADD CONSTRAINT uq_jghi_completion_project UNIQUE(id,project_id);
ALTER TABLE poms.project_stage_record
 ADD CONSTRAINT fk_jghi_stage_previous_project FOREIGN KEY(previous_stage_record_id,project_id) REFERENCES poms.project_stage_record(id,project_id),
 ADD CONSTRAINT fk_jghi_stage_handover_project FOREIGN KEY(source_handover_id,project_id) REFERENCES poms.project_handover(id,project_id),
 ADD CONSTRAINT fk_jghi_stage_assignment_project FOREIGN KEY(source_role_assignment_id,project_id) REFERENCES poms.commission_role_assignment(id,project_id),
 ADD CONSTRAINT fk_jghi_stage_completion_project FOREIGN KEY(source_completion_record_id,project_id) REFERENCES poms.project_completion_record(id,project_id);
ALTER TABLE poms.commission_role_assignment_freeze_payload
 ADD CONSTRAINT fk_jghi_freeze_assignment_project FOREIGN KEY(assignment_id,project_id) REFERENCES poms.commission_role_assignment(id,project_id),
 ADD CONSTRAINT fk_jghi_freeze_handover_project FOREIGN KEY(handover_id,project_id) REFERENCES poms.project_handover(id,project_id);
ALTER TABLE poms.acceptance_record ADD CONSTRAINT fk_jghi_acceptance_stage_project
 FOREIGN KEY(source_stage_record_id,project_id) REFERENCES poms.project_stage_record(id,project_id) NOT VALID;
ALTER TABLE poms.project_completion_record
 ADD CONSTRAINT fk_jghi_completion_stage_project FOREIGN KEY(source_stage_record_id,project_id) REFERENCES poms.project_stage_record(id,project_id) NOT VALID,
 ADD CONSTRAINT fk_jghi_completion_acceptance_project FOREIGN KEY(acceptance_record_id,project_id) REFERENCES poms.acceptance_record(id,project_id) NOT VALID;
ALTER TABLE poms.project_completion_condition
 ADD CONSTRAINT uq_jghi_condition_scope UNIQUE(id,completion_record_id,project_id),
 ADD CONSTRAINT fk_jghi_condition_parent FOREIGN KEY(completion_record_id,project_id) REFERENCES poms.project_completion_record(id,project_id);
ALTER TABLE poms.project_completion_condition_closure ADD CONSTRAINT fk_jghi_closure_parent
 FOREIGN KEY(condition_id,completion_record_id,project_id) REFERENCES poms.project_completion_condition(id,completion_record_id,project_id);
ALTER TABLE poms.project_archive_record ADD CONSTRAINT fk_jghi_archive_stage_project
 FOREIGN KEY(source_stage_record_id,project_id) REFERENCES poms.project_stage_record(id,project_id) NOT VALID;
ALTER TABLE poms.project_stage_record ADD CONSTRAINT ck_jghi_stage_payload_object CHECK(jsonb_typeof(source_payload)='object');
ALTER TABLE poms.commission_role_assignment_freeze_payload ADD CONSTRAINT ck_jghi_freeze_payload_object CHECK(jsonb_typeof(source_payload)='object');
ALTER TABLE poms.project_completion_condition_closure ADD CONSTRAINT ck_jghi_closure_payload_object CHECK(jsonb_typeof(source_payload)='object');
ALTER TABLE poms.project_lifecycle_evidence_ref ADD CONSTRAINT ck_jghi_lifecycle_payload_object CHECK(jsonb_typeof(source_payload)='object');
ALTER TABLE poms.shared_cost_allocation_result ADD CONSTRAINT ck_jghi_share_consumed
 CHECK((NOT is_included_in_project_cost AND included_at IS NULL AND included_by IS NULL)
    OR (is_included_in_project_cost AND included_at IS NOT NULL AND included_by IS NOT NULL));

-- Immutable new evidence tables: no UPDATE/DELETE through ordinary DML.
-- Authorized development cleanup remains separately governed, not a runtime
-- client flag or a SECURITY DEFINER bypass in this migration.
CREATE FUNCTION poms.jghi_reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'immutable GHI evidence cannot be changed' USING ERRCODE='23514';
END $$;
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.receipt_accounting_basis
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.operating_baseline_source
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.project_cost_inclusion_decision
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.operating_source_context
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.operating_snapshot_cost_member
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.operating_source_member
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.operating_evaluation_evidence
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.operating_evaluation_reason
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.operating_gate_summary_payload
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.operating_command_receipt
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.project_stage_record
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.commission_role_assignment_freeze_payload
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.project_completion_condition_closure
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();
CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.project_lifecycle_evidence_ref
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();

-- Frozen assignment participants are immutable; drafts are new versions rather
-- than in-place participant edits. This also prevents normal DELETE FK escape.
CREATE FUNCTION poms.jghi_assignment_participant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id uuid;
BEGIN
 IF TG_OP='UPDATE' AND NEW.assignment_id IS DISTINCT FROM OLD.assignment_id THEN
  RAISE EXCEPTION 'assignment participant cannot be reparented' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN parent_id:=OLD.assignment_id; ELSE parent_id:=NEW.assignment_id; END IF;
 IF EXISTS(SELECT 1 FROM poms.commission_role_assignment a WHERE a.id=parent_id AND a.status='frozen') THEN
  RAISE EXCEPTION 'frozen assignment participants immutable' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER jghi_frozen_participant BEFORE INSERT OR UPDATE OR DELETE
 ON poms.commission_role_assignment_participant FOR EACH ROW EXECUTE FUNCTION poms.jghi_assignment_participant_guard();

-- Deferred final-state validators allow same-TX domain+evidence construction.
CREATE FUNCTION poms.jghi_assignment_total_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a record; n bigint; total bigint;
BEGIN
 IF TG_TABLE_NAME='commission_role_assignment' THEN
  SELECT * INTO a FROM poms.commission_role_assignment WHERE id=NEW.id;
 ELSE
  SELECT * INTO a FROM poms.commission_role_assignment WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.assignment_id ELSE NEW.assignment_id END;
 END IF;
 IF a.producer_version=1 THEN
   SELECT count(*),sum(weight_units) INTO n,total FROM poms.commission_role_assignment_participant WHERE assignment_id=a.id;
   IF n=0 OR total IS DISTINCT FROM 1000000::bigint THEN
     RAISE EXCEPTION 'assignment weights must sum exactly one million' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_assignment_total AFTER INSERT OR UPDATE
 ON poms.commission_role_assignment DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_assignment_total_guard();
CREATE CONSTRAINT TRIGGER jghi_participant_total AFTER INSERT OR UPDATE OR DELETE
 ON poms.commission_role_assignment_participant DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_assignment_total_guard();

CREATE FUNCTION poms.jghi_completion_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cr record; ar record; n bigint; open_count bigint;
BEGIN
 IF TG_TABLE_NAME='project_completion_record' THEN
   SELECT * INTO cr FROM poms.project_completion_record WHERE id=NEW.id;
 ELSE
   SELECT * INTO cr FROM poms.project_completion_record WHERE id=NEW.completion_record_id;
 END IF;
 IF cr.producer_version=1 THEN
   SELECT * INTO ar FROM poms.acceptance_record WHERE id=cr.acceptance_record_id;
   IF ar.id IS NULL OR ar.project_id IS DISTINCT FROM cr.project_id OR ar.producer_version<>1
      OR ar.status<>'confirmed' OR ar.acceptance_type<>'final-acceptance'
      OR NOT ((ar.acceptance_result='accepted' AND cr.completion_result='completed')
           OR (ar.acceptance_result='conditional' AND cr.completion_result='conditional-completed')) THEN
     RAISE EXCEPTION 'completion requires same-project true final acceptance and exact result mapping' USING ERRCODE='23514';
   END IF;
   SELECT count(*),count(*) FILTER(WHERE status='pending') INTO n,open_count
    FROM poms.project_completion_condition WHERE completion_record_id=cr.id;
   IF (cr.completion_result='completed' AND (n<>0 OR cr.condition_status<>'not-applicable'))
      OR (cr.completion_result='conditional-completed' AND
          (n=0 OR cr.condition_status IS DISTINCT FROM CASE WHEN open_count=0 THEN 'closed' ELSE 'pending' END)) THEN
     RAISE EXCEPTION 'completion condition aggregate differs from actual complete condition set' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_completion_valid AFTER INSERT OR UPDATE
 ON poms.project_completion_record DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_completion_guard();
CREATE CONSTRAINT TRIGGER jghi_condition_aggregate AFTER INSERT OR UPDATE
 ON poms.project_completion_condition DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_completion_guard();

CREATE FUNCTION poms.jghi_archive_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a record; c record;
BEGIN
 SELECT * INTO a FROM poms.project_archive_record WHERE id=NEW.id;
 IF a.producer_version=1 AND a.status='recorded' AND a.archive_anchor_source_type='project-completion-record' THEN
   SELECT * INTO c FROM poms.project_completion_record WHERE id=a.archive_anchor_source_id;
   IF c.id IS NULL OR c.project_id IS DISTINCT FROM a.project_id OR c.status<>'confirmed'
     OR (c.producer_version=1 AND c.condition_status='pending')
     OR (c.producer_version<>1 AND c.completion_result='conditional-completed') THEN
     RAISE EXCEPTION 'archive completion anchor unavailable or conditions pending/unknown' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_archive_valid AFTER INSERT OR UPDATE
 ON poms.project_archive_record DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_archive_guard();

-- Normal updates to G captured facts may change only lifecycle metadata. H
-- manual reviews never modify these rows, even when effective action changes.
CREATE FUNCTION poms.jghi_snapshot_fact_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.producer_version=1 AND
   (to_jsonb(NEW)-ARRAY['status','is_current','row_version','updated_at','updated_by'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','is_current','row_version','updated_at','updated_by']) THEN
   RAISE EXCEPTION 'captured operating facts immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER jghi_snapshot_fact_guard BEFORE UPDATE ON poms.project_operating_snapshot
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_snapshot_fact_guard();
CREATE TRIGGER jghi_period_fact_guard BEFORE UPDATE ON poms.period_closing_snapshot
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_snapshot_fact_guard();
CREATE TRIGGER jghi_dmer_fact_guard BEFORE UPDATE ON poms.data_maturity_evaluation_result
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_snapshot_fact_guard();
CREATE TRIGGER jghi_oser_fact_guard BEFORE UPDATE ON poms.operating_signal_evaluation_result
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_snapshot_fact_guard();

-- Completion result and its original final acceptance are immutable. Closing
-- conditions updates only aggregate state/version and ordinary audit metadata.
CREATE FUNCTION poms.jghi_completion_fact_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.producer_version=1 AND
  (to_jsonb(NEW)-ARRAY['condition_status','row_version','updated_at','updated_by'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['condition_status','row_version','updated_at','updated_by']) THEN
  RAISE EXCEPTION 'original completion conclusion immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER jghi_completion_fact_guard BEFORE UPDATE ON poms.project_completion_record
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_completion_fact_guard();
CREATE FUNCTION poms.jghi_condition_fact_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'completion condition immutable' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-ARRAY['status','closure_record_id','closed_at','closed_by','row_version'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','closure_record_id','closed_at','closed_by','row_version'])
   OR OLD.status<>'pending' OR NEW.status<>'closed' OR NEW.row_version<>OLD.row_version+1 THEN
  RAISE EXCEPTION 'condition permits only its own terminal closure' USING ERRCODE='23514';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM poms.project_completion_condition_closure cc
  WHERE cc.id=NEW.closure_record_id AND cc.condition_id=NEW.id
   AND cc.project_id=NEW.project_id AND cc.completion_record_id=NEW.completion_record_id
   AND cc.closed_by=NEW.responsible_user_id AND cc.closed_at=NEW.closed_at) THEN
  RAISE EXCEPTION 'condition closure does not match immutable actor/source fact' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER jghi_condition_fact_guard BEFORE UPDATE OR DELETE ON poms.project_completion_condition
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_condition_fact_guard();

-- Consumed member existence is the authority for service mutation protection.
-- Root E/F/C controllers call this read predicate through their existing outer
-- TX before mutation. Changing tax/stage/basis inputs must resolve all actual
-- member source IDs first; no client-supplied permit flag is consulted here.
CREATE FUNCTION poms.jghi_cost_was_consumed(cost_id uuid,allocation_id uuid)
 RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(
  SELECT 1 FROM poms.operating_snapshot_cost_member m
  JOIN poms.project_cost_inclusion_decision d ON d.id=m.decision_id
  JOIN poms.project_operating_snapshot s ON s.id=m.snapshot_id
  WHERE s.producer_version=1 AND d.decision='include'
   AND ((cost_id IS NOT NULL AND d.cost_record_id=cost_id)
      OR (allocation_id IS NOT NULL AND d.allocation_result_id=allocation_id))
 ) OR EXISTS(
  SELECT 1 FROM poms.operating_source_context c
  JOIN poms.project_operating_snapshot s ON s.id=c.snapshot_id AND s.project_id=c.project_id
  CROSS JOIN LATERAL jsonb_array_elements(c.frozen_payload->'costs') cost
  WHERE cost_id IS NOT NULL AND s.producer_version=1
   AND cost->'classification'->>'decision'='include'
   AND ((cost->'costRef'->>'id')::uuid=cost_id OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(cost->'allocationSourceMembers') member
      WHERE (member->'costRef'->>'id')::uuid=cost_id))
 )
$$;

-- This constraint checks one persisted representation, without recalculating
-- business formulas in SQL or changing immutable source JSON after insertion.
CREATE FUNCTION poms.jghi_context_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c record; s record;
BEGIN
 IF TG_TABLE_NAME='operating_source_context' THEN
  SELECT * INTO c FROM poms.operating_source_context WHERE id=NEW.id;
 ELSE
  IF NEW.producer_version<>1 THEN RETURN NULL; END IF;
  SELECT * INTO c FROM poms.operating_source_context WHERE id=NEW.source_context_id;
 END IF;
 SELECT * INTO s FROM poms.project_operating_snapshot WHERE id=c.snapshot_id;
 IF c.id IS NULL OR s.id IS NULL OR s.producer_version<>1
  OR s.project_id IS DISTINCT FROM c.project_id OR s.source_context_id IS DISTINCT FROM c.id
  OR s.source_hash IS DISTINCT FROM c.source_hash OR s.currency IS DISTINCT FROM c.currency
  OR c.frozen_payload->>'projectId' IS DISTINCT FROM c.project_id::text
  OR c.frozen_payload->>'contextId' IS DISTINCT FROM c.id::text
  OR c.frozen_payload->'snapshot'->>'id' IS DISTINCT FROM c.snapshot_id::text
  OR c.frozen_payload->>'sourceHash' IS DISTINCT FROM c.source_hash
  OR c.frozen_payload->>'policyVersion' IS DISTINCT FROM c.policy_version
  OR c.frozen_payload->>'policyHash' IS DISTINCT FROM c.policy_hash
  OR c.frozen_payload->>'currency' IS DISTINCT FROM c.currency THEN
  RAISE EXCEPTION 'persisted snapshot/context identity mismatch' USING ERRCODE='23514';
 END IF;
 IF (c.frozen_payload->'snapshot'->'restatedSnapshotRef') IS DISTINCT FROM 'null'::jsonb
   OR (c.frozen_payload->'snapshot'->'restatementRef') IS DISTINCT FROM 'null'::jsonb
   OR ((c.frozen_payload->'snapshot'->>'mode')='period-end'
       AND (c.frozen_payload->'snapshot'->'periodEndSnapshotRef') IS DISTINCT FROM 'null'::jsonb) THEN
  RAISE EXCEPTION 'new result references must remain null in immutable capture context' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_context_identity AFTER INSERT ON poms.operating_source_context
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION poms.jghi_context_identity_guard();
CREATE CONSTRAINT TRIGGER jghi_snapshot_context_identity AFTER INSERT OR UPDATE ON poms.project_operating_snapshot
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION poms.jghi_context_identity_guard();

CREATE FUNCTION poms.jghi_binding_summary_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b record; e record; o record; p record;
BEGIN
 SELECT * INTO b FROM poms.operating_signal_gate_binding WHERE id=NEW.id;
 IF b.producer_version<>1 OR b.status<>'active' THEN RETURN NULL; END IF;
 SELECT * INTO e FROM poms.operating_evaluation_evidence WHERE id=b.evidence_id;
 SELECT * INTO o FROM poms.operating_signal_evaluation_result WHERE id=b.signal_evaluation_id;
 SELECT * INTO p FROM poms.operating_gate_summary_payload WHERE summary_snapshot_id=b.current_summary_id;
 IF e.id IS NULL OR o.id IS NULL OR p.summary_snapshot_id IS NULL
  OR e.project_id IS DISTINCT FROM b.project_id OR o.project_id IS DISTINCT FROM b.project_id
  OR o.evidence_id IS DISTINCT FROM e.id OR o.referenced_snapshot_id IS DISTINCT FROM e.snapshot_id
  OR p.binding_id IS DISTINCT FROM b.id OR p.binding_row_version IS DISTINCT FROM b.row_version
  OR p.project_id IS DISTINCT FROM b.project_id OR p.gate_stage_type IS DISTINCT FROM b.gate_stage_type
  OR p.snapshot_id IS DISTINCT FROM e.snapshot_id OR p.evidence_id IS DISTINCT FROM e.id
  OR p.source_hash IS DISTINCT FROM e.source_hash OR p.evaluation_hash IS DISTINCT FROM b.evaluation_hash
  OR p.policy_hash IS DISTINCT FROM e.policy_hash OR p.policy_version IS DISTINCT FROM e.policy_version THEN
  RAISE EXCEPTION 'current binding/evaluation/summary chain mismatch' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_binding_summary AFTER INSERT OR UPDATE ON poms.operating_signal_gate_binding
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION poms.jghi_binding_summary_guard();

-- Production definition metadata only; no business approval/confirmation facts.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM poms.approval_summary_package_definition
  WHERE approval_scenario_key='commission-gate-review' AND summary_package_key='project-operating-commission-gate-v1'
   AND (projection_level<>'commission-gate-review' OR export_policy<>'internal-only' OR field_rule_version<>'r4h-operating-v1' OR status<>'active')) THEN
  RAISE EXCEPTION 'conflicting production summary definition project-operating-commission-gate-v1';
 END IF;
END $$;
INSERT INTO poms.approval_summary_package_definition
 (approval_scenario_key,summary_package_key,projection_level,export_policy,field_rule_version,status)
 VALUES('commission-gate-review','project-operating-commission-gate-v1','commission-gate-review','internal-only','r4h-operating-v1','active')
 ON CONFLICT(approval_scenario_key,summary_package_key) DO NOTHING;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM poms.approval_summary_package_definition
  WHERE approval_scenario_key='commission-role-freeze' AND summary_package_key='commission-role-freeze-confirmation'
   AND (projection_level<>'commission-role-freeze' OR export_policy<>'commission-controlled' OR field_rule_version<>'r4i-role-freeze-v1' OR status<>'active')) THEN
  RAISE EXCEPTION 'conflicting production summary definition commission-role-freeze-confirmation';
 END IF;
END $$;
INSERT INTO poms.approval_summary_package_definition
 (approval_scenario_key,summary_package_key,projection_level,export_policy,field_rule_version,status)
 VALUES('commission-role-freeze','commission-role-freeze-confirmation','commission-role-freeze','commission-controlled','r4i-role-freeze-v1','active')
 ON CONFLICT(approval_scenario_key,summary_package_key) DO NOTHING;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM poms.approval_summary_package_definition
  WHERE approval_scenario_key='project-stage-transition' AND summary_package_key='project-handover-stage'
   AND (projection_level<>'project-stage-admission' OR export_policy<>'internal-only' OR field_rule_version<>'r4i-lifecycle-v1' OR status<>'active')) THEN
  RAISE EXCEPTION 'conflicting production summary definition project-handover-stage';
 END IF;
END $$;
INSERT INTO poms.approval_summary_package_definition
 (approval_scenario_key,summary_package_key,projection_level,export_policy,field_rule_version,status)
 VALUES('project-stage-transition','project-handover-stage','project-stage-admission','internal-only','r4i-lifecycle-v1','active')
 ON CONFLICT(approval_scenario_key,summary_package_key) DO NOTHING;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM poms.approval_summary_package_definition
  WHERE approval_scenario_key='project-stage-transition' AND summary_package_key='project-execution-admission'
   AND (projection_level<>'project-stage-admission' OR export_policy<>'internal-only' OR field_rule_version<>'r4i-lifecycle-v1' OR status<>'active')) THEN
  RAISE EXCEPTION 'conflicting production summary definition project-execution-admission';
 END IF;
END $$;
INSERT INTO poms.approval_summary_package_definition
 (approval_scenario_key,summary_package_key,projection_level,export_policy,field_rule_version,status)
 VALUES('project-stage-transition','project-execution-admission','project-stage-admission','internal-only','r4i-lifecycle-v1','active')
 ON CONFLICT(approval_scenario_key,summary_package_key) DO NOTHING;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM poms.approval_summary_package_definition
  WHERE approval_scenario_key='project-stage-transition' AND summary_package_key='project-acceptance-admission'
   AND (projection_level<>'project-stage-admission' OR export_policy<>'internal-only' OR field_rule_version<>'r4i-lifecycle-v1' OR status<>'active')) THEN
  RAISE EXCEPTION 'conflicting production summary definition project-acceptance-admission';
 END IF;
END $$;
INSERT INTO poms.approval_summary_package_definition
 (approval_scenario_key,summary_package_key,projection_level,export_policy,field_rule_version,status)
 VALUES('project-stage-transition','project-acceptance-admission','project-stage-admission','internal-only','r4i-lifecycle-v1','active')
 ON CONFLICT(approval_scenario_key,summary_package_key) DO NOTHING;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM poms.approval_summary_package_definition
  WHERE approval_scenario_key='project-stage-transition' AND summary_package_key='project-completion-stage'
   AND (projection_level<>'project-stage-admission' OR export_policy<>'internal-only' OR field_rule_version<>'r4i-lifecycle-v1' OR status<>'active')) THEN
  RAISE EXCEPTION 'conflicting production summary definition project-completion-stage';
 END IF;
END $$;
INSERT INTO poms.approval_summary_package_definition
 (approval_scenario_key,summary_package_key,projection_level,export_policy,field_rule_version,status)
 VALUES('project-stage-transition','project-completion-stage','project-stage-admission','internal-only','r4i-lifecycle-v1','active')
 ON CONFLICT(approval_scenario_key,summary_package_key) DO NOTHING;


-- No down migration or automatic data rewrite. NOT VALID composite constraints
-- deliberately preserve unknown old rows while enforcing new writes; Root must
-- report these as accepted legacy-unverified constraints, not full DB validation.

-- I final refinement: exact new-only ownership provenance.
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

ALTER TABLE poms.project_owner_reassignment_record ADD CONSTRAINT uq_jghi_reassignment_project UNIQUE(id,project_id);
ALTER TABLE poms.project_ownership_origin ADD CONSTRAINT fk_jghi_origin_reassignment_project
 FOREIGN KEY(bootstrap_assignment_record_id,project_id) REFERENCES poms.project_owner_reassignment_record(id,project_id);
CREATE FUNCTION poms.jghi_ownership_origin_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  RAISE EXCEPTION 'ownership origin immutable' USING ERRCODE='23514';
 END IF;
 IF (to_jsonb(NEW)-ARRAY['bootstrap_state','first_personal_owner_user_id','first_personal_assigned_at','bootstrap_consumed_at','bootstrap_assignment_record_id','row_version'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['bootstrap_state','first_personal_owner_user_id','first_personal_assigned_at','bootstrap_consumed_at','bootstrap_assignment_record_id','row_version'])
   OR OLD.bootstrap_state<>'available' OR NEW.bootstrap_state<>'consumed'
   OR NEW.row_version<>OLD.row_version+1 THEN
  RAISE EXCEPTION 'ownership bootstrap permits only one terminal consumption' USING ERRCODE='23514';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM poms.project_owner_reassignment_record rr
  WHERE rr.id=NEW.bootstrap_assignment_record_id AND rr.project_id=NEW.project_id
   AND rr.previous_owner_user_id IS NULL AND rr.new_owner_user_id=NEW.first_personal_owner_user_id
   AND rr.previous_owner_org_id=NEW.initial_owner_org_id AND rr.new_owner_org_id=NEW.initial_owner_org_id
   AND rr.reassigned_by=NEW.creator_user_id AND rr.reassigned_at=NEW.first_personal_assigned_at) THEN
  RAISE EXCEPTION 'bootstrap consumption lacks exact real first-assignment history' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER jghi_ownership_origin_guard BEFORE UPDATE OR DELETE ON poms.project_ownership_origin
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_ownership_origin_guard();
CREATE FUNCTION poms.jghi_ownership_origin_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p record;
BEGIN
 SELECT * INTO p FROM poms.project WHERE id=NEW.project_id;
 IF p.id IS NULL OR p.created_by IS DISTINCT FROM NEW.creator_user_id
  OR p.owner_user_id IS DISTINCT FROM NEW.initial_owner_user_id OR p.owner_org_id IS DISTINCT FROM NEW.initial_owner_org_id
  OR p.created_at IS DISTINCT FROM NEW.created_at
  OR NOT ((NEW.source_type='direct-create' AND NEW.source_record_id=p.id AND NEW.initial_kind='personal'
             AND NEW.initial_owner_user_id=NEW.creator_user_id)
       OR (NEW.source_type='lead-conversion' AND p.source_lead_id IS NOT NULL AND NEW.source_record_id=p.source_lead_id)) THEN
  RAISE EXCEPTION 'ownership origin must match actual new creation/conversion facts' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER jghi_ownership_origin_insert_guard BEFORE INSERT ON poms.project_ownership_origin
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_ownership_origin_insert_guard();

-- Shared ProjectStage includes conditional-completed; conditions never rewrite
-- that original terminal result to completed after closure.
ALTER TABLE poms.project DROP CONSTRAINT chk_project_current_stage;
ALTER TABLE poms.project ADD CONSTRAINT chk_project_current_stage CHECK(current_stage IN
 ('assessment','scope-confirmation','commercial-closure','contracting','handover','execution','acceptance',
  'completed','conditional-completed','closed-lost','closed-terminated'));
-- EFFECTIVE V2: G pending-tax knowledge is identical to H and immutable context.
ALTER TABLE poms.project_operating_snapshot
 ALTER COLUMN tax_impact_pending_amount DROP NOT NULL,
 ADD COLUMN tax_pending_knowledge varchar(16) NULL,
 ADD CONSTRAINT ck_jghi_snapshot_pending_tax_v1 CHECK(producer_version=0 OR
  (producer_version=1 AND tax_pending_knowledge IS NOT NULL AND
   ((tax_pending_knowledge='known' AND tax_impact_pending_amount IS NOT NULL)
    OR (tax_pending_knowledge='unknown' AND tax_impact_pending_amount IS NULL))));
ALTER TABLE poms.period_closing_snapshot
 ALTER COLUMN tax_impact_pending_amount DROP NOT NULL,
 ADD COLUMN tax_pending_knowledge varchar(16) NULL,
 ADD CONSTRAINT ck_jghi_period_pending_tax_v1 CHECK(producer_version=0 OR
  (producer_version=1 AND tax_pending_knowledge IS NOT NULL AND
   ((tax_pending_knowledge='known' AND tax_impact_pending_amount IS NOT NULL)
    OR (tax_pending_knowledge='unknown' AND tax_impact_pending_amount IS NULL))));
CREATE FUNCTION poms.jghi_operating_pending_tax_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s record; p record; c record; a jsonb; amount_text text;
BEGIN
 IF TG_TABLE_NAME='project_operating_snapshot' THEN
  SELECT * INTO s FROM poms.project_operating_snapshot WHERE id=NEW.id;
 ELSE
  SELECT * INTO s FROM poms.period_closing_snapshot WHERE id=NEW.id;
 END IF;
 IF s.producer_version<>1 THEN RETURN NULL; END IF;
 SELECT * INTO c FROM poms.operating_source_context WHERE id=s.source_context_id;
 a:=c.frozen_payload->'metrics'->'taxPendingAmount';
 IF c.id IS NULL OR c.project_id IS DISTINCT FROM s.project_id
  OR a->>'knowledge' IS DISTINCT FROM s.tax_pending_knowledge THEN
  RAISE EXCEPTION 'snapshot pending tax knowledge differs from context' USING ERRCODE='23514';
 END IF;
 IF s.tax_pending_knowledge='known' THEN
  amount_text:=a->>'value';
  IF amount_text IS NULL OR amount_text!~'^(0|[1-9][0-9]*)\.[0-9]{2}$' THEN
   RAISE EXCEPTION 'known pending tax requires exact nonnegative cents' USING ERRCODE='23514';
  END IF;
  IF amount_text::numeric IS DISTINCT FROM s.tax_impact_pending_amount THEN
   RAISE EXCEPTION 'snapshot pending tax amount differs from context' USING ERRCODE='23514';
  END IF;
 ELSE
  IF a->'value' IS DISTINCT FROM 'null'::jsonb OR s.tax_impact_pending_amount IS NOT NULL THEN
   RAISE EXCEPTION 'unknown pending tax cannot become zero' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_TABLE_NAME='period_closing_snapshot' THEN
  SELECT * INTO p FROM poms.project_operating_snapshot WHERE id=s.project_snapshot_id;
  IF p.id IS NULL OR p.source_context_id IS DISTINCT FROM s.source_context_id
   OR p.tax_pending_knowledge IS DISTINCT FROM s.tax_pending_knowledge
   OR p.tax_impact_pending_amount IS DISTINCT FROM s.tax_impact_pending_amount THEN
   RAISE EXCEPTION 'paired period/project pending tax differs' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_snapshot_pending_tax AFTER INSERT OR UPDATE ON poms.project_operating_snapshot
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION poms.jghi_operating_pending_tax_guard();
CREATE CONSTRAINT TRIGGER jghi_period_pending_tax AFTER INSERT OR UPDATE ON poms.period_closing_snapshot
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION poms.jghi_operating_pending_tax_guard();
CREATE FUNCTION poms.jghi_terminal_stage_result_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c record;
BEGIN
 IF NEW.to_stage NOT IN ('completed','conditional-completed') THEN RETURN NULL; END IF;
 SELECT * INTO c FROM poms.project_completion_record WHERE id=NEW.source_completion_record_id;
 IF c.id IS NULL OR c.project_id IS DISTINCT FROM NEW.project_id OR c.producer_version<>1
   OR c.completion_result IS DISTINCT FROM NEW.to_stage THEN
  RAISE EXCEPTION 'terminal ledger stage must match actual completion result' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_terminal_stage_result AFTER INSERT ON poms.project_stage_record
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION poms.jghi_terminal_stage_result_guard();
-- No new money capacity DDL: all existing20/new8 money fields stay18,2.
-- F corrections use real producers and immutable evidence/predecessors already
-- modeled above; no extra table, fake source, permission seed or business approval.
