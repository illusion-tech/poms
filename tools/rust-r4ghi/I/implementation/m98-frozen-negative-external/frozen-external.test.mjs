// Synthetic client/unit facts only; never a PG connection or actual receipt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildM98FrozenNegatives, controlledAttemptM98, assertControlledFailureM98 } from './proposed/tools/rust-r4ghi/probe-m98-frozen-external.mjs';
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
