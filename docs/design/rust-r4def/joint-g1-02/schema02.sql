-- SOURCE docs/design/rust-r4def/D-schema-candidate01.sql
-- R4D G1 candidate only; NOT EXECUTED and NOT a migration entry point.
-- Root owns promotion into SQL-first migration + matching ORM/shared contracts.
-- Requires main 565661b9113372de4da6662a4a692fbfd2296dd6 / R4ABC schema.
-- Legacy rows retain NULL producer_version and are not certified/backfilled.
-- No random handover, participant, amendment or snapshot facts are inserted.

ALTER TABLE poms.contract_amendment
  ADD COLUMN producer_version integer NULL,
  ADD COLUMN project_id uuid NULL,
  ADD COLUMN source_readiness_id uuid NULL,
  ADD COLUMN source_preparation_id uuid NULL,
  ADD COLUMN source_review_id uuid NULL,
  ADD COLUMN before_snapshot_id uuid NULL,
  ADD COLUMN after_snapshot_id uuid NULL,
  ADD COLUMN amendment_reason varchar(1000) NULL,
  ADD COLUMN payload_hash varchar(64) NULL,
  ADD COLUMN effective_at timestamptz NULL,
  ADD COLUMN effective_by uuid NULL,
  ADD CONSTRAINT uq_r4d_amendment_scope UNIQUE(id,contract_id),
  ADD CONSTRAINT fk_r4d_amendment_project FOREIGN KEY(contract_id,project_id)
    REFERENCES poms.contract(id,project_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_r4d_amendment_readiness FOREIGN KEY(source_readiness_id,project_id,contract_id)
    REFERENCES poms.contract_readiness_package(id,project_id,contract_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_r4d_amendment_preparation FOREIGN KEY(source_preparation_id,source_readiness_id,contract_id)
    REFERENCES poms.contract_term_preparation(id,source_readiness_id,contract_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_r4d_amendment_before FOREIGN KEY(before_snapshot_id,contract_id)
    REFERENCES poms.contract_term_snapshot(id,contract_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_r4d_amendment_after FOREIGN KEY(after_snapshot_id,contract_id)
    REFERENCES poms.contract_term_snapshot(id,contract_id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_r4d_amendment_producer CHECK(
    producer_version IS NULL OR (
      producer_version=1 AND project_id IS NOT NULL AND source_readiness_id IS NOT NULL
      AND before_snapshot_id IS NOT NULL AND amendment_reason IS NOT NULL
      AND length(btrim(amendment_reason))>0 AND payload_hash IS NOT NULL
      AND payload_hash ~ '^[0-9a-f]{64}$'
      AND (status NOT IN ('submitted','approved','effective','superseded') OR
        (source_preparation_id IS NOT NULL AND source_review_id IS NOT NULL))
      AND (status NOT IN ('effective','superseded') OR
        (after_snapshot_id IS NOT NULL AND after_snapshot_id<>before_snapshot_id
         AND effective_at IS NOT NULL AND effective_by IS NOT NULL))
    )
  );
CREATE UNIQUE INDEX uq_r4d_amendment_open ON poms.contract_amendment(contract_id)
  WHERE producer_version=1 AND status IN ('draft','submitted','approved');

ALTER TABLE poms.contract_readiness_package
  ADD COLUMN contract_amendment_id uuid NULL,
  ADD CONSTRAINT fk_r4d_readiness_amendment FOREIGN KEY(contract_amendment_id,contract_id)
    REFERENCES poms.contract_amendment(id,contract_id) ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE poms.contract_term_preparation
  ADD COLUMN contract_amendment_id uuid NULL,
  ADD COLUMN before_snapshot_id uuid NULL,
  ADD CONSTRAINT fk_r4d_preparation_amendment FOREIGN KEY(contract_amendment_id,contract_id)
    REFERENCES poms.contract_amendment(id,contract_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_r4d_preparation_before FOREIGN KEY(before_snapshot_id,contract_id)
    REFERENCES poms.contract_term_snapshot(id,contract_id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_r4d_preparation_amendment CHECK(
    (contract_amendment_id IS NULL AND before_snapshot_id IS NULL)
    OR (contract_amendment_id IS NOT NULL AND before_snapshot_id IS NOT NULL)
  );
ALTER TABLE poms.contract_review_binding
  ADD COLUMN contract_amendment_id uuid NULL,
  ADD CONSTRAINT fk_r4d_review_amendment FOREIGN KEY(contract_amendment_id,contract_id)
    REFERENCES poms.contract_amendment(id,contract_id) ON DELETE RESTRICT,
  ADD CONSTRAINT uq_r4d_review_scope UNIQUE(approval_record_id,contract_id,preparation_id);
ALTER TABLE poms.contract_amendment
  ADD CONSTRAINT fk_r4d_amendment_review FOREIGN KEY(source_review_id,contract_id,source_preparation_id)
    REFERENCES poms.contract_review_binding(approval_record_id,contract_id,preparation_id)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE poms.contract_term_snapshot
  ADD COLUMN source_amendment_id uuid NULL,
  ADD CONSTRAINT fk_r4d_snapshot_amendment FOREIGN KEY(source_amendment_id,contract_id)
    REFERENCES poms.contract_amendment(id,contract_id) ON DELETE RESTRICT;

CREATE TABLE poms.project_handover_basis_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES poms.project(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK(version>0),
  source_payload jsonb NOT NULL CHECK(jsonb_typeof(source_payload)='object'),
  source_hash varchar(64) NOT NULL CHECK(source_hash ~ '^[0-9a-f]{64}$'),
  payload_hash varchar(64) NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),
  status varchar(32) NOT NULL CHECK(status IN ('active','superseded','voided')),
  is_current boolean NOT NULL DEFAULT true,
  supersedes_id uuid NULL REFERENCES poms.project_handover_basis_snapshot(id) ON DELETE RESTRICT,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
  row_version integer NOT NULL DEFAULT 1 CHECK(row_version>0),
  CONSTRAINT uq_r4d_basis_version UNIQUE(project_id,version),
  CONSTRAINT uq_r4d_basis_project UNIQUE(id,project_id),
  CONSTRAINT chk_r4d_basis_current CHECK(NOT is_current OR status='active')
);
CREATE UNIQUE INDEX uq_r4d_basis_current ON poms.project_handover_basis_snapshot(project_id) WHERE is_current;
ALTER TABLE poms.receivable_plan_version
  ADD CONSTRAINT uq_r4d_plan_full_source UNIQUE(id,contract_id,snapshot_id,source_preparation_id,source_readiness_id);
CREATE TABLE poms.project_handover_contract_basis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  basis_snapshot_id uuid NOT NULL,
  project_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  term_snapshot_id uuid NOT NULL,
  readiness_package_id uuid NOT NULL,
  preparation_id uuid NOT NULL,
  plan_version_id uuid NOT NULL,
  contract_amendment_id uuid NULL,
  source_payload_hash varchar(64) NOT NULL CHECK(source_payload_hash ~ '^[0-9a-f]{64}$'),
  currency_code varchar(16) NOT NULL CHECK(length(btrim(currency_code))>0),
  signed_amount numeric(18,2) NOT NULL CHECK(signed_amount>0),
  amount_tax_inclusive numeric(18,2) NOT NULL CHECK(amount_tax_inclusive>0),
  amount_tax_exclusive numeric(18,2) NOT NULL CHECK(amount_tax_exclusive>0),
  is_compatibility_anchor boolean NOT NULL DEFAULT false,
  CONSTRAINT uq_r4d_basis_contract UNIQUE(basis_snapshot_id,contract_id),
  CONSTRAINT fk_r4d_member_basis FOREIGN KEY(basis_snapshot_id,project_id)
    REFERENCES poms.project_handover_basis_snapshot(id,project_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4d_member_contract FOREIGN KEY(contract_id,project_id)
    REFERENCES poms.contract(id,project_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4d_member_snapshot FOREIGN KEY(term_snapshot_id,contract_id,preparation_id)
    REFERENCES poms.contract_term_snapshot(id,contract_id,source_preparation_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4d_member_readiness FOREIGN KEY(readiness_package_id,project_id,contract_id)
    REFERENCES poms.contract_readiness_package(id,project_id,contract_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4d_member_preparation FOREIGN KEY(preparation_id,readiness_package_id,contract_id)
    REFERENCES poms.contract_term_preparation(id,source_readiness_id,contract_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4d_member_plan FOREIGN KEY(plan_version_id,contract_id,term_snapshot_id,preparation_id,readiness_package_id)
    REFERENCES poms.receivable_plan_version(id,contract_id,snapshot_id,source_preparation_id,source_readiness_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4d_member_amendment FOREIGN KEY(contract_amendment_id,contract_id)
    REFERENCES poms.contract_amendment(id,contract_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX uq_r4d_basis_anchor ON poms.project_handover_contract_basis(basis_snapshot_id)
  WHERE is_compatibility_anchor;

CREATE TABLE poms.project_handover_basis_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  basis_snapshot_id uuid NOT NULL REFERENCES poms.project_handover_basis_snapshot(id) ON DELETE RESTRICT,
  item_key varchar(128) NOT NULL CHECK(length(btrim(item_key))>0),
  item_type varchar(32) NOT NULL CHECK(item_type IN ('scope','risk','receivable','cost','responsibility','attachment','contract')),
  source_type varchar(64) NOT NULL CHECK(length(btrim(source_type))>0),
  source_id uuid NOT NULL,
  source_version varchar(64) NULL,
  source_hash varchar(64) NULL CHECK(source_hash IS NULL OR source_hash ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
  CONSTRAINT uq_r4d_basis_item_key UNIQUE(basis_snapshot_id,item_key),
  CONSTRAINT uq_r4d_basis_item_scope UNIQUE(id,basis_snapshot_id)
);

ALTER TABLE poms.project_handover
  ADD COLUMN producer_version integer NULL,
  ADD COLUMN basis_snapshot_id uuid NULL,
  ADD COLUMN version integer NULL CHECK(version IS NULL OR version>0),
  ADD COLUMN is_current boolean NOT NULL DEFAULT false,
  ADD COLUMN supersedes_id uuid NULL REFERENCES poms.project_handover(id) ON DELETE RESTRICT,
  ADD COLUMN execution_owner_user_id uuid NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
  ADD COLUMN confirmation_record_id uuid NULL REFERENCES poms.confirmation_record(id) ON DELETE RESTRICT,
  ADD COLUMN finance_confirmation_required boolean NULL,
  ADD COLUMN prepared_receipt_judgment_mode varchar(64) NULL,
  ADD COLUMN source_payload_hash varchar(64) NULL,
  ADD CONSTRAINT fk_r4d_handover_basis FOREIGN KEY(basis_snapshot_id,project_id)
    REFERENCES poms.project_handover_basis_snapshot(id,project_id) ON DELETE RESTRICT,
  ADD CONSTRAINT uq_r4d_handover_version UNIQUE(project_id,version),
  ADD CONSTRAINT uq_r4d_handover_scope UNIQUE(id,project_id,basis_snapshot_id),
  ADD CONSTRAINT uq_r4d_handover_confirmation UNIQUE(id,confirmation_record_id),
  ADD CONSTRAINT uq_r4d_handover_freeze_source UNIQUE(id,summary_snapshot_id,basis_snapshot_id),
  ADD CONSTRAINT chk_r4d_handover_producer CHECK(
    producer_version IS NULL OR (
      producer_version=1 AND basis_snapshot_id IS NOT NULL AND version IS NOT NULL
      AND execution_owner_user_id IS NOT NULL AND confirmation_record_id IS NOT NULL
      AND finance_confirmation_required IS NOT NULL
      AND prepared_receipt_judgment_mode IS NOT NULL
      AND prepared_receipt_judgment_mode IN ('project-aggregate','contract-separate')
      AND source_payload_hash IS NOT NULL AND source_payload_hash ~ '^[0-9a-f]{64}$'
      AND (status<>'confirmed' OR (confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL))
      AND (status<>'draft' OR (confirmed_at IS NULL AND confirmed_by IS NULL))
      AND (NOT is_current OR status IN ('draft','confirmed'))
    )
  );
CREATE UNIQUE INDEX uq_r4d_handover_current ON poms.project_handover(project_id) WHERE is_current;
ALTER TABLE poms.confirmation_participant
  ADD CONSTRAINT uq_r4d_participant_scope UNIQUE(id,confirmation_record_id,participant_id);
CREATE TABLE poms.project_handover_participant_role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id uuid NOT NULL,
  confirmation_record_id uuid NOT NULL,
  confirmation_participant_id uuid NOT NULL,
  participant_user_id uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
  role_key varchar(64) NOT NULL CHECK(role_key IN ('sales-owner','business-admin','technical-support','execution-owner','finance')),
  responsibility_summary varchar(1000) NOT NULL CHECK(length(btrim(responsibility_summary))>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
  CONSTRAINT uq_r4d_participant_role UNIQUE(handover_id,participant_user_id,role_key),
  CONSTRAINT fk_r4d_role_handover FOREIGN KEY(handover_id,confirmation_record_id)
    REFERENCES poms.project_handover(id,confirmation_record_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4d_role_person FOREIGN KEY(confirmation_participant_id,confirmation_record_id,participant_user_id)
    REFERENCES poms.confirmation_participant(id,confirmation_record_id,participant_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX uq_r4d_handover_execution_owner ON poms.project_handover_participant_role(handover_id)
  WHERE role_key='execution-owner';

CREATE TABLE poms.project_handover_summary_payload (
  summary_snapshot_id uuid PRIMARY KEY REFERENCES poms.approval_summary_snapshot(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL,
  handover_id uuid NULL,
  basis_snapshot_id uuid NOT NULL,
  contract_summary_snapshot_id uuid NULL REFERENCES poms.approval_summary_snapshot(id) ON DELETE RESTRICT,
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
  payload_hash varchar(64) NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),
  source_hash varchar(64) NOT NULL CHECK(source_hash ~ '^[0-9a-f]{64}$'),
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid NOT NULL REFERENCES poms.platform_user(id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4d_payload_basis FOREIGN KEY(basis_snapshot_id,project_id)
    REFERENCES poms.project_handover_basis_snapshot(id,project_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4d_payload_handover FOREIGN KEY(handover_id,project_id,basis_snapshot_id)
    REFERENCES poms.project_handover(id,project_id,basis_snapshot_id) ON DELETE RESTRICT,
  CONSTRAINT chk_r4d_payload_kind CHECK(
    (handover_id IS NULL AND contract_summary_snapshot_id IS NULL)
    OR (handover_id IS NOT NULL AND contract_summary_snapshot_id IS NOT NULL)
  )
);

ALTER TABLE poms.contract_handover_rebaseline_record
  ADD COLUMN producer_version integer NULL,
  ADD COLUMN basis_before_id uuid NULL REFERENCES poms.project_handover_basis_snapshot(id) ON DELETE RESTRICT,
  ADD COLUMN basis_after_id uuid NULL REFERENCES poms.project_handover_basis_snapshot(id) ON DELETE RESTRICT,
  ADD COLUMN source_handover_id uuid NULL REFERENCES poms.project_handover(id) ON DELETE RESTRICT,
  ADD COLUMN replacement_handover_id uuid NULL REFERENCES poms.project_handover(id) ON DELETE RESTRICT,
  ADD CONSTRAINT uq_r4d_rebaseline_before UNIQUE(id,basis_before_id),
  ADD CONSTRAINT chk_r4d_rebaseline_producer CHECK(producer_version IS NULL OR (
    producer_version=1 AND basis_before_id IS NOT NULL AND basis_after_id IS NOT NULL
    AND basis_before_id<>basis_after_id AND source_handover_id IS NOT NULL
    AND replacement_handover_id IS NOT NULL AND source_handover_id<>replacement_handover_id
  ));
ALTER TABLE poms.handover_baseline_impact_item
  ADD COLUMN producer_version integer NULL,
  ADD COLUMN basis_before_id uuid NULL,
  ADD COLUMN source_basis_item_id uuid NULL,
  ADD CONSTRAINT fk_r4d_impact_rebaseline FOREIGN KEY(rebaseline_record_id,basis_before_id)
    REFERENCES poms.contract_handover_rebaseline_record(id,basis_before_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_r4d_impact_basis_item FOREIGN KEY(source_basis_item_id,basis_before_id)
    REFERENCES poms.project_handover_basis_item(id,basis_snapshot_id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_r4d_impact_producer CHECK(producer_version IS NULL OR (
    producer_version=1 AND basis_before_id IS NOT NULL AND source_basis_item_id IS NOT NULL
    AND affected_handover_item_id=source_basis_item_id
  ));
CREATE UNIQUE INDEX uq_r4d_rebaseline_item ON poms.handover_baseline_impact_item(rebaseline_record_id,source_basis_item_id)
  WHERE producer_version=1;
ALTER TABLE poms.project_receipt_judgment_freeze
  ADD COLUMN producer_version integer NULL,
  ADD COLUMN basis_snapshot_id uuid NULL,
  ADD COLUMN version integer NULL CHECK(version IS NULL OR version>0),
  ADD CONSTRAINT uq_r4d_receipt_freeze_version UNIQUE(project_id,version),
  ADD CONSTRAINT fk_r4d_receipt_freeze_basis FOREIGN KEY(basis_snapshot_id,project_id)
    REFERENCES poms.project_handover_basis_snapshot(id,project_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_r4d_receipt_freeze_handover FOREIGN KEY(source_handover_id,source_handover_summary_snapshot_id,basis_snapshot_id)
    REFERENCES poms.project_handover(id,summary_snapshot_id,basis_snapshot_id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_r4d_receipt_freeze_producer CHECK(producer_version IS NULL OR (
    producer_version=1 AND basis_snapshot_id IS NOT NULL AND version IS NOT NULL
    AND receipt_judgment_mode IN ('project-aggregate','contract-separate')
    AND source_type IN ('project-handover','project-receipt-judgment-freeze')
    AND (source_type<>'project-handover' OR source_id=source_handover_id)
  ));

-- Actual values live in immutable payloads; common snapshots remain scenario/policy metadata.
-- UPDATE permits only explicit lifecycle/current/version columns on the basis.
CREATE FUNCTION poms.r4d_guard_basis_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW)-ARRAY['status','is_current','row_version']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['status','is_current','row_version']) THEN
    RAISE EXCEPTION 'R4D basis content is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_r4d_basis_immutable BEFORE UPDATE ON poms.project_handover_basis_snapshot
  FOR EACH ROW EXECUTE FUNCTION poms.r4d_guard_basis_immutable();
CREATE FUNCTION poms.r4d_guard_content_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
    RAISE EXCEPTION 'R4D frozen content is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_r4d_payload_immutable BEFORE UPDATE ON poms.project_handover_summary_payload
  FOR EACH ROW EXECUTE FUNCTION poms.r4d_guard_content_immutable();
CREATE TRIGGER trg_r4d_member_immutable BEFORE UPDATE ON poms.project_handover_contract_basis
  FOR EACH ROW EXECUTE FUNCTION poms.r4d_guard_content_immutable();
CREATE TRIGGER trg_r4d_item_immutable BEFORE UPDATE ON poms.project_handover_basis_item
  FOR EACH ROW EXECUTE FUNCTION poms.r4d_guard_content_immutable();
CREATE TRIGGER trg_r4d_role_immutable BEFORE UPDATE ON poms.project_handover_participant_role
  FOR EACH ROW EXECUTE FUNCTION poms.r4d_guard_content_immutable();

-- Deterministic configuration identities are definitions, not invented business facts.
INSERT INTO poms.approval_summary_package_definition
  (id,approval_scenario_key,summary_package_key,projection_level,export_policy,field_rule_version,status)
VALUES
  ('da400001-0000-4000-8000-000000000001','handover-confirmation','contract-handover-confirmation','handover-confirmation','handover-controlled','r4d-v1','active'),
  ('da400001-0000-4000-8000-000000000002','handover-confirmation','project-handover-confirmation','handover-confirmation','handover-controlled','r4d-v1','active')
ON CONFLICT(approval_scenario_key,summary_package_key) DO NOTHING;
DO $$ BEGIN
  IF (SELECT count(*) FROM poms.approval_summary_package_definition
      WHERE approval_scenario_key='handover-confirmation'
        AND summary_package_key IN ('contract-handover-confirmation','project-handover-confirmation')
        AND projection_level='handover-confirmation' AND export_policy='handover-controlled'
        AND field_rule_version='r4d-v1' AND status='active')<>2 THEN
    RAISE EXCEPTION 'R4D summary definitions require explicit reconciliation';
  END IF;
END $$;

-- Remaining typed service obligations, explicitly tested in D-V02..D-V18:
-- * Exactly one compatibility anchor and one execution owner; complete required role set.
-- * Existing single baseline FK equals the chosen member term snapshot, never the aggregate ID.
-- * Common confirmation target/project and summary scenario/package/target match the handover.
-- * Source hashes compare exact immutable values, not just IDs or mutable current flags.
-- * Amendment after snapshot is produced by its exact approved review/preparation, not any snapshot.
-- * Rebaseline project/source/replacement and every member preserve the same all-contract scope.
-- * Any required write/audit/flush failure rolls back the one caller-owned transaction.
-- * Historical excess-scale money is audited; no blind rounding/backfill is performed here.


-- SOURCE docs/design/rust-r4def/E-schema-candidate02.sql
-- R4E G1 candidate02 only. NOT EXECUTED. Root owns final shared migration.
-- Inputs: current Node entities/migrations, user-decisions01.json, E-g1-candidate02.md.
-- Run all preflight reports and preserve originals BEFORE any type alteration.
-- Any failure aborts this whole migration. No automatic historical rounding.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM poms.expense_record e
    CROSS JOIN LATERAL (VALUES (e.amount_including_tax),(e.tax_amount),(e.amount_excluding_tax)) v(amount)
    WHERE v.amount IS NOT NULL AND
      (v.amount <> trunc(v.amount, 2) OR abs(v.amount) > 9999999999999999.99)
  ) OR EXISTS (
    SELECT 1 FROM poms.project_actual_cost_record c
    CROSS JOIN LATERAL (VALUES (c.amount_excluding_tax),(c.tax_cost_amount),(c.amount_including_tax),(c.labor_amount)) v(amount)
    WHERE v.amount IS NOT NULL AND
      (v.amount <> trunc(v.amount, 2) OR abs(v.amount) > 9999999999999999.99)
  ) THEN
    RAISE EXCEPTION 'R4E legacy excess-scale/capacity money requires controlled review; no automatic rewrite';
  END IF;
  IF EXISTS (
    SELECT supersedes_record_id FROM poms.project_actual_cost_record
    WHERE supersedes_record_id IS NOT NULL
    GROUP BY supersedes_record_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'R4E legacy replacement branches require controlled review';
  END IF;
  IF EXISTS (
    SELECT 1 FROM poms.project_actual_cost_record
    WHERE record_status IN ('confirmed','included') AND
      (execution_stage_code IS NULL OR stage_derived_from_type IS NULL OR
       stage_derived_from_id IS NULL OR stage_derived_at IS NULL OR stage_locked_at IS NULL)
  ) THEN
    RAISE EXCEPTION 'R4E legacy confirmed costs lack stage truth; do not invent attribution';
  END IF;
END $$;

ALTER TABLE poms.expense_record
  ALTER COLUMN amount_including_tax TYPE numeric(18,2),
  ALTER COLUMN tax_amount TYPE numeric(18,2),
  ALTER COLUMN amount_excluding_tax TYPE numeric(18,2);
ALTER TABLE poms.project_actual_cost_record
  ALTER COLUMN amount_excluding_tax TYPE numeric(18,2),
  ALTER COLUMN tax_cost_amount TYPE numeric(18,2),
  ALTER COLUMN amount_including_tax TYPE numeric(18,2),
  ALTER COLUMN labor_amount TYPE numeric(18,2);
-- Deliberately unchanged: rate_value/internal_cost_rate numeric(15,4),
-- actual_hours/actual_person_days numeric(10,2).

ALTER TABLE poms.expense_record
  ADD CONSTRAINT chk_r4e_expense_money CHECK (
    amount_including_tax > 0
    AND (tax_amount IS NULL OR tax_amount BETWEEN 0 AND amount_including_tax)
    AND (amount_excluding_tax IS NULL OR amount_excluding_tax BETWEEN 0 AND amount_including_tax)
    AND (tax_amount IS NULL OR amount_excluding_tax IS NULL OR
         amount_including_tax = tax_amount + amount_excluding_tax)
  ),
  ADD CONSTRAINT chk_r4e_expense_attachment_count CHECK (attachment_count >= 0),
  ADD CONSTRAINT chk_r4e_expense_confirmation CHECK (
    status <> 'confirmed' OR (confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL)
  ),
  ADD CONSTRAINT chk_r4e_expense_void CHECK (
    status <> 'voided' OR (voided_at IS NOT NULL AND void_reason IS NOT NULL AND length(btrim(void_reason)) > 0)
  );

ALTER TABLE poms.internal_cost_rate_version
  ADD CONSTRAINT chk_r4e_rate_positive CHECK (rate_value > 0),
  ADD CONSTRAINT chk_r4e_rate_dates CHECK (effective_to IS NULL OR effective_to >= effective_from),
  ADD CONSTRAINT chk_r4e_rate_scope CHECK (
    (rate_scope_type = 'person' AND person_id IS NOT NULL AND role_code IS NULL)
    OR (rate_scope_type = 'role' AND person_id IS NULL AND
        role_code IS NOT NULL AND length(btrim(role_code)) BETWEEN 1 AND 64)
  ),
  ADD CONSTRAINT chk_r4e_rate_version CHECK (version > 0 AND row_version > 0),
  ADD CONSTRAINT chk_r4e_rate_published CHECK (
    status NOT IN ('active','superseded') OR (published_at IS NOT NULL AND published_by IS NOT NULL)
  );
-- Existing key/version unique and current_unique are retained.
-- Root must preflight old intervals; do not silently repair them.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE poms.internal_cost_rate_version
  DROP CONSTRAINT IF EXISTS internal_cost_rate_version_active_range_excl;
ALTER TABLE poms.internal_cost_rate_version
  ADD CONSTRAINT internal_cost_rate_version_active_range_excl
  EXCLUDE USING gist (
    rate_key WITH =,
    daterange(effective_from, effective_to, '[]') WITH &&
  ) WHERE (status IN ('active','superseded'));

ALTER TABLE poms.project_actual_cost_record
  ADD COLUMN source_basis jsonb NULL,
  ADD COLUMN calculation_basis jsonb NULL,
  ADD COLUMN basis_origin varchar(32) NOT NULL DEFAULT 'legacy-unavailable',
  ADD COLUMN labor_scope_key text GENERATED ALWAYS AS (
    CASE WHEN cost_type = 'labor' THEN
      CASE WHEN labor_person_id IS NOT NULL THEN 'person:' || labor_person_id::text
           WHEN labor_role IS NOT NULL THEN 'role:' || labor_role END
    END
  ) STORED,
  ADD CONSTRAINT chk_r4e_basis_origin CHECK (basis_origin IN ('captured','legacy-unavailable')),
  ADD CONSTRAINT chk_r4e_source_basis CHECK (
    source_basis IS NULL OR jsonb_typeof(source_basis) = 'object'
  ),
  ADD CONSTRAINT chk_r4e_calculation_basis CHECK (
    calculation_basis IS NULL OR jsonb_typeof(calculation_basis) = 'object'
  ),
  ADD CONSTRAINT chk_r4e_captured_basis CHECK (
    basis_origin <> 'captured' OR
    (source_basis IS NOT NULL AND (cost_type <> 'labor' OR calculation_basis IS NOT NULL))
  ),
  ADD CONSTRAINT chk_r4e_cost_attachment_count CHECK (attachment_count >= 0),
  ADD CONSTRAINT chk_r4e_cost_money CHECK (
    (amount_excluding_tax IS NULL OR amount_excluding_tax >= 0)
    AND (tax_cost_amount IS NULL OR tax_cost_amount >= 0)
    AND (amount_including_tax IS NULL OR amount_including_tax > 0)
    AND (amount_excluding_tax IS NULL OR tax_cost_amount IS NULL OR amount_including_tax IS NULL OR
         amount_including_tax = amount_excluding_tax + tax_cost_amount)
    AND (cost_type NOT IN ('payment-fact','procurement') OR
         (amount_excluding_tax IS NOT NULL AND amount_excluding_tax > 0))
    AND (cost_type NOT IN ('invoice','expense') OR
         (amount_including_tax IS NOT NULL AND amount_including_tax > 0))
  ),
  ADD CONSTRAINT chk_r4e_cost_stage_truth CHECK (
    record_status NOT IN ('confirmed','included') OR
    (execution_stage_code IS NOT NULL AND stage_derived_from_type IS NOT NULL AND
     stage_derived_from_id IS NOT NULL AND stage_derived_at IS NOT NULL AND stage_locked_at IS NOT NULL)
  ),
  ADD CONSTRAINT chk_r4e_cost_source_binding CHECK (
    source_id IS NOT NULL AND
    ((cost_type = 'payment-fact' AND source_type IS NOT DISTINCT FROM 'payment-record')
     OR (cost_type = 'invoice' AND source_type IS NOT DISTINCT FROM 'invoice-record')
     OR (cost_type = 'expense' AND source_type IS NOT DISTINCT FROM 'expense-record')
     OR (cost_type = 'procurement' AND source_type IS NOT DISTINCT FROM 'payable-record')
     OR (cost_type = 'labor' AND source_type IS NOT DISTINCT FROM 'labor'))
  ),
  ADD CONSTRAINT chk_r4e_labor_basis CHECK (
    cost_type <> 'labor' OR
    (rate_version_id IS NOT NULL AND labor_scope_key IS NOT NULL AND
     labor_period_type IS NOT NULL AND labor_period_start IS NOT NULL AND labor_period_end IS NOT NULL AND
     labor_period_start <= labor_period_end AND
     internal_cost_rate IS NOT NULL AND internal_cost_rate > 0 AND labor_amount IS NOT NULL AND labor_amount > 0 AND
     amount_excluding_tax IS NOT NULL AND amount_including_tax IS NOT NULL AND tax_cost_amount IS NOT NULL AND
     amount_excluding_tax = labor_amount AND amount_including_tax = labor_amount AND tax_cost_amount = 0 AND
     ((actual_hours IS NOT NULL AND actual_hours > 0 AND actual_person_days IS NULL) OR
      (actual_person_days IS NOT NULL AND actual_person_days > 0 AND actual_hours IS NULL)))
  );
-- Cross-table unit/scope/rate-interval/source-version/F-lock validation remains
-- inside the borrowed transaction. A CHECK cannot assert those facts alone.

DROP INDEX IF EXISTS poms.uq_project_actual_cost_record_payment_fact_source_current;
DROP INDEX IF EXISTS poms.uq_project_actual_cost_record_invoice_source_current;
DROP INDEX IF EXISTS poms.uq_project_actual_cost_record_expense_source_current;
DROP INDEX IF EXISTS poms.uq_project_actual_cost_record_procurement_source_current;
CREATE UNIQUE INDEX uq_project_actual_cost_record_payment_fact_source_current
  ON poms.project_actual_cost_record(source_type,source_id)
  WHERE cost_type='payment-fact' AND record_status IN ('registered','confirmed','included');
CREATE UNIQUE INDEX uq_project_actual_cost_record_invoice_source_current
  ON poms.project_actual_cost_record(source_type,source_id)
  WHERE cost_type='invoice' AND record_status IN ('registered','confirmed','included');
CREATE UNIQUE INDEX uq_project_actual_cost_record_expense_source_current
  ON poms.project_actual_cost_record(source_type,source_id)
  WHERE cost_type='expense' AND record_status IN ('registered','confirmed','included');
CREATE UNIQUE INDEX uq_project_actual_cost_record_procurement_source_current
  ON poms.project_actual_cost_record(source_type,source_id)
  WHERE cost_type='procurement' AND record_status IN ('registered','confirmed','included');
CREATE UNIQUE INDEX uq_r4e_cost_single_successor
  ON poms.project_actual_cost_record(supersedes_record_id)
  WHERE supersedes_record_id IS NOT NULL;
ALTER TABLE poms.project_actual_cost_record
  ADD CONSTRAINT excl_r4e_labor_scope_period
  EXCLUDE USING gist (
    project_id WITH =,
    labor_scope_key WITH =,
    daterange(labor_period_start,labor_period_end,'[]') WITH &&
  ) WHERE (cost_type='labor' AND record_status IN ('registered','confirmed','included'));
CREATE INDEX idx_r4e_cost_source ON poms.project_actual_cost_record(source_type,source_id);
CREATE INDEX idx_r4e_cost_project_rate ON poms.project_actual_cost_record(project_id,rate_version_id);

-- Candidate omissions are deliberate: no included transition/automatic absorption,
-- no new procurement fact, no fabricated event-membership relation, no arbitrary
-- source_id::uuid cast, and no alteration of R5 execution-admission facts.
-- Existing source/supersedes/rate/project/contract FKs must be introspected and
-- aligned by Root. FK existence does not prove same-project association.

-- Candidate02 delta: efficient ANY-INTERSECTION personal-rate lookup.
-- Personal precedence is cross-row and must be checked in the borrowed
-- transaction under the same-person publication/registration family lock.
-- No database CHECK can prove the selected rate wins over all intersecting rows.
CREATE INDEX idx_r4e_person_rate_coverage
  ON poms.internal_cost_rate_version(person_id,effective_from,effective_to,rate_unit)
  WHERE rate_scope_type='person' AND status IN ('active','superseded');
-- Invoice currency DTO/persistence changes are Root/C-owned, not this E DDL.


-- SOURCE docs/design/rust-r4def/F-schema-candidate01.sql
-- F G1 candidate only. NOT EXECUTED. Root owns the final consolidated migration.
-- Baseline: 565661b9113372de4da6662a4a692fbfd2296dd6; Issue #109 / batch #106.
-- Existing four tables and current indexes are retained. New commands must write
-- governance_schema_version=1 and complete immutable evidence. Legacy rows remain
-- explicitly unverified until a separately authorized evidence reconciliation.
-- No UPDATE of old money, no rounding migration, no synthetic source backfill.

CREATE TABLE poms.cost_governance_evidence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type varchar(64) NOT NULL CHECK (target_type IN (
        'SharedCostAllocationBasis', 'SharedCostAllocationResult',
        'CostStageAttributionSnapshot', 'AccountingTaxTreatmentSnapshot'
    )),
    target_id uuid NOT NULL,
    project_id uuid NULL REFERENCES poms.project(id),
    evidence_kind varchar(32) NOT NULL CHECK (evidence_kind IN (
        'source-facts', 'manual-stage', 'manual-finance'
    )),
    business_date date NOT NULL,
    source_references jsonb NOT NULL CHECK (jsonb_typeof(source_references) = 'array'),
    frozen_payload jsonb NOT NULL CHECK (jsonb_typeof(frozen_payload) = 'object'),
    payload_hash char(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
    reason text NOT NULL CHECK (length(btrim(reason)) > 0),
    actor_id uuid NOT NULL,
    request_id varchar(128) NULL,
    schema_version smallint NOT NULL DEFAULT 1 CHECK (schema_version = 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(target_type, target_id)
);

ALTER TABLE poms.shared_cost_allocation_basis
    ADD COLUMN currency varchar(16) NULL,
    ADD COLUMN measurement_basis varchar(32) NULL,
    ADD COLUMN source_amount_excluding_tax numeric(18,2) NULL,
    ADD COLUMN source_tax_cost_amount numeric(18,2) NULL,
    ADD COLUMN source_amount_including_tax numeric(18,2) NULL,
    ADD COLUMN measurement_amount numeric(18,2) NULL,
    ADD COLUMN allocation_algorithm varchar(64) NULL,
    ADD COLUMN replacement_operation_id uuid NULL,
    ADD COLUMN replacement_reason text NULL,
    ADD COLUMN governance_evidence_id uuid NULL REFERENCES poms.cost_governance_evidence(id),
    ADD COLUMN governance_schema_version smallint NOT NULL DEFAULT 0;

ALTER TABLE poms.shared_cost_allocation_basis
    ALTER COLUMN governance_schema_version SET DEFAULT 1,
    ADD CONSTRAINT fk_r4f_basis_supersedes FOREIGN KEY (supersedes_id)
        REFERENCES poms.shared_cost_allocation_basis(id),
    ADD CONSTRAINT chk_r4f_basis_v1 CHECK (
        governance_schema_version = 0 OR (
            governance_schema_version = 1 AND currency IS NOT NULL
            AND measurement_basis IS NOT NULL
            AND measurement_basis IN ('excluding-tax','tax','including-tax')
            AND measurement_amount IS NOT NULL AND measurement_amount >= 0
            AND allocation_algorithm IS NOT NULL
            AND allocation_algorithm = 'largest-remainder-cents-v1'
            AND governance_evidence_id IS NOT NULL
            AND (supersedes_id IS NULL OR (replacement_reason IS NOT NULL AND length(btrim(replacement_reason)) > 0))
        )
    ),
    ADD CONSTRAINT chk_r4f_basis_money_layers CHECK (
        (source_amount_excluding_tax IS NULL OR source_amount_excluding_tax >= 0)
        AND (source_tax_cost_amount IS NULL OR source_tax_cost_amount >= 0)
        AND (source_amount_including_tax IS NULL OR source_amount_including_tax >= 0)
        AND (source_amount_excluding_tax IS NULL OR source_tax_cost_amount IS NULL
             OR source_amount_including_tax IS NULL
             OR source_amount_excluding_tax + source_tax_cost_amount = source_amount_including_tax)
    );

CREATE UNIQUE INDEX uq_r4f_basis_successor
    ON poms.shared_cost_allocation_basis(supersedes_id) WHERE supersedes_id IS NOT NULL;

CREATE TABLE poms.shared_cost_allocation_source_snapshot (
    basis_id uuid NOT NULL REFERENCES poms.shared_cost_allocation_basis(id),
    cost_record_id uuid NOT NULL REFERENCES poms.project_actual_cost_record(id),
    cost_row_version integer NOT NULL CHECK (cost_row_version > 0),
    source_type varchar(64) NULL,
    source_id varchar(64) NULL,
    source_row_version integer NULL CHECK (source_row_version > 0),
    currency varchar(16) NOT NULL,
    amount_excluding_tax numeric(18,2) NULL,
    tax_cost_amount numeric(18,2) NULL,
    amount_including_tax numeric(18,2) NULL,
    source_payload jsonb NOT NULL CHECK (jsonb_typeof(source_payload) = 'object'),
    source_payload_hash char(64) NOT NULL CHECK (source_payload_hash ~ '^[0-9a-f]{64}$'),
    is_current boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(basis_id,cost_record_id),
    CHECK (
        (amount_excluding_tax IS NULL OR amount_excluding_tax >= 0)
        AND (tax_cost_amount IS NULL OR tax_cost_amount >= 0)
        AND (amount_including_tax IS NULL OR amount_including_tax >= 0)
        AND (amount_excluding_tax IS NULL OR tax_cost_amount IS NULL
             OR amount_including_tax IS NULL
             OR amount_excluding_tax + tax_cost_amount = amount_including_tax)
    )
);
-- This additionally protects intersecting sets [A,B] versus [B,C], which the
-- existing uq_scab_scope_current exact-set hash does not protect.
CREATE UNIQUE INDEX uq_r4f_allocation_source_current
    ON poms.shared_cost_allocation_source_snapshot(cost_record_id) WHERE is_current;

ALTER TABLE poms.shared_cost_allocation_result
    ADD COLUMN allocation_weight numeric(18,6) NULL,
    ADD COLUMN currency varchar(16) NULL,
    ADD COLUMN allocated_amount_excluding_tax numeric(18,2) NULL,
    ADD COLUMN allocated_tax_cost_amount numeric(18,2) NULL,
    ADD COLUMN allocated_amount_including_tax numeric(18,2) NULL,
    ADD COLUMN residual_minor_units smallint NULL,
    ADD COLUMN replacement_operation_id uuid NULL,
    ADD COLUMN replacement_reason text NULL,
    ADD COLUMN governance_evidence_id uuid NULL REFERENCES poms.cost_governance_evidence(id),
    ADD COLUMN governance_schema_version smallint NOT NULL DEFAULT 0;

ALTER TABLE poms.shared_cost_allocation_result
    ALTER COLUMN governance_schema_version SET DEFAULT 1,
    ADD CONSTRAINT fk_r4f_result_supersedes FOREIGN KEY (supersedes_id)
        REFERENCES poms.shared_cost_allocation_result(id),
    ADD CONSTRAINT chk_r4f_result_v1 CHECK (
        governance_schema_version = 0 OR (
            governance_schema_version = 1 AND currency IS NOT NULL
            AND allocation_weight IS NOT NULL AND allocation_weight >= 0
            AND allocated_amount >= 0
            AND (allocation_ratio IS NULL OR allocation_ratio BETWEEN 0 AND 1)
            AND residual_minor_units IS NOT NULL AND residual_minor_units BETWEEN 0 AND 2
            AND governance_evidence_id IS NOT NULL
            AND (supersedes_id IS NULL OR (replacement_reason IS NOT NULL AND length(btrim(replacement_reason)) > 0))
        )
    ),
    ADD CONSTRAINT chk_r4f_result_money_layers CHECK (
        (allocated_amount_excluding_tax IS NULL OR allocated_amount_excluding_tax >= 0)
        AND (allocated_tax_cost_amount IS NULL OR allocated_tax_cost_amount >= 0)
        AND (allocated_amount_including_tax IS NULL OR allocated_amount_including_tax >= 0)
        AND (allocated_amount_excluding_tax IS NULL OR allocated_tax_cost_amount IS NULL
             OR allocated_amount_including_tax IS NULL
             OR allocated_amount_excluding_tax + allocated_tax_cost_amount = allocated_amount_including_tax)
    );
CREATE UNIQUE INDEX uq_r4f_result_successor
    ON poms.shared_cost_allocation_result(supersedes_id) WHERE supersedes_id IS NOT NULL;

ALTER TABLE poms.cost_stage_attribution_snapshot
    ADD COLUMN evidence_business_date date NULL,
    ADD COLUMN governance_evidence_id uuid NULL REFERENCES poms.cost_governance_evidence(id),
    ADD COLUMN governance_schema_version smallint NOT NULL DEFAULT 0;
ALTER TABLE poms.cost_stage_attribution_snapshot
    ALTER COLUMN governance_schema_version SET DEFAULT 1,
    ADD CONSTRAINT fk_r4f_stage_supersedes FOREIGN KEY (supersedes_id)
        REFERENCES poms.cost_stage_attribution_snapshot(id),
    ADD CONSTRAINT chk_r4f_stage_v1 CHECK (
        governance_schema_version = 0 OR (
            governance_schema_version = 1 AND evidence_business_date IS NOT NULL
            AND governance_evidence_id IS NOT NULL AND handled_at IS NOT NULL
            AND handled_by IS NOT NULL
        )
    );
CREATE UNIQUE INDEX uq_r4f_stage_successor
    ON poms.cost_stage_attribution_snapshot(supersedes_id) WHERE supersedes_id IS NOT NULL;

ALTER TABLE poms.accounting_tax_treatment_snapshot
    ADD COLUMN currency varchar(16) NULL,
    ADD COLUMN replacement_reason text NULL,
    ADD COLUMN governance_evidence_id uuid NULL REFERENCES poms.cost_governance_evidence(id),
    ADD COLUMN governance_schema_version smallint NOT NULL DEFAULT 0;
ALTER TABLE poms.accounting_tax_treatment_snapshot
    ALTER COLUMN governance_schema_version SET DEFAULT 1,
    ADD CONSTRAINT fk_r4f_tax_supersedes FOREIGN KEY (supersedes_id)
        REFERENCES poms.accounting_tax_treatment_snapshot(id),
    ADD CONSTRAINT chk_r4f_tax_v1 CHECK (
        governance_schema_version = 0 OR (
            governance_schema_version = 1 AND currency IS NOT NULL
            AND governance_evidence_id IS NOT NULL
            AND confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL
            AND tax_impact_pending_amount >= 0
            AND (tax_pending_flag OR tax_impact_pending_amount = 0)
            AND (deductibility_status <> 'pending' OR tax_pending_flag)
            AND length(btrim(tax_impact_summary)) > 0
            AND (supersedes_id IS NULL OR (replacement_reason IS NOT NULL AND length(btrim(replacement_reason)) > 0))
        )
    );
CREATE UNIQUE INDEX uq_r4f_tax_successor
    ON poms.accounting_tax_treatment_snapshot(supersedes_id) WHERE supersedes_id IS NOT NULL;

-- Existing indexes already protect current basis/result/stage/tax identities:
-- uq_scab_scope_current, uq_scar_basis_project_current,
-- uq_csas_cost_record_current, uq_atts_project_type_active. Do not duplicate them.
-- New inserts and replacements use SQL guarded UPDATE ... WHERE row_version=$n
-- and increment row_version explicitly. Existing historical money is immutable.
--
-- Mandatory runtime / deferred-trigger checks for Root's final migration:
-- 1. Every evidence row matches its target_type/target_id/project and hash.
-- 2. New source snapshots are confirmed, not included/voided/replaced; all use the
--    same currency, every expected cost/source version matches, selected money
--    layer is known, and source sums exactly equal the frozen basis totals.
-- 3. Active project results use the same currency and measurement layer; exact
--    positive total weight; selected allocated sums == measurement_amount.
--    Known net/tax layers each conserve their source sum; gross_i=net_i+tax_i.
--    Unknown layers stay NULL, never COALESCE to zero or another layer.
-- 4. Full replacement locks all projects/source/current results, moves every old
--    source is_current=false, supersedes old basis/results, inserts a new basis
--    and full result set with real predecessor links and a shared operation ID.
--    All these writes plus evidence/audit/auth coflush commit atomically.
-- 5. E cannot mutate a cost/source already frozen in an active allocation through
--    its ordinary replacement path. A dedicated complete governance replacement
--    must own source-version changes; this candidate share replacement does not.
-- 6. E/F confirmed/included cost writes must have execution_stage_code,
--    stage_derived_from_type/id/at, stage_locked_at, and a same-project v1 active
--    attribution whose immutable evidence resolves to the true business date.
--    No handover/execution interval is inferred from project.current_stage.
-- 7. locked_by_snapshot_id, when supplied, must resolve to a verified, same-project
--    frozen snapshot actually covering this cost. No generic uuid FK can prove it.
-- 8. Existing frozen operating payloads are never rewritten by F; changes needing
--    restatement remain an explicit dependency on the future operating slice.
-- 9. Tables above are append-only except status/current pointer/row version;
--    source/evidence money, actor, dates and payload cannot be changed in place.
--
-- Preflight to run READ-ONLY before final migration, never autocorrect:
-- SELECT id, amount_excluding_tax, tax_cost_amount, amount_including_tax, labor_amount
-- FROM poms.project_actual_cost_record
-- WHERE amount_excluding_tax <> trunc(amount_excluding_tax,2)
--    OR tax_cost_amount <> trunc(tax_cost_amount,2)
--    OR amount_including_tax <> trunc(amount_including_tax,2)
--    OR labor_amount <> trunc(labor_amount,2);


-- SOURCE docs/design/rust-r4def/root-source-currency01.sql
-- G1 source proposal only. Root promotes this after joint G1; NOT EXECUTED.
-- Historical invoices keep NULL currency until a responsible explicit correction.
ALTER TABLE poms.invoice_record
  ADD COLUMN currency_code varchar(3) NULL,
  ADD COLUMN currency_source varchar(32) NULL,
  ADD COLUMN currency_source_snapshot_id uuid NULL,
  ADD CONSTRAINT fk_r4e_invoice_currency_snapshot
    FOREIGN KEY(currency_source_snapshot_id,contract_id)
    REFERENCES poms.contract_term_snapshot(id,contract_id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_r4e_invoice_currency CHECK (
    (currency_code IS NULL AND currency_source IS NULL AND currency_source_snapshot_id IS NULL)
    OR (
      currency_code IS NOT NULL AND currency_code ~ '^[A-Z]{3}$'
      AND currency_source IS NOT NULL AND currency_source IN ('explicit','contract-snapshot')
      AND ((currency_source='explicit' AND currency_source_snapshot_id IS NULL)
        OR (currency_source='contract-snapshot' AND contract_id IS NOT NULL AND currency_source_snapshot_id IS NOT NULL))
    )
  );

