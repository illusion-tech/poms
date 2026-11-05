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
