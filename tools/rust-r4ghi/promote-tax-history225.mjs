// Exact additional helper delta before119 publication. Never rewrites220/221/223.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', H = '/mnt/e/projects/worktrees/poms-r4h-signals/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private', D = P + '/business/g2-business13/main01', O = D + '/tool119-tax225';
const sha = v => createHash('sha256').update(v).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.deepEqual(process.argv.slice(2), ['--execute']); assert(!fs.existsSync(O));
const read = file => { const s = fs.lstatSync(file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1); assert.equal(fs.realpathSync(file), path.resolve(file)); return fs.readFileSync(file); };
const pin = (file, expected) => { const rawBytesSha256 = sha(read(file)); if (expected) assert.equal(rawBytesSha256, expected); return { file, rawBytesSha256 }; };
const json = p => { pin(p.file, p.rawBytesSha256); return JSON.parse(read(p.file)); };
const write = (file, raw) => { fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 }); fs.writeFileSync(file, raw, { flag: 'wx', mode: file.startsWith(P + '/') ? 0o600 : 0o644 }); assert.deepEqual(read(file), raw); return pin(file); };
const nonce = randomUUID(), lock = D + '/driver.lock'; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'reviewed-Tax-history-H1-amendment225' }) + '\n', { flag: 'wx', mode: 0o600 });
let changed = false;
try {
  const stateRaw = read(D + '/state.json'), state = JSON.parse(stateRaw); assert.equal(sha(stateRaw), '6ab38a685881557707d48c41270e891a3b5773abeb73c2156a9757d8bcf1f358'); assert(!state.toolAdmission119);
  const oldH1Pin = pin(D + '/tool119-promotion220/H1-actual220.json', '215178abdf1d385081c090d6d4fbea732760b35968c9d0a69d060f353bd0fa45'), oldH1 = json(oldH1Pin);
  const graph = () => fs.readdirSync(R + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).sort().map(n => ({ file: 'tools/rust-r4ghi/business/' + n, sha256: sha(read(R + '/tools/rust-r4ghi/business/' + n)) })); assert.deepEqual(graph(), oldH1);
  const sources = json(pin(P + '/source13-preparation193/sourcePins.json', 'e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c'));
  for (const p of sources) assert.equal(sha(read(R + '/' + p.file)), p.sha256);
  const review = pin(R + '/tools/rust-r4ghi/independent/review05/tax-history-fix-review124/review124.json', 'afebd58ce7860d003ca65146b2c646a44a73a97f24e74030d21084f74caf6ec5');
  const relative = 'tools/rust-r4ghi/H/implementation/support-patches/tax-historical-before125', manifestName = 'manifest125-code01.json';
  const manifestRaw = read(H + '/' + relative + '/' + manifestName); assert.equal(sha(manifestRaw), '72ffefeb831cfedaf071d7e926351010114cbf3f7efdfad9753ec4c3539208a6'); const manifest = JSON.parse(manifestRaw);
  const copy = [];
  for (const entry of [...manifest.files, ...manifest.bases, manifest.scope]) { const raw = read(H + '/' + relative + '/' + entry.file); assert.equal(sha(raw), entry.rawBytesSha256); copy.push(write(R + '/' + relative + '/' + entry.file, raw)); }
  const manifestPin = write(R + '/' + relative + '/' + manifestName, manifestRaw), product = manifest.products[0]; assert.equal(manifest.products.length, 1);
  assert.equal(product.file, 'tools/rust-r4ghi/business/tax13-semantics.mjs'); assert.equal(sha(read(R + '/' + product.file)), product.beforeSHA256);
  const candidate = read(R + '/' + relative + '/' + product.candidate); assert.equal(sha(candidate), product.afterSHA256);
  const oldPlanPin = pin(D + '/tool119-plan221/plan119-221.json', 'f177e198ebe9ac7dbac8bc442d41d88894cbefc5938e7bb5acc39d951ac837b1'); const oldPlan = json(oldPlanPin);
  const expectedH1 = oldH1.map(p => p.file === product.file ? { ...p, sha256: product.afterSHA256 } : p); assert.equal(expectedH1.length, 198);
  const authorization = { kind: 'Root-frozen-tool119-H1-Tax-history-amendment225', G2Authorized: true, scopedOperations: 32,
    priorG2: pin(R + '/docs/design/rust-r4ghi/tool119-g2-freeze220.json'), originalH0Retained: true,
    previousH1: oldH1Pin, previousPlan: oldPlanPin, previousInspection: pin(P + '/tool119-223-inspect/command223.json', 'c4ea74697fa98c6be1494d923b5203e4c0f0af852cf740a875c884fcbf07fe92'),
    priorH1WasNotAdmitted: true, exactAdditionalDelta: manifestPin, independentReview: review,
    correction: 'Tax historical-before reads use the exact successful HTTP/ledger/ownership update bridge; ordinary/global/after ownership remains strict',
    source416AndAPI136AndM98Unchanged: true, actual119Published: false, G3Certified: false, G4Certified: false };
  const authorizationPin = write(R + '/docs/design/rust-r4ghi/tool119-tax-g2-freeze225.json', Buffer.from(JSON.stringify(authorization, null, 2) + '\n'));
  fs.writeFileSync(R + '/' + product.file, candidate); changed = true; assert.deepEqual(graph(), expectedH1);
  for (const p of sources) assert.equal(sha(read(R + '/' + p.file)), p.sha256); assert.deepEqual(read(D + '/state.json'), stateRaw);
  const actualH1 = write(O + '/H1-actual225.json', Buffer.from(JSON.stringify(expectedH1, null, 2) + '\n'));
  const plan = { ...oldPlan, H1: actualH1, deltaManifests: [...oldPlan.deltaManifests, { manifest: manifestPin, review }], independentReview: review };
  const planPin = write(O + '/plan119-225.json', Buffer.from(JSON.stringify(plan, null, 2) + '\n'));
  const receipt = write(O + '/receipt225.json', Buffer.from(JSON.stringify({ kind: 'actual-reviewed-Tax-history-helper-amendment-and-new-unadmitted-H1-plan225', authorization: authorizationPin, manifest: manifestPin, review,
    previousH1: oldH1Pin, previousPlan: oldPlanPin, changedFile: product.file, beforeSHA256: product.beforeSHA256, afterSHA256: product.afterSHA256,
    actualH1, actualHelperCount: 198, plan: planPin, finalDeltaManifests: plan.deltaManifests, exactActualGraphVerified: true,
    source416AndAPI136AndM98Unchanged: true, originalStateAndCounterUnchanged: true, actual119Published: false, SQLOrHTTPExecuted: false, G3Certified: false, G4Certified: false }, null, 2) + '\n'));
  console.log(JSON.stringify({ amendment: receipt, actualH1, actualPlan: planPin, helperCount: 198, source416AndOriginalStateUnchanged: true, actual119Published: false }));
} catch (error) { fs.mkdirSync(O, { recursive: true, mode: 0o700 }); const partial = write(O + '/partial225.json', Buffer.from(JSON.stringify({ name: error.name, message: error.message, stack: error.stack, changed, noAutomaticRollbackOrRetry: true }, null, 2) + '\n')); console.error(JSON.stringify({ completed: false, partial, noBlindRetry: true })); process.exitCode = 1; }
finally { const owner = JSON.parse(read(lock)); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); fs.unlinkSync(lock); }
