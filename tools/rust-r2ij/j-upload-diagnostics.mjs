import assert from 'node:assert/strict';
import {authority} from './catalog-complete.mjs';
import {sha} from './j-command-fixtures.mjs';
const uuid='[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const tupleColumns=['id','event_type','target_type','target_id','operator_id','request_id','result','reason','before_snapshot','after_snapshot','metadata','occurred_at'];

/** Only this exact installed check, rejected audit tuple and declared filename. */
export function parseOwnedAuditFailure(report,row){
    const check=report.faults.find(fault=>fault.kind==='j-upload-audit-check');assert(check);
    const columns=authority.tables.find(table=>table.name==='audit_log').columns.map(column=>column.name);assert.deepEqual(columns,tupleColumns);
    const session=row.facts.attachment_upload_session.find(item=>item.id===check.sessionId);assert(session&&session.status==='failed'&&session.completed_attachment_id===null);
    const attachment=row.facts.attachment.find(item=>item.storage_key===session.storage_key&&item.storage_provider===session.provider_type&&(item.storage_bucket??null)===(session.storage_bucket??null));assert(attachment&&attachment.row_version===1);
    const reason=session.failed_reason,prefix=`new row for relation "audit_log" violates check constraint "${check.constraint}"\n - detail: Failing row contains (`;
    assert(typeof reason==='string'&&reason.startsWith(prefix));
    const tail=reason.slice(prefix.length),pattern=new RegExp(`^(${uuid}), attachment\\.uploaded, attachment, (${uuid}), (${uuid}), r2ij:([0-9a-f-]{36}), success, null, null, null, (\\{"category".*), ([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{1,6})?[+-][0-9]{2}(?::?[0-9]{2})?)\\)\\.$`);
    const match=pattern.exec(tail);assert(match,'Unexpected PG detail tuple; no generic error-text projection is allowed');
    const [,auditId,attachmentId,actorId,run,metadata,time]=match;
    assert.equal(attachmentId,attachment.id);assert.equal(actorId,check.actorId);assert.equal(run,report.runId);
    assert.equal(attachment.uploaded_by,actorId);assert.equal(session.created_by,actorId);assert.equal(check.event,'attachment.uploaded');
    assert(check.definition.includes(check.actorId)&&check.definition.includes(check.sessionId)&&check.definition.includes('uploadSessionId'));
    const knownPrefix='{"category": '+JSON.stringify(session.category)+', "fileName": '+JSON.stringify(session.original_name);assert(/^[\x20-\x7e]+$/.test(knownPrefix));
    assert.equal(metadata,Buffer.from(knownPrefix).subarray(0,64).toString('utf8')+'...','PG 64-byte field preview must match the real declared upload metadata');
    const iso=time.replace(' ','T').replace(/([+-][0-9]{2})$/,'$1:00').replace(/([+-][0-9]{2})([0-9]{2})$/,'$1:$2'),milliseconds=Date.parse(iso);assert(Number.isFinite(milliseconds));
    assert(milliseconds>=Date.parse(row.startedAt)-1000&&milliseconds<=Date.parse(row.finishedAt)+1000,'Rejected audit PG timestamp must be within this actual complete request');
    return {sessionId:session.id,auditId,attachmentId,actorId,constraint:check.constraint,tupleColumns,metadataPreview:metadata,time,milliseconds,reason,timeStart:reason.length-time.length-2,reasonSha256:sha(Buffer.from(reason))};
}

export async function captureAuditDiagnostic(fixture,report,row){
    const value=parseOwnedAuditFailure(report,row);assert(!report.bindings.some(binding=>binding.id===value.auditId),'Rejected audit UUID must be new and unique among all observed IDs');
    for(const rows of Object.values(row.facts))assert(!rows.some(item=>item.id===value.auditId));
    const found=await fixture.client.query('select count(*)::int as count from poms.audit_log where id=$1::uuid',[value.auditId]);assert.equal(found.rows[0].count,0,'Actual rejected audit UUID must not exist in PG');
    report.bindings.push({id:value.auditId,label:'diagnostic.rejected-uploaded-audit'});
    return {...value,actualAuditPrimaryKeyRows:0,newUniqueAmongObservedIds:true};
}

export function projectVerifiedAuditClock(report){
    const copy=structuredClone(report),start=copy.cases.findIndex(row=>row.name==='audit.complete-later-flush-failure');assert(start>=0);
    const original=copy.cases[start],value=parseOwnedAuditFailure(copy,original),proof=original.auditDiagnostic;assert(proof&&proof.actualAuditPrimaryKeyRows===0&&proof.newUniqueAmongObservedIds===true);
    for(const field of ['sessionId','auditId','attachmentId','actorId','constraint','metadataPreview','time','reasonSha256'])assert.equal(proof[field],value[field]);
    assert.deepEqual(proof.tupleColumns,tupleColumns);assert(copy.bindings.some(binding=>binding.id===value.auditId&&binding.label==='diagnostic.rejected-uploaded-audit'));
    for(const row of copy.cases.slice(start)){
        const session=row.facts.attachment_upload_session.find(item=>item.id===value.sessionId);assert.equal(session.failed_reason,value.reason,'Persisted diagnostic must remain unchanged in subsequent requests');
        session.failed_reason=value.reason.slice(0,value.timeStart)+'$bounded-rejected-audit-pg-time'+value.reason.slice(value.timeStart+value.time.length);
    }
    return copy;
}
