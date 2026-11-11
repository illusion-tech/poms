// FS-only authoring. Never imports task helpers, reads business state/env,
// measures an active Root graph, or writes Root/private namespaces.
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
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const utf8 = (a, b) => Buffer.compare(Buffer.from(a.file), Buffer.from(b.file));
const clone = x => JSON.parse(JSON.stringify(x));
const local = f => f.startsWith('/mnt/e/') ? 'E:/' + f.slice(7)
  : f.startsWith('/home/') ? '//wsl.localhost/Debian' + f : f;
const linux = f => f.replaceAll('\\', '/').replace(/^E:\//, '/mnt/e/');
const pin = (file, bytes, rawBytesSha256) => ({ file, bytes, rawBytesSha256 });
const planPin = pin(H + '/tools/rust-r4ghi/H/implementation/runtime121-finite-promotion-plan01/promotion-plan01.json',
  388852, 'a11dbaa8a582487d5d3b3b0fa0919c513e5c45661b64238456029168cf8b05a8');
const stepsPin = pin(R + '/tools/rust-r4ghi/independent/runtime121-components03-steps/components.json',
  5166, 'd70a73eda70004c381f8d4e12387ef35002c4a2efd79619a57fe1e3a19bbf5c9');
const baseSpecPin = pin(I + '/tools/rust-r4ghi/I/implementation/runtime121-base-input-prepare01/base-spec121.json',
  4579, 'da64371a483b18b17f2af3cb47fa72572b051f26f6ee4097d81ed848d0df86de');
const baseHelperPin = pin(P + '/source15-components119-H9-prepared01/promotion01/actual-helper-pins227.json',
  35206, '1d88950c22a5f9a7d91ded85ab62d4eae5c58548eb83b36fa39ab5d94285dea1');
const dependencyReview = pin(H + '/tools/rust-r4ghi/H/independent-runtime-recovery121-protected261-design02/review-protected261-design02.json',
  15500, '42226f43be965d3985f0140a66c946f7619e1f5f1eac32c80c096a67b1853b2f');
const dependencyFreeze = pin(R + '/tools/rust-r4ghi/runtime-recovery121/g1B-protected261-append01/Root-G1B-protected261-append01.json',
  3850, '4ce7369f93c9ecdc2ab9fb06dccb6eb3c4372535f140130e31ef6e04ae7d3f95');
const frameKeys = ['file', 'operation', 'beforeSHA256', 'afterSHA256', 'candidate',
  'componentManifest', 'productPointer', 'independentReview', 'technicalG1'];
const dependencyKeys = ['kind', 'sourceManifest', 'sourcePointer', 'sources', 'archive',
  'independentReview', 'RootAppendFreeze'];
const readSet = new Map();

function pinShape(p) {
  assert(p && Object.getPrototypeOf(p) === Object.prototype);
  assert.deepEqual(Object.keys(p).sort(), ['bytes', 'file', 'rawBytesSha256'].sort());
  assert(typeof p.file === 'string' && p.file.startsWith('/') && !p.file.includes('\\') &&
    !p.file.includes('//') && !p.file.split('/').some(s => s === '.' || s === '..') &&
    !/[\0\r\n]/.test(p.file));
  assert(Number.isSafeInteger(p.bytes) && p.bytes >= 0);
  assert(/^[a-f0-9]{64}$/.test(p.rawBytesSha256));
}
function read(p) {
  pinShape(p);
  const f = local(p.file), st = fs.lstatSync(f);
  assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1, 'Regular non-symlink single-link input');
  assert.equal(fs.realpathSync(f), path.resolve(f), 'Exact observed Windows/UNC realpath');
  const b = fs.readFileSync(f);
  assert.equal(b.length, p.bytes); assert.equal(sha(b), p.rawBytesSha256);
  if (readSet.has(p.file)) assert.deepEqual(readSet.get(p.file), p);
  readSet.set(p.file, clone(p));
  return b;
}
const json = p => JSON.parse(read(p).toString('utf8'));
function pointer(value, p) {
  assert(/^\/production\/(0|[1-9][0-9]*)$/.test(p));
  return value.production[Number(p.slice('/production/'.length))];
}
function relative(file) {
  assert(file.startsWith(R + '/'));
  const r = file.slice(R.length + 1);
  assert(path.posix.normalize(r) === r && !r.includes('\\') &&
    !r.split('/').some(x => !x || x === '.' || x === '..'));
  return r;
}
const namedCheckResults = [];
function check(name, fn) {
  fn(); namedCheckResults.push({ name, result: 'PASS' });
}
function reject(name, fn) {
  assert.throws(fn); namedCheckResults.push({ name, result: 'REJECTED_AS_EXPECTED' });
}

const plan = json(planPin), steps = json(stepsPin), baseSpec = json(baseSpecPin);
assert.equal(steps.kind, 'Root-runtime121-approved-bounded-code-components');
assert.equal(steps.allThreeBoundedCodeStepsApproved, true);
assert.equal(steps.sourcePromotionGranted, false);
assert.deepEqual(steps.components.map(c => [c.name, c.entries]), [['I03', 9], ['H03', 24], ['Root8', 8]]);
const planned = [...plan.copyOperations33, ...plan.alreadyDeliveredVerifyOnlyRoot8];
assert.equal(planned.length, 41); assert.equal(new Set(planned.map(p => p.file)).size, 41);
const components = new Map();
for (const c of steps.components) {
  const manifest = json(c.component), review = json(c.review);
  read(c.technicalG1);
  assert.equal(manifest.production.length, c.entries);
  assert.equal(review.kind, 'non-author-runtime121-finite-code-step');
  assert.equal(review.verdict, 'approved-bounded-step-only');
  assert.equal(review.reviewerIsAuthor, false);
  assert(typeof review.author === 'string' && review.author.length > 0);
  assert(typeof review.reviewer === 'string' && review.reviewer.length > 0);
  assert.notEqual(review.author, review.reviewer);
  assert.deepEqual(review.componentManifest, c.component);
  assert.deepEqual(review.technicalG1, c.technicalG1);
  assert.equal(review.entries.length, c.entries);
  assert.equal(new Set(review.entries.map(e => e.file)).size, c.entries);
  components.set(c.name, { ...c, reviewPin: c.review, manifest, review });
}

// Parse only fixed data literals from the pinned source text; never evaluate or
// import Native. Unsupported edits to the finite literal grammar fail closed.
const i = components.get('I03');
const corePin = i.manifest.production.find(p => p.file.endsWith('/runtime-admission-core121.mjs')).candidate;
const nativePin = i.manifest.production.find(p => p.file.endsWith('/runtime-admission121.mjs')).candidate;
const core = read(corePin).toString('utf8'), native = read(nativePin).toString('utf8');
const quoted = s => [...s.matchAll(/'([^']+)'/g)].map(m => m[1]);
const frameLiteral = core.match(/keys121\(frame, \[([\s\S]*?)\], 'finite source frame'\)/);
assert(frameLiteral); assert.deepEqual(quoted(frameLiteral[1]), frameKeys);
const baseLiteral = core.match(/export const baseKeys121 = Object\.freeze\(\[([\s\S]*?)\]\);/);
assert(baseLiteral); const baseKeys = quoted(baseLiteral[1]);
assert.equal(baseKeys.length, 18); assert.deepEqual(Object.keys(baseSpec), baseKeys);
assert.deepEqual(baseSpec.helperPins227, baseHelperPin);
const depLiteral = native.match(/function protectedDependencies121\(r,plan\) \{\s*keys121\(r,\[([^\]]+)\]\);/);
assert(depLiteral); assert.deepEqual(quoted(depLiteral[1]), dependencyKeys);
function finiteLiteral(name, h3 = false) {
  const re = h3
    ? /export const H3Changes121 = Object\.freeze\(\[([\s\S]*?)\]\.map\(n => 'tools\/rust-r4ghi\/business\/' \+ n\)\.sort\(\)\);/
    : new RegExp('export const ' + name + ' = Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\.sort\\(\\)\\);');
  const match = core.match(re); assert(match, 'Pinned finite declaration ' + name);
  if (h3) {
    assert.equal(match[1].replace(/'[^']+'/g, '').replace(/[\s,]/g, ''), '');
    return quoted(match[1]).map(n => 'tools/rust-r4ghi/business/' + n).sort();
  }
  const expanded = match[1].replace(/\.\.\.\[([\s\S]*?)\]\s*\.map\(n => '([^']+)' \+ n\)/g,
    (_, names, prefix) => {
      assert.equal(names.replace(/'[^']+'/g, '').replace(/[\s,]/g, ''), '');
      return quoted(names).map(n => JSON.stringify(prefix + n)).join(',');
    }).replace(/"([^"\n]+)"/g, "'$1'");
  assert.equal(expanded.replace(/'[^']+'/g, '').replace(/[\s,]/g, ''), '');
  return quoted(expanded).sort();
}
const allowedHelper = finiteLiteral('H3Changes121', true);
const allowedExternalMOD = finiteLiteral('ExternalChanges121');
const allowedExternalADD = finiteLiteral('ExternalAdds121');
assert.equal(allowedHelper.length, 11); assert.equal(allowedExternalMOD.length, 20);
assert.equal(allowedExternalADD.length, 10);

const original = new Map();
for (const archive of plan.retainedSourceArchives) {
  const map = json(archive);
  for (const m of map.mappings) {
    const file = relative(m.originalPin.file);
    assert(!original.has(file));
    // Only source descriptors here: do not open business state, env, or current
    // Root target files. A11 records the original physical observations.
    pinShape(m.originalPin); pinShape(m.privateRawCopy);
    assert.equal(m.originalPin.rawBytesSha256, m.privateRawCopy.rawBytesSha256);
    assert.equal(m.originalPin.bytes, m.privateRawCopy.bytes);
    original.set(file, m.originalPin.rawBytesSha256);
  }
}
assert.equal(original.size, 272);
const helperBase = [...original].filter(([f]) => f.startsWith('tools/rust-r4ghi/business/'))
  .map(([file, sha256]) => ({ file, sha256 })).sort(utf8);
const externalBase = [...original].filter(([f]) => !f.startsWith('tools/rust-r4ghi/business/'))
  .map(([file, sha256]) => ({ file, sha256 })).sort(utf8);
assert.equal(helperBase.length, 227); assert.equal(externalBase.length, 45);
assert.deepEqual(json(baseHelperPin), helperBase);

const frames = planned.map(p => {
  const c = components.get(p.component); assert(c);
  const product = pointer(c.manifest, p.productPointer); assert(product);
  assert.equal(product.file, p.file);
  assert.equal(product.operation, p.operationFromOriginal272);
  assert.equal(product.beforeSHA256, p.expectedOldSHA256);
  assert.equal(product.afterSHA256, p.expectedNewSHA256);
  assert.deepEqual(product.candidate, p.sourceCandidate);
  assert.deepEqual(p.componentManifest, c.component);
  read(product.candidate);
  return {
    file: p.file, operation: product.operation,
    beforeSHA256: product.beforeSHA256, afterSHA256: product.afterSHA256,
    candidate: product.candidate, componentManifest: c.component,
    productPointer: p.productPointer, independentReview: c.reviewPin,
    technicalG1: c.technicalG1,
  };
}).sort(utf8);

function validateFrames(items, before, expected, allowed) {
  const map = new Map(before.map(x => [x.file, x.sha256])), seen = new Set();
  for (const f of items) {
    assert.deepEqual(Object.keys(f).sort(), [...frameKeys].sort());
    assert(allowed.includes(f.file)); assert(!seen.has(f.file)); seen.add(f.file);
    assert.equal(f.beforeSHA256, map.get(f.file) ?? null);
    assert.equal(f.operation, f.beforeSHA256 === null ? 'ADD' : 'MOD');
    assert(/^[a-f0-9]{64}$/.test(f.afterSHA256)); assert.notEqual(f.afterSHA256, f.beforeSHA256);
    for (const k of ['candidate', 'componentManifest', 'independentReview', 'technicalG1']) pinShape(f[k]);
    const c = [...components.values()].find(c => c.component.file === f.componentManifest.file);
    assert(c); assert.deepEqual(f.componentManifest, c.component);
    assert.deepEqual(f.independentReview, c.reviewPin);
    assert.deepEqual(f.technicalG1, c.technicalG1);
    const p = pointer(c.manifest, f.productPointer);
    assert.equal(p.file, f.file); assert.equal(p.operation, f.operation);
    assert.equal(p.beforeSHA256, f.beforeSHA256); assert.equal(p.afterSHA256, f.afterSHA256);
    assert.deepEqual(p.candidate, f.candidate); assert.equal(f.candidate.rawBytesSha256, f.afterSHA256);
    const e = c.review.entries.find(x => x.file === f.file); assert(e);
    assert.equal(e.beforeSHA256, f.beforeSHA256); assert.equal(e.afterSHA256, f.afterSHA256);
    assert.equal(e.productPointer, f.productPointer);
    if (e.operation !== undefined) assert.equal(e.operation, f.operation);
    if (e.candidate !== undefined) assert.deepEqual(e.candidate, f.candidate);
    map.set(f.file, f.afterSHA256);
  }
  assert.deepEqual([...seen].sort(), [...allowed].sort());
  assert.deepEqual([...map].map(([file, sha256]) => ({ file, sha256 })).sort(utf8), expected);
}
const helperFrames = frames.filter(f => allowedHelper.includes(f.file));
const externalFrames = frames.filter(f => !allowedHelper.includes(f.file));
const expectedHelper = clone(plan.expectedHelper229), expectedExternal = clone(plan.expectedExternal55);
check('11 helper frames: exact Native finite set and full expected229',
  () => validateFrames(helperFrames, helperBase, expectedHelper, allowedHelper));
check('30 external frames: exact Native finite set and full expected55',
  () => validateFrames(externalFrames, externalBase, expectedExternal, [...allowedExternalMOD, ...allowedExternalADD]));
assert.equal(helperFrames.filter(f => f.operation === 'ADD').length, 2);
assert.equal(helperFrames.filter(f => f.operation === 'MOD').length, 9);
assert.equal(externalFrames.filter(f => f.operation === 'ADD').length, 10);
assert.equal(externalFrames.filter(f => f.operation === 'MOD').length, 20);
assert.equal(expectedHelper.length, 229); assert.equal(expectedExternal.length, 55);
const expectedExecution = [...expectedHelper, ...expectedExternal]
  .map(p => ({ file: R + '/' + p.file, rawBytesSha256: p.sha256 })).sort(utf8);
assert.equal(expectedExecution.length, 284);
assert.equal(new Set(expectedExecution.map(x => x.file)).size, 284);
for (const x of expectedExecution) assert.deepEqual(Object.keys(x), ['file', 'rawBytesSha256']);

const dependencyArchive = plan.retainedSourceArchives[2], dep = json(dependencyArchive);
assert.equal(dep.kind, 'Root-private-unchanged-generic261-source-supplement121');
assert.deepEqual(dep.baseArchive, plan.retainedSourceArchives[0]);
assert.deepEqual(dep.H9Supplement, plan.retainedSourceArchives[1]);
assert.equal(dep.sourceCount, 2); assert.equal(dep.combinedUniqueSourceCount, 272);
assert.equal(dep.productionChanges, 0); assert.equal(dep.H3Changes, 0);
const sourceManifest = json(dep.originalCode120Manifest);
assert.equal(dep.originalCode120Manifest.rawBytesSha256, '1570b7187ec4a714c3c92f57b22147a53242084c1636c326a11d297b05e8db5a');
assert.equal(dep.originalPointer, '/protected261GenericDependencyOnly');
const fixedSources = dep.mappings.map(m => m.originalPin);
const identities = a => a.map(x => ({ file: x.file, rawBytesSha256: x.rawBytesSha256 })).sort(utf8);
assert.deepEqual(identities(sourceManifest.protected261GenericDependencyOnly), identities(fixedSources));
assert.deepEqual(identities(fixedSources), [
  { file: R + '/tools/rust-r4ghi/policy-replayless261-continuation03/cases261.mjs', rawBytesSha256: 'a75d9dbed57869ca3299c7edcc2dd3bbdf526cf2a8cd21235e2aa8c0611f9331' },
  { file: R + '/tools/rust-r4ghi/policy-replayless261-continuation03/core261.mjs', rawBytesSha256: '0fe889f86e59c253ca8e397338b535509d5ec0485a8ab09f6c5a7abf5bfef6d3' },
]);
read(dependencyReview); read(dependencyFreeze);
const protectedDependencies = {
  kind: 'Root-runtime121-fixed-protected261-registration',
  sourceManifest: dep.originalCode120Manifest, sourcePointer: dep.originalPointer,
  sources: fixedSources, archive: dependencyArchive,
  independentReview: dependencyReview, RootAppendFreeze: dependencyFreeze,
};
assert.deepEqual(Object.keys(protectedDependencies), dependencyKeys);
const helperTemplate = {
  kind: 'Root-Source15-runtime121-H3-composition',
  baseHelperPins: baseHelperPin, finalHelperPins: null, frames: helperFrames,
};
const externalTemplate = {
  kind: 'Root-Source15-runtime121-external-composition',
  baseSources: externalBase, finalSources: null, frames: externalFrames,
  protectedDependencies,
};
const compositionSlots = {
  helperComposition: null, externalComposition: null,
  independentCodeReviews: steps.components.map(c => c.review),
};
check('base plan remains exact18 and dependency registration exact7', () => {
  assert.deepEqual(Object.keys(baseSpec), baseKeys);
  assert(!Object.hasOwn(baseSpec, 'dependencySupplement'));
  assert(!Object.hasOwn(baseSpec, 'actualExternalFacts'));
  assert.deepEqual(Object.keys(protectedDependencies), dependencyKeys);
});
check('future actual data cannot be claimed by template slots', () => {
  assert.equal(helperTemplate.finalHelperPins, null); assert.equal(externalTemplate.finalSources, null);
  assert.equal(compositionSlots.helperComposition, null); assert.equal(compositionSlots.externalComposition, null);
  assert.notDeepEqual(externalTemplate.finalSources, expectedExternal);
});
const mutateHelper = change => { const v = clone(helperFrames); change(v); return v; };
const helperValidation = v => validateFrames(v, helperBase, expectedHelper, allowedHelper);
reject('missing operation', () => helperValidation(mutateHelper(x => delete x[0].operation)));
reject('extra frame key', () => helperValidation(mutateHelper(x => x[0].approved = true)));
reject('wrong before hash', () => helperValidation(mutateHelper(x => x[0].beforeSHA256 = '0'.repeat(64))));
reject('wrong operation', () => helperValidation(mutateHelper(x => x[0].operation = x[0].operation === 'ADD' ? 'MOD' : 'ADD')));
reject('wrong candidate identity', () => helperValidation(mutateHelper(x => x[0].candidate.rawBytesSha256 = '0'.repeat(64))));
reject('wrong product pointer', () => helperValidation(mutateHelper(x => x[0].productPointer = '/production/999')));
reject('wrong component manifest', () => helperValidation(mutateHelper(x => x[0].componentManifest.rawBytesSha256 = '0'.repeat(64))));
reject('wrong technical G1', () => helperValidation(mutateHelper(x => x[0].technicalG1.rawBytesSha256 = '0'.repeat(64))));
reject('wrong independent review', () => helperValidation(mutateHelper(x => x[0].independentReview.rawBytesSha256 = '0'.repeat(64))));
reject('duplicate frame', () => helperValidation([...helperFrames, helperFrames[0]]));
reject('missing frame', () => helperValidation(helperFrames.slice(1)));
reject('foreign frame target', () => helperValidation(mutateHelper(x => x[0].file += '.foreign')));
reject('changed expected protected source', () => {
  const x = clone(expectedHelper); x.find(p => !allowedHelper.includes(p.file)).sha256 = '0'.repeat(64);
  validateFrames(helperFrames, helperBase, x, allowedHelper);
});

// Fixed inputs are re-read before any candidate output is written. This is a
// source/metadata authoring observation, not a Root source promotion proof.
for (const p of [...readSet.values()]) read(p);
const writes = [];
function output(name, value) {
  const f = path.join(D, name); assert.equal(path.dirname(path.resolve(f)), path.resolve(D));
  fs.writeFileSync(f, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const b = fs.readFileSync(f), out = pin(linux(f), b.length, sha(b)); writes.push(out); return out;
}
const helperOut = output('helper-composition121.template.json', helperTemplate);
const externalOut = output('external-composition121.template.json', externalTemplate);
const slotsOut = output('plan-composition121.template.json', compositionSlots);
const expectedHelperOut = output('expected-helper229.json', expectedHelper);
const expectedExternalOut = output('expected-external55.json', expectedExternal);
const expectedExecutionOut = output('expected-execution-sources284.json', expectedExecution);
const checksOut = output('checks-composition-templates01.json', {
  kind: 'H-author-FS-composition-template-checks121',
  namedChecks: namedCheckResults, failedChecks: 0,
  schemaSourcePins: { core: corePin, native: nativePin },
  observedNativeFrameKeys: frameKeys, observedNativeBaseKeys: baseKeys,
  observedNativeProtectedDependencyKeys: dependencyKeys,
  actualComponentProductsAndReviewEntriesChecked: 41,
  actualCandidateRawFilesChecked: 41,
  actualReadonlyInputs: [...readSet.values()].sort(utf8),
  prePostRawInputStable: true, A11ExpectedOrderAlreadyUTF8: true,
  RootCurrentTargetsRead: false, businessStateOrEnvRead: false,
  helperOrNativeExecuted: false, RootOrPrivateWritten: false,
  actualFinalGraphMeasured: false, sourcePromotionGranted: false, actualG2Authorized: false,
});
const assemblerBytes = fs.readFileSync(fileURLToPath(import.meta.url));
const assemblerPin = pin(linux(fileURLToPath(import.meta.url)), assemblerBytes.length, sha(assemblerBytes));
const manifest = {
  kind: 'H-runtime121-composition-templates-author-candidate',
  status: 'TEMPLATE_ONLY_NOT_EXECUTABLE_NOT_ACTUAL_COMPOSITION',
  inputs: { A11PromotionPlan: planPin, approvedBoundedComponentSteps: stepsPin,
    exact18KeyBaseSpec: baseSpecPin, baseHelperPins227: baseHelperPin },
  products: { helperTemplate: helperOut, externalTemplate: externalOut, planCompositionSlots: slotsOut,
    expectedHelper229: expectedHelperOut, expectedExternal55: expectedExternalOut,
    expectedExecutionSources284: expectedExecutionOut },
  validation: checksOut, assembler: assemblerPin,
  counts: { products: 41, helperFrames: 11, helperADD: 2, helperMOD: 9,
    externalFrames: 30, externalADD: 10, externalMOD: 20,
    baseHelper227: 227, baseExternal45: 45, expectedHelper229: 229,
    expectedExternal55: 55, expectedExecutionSources284: 284 },
  futureActualHelperPins: null, futureActualExternalFacts: null,
  futureActualHelperComposition: null, futureActualExternalComposition: null,
  futureActualExecutionSources: null, SourceSafetyReview: null,
  independentExactCompositionReview: null, actualG2Authorized: false,
  RootPromotionGranted: false, actualRuntimeAuthorityGranted: false, G3: false, G4: false,
  instantiationConstraints: [
    'Root independently measures the actual full229 helper graph and actual55 external array after exact SourceSafety/promotion; expected arrays are comparison-only.',
    'Root saves measured actual arrays with wx/readback. Use its actual229 pin as helper.finalHelperPins; fill external.finalSources from its measured55 array, then wx/readback the complete two compositions.',
    'The Native external composition schema has finalSources (array), not an actualExternalFacts input key. This manifest futureActualExternalFacts:null is provenance only.',
    'Only after those real files exist may a fresh plan use their actual pins in composition.helperComposition/externalComposition and the three original independentCodeReviews.',
    'Keep base18 unchanged. Protected261 registration stays the exact7-key member of external composition; its two files remain unchanged dependencies.',
    'All input/output authority paths remain explicit Linux pins; local Windows/UNC mapping is observation-only and never changes a pin or reviewed plan.',
    'Root8 are existing delivered files to verify; do not recopy them. I9/H24 promotion requires Root-only exact SourceSafety and approval.',
    'Component steps are bounded code approvals only. These templates do not certify joint composition, API, runtime, business G3/G4, or authorize any actual mode.',
    'Any component revision requires a new edition and exact downstream review; preserve this edition and A11 unchanged.',
  ],
};
const manifestOut = output('manifest-composition-templates01.json', manifest);
console.log(JSON.stringify({ manifest: manifestOut, helperTemplate: helperOut,
  externalTemplate: externalOut, checks: checksOut, namedChecks: namedCheckResults.length }));
