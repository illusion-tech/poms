import assert from 'node:assert/strict';
import { uuid, keyOf } from './pure.mjs';

export const metadataOperation = 'ProjectController_updateBasicInfo';
export const isMetadataWrite = operationId => operationId === metadataOperation;
export function deriveMetadataWriteFacts(ctx, snapshot, scope, readRows) {
  assert.equal(scope.params.id, uuid(scope.projectId)); uuid(scope.actorId);
  assert.deepEqual(Object.keys(scope.body), ['projectName']);
  assert(typeof scope.body.projectName === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(scope.body.projectName));
  const rows = readRows(snapshot.databases[ctx.database].tables.project).filter(row => row.key[0] === scope.projectId); assert.equal(rows.length, 1);
  const row = rows[0], value = JSON.parse(row.raw), owned = ctx.state.owned[keyOf(ctx.database, 'project', [scope.projectId])];
  assert(owned && !owned.deleted && owned.latestSha256 === row.sha256 && owned.latestXmin === row.xmin);
  assert.equal(value.owner_user_id, scope.actorId); assert(value.owner_org_id && value.status === 'active');
  assert(Number.isSafeInteger(value.row_version) && value.row_version > 0 && value.row_version < 2147483647);
  assert.notEqual(value.project_name, scope.body.projectName, 'A true no-op does not have the three dirty-path necessary writes');
  return { version: 1, projectId: scope.projectId, actorId: scope.actorId, beforeProjectSHA256: row.sha256, beforeProjectXmin: row.xmin,
    beforeRowVersion: value.row_version, oldProjectName: value.project_name, newProjectName: scope.body.projectName, currentOwnerOrgId: value.owner_org_id };
}
export function metadataWriteInventory(operationId, scope) {
  assert(isMetadataWrite(operationId)); const { projectId, actorId, params, body, metadataFacts: facts } = scope;
  uuid(projectId); uuid(actorId); assert.equal(params.id, projectId); assert.equal(facts?.version, 1); assert.equal(facts.projectId, projectId); assert.equal(facts.actorId, actorId);
  assert.deepEqual(Object.keys(body), ['projectName']); assert.equal(body.projectName, facts.newProjectName); assert.notEqual(body.projectName, facts.oldProjectName);
  const entry = (key, table, event, match, source, rationale) => ({ key, table, event, match, source, rationale });
  return [
    entry('metadata-project-cas', 'project', 'UPDATE', { kind: 'equals', values: { id: projectId, project_name: body.projectName, row_version: facts.beforeRowVersion + 1, updated_by: actorId } },
      'apps/poms-api-rust/src/projects/store.rs', 'Actual dirty store::update uses the locked current int4 version CAS; this public PATCH has no client expectedVersion field.'),
    entry('required-success-audit', 'audit_log', 'INSERT', { kind: 'audit', operationId, actorId, projectId },
      'apps/poms-api-rust/src/contract_support/mod.rs', 'Actual canonical metadata audit is mandatory only for the dirty path, inside the same borrowed CommonSession.'),
    entry('pending-auth-coflush', 'auth_session', 'UPDATE', { kind: 'auth-coflush', operationId, actorId, projectId },
      'apps/poms-api-rust/src/auth/store.rs', 'Real due managed-auth write after this exact canonical request audit; raw independent touch is not counted.'),
  ];
}
