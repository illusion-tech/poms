import fs from 'node:fs';
import assert from 'node:assert/strict';
import { data, sha, uuid, keyOf } from './pure.mjs';
import { loadSnapshot, readRows } from './snapshot.mjs';
import { assertCreatorAnchor, assertCreationRows, assertConsumedOnce, assertOwnershipRowsIsolated } from './creator-proofs.mjs';

export function ownershipProtocol(ctx, api) {
  assert.equal(ctx.migrations, 97); assert.equal(ctx.tables, 139);
  const property = api.spec.components.schemas.CreateProjectRequest.properties.initialOwnership; assert(property && property.nullable !== true);
  assert(!api.spec.components.schemas.CreateProjectRequest.required.includes('initialOwnership'));
  const schema = property.$ref ? api.spec.components.schemas[property.$ref.split('/').at(-1)] : property;
  assert.deepEqual(schema.enum, ['creator', 'organization']);
  const pins = JSON.parse(fs.readFileSync(new URL('./ownership-sources23.json', import.meta.url)));
  for (const pin of pins) assert.equal(sha(fs.readFileSync(`${ctx.win}/${pin.file}`)), pin.sha256, 'Root must refreeze the reviewed22/Shared131/M97 input; do not bind old08 source/state');
  // Check every fixed new-helper operation before its first HTTP, including
  // negative paths that would otherwise fail only after committed producers.
  assert(api.operations.has('CustomerController_create'));
  for (const file of ['creator-ownership.mjs', 'legacy-compatibility.mjs', 'ownership-race.mjs', 'pause-boundary23.mjs']) {
    const text = fs.readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
    for (const match of text.matchAll(/['"]([A-Za-z]+Controller_[A-Za-z0-9]+)['"]/g)) assert(api.operations.has(match[1]), `Noncanonical ownership operationId: ${match[1]}`);
  }
  return pins;
}
const rows = (ctx, snapshot, table) => readRows(snapshot.databases[ctx.database].tables[table]);
const value = row => JSON.parse(row.raw);
const ownershipRows = (ctx, snapshot) => Object.fromEntries(['project', 'project_ownership_origin', 'project_owner_reassignment_record'].map(table => [table, rows(ctx, snapshot, table)]));
export function projectFacts(ctx, snapshot, projectId) {
  const project = rows(ctx, snapshot, 'project').find(row => row.key[0] === projectId); assert(project);
  const origin = rows(ctx, snapshot, 'project_ownership_origin').find(row => row.key[0] === projectId); assert(origin);
  return { project, origin, history: rows(ctx, snapshot, 'project_owner_reassignment_record').filter(row => value(row).project_id === projectId) };
}
export async function ensureOwnershipCustomer(ctx, api) {
  const f = ctx.state.fixtures; assert(f.platformComplete && f.org?.id);
  if (!f.customer) {
    assert(!f.ownershipCustomerAttempt23, 'An earlier customer request needs exact Root reconciliation before any replay');
    const { customer } = await import('../../rust-r4abc/upstream-payloads01.mjs');
    const input = customer({ tag: ctx.state.prefix, actorId: ctx.state.actors.manager.id, ownerOrgId: f.org.id });
    f.ownershipCustomerAttempt23 = { phase: 'HTTP-starting', operationId: input.operationId, bodySHA256: sha(JSON.stringify(input.body)) }; ctx.persist();
    const response = await api.request(input.operationId, {}, input.body, 'manager', { responseBirths: [{ table: 'customer', pointer: '/id' }], number: { scope: 'customer', pointer: '/customerNo' } });
    f.customer = data(response); f.ownershipCustomerAttempt23 = { ...f.ownershipCustomerAttempt23, phase: 'actual-success-owned', receipt: response.receiptId, after: response.after }; ctx.persist();
  }
  uuid(f.customer.id); assert(ctx.state.owned[keyOf(ctx.database, 'customer', [f.customer.id])]);
  assert.equal(f.customer.ownerUserId, ctx.state.actors.manager.id); assert.equal(f.customer.ownerOrgId, f.org.id);
  return f.customer;
}
export function creationProof(ctx, response, organization, requireAuth) {
  const before = loadSnapshot(ctx, response.before), after = loadSnapshot(ctx, response.after), body = data(response), id = uuid(body.id);
  assertOwnershipRowsIsolated(ownershipRows(ctx, before), ownershipRows(ctx, after), id);
  assert(!rows(ctx, before, 'project').some(row => row.key[0] === id)); assert(!rows(ctx, before, 'project_ownership_origin').some(row => row.key[0] === id));
  const facts = projectFacts(ctx, after, id), project = value(facts.project), origin = value(facts.origin);
  const originalAuditIds = new Set(rows(ctx, before, 'audit_log').map(row => row.key[0]));
  const audits = rows(ctx, after, 'audit_log').filter(row => !originalAuditIds.has(row.key[0]) && value(row).event_type === 'project.ownership-origin-created' && value(row).target_id === id);
  assertCreationRows(project, origin, audits.map(value), { actorId: ctx.state.actors.manager.id, orgId: ctx.state.fixtures.org.id, organization });
  assert.equal(facts.history.length, 0); assert.equal(body.ownerUserId, project.owner_user_id); assert.equal(body.ownerOrgId, project.owner_org_id);
  for (const row of [facts.origin, ...audits]) assert.equal(row.xmin, facts.project.xmin, 'Project/origin/necessary creation audit escaped one actual outerTX');
  const auth = rows(ctx, after, 'auth_session').filter(row => {
    const old = rows(ctx, before, 'auth_session').find(b => JSON.stringify(b.key) === JSON.stringify(row.key));
    return old && old.sha256 !== row.sha256 && value(row).user_id === ctx.state.actors.manager.id && row.xmin === facts.project.xmin;
  });
  if (requireAuth) assert.equal(auth.length, 1, 'Due real pending-auth must coflush in the actual creation outerTX');
  return { projectId: id, organization, actualCommonXmin: facts.project.xmin,
    project: { key: facts.project.key, sha256: facts.project.sha256, xmin: facts.project.xmin }, origin: { key: facts.origin.key, sha256: facts.origin.sha256, xmin: facts.origin.xmin },
    creationAudit: audits.map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin })), authCoflush: auth.map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin })),
    trueCreatorBoundIndependentlyFromNullableOwner: true, counterUsesExistingIndependentNumberContract: true, businessFactsThroughHTTP: true };
}
async function createSlot(ctx, api, name, mode, requireAuth = false) {
  const f = ctx.state.fixtures, state = f.creatorOwnership23; state.projects ??= {};
  if (state.projects[name]) { assert(state.projects[name].proof && state.projects[name].proofPending === false, 'A successful creation needs original proof reconciliation; never replay it'); return state.projects[name]; }
  if (requireAuth) { const { waitForActualPendingAuth } = await import('./fault-sweep.mjs'); await waitForActualPendingAuth(ctx, 'manager'); }
  const response = await api.request('ProjectController_create', {}, { projectName: `${ctx.state.prefix} ownership ${name}`, customerId: f.customer.id, currentStage: 'assessment',
    ...(mode === undefined ? {} : { initialOwnership: mode }) }, 'manager', { responseBirths: [{ table: 'project', pointer: '/id' }], number: { scope: 'project', pointer: '/projectNo' } });
  const project = data(response); state.projects[name] = { project, createReceipt: response.receiptId, proofPending: true }; ctx.persist();
  const proof = creationProof(ctx, response, mode === 'organization', requireAuth);
  const pin = ctx.artifact(`${ctx.next('real-project-ownership-create')}.json`, proof, { kind: 'actual-HTTP-decision8-project-and-v1-origin', mode: mode ?? 'omitted-creator', actualCommonTransaction: true, businessFixtureSQL: false });
  state.projects[name].proof = pin; state.projects[name].proofPending = false; ctx.persist(); return state.projects[name];
}
async function anchor(ctx, api, projectId) {
  const response = await api.request('ProjectController_getById', { id: projectId }, null, 'manager'), view = data(response);
  assertCreatorAnchor(view, { projectId, actorId: ctx.state.actors.manager.id, orgId: ctx.state.fixtures.org.id }, api.spec.components.schemas.CreatorFirstAssignmentAnchorView);
  return { view, receipt: response.receiptId };
}
async function creatorDenied(ctx, api, projectId, currentVersion, label) {
  const f = ctx.state.fixtures, receipts = [];
  receipts.push((await api.request('ProjectController_getById', { id: projectId }, null, 'manager', { expectedStatus: 404 })).receiptId);
  for (const operationId of ['ProjectCostController_getProjectUnifiedAccounting', 'CommissionController_getCurrentRoleAssignment', 'ProjectController_listAcceptanceRecords', 'ProjectController_listProjectCompletionRecords', 'ProjectController_listProjectArchiveRecords']) {
    receipts.push((await api.request(operationId, { projectId }, null, 'manager', { expectedStatus: 404 })).receiptId);
  }
  receipts.push((await api.request('ProjectController_reassignOwner', { id: projectId }, { ownerUserId: ctx.state.actors.execution.id,
    ownerOrgId: f.org.id, expectedVersion: currentVersion, reason: '原creator全权限也不能复活已耗尽的首派权。' }, 'manager', { expectedStatus: 404 })).receiptId);
  receipts.push((await api.request('ProjectController_updateBasicInfo', { id: projectId }, { projectName: '原creator不得靠全RBAC越过已耗尽责任链。' }, 'manager', { expectedStatus: 404 })).receiptId);
  return ctx.artifact(`${ctx.next(label)}.json`, { projectId, realManagerPermissions: ctx.state.actors.manager.permissions, currentVersion, receipts, creatorScopeConsumed: true,
    platformAllPermissionsDoNotRetainProjectAuthority: true }, { kind: 'actual-no-retained-creator-read-or-write-after-consume', allPermissionActor: true });
}
function assignmentProof(ctx, response, projectId, targetOwner) {
  const after = loadSnapshot(ctx, response.after), facts = projectFacts(ctx, after, projectId), result = data(response);
  assert.equal(result.projectOwnerReassignmentRecordId, facts.history[0]?.key[0]);
  assertConsumedOnce(value(facts.origin), facts.history.map(value), targetOwner, ctx.state.actors.manager.id, ctx.state.fixtures.org.id);
  assert.equal(value(facts.project).owner_user_id, targetOwner); assert.equal(value(facts.project).row_version, 2);
  const audits = rows(ctx, after, 'audit_log').filter(row => value(row).request_id === response.requestId && value(row).event_type === 'ProjectController_reassignOwner'); assert.equal(audits.length, 1);
  for (const row of [facts.origin, ...facts.history, ...audits]) assert.equal(row.xmin, facts.project.xmin);
  const before = loadSnapshot(ctx, response.before);
  assertOwnershipRowsIsolated(ownershipRows(ctx, before), ownershipRows(ctx, after), projectId);
  const auth = rows(ctx, after, 'auth_session').filter(row => {
    const old = rows(ctx, before, 'auth_session').find(item => JSON.stringify(item.key) === JSON.stringify(row.key));
    return old && old.sha256 !== row.sha256 && value(row).user_id === ctx.state.actors.manager.id && row.xmin === facts.project.xmin;
  });
  assert.equal(auth.length, 1, 'Due pending-auth must share the actual first-assignment TX');

  return { actualCommonXmin: facts.project.xmin, facts: [facts.project, facts.origin, ...facts.history, ...audits].map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin })), permanentFirstOwnerId: targetOwner };
}
export async function creatorOwnership(ctx, api) {
  const sourcePins = ownershipProtocol(ctx, api), f = ctx.state.fixtures; assert(f.platformComplete);
  await api.login('manager'); const all = api.spec.components.schemas.AssignRolePermissionsRequest.properties.permissionKeys.items.enum;
  assert.deepEqual(new Set(ctx.state.actors.manager.permissions), new Set(all));
  await ensureOwnershipCustomer(ctx, api);
  f.creatorOwnership23 ??= { projects: {}, noProducerSQL: true }; const state = f.creatorOwnership23;
  if (!state.invalidModesRejected) {
    const receipts = [];
    for (const mode of [null, 'org-owned', 'Organization', 0]) receipts.push((await api.request('ProjectController_create', {}, { projectName: `${ctx.state.prefix} invalid initial mode`, customerId: f.customer.id, initialOwnership: mode }, 'manager', { expectedStatus: 400 })).receiptId);
    state.invalidModesRejected = receipts; ctx.persist();
  }
  await createSlot(ctx, api, 'default', undefined); await createSlot(ctx, api, 'explicit-creator', 'creator');
  const spare = await createSlot(ctx, api, 'ui-spare', 'organization', true);
  state.uiSpareAnchor = await anchor(ctx, api, spare.project.id); state.uiSpareProjectId = spare.project.id; state.keepUISpareUnassigned = true; ctx.persist();
  const sequential = await createSlot(ctx, api, 'sequential', 'organization');
  if (!state.firstAssignment) {
    const current = await anchor(ctx, api, sequential.project.id);
    const { waitForActualPendingAuth } = await import('./fault-sweep.mjs'); await waitForActualPendingAuth(ctx, 'manager');
    const response = await api.request('ProjectController_reassignOwner', { id: sequential.project.id }, { ownerUserId: ctx.state.actors.execution.id, ownerOrgId: f.org.id,
      expectedVersion: current.view.projectRowVersion, reason: '真实creator按组织承接来源只执行一次首次个人指派。' }, 'manager', { responseBirths: [{ table: 'project_owner_reassignment_record', pointer: '/projectOwnerReassignmentRecordId' }],
      mutableTables: ['project', 'project_ownership_origin'], updatedAnchors: [{ table: 'project', id: sequential.project.id, requestBinding: 'path:id' }] });
    state.firstAssignment = { command: data(response), receipt: response.receiptId, proofPending: true, after: response.after }; ctx.persist();
    state.firstAssignment.proof = ctx.artifact(`${ctx.next('first-assignment-proof')}.json`, assignmentProof(ctx, response, sequential.project.id, ctx.state.actors.execution.id)); state.firstAssignment.proofPending = false; ctx.persist();
  }
  assert(state.firstAssignment.proof && state.firstAssignment.proofPending === false, 'First assignment already committed: reconcile proof without reexecuting');
  await api.login('execution'); let detail = data(await api.request('ProjectController_getById', { id: sequential.project.id }, null, 'execution')); assert.equal(detail.scopeKind, 'full-project');
  if (!state.creatorLostAfterFirst) { state.creatorLostAfterFirst = await creatorDenied(ctx, api, sequential.project.id, detail.projectRowVersion, 'creator-lost-after-first'); ctx.persist(); }
  if (!state.ownerReassigned) {
    const response = await api.request('ProjectController_reassignOwner', { id: sequential.project.id }, { ownerUserId: ctx.state.actors.finance.id, ownerOrgId: f.org.id,
      expectedVersion: detail.projectRowVersion, reason: '真实当前个人owner受控改派，原creator首派来源永久保持耗尽。' }, 'execution', { responseBirths: [{ table: 'project_owner_reassignment_record', pointer: '/projectOwnerReassignmentRecordId' }],
      mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: sequential.project.id, requestBinding: 'path:id' }] });
    state.ownerReassigned = { response: data(response), receipt: response.receiptId, after: response.after }; ctx.persist();
  }
  const facts = projectFacts(ctx, loadSnapshot(ctx, state.ownerReassigned.after), sequential.project.id); assert.equal(facts.history.length, 2);
  const first = projectFacts(ctx, loadSnapshot(ctx, state.firstAssignment.after), sequential.project.id);
  assert.equal(facts.origin.sha256, first.origin.sha256); assert.equal(facts.origin.xmin, first.origin.xmin, 'An ordinary reassign may never rewrite/renew the consumed origin');
  assertOwnershipRowsIsolated(ownershipRows(ctx, loadSnapshot(ctx, state.firstAssignment.after)), ownershipRows(ctx, loadSnapshot(ctx, state.ownerReassigned.after)), sequential.project.id);
  const secondRecord = facts.history.map(value).find(record => record.id === state.ownerReassigned.response.projectOwnerReassignmentRecordId); assert(secondRecord);
  assert.equal(secondRecord.previous_owner_user_id, ctx.state.actors.execution.id); assert.equal(secondRecord.new_owner_user_id, ctx.state.actors.finance.id);
  assert.equal(secondRecord.reassigned_by, ctx.state.actors.execution.id); assert.equal(value(facts.project).row_version, 3); assert.equal(value(facts.project).owner_user_id, ctx.state.actors.finance.id);
  assert.equal(value(facts.origin).row_version, 2); assert.equal(value(facts.origin).first_personal_owner_user_id, ctx.state.actors.execution.id);
  await api.login('finance'); detail = data(await api.request('ProjectController_getById', { id: sequential.project.id }, null, 'finance'));
  if (!state.creatorLostAfterReassign) { state.creatorLostAfterReassign = await creatorDenied(ctx, api, sequential.project.id, detail.projectRowVersion, 'creator-lost-after-reassign'); ctx.persist(); }
  const race = await createSlot(ctx, api, 'first-assignment-race', 'organization');
  if (!state.firstAssignmentRace) {
    assert(!state.raceAttempt, 'A prior race started: reconcile its actual observations without replaying committed commands');
    const { raceFirstAssignment } = await import('./ownership-race.mjs');
    state.firstAssignmentRace = await raceFirstAssignment(ctx, api, race.project.id, (await anchor(ctx, api, race.project.id)).view); ctx.persist();
  }
  state.uiSpareAnchor = await anchor(ctx, api, spare.project.id); // Still actual available; never consume the DOM spare.
  state.completed = true; ctx.persist();
  return { kind: 'actual-decision8-creator-production-and-consume-CAS', completed: true, sourcePins, realHTTPDefaultCreatorProjects: 2, realHTTPOrganizationProjects: 3,
    retainedUnassignedUISpareProjectId: spare.project.id, firstAssignmentExactlyOnce: true, creatorAllPermissionsLostReadAndWrite: true, actualConcurrentFirstAssignment: true,
    projectOriginBusinessSQLFixtures: false, LegacyHistoricalProductionClaimed: false, G3Certified: false, G4Certified: false };
}
