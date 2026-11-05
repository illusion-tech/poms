-- R4E G1 candidate only. NOT EXECUTED. Root owns final shared migration.
-- Inputs: current Node entities/migrations, user-decisions01.json, E-g1-candidate01.md.
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
