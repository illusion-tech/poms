import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { RESTART1351 as F, expectedLauncherEnvironment1351, launcherEnvironmentBytes1351, parseInitialEnvironment1351, assertCandidateSourcePins1351, assertExactSnapshot1351, validateContainerRestart1351, assertRestartBindingFields1351, assertRestartAuthReceipt1351, processReference1351, effectiveProcessBinding1351, assertRestartUIBinding1351, quarantineProcessRestartForEpochChange1351 } from './same-source-process1351.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
test('actual old full environ hash is reproduced by the pinned launcher; new edition only selects new identical input file', () => {
  const old = expectedLauncherEnvironment1351('/home/wangzishi/.local/share/poms-r4ghi/private', '135'), next = expectedLauncherEnvironment1351('/home/wangzishi/.local/share/poms-r4ghi/private', '1351');
  assert.equal(sha(launcherEnvironmentBytes1351(old)), F.oldEnvironmentSHA256); assert.deepEqual(parseInitialEnvironment1351(launcherEnvironmentBytes1351(next)), next);
  const { POMS_ENV_FILE: a, ...x } = old, { POMS_ENV_FILE: b, ...y } = next; assert.deepEqual(x, y); assert.notEqual(a, b); assert.throws(() => parseInitialEnvironment1351(Buffer.from('A=one\0A=two\0')));
});
function files() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poms-process1351-pure-')); const pin = (name, value, raw = false) => { const file = path.join(dir, name), bytes = raw ? Buffer.from(value) : Buffer.from(JSON.stringify(value)); fs.writeFileSync(file, bytes); return { file, rawBytesSha256: sha(bytes) }; }; return { dir, pin, close() { const actual = fs.realpathSync(dir); assert.equal(path.dirname(actual), fs.realpathSync(os.tmpdir())); assert(path.basename(actual).startsWith('poms-process1351-pure-')); fs.rmSync(actual, { recursive: true }); } }; }
test('same-source snapshot proof checks all139 tables, row xmin, full meta/sequences and objects', () => {
  const f = files(); try { const raw = JSON.stringify({ id: 'actual-fixture-only' }), row = { key: ['a'], raw, sha256: sha(raw), xmin: '7' }, empty = f.pin('empty.jsonl', '', true), data = f.pin('data.jsonl', JSON.stringify(row) + '\n', true);
    const tables = Object.fromEntries(Array.from({ length: 139 }, (_, i) => ['t' + i, i === 0 ? data : empty])), meta = { normative: { oid: 'same' }, sequences: [{ value: '97' }] };
    const before = { marker: 'unit', databases: { poms_r4ghi_native: { meta, tables }, poms_r4ghi_rust: { meta, tables } }, objects: { poms_r4ghi_native: { files: [] }, poms_r4ghi_rust: { files: [] } } }; assertExactSnapshot1351(before, structuredClone(before));
    for (const change of [s => { s.databases.poms_r4ghi_native.meta.normative.oid = 'different'; }, s => { s.objects.poms_r4ghi_rust.files.push('other'); }, s => { s.databases.poms_r4ghi_rust.tables.t0 = f.pin('changed.jsonl', JSON.stringify({ ...row, xmin: '8' }) + '\n', true); }, s => { delete s.databases.poms_r4ghi_rust.tables.t138; }]) { const after = structuredClone(before); change(after); assert.throws(() => assertExactSnapshot1351(before, after)); }
  } finally { f.close(); }
});
test('container restart accepts same immutable ID/volume/config and refuses drift without printing private values', () => {
  const f = files(); try { const before = { Id: 'same-id', Name: 'poms-r4ghi-pg15', Image: 'same-image', Config: { Labels: { namespace: 'same' }, Env: ['PRIVATE=unit-secret-never-print'] }, Mounts: [{ Name: 'poms-r4ghi-pg15-data', Type: 'volume' }], State: { Running: false } }, after = structuredClone(before); after.State.Running = true;
    const receipt = { kind: 'actual-existing-owned-container-restarted147', containerId: 'same-id', containerName: before.Name, volume: 'poms-r4ghi-pg15-data', originalVolumeKept: true, databaseRestoreExecuted: false, oldAPI135StillStopped: true, noAPIStarted: true, PGReadiness: true, before: f.pin('before.json', [before]), after: f.pin('after.json', [after]) }, provision = { containerId: 'same-id', container: before.Name, volume: receipt.volume };
    assert.equal(validateContainerRestart1351(receipt, provision), true); const changed = structuredClone(after); changed.Config.Env.push('BAD=another-unit-secret'); receipt.after = f.pin('bad.json', [changed]); try { validateContainerRestart1351(receipt, provision); assert.fail('drift accepted'); } catch (error) { assert(!error.message.includes('unit-secret')); }
    assert.throws(() => validateContainerRestart1351({ ...receipt, databaseRestoreExecuted: true }, provision)); assert.throws(() => validateContainerRestart1351({ ...receipt, containerId: 'new' }, provision));
  } finally { f.close(); }
});
function links() { const pin = name => ({ file: '/unit/' + name, rawBytesSha256: sha(name) }), registry = pin('registry'), process = pin('1351-process'), candidate = pin('candidate'); return { reference: { registry, apiProcess: process, generation: 'API1351' }, candidate, binding: { processRestart1351: registry, apiProcess: process, candidateReceipt: candidate }, actors: { processRestart1351: registry, apiProcess: process, actors: [{ key: 'manager', id: 'same-person' }] }, index: { kind: 'actual-recorded-current-auth-session-index16', processRestart1351: registry, apiProcess: process } }; }
test('newPID cannot be combined with old plan/candidate/actor manifest/index despite identical roles and identity', () => {
  const f = links(); assertRestartBindingFields1351(f.reference, f.candidate, f.binding, f.actors, f.index);
  for (const mutate of [x => { delete x.binding.processRestart1351; }, x => { x.binding.apiProcess = { ...x.binding.apiProcess, file: '/old135' }; }, x => { x.binding.candidateReceipt = { ...x.candidate, rawBytesSha256: sha('old') }; }, x => { delete x.actors.processRestart1351; }, x => { x.index.apiProcess = { ...x.index.apiProcess, file: '/old135' }; }]) { const bad = structuredClone(f); mutate(bad); assert.throws(() => assertRestartBindingFields1351(bad.reference, bad.candidate, bad.binding, bad.actors, bad.index)); }
});
test('actual post-admission AuthCurrent200 with exact physical pair is mandatory, not an oldHTTP permission list', () => {
  const { reference } = links(), good = { operationId: 'AuthController_getCurrentAuthSession', actorKey: 'manager', status: 200, processBinding1351: reference }; assertRestartAuthReceipt1351(good, 'manager', reference, 7127, '/unit/007200-http.json');
  for (const [bad, file] of [[{ ...good, processBinding1351: undefined }, '/unit/007200-http.json'], [{ ...good, status: 401 }, '/unit/007200-http.json'], [good, '/unit/007000-http.json'], [{ ...good, actorKey: 'other' }, '/unit/007200-http.json']]) assert.throws(() => assertRestartAuthReceipt1351(bad, 'manager', reference, 7127, file));
});
test('old no-overlay historical branch stays unchanged and performs no restart file IO', () => { const original = { consumer: { apiProcess: { file: 'old' } } }, ctx = { state: {} }; assert.equal(effectiveProcessBinding1351(ctx, original), original.consumer.apiProcess); assert.equal(processReference1351(ctx), null); assert.equal(assertRestartUIBinding1351(ctx, {}, {}), null); });
test('newSource13 must explicitly archive active12 overlay and cannot silently keep it as process authority', () => {
  const old = { epoch: F.epoch, sourcePins: [{ old: true }], apiProcess: { file: '1351', record: { pid: 10 } }, processRestart1351: { registry: { file: 'proof', rawBytesSha256: sha('proof') } }, fixtures: { actual: 'unchanged' }, processRestartHistory1351: [{ prior: true }] }, before = structuredClone(old), next = { ...structuredClone(old), epoch: 'future13', sourcePins: [{ next: true }], apiProcess: { file: 'new136' } };
  quarantineProcessRestartForEpochChange1351(next, old, { file: 'retained-old-state' }); assert.deepEqual(old, before); assert(!next.processRestart1351); assert.equal(next.processRestartHistory1351.length, 2); assert.deepEqual(next.processRestartHistory1351[1].activeOverlay, old.processRestart1351); assert.deepEqual(next.fixtures, old.fixtures);
  assert.throws(() => quarantineProcessRestartForEpochChange1351(structuredClone(old), old, {}));
});
test('new candidate is H16 sourceManifest-compatible with the exact full source array, count and digest', () => {
  const pins = [{ file: 'apps/poms-api-rust/src/lib.rs', sha256: sha('fixture') }], candidate = { sourcePins: pins, sourceCount: pins.length, sourcePinsSHA256: sha(JSON.stringify(pins)), epoch: F.epoch, run: F.run, tables: 139, migrations: 97 };
  assertCandidateSourcePins1351(candidate, pins); const source = structuredClone(candidate); assert.deepEqual(source.sourcePins, candidate.sourcePins); assert.equal(source.sourcePinsSHA256, sha(JSON.stringify(source.sourcePins)));
  for (const mutate of [c => { delete c.sourcePins; }, c => { c.sourcePins[0].sha256 = sha('different-array'); }, c => { c.sourcePins = [{ sha256: pins[0].sha256, file: pins[0].file }]; }, c => { c.sourceCount = 406; }, c => { c.sourcePinsSHA256 = sha('wrong-label'); }]) { const bad = structuredClone(candidate); mutate(bad); assert.throws(() => assertCandidateSourcePins1351(bad, pins)); }
});
