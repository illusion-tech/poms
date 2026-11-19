import { Migration } from '@mikro-orm/migrations';

export class Migration20261103060000_rust_r4abc_contract_lifecycle extends Migration {
    override async up(): Promise<void> {
        this.addSql(String.raw`-- G1 design input only. No database execution at G1.
-- G2 compiles these statements into a new forward migration plus matching entities.
-- Existing rows retain nullable contract/preparation fields. No fake UUID is promoted.
ALTER TABLE poms.contract ADD CONSTRAINT uq_r4_contract_id_project UNIQUE (id, project_id);
ALTER TABLE poms.commercial_release_baseline
  ADD COLUMN contract_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN currency_code varchar(16) NOT NULL DEFAULT 'CNY',
  ADD CONSTRAINT chk_r4_baseline_contract_terms CHECK (jsonb_typeof(contract_terms) = 'array'),
  ADD CONSTRAINT uq_r4_baseline_id_project UNIQUE (id, project_id);
-- Fail explicitly if historical writes left duplicate current sources; do not guess a winner.
DO $$ BEGIN
  IF EXISTS (SELECT project_id FROM poms.commercial_release_baseline WHERE is_current GROUP BY project_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'R4 baseline current duplicates require explicit data reconciliation';
  END IF;
END $$;
CREATE UNIQUE INDEX uq_r4_baseline_project_current ON poms.commercial_release_baseline(project_id) WHERE is_current;
ALTER TABLE poms.commercial_baseline_diff_result
  ADD COLUMN contract_id uuid NULL,
  ADD COLUMN reference_terms jsonb NULL,
  ADD COLUMN candidate_terms jsonb NULL,
  ADD COLUMN payload_hash varchar(64) NULL,
  ADD CONSTRAINT fk_r4_diff_contract_project FOREIGN KEY (contract_id, project_id) REFERENCES poms.contract(id, project_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_r4_diff_baseline_project FOREIGN KEY (baseline_id, project_id) REFERENCES poms.commercial_release_baseline(id, project_id) ON DELETE RESTRICT,
  ADD CONSTRAINT uq_r4_diff_scope UNIQUE (id, baseline_id, project_id, contract_id);
CREATE TABLE poms.commercial_baseline_review_attachment (
  review_record_id uuid NOT NULL REFERENCES poms.commercial_baseline_review_record(id) ON DELETE RESTRICT,
  attachment_id uuid NOT NULL REFERENCES poms.attachment(id) ON DELETE RESTRICT,
  PRIMARY KEY (review_record_id,attachment_id)
);
ALTER TABLE poms.contract_readiness_package
  ADD COLUMN contract_id uuid NULL,
  ADD COLUMN candidate_terms jsonb NULL,
  ADD COLUMN source_facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN payload_hash varchar(64) NULL,
  ADD COLUMN current_preparation_id uuid NULL,
  ADD COLUMN source_cost_package_id uuid NULL REFERENCES poms.project_technical_cost_package(id) ON DELETE RESTRICT,
  ADD COLUMN source_bid_process_id uuid NULL REFERENCES poms.project_bid_commercial_process(id) ON DELETE RESTRICT,
  ADD COLUMN source_pricing_review_id uuid NULL REFERENCES poms.project_pricing_margin_review(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_r4_readiness_contract_project FOREIGN KEY (contract_id, project_id) REFERENCES poms.contract(id, project_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_r4_readiness_diff_scope FOREIGN KEY (latest_diff_result_id, source_baseline_id, project_id, contract_id) REFERENCES poms.commercial_baseline_diff_result(id, baseline_id, project_id, contract_id) ON DELETE RESTRICT,
  ADD CONSTRAINT uq_r4_readiness_scope UNIQUE (id, project_id, contract_id);
CREATE UNIQUE INDEX uq_r4_readiness_contract_current ON poms.contract_readiness_package(project_id,contract_id) WHERE is_current AND contract_id IS NOT NULL;

CREATE TABLE poms.contract_term_preparation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  source_readiness_id uuid NOT NULL,
  source_baseline_id uuid NOT NULL,
  source_diff_result_id uuid NOT NULL,
  source_cost_package_id uuid NOT NULL REFERENCES poms.project_technical_cost_package(id) ON DELETE RESTRICT,
  source_bid_process_id uuid NULL REFERENCES poms.project_bid_commercial_process(id) ON DELETE RESTRICT,
  source_pricing_review_id uuid NOT NULL REFERENCES poms.project_pricing_margin_review(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  row_version integer NOT NULL DEFAULT 1 CHECK (row_version > 0),
  is_current boolean NOT NULL DEFAULT true,
  supersedes_id uuid NULL REFERENCES poms.contract_term_preparation(id) ON DELETE RESTRICT,
  status varchar(32) NOT NULL CHECK (status IN ('prepared','superseded','activated')),
  contract_row_version_at_preparation integer NOT NULL CHECK (contract_row_version_at_preparation > 0),
  currency_code varchar(16) NOT NULL,
  amount_tax_inclusive numeric(18,2) NOT NULL CHECK (amount_tax_inclusive > 0),
  amount_tax_exclusive numeric(18,2) NOT NULL CHECK (amount_tax_exclusive > 0),
  tax_rate numeric(5,4) NOT NULL CHECK (tax_rate BETWEEN 0 AND 1),
  down_payment_rate numeric(5,4) NOT NULL CHECK (down_payment_rate BETWEEN 0 AND 1),
  retention_rate numeric(5,4) NOT NULL CHECK (retention_rate BETWEEN 0 AND 1),
  retention_due_date date NULL,
  payment_terms varchar(1000) NOT NULL,
  receivable_plan_seeds jsonb NOT NULL CHECK (jsonb_typeof(receivable_plan_seeds) = 'array' AND jsonb_array_length(receivable_plan_seeds) > 0),
  source_facts jsonb NOT NULL CHECK (jsonb_typeof(source_facts) = 'object'),
  contract_core_hash varchar(64) NOT NULL CHECK (contract_core_hash ~ '^[0-9a-f]{64}$'),
  payload_hash varchar(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  prepared_at timestamptz NOT NULL DEFAULT now(),
  prepared_by uuid NOT NULL,
  prepared_comment varchar(1000) NULL,
  activated_snapshot_id uuid NULL,
  activated_at timestamptz NULL,
  activated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_r4_preparation_version UNIQUE (contract_id,version),
  CONSTRAINT uq_r4_preparation_id_contract UNIQUE (id,contract_id),
  CONSTRAINT uq_r4_preparation_source_scope UNIQUE (id,source_readiness_id,contract_id),
  CONSTRAINT fk_r4_preparation_contract_project FOREIGN KEY (contract_id,project_id) REFERENCES poms.contract(id,project_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4_preparation_readiness_scope FOREIGN KEY (source_readiness_id,project_id,contract_id) REFERENCES poms.contract_readiness_package(id,project_id,contract_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4_preparation_diff_scope FOREIGN KEY (source_diff_result_id,source_baseline_id,project_id,contract_id) REFERENCES poms.commercial_baseline_diff_result(id,baseline_id,project_id,contract_id) ON DELETE RESTRICT,
  CONSTRAINT chk_r4_preparation_activation CHECK ((status='activated' AND activated_snapshot_id IS NOT NULL AND activated_at IS NOT NULL AND activated_by IS NOT NULL) OR (status<>'activated' AND activated_snapshot_id IS NULL AND activated_at IS NULL AND activated_by IS NULL))
);
CREATE UNIQUE INDEX uq_r4_preparation_current ON poms.contract_term_preparation(contract_id) WHERE is_current;
CREATE UNIQUE INDEX uq_r4_preparation_exact ON poms.contract_term_preparation(contract_id,source_readiness_id,payload_hash);
ALTER TABLE poms.contract_readiness_package ADD CONSTRAINT fk_r4_readiness_current_preparation FOREIGN KEY (current_preparation_id,contract_id) REFERENCES poms.contract_term_preparation(id,contract_id) ON DELETE RESTRICT;
ALTER TABLE poms.contract_term_snapshot
  ADD COLUMN source_preparation_id uuid NULL,
  ADD COLUMN receivable_plan_seeds jsonb NULL,
  ADD COLUMN payload_hash varchar(64) NULL,
  ADD CONSTRAINT uq_r4_snapshot_id_contract UNIQUE (id,contract_id),
  ADD CONSTRAINT uq_r4_snapshot_preparation_scope UNIQUE (id,contract_id,source_preparation_id),
  ADD CONSTRAINT fk_r4_snapshot_preparation_contract FOREIGN KEY (source_preparation_id,contract_id) REFERENCES poms.contract_term_preparation(id,contract_id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX uq_r4_snapshot_source_preparation ON poms.contract_term_snapshot(source_preparation_id) WHERE source_preparation_id IS NOT NULL;
ALTER TABLE poms.contract_term_preparation ADD CONSTRAINT fk_r4_preparation_activated_snapshot FOREIGN KEY (activated_snapshot_id,contract_id) REFERENCES poms.contract_term_snapshot(id,contract_id) ON DELETE RESTRICT;

CREATE TABLE poms.contract_review_binding (
  approval_record_id uuid PRIMARY KEY REFERENCES poms.approval_record(id) ON DELETE RESTRICT,
  contract_id uuid NOT NULL REFERENCES poms.contract(id) ON DELETE RESTRICT,
  preparation_id uuid NOT NULL,
  preparation_version integer NOT NULL CHECK (preparation_version > 0),
  payload_hash varchar(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  CONSTRAINT fk_r4_review_preparation_contract FOREIGN KEY (preparation_id,contract_id) REFERENCES poms.contract_term_preparation(id,contract_id) ON DELETE RESTRICT
);
CREATE INDEX idx_r4_review_contract ON poms.contract_review_binding(contract_id,created_at DESC);

CREATE TABLE poms.receivable_plan_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  snapshot_id uuid NOT NULL,
  source_preparation_id uuid NOT NULL,
  source_readiness_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  row_version integer NOT NULL DEFAULT 1 CHECK (row_version > 0),
  is_current boolean NOT NULL DEFAULT true,
  supersedes_id uuid NULL REFERENCES poms.receivable_plan_version(id) ON DELETE RESTRICT,
  status varchar(32) NOT NULL CHECK (status IN ('active','superseded','voided')),
  currency_code varchar(16) NOT NULL,
  amount_tax_inclusive numeric(18,2) NOT NULL CHECK (amount_tax_inclusive > 0),
  payload_hash varchar(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  initialized_at timestamptz NOT NULL DEFAULT now(),
  initialized_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_r4_plan_contract_version UNIQUE (contract_id,version),
  CONSTRAINT uq_r4_plan_contract_snapshot UNIQUE (contract_id,snapshot_id),
  CONSTRAINT uq_r4_plan_id_contract UNIQUE (id,contract_id),
  CONSTRAINT fk_r4_plan_contract_project FOREIGN KEY (contract_id,project_id) REFERENCES poms.contract(id,project_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4_plan_snapshot_scope FOREIGN KEY (snapshot_id,contract_id,source_preparation_id) REFERENCES poms.contract_term_snapshot(id,contract_id,source_preparation_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4_plan_preparation_source FOREIGN KEY (source_preparation_id,source_readiness_id,contract_id) REFERENCES poms.contract_term_preparation(id,source_readiness_id,contract_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX uq_r4_plan_contract_current ON poms.receivable_plan_version(contract_id) WHERE is_current;
CREATE TABLE poms.receivable_plan_node (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id uuid NOT NULL REFERENCES poms.receivable_plan_version(id) ON DELETE RESTRICT,
  node_key varchar(64) NOT NULL,
  label varchar(128) NOT NULL,
  planned_amount numeric(18,2) NOT NULL CHECK (planned_amount > 0),
  planned_date date NOT NULL,
  is_retention_node boolean NOT NULL,
  sort_order integer NOT NULL CHECK (sort_order >= 0),
  note varchar(1000) NULL,
  CONSTRAINT uq_r4_plan_node_key UNIQUE (plan_version_id,node_key),
  CONSTRAINT uq_r4_plan_node_order UNIQUE (plan_version_id,sort_order)
);
CREATE TABLE poms.receivable_plan_init_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id uuid NOT NULL UNIQUE REFERENCES poms.receivable_plan_version(id) ON DELETE RESTRICT,
  contract_id uuid NOT NULL,
  snapshot_id uuid NOT NULL,
  source_readiness_id uuid NOT NULL REFERENCES poms.contract_readiness_package(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  comment varchar(1000) NULL,
  initialized_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_r4_plan_init_contract FOREIGN KEY (plan_version_id,contract_id) REFERENCES poms.receivable_plan_version(id,contract_id) ON DELETE RESTRICT,
  CONSTRAINT fk_r4_plan_init_snapshot FOREIGN KEY (snapshot_id,contract_id) REFERENCES poms.contract_term_snapshot(id,contract_id) ON DELETE RESTRICT
);
`);
    }

    override async down(): Promise<void> {
        this.addSql(String.raw`DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM poms.contract_term_preparation) OR EXISTS(SELECT 1 FROM poms.contract_review_binding)
 OR EXISTS(SELECT 1 FROM poms.receivable_plan_version) OR EXISTS(SELECT 1 FROM poms.commercial_baseline_review_attachment)
 OR EXISTS(SELECT 1 FROM poms.contract_readiness_package WHERE contract_id IS NOT NULL)
 OR EXISTS(SELECT 1 FROM poms.commercial_release_baseline WHERE contract_terms <> '[]'::jsonb) THEN
 RAISE EXCEPTION 'R4 rollback requires explicit preservation of existing lifecycle data'; END IF;
END $$;
DROP TABLE poms.receivable_plan_init_record;
DROP TABLE poms.receivable_plan_node;
DROP TABLE poms.receivable_plan_version;
DROP TABLE poms.contract_review_binding;
ALTER TABLE poms.contract_readiness_package DROP CONSTRAINT fk_r4_readiness_current_preparation;
ALTER TABLE poms.contract_term_snapshot DROP CONSTRAINT fk_r4_snapshot_preparation_contract;
DROP TABLE poms.contract_term_preparation;
ALTER TABLE poms.contract_term_snapshot DROP CONSTRAINT uq_r4_snapshot_id_contract, DROP CONSTRAINT uq_r4_snapshot_preparation_scope, DROP COLUMN source_preparation_id, DROP COLUMN receivable_plan_seeds, DROP COLUMN payload_hash;
ALTER TABLE poms.contract_readiness_package DROP CONSTRAINT fk_r4_readiness_diff_scope, DROP CONSTRAINT uq_r4_readiness_scope, DROP COLUMN contract_id, DROP COLUMN candidate_terms, DROP COLUMN source_facts, DROP COLUMN payload_hash, DROP COLUMN current_preparation_id, DROP COLUMN source_cost_package_id, DROP COLUMN source_bid_process_id, DROP COLUMN source_pricing_review_id;
DROP TABLE poms.commercial_baseline_review_attachment;
ALTER TABLE poms.commercial_baseline_diff_result DROP CONSTRAINT fk_r4_diff_baseline_project, DROP COLUMN contract_id, DROP COLUMN reference_terms, DROP COLUMN candidate_terms, DROP COLUMN payload_hash;
ALTER TABLE poms.commercial_release_baseline DROP CONSTRAINT uq_r4_baseline_id_project, DROP COLUMN contract_terms, DROP COLUMN currency_code;
DROP INDEX poms.uq_r4_baseline_project_current;
ALTER TABLE poms.contract DROP CONSTRAINT uq_r4_contract_id_project;`);
    }
}
