-- G1's baseline-only command has no H evaluation. Preserve that fact in SQL.
-- Append to the one R4 GHI forward migration; do not rewrite the frozen input.
ALTER TABLE poms.operating_command_receipt ALTER COLUMN evaluation_hash DROP NOT NULL;
ALTER TABLE poms.operating_command_receipt ADD CONSTRAINT ck_jghi_receipt_real_evaluation CHECK (
  (operation_id='ProjectCostController_activateOperatingBaselinePackage' AND evaluation_hash IS NULL)
  OR (operation_id<>'ProjectCostController_activateOperatingBaselinePackage' AND evaluation_hash IS NOT NULL)
);
