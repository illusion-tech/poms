// Root exact reviewed tool successor. Old H0/source/build/schema originals stay.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D = P + '/business/g2-business13/main01', O = D + '/tool119-promotion220';
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.deepEqual(process.argv.slice(2), ['--execute']); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH); assert(!fs.existsSync(O));
const read = file => { const st = fs.lstatSync(file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1); assert.equal(fs.realpathSync(file), path.resolve(file)); return fs.readFileSync(file); };
const pin = (file, expected) => { const raw = read(file); if (expected) assert.equal(sha(raw), expected); return { file, rawBytesSha256: sha(raw) }; };
const json = p => JSON.parse(read(p.file));
const write = (file, raw) => { fs.writeFileSync(file, raw, { flag: 'wx', mode: file.startsWith(P + '/') ? 0o600 : 0o644 }); return pin(file); };
const nonce = randomUUID(), lock = D + '/driver.lock'; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'exact-reviewed-H1-promotion220' }) + '\n', { flag: 'wx', mode: 0o600 });
const changed = [];
try {
  const stateRaw = read(D + '/state.json'); assert.equal(sha(stateRaw), '6ab38a685881557707d48c41270e891a3b5773abeb73c2156a9757d8bcf1f358');
  const preparePin = pin(D + '/tool119-h1-218/preparation218.json', '59958c6a9cc5e0c9eeced4b1d3f6c7ca4bf3faaccc43e96a5f1bc2d8b4de54a5'), prepare = json(preparePin);
  const review = pin(R + '/tools/rust-r4ghi/independent/review05/resource-tool119-review120/review120-final.json', '3bc0143cc962a87a258b3e9404cb45a7ed96188ef38b1b597aecafc94baa1531');
  const periodReview = pin(R + '/tools/rust-r4ghi/independent/review05/period205-review119/review119-04.json', '2b24ff0915d461cee09c5d5c4d5dc3fd26d66e1c3b2de3e5acb7e6536e243171');
  const forecast = json(pin(prepare.H1.file, '215178abdf1d385081c090d6d4fbea732760b35968c9d0a69d060f353bd0fa45'));
  const h0pin = pin(P + '/source13-preparation183/helperH0.json', 'e65db96998f5dc15ed406bf5d30b2a1bfa95c82affb448b625ca3295227d0459'), h0 = json(h0pin);
  const sourcePin = pin(P + '/source13-preparation193/sourcePins.json', 'e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c'), sources = json(sourcePin);
  const graph = () => fs.readdirSync(R + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).sort().map(n => ({ file: 'tools/rust-r4ghi/business/' + n, sha256: sha(read(R + '/tools/rust-r4ghi/business/' + n)) }));
  assert.deepEqual(graph(), h0); assert.equal(forecast.length, 198); assert.equal(prepare.targets.length, 10);
  for (const source of sources) assert.equal(sha(read(R + '/' + source.file)), source.sha256);
  for (const target of prepare.targets) { pin(target.candidate.file, target.candidate.rawBytesSha256); if (target.beforeSHA256 === null) assert(!fs.existsSync(R + '/' + target.file)); else assert.equal(sha(read(R + '/' + target.file)), target.beforeSHA256); }
  const preserved = json(pin(P + '/source13-tool119-h0-215/receipt215.json', 'ce85e8a8f3ac77b779d064ecb56df8c57f75d1d995a5fc83a30df84306f0a9f5'));
  for (const file of preserved.files) pin(file.preserved.file, file.preserved.rawBytesSha256);
  fs.mkdirSync(O, { mode: 0o700 });
  const authorization = { kind: 'Root-frozen-existing-G1-tool-corrective119-220', G2Authorized: true, scopedOperations: 32,
    sourcePins: sourcePin, sourceCount: 416, sourcePinsSHA256: '5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e',
    originalG2: pin(R + '/docs/design/rust-r4ghi/source13-g2-freeze136.json', 'b15582a0d32e60f9f7f462c9ce3db7ef1d90431b5edfb22a0c12b430c567328d'),
    originalH0: h0pin, originalHelperCount: 195, nextH1: prepare.H1, nextHelperCount: 198, exactDeltaManifests: prepare.deltaManifests, independentReview: review, periodToolReview: periodReview,
    correction: 'exact58 resource producer12 and project HTTP births10 are separately proved; explicit H1 sidecar+B2 preserves original R3/schema108/B0/B1 and real product/build identity',
    originalH0RawPreserved: true, ordinaryH1DriverRequiresPublished119: true, publicRouteOrDTOChanges: false, backendOrMigrationChanged: false,
    actual119Published: false, actualB2Produced: false, G3Certified: false, G4Certified: false };
  const authorizationFile = R + '/docs/design/rust-r4ghi/tool119-g2-freeze220.json', authorizationPin = write(authorizationFile, Buffer.from(JSON.stringify(authorization, null, 2) + '\n'));
  for (const target of prepare.targets) {
    const file = R + '/' + target.file, bytes = read(target.candidate.file);
    fs.writeFileSync(file, bytes, { flag: target.beforeSHA256 === null ? 'wx' : 'w', mode: 0o644 }); assert.equal(sha(read(file)), target.candidate.rawBytesSha256); changed.push(target);
  }
  assert.deepEqual(graph(), forecast); for (const source of sources) assert.equal(sha(read(R + '/' + source.file)), source.sha256); assert.deepEqual(read(D + '/state.json'), stateRaw);
  const actualH1 = write(O + '/H1-actual220.json', read(prepare.H1.file));
  const result = write(O + '/receipt220.json', Buffer.from(JSON.stringify({ kind: 'actual-exact-reviewed-H1-runtime-promotion220', authorization: authorizationPin, preparation: preparePin,
    review, periodReview, changed, actualH1, actualHelperCount: 198, actualH1EqualsForecast: true, source416Unchanged: true, originalH0RawPreserved: true,
    originalConsumerStateAndCounterUnchanged: true, backendAPIOrM98Reexecuted: false, actual119Published: false, SQLOrHTTPExecuted: false, G3Certified: false, G4Certified: false }, null, 2) + '\n'));
  console.log(JSON.stringify({ promotion: result, actualH1, actualHelperCount: 198, source416Unchanged: true, originalStateUnchanged: true, actual119Published: false }));
} catch (error) {
  let partial = null; if (fs.existsSync(O)) partial = write(O + '/partial220.json', Buffer.from(JSON.stringify({ name: error.name, message: error.message, stack: error.stack, changed, noAutomaticRollbackOrRetry: true }, null, 2) + '\n'));
  console.error(JSON.stringify({ completed: false, partial, noBlindRetry: true })); process.exitCode = 1;
} finally { const owner = JSON.parse(read(lock)); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); fs.unlinkSync(lock); }
