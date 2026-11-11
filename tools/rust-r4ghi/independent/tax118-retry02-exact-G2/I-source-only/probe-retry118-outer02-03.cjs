// Read-only original metadata plus exact pre-write guard-span models.
// This never imports/runs a Root constructor/runner or writes Root/private data.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const I = 'E:/projects/worktrees/poms-r4i-lifecycle/poms';
const LR = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const LI = '/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const U = '//wsl.localhost/Debian';
const D = I + '/tools/rust-r4ghi/I/independent-root-prepare118-retry02-review01';
const ts = require(require.resolve('typescript', { paths: [R] }));
const sha = b => createHash('sha256').update(b).digest('hex');
const data = v => Buffer.from(JSON.stringify(v, null, 2) + '\n');
function read(file, expected) {
  const st = fs.lstatSync(file); assert(st.isFile() && !st.isSymbolicLink());
  const b = fs.readFileSync(file); if (expected) assert.equal(sha(b), expected);
  return { b, pin: { file: file.split(path.sep).join('/').replace(R, LR).replace(I, LI).replace(U, ''), bytes: b.length, rawBytesSha256: sha(b) } };
}
function put(name, value) {
  const file = D + '/' + name; fs.writeFileSync(file, data(value), { flag: 'wx' }); return read(file).pin;
}
const preparer = read(R + '/tools/rust-r4ghi/prepare-tax15-118-retry02.mjs', 'febec0b784678692e80596080e7dd84a0aecaef0e2e34c22763485c9d7d69075');
const outer02 = read(R + '/tools/rust-r4ghi/execute-prepare118-once02.mjs', '9760cfb2c6c93747383f8c8c65dd691619177efed54979bd89f1e7609ca07677');
const outer03 = read(R + '/tools/rust-r4ghi/execute-prepare118-once03.mjs', '01f4e1c187370ea07c2ebc02854a0d6173777ea885612907baa43f72a00a9e10');
const derivation = read(R + '/tools/rust-r4ghi/prepare118-outer03-derivation.json', 'a48c6bd593f6973e16c866b416c2c3e28abf34e43910bcf135380316ad4724d5');
const sealed = read(R + '/tools/rust-r4ghi/tax15-invocation118/tests/sealed-code02/manifest118-code02.json', 'e798873c3abf8adac3d1b29104aee13725b5ac2b0ab8ae01190e88eb30bcd548');
const manifest = JSON.parse(sealed.b); assert.equal(manifest.executionSources.length, 8);
const priorRequest = read(U + P + '/tax15-prepare118-prepared01/request-prepare-only-G2-review118.json', '77f220c78f3b93f1291432defae2cf0992dfd4e75e2a33de43aa1bc940790baa');
const previous = JSON.parse(priorRequest.b);
const priorInput = read(U + previous.input.file, previous.input.rawBytesSha256), prior = JSON.parse(priorInput.b);
assert.equal(priorInput.pin.bytes, previous.input.bytes);
const command = read(U + P + '/tax15-prepare118-prepared01/run01/command-receipt.json', '16acf217fbbac315d6598dba9f722aa4bbc138f53ba7ef02496d4e52c16eef6c');
const failed = JSON.parse(command.b);
const failureReview = read('E:/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/independent-prepare118-actual-failure01/review-actual-failure-NOTREADY01.json', '46065e69e4c8dfb1b290354c4f9a3506ea583e834178f949074ab338d5768101');
const oldNonce = '88160fd3-c7d7-439b-89e6-70209be4e3c6';
const partial = read(U + P + '/business/g2-business15/main01/tax118-invocation-' + oldNonce + '/partial.json');
const partialValue = JSON.parse(partial.b);
assert.equal(prior.nonce, oldNonce); assert.equal(prior.mode, 'prepare-only'); assert.equal(Object.keys(prior).length, 34);
assert.equal(failed.exitCode, 1); assert.equal(failed.stdout.bytes, 0);
assert.equal(partialValue.input.file, previous.input.file); assert.equal(partialValue.input.rawBytesSha256, previous.input.rawBytesSha256);
assert.equal(partialValue.message, 'sha is not defined'); assert.equal(partialValue.result, null); assert.equal(partialValue.closed, null);
const unproduced = ['bodySHA256', 'prepared15', 'fullInventory', 'approvedClosedFISet', 'selectedFamily', 'approvedRecovery', 'approvedCompletedPrefix', 'approvedStartCursor', 'approvedFICompletion', 'expectedActiveFault'];
for (const key of unproduced) assert.equal(prior[key], null);

const sf = ts.createSourceFile('prepare-tax15-118-retry02.mjs', preparer.b.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const assigned = [];
function walk(n) {
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && n.left.expression.getText(sf) === 'input') assigned.push(n.left.name.text);
  ts.forEachChild(n, walk);
}
walk(sf); assert.deepEqual(assigned, ['nonce', 'phase', 'expectedEntryState', 'codeReview', 'executionSources']);
const inserted = "assert.deepEqual(request.expectedRootReviewBody, {\n  kind: 'Root-approved-exact-Tax15-invocation118', approvedInput: request.input,\n  codeReview: input.codeReview, expectedEntryState: input.expectedEntryState, mode: 'prepare-only',\n  nonce: input.nonce, actualG2Authorized: true, normalTaxPOSTGranted: false, FIGranted: false\n});\n";
assert(outer03.b.toString().includes(inserted));
assert.deepEqual(Buffer.from(outer03.b.toString().replace(inserted, '')), outer02.b);

const modelPrivate = P + '/tax15-prepare118-prepared02';
const modelRun = modelPrivate + '/run01';
const models = [];
function exactGuard(source) {
  const start = source.indexOf("assert.equal(request.kind, 'Root-requested-Tax15-prepare-only118-exact-G2');");
  const end = source.indexOf('fs.writeFileSync(request.expectedRootReview.file, bytes,');
  assert(start >= 0 && end > start);
  const span = source.slice(start, end);
  assert(!span.includes('spawnSync(') && !span.includes('writeFileSync('));
  return { span, invoke: new Function('assert', 'request', 'r', 'R', 'P', 'O', 'read', 'fs', 'sha', 'Buffer', span + '\nreturn true;') };
}
const guard02 = exactGuard(outer02.b.toString()), guard03 = exactGuard(outer03.b.toString());
function model(changeBody, options = {}) {
  const memory = new Map();
  function memoryPin(file, bytes) { memory.set(file, Buffer.from(bytes)); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; }
  const entryState = memoryPin(modelPrivate + '/entry-state15.json', Buffer.from('{"syntheticGuardState":true}\n'));
  memory.set(P + '/business/g2-business15/main01/state.json', memory.get(entryState.file));
  const sourcePins = manifest.executionSources.map(p => {
    const item = read(p.file.replace(LR, R), p.rawBytesSha256); memory.set(p.file, item.b); return { file: p.file, rawBytesSha256: p.rawBytesSha256 };
  });
  const input = structuredClone(prior);
  input.nonce = 'f6b34229-ff63-487c-b363-b77ecbf39733'; input.phase = 'tax15-prepare02';
  input.expectedEntryState = entryState;
  const sourceList = options.staleCode ? sourcePins.map(p => p.file.endsWith('/run-tax15-once.mjs') ? { ...p, rawBytesSha256: 'e0a4a9a8fb1f06a974a5f854e18fd5edeb987c2ffdeda79499b8161fc388df30' } : p) : sourcePins;
  const code = { kind: 'non-author-Tax15-invocation118-code-review', verdict: 'code-ready-for-exact-input-review', reviewerIsAuthor: false, executionSources: options.codeMismatch ? sourceList.slice(1) : sourceList };
  input.codeReview = memoryPin(modelPrivate + '/SYNTHETIC-CODE-REVIEW-ONLY.json', data(code));
  input.executionSources = sourceList;
  if (options.wrongInputMode) input.mode = 'commit-once';
  const ip = memoryPin(modelPrivate + '/SYNTHETIC-INPUT-ONLY.json', data(input));
  let body = { kind: 'Root-approved-exact-Tax15-invocation118', approvedInput: ip, codeReview: input.codeReview,
    expectedEntryState: entryState, mode: 'prepare-only', nonce: input.nonce,
    actualG2Authorized: true, normalTaxPOSTGranted: false, FIGranted: false };
  if (changeBody) changeBody(body);
  const bodyBytes = data(body), expected = { file: modelPrivate + '/SYNTHETIC-ROOT-REVIEW-ONLY.json', bytes: bodyBytes.length, rawBytesSha256: sha(bodyBytes) };
  const request = { kind: 'Root-requested-Tax15-prepare-only118-exact-G2', input: ip, expectedRootReview: expected, expectedRootReviewBody: body };
  const review = { mode: 'prepare-only', verdict: 'approved-SYNTHETIC-GUARD-MODEL-ONLY', approvedInput: ip, expectedRootReview: expected };
  if (options.reviewInputMismatch) review.approvedInput = { ...ip, rawBytesSha256: '0'.repeat(64) };
  if (options.reviewBodyPinMismatch) review.expectedRootReview = { ...expected, rawBytesSha256: '0'.repeat(64) };
  if (options.stateDrift) memory.set(P + '/business/g2-business15/main01/state.json', Buffer.from('{"syntheticGuardState":"changed"}\n'));
  const localRead = (file, expectedSHA) => {
    assert(memory.has(file), 'Only isolated virtual reads are allowed'); const b = memory.get(file);
    if (expectedSHA) assert.equal(sha(b), expectedSHA); return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
  };
  const exists = file => options.existingRun && file === modelRun || options.existingReview && file === expected.file || options.driverLock === file;
  const contextArgs = [assert, request, review, LR, P, modelRun, localRead, { existsSync: exists }, sha, Buffer];
  function run(guard) { try { guard.invoke(...contextArgs); return { reachesFirstWrite: true }; } catch (e) { return { reachesFirstWrite: false, error: e.message }; } }
  return { outer02: run(guard02), outer03: run(guard03), bodyPinAndLengthAreRealModelHashes: true, actualFSWrites: 0, actualDispatches: 0 };
}
function add(name, change, options, expected02, expected03) {
  const result = model(change, options); assert.equal(result.outer02.reachesFirstWrite, expected02, name); assert.equal(result.outer03.reachesFirstWrite, expected03, name);
  models.push({ name, ...result });
}
add('valid complete body reaches pre-write boundary in both editions', null, {}, true, true);
const fakePin = { file: modelPrivate + '/SYNTHETIC-OTHER-ONLY.json', rawBytesSha256: '0'.repeat(64) };
add('wrong approval kind', b => { b.kind = 'wrong'; }, {}, true, false);
add('wrong approval input', b => { b.approvedInput = fakePin; }, {}, true, false);
add('wrong approval code review', b => { b.codeReview = fakePin; }, {}, true, false);
add('wrong approval entry state', b => { b.expectedEntryState = fakePin; }, {}, true, false);
add('wrong approval mode', b => { b.mode = 'commit-once'; }, {}, true, false);
add('old failed nonce in approval body', b => { b.nonce = oldNonce; }, {}, true, false);
add('extra approval field', b => { b.extra = true; }, {}, true, false);
add('missing approval codeReview field', b => { delete b.codeReview; }, {}, true, false);
add('false actualG2 remains rejected', b => { b.actualG2Authorized = false; }, {}, false, false);
add('normal POST grant remains rejected', b => { b.normalTaxPOSTGranted = true; }, {}, false, false);
add('FI grant remains rejected', b => { b.FIGranted = true; }, {}, false, false);
add('actual review input mismatch remains rejected', null, { reviewInputMismatch: true }, false, false);
add('actual review body pin mismatch remains rejected', null, { reviewBodyPinMismatch: true }, false, false);
add('live entry bytes drift remains rejected', null, { stateDrift: true }, false, false);
add('review and input source lists mismatch remains rejected', null, { codeMismatch: true }, false, false);
add('old runner SHA against new code remains rejected', null, { staleCode: true }, false, false);
add('input mode outside prepare-only remains rejected', null, { wrongInputMode: true }, false, false);
add('existing run blocks a second dispatch', null, { existingRun: true }, false, false);
add('existing Root review blocks replacement', null, { existingReview: true }, false, false);
for (const epoch of [13, 14, 15]) add('active epoch' + epoch + ' driver lock remains rejected', null, { driverLock: P + '/business/g2-business' + epoch + '/main01/driver.lock' }, false, false);

const originals = [preparer, outer02, outer03, derivation, sealed, priorRequest, priorInput, command, failureReview, partial];
for (const item of originals) {
  const file = item.pin.file.startsWith('/home/') ? U + item.pin.file : item.pin.file.replace(LR, R).replace('/mnt/e/projects/worktrees/poms-r4h-signals/poms', 'E:/projects/worktrees/poms-r4h-signals/poms');
  assert.deepEqual(read(file, item.pin.rawBytesSha256).b, item.b);
}
const sourceCapture = put('source-capture-retry118.json', { kind: 'immutable-Root-retry118-orchestration-source-capture',
  sources: [preparer, outer02, outer03].map(x => ({ original: x.pin, rawBase64: x.b.toString('base64') })) });
const checks = put('checks-retry118-outer02-03.json', { kind: 'isolated-exact-pre-write-guard-span-review-models',
  sources: { preparer: preparer.pin, outer02: outer02.pin, outer03: outer03.pin, derivation: derivation.pin },
  oldActualMetadata: { priorRequest: priorRequest.pin, priorInput: priorInput.pin, failedCommand: command.pin,
    failureReview: failureReview.pin, partial: partial.pin, oldNonce, mode: prior.mode, exactKeys: Object.keys(prior),
    actualPermissionsCount: prior.expectedActorPermissions.length, unproducedTenSlotsNull: true,
    partialPinIdentityMatchesPrior: true, failedExit: 1, stdoutBytes: 0, oldNoExitLabelPreserved: true },
  newCodeManifest: sealed.pin, newExecutionSources: manifest.executionSources,
  preparerInputAssignments: assigned, derivationExactSingleInsertion: true,
  guardSpans: { outer02: guard02.span, outer03: guard03.span }, models, cases: models.length, passed: models.length,
  scope: 'Only exact pre-write guard spans execute with synthetic request/state/review buffers and local read/exists facades. Model stops before any write or spawn. It is not full wrapper/native/G2 acceptance.',
  sourceCapture, beforeAfterReadOnlyInputsStable: true, RootOrPrivateWritten: false,
  currentOrdinaryStateOrTicketValuesRead: false, actualRootScriptsExecuted: false, actualContextCalls: 0,
  actualNativeCalls: 0, actualDispatches: 0, SQLHTTP: false, globalFSOrCryptoPatched: false });
console.log(JSON.stringify({ checks, sourceCapture, cases: models.length, passed: models.length,
  outer02WholeBodyDriftAccepted: models.filter(x => x.outer02.reachesFirstWrite && !x.outer03.reachesFirstWrite).length,
  actualRootScriptsExecuted: false, actualDispatches: 0 }));
