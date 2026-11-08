// External Root-only driver. It is never part of business/H0/H1 enumeration.
// Importing is pure; actual operations require a private hash-approved input.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { PERIOD206, sha206, samePin206, assertPlanShape206, assertCalendar206, periodBody206, currentGraph206, verifyPeriodSuccess206, assertReadViews206, sourceUnit206 } from './facts206.mjs';

const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const PRIVATE = '/home/wangzishi/.local/share/poms-r4ghi/private';
const PRIV = PRIVATE + '/business/g2-business13/main01';
const node206 = '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node';
const approvedInputs206 = new WeakMap();
function inside206(root, file) { const rel = path.relative(fs.realpathSync(root), fs.realpathSync(file)); assert(rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel)); }
export function readPin206(pin) {
  assert(pin && path.isAbsolute(pin.file) && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256));
  const s = fs.lstatSync(pin.file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1); assert.equal(fs.realpathSync(pin.file), path.resolve(pin.file));
  const bytes = fs.readFileSync(pin.file); assert.equal(sha206(bytes), pin.rawBytesSha256); return bytes;
}
const json206 = pin => JSON.parse(readPin206(pin));
const pinFile206 = file => ({ file, rawBytesSha256: sha206(fs.readFileSync(file)) });
const identity206 = p => Object.fromEntries(['sourcePins','sourcePinsSHA256','helperH1','helperSources','apiProcess','binarySHA256','baseRegistry','toolAdmission119','candidate','taxCompletion','executionTools'].map(k => [k, p[k]]));
export function loadApprovedInput206(inputPin, mode) {
  inside206(PRIV, inputPin.file); const plan = assertPlanShape206(json206(inputPin), mode);
  approvedInputs206.set(plan, { pin: Object.freeze({ ...inputPin }), mode }); return plan;
}
function approvedInput206(plan, mode = null) {
  const actual = approvedInputs206.get(plan); assert(actual, 'Only the exact hash-approved private input can run; no template or hand-built plan');
  if (mode) assert.equal(actual.mode, mode); assert.deepEqual(json206(actual.pin), plan, 'Approved input object or bytes changed'); return actual.pin;
}
async function helpers206() {
  const names = ['context','http','pure','snapshot','ledger','consumer-admission54','resource-tool-admission119','gh-write-facts','required-write-inventory','fault-sweep','tax13-facts','tax13-semantics','shared-cash-proof58','labor-mask47'];
  const modules = await Promise.all(names.map(name => import(pathToFileURL(ROOT + '/tools/rust-r4ghi/business/' + name + '.mjs').href)));
  return Object.assign({}, ...modules);
}
function verifyRuntime206(ctx, plan, h) {
  approvedInput206(plan);
  assert.equal(ctx.epoch, PERIOD206.epoch); assert.equal(ctx.run, PERIOD206.run); assert.equal(ctx.migrations, 98); assert.equal(ctx.tables, 139);
  assert(!ctx.state.activeFault && !ctx.state.blockedObservation && !ctx.state.cleaned && !ctx.state.cleanupPlan && !ctx.state.processRestart1351);
  assert.equal(sha206(JSON.stringify(ctx.pins)), PERIOD206.sourcePinsSHA256); assert.equal(ctx.pins.length, 416);
  assert.deepEqual(json206(plan.sourcePins), ctx.pins); assert.deepEqual(plan.helperSources, ctx.helperPins); assert.deepEqual(json206(plan.helperH1), ctx.helperPins);
  const registry = h.assertAdmittedContext54(ctx, { liveProcess: true, sourceFiles: true }); assert.equal(registry.schemaVersion, 3);
  samePin206(ctx.state.consumerAdmission54.registry, plan.baseRegistry); samePin206(ctx.state.toolAdmission119.registry, plan.toolAdmission119);
  samePin206(h.effectiveHelperPins119(ctx, registry), plan.helperH1);
  h.assertRuntimeBinding119(ctx, registry, { toolAdmission119: plan.toolAdmission119, candidate: plan.candidate });
  samePin206(ctx.state.apiProcess, plan.apiProcess); assert.equal(ctx.state.apiProcess.record.binarySha256, PERIOD206.binarySHA256);
  const tax = ctx.state.taxContinuation13; assert(tax?.complete && tax.sweep?.finalSuccess?.postconditions === 'verified', 'Tax must really finish before any period exists');
  samePin206(tax.complete, plan.taxCompletion); assert.deepEqual(json206(plan.taxCompletion), tax.sweep);
  assert(!tax.pendingMain && !tax.pendingTaxTrial && !tax.normalTaxPending); assert(tax.sweep.fiComplete); readPin206(tax.sweep.fiComplete);
  assert.equal(tax.sweep.finalSuccess.status, 201); assert.equal(tax.sweep.bodySHA256, sha206(JSON.stringify(tax.sweep.scope.body)));
  assert.deepEqual(tax.sweep.failures.map(f => f.key).sort(), tax.sweep.inventory.map(d => d.key).sort());
  for (const failure of tax.sweep.failures) {
    const proof = json206(failure.observation), selected = tax.sweep.inventory.find(d => d.key === failure.key); assert.deepEqual(proof.descriptor, selected);
    assert.equal(proof.bodySHA256, tax.sweep.bodySHA256); assert.equal(proof.failed.fault.hitCount, 1); assert.equal(proof.failed.fault.fallbackHitCount, 0);
    assert.equal(proof.rollback.allBusinessAuditSecurityRowsAndXminUnchanged, true);
  }
  return registry;
}
async function calendar206(ctx) {
  return ctx.db(async c => (await c.query(`SELECT
    to_char(clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong','YYYY-MM-DD') today,
    to_char(clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong','IYYY-"W"IW') current_week,
    to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')-interval '1 week','IYYY-"W"IW') prior_week,
    to_char(date_trunc('week',clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')-interval '1 week','YYYY-MM-DD') prior_start,
    to_char(date_trunc('week',clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')-interval '1 day','YYYY-MM-DD') prior_end`)).rows[0]);
}
function actualPreparedScope206(ctx, before, scope, preparation, calendar, h) {
  assert.deepEqual(periodBody206(preparation, calendar), scope.body); assert.deepEqual(scope.body.costDecisions, []);
  const rows = h.rowsTax13(ctx, before, h.readRows), graph = currentGraph206(rows);
  assert.equal(graph.headValue.row_version, scope.body.expectedVersion); assert.equal(graph.headValue.baseline_package_id, scope.body.baselinePackageRef.id);
  assert(!rows.values('period_closing_snapshot').some(p => p.project_id === PERIOD206.projectId && p.period_key === PERIOD206.periodKey), 'This is a first real period capture; never replace a prior root');
  const ghFacts = h.deriveGHWriteFacts(ctx, before, PERIOD206.operation, scope, h.readRows);
  assert.equal(ghFacts.snapshotMode, 'period-end'); assert.equal(ghFacts.captureCount, 1); assert.deepEqual(ghFacts.decisionInserts, []); assert.deepEqual(ghFacts.costUpdates, []);
  assert.deepEqual(ghFacts.oldBindingIds, []); assert.deepEqual(ghFacts.oldGateReviewIds, []);
  const expectedCostScope = h.expectedCostScopeTax13(preparation, rows);
  assert.deepEqual([...ghFacts.costUnits].sort(), expectedCostScope.units.map(u => sourceUnit206({ kind: u.kind, id: u.id })).sort());
  return { ghFacts, expectedCostScope, currentGraph: graph };
}
function loadPrepared206(ctx, plan) {
  const state = ctx.state.periodDriver206; assert.equal(state?.kind, 'actual-Source13-H1-period-driver206-state');
  samePin206(state.prepared, plan.approvedPrepared); const prepared = json206(plan.approvedPrepared);
  assert.equal(prepared.kind, 'actual-Source13-H1-period206-prepared-STOP'); assert.deepEqual(prepared.runtimeIdentity, identity206(plan));
  assert.equal(prepared.bodySHA256, sha206(JSON.stringify(prepared.body))); assert.deepEqual(prepared.scope.body, prepared.body);
  assert.deepEqual(prepared.scope.params, {}); assert.equal(prepared.scope.projectId, PERIOD206.projectId); assert.equal(prepared.scope.actorKey, 'manager');
  assert.equal(prepared.scope.actorId, ctx.state.actors.manager.id); assert.deepEqual(prepared.body.costDecisions, []);
  return { state, prepared };
}
async function refreshFacts206(ctx, plan, prepared, h, label) {
  verifyRuntime206(ctx, plan, h); const current = await h.capture(ctx, ctx.next(label)); h.assertRecorded(ctx, current);
  const actual = actualPreparedScope206(ctx, current, prepared.scope, prepared.preparation, prepared.calendar, h);
  assert.deepEqual(actual.ghFacts, prepared.scope.ghFacts); assert.deepEqual(actual.expectedCostScope, prepared.expectedCostScope); assert.deepEqual(actual.currentGraph, prepared.currentGraph);
  assert.deepEqual(h.requiredWriteInventory(PERIOD206.operation, prepared.scope), prepared.inventory);
  ctx.persist(); return current;
}
export async function prepare206(ctx, api, plan, inputPin, h) {
  assert(!ctx.state.periodDriver206, 'Preserve prior prepared/partial/effect history; no replacement preparation');
  samePin206(approvedInput206(plan, 'prepare'), inputPin);
  verifyRuntime206(ctx, plan, h); const calendar = await calendar206(ctx); await api.login('manager'); verifyRuntime206(ctx, plan, h);
  const response = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: PERIOD206.projectId }, null, 'manager',
    { query: { view: 'preparation', intent: 'period-close', periodKey: PERIOD206.periodKey } });
  const preparation = h.data(response).preparation, body = periodBody206(preparation, calendar), before = await h.capture(ctx, ctx.next('p206-prepared-source'));
  h.assertRecorded(ctx, before); const periodPreparation = pinFile206(response.receiptId); inside206(ctx.out, periodPreparation.file);
  const scope = { projectId: PERIOD206.projectId, actorId: ctx.state.actors.manager.id, actorKey: 'manager', params: {}, body, periodPreparation };
  const actual = actualPreparedScope206(ctx, before, scope, preparation, calendar, h); scope.ghFacts = actual.ghFacts;
  const inventory = h.requiredWriteInventory(PERIOD206.operation, scope), bodySHA256 = sha206(JSON.stringify(body));
  const prepared = { kind: 'actual-Source13-H1-period206-prepared-STOP', inputPin, runtimeIdentity: identity206(plan), calendar, preparation,
    periodPreparation, body, bodySHA256, scope, inventory, before: before.manifest, expectedCostScope: actual.expectedCostScope, currentGraph: actual.currentGraph,
    domainPOSTExecuted: false, RootInventoryReviewRequired: true, historicalBaselineReselectionApproved: false, G3Certified: false, G4Certified: false };
  const artifact = ctx.artifact(ctx.next('p206-prepared-STOP') + '.json', prepared);
  ctx.state.periodDriver206 = { kind: 'actual-Source13-H1-period-driver206-state', prepared: artifact, failures: [], fiComplete: null, normalSuccess: null };
  ctx.persist(); return { prepared: artifact, mandatoryFamilies: inventory.length, STOP: true, domainPOSTExecuted: false, G3Certified: false };
}
function verifiedFailure206(failure, selected, bodySHA256, ctx, actorId, h) {
  const proof = json206(failure.observation); assert.deepEqual(proof.descriptor, selected); assert.equal(proof.bodySHA256, bodySHA256);
  assert.equal(proof.failed.fault.hitCount, 1); assert.equal(proof.failed.fault.fallbackHitCount, 0);
  const receipt = json206(proof.failed.receipt); assert.equal(receipt.status, 500); assert.equal(receipt.responseComplete, true); assert.equal(receipt.transportFailure, false);
  assert.equal(sha206(readPin206(receipt.originals.requestBody)), bodySHA256);
  h.assertSweepRollback(ctx, h.loadSnapshot(ctx, proof.failed.before), h.loadSnapshot(ctx, proof.failed.after), proof.failed.fault, actorId);
  assert.equal(proof.rollback.allBusinessAuditSecurityRowsAndXminUnchanged, true); return proof;
}
export async function fi206(ctx, api, plan, h) {
  const { state, prepared } = loadPrepared206(ctx, plan); assert(!state.pendingTrial && !state.normalPending && !state.normalSuccess && !state.fiComplete, 'No blind effect replay or ambiguous retry');
  const inputPin = approvedInput206(plan, 'fi-only');
  assertCalendar206(await calendar206(ctx)); await api.login('manager'); await refreshFacts206(ctx, plan, prepared, h, 'p206-fi-preflight');
  for (const selected of prepared.inventory) {
    const prior = state.failures.find(f => f.key === selected.key); if (prior) { verifiedFailure206(prior, selected, prepared.bodySHA256, ctx, prepared.scope.actorId, h); continue; }
    if (selected.match.kind === 'auth-coflush') await h.waitForActualPendingAuth(ctx, 'manager');
    verifyRuntime206(ctx, plan, h); state.pendingTrial = { key: selected.key, bodySHA256: prepared.bodySHA256, inputPin }; ctx.persist();
    const failed = await api.request(PERIOD206.operation, {}, prepared.body, 'manager', { expectedStatus: 500,
      fi: { kind: PERIOD206.faultKind, key: selected.key, operationId: PERIOD206.operation, scope: prepared.scope, selected } });
    assert.equal(failed.status, 500); assert.equal(failed.responseComplete, true); assert.equal(failed.transportFailure, false);
    assert.equal(failed.requestBodySha256, prepared.bodySHA256); assert.equal(failed.fault.hitCount, 1); assert.equal(failed.fault.fallbackHitCount, 0);
    const rollback = h.assertSweepRollback(ctx, h.loadSnapshot(ctx, failed.before), h.loadSnapshot(ctx, failed.after), failed.fault, prepared.scope.actorId);
    const observation = ctx.artifact(ctx.next('p206-required-failure') + '.json', { descriptor: selected, bodySHA256: prepared.bodySHA256, runtimeIdentity: identity206(plan),
      failed: { receipt: pinFile206(failed.receiptId), before: failed.before, after: failed.after, fault: failed.fault }, rollback });
    state.failures.push({ key: selected.key, observation }); delete state.pendingTrial; ctx.persist();
  }
  assert.deepEqual(state.failures.map(f => f.key).sort(), prepared.inventory.map(d => d.key).sort());
  state.fiComplete = ctx.artifact(ctx.next('p206-fi-complete-STOP') + '.json', { kind: 'actual-Source13-H1-period206-FI-complete-STOP', inputPin, prepared: state.prepared,
    bodySHA256: prepared.bodySHA256, inventory: prepared.inventory, failures: state.failures, runtimeIdentity: identity206(plan), normalPeriodPOSTExecuted: false, G3Certified: false });
  ctx.persist(); return { fiComplete: state.fiComplete, mandatoryFamilies: prepared.inventory.length, normalPeriodPOSTExecuted: false, STOP: true, G3Certified: false };
}
function verifyFI206(ctx, plan, state, prepared, h) {
  samePin206(state.fiComplete, plan.approvedFIComplete); const fi = json206(plan.approvedFIComplete);
  assert.equal(fi.kind, 'actual-Source13-H1-period206-FI-complete-STOP'); samePin206(fi.prepared, state.prepared); assert.equal(fi.bodySHA256, prepared.bodySHA256);
  assert.deepEqual(fi.runtimeIdentity, identity206(plan)); assert.deepEqual(fi.inventory, prepared.inventory); assert.deepEqual(fi.failures, state.failures); assert.equal(fi.normalPeriodPOSTExecuted, false);
  assert.deepEqual(state.failures.map(f => f.key).sort(), prepared.inventory.map(d => d.key).sort());
  for (const selected of prepared.inventory) verifiedFailure206(state.failures.find(f => f.key === selected.key), selected, prepared.bodySHA256, ctx, prepared.scope.actorId, h);
}
function originalSession206(ctx, before, attempt, scope, h) {
  const pub = json206(attempt.publicHTTP); assert.equal(pub.operationId, PERIOD206.operation); assert.equal(pub.status, 201); assert.equal(pub.responseComplete, true); assert.equal(pub.transportFailure, false); assert.equal(pub.requestId, attempt.requestId);
  assert.equal(sha206(readPin206(pub.originals.requestBody)), sha206(JSON.stringify(scope.body)));
  assert.deepEqual(json206(pub.originals.responseBody), attempt.body);
  const config = json206(pub.originals.requestConfig); samePin206(config.before, attempt.before);
  const cookies = config.headers.Cookie.split(';').map(x => x.trim()).filter(x => x.startsWith('poms_session=')); assert.equal(cookies.length, 1);
  const token = sha206(decodeURIComponent(cookies[0].slice('poms_session='.length))), rows = h.readRows(before.databases[ctx.database].tables.auth_session);
  const matches = rows.filter(r => { const v = JSON.parse(r.raw); return v.token_hash === token && v.user_id === scope.actorId && v.status === 'active'; }); assert.equal(matches.length, 1);
  assert(ctx.state.owned[h.keyOf(ctx.database, 'auth_session', matches[0].key)]); return matches[0].key[0];
}
function readConserved206(ctx, response, h) {
  const before = h.loadSnapshot(ctx, response.before), after = h.loadSnapshot(ctx, response.after);
  for (const db of ctx.databases) { assert.deepEqual(before.databases[db].meta, after.databases[db].meta); assert.deepEqual(before.objects[db], after.objects[db]); }
  assert(h.difference(before, after).every(d => ['auth_session','audit_log','security_event'].includes(d.table)), 'A read changed a domain fact');
}
async function verifyAndRead206(ctx, api, plan, state, prepared, h) {
  assert(state.normalSuccess && !state.normalPending); const cached = json206(state.normalSuccess), response = cached.attempt;
  samePin206(cached.prepared, state.prepared); samePin206(cached.fiComplete, state.fiComplete); assert.equal(response.requestBodySha256, prepared.bodySHA256);
  const before = h.loadSnapshot(ctx, response.before), after = h.loadSnapshot(ctx, response.after), sessionId = originalSession206(ctx, before, response, prepared.scope, h);
  const transaction = h.verifyFinalWrites(ctx, before, after, response, prepared.inventory, sessionId);
  const semantics = verifyPeriodSuccess206(ctx, before, after, response, prepared, transaction, sessionId, h);
  const value = response.body?.data ?? response.body, periodGet = await api.request('ProjectCostController_getPeriodClosingSnapshot', { id: value.periodEndSnapshotId }, null, 'manager');
  const snapshotGet = await api.request('ProjectCostController_getProjectOperatingSnapshot', { id: value.snapshotId }, null, 'manager');
  for (const get of [periodGet, snapshotGet]) readConserved206(ctx, get, h);
  const periodView = h.data(periodGet), snapshotView = h.data(snapshotGet), views = assertReadViews206(periodView, snapshotView, value, prepared);
  const rawNullCounts = [periodGet, snapshotGet].map(get => h.assertRawNullSchema47(api.operations.get(get.operationId).op.responses[String(api.success(get.operationId))].content['application/json'].schema, h.data(get), api.spec.components.schemas));
  const final = await h.capture(ctx, ctx.next('p206-period-targets')); h.assertRecorded(ctx, final);
  const rows = h.rowsTax13(ctx, final, h.readRows), projectIds = [PERIOD206.projectId, '51d60c76-6de2-432a-8714-10e3ed3234f3'];
  const allPeriodTargets = rows.raw('period_closing_snapshot').filter(r => projectIds.includes(JSON.parse(r.raw).project_id)).map(r => { const p = JSON.parse(r.raw); return { id: p.id, projectId: p.project_id, projectSnapshotId: p.project_snapshot_id, periodKey: p.period_key, status: p.status, rawSHA256: r.sha256, xmin: r.xmin }; });
  assert(allPeriodTargets.some(p => p.id === value.periodEndSnapshotId)); verifyRuntime206(ctx, plan, h);
  const proof = ctx.artifact(ctx.next('p206-period-complete') + '.json', { kind: 'actual-Source13-H1-real-period206-complete', prepared: state.prepared, fiComplete: state.fiComplete,
    verificationInput: approvedInput206(plan), normalSuccess: state.normalSuccess, runtimeIdentity: identity206(plan), transaction, semantics, views, rawNullCounts,
    periodGET: pinFile206(periodGet.receiptId), pairedSnapshotGET: pinFile206(snapshotGet.receiptId), allPeriodTargets, finalSnapshot: final.manifest,
    mustReprepareLabor47ScopeIncludingThesePeriods: true, laborPeriodMaskingCertified: false, historicalBaselineReselectionApproved: false, G3Certified: false, G4Certified: false });
  state.postconditions = 'verified'; state.complete = proof; ctx.persist();
  return { proof, periodId: value.periodEndSnapshotId, pairedSnapshotId: value.snapshotId, allPeriodTargetCount: allPeriodTargets.length,
    realPeriodAndPairedSnapshotGET: true, realtimeCurrentPreserved: true, laborPeriodMaskingCertified: false, G3Certified: false, G4Certified: false };
}
export async function commit206(ctx, api, plan, h) {
  const { state, prepared } = loadPrepared206(ctx, plan); assert(!state.pendingTrial && !state.normalPending && !state.normalSuccess, 'Never rePOST a committed or ambiguous period command');
  const inputPin = approvedInput206(plan, 'commit');
  verifyFI206(ctx, plan, state, prepared, h); assertCalendar206(await calendar206(ctx)); await api.login('manager'); await h.waitForActualPendingAuth(ctx, 'manager');
  await refreshFacts206(ctx, plan, prepared, h, 'p206-before-normal');
  state.normalPending = { bodySHA256: prepared.bodySHA256, inputPin, approvedFIComplete: plan.approvedFIComplete }; ctx.persist();
  const response = await api.request(PERIOD206.operation, {}, prepared.body, 'manager', { responseBirths: [
    { table: 'period_closing_snapshot', pointer: '/targetId' }, { table: 'project_operating_snapshot', pointer: '/snapshotId' }],
    mutableTables: ['project_operating_head'], updatedAnchors: [] });
  // Cache the actual success before business assertions or follow-up GETs.
  state.normalSuccess = ctx.artifact(ctx.next('p206-normal-success') + '.json', { kind: 'actual-Source13-H1-period206-normal-success-original', inputPin, prepared: state.prepared, fiComplete: state.fiComplete,
    attempt: { operationId: response.operationId, requestId: response.requestId, status: response.status, expectedStatus: response.expectedStatus, responseComplete: response.responseComplete,
      transportFailure: response.transportFailure, body: response.body, requestBodySha256: response.requestBodySha256, before: response.before, after: response.after, publicHTTP: pinFile206(response.receiptId) }, postconditions: 'pending' });
  delete state.normalPending; state.postconditions = 'pending'; ctx.persist();
  return verifyAndRead206(ctx, api, plan, state, prepared, h);
}
export async function readVerification206(ctx, api, plan, h) {
  const { state, prepared } = loadPrepared206(ctx, plan); assert(!state.pendingTrial && !state.normalPending && state.normalSuccess);
  approvedInput206(plan, 'read-verification');
  samePin206(state.normalSuccess, plan.approvedNormalSuccess); verifyFI206(ctx, plan, state, prepared, h); await api.login('manager');
  return verifyAndRead206(ctx, api, plan, state, prepared, h);
}
async function main206() {
  if (process.argv.includes('--help')) { console.log('External Root-only period206: --input <private.json> --approved-input-sha <SHA> --mode prepare|fi-only|commit|read-verification --execute. No template is executable.'); return; }
  assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.equal(fs.realpathSync(process.execPath), node206);
  assert.deepEqual(process.execArgv, []); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
  const a = process.argv.slice(2); assert.equal(a.length, 7); assert.equal(a[0], '--input'); assert.equal(a[2], '--approved-input-sha'); assert.equal(a[4], '--mode'); assert.equal(a[6], '--execute');
  const inputPin = { file: a[1], rawBytesSha256: a[3] }, plan = loadApprovedInput206(inputPin, a[5]);
  const self = fs.realpathSync(fileURLToPath(import.meta.url)), pure = fs.realpathSync(fileURLToPath(new URL('./facts206.mjs', import.meta.url)));
  assert.deepEqual(plan.executionTools.map(p => p.file).sort(), [self, pure].sort()); for (const pin of plan.executionTools) { inside206(ROOT + '/tools/rust-r4ghi', pin.file); readPin206(pin); }
  const nonce = randomUUID(), lock = PRIV + '/driver.lock'; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'period206-' + a[5], inputPin }) + '\n', { flag: 'wx', mode: 0o600 });
  let ctx;
  try {
    const h = await helpers206(); ctx = h.createContext({ epoch: PERIOD206.epoch, run: PERIOD206.run, 'api-process-record': plan.apiProcess.file });
    verifyRuntime206(ctx, plan, h); const api = h.createApi(ctx); const result = a[5] === 'prepare' ? await prepare206(ctx, api, plan, inputPin, h)
      : a[5] === 'fi-only' ? await fi206(ctx, api, plan, h) : a[5] === 'commit' ? await commit206(ctx, api, plan, h) : await readVerification206(ctx, api, plan, h);
    console.log(JSON.stringify(result));
  } catch (error) {
    let partial = null; if (ctx) { partial = ctx.artifact(ctx.next('p206-partial') + '.json', { name: error.name, message: error.message, stack: error.stack, inputPin, mode: a[5], noBlindRetry: true }); ctx.persist(); }
    console.error(JSON.stringify({ completed: false, partial, noBlindRetry: true, failureDetailsPublished: false })); process.exitCode = 1;
  } finally { const owned = JSON.parse(fs.readFileSync(lock)); assert.equal(owned.pid, process.pid); assert.equal(owned.nonce, nonce); fs.unlinkSync(lock); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main206().catch(() => { console.error('Driver206 input or ownership check rejected; no unreviewed effect is authorized.'); process.exitCode = 1; });
