// Root-only execution candidate; not executed by its author. Built-ins only.
// It can modify exactly one fixed existing source. It never imports Native,
// starts a process, opens a socket, parses business state, or rolls back.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

export const F05 = Object.freeze({
  R: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',
  P: '/home/wangzishi/.local/share/poms-r4ghi/private',
  target: 'tools/rust-r4ghi/business/runtime-admission121.mjs',
  starter: 'tools/rust-r4ghi/runtime-recovery121/root/start-api121.mjs',
  before: '2ebe24bbe42ebdeddb7091647662f9de0efc0306c8b6ae1672a8cead8da3e64a',
  after: '575332154922858204cd0088528001a540606cc3cd52217e39a251b0ebe97993',
  starterSHA: '021cb26bd9bbdf37c416e033afa064c5f8ac5020710a12f418fc2f3da4c1e41a',
});
const SHA = b => crypto.createHash('sha256').update(b).digest('hex');
const compare = (a, b) => Buffer.compare(Buffer.from(a.file), Buffer.from(b.file));
const pin = (file, bytes, rawBytesSha256) => ({ file, bytes, rawBytesSha256 });
const H = '/mnt/e/projects/worktrees/poms-r4h-signals/poms';
export const fixedPins05 = Object.freeze({
  node: Object.freeze(pin('/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node', 125989464, 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12')),
  plan: Object.freeze(pin(H + '/tools/rust-r4ghi/H/implementation/runtime121-finite-promotion-increment03/single-native-promotion-increment03.json', 113541, '503bf8c4c9d2180c0525a17dad542de0eb87c2ca5984e54643ed4e3c7e37ec9f')),
  I05: Object.freeze(pin('/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime-recovery121-code05/sealed-code05/manifest-I121-code05.json', 30822, 'bc82216bc377aba857248a0a55eda61e5fc4b2576564a82ab30891493cbc0a5c')),
  Root8Review: Object.freeze(pin(F05.R + '/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-Root8-API-code-review02/review-Root8-API-code03-step121.json', 14442, '577ef5922ecfe58420b121fab19c0069938c497170e2ad11fd783e496110d8b1')),
  bookends: Object.freeze(pin(F05.R + '/docs/design/rust-r4ghi/continuation-status355.json', 6691, '60c462e9d87786904d532201647343c45fcab80a6e10e89a6d7065fb47372420')),
  promotion: Object.freeze(pin(F05.P + '/runtime121-source-promotion/dabe2f4c-2196-4e29-bab6-77e7ec3e539b/complete.json', 17858, 'af22e36d8d162dd32112ab68ded02f24f1b05a8244ddaeca437866499e5f588a')),
  priorReadback: Object.freeze(pin(F05.R + '/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-source-promotion-actual-readback02/review-actual-source-promotion02.json', 6463, 'ad98a4170d9aaf2089713a0f4ca3ac250676ca9d551b5418b428c23186663b80')),
});
export const inputKeys05 = Object.freeze(['kind', 'protocolVersion', 'nonce', 'plan', 'NativeCodeReview',
  'Root8CodeReview', 'statusBookends', 'operator', 'outputDirectory', 'basePromotion', 'baseReadback']);
export const limits05 = Object.freeze({ copyFixedExistingNativeOnly: true, verifyRootStarterOnly: true,
  preserveFourStateLogBytes: true, preserveOther282CodeFiles: true,
  actualGraphMeasurementOnly: true, overwriteHistoricalEvidence: false,
  nativeOrHelperExecution: false, APIOrProcessControl: false, SQLHTTP: false,
  businessStateWrite: false, businessG3: false, businessG4: false });
const operatorFile05 = F05.R + '/tools/rust-r4ghi/runtime-recovery121/promote-native05-once.mjs';
const outputParent05 = F05.P + '/runtime121-native05-source-promotion';
const lock05 = F05.P + '/runtime121-native05-source-promotion.lock';

function exactKeys(value, keys) {
  assert(value && Object.getPrototypeOf(value) === Object.prototype, 'Plain JSON object required');
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), 'Closed keys');
}
export function pinShape05(p) {
  exactKeys(p, ['file', 'bytes', 'rawBytesSha256']);
  assert(typeof p.file === 'string' && p.file.startsWith('/') && !p.file.includes('\\') &&
    !p.file.includes('//') && !p.file.split('/').some(n => n === '.' || n === '..') && !/[\0\r\n]/.test(p.file));
  assert(Number.isSafeInteger(p.bytes) && p.bytes >= 0);
  assert(/^[a-f0-9]{64}$/.test(p.rawBytesSha256));
  return p;
}
export function inputShape05(v) {
  exactKeys(v, inputKeys05);
  assert.equal(v.kind, 'Root-runtime121-single-Native-source-promotion-input');
  assert.equal(v.protocolVersion, 1);
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v.nonce));
  for (const k of inputKeys05.filter(k => !['kind', 'protocolVersion', 'nonce', 'outputDirectory'].includes(k))) pinShape05(v[k]);
  assert.deepEqual(v.plan, fixedPins05.plan); assert.deepEqual(v.Root8CodeReview, fixedPins05.Root8Review);
  assert.deepEqual(v.statusBookends, fixedPins05.bookends); assert.deepEqual(v.basePromotion, fixedPins05.promotion);
  assert.deepEqual(v.baseReadback, fixedPins05.priorReadback);
  assert.equal(v.operator.file, operatorFile05);
  assert.equal(v.outputDirectory, outputParent05 + '/' + v.nonce);
  return v;
}
export function rootApprovalBody05(v, inputPin) {
  inputShape05(v); pinShape05(inputPin);
  return { kind: 'Root-single-Native-source-promotion-approval121', mode: 'single-native-promotion',
    nonce: v.nonce, approvedInput: inputPin, plan: v.plan, NativeCodeReview: v.NativeCodeReview,
    Root8CodeReview: v.Root8CodeReview, outputDirectory: v.outputDirectory,
    copyTarget: F05.R + '/' + F05.target, beforeSHA256: F05.before, afterSHA256: F05.after, limits: limits05 };
}
export function peerApproval05(peer, v, inputPin, rootApprovalPin) {
  assert.equal(peer.kind, 'non-author-runtime121-single-Native-source-safety-review');
  assert.equal(peer.verdict, 'approved-once-single-Native-FS-promotion');
  assert.equal(peer.reviewerIsAuthor, false);
  assert(typeof peer.author === 'string' && peer.author && typeof peer.reviewer === 'string' && peer.reviewer);
  assert.notEqual(peer.author, peer.reviewer);
  assert.deepEqual(peer.approvedInput, inputPin);
  assert.deepEqual(peer.expectedRootApproval, rootApprovalPin);
  assert.deepEqual(peer.operator, v.operator); assert.deepEqual(peer.limits, limits05);
}
export function cli05(argv) {
  const keys = ['--input', '--input-sha', '--peer-review', '--peer-review-sha', '--root-approval', '--root-approval-sha'];
  assert.equal(argv.length, 13, 'Six named flag/value pairs plus --execute required');
  assert.equal(argv.at(-1), '--execute'); const o = {};
  for (let n = 0; n < 12; n += 2) {
    assert(keys.includes(argv[n]) && !Object.hasOwn(o, argv[n])); o[argv[n]] = argv[n + 1];
  }
  assert.deepEqual(Object.keys(o).sort(), keys.sort());
  for (const k of ['--input-sha', '--peer-review-sha', '--root-approval-sha']) assert(/^[a-f0-9]{64}$/.test(o[k]));
  return o;
}
export function executionEnvironmentShape05(v) {
  exactKeys(v, ['platform', 'nodeVersion', 'execPath', 'uid', 'cwd', 'execArgv', 'NODE_OPTIONS', 'NODE_PATH']);
  assert.equal(v.platform, 'linux'); assert.equal(v.nodeVersion, 'v24.19.0');
  assert.equal(v.execPath, fixedPins05.node.file); assert.equal(v.uid, 1000); assert.equal(v.cwd, F05.R);
  assert.deepEqual(v.execArgv, []);
  for (const k of ['NODE_OPTIONS', 'NODE_PATH']) assert(v[k] === undefined || v[k] === '');
}
function strictBytes(file) {
  pinShape05(pin(file, 0, '0'.repeat(64)));
  const st = fs.lstatSync(file, { bigint: true });
  assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1n, 'Strict regular source/input');
  assert.equal(fs.realpathSync(file), file, 'Canonical realpath source/input');
  const b = fs.readFileSync(file); const after = fs.lstatSync(file, { bigint: true });
  assert.equal(after.dev, st.dev); assert.equal(after.ino, st.ino); assert.equal(after.size, st.size);
  assert.equal(after.mtimeNs, st.mtimeNs); assert.equal(after.ctimeNs, st.ctimeNs); return b;
}
function read(p) { pinShape05(p); const b = strictBytes(p.file); assert.equal(b.length, p.bytes); assert.equal(SHA(b), p.rawBytesSha256); return b; }
const json = p => JSON.parse(read(p).toString('utf8'));
const measuredPin = (file, b = strictBytes(file)) => pin(file, b.length, SHA(b));
function absent(file) {
  try { fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
  throw new Error('Required absent path exists: ' + file);
}
function entryPresent05(file) {
  try { fs.lstatSync(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; }
}
export function errorSummary05(e) {
  const names = ['Error', 'AssertionError', 'TypeError', 'RangeError', 'SyntaxError'];
  return { message: 'Single Native promotion stopped; preserve evidence and do not retry.',
    name: names.includes(e?.name) ? e.name : 'Error',
    code: typeof e?.code === 'string' && /^[A-Z][A-Z0-9_]{0,48}$/.test(e.code) ? e.code : null };
}
function stoppedAPI05() {
  absent(F05.P + '/rust-api121-process.json'); absent(F05.P + '/rust-api121.env');
  for (const epoch of [13, 14, 15]) absent(F05.P + '/business/g2-business' + epoch + '/main01/driver.lock');
  for (const f of ['/proc/net/tcp', '/proc/net/tcp6']) {
    const lines = fs.readFileSync(f, 'utf8').trim().split('\n').slice(1);
    for (const line of lines) {
      const fields = line.trim().split(/\s+/);
      assert(!(fields[3] === '0A' && Number.parseInt(fields[1].split(':').at(-1), 16) === 31441), '31441 must have no listener');
    }
  }
}
function graph05(helper, external) {
  assert.equal(helper.length, 229); assert.equal(external.length, 55);
  const all = [...helper, ...external].sort(compare);
  assert.equal(new Set(all.map(p => p.file)).size, 284);
  const actual = [];
  for (const p of all) {
    exactKeys(p, ['file', 'sha256']);
    assert(typeof p.file === 'string' && path.posix.normalize(p.file) === p.file && !p.file.startsWith('/') && !p.file.includes('\\') && !p.file.split('/').includes('..'));
    const b = strictBytes(F05.R + '/' + p.file); assert.equal(SHA(b), p.sha256);
    actual.push(measuredPin(F05.R + '/' + p.file, b));
  }
  const names = fs.readdirSync(F05.R + '/tools/rust-r4ghi/business', { withFileTypes: true })
    .filter(x => /\.(mjs|json)$/.test(x.name)).map(x => 'tools/rust-r4ghi/business/' + x.name).sort();
  assert.deepEqual(names, helper.map(p => p.file).sort());
  return actual;
}
function wxJSON(file, value) {
  const b = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  fs.writeFileSync(file, b, { flag: 'wx', mode: 0o600 });
  assert(read(measuredPin(file, b)).equals(b)); return measuredPin(file, b);
}
function loadContract05(input, inputPin, peerPin, rootPin) {
  inputShape05(input);
  assert.equal(fileURLToPath(import.meta.url), operatorFile05, 'Only the reviewed exact Root operator path may execute');
  read(input.operator);
  const peer = json(peerPin), root = json(rootPin);
  assert.deepEqual(root, rootApprovalBody05(input, inputPin)); peerApproval05(peer, input, inputPin, rootPin);
  const plan = json(input.plan); assert.equal(plan.copyOperations.length, 1); assert.equal(plan.alreadyChangedRootVerifyOnly.length, 1);
  const op = plan.copyOperations[0];
  assert.equal(op.file, F05.target); assert.equal(op.target, F05.R + '/' + F05.target);
  assert.equal(op.operationForPhysicalPromotion, 'MOD'); assert.equal(op.beforeSHA256, F05.before); assert.equal(op.afterSHA256, F05.after);
  assert.deepEqual(op.componentManifest, fixedPins05.I05); assert.equal(op.productPointer, '/production/1');
  assert.equal(op.originalRegistrationOperation, 'ADD'); assert.equal(op.originalRegistrationBeforeSHA256, null);
  const manifest = json(fixedPins05.I05); assert.equal(manifest.production.length, 9);
  const product = manifest.production[1]; assert.equal(product.file, F05.target); assert.equal(product.beforeSHA256, null);
  assert.equal(product.afterSHA256, F05.after); assert.deepEqual(product.candidate, op.candidate);
  const nativeReview = json(input.NativeCodeReview);
  assert.equal(nativeReview.kind, 'non-author-runtime121-finite-code-step'); assert.equal(nativeReview.verdict, 'approved-bounded-step-only');
  assert.equal(nativeReview.reviewerIsAuthor, false);
  assert(typeof nativeReview.author === 'string' && nativeReview.author && typeof nativeReview.reviewer === 'string' && nativeReview.reviewer);
  assert.notEqual(nativeReview.author, nativeReview.reviewer);
  assert.deepEqual(nativeReview.componentManifest, fixedPins05.I05); assert.equal(nativeReview.entries.length, 9);
  for (const [n, p] of manifest.production.entries()) {
    const e = nativeReview.entries.find(x => x.file === p.file); assert(e);
    assert.equal(e.beforeSHA256, p.beforeSHA256); assert.equal(e.afterSHA256, p.afterSHA256); assert.equal(e.productPointer, '/production/' + n);
    read(p.candidate);
  }
  const rootReview = json(input.Root8CodeReview); assert.equal(rootReview.kind, 'non-author-runtime121-finite-code-step');
  assert.equal(rootReview.verdict, 'approved-bounded-step-only'); assert.equal(rootReview.reviewerIsAuthor, false);
  assert.deepEqual(rootReview.componentManifest, plan.inputs.newRoot8);
  const starter = plan.alreadyChangedRootVerifyOnly[0]; assert.equal(starter.file, F05.starter);
  assert.equal(starter.expectedSHA256, F05.starterSHA); read(starter.candidate);
  const actual = json(input.basePromotion), priorReadback = json(input.baseReadback);
  assert.deepEqual(actual.helperPins, plan.inputs.actualPriorHelper229); assert.deepEqual(actual.externalPins, plan.inputs.actualPriorExternal55);
  assert.deepEqual(priorReadback.actualComplete, input.basePromotion);
  const oldH = json(actual.helperPins), oldE = json(actual.externalPins);
  const beforeH = oldH, beforeE = oldE.map(p => p.file === F05.starter ? { file: p.file, sha256: F05.starterSHA } : p);
  const afterH = oldH.map(p => p.file === F05.target ? { file: p.file, sha256: F05.after } : p), afterE = beforeE;
  assert.equal(oldH.find(p => p.file === F05.target).sha256, F05.before);
  assert.deepEqual(json(plan.expectedOnly.helper229), afterH); assert.deepEqual(json(plan.expectedOnly.external55), afterE);
  const expectedX = [...afterH, ...afterE].map(p => ({ file: F05.R + '/' + p.file, rawBytesSha256: p.sha256 })).sort(compare);
  assert.deepEqual(json(plan.expectedOnly.executionSources284), expectedX);
  const protectedExpected = [...beforeH, ...beforeE].filter(p => ![F05.target, F05.starter].includes(p.file)).sort(compare);
  assert.equal(protectedExpected.length, 282);
  assert.deepEqual(plan.protectedCurrentFiles282.map(p => ({ file: p.file, sha256: p.expectedUnchanged.rawBytesSha256 })).sort(compare), protectedExpected);
  const bookends = json(input.statusBookends).unchangedBookends;
  exactKeys(bookends, ['state13', 'state14', 'state15', 'ownership15']);
  for (const p of Object.values(bookends)) pinShape05(p);
  return { op, beforeH, beforeE, afterH, afterE, bookends };
}
function main05(argv) {
  executionEnvironmentShape05({ platform: process.platform, nodeVersion: process.version,
    execPath: process.execPath, uid: process.getuid?.(), cwd: process.cwd(), execArgv: process.execArgv,
    NODE_OPTIONS: process.env.NODE_OPTIONS, NODE_PATH: process.env.NODE_PATH });
  assert.equal(fs.realpathSync(process.cwd()), F05.R); read(fixedPins05.node);
  const cli = cli05(argv);
  const fromCLI = (file, hash) => { const b = strictBytes(file); assert.equal(SHA(b), hash); return pin(file, b.length, hash); };
  const inputPin = fromCLI(cli['--input'], cli['--input-sha']);
  const peerPin = fromCLI(cli['--peer-review'], cli['--peer-review-sha']);
  const rootPin = fromCLI(cli['--root-approval'], cli['--root-approval-sha']);
  const input = json(inputPin), c = loadContract05(input, inputPin, peerPin, rootPin);
  const invariant = () => {
    stoppedAPI05();
    for (const p of [inputPin, peerPin, rootPin, input.operator, input.plan, input.NativeCodeReview,
      input.Root8CodeReview, input.statusBookends, input.basePromotion, input.baseReadback, fixedPins05.I05, c.op.candidate]) read(p);
    for (const p of Object.values(c.bookends)) read(p);
  };
  invariant(); const before = graph05(c.beforeH, c.beforeE);
  absent(input.outputDirectory); absent(lock05);
  fs.mkdirSync(outputParent05, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(outputParent05), outputParent05);
  const lockFD = fs.openSync(lock05, 'wx', 0o600); let outputCreated = false, phase = 'source-lock-created';
  try {
    fs.writeFileSync(lockFD, JSON.stringify({ nonce: input.nonce, approvedInput: inputPin }) + '\n'); fs.fsyncSync(lockFD);
    fs.mkdirSync(input.outputDirectory, { mode: 0o700 }); outputCreated = true;
    invariant(); graph05(c.beforeH, c.beforeE);
    const target = F05.R + '/' + F05.target, oldBytes = strictBytes(target), oldStat = fs.lstatSync(target);
    assert.equal(SHA(oldBytes), F05.before); const newBytes = read(c.op.candidate); assert.equal(SHA(newBytes), F05.after);
    const preimage = input.outputDirectory + '/before-Native.bin';
    fs.writeFileSync(preimage, oldBytes, { flag: 'wx', mode: 0o600 }); read(measuredPin(preimage, oldBytes));
    phase = 'fresh-Native-preimage-preserved';
    const intent = wxJSON(input.outputDirectory + '/intent.json', { kind: 'Root-single-Native-source-promotion-intent121',
      nonce: input.nonce, input: inputPin, peerReview: peerPin, RootApproval: rootPin,
      target, before: measuredPin(preimage, oldBytes), afterCandidate: c.op.candidate,
      sourcePromotionOnly: true, APIOrNativeAuthority: false });
    const stage = F05.R + '/tools/rust-r4ghi/business/.runtime-admission121.' + input.nonce + '.tmp';
    absent(stage); const fd = fs.openSync(stage, 'wx', oldStat.mode & 0o777);
    try { fs.writeFileSync(fd, newBytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    assert.equal(SHA(strictBytes(stage)), F05.after);
    phase = 'stage-verified';
    invariant(); graph05(c.beforeH, c.beforeE); assert.equal(SHA(strictBytes(target)), F05.before);
    phase = 'rename-attempt';
    fs.renameSync(stage, target); // Existing fixed MOD only. No ADD/fallback/rollback branch.
    phase = 'post-rename-awaiting-full-readback';
    invariant(); const after = graph05(c.afterH, c.afterE);
    const helperPin = wxJSON(input.outputDirectory + '/actual-helper-pins229.json', c.afterH);
    const externalPin = wxJSON(input.outputDirectory + '/actual-external-pins55.json', c.afterE);
    const executionPin = wxJSON(input.outputDirectory + '/actual-execution-sources284.json', after);
    invariant(); graph05(c.afterH, c.afterE);
    const complete = wxJSON(input.outputDirectory + '/complete.json', {
      kind: 'actual-single-Native-source-promotion-complete121', input: inputPin, peerReview: peerPin,
      RootApproval: rootPin, intent, copiedExactly: [{ file: F05.target, beforeSHA256: F05.before, afterSHA256: F05.after }],
      RootStarterVerifiedOnly: true, other282Unchanged: true, beforeCodeCount: before.length,
      helperPins: helperPin, externalPins: externalPin, executionSources: executionPin,
      fourStateLogBytesUnchanged: true, API121AndEnvAbsent: true, port31441NoListener: true,
      APIStarted: false, nativeAuthorityGranted: false, SQLHTTP: false, businessStateWrite: false, G3: false, G4: false,
    });
    phase = 'complete-written-and-read-back';
    // Until complete/readback succeeds, any failure keeps the lock. A later
    // outer/stdio ambiguity must still stop: the unique output directory/intent
    // is never accepted for reuse, even after this successful lock release.
    fs.closeSync(lockFD); fs.unlinkSync(lock05); return complete;
  } catch (e) {
    if (outputCreated) {
      try { wxJSON(input.outputDirectory + '/partial.json', { kind: 'single-Native-promotion-failed-preserve121',
        input: inputPin, phase, error: errorSummary05(e), lockPreserved: entryPresent05(lock05),
        automaticRollback: false, automaticRetry: false, effectStateMustBeReadBack: true }); } catch { /* Keep original failure and all surviving evidence. */ }
    }
    try { fs.closeSync(lockFD); } catch { /* No original error replacement. */ }
    throw e;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length === 3 && process.argv[2] === '--help') {
    console.log('Root-only: --input <absolute> --input-sha <sha> --peer-review <absolute> --peer-review-sha <sha> --root-approval <absolute> --root-approval-sha <sha> --execute');
  } else {
    try { console.log(JSON.stringify(main05(process.argv.slice(2)))); }
    catch (e) { console.error(JSON.stringify({ kind: 'single-Native-promotion-stop121', error: errorSummary05(e) })); process.exitCode = 1; }
  }
}
