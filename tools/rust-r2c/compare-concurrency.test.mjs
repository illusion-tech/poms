import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import {setImmediate as turn} from 'node:timers/promises';
import { concurrencyCases, queryKind, sanitizeActivity, assertWaitProof, assertCaseProofs, validateConcurrencyAmbient, readOrgSnapshots } from './http-concurrency-protocol.mjs';
import { compareConcurrencyReports } from './compare-concurrency.mjs';
import { sourceHead } from './fixture-guard.mjs';
const require=createRequire(import.meta.url);
const {describeSql}=require('./witness-query-core.cjs');

const sql={org:'UPDATE poms.org_unit SET name=$1,row_version=row_version+1 WHERE id=$2 AND row_version=$3 RETURNING row_version',
    raw:"UPDATE poms.auth_session SET last_ip=coalesce($1,last_ip),idle_expires_at=least($2,absolute_expires_at),row_version=row_version+1 WHERE id=$3 AND status='active' AND last_seen_at <= $4 RETURNING last_seen_at,row_version,updated_at",
    managed:'UPDATE poms.auth_session SET row_version=row_version+1 WHERE id=$1 AND row_version=$2 RETURNING row_version',lock:'SELECT id FROM poms.auth_session WHERE id=$1 FOR UPDATE'};
const queryByKind={'org-cas-update':sql.org,'raw-session-touch':sql.raw,'managed-session-cas':sql.managed,'coordinator-session-lock':sql.lock};
test('ambient guard leaves only the exact private-file selector for separate managed-path validation',()=>{
    const env={PATH:'synthetic',POMS_ENV_FILE:'/r2c-private/nest.env'};assert.doesNotThrow(()=>validateConcurrencyAmbient(env));
    for(const key of ['PGHOST','DATABASE_URL','DB_PASSWORD','MIKRO_ORM_USER','NODE_OPTIONS','poms_env_file'])assert.throws(()=>validateConcurrencyAmbient({...env,[key]:'forbidden'}));
});
test('same-run organization snapshot reader is exclusive and preserves slot order',async()=>{
    let active=0,maximum=0;const calls=[],completed=[];
    const actual=await readOrgSnapshots(['root','child','leaf'],async(slot)=>{
        assert.equal(active,0,'An exclusive fixture reader cannot overlap another invocation');
        active++;maximum=Math.max(maximum,active);calls.push(slot);
        try{await turn();completed.push(slot);return {org:{slot},memberships:[],children:[]};}finally{active--;}
    });
    assert.equal(maximum,1);assert.equal(active,0);assert.deepEqual(calls,['root','child','leaf']);assert.deepEqual(completed,calls);
    assert.deepEqual(Object.keys(actual),calls);assert.equal(actual.child.org.slot,'child');
});
test('failed organization snapshot finishes its reader and starts no later or orphaned call',async()=>{
    let active=0;const calls=[],completed=[],failure=Error('synthetic exclusive-reader failure');
    await assert.rejects(()=>readOrgSnapshots(['root','child','leaf'],async(slot)=>{
        assert.equal(active,0);active++;calls.push(slot);
        try{await turn();if(slot==='child')throw failure;return {org:{slot}};}finally{active--;completed.push(slot);}
    }),error=>error===failure);
    assert.equal(active,0);assert.deepEqual(calls,['root','child']);assert.deepEqual(completed,calls);
    await turn();assert.equal(active,0);assert.deepEqual(calls,['root','child']);
});
function activity(pid,blockers,kind){return sanitizeActivity({pid,blockers,state:'active',wait_event_type:'Lock',wait_event:'transactionid',query:queryByKind[kind]});}
function proof(stage,roots,pids,kind){return{stage,roots,waiterPids:pids,expectedCount:pids.length,expectedKind:kind,rows:pids.map((pid)=>activity(pid,[roots[0]],kind))};}

test('real raw touch cannot masquerade as managed CAS; relation/predicate phase stays explicit',()=>{
    assert.equal(queryKind(sql.raw),'raw-session-touch');assert.equal(queryKind(sql.managed),'managed-session-cas');assert.equal(queryKind(sql.org),'org-cas-update');
    assert.equal(queryKind(sql.managed.replace('AND row_version=$2','AND status=$2')),'other');
});
test('lock proof requires active Lock state, actual dependency path, exact phase and count',()=>{
    const value=proof('target-update-held',[1],[9],'org-cas-update');assert(assertWaitProof(value));
    for(const mutate of [(row)=>row.rows[0].blockers=[],(row)=>row.rows[0].state='idle',(row)=>row.rows[0].waitEventType='Client',(row)=>row.expectedCount=2,(row)=>row.rows[0].query=describeSql(sql.raw)]){
        const changed=structuredClone(value);mutate(changed);assert.throws(()=>assertWaitProof(changed));
    }
    const uncovered=proof('both-target-updates-held',[1,2],[9,10],'org-cas-update');assert.throws(()=>assertWaitProof(uncovered));
});
test('queued handoff accepts real transitive dependency and rejects cycle without owner',()=>{
    const value=proof('handoff-queued',[1],[2],'coordinator-session-lock');value.rows[0].blockers=[9];value.rows.push(activity(9,[1],'raw-session-touch'));assert(assertWaitProof(value));
    value.rows[1].blockers=[2];assert.throws(()=>assertWaitProof(value));
});
test('handoff evidence requires raw-held, queued coordinator, acquired lock and managed-held order',()=>{
    const value={id:'late-managed-session-cas',handoffAcquired:true,proofs:[proof('raw-touch-held',[1],[9],'raw-session-touch'),proof('handoff-queued',[1],[2],'coordinator-session-lock'),proof('managed-cas-held',[2],[9],'managed-session-cas')]};
    assert(assertCaseProofs(value));
    value.proofs[2].rows[0].query=describeSql(sql.raw);assert.throws(()=>assertCaseProofs(value));
});

// These synthetic reports exercise the comparer only. Their explicit fields,
// lock graphs and mutations are not backend execution evidence.
function synthetic(backend){
    const runId=randomUUID(),admin=randomUUID(),sessionIds=[randomUUID(),randomUUID()];
    const slots=[...new Set(concurrencyCases.flatMap((spec)=>spec.slots))];
    const ids=Object.fromEntries(slots.map((slot)=>[slot,randomUUID()]));
    const start='2026-10-27T00:00:00.000Z',created='2026-10-27T00:00:00.010Z';
    const rows=Object.fromEntries(slots.map((slot)=>[slot,{id:ids[slot],name:`R2C ${slot} ${runId.slice(0,8)}`,code:`r2c_${runId.replaceAll('-','')}_${slot}`,description:null,parent_id:slot.startsWith('cascade-')&&slot!=='cascade-root'?ids['cascade-root']:null,is_active:true,display_order:0,row_version:1,created_at:created,created_by:null,updated_at:created,updated_by:null}]));
    const sessions=sessionIds.map((id)=>({id,rowVersion:1,status:'active',lastSeenAt:start,idleExpiresAt:'2026-10-27T00:15:00.000Z',absoluteExpiresAt:'2026-10-27T08:00:00.000Z',updatedAt:start,revokedAt:null,revokedReason:null}));
    const body=(row)=>({id:row.id,name:row.name,code:row.code,description:row.description,parentId:row.parent_id,isActive:row.is_active,displayOrder:row.display_order,createdAt:row.created_at,updatedAt:row.updated_at});
    const audit=(target,eventType,afterSnapshot,time=created)=>({id:randomUUID(),eventType,targetType:'OrgUnit',targetId:target,operatorId:admin,requestId:null,result:'success',reason:null,beforeSnapshot:null,afterSnapshot,metadata:null,occurredAt:time});
    const setup=slots.map((slot)=>({slot,response:{status:201,body:body(rows[slot]),setCookieCount:0},orgSnapshot:{org:structuredClone(rows[slot]),memberships:[],children:[]}}));
    for(const slot of ['cascade-d','cascade-e']){rows[slot].is_active=false;rows[slot].row_version++;}
    const audits=setup.map((entry)=>audit(entry.response.body.id,'platform.org-unit.created',{},created));
    const snapshots=(spec)=>Object.fromEntries(spec.slots.map((slot)=>[slot,{org:structuredClone(rows[slot]),memberships:[],children:[]} ]));
    const cases=[];
    for(const spec of concurrencyCases){
        const millis=Date.parse(start)+cases.length*1000;
        const changed=new Date(millis+101).toISOString(),expiry=new Date(millis+900101).toISOString();
        const count=spec.kind==='pair'?2:1;
        for(let index=0;index<count;index++){sessions[index].rowVersion++;sessions[index].updatedAt=new Date(millis+90).toISOString();sessions[index].lastSeenAt=new Date(millis+90-(spec.kind.startsWith('handoff')?61000:0)).toISOString();}
        const before=Array.from({length:count},(_,index)=>({session:structuredClone(sessions[index]),audits:structuredClone(audits),securityEvents:[]}));
        const row={id:spec.id,due:spec.kind.startsWith('handoff'),startedAt:new Date(millis+100).toISOString(),finishedAt:new Date(millis+200).toISOString(),before,orgBefore:snapshots(spec),requests:[],responses:[],proofs:[],heldRows:[],releaseOrder:[],mutations:[],auditDelta:spec.auditDelta,sessionVersionDeltas:spec.sessionDeltas};
        if(spec.kind==='pair'){
            const key=spec.id.startsWith('code')?'code':'name',next=`shared-${key}-${runId}`;
            row.requests=spec.slots.map((slot,index)=>({client:index,method:'PATCH',route:`/api/platform/org-units/${ids[slot]}`,json:{[key]:next}}));
            row.heldRows=spec.slots.map((slot)=>({table:'org_unit',id:ids[slot],slot}));
            row.proofs=[proof('both-target-updates-held',[1,2],[9,10],'org-cas-update')];row.proofs[0].rows[1].blockers=[2];
            row.releaseOrder=['target-a','request-a-completed','target-b'];rows[spec.slots[0]][key]=next;rows[spec.slots[0]].row_version++;rows[spec.slots[0]].updated_at=changed;
            row.responses=[{status:200,body:body(rows[spec.slots[0]]),setCookieCount:0},{status:500,body:{statusCode:500,message:'Internal server error'},setCookieCount:0}];
            audits.push(audit(ids[spec.slots[0]],'platform.org-unit.updated',{[key]:next},changed));
        }else{
            const id=ids[spec.slots[0]];
            row.requests=[{client:0,method:'PATCH',route:`/api/platform/org-units/${id}`,json:{description:'must fail'}}];
            row.responses=[{status:500,body:{statusCode:500,message:'Internal server error'},setCookieCount:0}];
            if(spec.kind==='org'){
                row.heldRows=[{table:'org_unit',id}];row.proofs=[proof('target-update-held',[1],[9],'org-cas-update')];
                const previous=structuredClone(rows['org-cas']);rows['org-cas'].row_version++;
                row.mutations=[{table:'org_unit',id,before:previous,after:structuredClone(rows['org-cas'])}];
            }else{
                row.heldRows=[{table:'auth_session',id:sessionIds[0]},{table:'auth_session',id:sessionIds[0]}];
                row.handoffAcquired=true;row.proofs=[proof('raw-touch-held',[1],[9],'raw-session-touch'),proof('handoff-queued',[1],[2],'coordinator-session-lock'),proof('managed-cas-held',[2],[9],'managed-session-cas')];
                sessions[0].rowVersion++;sessions[0].lastSeenAt=changed;sessions[0].idleExpiresAt=expiry;sessions[0].updatedAt=changed;
                if(spec.kind==='handoff-org'){
                    const previous=structuredClone(rows['cascade-b']);rows['cascade-b'].row_version++;
                    row.mutations=[{table:'org_unit',id:ids['cascade-b'],before:previous,after:structuredClone(rows['cascade-b'])}];
                }else{
                    const previous={id:sessionIds[0],row_version:sessions[0].rowVersion,updated_at:changed};sessions[0].rowVersion++;
                    row.mutations=[{table:'auth_session',id:sessionIds[0],before:previous,after:{...previous,row_version:previous.row_version+1}}];
                }
            }
        }
        const at=(offset)=>new Date(millis+offset).toISOString();
        row.proofs.forEach((item,index)=>item.at=at(100+index*20));
        row.timings=spec.kind==='pair'?{releaseAStartedAt:at(110),releaseACompletedAt:at(120),requestACompletedAt:at(130),releaseBStartedAt:at(140),releaseBCompletedAt:at(150)}:spec.kind==='org'?{mutationCompletedAt:at(110),releaseAStartedAt:at(120),releaseACompletedAt:at(130)}:{releaseAStartedAt:at(125),releaseACompletedAt:at(135),handoffAcquiredAt:at(130),mutationCompletedAt:at(150),releaseBStartedAt:at(160),releaseBCompletedAt:at(170)};
        row.after=Array.from({length:count},(_,index)=>({session:structuredClone(sessions[index]),audits:structuredClone(audits),securityEvents:[]}));row.orgAfter=snapshots(spec);cases.push(row);
    }
    const sourceNames=['http-concurrency.mjs','http-concurrency-protocol.mjs','compare-concurrency.mjs','fixture-guard.mjs','fixture-run.mjs','fixture-journal.mjs','fixture-core.mjs','fixture-cli.mjs','fixture-protocol.cjs','fixture-orgs.mjs','org-fixture-spec.cjs','http-client.mjs','invoke-fixture.cjs','managed-environment.cjs','fixture-snapshot.mjs'];
    const sourceFiles=sourceNames.map((name)=>({file:`tools/rust-r2c/${name}`,normalizedLfSha256:'a'.repeat(64)}));
    const pid=backend==='nest'?100:200;
    const value={backend,origin:`http://127.0.0.1:${backend==='nest'?5300:5301}`,pid,binarySha256:'b'.repeat(64),sourceHead,aliveBefore:true,processIdentity:{pid,startTicks:'123456'},sourceFiles:[{file:'apps/poms-api-rust/src/main.rs',sha256:'f'.repeat(64)}]};
    const run={formatVersion:1,result:'observed',backend,platform:'linux',sourceHead,runId,sourceFiles,startedAt:start,setup,cases,identities:{admin,orgs:ids,sessions:Object.fromEntries(sessionIds.map((id,index)=>[index,id]))},coordinatorPids:{a:1,b:2,observer:3},serverReceipt:{sha256:'c'.repeat(64),value},cleanupCompleted:true,cleanup:{state:'cleaned'},zeroResidual:{matched:0,changed:0}};
    const closeout={...value,result:'pass',sourceUnchanged:true,aliveAfter:true,stopped:true,serverReceiptSha256:'c'.repeat(64),processIdentityAfter:structuredClone(value.processIdentity),binarySha256After:value.binarySha256,sourceFilesAfter:structuredClone(value.sourceFiles)};
    return {run,closeout};
}
function pair(){const nest=synthetic('nest'),rust=synthetic('rust');return{nest:nest.run,rust:rust.run,options:{ownerCloseouts:{nest:nest.closeout,rust:rust.closeout}}};}
test('independent synthetic IDs normalize only after complete facts and owner/lock checks',()=>{const p=pair();assert.equal(compareConcurrencyReports(p.nest,p.rust,p.options).result,'pass');});
test('missing cases, unproven barriers and stale server owner are invalid evidence',()=>{
    for(const mutate of [(p)=>p.rust.cases.pop(),(p)=>p.rust.cases[4].proofs[2].rows[0].query=describeSql(sql.raw),(p)=>p.options.ownerCloseouts.rust.pid++,(p)=>p.rust.sourceHead='7'.repeat(40),(p)=>p.rust.cases[0].before.reverse()]){const p=pair();mutate(p);assert.throws(()=>compareConcurrencyReports(p.nest,p.rust,p.options));}
});
test('full response fields, immutable history and absolute version offsets cannot disappear',()=>{
    for(const mutate of [(p)=>p.rust.cases[0].responses[0].body.unexpected=true,(p)=>p.rust.cases[0].after[0].audits[0].metadata={lost:true},(p)=>{for(const row of p.rust.cases)for(const snapshot of [...row.before,...row.after])snapshot.session.rowVersion+=100;}]){const p=pair();mutate(p);assert.throws(()=>compareConcurrencyReports(p.nest,p.rust,p.options));}
});
test('future times, unknown IDs, changed source and normalized array reorder are refused',()=>{
    for(const mutate of [(p)=>p.rust.cases[0].orgAfter['race-code-a'].org.updated_at='2099-01-01T00:00:00.000Z',(p)=>p.rust.cases[0].responses[0].body.id=randomUUID(),(p)=>p.rust.sourceFiles[0].normalizedLfSha256='d'.repeat(64),(p)=>p.rust.cases[0].responses.reverse()]){const p=pair();mutate(p);assert.throws(()=>compareConcurrencyReports(p.nest,p.rust,p.options));}
});

test('setup wire dates bind immediate DB rows and repeated organization cases remain continuous',()=>{
    for(const mutate of [(p)=>{p.rust.setup[0].response.body.createdAt='2026-10-27T00:00:00.011Z';p.rust.setup[0].response.body.updatedAt='2026-10-27T00:00:00.012Z';},(p)=>p.rust.cases[3].orgBefore['org-cas'].org.row_version++]){const p=pair();mutate(p);assert.throws(()=>compareConcurrencyReports(p.nest,p.rust,p.options));}
});

test('version-only competitor facts retain all fields and bind the final DB/session snapshots',()=>{
    for(const mutate of [(p)=>p.rust.cases[2].mutations[0].after.created_at='2000-01-01T00:00:00.000Z',(p)=>p.rust.cases[2].mutations[0].after.description='hidden mutation',(p)=>{p.rust.cases[5].mutations[0].before.row_version++;p.rust.cases[5].mutations[0].after.row_version++;}]){const p=pair();mutate(p);assert.throws(()=>compareConcurrencyReports(p.nest,p.rust,p.options));}
});

test('proof and actual release/acquire times must belong to the request and preserve causality',()=>{
    for(const mutate of [(p)=>p.rust.cases[4].proofs.forEach((item)=>item.at='2000-01-01T00:00:00.000Z'),(p)=>p.rust.cases[4].proofs[1].at=p.rust.cases[4].proofs[2].at,(p)=>p.rust.cases[0].timings.releaseBStartedAt=p.rust.cases[0].proofs[0].at,(p)=>p.rust.cases[5].timings.handoffAcquiredAt=p.rust.cases[5].startedAt]){const p=pair();mutate(p);assert.throws(()=>compareConcurrencyReports(p.nest,p.rust,p.options));}
});
