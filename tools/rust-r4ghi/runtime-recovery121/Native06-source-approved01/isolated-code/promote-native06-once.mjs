// Root-only execution candidate; not executed by its author. Built-ins only.
// It can modify exactly one fixed existing source. It never imports Native,
// starts a process, opens a socket, parses business state, or rolls back.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

export const F06 = Object.freeze({
  R: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',
  P: '/home/wangzishi/.local/share/poms-r4ghi/private',
  target: 'tools/rust-r4ghi/business/runtime-admission121.mjs',
  starter: 'tools/rust-r4ghi/runtime-recovery121/root/start-api121.mjs',
  before: '575332154922858204cd0088528001a540606cc3cd52217e39a251b0ebe97993',
  after: 'ef958a654e517cf417fe39c21f4deaadcb942aab69bf3a51602e6aed92636f38',
  starterSHA: '021cb26bd9bbdf37c416e033afa064c5f8ac5020710a12f418fc2f3da4c1e41a',
});
const SHA = b => crypto.createHash('sha256').update(b).digest('hex');
const compare = (a, b) => Buffer.compare(Buffer.from(a.file), Buffer.from(b.file));
const pin = (file, bytes, rawBytesSha256) => ({ file, bytes, rawBytesSha256 });
const H = '/mnt/e/projects/worktrees/poms-r4h-signals/poms';
export const fixedPins06 = Object.freeze({
  node: Object.freeze(pin("/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node", 125989464, "bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12")),
  plan: Object.freeze(pin("/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/Native06-source-candidate01/single-native06-plan.json", 106465, "4313235171208833a90bdd0f94927b48af6590f80b6606ae980bf7b620253ebe")),
  I06: Object.freeze(pin("/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime-recovery121-code06/sealed-code06/manifest-I121-code06.json", 33419, "a3ea6d6ab4a656acac615447613a648e3a19a17f0f8bbe23771754ae4e158443")),
  Root8Review: Object.freeze(pin("/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-Root8-API-code-review02/review-Root8-API-code03-step121.json", 14442, "577ef5922ecfe58420b121fab19c0069938c497170e2ad11fd783e496110d8b1")),
  bookends: Object.freeze(pin("/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/continuation-status355.json", 6691, "60c462e9d87786904d532201647343c45fcab80a6e10e89a6d7065fb47372420")),
  promotion: Object.freeze(pin("/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-native05-source-promotion/fc2b594f-e5a6-45af-b7bb-b9542c652cef/complete.json", 2753, "2d20bbc2aa3487c6d3287cf5db533a6651f4740c7e8f6fcb0d75173cfa3b1269")),
  priorReadback: Object.freeze(pin("/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-single-Native05-actual-readback01/review-actual-single-Native05-source.json", 7467, "db3574f7fb5bf36fbbbda4c0b4310399434907e3be5ce11848c0f57e91bebc7d")),
});
export const inputKeys06 = Object.freeze(['kind', 'protocolVersion', 'nonce', 'plan', 'NativeCodeReview',
  'Root8CodeReview', 'statusBookends', 'operator', 'outputDirectory', 'basePromotion', 'baseReadback']);
export const limits06 = Object.freeze({ copyFixedExistingNativeOnly: true, verifyRootStarterOnly: true,
  preserveFourStateLogBytes: true, preserveOther282CodeFiles: true,
  actualGraphMeasurementOnly: true, overwriteHistoricalEvidence: false,
  nativeOrHelperExecution: false, APIOrProcessControl: false, SQLHTTP: false,
  businessStateWrite: false, businessG3: false, businessG4: false });
const operatorFile06 = F06.R + '/tools/rust-r4ghi/runtime-recovery121/promote-native06-once.mjs';
const outputParent06 = F06.P + '/runtime121-native06-source-promotion';
const lock06 = F06.P + '/runtime121-native06-source-promotion.lock';

function exactKeys(value, keys) {
  assert(value && Object.getPrototypeOf(value) === Object.prototype, 'Plain JSON object required');
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), 'Closed keys');
}
export function pinShape06(p) {
  exactKeys(p, ['file', 'bytes', 'rawBytesSha256']);
  assert(typeof p.file === 'string' && p.file.startsWith('/') && !p.file.includes('\\') &&
    !p.file.includes('//') && !p.file.split('/').some(n => n === '.' || n === '..') && !/[\0\r\n]/.test(p.file));
  assert(Number.isSafeInteger(p.bytes) && p.bytes >= 0);
  assert(/^[a-f0-9]{64}$/.test(p.rawBytesSha256));
  return p;
}
export function inputShape06(v) {
  exactKeys(v, inputKeys06);
  assert.equal(v.kind, 'Root-runtime121-single-Native-source-promotion-input');
  assert.equal(v.protocolVersion, 1);
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v.nonce));
  for (const k of inputKeys06.filter(k => !['kind', 'protocolVersion', 'nonce', 'outputDirectory'].includes(k))) pinShape06(v[k]);
  assert.deepEqual(v.plan, fixedPins06.plan); assert.deepEqual(v.Root8CodeReview, fixedPins06.Root8Review);
  assert.deepEqual(v.statusBookends, fixedPins06.bookends); assert.deepEqual(v.basePromotion, fixedPins06.promotion);
  assert.deepEqual(v.baseReadback, fixedPins06.priorReadback);
  assert.equal(v.operator.file, operatorFile06);
  assert.equal(v.outputDirectory, outputParent06 + '/' + v.nonce);
  return v;
}
export function rootApprovalBody06(v, inputPin) {
  inputShape06(v); pinShape06(inputPin);
  return { kind: 'Root-single-Native-source-promotion-approval121', mode: 'single-native-promotion',
    nonce: v.nonce, approvedInput: inputPin, plan: v.plan, NativeCodeReview: v.NativeCodeReview,
    Root8CodeReview: v.Root8CodeReview, outputDirectory: v.outputDirectory,
    copyTarget: F06.R + '/' + F06.target, beforeSHA256: F06.before, afterSHA256: F06.after, limits: limits06 };
}
export function peerApproval06(peer, v, inputPin, rootApprovalPin) {
  assert.equal(peer.kind, 'non-author-runtime121-single-Native-source-safety-review');
  assert.equal(peer.verdict, 'approved-once-single-Native-FS-promotion');
  assert.equal(peer.reviewerIsAuthor, false);
  assert(typeof peer.author === 'string' && peer.author && typeof peer.reviewer === 'string' && peer.reviewer);
  assert.notEqual(peer.author, peer.reviewer);
  assert.deepEqual(peer.approvedInput, inputPin);
  assert.deepEqual(peer.expectedRootApproval, rootApprovalPin);
  assert.deepEqual(peer.operator, v.operator); assert.deepEqual(peer.limits, limits06);
}
export function cli06(argv) {
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
export function executionEnvironmentShape06(v) {
  exactKeys(v, ['platform', 'nodeVersion', 'execPath', 'uid', 'cwd', 'execArgv', 'NODE_OPTIONS', 'NODE_PATH']);
  assert.equal(v.platform, 'linux'); assert.equal(v.nodeVersion, 'v24.19.0');
  assert.equal(v.execPath, fixedPins06.node.file); assert.equal(v.uid, 1000); assert.equal(v.cwd, F06.R);
  assert.deepEqual(v.execArgv, []);
  for (const k of ['NODE_OPTIONS', 'NODE_PATH']) assert(v[k] === undefined || v[k] === '');
}
function strictBytes(file) {
  pinShape06(pin(file, 0, '0'.repeat(64)));
  const st = fs.lstatSync(file, { bigint: true });
  assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1n, 'Strict regular source/input');
  assert.equal(fs.realpathSync(file), file, 'Canonical realpath source/input');
  const b = fs.readFileSync(file); const after = fs.lstatSync(file, { bigint: true });
  assert.equal(after.dev, st.dev); assert.equal(after.ino, st.ino); assert.equal(after.size, st.size);
  assert.equal(after.mtimeNs, st.mtimeNs); assert.equal(after.ctimeNs, st.ctimeNs); return b;
}
function read(p) { pinShape06(p); const b = strictBytes(p.file); assert.equal(b.length, p.bytes); assert.equal(SHA(b), p.rawBytesSha256); return b; }
const json = p => JSON.parse(read(p).toString('utf8'));
const measuredPin = (file, b = strictBytes(file)) => pin(file, b.length, SHA(b));
function absent(file) {
  try { fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
  throw new Error('Required absent path exists: ' + file);
}
function entryPresent06(file) {
  try { fs.lstatSync(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; }
}
export function errorSummary06(e) {
  const names = ['Error', 'AssertionError', 'TypeError', 'RangeError', 'SyntaxError'];
  return { message: 'Single Native promotion stopped; preserve evidence and do not retry.',
    name: names.includes(e?.name) ? e.name : 'Error',
    code: typeof e?.code === 'string' && /^[A-Z][A-Z0-9_]{0,48}$/.test(e.code) ? e.code : null };
}
function stoppedAPI06() {
  absent(F06.P + '/rust-api121-process.json'); absent(F06.P + '/rust-api121.env');
  for (const epoch of [13, 14, 15]) absent(F06.P + '/business/g2-business' + epoch + '/main01/driver.lock');
  for (const f of ['/proc/net/tcp', '/proc/net/tcp6']) {
    const lines = fs.readFileSync(f, 'utf8').trim().split('\n').slice(1);
    for (const line of lines) {
      const fields = line.trim().split(/\s+/);
      assert(!(fields[3] === '0A' && Number.parseInt(fields[1].split(':').at(-1), 16) === 31441), '31441 must have no listener');
    }
  }
}
function graph06(helper, external) {
  assert.equal(helper.length, 229); assert.equal(external.length, 55);
  const all = [...helper, ...external].sort(compare);
  assert.equal(new Set(all.map(p => p.file)).size, 284);
  const actual = [];
  for (const p of all) {
    exactKeys(p, ['file', 'sha256']);
    assert(typeof p.file === 'string' && path.posix.normalize(p.file) === p.file && !p.file.startsWith('/') && !p.file.includes('\\') && !p.file.split('/').includes('..'));
    const b = strictBytes(F06.R + '/' + p.file); assert.equal(SHA(b), p.sha256);
    actual.push(measuredPin(F06.R + '/' + p.file, b));
  }
  const names = fs.readdirSync(F06.R + '/tools/rust-r4ghi/business', { withFileTypes: true })
    .filter(x => /\.(mjs|json)$/.test(x.name)).map(x => 'tools/rust-r4ghi/business/' + x.name).sort();
  assert.deepEqual(names, helper.map(p => p.file).sort());
  return actual;
}
function wxJSON(file, value) {
  const b = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  fs.writeFileSync(file, b, { flag: 'wx', mode: 0o600 });
  assert(read(measuredPin(file, b)).equals(b)); return measuredPin(file, b);
}
function loadContract06(input, inputPin, peerPin, rootPin) {
  inputShape06(input);
  assert.equal(fileURLToPath(import.meta.url), operatorFile06, 'Only the reviewed exact Root operator path may execute');
  read(input.operator);
  const peer = json(peerPin), root = json(rootPin);
  assert.deepEqual(root, rootApprovalBody06(input, inputPin)); peerApproval06(peer, input, inputPin, rootPin);
  const plan = json(input.plan); assert.equal(plan.copyOperations.length, 1); assert.equal(plan.alreadyChangedRootVerifyOnly.length, 1);
  const op = plan.copyOperations[0];
  assert.equal(op.file, F06.target); assert.equal(op.target, F06.R + '/' + F06.target);
  assert.equal(op.operationForPhysicalPromotion, 'MOD'); assert.equal(op.beforeSHA256, F06.before); assert.equal(op.afterSHA256, F06.after);
  assert.deepEqual(op.componentManifest, fixedPins06.I06); assert.equal(op.productPointer, '/production/1');
  assert.equal(op.originalRegistrationOperation, 'ADD'); assert.equal(op.originalRegistrationBeforeSHA256, null);
  const manifest = json(fixedPins06.I06); assert.equal(manifest.production.length, 9);
  const product = manifest.production[1]; assert.equal(product.file, F06.target); assert.equal(product.beforeSHA256, null);
  assert.equal(product.afterSHA256, F06.after); assert.deepEqual(product.candidate, op.candidate);
  const nativeReview = json(input.NativeCodeReview);
  assert.equal(nativeReview.kind, 'non-author-runtime121-finite-code-step'); assert.equal(nativeReview.verdict, 'approved-bounded-step-only');
  assert.equal(nativeReview.reviewerIsAuthor, false);
  assert(typeof nativeReview.author === 'string' && nativeReview.author && typeof nativeReview.reviewer === 'string' && nativeReview.reviewer);
  assert.notEqual(nativeReview.author, nativeReview.reviewer);
  assert.deepEqual(nativeReview.componentManifest, fixedPins06.I06); assert.equal(nativeReview.entries.length, 9);
  for (const [n, p] of manifest.production.entries()) {
    const e = nativeReview.entries.find(x => x.file === p.file); assert(e);
    assert.equal(e.beforeSHA256, p.beforeSHA256); assert.equal(e.afterSHA256, p.afterSHA256); assert.equal(e.productPointer, '/production/' + n);
    read(p.candidate);
  }
  const rootReview = json(input.Root8CodeReview); assert.equal(rootReview.kind, 'non-author-runtime121-finite-code-step');
  assert.equal(rootReview.verdict, 'approved-bounded-step-only'); assert.equal(rootReview.reviewerIsAuthor, false);
  assert.deepEqual(rootReview.componentManifest, plan.inputs.newRoot8);
  const starter = plan.alreadyChangedRootVerifyOnly[0]; assert.equal(starter.file, F06.starter);
  assert.equal(starter.expectedSHA256, F06.starterSHA); read(starter.candidate);
  const actual = json(input.basePromotion), priorReadback = json(input.baseReadback);
  assert.deepEqual(actual.helperPins, plan.inputs.actualPriorHelper229); assert.deepEqual(actual.externalPins, plan.inputs.actualPriorExternal55);
  assert.deepEqual(priorReadback.actualComplete, input.basePromotion);
  const oldH = json(actual.helperPins), oldE = json(actual.externalPins);
  const beforeH = oldH, beforeE = oldE.map(p => p.file === F06.starter ? { file: p.file, sha256: F06.starterSHA } : p);
  const afterH = oldH.map(p => p.file === F06.target ? { file: p.file, sha256: F06.after } : p), afterE = beforeE;
  assert.equal(oldH.find(p => p.file === F06.target).sha256, F06.before);
  assert.deepEqual(json(plan.expectedOnly.helper229), afterH); assert.deepEqual(json(plan.expectedOnly.external55), afterE);
  const expectedX = [...afterH, ...afterE].map(p => ({ file: F06.R + '/' + p.file, rawBytesSha256: p.sha256 })).sort(compare);
  assert.deepEqual(json(plan.expectedOnly.executionSources284), expectedX);
  const protectedExpected = [...beforeH, ...beforeE].filter(p => ![F06.target, F06.starter].includes(p.file)).sort(compare);
  assert.equal(protectedExpected.length, 282);
  assert.deepEqual(plan.protectedCurrentFiles282.map(p => ({ file: p.file, sha256: p.expectedUnchanged.rawBytesSha256 })).sort(compare), protectedExpected);
  const bookends = json(input.statusBookends).unchangedBookends;
  exactKeys(bookends, ['state13', 'state14', 'state15', 'ownership15']);
  for (const p of Object.values(bookends)) pinShape06(p);
  return { op, beforeH, beforeE, afterH, afterE, bookends };
}
function main06(argv) {
  executionEnvironmentShape06({ platform: process.platform, nodeVersion: process.version,
    execPath: process.execPath, uid: process.getuid?.(), cwd: process.cwd(), execArgv: process.execArgv,
    NODE_OPTIONS: process.env.NODE_OPTIONS, NODE_PATH: process.env.NODE_PATH });
  assert.equal(fs.realpathSync(process.cwd()), F06.R); read(fixedPins06.node);
  const cli = cli06(argv);
  const fromCLI = (file, hash) => { const b = strictBytes(file); assert.equal(SHA(b), hash); return pin(file, b.length, hash); };
  const inputPin = fromCLI(cli['--input'], cli['--input-sha']);
  const peerPin = fromCLI(cli['--peer-review'], cli['--peer-review-sha']);
  const rootPin = fromCLI(cli['--root-approval'], cli['--root-approval-sha']);
  const input = json(inputPin), c = loadContract06(input, inputPin, peerPin, rootPin);
  const invariant = () => {
    stoppedAPI06();
    for (const p of [inputPin, peerPin, rootPin, input.operator, input.plan, input.NativeCodeReview,
      input.Root8CodeReview, input.statusBookends, input.basePromotion, input.baseReadback, fixedPins06.I06, c.op.candidate]) read(p);
    for (const p of Object.values(c.bookends)) read(p);
  };
  invariant(); const before = graph06(c.beforeH, c.beforeE);
  absent(input.outputDirectory); absent(lock06);
  fs.mkdirSync(outputParent06, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(outputParent06), outputParent06);
  const lockFD = fs.openSync(lock06, 'wx', 0o600); let outputCreated = false, phase = 'source-lock-created';
  try {
    fs.writeFileSync(lockFD, JSON.stringify({ nonce: input.nonce, approvedInput: inputPin }) + '\n'); fs.fsyncSync(lockFD);
    fs.mkdirSync(input.outputDirectory, { mode: 0o700 }); outputCreated = true;
    invariant(); graph06(c.beforeH, c.beforeE);
    const target = F06.R + '/' + F06.target, oldBytes = strictBytes(target), oldStat = fs.lstatSync(target);
    assert.equal(SHA(oldBytes), F06.before); const newBytes = read(c.op.candidate); assert.equal(SHA(newBytes), F06.after);
    const preimage = input.outputDirectory + '/before-Native.bin';
    fs.writeFileSync(preimage, oldBytes, { flag: 'wx', mode: 0o600 }); read(measuredPin(preimage, oldBytes));
    phase = 'fresh-Native-preimage-preserved';
    const intent = wxJSON(input.outputDirectory + '/intent.json', { kind: 'Root-single-Native-source-promotion-intent121',
      nonce: input.nonce, input: inputPin, peerReview: peerPin, RootApproval: rootPin,
      target, before: measuredPin(preimage, oldBytes), afterCandidate: c.op.candidate,
      sourcePromotionOnly: true, APIOrNativeAuthority: false });
    const stage = F06.R + '/tools/rust-r4ghi/business/.runtime-admission121.' + input.nonce + '.tmp';
    absent(stage); const fd = fs.openSync(stage, 'wx', oldStat.mode & 0o777);
    try { fs.writeFileSync(fd, newBytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    assert.equal(SHA(strictBytes(stage)), F06.after);
    phase = 'stage-verified';
    invariant(); graph06(c.beforeH, c.beforeE); assert.equal(SHA(strictBytes(target)), F06.before);
    phase = 'rename-attempt';
    fs.renameSync(stage, target); // Existing fixed MOD only. No ADD/fallback/rollback branch.
    phase = 'post-rename-awaiting-full-readback';
    invariant(); const after = graph06(c.afterH, c.afterE);
    const helperPin = wxJSON(input.outputDirectory + '/actual-helper-pins229.json', c.afterH);
    const externalPin = wxJSON(input.outputDirectory + '/actual-external-pins55.json', c.afterE);
    const executionPin = wxJSON(input.outputDirectory + '/actual-execution-sources284.json', after);
    invariant(); graph06(c.afterH, c.afterE);
    const complete = wxJSON(input.outputDirectory + '/complete.json', {
      kind: 'actual-single-Native-source-promotion-complete121', input: inputPin, peerReview: peerPin,
      RootApproval: rootPin, intent, copiedExactly: [{ file: F06.target, beforeSHA256: F06.before, afterSHA256: F06.after }],
      RootStarterVerifiedOnly: true, other282Unchanged: true, beforeCodeCount: before.length,
      helperPins: helperPin, externalPins: externalPin, executionSources: executionPin,
      fourStateLogBytesUnchanged: true, API121AndEnvAbsent: true, port31441NoListener: true,
      APIStarted: false, nativeAuthorityGranted: false, SQLHTTP: false, businessStateWrite: false, G3: false, G4: false,
    });
    phase = 'complete-written-and-read-back';
    // Until complete/readback succeeds, any failure keeps the lock. A later
    // outer/stdio ambiguity must still stop: the unique output directory/intent
    // is never accepted for reuse, even after this successful lock release.
    fs.closeSync(lockFD); fs.unlinkSync(lock06); return complete;
  } catch (e) {
    if (outputCreated) {
      try { wxJSON(input.outputDirectory + '/partial.json', { kind: 'single-Native-promotion-failed-preserve121',
        input: inputPin, phase, error: errorSummary06(e), lockPreserved: entryPresent06(lock06),
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
    try { console.log(JSON.stringify(main06(process.argv.slice(2)))); }
    catch (e) { console.error(JSON.stringify({ kind: 'single-Native-promotion-stop121', error: errorSummary06(e) })); process.exitCode = 1; }
  }
}
