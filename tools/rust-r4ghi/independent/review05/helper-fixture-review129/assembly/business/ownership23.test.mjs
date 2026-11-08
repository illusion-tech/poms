import test from 'node:test';
import assert from 'node:assert/strict';
import { sha, keyOf } from './pure.mjs';
import { assertCreatorAnchor, assertCreationRows, assertConsumedOnce, blockedByControl, assertOwnershipRowsIsolated } from './creator-proofs.mjs';
import { assertLegacyView, assertOneControlledLegacyBirth } from './ownership-assertions.mjs';
import { stopBeforeRequest } from './pause-boundary23.mjs';
import { mainFixtureSHA, openFixtureView } from './fixture-view23.mjs';

const p = '11111111-1111-4111-8111-111111111111', m = '22222222-2222-4222-8222-222222222222',
  org = '33333333-3333-4333-8333-333333333333', customer = '44444444-4444-4444-8444-444444444444',
  owner = '55555555-5555-4555-8555-555555555555', at = '2026-11-07T12:34:56.123456Z';
function creation(organization = true) {
  const project = { id: p, created_by: m, updated_by: m, owner_org_id: org, owner_user_id: organization ? null : m,
    current_stage: 'assessment', status: 'active', row_version: 1, source_lead_id: null, created_at: at };
  const payload = { schemaVersion: 1, creatorUserId: m, projectId: p, sourceRecordId: p, sourceType: 'direct-create',
    initialKind: organization ? 'org-owned' : 'personal', initialOwnerUserId: organization ? null : m, initialOwnerOrgId: org, createdAt: at };
  const origin = { project_id: p, producer_version: 1, creator_user_id: m, source_type: 'direct-create', source_record_id: p,
    initial_kind: payload.initialKind, initial_owner_user_id: payload.initialOwnerUserId, initial_owner_org_id: org,
    bootstrap_state: organization ? 'available' : 'consumed', row_version: 1, first_personal_owner_user_id: organization ? null : m,
    bootstrap_assignment_record_id: null, first_personal_assigned_at: organization ? null : at, bootstrap_consumed_at: organization ? null : at,
    source_payload_hash: 'a'.repeat(64), source_payload: payload };
  const audit = { event_type: 'project.ownership-origin-created', target_type: 'project', target_id: p, operator_id: m, result: 'success',
    after_snapshot: payload, metadata: { projectId: p, sourcePayloadHash: origin.source_payload_hash, sourceType: 'direct-create' }, occurred_at: at };
  return { project, origin, audits: [audit] };
}
const checkCreation = (facts, organization = true) => assertCreationRows(facts.project, facts.origin, facts.audits, { actorId: m, orgId: org, organization });
test('organization creation preserves true creator independently from null personal owner', () => { checkCreation(creation()); });
test('omitted/explicit creator semantics are already consumed personal origins', () => { checkCreation(creation(false), false); assert.throws(() => checkCreation(creation(false))); });
test('ordinary old project, forged creator and mismatched ownership source fail closed', () => {
  for (const mutate of [f => { f.project.row_version = 2; }, f => { f.project.created_by = owner; }, f => { f.origin.source_record_id = owner; },
    f => { f.origin.source_payload.initialOwnerOrgId = owner; }, f => { f.origin.first_personal_owner_user_id = m; }]) {
    const facts = creation(); mutate(facts); assert.throws(() => checkCreation(facts));
  }
});
test('exact original creation audit is necessary and cannot be substituted by another source tuple', () => {
  for (const mutate of [f => { f.audits = []; }, f => { f.audits.push(structuredClone(f.audits[0])); }, f => { f.audits[0].operator_id = owner; },
    f => { f.audits[0].metadata.sourcePayloadHash = 'b'.repeat(64); }, f => { f.audits[0].target_id = owner; }]) {
    const facts = creation(); mutate(facts); assert.throws(() => checkCreation(facts));
  }
});
test('source/audit timestamps preserve real database microseconds instead of millisecond rounding', () => {
  const facts = creation(); facts.project.created_at = '2026-11-07T12:34:56.123456+00:00'; checkCreation(facts);
  facts.audits[0].occurred_at = '2026-11-07T12:34:56.123457Z'; assert.throws(() => checkCreation(facts));
});
test('creator anchor remains exact and cannot carry FullProject or finance padding', () => {
  const value = { scopeKind: 'creator-first-assignment-only', projectId: p, projectNo: 'P1', projectRowVersion: 1,
    ownerOrgId: org, ownerUserId: null, creatorUserId: m, ownershipOriginRowVersion: 1, allowedActions: ['reassign-owner'] };
  const schema = { properties: Object.fromEntries(Object.keys(value).map(key => [key, {}])) }, expected = { projectId: p, actorId: m, orgId: org };
  assertCreatorAnchor(value, expected, schema); assert.throws(() => assertCreatorAnchor({ ...value, contractAmount: '1' }, expected, schema));
});
test('first assignment consumes one origin version with one true same-time history witness', () => {
  const { origin } = creation(); Object.assign(origin, { bootstrap_state: 'consumed', row_version: 2, first_personal_owner_user_id: owner,
    bootstrap_assignment_record_id: customer, first_personal_assigned_at: at, bootstrap_consumed_at: at });
  const record = { id: customer, previous_owner_user_id: null, previous_owner_org_id: org, new_owner_user_id: owner, new_owner_org_id: org, reassigned_by: m, reassigned_at: at };
  assertConsumedOnce(origin, [record], owner, m, org);
  assert.throws(() => assertConsumedOnce(origin, [record, record], owner, m, org));
  assert.throws(() => assertConsumedOnce({ ...origin, row_version: 3 }, [record], owner, m, org));
  assert.throws(() => assertConsumedOnce({ ...origin, first_personal_owner_user_id: m }, [record], owner, m, org));
});
test('observed lock graph proves indirect waiting on the actual control and terminates on cycles', () => {
  const graph = [{ pid: 1, blocked_by: [9] }, { pid: 2, blocked_by: [1] }, { pid: 3, blocked_by: [4] }, { pid: 4, blocked_by: [3] }];
  assert(blockedByControl(1, graph, 9)); assert(blockedByControl(2, graph, 9)); assert(!blockedByControl(3, graph, 9));
});
const captured = value => { const raw = JSON.stringify(value); return { key: [value.id], raw, sha256: sha(raw), xmin: '42' }; };
test('an exact ownership command cannot change another owned project or rewrite old history', () => {
  const before = { project: [captured({ id: p }), captured({ id: org })], project_ownership_origin: [], project_owner_reassignment_record: [captured({ id: customer, project_id: p })] };
  const after = structuredClone(before); after.project[0].xmin = '43'; assertOwnershipRowsIsolated(before, after, p);
  after.project[1].xmin = '44'; assert.throws(() => assertOwnershipRowsIsolated(before, after, p));
  after.project[1].xmin = '42'; after.project_owner_reassignment_record[0].xmin = '44'; assert.throws(() => assertOwnershipRowsIsolated(before, after, p));
});
function legacySnapshots() {
  const fixture = captured({ id: p, project_no: 'LEGACY-TEST', project_name: 'controlled', owner_user_id: m, owner_org_id: null,
    customer_id: customer, current_stage: 'assessment', status: 'active', source_lead_id: null, row_version: 1, created_by: m, updated_by: m, created_at: at, updated_at: at });
  const db = () => ({ meta: { source: 'catalog+OIDs+ACL+sequences' }, tables: { project: [], project_ownership_origin: [] } });
  const before = { databases: { rust: db(), native: db() }, objects: { rust: { files: [] }, native: { files: [] } } }, after = structuredClone(before);
  after.databases.rust.tables.project.push(fixture);
  const ctx = { database: 'rust', databases: ['rust', 'native'], state: { actors: { manager: { id: m } }, fixtures: { customer: { id: customer } }, owned: {} } };
  return { before, after, fixture, ctx };
}
test('controlled legacy permits exactly one new project PK and no other rows/catalog/objects', () => {
  const f = legacySnapshots(); assert.deepEqual(assertOneControlledLegacyBirth(f.ctx, f.before, f.after, p, rows => rows), f.fixture);
  for (const mutate of [a => a.databases.native.tables.project.push(f.fixture), a => a.databases.rust.tables.project_ownership_origin.push(captured({ id: p })),
    a => { a.objects.rust.files.push({ key: 'unknown' }); }, a => { a.databases.rust.meta.source = 'changed'; }]) {
    const after = structuredClone(f.after); mutate(after); assert.throws(() => assertOneControlledLegacyBirth(f.ctx, f.before, after, p, rows => rows));
  }
});
test('controlled legacy rejects modified old-row xmin and never becomes a producer/full-project view', () => {
  const f = legacySnapshots(), old = captured({ id: org }); f.before.databases.rust.tables.project.push(old); f.after.databases.rust.tables.project.push({ ...old, xmin: '43' });
  assert.throws(() => assertOneControlledLegacyBirth(f.ctx, f.before, f.after, p, rows => rows));
  const row = JSON.parse(f.fixture.raw), view = { scopeKind: 'legacy-owner-anchor-only', projectId: p, projectNo: row.project_no, projectName: row.project_name,
    currentStage: 'assessment', rowVersion: 1, ownerUserId: m, ownerOrgId: null, sourceQualification: 'legacy-unverified', allowedActions: [], explanation: '固定受控来源说明' };
  const schema = { properties: Object.fromEntries(Object.keys(view).map(key => [key, {}])) };
  assertLegacyView(view, row, schema); assert.throws(() => assertLegacyView({ ...view, executionAdmissionContext: null }, row, schema));
});
test('pause forwards preceding real calls and stops before the selected HTTP without a fake response', async () => {
  const sent = [], api = { request: async (...args) => { sent.push(args); return { status: 200 }; } };
  const boundary = await stopBeforeRequest(api, async limited => { await limited.request('read'); await limited.request('start', { id: p }, { expectedVersion: 1 }, 'execution'); assert.fail('must not continue'); }, request => request.operationId === 'start');
  assert.deepEqual(sent.map(args => args[0]), ['read']); assert.equal(boundary.actor, 'execution'); assert.equal(boundary.requestedHTTPNotSent, true);
  assert.equal(boundary.bodySHA256, sha(JSON.stringify({ expectedVersion: 1 })));
});
test('unrelated producer error and normal return are never misreported as a pause', async () => {
  const error = new Error('actual database failure');
  await assert.rejects(stopBeforeRequest({}, async () => { throw error; }, () => false), candidate => candidate === error);
  await assert.rejects(stopBeforeRequest({}, async () => {}, () => false), /no pause is certified/);
});
test('nested views persist separate real fixture slots while sharing the actual ownership/auth state', () => {
  const state = { actors: { execution: { id: owner } }, owned: {
    [keyOf('rust', 'org_unit', [org])]: { owned: true }, [keyOf('rust', 'customer', [customer])]: { owned: true },
  }, fixtures: { platformComplete: true, org: { id: org }, customer: { id: customer }, roles: { execution: { id: owner } }, project: { id: 'main' } } };
  let persisted; const root = { database: 'rust', state, pins: [{ file: 'actual-source', sha256: 'pin' }], persist: () => { persisted = JSON.parse(JSON.stringify(state)); } };
  const before = mainFixtureSHA(root), eo = openFixtureView(root, 'eo'), own = openFixtureView(root, 'own');
  eo.ctx.state.fixtures.project = { id: 'actual-eo-response' }; own.ctx.state.fixtures.project = { id: 'actual-own-response' }; eo.ctx.persist();
  assert.equal(state.fixtures.project.id, 'main'); assert.equal(mainFixtureSHA(root), before);
  assert.equal(persisted.fixtures.uiFixtureViews23.eo.fixtures.project.id, 'actual-eo-response');
  assert.equal(persisted.fixtures.uiFixtureViews23.own.fixtures.project.id, 'actual-own-response');
  assert.equal(eo.ctx.state.owned, state.owned); assert.equal(eo.ctx.state.actors, state.actors);
  eo.ctx.state.blockedObservation = 'actual-observation'; assert.equal(state.blockedObservation, 'actual-observation');
  assert.throws(() => { eo.ctx.state.fixtures = {}; }); assert.throws(() => openFixtureView(eo.ctx, 'own'));
});
