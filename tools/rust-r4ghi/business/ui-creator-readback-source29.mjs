// Source/provenance proof for a consumed Creator's read-only visible result.
import assert from 'node:assert/strict';
import { readPin54 } from './consumer-admission54.mjs';
import { resolveCases as regularCases, fixturePointer } from '../H/implementation/support-patches/ui-integration/append06/ui06.candidate08.mjs';
export const READBACK29 = 'creator-assigned-readback';
export function creatorReadbackProof29(state, scene) {
  assert.equal(scene.kind, READBACK29); assert.deepEqual(Object.keys(scene).sort(), ['actorKey', 'forbiddenTextPointers', 'kind', 'projectIdPointer']);
  const projectId = fixturePointer(state, scene.projectIdPointer); assert.equal(projectId, state.fixtures.creatorOwnership23?.uiSpareProjectId);
  const recovery = state.consumerChecks?.creatorAssignmentRecovery28?.[projectId]; assert(recovery?.committed && recovery.phase === 'verified' && recovery.receipt);
  const receipt = JSON.parse(readPin54(recovery.receipt)); assert.equal(receipt.kind, 'actual04-targeted-Origin-owned-metadata-reconciled'); assert.equal(receipt.projectId, projectId); assert.equal(receipt.original04Passed, false); assert.equal(receipt.oldCreatorSparePermanentlyConsumed, true); assert.equal(receipt.previousRecordedRowsReowned, 0); assert.equal(receipt.oldLedgerRewritten, false);
  assert.equal(receipt.actualResponse.rawBytesSha256, recovery.actualResponse.rawBytesSha256); assert.equal(receipt.originalFailedLedger.rawBytesSha256, '6474c401c5fd2f86c5646eca07fe95668d4051d4eda0a93c6572530e91d76b76');
  const response = JSON.parse(readPin54(recovery.actualResponse)); const attempt = response.attempt, body = attempt.body.data ?? attempt.body;
  assert.equal(attempt.operationId, 'ProjectController_reassignOwner'); assert.equal(attempt.status, 200); assert(attempt.responseComplete && !attempt.transportFailure); assert.equal(body.targetId, projectId);
  assert.equal(body.projectOwnerReassignmentRecordId, receipt.commit.reassignmentRecordId); assert.equal(receipt.commit.originProjectId, projectId);
  const actor = state.actors[scene.actorKey]; assert(actor && actor.id === body.newOwnerUserId); assert.equal(actor.orgId, body.newOwnerOrgId); assert.deepEqual(Object.keys(actor.cookies).sort(), ['poms_csrf', 'poms_session']);
  assert(Object.values(actor.cookies).every(value => typeof value === 'string' && value.length > 0)); assert(actor.permissions.includes('project:read'));
  const forbiddenTexts = scene.forbiddenTextPointers.map(pointer => { const value = fixturePointer(state, pointer); assert(typeof value === 'string' && value.trim().length >= 8); return value.trim(); });
  return { kind: READBACK29, actor, projectId, forbiddenTexts, expectedSourceRef: null, readback28: { recoveryReceipt: recovery.receipt, originalFailedLedger: recovery.originalFailedLedger,
    originalRequestId: attempt.requestId, expectedOwnerUserId: body.newOwnerUserId, expectedOwnerOrgId: body.newOwnerOrgId, expectedProjectRowVersion: attempt.requestValue.expectedVersion + 1, original04Passed: false } };
}
export function resolveReadbackCases29(state, bindings) {
  assert(Array.isArray(bindings) && bindings.length > 0 && bindings.length <= 7); assert.equal(new Set(bindings.map(scene => scene.kind)).size, bindings.length);
  assert(!(bindings.some(scene => scene.kind === READBACK29) && bindings.some(scene => scene.kind === 'creator')), 'Consumed Creator readback cannot share a fresh first-assignment case');
  const ordinary = bindings.filter(scene => scene.kind !== READBACK29), resolved = ordinary.length ? regularCases(state, ordinary) : [];
  return bindings.map(scene => scene.kind === READBACK29 ? creatorReadbackProof29(state, scene) : resolved.find(value => value.kind === scene.kind));
}
export function assertReadbackRequest29(scene, request, operation) {
  assert.equal(scene.kind, READBACK29); assert.equal(request.method, 'GET', 'Creator readback never sends a business/auth write');
  const url = new URL(request.path, 'http://127.0.0.1:44551');
  if (['/api/auth/session', '/api/auth/csrf-token', '/api/me/navigation', '/api/me/todos'].includes(url.pathname)) return;
  assert.equal(operation.operationId, 'ProjectController_getById'); assert.equal(operation.pathParams.id, scene.projectId); assert.equal(url.pathname, '/api/projects/' + scene.projectId); assert.equal(url.search, '');
}
