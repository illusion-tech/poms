import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { declaredConcurrencyRequests, declaredConcurrencyFixtureTrace, validateConcurrencyFixtureTrace, validateConcurrencyContinuity, validateConcurrencyControls, validateConcurrencyReplies, validateConcurrencyReport, validateConcurrencyChanges, makeConcurrencyNormalizer, normalizeConcurrencyRun, parseConcurrencyCompare } from './http-concurrency-compare.mjs';
import { concurrencySourceFiles } from './http-concurrency.mjs';
import { firstDifference } from './http-compat-compare.mjs';
import { baselineSourceFile } from './http-compat.mjs';

const ids={admin:'a0000000-0000-4000-8000-000000000001',viewer:'a0000000-0000-4000-8000-000000000002',u000:'a0000000-0000-4000-8000-000000000003',s0:'b0000000-0000-4000-8000-000000000001',s1:'b0000000-0000-4000-8000-000000000002',credential:'c0000000-0000-4000-8000-000000000001'};
const tableNames=['platform_user','local_credential','auth_session','user_role_assignment','user_org_membership','role','org_unit','role_permission_assignment','audit_log','security_event'];
function sample(){
    const runId='10000000-0000-4000-8000-000000000001',facts=Object.fromEntries(tableNames.map((key)=>[key,[]]));
    facts.platform_user=Object.entries(ids).filter(([key])=>['admin','viewer','u000'].includes(key)).map(([key,id])=>({id,username:`r2d_${key}_${runId.replaceAll('-','')}`,display_name:key,row_version:1,created_at:'2020-01-01T00:00:00Z',updated_at:'2020-01-01T00:00:00Z'}));
    facts.local_credential=[{id:ids.credential,user_id:ids.admin,passwordFingerprint:'a'.repeat(64),created_at:'2020-01-01T00:00:00Z'}];
    facts.auth_session=[ids.s0,ids.s1].map((id)=>({id,user_id:ids.admin,row_version:1,status:'active',revoked_reason:null,last_seen_at:'2026-10-28T00:00:00Z',idle_expires_at:'2026-10-28T00:15:00Z',absolute_expires_at:'2026-10-28T08:00:00Z',updated_at:'2026-10-28T00:00:00Z',revoked_at:null,created_at:'2026-10-28T00:00:00Z',tokenFingerprint:'b'.repeat(64),csrfFingerprint:'c'.repeat(64)}));
    const snapshots=Object.fromEntries(facts.auth_session.map((s,index)=>['admin'+index,{session:{id:s.id,rowVersion:1,status:'active',revokedReason:null,lastSeenAt:'2026-10-28T00:00:00.000Z',idleExpiresAt:'2026-10-28T00:15:00.000Z',absoluteExpiresAt:'2026-10-28T08:00:00.000Z',updatedAt:'2026-10-28T00:00:00.000Z',revokedAt:null},audits:[],securityEvents:[]}]));
    const after=structuredClone(facts);after.platform_user.find((row)=>row.id===ids.u000).row_version=2;
    const row={id:'target-user-stale-version',target:{id:ids.u000,slot:'u000',username:facts.platform_user[2].username},before:facts,after,sessionsBefore:snapshots,sessionsAfter:structuredClone(snapshots),startedAt:'2026-10-28T00:00:00.000Z',finishedAt:'2026-10-28T00:00:01.000Z',requests:[{client:0,method:'PATCH',path:'/api/platform/users/'+ids.u000,input:{displayName:'R2D concurrent target-user-stale-version 10000000'},status:500,response:{statusCode:500,message:['one','two']},setCookieCount:0}],followups:[],proofs:[{expectedKind:'user-cas'}],auditDelta:0,sessionVersionDeltas:[0,0]};
    return {runId,startedAt:'2026-10-28T00:00:00.000Z',identities:{users:{admin:ids.admin,viewer:ids.viewer,u000:ids.u000},roles:{alpha:'d0000000-0000-4000-8000-000000000001'},orgs:{alpha:'e0000000-0000-4000-8000-000000000001',viewer:'e0000000-0000-4000-8000-000000000002'}},cases:[row]};
}
test('request binding retains uppercase path spelling and exact command fields/client order',()=>{
    const run=sample(),row=run.cases[0];row.id='alias-user-stale-version';
    assert.equal(declaredConcurrencyRequests(run,row)[0].path,'/api/platform/users/'+ids.u000.toUpperCase());
    row.id='roles-delete-insert-conflict';assert.deepEqual(declaredConcurrencyRequests(run,row).map((entry)=>entry.client),[0,1]);assert.deepEqual(declaredConcurrencyRequests(run,row)[0].input,{roleIds:[run.identities.roles.alpha]});
    row.id='late-session-noop-user';assert.deepEqual(declaredConcurrencyRequests(run,row)[0].input,{});
});
test('normalization accepts only registered identities and preserves alias form, array order and exact pinned microseconds',()=>{
    const run=sample(),normalizer=makeConcurrencyNormalizer(run);
    assert.equal(normalizer.string(ids.u000),'<users:u000>');assert.equal(normalizer.string(ids.u000.toUpperCase()),'<users:u000:uppercase>');assert.equal(normalizer.string(ids.u000.replaceAll('-','')),'<users:u000:compact>');
    assert.throws(()=>normalizer.string('f0000000-0000-4000-8000-000000000001'));
    assert.deepEqual(normalizer.normalize({roles:['second','first'],changedFields:['phone','email']}),{roles:['second','first'],changedFields:['phone','email']});
    assert.notEqual(normalizer.normalize({createdAt:'2020-01-01T00:00:00.123100Z'}).createdAt,normalizer.normalize({createdAt:'2020-01-01T00:00:00.123900Z'}).createdAt);
});
test('within-run password/token fingerprints, immutable creation times and histories cannot be normalized away',()=>{
    for(const field of ['credential','token','created','absolute']){const run=sample(),row=run.cases[0];
        if(field==='credential')row.after.local_credential[0].passwordFingerprint='d'.repeat(64);
        if(field==='token')row.after.auth_session[0].tokenFingerprint='e'.repeat(64);
        if(field==='created')row.after.platform_user[0].created_at='2020-01-01T00:00:01Z';
        if(field==='absolute')row.after.auth_session[0].absolute_expires_at='2026-10-28T09:00:00Z';
        assert.throws(()=>makeConcurrencyNormalizer(run),field);
    }
});
test('ordinary stale CAS admits only external version increment, and every unrelated user/session field remains exact',()=>{
    const run=sample(),row=run.cases[0];validateConcurrencyChanges(run,row);
    row.after.platform_user[0].display_name='unrelated corruption';assert.throws(()=>validateConcurrencyChanges(run,row));row.after.platform_user[0].display_name='admin';
    row.after.platform_user[2].display_name='business should have rolled back';assert.throws(()=>validateConcurrencyChanges(run,row));
});
test('complete normalized observation retains error payload and rejects response-array order/extra-key changes',()=>{
    const run=sample(),normal=normalizeConcurrencyRun(run);assert.deepEqual(normal[0].responses[0].response,{statusCode:500,message:['one','two']});
    const changed=structuredClone(run);changed.cases[0].requests[0].response.message.reverse();assert.equal(firstDifference(normal,normalizeConcurrencyRun(changed)),'root[0].responses[0].response.message[0]');
    changed.cases[0].requests[0].response.message.reverse();changed.cases[0].requests[0].response.extra='must compare';assert(firstDifference(normal,normalizeConcurrencyRun(changed)).includes('<keys>'));
});
test('new-row temporal and selected-session evidence is validated before dynamic timestamps are tokenized',()=>{
    const run=sample();run.cases[0].after.auth_session[0].created_at='2022-01-01T00:00:00Z';assert.throws(()=>normalizeConcurrencyRun(run));
    const second=sample();second.cases[0].sessionsAfter.admin0.session.rowVersion=99;assert.throws(()=>normalizeConcurrencyRun(second));
});
test('first-observed existing event times have an upper bound without imposing a false seed-created/updated ordering',()=>{
    const run=sample();run.cases[0].before.platform_user[1].created_at='2020-01-01T00:00:01Z';run.cases[0].after.platform_user[1].created_at='2020-01-01T00:00:01Z';makeConcurrencyNormalizer(run);
    for(const state of ['before','after'])run.cases[0][state].platform_user[0].updated_at='2026-10-28T00:08:01Z';assert.throws(()=>normalizeConcurrencyRun(run));
});
test('followup profile preserves full schema and binds modern lastLoginAt to its own durable actor row',()=>{
    const run=sample(),row=run.cases[0];for(const state of ['before','after'])Object.assign(row[state].platform_user[0],{email:null,phone:null,avatar_url:null,email_verified:false,phone_verified:false,last_login_at:'2026-10-28T00:00:00Z',is_active:true});
    const actor=row.after.platform_user[0];row.followups=[{client:0,method:'GET',path:'/api/auth/profile',status:200,response:{id:actor.id,username:actor.username,displayName:actor.display_name,roles:[],permissions:[],email:null,phone:null,avatarUrl:null,isActive:true,lastLoginAt:'2026-10-28T00:00:00.000Z',emailVerified:false,phoneVerified:false,orgUnits:[]},setCookieCount:0}];validateConcurrencyReplies(row);
    row.followups[0].response.lastLoginAt='2026-10-28T00:08:00.000Z';assert.throws(()=>validateConcurrencyReplies(row));row.followups[0].response.lastLoginAt='2026-10-28T00:00:00.000Z';row.followups[0].response.extra='not in original projection';assert.throws(()=>validateConcurrencyReplies(row));
});
test('control evidence binds held target/mode/PID and every version mutation to this exact case',()=>{
    const run=sample(),row=run.cases[0];run.coordinatorPids={a:10,b:20,observer:30};row.heldRows=[{table:'platform_user',id:ids.u000,slot:'u000',lockMode:'FOR UPDATE',holderPid:10,before:row.before.platform_user[2]}];row.proofs=[{roots:[10]}];
    row.mutations=[{table:'platform_user',id:ids.u000,before:{id:ids.u000,row_version:1,updated_at:'2020-01-01T00:00:00Z'},after:{id:ids.u000,row_version:2,updated_at:'2020-01-01T00:00:00Z'}}];validateConcurrencyControls(run,row);
    row.heldRows[0]={...row.heldRows[0],id:ids.admin,slot:'admin',before:row.before.platform_user[0]};assert.throws(()=>validateConcurrencyControls(run,row));row.heldRows[0].id=ids.u000;row.heldRows[0].lockMode='FOR NO KEY UPDATE';assert.throws(()=>validateConcurrencyControls(run,row));row.heldRows[0].lockMode='FOR UPDATE';row.mutations[0].id=ids.admin;assert.throws(()=>validateConcurrencyControls(run,row));
});
test('complete source reader includes the two actual shell wrappers, not only JavaScript suffixes',()=>{
    const manifest=concurrencySourceFiles(),paths=new Set(manifest.map((entry)=>entry.file));assert(paths.has('tools/rust-r2d/fixture.sh'));assert(paths.has('tools/rust-r2d/environment.sh'));assert(paths.has('tools/rust-r2d/http-concurrency-compare.mjs'));
    const chosen=baselineSourceFile(),baselines=['docs/design/rust-r2d-users-profile-baseline.md','docs/design/archive/slices/rust-r2d-users-profile-baseline.md'];
    assert.deepEqual(manifest.filter((entry)=>baselines.includes(entry.file)).map((entry)=>entry.file),[chosen]);
    assert.equal(manifest.find((entry)=>entry.file===chosen).sha256,createHash('sha256').update(readFileSync(new URL('../../'+chosen,import.meta.url))).digest('hex'));
});
test('comparison admission refuses partial/subset/wrong-side reports before any normalization',()=>{
    assert.throws(()=>validateConcurrencyReport({formatVersion:1,schema:'r2d-http-concurrency.v1',backend:'nest',platform:'linux',sourceHead:'a22cba7360346242cb7709740b7eb954b92d1fd4',runId:'10000000-0000-4000-8000-000000000001',result:'capture-incomplete'},'nest',{}));
    assert.throws(()=>validateConcurrencyReport({formatVersion:1,schema:'r2d-http-concurrency.v1',backend:'rust'},'nest',{}));
});
test('fixture action trace is exact; additional mutations, missing adoption and reordered commands are rejected',()=>{
    const run=sample();run.cases[0].id='username-two-prechecks';run.cases[0].reservation={plannedSlot:'u001'};
    const expected=declaredConcurrencyFixtureTrace(run);assert.deepEqual(expected.slice(0,5),[{action:'prepare'},{action:'role-set-active',roleSlot:'admin'},{action:'restore',account:'admin'},{action:'user-plan',userSlot:'u000'},{action:'user-adopt',userSlot:'u000'}]);
    run.fixtureActions=expected.map((entry)=>({...entry,matched:1,changed:0,state:({prepare:'prepared',cleanup:'cleaned','user-plan':'planned','user-adopt':'adopted'})[entry.action]??entry.action}));validateConcurrencyFixtureTrace(run);
    const original=structuredClone(run.fixtureActions);run.fixtureActions.splice(3,0,{action:'user-set-inactive',userSlot:'admin',matched:1,changed:1,state:'user-set-inactive'});assert.throws(()=>validateConcurrencyFixtureTrace(run));run.fixtureActions=structuredClone(original);run.fixtureActions.splice(4,1);assert.throws(()=>validateConcurrencyFixtureTrace(run));
});
test('between-case fixture windows cannot hide unrelated users, old sessions or historical deletions',()=>{
    const run=sample(),first=run.cases[0],second=structuredClone(first);second.id='alias-user-stale-version';second.before=structuredClone(first.after);second.after=structuredClone(second.before);second.startedAt='2026-10-28T00:00:03.000Z';second.finishedAt='2026-10-28T00:00:04.000Z';
    const actor=second.before.platform_user[0];actor.row_version++;actor.updated_at='2026-10-28T00:00:02Z';actor.is_active=true;first.after.platform_user[0].is_active=true;second.before.platform_user[0].is_active=true;
    run.cases.push(second);validateConcurrencyContinuity(run);
    second.before.platform_user[1].display_name='unrelated between-case mutation';assert.throws(()=>validateConcurrencyContinuity(run));second.before.platform_user[1].display_name='viewer';
    second.before.auth_session[0].updated_at='2026-10-28T00:00:02Z';assert.throws(()=>validateConcurrencyContinuity(run));second.before.auth_session[0].updated_at=first.after.auth_session[0].updated_at;
    second.before.platform_user[0].updated_at='2026-10-29T00:00:00Z';assert.throws(()=>validateConcurrencyContinuity(run));
});
test('comparison CLI requires distinct R2D evidence paths and a fresh output',()=>{
    const files=['n','r','no','ro','out'].map((name)=>'tmp/rust-r2d/c-compare-'+name+'.json');assert.equal(parseConcurrencyCompare(files).length,5);
    assert.throws(()=>parseConcurrencyCompare(files.slice(0,4)));assert.throws(()=>parseConcurrencyCompare([files[0],files[0],...files.slice(2)]));assert.throws(()=>parseConcurrencyCompare(files.map((name)=>name.replace('rust-r2d','rust-r2c'))));
});
