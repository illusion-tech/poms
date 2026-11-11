import {canonicalSources270,consumeCallerTax270,verifySource15Runtime270} from '../runtime270.mjs';
// Synthetic FS/pure regression only. No DB, HTTP, API process or live state.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PERIOD270, sha270, assertPlanShape270, assertCalendar270, periodBody270, snapshotPeriodProbeBody270, assertCurrentPreserved270, assertReadViews270, sourceUnit270 } from '../facts270.mjs';
import { prepare270, fi270, commit270, readVerification270 } from '../driver270.mjs';
const hash = 'a'.repeat(64), uuid = '11111111-1111-4111-8111-111111111111';
const calendar = { current_week: '2026-W46', prior_week: '2026-W45', prior_start: '2026-11-02', prior_end: '2026-11-08', today: '2026-11-09' };
const preparation = () => ({ kind: 'preparation-only', intent: 'period-close', projectId: PERIOD270.projectId, periodKey: PERIOD270.periodKey, businessCutoff: '2026-11-08',
  formalEligibility: { status: 'eligible', blockingReasonCodes: [] }, blockingReasonCodes: [], allowedCommandCodes: ['period-close'], headVersion: 4, projectVersion: 2,
  expectedInputHash: hash, selectedBaselinePackageRef:null,periodBaselineSelection:{policyVersion:'historical-adoption-chain272-v1',publicationMode:'new-period-package',periodKey:'2026-W45',businessCutoff:'2026-11-08',selectionHash:hash,originalAdoptedCostRef:{kind:'ProjectTechnicalCostPackage',id:uuid,rowVersion:1,payloadHash:hash},selectedAdoptedCostRef:{kind:'ProjectTechnicalCostPackage',id:uuid,rowVersion:1,payloadHash:hash},handoverBasisRef:null,handoverRebaselineRef:null,adoptionSourceRefs:[{kind:'ProjectTechnicalCostPackage',id:uuid,rowVersion:1,payloadHash:hash}],technicalLineageRefs:[{kind:'ProjectTechnicalCostPackage',id:uuid,rowVersion:1,payloadHash:hash}]},
  sourceRows: [{ rowKind: 'direct-cost', sourceRef: { kind: 'ProjectActualCostRecord', id: uuid }, blockingReasonCodes: [] }] });
test('real newly completed HK week is the only positive calendar case', () => {
  assertCalendar270(calendar);
  for (const change of [{today:'2026-11-08'},{today:'2026-11-16'},{current_week:'2026-W45'},{prior_week:'2026-W44'},{prior_end:'2026-11-07'}]) assert.throws(() => assertCalendar270({ ...calendar, ...change }));
});
test('period body copies server CAS/input/baseline refs and keeps cost decisions empty', () => {
  const p = preparation(), body = periodBody270(p, calendar);
  assert.equal(body.expectedVersion, p.headVersion); assert.equal(body.expectedProjectVersion, p.projectVersion); assert.equal(body.expectedInputHash, p.expectedInputHash);
  assert(Object.hasOwn(body,'baselinePackageRef'));assert.equal(body.baselinePackageRef,null);
  assert.deepEqual(body.costDecisions, []); assert.equal(body.expectedPeriodSnapshotRef, null); assert.equal(body.inputVersion, 'server-derived-v1');
});
test('generic PeriodEnd probe keeps its own actual intent/hash and exact distinct DTO',()=>{const p=preparation();p.intent='snapshot-create';p.allowedCommandCodes=['snapshot-create'];p.expectedInputHash='b'.repeat(64);const before=structuredClone(p),body=snapshotPeriodProbeBody270(p,calendar);assert.deepEqual(p,before);assert.equal(body.expectedInputHash,p.expectedInputHash);assert.equal(body.snapshotMode,'period-end');assert.equal(body.baselinePackageRef,null);assert(!Object.hasOwn(body,'expectedPeriodSnapshotRef'));assert.deepEqual(Object.keys(body).sort(),['inputVersion','projectId','expectedVersion','expectedProjectVersion','expectedInputHash','assertions','baselinePackageRef','snapshotMode','periodKey','costDecisions'].sort());assert.throws(()=>periodBody270(p,calendar));assert.throws(()=>snapshotPeriodProbeBody270(preparation(),calendar));const noPermission=structuredClone(p);noPermission.allowedCommandCodes=['period-close'];assert.throws(()=>snapshotPeriodProbeBody270(noPermission,calendar));});
test('generic audit probe is fail-only before the dedicated full FI and normal POST remains unique',()=>{const source=fs.readFileSync(new URL('../driver270.mjs',import.meta.url),'utf8'),fi=source.slice(source.indexOf('export async function fi270('),source.indexOf('function verifyFI270('));assert(fi.includes('api.request(snapshotProbeOperation270,{},probe.body'));assert(fi.includes('expectedStatus:500'));assert(fi.indexOf('genericSnapshotAuditRollback')<fi.indexOf('for (const selected of prepared.inventory)'));assert(fi.includes("await refreshFacts270(ctx,plan,prepared,h,'p270-after-generic-rollback')"));const commit=source.slice(source.indexOf('export async function commit270('),source.indexOf('export async function readVerification270('));assert(!commit.includes('snapshotProbeOperation270'));assert(commit.includes('api.request(PERIOD270.operation'));assert(commit.indexOf('state.normalSuccess =')<commit.indexOf('return verifyAndRead270'));});
test('missing qualification, unclassified roots, future/missing roots cannot be trimmed to force a period case', () => {
  for (const mutate of [p => p.formalEligibility.status = 'missing-evidence', p => p.blockingReasonCodes.push('cost-classification-required'),
    p => p.formalEligibility.blockingReasonCodes.push('baseline-missing'), p => p.allowedCommandCodes = [], p => delete p.periodBaselineSelection,
    p => p.sourceRows = [], p => p.sourceRows[0].rowKind = 'supporting-source', p => p.sourceRows[0].blockingReasonCodes.push('outside-business-cutoff'),
    p => p.expectedInputHash = 'not-a-hash', p => p.headVersion = 0, p => p.projectId = uuid, p => p.periodKey = '2026-W44']) {
    const p = preparation(); mutate(p); assert.throws(() => periodBody270(p, calendar));
  }
});
test('the unbound all-null template cannot authorize any effect mode', () => {
  const value = JSON.parse(fs.readFileSync(new URL('../input270.template.json', import.meta.url)));
  for (const mode of ['prepare','fi-only','commit','read-verification']) assert.throws(() => assertPlanShape270(value, mode));
});
test('each effect mode needs its exact prior original pins; flags and unknown fields cannot replace them', () => {
  const pin = name => ({file:'/private/' + name,rawBytesSha256:hash});
  const p = {kind:PERIOD270.kind,namespace:PERIOD270.namespace,epoch:PERIOD270.epoch,run:PERIOD270.run,phase:'synthetic-shape-only',actualInputsComplete:true,
    projectId:PERIOD270.projectId,periodKey:PERIOD270.periodKey,sourcePins:pin('source'),sourcePinsSHA256:hash,sourceCount:1,
    helperPins:pin('H2'),helperCount:196,helperSources:Array.from({length:196},(_,i)=>({file:'tools/rust-r4ghi/business/synthetic-'+i+'.mjs',sha256:hash})),
    apiProcess:pin('api'),binarySHA256:hash,binaryFiles:[{...pin('api-bin'),dev:'1',ino:'2',nlink:1},{...pin('common-bin'),dev:'1',ino:'3',nlink:1}],codeAdmission15:pin('Reg5'),taxRuntimeBindings:pin('Tax15-binding'),candidate:pin('B1_15'),taxCompletion:pin('tax'),taxExecution118Sidecar:pin('sidecar15'),tax118ConsumerRegistration:pin('period-registration15'),
    executionTools:[pin('driver270.mjs'),pin('facts270.mjs'),pin('runtime270.mjs'),pin('shared-runtime270.mjs'),pin('shared-facts270.mjs')],approvedPrepared:null,approvedFIComplete:null,approvedNormalSuccess:null};
  assertPlanShape270(p,'prepare');
  assert.throws(()=>assertPlanShape270({...p,approved:true},'prepare'));
  assert.throws(()=>assertPlanShape270(p,'fi-only'));
  const fi={...p,approvedPrepared:pin('prepared')};assertPlanShape270(fi,'fi-only');assert.throws(()=>assertPlanShape270(fi,'commit'));
  const commit={...fi,approvedFIComplete:pin('fi')};assertPlanShape270(commit,'commit');assert.throws(()=>assertPlanShape270(commit,'read-verification'));
  assertPlanShape270({...commit,approvedNormalSuccess:pin('normal')},'read-verification');
  assert.throws(()=>assertPlanShape270({...commit,projectId:uuid},'commit'));
  assert.throws(()=>assertPlanShape270({...commit,binarySHA256:'unbound'},'commit'));
});
const graph = () => ({ head: { key:[uuid],sha256:hash,xmin:'1' }, headValue:{ row_version:4,current_snapshot_id:'live',baseline_package_id:'base' },
  snapshot:{key:['live'],sha256:hash,xmin:'1'},baseline:{key:['base'],sha256:hash,xmin:'1'},currentBindings:[{key:['binding'],sha256:hash,xmin:'1'}],currentReviews:[{key:['review'],sha256:hash,xmin:'1'}] });
test('period history can advance only head version while real current and review rows stay exact', () => {
  const before = graph(), after = structuredClone(before); after.headValue.row_version++; after.head.sha256 = 'b'.repeat(64); after.head.xmin = '2';
  assertCurrentPreserved270(before, after);
  for (const mutate of [g => g.headValue.current_snapshot_id = 'period', g => g.headValue.baseline_package_id = 'other', g => g.headValue.row_version++,
    g => g.snapshot.xmin = '2', g => g.baseline.sha256 = 'b'.repeat(64), g => g.currentBindings[0].xmin = '2', g => g.currentReviews = []]) {
    const bad = structuredClone(after); mutate(bad); assert.throws(() => assertCurrentPreserved270(before, bad));
  }
});
test('actual period/snapshot reads must expose one persisted paired source and identical full financial groups', () => {
  const result = { periodEndSnapshotId:'period',snapshotId:'snapshot',sourceHash:hash,evaluationRefs:{signalEvaluationId:uuid} };
  const period = {id:'period',projectId:PERIOD270.projectId,periodKey:PERIOD270.periodKey,periodStart:calendar.prior_start,periodEnd:calendar.prior_end,businessTimezone:'Asia/Hong_Kong',originalFrozenUnchanged:true,latestRestatementRef:null,projectSnapshotRef:{id:'snapshot'},sourceHash:hash,sourceContextId:'context',sourcePayloadHash:hash,financialProjection:{mode:'full',value:{taxPending:{knowledge:'unknown',value:null}}},sourceRows:[]};
  const snapshot = {id:'snapshot',projectId:PERIOD270.projectId,snapshotMode:'period-end',periodEndSnapshotRef:{id:'period'},sourceWindowStart:null,sourceWindowEnd:calendar.prior_end,sourceHash:hash,sourceContextId:'context',sourcePayloadHash:hash,financialProjection:structuredClone(period.financialProjection),sourceRows:[],evaluationRefs:result.evaluationRefs};
  assertReadViews270(period, snapshot, result, {calendar});
  for (const mutate of [s => s.snapshotMode = 'realtime', s => s.sourceWindowStart = calendar.prior_start, s => s.sourceHash = 'b'.repeat(64), s => s.periodEndSnapshotRef.id = 'other',
    s => s.financialProjection.mode = 'masked', s => s.financialProjection.value.taxPending.value = '0.00']) { const bad = structuredClone(snapshot); mutate(bad); assert.throws(() => assertReadViews270(period, bad, result, {calendar})); }
  const wrong = structuredClone(period); wrong.originalFrozenUnchanged = false; assert.throws(() => assertReadViews270(wrong, snapshot, result, {calendar}));
});
test('economic accumulation keys retain direct/share type identity', () => {
  assert.equal(sourceUnit270({kind:'ProjectActualCostRecord',id:uuid}), 'cost:' + uuid);
  assert.equal(sourceUnit270({kind:'SharedCostAllocationResult',id:uuid}), 'allocation:' + uuid);
  assert.throws(() => sourceUnit270({kind:'InvoiceRecord',id:uuid}));
});
function blockedFixture(t, change) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'poms-period270-test-'));
  t.after(() => { const resolved = path.resolve(directory), parent = path.resolve(os.tmpdir()); assert.equal(path.dirname(resolved), parent); assert(path.basename(resolved).startsWith('poms-period270-test-')); fs.rmSync(resolved,{recursive:true}); });
  const identityKeys = ['sourcePins','sourcePinsSHA256','sourceCount','helperPins','helperSources','helperCount','apiProcess','binarySHA256','binaryFiles','codeAdmission15','candidate','taxRuntimeBindings','taxCompletion','taxExecution118Sidecar','tax118ConsumerRegistration','executionTools'];
  const plan = Object.fromEntries(identityKeys.map(k=>[k,null])); const body = { costDecisions:[] };
  const prepared = {kind:'actual-Source15-schema5-period270-prepared-STOP',runtimeIdentity:structuredClone(plan),body,bodySHA256:sha270(JSON.stringify(body)),scope:{body,params:{},projectId:PERIOD270.projectId,actorKey:'manager',actorId:uuid}};
  const bytes = Buffer.from(JSON.stringify(prepared)), file = path.join(directory,'prepared.json'); fs.writeFileSync(file,bytes);
  plan.approvedPrepared = {file,rawBytesSha256:sha270(bytes)}; const state = {kind:'actual-Source15-schema5-period-driver270-state',prepared:plan.approvedPrepared}; Object.assign(state,change);
  const ctx = {state:{periodDriver270:state,actors:{manager:{id:uuid}}}}; let calls=0; const api={login:()=>{calls++;throw Error('unexpected auth');},request:()=>{calls++;throw Error('unexpected HTTP');}};
  return {ctx,api,plan,calls:()=>calls};
}
test('a prior preparation cannot be overwritten by another prepare', async t => {
  const f=blockedFixture(t,{}); await assert.rejects(prepare270(f.ctx,f.api,f.plan,{},{})); assert.equal(f.calls(),0);
});
for (const change of [{normalSuccess:{file:'already-committed'}},{normalPending:{bodySHA256:hash}},{pendingTrial:{key:'uncertain'}}]) {
  test('committed/uncertain state blocks another normal POST: ' + Object.keys(change)[0], async t => { const f=blockedFixture(t,change); await assert.rejects(commit270(f.ctx,f.api,f.plan,{})); assert.equal(f.calls(),0); });
  test('committed/uncertain state blocks blind FI replay: ' + Object.keys(change)[0], async t => { const f=blockedFixture(t,change); await assert.rejects(fi270(f.ctx,f.api,f.plan,{})); assert.equal(f.calls(),0); });
}
test('unresolved normal outcome cannot enter read-verification as if committed', async t => { const f=blockedFixture(t,{normalPending:{bodySHA256:hash}}); await assert.rejects(readVerification270(f.ctx,f.api,f.plan,{})); assert.equal(f.calls(),0); });


test('new runtime rejects14 before native callbacks; Role/H46 cannot impersonate period or mixed',async()=>{let calls=0;const h={currentCodeRegistry15(){calls++;throw Error('not reached');}};await assert.rejects(verifySource15Runtime270({namespace:'poms-r4ghi',epoch:'g2-business14'}, {}, h,{}));assert.equal(calls,0);for(const consumerId of['h15-287','role15-setup','shared15-284','period270'])await assert.rejects(consumeCallerTax270({}, {consumerId,consumerInput:{},registration:{}}));});
test('complete source identity rejects duplicates, dot segments, copies and Windows aliases',()=>{const file='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/period15-270/driver270.mjs',p={file,rawBytesSha256:hash};assert.deepEqual(canonicalSources270([p]),[p]);for(const xs of[[p,p],[{...p,file:'/private/copied.mjs'}],[{...p,file:file.replace('period15-270/','period15-270/../period15-270/')}],[{...p,file:'E:/copy.mjs'}]])assert.throws(()=>canonicalSources270(xs));});
test('both actual first-period paths, Receiver/W45 and current/H invariants remain; no extra normal period',()=>{const source=fs.readFileSync(new URL('../driver270.mjs',import.meta.url),'utf8'),facts=fs.readFileSync(new URL('../facts270.mjs',import.meta.url),'utf8');assert(source.includes('genericSnapshotProbe'));assert(source.includes('normalPOSTForbidden:true'));assert(source.indexOf('state.normalSuccess = ctx.artifact')<source.indexOf('delete state.normalPending'));assert(facts.includes("projectId: '4d9e57ad-4890-4f53-80da-c6d224ce576b'"));assert(facts.includes("periodKey: '2026-W45'"));assert(facts.includes('baselinePackageRef:null'));assert(facts.includes('expectedPeriodSnapshotRef:null'));assert(source.includes('mustReprepareLabor47ScopeIncludingThesePeriods: true'));assert(source.includes("'labor-mask15'"));assert(!source.includes("'labor-mask47'"));});
