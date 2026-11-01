// Independent common CSRF business effect; this is not a throttle variance.
import assert from'node:assert/strict';
import{createHash}from'node:crypto';
import{domainClockDigest as digest}from'./comparison-api-domain-clock.mjs';
import{fiveCauseInstant}from'./compare-api-five-cause.mjs';
export const fiveCsrfProducerSource=Object.freeze({file:'tools/rust-r2m/acceptance-producers.mjs',bytes:18925,rawBytesSha256:'0d8f105eea67eafd757ace6d3ab1734dfcff99e6f711caf42ae1ca23e720eb02'});
export const fiveCsrfSqlShape='update "poms"."auth_session" set "csrf_token_hash" = ?text, "row_version" = "row_version" + ?number, "updated_at" = ?text where "id" = ?text and "status" = ?text and "idle_expires_at" > ?text and "absolute_expires_at" > ?text returning "status" as "status", "csrf_token_hash" as "csrfTokenHash", "idle_expires_at" as "idleExpiresAt", "absolute_expires_at" as "absoluteExpiresAt", "last_seen_at" as "lastSeenAt", "last_ip" as "lastIp", "revoked_at" as "revokedAt", "revoked_reason" as "revokedReason", "row_version" as "rowVersion", "updated_at" as "updatedAt" ;';
const sha=value=>createHash('sha256').update(value).digest('hex'),same=(a,b)=>digest(a)===digest(b),one=(rows,test,label)=>{const matches=rows.filter(test);assert.equal(matches.length,1,label);return matches[0]},contextKey=c=>[c.runId,c.caseId,c.index,c.op].join('|');
const cookie=(response,name)=>{const matches=(response.setCookie??[]).flatMap(value=>{const first=value.split(';',1)[0],at=first.indexOf('=');return at>0&&first.slice(0,at)===name&&first.slice(at+1)?[decodeURIComponent(first.slice(at+1))]:[]});assert.equal(matches.length,1,'One original issued cookie required');assert(/^[A-Za-z0-9_-]{43}$/.test(matches[0]));return matches[0]};

export function verifyFiveCsrfProducerSource({sourceCap,raw,causeSource}){
    assert(causeSource?.kind==='M3-thirteen-exact-source-cause-projection'&&causeSource.sourceCapId===sourceCap.id);
    const pin=one(sourceCap.files,item=>item.file===fiveCsrfProducerSource.file,'Original M3 login producer source required');
    assert(pin.rawBytesSha256===fiveCsrfProducerSource.rawBytesSha256&&pin.bytes===fiveCsrfProducerSource.bytes&&Buffer.isBuffer(raw)&&raw.length===pin.bytes&&sha(raw)===pin.rawBytesSha256);
    const text=raw.toString('utf8');assert(text.includes("await send('login-'+session+'-csrf',{method:'GET',path:'/auth/csrf-token'},{executionBackend:f.backend,session});"));
    assert(text.includes("await send('login-'+session,{method:'POST',path:'/auth/sessions',body:publicSeedCredentials(sourceReader,username)},{executionBackend:f.backend,session,watch:[watches('auth_session',{user_id:id})]});"));
    assert(text.includes("const VP='00000000-0000-4000-8000-000000000008',FINANCE='00000000-0000-4000-8000-000000000014';"));
    assert(text.includes("for(const[session,username,id]of[['approver','vp_owner',VP],['finance','finance_mgr',FINANCE]])"));
    const actorSources=Object.freeze([{label:'approver',username:'vp_owner',userId:'00000000-0000-4000-8000-000000000008'},{label:'finance',username:'finance_mgr',userId:'00000000-0000-4000-8000-000000000014'}].map(Object.freeze));
    return Object.freeze({kind:'M3-original-paired-CSRF-producer-source',sourceCapId:sourceCap.id,source:fiveCsrfProducerSource,actorSources});
}

export function proveFivePairedCsrfRotation({journal,target,requests,frames,items,nativeEffects,sourceProof}){
    assert(sourceProof?.kind==='M3-original-paired-CSRF-producer-source'&&sourceProof.sourceCapId);
    assert(target.name==='retention-approve');
    const request=one(requests,r=>r.context.caseId==='m3.uow.v0'&&r.method==='GET'&&r.path==='/api/auth/csrf-token','One original old-cookie source CSRF GET required');
    assert(request.context.runId===journal.runId&&request.context.op==='m.http'&&request.executionBackend===journal.backend&&Number.isSafeInteger(request.context.index));
    assert(request.response.status===200&&request.response.transportComplete===true&&request.response.sentSessionTokenSha256===target.token);
    const beforeFrame=frames.filter(f=>f.ordinal<request.ordinal).sort((a,b)=>b.ordinal-a.ordinal)[0],afterFrame=frames.filter(f=>f.ordinal>request.ordinal).sort((a,b)=>a.ordinal-b.ordinal)[0];
    assert(beforeFrame&&afterFrame,'Actual nearest original full107 boundaries required');
    const row=frame=>one(one(frame.raw.tables,t=>t.table==='auth_session','Original complete auth table required').rows,r=>r.id===target.id,'Original typed old session required');
    const before=row(beforeFrame),after=row(afterFrame);assert(before.status==='active'&&after.status==='active'&&before.id===target.id&&before.token_hash===target.token&&after.token_hash===target.token);
    const between=requests.filter(r=>r.ordinal>beforeFrame.ordinal&&r.ordinal<afterFrame.ordinal).sort((a,b)=>a.ordinal-b.ordinal);
    assert.equal(between.length,2,'Only the actual CSRF GET and following login may use this old cookie in the original boundary span');assert.strictEqual(between[0],request);
    const login=between[1];assert(login.method==='POST'&&login.path==='/api/auth/sessions'&&login.context.runId===journal.runId&&login.context.caseId===request.context.caseId&&login.context.index===request.context.index+1&&login.context.op==='m.http'&&login.executionBackend===journal.backend&&login.response.status===200&&login.response.transportComplete===true);
    const sourceInputs=items.filter(item=>item.kind==='actual-producer-command-input'&&item.record.caseId===request.context.caseId);
    const actorSource=one(sourceProof.actorSources??[],actor=>actor.userId===before.user_id,'Typed old session user must select one exact original source actor');
    const csrfInput=one(sourceInputs,item=>item.record.id==='login-'+actorSource.label+'-csrf','Exact original typed-user producer step required'),loginInput=one(sourceInputs,item=>item.record.id==='login-'+actorSource.label,'Exact original typed-user following login step required');
    assert.equal(loginInput.record.body?.username,actorSource.username,'Original source credentials must select that same typed seed principal');
    assert(csrfInput.record.method==='GET'&&csrfInput.record.path===request.path&&csrfInput.ordinal<request.ordinal&&csrfInput.ordinal>beforeFrame.ordinal);
    assert(loginInput.record.method==='POST'&&loginInput.record.path===login.path&&loginInput.ordinal>request.ordinal&&loginInput.ordinal<login.ordinal);
    const token=request.response.body?.token;assert(typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token));
    assert(request.response.body.cookieName==='poms_csrf'&&request.response.body.headerName==='X-CSRF-Token');
    const newHash=sha(token);assert.equal(sha(cookie(request.response,'poms_csrf')),newHash);assert.equal(after.csrf_token_hash,newHash);assert.notEqual(before.csrf_token_hash,newHash);
    assert.notEqual(sha(cookie(login.response,'poms_session')),target.token,'The following actual login replaces its cookie, not the old typed session');
    assert.equal(login.response.body?.user?.id,before.user_id);
    const start=fiveCauseInstant(request.response.window.startedAt),end=fiveCauseInstant(request.response.window.finishedAt),old=fiveCauseInstant(before.last_seen_at),due=start-old>=60000000n;
    assert(due||end-old<60000000n,'A threshold-crossing source interval cannot establish a touch predicate');
    const delta=1+(due?1:0);assert.equal(after.row_version,before.row_version+delta,'One common rotation plus an independently due store touch only');
    const variable=new Set(['csrf_token_hash','row_version','updated_at',...(due?['last_seen_at','idle_expires_at']:[])]);
    assert.deepEqual(Object.keys(before).sort(),Object.keys(after).sort());for(const column of Object.keys(before))if(!variable.has(column))assert(same(before[column],after[column]),'Unrelated old-session column changed');
    const updated=fiveCauseInstant(after.updated_at);assert(updated>=start&&updated<=end);
    if(due){const seen=fiveCauseInstant(after.last_seen_at);assert(seen>=start&&seen<=end);const idle=seen+900000000n,absolute=fiveCauseInstant(after.absolute_expires_at);assert.equal(fiveCauseInstant(after.idle_expires_at),idle<absolute?idle:absolute)}
    const expiry=fiveCauseInstant(after.idle_expires_at)<fiveCauseInstant(after.absolute_expires_at)?fiveCauseInstant(after.idle_expires_at):fiveCauseInstant(after.absolute_expires_at);assert.equal(expiry%1000n,0n,'This actual JS-Date lifecycle expiry has exact millisecond precision');
    const expiration=new Date(Number(expiry/1000n)).toISOString();
    assert.equal(request.response.body.expiresAt,expiration,'The original minDate DTO projects this exact typed current session expiry');
    const ownEffects=nativeEffects.filter(event=>event.sessionId===target.id&&event.index===request.context.index);
    if(journal.backend==='nest'){
        assert.equal(ownEffects.filter(e=>e.mode==='native-conditional-csrf-rotation').length,1);
        assert.equal(ownEffects.filter(e=>e.mode==='native-conditional-touch').length,due?1:0);assert.equal(ownEffects.length,delta);
        assert(!nativeEffects.some(e=>e.sessionId===target.id&&e.index===login.context.index),'Actual following login must not update the old session');
    }else assert.equal(ownEffects.length,0,'Actual Rust CSRF cannot borrow Native SQL');
    const rotation={mode:journal.backend==='nest'?'native-conditional-csrf-rotation':'rust-observed-source-csrf-rotation',sessionId:target.id,index:request.context.index,ordinal:request.ordinal,window:request.response.window};
    return{rotation,newHash,oldHash:before.csrf_token_hash,due,additionalEffects:journal.backend==='rust'?[...(due?[{...rotation,mode:'rust-observed-source-store-touch'}]:[]),rotation]:[],
        proof:{kind:'M3-independent-paired-CSRF-rotation-business-effect',sourceCapId:sourceProof.sourceCapId,context:{...request.context},actualOldCookieAndTypedSession:true,sourceActorLabel:actorSource.label,sourceUsername:actorSource.username,sourceActorDerivedFromTypedUserId:true,logicalRetentionLabelUsedAsIdentity:false,commonRotationCount:1,independentTouchCount:due?1:0,bodyCookieStoredHashBound:true,
            beforeFrameOrdinal:beforeFrame.ordinal,afterFrameOrdinal:afterFrame.ordinal,boundariesAreOriginalNearestFramesNotPerRequest:true,sameCookieRequestCount:between.length,SQLParameterBytesCaptured:false,csrfTreatedAsThrottleVariance:false,versionAlias:false,ownershipGranted:false}};
}
