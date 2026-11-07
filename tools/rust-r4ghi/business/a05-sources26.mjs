import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { data } from './pure.mjs';
export function boundaryReferenceBody27(payload, context, scenario) {
  const body = payload.baseline(context).body; body.contractTerms[0].taxRate = scenario.taxRate; return body;
}

export async function oneContractSources26(ctx, api, scenario) {
  const f = ctx.state.fixtures; assert(f.platformComplete && f.customer && !f.projectSourcesComplete);
  f.plannedDate ??= ctx.options['planned-date']; assert(/^\d{4}-\d{2}-\d{2}$/.test(f.plannedDate ?? ''), 'Explicit Root planned business date required');
  f.runId ??= randomUUID(); ctx.persist();
  const payload = await import('../../rust-r4abc/upstream-payloads01.mjs');
  const call = async (op, params, body, binding) => data(await api.request(op, params, body, 'manager', binding));
  const context = () => ({ ...f, actorId: ctx.state.actors.manager.id, ownerOrgId: f.org.id, tag: ctx.state.prefix, caseId: ctx.state.prefix,
    expectedInstanceId: ctx.identity.marker, contractInclusive: scenario.contractGross, contractExclusive: scenario.contractNet });
  if (!f.project) { f.project = await call('ProjectController_create', {}, { projectName: `${ctx.state.prefix}-${ctx.fixtureViewKey}-one-contract`, customerId: f.customer.id, currentStage: 'assessment' },
    { responseBirths: [{ table: 'project', pointer: '/id' }], number: { scope: 'project', pointer: '/projectNo' } }); ctx.persist(); }
  if (!f.cost) { f.cost = await call('ProjectController_createProjectTechnicalCostPackage', { projectId: f.project.id }, payload.cost(context()).body,
    { responseBirths: [{ table: 'project_technical_cost_package', pointer: '/id' }], mutableTables: ['project'] }); ctx.persist(); }
  if (!f.bid) { f.bid = await call('ProjectController_createProjectBidCommercialProcess', { projectId: f.project.id }, payload.bid(context(), 'direct').body,
    { responseBirths: [{ table: 'project_bid_commercial_process', pointer: '/id' }], mutableTables: ['project'] }); ctx.persist(); }
  if (!f.contract) { f.contract = await call('ContractController_create', {}, payload.draftContract(context()).body,
    { responseBirths: [{ table: 'contract', pointer: '/id' }], number: { scope: 'contract', pointer: '/contractNo' }, mutableTables: ['project'] }); ctx.persist(); }
  // Project quote/estimate remain independent. The real contract-specific
  // reference must already contain its approved amount/tax terms; changing
  // monetary reference fields requires a NEW baseline, not ordinary diff review.
  if (!f.baseline) { const body = boundaryReferenceBody27(payload, context(), scenario);
    f.baseline = await call('ContractReadinessController_createCommercialReleaseBaseline', {}, body,
      { responseBirths: [{ table: 'commercial_release_baseline', pointer: '/id' }], mutableTables: ['project'] }); ctx.persist(); }
  f.contractRuns ??= [{ contract: f.contract }]; assert.equal(f.contractRuns.length, 1); assert(!f.secondContract);
  f.summaryInput = ctx.artifact(`${ctx.next('a05-real-summary-input')}.json`, payload.summaryRequest(context()), { kind: 'A05-real-source-CommonService-input', createsApproval: false });
  f.projectSourcesComplete = true; ctx.persist();
  return { kind: 'actual-one-contract-assessment-R3-source-production', contractCount: 1, projectQuoteGross: '113000.00', projectQuoteNet: '100000.00',
    candidateContractGross: scenario.contractGross, candidateContractNet: scenario.contractNet, projectEstimateNet: '50000.00', realDiffReviewStillRequired: true, SQLBusinessFixture: false };
}
export function boundaryRequestAPI26(api, scenario) {
  return { ...api, request: async (operationId, params = {}, body = null, actor = 'bootstrap', binding = {}) => {
    let actualBody = body;
    if (operationId === 'ContractReadinessController_createContractReadinessPackage') {
      actualBody = structuredClone(body); const terms = actualBody.candidateTerms;
      terms.amountTaxInclusive = scenario.contractGross; terms.amountTaxExclusive = scenario.contractNet; terms.taxRate = scenario.taxRate;
      terms.receivablePlanSeeds = terms.receivablePlanSeeds.map(seed => ({ ...seed, plannedAmount: scenario.contractGross }));
    }
    if (body && typeof body.comment === 'string' && body.comment.includes('两份')) actualBody = { ...actualBody, comment: '本独立项目单份真实生效合同、实际已确认回款和正式计划；本人职责按真实固定材料确认。' };
    // Only the actual submitted request changes. Original helper responses,
    // expected refs, current approver, summaries and CAS stay server-produced.
    return api.request(operationId, params, actualBody, actor, binding);
  } };
}
