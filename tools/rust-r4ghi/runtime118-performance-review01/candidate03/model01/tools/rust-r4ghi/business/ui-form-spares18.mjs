import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createApi } from './http.mjs';
import { sha } from './pure.mjs';
import { openFormFixtureView18, otherFixturesSHA18 } from './fixture-view18.mjs';
import { stopBeforeRequest } from './pause-boundary23.mjs';

function artifactValue(pin) { const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); return JSON.parse(bytes); }
async function stage(ctx, record, name, completedField, producer) {
  const previous = record.stages[name];
  if (previous) { assert.equal(previous.phase, 'verified', 'Partial producer requires exact Root reconciliation, never automatic replay'); artifactValue(previous.result); if (completedField) assert(ctx.state.fixtures[completedField]); return; }
  if (completedField) assert(!ctx.state.fixtures[completedField]);
  record.stages[name] = { phase: 'running', startedAt: new Date().toISOString() }; ctx.persist();
  const result = await producer(); if (completedField) assert(ctx.state.fixtures[completedField]);
  record.stages[name] = { phase: 'verified', result: ctx.artifact(`${ctx.next(`ui18-${name}`)}.json`, result, { kind: 'actual-new-A08-form-prerequisite', formSpare: record.key, stage: name,
    normalProducersOnly: true, requiredWriteFIClaimed: false, formDOMStillRequired: true }) }; ctx.persist();
}
export async function prepareFormSpare18(rootCtx, key) {
  const before = otherFixturesSHA18(rootCtx), { ctx, record } = openFormFixtureView18(rootCtx, key), api = createApi(ctx), f = ctx.state.fixtures;
  assert(!record.partial, 'Preserve partial actual effects until exact Root reconciliation');
  if (record.pause) { artifactValue(record.pause.receipt); assert.equal(otherFixturesSHA18(rootCtx), before); return { ...record.pause.result, alreadyPreparedWithoutCommandReplay: true }; }
  try {
    const { projectSources } = await import('./upstream.mjs'), { produceActualSummary } = await import('./trusted.mjs'), { contractPrepare, contractFinish } = await import('./contracts.mjs');
    const { receipts, handover } = await import('./handover.mjs'), { rolesAndExecution } = await import('./roles.mjs');
    // projectSources intentionally exercises an unrelated actor's real404.
    // Refresh that actor even when a retained cookie exists;401 is not scope404.
    await api.login('unrelated');
    await api.login('manager');
    await stage(ctx, record, 'project-sources', 'projectSourcesComplete', () => projectSources(ctx, api));
    await stage(ctx, record, 'summary', 'summary', () => produceActualSummary(ctx));
    await api.login('manager');
    await stage(ctx, record, 'contract-prepare', 'contractPrepareComplete', () => contractPrepare(ctx, api));
    await stage(ctx, record, 'contract-finish', 'contractFinishComplete', () => contractFinish(ctx, api));
    await api.login('manager'); await stage(ctx, record, 'receipts', 'receiptsComplete', () => receipts(ctx, api));
    for (const actor of ['manager', 'execution', 'finance']) await api.login(actor);
    await stage(ctx, record, 'handover', 'handoverComplete', () => handover(ctx, api));
    let boundary;
    if (key === 'role-create') {
      await stage(ctx, record, 'before-first-role-create', null, async () => {
        boundary = await stopBeforeRequest(api, limited => rolesAndExecution(ctx, limited), request => request.operationId === 'CommissionController_createRoleAssignment' && request.actor === 'manager' && request.params.projectId === f.project.id);
        assert(!f.roleAssignment && !f.roleFreezeResult && !f.executionComplete && !f.execution);
        // Includes the existing producer's first precision-negative attempt:
        // no create request (valid or invalid) is sent and no fake result exists.
        return boundary;
      });
    } else {
      await stage(ctx, record, 'roles-execution-prerequisite', 'executionComplete', () => rolesAndExecution(ctx, api));
      const { actualExpenseAndStage } = await import('./costs.mjs'), { operatingCaptureAndReview } = await import('./operating.mjs');
      await api.login('manager'); await stage(ctx, record, 'actual-E-F-prerequisite', 'actualExpenseStageComplete', () => actualExpenseAndStage(ctx, api));
      await stage(ctx, record, 'before-first-G-baseline-activation', null, async () => {
        boundary = await stopBeforeRequest(api, limited => operatingCaptureAndReview(ctx, limited), request => request.operationId === 'ProjectCostController_activateOperatingBaselinePackage' && request.actor === 'manager' && request.body?.projectId === f.project.id);
        assert(!f.operatingBaselineCommand && !f.operatingSnapshotCommand && !f.signalReview && !f.gateReview && !f.operatingComplete);
        return boundary;
      });
    }
    const last = key === 'role-create' ? 'before-first-role-create' : 'before-first-G-baseline-activation'; boundary ??= artifactValue(record.stages[last].result);
    assert(!ctx.state.activeFault && boundary.requestedHTTPNotSent === true);
    const result = { kind: 'actual-new-A08-form-spare-stopped-before-command', formSpare: key, producerEpoch: ctx.epoch, producerRun: ctx.run,
      projectId: f.project.id, commandActor: 'manager', commandActorId: ctx.state.actors.manager.id, boundary,
      mainFIAnd23SpareFactsUnchanged: true, requiredWriteFIClaimed: false, realDOMStillRequired: true, G3Certified: false, G4Certified: false };
    assert.equal(otherFixturesSHA18(rootCtx), before);
    record.pause = { result, receipt: ctx.artifact(`${ctx.next(`ui18-${key}-paused`)}.json`, result, { kind: result.kind, formSpare: key, projectId: f.project.id, requestedCommandHTTPNotSent: true, realDOMStillRequired: true }) }; ctx.persist(); return result;
  } catch (error) {
    record.partial = ctx.artifact(`${ctx.next(`ui18-${key}-partial`)}.json`, { name: error.name, message: error.message }, { kind: 'actual-form-prerequisite-partial', noAutomaticReplay: true }); ctx.persist(); throw error;
  }
}
