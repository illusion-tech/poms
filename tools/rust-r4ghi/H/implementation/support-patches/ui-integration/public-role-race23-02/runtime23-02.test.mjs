import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { exactSessionTouches23 } from './checks/tools/rust-r4ghi/business/ui-role-public-race23.mjs';
const actorId = '11111111-1111-4111-8111-111111111111';
function row(id, value = {}, xmin = '101') {
  const raw = JSON.stringify({ id, user_id: actorId, status: 'active', token_hash: 'unchanged-' + id, csrf_token_hash: 'unchanged-csrf-' + id,
    row_version: 7, last_seen_at: '2026-11-08T00:00:00Z', updated_at: '2026-11-08T00:00:00Z',
    last_ip: '127.0.0.1', idle_expires_at: '2026-11-08T01:00:00Z', absolute_expires_at: '2026-11-09T00:00:00Z', ...value });
  return { key: [id], raw, sha256: createHash('sha256').update(raw).digest('hex'), xmin };
}
function rawTouch(old, xmin) {
  return row(old.key[0], { ...JSON.parse(old.raw), row_version: 8, last_seen_at: '2026-11-08T00:02:00Z', updated_at: '2026-11-08T00:02:00Z', idle_expires_at: '2026-11-08T01:02:00Z' }, xmin);
}
function managed(mid, value = {}, xmin = '104') { return row(mid.key[0], { ...JSON.parse(mid.raw), row_version: 9, updated_at: '2026-11-08T00:02:01.125Z', ...value }, xmin); }
function setup({ winnerDue = true, peerDue = true } = {}) {
  const authBefore = [row('winner'), row('peer'), row('unrelated')];
  const winner = winnerDue ? rawTouch(authBefore[0], '102') : authBefore[0], peer = peerDue ? rawTouch(authBefore[1], '103') : authBefore[1];
  return { authBefore, authMiddle: [winner, peer], authAfter: [winnerDue ? managed(winner) : winner, peer, authBefore[2]], winnerSessionId: 'winner', peerSessionId: 'peer', actorId, businessXmin: '104' };
}
test('due winner proves raw transaction then managed +1 with distinct actual onUpdate timestamp', () => {
  const result = exactSessionTouches23(setup()); assert.equal(result.peerTouches.length, 1);
  assert.deepEqual(result.phases.map(value => [value.rawTouched, value.managedFlushed]), [[true, true], [true, false]]);
  assert.equal(result.phases[0].actualQueuedXmin, '102'); assert.equal(result.phases[0].afterXmin, '104');
});
test('not-due requests keep exact rows and xmin, without inferring imaginary pending changes', () => {
  for (const winnerDue of [false, true]) for (const peerDue of [false, true]) {
    const result = exactSessionTouches23(setup({ winnerDue, peerDue }));
    assert.equal(result.peerTouches.length, peerDue ? 1 : 0); assert.equal(result.phases[0].managedFlushed, winnerDue);
  }
});
test('winner final +2 is rejected unless the actual queued row establishes the raw +1', () => {
  const input = setup(); input.authMiddle[0] = input.authBefore[0]; assert.throws(() => exactSessionTouches23(input));
});
test('a winner managed flush cannot modify replayed last_seen/IP/idle values or another identity field', () => {
  for (const change of [{ last_seen_at: '2026-11-08T00:02:01Z' }, { last_ip: '10.0.0.1' }, { idle_expires_at: '2026-11-08T01:03:00Z' }, { csrf_token_hash: 'rotated' }, { user_id: 'other-user' }]) {
    const input = setup(); input.authAfter[0] = managed(input.authMiddle[0], change); assert.throws(() => exactSessionTouches23(input));
  }
});
test('winner flush must share the true freeze xmin and advance exactly once', () => {
  for (const [value, xmin] of [[{}, '105'], [{ row_version: 10 }, '104'], [{ updated_at: '2026-11-08T00:01:59Z' }, '104']]) {
    const input = setup(); input.authAfter[0] = managed(input.authMiddle[0], value, xmin); assert.throws(() => exactSessionTouches23(input));
  }
});
test('peer 409 is never allowed a managed flush or version-only touch after queue observation', () => {
  for (const peerDue of [false, true]) { const input = setup({ peerDue }); input.authAfter[1] = managed(input.authMiddle[1]); assert.throws(() => exactSessionTouches23(input)); }
});
test('raw mid must preserve frozen identity, be a real +1, and change xmin', () => {
  for (const [change, xmin] of [[{ token_hash: 'other-token' }, '102'], [{ row_version: 9 }, '102'], [{ updated_at: '2026-11-08T00:02:01Z' }, '102'], [{}, '101']]) {
    const input = setup(), mid = input.authMiddle[0]; input.authMiddle[0] = row('winner', { ...JSON.parse(mid.raw), ...change }, xmin);
    input.authAfter[0] = managed(input.authMiddle[0]); assert.throws(() => exactSessionTouches23(input));
  }
});
test('unrelated sessions, new/deleted sessions, forged row hashes, and missing actual middle rows fail closed', () => {
  const cases = [input => { input.authAfter[2] = rawTouch(input.authBefore[2], '109'); }, input => input.authAfter.pop(),
    input => input.authAfter.push(row('new')), input => { input.authMiddle[0] = { ...input.authMiddle[0], sha256: 'f'.repeat(64) }; },
    input => input.authMiddle.pop(), input => { input.authMiddle[1] = input.authMiddle[0]; }];
  for (const alter of cases) { const input = setup(); alter(input); assert.throws(() => exactSessionTouches23(input)); }
});
