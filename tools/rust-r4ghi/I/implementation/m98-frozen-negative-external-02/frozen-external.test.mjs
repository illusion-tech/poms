// Synthetic client/unit facts only; never a PG connection or actual receipt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildM98FrozenNegatives, controlledAttemptM98, assertControlledFailureM98, withExternalM98Lock } from './proposed/tools/rust-r4ghi/probe-m98-frozen-external.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
function fixture() {
  const main = { id: '22222222-2222-4222-8222-222222222222', project_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'frozen', producer_version: 1, freeze_payload_id: '22222222-2222-4222-8222-222222222222' }, other = { id: '11111111-1111-4111-8111-111111111111', project_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', status: 'frozen', producer_version: 1, freeze_payload_id: '11111111-1111-4111-8111-111111111111' };
  const participants = [{ id: 'zero', assignment_id: main.id, user_id: 'user1', role_type: 'business-analyst', weight_units: 0, zero_weight_reason: 'Actual declared zero in this pure model' }, { id: 'positive', assignment_id: main.id, user_id: 'user2', role_type: 'execution-owner', weight_units: 1000000, zero_weight_reason: null }];
  const captured = value => { const raw = JSON.stringify(value); return { key: [value.id], raw, sha256: sha(raw), xmin: '999' }; };
  const expectedParents = [main, other].map(captured), expectedParticipant = captured(participants[0]);
  return { main, other, participants, args: { mainId: main.id, otherId: other.id, probe: buildM98FrozenNegatives(main, other, participants)[0], expectedParents, expectedParticipant } };
}
function clientFor(f, mutation = {}) {
  const statements = [], parents = [...f.args.expectedParents].sort((a, b) => a.key[0].localeCompare(b.key[0])).map(row => ({ raw: row.raw, xmin: row.xmin })), child = [{ raw: f.args.expectedParticipant.raw, xmin: f.args.expectedParticipant.xmin }];
  const client = { async query(sql, values) {
    statements.push({ sql, values });
    if (sql === 'BEGIN') { if (mutation.beginFailure) throw new Error('synthetic begin failure'); return { rows: [] }; }
    if (sql.includes('FROM poms.commission_role_assignment a')) return { rows: mutation.parents ?? parents };
    if (sql.includes('FROM poms.commission_role_assignment_participant p')) return { rows: mutation.child ?? child };
    if (sql.startsWith('UPDATE ')) { if (mutation.updateSucceeds) return { rows: [], rowCount: 1 }; throw Object.assign(new Error(mutation.message ?? f.args.probe.message), { code: mutation.code ?? '23514' }); }
    if (sql === 'ROLLBACK') { if (mutation.rollbackFailure) throw new Error('synthetic rollback failure'); return { rows: [] }; }
    throw new Error('Unexpected test SQL');
  }, async end() { statements.push({ sql: 'END-CONNECTION' }); } };
  return { client, statements };
}
test('five probes use the existing zero/positive facts, distinct actual model user/role and frozen target without mutating input', () => {
  const f = fixture(), before = structuredClone(f), probes = buildM98FrozenNegatives(f.main, f.other, f.participants);
  assert.equal(probes.length, 5); assert.equal(probes[0].participantId, 'zero'); assert.equal(probes[1].participantId, 'positive'); assert.equal(probes[0].afterValue, f.other.id); assert.equal(probes[4].beforeValue, 0); assert.equal(probes[4].afterValue, 1); assert.deepEqual(f, before);
});
test('missing genuine zero/positive, a draft target, old producer, same project or missing freeze payload cannot start', () => {
  for (const change of [x => { x.participants[0].weight_units = 1; }, x => { x.participants[0].zero_weight_reason = ''; }, x => { x.participants[1].weight_units = 0; }, x => { x.other.status = 'draft'; }, x => { x.main.producer_version = 0; }, x => { x.other.project_id = x.main.project_id; }, x => { x.other.freeze_payload_id = null; }]) { const f = fixture(); change(f); assert.throws(() => buildM98FrozenNegatives(f.main, f.other, f.participants)); }
});
test('both parents are locked in stable ID order, then exact child, then one UPDATE and unconditional rollback/end', async () => {
  const f = fixture(), fake = clientFor(f), result = await controlledAttemptM98(async () => fake.client, f.args); assertControlledFailureM98(result, f.args.probe.message);
  assert.equal(fake.statements.length, 6); assert.equal(fake.statements[0].sql, 'BEGIN'); assert.match(fake.statements[1].sql, /ORDER BY a.id FOR UPDATE OF a$/); assert.deepEqual(fake.statements[1].values, [[f.main.id, f.other.id]]); assert.match(fake.statements[2].sql, /FOR UPDATE OF p$/); assert.match(fake.statements[3].sql, /^UPDATE .* SET assignment_id=/); assert.equal(fake.statements[4].sql, 'ROLLBACK'); assert.equal(fake.statements[5].sql, 'END-CONNECTION'); assert(!fake.statements.some(value => value.sql === 'COMMIT'));
});
test('unexpected UPDATE success is still rolled back and cannot become a passing guard proof', async () => {
  const f = fixture(), fake = clientFor(f, { updateSucceeds: true }), result = await controlledAttemptM98(async () => fake.client, f.args);
  assert.equal(result.rollbackSucceeded, true); assert.equal(fake.statements.at(-2).sql, 'ROLLBACK'); assert.equal(result.failure, null); assert.throws(() => assertControlledFailureM98(result, f.args.probe.message), /Unexpected success/);
});
test('parent raw/xmin or membership drift prevents the UPDATE and still rolls back', async () => {
  for (const parents of [[], f => f.args.expectedParents.map(value => ({ raw: value.raw, xmin: 'changed' })), f => f.args.expectedParents.map(value => ({ raw: value.raw.replace('frozen', 'draft'), xmin: value.xmin }))]) {
    const f = fixture(), fake = clientFor(f, { parents: typeof parents === 'function' ? parents(f) : parents }), result = await controlledAttemptM98(async () => fake.client, f.args);
    assert(result.infrastructure); assert(!fake.statements.some(value => value.sql.startsWith('UPDATE '))); assert.equal(result.rollbackSucceeded, true); assert.throws(() => assertControlledFailureM98(result, f.args.probe.message));
  }
});
test('child raw/xmin drift or absence prevents the UPDATE and still rolls back', async () => {
  for (const child of [[], f => [{ raw: f.args.expectedParticipant.raw, xmin: 'changed' }], f => [{ raw: f.args.expectedParticipant.raw.replace('user1', 'changed'), xmin: '999' }]]) {
    const f = fixture(), fake = clientFor(f, { child: typeof child === 'function' ? child(f) : child }), result = await controlledAttemptM98(async () => fake.client, f.args);
    assert(result.infrastructure); assert(!fake.statements.some(value => value.sql.startsWith('UPDATE '))); assert.equal(result.rollbackSucceeded, true);
  }
});
test('timeout, wrong constraint code or wrong diagnostic never count as the expected immutable guard', async () => {
  for (const mutation of [{ code: '55P03' }, { code: '23505' }, { message: 'different guard' }]) { const f = fixture(), fake = clientFor(f, mutation), result = await controlledAttemptM98(async () => fake.client, f.args); assert.equal(result.rollbackSucceeded, true); assert.throws(() => assertControlledFailureM98(result, f.args.probe.message)); }
});
test('rollback failure is retained as infrastructure failure, end is attempted and certification rejects', async () => {
  const f = fixture(), fake = clientFor(f, { rollbackFailure: true }), result = await controlledAttemptM98(async () => fake.client, f.args);
  assert.equal(result.rollbackAttempted, true); assert.equal(result.rollbackSucceeded, false); assert.match(result.infrastructure.message, /rollback failure/); assert.equal(fake.statements.at(-1).sql, 'END-CONNECTION'); assert.throws(() => assertControlledFailureM98(result, f.args.probe.message));
});
test('BEGIN failure always attempts rollback/end without reaching locks or UPDATE', async () => {
  const f = fixture(), fake = clientFor(f, { beginFailure: true }), result = await controlledAttemptM98(async () => fake.client, f.args);
  assert.deepEqual(fake.statements.map(value => value.sql), ['BEGIN', 'ROLLBACK', 'END-CONNECTION']); assert(result.infrastructure); assert.throws(() => assertControlledFailureM98(result, f.args.probe.message));
});
test('unreviewed field names reject before opening any connection', async () => {
  const f = fixture(); let opened = false; f.args.probe.field = 'responsibility_summary';
  await assert.rejects(controlledAttemptM98(async () => { opened = true; }, f.args)); assert.equal(opened, false);
});
const lockedPriv = '/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business13/main01', lockedFile = lockedPriv + '/driver.lock';
function memoryIO(existing = null) {
  const files = new Map(existing === null ? [] : [[lockedFile, Buffer.from(JSON.stringify(existing))]]), calls = [];
  const io = {
    realpathSync(file) { calls.push(['realpath', file]); return file; },
    writeFileSync(file, raw, options) { calls.push(['write', file, options]); assert.equal(options.flag, 'wx'); assert.equal(options.mode, 0o600); if (files.has(file)) throw Object.assign(new Error('existing driver lock'), { code: 'EEXIST' }); files.set(file, Buffer.from(raw)); },
    lstatSync(file) { calls.push(['lstat', file]); assert(files.has(file)); return { isFile: () => true, isSymbolicLink: () => false, nlink: 1 }; },
    readFileSync(file) { calls.push(['read', file]); assert(files.has(file)); return files.get(file); },
    unlinkSync(file) { calls.push(['unlink', file]); assert(files.has(file)); files.delete(file); },
  };
  return { files, calls, io };
}
test('an existing fixed new13 driver lock causes zero createContext calls, zero persist and no existing lock mutation', async () => {
  const memory = memoryIO({ pid: 9999, nonce: 'existing-real-owner' }), before = Buffer.from(memory.files.get(lockedFile)); let contextCalls = 0, persists = 0;
  const createContext = () => { contextCalls++; persists++; return {}; };
  await assert.rejects(withExternalM98Lock('m98Frozen01', async () => createContext(), memory.io), { code: 'EEXIST' });
  assert.equal(contextCalls, 0); assert.equal(persists, 0); assert.deepEqual(memory.files.get(lockedFile), before); assert(!memory.calls.some(value => ['read', 'lstat', 'unlink'].includes(value[0])));
});
test('new13 lock is obtained before the context/persist action and is released only after the action completes', async () => {
  const memory = memoryIO(); let persists = 0;
  const value = await withExternalM98Lock('m98Frozen01', async () => { const owner = JSON.parse(memory.files.get(lockedFile)); assert.equal(owner.pid, process.pid); assert.match(owner.nonce, /^[a-f0-9-]{36}$/); assert.equal(owner.phase, 'm98Frozen01'); persists++; return 'pure-action-result'; }, memory.io);
  assert.equal(value, 'pure-action-result'); assert.equal(persists, 1); assert.equal(memory.files.size, 0); assert.deepEqual(memory.calls.map(value => value[0]), ['realpath', 'write', 'lstat', 'read', 'unlink']);
});
test('failure during post-lock context validation releases this exact owned nonce lock', async () => {
  const memory = memoryIO(); let contextCalls = 0;
  await assert.rejects(withExternalM98Lock('m98Frozen01', async () => { contextCalls++; throw new Error('synthetic context validation failure'); }, memory.io), /context validation failure/);
  assert.equal(contextCalls, 1); assert.equal(memory.files.size, 0); assert.equal(memory.calls.at(-1)[0], 'unlink');
});
test('a changed PID or nonce lock is preserved and rejected rather than deleting a different owner', async () => {
  for (const change of [owner => ({ ...owner, pid: owner.pid + 1 }), owner => ({ ...owner, nonce: 'different-nonce' })]) {
    const memory = memoryIO(); await assert.rejects(withExternalM98Lock('m98Frozen01', async () => { const owner = JSON.parse(memory.files.get(lockedFile)); memory.files.set(lockedFile, Buffer.from(JSON.stringify(change(owner)))); }, memory.io));
    assert(memory.files.has(lockedFile)); assert(!memory.calls.some(value => value[0] === 'unlink'));
  }
});
test('a redirected new13 private directory is rejected before any lock creation or context action', async () => {
  const memory = memoryIO(); memory.io.realpathSync = () => '/different-private'; let contextCalls = 0;
  await assert.rejects(withExternalM98Lock('m98Frozen01', async () => { contextCalls++; }, memory.io)); assert.equal(contextCalls, 0); assert.equal(memory.files.size, 0); assert(!memory.calls.some(value => value[0] === 'write'));
});
