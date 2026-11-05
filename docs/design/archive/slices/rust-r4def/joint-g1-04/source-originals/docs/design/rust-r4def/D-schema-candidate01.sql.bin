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
