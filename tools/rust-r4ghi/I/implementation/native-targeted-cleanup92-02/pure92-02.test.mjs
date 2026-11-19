import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { TARGET92_02 as T, verifyBirth92_02, consume44Metadata92_02 } from './proposed/tools/rust-r4ghi/business/native-targeted-cleanup92-02.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
function fixture() {
  const token = 'synthetic-only-token', raw = JSON.stringify({ id: T.id, user_id: 'original-native-user', token_hash: sha(token), status: 'active' });
  const row = { key: [T.id], raw, sha256: sha(raw), xmin: 'unit-xmin' }, before = { file: '/private/unit-before', rawBytesSha256: 'a'.repeat(64) }, after = { file: '/private/unit-after', rawBytesSha256: 'b'.repeat(64) };
  const owned = { database: T.database, table: 'auth_session', key: [T.id], firstSha256: row.sha256, proof: { kind: 'HTTP-real-response-ID', responsePointer: 'HTTP-real-cookie-token-hash', id: T.id,
    operationId: 'AuthController_createPasswordAuthSession', requestId: 'actual-native-login', status: 200, responseComplete: true, beforeAbsent: true, beforeSnapshot: before, afterSnapshot: after } };
  const login = { attempt: { requestId: 'actual-native-login', operationId: 'AuthController_createPasswordAuthSession', status: 200, responseComplete: true, transportFailure: false, transport: 'actual-Native-reference31442-not-Rust', actorId: 'original-native-user', body: { authenticated: true, user: { id: 'original-native-user' } } }, before, after };
  return { data: { owned, login, headers: { status: 200, rawHeaders: ['Set-Cookie', 'poms_session=' + encodeURIComponent(token) + '; Path=/api'] }, beforeRows: [], afterRows: [row] }, expected: { ...T, rowSHA256: row.sha256, xmin: row.xmin } };
}
test('the exact cookie-derived second-pass tuple closes without inventing JSON session ID', () => {
  const { data, expected } = fixture(), proof = verifyBirth92_02(data, expected); assert.equal(proof.responseJSONSessionIDClaimed, false); assert.equal(proof.id, T.id);
  assert.equal(data.login.attempt.body.id, undefined); assert.equal(proof.cookieDerivedAnchorTupleVerified, true);
});
test('an arbitrary response-ID pointer or another proof kind is rejected', () => {
  for (const alter of [d => d.owned.proof.responsePointer = '/id', d => d.owned.proof.kind = 'HTTP-same-real-transaction', d => d.owned.proof.id = 'another-id']) {
    const { data, expected } = fixture(); alter(data); assert.throws(() => verifyBirth92_02(data, expected));
  }
});
test('real Set-Cookie hash, unique new PK and original user must all match', () => {
  for (const alter of [d => d.headers.rawHeaders[1] = 'poms_session=wrong', d => d.afterRows.push(d.afterRows[0]), d => d.beforeRows.push(d.afterRows[0]), d => d.login.attempt.body.user.id = 'another-user']) {
    const { data, expected } = fixture(); alter(data); assert.throws(() => verifyBirth92_02(data, expected));
  }
});
test('duplicate cookie, missing ACK or wrong login/snapshot identity cannot certify birth', () => {
  for (const alter of [d => d.headers.rawHeaders.push(...d.headers.rawHeaders), d => d.login.attempt.responseComplete = false, d => d.owned.proof.beforeAbsent = false,
    d => d.login.attempt.requestId = 'different', d => d.login.before = { file: '/different', rawBytesSha256: 'c'.repeat(64) }]) {
    const { data, expected } = fixture(); alter(data); assert.throws(() => verifyBirth92_02(data, expected));
  }
});
test('birth raw SHA and xmin are independently bounded', () => {
  for (const alter of [(d, e) => e.rowSHA256 = 'f'.repeat(64), (d, e) => e.xmin = 'different', d => d.afterRows[0].sha256 = 'f'.repeat(64)]) {
    const { data, expected } = fixture(); alter(data, expected); assert.throws(() => verifyBirth92_02(data, expected));
  }
});
function state() { return { planSHA256: T.oldPlanSHA256, phase: 'complete', sequence: 43, sessionId: T.id, owned: { original: { latestSha256: 'unchanged' } }, attempts: [{ operationId: 'old17', proof: 'kept' }], proof: { file: '/private/43', rawBytesSha256: T.proof17SHA256 }, actors: { token: 'synthetic-private-only' } }; }
test('consume44 is metadata-only, preserving plan/17/owned/credentials and original object', () => {
  const old = state(), original = structuredClone(old), next = consume44Metadata92_02(old, { file: '/private/existing44', rawBytesSha256: 'd'.repeat(64) }, { file: '/private/new-cleanup-plan', rawBytesSha256: 'e'.repeat(64) });
  assert.deepEqual(old, original); assert.equal(next.sequence, 44); assert.equal(next.planSHA256, T.oldPlanSHA256); assert.deepEqual(next.owned, old.owned); assert.deepEqual(next.attempts, old.attempts); assert.deepEqual(next.actors, old.actors);
  assert.equal(next.cleanup92_02.phase, 'metadata-reconciled-no-SQL-write');
});
test('wrong sequence, repeated cleanup, stale plan or blocked phase never replays', () => {
  for (const alter of [s => s.sequence = 44, s => s.cleanup92_02 = {}, s => s.cleanupIntent = {}, s => s.planSHA256 = 'wrong', s => s.blockedObservation = {}, s => s.phase = 'blocked']) {
    const value = state(); alter(value); assert.throws(() => consume44Metadata92_02(value, {}, {}));
  }
});
