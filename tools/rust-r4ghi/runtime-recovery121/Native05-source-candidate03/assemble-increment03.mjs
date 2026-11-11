// Author metadata proposal only. No task helper/native imports or Root/P writes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const D = path.dirname(fileURLToPath(import.meta.url));
const H = '/mnt/e/projects/worktrees/poms-r4h-signals/poms';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const I = '/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const B = P + '/runtime121-source-promotion/dabe2f4c-2196-4e29-bab6-77e7ec3e539b';
const nativeFile = 'tools/rust-r4ghi/business/runtime-admission121.mjs';
const starterFile = 'tools/rust-r4ghi/runtime-recovery121/root/start-api121.mjs';
const pin = (file, bytes, rawBytesSha256) => ({ file, bytes, rawBytesSha256 });
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const utf8 = (a, b) => Buffer.compare(Buffer.from(a.file), Buffer.from(b.file));
const local = f => f.startsWith('/mnt/e/') ? 'E:/' + f.slice(7)
  : f.startsWith('/home/') ? '//wsl.localhost/Debian' + f : f;
const linux = f => f.replaceAll('\\', '/').replace(/^E:\//, '/mnt/e/');
const samePin = (a, b) => assert.deepEqual(a, b);
const inputs = {
  actualPriorPromotion: pin(B + '/complete.json', 17858, 'af22e36d8d162dd32112ab68ded02f24f1b05a8244ddaeca437866499e5f588a'),
  independentPriorReadback: pin(R + '/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-source-promotion-actual-readback02/review-actual-source-promotion02.json', 6463, 'ad98a4170d9aaf2089713a0f4ca3ac250676ca9d551b5418b428c23186663b80'),
  actualPriorHelper229: pin(B + '/actual-helper-pins229.json', 35523, '19df4a1e00968121276f32e1ede1e80504d5d5ad6a3994ad86b9f925a2833de3'),
  actualPriorExternal55: pin(B + '/actual-external-pins55.json', 8818, '54cff5247b953316ce9b25a4a8b05ad7578a87e8601fe8b0778ad063c03bd75e'),
  actualPriorExecutionSources284: pin(B + '/actual-execution-sources284.json', 66309, '60fc427756de17945f288082df97dd4fd19393a120aa76f2ecb55246f3bfa342'),
  priorA11: pin(H + '/tools/rust-r4ghi/H/implementation/runtime121-finite-promotion-plan01/promotion-plan01.json', 388852, 'a11dbaa8a582487d5d3b3b0fa0919c513e5c45661b64238456029168cf8b05a8'),
  oldI03: pin(I + '/tools/rust-r4ghi/I/implementation/runtime-recovery121-code03/sealed-code03/manifest-I121-code03.json', 23623, '9467b5bc7629ffde3aad2df15004af3a6d14f110e08ab4a156558bdd2a639f31'),
  newI05: pin(I + '/tools/rust-r4ghi/I/implementation/runtime-recovery121-code05/sealed-code05/manifest-I121-code05.json', 30822, 'bc82216bc377aba857248a0a55eda61e5fc4b2576564a82ab30891493cbc0a5c'),
  H03: pin(H + '/tools/rust-r4ghi/H/implementation/support-patches/source15-lease-tax121-code03/sealed-code03/manifest-H121-code03.json', 51589, 'f3933122cb83bbfc91eb9b532cf13b04ea6e682ba69046dd94ee988839793f03'),
  oldRoot8: pin(R + '/tools/rust-r4ghi/runtime-recovery121/root/tests/sealed-API-code01/manifest-Root8-API-code121.json', 11295, 'f83e1e6c1ddc043a41b15c58b703f814c723699c1d0d4db5f85f0625aa205b99'),
  newRoot8: pin(R + '/tools/rust-r4ghi/runtime-recovery121/root/tests/sealed-API-code03/manifest-Root8-API-code121.json', 11295, 'aeb02ab6b034f96feb42c20f0cf2b42c5888b96c36f4b2a2d7b3c34a5ce4dd66'),
  newRoot8IndependentCodeStep: pin(R + '/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-Root8-API-code-review02/review-Root8-API-code03-step121.json', 14442, '577ef5922ecfe58420b121fab19c0069938c497170e2ad11fd783e496110d8b1'),
};
const readSet = new Map();
function read(p) {
  assert.deepEqual(Object.keys(p).sort(), ['file', 'bytes', 'rawBytesSha256'].sort());
  assert(typeof p.file === 'string' && p.file.startsWith('/') && !p.file.includes('\\') &&
    !p.file.includes('//') && !p.file.split('/').some(x => x === '.' || x === '..'));
  assert(Number.isSafeInteger(p.bytes) && p.bytes >= 0 && /^[a-f0-9]{64}$/.test(p.rawBytesSha256));
  const f = local(p.file), s = fs.lstatSync(f);
  assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1);
  assert.equal(fs.realpathSync(f), path.resolve(f));
  const b = fs.readFileSync(f); assert.equal(b.length, p.bytes); assert.equal(sha(b), p.rawBytesSha256);
  if (readSet.has(p.file)) samePin(readSet.get(p.file), p);
  readSet.set(p.file, p); return b;
}
const json = p => JSON.parse(read(p).toString('utf8'));
const actual = json(inputs.actualPriorPromotion), priorReview = json(inputs.independentPriorReadback);
assert.equal(actual.kind, 'actual-runtime121-source-promotion-complete');
assert.equal(actual.copiedFiles.length, 33);
assert.equal(priorReview.kind, 'non-author-runtime121-source-promotion-actual-readback');
assert.equal(priorReview.verdict, 'approved-actual-source-promotion-only');
assert.equal(priorReview.reviewerIsAuthor, false);
samePin(priorReview.actualComplete, inputs.actualPriorPromotion);
samePin(actual.helperPins, inputs.actualPriorHelper229); samePin(actual.externalPins, inputs.actualPriorExternal55);
samePin(actual.executionSources, inputs.actualPriorExecutionSources284);
samePin(priorReview.actualGraphs.helper, actual.helperPins);
samePin(priorReview.actualGraphs.external, actual.externalPins);
samePin(priorReview.actualGraphs.executionSources, actual.executionSources);
const helper = json(actual.helperPins), external = json(actual.externalPins), execution = json(actual.executionSources);
assert.equal(helper.length, 229); assert.equal(external.length, 55); assert.equal(execution.length, 284);
const a11 = json(inputs.priorA11);
assert.deepEqual(helper, a11.expectedHelper229); assert.deepEqual(external, a11.expectedExternal55);
const baseline = [...helper, ...external].sort(utf8);
assert.deepEqual(execution.map(p => ({ file: p.file, rawBytesSha256: p.rawBytesSha256 })),
  baseline.map(p => ({ file: R + '/' + p.file, rawBytesSha256: p.sha256 })).sort(utf8));
const oldI = json(inputs.oldI03), newI = json(inputs.newI05), h = json(inputs.H03);
const oldRoot = json(inputs.oldRoot8), newRoot = json(inputs.newRoot8);
const newRootReview = json(inputs.newRoot8IndependentCodeStep);
assert.equal(newRootReview.kind, 'non-author-runtime121-finite-code-step');
assert.equal(newRootReview.verdict, 'approved-bounded-step-only');
assert.equal(newRootReview.reviewerIsAuthor, false);
samePin(newRootReview.componentManifest, inputs.newRoot8);
assert.equal(newRootReview.entries.length, 8);
for (const [n, p] of newRoot.production.entries()) {
  const e = newRootReview.entries.find(e => e.file === p.file); assert(e);
  assert.equal(e.productPointer, '/production/' + n);
  assert.equal(e.beforeSHA256, p.beforeSHA256); assert.equal(e.afterSHA256, p.afterSHA256);
}
assert.equal(oldI.production.length, 9); assert.equal(newI.production.length, 9);
assert.equal(h.production.length, 24); assert.equal(oldRoot.production.length, 8); assert.equal(newRoot.production.length, 8);
function compareProductFamily(oldProducts, newProducts, onlyChangedFile) {
  assert.deepEqual(oldProducts.map(p => p.file), newProducts.map(p => p.file));
  const changed = [];
  for (const [n, p] of newProducts.entries()) {
    const old = oldProducts[n];
    assert.equal(p.operation, old.operation); assert.equal(p.beforeSHA256, old.beforeSHA256);
    assert.equal(p.candidate.rawBytesSha256, p.afterSHA256);
    read(p.candidate); read(old.candidate);
    if (p.afterSHA256 !== old.afterSHA256) changed.push(p.file);
    else assert.equal(p.candidate.bytes, old.candidate.bytes);
  }
  assert.deepEqual(changed, [onlyChangedFile]);
}
compareProductFamily(oldI.production, newI.production, nativeFile);
compareProductFamily(oldRoot.production, newRoot.production, starterFile);
const oldNative = oldI.production.find(p => p.file === nativeFile), newNative = newI.production.find(p => p.file === nativeFile);
const oldStarter = oldRoot.production.find(p => p.file === starterFile), newStarter = newRoot.production.find(p => p.file === starterFile);
assert.equal(oldNative.afterSHA256, '2ebe24bbe42ebdeddb7091647662f9de0efc0306c8b6ae1672a8cead8da3e64a');
assert.equal(newNative.afterSHA256, '575332154922858204cd0088528001a540606cc3cd52217e39a251b0ebe97993');
assert.equal(oldStarter.afterSHA256, 'f5aab397f06a29bb7326c18b3fce18b6605827e70b0e310431e17622226ccd4e');
assert.equal(newStarter.afterSHA256, '021cb26bd9bbdf37c416e033afa064c5f8ac5020710a12f418fc2f3da4c1e41a');
for (const p of h.production) read(p.candidate);
const afterByFile = new Map([...newI.production, ...h.production, ...newRoot.production].map(p => [p.file, p]));
assert.equal(afterByFile.size, 41);
const observed = [];
for (const p of execution) {
  assert(p.file.startsWith(R + '/'));
  const file = p.file.slice(R.length + 1);
  const expected = file === starterFile ? newStarter.candidate : p;
  const current = pin(p.file, expected.bytes, expected.rawBytesSha256);
  read(current);
  observed.push({ file, baseline: p, current,
    relation: file === starterFile ? 'ROOT_AUTHOR_ALREADY_CHANGED_AFTER_AF22_NOT_PART_OF_OLD_GRAPH' : 'RAW_EQUALS_ACTUAL_AF22_BASELINE' });
}
assert.equal(observed.length, 284);
assert.equal(observed.filter(p => p.relation === 'RAW_EQUALS_ACTUAL_AF22_BASELINE').length, 283);
for (const p of [...newI.production.filter(p => p.file !== nativeFile), ...h.production]) {
  const o = observed.find(x => x.file === p.file); assert(o);
  assert.equal(o.current.rawBytesSha256, p.afterSHA256);
}
for (const p of newRoot.production) {
  const o = observed.find(x => x.file === p.file); assert(o);
  assert.equal(o.current.rawBytesSha256, p.afterSHA256);
}
const names = fs.readdirSync(local(R + '/tools/rust-r4ghi/business'), { withFileTypes: true })
  .filter(e => e.isFile() && /\.(mjs|json)$/.test(e.name))
  .map(e => 'tools/rust-r4ghi/business/' + e.name).sort();
assert.deepEqual(names, helper.map(p => p.file).sort());

const expectedHelper = helper.map(p => p.file === nativeFile ? { file: p.file, sha256: newNative.afterSHA256 } : p);
const expectedExternal = external.map(p => p.file === starterFile ? { file: p.file, sha256: newStarter.afterSHA256 } : p);
const expectedExecution = [...expectedHelper, ...expectedExternal].map(p => ({ file: R + '/' + p.file, rawBytesSha256: p.sha256 })).sort(utf8);
function exactDelta(before, after, file, beforeSHA, afterSHA) {
  assert.deepEqual(before.map(p => p.file), after.map(p => p.file));
  const delta = after.filter((p, n) => p.sha256 !== before[n].sha256);
  assert.deepEqual(delta, [{ file, sha256: afterSHA }]);
  assert.equal(before.find(p => p.file === file).sha256, beforeSHA);
}
exactDelta(helper, expectedHelper, nativeFile, oldNative.afterSHA256, newNative.afterSHA256);
exactDelta(external, expectedExternal, starterFile, oldStarter.afterSHA256, newStarter.afterSHA256);
assert.equal(expectedExecution.length, 284);
const nativeCurrent = observed.find(x => x.file === nativeFile).current;
const starterCurrent = observed.find(x => x.file === starterFile).current;
const copyOperation = {
  file: nativeFile, target: R + '/' + nativeFile,
  operationForPhysicalPromotion: 'MOD', beforeSHA256: oldNative.afterSHA256,
  afterSHA256: newNative.afterSHA256, observedCurrent: nativeCurrent,
  candidate: newNative.candidate, componentManifest: inputs.newI05,
  productPointer: '/production/' + newI.production.indexOf(newNative),
  originalRegistrationOperation: newNative.operation, originalRegistrationBeforeSHA256: newNative.beforeSHA256,
  explanation: 'Original227-to-current composition remains ADD(null->new); this future physical update is MOD(oldI03->I05), not a replay of the consumed 33-file promotion.',
  independentCodeReview: null, SourceSafetyReview: null, RootApproval: null,
};
const verifyOnly = {
  file: starterFile, target: R + '/' + starterFile,
  physicalAction: 'VERIFY_ROOT_AUTHOR_ALREADY_CHANGED_BYTES_ONLY_DO_NOT_COPY',
  baselineSHA256AtAF22: oldStarter.afterSHA256, observedCurrent: starterCurrent,
  expectedSHA256: newStarter.afterSHA256, candidate: newStarter.candidate,
  componentManifest: inputs.newRoot8, productPointer: '/production/' + newRoot.production.indexOf(newStarter),
  independentCodeReview: inputs.newRoot8IndependentCodeStep,
};
assert.equal(copyOperation.originalRegistrationOperation, 'ADD');
assert.equal(copyOperation.originalRegistrationBeforeSHA256, null);
const protections = observed.filter(p => p.file !== nativeFile && p.file !== starterFile)
  .map(p => ({ file: p.file, expectedUnchanged: p.current }));
assert.equal(protections.length, 282);
const namedChecks = [
  'Actual af22/ad98 metadata pins and three graphs agree; old graph contents preserved.',
  'Actual old helper229/external55 equal A11 expected identities; three-key execution284 projection matches.',
  'I03->I05 production set unchanged; exactly Native1 afterSHA changes; otherI8 candidate bytes unchanged.',
  'Root8 old->APIcode03 production set unchanged; exactly starter1 afterSHA changes; otherA7 candidate bytes unchanged.',
  'AllH24 candidates and currentRoot bytes equal the existing H03 sealed afterSHA.',
  'CurrentRoot284 raw readback:283 equal af22; one starter equals the explicit later Root-authored correction.',
  'CurrentRoot helper directory membership remains exact229.',
  'Expected next helper229 changes only Native hash; external55 changes only starter hash; 284 names unchanged.',
  'No new review or SourceSafety authority substituted from old274f/687b.',
  'New Root8 actual bounded code-step577e binds new aeb03 component and all8 entries; it grants no SourceSafety.',
];
const neg = [];
function reject(name, fn) { assert.throws(fn); neg.push({ name, result: 'REJECTED_AS_EXPECTED' }); }
reject('Native target already changed must fail old-hash precondition', () => assert.equal(newNative.afterSHA256, nativeCurrent.rawBytesSha256));
reject('Old external55 must not be called current after Root starter change', () => assert.equal(oldStarter.afterSHA256, starterCurrent.rawBytesSha256));
reject('A second helper delta is rejected', () => {
  const x = structuredClone(expectedHelper); x[0].sha256 = '0'.repeat(64);
  exactDelta(helper, x, nativeFile, oldNative.afterSHA256, newNative.afterSHA256);
});
reject('Missing external leaf is rejected', () => exactDelta(external, expectedExternal.slice(1), starterFile, oldStarter.afterSHA256, newStarter.afterSHA256));
reject('Wrong Native candidate hash is rejected', () => assert.equal(oldNative.candidate.rawBytesSha256, copyOperation.afterSHA256));

for (const p of [...readSet.values()]) read(p);
function write(name, body) {
  const f = path.join(D, name); assert.equal(path.dirname(path.resolve(f)), path.resolve(D));
  fs.writeFileSync(f, JSON.stringify(body, null, 2) + '\n', { flag: 'wx' });
  const b = fs.readFileSync(f); return pin(linux(f), b.length, sha(b));
}
const helperOut = write('expected-next-helper229.json', expectedHelper);
const externalOut = write('expected-next-external55.json', expectedExternal);
const executionOut = write('expected-next-execution-sources284.json', expectedExecution);
const observationsOut = write('readonly-current-code-observations03.json', observed);
const proposal = {
  kind: 'H-runtime121-single-Native-FS-promotion-increment-proposal',
  status: 'PENDING_NEW_CODE_REVIEWS_AND_EXACT_SOURCE_SAFETY_NOT_EXECUTABLE',
  inputs, baselineMeaning: 'af22/ad98 are immutable as-of I03 and oldRoot8; current starter is the explicit later Root-authored difference, not a rewrite or recertification of that historical graph.',
  copyOperations: [copyOperation], alreadyChangedRootVerifyOnly: [verifyOnly],
  protectedCurrentFiles282: protections,
  subsetProof: { otherI8Unchanged: newI.production.filter(p => p.file !== nativeFile).map(p => p.file),
    H24Unchanged: h.production.map(p => p.file), otherRootA7Unchanged: newRoot.production.filter(p => p.file !== starterFile).map(p => p.file) },
  expectedOnly: { helper229: helperOut, external55: externalOut, executionSources284: executionOut },
  readonlyPhysicalObservations: observationsOut,
  newIndependentCodeReviews: { NativeI05: null, Root8API03: inputs.newRoot8IndependentCodeStep },
  SourceSafetyReview: null, RootApproval: null,
  futureActualHelperPins229: null, futureActualExternalPins55: null, futureActualExecutionSources284: null,
  actualPromotionExecuted: false, actualG2Authorized: false, RootPromotionGranted: false,
  nativeAuthorityGranted: false, APIStartupGranted: false, businessG3: false, businessG4: false,
  constraints: [
    'Exactly one future Root copy: Native current2ebe->candidate5753; save its fresh exact preimage under the future approved Root lock.',
    'Starter021c is already authored in Root and must only be rechecked against the new Root8 sealed candidate; never copy or roll it back via this plan.',
    'Freshly recheck all preconditions, protections and source membership before the one-file operation, then measure/save full actual229/55/284 under new wx paths.',
    'Expected arrays are model outputs; never publish them as actual measured graphs.',
    'Old274f/687b are not approvals for new Native/starter bytes. Only the new Root8 step577e is currently bound; new Native code-review and SourceSafety pins remain null for a fresh exact input.',
    'Do not reuse the consumed old33 nonce or overwrite af22/ad98, old actual graph files, old manifests or failed API metadata evidence.',
    'Any failure or unknown/partial result stops and preserves all evidence; do not blindly resend this metadata proposal.',
    'No Native/helper verifier or actual ctx/API/SQL/HTTP/process/Git/Issue action has been run by this H script.',
  ],
};
const proposalOut = write('single-native-promotion-increment03.json', proposal);
const checksOut = write('checks-increment03.json', {
  kind: 'H-author-readonly-FS-increment03-checks', positiveChecks: namedChecks.map(name => ({ name, result: 'PASS' })),
  negativeChecks: neg, failed: 0, prePostInputsAndCodeRawStable: true,
  observedCurrentCodeFiles: 284, currentNativeStillOld: true, currentRootStarterAlreadyNew: true,
  readonlyInputs: [...readSet.values()].sort(utf8),
  RootOrPrivateWritten: false, businessStateOrEnvRead: false, helperOrNativeExecuted: false,
});
const assemblerBytes = fs.readFileSync(fileURLToPath(import.meta.url));
const manifest = {
  kind: 'H-author-runtime121-single-Native-promotion-increment03-manifest',
  proposal: proposalOut, checks: checksOut,
  expectedNextHelper229: helperOut, expectedNextExternal55: externalOut, expectedNextExecutionSources284: executionOut,
  readonlyCurrentCodeObservations: observationsOut,
  assembler: pin(linux(fileURLToPath(import.meta.url)), assemblerBytes.length, sha(assemblerBytes)),
  counts: { futureCopy: 1, alreadyChangedRootVerifyOnly: 1, protectedCurrent: 282, otherI: 8, H: 24, otherRootA: 7 },
  newCodeReviews: { Native05: null, Root8API03: inputs.newRoot8IndependentCodeStep }, SourceSafetyReview: null,
  actualFinalGraphs: null, actualEffects: false, actualG2: false,
};
const manifestOut = write('manifest-increment03.json', manifest);
console.log(JSON.stringify({ manifest: manifestOut, proposal: proposalOut, checks: checksOut, positives: namedChecks.length, negatives: neg.length }));
