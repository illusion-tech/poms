// Public R3 reapproval continuation; old baseline/diff/summary remain facts.
import assert from 'node:assert/strict';
import { data } from './pure.mjs';
import { requireSummary } from './upstream.mjs';
import { actualActorFor } from './actors.mjs';
const rv = value => { assert(Number.isSafeInteger(value.rowVersion) && value.rowVersion > 0); return value.rowVersion; };
const born = table => [{ table, pointer: '/id' }];
export async function reapproveBoundary27(ctx, api, scenario) {
  const f = ctx.state.fixtures, slot = f.contractRuns[0]; assert.equal(f.contractRuns.length, 1); assert(!slot.preparation && !slot.diffReview);
  const payload = await import('../../rust-r4abc/upstream-payloads01.mjs');
  const call = async (op, params, body = null, binding = {}, actor = 'manager') => data(await api.request(op, params, body, actor, binding));
  if (!f.a05Reapproval27) {
    assert(slot.diffHistory.diffItems.some(item => item.diffLevel === 'reapproval-required'));
    const genuine = requireSummary(ctx);
    f.a05Reapproval27 = { oldBaseline: f.baseline, oldPricing: f.pricing, oldReadiness: slot.readiness, oldDiffHistory: slot.diffHistory, oldSummaryReceipt: f.summary.receipt, genuineSummaryLineage: genuine, phase: 'new-baseline-pending' }; ctx.persist();
  }
  const repair = f.a05Reapproval27, context = () => ({ ...f, contract: slot.contract, actorId: ctx.state.actors.manager.id, tag: ctx.state.prefix, plannedDate: f.plannedDate,
    contractInclusive: scenario.contractGross, contractExclusive: scenario.contractNet, summary: repair.genuineSummaryLineage });
  if (!repair.newBaseline) {
    const body = payload.baseline(context()).body; body.baselineCode = `${ctx.state.prefix}-a05-reapproval27`; body.contractTerms[0].taxRate = scenario.taxRate;
    repair.newBaseline = await call('ContractReadinessController_createCommercialReleaseBaseline', {}, body, { responseBirths: born('commercial_release_baseline'), mutableTables: ['commercial_release_baseline'] });
    f.baseline = repair.newBaseline; repair.phase = 'new-baseline-produced'; ctx.persist();
  }
  if (!repair.newPricing) {
    // The old REAL generic summary remains only existing project-quote lineage.
    // source::collect explicitly treats this FK as lineage, not authorization
    // or a claimed material snapshot of this new commercial baseline.
    repair.newPricing = await call('ProjectController_createProjectPricingMarginReview', { projectId: f.project.id }, payload.pricing(context()).body,
      { responseBirths: born('project_pricing_margin_review'), mutableTables: ['project_pricing_margin_review', 'project'] });
    assert.equal(repair.newPricing.readyForContracting, true); f.pricing = repair.newPricing; repair.phase = 'new-real-pricing-produced'; ctx.persist();
  }
  if (!repair.newReadiness) {
    const body = payload.readiness(context(), { lightReview: true }).body; body.candidateTerms.taxRate = scenario.taxRate;
    repair.newReadiness = await call('ContractReadinessController_createContractReadinessPackage', {}, body,
      { responseBirths: born('contract_readiness_package'), mutableTables: ['commercial_release_baseline', 'contract_readiness_package'] });
    slot.readiness = repair.newReadiness; repair.phase = 'new-current-readiness-produced'; ctx.persist();
  }
  slot.diffHistory = await call('ContractReadinessController_getDiffHistory', { id: f.baseline.id }, null, { query: { contractId: slot.contract.id } });
  assert(slot.diffHistory.diffItems.length > 0 && slot.diffHistory.diffItems.every(item => item.diffLevel !== 'reapproval-required'), 'Never approve a heavy monetary reference difference');
  f.baseline = await call('ContractReadinessController_getCommercialReleaseBaseline', { id: f.baseline.id }); ctx.persist();
  if (!slot.diffReview) {
    slot.diffReview = await call('ContractReadinessController_reviewDiff', { id: f.baseline.id }, payload.reviewDiff({ ...context(), readiness: slot.readiness, diffHistory: slot.diffHistory }).body,
      { readinessDiffReviewItems: true, mutableTables: ['commercial_release_baseline', 'contract_readiness_package', 'commercial_baseline_diff_result'], updatedAnchors: [{ table: 'commercial_release_baseline', id: f.baseline.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  slot.readiness = await call('ContractReadinessController_getCurrentContractReadiness', { projectId: f.project.id }, null, { query: { contractId: slot.contract.id } }); assert.equal(slot.readiness.guardDecision, 'allowed'); ctx.persist();
  if (!slot.preparation) { slot.preparation = await call('ContractReadinessController_initializeContractSnapshot', { id: slot.readiness.id }, { contractId: slot.contract.id, contractReadinessPackageId: slot.readiness.id, expectedVersion: rv(slot.readiness) },
    { responseBirths: [{ table: 'contract_term_preparation', pointer: '/preparationId' }], mutableTables: ['contract_readiness_package'], updatedAnchors: [{ table: 'contract_readiness_package', id: slot.readiness.id, requestBinding: 'path:id' }] }); ctx.persist(); }
  repair.phase = 'real-new-reference-prepared'; f.contractPrepareComplete = true; ctx.persist();
  return { kind: 'actual-new-commercial-reference-prepared27', contracts: 1, oldReferencesPreserved: true, newBaselineId: repair.newBaseline.id, existingRealSummaryUsedOnlyAsLineage: true, approvalStillRequired: true };
}
export async function finishReapprovedBoundary27(ctx, api) {
  const f = ctx.state.fixtures, slot = f.contractRuns[0]; assert(f.contractPrepareComplete && f.a05Reapproval27 && slot.preparation);
  const call = async (op, params, body = null, binding = {}, actor = 'manager') => data(await api.request(op, params, body, actor, binding));
  const tables = ['contract', 'contract_term_preparation', 'contract_readiness_package', 'approval_record', 'todo_item', 'approval_summary_snapshot'];
  if (!slot.plan) {
    slot.contract = await call('ContractController_getById', { id: slot.contract.id }); ctx.persist();
    if (!slot.submitted) { slot.submitted = await call('ContractController_submitReview', { id: slot.contract.id }, { preparationId: slot.preparation.preparationId, expectedVersion: rv(slot.contract), comment: '按真实新商业参考和已复核轻差异提交真实正式审批。' },
      { responseBirths: [{ table: 'approval_record', pointer: '/approvalRecordId' }], mutableTables: tables, updatedAnchors: [{ table: 'contract', id: slot.contract.id, requestBinding: 'path:id' }] }); ctx.persist(); }
    for (let i = 0; i < 8; i += 1) {
      slot.approval = await call('ContractController_getCurrentApproval', { id: slot.contract.id }); ctx.persist();
      if (slot.approval.currentStatus === 'approved') break;
      assert.equal(slot.approval.currentStatus, 'pending'); const actor = await actualActorFor(ctx, api, slot.approval.currentApproverUserId);
      await call('ApprovalController_approveRecord', { id: slot.approval.id }, { expectedVersion: rv(slot.approval), comment: '实际指定审批人本人批准真实新参考准备版本。' },
        { mutableTables: tables, updatedAnchors: [{ table: 'approval_record', id: slot.approval.id, requestBinding: 'path:id' }] }, actor);
    }
    slot.approval = await call('ContractController_getCurrentApproval', { id: slot.contract.id }); assert.equal(slot.approval.currentStatus, 'approved');
    slot.contract = await call('ContractController_getById', { id: slot.contract.id }); ctx.persist();
    if (!slot.activated) { slot.activated = await call('ContractController_activate', { id: slot.contract.id }, { expectedVersion: rv(slot.contract), comment: '按实际已批准新准备版本激活。' },
      { responseBirths: [{ table: 'contract_term_snapshot', pointer: '/snapshotId' }], mutableTables: [...tables, 'project'], updatedAnchors: [{ table: 'contract', id: slot.contract.id, requestBinding: 'path:id' }] }); ctx.persist(); }
    slot.contract = await call('ContractController_getById', { id: slot.contract.id }); assert.equal(slot.contract.status, 'active');
    slot.readiness = await call('ContractReadinessController_getContractReadinessPackage', { id: slot.readiness.id }); ctx.persist();
    slot.plan = await call('ContractReadinessController_initializeReceivablePlan', { id: slot.readiness.id }, { contractId: slot.contract.id, expectedVersion: rv(slot.readiness) },
      { responseBirths: [{ table: 'receivable_plan_version', pointer: '/planVersionId' }], mutableTables: ['contract_readiness_package'], updatedAnchors: [{ table: 'contract_readiness_package', id: slot.readiness.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  f.project = await call('ProjectController_getById', { id: f.project.id }); f.contractFinishComplete = true; ctx.persist();
  return { kind: 'actual-reapproved-one-contract-activation-and-plan27', contracts: 1, actualDesignatedApproval: true, oldMaterialsNotRewritten: true };
}
