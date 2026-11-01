// Pure SQL trace replay only. No I/O, physical-version projection or ownership.
import assert from 'node:assert/strict';

export const m4SessionSqlSlots=Object.freeze(['m.bootstrap.admin.auth_session.0','m.bootstrap.viewer.auth_session.0']);
export const m4NativeSessionSqlShapes=Object.freeze({
    touch:'update "poms"."auth_session" set "last_seen_at" = ?text, "last_ip" = coalesce(?text, "last_ip"), "idle_expires_at" = least(?text, "absolute_expires_at"), "row_version" = "row_version" + ?number, "updated_at" = ?text where "id" = ?text and "status" = ?text and "last_seen_at" <= ?text and "idle_expires_at" > ?text and "absolute_expires_at" > ?text returning "last_seen_at" as "lastSeenAt", "last_ip" as "lastIp", "idle_expires_at" as "idleExpiresAt", "row_version" as "rowVersion", "updated_at" as "updatedAt";',
    coflush:'update "poms"."auth_session" set "idle_expires_at" = ?text, "last_seen_at" = ?text, "updated_at" = ?text, "row_version" = "row_version" + ?number where "id" = ?text and "row_version" = ?number returning "row_version"'
});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const shape=value=>{assert.equal(typeof value,'string');return value.trim().toLowerCase().replace(/\s+/g,' ').replace(/;$/,'')};
export const m4VersionSqlErrorMetadataPin=Object.freeze({file:'tmp/rust-r2m-continuation01/m4-original-sql-error-transaction-metadata01.json',bytes:43709,rawBytesSha256:'51cdadce95db65a77ada228336873766042e1e9ab3473bdb41f81ef4496dd53e'});
const pinEqual=(left,right)=>{for(const key of['file','bytes','rawBytesSha256'])assert.equal(left?.[key],right?.[key])};
const errorQueryFields=['queryId','backendPid','sequence','at','command','relations','sqlShape','sqlSha256','code'];
const recoveryFields=['queryId','backendPid','sequence','at','command','sqlShape','sqlSha256','resultCommands'];
function expectedFailures(admission,{journalBackend,sessionSlot,request,ordinal}){
    if(admission===null)return new Map();
    assert(journalBackend==='nest'&&sessionSlot===m4SessionSqlSlots[0]&&request.context.index===11&&request.context.op==='m.http');
    assert(admission.kind==='M4-original-version-complete-unrelated-SQL-failures'&&admission.sourceCapId==='r2m-c01-joint01'&&admission.logicalStep==='M4.1.version-complete');
    pinEqual(admission.metadataPin,m4VersionSqlErrorMetadataPin);pinEqual(admission.requestRef,request.ref);
    assert.deepEqual(admission.context,request.context);assert.equal(admission.outcomeOrdinal,ordinal);assert.equal(admission.method,request.method);assert.equal(admission.path,request.path);
    assert(request.method==='POST'&&/^\/api\/attachment-upload-sessions\/[0-9a-f-]{36}:complete$/.test(request.path)&&request.response.status===500&&admission.status===500);
    const proof=admission.sourceProof;assert(proof?.kind==='M4-original-unprepared-version-complete-negative-source'&&proof.sourceCapId==='r2m-c01-joint01'&&Array.isArray(proof.sourceReads)&&proof.sourceReads.length>0);
    for(const pin of proof.sourceReads)assert(typeof pin.file==='string'&&/^[0-9a-f]{64}$/.test(pin.rawBytesSha256));
    assert(Array.isArray(admission.failures)&&admission.failures.length===2);const result=new Map();
    for(const item of admission.failures){assert(!result.has(item.queryId));assert(item.command==='INSERT'&&item.code==='23505'&&item.sqlSha256==='95b419dca44f1d4ae3c0d67dde9dda3a97ffa8b05cfb5db89501255782af7a48');assert.deepEqual(item.relations,['attachment']);assert(Number.isSafeInteger(item.transactionBeginQueryId)&&item.rollback?.command==='ROLLBACK');result.set(item.queryId,{expected:item,seen:false,recovered:false})}
    return result;
}
const actualTag=(query,tag)=>assert.deepEqual(query.resultCommands,[tag],'Actual transaction result tag must match its SQL command');
const touchesAuth=query=>query.relations?.includes('auth_session')||/^(?:update|insert into|delete from|select .* from)\s+(?:"?poms"?\.)?"?auth_session"?(?:\s|$)/.test(shape(query.sqlShape));

// A must supply its already-qualified exact-microsecond attachmentInstant,
// actual raw SQL/request and typed issued-cookie session binding. This helper
// verifies SQL effects; it does not establish that external typed binding.
export function replayM4NativeSessionSql({journalBackend,sessionSlot,sessionId,sql,request,ordinal,instant,nonAuthFailureAdmission=null}){
    assert(['nest','rust'].includes(journalBackend)&&m4SessionSqlSlots.includes(sessionSlot));
    assert(uuid.test(sessionId)&&uuid.test(request?.context?.runId));
    assert(request.context.caseId==='m4.integration'&&Number.isSafeInteger(request.context.index)&&request.context.index>0);
    assert.equal(request.executionBackend,'nest','Only actual original Native SQL can be replayed here');
    assert.equal(request.context.op,journalBackend==='nest'?'m.http':'m.producer');
    assert(Number.isSafeInteger(ordinal)&&ordinal>0&&Array.isArray(sql)&&typeof instant==='function');
    const time=value=>{const result=instant(value);assert.equal(typeof result,'bigint');return result};
    const window=request.response?.window;assert(window&&time(window.startedAt)<=time(window.finishedAt));
    const producer=journalBackend==='rust';
    if(producer)assert((request.context.index===20&&request.method==='GET'&&/^\/api\/project-handovers\/[0-9a-f-]{36}$/.test(request.path))||
        (request.context.index===21&&request.method==='POST'&&/^\/api\/project-handovers\/[0-9a-f-]{36}:confirm$/.test(request.path)),
        'Only the two original fixed-dispatch M4 handover producer requests');
    const failures=expectedFailures(nonAuthFailureAdmission,{journalBackend,sessionSlot,request,ordinal}),unrelatedErrors=[];
    const starts=new Map(),transactions=new Map(),committed=[];let authUpdateStatements=0;
    for(const [traceOrdinal,q] of sql.entries()){
        assert.deepEqual(q.context,request.context);assert(q.captureIncomplete!==true);
        assert(q.queryId!==undefined&&q.queryId!==null);
        if(q.phase==='start'){assert(!starts.has(q.queryId));starts.set(q.queryId,q);continue;}
        assert(q.phase==='end'||q.phase==='error','Only a paired actual end or source-bound error is a complete query terminal');
        const start=starts.get(q.queryId);assert(start&&start.backendPid===q.backendPid&&start.sqlSha256===q.sqlSha256&&start.sqlShape===q.sqlShape);
        assert.equal(start.command,q.command);assert.deepEqual(start.relations,q.relations);assert.equal(start.connection,q.connection);
        assert(Number.isSafeInteger(q.backendPid)&&q.backendPid>0);starts.delete(q.queryId);assert(time(start.at)<=time(q.at));
        const s=shape(q.sqlShape),pid=q.backendPid,push=event=>{const stack=transactions.get(pid),effect={...event,commitMode:stack?'explicit-transaction':'autocommit'};if(stack)stack.at(-1).events.push(effect);else committed.push(effect)};
        const active=transactions.get(pid);
        if(q.phase==='error'){
            assert(!touchesAuth(q),'A failed auth query cannot receive an unrelated failure admission');
            const admitted=failures.get(q.queryId);assert(admitted&&!admitted.seen,'Unknown SQL error is not silently skipped');
            for(const field of errorQueryFields)assert.deepEqual(q[field],admitted.expected[field]);
            assert(active&&!active.some(layer=>layer.aborted),'An aborted or absent transaction cannot receive another admitted failure');
            assert.equal(active[0].beginQueryId,admitted.expected.transactionBeginQueryId);assert.equal(q.rowCount,null);assert.deepEqual(q.resultCommands,[]);assert.deepEqual(q.resultRowCounts,[]);
            assert(time(q.at)>=time(window.startedAt)&&time(q.at)<=time(window.finishedAt));admitted.seen=true;
            const receipt={mode:'source-bound-unrelated-failed-statement',queryId:q.queryId,backendPid:pid,sequence:q.sequence,at:q.at,command:q.command,relations:q.relations,sqlShape:q.sqlShape,sqlSha256:q.sqlSha256,code:q.code,commitMode:'explicit-transaction',transactionBeginQueryId:active[0].beginQueryId,traceOrdinal,recovery:null,contributesAuthEffects:false};
            admitted.receipt=receipt;active.at(-1).aborted=true;active.at(-1).failures.push(admitted);unrelatedErrors.push(receipt);continue;
        }
        assert(q.code===null||q.code===undefined,'A successful terminal cannot carry a SQL error code');
        if(active?.some(layer=>layer.aborted))assert.equal(q.command,'ROLLBACK','Aborted transaction must reach its exact admitted outer rollback before more successful work');
        if(q.command==='BEGIN'){actualTag(q,'BEGIN');assert(!transactions.has(pid));transactions.set(pid,[{name:'$outer',beginQueryId:q.queryId,events:[],failures:[],aborted:false}]);continue;}
        if(q.command==='COMMIT'){actualTag(q,'COMMIT');const stack=transactions.get(pid);assert(stack&&!stack.some(layer=>layer.aborted||layer.failures.length));committed.push(...stack.flatMap(layer=>layer.events));transactions.delete(pid);continue;}
        if(q.command==='ROLLBACK'){actualTag(q,'ROLLBACK');assert(active);for(const admitted of active.flatMap(layer=>layer.failures)){for(const field of recoveryFields)assert.deepEqual(q[field],admitted.expected.rollback[field]);admitted.recovered=true;admitted.receipt.recovery={queryId:q.queryId,sequence:q.sequence,at:q.at,sqlSha256:q.sqlSha256,resultCommands:q.resultCommands,disposition:'outer-rollback-no-auth-effect'}}transactions.delete(pid);continue;}
        if(q.command==='SAVEPOINT'){actualTag(q,'SAVEPOINT');const stack=transactions.get(pid);assert(stack);stack.push({name:s.replace(/^savepoint\s+/,''),events:[],failures:[],aborted:false});continue;}
        if(q.command==='ROLLBACK TO'){actualTag(q,'ROLLBACK');const stack=transactions.get(pid),name=s.replace(/^rollback to(?: savepoint)?\s+/,'');assert(stack);const index=stack.findLastIndex(layer=>layer.name===name);assert(index>0);stack.splice(index+1);stack[index].events=[];continue;}
        if(q.command==='RELEASE'){actualTag(q,'RELEASE');const stack=transactions.get(pid),name=s.replace(/^release(?: savepoint)?\s+/,'');assert(stack&&stack.at(-1).name===name&&stack.length>1);const released=stack.pop();stack.at(-1).events.push(...released.events);continue;}
        if(q.command!=='UPDATE'||!(q.relations?.includes('auth_session')||/^update\s+(?:"?poms"?\.)?"?auth_session"?(?:\s|$)/.test(s)))continue;
        authUpdateStatements++;
        const mode=s===shape(m4NativeSessionSqlShapes.touch)?'native-conditional-touch':s===shape(m4NativeSessionSqlShapes.coflush)?'native-managed-version-coflush':null;
        assert(mode,'Only the two original M4 touch/coflush SQL shapes; CSRF or another auth write is not this source effect');
        assert.equal(q.rowCount,1);assert(/^[0-9a-f]{64}$/.test(q.sqlSha256));
        assert(time(q.at)>=time(window.startedAt)&&time(q.at)<=time(window.finishedAt));
        push({mode,sessionId,sessionSlot,ordinal,index:request.context.index,op:request.context.op,window,queryId:q.queryId,backendPid:pid,sqlSha256:q.sqlSha256,traceOrdinal});
    }
    assert.equal(starts.size,0,'Unfinished actual query');assert.equal(transactions.size,0,'Unfinished actual transaction');
    for(const admitted of failures.values())assert(admitted.seen&&admitted.recovered,'Every admitted original SQL failure needs its exact observed rollback');
    committed.sort((a,b)=>a.traceOrdinal-b.traceOrdinal);
    for(const effect of committed.filter(e=>e.mode==='native-managed-version-coflush'))assert(committed.some(t=>t.mode==='native-conditional-touch'&&t.sessionId===effect.sessionId&&t.traceOrdinal<effect.traceOrdinal),'A committed managed coflush needs its actual earlier touch in this same request');
    if(producer)assert.equal(authUpdateStatements,0,'This frozen pair has zero auth writes in either Native handover producer');
    return Object.freeze({kind:'M4-two-declared-session-Native-SQL-committed-effects-only',journalBackend,sessionSlot,sessionId,context:request.context,requestOrdinal:ordinal,authUpdateStatements,effects:committed,unrelatedErrors,producerZeroEffects:producer,typedSessionBindingVerifiedHere:false,physicalVersionsVerifiedHere:false,nonAuthFailureSourceProofVerifiedHere:false,ownershipGranted:false});
}
