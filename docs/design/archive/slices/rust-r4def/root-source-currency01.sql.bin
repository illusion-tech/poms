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
