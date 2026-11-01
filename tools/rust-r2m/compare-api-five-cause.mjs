// Pure finite M3 source causes. No file/env/DB/HTTP/ownership operations.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {domainClockDigest as digest} from './comparison-api-domain-clock.mjs';
export const fiveCauseSourcePins=Object.freeze([
  {
    "file": "apps/poms-api/src/seeders/database.seeder.ts",
    "rawBytesSha256": "c2450781dab397c75c15f70a81bcc258967a18ee467df9befdcbe96b1ccd5fcd"
  },
  {
    "file": "apps/poms-api/src/app/features/contract/contract.entity.ts",
    "rawBytesSha256": "bbf371f538ad03a83df0f5e2d49663e416a1de79f334241a7075753c68ee71c6"
  },
  {
    "file": "apps/poms-api/src/migrations/Migration20260415152000_ex08b3c_snapshot_and_receipt_freeze.ts",
    "rawBytesSha256": "58c6c0f8369e8d8a83609cdd1e12ca2379f42bb08267a9ce6a1683f96e15cfbf"
  },
  {
    "file": "apps/poms-api/src/app/features/approval/approval.service.ts",
    "rawBytesSha256": "d64a8d8cefadc282a1a69933ad428e077e0eb2b3cc83853b81288136999a557d"
  },
  {
    "file": "apps/poms-api-rust/src/approval_common/service.rs",
    "rawBytesSha256": "edce898916a1459804fe27afaa7de6d74a1825e60a98bba11b24e2fda745c2a1"
  },
  {
    "file": "apps/poms-api-rust/src/approval/domain.rs",
    "rawBytesSha256": "8ff262a4abbb55587f60d61add1a3aa7ef17a862a901ec374d92fb570c037f5d"
  },
  {
    "file": "apps/poms-api/src/app/core/auth/auth-session.service.ts",
    "rawBytesSha256": "d7b3d4f9115a542244dd33b859ce9b08ece45c10908ce3a469c01919418dad89"
  },
  {
    "file": "apps/poms-api/src/app/core/auth/auth-session.repository.ts",
    "rawBytesSha256": "9757f1eedc9640875b4328a04f8129149f1c9191eefebae8f35ac7cb2a890622"
  },
  {
    "file": "apps/poms-api/src/app/core/auth/auth-session.entity.ts",
    "rawBytesSha256": "6de2371d28c70eb1b6ead0c2c105142622cfda846e13bb4a4eb123b76299e479"
  },
  {
    "file": "apps/poms-api/src/config/environment.schema.ts",
    "rawBytesSha256": "e525f24e01a2cebed59abdf0c6639978eed408eed7479ce1e3a4580429f71890"
  },
  {
    "file": "apps/poms-api-rust/src/auth/service.rs",
    "rawBytesSha256": "c4c73dae7e33a5f4299068327b9edcae1d8e9c6daeddda9a0e34da5e614dcf80"
  },
  {
    "file": "apps/poms-api-rust/src/auth/store.rs",
    "rawBytesSha256": "14ba9d8e7171e6a6fbd00fa68c25a283d53521e17921b5d0e2ac760fec1a3f40"
  },
  {
    "file": "tools/rust-r2m/query-pid-witness.cjs",
    "rawBytesSha256": "13ddb43c02bd49e8638741d3cdc70b2347ef27f8f71da99d66b7af848bd294f5"
  }
]);
const sha=x=>createHash('sha256').update(x).digest('hex'),same=(a,b)=>digest(a)===digest(b),one=(rows,test,label)=>{const found=rows.filter(test);assert.equal(found.length,1,label);return found[0];};
export function fiveCauseInstant(value){assert(typeof value==='string');const m=/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(Z|([+-])(\d\d):(\d\d))$/.exec(value);assert(m);const hours=Number(m[5]??0),minutes=Number(m[6]??0);assert(hours<=23&&minutes<=59);const ms=Date.parse(m[1]+m[3]),offset=(hours*60+minutes)*(m[4]==='-'?-1:1);assert(Number.isFinite(ms));assert.equal(new Date(ms+offset*60000).toISOString().slice(0,19),m[1]);return BigInt(ms)*1000n+BigInt((m[2]??'').padEnd(6,'0'));}
export const fiveRollbackDateSites=Object.freeze([
 {table:'approval_record',role:'approval',property:'closedAt',column:'closed_at',native:'approvalRecord.closedAt = new Date();',rust:'("closedAt", Value::Date(Some(Timestamp::now())))'},
 {table:'approval_record',role:'approval',property:'decidedAt',column:'decided_at',native:'approvalRecord.decidedAt = new Date();',rust:'("decidedAt", Value::Date(Some(Timestamp::now())))'},
 {table:'todo_item',role:'todoA',property:'completedAt',column:'completed_at',native:'todoItem.completedAt = new Date();',rust:'("completedAt", Value::Date(Some(Timestamp::now())))'},
 {table:'commission_payout',role:'payout',property:'approvedAt',column:'approved_at',native:'payout.approvedAt = new Date();',rust:'patch.insert("approvedAt".into(), now());'},
]);
export function createFiveCauseSourceProjection({sourceCap,sourceBytes}){assert(sourceBytes instanceof Map);const reads=[];for(const expected of fiveCauseSourcePins){const actual=one(sourceCap.files,p=>p.file===expected.file,'Exact actual M3 cause capsule source required'),raw=sourceBytes.get(expected.file);assert(actual.rawBytesSha256===expected.rawBytesSha256&&Buffer.isBuffer(raw)&&sha(raw)===expected.rawBytesSha256);reads.push({...expected});}const text=file=>sourceBytes.get(file).toString('utf8'),native=text('apps/poms-api/src/app/features/approval/approval.service.ts'),rustCommon=text('apps/poms-api-rust/src/approval_common/service.rs').replace(/\s+/g,' '),rustDomain=text('apps/poms-api-rust/src/approval/domain.rs').replace(/\s+/g,' ');for(const site of fiveRollbackDateSites){assert(native.includes(site.native),'Exact original Native Date emitter required');assert((site.table==='commission_payout'?rustDomain:rustCommon).includes(site.rust),'Exact original Rust Date emitter required');}const migration=text('apps/poms-api/src/migrations/Migration20260415152000_ex08b3c_snapshot_and_receipt_freeze.ts');for(const column of['effective_at','created_at'])assert(new RegExp('"'+column+'"\\s+timestamptz\\s+not null default now\\(\\)').test(migration));assert(text('apps/poms-api/src/app/features/contract/contract.entity.ts').includes("effectiveAt: p.datetime().defaultRaw('now()')"));return Object.freeze({kind:'M3-thirteen-exact-source-cause-projection',sourceCapId:sourceCap.id,sourceCap,reads,rollbackEmittersVerified:true,termDefaultPairVerified:true});}
function owned(journal,table,id){const object=one(journal.objects,o=>o.table===table&&o.id===id,'Original typed owned source row required');assert(object.creationProof&&object.postcondition?.independentlyVisible);return object;}
export function proveFiveTermDefaultBirth({sourceProjection,journal,plan,object,row,createdProjection}){assert(sourceProjection?.kind==='M3-thirteen-exact-source-cause-projection'&&sourceProjection.termDefaultPairVerified);assert(object.table==='contract_term_snapshot'&&same(owned(journal,object.table,object.id),object)&&row.id===object.id);assert(object.creationProof.kind==='direct-committed-insert'&&object.creationProof.beforeAbsent&&object.creationProof.commitAcknowledged&&!object.creationProof.recoveredByXminAndXactStatus);assert(plan?.kind==='commission-prepared-original-source-typed-rows'&&plan.rows.length===18);const entry=one(plan.rows,r=>r.table===object.table&&r.values.id===object.id,'One exact original commission18 term INSERT required');assert(entry.source.file==='apps/poms-api/src/seeders/database.seeder.ts'&&/^[0-9a-f]{64}$/.test(entry.source.rawSqlSha256));assert.deepEqual([...entry.source.columns].sort(),Object.keys(entry.values).sort());for(const column of['effective_at','created_at'])assert(!Object.hasOwn(entry.values,column)&&!entry.source.columns.includes(column),'Explicit prepared dates remain literal');const direct=one(journal.directCreates,d=>d.state==='promoted'&&d.beforeAbsent===true&&d.captured.some(r=>r.table===object.table&&r.id===object.id),'Original outer-COMMIT direct birth capture required'),captured=one(direct.captured,r=>r.table===object.table&&r.id===object.id,'Exact original physical birth required').row;assert(same(captured,row));assert.equal(fiveCauseInstant(row.effective_at),fiveCauseInstant(row.created_at),'Both omitted original DEFAULT now() columns must have the exact same microsecond instant');assert(createdProjection&&typeof createdProjection.$sourceClock==='string'&&createdProjection.$sourceClock.endsWith('.created_at')&&createdProjection.PGZone==='+08:00'&&createdProjection.maxPGPrecision===6,'Already-proved same-birth created_at origin required');const value={...structuredClone(createdProjection),$sourceClock:createdProjection.$sourceClock.slice(0,-'.created_at'.length)+'.effective_at',sourceDefault:'now()',coupledSameBirthColumn:'created_at'};return{value,proof:{kind:'M3-exact-prepared-term-two-defaults-same-birth',sourceCapId:sourceProjection.sourceCapId,table:object.table,id:object.id,physicalBirthSha256:digest(row),originalSqlSha256:entry.source.rawSqlSha256,exactMicroseconds:true,sourcePlanPreparedNotNativeGenerated:true,comparisonOnly:true,ownershipGranted:false}};}
const nullNode=value=>value&&value.kind==='null'&&(!Object.hasOwn(value,'value')||value.value===null),dateNode=value=>value&&value.kind==='date'&&typeof value.value==='string'&&/\.\d{3}Z$/.test(value.value);
export function proveFiveRollbackBusinessDate({sourceProjection,journal,world,table,id,property,node,slot}){const site=fiveRollbackDateSites.find(s=>s.table===table&&s.property===property.name&&s.column===property.column);if(!site)return null;assert(sourceProjection?.kind==='M3-thirteen-exact-source-cause-projection'&&sourceProjection.rollbackEmittersVerified);const captured=world.captured,o=captured.observation,context=captured.context;if(!/^m3\.uow\.v[12]$/.test(context.caseId))return null;assert(context.runId===journal.runId&&context.op==='m.internal-uow'&&Number.isSafeInteger(context.index));assert(['rollback','rollback-after-service-error'].includes(o.outerActualAction));const object=owned(journal,table,id);assert.equal(object.caseId,context.caseId);assert(typeof slot==='string'&&slot.length&&property.date&&property.udt==='timestamptz'&&dateNode(node));assert.deepEqual(o.stages.map(s=>s.name),['parent-loaded','parent-second-Todo-dirty','after-original-service-child','after-outer-action-held-bindings','after-cached-reread','after-clear-reread-with-held-bindings']);assert(captured.before.tables.length===107&&captured.after.tables.length===107);const physical=(t,target,phase)=>one(one(captured[phase].tables,r=>r.table===t,'Complete actual source table required').rows,r=>r.id===target,'One actual typed source row required'),before=physical(table,id,'before'),after=physical(table,id,'after');assert(same(before,after)&&before[site.column]===null,'Actual outer rollback must preserve every original physical source field');const first=o.stages[0].held[site.role];assert(first?.table===table&&first.id===id);for(const stage of o.stages.slice(0,2)){const held=stage.held[site.role];assert(held?.id===id&&held.table===table&&nullNode(held.properties[site.property]),'No child Date may be projected as an original/caller literal');}const approval=o.stages[0].held.approval,payout=o.stages[0].held.payout,todo=o.stages[0].held.todoA;assert(approval&&payout&&todo&&todo.id!==o.stages[0].held.todoB.id);const a=physical('approval_record',approval.id,'before'),p=physical('commission_payout',payout.id,'before'),t=physical('todo_item',todo.id,'before');assert(a.target_object_id===p.id&&a.project_id===p.project_id&&t.project_id===a.project_id&&t.source_type==='approval-record'&&t.source_id===a.id);const child=o.stages[2].held[site.role];assert(child?.id===id&&child.table===table&&dateNode(child.properties[site.property]));const actual=child.properties[site.property].value,n=fiveCauseInstant(actual);assert(n>=fiveCauseInstant(o.stages[1].at)&&n<=fiveCauseInstant(o.stages[2].at),'Date must come from the actual first child interval');assert.equal(fiveCauseInstant(node.value),n,'A later held/original/cached occurrence must equal this exact typed first child Date');return{value:{$sourceClock:slot+'.'+site.column,sourcePhase:'child',sourceBusinessEmitter:site.property},proof:{kind:'M3-rollback-held-Date-from-original-business-emitter',sourceCapId:sourceProjection.sourceCapId,context:{...context},table,id,column:site.column,firstStage:'after-original-service-child',physicalBeforeAndAfterNull:true,physicalWholeRowUnchanged:true,actualFirstDateSha256:digest(actual),committedMutatedRowInvented:false,comparisonOnly:true,ownershipGranted:false}};}
