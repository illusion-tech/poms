// Preserve every original H0 leaf before an explicitly reviewed tool successor.
// FS only; no createContext, SQL, HTTP, counter or process action.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D = P + '/business/g2-business13/main01', O = P + '/source13-tool119-h0-215';
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
const read = file => { const st = fs.lstatSync(file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1); assert.equal(fs.realpathSync(file), path.resolve(file)); return fs.readFileSync(file); };
const pin = (file, expected) => { const raw = read(file); if (expected) assert.equal(sha(raw), expected); return { file, bytes: raw.length, rawBytesSha256: sha(raw) }; };
const write = (file, raw) => { fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 }); fs.writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); assert.deepEqual(read(file), raw); return pin(file); };
assert(!fs.existsSync(O)); const nonce = randomUUID(), lock = D + '/driver.lock';
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'FS-only-retain-Source13-H0-215' }) + '\n', { flag: 'wx', mode: 0o600 });
try {
  const stateRaw = read(D + '/state.json'), state = JSON.parse(stateRaw);
  assert.equal(state.epoch, 'g2-business13'); assert.equal(state.run, 'main01'); assert.equal(state.marker, '0ca66699-053b-4f40-ad5c-82fed4cf1a6f');
  assert(!state.toolAdmission119 && !state.activeFault && !state.blockedObservation && !state.cleaned && !state.cleanupPlan);
  assert(!state.taxContinuation13?.pendingMain && !state.taxContinuation13?.pendingTaxTrial && !state.taxContinuation13?.normalTaxPending);
  const sourcePin = pin(P + '/source13-preparation193/sourcePins.json', 'e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c');
  const helperPin = pin(P + '/source13-preparation183/helperH0.json', 'e65db96998f5dc15ed406bf5d30b2a1bfa95c82affb448b625ca3295227d0459');
  const sources = JSON.parse(read(sourcePin.file)), helpers = JSON.parse(read(helperPin.file));
  assert.equal(sources.length, 416); assert.equal(helpers.length, 195); assert.deepEqual(state.sourcePins, sources);
  assert.equal(sha(JSON.stringify(sources)), '5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e');
  const actualHelpers = fs.readdirSync(R + '/tools/rust-r4ghi/business').filter(name => /\.(mjs|json)$/.test(name)).sort().map(name => ({ file: 'tools/rust-r4ghi/business/' + name, sha256: sha(read(R + '/tools/rust-r4ghi/business/' + name)) }));
  assert.deepEqual(actualHelpers, helpers);
  for (const item of sources) assert.equal(sha(read(R + '/' + item.file)), item.sha256);
  const R3 = pin(D + '/000004-consumer-admission108-registry.json', '23cc54f891fb5200a1bad30083f75805e27a1d046096705381034ff32493971c');
  assert.equal(state.consumerAdmission54.registry.file, R3.file); assert.equal(state.consumerAdmission54.registry.rawBytesSha256, R3.rawBytesSha256);
  const files = helpers.map(item => { const before = read(R + '/' + item.file); assert.equal(sha(before), item.sha256); return { file: item.file, original: { file: R + '/' + item.file, rawBytesSha256: item.sha256 }, preserved: write(O + '/helpers/' + item.file, before) }; });
  const beforeState = write(O + '/consumer-state-before119.json', stateRaw);
  const record = { kind: 'actual-Source13-original-H0-preserved-before-explicit-tool119', sourcePins: sourcePin, sourceCount: 416,
    sourcePinsSHA256: sha(JSON.stringify(sources)), originalHelperH0: helperPin, originalHelperCount: 195, files, beforeState,
    bootstrapB0: pin(D + '/B0-Source13-bootstrap.json', '11530fcd47ee59f1929832b28c03fa022021cff9f0a18d3b7f95d761abd7acf2'), registryR3: R3,
    admittedB1: pin(D + '/B1-Source13-admitted.json', '4c4ff2dc98e7c604470b9e82e9dd807f5cc06ac4a886125177d57e66527d6ebd'),
    actualAPIProcess: pin(P + '/rust-api136-process.json', '0b5817a0f32f4ad12fce36a4035c59c06d852611f65891dec349e6eccf505f6f'),
    originalStateCounterUnchanged: true, originalSource416AndHelper195Unchanged: true, SQLOrHTTPExecuted: false, H1Admitted: false, G3Certified: false, G4Certified: false };
  const receipt = write(O + '/receipt215.json', Buffer.from(JSON.stringify(record, null, 2) + '\n'));
  assert.deepEqual(read(D + '/state.json'), stateRaw);
  for (const item of [...sources, ...helpers]) assert.equal(sha(read(R + '/' + item.file)), item.sha256);
  console.log(JSON.stringify({ receipt, beforeState, preservedHelperFiles: files.length, source416AndH0AndOriginalStateUnchanged: true, SQLOrHTTPExecuted: false, H1Admitted: false }));
} finally { const owner = JSON.parse(read(lock)); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); fs.unlinkSync(lock); }
