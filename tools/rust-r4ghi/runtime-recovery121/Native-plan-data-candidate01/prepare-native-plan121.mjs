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
export function produceNativePlanData121(options) {
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
