import assert from 'node:assert/strict';
import { sha, uuid } from './pure.mjs';

class StopBeforeRequest extends Error {
  constructor(boundary) { super('Reached the requested unexecuted HTTP boundary'); this.boundary = boundary; }
}
// The sentinel is internal. An unrelated exception or a normal return is never
// interpreted as a pause, and no fake HTTP success response is supplied.
export async function stopBeforeRequest(api, run, accepts) {
  let intercepted = null;
  const limited = { ...api, request: async (operationId, params = {}, body = null, actor = 'bootstrap', binding = {}) => {
    if (accepts({ operationId, params, body, actor, binding })) {
      assert.equal(intercepted, null);
      intercepted = { operationId, params: structuredClone(params), body: structuredClone(body), actor, binding: structuredClone(binding),
        bodySHA256: sha(JSON.stringify(body)), requestedHTTPNotSent: true };
      throw new StopBeforeRequest(intercepted);
    }
    return api.request(operationId, params, body, actor, binding);
  } };
  try { await run(limited); }
  catch (error) { if (error instanceof StopBeforeRequest && error.boundary === intercepted) return intercepted; throw error; }
  throw new Error('Producer returned before the requested boundary; no pause is certified');
}
export async function pauseBeforeExecution(ctx, api) {
  const f = ctx.state.fixtures; assert(!f.executionComplete && f.handoverComplete);
  const { rolesAndExecution } = await import('./roles.mjs');
  const boundary = await stopBeforeRequest(api, limited => rolesAndExecution(ctx, limited), request =>
    request.operationId === 'ProjectController_startExecution' && request.actor === 'execution' && request.params.id === f.project.id);
  assert(!ctx.state.activeFault && !f.executionComplete && !f.execution);
  assert(f.frozenRoleDetail?.freezeVersionSummary.status === 'frozen');
  assert(f.executionRoleGetDenied?.currentReceipt && f.executionRoleGetDenied?.detailReceipt);
  assert.equal(f.executionAdmissionFromEO.context.sourceHandoverId, boundary.body.sourceHandoverId);
  assert.deepEqual([...ctx.state.actors.execution.permissions].sort(), ['project:read', 'project:write']);
  uuid(boundary.params.id); return boundary;
}
export async function pauseBeforeOwnList(ctx, api) {
  const f = ctx.state.fixtures; assert(f.executionComplete && !f.lifecycleComplete);
  const { lifecycleAcceptance } = await import('./lifecycle.mjs');
  const boundary = await stopBeforeRequest(api, limited => lifecycleAcceptance(ctx, limited), request =>
    request.operationId === 'ProjectController_listProjectCompletionRecords' && request.actor === 'condition' && request.params.projectId === f.project.id);
  assert(!ctx.state.activeFault && !f.lifecycleComplete && f.pendingArchiveBlocked);
  assert.equal(f.completion.completionResult, 'conditional-completed'); assert.equal(f.completion.conditionStatus, 'pending');
  assert.equal(Object.values(f.conditionClosures ?? {}).filter(item => item.closed).length, 0);
  assert(!f.uploads?.['own-condition-1'], 'The first own-purpose upload must be a later real UI command');
  uuid(f.completion.id); return boundary;
}
