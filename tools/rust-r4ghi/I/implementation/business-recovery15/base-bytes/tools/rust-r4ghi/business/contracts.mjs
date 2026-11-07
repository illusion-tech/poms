import assert from 'node:assert/strict';
import * as payload from '../../rust-r4abc/upstream-payloads01.mjs';
import { data, uuid } from './pure.mjs';
import { requireSummary } from './upstream.mjs';
import { actualActorFor } from './actors.mjs';

const rv = row => { assert(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0 && row.rowVersion <= 2147483647); return row.rowVersion; };
const births = (table, pointer = '/id') => [{ table, pointer }];
function context(ctx, slot = null) {
  const f = ctx.state.fixtures;
  return { ...f, ...(slot ?? {}), actorId: ctx.state.actors.manager.id, tag: ctx.state.prefix, plannedDate: f.plannedDate,
    contractInclusive: '56500.00', contractExclusive: '50000.00', summary: requireSummary(ctx) };
}
export async function contractPrepare(ctx, api) {
  const f = ctx.state.fixtures; assert(f.projectSourcesComplete && !f.contractPrepareComplete);
  const call = async (op, params, body = null, binding = {}) => data(await api.request(op, params, body, 'manager', binding));
  if (!f.pricing) { f.pricing = await call('ProjectController_createProjectPricingMarginReview', { projectId: f.project.id }, payload.pricing(context(ctx)).body, { responseBirths: births('project_pricing_margin_review'), mutableTables: ['project'] }); ctx.persist(); }
  assert.equal(f.pricing.readyForContracting, true, 'Actual R3 pricing release required');
  f.contractRuns ??= [f.contract, f.secondContract].map(contract => ({ contract })); ctx.persist();
  for (const slot of f.contractRuns) {
    if (slot.preparation) continue;
    let c = context(ctx, slot);
    if (!slot.readiness) {
      slot.readiness = await call('ContractReadinessController_createContractReadinessPackage', {}, payload.readiness(c, { lightReview: true }).body,
        { responseBirths: births('contract_readiness_package'), mutableTables: ['commercial_release_baseline'] }); ctx.persist();
    }
    c = context(ctx, slot);
    slot.diffHistory = await call('ContractReadinessController_getDiffHistory', { id: f.baseline.id }, null, { query: { contractId: slot.contract.id } });
    f.baseline = await call('ContractReadinessController_getCommercialReleaseBaseline', { id: f.baseline.id }); ctx.persist();
    if (!slot.diffReview) {
      c = context(ctx, slot); const fields = slot.diffHistory?.diffItems ?? [];
      if (fields.length) {
        slot.diffReview = await call('ContractReadinessController_reviewDiff', { id: f.baseline.id }, payload.reviewDiff(c).body,
          { mutableTables: ['commercial_release_baseline', 'contract_readiness_package', 'commercial_baseline_diff_result'],
            updatedAnchors: [{ table: 'commercial_release_baseline', id: f.baseline.id, requestBinding: 'path:id' }] }); ctx.persist();
      }
    }
    slot.readiness = await call('ContractReadinessController_getCurrentContractReadiness', { projectId: f.project.id }, null, { query: { contractId: slot.contract.id } }); ctx.persist();
    assert.equal(slot.readiness.guardDecision, 'allowed', 'Real readiness prerequisite/diff review required');
    slot.preparation = await call('ContractReadinessController_initializeContractSnapshot', { id: slot.readiness.id }, payload.prepare(context(ctx, slot)).body,
      { responseBirths: births('contract_term_preparation', '/preparationId'), mutableTables: ['contract_readiness_package'],
        updatedAnchors: [{ table: 'contract_readiness_package', id: slot.readiness.id, requestBinding: 'path:id' }] });
    uuid(slot.preparation.preparationId); assert.equal(slot.preparation.snapshotId, null); ctx.persist();
  }
  f.contractPrepareComplete = true; ctx.persist();
  return { kind: 'actual-R3-pricing-and-two-contract-readiness-preparations', completed: true, contracts: f.contractRuns.length, summaryIsApproval: false,
    contractApprovalAndActivation: 'not-run', nextStage: 'contract-finish', G3Certified: false, G4Certified: false };
}
export async function contractFinish(ctx, api) {
  const f = ctx.state.fixtures; assert(f.contractPrepareComplete && !f.contractFinishComplete);
  const call = async (op, params, body = null, binding = {}, actor = 'manager') => data(await api.request(op, params, body, actor, binding));
  const approvalTables = ['contract', 'contract_term_preparation', 'contract_readiness_package', 'approval_record', 'todo_item', 'approval_summary_snapshot'];
  for (const slot of f.contractRuns) {
    if (slot.plan) continue;
    slot.contract = await call('ContractController_getById', { id: slot.contract.id }); ctx.persist();
    if (!slot.submitted) {
      slot.submitted = await call('ContractController_submitReview', { id: slot.contract.id }, payload.submit(context(ctx, slot)).body,
        { responseBirths: births('approval_record', '/approvalRecordId'), mutableTables: approvalTables,
          updatedAnchors: [{ table: 'contract', id: slot.contract.id, requestBinding: 'path:id' }] }); ctx.persist();
    }
    for (let n = 0; n < 8; n++) {
      slot.approval = await call('ContractController_getCurrentApproval', { id: slot.contract.id }); ctx.persist();
      assert.equal(slot.approval.id, slot.submitted.approvalRecordId);
      if (slot.approval.currentStatus === 'approved') break;
      assert.equal(slot.approval.currentStatus, 'pending');
      const actor = await actualActorFor(ctx, api, uuid(slot.approval.currentApproverUserId));
      await call('ApprovalController_approveRecord', { id: slot.approval.id }, { expectedVersion: rv(slot.approval), comment: '本人按实际指定审批职责批准本隔离验收真实合同准备版本。' },
        { mutableTables: approvalTables, updatedAnchors: [{ table: 'approval_record', id: slot.approval.id, requestBinding: 'path:id' }] }, actor);
    }
    slot.approval = await call('ContractController_getCurrentApproval', { id: slot.contract.id }); ctx.persist();
    assert.equal(slot.approval.currentStatus, 'approved', 'Actual approval chain did not reach approved');
    slot.contract = await call('ContractController_getById', { id: slot.contract.id }); ctx.persist();
    if (!slot.activated) {
      slot.activated = await call('ContractController_activate', { id: slot.contract.id }, payload.activate(context(ctx, slot)).body,
        { responseBirths: births('contract_term_snapshot', '/snapshotId'), mutableTables: [...approvalTables, 'project'],
          updatedAnchors: [{ table: 'contract', id: slot.contract.id, requestBinding: 'path:id' }] }); ctx.persist();
    }
    slot.contract = await call('ContractController_getById', { id: slot.contract.id }); assert.equal(slot.contract.status, 'active');
    slot.effective = await call('ContractTermSnapshotController_getById', { id: uuid(slot.activated.snapshotId) });
    assert.equal(slot.effective.snapshotStatus, 'active'); assert.equal(slot.effective.sourcePreparationId, slot.preparation.preparationId); ctx.persist();
    slot.readiness = await call('ContractReadinessController_getContractReadinessPackage', { id: slot.readiness.id }); ctx.persist();
    slot.plan = await call('ContractReadinessController_initializeReceivablePlan', { id: slot.readiness.id }, payload.plan(context(ctx, slot)).body,
      { responseBirths: births('receivable_plan_version', '/planVersionId'), mutableTables: ['contract_readiness_package'],
        updatedAnchors: [{ table: 'contract_readiness_package', id: slot.readiness.id, requestBinding: 'path:id' }] });
    uuid(slot.plan.planVersionId); uuid(slot.plan.initRecordId); assert.equal(slot.plan.snapshotId, slot.activated.snapshotId); ctx.persist();
  }
  f.project = await call('ProjectController_getById', { id: f.project.id });
  f.contractFinishComplete = true; ctx.persist();
  return { kind: 'actual-two-contract-approval-activation-formal-plan', completed: true, contracts: f.contractRuns.length,
    actualDesignatedActorsUsed: true, seedPasswordsRolesAndMembershipsChanged: false, receiptAndHandover: 'not-run', G3Certified: false, G4Certified: false };
}
