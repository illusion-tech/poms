import assert from 'node:assert/strict';
import { data, uuid } from './pure.mjs';

export async function verifyExpenseCostReadiness(ctx, api, costId) {
  const f = ctx.state.fixtures;
  const detailResponse = await api.request('ProjectCostController_getProjectActualCostRecordDetail', { id: uuid(costId) }, null, 'manager');
  const detail = data(detailResponse);
  const rows = await ctx.db(async c => (await c.query(`SELECT c.id::text,c.project_id::text "projectId",c.source_type "sourceType",c.source_id::text "sourceId",c.record_status "recordStatus",c.row_version "rowVersion",c.currency,
    c.amount_excluding_tax::text net,c.tax_cost_amount::text tax,c.amount_including_tax::text gross,c.confirmed_at "confirmedAt",c.confirmed_by::text "confirmedBy",
    c.execution_stage_code "executionStage",c.stage_derived_from_type "stageDerivedType",c.stage_derived_from_id::text "stageDerivedId",
    s.status "stageStatus",s.cost_record_id::text "stageCostId",s.attributed_stage "attributedStage",s.governance_schema_version "stageSchemaVersion",s.handled_at "stageHandledAt",s.handled_by::text "stageHandledBy",s.evidence_business_date::text "stageBusinessDate",
    e.project_id::text "evidenceProjectId",e.id::text "governanceEvidenceId",e.schema_version "evidenceSchemaVersion",e.target_id::text "evidenceTargetId",e.payload_hash "evidencePayloadHash",
    c.occurred_on::date::text "costBusinessDate",(SELECT count(*)::int FROM poms.accounting_tax_treatment_snapshot t WHERE t.project_id=c.project_id AND t.status IN ('active','pending')) "realTaxAssessmentCount"
    FROM poms.project_actual_cost_record c JOIN poms.cost_stage_attribution_snapshot s ON s.id=c.stage_derived_from_id::uuid AND s.cost_record_id=c.id
    JOIN poms.cost_governance_evidence e ON e.id=s.governance_evidence_id WHERE c.id=$1::uuid`, [costId])).rows);
  assert.equal(rows.length, 1); const row = rows[0];
  assert.equal(row.projectId, f.project.id); assert.equal(row.sourceType, 'expense-record'); assert.equal(row.sourceId, f.expense.id);
  assert(['confirmed', 'included'].includes(row.recordStatus)); assert(row.confirmedAt && row.confirmedBy);
  assert.equal(row.rowVersion, detail.rowVersion); assert.equal(row.currency, 'CNY');
  assert.equal(row.net, '5000.00'); assert.equal(row.tax, '650.00'); assert.equal(row.gross, '5650.00');
  assert.equal(row.stageDerivedType, 'CostStageAttributionSnapshot'); assert.equal(row.stageDerivedId, row.evidenceTargetId); assert.equal(row.stageCostId, costId);
  assert.equal(row.stageStatus, 'active'); assert.equal(row.evidenceProjectId, f.project.id);
  assert.equal(row.stageSchemaVersion, 1); assert.equal(row.evidenceSchemaVersion, 1); assert(/^[a-f0-9]{64}$/.test(row.evidencePayloadHash));
  assert(row.stageHandledAt && row.stageHandledBy); assert.equal(row.executionStage, 'execution'); assert.equal(row.attributedStage, 'execution'); assert.equal(row.stageBusinessDate, row.costBusinessDate);
  const receipt = ctx.artifact(`${ctx.next('actual-cost-G-readiness')}.json`, { actualDetailReceipt: detailResponse.receiptId, actualRows: rows,
    sourceGuards: ['project_operating/inclusion.rs::qualify_cost', 'project_cost_governance/service.rs::stage_inner', 'project_operating/context.rs::build', 'project_operating_signals/policy.rs::hard_missing'],
    actualFTaxRequiredForGHardAdmission: false, taxKnowledgeRule: row.realTaxAssessmentCount === 0 ? 'taxed-cost-with-no-tax-assessment-remains-unknown' : 'only-actual-tax-producer-facts-may-be-used',
    taxDeductibilityOrDefaultZeroInvented: false, finalRustCollectorStillRequired: true }, { kind: 'actual-E-F-stage-cost-readiness-for-G', actualConfirmedCost: true, sourceAmountAndStageFKsBound: true, actualFTaxRequiredForGHardAdmission: false });
  f.costReadinessForG = receipt; f.actualCost = detail; ctx.persist(); return receipt;
}
export function assertObservedTaxKnowledge(snapshot, actualTaxAssessmentCount) {
  const tax = snapshot.financialProjection?.value?.taxPending;
  assert(tax, 'Actual full finance projection must expose the source-derived knowledge state');
  if (actualTaxAssessmentCount === 0) { assert.equal(tax.knowledge, 'unknown'); assert.equal(tax.value, null); assert.equal(tax.unknownReasonCode, 'tax-assessment-missing'); }
  else if (tax.knowledge === 'unknown') assert.equal(tax.value, null);
  else { assert.equal(tax.knowledge, 'known'); assert(typeof tax.value === 'string'); }
}
