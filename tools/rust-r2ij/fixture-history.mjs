import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {ident} from './catalog-complete.mjs';
import {localRootFor,resolveObject,objectHash} from './fixture-objects.mjs';

/** Valid pre-existing history fixture; never an API version-creation claim. */
export async function seedHistory(fixture,plannedIds=[randomUUID(),randomUUID()].sort()){
    assert.equal(plannedIds.length,2);assert(new Set(plannedIds).size===2);
    const present=await fixture.client.query('select id from poms.attachment where id=any($1::uuid[])',[plannedIds]);assert.equal(present.rowCount,0);
    const targets=await fixture.targets(),actor=fixture.actor().userId;
    const category=(await fixture.client.query("select code from poms.dictionary_item where domain='attachment-category' and status='active' order by sort_order,code limit 1")).rows[0].code;
    const records=[];
    for(const [index,id] of plannedIds.entries()){
        const key=`history-${fixture.runId}/v${index+1}.txt`,bytes=Buffer.from('legacy'+(index+1)),linkId=randomUUID(),at=`2020-01-0${index+1}T00:00:00.000Z`;
        const attachment={id,original_name:`history-v${index+1}-${fixture.runId}.txt`,display_name:`History v${index+1} ${fixture.runId}`,extension:'txt',mime_type:'text/plain',size_bytes:bytes.length,checksum_sha256:objectHash(bytes),category,security_level:'internal',storage_provider:'local',storage_bucket:null,storage_key:key,status:'active',version_group_id:plannedIds[0],version_no:index+1,is_latest:index===1,is_final:index===0,previous_attachment_id:index===0?null:plannedIds[0],change_note:index===0?null:'Pre-existing legacy fixture version',uploaded_by:actor,uploaded_at:at,created_at:at,updated_at:at};
        const link={id:linkId,attachment_id:id,target_type:'customer',target_id:targets.customer,relation_type:'normal',status:'active',linked_by:actor,linked_at:at};
        fixture.registerRow('attachment',attachment);fixture.registerRow('attachment_link',link);
        fixture.journal.storageObjects.push({provider:'local',bucket:null,key,attachmentId:id,writes:[{sha256:objectHash(bytes),size:bytes.length,at:new Date().toISOString()}]});
        fixture.store.write(fixture.journal);
        const file=resolveObject(localRootFor(fixture.backend),key);assert(!existsSync(file));mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,bytes,{flag:'wx',mode:0o600});
        records.push(['attachment',attachment],['attachment_link',link]);
    }
    await fixture.client.query('begin');
    try{
        for(const [table,row] of records){const columns=Object.keys(row);await fixture.client.query(`insert into poms.${ident(table)} (${columns.map(ident).join(',')}) values (${columns.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(row));}
        await fixture.client.query('commit');
    }catch(error){await fixture.client.query('rollback');throw error;}
    fixture.journal.intents.push({kind:'legacy-history-fixture',ids:plannedIds,scope:'Valid two-version pre-existing database facts and real files, not API version-create success'});fixture.store.write(fixture.journal);
    return {olderId:plannedIds[0],newerId:plannedIds[1],category};
}
