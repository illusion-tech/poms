// One frozen joint25 v3 session only. No I/O or ownership operation.
import assert from'node:assert/strict';
import{createHash}from'node:crypto';
import{domainClockDigest as digest}from'./comparison-api-domain-clock.mjs';
import{fiveCauseInstant as instant}from'./compare-api-five-cause.mjs';
import{committedFiveNativeAuthUpdates}from'./compare-api-five-auth-cause.mjs';
import{verifyFiveCapturedResponseEnrichment}from'./compare-api-five-write-enrichment.mjs';
import{fiveV3AuthSourcePins}from'./compare-api-five-v3-source-pins.mjs';
export{fiveV3AuthSourcePins};
export const fiveV3SessionInput=Object.freeze({sourceCapId:'r2m-joint25',slot:'m3.uow.v3.auth_session.1',caseId:'m3.uow.v3',birthIndex:126,writerIndex:139,
    observationCounts:{nest:37,rust:31},countsAreThisFrozenPairInputOnly:true});
const sha=value=>createHash('sha256').update(value).digest('hex'),same=(a,b)=>digest(a)===digest(b),one=(rows,test,label)=>{const found=rows.filter(test);assert.equal(found.length,1,label);return found[0]},key=c=>[c.runId,c.caseId,c.index,c.op].join('|');
function issuedCookie(response,name){const values=(response.setCookie??[]).flatMap(header=>{const first=header.split(';',1)[0],at=first.indexOf('=');return at>0&&first.slice(0,at)===name&&first.slice(at+1)?[decodeURIComponent(first.slice(at+1))]:[]});assert.equal(values.length,1);assert(/^[A-Za-z0-9_-]{43}$/.test(values[0]));return values[0]}

export function verifyFiveV3AuthSource({sourceCap,sourceBytes,producerProof,producerRaw}){
    assert(sourceCap.id===fiveV3SessionInput.sourceCapId&&sourceBytes instanceof Map&&producerProof?.sourceCapId===sourceCap.id);
    const texts=new Map();for(const expected of fiveV3AuthSourcePins){const pin=one(sourceCap.files,p=>p.file===expected.file,'One exact original v3 caller source'),raw=sourceBytes.get(expected.file);assert(pin.rawBytesSha256===expected.rawBytesSha256&&pin.bytes===expected.bytes&&Buffer.isBuffer(raw)&&raw.length===expected.bytes&&sha(raw)===expected.rawBytesSha256);texts.set(expected.file,raw.toString('utf8').replace(/\s+/g,' '))}
    const check=(file,parts)=>{const text=texts.get(file);for(const part of parts)assert(text?.includes(part),'Exact original v3 source site required: '+file)};
    check('apps/poms-api/src/migrations/Migration20260513100000_ex66b_auth_session.ts',['"row_version" int not null default 1']);
    check('apps/poms-api/src/app/core/auth/auth-session.entity.ts',["rowVersion: p.integer().version().default(1)"]);
    check('apps/poms-api/src/app/core/auth/auth-session.service.ts',['const now = options.now ?? new Date();','lastSeenAt: now','absoluteExpiresAt','idleExpiresAt']);
    check('apps/poms-api-rust/src/auth/service.rs',['let initial = session.clone();','if elapsed_seconds >= throttle_seconds','store::touch_last_seen_if_due(','let pending_flush = SessionFlush::between(&initial, &session);']);
    check('apps/poms-api-rust/src/auth/model.rs',['expected_version: after.row_version','changes.last_seen_at.is_some()','changes.idle_expires_at.is_some()','DateTime::from_timestamp_millis(now.timestamp_millis())']);
    check('apps/poms-api-rust/src/auth/store.rs',['row_version=row_version+1,updated_at=$1','row_version=row_version+1 WHERE id=$18 AND row_version=$19 RETURNING row_version','updated_at.unwrap_or_else(clock_now)','let created_at = clock_now();']);
    check('apps/poms-api-rust/src/approval/http.rs',['PendingAuthentication::from_resolved(&resolved)','CommonSession::borrow_with_participant(','Op::Approve =>','approve_with_session(&mut session, id, actor, input)','Ok(Ok(output)) => ApiError::raw_json(StatusCode::OK']);
    check('apps/poms-api-rust/src/approval/context.rs',['pending: session.pending_flush.clone()','self.pending.as_ref().map(|_| clock_now())','if let Some(pending) = self.pending.take()','flush_managed_session_at(connection, &pending, updated_at)']);
    check('apps/poms-api-rust/src/approval/service.rs',['resolve_public_decision_with(','ApprovalDecision::Approved']);
    check('apps/poms-api-rust/src/approval_common/service.rs',['store::flush(&mut borrowed).await','Ok(value) => match tx.commit().await','*session.state = child;']);
    check('apps/poms-api-rust/src/approval_common/store.rs',['participant.prepare_flush();','groups.push(FlushGroup::Participant);','participant.flush_once(&mut *session.connection).await?;']);
    check('apps/poms-api-rust/src/approval_common/session.rs',['pub participant: Option<','participant: Some(participant)']);
    assert(Buffer.isBuffer(producerRaw)&&sha(producerRaw)===producerProof.source.rawBytesSha256);
    assert(producerRaw.toString('utf8').includes("await send('initial-final-candidate-approve',{method:'POST',path:'/approval-records/'+initial.id+':approve',body:{expectedVersion:initial.row_version}},{session:'finance',executionBackend:f.backend"));
    return Object.freeze({kind:'M3-one-v3-session-default-touch-and-once-participant-source',sourceCapId:sourceCap.id,sources:fiveV3AuthSourcePins,derivedInitialVersion:1,
        sourceActor:one(producerProof.actorSources,a=>a.label==='finance','Original source command explicitly selects finance'),sourceDefaultThrottleSeconds:60,sourceIdleSeconds:900,sourceAbsoluteSeconds:28800});
}

export function createFiveV3AuthVersionEvidence({journal,admissions,records,sourceProof,writeEnrichmentSource,internal}){
    assert(sourceProof?.kind==='M3-one-v3-session-default-touch-and-once-participant-source'&&sourceProof.sourceCapId===fiveV3SessionInput.sourceCapId);
    const admission=one(admissions,a=>a.slot===fiveV3SessionInput.slot&&a.table==='auth_session','Only the one declared v3 typed admission'),object=one(journal.objects,o=>o.table==='auth_session'&&o.id===admission.identity.id,'One already-owned v3 session');
    assert(object.caseId===fiveV3SessionInput.caseId&&object.postcondition?.independentlyVisible===true&&same(admission.identity,object.identity));assert.equal(admission.certificateSha256,digest({creationProof:object.creationProof,postcondition:object.postcondition}));
    const birthContext=object.creationProof.createContext;assert(birthContext.runId===journal.runId&&birthContext.caseId===fiveV3SessionInput.caseId&&birthContext.index===fiveV3SessionInput.birthIndex&&birthContext.op==='m.http');
    assert(!(journal.mutations??[]).some(m=>m.table==='auth_session'&&m.id===object.id),'A fixture mutation cannot become the declared source variance');
    const items=records.map(r=>({kind:r.data.kind,record:r.data.record,ordinal:r.ordinal})),requests=items.filter(i=>i.kind==='actual-request-private-cookies-body-and-SDK-PG').map(i=>({...i.record,ordinal:i.ordinal}));
    const pre=new Map(items.filter(i=>i.kind==='actual-API-original-SDK-PG-and-queryPID-before-certification').map(i=>[key(i.record.context),i])),post=new Map(items.filter(i=>i.kind==='actual-API-post-certification-request-write-outcome').map(i=>[key(i.record.context),i]));
    const birth=one(requests,r=>same(r.context,birthContext),'Exact original issued-login context');assert(birth.method==='POST'&&birth.path==='/api/auth/sessions'&&birth.executionBackend===journal.backend&&birth.response.status===200&&birth.response.transportComplete===true);
    const token=sha(issuedCookie(birth.response,'poms_session')),csrf=sha(issuedCookie(birth.response,'poms_csrf'));assert.equal(token,object.identity.token_hash);assert.equal(birth.response.body?.user?.id,object.identity.user_id);assert.equal(object.identity.user_id,sourceProof.sourceActor.userId);
    const sourceLogin=one(items,i=>i.kind==='actual-producer-command-input'&&i.record.caseId===fiveV3SessionInput.caseId&&i.record.id==='login-'+sourceProof.sourceActor.label,'Typed user binds its original source login');assert(sourceLogin.ordinal<birth.ordinal&&sourceLogin.record.method==='POST'&&sourceLogin.record.path===birth.path);assert.equal(sourceLogin.record.body?.username,sourceProof.sourceActor.username);
    const own=requests.filter(r=>r.response.sentSessionTokenSha256===token);assert.equal(own.length,1,'This frozen v3 cookie has exactly one actual consumer');const request=own[0];assert(request.context.runId===journal.runId&&request.context.caseId===fiveV3SessionInput.caseId&&request.context.index===fiveV3SessionInput.writerIndex&&request.context.op==='m.http');
    assert(request.method==='POST'&&/^\/api\/approval-records\/[0-9a-f-]{36}:approve$/.test(request.path)&&request.executionBackend===journal.backend&&request.response.status===200&&request.response.transportComplete===true);
    const sourceCommand=one(items,i=>i.kind==='actual-producer-command-input'&&i.record.caseId===fiveV3SessionInput.caseId&&i.record.id==='initial-final-candidate-approve','Exact source writer command');assert(sourceCommand.ordinal>birth.ordinal&&sourceCommand.ordinal<request.ordinal&&sourceCommand.record.method===request.method&&sourceCommand.record.path===request.path);
    const original=[];for(const r of[birth,request]){const before=pre.get(key(r.context));assert(before);original.push(verifyFiveCapturedResponseEnrichment({pre:before,post:post.get(key(r.context)),request:r,sourceProof:writeEnrichmentSource,sourceCapId:sourceProof.sourceCapId}));}
    const birthRecord=pre.get(key(birth.context)).record,sdk=birthRecord.committedCreates.filter(c=>c.table==='auth_session'&&c.id===object.id),pg=birthRecord.pgRows.filter(c=>c.table==='auth_session'&&c.id===object.id);assert.equal(pg.length,1);assert(same(pg[0].proof.createContext,birthContext)&&pg[0].proof.outerCommitObserved===true);
    if(journal.backend==='nest'){assert.equal(sdk.length,1);assert(object.creationProof.kind==='mikro-orm-afterCreate-outer-commit'&&same(sdk[0].proof,object.creationProof)&&same(object.creationProof.commitContext,birthContext));}
    else{assert(journal.backend==='rust'&&object.creationProof.kind==='pg-after-insert-observed-outer-commit');assert.equal(sdk.length,0);assert(same(pg[0].proof,object.creationProof));}
    const observations=[];function take(frame,position){assert(frame?.tables?.length===107&&frame.runId===journal.runId&&frame.backend===journal.backend);const rows=one(frame.tables,t=>t.table==='auth_session','Complete actual auth table').rows.filter(row=>row.id===object.id);if(!rows.length)return;assert.equal(rows.length,1);observations.push({row:rows[0],...position});}
    for(const item of items){if(item.kind==='complete-full107-private-facts')take(item.record,{kind:'ordinary-full107',ordinal:item.ordinal});if(item.kind==='actual-full-internal-uow-private')for(const phase of['before','after'])if(item.record[phase]?.tables)take(item.record[phase],{kind:'actual-internal-full107',phase,context:item.record.context});}
    assert.equal(observations.length,fiveV3SessionInput.observationCounts[journal.backend],'Consume every retained observation in this frozen pair input');
    for(const observed of observations)if(observed.kind==='actual-internal-full107')assert(observed.context?.runId===journal.runId&&observed.context.op==='m.internal-uow'&&observed.context.index>request.context.index,'Use actual internal capture context, not late file retention order');else assert(observed.ordinal>request.ordinal,'No invented pre-request full row');
    const first=observations[0].row,birthStart=instant(birth.response.window.startedAt),birthEnd=instant(birth.response.window.finishedAt),start=instant(request.response.window.startedAt),end=instant(request.response.window.finishedAt);
    assert(first.id===object.id&&first.user_id===object.identity.user_id&&first.token_hash===token&&first.csrf_token_hash===csrf&&first.status==='active'&&first.revoked_at===null&&first.revoked_reason===null);
    for(const column of['created_at','updated_at','last_seen_at','idle_expires_at','absolute_expires_at'])assert.equal(instant(first[column])%1000n,0n,'Only these exact JS-Date/clipped-Rust-clock auth cells have source millisecond precision');
    const initialClock=instant(first.absolute_expires_at)-28800000000n;assert(initialClock>=birthStart&&initialClock<=birthEnd,'Original unchanged absolute expiry projects only its source birth-clock interval');assert(instant(first.created_at)>=birthStart&&instant(first.created_at)<=birthEnd);assert(first.last_ip===first.created_ip);
    const initialIdle=instant(birth.response.body.expiresAt);assert.equal(initialIdle,initialClock+900000000n,'Actual issued expiry binds the initial source15min idle lifetime');assert(instant(first.absolute_expires_at)>end&&instant(first.idle_expires_at)>end);
    const nativeSql=pre.get(key(request.context)).record.originalNativeSql;
    if(journal.backend==='nest'){
        assert(end-birthStart<60000000n,'Even the earliest possible initial lastSeen is not due');assert.equal(committedFiveNativeAuthUpdates({sql:nativeSql,request,ordinal:request.ordinal,sessionId:object.id}).length,0);
        assert(nativeSql.some(q=>q.phase==='end'&&q.command==='SELECT'&&q.sqlShape?.replaceAll('"','').includes('from poms.auth_session ')&&q.sqlShape.includes('token_hash')&&q.rowCount===1),'Actual Native session resolution query required');
        assert.equal(first.row_version,1);assert.equal(instant(first.last_seen_at),initialClock);assert.equal(instant(first.idle_expires_at),initialIdle);assert(instant(first.updated_at)>=birthStart&&instant(first.updated_at)<=birthEnd);
    }else{
        assert.equal(nativeSql.length,0,'Actual Rust approval cannot borrow Native query effects');assert(start-birthEnd>=60000000n,'Even the latest possible initial lastSeen is due');assert.equal(first.row_version,sourceProof.derivedInitialVersion+2,'One original Rust store touch plus once-only committed common participant');
        const seen=instant(first.last_seen_at),updated=instant(first.updated_at);assert(seen>=start&&seen<=end&&seen-initialClock>=60000000n);assert(updated>=seen&&updated<=end);assert.equal(instant(first.idle_expires_at),seen+900000000n);
    }
    for(const observed of observations)assert(same(observed.row,first),'Every whole observed v3 physical version must retain the independently proved state');
    assert(internal?.observations?.length===4);
    const approvalId=request.path.slice('/api/approval-records/'.length,-':approve'.length),businessFrame=one(internal.observations,world=>world.captured.context.caseId===fiveV3SessionInput.caseId,'One already-validated final world source capture').captured.after;
    const business=(table,id)=>{assert(journal.objects.some(o=>o.table===table&&o.id===id&&o.postcondition?.independentlyVisible));return one(one(businessFrame.tables,t=>t.table===table,'Complete actual business table').rows,r=>r.id===id,'Already-owned business result row');};
    const approval=business('approval_record',approvalId);assert(approval.current_status==='approved'&&approval.decision==='approved'&&approval.current_approver_user_id===null);for(const column of['decided_at','closed_at'])assert(instant(approval[column])>=start&&instant(approval[column])<=end);
    assert(request.response.body.resultStatus==='approved'&&request.response.body.approvalRecordId===approval.id&&request.response.body.targetId===approval.target_object_id&&request.response.body.targetType===approval.target_object_type);
    assert.equal(approval.target_object_type,'commission-payout');const payout=business('commission_payout',approval.target_object_id);assert(payout.status==='approved'&&payout.project_id===approval.project_id&&request.response.body.businessStatusAfter==='approved');assert(instant(payout.approved_at)>=start&&instant(payout.approved_at)<=end);
    const versions=new Set(observations.map(o=>o.row.row_version));
    return Object.freeze({allows(slot,version){return slot===fiveV3SessionInput.slot&&versions.has(version)},receipt(){return{kind:'M3-one-declared-v3-issued-session-source-effects',slot:fiveV3SessionInput.slot,sourceCapId:sourceProof.sourceCapId,derivedInitialVersion:1,birthRowVersionCaptured:false,fullBirthRowCaptured:false,
        actualObservedVersions:[...versions],actualObservationCount:observations.length,birthContext,consumerContext:request.context,actualIssuedCookieAndTypedUserBound:true,actualCSRFCookieStoredHashBound:true,actualBusinessApprovalCommitted:true,
        lastSeenThresholdEvidence:journal.backend==='nest'?'whole-creation-window-not-due':'whole-creation-window-due',effects:journal.backend==='nest'?[]:[{kind:'Rust-original-conditional-store-touch',count:1},{kind:'Rust-original-once-common-participant-flush',count:1}],
        RustUpdateSQLTraceCaptured:false,NativeSQLUsedAsRustEvidence:false,source:sourceProof,responseEnrichment:original,retentionOrdinalTreatedAsInternalCaptureTime:false,numericEqualityClaimed:false,versionsReplacedWithAliases:false,ownershipGranted:false}}});
}
