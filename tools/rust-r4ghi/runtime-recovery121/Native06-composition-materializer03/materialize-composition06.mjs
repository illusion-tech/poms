// Code-only candidate. Built-ins only; never imports Native/task helpers.
// Root may later execute it against a real completed Native06 promotion.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const H = '/mnt/e/projects/worktrees/poms-r4h-signals/poms';
const I = '/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const pin = (file, bytes, rawBytesSha256) => ({ file, bytes, rawBytesSha256 });
const SHA = b => crypto.createHash('sha256').update(b).digest('hex');
const sort = (a, b) => Buffer.compare(Buffer.from(a.file), Buffer.from(b.file));
const N = 'tools/rust-r4ghi/business/runtime-admission121.mjs';
const before = '575332154922858204cd0088528001a540606cc3cd52217e39a251b0ebe97993';
const after = 'ef958a654e517cf417fe39c21f4deaadcb942aab69bf3a51602e6aed92636f38';
const frameKeys = ['file', 'operation', 'beforeSHA256', 'afterSHA256', 'candidate',
  'componentManifest', 'productPointer', 'independentReview', 'technicalG1'];
const refs = {
  base18: pin(I + '/tools/rust-r4ghi/I/implementation/runtime121-base-input-prepare01/base-spec121.json', 4579, 'da64371a483b18b17f2af3cb47fa72572b051f26f6ee4097d81ed848d0df86de'),
  base227: pin(P + '/source15-components119-H9-prepared01/promotion01/actual-helper-pins227.json', 35206, '1d88950c22a5f9a7d91ded85ab62d4eae5c58548eb83b36fa39ab5d94285dea1'),
  oldHelperTemplate: pin(H + '/tools/rust-r4ghi/H/implementation/runtime121-composition-templates01/helper-composition121.template.json', 18094, 'e51d1a6dd4b8145932d46203bd03ff25164f9e7d8bf967a112d50c49b3ae26a7'),
  oldExternalTemplate: pin(H + '/tools/rust-r4ghi/H/implementation/runtime121-composition-templates01/external-composition121.template.json', 58048, 'ddd5e1b5b192f4e7308aa9330612da555e18995045f37d01012dc6b776acc40f'),
};
const components = [
  {
    manifest: pin(I + '/tools/rust-r4ghi/I/implementation/runtime-recovery121-code06/sealed-code06/manifest-I121-code06.json', 33419, 'a3ea6d6ab4a656acac615447613a648e3a19a17f0f8bbe23771754ae4e158443'),
    review: null, // Filled only from the real future complete.input.NativeCodeReview.
    G1: pin(R + '/tools/rust-r4ghi/runtime-recovery121/g1B/Root-G1B-121.json', 5254, 'be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc'), count: 9,
  },
  {
    manifest: pin(H + '/tools/rust-r4ghi/H/implementation/support-patches/source15-lease-tax121-code03/sealed-code03/manifest-H121-code03.json', 51589, 'f3933122cb83bbfc91eb9b532cf13b04ea6e682ba69046dd94ee988839793f03'),
    review: pin(I + '/tools/rust-r4ghi/I/independent-H121-code03-review01/review-H121-code03-step121.json', 15169, '8816ac8c1e9ba065dc1fc361fa0f82ef649cffd1e0b89b8d90d693fbf2e529ac'),
    G1: pin(R + '/tools/rust-r4ghi/runtime-recovery121/g1B-current-wire-append01/Root-G1B-current-wire-append01.json', 11782, 'b4d05c19a867b4f4e1990e36b4a742cd23e00958fb0bae6e7e5725e96cc7b15f'), count: 24,
  },
  {
    manifest: pin(R + '/tools/rust-r4ghi/runtime-recovery121/root/tests/sealed-API-code03/manifest-Root8-API-code121.json', 11295, 'aeb02ab6b034f96feb42c20f0cf2b42c5888b96c36f4b2a2d7b3c34a5ce4dd66'),
    review: pin(R + '/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-Root8-API-code-review02/review-Root8-API-code03-step121.json', 14442, '577ef5922ecfe58420b121fab19c0069938c497170e2ad11fd783e496110d8b1'),
    G1: pin(R + '/tools/rust-r4ghi/runtime-recovery121/g1B-API-append02/Root-G1B-API-append02.json', 10198, 'ac9cb66a6501f6e42f26ffe5470f49726dda2b37709e375bd8e043ae13430aad'), count: 8,
  },
];
function keys(v, list) {
  assert(v && Object.getPrototypeOf(v) === Object.prototype);
  assert.deepEqual(Object.keys(v).sort(), [...list].sort());
}
function absolute(f) {
  assert(typeof f === 'string' && f.startsWith('/') && !f.includes('\\') && !f.includes('//') &&
    !f.split('/').some(x => x === '.' || x === '..') && !/[\0\r\n]/.test(f));
}
function pinShape(p) {
  keys(p, ['file', 'bytes', 'rawBytesSha256']); absolute(p.file);
  assert(Number.isSafeInteger(p.bytes) && p.bytes >= 0 && /^[a-f0-9]{64}$/.test(p.rawBytesSha256));
}
const observations = new Map();
function read(p) {
  pinShape(p); const s = fs.lstatSync(p.file, { bigint: true });
  assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1n); assert.equal(fs.realpathSync(p.file), p.file);
  const b = fs.readFileSync(p.file), t = fs.lstatSync(p.file, { bigint: true });
  for (const k of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(s[k], t[k]);
  assert.equal(b.length, p.bytes); assert.equal(SHA(b), p.rawBytesSha256);
  if (observations.has(p.file)) assert.deepEqual(observations.get(p.file), p);
  observations.set(p.file, p); return b;
}
const json = p => JSON.parse(read(p).toString('utf8'));
const same = (a, b) => assert.deepEqual(a, b);
function absent(f) { try { fs.lstatSync(f); } catch (e) { if (e.code === 'ENOENT') return; throw e; } throw new Error('Output entry exists'); }
function descriptors(a, count) {
  assert(Array.isArray(a) && a.length === count); const seen = new Set();
  for (const p of a) {
    keys(p, ['file', 'sha256']); assert(typeof p.file === 'string' && path.posix.normalize(p.file) === p.file &&
      !p.file.startsWith('/') && !p.file.includes('\\') && !p.file.split('/').some(x => x === '..' || x === '.'));
    assert(/^[a-f0-9]{64}$/.test(p.sha256) && !seen.has(p.file)); seen.add(p.file);
  }
  same(a, [...a].sort(sort));
}
function actualCurrent(helper, external, execution) {
  descriptors(helper, 229); descriptors(external, 55); assert.equal(execution.length, 284);
  const expected = [...helper, ...external].map(p => ({ file: R + '/' + p.file, rawBytesSha256: p.sha256 })).sort(sort);
  const normalized = execution.map(p => { pinShape(p); assert(p.file.startsWith(R + '/'));
    return { file: p.file, rawBytesSha256: p.rawBytesSha256 }; }).sort(sort);
  same(execution, [...execution].sort(sort)); assert.equal(new Set(normalized.map(x => x.file)).size, 284); same(normalized, expected);
  const names = fs.readdirSync(R + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n))
    .map(n => 'tools/rust-r4ghi/business/' + n).sort();
  same(names, helper.map(p => p.file).sort());
  for (const p of execution) read(p); // Only the already-matched finite source set is opened.
  return normalized;
}
function rebuildFrames(resolvedComponents) {
  const frames = [], seen = new Set();
  for (const c of resolvedComponents) {
    const m = json(c.manifest), r = json(c.review); read(c.G1);
    assert.equal(r.kind, 'non-author-runtime121-finite-code-step'); assert.equal(r.verdict, 'approved-bounded-step-only');
    assert.equal(r.reviewerIsAuthor, false); assert(typeof r.author === 'string' && r.author && typeof r.reviewer === 'string' && r.reviewer);
    assert.notEqual(r.author, r.reviewer); same(r.componentManifest, c.manifest); same(r.technicalG1, c.G1);
    assert.equal(m.production.length, c.count); assert.equal(r.entries.length, c.count);
    for (const [n, p] of m.production.entries()) {
      assert(!seen.has(p.file)); seen.add(p.file); assert.equal(p.operation, p.beforeSHA256 === null ? 'ADD' : 'MOD');
      assert.equal(p.afterSHA256, p.candidate.rawBytesSha256); read(p.candidate);
      const pointer = '/production/' + n, e = r.entries.find(x => x.file === p.file); assert(e);
      assert.equal(e.beforeSHA256, p.beforeSHA256); assert.equal(e.afterSHA256, p.afterSHA256); assert.equal(e.productPointer, pointer);
      const f = { file: p.file, operation: p.operation, beforeSHA256: p.beforeSHA256, afterSHA256: p.afterSHA256,
        candidate: p.candidate, componentManifest: c.manifest, productPointer: pointer, independentReview: c.review, technicalG1: c.G1 };
      keys(f, frameKeys); frames.push(f);
    }
  }
  assert.equal(frames.length, 41);
  const n = frames.find(f => f.file === N); assert.equal(n.operation, 'ADD'); assert.equal(n.beforeSHA256, null); assert.equal(n.afterSHA256, after);
  return frames.sort(sort);
}
function overlay(base, frames) {
  const map = new Map(base.map(p => [p.file, p.sha256]));
  for (const f of frames) { assert.equal(f.beforeSHA256, map.get(f.file) ?? null); map.set(f.file, f.afterSHA256); }
  return [...map].map(([file, sha256]) => ({ file, sha256 })).sort(sort);
}
function rootComplete(p) {
  const c = json(p); assert.equal(c.kind, 'actual-single-Native-source-promotion-complete121');
  same(c.copiedExactly, [{ file: N, beforeSHA256: before, afterSHA256: after }]);
  for (const k of ['RootStarterVerifiedOnly', 'other282Unchanged', 'fourStateLogBytesUnchanged', 'API121AndEnvAbsent', 'port31441NoListener']) assert.equal(c[k], true);
  for (const k of ['APIStarted', 'nativeAuthorityGranted', 'SQLHTTP', 'businessStateWrite', 'G3', 'G4']) assert.equal(c[k], false);
  const i = json(c.input), peer = json(c.peerReview), root = json(c.RootApproval);
  assert.equal(i.kind, 'Root-runtime121-single-Native-source-promotion-input');
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(i.nonce));
  absolute(i.outputDirectory); assert(i.outputDirectory.startsWith(P + '/')); assert.equal(path.posix.basename(i.outputDirectory), i.nonce);
  assert.equal(p.file, i.outputDirectory + '/complete.json');
  const plan = json(i.plan); assert.equal(plan.copyOperations.length, 1); assert.equal(plan.alreadyChangedRootVerifyOnly.length, 1);
  const op = plan.copyOperations[0]; assert.equal(op.file, N); assert.equal(op.target, R + '/' + N);
  assert.equal(op.operationForPhysicalPromotion, 'MOD'); assert.equal(op.beforeSHA256, before); assert.equal(op.afterSHA256, after);
  same(op.componentManifest, components[0].manifest); assert.equal(op.productPointer, '/production/1');
  assert.equal(op.originalRegistrationOperation, 'ADD'); assert.equal(op.originalRegistrationBeforeSHA256, null);
  const nativeProduct = json(components[0].manifest).production[1]; assert.equal(nativeProduct.file, N);
  assert.equal(nativeProduct.afterSHA256, after); same(op.candidate, nativeProduct.candidate); read(op.candidate);
  keys(plan.expectedOnly, ['helper229', 'external55', 'executionSources284']);
  same(plan.inputs.newRoot8, components[2].manifest); same(i.Root8CodeReview, components[2].review);
  const newReview = json(i.NativeCodeReview);
  assert.equal(newReview.kind, 'non-author-runtime121-finite-code-step'); assert.equal(newReview.verdict, 'approved-bounded-step-only');
  assert.equal(newReview.reviewerIsAuthor, false); same(newReview.componentManifest, components[0].manifest);
  same(newReview.technicalG1, components[0].G1); assert.equal(newReview.entries.length, 9);
  const resolvedComponents = [{ ...components[0], review: i.NativeCodeReview }, components[1], components[2]];
  assert(i.operator.file.startsWith(R + '/tools/rust-r4ghi/runtime-recovery121/') && i.operator.file.endsWith('.mjs')); read(i.operator);
  assert.equal(peer.kind, 'non-author-runtime121-single-Native-source-safety-review'); assert.equal(peer.verdict, 'approved-once-single-Native-FS-promotion');
  assert.equal(peer.reviewerIsAuthor, false); same(peer.approvedInput, c.input); same(peer.expectedRootApproval, c.RootApproval); same(peer.operator, i.operator);
  assert.equal(root.kind, 'Root-single-Native-source-promotion-approval121'); assert.equal(root.mode, 'single-native-promotion');
  same(root.approvedInput, c.input); same(root.NativeCodeReview, i.NativeCodeReview); same(root.Root8CodeReview, i.Root8CodeReview);
  same(root.plan, i.plan); assert.equal(root.nonce, i.nonce);
  assert.equal(root.copyTarget, R + '/' + N); assert.equal(root.beforeSHA256, before); assert.equal(root.afterSHA256, after);
  for (const k of ['helperPins', 'externalPins', 'executionSources']) { pinShape(c[k]); assert(c[k].file.startsWith(i.outputDirectory + '/')); }
  return { complete: c, plan, resolvedComponents };
}
export function materialize06(completePin, output) {
  assert.equal(process.platform, 'linux'); pinShape(completePin); absolute(output);
  assert(output.startsWith(P + '/runtime121-compositions06/'));
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(path.posix.basename(output)));
  assert.equal(path.posix.dirname(output), P + '/runtime121-compositions06'); absent(output);
  const { complete: actual, plan: sourcePlan, resolvedComponents } = rootComplete(completePin);
  const helper = json(actual.helperPins), external = json(actual.externalPins), execution = json(actual.executionSources);
  same(helper, json(sourcePlan.expectedOnly.helper229)); same(external, json(sourcePlan.expectedOnly.external55));
  const currentExecution = actualCurrent(helper, external, execution);
  same(currentExecution, json(sourcePlan.expectedOnly.executionSources284));
  assert.equal(helper.find(p => p.file === N).sha256, after); // A not-yet-promoted Root cannot reach any output write.
  const base = json(refs.base18), oldH = json(refs.oldHelperTemplate), oldE = json(refs.oldExternalTemplate);
  assert.equal(Object.keys(base).length, 18); same(base.helperPins227, refs.base227); same(oldH.baseHelperPins, refs.base227);
  assert.equal(oldH.finalHelperPins, null); assert.equal(oldE.finalSources, null);
  const baseH = json(refs.base227); descriptors(baseH, 227); descriptors(oldE.baseSources, 45);
  const d = oldE.protectedDependencies;
  keys(d, ['kind', 'sourceManifest', 'sourcePointer', 'sources', 'archive', 'independentReview', 'RootAppendFreeze']);
  assert.equal(d.kind, 'Root-runtime121-fixed-protected261-registration'); assert.equal(d.sourcePointer, '/protected261GenericDependencyOnly');
  assert.equal(d.sourceManifest.rawBytesSha256, '1570b7187ec4a714c3c92f57b22147a53242084c1636c326a11d297b05e8db5a');
  assert.equal(d.archive.rawBytesSha256, '3b724ea1c258f25a037a4675d243757ca91e9ae7371af8abe72c74356dd2a598');
  assert.equal(d.independentReview.rawBytesSha256, '42226f43be965d3985f0140a66c946f7619e1f5f1eac32c80c096a67b1853b2f');
  assert.equal(d.RootAppendFreeze.rawBytesSha256, '4ce7369f93c9ecdc2ab9fb06dccb6eb3c4372535f140130e31ef6e04ae7d3f95');
  for (const k of ['sourceManifest', 'archive', 'independentReview', 'RootAppendFreeze']) read(d[k]);
  assert.equal(d.sources.length, 2); for (const s of d.sources) read(s);
  const frames = rebuildFrames(resolvedComponents), hf = frames.filter(f => f.file.startsWith('tools/rust-r4ghi/business/')), ef = frames.filter(f => !f.file.startsWith('tools/rust-r4ghi/business/'));
  assert.equal(hf.length, 11); assert.equal(ef.length, 30); same(overlay(baseH, hf), helper); same(overlay(oldE.baseSources, ef), external);
  const helperBody = { kind: 'Root-Source15-runtime121-H3-composition', baseHelperPins: refs.base227, finalHelperPins: actual.helperPins, frames: hf };
  const externalBody = { kind: 'Root-Source15-runtime121-external-composition', baseSources: oldE.baseSources, finalSources: external, frames: ef, protectedDependencies: d };
  for (const p of [...observations.values()]) read(p); actualCurrent(helper, external, execution);
  const parent = path.posix.dirname(output); fs.mkdirSync(parent, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(parent), parent);
  fs.mkdirSync(output, { mode: 0o700 });
  const save = (name, value) => { const file = output + '/' + name, b = Buffer.from(JSON.stringify(value, null, 2) + '\n');
    fs.writeFileSync(file, b, { flag: 'wx', mode: 0o600 }); const out = pin(file, b.length, SHA(b)); read(out); return out; };
  try {
    const hPin = save('helper-composition121.json', helperBody), ePin = save('external-composition121.json', externalBody);
    const xPin = save('execution-sources284.native.json', currentExecution);
    const compositionPin = save('plan-composition121.json', { helperComposition: hPin, externalComposition: ePin, independentCodeReviews: resolvedComponents.map(c => c.review) });
    for (const p of [...observations.values()]) read(p); actualCurrent(helper, external, execution);
    return save('complete.json', { kind: 'Root-runtime121-Native06-composition-materialized', sourceSafetyComplete: completePin,
      actualGraphs: { helper: actual.helperPins, external: actual.externalPins, execution: actual.executionSources },
      helperComposition: hPin, externalComposition: ePin, planComposition: compositionPin, normalizedExecutionSources: xPin,
      components: resolvedComponents, frames: { helper: 11, external: 30, total: 41 }, oldBasePlanKeys: 18, protectedDependencyKeys: 7,
      physicalNativeDelta: { operation: 'MOD', beforeSHA256: before, afterSHA256: after },
      originalNativeRegistration: { operation: 'ADD', beforeSHA256: null, afterSHA256: after },
      rootSourceRawRechecked: true, oldInputsUnmodified: true, nativeOrHelperExecuted: false,
      runtimeAuthorityGranted: false, actualG2Granted: false, APIStartGranted: false, businessG3: false, businessG4: false });
  } catch (e) {
    try { save('partial.json', { kind: 'composition-materialization-failed-preserve121', sourceSafetyComplete: completePin,
      message: 'Metadata generation stopped; preserve this directory and review before a new output attempt.',
      name: ['Error', 'AssertionError', 'SyntaxError', 'TypeError'].includes(e.name) ? e.name : 'Error', actualG2Granted: false }); } catch { /* Preserve original failure. */ }
    throw e;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const a = process.argv.slice(2); assert.equal(a.length, 9); assert.equal(a[8], '--execute');
    const v = {}; for (let n = 0; n < 8; n += 2) { assert(['--complete', '--complete-sha', '--complete-bytes', '--output'].includes(a[n]) && !Object.hasOwn(v, a[n])); v[a[n]] = a[n + 1]; }
    keys(v, ['--complete', '--complete-sha', '--complete-bytes', '--output']);
    assert(/^(0|[1-9][0-9]*)$/.test(v['--complete-bytes']));
    const result = materialize06(pin(v['--complete'], Number(v['--complete-bytes']), v['--complete-sha']), v['--output']);
    console.log(JSON.stringify(result));
  } catch { console.error(JSON.stringify({ kind: 'composition-materializer-stopped121', message: 'No authority granted; preserve any partial metadata and do not replace prior evidence.' })); process.exitCode = 1; }
}
