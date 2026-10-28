import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { concurrencyCases, concurrencyManifest, userRowLockMode, assertCaseProofs, assertCaseTiming, assertStatuses } from './http-concurrency-protocol.mjs';
import { safeEvidencePath, validateConcurrencyReceipt, concurrencySourceFiles, originalNestReferences } from './http-concurrency.mjs';
import { validateJournal } from './fixture-journal.mjs';
import { epochMicros, validateTransition, factTables } from './http-compat-normalize.mjs';
import { validateOwnerCloseout, firstDifference } from './http-compat-compare.mjs';
import { validateProjection } from './http-compat.mjs';
import { sourceHead, validateSource } from './fixture-guard.mjs';
import { witnessCases } from './nest-witness-plan.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuidSpelling = /(?<![0-9a-f])(?:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|[0-9a-f]{32})(?![0-9a-f])/gi;
const timeKeys = new Set(['created_at','updated_at','occurred_at','assigned_at','revoked_at','last_seen_at','last_login_at','idle_expires_at','absolute_expires_at','expires_at','createdAt','updatedAt','occurredAt','revokedAt','lastSeenAt','lastLoginAt','idleExpiresAt','absoluteExpiresAt','expiresAt']);
const fingerprints = new Set(['passwordFingerprint','tokenFingerprint','csrfFingerprint']);
const fixedCeiling = 1609459200000000n;
const pastEventKeys=['created_at','updated_at','occurred_at','assigned_at','revoked_at','last_seen_at','last_login_at'];

export function validateConcurrencyControls(run,row) {
    const spec=concurrencyCases.find((entry)=>entry.id===row.id);assert(spec);const {a,b}=run.coordinatorPids,session=spec.kind==='session',sessionId=row.sessionsBefore.admin0.session.id;
    const expectedTable=session?'auth_session':spec.kind==='roles'?'role':spec.kind==='org-fk'?'org_unit':'platform_user';
    const expectedId=session?sessionId:spec.kind==='roles'?run.identities.roles.alpha:spec.kind==='org-fk'?run.identities.orgs.alpha:row.target.id;
    assert.equal(row.heldRows.length,session?2:1);
    for(const [index,held]of row.heldRows.entries()){assert.equal(held.table,expectedTable);assert.equal(held.id,expectedId);assert.equal(held.holderPid,index?b:a);assert.equal(held.lockMode,expectedTable==='platform_user'?userRowLockMode(spec.kind):'FOR UPDATE');}
    assert.deepEqual(row.proofs.map((proof)=>proof.roots),session?[[a],[a],[b]]:[[a]]);
    if(session){assert.equal(row.targetSessionId,sessionId);for(const proof of row.proofs)assert.equal(proof.targetSessionId,sessionId);}
    const mutations=row.mutations;assert(Array.isArray(mutations));
    if(['username','roles'].includes(spec.kind)){assert.deepEqual(mutations,[]);return;}
    assert.equal(mutations.length,1);const mutation=mutations[0];
    if(session||['user-cas','user-pair','org-cas'].includes(spec.kind)){
        assert.equal(mutation.table,session?'auth_session':'platform_user');assert.equal(mutation.id,expectedId);
        for(const value of [mutation.before,mutation.after]){assert.deepEqual(Object.keys(value).sort(),['id','row_version','updated_at']);assert.equal(value.id,expectedId);}
        const beforeVersion=session?row.sessionsBefore.admin0.session.rowVersion+1:row.before.platform_user.find((value)=>value.id===expectedId).row_version;
        assert.equal(mutation.before.row_version,beforeVersion);assert.equal(mutation.after.row_version,beforeVersion+1);assert.equal(mutation.before.updated_at,mutation.after.updated_at);
        const durable=(session?row.after.auth_session:row.after.platform_user).find((value)=>value.id===expectedId);assert.equal(durable.row_version,beforeVersion+1);assert.equal(epochMicros(mutation.after.updated_at),epochMicros(durable.updated_at));
    }else if(spec.kind==='nullable'){
        const values=spec.values?['witness@example.test','12345','https://example.test/avatar.png',run.identities.orgs.alpha,'2020-02-03T04:05:06.123Z']:[null,null,null,null,null];
        assert.deepEqual(mutation,{table:'platform_user',id:row.target.id,kind:spec.values?'nullable-values-no-version':'nullable-null-no-version',values,beforeVersion:row.before.platform_user.find((value)=>value.id===row.target.id).row_version,afterVersion:row.before.platform_user.find((value)=>value.id===row.target.id).row_version,unchangedUpdatedAt:true});
        const durable=row.after.platform_user.find((value)=>value.id===row.target.id);for(const [index,key]of ['email','phone','avatar_url','primary_org_unit_id'].entries())assert.equal(durable[key],values[index]);if(spec.values)assert.equal(epochMicros(durable.last_login_at),epochMicros(values[4]));else assert.equal(durable.last_login_at,null);
    }else if(spec.kind==='role-change'||spec.kind==='caller-disable'){
        const role=spec.kind==='role-change';assert.equal(mutation[role?'targetRoleId':'targetUserId'],role?run.identities.roles.admin:run.identities.users.admin);const receipt=mutation.receipt;assert.equal(receipt.formatVersion,1);assert.equal(receipt.runId,run.runId);assert.equal(receipt.backend,run.backend);assert.equal(receipt.action,role?'role-set-inactive':'user-set-inactive');assert.equal(receipt.state,receipt.action);assert.equal(receipt.matched,1);assert.equal(receipt.changed,1);
    }else{assert.equal(spec.kind,'org-fk');assert.deepEqual(mutation,{table:'org_unit',id:run.identities.orgs.alpha,isActive:false,phase:'after-validated-before-FK-release'});const before=row.before.org_unit.find((value)=>value.id===expectedId),after=row.after.org_unit.find((value)=>value.id===expectedId);assert.equal(after.row_version,before.row_version+1);assert.equal(after.updated_at,before.updated_at);}
}

export function declaredConcurrencyRequests(run, row) {
    const spec = concurrencyCases.find((entry) => entry.id === row.id); assert(spec);
    const id = spec.alias ? row.target.id.toUpperCase() : row.target.id, route = `/api/platform/users/${id}`;
    const r = (client, method, requestPath, input) => ({ client, method, path: requestPath, input });
    const patch = { displayName: `R2D concurrent ${spec.id} ${run.runId.slice(0,8)}` }, org = run.identities.orgs.alpha;
    if (spec.kind === 'username') { const input = { username: row.reservation.plannedUsername, displayName: `R2D concurrent username ${run.runId.slice(0,8)}`, primaryOrgUnitId: null, initialRoleIds: [] }; return [r(0,'POST','/api/platform/users',input),r(1,'POST','/api/platform/users',input)]; }
    if (spec.kind === 'roles') return [0,1].map((client)=>r(client,'PUT',route+'/roles',{roleIds:[run.identities.roles.alpha]}));
    if (spec.kind === 'org-cas' || spec.kind === 'org-fk' || spec.command === 'org') return [r(0,'PUT',route+'/org-memberships',{primaryOrgUnitId:org,secondaryOrgUnitIds:spec.kind==='org-fk'?[run.identities.orgs.viewer]:[]})];
    if (spec.command === 'roles') return [r(0,'PUT',route+'/roles',{roleIds:[]})];
    const result = [r(0,'PATCH',spec.kind==='nullable'&&spec.self?'/api/auth/profile':route,spec.command==='noop'?{}:patch)];
    if (spec.kind === 'user-pair') result.push(r(1,'POST',route+':deactivate',{})); return result;
}
function verifyBindings(run) {
    validateJournal(run.fixture,{runId:run.runId,backend:run.backend}); assert.equal(run.fixture.state,'prepared');
    for (const entry of [...run.fixture.accounts.map((row)=>({slot:row.account,userId:row.userId})),...run.fixture.users]) assert.equal(run.identities.users[entry.slot],entry.userId);
    assert.equal(Object.keys(run.identities.users).length,run.fixture.accounts.length+run.fixture.users.length);
    for (const kind of ['roles','orgs']) for (const row of run.fixture[kind]) assert.equal(run.identities[kind][row.slot],row.id);
    const known = new Map([...run.fixture.accounts.map((row)=>({slot:row.account,...row})),...run.fixture.users].map((row)=>[row.userId,row]));
    for (const row of run.cases) {
        validateConcurrencyControls(run,row);
        const spec=concurrencyCases.find((entry)=>entry.id===row.id);assert(spec);if(spec.self)assert.equal(row.target.id,run.identities.users.admin);else assert(/^u[0-9]{3}$/.test(row.target.slot));
        const entry = known.get(row.target.id); assert(entry); assert.equal(entry.slot,row.target.slot); assert.equal(entry.username,row.target.username);
        for (const [stage,snapshots,facts] of [['before',row.sessionsBefore,row.before],['after',row.sessionsAfter,row.after]]) {
            assert.deepEqual(Object.keys(snapshots),['admin0','admin1']);
            for (const value of Object.values(snapshots)) { const session=facts.auth_session.find((r)=>r.id===value.session.id); assert(session,stage+' selected session'); assert.equal(session.user_id,run.identities.users.admin); }
        }
        for (const held of row.heldRows) {
            if (held.table==='platform_user') { assert(known.has(held.id)); assert.equal(held.before.username,known.get(held.id).username); }
            else if (held.table==='role'||held.table==='org_unit') { const kind=held.table==='role'?'roles':'orgs',key=held.table==='role'?'role_key':'code'; const reference=run.fixture[kind].find((r)=>r.id===held.id); assert(reference); assert.equal(held.before[key],reference.key); }
            else { assert.equal(held.table,'auth_session'); assert.equal(held.id,row.sessionsBefore.admin0.session.id); assert.equal(held.userId,run.identities.users.admin); }
        }
        if(row.reservation){const planned=run.fixture.users.find((u)=>u.slot===row.reservation.plannedSlot);assert(planned);assert.equal(row.reservation.plannedUsername,planned.username);assert.equal(row.reservation.sentinelId,row.target.id);assert.equal(row.sentinelRestored,true);assert.deepEqual(row.sentinelAfterRollback,row.heldRows[0].before);}
    }
}
export function declaredConcurrencyFixtureTrace(run) {
    const result=[{action:'prepare'}],add=(action,extra={})=>result.push({action,...extra});
    for(const row of run.cases){const spec=concurrencyCases.find((entry)=>entry.id===row.id);assert(spec);
        add('role-set-active',{roleSlot:'admin'});add('restore',{account:'admin'});
        if(!spec.self){add('user-plan',{userSlot:row.target.slot});add('user-adopt',{userSlot:row.target.slot});}
        if(spec.kind==='roles'||spec.command==='roles')add('user-role-matrix',{userSlot:row.target.slot});
        if(spec.kind==='org-cas'||spec.command==='org')add('user-membership-matrix',{userSlot:row.target.slot});
        if(spec.kind==='nullable')add(spec.values?'user-profile-null':'user-profile-values',{userSlot:row.target.slot});
        if(spec.kind==='username')add('user-plan',{userSlot:row.reservation.plannedSlot});
        for(let i=0;i<2;i++)add(spec.kind==='session'?'session-due':'session-non-due',{account:'admin'});
        add('facts');add('snapshot',{account:'admin'});add('snapshot',{account:'admin'});
        if(spec.kind==='role-change')add('role-set-inactive',{roleSlot:'admin'});
        if(spec.kind==='caller-disable')add('user-set-inactive',{userSlot:'admin'});
        if(spec.kind==='username')add('user-adopt',{userSlot:row.reservation.plannedSlot});
        add('facts');add('snapshot',{account:'admin'});add('snapshot',{account:'admin'});
    }
    add('cleanup');add('cleanup');return result;
}
export function validateConcurrencyFixtureTrace(run) {
    assert.deepEqual(run.fixtureActions.map((entry)=>Object.fromEntries(Object.entries(entry).filter(([key])=>!['matched','changed','state'].includes(key)))),declaredConcurrencyFixtureTrace(run),'Every precise fixture action is required in declared order');
    for(const entry of run.fixtureActions){assert(Number.isSafeInteger(entry.matched)&&entry.matched>=0&&Number.isSafeInteger(entry.changed)&&entry.changed>=0);assert.equal(entry.state,({prepare:'prepared',cleanup:'cleaned','user-plan':'planned','user-adopt':'adopted'})[entry.action]??entry.action);}
}
export function validateConcurrencyContinuity(run) {
    for(let index=1;index<run.cases.length;index++){
        const previous=run.cases[index-1],row=run.cases[index],spec=concurrencyCases.find((entry)=>entry.id===row.id),actor=run.identities.users.admin;
        const low=epochMicros(previous.finishedAt),high=epochMicros(row.startedAt),window=(value)=>{const at=epochMicros(value);assert(at>=low&&at<=high,'Between-case mutation must be in its recorded setup interval');};
        for(const table of factTables){const before=new Map(previous.after[table].map((entry)=>[entry.id,entry])),after=new Map(row.before[table].map((entry)=>[entry.id,entry]));
            for(const [id,value]of before){const next=after.get(id);
                if(table==='platform_user'&&id===actor){assert(next);const fields=new Set(['is_active','row_version','updated_at','last_login_at',...(spec.kind==='nullable'&&spec.self?['email','phone','avatar_url','primary_org_unit_id']:[])]);unchangedExcept(value,next,fields,row.id+'/setup-actor');assert.equal(next.is_active,true);assert(next.row_version>value.row_version);window(next.updated_at);if(spec.kind==='nullable'&&spec.self){assert.equal(next.email,spec.values?null:'witness@example.test');assert.equal(next.phone,spec.values?null:'12345');assert.equal(next.avatar_url,spec.values?null:'https://example.test/avatar.png');assert.equal(next.primary_org_unit_id,spec.values?null:run.identities.orgs.alpha);if(spec.values)assert.equal(next.last_login_at,null);else assert.equal(epochMicros(next.last_login_at),epochMicros('2020-02-03T04:05:06.123Z'));}else if(next.last_login_at!==null&&next.last_login_at!==undefined)window(next.last_login_at);}
                else if(table==='role'&&id===run.identities.roles.admin){unchangedExcept(value,next,new Set(['is_active','row_version','updated_at']),row.id+'/setup-role');assert.equal(next.is_active,true);assert.equal(next.row_version,value.row_version+1);window(next.updated_at);}
                else if(table==='user_role_assignment'&&value.user_id===actor){ /* Exact restore action replaces the actor grant. */ }
                else if(table==='role_permission_assignment'&&value.role_id===run.identities.roles.admin){ /* Exact restore action rebuilds this owned role's grants. */ }
                else assert.deepEqual(next,value,row.id+'/unrelated-between-case/'+table);
            }
            for(const value of after.values())if(!before.has(value.id)){
                const allowed=table==='platform_user'&&value.id===row.target.id&&!spec.self||table==='auth_session'&&Object.values(row.sessionsBefore).some((s)=>s.session.id===value.id)&&value.user_id===actor||table==='user_role_assignment'&&(value.user_id===actor||value.user_id===row.target.id)||table==='user_org_membership'&&value.user_id===row.target.id||table==='role_permission_assignment'&&value.role_id===run.identities.roles.admin||table==='audit_log'&&value.operator_id===actor&&value.target_id===row.target.id||table==='security_event'&&value.actor_id===actor;
                assert(allowed,row.id+': undeclared between-case row '+table);if(value.created_at&&epochMicros(value.created_at)>=fixedCeiling)window(value.created_at);if(value.occurred_at)window(value.occurred_at);
            }
        }
    }
}
export function validateConcurrencyReport(run,backend,owner) {
    assert.equal(run.formatVersion,1);assert.equal(run.schema,'r2d-http-concurrency.v1');assert.equal(run.backend,backend);assert.equal(run.platform,'linux');assert.equal(run.sourceHead,sourceHead);assert(uuid.test(run.runId));assert.equal(run.result,'observed');
    assert.deepEqual(run.plan,concurrencyManifest());assert.deepEqual(run.selectedCaseIds,concurrencyCases.map((row)=>row.id));assert.deepEqual(run.cases.map((row)=>row.id),run.selectedCaseIds);
    assert.equal(run.originalNestWitnesses.length,5);assert.deepEqual(run.originalNestWitnesses.map((entry)=>entry.file),['nest-create-witness01.json','nest-behavior-core01.json','nest-behavior-role-delete01.json','nest-behavior-org-delete01.json','nest-remaining-remaining02.json'].map((name)=>'tmp/rust-r2d/'+name));
    const originalIds=run.originalNestWitnesses.flatMap((entry)=>entry.caseIds);assert.equal(originalIds.length,73);assert.equal(new Set(originalIds).size,73);assert.deepEqual(originalIds.toSorted(),witnessCases.map((row)=>row.id).toSorted());
    assert(Array.isArray(run.sourcesBefore)&&run.sourcesBefore.length);assert.deepEqual(run.sourcesAfter,run.sourcesBefore);assert.equal(new Set(run.sourcesBefore.map((entry)=>entry.file)).size,run.sourcesBefore.length);
    for(const entry of run.sourcesBefore)assert(/^[0-9a-f]{64}$/.test(entry.sha256));
    assert.equal(run.cleanupCompleted,true);assert.equal(run.cleanup.state,'cleaned');assert.equal(run.zeroResidual.state,'cleaned');assert.deepEqual([run.zeroResidual.matched,run.zeroResidual.changed],[0,0]);
    for(const key of ['failurePhase','failure','lockReleaseFailed','leaseReleaseFailed','connectionCloseFailed','workerIdentityFailed'])assert.equal(run[key],undefined);
    validateConcurrencyReceipt(run.serverReceipt.value,backend,`http://127.0.0.1:${backend==='nest'?5500:5501}`);validateOwnerCloseout(run,owner);
    for(const worker of [run.workerBefore,run.workerAfter,run.workerAtClose,...run.workerAfterEachCase]){assert.equal(worker.alive,true);assert.deepEqual(worker.processIdentity,run.serverReceipt.value.processIdentity);assert.equal(worker.binarySha256,run.serverReceipt.value.binarySha256);}
    assert.equal(run.workerAfterEachCase.length,16);verifyBindings(run);validateConcurrencyFixtureTrace(run);validateConcurrencyContinuity(run);
    for(const row of run.cases){assert.equal(row.result,'observed');assert.deepEqual(row.captureErrors,[]);assertCaseProofs(row);assertCaseTiming(row);assertStatuses(row);
        assert.deepEqual(row.requests.map(({client,method,path:route,input})=>({client,method,path:route,input})),declaredConcurrencyRequests(run,row));
        for(const proof of row.proofs){assert.deepEqual(proof.worker,run.serverReceipt.value.processIdentity);assert(proof.roots.every((pid)=>[run.coordinatorPids.a,run.coordinatorPids.b].includes(pid)));}
    }
}
function unchangedExcept(before,after,allowed,label) {
    assert.deepEqual(Object.keys(before).sort(),Object.keys(after).sort(),label+' keys');
    for(const key of Object.keys(before))if(!allowed.has(key))assert.deepEqual(after[key],before[key],label+'/'+key);
}
export function validateConcurrencyChanges(run,row) {
    const spec=concurrencyCases.find((entry)=>entry.id===row.id),target=row.target.id,actor=run.identities.users.admin;
    const affectedUsers=new Map();
    if(['user-cas','user-pair','org-cas'].includes(spec.kind))affectedUsers.set(target,new Set(['row_version']));
    if(['nullable','role-change','caller-disable'].includes(spec.kind))affectedUsers.set(target,new Set(['display_name','row_version','updated_at',...(spec.kind==='nullable'?['email','phone','avatar_url','primary_org_unit_id','last_login_at']:[])]));
    if(spec.kind==='caller-disable')affectedUsers.set(actor,new Set(['is_active','row_version','updated_at']));
    const sessionIds=new Set(spec.kind==='session'||spec.kind==='caller-disable'?[row.sessionsBefore.admin0.session.id]:[]);
    for(const table of factTables){
        const previous=new Map(row.before[table].map((entry)=>[entry.id,entry])),current=new Map(row.after[table].map((entry)=>[entry.id,entry]));
        for(const [id,value]of previous){const next=current.get(id);
            if(table==='platform_user'){assert(next);unchangedExcept(value,next,affectedUsers.get(id)??new Set(),row.id+'/'+table);}
            else if(table==='auth_session'){assert(next);if(!sessionIds.has(id))assert.deepEqual(next,value,row.id+'/unconsumed-session');else assert.equal(next.absolute_expires_at,value.absolute_expires_at);}
            else if(table==='role'&&spec.kind==='role-change'&&id===run.identities.roles.admin){unchangedExcept(value,next,new Set(['is_active','row_version','updated_at']),row.id+'/caller-role');assert.equal(next.is_active,false);}
            else if(table==='org_unit'&&spec.kind==='org-fk'&&id===run.identities.orgs.alpha){unchangedExcept(value,next,new Set(['is_active','row_version']),row.id+'/late-org');assert.equal(next.is_active,false);}
            else if((table==='user_role_assignment'&&(spec.kind==='roles'||spec.command==='roles'))||(table==='user_org_membership'&&(['org-cas','org-fk'].includes(spec.kind)||spec.command==='org'))){if(value.user_id!==target)assert.deepEqual(next,value,row.id+'/other-user-relation');}
            else assert.deepEqual(next,value,row.id+'/immutable-or-unaffected/'+table);
        }
        for(const value of current.values())if(!previous.has(value.id)){
            const allowed=table==='audit_log'||table==='security_event'||table==='platform_user'&&spec.kind==='username'||table==='user_role_assignment'&&spec.kind==='roles'&&value.user_id===target||table==='user_org_membership'&&spec.kind==='org-fk'&&value.user_id===target;
            assert(allowed,row.id+': undeclared new row '+table);
        }
    }
    if(['user-cas','user-pair','org-cas'].includes(spec.kind))assert.equal(row.after.platform_user.find((r)=>r.id===target).row_version,row.before.platform_user.find((r)=>r.id===target).row_version+1);
    if(spec.kind==='session'){assert.equal(row.sessionsAfter.admin0.session.rowVersion-row.sessionsBefore.admin0.session.rowVersion,2);if(spec.command==='roles'||spec.command==='org')assert.equal(row.after[spec.command==='roles'?'user_role_assignment':'user_org_membership'].filter((r)=>r.user_id===target).length,0);}
    assert.equal(row.after.audit_log.length-row.before.audit_log.length,spec.auditDelta);
}
export function makeConcurrencyNormalizer(run) {
    const registry=new Map(),reverse=new Set(),counts=new Map(),immutable=new Map(),created=new Map(),absolute=new Map(),secretValues=new Map();
    const clean=(value)=>value.replaceAll(run.runId,'<run>').replaceAll(run.runId.replaceAll('-',''),'<run-compact>').replaceAll(run.runId.slice(0,8),'<run-short>');
    const register=(id,label)=>{assert(uuid.test(id));if(registry.has(id)){assert.equal(registry.get(id),label);return;}assert(!reverse.has(label));registry.set(id,label);reverse.add(label);};
    const label=(id)=>{assert(registry.has(id),'Unknown UUID outside registered run-owned identities');return registry.get(id);};
    for(const kind of ['users','roles','orgs'])for(const [slot,id]of Object.entries(run.identities[kind]))register(id,kind+':'+slot);
    for(const row of run.cases)for(const [client,value]of Object.entries(row.sessionsBefore))register(value.session.id,'session:'+row.id+':'+client);
    const string=(value)=>clean(value.replace(uuidSpelling,(spelling)=>{
        if(spelling.toLowerCase()===run.runId)return spelling===run.runId?'<run>':'<run-uppercase>';
        if(spelling.toLowerCase()===run.runId.replaceAll('-',''))return '<run-compact>';
        const compact=spelling.replaceAll('-','').toLowerCase(),id=compact.length===32?`${compact.slice(0,8)}-${compact.slice(8,12)}-${compact.slice(12,16)}-${compact.slice(16,20)}-${compact.slice(20)}`:null;
        const suffix=!spelling.includes('-')?':compact':spelling!==id?':uppercase':'';return '<'+label(id)+suffix+'>';
    }));
    const relate=(id,base)=>{if(registry.has(id))return;const n=counts.get(base)??0;counts.set(base,n+1);register(id,base+':'+n);};
    for(const row of run.cases)for(const [stage,state]of [['before',row.before],['after',row.after]])for(const table of factTables){
        const rows=state[table].toSorted((a,b)=>{const av=a.occurred_at??a.created_at,bv=b.occurred_at??b.created_at;return av&&bv&&epochMicros(av)!==epochMicros(bv)?epochMicros(av)<epochMicros(bv)?-1:1:0;});
        for(const value of rows){const key=table+':'+value.id;
            for(const field of pastEventKeys)if(value[field]!==undefined&&value[field]!==null)assert(epochMicros(value[field])<=epochMicros(stage==='before'?row.startedAt:row.finishedAt),'Past event timestamp exceeds its actual observation bound');
            if(value.created_at!==undefined){const at=epochMicros(value.created_at);if(created.has(key))assert.equal(created.get(key),at,'Creation time changed across the run');else{created.set(key,at);if(at>=fixedCeiling)assert(at>=epochMicros(run.startedAt)&&at<=epochMicros(row.finishedAt),'New owned creation time outside run');}}
            if(['local_credential','audit_log','security_event'].includes(table)){if(immutable.has(key))assert.deepEqual(value,immutable.get(key),'Historical/credential row changed across the run');else immutable.set(key,value);}
            if(table==='auth_session'){if(absolute.has(value.id))assert.equal(absolute.get(value.id),value.absolute_expires_at);else absolute.set(value.id,value.absolute_expires_at);assert(registry.has(value.id));}
            else if(table==='local_credential')register(value.id,'credential:'+label(value.user_id));
            else if(table==='user_role_assignment')relate(value.id,'user-role:'+label(value.user_id)+':'+label(value.role_id));
            else if(table==='user_org_membership')relate(value.id,'user-org:'+label(value.user_id)+':'+label(value.org_unit_id)+':'+value.membership_type);
            else if(table==='role_permission_assignment')relate(value.id,'role-permission:'+label(value.role_id)+':'+value.permission_key);
            else if(table==='audit_log'||table==='security_event')relate(value.id,table+':'+row.id+':'+value.event_type+':'+(value[table==='audit_log'?'operator_id':'actor_id']===null?'none':label(value[table==='audit_log'?'operator_id':'actor_id']))+':'+(value.target_id?string(value.target_id):value.details?.sessionId?string(value.details.sessionId):''));
            else assert(registry.has(value.id));
            for(const field of fingerprints)if(Object.hasOwn(value,field)){assert(/^[0-9a-f]{64}$/.test(value[field]));const id=label(value.id)+':'+field;if(secretValues.has(id))assert.equal(secretValues.get(id),value[field],'Secret fingerprint changed inside run');else secretValues.set(id,value[field]);}
        }
    }
    const normalize=(value,key='',parent)=>{
        if(value===null)return null;
        if(timeKeys.has(key)){const time=epochMicros(value);return time<fixedCeiling?'<fixed-time:'+time+'>':'<validated-dynamic-time>';}
        if(fingerprints.has(key))return '<stable-fingerprint:'+label(parent.id)+':'+key+'>';
        if(Array.isArray(value))return value.map((child)=>normalize(child));
        if(typeof value==='object')return Object.fromEntries(Object.entries(value).map(([name,child])=>[string(name),normalize(child,name,value)]));
        return typeof value==='string'?string(value):value;
    };
    const facts=(state)=>Object.fromEntries(factTables.map((table)=>[table,Object.fromEntries(state[table].map((value)=>[label(value.id),normalize(value)]).toSorted(([a],[b])=>a.localeCompare(b)))]));
    const temporal=(value)=>value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,child])=>[string(key),temporal(child)])):value;
    return {normalize,facts,string,temporal};
}
export function validateConcurrencyReplies(row) {
    for(const [followup,requests]of [[false,row.requests],[true,row.followups]])for(const request of requests){const method=request.method,route=request.path,operation=route==='/api/platform/users'?(method==='GET'?'list':'create'):route==='/api/auth/profile'?(method==='GET'?'profile':'update-profile'):route.endsWith('/roles')?'assign-roles':route.endsWith('/org-memberships')?'assign-org-memberships':route.endsWith(':deactivate')?'deactivate':'update';validateProjection(request.response,operation,request.status,method);
        if([200,201].includes(request.status)){const body=request.response,fact=row.after.platform_user.find((value)=>value.id===body.id);assert(fact);
            const nullableSnapshot=!followup&&row.id==='self-value-to-null'?row.before.platform_user.find((value)=>value.id===body.id):fact;assert(nullableSnapshot);
            for(const [key,column]of [['id','id'],['username','username'],['displayName','display_name'],['isActive','is_active'],['rowVersion','row_version'],['emailVerified','email_verified'],['phoneVerified','phone_verified'],['createdBy','created_by'],['updatedBy','updated_by']])if(Object.hasOwn(body,key))assert.deepEqual(body[key],fact[column]);
            for(const [key,column]of [['email','email'],['phone','phone'],['avatarUrl','avatar_url']])if(Object.hasOwn(body,key))assert.deepEqual(body[key],nullableSnapshot[column]);
            for(const [key,column]of [['createdAt','created_at'],['updatedAt','updated_at'],['lastLoginAt','last_login_at']])if(Object.hasOwn(body,key)){const expected=key==='lastLoginAt'?nullableSnapshot[column]:fact[column];if(expected===null)assert.equal(body[key],null);else{assert.equal(new Date(body[key]).toISOString(),body[key]);assert.equal(BigInt(Date.parse(body[key])),epochMicros(expected)/1000n);}}
        }
    }
}
export function normalizeConcurrencyRun(run) {
    const {normalize,facts,temporal:normalizeTemporal}=makeConcurrencyNormalizer(run);
    return run.cases.map((row)=>{
        validateConcurrencyChanges(run,row);validateConcurrencyReplies(row);
        const temporal={};for(const client of ['admin0','admin1'])temporal[client]=validateTransition({...row,beforeState:{facts:row.before,snapshot:row.sessionsBefore[client]},afterState:{facts:row.after,snapshot:row.sessionsAfter[client]}});
        const spec=concurrencyCases.find((entry)=>entry.id===row.id),responses=spec.symmetric?{winner:normalize(row.requests.find((r)=>r.status===spec.statuses[0]).response),loser:normalize(row.requests.find((r)=>r.status===spec.statuses[1]).response)}:row.requests.map((request)=>({status:request.status,response:normalize(request.response),setCookieCount:request.setCookieCount}));
        return {id:row.id,requests:normalize(row.requests.map(({client,method,path:route,input})=>({client,method,path:route,input}))),responses,followups:normalize(row.followups.map(({client,method,path:route,input,status,response,setCookieCount})=>({client,method,path:route,...(input===undefined?{}:{input}),status,response,setCookieCount}))),before:facts(row.before),after:facts(row.after),sessionsBefore:normalize(row.sessionsBefore),sessionsAfter:normalize(row.sessionsAfter),temporal:normalizeTemporal(temporal),phaseKinds:row.proofs.map((p)=>p.expectedKind),auditDelta:row.auditDelta,sessionVersionDeltas:row.sessionVersionDeltas};
    });
}
export function compareConcurrencyReports(nest,rust,owners) {
    validateConcurrencyReport(nest,'nest',owners.nest);validateConcurrencyReport(rust,'rust',owners.rust);assert.deepEqual(nest.sourcesBefore,rust.sourcesBefore);assert.deepEqual(nest.originalNestWitnesses,rust.originalNestWitnesses);
    const left=normalizeConcurrencyRun(nest),right=normalizeConcurrencyRun(rust),difference=firstDifference(left,right);if(difference)throw Object.assign(new Error('Concurrency HTTP/facts differ'),{name:'ConcurrencyComparisonError',difference});
    return {formatVersion:1,kind:'r2d-http-concurrency-parity',result:'pass',plan:concurrencyManifest(),comparedCases:16,sourceEpoch:nest.sourcesBefore,comparisons:nest.cases.map((row,index)=>({id:row.id,result:'pass',nestStatuses:row.requests.map((r)=>r.status),rustStatuses:rust.cases[index].requests.map((r)=>r.status)})),normalization:'Only registered run/UUID spellings, per-owned-row stable secret fingerprints and validated dynamic times. Exact fixed microseconds, row time equality/order/change signatures, immutable creation/history, session leases and wire-to-own-row milliseconds remain checked. SQL observer table rows are keyed by registered identity; response/snapshot/changedFields arrays retain order. Only the two declared symmetric cases compare winner/loser responses separately while preserving original request order in input and request-plan comparison.',boundary:'The fixed16 row-lock-controlled HTTP schedules only. Original73 SQL witness, service PG, full sequential HTTP, browser evidence and final G3/G4 remain separate.'};
}
export function parseConcurrencyCompare(args) {assert.equal(args.length,5);const files=args.map((name)=>({name,file:safeEvidencePath(name)}));assert.equal(new Set(files.map((entry)=>entry.file)).size,5);assert(!existsSync(files[4].file));return files;}
export function validateConcurrencyLiveInputs(run) {
    validateSource();const root=path.resolve(import.meta.dirname,'../..');
    assert.deepEqual(run.sourcesBefore,concurrencySourceFiles(),'Every current source file must appear, with its actual hash');
    assert.deepEqual(run.originalNestWitnesses,originalNestReferences(),'Original report metadata must be re-derived from the exact five actual source reports');
    for(const entry of run.sourcesBefore){assert(typeof entry.file==='string'&&!entry.file.includes('\\')&&!entry.file.includes(':')&&!path.posix.isAbsolute(entry.file)&&entry.file.split('/').every((part)=>part&&part!=='.'&&part!=='..'));let cursor=root;for(const part of entry.file.split('/')){cursor=path.join(cursor,part);assert(!lstatSync(cursor).isSymbolicLink());}assert.equal(hash(readFileSync(cursor)),entry.sha256,'Current source epoch differs from frozen HTTP run');}
    const receiptBytes=readFileSync(safeEvidencePath(run.serverReceipt.file,true));assert.equal(hash(receiptBytes),run.serverReceipt.sha256);assert.deepEqual(validateConcurrencyReceipt(JSON.parse(receiptBytes),run.backend,run.serverReceipt.value.origin),run.serverReceipt.value);
    for(const reference of run.originalNestWitnesses)assert.equal(hash(readFileSync(safeEvidencePath(reference.file))),reference.sha256);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    const files=parseConcurrencyCompare(process.argv.slice(2));let result;const inputs=[];
    try{for(const entry of files.slice(0,4)){const bytes=readFileSync(entry.file);inputs.push({...entry,bytes});}const [nest,rust,nestOwner,rustOwner]=inputs.map((entry)=>JSON.parse(entry.bytes));validateConcurrencyLiveInputs(nest);validateConcurrencyLiveInputs(rust);result=compareConcurrencyReports(nest,rust,{nest:nestOwner,rust:rustOwner});}
    catch(error){result={formatVersion:1,kind:'r2d-http-concurrency-parity',result:'fail',failure:{name:error.name,...(error.difference?{difference:error.difference}:{})},boundary:'Original input reports retained; no parity or G3 claim.'};process.exitCode=1;}
    result.inputs=inputs.map((entry)=>({file:entry.name,rawSha256:hash(entry.bytes)}));writeFileSync(files[4].file,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({result:result.result,comparedCases:result.comparedCases,failure:result.failure,output:files[4].name}));
}
