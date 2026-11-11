import {preImport270,verifySource15Runtime270} from './runtime270.mjs';
// External Root-only driver. It is never part of business/H0/H1 enumeration.
// Importing is pure; actual operations require a private hash-approved input.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { PERIOD270, sha270, samePin270, assertPlanShape270, assertCalendar270, periodBody270, snapshotPeriodProbeBody270, currentGraph270, verifyPeriodSuccess270, assertReadViews270, sourceUnit270 } from './facts270.mjs';

const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const PRIVATE = '/home/wangzishi/.local/share/poms-r4ghi/private';
const PRIV = PRIVATE + '/business/g2-business15/main01';
const node270 = '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node';
const approvedInputs270 = new WeakMap();
function inside270(root, file) { const rel = path.relative(fs.realpathSync(root), fs.realpathSync(file)); assert(rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel)); }
export function readPin270(pin) {
  assert(pin && path.isAbsolute(pin.file) && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256));
  const s = fs.lstatSync(pin.file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1); assert.equal(fs.realpathSync(pin.file), path.resolve(pin.file));
  const bytes = fs.readFileSync(pin.file); assert.equal(sha270(bytes), pin.rawBytesSha256); return bytes;
}
const json270 = pin => JSON.parse(readPin270(pin));
const pinFile270 = file => ({ file, rawBytesSha256: sha270(fs.readFileSync(file)) });
const identity270 = p => Object.fromEntries(['sourcePins','sourcePinsSHA256','sourceCount','helperPins','helperSources','helperCount','apiProcess','binarySHA256','binaryFiles','codeAdmission15','candidate','taxRuntimeBindings','taxCompletion','taxExecution118Sidecar','tax118ConsumerRegistration','executionTools'].map(k=>[k,p[k]]));
export function loadApprovedInput270(inputPin, mode) {
  inside270(PRIV, inputPin.file); const plan = assertPlanShape270(json270(inputPin), mode);
  approvedInputs270.set(plan, { pin: Object.freeze({ ...inputPin }), mode }); return plan;
}
function approvedInput270(plan, mode = null) {
  const actual = approvedInputs270.get(plan); assert(actual, 'Only the exact hash-approved private input can run; no template or hand-built plan');
  if (mode) assert.equal(actual.mode, mode); assert.deepEqual(json270(actual.pin), plan, 'Approved input object or bytes changed'); return actual.pin;
}
async function helpers270() {
  const names = ['context','http','pure','snapshot','ledger','consumer-admission54','source15-admission','tax13-provenance','period-historical-facts273','gh-write-facts','required-write-inventory','fault-sweep','tax13-facts','tax13-semantics','shared-cash-proof58','labor-mask15'];
  const modules = await Promise.all(names.map(name => import(pathToFileURL(ROOT + '/tools/rust-r4ghi/business/' + name + '.mjs').href)));
  return Object.assign({}, ...modules);
}
async function verifyRuntime270(ctx,plan,h){approvedInput270(plan);assert(!ctx.state.activeFault&&!ctx.state.blockedObservation&&!ctx.state.cleaned&&!ctx.state.cleanupPlan&&!ctx.state.processRestart1351);return (await verifySource15Runtime270(ctx,plan,h,approvedInput270(plan))).registry;}

async function calendar270(ctx) {
  return ctx.db(async c => (await c.query(`SELECT
    to_char(clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong','YYYY-MM-DD') today,
    to_char(clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong','IYYY-"W"IW') current_week,
    to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')-interval '1 week','IYYY-"W"IW') prior_week,
    to_char(date_trunc('week',clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')-interval '1 week','YYYY-MM-DD') prior_start,
    to_char(date_trunc('week',clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')-interval '1 day','YYYY-MM-DD') prior_end`)).rows[0]);
}
function actualPreparedScope270(ctx, before, scope, preparation, calendar, h) {
  assert.deepEqual(periodBody270(preparation, calendar), scope.body); assert.deepEqual(scope.body.costDecisions, []);
  const rows = h.rowsTax13(ctx, before, h.readRows), graph = currentGraph270(rows);
  assert.equal(graph.headValue.row_version, scope.body.expectedVersion);assert.equal(scope.body.baselinePackageRef,null);
  assert(!rows.values('period_closing_snapshot').some(p => p.project_id === PERIOD270.projectId && p.period_key === PERIOD270.periodKey), 'This is a first real period capture; never replace a prior root');
  const ghFacts = h.deriveGHWriteFacts(ctx, before, PERIOD270.operation, scope, h.readRows);
  assert.equal(ghFacts.periodHistorical273.selectionHash,preparation.periodBaselineSelection.selectionHash);assert.equal(ghFacts.snapshotMode, 'period-end'); assert.equal(ghFacts.captureCount, 1); assert.deepEqual(ghFacts.decisionInserts, []); assert.deepEqual(ghFacts.costUpdates, []);
  assert.deepEqual(ghFacts.oldBindingIds, []); assert.deepEqual(ghFacts.oldGateReviewIds, []);
  const expectedCostScope = h.expectedCostScopeTax13(preparation, rows);
  assert.deepEqual([...ghFacts.costUnits].sort(), expectedCostScope.units.map(u => sourceUnit270({ kind: u.kind, id: u.id })).sort());
  return { ghFacts, expectedCostScope, currentGraph: graph };
}
const snapshotProbeOperation270='ProjectCostController_createProjectOperatingSnapshot';
function actualSnapshotProbe270(ctx,before,probe,calendar,h) {
 assert.deepEqual(snapshotPeriodProbeBody270(probe.preparation,calendar),probe.body);assert.equal(probe.bodySHA256,sha270(JSON.stringify(probe.body)));assert.deepEqual(probe.scope.body,probe.body);
 const facts=h.deriveGHWriteFacts(ctx,before,snapshotProbeOperation270,probe.scope,h.readRows),inventory=h.requiredWriteInventory(snapshotProbeOperation270,{...probe.scope,ghFacts:facts});
 assert.deepEqual(facts.costUpdates,[]);assert.deepEqual(facts.decisionInserts,[]);assert.equal(facts.snapshotMode,'period-end');assert.equal(facts.periodHistorical273.selectionHash,probe.preparation.periodBaselineSelection.selectionHash);
 const selected=inventory.filter(d=>d.key==='required-success-audit');assert.equal(selected.length,1);assert.equal(selected[0].match.operationId,snapshotProbeOperation270);
 return{facts,inventory,selected:selected[0]};
}
function loadPrepared270(ctx, plan) {
  const state = ctx.state.periodDriver270; assert.equal(state?.kind, 'actual-Source15-schema5-period-driver270-state');
  samePin270(state.prepared, plan.approvedPrepared); const prepared = json270(plan.approvedPrepared);
  assert.equal(prepared.kind, 'actual-Source15-schema5-period270-prepared-STOP'); assert.deepEqual(prepared.runtimeIdentity, identity270(plan));
  assert.equal(prepared.bodySHA256, sha270(JSON.stringify(prepared.body))); assert.deepEqual(prepared.scope.body, prepared.body);
  assert.deepEqual(prepared.scope.params, {}); assert.equal(prepared.scope.projectId, PERIOD270.projectId); assert.equal(prepared.scope.actorKey, 'manager');
  assert.equal(prepared.scope.actorId, ctx.state.actors.manager.id); assert.deepEqual(prepared.body.costDecisions, []);
  assert(prepared.genericSnapshotProbe&&prepared.genericSnapshotProbe.normalPOSTForbidden===true);assert.equal(prepared.genericSnapshotProbe.operationId,snapshotProbeOperation270);
  return { state, prepared };
}
async function refreshFacts270(ctx, plan, prepared, h, label) {
  await verifyRuntime270(ctx, plan, h); const current = await h.capture(ctx, ctx.next(label)); h.assertRecorded(ctx, current);
  const actual = actualPreparedScope270(ctx, current, prepared.scope, prepared.preparation, prepared.calendar, h);
  assert.deepEqual(actual.ghFacts, prepared.scope.ghFacts); assert.deepEqual(actual.expectedCostScope, prepared.expectedCostScope); assert.deepEqual(actual.currentGraph, prepared.currentGraph);
  assert.deepEqual(h.requiredWriteInventory(PERIOD270.operation, prepared.scope), prepared.inventory);
  const probe=actualSnapshotProbe270(ctx,current,prepared.genericSnapshotProbe,prepared.calendar,h);assert.deepEqual(probe.facts,prepared.genericSnapshotProbe.scope.ghFacts);assert.deepEqual(probe.inventory,prepared.genericSnapshotProbe.inventory);assert.deepEqual(probe.selected,prepared.genericSnapshotProbe.selectedAudit);
  ctx.persist(); return current;
}
export async function prepare270(ctx, api, plan, inputPin, h) {
  assert(!ctx.state.periodDriver270, 'Preserve prior prepared/partial/effect history; no replacement preparation');
  samePin270(approvedInput270(plan, 'prepare'), inputPin);
  await verifyRuntime270(ctx, plan, h); const calendar = await calendar270(ctx); await api.login('manager'); await verifyRuntime270(ctx, plan, h);
  const response = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: PERIOD270.projectId }, null, 'manager',
    { query: { view: 'preparation', intent: 'period-close', periodKey: PERIOD270.periodKey } });
  const genericResponse=await api.request('ProjectCostController_getProjectUnifiedAccounting',{projectId:PERIOD270.projectId},null,'manager',{query:{view:'preparation',intent:'snapshot-create',snapshotMode:'period-end',periodKey:PERIOD270.periodKey}});
  const preparation = h.data(response).preparation, body = periodBody270(preparation, calendar), before = await h.capture(ctx, ctx.next('p270-prepared-source'));
  h.assertRecorded(ctx, before); const periodPreparation = pinFile270(response.receiptId); inside270(ctx.out, periodPreparation.file);
  const scope = { projectId: PERIOD270.projectId, actorId: ctx.state.actors.manager.id, actorKey: 'manager', params: {}, body, periodPreparation };
  const actual = actualPreparedScope270(ctx, before, scope, preparation, calendar, h); scope.ghFacts = actual.ghFacts;
  const inventory = h.requiredWriteInventory(PERIOD270.operation, scope), bodySHA256 = sha270(JSON.stringify(body));
  const genericPreparation=h.data(genericResponse).preparation,genericBody=snapshotPeriodProbeBody270(genericPreparation,calendar),genericHTTP=pinFile270(genericResponse.receiptId);inside270(ctx.out,genericHTTP.file);
  const genericSnapshotProbe={operationId:snapshotProbeOperation270,preparation:genericPreparation,body:genericBody,bodySHA256:sha270(JSON.stringify(genericBody)),scope:{projectId:PERIOD270.projectId,actorId:scope.actorId,actorKey:'manager',params:{},body:genericBody,periodPreparation:genericHTTP},normalPOSTForbidden:true};
  const genericFacts=actualSnapshotProbe270(ctx,before,genericSnapshotProbe,calendar,h);genericSnapshotProbe.scope.ghFacts=genericFacts.facts;genericSnapshotProbe.inventory=genericFacts.inventory;genericSnapshotProbe.selectedAudit=genericFacts.selected;
  assert.deepEqual(genericFacts.facts.costUnits,actual.ghFacts.costUnits);assert.deepEqual(genericPreparation.periodBaselineSelection,preparation.periodBaselineSelection);
  const prepared = { kind: 'actual-Source15-schema5-period270-prepared-STOP', inputPin, runtimeIdentity: identity270(plan), calendar, preparation,
    periodPreparation, body, bodySHA256, scope, inventory, genericSnapshotProbe, before: before.manifest, expectedCostScope: actual.expectedCostScope, currentGraph: actual.currentGraph,
    domainPOSTExecuted: false, RootInventoryReviewRequired: true, firstHistoricalSelectionApprovedBy272:true,existingPeriodBaselineReselectionApproved:false, G3Certified: false, G4Certified: false };
  const artifact = ctx.artifact(ctx.next('p270-prepared-STOP') + '.json', prepared);
  ctx.state.periodDriver270 = { kind: 'actual-Source15-schema5-period-driver270-state', prepared: artifact, failures: [], fiComplete: null, normalSuccess: null };
  ctx.persist(); return { prepared: artifact, mandatoryFamilies: inventory.length, genericSnapshotAuditProbeRequired:true, STOP: true, domainPOSTExecuted: false, G3Certified: false };
}
function verifiedFailure270(failure, selected, bodySHA256, ctx, actorId, h, operationId=PERIOD270.operation) {
  const proof = json270(failure.observation); assert.deepEqual(proof.descriptor, selected); assert.equal(proof.bodySHA256, bodySHA256);
  assert.equal(proof.failed.fault.hitCount, 1); assert.equal(proof.failed.fault.fallbackHitCount, 0);
  const receipt = json270(proof.failed.receipt); assert.equal(receipt.operationId,operationId);assert.equal(proof.failed.fault.operationId,operationId);assert.equal(receipt.method,'POST'); assert.equal(receipt.status, 500); assert.equal(receipt.responseComplete, true); assert.equal(receipt.transportFailure, false);
  assert.equal(sha270(readPin270(receipt.originals.requestBody)), bodySHA256);
  h.assertSweepRollback(ctx, h.loadSnapshot(ctx, proof.failed.before), h.loadSnapshot(ctx, proof.failed.after), proof.failed.fault, actorId);
  assert.equal(proof.rollback.allBusinessAuditSecurityRowsAndXminUnchanged, true); return proof;
}
export async function fi270(ctx, api, plan, h) {
  const { state, prepared } = loadPrepared270(ctx, plan); assert(!state.pendingTrial && !state.normalPending && !state.normalSuccess && !state.fiComplete, 'No blind effect replay or ambiguous retry');
  const inputPin = approvedInput270(plan, 'fi-only');
  assertCalendar270(await calendar270(ctx)); await api.login('manager'); await refreshFacts270(ctx, plan, prepared, h, 'p270-fi-preflight');
  const probe=prepared.genericSnapshotProbe;
  if(state.genericSnapshotAuditRollback)verifiedFailure270(state.genericSnapshotAuditRollback,probe.selectedAudit,probe.bodySHA256,ctx,prepared.scope.actorId,h,snapshotProbeOperation270);
  else{
    state.pendingTrial={key:'generic-snapshot-required-audit',bodySHA256:probe.bodySHA256,inputPin};ctx.persist();
    const failed=await api.request(snapshotProbeOperation270,{},probe.body,'manager',{expectedStatus:500,fi:{kind:PERIOD270.faultKind,key:probe.selectedAudit.key,operationId:snapshotProbeOperation270,scope:probe.scope,selected:probe.selectedAudit}});
    assert.equal(failed.status,500);assert.equal(failed.responseComplete,true);assert.equal(failed.transportFailure,false);assert.equal(failed.requestBodySha256,probe.bodySHA256);assert.equal(failed.fault.hitCount,1);assert.equal(failed.fault.fallbackHitCount,0);
    const rollback=h.assertSweepRollback(ctx,h.loadSnapshot(ctx,failed.before),h.loadSnapshot(ctx,failed.after),failed.fault,prepared.scope.actorId),observation=ctx.artifact(ctx.next('p270-generic-snapshot-audit-rollback')+'.json',{descriptor:probe.selectedAudit,bodySHA256:probe.bodySHA256,runtimeIdentity:identity270(plan),failed:{receipt:pinFile270(failed.receiptId),before:failed.before,after:failed.after,fault:failed.fault},rollback});
    state.genericSnapshotAuditRollback={key:probe.selectedAudit.key,observation};delete state.pendingTrial;ctx.persist();
  }
  await refreshFacts270(ctx,plan,prepared,h,'p270-after-generic-rollback');
  for (const selected of prepared.inventory) {
    const prior = state.failures.find(f => f.key === selected.key); if (prior) { verifiedFailure270(prior, selected, prepared.bodySHA256, ctx, prepared.scope.actorId, h); continue; }
    if (selected.match.kind === 'auth-coflush') await h.waitForActualPendingAuth(ctx, 'manager');
    await verifyRuntime270(ctx, plan, h); state.pendingTrial = { key: selected.key, bodySHA256: prepared.bodySHA256, inputPin }; ctx.persist();
    const failed = await api.request(PERIOD270.operation, {}, prepared.body, 'manager', { expectedStatus: 500,
      fi: { kind: PERIOD270.faultKind, key: selected.key, operationId: PERIOD270.operation, scope: prepared.scope, selected } });
    assert.equal(failed.status, 500); assert.equal(failed.responseComplete, true); assert.equal(failed.transportFailure, false);
    assert.equal(failed.requestBodySha256, prepared.bodySHA256); assert.equal(failed.fault.hitCount, 1); assert.equal(failed.fault.fallbackHitCount, 0);
    const rollback = h.assertSweepRollback(ctx, h.loadSnapshot(ctx, failed.before), h.loadSnapshot(ctx, failed.after), failed.fault, prepared.scope.actorId);
    const observation = ctx.artifact(ctx.next('p270-required-failure') + '.json', { descriptor: selected, bodySHA256: prepared.bodySHA256, runtimeIdentity: identity270(plan),
      failed: { receipt: pinFile270(failed.receiptId), before: failed.before, after: failed.after, fault: failed.fault }, rollback });
    state.failures.push({ key: selected.key, observation }); delete state.pendingTrial; ctx.persist();
  }
  assert.deepEqual(state.failures.map(f => f.key).sort(), prepared.inventory.map(d => d.key).sort());
  state.fiComplete = ctx.artifact(ctx.next('p270-fi-complete-STOP') + '.json', { kind: 'actual-Source15-schema5-period270-FI-complete-STOP', inputPin, prepared: state.prepared,
    bodySHA256: prepared.bodySHA256, inventory: prepared.inventory, failures: state.failures, genericSnapshotAuditRollback:state.genericSnapshotAuditRollback, runtimeIdentity: identity270(plan), normalPeriodPOSTExecuted: false, G3Certified: false });
  ctx.persist(); return { fiComplete: state.fiComplete, mandatoryFamilies: prepared.inventory.length, normalPeriodPOSTExecuted: false, STOP: true, G3Certified: false };
}
function verifyFI270(ctx, plan, state, prepared, h) {
  samePin270(state.fiComplete, plan.approvedFIComplete); const fi = json270(plan.approvedFIComplete);
  assert.equal(fi.kind, 'actual-Source15-schema5-period270-FI-complete-STOP'); samePin270(fi.prepared, state.prepared); assert.equal(fi.bodySHA256, prepared.bodySHA256);
  assert(state.genericSnapshotAuditRollback);assert.deepEqual(fi.genericSnapshotAuditRollback,state.genericSnapshotAuditRollback);verifiedFailure270(state.genericSnapshotAuditRollback,prepared.genericSnapshotProbe.selectedAudit,prepared.genericSnapshotProbe.bodySHA256,ctx,prepared.scope.actorId,h,snapshotProbeOperation270);
  assert.deepEqual(fi.runtimeIdentity, identity270(plan)); assert.deepEqual(fi.inventory, prepared.inventory); assert.deepEqual(fi.failures, state.failures); assert.equal(fi.normalPeriodPOSTExecuted, false);
  assert.deepEqual(state.failures.map(f => f.key).sort(), prepared.inventory.map(d => d.key).sort());
  for (const selected of prepared.inventory) verifiedFailure270(state.failures.find(f => f.key === selected.key), selected, prepared.bodySHA256, ctx, prepared.scope.actorId, h);
}
function originalSession270(ctx, before, attempt, scope, h) {
  const pub = json270(attempt.publicHTTP); assert.equal(pub.operationId, PERIOD270.operation); assert.equal(pub.status, 201); assert.equal(pub.responseComplete, true); assert.equal(pub.transportFailure, false); assert.equal(pub.requestId, attempt.requestId);
  assert.equal(sha270(readPin270(pub.originals.requestBody)), sha270(JSON.stringify(scope.body)));
  assert.deepEqual(json270(pub.originals.responseBody), attempt.body);
  const config = json270(pub.originals.requestConfig); samePin270(config.before, attempt.before);
  const cookies = config.headers.Cookie.split(';').map(x => x.trim()).filter(x => x.startsWith('poms_session=')); assert.equal(cookies.length, 1);
  const token = sha270(decodeURIComponent(cookies[0].slice('poms_session='.length))), rows = h.readRows(before.databases[ctx.database].tables.auth_session);
  const matches = rows.filter(r => { const v = JSON.parse(r.raw); return v.token_hash === token && v.user_id === scope.actorId && v.status === 'active'; }); assert.equal(matches.length, 1);
  assert(ctx.state.owned[h.keyOf(ctx.database, 'auth_session', matches[0].key)]); return matches[0].key[0];
}
function readConserved270(ctx, response, h) {
  const before = h.loadSnapshot(ctx, response.before), after = h.loadSnapshot(ctx, response.after);
  for (const db of ctx.databases) { assert.deepEqual(before.databases[db].meta, after.databases[db].meta); assert.deepEqual(before.objects[db], after.objects[db]); }
  assert(h.difference(before, after).every(d => ['auth_session','audit_log','security_event'].includes(d.table)), 'A read changed a domain fact');
}
async function verifyAndRead270(ctx, api, plan, state, prepared, h) {
  assert(state.normalSuccess && !state.normalPending); const cached = json270(state.normalSuccess), response = cached.attempt;
  samePin270(cached.prepared, state.prepared); samePin270(cached.fiComplete, state.fiComplete); assert.equal(response.requestBodySha256, prepared.bodySHA256);
  const before = h.loadSnapshot(ctx, response.before), after = h.loadSnapshot(ctx, response.after), sessionId = originalSession270(ctx, before, response, prepared.scope, h);
  const transaction = h.verifyFinalWrites(ctx, before, after, response, prepared.inventory, sessionId);
  const semantics = verifyPeriodSuccess270(ctx, before, after, response, prepared, transaction, sessionId, h);
  const value = response.body?.data ?? response.body, periodGet = await api.request('ProjectCostController_getPeriodClosingSnapshot', { id: value.periodEndSnapshotId }, null, 'manager');
  const snapshotGet = await api.request('ProjectCostController_getProjectOperatingSnapshot', { id: value.snapshotId }, null, 'manager');
  for (const get of [periodGet, snapshotGet]) readConserved270(ctx, get, h);
  const periodView = h.data(periodGet), snapshotView = h.data(snapshotGet), views = assertReadViews270(periodView, snapshotView, value, prepared);
  const rawNullCounts = [periodGet, snapshotGet].map(get => h.assertRawNullSchema47(api.operations.get(get.operationId).op.responses[String(api.success(get.operationId))].content['application/json'].schema, h.data(get), api.spec.components.schemas));
  const final = await h.capture(ctx, ctx.next('p270-period-targets')); h.assertRecorded(ctx, final);
  const rows = h.rowsTax13(ctx, final, h.readRows), projectIds = [PERIOD270.projectId, '51d60c76-6de2-432a-8714-10e3ed3234f3'];
  const allPeriodTargets = rows.raw('period_closing_snapshot').filter(r => projectIds.includes(JSON.parse(r.raw).project_id)).map(r => { const p = JSON.parse(r.raw); return { id: p.id, projectId: p.project_id, projectSnapshotId: p.project_snapshot_id, periodKey: p.period_key, status: p.status, rawSHA256: r.sha256, xmin: r.xmin }; });
  assert(allPeriodTargets.some(p => p.id === value.periodEndSnapshotId)); await verifyRuntime270(ctx, plan, h);
  const proof = ctx.artifact(ctx.next('p270-period-complete') + '.json', { kind: 'actual-Source15-schema5-real-period270-complete', prepared: state.prepared, fiComplete: state.fiComplete,
    verificationInput: approvedInput270(plan), normalSuccess: state.normalSuccess, runtimeIdentity: identity270(plan), transaction, semantics, views, rawNullCounts,
    periodGET: pinFile270(periodGet.receiptId), pairedSnapshotGET: pinFile270(snapshotGet.receiptId), allPeriodTargets, finalSnapshot: final.manifest,
    mustReprepareLabor47ScopeIncludingThesePeriods: true, laborPeriodMaskingCertified: false, firstHistoricalSelectionApprovedBy272:true,existingPeriodBaselineReselectionApproved:false, G3Certified: false, G4Certified: false });
  state.postconditions = 'verified'; state.complete = proof; ctx.persist();
  return { proof, periodId: value.periodEndSnapshotId, pairedSnapshotId: value.snapshotId, allPeriodTargetCount: allPeriodTargets.length,
    realPeriodAndPairedSnapshotGET: true, realtimeCurrentPreserved: true, laborPeriodMaskingCertified: false, G3Certified: false, G4Certified: false };
}
export async function commit270(ctx, api, plan, h) {
  const { state, prepared } = loadPrepared270(ctx, plan); assert(!state.pendingTrial && !state.normalPending && !state.normalSuccess, 'Never rePOST a committed or ambiguous period command');
  const inputPin = approvedInput270(plan, 'commit');
  verifyFI270(ctx, plan, state, prepared, h); assertCalendar270(await calendar270(ctx)); await api.login('manager'); await h.waitForActualPendingAuth(ctx, 'manager');
  await refreshFacts270(ctx, plan, prepared, h, 'p270-before-normal');
  state.normalPending = { bodySHA256: prepared.bodySHA256, inputPin, approvedFIComplete: plan.approvedFIComplete }; ctx.persist();
  const response = await api.request(PERIOD270.operation, {}, prepared.body, 'manager', { responseBirths: [
    { table: 'period_closing_snapshot', pointer: '/targetId' }, { table: 'project_operating_snapshot', pointer: '/snapshotId' }],
    mutableTables: ['project_operating_head'], updatedAnchors: [] });
  // Cache the actual success before business assertions or follow-up GETs.
  state.normalSuccess = ctx.artifact(ctx.next('p270-normal-success') + '.json', { kind: 'actual-Source15-schema5-period270-normal-success-original', inputPin, prepared: state.prepared, fiComplete: state.fiComplete,
    attempt: { operationId: response.operationId, requestId: response.requestId, status: response.status, expectedStatus: response.expectedStatus, responseComplete: response.responseComplete,
      transportFailure: response.transportFailure, body: response.body, requestBodySha256: response.requestBodySha256, before: response.before, after: response.after, publicHTTP: pinFile270(response.receiptId) }, postconditions: 'pending' });
  delete state.normalPending; state.postconditions = 'pending'; ctx.persist();
  return verifyAndRead270(ctx, api, plan, state, prepared, h);
}
export async function readVerification270(ctx, api, plan, h) {
  const { state, prepared } = loadPrepared270(ctx, plan); assert(!state.pendingTrial && !state.normalPending && state.normalSuccess);
  approvedInput270(plan, 'read-verification');
  samePin270(state.normalSuccess, plan.approvedNormalSuccess); verifyFI270(ctx, plan, state, prepared, h); await api.login('manager');
  return verifyAndRead270(ctx, api, plan, state, prepared, h);
}
async function main270() {
  if (process.argv.includes('--help')) { console.log('External Root-only period270: --input <private.json> --approved-input-sha <SHA> --mode prepare|fi-only|commit|read-verification --execute. No template is executable.'); return; }
  assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.equal(fs.realpathSync(process.execPath), node270);
  assert.deepEqual(process.execArgv, []); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
  const a = process.argv.slice(2); assert.equal(a.length, 7); assert.equal(a[0], '--input'); assert.equal(a[2], '--approved-input-sha'); assert.equal(a[4], '--mode'); assert.equal(a[6], '--execute');
  const inputPin = { file: a[1], rawBytesSha256: a[3] }, plan = loadApprovedInput270(inputPin, a[5]);
  const self = fs.realpathSync(fileURLToPath(import.meta.url)), pure = fs.realpathSync(fileURLToPath(new URL('./facts270.mjs', import.meta.url))), runtime = fs.realpathSync(fileURLToPath(new URL('./runtime270.mjs', import.meta.url))), sharedRuntime=fs.realpathSync(fileURLToPath(new URL('../tax15-readonly/runtime15.mjs',import.meta.url))), sharedFacts=fs.realpathSync(fileURLToPath(new URL('../tax15-readonly/facts15.mjs',import.meta.url)));
  assert.deepEqual(plan.executionTools.map(p => p.file).sort(), [self, pure, runtime, sharedRuntime, sharedFacts].sort()); for (const pin of plan.executionTools) { inside270(ROOT + '/tools/rust-r4ghi', pin.file); readPin270(pin); }
  const nonce = randomUUID(), lock = PRIV + '/driver.lock'; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'period270-' + a[5], inputPin }) + '\n', { flag: 'wx', mode: 0o600 });
  let ctx;
  try {
    preImport270(plan); const h = await helpers270(); ctx = h.createContext({ epoch: PERIOD270.epoch, run: PERIOD270.run, 'api-process-record': plan.apiProcess.file });
    await verifyRuntime270(ctx, plan, h); const api = h.createApi(ctx); const result = a[5] === 'prepare' ? await prepare270(ctx, api, plan, inputPin, h)
      : a[5] === 'fi-only' ? await fi270(ctx, api, plan, h) : a[5] === 'commit' ? await commit270(ctx, api, plan, h) : await readVerification270(ctx, api, plan, h);
    console.log(JSON.stringify(result));
  } catch (error) {
    let partial = null; if (ctx) { partial = ctx.artifact(ctx.next('p270-partial') + '.json', { name: error.name, message: error.message, stack: error.stack, inputPin, mode: a[5], noBlindRetry: true }); ctx.persist(); }
    console.error(JSON.stringify({ completed: false, partial, noBlindRetry: true, failureDetailsPublished: false })); process.exitCode = 1;
  } finally { const owned = JSON.parse(fs.readFileSync(lock)); assert.equal(owned.pid, process.pid); assert.equal(owned.nonce, nonce); fs.unlinkSync(lock); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main270().catch(() => { console.error('Driver270 input or ownership check rejected; no unreviewed effect is authorized.'); process.exitCode = 1; });
