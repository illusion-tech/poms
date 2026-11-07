import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { exactPath, operationMap, boundStatus, birthProof, deleteOrder, foreignReferences, exactDeleteCTE, sha, diffRows, numberProof } from './pure.mjs';
import { objectDiff } from './objects.mjs';
import { platformBirthProof } from './platform-bindings.mjs';

const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
const row = (id, xmin = '77', cells = {}) => { const raw = JSON.stringify({ id, ...cells }); return { key: [id], raw, sha256: sha(raw), xmin, cells: { id, ...cells } }; };
test('named dual UUID route preserves distinct parent and child', () => {
  const template = '/api/project-completion-records/{completionRecordId}/conditions/{id}:close';
  assert.equal(exactPath(template, { completionRecordId: a, id: b }), `/api/project-completion-records/${a}/conditions/${b}:close`);
  for (const params of [a, { id: a }, { id: a, completionRecordId: b, extra: a }, { id: '../x', completionRecordId: a }]) assert.throws(() => exactPath(template, params));
});
test('operation index rejects ambiguous operation IDs', () => {
  assert.throws(() => operationMap({ paths: { '/api/a': { get: { operationId: 'same' } }, '/api/b': { get: { operationId: 'same' } } } }));
});
test('source-bound 201 never widens to Swagger 200 or a status array', () => {
  assert.equal(boundStatus(201), 201); assert.equal(boundStatus(201, 409), 409);
  assert.throws(() => boundStatus(201, 200)); assert.throws(() => boundStatus(201, [200, 201]));
});
test('only response table/ID, exact request, cookie or anchored real xmin grants birth', () => {
  const attempt = { requestId: 'real-exact-request' }, anchor = { table: 'project', id: a, pointer: '/id', xmin: '77' };
  assert.equal(birthProof(row(a), 'project', attempt, [anchor]).kind, 'HTTP-real-response-ID');
  assert.equal(birthProof(row(b), 'project_child', attempt, [anchor]).kind, 'HTTP-same-real-transaction');
  assert.equal(birthProof(row(b, '78'), 'project_child', attempt, [anchor]), null);
  assert.equal(birthProof(row(a, '78'), 'foreign_table', attempt, [anchor]), null);
  assert.equal(birthProof(row(b, '79', { request_id: attempt.requestId }), 'audit_log', attempt, []).kind, 'HTTP-exact-request-ID');
  assert.equal(birthProof(row(b, '79', { request_id: 'other' }), 'audit_log', attempt, []), null);
  assert.equal(birthProof(row(b, '79', { token_hash: 'bound' }), 'auth_session', attempt, [], ['bound']).kind, 'HTTP-real-cookie-token-hash');
  assert.equal(birthProof(row(b, '79', { token_hash: 'other' }), 'auth_session', attempt, [], ['bound']), null);
});
test('raw money text is compared without floating point round-trip', () => {
  const first = { key: [a], raw: '{"amount":9999999999999999.99}' }, second = { key: [a], raw: '{"amount":9999999999999999.98}' };
  first.sha256 = sha(first.raw); second.sha256 = sha(second.raw);
  assert.equal(diffRows([first], [second]).changed.length, 1);
});
test('independent number counter is bound to exact returned number and one step', () => {
  const specs = { project: { prefix: 'PRJ', padding: 6, description: 'project' } }, binding = { scope: 'project', pointer: '/projectNo' };
  const next = row(a, '50', { scope: 'project', period: '2026', next_value: 2, prefix: 'PRJ', padding: 6, description: 'project' });
  assert.equal(numberProof(next, null, binding, { projectNo: 'PRJ-2026-000001' }, specs).kind, 'HTTP-exact-returned-business-number-producer');
  assert.equal(numberProof(next, null, binding, { projectNo: 'PRJ-2026-000002' }, specs), null);
  const incremented = row(a, '51', { scope: 'project', period: '2026', next_value: 3, prefix: 'PRJ', padding: 6, description: 'project' });
  assert(numberProof(incremented, next, binding, { projectNo: 'PRJ-2026-000002' }, specs));
  assert.equal(numberProof(incremented, null, binding, { projectNo: 'PRJ-2026-000002' }, specs), null);
});
test('cleanup uses row-level FK order including self-reference and blocks cycles', () => {
  const parent = { database: 'db', table: 'node', key: [a], cells: { id: a, parent: null } }, child = { database: 'db', table: 'node', key: [b], cells: { id: b, parent: a } };
  const fks = [{ child: 'node', parent: 'node', childColumns: ['parent'], parentColumns: ['id'] }];
  assert.deepEqual(deleteOrder([parent, child], fks).map(r => r.key[0]), [b, a]);
  assert.throws(() => deleteOrder([{ ...parent, cells: { id: a, parent: b } }, child], fks));
});
test('object observations distinguish birth, overwrite and disappearance', () => {
  const diff = objectDiff({ files: [{ key: 'old', sha256: 'a' }, { key: 'moved', sha256: 'b' }] }, { files: [{ key: 'old', sha256: 'changed' }, { key: 'new', sha256: 'b' }] });
  assert.deepEqual(diff.added.map(r => r.key), ['new']); assert.deepEqual(diff.changed.map(r => r.key), ['old']); assert.deepEqual(diff.missing.map(r => r.key), ['moved']);
});
test('cleanup detects a foreign child even when its parent is proven owned', () => {
  const parent = { database: 'db', table: 'parent', key: [a], cells: { id: a } }, child = row(b, '2', { parent_id: a });
  const fks = [{ name: 'child_parent', child: 'child', parent: 'parent', childColumns: ['parent_id'], parentColumns: ['id'] }];
  assert.equal(foreignReferences([parent], { child: [child] }, fks).length, 1);
  assert.equal(foreignReferences([parent, { database: 'db', table: 'child', ...child }], { child: [child] }, fks).length, 0);
});
test('one-statement cleanup binds exact PK and full raw bytes as parameters', () => {
  const rows = [{ table: 'a', pk: ['id'], key: [a], raw: '{"text":"quote\' $()"}' }, { table: 'b', pk: ['parent_id', 'id'], key: [a, b], raw: '{"amount":9999999999999999.99}' }];
  const query = exactDeleteCTE(rows);
  assert.equal(query.tableCount, 2); assert.equal(query.values.length, 5);
  assert(!query.text.includes(rows[0].raw) && !query.text.includes(a) && !query.text.includes('CASCADE'));
  assert.match(query.text, /WITH "owned_delete_0" AS \(DELETE FROM poms\."a"/);
  assert(query.text.includes('row_to_json(t)::text=owned.expected_raw') && query.text.includes('UNION ALL'));
  assert.deepEqual(query.values, [a, rows[0].raw, a, b, rows[1].raw]);
});
test('legacy NULL-request audits and permission children bind exact new owned role and actor', () => {
  const actor = '33333333-3333-4333-8333-333333333333';
  const ctx = { database: 'db', pins: [{ file: 'apps/poms-api-rust/src/roles/store.rs', sha256: 'source-pin' }], state: { owned: { [JSON.stringify(['db', 'role', [a]])]: { latestSha256: 'x' } } } };
  const attempt = { operationId: 'PlatformController_createRole', status: 201, responseComplete: true, actorId: actor, body: { id: a } };
  const audit = row(b, 'different-TX', { event_type: 'platform.role.created', target_type: 'PlatformRole', target_id: a, operator_id: actor, request_id: null, result: 'success' });
  assert.equal(platformBirthProof(ctx, 'audit_log', audit, attempt, [{ table: 'role', id: a }]).kind, 'HTTP-source-bound-exact-new-target-audit');
  assert.equal(platformBirthProof(ctx, 'audit_log', audit, { ...attempt, actorId: b }, [{ table: 'role', id: a }]), null);
  assert.equal(platformBirthProof(ctx, 'audit_log', audit, attempt, []), null);
  const assign = { operationId: 'PlatformController_assignRolePermissions', status: 200, responseComplete: true, actorId: actor, body: { id: a }, pathParams: { id: a }, requestValue: { permissionKeys: ['project:read'] } };
  const permission = row(b, 'another-TX', { role_id: a, permission_key: 'project:read', assigned_by: actor, status: 'active' });
  assert.equal(platformBirthProof(ctx, 'role_permission_assignment', permission, assign, []).kind, 'HTTP-source-bound-exact-owned-role-permission-child');
  assert.equal(platformBirthProof(ctx, 'role_permission_assignment', permission, { ...assign, requestValue: { permissionKeys: [] } }, []), null);
});
test('driver import and help remain offline and do not load database drivers', () => {
  const driver = fileURLToPath(new URL('./driver.mjs', import.meta.url));
  const help = spawnSync(process.execPath, [driver, '--help'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(help.status, 0, help.stderr); assert.match(help.stdout, /Only Root/); assert.equal(help.stderr, '');
  const imported = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(new URL('./driver.mjs', import.meta.url).href)})`], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(imported.status, 0, imported.stderr); assert.equal(imported.stdout, ''); assert.equal(imported.stderr, '');
});
