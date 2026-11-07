// All new business facts use current public HTTP. These old payload builders
// are pure factories, and their old advanced-project shortcut is never used.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as payload from '../../rust-r4abc/upstream-payloads01.mjs';
import { data, uuid, sha } from './pure.mjs';

const responseId = table => [{ table, pointer: '/id' }];
function inputs(ctx) {
  assert(ctx.state.fixtures.platformComplete, 'Fresh org/M platform stage required');
  const actor = ctx.state.actors.manager; assert(actor?.id && actor.orgId === ctx.state.fixtures.org.id);
  const plannedDate = ctx.options['planned-date'] ?? ctx.state.fixtures.plannedDate;
  assert(typeof plannedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(plannedDate), 'Root must explicitly supply the planned business date');
  if (ctx.state.fixtures.plannedDate) assert.equal(ctx.state.fixtures.plannedDate, plannedDate); else ctx.state.fixtures.plannedDate = plannedDate;
  ctx.state.fixtures.runId ??= randomUUID(); ctx.persist();
  return { ...ctx.state.fixtures, actorId: actor.id, ownerOrgId: actor.orgId, tag: ctx.state.prefix, caseId: ctx.state.prefix, runId: ctx.state.fixtures.runId,
    expectedInstanceId: ctx.identity.marker, plannedDate, contractInclusive: '56500.00', contractExclusive: '50000.00' };
}
export async function projectSources(ctx, api) {
  const c = inputs(ctx), f = ctx.state.fixtures;
  assert(!f.projectSourcesComplete, 'Already complete; next step requires actual trusted summary');
  const call = async (op, params, body, binding) => data(await api.request(op, params, body, 'manager', binding));
  if (!f.customer) {
    f.customer = await call('CustomerController_create', {}, payload.customer(c).body, { responseBirths: responseId('customer'), number: { scope: 'customer', pointer: '/customerNo' } }); ctx.persist();
  }
  c.customer = f.customer;
  if (!f.project) {
    f.project = await call('ProjectController_create', {}, { projectName: `R4GHI-${c.tag}-assessment`, customerId: uuid(f.customer.id), customerProjectNo: `R4GHI-${c.tag}`, currentStage: 'assessment' },
      { responseBirths: responseId('project'), number: { scope: 'project', pointer: '/projectNo' } }); ctx.persist();
  }
  assert.equal(f.project.currentStage, 'assessment'); assert.equal(f.project.ownerOrgId, c.ownerOrgId); assert.equal(f.project.ownerUserId, c.actorId);
  if (!f.bareWriterProjectReadDenied) {
    await api.request('ProjectController_getById', { id: f.project.id }, null, 'unrelated', { expectedStatus: 404 });
    f.bareWriterProjectReadDenied = true; ctx.persist();
  }
  c.project = f.project;
  if (!f.cost) { f.cost = await call('ProjectController_createProjectTechnicalCostPackage', { projectId: f.project.id }, payload.cost(c).body, { responseBirths: responseId('project_technical_cost_package'), mutableTables: ['project'] }); ctx.persist(); }
  c.cost = f.cost;
  if (!f.bid) { f.bid = await call('ProjectController_createProjectBidCommercialProcess', { projectId: f.project.id }, payload.bid(c, 'direct').body, { responseBirths: responseId('project_bid_commercial_process'), mutableTables: ['project'] }); ctx.persist(); }
  c.bid = f.bid;
  if (!f.contract) { f.contract = await call('ContractController_create', {}, payload.draftContract(c).body, { responseBirths: responseId('contract'), number: { scope: 'contract', pointer: '/contractNo' }, mutableTables: ['project'] }); ctx.persist(); }
  c.contract = f.contract;
  if (!f.secondContract) {
    const body = payload.draftContract({ ...c, tag: `${c.tag}b` }).body;
    f.secondContract = await call('ContractController_create', {}, body, { responseBirths: responseId('contract'), number: { scope: 'contract', pointer: '/contractNo' }, mutableTables: ['project'] }); ctx.persist();
  }
  assert.notEqual(f.contract.id, f.secondContract.id);
  if (!f.baseline) {
    const body = payload.baseline(c).body;
    body.contractTerms = [payload.contractTerms(c), payload.contractTerms({ ...c, contract: f.secondContract })];
    f.baseline = await call('ContractReadinessController_createCommercialReleaseBaseline', {}, body, { responseBirths: responseId('commercial_release_baseline'), mutableTables: ['project'] }); ctx.persist();
  }
  c.baseline = f.baseline;
  assert.equal(f.baseline.baselineStatus, 'draft');
  const description = payload.summaryRequest(c);
  const pin = ctx.artifact(`${ctx.next('summary-input')}.json`, description, { kind: 'prepared-real-CommonService-summary-input', executed: false,
    nextStep: 'Root must invoke an actual poms-r4ghi trusted R3 CommonService producer; old hardcoded R4DEF example is inapplicable', createsApproval: false });
  f.summaryInput = pin; f.projectSourcesComplete = true; ctx.persist();
  return { kind: 'actual-HTTP-assessment-and-presigning-sources', completed: true, contracts: 2, explicitFixtureCurrency: 'CNY', projectStageAtCreation: 'assessment',
    freshActiveOwnerOrgAndM: true, allBusinessRowsThroughHTTP: true, summaryInput: pin, nextBoundary: 'awaiting-actual-trusted-summary-producer',
    pricingApproval: 'not-run', G3Certified: false, G4Certified: false };
}

// Root may attach only an actual newly-produced private summary receipt. This
// function validates exact material identities and actual owned stored rows;
// it never accepts an arbitrary "outerCommitAcknowledged" JSON as authority.
export function requireSummary(ctx) {
  const f = ctx.state.fixtures; assert(f.projectSourcesComplete && f.summary?.receipt);
  const pin = f.summary.receipt, bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256);
  const observed = JSON.parse(bytes);
  assert(observed.outerCommitAcknowledged === true && observed.traceIncomplete === false && observed.createsApproval === false && observed.rawMaterialsStoredInSummary === false);
  assert.equal(observed.materialReferences?.projectId, f.project.id); assert.equal(observed.materialReferences?.costPackageId, f.cost.id); assert.equal(observed.materialReferences?.baselineId, f.baseline.id);
  assert(ctx.state.owned[JSON.stringify([ctx.database, 'approval_summary_snapshot', [uuid(observed.summarySnapshotId)]])], 'Actual summary INSERT must have an ownership ledger proof before use');
  return observed;
}

export async function runBusinessStage(ctx, api, stage) {
  if (stage === 'project-sources') return projectSources(ctx, api);
  if (stage === 'summary') { const { produceActualSummary } = await import('./trusted.mjs'); return produceActualSummary(ctx); }
  if (stage === 'contract-prepare') { const { contractPrepare } = await import('./contracts.mjs'); return contractPrepare(ctx, api); }
  if (stage === 'contract-finish') { const { contractFinish } = await import('./contracts.mjs'); return contractFinish(ctx, api); }
  if (stage === 'receipt') { const { receipts } = await import('./handover.mjs'); return receipts(ctx, api); }
  if (stage === 'handover') { const { handover } = await import('./handover.mjs'); return handover(ctx, api); }
  if (stage === 'roles-and-execution') { const { rolesAndExecution } = await import('./roles.mjs'); return rolesAndExecution(ctx, api); }
  if (stage === 'roles-and-execution-fi') { const { rolesAndExecution } = await import('./roles.mjs'); return rolesAndExecution(ctx, api, { auditFaults: true }); }
  if (stage === 'lifecycle') { const { lifecycleAcceptance } = await import('./lifecycle.mjs'); return lifecycleAcceptance(ctx, api); }
  if (stage === 'actual-costs') { const { actualExpenseAndStage } = await import('./costs.mjs'); return actualExpenseAndStage(ctx, api); }
  if (stage === 'operating') { const { operatingCaptureAndReview } = await import('./operating.mjs'); return operatingCaptureAndReview(ctx, api); }
  throw new Error('Requested business stage is not implemented yet; inspect README and retain not-run label');
}
