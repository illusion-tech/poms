// Root-only actual canonical metadata acceptance on a genuine run-owned project.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { data, uuid, sha } from './pure.mjs';
import { capture, loadSnapshot, readRows } from './snapshot.mjs';
import { assertRecorded, changedColumns } from './ledger.mjs';
import { faultSweepAndRetry } from './fault-sweep.mjs';
import { ownershipProtocol } from './creator-ownership.mjs';
import { metadataOperation } from './metadata-write-inventory25.mjs';

const rows = (ctx, snapshot, table) => readRows(snapshot.databases[ctx.database].tables[table]);
const facts = list => list.map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin }));
const projectRow = (ctx, snapshot, id) => { const found = rows(ctx, snapshot, 'project').filter(row => row.key[0] === id); assert.equal(found.length, 1); return found[0]; };
export function assertMetadataAudit25(audit, { projectId, actorId, oldName, newName, beforeVersion }) {
  assert.equal(audit.event_type, metadataOperation); assert.equal(audit.target_type, 'project'); assert.equal(audit.target_id, projectId);
  assert.equal(audit.operator_id, actorId); assert.equal(audit.result, 'success');
  assert.equal(audit.metadata.projectId, projectId); assert.equal(audit.metadata.scopeKind, 'full-project'); assert.equal(audit.metadata.ownerWrite, true);
  assert.equal(audit.before_snapshot.id, projectId); assert.equal(audit.after_snapshot.id, projectId);
  assert.equal(audit.before_snapshot.projectName, oldName); assert.equal(audit.after_snapshot.projectName, newName);
  assert.equal(audit.before_snapshot.rowVersion, beforeVersion); assert.equal(audit.after_snapshot.rowVersion, beforeVersion + 1);
}
function assertOwnershipFactsUnchanged(ctx, before, after, projectId) {
  for (const table of ['project_ownership_origin', 'project_owner_reassignment_record']) assert.deepEqual(facts(rows(ctx, before, table)), facts(rows(ctx, after, table)), 'Metadata PATCH changed an ownership fact');
  assert.deepEqual(facts(rows(ctx, before, 'project').filter(row => row.key[0] !== projectId)), facts(rows(ctx, after, 'project').filter(row => row.key[0] !== projectId)), 'Metadata PATCH changed another owned project');
}
function noBusinessChange(ctx, response, projectId) {
  const before = loadSnapshot(ctx, response.before), after = loadSnapshot(ctx, response.after);
  const old = projectRow(ctx, before, projectId), current = projectRow(ctx, after, projectId);
  assert.equal(current.sha256, old.sha256); assert.equal(current.xmin, old.xmin, 'No-op/denied/failed validation changed the project version or any bytes');
  assertOwnershipFactsUnchanged(ctx, before, after, projectId);
  assert.deepEqual(facts(rows(ctx, before, 'audit_log')), facts(rows(ctx, after, 'audit_log')), 'No-op/denied/failed validation added or changed business audit');
  return { projectId, rowVersion: JSON.parse(old.raw).row_version, rowSHA256: old.sha256, xmin: old.xmin, projectVersionTimeAndBytesUnchanged: true, businessAuditUnchanged: true, ordinaryAuthBehaviorStillLedgerBound: true };
}
async function positiveProof(ctx, response, body) {
  const before = loadSnapshot(ctx, response.before), after = loadSnapshot(ctx, response.after), id = uuid(response.pathParams.id);
  const old = projectRow(ctx, before, id), current = projectRow(ctx, after, id), a = JSON.parse(old.raw), b = JSON.parse(current.raw);
  assert.equal(a.owner_user_id, ctx.state.actors.manager.id); assert.equal(b.owner_user_id, a.owner_user_id); assert.equal(b.owner_org_id, a.owner_org_id);
  assert.equal(b.project_name, body.projectName); assert.equal(b.row_version, a.row_version + 1); assert.equal(b.updated_by, ctx.state.actors.manager.id);
  assert.equal(data(response).id, id); assert.equal(data(response).projectName, body.projectName); assert.equal(data(response).rowVersion, b.row_version);
  const columns = await changedColumns(ctx, old.raw, current.raw);
  assert(columns.includes('project_name') && columns.includes('row_version') && columns.includes('updated_at'));
  assert(columns.every(key => ['project_name', 'row_version', 'updated_at', 'updated_by'].includes(key)));
  assertOwnershipFactsUnchanged(ctx, before, after, id);
  const audits = rows(ctx, after, 'audit_log').filter(row => { const value = JSON.parse(row.raw); return value.request_id === response.requestId && value.event_type === metadataOperation; });
  assert.equal(audits.length, 1); assert.equal(audits[0].xmin, current.xmin);
  assertMetadataAudit25(JSON.parse(audits[0].raw), { projectId: id, actorId: ctx.state.actors.manager.id, oldName: a.project_name, newName: body.projectName, beforeVersion: a.row_version });
  return { projectId: id, beforeRowVersion: a.row_version, afterRowVersion: b.row_version, actualProjectAuditXmin: current.xmin,
    columns, project: { sha256: current.sha256, xmin: current.xmin }, audit: { key: audits[0].key, sha256: audits[0].sha256, xmin: audits[0].xmin },
    noPublicExpectedVersionInvented: true, ownershipFactsAndOtherProjectsUnchanged: true };
}
export async function metadataPatch25(ctx, api) {
  ownershipProtocol(ctx, api); const f = ctx.state.fixtures, creator = f.creatorOwnership23;
  const operation = api.operations.get(metadataOperation); assert.equal(operation.method, 'PATCH'); assert.equal(operation.template, '/api/projects/{id}');
  const requestSchema = operation.op.requestBody.content['application/json'].schema;
  const request = requestSchema.$ref ? api.spec.components.schemas[requestSchema.$ref.split('/').at(-1)] : requestSchema;
  assert(request.properties.projectName && request.properties.customerId && !request.properties.expectedVersion, 'Bind the actual public metadata request, without inventing client CAS');
  assert(creator?.completed && creator.projects.default.proof && creator.projects.default.proofPending === false, 'Actual real default-creator project and its original producer proof are required');
  assert(f.legacyCompatibilityFixture?.verified, 'The403 case uses the same-run actual controlled Legacy anchor, not a guessed inside-scope relationship');
  const id = uuid(creator.projects.default.project.id), state = f.metadataPatch25 ??= { projectId: id, negatives: {}, body: { projectName: `${ctx.state.prefix}-metadata-atomic25` } }; ctx.persist();
  assert.equal(state.projectId, id);
  if (state.completed) return { ...state.result, alreadyCompleteWithoutCommandReplay: true };
  assert(!state.positive?.proofPending, 'An already successful PATCH needs proof reconciliation, never another POST/PATCH');
  await api.login('manager'); assert(ctx.state.actors.manager.permissions.includes('project:write'));
  if (!state.negatives.outside404) {
    await api.login('unrelated'); assert(ctx.state.actors.unrelated.permissions.includes('project:write'));
    const response = await api.request(metadataOperation, { id }, { projectName: `${ctx.state.prefix}-forbidden25` }, 'unrelated', { expectedStatus: 404 });
    state.negatives.outside404 = ctx.artifact(`${ctx.next('metadata25-outside404')}.json`, { receipt: response.receiptId, proof: noBusinessChange(ctx, response, id), realProjectWritePresent: true }); ctx.persist();
  }
  if (!state.negatives.inside403) {
    const legacyId = uuid(f.legacyCompatibilityFixture.projectId);
    const response = await api.request(metadataOperation, { id: legacyId }, { projectName: `${ctx.state.prefix}-legacy-forbidden25` }, 'manager', { expectedStatus: 403 });
    state.negatives.inside403 = ctx.artifact(`${ctx.next('metadata25-inside403')}.json`, { receipt: response.receiptId, proof: noBusinessChange(ctx, response, legacyId), actualLegacyAnchorOnly: true, controlledCompatibilityFixture: true }); ctx.persist();
  }
  if (!state.negatives.missingCustomer404) {
    const observation = await capture(ctx, ctx.next('metadata25-missing-customer')); assertRecorded(ctx, observation);
    state.missingCustomerId ??= randomUUID(); assert(!rows(ctx, observation, 'customer').some(row => row.key[0] === state.missingCustomerId)); ctx.persist();
    const response = await api.request(metadataOperation, { id }, { projectName: `${ctx.state.prefix}-local-name-must-rollback25`, customerId: state.missingCustomerId }, 'manager', { expectedStatus: 404 });
    state.negatives.missingCustomer404 = ctx.artifact(`${ctx.next('metadata25-customer404')}.json`, { receipt: response.receiptId, proof: noBusinessChange(ctx, response, id), missingCustomerBefore: observation.manifest, localNameAssignmentDidNotPersist: true }); ctx.persist();
  }
  if (!state.positive) {
    const result = await faultSweepAndRetry(ctx, api, { operationId: metadataOperation, projectId: id, params: { id }, body: state.body, actor: 'manager',
      binding: { mutableTables: ['project'], updatedAnchors: [{ table: 'project', id, requestBinding: 'path:id' }] } });
    state.positive = { receipt: result.successful.receiptId, sweepReceipt: result.receipt, requestId: result.successful.requestId, before: result.successful.before, after: result.successful.after, proofPending: true }; ctx.persist();
    const proof = await positiveProof(ctx, result.successful, state.body);
    state.positive.proof = ctx.artifact(`${ctx.next('metadata25-positive')}.json`, { proof, sweepReceipt: result.receipt, sourceRequiredFamilies: 3, allThreeActuallyHitOnceThenOneSuccess: true });
    state.positive.proofPending = false; ctx.persist();
  }
  assert(state.positive.proof && state.positive.proofPending === false);
  if (!state.noop) {
    state.noop = { phase: 'request-starting', bodySHA256: sha(JSON.stringify(state.body)) }; ctx.persist();
    const response = await api.request(metadataOperation, { id }, state.body, 'manager');
    state.noop = { ...state.noop, phase: 'proof-pending', receipt: response.receiptId, before: response.before, after: response.after }; ctx.persist();
    const proof = noBusinessChange(ctx, response, id); assert.equal(data(response).projectName, state.body.projectName);
    assert.equal(data(response).rowVersion, proof.rowVersion);
    state.noop.proof = ctx.artifact(`${ctx.next('metadata25-noop')}.json`, { proof, receipt: response.receiptId, sameBodyAsSingleDirtySuccess: true }); state.noop.phase = 'verified'; ctx.persist();
  }
  assert.equal(state.noop.phase, 'verified', 'An interrupted noop must be reconciled from originals, not blindly repeated');
  state.result = { kind: 'actual-current-owner-metadata-PATCH-and-source-bound-three-write-sweep', completed: true, projectId: id, canonicalOperationId: metadataOperation,
    requiredWritePrimaryHitFailures: 3, finalDirtySuccesses: 1, sameBodyNoopObserved: true, outside404WithProjectWrite: true, actualInsideLegacy403: true,
    missingCustomerLocalAssignmentRollback: true, versionAtomicity: 'failed sweeps preserve exact bytes/xmin; one dirty success increments1; noop preserves exact bytes/xmin',
    publicClientCASInvented: false, source17and19Changed: false, mainFIProjectAndNestedUISparesReplaced: false, counted32NewProducer: false, G3Certified: false, G4Certified: false };
  state.completed = true; ctx.persist(); return state.result;
}
