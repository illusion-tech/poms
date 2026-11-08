import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sha } from './pure.mjs';
import { createApi } from './http.mjs';
import { ownershipProtocol } from './creator-ownership.mjs';
import { boundaryMainSHA26, openA05View26, boundaryStep26 } from './a05-view26.mjs';
import { oneContractSources26, boundaryRequestAPI26 } from './a05-sources26.mjs';
import { actualReceipt26, actualCost26 } from './a05-finance26.mjs';
import { publishBoundary26, overflowBoundary26 } from './a05-capture26.mjs';

export async function runA05Boundary26(rootCtx, name, { overflow = false } = {}) {
  assert(!overflow || name === 'max-zero', 'Only the zero-tax MAX cash case has a lawful one-cent overflow continuation');
  const mainBefore = boundaryMainSHA26(rootCtx), { ctx, record } = openA05View26(rootCtx, name), plain = createApi(ctx), scenario = record.scenario;
  for (const pin of JSON.parse(fs.readFileSync(new URL('./a05-sources26.json', import.meta.url)))) assert.equal(ctx.pins.find(item => item.file === pin.file)?.sha256, pin.sha256, `Reviewed A05 source changed: ${pin.file}`);
  ownershipProtocol(ctx, plain); const api = boundaryRequestAPI26(plain, scenario), f = ctx.state.fixtures;
  const resolve = value => value.$ref ? plain.spec.components.schemas[value.$ref.split('/').at(-1)] : value;
  const request = resolve(plain.operations.get('ProjectCostController_createProjectOperatingSnapshot').op.requestBody.content['application/json'].schema);
  const decision = resolve(request.properties.costDecisions.items);
  assert(resolve(decision.properties.reasonCode).enum.includes('actual-expense')); assert(resolve(decision.properties.recognitionRole).enum.includes('direct-source'));
  const { produceActualSummary } = await import('./trusted.mjs');
  const { contractPrepare, contractFinish } = await import('./contracts.mjs');
  const { handover } = await import('./handover.mjs');
  const { rolesAndExecution } = await import('./roles.mjs');
  await api.login('manager');
  await boundaryStep26(ctx, record, 'sources', () => oneContractSources26(ctx, api, scenario));
  await boundaryStep26(ctx, record, 'summary', () => produceActualSummary(ctx));
  await api.login('manager');
  if (!record.stages['contract-prepare'] && f.contractRuns?.[0]?.readiness && !f.contractRuns[0].diffReview) {
    const { reapproveBoundary27 } = await import('./a05-reapproval27.mjs');
    await boundaryStep26(ctx, record, 'contract-prepare', () => reapproveBoundary27(ctx, api, scenario));
  }
  await boundaryStep26(ctx, record, 'contract-prepare', async () => {
    const result = await contractPrepare(ctx, api); assert.equal(f.contractRuns.length, 1);
    const slot = f.contractRuns[0]; assert(slot.diffReview, 'Actual amount differences must pass the existing real diff review command');
    assert(slot.diffHistory.diffItems.some(item => item.diffLevel === 'review-required'));
    return { ...result, kind: 'actual-one-contract-current-reference-light-difference-reviewed', originalHelperKind: result.kind };
  });
  // Reauthenticate real known designated approvers, never fabricate their session.
  for (const [key, actor] of Object.entries(ctx.state.actors)) if (actor.borrowedSeedUser) await api.login(key);
  await boundaryStep26(ctx, record, 'contract-finish', async () => {
    const result = f.a05Reapproval27 ? await (await import('./a05-reapproval27.mjs')).finishReapprovedBoundary27(ctx, api) : await contractFinish(ctx, api);
    assert.equal(result.contracts, 1); return { ...result, kind: 'actual-one-contract-approval-activation-plan', originalHelperKind: result.kind };
  });
  await api.login('manager');
  await boundaryStep26(ctx, record, 'receipt', async () => {
    f.boundaryReceipt26 ??= {}; ctx.persist(); const result = await actualReceipt26(ctx, api, f.boundaryReceipt26, scenario.cashGross, { net: scenario.cashNet, tax: scenario.cashTax, rate: scenario.taxRate });
    f.receiptsComplete = true; ctx.persist(); return result;
  });
  for (const actor of ['manager', 'execution', 'finance']) await api.login(actor);
  await boundaryStep26(ctx, record, 'handover', () => handover(ctx, api));
  await boundaryStep26(ctx, record, 'roles-execution', () => rolesAndExecution(ctx, api));
  await api.login('manager');
  await boundaryStep26(ctx, record, 'actual-cost-stage', () => actualCost26(ctx, api, scenario));
  const published = await boundaryStep26(ctx, record, 'published-G-H', () => publishBoundary26(ctx, api, scenario));
  let overflowResult = null;
  if (overflow) overflowResult = await boundaryStep26(ctx, record, 'aggregate-overflow', () => overflowBoundary26(ctx, api));
  assert.equal(boundaryMainSHA26(rootCtx), mainBefore, 'A05 boundary changed the main or EO/Own/Creator UI fixtures');
  const result = { kind: 'actual-A05-independent-one-contract-boundary', completed: true, case: name, projectId: f.project.id, published, overflow: overflowResult,
    layers: ['real-R3', 'actual-CommonService', 'real-approval-activation-plan', 'real-C-basis', 'real-D-R5-I-execution', 'real-expense-E-F', 'published-G-snapshot-H-four-bindings'],
    mainOrUISpareReplaced: false, businessFactsSQLFixture: false, historicalMoneyPrecisionCertified: false, G3Certified: false, G4Certified: false };
  record.result = result; ctx.persist(); return result;
}
