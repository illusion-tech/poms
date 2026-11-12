// Pure FS/data candidate; the author has not executed it. No Native/helper imports.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const M = '/home/wangzishi/projects/poms-rust-r4ghi';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D15 = P + '/business/g2-business15/main01';
const baseSpec = { file: '/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime121-base-input-prepare01/base-spec121.json', bytes: 4579, rawBytesSha256: 'da64371a483b18b17f2af3cb47fa72572b051f26f6ee4097d81ed848d0df86de' };
const top12 = ['kind', 'protocolVersion', 'namespace', 'epoch', 'run', 'nonce', 'base', 'current', 'composition', 'stateTransfer', 'tooling', 'outputs'];
const base18 = ['codeAdmission15', 'codeCandidate15', 'approvedCodePlan15', 'sourcePins', 'compilePins', 'helperPins227', 'buildBinding', 'retainedState15', 'ownership15', 'sourceArchive121', 'sourceArchiveSupplement121', 'runtimeLossObservation', 'failedInvocation', 'failedInvocationReview', 'prepared15', 'fullInventory', 'bodySHA256', 'preparedBaseline'];
const current13 = ['sourcePins', 'compilePins', 'helperPins', 'helperCount', 'binary', 'summaryBinary', 'binaryFiles', 'nodeExecutable', 'lifetimeOwner', 'PGStart', 'PGConservation', 'apiProcess', 'readiness'];
const apiCurrent12 = [...current13.filter(k => !['apiProcess', 'readiness'].includes(k)), 'baseNormalEnv'];
const apiInput17 = ['kind', 'schemaVersion', 'namespace', 'epoch', 'run', 'nonce', 'G1B', 'operatorBaseline', 'codeReview', 'base', 'current', 'composition', 'expectedStates', 'executionSources', 'outputDirectory', 'processFile', 'normalEnvFile'];
const record25 = ['kind', 'protocolVersion', 'namespace', 'epoch', 'run', 'root', 'port', 'pid', 'startTime', 'startedAt', 'bootId', 'binary', 'binarySha256', 'binaryFiles', 'baseBuildBinding', 'sourcePins', 'compilePins', 'helperPins', 'baseAPIProcess', 'lifetimeOwner', 'normalEnv', 'baseNormalEnv', 'readinessAttempt', 'input', 'code'];
const I9 = ['tools/rust-r4ghi/business/runtime-admission-core121.mjs', 'tools/rust-r4ghi/business/runtime-admission121.mjs', 'tools/rust-r4ghi/business/consumer-admission54.mjs', 'tools/rust-r4ghi/business/http.mjs', 'tools/rust-r4ghi/business/fault-sweep.mjs', 'tools/rust-r4ghi/business/gh-write-facts.mjs', 'tools/rust-r4ghi/business/trusted.mjs', 'tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs', 'tools/rust-r4ghi/runtime-recovery121/native/input121.template.json'];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const order = (a, b) => Buffer.compare(Buffer.from(a.file), Buffer.from(b.file));
const clone = x => JSON.parse(JSON.stringify(x));
function keys(o, names) { assert(o && Object.getPrototypeOf(o) === Object.prototype); assert.deepEqual(Object.keys(o).sort(), [...names].sort()); }
function absolute(f) { assert(typeof f === 'string' && f.startsWith('/') && !f.includes('\\') && !f.includes('//') && !f.split('/').some(s => s === '.' || s === '..') && !/[\0\r\n]/.test(f)); }
function metadataPin(p, full = false) {
  keys(p, full || Object.hasOwn(p ?? {}, 'bytes') ? ['file', 'bytes', 'rawBytesSha256'] : ['file', 'rawBytesSha256']);
  absolute(p.file); assert(/^[a-f0-9]{64}$/.test(p.rawBytesSha256));
  if (Object.hasOwn(p, 'bytes')) assert(Number.isSafeInteger(p.bytes) && p.bytes >= 0);
}
function samePin(a, b) { metadataPin(a); metadataPin(b); assert.equal(a.file, b.file); assert.equal(a.rawBytesSha256, b.rawBytesSha256); if (a.bytes !== undefined && b.bytes !== undefined) assert.equal(a.bytes, b.bytes); }
function measured(file) {
  absolute(file); const s = fs.lstatSync(file, { bigint: true });
  assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1n); assert.equal(fs.realpathSync(file), file);
  const b = fs.readFileSync(file), t = fs.lstatSync(file, { bigint: true });
  for (const k of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(s[k], t[k]);
  return b;
}
const readSet = new Map();
function read(p) {
  metadataPin(p); const b = measured(p.file); assert.equal(sha(b), p.rawBytesSha256);
  if (p.bytes !== undefined) assert.equal(b.length, p.bytes);
  if (readSet.has(p.file)) samePin(readSet.get(p.file), p); readSet.set(p.file, p); return b;
}
const json = p => JSON.parse(read(p).toString('utf8'));
function absent(file) { try { fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return; throw e; } throw new Error('Required new metadata/publication entry exists'); }
function sourceSet(a) {
  assert(Array.isArray(a) && a.length === 284);
  const out = a.map(p => { metadataPin(p); assert(p.file.startsWith(R + '/')); return { file: p.file, rawBytesSha256: p.rawBytesSha256 }; }).sort(order);
  assert.equal(new Set(out.map(p => p.file)).size, 284); return out;
}
function currentSources(a, helpers) {
  const normalized = sourceSet(a); assert.equal(helpers.length, 229);
  const helperSources = helpers.map(p => ({ file: R + '/' + p.file, rawBytesSha256: p.sha256 })).sort(order);
  assert.deepEqual(normalized.filter(p => p.file.startsWith(R + '/tools/rust-r4ghi/business/')), helperSources);
  const names = fs.readdirSync(R + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).map(n => R + '/tools/rust-r4ghi/business/' + n).sort();
  assert.deepEqual(names, helperSources.map(p => p.file).sort());
  for (const p of normalized) read(p); return normalized;
}
function freshBinaryFiles(recordFiles, current) {
  assert(Array.isArray(recordFiles) && recordFiles.length === 2);
  assert.equal(new Set(recordFiles.map(p => p.file)).size, 2);
  assert.deepEqual(recordFiles.map(p => p.file).sort(), [current.binary.file, current.summaryBinary.file].sort());
  return recordFiles.map(p => {
    keys(p, ['file', 'rawBytesSha256', 'bytes', 'dev', 'ino', 'nlink']); absolute(p.file);
    const expected = p.file === current.binary.file ? current.binary : current.summaryBinary;
    assert.equal(p.rawBytesSha256, expected.rawBytesSha256);
    const s = fs.lstatSync(p.file, { bigint: true }); assert(s.isFile() && !s.isSymbolicLink() && s.nlink >= 1n);
    assert.equal(fs.realpathSync(p.file), p.file);
    const actual = { file: p.file, rawBytesSha256: p.rawBytesSha256, bytes: Number(s.size), dev: s.dev.toString(), ino: s.ino.toString(), nlink: Number(s.nlink) };
    assert.deepEqual(actual, p); return actual;
  });
}
function reviewedI9(composition, execution) {
  assert(Array.isArray(composition.components) && composition.components.length === 3);
  const c = composition.components[0], manifest = json(c.manifest), review = json(c.review);
  assert.equal(c.count, 9); assert.equal(manifest.kind, 'I-runtime121-code-candidate');
  assert.equal(manifest.production.length, 9); assert.deepEqual(manifest.production.map(p => p.file).sort(), [...I9].sort());
  assert.equal(review.kind, 'non-author-runtime121-finite-code-step'); assert.equal(review.verdict, 'approved-bounded-step-only'); assert.equal(review.reviewerIsAuthor, false);
  assert(typeof review.author === 'string' && review.author && typeof review.reviewer === 'string' && review.reviewer); assert.notEqual(review.author, review.reviewer);
  samePin(review.componentManifest, c.manifest); samePin(review.technicalG1, c.G1); assert.equal(review.entries.length, 9); read(c.G1);
  assert.equal(c.G1.rawBytesSha256, 'be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc');
  for (const [n, p] of manifest.production.entries()) {
    const src = execution.find(s => s.file === R + '/' + p.file); assert(src); assert.equal(src.rawBytesSha256, p.afterSHA256);
    const e = review.entries.find(e => e.file === p.file); assert(e); assert.equal(e.beforeSHA256, p.beforeSHA256); assert.equal(e.afterSHA256, p.afterSHA256); assert.equal(e.productPointer, '/production/' + n);
    read(p.candidate);
  }
  return c.manifest;
}
function shapePlan(plan) {
  keys(plan, top12); keys(plan.base, base18); keys(plan.current, current13);
  keys(plan.composition, ['helperComposition', 'externalComposition', 'independentCodeReviews']);
  keys(plan.stateTransfer, ['expectedState', 'expectedOwnership', 'actorCacheDelta']);
  keys(plan.stateTransfer.actorCacheDelta, ['actorKeys', 'clearCookies', 'clearPermissions']);
  keys(plan.tooling, ['manifest', 'executionSources']); keys(plan.outputs, ['registryFile', 'candidateFile', 'receiptDirectory']);
}
// Corrective361 data-only reader. Duplicated into the two bounded metadata
// leaves; no runtime/helper import and no extra production dependency.
const ROOT361 = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const PRIV361 = '/home/wangzishi/.local/share/poms-r4ghi/private';
const FREEZE361 = { file: ROOT361 + '/tools/rust-r4ghi/runtime-recovery121/corrective361-g3-freeze01/Root-G3-code-input361.json', bytes: 4167, rawBytesSha256: '820f727595c37cbe7eae6aa53ff3b9606ae6f0922be237f63fb8eb26f534ae07' };
const CONTRACT361 = { file: ROOT361 + '/tools/rust-r4ghi/runtime-recovery121/corrective361-g3-freeze01/successor-contract.schema.json', bytes: 12167, rawBytesSha256: 'a4efab376c89cb331a1c40cd9dc717174dd2b83cad1447504f1e5e9de5c90b8a' };
const FOUR361 = ['tools/rust-r4ghi/tax15-invocation118/invocation-proof.mjs', 'tools/rust-r4ghi/business/runtime-admission-core121.mjs', 'tools/rust-r4ghi/business/runtime-admission121.mjs', 'tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs'];
const CURRENT361 = ['sourcePins', 'compilePins', 'helperPins', 'helperCount', 'binary', 'summaryBinary', 'binaryFiles', 'nodeExecutable', 'lifetimeOwner', 'PGStart', 'PGConservation', 'apiProcess', 'readiness'];
const order361 = (a, b) => Buffer.compare(Buffer.from(a.file), Buffer.from(b.file));
function keys361(v, names) { assert(v && Object.getPrototypeOf(v) === Object.prototype); assert.deepEqual(Object.keys(v).sort(), [...names].sort()); }
function pin361(p, full = false) {
  keys361(p, full || Object.hasOwn(p ?? {}, 'bytes') ? ['file', 'bytes', 'rawBytesSha256'] : ['file', 'rawBytesSha256']);
  assert(typeof p.file === 'string' && p.file.startsWith('/') && !p.file.includes('\\') && !p.file.includes('//') && !/[\0\r\n]/.test(p.file) && path.posix.resolve(p.file) === p.file);
  assert(/^[a-f0-9]{64}$/.test(p.rawBytesSha256)); if (Object.hasOwn(p, 'bytes')) assert(Number.isSafeInteger(p.bytes) && p.bytes >= 0); return p;
}
function same361(a, b) { pin361(a); pin361(b); assert.equal(a.file, b.file); assert.equal(a.rawBytesSha256, b.rawBytesSha256); if (a.bytes !== undefined && b.bytes !== undefined) assert.equal(a.bytes, b.bytes); }
function closedSchema361(value, spec) {
  assert.equal(spec.type, 'object'); assert.equal(spec.additionalProperties, false); keys361(value, spec.required);
  for (const key of spec.required) { const p = spec.properties[key]; if (Object.hasOwn(p, 'const')) assert.deepEqual(value[key], p.const); else { assert.equal(p.$ref, '#/$defs/fullPin'); pin361(value[key], true); } }
}
function sources361(list, count) {
  assert(Array.isArray(list)); if (count !== undefined) assert.equal(list.length, count);
  const out = list.map(p => { pin361(p); assert(p.file.startsWith(ROOT361 + '/')); return { file: p.file, rawBytesSha256: p.rawBytesSha256 }; }).sort(order361);
  assert.equal(new Set(out.map(p => p.file)).size, out.length); return out;
}
function descriptors361(list, count) {
  assert(Array.isArray(list) && list.length === count);
  for (const p of list) { keys361(p, ['file', 'sha256']); assert(typeof p.file === 'string' && !p.file.startsWith('/') && !p.file.includes('\\') && !p.file.includes('//') && !/[\0\r\n]/.test(p.file) && path.posix.normalize(p.file) === p.file && !p.file.split('/').some(x => x === '.' || x === '..' || !x)); assert(/^[a-f0-9]{64}$/.test(p.sha256)); }
  assert.equal(new Set(list.map(p => p.file)).size, count); assert.deepEqual(list, [...list].sort(order361)); return list;
}
function reviews361(oldReviews, newReview) {
  assert(Array.isArray(oldReviews) && oldReviews.length === 3); const a = [...oldReviews, newReview]; a.forEach(p => pin361(p, true));
  assert.equal(new Set(a.map(p => p.file)).size, 4, 'All three historical reviews and one new review must be distinct'); return a.sort(order361);
}
export function validateSourceSuccessorModel361(m) {
  keys361(m, ['freeze', 'contract', 'successor', 'witness', 'composition', 'oldHelperComposition', 'oldExternalComposition', 'oldPlanComposition', 'oldHelpers', 'oldExternal', 'oldExecution', 'normalizedOldExecution', 'newHelpers', 'newExternal', 'newExecution', 'retainedSources', 'manifest', 'review', 'baselineManifest', 'baselineReview', 'predecessorPlan', 'predecessorRegistry', 'predecessorCandidate', 'predecessorPublication', 'retainedState']);
  const { freeze: f, contract: schema, successor: s, witness: w, composition: comp, manifest, review, predecessorPlan: old } = m;
  assert.equal(f.kind, 'Root-frozen-runtime121-corrective361-G3-code-input'); assert.equal(f.codeImplementationGranted, true); assert.equal(f.sourcePromotionGranted, false); assert.equal(f.actualG2Authorized, false);
  assert(f.references.some(p => { pin361(p, true); return p.file === CONTRACT361.file && p.rawBytesSha256 === CONTRACT361.rawBytesSha256 && p.bytes === CONTRACT361.bytes; }));
  closedSchema361(s, schema.$defs.successor12); closedSchema361(w, schema.$defs.sourceWitness13);
  assert.equal(comp.kind, 'Root-runtime121-Native06-composition-materialized'); assert.equal(comp.rootSourceRawRechecked, true); assert.equal(comp.oldInputsUnmodified, true);
  same361(w.baselineCompositionComplete, schema.$defs.sourceWitness13.properties.baselineCompositionComplete.const);
  for (const [k, graph] of [['baselineHelperPins', 'helper'], ['baselineExternalPins', 'external'], ['baselineExecutionSources', 'execution']]) same361(w[k], comp.actualGraphs[graph]);
  assert(Array.isArray(comp.components) && comp.components.length === 3); same361(w.baselineStageManifest, comp.components[0].manifest);
  keys361(m.oldPlanComposition, ['helperComposition', 'externalComposition', 'independentCodeReviews']);
  same361(m.oldPlanComposition.helperComposition, comp.helperComposition); same361(m.oldPlanComposition.externalComposition, comp.externalComposition);
  assert.deepEqual(m.oldPlanComposition.independentCodeReviews, comp.components.map(c => c.review));
  assert.equal(m.oldHelperComposition.kind, 'Root-Source15-runtime121-H3-composition'); assert.equal(m.oldExternalComposition.kind, 'Root-Source15-runtime121-external-composition');
  assert.equal(m.oldHelperComposition.frames.length, 11); assert.equal(m.oldExternalComposition.frames.length, 30);
  same361(m.oldHelperComposition.finalHelperPins, w.baselineHelperPins); assert.deepEqual(m.oldExternalComposition.finalSources, m.oldExternal);
  const before = sources361(m.oldExecution, 284), after = sources361(m.newExecution, 284);
  assert.deepEqual(before, sources361(m.normalizedOldExecution, 284));
  for (const [helpers, external, graph] of [[m.oldHelpers, m.oldExternal, before], [m.newHelpers, m.newExternal, after]]) {
    descriptors361(helpers, 229); descriptors361(external, 55);
    assert(helpers.every(p => p.file.startsWith('tools/rust-r4ghi/business/'))); assert(external.every(p => !p.file.startsWith('tools/rust-r4ghi/business/')));
    assert.deepEqual([...helpers, ...external].map(p => ({ file: ROOT361 + '/' + p.file, rawBytesSha256: p.sha256 })).sort(order361), graph);
  }
  assert.deepEqual(before.map(p => p.file), after.map(p => p.file)); const beforeMap = new Map(before.map(p => [p.file, p.rawBytesSha256])), afterMap = new Map(after.map(p => [p.file, p.rawBytesSha256]));
  assert.deepEqual(after.filter(p => p.rawBytesSha256 !== beforeMap.get(p.file)).map(p => p.file).sort(), FOUR361.map(p => ROOT361 + '/' + p).sort());
  const retained = m.retainedSources;
  keys361(retained, ['kind', 'recordedAt', 'compositionComplete', 'oldGraph', 'oldExecutionCount', 'mappings', 'remainingUnchangedMembers', 'allOld284CurrentlyRawMatched', 'oldM06AndReviewsUnmodified', 'newSourceOrGraphCreated', 'productionWritten', 'canonicalStateWritten', 'modeExecuted', 'actualG2Granted']);
  assert.equal(retained.kind, 'Root-fixed-four-predecessor-source-retained361'); same361(retained.compositionComplete, w.baselineCompositionComplete); same361(retained.oldGraph, w.baselineExecutionSources);
  assert.equal(retained.oldExecutionCount, 284); assert.equal(retained.remainingUnchangedMembers, 280); assert.equal(retained.allOld284CurrentlyRawMatched, true); assert.equal(retained.oldM06AndReviewsUnmodified, true);
  for (const k of ['newSourceOrGraphCreated', 'productionWritten', 'canonicalStateWritten', 'modeExecuted', 'actualG2Granted']) assert.equal(retained[k], false);
  assert.equal(retained.mappings.length, 4); assert.deepEqual(retained.mappings.map(p => p.relative), FOUR361);
  for (const [i, p] of retained.mappings.entries()) {
    keys361(p, ['relative', 'original', 'retainedCopy']); pin361(p.original, true); pin361(p.retainedCopy, true); assert.deepEqual(p.original, f.exactBeforeSources[i]);
    assert.equal(p.original.file, ROOT361 + '/' + p.relative); assert.equal(p.original.rawBytesSha256, beforeMap.get(p.original.file));
    assert.equal(p.retainedCopy.file, PRIV361 + '/runtime121-corrective361-predecessor-source01/' + (i + 1) + '-' + path.posix.basename(p.relative) + '.bin');
    assert.equal(p.original.bytes, p.retainedCopy.bytes); assert.equal(p.original.rawBytesSha256, p.retainedCopy.rawBytesSha256);
  }
  assert.equal(manifest.kind, 'I-runtime121-code-candidate'); assert.equal(manifest.edition, 361); assert.deepEqual(manifest.correctiveG3, FREEZE361);
  assert(Array.isArray(manifest.production) && manifest.production.length === 4); assert.deepEqual(manifest.production.map(p => p.file).sort(), [...FOUR361].sort());
  assert.equal(review.kind, 'non-author-runtime121-finite-code-step'); assert.equal(review.verdict, 'approved-bounded-step-only'); assert.equal(review.reviewerIsAuthor, false);
  assert(typeof review.author === 'string' && review.author && typeof review.reviewer === 'string' && review.reviewer); assert.notEqual(review.author, review.reviewer);
  same361(review.componentManifest, w.successorManifest); assert.deepEqual(review.correctiveG3, FREEZE361); same361(review.technicalG1, comp.components[0].G1);
  assert.equal(review.technicalG1.rawBytesSha256, 'be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc');
  assert(Array.isArray(review.entries) && review.entries.length === 4); assert.equal(new Set(review.entries.map(p => p.file)).size, 4);
  for (const [i, p] of manifest.production.entries()) {
    assert.equal(p.operation, 'MOD'); const file = ROOT361 + '/' + p.file;
    assert.equal(p.beforeSHA256, beforeMap.get(file)); assert.equal(p.afterSHA256, afterMap.get(file)); assert.notEqual(p.beforeSHA256, p.afterSHA256); pin361(p.candidate, true); assert.equal(p.candidate.rawBytesSha256, p.afterSHA256);
    const entry = review.entries.find(e => e.file === p.file); assert(entry); assert.equal(entry.beforeSHA256, p.beforeSHA256); assert.equal(entry.afterSHA256, p.afterSHA256); assert.equal(entry.productPointer, '/production/' + i);
  }
  assert.equal(m.baselineManifest.kind, 'I-runtime121-code-candidate'); assert.equal(m.baselineManifest.production.length, 9);
  assert.equal(m.baselineReview.kind, 'non-author-runtime121-finite-code-step'); assert.equal(m.baselineReview.verdict, 'approved-bounded-step-only'); assert.equal(m.baselineReview.reviewerIsAuthor, false);
  assert(typeof m.baselineReview.author === 'string' && m.baselineReview.author && typeof m.baselineReview.reviewer === 'string' && m.baselineReview.reviewer); assert.notEqual(m.baselineReview.author, m.baselineReview.reviewer);
  same361(m.baselineReview.componentManifest, w.baselineStageManifest); same361(m.baselineReview.technicalG1, comp.components[0].G1); assert.equal(m.baselineReview.entries.length, 9);
  for (const [i, p] of m.baselineManifest.production.entries()) { assert.equal(beforeMap.get(ROOT361 + '/' + p.file), p.afterSHA256); const e = m.baselineReview.entries.find(e => e.file === p.file); assert(e); assert.equal(e.beforeSHA256, p.beforeSHA256); assert.equal(e.afterSHA256, p.afterSHA256); assert.equal(e.productPointer, '/production/' + i); }
  keys361(old, schema.planV2ClosedKeys); assert.equal(old.protocolVersion, 1); assert.equal(old.kind, schema.planV2Literals.kind); keys361(old.current, CURRENT361);
  assert.deepEqual(old.base, m.predecessorRegistry.retained); assert.deepEqual(old.composition, m.oldPlanComposition); assert.deepEqual(sources361(old.tooling.executionSources, 284), before); same361(old.current.helperPins, w.baselineHelperPins); same361(old.tooling.manifest, w.baselineStageManifest);
  for (const v of [old, m.predecessorRegistry, m.predecessorCandidate, m.retainedState]) for (const [key, value] of [['namespace', 'poms-r4ghi'], ['epoch', 'g2-business15'], ['run', 'main01']]) assert.equal(v[key], value);
  same361(m.predecessorRegistry.approvedPlan, s.predecessorPlan); same361(m.predecessorCandidate.runtimeAdmission121, s.predecessorRegistry);
  same361(m.predecessorPublication.input, s.predecessorPlan); same361(m.predecessorPublication.registry, s.predecessorRegistry); same361(m.predecessorPublication.candidate, s.predecessorCandidate); assert.equal(m.predecessorPublication.statePublished, true);
  same361(m.retainedState.runtimeAdmission121.registry, s.predecessorRegistry); same361(m.retainedState.runtimeAdmission121.candidate, s.predecessorCandidate);
  reviews361(m.oldPlanComposition.independentCodeReviews, w.successorCodeReview); return m;
}
function loadSourceSuccessor361(io, successorPin) {
  pin361(successorPin, true); const f = io.json(FREEZE361), contract = io.json(CONTRACT361), successor = io.json(successorPin); closedSchema361(successor, contract.$defs.successor12);
  const witness = io.json(successor.sourceWitness); closedSchema361(witness, contract.$defs.sourceWitness13);
  const composition = io.json(witness.baselineCompositionComplete), oldPlanComposition = io.json(composition.planComposition);
  const m = { freeze: f, contract, successor, witness, composition, oldHelperComposition: io.json(composition.helperComposition), oldExternalComposition: io.json(composition.externalComposition), oldPlanComposition,
    oldHelpers: io.json(witness.baselineHelperPins), oldExternal: io.json(witness.baselineExternalPins), oldExecution: io.json(witness.baselineExecutionSources), normalizedOldExecution: io.json(composition.normalizedExecutionSources),
    newHelpers: io.json(witness.currentHelperPins), newExternal: io.json(witness.currentExternalPins), newExecution: io.json(witness.currentExecutionSources), retainedSources: io.json(witness.retainedChangedSources), manifest: io.json(witness.successorManifest), review: io.json(witness.successorCodeReview), baselineManifest: io.json(witness.baselineStageManifest), baselineReview: io.json(composition.components[0].review),
    predecessorPlan: io.json(successor.predecessorPlan), predecessorRegistry: io.json(successor.predecessorRegistry), predecessorCandidate: io.json(successor.predecessorCandidate), predecessorPublication: io.json(successor.predecessorPublication), retainedState: io.json(successor.retainedCurrentState) };
  validateSourceSuccessorModel361(m);
  const copies = new Map(m.retainedSources.mappings.map(p => [p.original.file, p]));
  const historicalRead = p => { const fixed = copies.get(p.file); if (fixed) { same361(p, fixed.original); return io.read(fixed.retainedCopy); } return io.read(p); };
  for (const p of [successor.predecessorReadback, successor.failurePartial, successor.failureRetention, successor.failureReadback, ...m.oldPlanComposition.independentCodeReviews, witness.successorCodeReview]) io.read(p);
  for (const c of composition.components) { io.read(c.G1); io.read(c.manifest); io.read(c.review); }
  for (const frame of [...m.oldHelperComposition.frames, ...m.oldExternalComposition.frames]) for (const k of ['candidate', 'componentManifest', 'independentReview', 'technicalG1']) historicalRead(frame[k]);
  for (const p of m.baselineManifest.production) historicalRead(p.candidate);
  for (const p of m.manifest.production) io.read(p.candidate);
  // Exactly the four fixed predecessor copies, never an alias resolver/search.
  for (const p of m.oldExecution) historicalRead(p);
  for (const p of m.newExecution) io.read(p);
  return m;
}
function validateSuccessorPlan361(plan, m, successorPin) {
  validateSourceSuccessorModel361(m); const schema = m.contract, w = m.witness, s = m.successor;
  keys361(plan, schema.planV2ClosedKeys); for (const [key, value] of Object.entries(schema.planV2Literals)) assert.equal(plan[key], value);
  assert.deepEqual(plan.base, m.predecessorPlan.base); keys361(plan.base, schema.base18Keys); keys361(plan.current, schema.current13Keys);
  const expectedCurrent = structuredClone(m.predecessorPlan.current); expectedCurrent.helperPins = structuredClone(w.currentHelperPins); assert.deepEqual(plan.current, expectedCurrent, 'Only helperPins changes in current13');
  keys361(plan.stateTransfer, ['expectedState', 'expectedOwnership', 'actorCacheDelta', 'successor']); same361(plan.stateTransfer.expectedState, s.retainedCurrentState);
  assert.deepEqual(plan.stateTransfer.expectedOwnership, schema.$defs.stateTransfer4.properties.expectedOwnership.const); same361(plan.stateTransfer.successor, successorPin);
  keys361(plan.stateTransfer.actorCacheDelta, ['actorKeys', 'clearCookies', 'clearPermissions']); assert.deepEqual(plan.stateTransfer.actorCacheDelta.actorKeys, Object.keys(m.retainedState.actors).sort());
  assert.equal(plan.stateTransfer.actorCacheDelta.clearCookies, false); assert.equal(plan.stateTransfer.actorCacheDelta.clearPermissions, false);
  keys361(plan.composition, schema.composition3Keys); assert.deepEqual(plan.composition.independentCodeReviews, reviews361(m.oldPlanComposition.independentCodeReviews, w.successorCodeReview));
  keys361(plan.tooling, schema.tooling2Keys); same361(plan.tooling.manifest, w.successorManifest); assert.deepEqual(plan.tooling.executionSources, m.newExecution);
  keys361(plan.outputs, schema.outputs3Keys); const dir = PRIV361 + '/business/g2-business15/main01/runtime121-' + plan.nonce;
  assert.equal(plan.outputs.registryFile, dir + '/registry.json'); assert.equal(plan.outputs.candidateFile, dir + '/candidate.json'); assert.equal(plan.outputs.receiptDirectory, dir);
  return plan;
}
function validateSuccessorWrappers361(plan, m, h, e) {
  keys361(h, ['kind', 'schemaVersion', 'baseline', 'finalHelperPins', 'sourceWitness']); keys361(e, ['kind', 'schemaVersion', 'baseline', 'finalSources', 'sourceWitness']);
  assert.equal(h.kind, 'Root-Source15-runtime121-H3-successor-composition'); assert.equal(e.kind, 'Root-Source15-runtime121-external-successor-composition'); assert.equal(h.schemaVersion, 2); assert.equal(e.schemaVersion, 2);
  same361(h.baseline, m.composition.helperComposition); same361(e.baseline, m.composition.externalComposition); same361(h.sourceWitness, m.successor.sourceWitness); same361(e.sourceWitness, m.successor.sourceWitness);
  same361(h.finalHelperPins, m.witness.currentHelperPins); same361(plan.current.helperPins, h.finalHelperPins); assert.deepEqual(e.finalSources, m.newExternal);
  return { h, e };
}

export function validateNativePlanOptions361(options) {
  keys361(options, ['apiComplete', 'compositionComplete', 'nonce', 'outputDirectory', 'successor']);
  for (const k of ['apiComplete', 'compositionComplete', 'successor']) pin361(options[k], true);
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(options.nonce));
  assert.equal(options.outputDirectory, P + '/runtime121-native-plan-data/' + options.nonce); return options;
}
function guardSuccessorEntry361(io, m) {
  for (const n of [13, 14, 15]) absent(P + '/business/g2-business' + n + '/main01/driver.lock');
  assert(measured(D15 + '/state.json').equals(io.read(m.successor.retainedCurrentState)), 'Current canonical state must still be the real retained32bd bytes');
  io.read(m.contract.$defs.stateTransfer4.properties.expectedOwnership.const);
}
function produceNativePlanV2361(options) {
  assert.equal(process.platform, 'linux'); validateNativePlanOptions361(options); absent(options.outputDirectory);
  const io = { read, json }, m = loadSourceSuccessor361(io, options.successor), s = m.successor, w = m.witness;
  same361(options.compositionComplete, w.baselineCompositionComplete);
  // Reuse the actual B17/current12/process25 records. They remain historical
  // startup facts; the successor does not rewrite or relabel their helper graph.
  const api = json(options.apiComplete); assert.equal(api.kind, 'actual-runtime121-B-API-start-readiness-complete'); assert.equal(api.APIStarted, true);
  for (const k of ['ordinaryContextCreated', 'nativeAuthorityGranted', 'businessDML', 'registryOrCandidateCreated', 'statePublished']) assert.equal(api[k], false);
  const input = json(api.input); keys(input, apiInput17); assert.equal(input.kind, 'Root-runtime121-B-API-operation-input'); assert.equal(input.schemaVersion, 1);
  for (const [key, value] of [['namespace', 'poms-r4ghi'], ['epoch', 'g2-business15'], ['run', 'main01']]) assert.equal(input[key], value);
  assert.equal(options.apiComplete.file, input.outputDirectory + '/complete.json'); keys(input.current, apiCurrent12); keys(input.base, base18);
  assert.deepEqual(input.base, json(m.contract.base18MustEqualPinnedOriginal)); assert.deepEqual(input.base, m.predecessorPlan.base);
  const record = json(api.apiProcess), ready = json(api.readiness); keys(record, record25);
  assert.equal(record.kind, 'actual-source15-owned-API-process121'); assert.equal(record.protocolVersion, 1);
  for (const key of ['namespace', 'epoch', 'run']) assert.equal(record[key], input[key]);
  assert.equal(record.root, M); assert.equal(record.port, 31441); assert(Number.isSafeInteger(record.pid) && record.pid > 1);
  assert.equal(api.apiProcess.file, P + '/rust-api121-process.json'); assert.equal(input.processFile, api.apiProcess.file); samePin(record.input, api.input);
  assert.equal(ready.mode, 'start'); assert.equal(ready.port, 31441); assert.equal(ready.readiness, 200); assert.equal(ready.privateCredentialsPrinted, false);
  assert.equal(ready.pid, record.pid); assert.equal(ready.binarySha256, record.binarySha256); assert.equal(api.readiness.file, input.outputDirectory + '/readiness.json');
  assert.deepEqual(input.composition, m.oldPlanComposition); same361(record.helperPins, w.baselineHelperPins); same361(input.current.helperPins, w.baselineHelperPins);
  for (const k of ['sourcePins', 'compilePins', 'helperPins', 'lifetimeOwner']) samePin(record[k], input.current[k]);
  assert.equal(record.binary, input.current.binary.file); assert.equal(record.binarySha256, input.current.binary.rawBytesSha256);
  const startedCurrent = clone(input.current); delete startedCurrent.baseNormalEnv; startedCurrent.binaryFiles = freshBinaryFiles(record.binaryFiles, startedCurrent);
  startedCurrent.apiProcess = clone(api.apiProcess); startedCurrent.readiness = clone(api.readiness);
  assert.deepEqual(startedCurrent, m.predecessorPlan.current, 'All original A/B/current13 facts must equal the real predecessor plan');
  const current = clone(m.predecessorPlan.current); current.helperPins = clone(w.currentHelperPins);
  const execution = clone(m.newExecution); currentSources(execution, m.newHelpers);
  const helperBody = { kind: 'Root-Source15-runtime121-H3-successor-composition', schemaVersion: 2, baseline: clone(m.composition.helperComposition), finalHelperPins: clone(w.currentHelperPins), sourceWitness: clone(s.sourceWitness) };
  const externalBody = { kind: 'Root-Source15-runtime121-external-successor-composition', schemaVersion: 2, baseline: clone(m.composition.externalComposition), finalSources: clone(m.newExternal), sourceWitness: clone(s.sourceWitness) };
  const encode = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
  const encodedOutputPin = (name, body) => { const b = encode(body); return { file: options.outputDirectory + '/' + name, bytes: b.length, rawBytesSha256: sha(b) }; };
  const hPin = encodedOutputPin('helper-composition121.json', helperBody), ePin = encodedOutputPin('external-composition121.json', externalBody);
  const runtimeDir = D15 + '/runtime121-' + options.nonce, expectedState = clone(s.retainedCurrentState), expectedOwnership = clone(m.contract.$defs.stateTransfer4.properties.expectedOwnership.const);
  const actorKeys = Object.keys(m.retainedState.actors).sort();
  const plan = { kind: 'source15-append-runtime-plan121', protocolVersion: 2, namespace: 'poms-r4ghi', epoch: 'g2-business15', run: 'main01', nonce: options.nonce,
    base: clone(m.predecessorPlan.base), current, composition: { helperComposition: hPin, externalComposition: ePin, independentCodeReviews: reviews361(m.oldPlanComposition.independentCodeReviews, w.successorCodeReview) },
    stateTransfer: { expectedState, expectedOwnership, actorCacheDelta: { actorKeys, clearCookies: false, clearPermissions: false }, successor: clone(options.successor) },
    tooling: { manifest: clone(w.successorManifest), executionSources: execution }, outputs: { registryFile: runtimeDir + '/registry.json', candidateFile: runtimeDir + '/candidate.json', receiptDirectory: runtimeDir } };
  validateSuccessorPlan361(plan, m, options.successor); validateSuccessorWrappers361(plan, m, helperBody, externalBody);
  const recheck = () => { for (const p of [...readSet.values()]) read(p); currentSources(execution, m.newHelpers); freshBinaryFiles(record.binaryFiles, current); guardSuccessorEntry361(io, m); for (const file of Object.values(plan.outputs)) absent(file); };
  recheck(); for (const file of [hPin.file, ePin.file]) absent(file);
  const parent = path.posix.dirname(options.outputDirectory); fs.mkdirSync(parent, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(parent), parent); fs.mkdirSync(options.outputDirectory, { mode: 0o700 });
  const save = (name, body) => { const file = options.outputDirectory + '/' + name, bytes = encode(body); fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); const p = { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; read(p); return p; };
  try {
    assert.deepEqual(save('helper-composition121.json', helperBody), hPin); assert.deepEqual(save('external-composition121.json', externalBody), ePin);
    const planPin = save('native-plan121.json', plan);
    const request = save('request-native-inspect-and-exact-review121.json', { kind: 'Root-runtime121-native-plan-data-awaiting-inspect', preparedPlan: planPin, actualAPIComplete: options.apiComplete, actualCompositionComplete: options.compositionComplete,
      actualAPIProcess: api.apiProcess, actualReadiness: api.readiness, actualToolingManifest: w.successorManifest, successor: options.successor, sourceWitness: s.sourceWitness,
      expectedState, expectedOwnership, actorKeyCount: actorKeys.length, clearCookies: false, clearPermissions: false,
      scope121: null, nativeInspect: null, independentExactInputReview: null, RootExecutionApproval: null, nativeCalled: false, actualG2Granted: false, FSStatePublicationGranted: false, TaxHTTPGranted: false, businessG3: false, businessG4: false });
    recheck();
    return save('complete.json', { kind: 'Root-runtime121-native-plan-data-prepared', plan: planPin, request, APIComplete: options.apiComplete, compositionComplete: options.compositionComplete, successor: options.successor, sourceWitness: s.sourceWitness,
      schemaCounts: { top: 12, base: 18, current: 13, composition: 3, stateTransfer: 4, tooling: 2, outputs: 3 }, protocolVersion: 2, executionSourceCount: 284,
      baselineCompositionRetained: true, sourceWitnessTwoStagesVerified: true, liveStartupRecordUnchanged: true, binaryFilesOrigin: 'Exact original A/B/predecessor facts; fresh stat equality; Native independently checks real binary bytes and OS identities.', actorsValuesEmitted: false, canonicalStateModified: false,
      NativeCalled: false, ctxCreated: false, APIOrSQLHTTPOrProcessControl: false, FSStatePublicationGranted: false, actualG2Granted: false, businessG3: false, businessG4: false });
  } catch (error) {
    try { save('partial.json', { kind: 'native-plan-data-preserve121', APIComplete: options.apiComplete, compositionComplete: options.compositionComplete, successor: options.successor, message: 'Metadata preparation stopped; preserve partial files and review before choosing a new output.', name: ['Error', 'AssertionError', 'TypeError', 'SyntaxError'].includes(error.name) ? error.name : 'Error', actualG2Granted: false }); } catch {}
    throw error;
  }
}

export function produceNativePlanData121(options) {
  if (Object.hasOwn(options ?? {}, 'successor')) return produceNativePlanV2361(options);
  assert.equal(process.platform, 'linux'); keys(options, ['apiComplete', 'compositionComplete', 'nonce', 'outputDirectory']);
  // Required real API comes first. No write or expectedState parse precedes it.
  metadataPin(options.apiComplete, true); metadataPin(options.compositionComplete, true);
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(options.nonce));
  assert.equal(options.outputDirectory, P + '/runtime121-native-plan-data/' + options.nonce); absent(options.outputDirectory);
  const api = json(options.apiComplete); assert.equal(api.kind, 'actual-runtime121-B-API-start-readiness-complete'); assert.equal(api.APIStarted, true);
  for (const k of ['ordinaryContextCreated', 'nativeAuthorityGranted', 'businessDML', 'registryOrCandidateCreated', 'statePublished']) assert.equal(api[k], false);
  const input = json(api.input); keys(input, apiInput17); assert.equal(input.kind, 'Root-runtime121-B-API-operation-input'); assert.equal(input.schemaVersion, 1);
  for (const [key, value] of [['namespace', 'poms-r4ghi'], ['epoch', 'g2-business15'], ['run', 'main01']]) assert.equal(input[key], value);
  assert.equal(options.apiComplete.file, input.outputDirectory + '/complete.json'); keys(input.current, apiCurrent12); keys(input.base, base18);
  assert.deepEqual(input.base, json(baseSpec));
  const record = json(api.apiProcess), ready = json(api.readiness); keys(record, record25);
  assert.equal(record.kind, 'actual-source15-owned-API-process121'); assert.equal(record.protocolVersion, 1);
  for (const key of ['namespace', 'epoch', 'run']) assert.equal(record[key], input[key]);
  assert.equal(record.root, M); assert.equal(record.port, 31441); assert(Number.isSafeInteger(record.pid) && record.pid > 1);
  assert.equal(api.apiProcess.file, P + '/rust-api121-process.json'); assert.equal(input.processFile, api.apiProcess.file); samePin(record.input, api.input);
  assert.equal(ready.mode, 'start'); assert.equal(ready.port, 31441); assert.equal(ready.readiness, 200); assert.equal(ready.privateCredentialsPrinted, false);
  assert.equal(ready.pid, record.pid); assert.equal(ready.binarySha256, record.binarySha256); assert.equal(api.readiness.file, input.outputDirectory + '/readiness.json');
  const composition = json(options.compositionComplete);
  assert(['Root-runtime121-Native05-composition-materialized', 'Root-runtime121-Native06-composition-materialized'].includes(composition.kind));
  assert.equal(composition.rootSourceRawRechecked, true);
  const comp = json(composition.planComposition); keys(comp, ['helperComposition', 'externalComposition', 'independentCodeReviews']);
  assert.deepEqual(comp, input.composition); samePin(comp.helperComposition, composition.helperComposition); samePin(comp.externalComposition, composition.externalComposition);
  const h = json(comp.helperComposition), e = json(comp.externalComposition), helpers = json(composition.actualGraphs.helper), external = json(composition.actualGraphs.external);
  samePin(h.finalHelperPins, composition.actualGraphs.helper); samePin(input.current.helperPins, composition.actualGraphs.helper); assert.equal(input.current.helperCount, 229);
  assert.deepEqual(e.finalSources, external); assert.equal(external.length, 55); assert.equal(h.frames.length, 11); assert.equal(e.frames.length, 30);
  assert.deepEqual(comp.independentCodeReviews, composition.components.map(c => c.review));
  const execution = sourceSet(json(composition.normalizedExecutionSources));
  assert.deepEqual(execution, sourceSet(json(composition.actualGraphs.execution))); assert.deepEqual(execution, sourceSet(input.executionSources));
  const graph = [...helpers, ...external].map(p => ({ file: R + '/' + p.file, rawBytesSha256: p.sha256 })).sort(order); assert.deepEqual(graph, execution);
  const manifest = reviewedI9(composition, execution); currentSources(execution, helpers);
  for (const k of ['sourcePins', 'compilePins', 'helperPins', 'lifetimeOwner']) samePin(record[k], input.current[k]);
  assert.equal(record.binary, input.current.binary.file); assert.equal(record.binarySha256, input.current.binary.rawBytesSha256);
  const current = clone(input.current); delete current.baseNormalEnv;
  current.binaryFiles = freshBinaryFiles(record.binaryFiles, current);
  current.apiProcess = clone(api.apiProcess); current.readiness = clone(api.readiness); keys(current, current13);
  for (const k of current13.filter(k => !['helperCount', 'binaryFiles'].includes(k))) metadataPin(current[k]);
  samePin(current.sourcePins, input.base.sourcePins); samePin(current.compilePins, input.base.compilePins);
  keys(input.expectedStates, ['state13', 'state14', 'state15', 'ownership15']);
  const expectedState = input.base.retainedState15, expectedOwnership = input.base.ownership15;
  assert.equal(input.expectedStates.state15.rawBytesSha256, expectedState.rawBytesSha256);
  assert.equal(input.expectedStates.ownership15.rawBytesSha256, expectedOwnership.rawBytesSha256);
  // Only keys leave this block; no cookies, permissions, password or actor value is copied.
  const actorKeys = (() => {
    const expectedBytes = read(expectedState); assert(read(input.expectedStates.state15).equals(expectedBytes));
    const old = JSON.parse(expectedBytes.toString('utf8')); assert(old.actors && Object.getPrototypeOf(old.actors) === Object.prototype);
    return Object.keys(old.actors).sort();
  })();
  assert(read(expectedOwnership).equals(read(input.expectedStates.ownership15)));
  const runtimeDir = D15 + '/runtime121-' + options.nonce;
  const plan = { kind: 'source15-append-runtime-plan121', protocolVersion: 1, namespace: 'poms-r4ghi', epoch: 'g2-business15', run: 'main01', nonce: options.nonce,
    base: clone(input.base), current, composition: clone(comp),
    stateTransfer: { expectedState: clone(expectedState), expectedOwnership: clone(expectedOwnership), actorCacheDelta: { actorKeys, clearCookies: true, clearPermissions: true } },
    tooling: { manifest, executionSources: execution },
    outputs: { registryFile: runtimeDir + '/registry.json', candidateFile: runtimeDir + '/candidate.json', receiptDirectory: runtimeDir } };
  shapePlan(plan); for (const file of Object.values(plan.outputs)) absent(file);
  for (const p of [...readSet.values()]) read(p); currentSources(execution, helpers); freshBinaryFiles(record.binaryFiles, current);
  const parent = path.posix.dirname(options.outputDirectory); fs.mkdirSync(parent, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(parent), parent);
  fs.mkdirSync(options.outputDirectory, { mode: 0o700 });
  const save = (name, value) => { const file = options.outputDirectory + '/' + name, bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
    fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); const p = { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; read(p); return p; };
  try {
    const planPin = save('native-plan121.json', plan);
    const request = save('request-native-inspect-and-exact-review121.json', { kind: 'Root-runtime121-native-plan-data-awaiting-inspect', preparedPlan: planPin,
      actualAPIComplete: options.apiComplete, actualCompositionComplete: options.compositionComplete,
      actualAPIProcess: api.apiProcess, actualReadiness: api.readiness, actualToolingManifest: manifest,
      expectedState, expectedOwnership, actorKeyCount: actorKeys.length, clearCookies: true, clearPermissions: true,
      scope121: null, nativeInspect: null, independentExactInputReview: null, RootExecutionApproval: null,
      nativeCalled: false, actualG2Granted: false, FSStatePublicationGranted: false, TaxHTTPGranted: false, businessG3: false, businessG4: false });
    for (const p of [...readSet.values()]) read(p); currentSources(execution, helpers); freshBinaryFiles(record.binaryFiles, current);
    for (const file of Object.values(plan.outputs)) absent(file);
    return save('complete.json', { kind: 'Root-runtime121-native-plan-data-prepared', plan: planPin, request,
      APIComplete: options.apiComplete, compositionComplete: options.compositionComplete,
      schemaCounts: { top: 12, base: 18, current: 13, composition: 3, stateTransfer: 3, tooling: 2, outputs: 3 },
      binaryFilesOrigin: 'Actual API record with fresh lstat size/dev/ino/nlink equality; original API-bound hashes retained. Native will independently rehash during inspect.',
      actorsValuesEmitted: false, executionSourceCount: 284, NativeCalled: false, ctxCreated: false,
      APIOrSQLHTTPOrProcessControl: false, FSStatePublicationGranted: false, actualG2Granted: false, businessG3: false, businessG4: false });
  } catch (error) {
    try { save('partial.json', { kind: 'native-plan-data-preserve121', APIComplete: options.apiComplete, compositionComplete: options.compositionComplete,
      message: 'Metadata preparation stopped; preserve partial files and review before choosing a new output.',
      name: ['Error', 'AssertionError', 'TypeError', 'SyntaxError'].includes(error.name) ? error.name : 'Error', actualG2Granted: false }); } catch { /* Preserve original failure. */ }
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const a = process.argv.slice(2); assert.equal(a.length, 7); assert.equal(a[6], '--execute'); const v = {};
    for (let n = 0; n < 6; n += 2) { assert(['--input', '--input-sha', '--input-bytes'].includes(a[n]) && !Object.hasOwn(v, a[n])); v[a[n]] = a[n + 1]; }
    keys(v, ['--input', '--input-sha', '--input-bytes']); assert(/^(0|[1-9][0-9]*)$/.test(v['--input-bytes']));
    const inputPin = { file: v['--input'], bytes: Number(v['--input-bytes']), rawBytesSha256: v['--input-sha'] }; metadataPin(inputPin, true);
    console.log(JSON.stringify(produceNativePlanData121(json(inputPin))));
  } catch { console.error(JSON.stringify({ kind: 'native-plan-data-stopped121', message: 'No Native or publication action granted; preserve any metadata already written.' })); process.exitCode = 1; }
}
