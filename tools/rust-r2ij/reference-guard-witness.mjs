import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {OwnedFixture} from './owned-fixture.mjs';
import {facts as baseFacts} from './fixture-snapshot.mjs';
import {localRootFor,resolveObject,objectHash} from './fixture-objects.mjs';
import {createIncomingProbe} from './fixture-owner-probe.mjs';
const tag=process.argv[2];assert(process.argv.length===3&&/^[a-z0-9-]{1,35}$/.test(tag??''));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const report={formatVersion:1,tag,at:new Date().toISOString(),scope:'Actual isolated PG15/FS cleanup refusal tests; no product API certification',result:'pending',backends:[]};
const insertSession=`insert into poms.attachment_upload_session(id,operation_type,status,upload_mode,provider_type,storage_key,original_name,display_name,extension,mime_type,size_bytes,max_size_bytes,expires_at,created_by)
    values($1::uuid,'create-attachment','pending','proxy','local',$2,$3,$3,'txt','text/plain',7,52428800,clock_timestamp()+interval '1 hour',$4::uuid) returning to_jsonb(attachment_upload_session.*) as row`;
for(const backend of ['nest','rust']){
    let fixture,foreign;const item={backend,result:'pending',cases:[]};
    try{
        fixture=await OwnedFixture.open(backend);item.runId=fixture.runId;await fixture.targets();
        const sessionId=randomUUID(),key=`r2ij-guard/${fixture.runId}/file.txt`,name='guard-'+fixture.runId+'.txt',actor=fixture.actor().userId;
        fixture.register('attachment_upload_session',sessionId,{created_by:actor,operation_type:'create-attachment',original_name:name});
        await fixture.client.query(insertSession,[sessionId,key,name,actor]);
        const payload=Buffer.from('guarded');await fixture.planObject(sessionId,payload);
        const file=resolveObject(localRootFor(backend),key);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,payload,{flag:'wx',mode:0o600});
        async function fingerprint(){return hash({extension:await fixture.facts(),base:await baseFacts(fixture.client,fixture.base)});}
        async function expectBlocked(name,code){
            const before=await fingerprint();let dml=0,blocked=false,observed;
            const original=fixture.client.query;
            fixture.client.query=function(...args){const text=typeof args[0]==='string'?args[0]:args[0]?.text??'';if(/\b(?:delete\s+from|insert\s+into|update\s+poms\.)/i.test(text))dml++;return original.apply(this,args);};
            try{await fixture.cleanup();}catch(error){blocked=true;observed=error.message;}finally{fixture.client.query=original;}
            assert(blocked);assert.equal(observed,code);assert.equal(dml,0);
            assert(existsSync(file));assert.equal(objectHash(readFileSync(file)),objectHash(payload));assert.equal(await fingerprint(),before);
            item.cases.push({name,blocked:true,reason:observed,sqlDml:0,storageDeletes:0,ownedRowsUnchanged:true,ownedObjectBytesUnchanged:true});
        }
        const auditId=randomUUID(),target=sessionId.replaceAll('-','').toUpperCase();
        const intent={id:randomUUID(),kind:'negative-logical-row',table:'audit_log',rowId:auditId,targetId:target,state:'started'};fixture.journal.intents.push(intent);fixture.store.write(fixture.journal);
        await fixture.client.query("insert into poms.audit_log(id,event_type,target_type,target_id,result,metadata) values($1::uuid,'r2ij.guard.foreign','outside-journal',$2,'failed',$3::jsonb)",[auditId,target,JSON.stringify({nested:{compactUppercaseReference:target}})]);
        try{await expectBlocked('unregistered logical UUID/text/JSON consumer','complete_reference_foreign_row');}
        finally{const row=await fixture.client.query('select event_type,target_type,target_id,operator_id from poms.audit_log where id=$1::uuid',[auditId]);assert.deepEqual(row.rows,[{event_type:'r2ij.guard.foreign',target_type:'outside-journal',target_id:target,operator_id:null}]);const removed=await fixture.client.query('delete from poms.audit_log where id=$1::uuid',[auditId]);assert.equal(removed.rowCount,1);intent.state='restored';fixture.store.write(fixture.journal);}
        foreign=await createIncomingProbe(fixture,sessionId);
        try{await expectBlocked('unknown incoming FK from owner-only external schema','complete_incoming_fk_changed');}
        finally{await foreign.remove();await foreign.close();foreign=null;}
        const locationCases=[
            {bucket:null,key},{bucket:'',key},{bucket:'legacy-ignored-local-bucket',key},
            {bucket:null,key:key.replace('r2ij-guard/','r2ij-guard//')},
            {bucket:null,key:key.replace('r2ij-guard/','r2ij-guard/./')},
            {bucket:null,key:'a/../'+key},{bucket:null,key:key.replaceAll('/','\\')},{bucket:null,key:'/'+key}
        ];
        for(const {bucket,key:foreignKey} of locationCases){
            const externalId=randomUUID(),externalName='unregistered-location.txt';
            const externalIntent={id:randomUUID(),kind:'negative-storage-location-row',table:'attachment_upload_session',rowId:externalId,key:foreignKey,bucket,state:'started'};fixture.journal.intents.push(externalIntent);fixture.store.write(fixture.journal);
            await fixture.client.query(insertSession,[externalId,foreignKey,externalName,null]);
            if(bucket!==null)await fixture.client.query('update poms.attachment_upload_session set storage_bucket=$2 where id=$1::uuid',[externalId,bucket]);
            try{await expectBlocked('unregistered local location '+JSON.stringify(foreignKey)+', bucket '+JSON.stringify(bucket),'complete_reference_foreign_storage_location');}
            finally{const row=await fixture.client.query('select storage_key,original_name,created_by,storage_bucket from poms.attachment_upload_session where id=$1::uuid',[externalId]);assert.deepEqual(row.rows,[{storage_key:foreignKey,original_name:externalName,created_by:null,storage_bucket:bucket}]);const removed=await fixture.client.query('delete from poms.attachment_upload_session where id=$1::uuid',[externalId]);assert.equal(removed.rowCount,1);externalIntent.state='restored';fixture.store.write(fixture.journal);}
        }
        item.result='pass';
    }catch(error){item.result='fail';item.failure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}
    finally{
        if(foreign){try{await foreign.remove();}finally{await foreign.close();}}
        if(fixture){try{item.cleanup1=await fixture.cleanup();item.cleanup2=await fixture.cleanup();assert.equal(item.cleanup2.changed,0);assert.equal(item.cleanup2.matched,0);assert(item.cleanup2.zero);}catch(error){item.result='fail';item.cleanupFailure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}await fixture.close();}
    }
    report.backends.push(item);if(item.result!=='pass')break;
}
report.result=report.backends.length===2&&report.backends.every(x=>x.result==='pass')?'pass':'fail';
writeFileSync(`tmp/rust-r2ij/reference-guard-${tag}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:report.result,backends:report.backends.map(x=>({backend:x.backend,cases:x.cases,failure:x.failure,cleanupFailure:x.cleanupFailure,cleanup:x.cleanup2&&{matched:x.cleanup2.matched,changed:x.cleanup2.changed,zero:x.cleanup2.zero}}))}));
