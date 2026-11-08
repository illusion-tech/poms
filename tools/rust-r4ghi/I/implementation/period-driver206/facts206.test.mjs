// Synthetic FS/pure regression only. No DB, HTTP, API process or live state.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PERIOD206, sha206, assertPlanShape206, assertCalendar206, periodBody206, assertCurrentPreserved206, assertReadViews206, sourceUnit206 } from './facts206.mjs';
import { prepare206, fi206, commit206, readVerification206 } from './driver206.mjs';
const hash = 'a'.repeat(64), uuid = '11111111-1111-4111-8111-111111111111';
const calendar = { current_week: '2026-W46', prior_week: '2026-W45', prior_start: '2026-11-02', prior_end: '2026-11-08', today: '2026-11-09' };
const preparation = () => ({ kind: 'preparation-only', intent: 'period-close', projectId: PERIOD206.projectId, periodKey: PERIOD206.periodKey, businessCutoff: '2026-11-08',
  formalEligibility: { status: 'eligible', blockingReasonCodes: [] }, blockingReasonCodes: [], allowedCommandCodes: ['period-close'], headVersion: 4, projectVersion: 2,
  expectedInputHash: hash, selectedBaselinePackageRef: { kind: 'OperatingBaselinePackage', id: uuid, rowVersion: 1, payloadHash: hash },
  sourceRows: [{ rowKind: 'direct-cost', sourceRef: { kind: 'ProjectActualCostRecord', id: uuid }, blockingReasonCodes: [] }] });
test('real newly completed HK week is the only positive calendar case', () => {
  assertCalendar206(calendar);
  for (const change of [{today:'2026-11-08'},{today:'2026-11-16'},{current_week:'2026-W45'},{prior_week:'2026-W44'},{prior_end:'2026-11-07'}]) assert.throws(() => assertCalendar206({ ...calendar, ...change }));
});
test('period body copies server CAS/input/baseline refs and keeps cost decisions empty', () => {
  const p = preparation(), body = periodBody206(p, calendar);
  assert.equal(body.expectedVersion, p.headVersion); assert.equal(body.expectedProjectVersion, p.projectVersion); assert.equal(body.expectedInputHash, p.expectedInputHash);
  assert.deepEqual(body.baselinePackageRef, { kind: 'OperatingBaselinePackage', id: uuid, expectedVersion: 1, payloadHash: hash });
  assert.deepEqual(body.costDecisions, []); assert.equal(body.expectedPeriodSnapshotRef, null); assert.equal(body.inputVersion, 'server-derived-v1');
});
test('missing qualification, unclassified roots, future/missing roots cannot be trimmed to force a period case', () => {
  for (const mutate of [p => p.formalEligibility.status = 'missing-evidence', p => p.blockingReasonCodes.push('cost-classification-required'),
    p => p.formalEligibility.blockingReasonCodes.push('baseline-missing'), p => p.allowedCommandCodes = [], p => p.selectedBaselinePackageRef = null,
    p => p.sourceRows = [], p => p.sourceRows[0].rowKind = 'supporting-source', p => p.sourceRows[0].blockingReasonCodes.push('outside-business-cutoff'),
    p => p.expectedInputHash = 'not-a-hash', p => p.headVersion = 0, p => p.projectId = uuid, p => p.periodKey = '2026-W44']) {
    const p = preparation(); mutate(p); assert.throws(() => periodBody206(p, calendar));
  }
});
test('the unbound all-null template cannot authorize any effect mode', () => {
  const value = JSON.parse(fs.readFileSync(new URL('./input206.template.json', import.meta.url)));
  for (const mode of ['prepare','fi-only','commit','read-verification']) assert.throws(() => assertPlanShape206(value, mode));
});
test('each effect mode needs its exact prior original pins; flags and unknown fields cannot replace them', () => {
  const pin = name => ({file:'/private/' + name,rawBytesSha256:hash});
  const p = {kind:PERIOD206.kind,namespace:PERIOD206.namespace,epoch:PERIOD206.epoch,run:PERIOD206.run,phase:'synthetic-shape-only',actualInputsComplete:true,
    projectId:PERIOD206.projectId,periodKey:PERIOD206.periodKey,sourcePins:pin('source'),sourcePinsSHA256:PERIOD206.sourcePinsSHA256,
    helperH1:pin('H1'),helperSources:Array.from({length:196},(_,i)=>({file:'tools/rust-r4ghi/business/synthetic-'+i+'.mjs',sha256:hash})),
    apiProcess:pin('api'),binarySHA256:PERIOD206.binarySHA256,baseRegistry:pin('R3'),toolAdmission119:pin('119'),candidate:pin('B2'),taxCompletion:pin('tax'),
    executionTools:[pin('driver206.mjs'),pin('facts206.mjs')],approvedPrepared:null,approvedFIComplete:null,approvedNormalSuccess:null};
  assertPlanShape206(p,'prepare');
  assert.throws(()=>assertPlanShape206({...p,approved:true},'prepare'));
  assert.throws(()=>assertPlanShape206(p,'fi-only'));
  const fi={...p,approvedPrepared:pin('prepared')};assertPlanShape206(fi,'fi-only');assert.throws(()=>assertPlanShape206(fi,'commit'));
  const commit={...fi,approvedFIComplete:pin('fi')};assertPlanShape206(commit,'commit');assert.throws(()=>assertPlanShape206(commit,'read-verification'));
  assertPlanShape206({...commit,approvedNormalSuccess:pin('normal')},'read-verification');
  assert.throws(()=>assertPlanShape206({...commit,projectId:uuid},'commit'));
  assert.throws(()=>assertPlanShape206({...commit,binarySHA256:'b'.repeat(64)},'commit'));
});
const graph = () => ({ head: { key:[uuid],sha256:hash,xmin:'1' }, headValue:{ row_version:4,current_snapshot_id:'live',baseline_package_id:'base' },
  snapshot:{key:['live'],sha256:hash,xmin:'1'},baseline:{key:['base'],sha256:hash,xmin:'1'},currentBindings:[{key:['binding'],sha256:hash,xmin:'1'}],currentReviews:[{key:['review'],sha256:hash,xmin:'1'}] });
test('period history can advance only head version while real current and review rows stay exact', () => {
  const before = graph(), after = structuredClone(before); after.headValue.row_version++; after.head.sha256 = 'b'.repeat(64); after.head.xmin = '2';
  assertCurrentPreserved206(before, after);
  for (const mutate of [g => g.headValue.current_snapshot_id = 'period', g => g.headValue.baseline_package_id = 'other', g => g.headValue.row_version++,
    g => g.snapshot.xmin = '2', g => g.baseline.sha256 = 'b'.repeat(64), g => g.currentBindings[0].xmin = '2', g => g.currentReviews = []]) {
    const bad = structuredClone(after); mutate(bad); assert.throws(() => assertCurrentPreserved206(before, bad));
  }
});
test('actual period/snapshot reads must expose one persisted paired source and identical full financial groups', () => {
  const result = { periodEndSnapshotId:'period',snapshotId:'snapshot',sourceHash:hash,evaluationRefs:{signalEvaluationId:uuid} };
  const period = {id:'period',projectId:PERIOD206.projectId,periodKey:PERIOD206.periodKey,periodStart:calendar.prior_start,periodEnd:calendar.prior_end,businessTimezone:'Asia/Hong_Kong',originalFrozenUnchanged:true,latestRestatementRef:null,projectSnapshotRef:{id:'snapshot'},sourceHash:hash,sourceContextId:'context',sourcePayloadHash:hash,financialProjection:{mode:'full',value:{taxPending:{knowledge:'unknown',value:null}}},sourceRows:[]};
  const snapshot = {id:'snapshot',projectId:PERIOD206.projectId,snapshotMode:'period-end',periodEndSnapshotRef:{id:'period'},sourceWindowStart:calendar.prior_start,sourceWindowEnd:calendar.prior_end,sourceHash:hash,sourceContextId:'context',sourcePayloadHash:hash,financialProjection:structuredClone(period.financialProjection),sourceRows:[],evaluationRefs:result.evaluationRefs};
  assertReadViews206(period, snapshot, result, {calendar});
  for (const mutate of [s => s.snapshotMode = 'realtime', s => s.sourceHash = 'b'.repeat(64), s => s.periodEndSnapshotRef.id = 'other',
    s => s.financialProjection.mode = 'masked', s => s.financialProjection.value.taxPending.value = '0.00']) { const bad = structuredClone(snapshot); mutate(bad); assert.throws(() => assertReadViews206(period, bad, result, {calendar})); }
  const wrong = structuredClone(period); wrong.originalFrozenUnchanged = false; assert.throws(() => assertReadViews206(wrong, snapshot, result, {calendar}));
});
test('economic accumulation keys retain direct/share type identity', () => {
  assert.equal(sourceUnit206({kind:'ProjectActualCostRecord',id:uuid}), 'cost:' + uuid);
  assert.equal(sourceUnit206({kind:'SharedCostAllocationResult',id:uuid}), 'allocation:' + uuid);
  assert.throws(() => sourceUnit206({kind:'InvoiceRecord',id:uuid}));
});
function blockedFixture(t, change) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'poms-period206-test-'));
  t.after(() => { const resolved = path.resolve(directory), parent = path.resolve(os.tmpdir()); assert.equal(path.dirname(resolved), parent); assert(path.basename(resolved).startsWith('poms-period206-test-')); fs.rmSync(resolved,{recursive:true}); });
  const identityKeys = ['sourcePins','sourcePinsSHA256','helperH1','helperSources','apiProcess','binarySHA256','baseRegistry','toolAdmission119','candidate','taxCompletion','executionTools'];
  const plan = Object.fromEntries(identityKeys.map(k=>[k,null])); const body = { costDecisions:[] };
  const prepared = {kind:'actual-Source13-H1-period206-prepared-STOP',runtimeIdentity:structuredClone(plan),body,bodySHA256:sha206(JSON.stringify(body)),scope:{body,params:{},projectId:PERIOD206.projectId,actorKey:'manager',actorId:uuid}};
  const bytes = Buffer.from(JSON.stringify(prepared)), file = path.join(directory,'prepared.json'); fs.writeFileSync(file,bytes);
  plan.approvedPrepared = {file,rawBytesSha256:sha206(bytes)}; const state = {kind:'actual-Source13-H1-period-driver206-state',prepared:plan.approvedPrepared}; Object.assign(state,change);
  const ctx = {state:{periodDriver206:state,actors:{manager:{id:uuid}}}}; let calls=0; const api={login:()=>{calls++;throw Error('unexpected auth');},request:()=>{calls++;throw Error('unexpected HTTP');}};
  return {ctx,api,plan,calls:()=>calls};
}
test('a prior preparation cannot be overwritten by another prepare', async t => {
  const f=blockedFixture(t,{}); await assert.rejects(prepare206(f.ctx,f.api,f.plan,{},{})); assert.equal(f.calls(),0);
});
for (const change of [{normalSuccess:{file:'already-committed'}},{normalPending:{bodySHA256:hash}},{pendingTrial:{key:'uncertain'}}]) {
  test('committed/uncertain state blocks another normal POST: ' + Object.keys(change)[0], async t => { const f=blockedFixture(t,change); await assert.rejects(commit206(f.ctx,f.api,f.plan,{})); assert.equal(f.calls(),0); });
  test('committed/uncertain state blocks blind FI replay: ' + Object.keys(change)[0], async t => { const f=blockedFixture(t,change); await assert.rejects(fi206(f.ctx,f.api,f.plan,{})); assert.equal(f.calls(),0); });
}
test('unresolved normal outcome cannot enter read-verification as if committed', async t => { const f=blockedFixture(t,{normalPending:{bodySHA256:hash}}); await assert.rejects(readVerification206(f.ctx,f.api,f.plan,{})); assert.equal(f.calls(),0); });
