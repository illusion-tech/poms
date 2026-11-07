// Decision7 remains pending. This stage has no period POST, opt-in flag or SQL write.
import assert from 'node:assert/strict';
import { data } from './pure.mjs';
import { expectedRef } from './handover.mjs';
import { expenseDecisions } from './operating.mjs';

export async function inspectPeriodPreparation(ctx, api) {
  const f = ctx.state.fixtures; assert(f.operatingComplete);
  const periodKey = ctx.options['period-key'];
  assert(typeof periodKey === 'string' && /^(?:\d{4}-(?:0[1-9]|1[0-2])|\d{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3]))$/.test(periodKey), 'Root supplies the exact completed business period; never substitute a fake earlier effective date');
  const response = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: f.project.id }, null, 'manager',
    { query: { view: 'preparation', intent: 'period-close', periodKey } });
  const view = data(response), p = view.preparation;
  assert.equal(view.officialCurrent, null); assert(p?.kind === 'preparation-only' && p.intent === 'period-close' && p.periodKey === periodKey);
  const actualCosts = [f.actualCost.id, f.liveRestatement?.cost?.id].filter(Boolean);
  const body = p.selectedBaselinePackageRef ? { inputVersion: 'server-derived-v1', projectId: f.project.id, expectedVersion: p.headVersion,
    expectedProjectVersion: p.projectVersion, expectedInputHash: p.expectedInputHash, assertions: null, baselinePackageRef: expectedRef(p.selectedBaselinePackageRef),
    periodKey, expectedPeriodSnapshotRef: null, costDecisions: expenseDecisions(p, actualCosts) } : null;
  const receipt = ctx.artifact(`${ctx.next('period-read-only-preparation')}.json`, { periodKey, actualPreparationReceipt: response.receiptId, preparation: p,
    proposedBodyFromActualServerRefsOnly: body, candidateExecutable: false, policyStatus: 'pending-business-decision7', normalPeriodWriteSent: false,
    pastPeriodSourceEligibilityFabricated: false }, { kind: 'actual-read-only-period-preparation-not-period-close-acceptance', realPeriodWrite: false,
    formalEligibility: p.formalEligibility.status, blockingReasonCodes: p.blockingReasonCodes, decision7PresumedApproved: false });
  f.periodReadOnlyPreparation ??= {}; f.periodReadOnlyPreparation[periodKey] = receipt; ctx.persist();
  return { kind: 'actual-period-preparation-only', completed: true, periodKey, realPublicPreparationGET: true, normalPeriodCreateAndReadOperations: 'NOT executed/not certified',
    currentSelectionPolicy: 'pending-user-decision7', preparedRequestExecutable: false, G3Certified: false, G4Certified: false };
}
