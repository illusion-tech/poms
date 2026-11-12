// Root FS/data preparation only. Import is pure. Never imports an application
// helper, constructs a context, authenticates, probes /proc, or executes a mode.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

const freeze = v => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
export const FRESH67 = freeze({
  root: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',
  private: '/home/wangzishi/.local/share/poms-r4ghi/private',
  node: '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node',
  nodeSHA: 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12',
  G1B: { file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/g1B/Root-G1B-121.json', bytes: 5254, rawBytesSha256: 'be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc' },
  composition: { file: '/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-compositions06/17ca9a05-544f-486d-be19-2807de42b0c0/complete.json', bytes: 6150, rawBytesSha256: '9124829bdb1aa311055e99a4604767936914970c27d96b33ffc58e3fefb56c1a' },
  technicalG1: { file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/tax15-invocation118-g1/Root-G1-Tax15-118.json', bytes: 8942, rawBytesSha256: '646447aab505c0bf73e0971439fca36a6aca1afb961a0a4573cadeccfc7342b9' },
  baseline: { file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/tax15-invocation118-baseline.md', rawBytesSha256: 'a5520bb4f4dbe8d79945e9ef10309828d01c390fa94ba31301aeb8cfff9f444c' },
  wireSpec: { file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/libs/shared/api-spec/openapi.json', bytes: 1405031, rawBytesSha256: 'b3aa25c02785a4b366c6de9557ff9d9a71a1bf8bcf41544f12e5f32332d59824' },
  oldMain: { file: '/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business13/main01/000054-tax13-main-actual-success.json', bytes: 4524, rawBytesSha256: 'c075de72639a418cb4c76932d6fd325e012d77e9552f55377249bf88bb0ff09c' },
  oldBodySHA: '0f92913cd78146402e5eb3a004f10a55c8e47417d961301210d2e7d5376dcc98',
  executorNames: ['run-tax15-once.mjs', 'invocation-proof.mjs', 'retained-tax-proof.mjs', 'tax15-once-effects.mjs', 'tax15-once-wire.mjs', 'tax15-once-ledger.mjs', 'tax15-prepare.mjs', 'tax15-facts.mjs'],
});
const C = FRESH67, D = C.private + '/business/g2-business15/main01';
const SELF = C.root + '/tools/rust-r4ghi/runtime-recovery121/Tax121-current-metadata-data-candidate01/prepare-tax121-current-metadata.mjs';
const TAX14 = C.root + '/tools/rust-r4ghi/business/tax14-bindings258.json';
const TABLES = ['platform_user', 'user_role_assignment', 'role', 'role_permission_assignment'];
const INPUT34 = ['kind', 'schemaVersion', 'namespace', 'epoch', 'run', 'mode', 'nonce', 'phase', 'actorKey', 'actorId', 'expectedActorPermissions', 'bodySHA256', 'technicalG1', 'baseline', 'expectedEntryState', 'runtimeBindings', 'codeAdmission15', 'candidate', 'actualHelperPins', 'actualSourcePins', 'actualCompilePins', 'apiProcess', 'prepared15', 'fullInventory', 'codeReview', 'executionSources', 'wireSpec', 'approvedClosedFISet', 'selectedFamily', 'approvedRecovery', 'approvedCompletedPrefix', 'approvedStartCursor', 'approvedFICompletion', 'expectedActiveFault'];
const sha = b => createHash('sha256').update(b).digest('hex'), clone = structuredClone;
function eq(a, b, label) { assert(isDeepStrictEqual(a, b), label); }
function plain(v) {
  assert(v && typeof v === 'object' && !Array.isArray(v) && !isProxy(v) && Object.getPrototypeOf(v) === Object.prototype, 'Plain JSON object required');
  assert.equal(Reflect.ownKeys(v).length, Object.keys(v).length, 'No symbols');
  for (const d of Object.values(Object.getOwnPropertyDescriptors(v))) assert(Object.hasOwn(d, 'value'), 'No accessors');
}
function keys(v, expected) { plain(v); eq(Object.keys(v).sort(), [...expected].sort(), 'Closed metadata keys'); }
function dataOnly(v, active = new Set()) {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
  if (typeof v === 'number') { assert(Number.isFinite(v)); return; }
  assert(v && typeof v === 'object' && !isProxy(v) && !active.has(v), 'JSON data only'); active.add(v);
  if (Array.isArray(v)) { assert(Object.getPrototypeOf(v) === Array.prototype && Reflect.ownKeys(v).length === v.length + 1); for (let i = 0; i < v.length; i++) { const d = Object.getOwnPropertyDescriptor(v, String(i)); assert(d && Object.hasOwn(d, 'value')); dataOnly(d.value, active); } }
  else { plain(v); for (const x of Object.values(v)) dataOnly(x, active); } active.delete(v);
}
function absolute(file) { assert(typeof file === 'string' && file.startsWith('/') && !file.includes('\\') && !file.includes('//') && !/[\0\r\n]/.test(file) && path.posix.resolve(file) === file, 'Canonical Linux path'); }
function pinShape(p, full = false) { plain(p); keys(p, full || Object.hasOwn(p, 'bytes') ? ['file', 'bytes', 'rawBytesSha256'] : ['file', 'rawBytesSha256']); absolute(p.file); assert(/^[a-f0-9]{64}$/.test(p.rawBytesSha256)); if (Object.hasOwn(p, 'bytes')) assert(Number.isSafeInteger(p.bytes) && p.bytes >= 0); }
function same(a, b) { pinShape(a); pinShape(b); assert.equal(a.file, b.file, 'Pin path'); assert.equal(a.rawBytesSha256, b.rawBytesSha256, 'Pin SHA'); if (a.bytes !== undefined && b.bytes !== undefined) assert.equal(a.bytes, b.bytes, 'Pin length'); }
function privatePin(p, full = false) { pinShape(p, full); assert(p.file.startsWith(C.private + '/')); }
function canonicalSources(sources) { assert(Array.isArray(sources)); const result = sources.map(p => { pinShape(p); assert(p.file.startsWith(C.root + '/')); return { file: p.file, rawBytesSha256: p.rawBytesSha256 }; }).sort((a, b) => Buffer.compare(Buffer.from(a.file), Buffer.from(b.file))); assert.equal(new Set(result.map(p => p.file)).size, result.length); return result; }
export function validateOptions121(options) {
  dataOnly(options); keys(options, ['nativePublication', 'compositionComplete', 'codeReadyCarrier', 'nonce', 'phase', 'outputDirectory']);
  keys(options.nativePublication, ['complete', 'expectedEntryState']); privatePin(options.nativePublication.complete, true); privatePin(options.nativePublication.expectedEntryState, true);
  assert.notEqual(options.nativePublication.expectedEntryState.file, D + '/state.json', 'Existing immutable entry snapshot required; canonical state is not a snapshot');
  privatePin(options.compositionComplete, true); same(options.compositionComplete, C.composition); pinShape(options.codeReadyCarrier, true);
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(options.nonce));
  assert(typeof options.phase === 'string' && /^[A-Za-z0-9_-]{1,30}$/.test(options.phase));
  assert.equal(options.outputDirectory, D + '/tax121-prepare-metadata-' + options.nonce); return options;
}
export function deriveManagerPermissions121(models, managerId, marker) {
  dataOnly(models); assert(Array.isArray(models) && models.length === 2); assert(typeof managerId === 'string' && /^[a-f0-9-]{36}$/.test(managerId));
  const records = models.map(model => {
    keys(model, ['snapshotPin', 'snapshot', 'tables']); pinShape(model.snapshotPin, true); assert.equal(model.snapshot.epoch, 'runtime-recovery121-A'); assert.equal(model.snapshot.marker, marker);
    keys(model.tables, TABLES); const values = {}, provenance = {};
    for (const name of TABLES) {
      const t = model.tables[name]; keys(t, ['descriptor', 'rowsPin', 'rows']); pinShape(t.rowsPin, true); assert.equal(t.rowsPin.file, t.descriptor.file); assert.equal(t.rowsPin.rawBytesSha256, t.descriptor.rawBytesSha256); assert.equal(t.rows.length, t.descriptor.count);
      values[name] = t.rows.map(row => { assert.equal(sha(row.raw), row.sha256); return JSON.parse(row.raw); }); provenance[name] = { ...clone(t.rowsPin), count: t.rows.length };
    }
    const accounts = values.platform_user.filter(r => r.id === managerId); assert.equal(accounts.length, 1, 'Exactly the existing manager account'); assert.equal(accounts[0].is_active, true);
    // Exact permissionSet118 rule from the frozen TaxEffects source: no added
    // filter, guessed role, permission cache, grant, or hard-coded permission set.
    const assigned = new Set(values.user_role_assignment.filter(r => r.status === 'active' && r.user_id === managerId).map(r => r.role_id));
    const active = new Set(values.role.filter(r => r.is_active && assigned.has(r.id)).map(r => r.id));
    const permissions = [...new Set(values.role_permission_assignment.filter(r => r.status === 'active' && active.has(r.role_id)).map(r => r.permission_key))].sort();
    assert(permissions.length > 0 && permissions.every(p => typeof p === 'string' && p));
    return { actorId: managerId, accountIsActive: true, expectedActorPermissions: permissions, provenance };
  });
  assert.notEqual(models[0].snapshotPin.file, models[1].snapshotPin.file); assert.equal(models[0].snapshot.run, models[1].snapshot.run);
  eq(records[0].expectedActorPermissions, records[1].expectedActorPermissions, 'Both real snapshots must have the same full permission set');
  for (const name of TABLES) eq(models[0].tables[name].rows, models[1].tables[name].rows, 'Both real permission-table observations must match');
  return { kind: 'Root-offline-current121-manager-permission-evidence', actorId: managerId, accountIsActive: true, expectedActorPermissions: records[0].expectedActorPermissions, actualSnapshots: models.map(m => clone(m.snapshotPin)), tableProvenance: records.map(r => r.provenance), fullSetNotSubset: true, actorCachesUsed: false, permissionsGrantedOrChanged: false, freshExecutorAuthenticationStillRequired: true };
}
export function validateMetadataModel121(m) {
  dataOnly(m); const names = ['options', 'publication', 'registry', 'candidate', 'plan', 'entryState', 'oldState', 'baseReg5', 'tax14Template', 'sourceArray', 'helperArray', 'compileArray', 'carrier', 'permissions']; if (m.plan?.protocolVersion === 2) names.push('successorEvidence'); keys(m, names); validateOptions121(m.options);
  const { publication: p, registry: r, candidate: c, plan, entryState: state, oldState: old, baseReg5: reg } = m;
  assert.equal(p.kind, 'actual-Source15-runtime121-FS-publication-complete'); assert.equal(p.statePublished, true);
  for (const flag of ['ordinaryContextCreated', 'APIStarted', 'SQLHTTP', 'G3', 'G4']) assert.equal(p[flag], false);
  assert.equal(p.state.file, D + '/state.json'); assert.equal(m.options.nativePublication.complete.file, plan.outputs.receiptDirectory + '/complete.json');
  assert.equal(r.kind, 'verified-Source15-append-runtime-registry121'); assert.equal(r.schemaVersion, 1); assert.equal(r.protocolVersion, 1);
  assert.equal(c.kind, 'actual-Source15-runtime-candidate121'); assert.equal(c.protocolVersion, 1); assert.equal(plan.kind, 'source15-append-runtime-plan121'); assert([1, 2].includes(plan.protocolVersion));
  if (plan.protocolVersion === 2) { keys(m.successorEvidence, ['sourceModel', 'helperComposition', 'externalComposition']); const x = m.successorEvidence; validateSuccessorPlan361(plan, x.sourceModel, plan.stateTransfer.successor); validateSuccessorWrappers361(plan, x.sourceModel, x.helperComposition, x.externalComposition); validateSuccessorPublishedState361(state, plan, x.sourceModel); eq(m.helperArray, x.sourceModel.newHelpers, 'Exact successor helper229'); const sourceMap = new Map(sources361(x.sourceModel.newExecution, 284).map(p => [p.file, p.rawBytesSha256])); for (const p of m.carrier.executionSources) { pin361(p, true); assert.equal(p.rawBytesSha256, sourceMap.get(p.file), 'Actual current8 carrier must match successor graph'); } }
  for (const v of [r, c, plan, state]) { assert.equal(v.namespace, 'poms-r4ghi'); assert.equal(v.epoch, 'g2-business15'); assert.equal(v.run, 'main01'); }
  same(p.input, r.approvedPlan); same(p.approval, r.RootExecutionApproval); same(c.runtimeAdmission121, p.registry); same(state.runtimeAdmission121.registry, p.registry); same(state.runtimeAdmission121.candidate, p.candidate);
  assert.equal(state.runtimeAdmission121.kind, 'current-source15-runtime-lease121'); assert.equal(state.runtimeAdmission121.protocolVersion, 1);
  assert.equal(p.registry.file, plan.outputs.registryFile); assert.equal(p.candidate.file, plan.outputs.candidateFile); assert.equal(r.nonce, plan.nonce); assert.equal(c.nonce, plan.nonce); assert.equal(r.scope121, c.scope121); assert(/^[a-f0-9]{64}$/.test(r.scope121));
  eq(r.retained, plan.base, 'Registry retained parent'); eq(r.composition, plan.composition, 'Registry composition'); eq(c.current, r.current, 'Candidate current record');
  same(r.baseCodeRegistry, plan.base.codeAdmission15); same(c.baseCodeRegistry, plan.base.codeAdmission15); same(r.baseCodeCandidate, plan.base.codeCandidate15); same(c.baseCodeCandidate, plan.base.codeCandidate15);
  same(state.consumerAdmission54.registry, plan.base.codeAdmission15); same(state.runtimeAdmission121.baseCodeRegistry, plan.base.codeAdmission15); same(state.runtimeAdmission121.baseCodeCandidate, plan.base.codeCandidate15);
  assert.equal(reg.schemaVersion, 5); same(reg.approvedPlan, plan.base.approvedCodePlan15); same(r.current.apiProcess, plan.current.apiProcess); same({ file: state.apiProcess.file, rawBytesSha256: state.apiProcess.rawBytesSha256 }, plan.current.apiProcess); eq(state.apiProcess.record, r.current.apiRecord, 'Actual published API record');
  assert.equal(r.current.helperCount, 229); assert.equal(r.current.sourceCount, 420); assert.equal(m.helperArray.length, 229); assert.equal(m.sourceArray.length, 420); assert.equal(m.compileArray.length, 528);
  eq(m.helperArray, r.current.helperSources, 'Actual helper array'); eq(m.sourceArray, r.current.sources, 'Actual source array'); assert.equal(sha(JSON.stringify(m.sourceArray)), r.current.sourcePinsSHA256);
  for (const k of ['helperPins', 'sourcePins', 'compilePins', 'apiProcess', 'PGConservation']) same(r.current[k], plan.current[k]);
  assert.equal(state.marker, old.marker); assert.equal(state.prefix, old.prefix); assert(Number.isSafeInteger(state.sequence) && state.sequence >= old.sequence);
  for (const k of ['taxContinuation13', 'taxContinuation14', 'taxContinuation15']) eq(state[k], old[k], 'Original Tax history is immutable');
  eq(state.consumerChecks.tax15Invocation118, old.consumerChecks.tax15Invocation118, 'Original failed invocation remains labelled'); eq(state.fixtures.sharedSourceFollowup58, old.fixtures.sharedSourceFollowup58, 'Original retained producer fixture');
  assert(!state.taxContinuation121, 'Existing current121 Tax attempt requires Root reconciliation'); assert(!state.activeFault && !state.blockedObservation && !state.cleaned && !state.cleanupPlan);
  const t = m.tax14Template; assert.equal(t.legacy.epoch, 'g2-business12'); assert.equal(t.legacy.run, 'main01'); assert.equal(t.legacy.registryPath, '/fixtures/sharedSourceFollowup58'); same(t.retainedMain13.original, C.oldMain); assert.equal(t.retainedMain13.pointer, '/taxContinuation13/mainCompletion');
  same(state.taxContinuation13.mainCompletion.original, C.oldMain); assert.equal(state.taxContinuation13.mainCompletion.status, 201); assert.equal(state.taxContinuation13.mainCompletion.postconditions, 'verified');
  assert.equal(plan.base.bodySHA256, C.oldBodySHA); same(plan.base.prepared15, r.retained.prepared15); same(plan.base.fullInventory, r.retained.fullInventory);
  assert.equal(m.carrier.kind, 'non-author-Tax15-invocation118-code-review'); assert.equal(m.carrier.verdict, 'code-ready-for-exact-input-review'); assert.equal(m.carrier.reviewerIsAuthor, false);
  assert(Array.isArray(m.carrier.executionSources) && m.carrier.executionSources.length === 8); eq(m.carrier.executionSources.map(p => { pinShape(p, true); return p.file; }).sort(), C.executorNames.map(n => C.root + '/tools/rust-r4ghi/tax15-invocation118/' + n).sort(), 'Exact frozen executor8');
  assert.equal(m.permissions.actorId, state.actors.manager.id); assert.equal(m.permissions.accountIsActive, true); assert.equal(m.permissions.fullSetNotSubset, true); assert.equal(m.permissions.actorCachesUsed, false); assert.equal(m.permissions.permissionsGrantedOrChanged, false); assert(m.permissions.expectedActorPermissions.length > 0);
  return m;
}
export function buildRuntimeBindings121(model) {
  const m = validateMetadataModel121(model), r = m.registry, p = m.publication, b = m.plan.base;
  return { schemaVersion: 2, current: { epoch: 'g2-business15', run: 'main01', sourceCount: 420, sourcePinsSHA256: r.current.sourcePinsSHA256, sourcePins: clone(m.sourceArray), binarySHA256: r.current.binary.rawBytesSha256, apiProcess: clone(r.current.apiProcess), candidate: clone(p.candidate), helperCount: 229, helperSources: clone(m.helperArray), helperPins: clone(r.current.helperPins), codeAdmission15: clone(b.codeAdmission15), retentionIndex: clone(m.baseReg5.retentionIndex), retainedProducerState: clone(m.baseReg5.producerState), producerProjectionSHA256: sha(JSON.stringify(m.entryState.fixtures.sharedSourceFollowup58)), runtimeAdmission121: clone(p.registry), retainedSource15State: clone(b.retainedState15) }, legacy: clone(m.tax14Template.legacy), retainedMain13: { ...clone(m.tax14Template.retainedMain13), sourceState: clone(m.baseReg5.producerState) }, retainedPreparation15: { prepared15: clone(b.prepared15), fullInventory: clone(b.fullInventory), bodySHA256: b.bodySHA256 } };
}
export function buildPrepareInput121(model, runtimePin) {
  const m = validateMetadataModel121(model), o = m.options; privatePin(runtimePin, true); assert.equal(runtimePin.file, o.outputDirectory + '/runtime-bindings121.json');
  const input = { kind: 'Root-reviewed-Tax15-invocation118', schemaVersion: 1, namespace: 'poms-r4ghi', epoch: 'g2-business15', run: 'main01', mode: 'prepare-only', nonce: o.nonce, phase: o.phase, actorKey: 'manager', actorId: m.permissions.actorId, expectedActorPermissions: clone(m.permissions.expectedActorPermissions), bodySHA256: null, technicalG1: clone(C.technicalG1), baseline: clone(C.baseline), expectedEntryState: clone(o.nativePublication.expectedEntryState), runtimeBindings: clone(runtimePin), codeAdmission15: clone(m.plan.base.codeAdmission15), candidate: clone(m.publication.candidate), actualHelperPins: clone(m.registry.current.helperPins), actualSourcePins: clone(m.registry.current.sourcePins), actualCompilePins: clone(m.registry.current.compilePins), apiProcess: clone(m.registry.current.apiProcess), prepared15: null, fullInventory: null, codeReview: clone(o.codeReadyCarrier), executionSources: clone(m.carrier.executionSources), wireSpec: clone(C.wireSpec), approvedClosedFISet: null, selectedFamily: null, approvedRecovery: null, approvedCompletedPrefix: null, approvedStartCursor: null, approvedFICompletion: null, expectedActiveFault: null };
  keys(input, INPUT34); return input;
}
export function expectedPrepareReview121(inputPin, input) { pinShape(inputPin, true); keys(input, INPUT34); assert.equal(input.mode, 'prepare-only'); return { kind: 'Root-approved-exact-Tax15-invocation118', approvedInput: clone(inputPin), codeReview: clone(input.codeReview), expectedEntryState: clone(input.expectedEntryState), mode: 'prepare-only', nonce: input.nonce, actualG2Authorized: true, normalTaxPOSTGranted: false, FIGranted: false }; }

function absent(file) { try { fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return; throw e; } throw Error('Existing entry must be preserved'); }
function rawFile(file) {
  absolute(file); const before = fs.lstatSync(file, { bigint: true }); assert(before.isFile() && !before.isSymbolicLink() && before.nlink === 1n); assert.equal(fs.realpathSync(file), file);
  const bytes = fs.readFileSync(file), after = fs.lstatSync(file, { bigint: true }); for (const k of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(before[k], after[k]); return bytes;
}
function newReader() {
  const seen = new Map();
  const read = p => { pinShape(p); const bytes = rawFile(p.file), actual = { file: p.file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; same(actual, p); if (seen.has(p.file)) same(actual, seen.get(p.file)); seen.set(p.file, actual); return bytes; };
  return { read, json: p => JSON.parse(read(p)), actual: file => { const bytes = rawFile(file), p = { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; read(p); return p; }, recheck: () => { for (const p of [...seen.values()]) read(p); } };
}
function guards121(expectedEntry) {
  for (const n of [13, 14, 15]) absent(C.private + '/business/g2-business' + n + '/main01/driver.lock');
  const actual = rawFile(D + '/state.json'), expected = rawFile(expectedEntry.file); assert(actual.equals(expected), 'Canonical current state differs from immutable entry snapshot'); assert.equal(sha(expected), expectedEntry.rawBytesSha256); assert.equal(expected.length, expectedEntry.bytes);
}
function host121() {
  assert.equal(process.platform, 'linux'); assert.equal(process.getuid(), 1000); assert.equal(process.version, 'v24.19.0'); assert.equal(process.cwd(), C.root); assert.equal(process.execArgv.length, 0); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
  assert.equal(fs.realpathSync(process.execPath), C.node); assert.equal(sha(fs.readFileSync(process.execPath)), C.nodeSHA); assert.equal(fileURLToPath(import.meta.url), SELF);
}
function readSnapshot121(io, p, expectedNonce, marker) {
  const snapshot = io.json(p); assert.equal(snapshot.epoch, 'runtime-recovery121-A'); assert.equal(snapshot.run, expectedNonce); assert.equal(snapshot.marker, marker);
  const tables = snapshot.databases?.poms_r4ghi_rust?.tables; assert(tables && Object.keys(tables).length === 139);
  return { snapshotPin: clone(p), snapshot: { epoch: snapshot.epoch, run: snapshot.run, marker: snapshot.marker }, tables: Object.fromEntries(TABLES.map(name => { const descriptor = tables[name], descriptorPin = { file: descriptor.file, rawBytesSha256: descriptor.rawBytesSha256 }; pinShape(descriptorPin); const rowsPin = io.actual(descriptor.file); same(rowsPin, descriptorPin); const rows = io.read(rowsPin).toString('utf8').split('\n').filter(Boolean).map(JSON.parse); return [name, { descriptor: { file: descriptor.file, rawBytesSha256: descriptor.rawBytesSha256, count: descriptor.count }, rowsPin, rows }]; })) };
}
function loadModelV1_121(io, options) {
  const g1 = io.json(C.G1B); assert.equal(g1.kind, 'Root-frozen-runtime-recovery121-G1B'); assert.equal(g1.codeImplementationGranted, true); assert(g1.ownership.Root.includes('metadata/evidence preparation'));
  const composition = io.json(options.compositionComplete); assert.equal(composition.kind, 'Root-runtime121-Native06-composition-materialized'); assert.equal(composition.rootSourceRawRechecked, true);
  const graph = io.json(composition.normalizedExecutionSources); assert.equal(graph.length, 284); eq(canonicalSources(graph), canonicalSources(io.json(composition.actualGraphs.execution)), 'Actual M06 graph');
  const graphMap = new Map(graph.map(p => [p.file, p.rawBytesSha256])); for (const p of graph) io.read(p);
  const publication = io.json(options.nativePublication.complete), registry = io.json(publication.registry), candidate = io.json(publication.candidate), plan = io.json(publication.input);
  same(registry.current.helperPins, composition.actualGraphs.helper); same(plan.current.helperPins, composition.actualGraphs.helper); eq(plan.composition, io.json(composition.planComposition), 'Actual M06 composition'); eq(canonicalSources(plan.tooling.executionSources), canonicalSources(graph), 'Native source284');
  for (const component of composition.components) { io.read(component.manifest); io.read(component.review); io.read(component.G1); }
  const approval = io.json(publication.approval), peer = io.json(approval.independentInputReview); assert.equal(approval.kind, 'Root-approved-exact-runtime-admission121'); assert.equal(approval.actualG2Authorized, true); assert.equal(approval.FSStatePublicationGranted, true);
  for (const flag of ['APIStartGranted', 'PGWriteGranted', 'TaxHTTPGranted']) assert.equal(approval[flag], false);
  assert.equal(peer.kind, 'non-author-runtime121-input-review'); assert.equal(peer.verdict, 'approved-exact-FS-runtime-publication-only'); assert.equal(peer.reviewerIsAuthor, false); same(peer.approvedPlan, publication.input); same(approval.approvedPlan, publication.input); assert.equal(peer.scope121, registry.scope121); assert.equal(approval.scope121, registry.scope121); eq(canonicalSources(peer.sourceClosures), canonicalSources(graph), 'Actual Native reviewed source284');
  const publisher = graph.find(p => p.file === C.root + '/tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs'); assert(publisher); same(peer.operator, publisher); same(approval.operator, publisher);
  guards121(options.nativePublication.expectedEntryState);
  const entryState = io.json(options.nativePublication.expectedEntryState), oldState = io.json(plan.base.retainedState15), baseReg5 = io.json(plan.base.codeAdmission15), sourceArray = io.json(registry.current.sourcePins), helperArray = io.json(registry.current.helperPins), compileArray = io.json(registry.current.compilePins);
  const names = fs.readdirSync(C.root + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).map(n => 'tools/rust-r4ghi/business/' + n).sort(); eq(names, helperArray.map(p => p.file).sort(), 'Complete current H3 membership');
  for (const p of helperArray) assert.equal(graphMap.get(C.root + '/' + p.file), p.sha256);
  const tax14Template = io.json({ file: TAX14, rawBytesSha256: graphMap.get(TAX14) });
  const carrier = io.json(options.codeReadyCarrier); for (const p of carrier.executionSources) { pinShape(p, true); assert.equal(graphMap.get(p.file), p.rawBytesSha256, 'Carrier exact current M06 source'); io.read(p); }
  const api = io.json(registry.current.apiProcess); eq(api, registry.current.apiRecord, 'Published process record bytes'); same(api.sourcePins, registry.current.sourcePins); same(api.helperPins, registry.current.helperPins); same(api.compilePins, registry.current.compilePins);
  const conservation = io.json(registry.current.PGConservation); assert.equal(conservation.kind, 'actual-runtime121-A-original-data-conserved'); assert.equal(conservation.mode, 'pg-observe'); assert.equal(conservation.defaultReadOnly, true); assert.equal(conservation.transactionReadOnly, true); same(conservation.baseline, plan.base.preparedBaseline); same(conservation.originalPGStart, plan.current.PGStart);
  for (const flag of ['newAPIStarted', 'nativeAuthorityGranted', 'businessDML', 'baselineReset', 'backupRestore']) assert.equal(conservation[flag], false);
  assert.equal(conservation.observations.length, 2); const observeInput = io.json(conservation.input); assert.equal(observeInput.mode, 'pg-observe');
  const snapshots = conservation.observations.map(p => readSnapshot121(io, p, observeInput.nonce, entryState.marker));
  const permissions = deriveManagerPermissions121(snapshots, entryState.actors.manager.id, entryState.marker);
  for (const p of [C.technicalG1, C.baseline, C.wireSpec, C.oldMain, plan.base.prepared15, plan.base.fullInventory, baseReg5.producerState, baseReg5.retentionIndex]) io.read(p);
  assert.equal(io.json(C.technicalG1).implementationAuthorized, true);
  const model = { options, publication, registry, candidate, plan, entryState, oldState, baseReg5, tax14Template, sourceArray, helperArray, compileArray, carrier, permissions }; validateMetadataModel121(model); return model;
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

export function validateSuccessorPublishedState361(state, plan, m) {
  validateSuccessorPlan361(plan, m, plan.stateTransfer.successor);
  const old = m.retainedState, prefix = old.runtimeHistory121 ?? [], history = state.runtimeHistory121;
  assert(Array.isArray(prefix) && Array.isArray(history)); assert.equal(history.length, prefix.length + 1); assert.deepEqual(history.slice(0, -1), prefix);
  const item = history.at(-1); keys361(item, ['kind', 'recordedAt', 'retainedState', 'successor', 'predecessorLease', 'retiredTaxContinuationPointer', 'failedInvocation']);
  assert.equal(item.kind, 'retained-runtime121-client-successor-predecessor'); assert(typeof item.recordedAt === 'string'); assert.equal(new Date(item.recordedAt).toISOString(), item.recordedAt);
  same361(item.retainedState, plan.stateTransfer.expectedState); same361(item.successor, plan.stateTransfer.successor); assert.deepEqual(item.predecessorLease, old.runtimeAdmission121);
  assert.equal(item.retiredTaxContinuationPointer, '/taxContinuation121'); same361(item.failedInvocation, m.successor.failurePartial);
  assert.equal(state.taxContinuation121, null);
  const expected = structuredClone(old); expected.runtimeAdmission121 = structuredClone(state.runtimeAdmission121); expected.runtimeHistory121 = structuredClone(history); expected.taxContinuation121 = null;
  assert.deepEqual(state, expected, 'All other32bd state fields, actors, sequence and complete failed journals remain byte-decoded equal'); return state;
}
function loadModelV2361(io, options, publication, registry, candidate, plan) {
  const g1 = io.json(C.G1B); assert.equal(g1.kind, 'Root-frozen-runtime-recovery121-G1B'); assert.equal(g1.codeImplementationGranted, true); assert(g1.ownership.Root.includes('metadata/evidence preparation'));
  const m = loadSourceSuccessor361(io, plan.stateTransfer.successor), composition = m.composition, graph = m.newExecution, w = m.witness;
  same361(options.compositionComplete, w.baselineCompositionComplete); validateSuccessorPlan361(plan, m, plan.stateTransfer.successor);
  const helperComposition = io.json(plan.composition.helperComposition), externalComposition = io.json(plan.composition.externalComposition);
  validateSuccessorWrappers361(plan, m, helperComposition, externalComposition);
  same(registry.current.helperPins, w.currentHelperPins); eq(plan.tooling.executionSources, graph, 'Exact successor graph raw array');
  const graphMap = new Map(sources361(graph, 284).map(p => [p.file, p.rawBytesSha256]));
  const approval = io.json(publication.approval), peer = io.json(approval.independentInputReview); assert.equal(approval.kind, 'Root-approved-exact-runtime-admission121'); assert.equal(approval.actualG2Authorized, true); assert.equal(approval.FSStatePublicationGranted, true);
  for (const flag of ['APIStartGranted', 'PGWriteGranted', 'TaxHTTPGranted']) assert.equal(approval[flag], false);
  assert.equal(peer.kind, 'non-author-runtime121-input-review'); assert.equal(peer.verdict, 'approved-exact-FS-runtime-publication-only'); assert.equal(peer.reviewerIsAuthor, false);
  same(peer.approvedPlan, publication.input); same(approval.approvedPlan, publication.input); assert.equal(peer.scope121, registry.scope121); assert.equal(approval.scope121, registry.scope121); eq(canonicalSources(peer.sourceClosures), canonicalSources(graph), 'Actual Native reviewed current source284');
  const publisher = graph.find(p => p.file === C.root + '/tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs'); assert(publisher); same(peer.operator, publisher); same(approval.operator, publisher);
  guards121(options.nativePublication.expectedEntryState);
  const entryState = io.json(options.nativePublication.expectedEntryState), oldState = io.json(plan.base.retainedState15), baseReg5 = io.json(plan.base.codeAdmission15), sourceArray = io.json(registry.current.sourcePins), helperArray = io.json(registry.current.helperPins), compileArray = io.json(registry.current.compilePins);
  validateSuccessorPublishedState361(entryState, plan, m);
  const names = fs.readdirSync(C.root + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).map(n => 'tools/rust-r4ghi/business/' + n).sort(); eq(names, helperArray.map(p => p.file).sort(), 'Complete successor H3 membership');
  eq(helperArray, m.newHelpers, 'Real current helper229 array'); for (const p of helperArray) assert.equal(graphMap.get(C.root + '/' + p.file), p.sha256);
  const tax14Template = io.json({ file: TAX14, rawBytesSha256: graphMap.get(TAX14) });
  const carrier = io.json(options.codeReadyCarrier); for (const p of carrier.executionSources) { pinShape(p, true); assert.equal(graphMap.get(p.file), p.rawBytesSha256, 'Carrier exact current successor source'); io.read(p); }
  const api = io.json(registry.current.apiProcess), startup = io.json(api.input); eq(api, registry.current.apiRecord, 'Unchanged published process record bytes');
  same(api.sourcePins, registry.current.sourcePins); same(api.compilePins, registry.current.compilePins); same(api.helperPins, startup.current.helperPins); same(api.helperPins, w.baselineHelperPins); same(registry.current.helperPins, w.currentHelperPins); eq(startup.composition, m.oldPlanComposition, 'Original startup composition remains original M06');
  same(api.lifetimeOwner, plan.current.lifetimeOwner); same(startup.current.lifetimeOwner, plan.current.lifetimeOwner); same(startup.current.sourcePins, plan.current.sourcePins); same(startup.current.compilePins, plan.current.compilePins);
  same(registry.current.apiProcess, m.predecessorPlan.current.apiProcess); assert.equal(api.binary, plan.current.binary.file); assert.equal(api.binarySha256, plan.current.binary.rawBytesSha256);
  const conservation = io.json(registry.current.PGConservation); assert.equal(conservation.kind, 'actual-runtime121-A-original-data-conserved'); assert.equal(conservation.mode, 'pg-observe'); assert.equal(conservation.defaultReadOnly, true); assert.equal(conservation.transactionReadOnly, true); same(conservation.baseline, plan.base.preparedBaseline); same(conservation.originalPGStart, plan.current.PGStart);
  for (const flag of ['newAPIStarted', 'nativeAuthorityGranted', 'businessDML', 'baselineReset', 'backupRestore']) assert.equal(conservation[flag], false);
  assert.equal(conservation.observations.length, 2); const observeInput = io.json(conservation.input); assert.equal(observeInput.mode, 'pg-observe');
  const snapshots = conservation.observations.map(p => readSnapshot121(io, p, observeInput.nonce, entryState.marker)), permissions = deriveManagerPermissions121(snapshots, entryState.actors.manager.id, entryState.marker);
  for (const p of [C.technicalG1, C.baseline, C.wireSpec, C.oldMain, plan.base.prepared15, plan.base.fullInventory, baseReg5.producerState, baseReg5.retentionIndex]) io.read(p);
  assert.equal(io.json(C.technicalG1).implementationAuthorized, true);
  const model = { options, publication, registry, candidate, plan, entryState, oldState, baseReg5, tax14Template, sourceArray, helperArray, compileArray, carrier, permissions,
    successorEvidence: { sourceModel: m, helperComposition, externalComposition } }; validateMetadataModel121(model); return model;
}

function loadModel121(io, options) {
  const publication = io.json(options.nativePublication.complete), plan = io.json(publication.input);
  if (plan.protocolVersion === 2) return loadModelV2361(io, options, publication, io.json(publication.registry), io.json(publication.candidate), plan);
  assert.equal(plan.protocolVersion, 1); return loadModelV1_121(io, options);
}

export function parseMetadataCLI121(args) {
  assert(Array.isArray(args) && args.length === 7 && args[6] === '--execute'); keys(Object.fromEntries([0, 2, 4].map(i => [args[i], args[i + 1]])), ['--input', '--input-sha', '--input-bytes']);
  eq([args[0], args[2], args[4]], ['--input', '--input-sha', '--input-bytes'], 'Fixed CLI'); assert(/^(0|[1-9][0-9]*)$/.test(args[5])); const p = { file: args[1], bytes: Number(args[5]), rawBytesSha256: args[3] }; pinShape(p, true); return p;
}
async function produceFresh67Metadata121(args) {
  host121(); const io = newReader(), optionsPin = parseMetadataCLI121(args), options = validateOptions121(io.json(optionsPin));
  io.read(io.actual(SELF)); const model = loadModel121(io, options); io.recheck(); guards121(options.nativePublication.expectedEntryState); absent(options.outputDirectory);
  const parent = fs.lstatSync(D); assert(parent.isDirectory() && !parent.isSymbolicLink() && parent.uid === 1000); assert.equal(fs.realpathSync(D), D);
  fs.mkdirSync(options.outputDirectory, { mode: 0o700 });
  const save = (name, value) => { assert.equal(path.posix.basename(name), name); const file = options.outputDirectory + '/' + name, bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'); fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); const p = io.actual(file); assert.equal(p.rawBytesSha256, sha(bytes)); return p; };
  try {
    const actorEvidence = save('manager-permission-evidence121.json', { ...model.permissions, currentEntryState: options.nativePublication.expectedEntryState, conservation: model.registry.current.PGConservation, accountPasswordOrTokenOrEnvironmentEmitted: false });
    const runtimeBindings = save('runtime-bindings121.json', buildRuntimeBindings121(model));
    const inputBody = buildPrepareInput121(model, runtimeBindings), input = save('prepare-only-input118.json', inputBody);
    const expectedRootReviewBody = expectedPrepareReview121(input, inputBody), reviewBytes = Buffer.from(JSON.stringify(expectedRootReviewBody, null, 2) + '\n');
    const expectedRootReview = { file: options.outputDirectory + '/Root-exact-prepare-only-review118.json', bytes: reviewBytes.length, rawBytesSha256: sha(reviewBytes) }; absent(expectedRootReview.file);
    const request = save('request-prepare-only-G2-review118.json', { kind: 'Root-requested-Tax15-prepare-only118-exact-G2', recordedAt: new Date().toISOString(), mode: 'prepare-only', input, expectedRootReview, expectedRootReviewBody, actualNativePublication: options.nativePublication.complete, actualSource15EntryState: options.nativePublication.expectedEntryState, actualOfflineActorEvidence: actorEvidence, actualComposition: options.compositionComplete, actualCurrentCodeReview: options.codeReadyCarrier, options: optionsPin, requestedAction: 'Only separately exact-reviewed real Native entry/exit and fresh complete prepare67; no FI, Tax/Main command or normal201', actualG2: false, preparationAlreadyRun: false, RootReviewSigned: false });
    io.recheck(); guards121(options.nativePublication.expectedEntryState); absent(expectedRootReview.file);
    return save('complete.json', { kind: 'Root-runtime121-fresh67-metadata-prepared', options: optionsPin, nativePublication: options.nativePublication, composition: options.compositionComplete, codeReadyCarrier: options.codeReadyCarrier, actorEvidence, runtimeBindings, input, request, expectedRootReview, inputKeys: 34, executorSources: 8, snapshotCopied: false, canonicalStateModified: false, credentialTokenOrEnvironmentValueEmitted: false, MainReplayed: false, NativeOrContextCalled: false, authenticationOrSQLHTTP: false, prepareExecuted: false, actualG2Granted: false, businessG3: false, businessG4: false });
  } catch (error) {
    try { save('partial.json', { kind: 'runtime121-fresh67-metadata-preserve', options: optionsPin, nativePublication: options.nativePublication, message: 'Metadata preparation stopped; preserve files and review exact inputs before choosing any new output.', name: ['Error', 'AssertionError', 'TypeError', 'SyntaxError'].includes(error.name) ? error.name : 'Error', canonicalStateModified: false, NativeOrContextCalled: false, authenticationOrSQLHTTP: false, actualG2Granted: false }); } catch {}
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  produceFresh67Metadata121(process.argv.slice(2)).then(complete => console.log(JSON.stringify({ complete, actualG2: false, prepareExecuted: false }))).catch(() => { console.error('Fresh67 metadata rejected/stopped; preserve inputs and outputs. No runtime or business authority granted.'); process.exitCode = 1; });
}
