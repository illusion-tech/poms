// Ordinary actual producer chains for two independent DOM spares. No FI claim.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha } from './pure.mjs';
import { createApi } from './http.mjs';
import { ownershipProtocol } from './creator-ownership.mjs';
import { mainFixtureSHA, openFixtureView } from './fixture-view23.mjs';
import { pauseBeforeExecution, pauseBeforeOwnList } from './pause-boundary23.mjs';

function verifiedArtifact(pin) {
  const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); return JSON.parse(bytes);
}
async function stage(ctx, record, name, completeField, run) {
  const previous = record.stages[name];
  if (previous) {
    assert.equal(previous.phase, 'verified', 'An interrupted producer step needs exact Root reconciliation; never replay an uncertain committed command');
    verifiedArtifact(previous.result); if (completeField) assert(ctx.state.fixtures[completeField]); return;
  }
  assert(!completeField || !ctx.state.fixtures[completeField]);
  record.stages[name] = { phase: 'running', startedAt: new Date().toISOString() }; ctx.persist();
  const result = await run();
  if (completeField) assert(ctx.state.fixtures[completeField]);
  record.stages[name] = { phase: 'verified', result: ctx.artifact(`${ctx.next(`ui-${record.key}-${name}`)}.json`, result,
    { kind: 'independent-actual-DOM-spare-producer-step', fixtureView: record.key, stage: name, normalCommands: true, requiredWriteFICoverageClaimed: false }) }; ctx.persist();
}
export async function prepareUISpare(rootCtx, key) {
  const mainBefore = mainFixtureSHA(rootCtx), { ctx, record } = openFixtureView(rootCtx, key), api = createApi(ctx);
  ownershipProtocol(ctx, api);
  assert(!record.UICommandObserved, 'The UI has already consumed this spare; never replay its preparation');
  if (record.pause) {
    verifiedArtifact(record.pause.receipt); assert.equal(mainFixtureSHA(rootCtx), mainBefore);
    return { ...record.pause.result, alreadyPreparedWithoutCommandReplay: true };
  }
  const f = ctx.state.fixtures;
  const { projectSources } = await import('./upstream.mjs');
  const { produceActualSummary } = await import('./trusted.mjs');
  const { contractPrepare, contractFinish } = await import('./contracts.mjs');
  const { receipts, handover } = await import('./handover.mjs');
  const { rolesAndExecution } = await import('./roles.mjs');
  await api.login('manager');
  await stage(ctx, record, 'project-sources', 'projectSourcesComplete', () => projectSources(ctx, api));
  await stage(ctx, record, 'summary', 'summary', () => produceActualSummary(ctx));
  await api.login('manager');
  await stage(ctx, record, 'contract-prepare', 'contractPrepareComplete', () => contractPrepare(ctx, api));
  await stage(ctx, record, 'contract-finish', 'contractFinishComplete', () => contractFinish(ctx, api));
  await api.login('manager');
  await stage(ctx, record, 'receipt', 'receiptsComplete', () => receipts(ctx, api));
  for (const actor of ['manager', 'execution', 'finance']) await api.login(actor);
  await stage(ctx, record, 'handover', 'handoverComplete', () => handover(ctx, api));
  let boundary;
  if (key === 'eo') {
    await stage(ctx, record, 'role-freeze-before-execution', null, async () => { boundary = await pauseBeforeExecution(ctx, api); return boundary; });
  } else {
    await stage(ctx, record, 'roles-and-execution', 'executionComplete', () => rolesAndExecution(ctx, api));
    for (const actor of ['execution', 'condition', 'unrelated']) await api.login(actor);
    await stage(ctx, record, 'conditional-completion-before-own-list', null, async () => { boundary = await pauseBeforeOwnList(ctx, api); return boundary; });
  }
  // A crash after the stage receipt but before pause materialization recovers
  // from that exact unexecuted boundary; it never reruns the producer chain.
  boundary ??= verifiedArtifact(record.stages[key === 'eo' ? 'role-freeze-before-execution' : 'conditional-completion-before-own-list'].result);
  const result = { kind: 'actual-independent-UI-spare-stopped-before-command', completed: true, fixtureView: key, projectId: f.project.id,
    parentCompletionRecordId: key === 'own' ? f.completion.id : null, commandActor: key === 'eo' ? 'execution' : 'condition',
    commandActorId: ctx.state.actors[key === 'eo' ? 'execution' : 'condition'].id, boundary, realProducersOnly: true,
    trustedSummaryTransport: 'existing-actual-CommonService-entry', businessFixtureSQL: false, sameRootRunAndOwnershipLedger: true,
    mainFIProjectUnchanged: true, requiredWriteFICoverageClaimed: false, DOMWriteStillRequired: true, G3Certified: false, G4Certified: false };
  assert.equal(mainFixtureSHA(rootCtx), mainBefore, 'Nested fixture preparation changed the main fixture facts');
  record.pause = { result, receipt: ctx.artifact(`${ctx.next(`ui-${key}-spare-paused`)}.json`, result,
    { kind: result.kind, fixtureView: key, projectId: f.project.id, actualCommandHTTPNotSent: true, DOMWriteStillRequired: true, businessFixtureSQL: false }) }; ctx.persist();
  return result;
}
