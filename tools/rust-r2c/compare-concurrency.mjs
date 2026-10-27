import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { epochMicros, validateOwnerCloseout } from './http-compat-compare.mjs';
import { concurrencyCases, assertCaseProofs, assertCaseTiming } from './http-concurrency-protocol.mjs';
import { sourceHead } from './fixture-guard.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const timeKeys = new Set(['createdAt','updatedAt','occurredAt','lastSeenAt','idleExpiresAt','absoluteExpiresAt','revokedAt','created_at','updated_at','assigned_at','revoked_at']);
const inRequest = (time, row) => {
    const value = epochMicros(time);
    assert(value >= epochMicros(row.startedAt)-5000n && value <= epochMicros(row.finishedAt)+5000n, `${row.id}: changed time outside request`);
};
function exactOrgChange(row, slot, expectedVersionDelta, business) {
    const before = row.orgBefore[slot].org, after = row.orgAfter[slot].org;
    assert.equal(after.row_version-before.row_version,expectedVersionDelta);
    assert.equal(after.created_at,before.created_at);
    for (const field of ['created_by','updated_by','parent_id','description','is_active','display_order']) assert.deepEqual(after[field],before[field],`${row.id}:${slot}:${field}`);
    if (!business) {
        const removeVersion = (value) => Object.fromEntries(Object.entries(value).filter(([key])=>key!=='row_version'));
        assert.deepEqual(removeVersion(after),removeVersion(before),`${row.id}: unexpected business mutation`);
    } else inRequest(after.updated_at,row);
    return {createdUnchanged:after.created_at===before.created_at,updatedUnchanged:after.updated_at===before.updated_at};
}
export function normalizeConcurrency(run, backend, closeout) {
    assert.equal(run.formatVersion,1); assert.equal(run.result,'observed'); assert.equal(run.backend,backend); assert.equal(run.platform,'linux');
    assert.equal(run.sourceHead,sourceHead);assert.equal(run.serverReceipt.value.sourceHead,sourceHead);assert.equal(run.serverReceipt.value.backend,backend);assert.equal(run.serverReceipt.value.aliveBefore,true);
    assert(/^[0-9a-f]{64}$/.test(run.serverReceipt.sha256)&&/^[0-9a-f]{64}$/.test(run.serverReceipt.value.binarySha256));
    const origin=new URL(run.serverReceipt.value.origin);assert.equal(origin.protocol,'http:');assert(['127.0.0.1','localhost','[::1]'].includes(origin.hostname));assert.equal(origin.port,backend==='nest'?'5300':'5301');
    assert(run.sourceFiles.length>=15&&run.sourceFiles.every((source)=>typeof source.file==='string'&&/^[0-9a-f]{64}$/.test(source.normalizedLfSha256)),'Complete source identities are required');
    assert.equal(new Set(run.sourceFiles.map((source)=>source.file)).size,run.sourceFiles.length);
    for(const file of ['http-concurrency.mjs','http-concurrency-protocol.mjs','compare-concurrency.mjs','fixture-guard.mjs','fixture-run.mjs','fixture-journal.mjs'])assert(run.sourceFiles.some((source)=>source.file===`tools/rust-r2c/${file}`));
    assert(uuid.test(run.runId)); assert(run.cleanupCompleted && run.cleanup.state==='cleaned');
    assert.deepEqual([run.zeroResidual.matched,run.zeroResidual.changed],[0,0]);
    validateOwnerCloseout(run,closeout);
    assert.deepEqual(run.cases.map((row)=>row.id),concurrencyCases.map((value)=>value.id));
    const coordinatorIds=Object.values(run.coordinatorPids);
    assert.equal(coordinatorIds.length,3);assert.equal(new Set(coordinatorIds).size,3);assert(coordinatorIds.every((pid)=>Number.isSafeInteger(pid)&&pid>0));
    const ids = new Map(), labels = new Map();
    function register(id,label) {
        assert(uuid.test(id),'Only known canonical IDs can normalize');
        if(ids.has(id))assert.equal(ids.get(id),label);
        if(labels.has(label))assert.equal(labels.get(label),id);
        ids.set(id,label);labels.set(label,id);
    }
    register(run.identities.admin,'actor:admin');
    for(const [slot,id] of Object.entries(run.identities.orgs))register(id,`org:${slot}`);
    for(const [index,id] of Object.entries(run.identities.sessions))register(id,`session:${index}`);
    for(const row of run.cases) for(const snapshot of [...row.before,...row.after]) {
        assert.equal(snapshot.securityEvents.length,0,'These authenticated races must not introduce security events');
        snapshot.audits.forEach((audit,index)=>register(audit.id,`audit:${index}`));
    }
    assert.equal(run.cases[0].before[0].audits.length,run.setup.length,'Every setup creation must have its original audit');
    run.setup.forEach((entry,index)=>{
        const audit=run.cases[0].before[0].audits[index];
        assert.equal(audit.eventType,'platform.org-unit.created');assert.equal(audit.targetId,entry.response.body.id);assert.equal(audit.operatorId,run.identities.admin);
    });
    const previousOrgs=new Map(run.setup.map((entry)=>{
        const org=entry.orgSnapshot.org;
        assert.equal(org.id,run.identities.orgs[entry.slot]);assert.equal(org.row_version,1);assert.equal(org.is_active,true);
        assert.deepEqual(entry.orgSnapshot.memberships,[]);assert.deepEqual(entry.orgSnapshot.children,[]);
        const expected={id:org.id,name:org.name,code:org.code,description:org.description,parentId:org.parent_id,isActive:org.is_active,displayOrder:org.display_order,createdAt:new Date(org.created_at).toISOString(),updatedAt:new Date(org.updated_at).toISOString()};
        assert.deepEqual(entry.response.body,expected,'Setup response must equal its immediate full DB snapshot');
        return [entry.slot,['cascade-d','cascade-e'].includes(entry.slot)?{...org,is_active:false,row_version:org.row_version+1}:org];
    }));
    assert.equal(previousOrgs.size,run.setup.length);
    const previousSessions=new Map();let previousAudits=run.cases[0].before[0].audits;
    const cleanRun=(value)=>value.replaceAll(run.runId,'<run>').replaceAll(run.runId.replaceAll('-',''),'<run-compact>').replaceAll(run.runId.slice(0,8),'<run-short>');
    function normalize(value,key='') {
        if(value===null)return null;
        if(timeKeys.has(key)){epochMicros(value);return '<validated-time>';}
        if(Array.isArray(value))return value.map((item)=>normalize(item));
        if(typeof value==='object')return Object.fromEntries(Object.entries(value).map(([name,item])=>[name,normalize(item,name)]));
        if(typeof value!=='string')return value;
        if(uuid.test(value)){assert(ids.has(value),`Unknown UUID:${key}`);return ids.get(value);}
        let result=cleanRun(value);
        for(const [id,label] of ids){result=result.replaceAll(id,`<${label}>`).replaceAll(id.toUpperCase(),`<${label.toUpperCase()}>`);}
        assert(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(result),`Unregistered embedded UUID:${key}`);
        return result;
    }
    const normalizedCases=run.cases.map((row,index)=>{
        const spec=assertCaseProofs(row);
        assertCaseTiming(row);
        assert.equal(row.due,spec.kind.startsWith('handoff'));
        assert.equal(row.requests.length,spec.statuses.length);assert.equal(row.before.length,spec.statuses.length);
        assert.deepEqual(row.requests.map((request)=>request.client),spec.statuses.map((_,client)=>client));
        assert.deepEqual(Object.keys(row.orgBefore).sort(),[...spec.slots].sort());assert.deepEqual(Object.keys(row.orgAfter).sort(),[...spec.slots].sort());
        for(const proof of row.proofs){
            const expectedRoots=proof.stage==='both-target-updates-held'?[run.coordinatorPids.a,run.coordinatorPids.b]:proof.stage==='managed-cas-held'?[run.coordinatorPids.b]:[run.coordinatorPids.a];
            assert.deepEqual(proof.roots,expectedRoots,'Barrier roots must be the independently recorded coordinator PIDs');
            if(proof.stage==='handoff-queued')assert.deepEqual(proof.waiterPids,[run.coordinatorPids.b]);
            else assert(proof.waiterPids.every((pid)=>!coordinatorIds.includes(pid)),'An HTTP waiter cannot be a coordinator');
        }
        const initialLocks=row.heldRows.slice(0,spec.kind==='pair'?2:1);
        assert.deepEqual(initialLocks.map((lock)=>lock.table),Array(initialLocks.length).fill(spec.kind.startsWith('handoff')?'auth_session':'org_unit'));
        assert.deepEqual(initialLocks.map((lock)=>lock.id),spec.kind.startsWith('handoff')?[row.before[0].session.id]:spec.slots.slice(0,spec.kind==='pair'?2:1).map((slot)=>run.identities.orgs[slot]));
        assert.equal(row.id,concurrencyCases[index].id);
        assert.deepEqual(row.responses.map((response)=>response.status),spec.statuses);
        assert.deepEqual(row.sessionVersionDeltas,spec.sessionDeltas);
        assert.equal(row.auditDelta,spec.auditDelta);
        assert.equal(row.before.length,row.after.length);
        const temporal={sessions:[],orgs:{}};
        for(const [sessionIndex,before] of row.before.entries()) {
            const after=row.after[sessionIndex];
            assert.equal(before.session.id,run.identities.sessions[row.requests[sessionIndex].client]);
            assert.equal(before.session.id,after.session.id);
            assert.equal(after.session.rowVersion-before.session.rowVersion,spec.sessionDeltas[sessionIndex]);
            assert.equal(before.session.absoluteExpiresAt,after.session.absoluteExpiresAt);
            assert.deepEqual(after.audits.slice(0,before.audits.length),before.audits,'Prior audit facts changed');
            assert.deepEqual(after.securityEvents,before.securityEvents);
            assert.equal(after.audits.length-before.audits.length,spec.auditDelta);
            assert.deepEqual(before.audits,previousAudits,'Audit history must remain continuous across cases and sessions');
            const previous=previousSessions.get(before.session.id);
            if(previous){
                assert.equal(before.session.rowVersion,previous.rowVersion+1,'Exactly one reviewed due/non-due fixture mutation precedes each later command');
                for(const key of ['id','status','idleExpiresAt','absoluteExpiresAt','revokedAt','revokedReason'])assert.deepEqual(before.session[key],previous[key]);
            }
            for(const snapshot of [before,after])for(const key of ['lastSeenAt','idleExpiresAt','absoluteExpiresAt','updatedAt'])assert.equal(epochMicros(snapshot.session[key])%1000n,0n,'Session timestamps retain Date milliseconds');
            assert(epochMicros(before.session.lastSeenAt)<=epochMicros(row.startedAt)+5000n,'Pre-request lastSeenAt cannot be in the future');
            for(const key of ['id','status','absoluteExpiresAt','revokedAt','revokedReason'])assert.deepEqual(after.session[key],before.session[key]);
            if(!row.due)assert.deepEqual(after.session,before.session,'Non-due failed/winning org commands must not change the session');
            else {assert.notEqual(after.session.lastSeenAt,before.session.lastSeenAt);assert.equal(after.session.updatedAt,after.session.lastSeenAt);}
            const relation={};
            for(const key of ['lastSeenAt','idleExpiresAt','absoluteExpiresAt','updatedAt','revokedAt']) {
                relation[`${key}:unchanged`]=before.session[key]===after.session[key];
                if(['lastSeenAt','updatedAt','revokedAt'].includes(key)&&after.session[key]!==null&&before.session[key]!==after.session[key])inRequest(after.session[key],row);
            }
            if(before.session.lastSeenAt!==after.session.lastSeenAt){
                const due=epochMicros(after.session.lastSeenAt)+900000000n,absolute=epochMicros(after.session.absoluteExpiresAt);
                assert.equal(epochMicros(after.session.idleExpiresAt),due<absolute?due:absolute);
            }
            temporal.sessions.push(relation);
            previousSessions.set(after.session.id,after.session);
            for(const audit of after.audits.slice(before.audits.length)) {
                assert.equal(Object.keys(audit).length,12);assert.equal(audit.operatorId,run.identities.admin);assert.equal(audit.targetType,'OrgUnit');assert.equal(audit.requestId,null);
                inRequest(audit.occurredAt,row);
            }
        }
        for(const [slot,before] of Object.entries(row.orgBefore)) {
            const after=row.orgAfter[slot];
            assert.equal(before.org.id,run.identities.orgs[slot]);assert.equal(after.org.id,before.org.id);
            assert.deepEqual(after.memberships,before.memberships,'Membership history changed');
            assert.deepEqual(before.org,previousOrgs.get(slot),'Organization state must be continuous from setup/previous case');
            previousOrgs.set(slot,after.org);
            for(const value of [before.org,after.org])for(const key of ['created_at','updated_at'])assert.equal(epochMicros(value[key])%1000n,0n,'Product org times must retain Date milliseconds');
        }
        if(spec.kind==='pair') {
            const [winner,loser]=spec.slots;
            temporal.orgs[winner]=exactOrgChange(row,winner,1,true);
            temporal.orgs[loser]=exactOrgChange(row,loser,0,false);
            const key=row.id.startsWith('code')?'code':'name';
            const other=key==='code'?'name':'code';
            assert.equal(row.orgAfter[winner].org[key],row.requests[0].json[key]);
            assert.equal(row.orgAfter[winner].org[other],row.orgBefore[winner].org[other]);
            assert.equal(row.orgAfter[loser].org[key],row.orgBefore[loser].org[key]);
            assert.equal(row.responses[0].body.id,run.identities.orgs[winner]);
        } else {
            assert.equal(row.mutations.length,1);
            const mutation=row.mutations[0];assert.equal(mutation.after.row_version,mutation.before.row_version+1);
            assert.deepEqual(mutation.after,{...mutation.before,row_version:mutation.before.row_version+1},'Competing writer changes exactly the owned version field');
            assert.equal(mutation.after.updated_at,mutation.before.updated_at);
            if(spec.kind==='handoff-session') {
                assert.equal(mutation.table,'auth_session');assert.equal(mutation.id,row.before[0].session.id);
                assert.equal(mutation.before.row_version,row.before[0].session.rowVersion+1);
                assert.equal(epochMicros(mutation.after.updated_at),epochMicros(row.after[0].session.updatedAt));
                assert.deepEqual(mutation.after,{id:row.after[0].session.id,row_version:row.after[0].session.rowVersion,updated_at:mutation.before.updated_at});
            } else {
                const target=spec.kind==='org'?'org-cas':'cascade-b';
                assert.equal(mutation.table,'org_unit');assert.equal(mutation.id,run.identities.orgs[target]);
                assert.deepEqual(mutation.before,row.orgBefore[target].org);
                assert.deepEqual(mutation.after,row.orgAfter[target].org,'Competing write must equal the final unchanged business row');
            }
            for(const slot of spec.slots)temporal.orgs[slot]=exactOrgChange(row,slot,spec.kind==='org'||spec.kind==='handoff-org'&&slot==='cascade-b'?1:0,false);
        }
        for(const response of row.responses) {
            assert.equal(response.setCookieCount,0);
            if(response.status===200&&response.body?.id) {
                const slot=spec.slots.find((slot)=>run.identities.orgs[slot]===response.body.id);assert(slot);
                const stored=row.orgAfter[slot].org;
                for(const [wire,key] of [['createdAt','created_at'],['updatedAt','updated_at']]) {
                    assert.equal(new Date(response.body[wire]).toISOString(),response.body[wire]);
                    assert.equal(epochMicros(response.body[wire]),epochMicros(stored[key]));
                }
            }
        }
        for(const after of row.after)assert.deepEqual(after.audits,row.after[0].audits);previousAudits=row.after[0].audits;
        return {id:row.id,due:row.due,requests:normalize(row.requests),responses:normalize(row.responses),before:normalize(row.before),after:normalize(row.after),orgBefore:normalize(row.orgBefore),orgAfter:normalize(row.orgAfter),mutations:normalize(row.mutations),auditDelta:row.auditDelta,sessionVersionDeltas:row.sessionVersionDeltas,
            proofs:row.proofs.map((proof)=>({stage:proof.stage,kind:proof.expectedKind,count:proof.expectedCount})),releaseOrder:row.releaseOrder,handoffAcquired:row.handoffAcquired??false,temporal};
    });
    for(const entry of run.setup){
        assert.equal(entry.response.status,201);assert.equal(entry.response.setCookieCount,0);assert.equal(entry.response.body.id,run.identities.orgs[entry.slot]);
        for(const key of ['createdAt','updatedAt']){
            assert.equal(new Date(entry.response.body[key]).toISOString(),entry.response.body[key]);
            const time=epochMicros(entry.response.body[key]);
            assert(time>=epochMicros(run.startedAt)-5000n&&time<=epochMicros(run.cases[0].startedAt)+5000n,'Setup timestamp outside actual setup interval');
        }
    }
    return {setup:normalize(run.setup),cases:normalizedCases};
}
export function compareConcurrencyReports(nest,rust,{ownerCloseouts}={}) {
    assert.deepEqual(nest.sourceFiles,rust.sourceFiles,'Both backends must use the exact frozen candidate/harness');
    const left=normalizeConcurrency(nest,'nest',ownerCloseouts?.nest),right=normalizeConcurrency(rust,'rust',ownerCloseouts?.rust);
    assert.deepEqual(right,left,'Full concurrency response/DB/session/audit/time relations differ');
    return {formatVersion:1,result:'pass',cases:concurrencyCases.map((spec)=>({id:spec.id,result:'pass'})),
        boundary:'Six controlled schedules in five row-lock-provable categories. Nullable alias read-between-SELECT merge is explicitly not claimed by these row locks.',
        normalization:'Only registered IDs/run strings and valid timestamps after request bounds, immutable prefixes, exact versions, date precision, TTL/time equality, full rows and precise lock/phase/owner validation. No response, tree, audit or child array sorting.'};
}
function evidencePath(file){const value=path.resolve(root,file);assert(value.startsWith(path.join(root,'tmp/rust-r2c')+path.sep)&&value.endsWith('.json'));return value;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    assert.equal(process.argv.length,7,'Usage: compare-concurrency.mjs <nest.json> <rust.json> <nest-closeout.json> <rust-closeout.json> <output.json>');
    const [nest,rust,nestAfter,rustAfter]=process.argv.slice(2,6).map((file)=>JSON.parse(readFileSync(evidencePath(file),'utf8')));
    const result=compareConcurrencyReports(nest,rust,{ownerCloseouts:{nest:nestAfter,rust:rustAfter}});
    result.inputHashes=process.argv.slice(2,6).map((file)=>({file,sha256:createHash('sha256').update(readFileSync(evidencePath(file))).digest('hex')}));
    writeFileSync(evidencePath(process.argv[6]),`${JSON.stringify(result,null,2)}\n`,{flag:'wx',mode:0o600});
    console.log(JSON.stringify(result));
}
