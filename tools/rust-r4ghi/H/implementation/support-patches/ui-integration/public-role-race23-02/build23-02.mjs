// FS-only delta; this script never imports or invokes a business driver.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'tools/rust-r4ghi/business/ui-role-public-race23.mjs';
const before = fs.readFileSync(path.resolve(here, '../public-role-race23/proposed', file));
const beforeSHA256 = '5a0220345d65bb906f5dbb8efae6ad0f09a45f54ba0ad6ff68ec9b80642ac557';
assert.equal(sha(before), beforeSHA256);
let text = before.toString('utf8');
function replace(from, to) { assert.equal(text.split(from).length, 2, `Exact delta anchor missing: ${from.slice(0, 100)}`); text = text.replace(from, to); }
const start = text.indexOf('export function exactSessionTouches23('), end = text.indexOf('async function peerRequest23(', start);
assert(start > 0 && end > start);
text = text.slice(0, start) + `const sameSessionRow23 = (a, b) => a.sha256 === b.sha256 && a.xmin === b.xmin;
function validSessionRow23(row) {
  assert.equal(row.key.length, 1); assert.equal(sha(row.raw), row.sha256);
  const cell = JSON.parse(row.raw); assert.equal(cell.id, row.key[0]); return cell;
}
export function exactSessionTouches23({ authBefore, authMiddle, authAfter, winnerSessionId, peerSessionId, actorId, businessXmin }) {
  assert.notEqual(winnerSessionId, peerSessionId); assert.equal(authAfter.length, authBefore.length);
  const before = new Map(authBefore.map(row => [row.key[0], row])), after = new Map(authAfter.map(row => [row.key[0], row]));
  assert.equal(before.size, authBefore.length); assert.equal(after.size, authAfter.length);
  assert.equal(authMiddle.length, 2); const middle = new Map(authMiddle.map(row => [row.key[0], row]));
  assert.equal(middle.size, 2); assert(middle.has(winnerSessionId) && middle.has(peerSessionId));
  const peerTouches = [], phases = [];
  for (const [id, old] of before) {
    const final = after.get(id); assert(final, 'Session birth/deletion/PK changes are forbidden'); validSessionRow23(old); validSessionRow23(final);
    if (![winnerSessionId, peerSessionId].includes(id)) { assert(sameSessionRow23(old, final), 'An unrelated session changed'); continue; }
    const mid = middle.get(id), m = validSessionRow23(mid), a = JSON.parse(final.raw);
    assert.equal(m.user_id, actorId); assert.equal(m.status, 'active');
    const rawTouched = !sameSessionRow23(old, mid);
    if (rawTouched) { assert(exactRawTouch(old, mid, id, actorId), 'before→actual queued row must be the exact raw touch'); assert.notEqual(mid.xmin, old.xmin); }
    if (id === peerSessionId || !rawTouched) {
      assert(sameSessionRow23(mid, final), id === peerSessionId ? 'Rejected peer must not managed-flush or change after its actual queued row' : 'No raw dirt means no winner managed flush');
    } else {
      assert.equal(a.row_version, m.row_version + 1, 'Winner managed flush consumes the real raw version once');
      assert.equal(final.xmin, businessXmin, 'Winner managed flush must share the actual freeze business transaction');
      assert.notEqual(final.xmin, mid.xmin);
      const stable = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['row_version', 'updated_at'].includes(key)));
      assert.deepEqual(stable(a), stable(m), 'Managed replay may not alter any observed raw value or identity');
      assert(Number.isFinite(Date.parse(a.updated_at)) && Date.parse(a.updated_at) >= Date.parse(m.updated_at), 'Managed onUpdate must be a real subsequent timestamp');
    }
    if (id === peerSessionId && rawTouched) peerTouches.push({ old, row: final });
    phases.push({ sessionId: id, actorId, command: id === winnerSessionId ? 'winner-freeze200' : 'peer-revised409', rawTouched,
      managedFlushed: id === winnerSessionId && rawTouched, beforeSHA256: old.sha256, actualQueuedSHA256: mid.sha256, afterSHA256: final.sha256,
      beforeXmin: old.xmin, actualQueuedXmin: mid.xmin, afterXmin: final.xmin });
  }
  assert.equal(phases.length, 2); return { peerTouches, phases };
}
` + text.slice(end);
replace('schedulingFailure: null, peer: null };', 'schedulingFailure: null, peer: null, winnerAuthMiddle: null, peerAuthMiddle: null };');
replace("  const wait = async (select, label)", `  // Read-only observation after the actual application request has authenticated
  // and entered the Project queue. Never own/rewrite this intermediate row.
  const queuedSession = async (id, command, waitGraph) => {
    const result = await ctx.db(async client => (await client.query('SELECT row_to_json(s)::text raw,s.xmin::text xmin FROM poms.auth_session s WHERE id=$1::uuid', [id])).rows);
    assert.equal(result.length, 1); const row = { key: [id], raw: result[0].raw, sha256: sha(result[0].raw), xmin: result[0].xmin };
    validSessionRow23(row); return { row, original: ctx.artifact(ctx.next('role-public23-queued-auth') + '.json',
      { kind: 'actual-read-only-session-row-after-public-command-entered-Project-queue', command, waitGraph, row, attribution: 'observation-only-not-owned' }) };
  };
  const wait = async (select, label)`);
replace("observed.firstWaiter = ctx.artifact(`${ctx.next('role-public23-first')}.json`, first);", "observed.firstWaiter = ctx.artifact(`${ctx.next('role-public23-first')}.json`, first);\n      observed.winnerAuthMiddle = await queuedSession(winnerSessionId, freeze, observed.firstWaiter);");
replace("observed.secondWaiter = ctx.artifact(`${ctx.next('role-public23-second')}.json`, second);", "observed.secondWaiter = ctx.artifact(`${ctx.next('role-public23-second')}.json`, second);\n      observed.peerAuthMiddle = await queuedSession(peerSessionId, create, observed.secondWaiter);");
replace("        const peerTouches = exactSessionTouches23(rows(before, 'auth_session'), rows(after, 'auth_session'), winnerSessionId, peerSessionId, actor.id);\n", '');
replace("assert.equal(audits[0].xmin, parent.xmin); assert.equal(JSON.parse(audits[0].raw).operator_id, actor.id);", `assert.equal(audits[0].xmin, parent.xmin); assert.equal(JSON.parse(audits[0].raw).operator_id, actor.id);
        assert(value.winnerAuthMiddle?.original && value.peerAuthMiddle?.original);
        const { peerTouches, phases } = exactSessionTouches23({ authBefore: rows(before, 'auth_session'), authAfter: rows(after, 'auth_session'),
          authMiddle: [value.winnerAuthMiddle.row, value.peerAuthMiddle.row], winnerSessionId, peerSessionId, actorId: actor.id, businessXmin: parent.xmin });`);
replace("exactPeerRawAuthTouchAttributions: attributed,", "exactPeerRawAuthTouchAttributions: attributed,\n          actualQueuedSessionOriginals: [value.winnerAuthMiddle.original, value.peerAuthMiddle.original], exactRawThenManagedSessionPhases: phases,");
const candidate = `proposed/${file}`;
fs.mkdirSync(path.dirname(here + '/' + candidate), { recursive: true }); fs.writeFileSync(here + '/' + candidate, text, { flag: 'wx' });
const products = [{ file, candidate, beforeSHA256, afterSHA256: sha(Buffer.from(text)), applyAfter: 'public-role-race23/runtime-seal23.json' }];
fs.writeFileSync(here + '/products23-02.json', JSON.stringify(products, null, 2) + '\n', { flag: 'wx' });
const seen = new Set(), pending = [file], graph = [];
while (pending.length) {
  const next = pending.pop(); if (seen.has(next)) continue; seen.add(next); assert(next.startsWith('tools/'));
  const bytes = fs.readFileSync(next === file ? here + '/' + candidate : root + '/' + next), target = here + '/checks/' + next;
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' }); graph.push({ file: next, rawBytesSha256: sha(bytes) });
  if (next.endsWith('.mjs')) for (const match of bytes.toString('utf8').matchAll(/(?:from\s*|import\s*\(|new\s+URL\s*\()\s*['"](\.{1,2}\/[^'"\r\n]+\.(?:mjs|json))['"]/g)) pending.push(path.posix.normalize(path.posix.join(path.posix.dirname(next), match[1])));
}
const sourceFiles = ['apps/poms-api-rust/src/auth/service.rs', 'apps/poms-api-rust/src/auth/store.rs', 'apps/poms-api-rust/src/auth/model.rs'];
fs.writeFileSync(here + '/source-pins23-02.json', JSON.stringify(sourceFiles.map(file => ({ file, rawBytesSha256: sha(fs.readFileSync(root + '/' + file)) })), null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(here + '/check-graph23-02.json', JSON.stringify(graph, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ products, actualCheckGraphFiles: graph.length }));
