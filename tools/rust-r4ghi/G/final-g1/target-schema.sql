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

-- Root must add the following exact cross-row/deferred checks in the promoted
-- migration and implement the same predicates before business INSERT/CAS:
-- 1. receipt basis gross == locked receipt_amount and receipt confirmed version;
--    selected actual terms/approval/currency provenance verified; exact HALF_UP.
-- 2. baseline source project matches each adopted package; original retained;
--    all approved transitions are one connected PROJECT package chain once.
-- 3. inclusion target same project (or exact F result project), explicit role,
--    source version/state/hash, stage/evidence and chain no-double-measurement;
--    no included direct source full amount alongside the same F share source set.
-- 4. snapshot/context JSON exactly matches scoped members and H schema;
--    formal eligible, required known money, aggregate cents, immutable hash,
--    v1 final action == H derive. Period copied compatibility values equal paired
--    project snapshot; period root/window and restatement predecessor agree.
-- 5. ordinary E/F source updates reject actual consumed membership. Sealed
--    internal RestatementPermit locks/validates every affected project target;
--    all source replacement, classifications, G/H outputs and audits one outerTX.
-- 6. immutable new evidence/context/member/basis facts reject UPDATE; only
--    snapshot/current lifecycle metadata changes with explicit version CAS.
--    Runtime app roles cannot DELETE archived facts; controlled owner cleanup
--    remains exact-PK journal based, never CASCADE or broad purge.
-- Existing uq_obp_project_current, uq_pcs_project_period_current,
-- uq_orr_restates_current and uq_orr_restated_current stay authoritative;
-- no duplicated replacement unique indexes and no implicit legacy certification.
