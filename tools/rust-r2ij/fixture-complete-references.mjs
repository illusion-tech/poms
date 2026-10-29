import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {verifyFullCatalog,frozenTables,ident} from './catalog-complete.mjs';
import {assertOwnedBase,rowOwned} from './fixture-cleanup.mjs';
import {ownedUserIds,ownedRoleIds,ownedOrgIds} from './fixture-users.mjs';
import {fail} from './fixture-guard.mjs';
import {localRootFor,resolveObject} from './fixture-objects.mjs';
const require=createRequire(import.meta.url);
const {fixtureRequestIdentity}=require('./fixture-protocol.cjs');

export const identityFields=Object.freeze({
    attachment_storage_provider_config:['provider_type','created_by'],
    attachment_upload_session:['created_by','operation_type','original_name'],
    attachment:['uploaded_by','storage_provider','storage_bucket','storage_key'],
    attachment_link:['attachment_id','target_type','target_id','relation_type','linked_by'],
    customer:['customer_no'],lead:['lead_no','customer_id'],project:['project_no'],contract:['contract_no','project_id'],
    sales_follow_up_record:['customer_id','summary'],
    project_handover:['project_id','contract_summary_snapshot_id','effective_handover_baseline_snapshot_id','summary_snapshot_id'],
    contract_term_snapshot:['contract_id','version'],
    approval_summary_snapshot:['target_type','target_id','approval_scenario_key','summary_package_id','summary_package_key'],
    audit_log:['target_type','target_id','event_type','operator_id']
});
function uuidKey(value){
    if(typeof value!=='string')return null;
    const key=value.toLowerCase().replaceAll('-','');
    return /^[0-9a-f]{32}$/.test(key)?key:null;
}
const requireId=value=>{const id=uuidKey(value);if(!id)fail('complete_reference_journal_id');return id;};
const keyFor=(table,id)=>table+':'+requireId(id);
export function ownershipFor(journal){
    const objects=new Map();
    for(const object of journal.objects){
        const fields=identityFields[object.table];
        if(!fields||!object.identity||typeof object.identity!=='object'||Array.isArray(object.identity)
            ||JSON.stringify(Object.keys(object.identity).sort())!==JSON.stringify([...fields].sort()))fail('complete_reference_identity');
        const key=keyFor(object.table,object.id);
        if(objects.has(key))fail('complete_reference_duplicate_object');
        objects.set(key,object);
    }
    return objects;
}
export function assertObjectIdentity(row,object){
    if(!row||Object.entries(object.identity).some(([key,value])=>JSON.stringify(row[key])!==JSON.stringify(value)))fail('complete_reference_identity_changed');
}
function normalizedKey(key){return String(key??'').replaceAll('\\','/').replace(/^\/+|\/+$/g,'');}
export function configPrefixMatches(config,row,table){
    const provider=table==='attachment_upload_session'?row.provider_type:row.storage_provider;
    if(provider!==config.provider_type||(provider!=='local'&&(row.storage_bucket??null)!==(config.bucket??null)))return false;
    const prefix=normalizedKey(config.key_prefix),key=normalizedKey(row.storage_key);
    return !prefix||key===prefix||key.startsWith(prefix+'/');
}

/** Caller owns BEGIN and settled requests. No object deletion or SQL DML. */
export async function assertCompleteReferences(client,baseJournal,journal){
    assert(baseJournal.runId===journal.runId&&baseJournal.backend===journal.backend);
    const ownership=ownershipFor(journal);
    const catalog=await verifyFullCatalog(client,{lock:true});
    await assertOwnedBase(client,baseJournal,true);
    const ids=new Set([...ownedUserIds(baseJournal),...ownedRoleIds(baseJournal),...ownedOrgIds(baseJournal),...journal.objects.map(o=>o.id)].map(requireId));
    const admitted=new Set();
    const admit=(table,row)=>{
        if(!row||typeof row!=='object'||Array.isArray(row))fail('complete_reference_row_shape');
        const id=uuidKey(row.id),object=id&&ownership.get(table+':'+id);
        if(object)assertObjectIdentity(row,object);
        else if(!rowOwned(table,row,baseJournal))fail('complete_reference_foreign_row');
        if(!id)fail('complete_reference_owned_id_missing');
        admitted.add(table+':'+id);
        const fresh=!ids.has(id);ids.add(id);return fresh;
    };
    // A missing row is permitted during retry/second cleanup. Every row which
    // still exists is checked even if no other row refers to its UUID.
    for(const object of journal.objects){
        const {rows}=await client.query(`select to_jsonb(t) as row from poms.${ident(object.table)} t where id=$1::uuid for update`,[object.id]);
        if(rows.length>1)fail('complete_reference_duplicate_row');
        if(rows[0])admit(object.table,rows[0].row);
    }
    const request=fixtureRequestIdentity(journal.runId);
    const security=await client.query('select to_jsonb(t) as row from poms.security_event t where request_id=$1 or user_agent=$2 for update',[request.requestId,request.userAgent]);
    for(const {row} of security.rows)admit('security_event',row);
    let pending=[...ids],passes=0,scans=0;
    while(pending.length){
        passes++;
        const needles=pending.map(id=>`%${id}%`),discovered=new Set();
        for(const table of frozenTables){
            const {rows}=await client.query(`select to_jsonb(t) as row from poms.${ident(table)} t where lower(replace(to_jsonb(t)::text,'-','')) like any($1::text[]) for update`,[needles]);
            scans++;
            for(const {row} of rows)if(admit(table,row))discovered.add(requireId(row.id));
        }
        pending=[...discovered];
    }
    // Provider locations deliberately have no config-ID FK. A matching
    // unregistered location blocks removal even if another prefix could win.
    // This conservative check never adopts or deletes that external object.
    const configs=[];
    for(const object of journal.objects.filter(o=>o.table==='attachment_storage_provider_config')){
        const {rows}=await client.query('select to_jsonb(t) as row from poms.attachment_storage_provider_config t where id=$1::uuid for update',[object.id]);
        if(rows[0])configs.push(rows[0].row);
    }
    let locationRows=0;
    for(const table of ['attachment','attachment_upload_session','attachment_download_package']){
        const {rows}=await client.query(`select to_jsonb(t) as row from poms.${ident(table)} t for update`);
        for(const {row} of rows){
            // Local adapters share root/key regardless of a legacy bucket
            // string. Do not miss an external physical consumer because its
            // stored bucket is empty/non-null rather than canonical null.
            const provider=table==='attachment_upload_session'?row.provider_type:row.storage_provider;
            const physicalKey=key=>{try{return resolveObject(localRootFor(journal.backend),key);}catch{return null;}};
            const exactObject=(journal.storageObjects??[]).some(o=>{
                if(o.provider!==provider)return false;
                if(provider==='local'){
                    const owned=physicalKey(o.key),candidate=physicalKey(row.storage_key);
                    return owned!==null&&candidate!==null&&owned===candidate;
                }
                // The synthetic OBS bucket is exclusively assigned to this
                // run. Unknown bucket consumers fail closed even if URL/path
                // encoding could alias distinct raw storage-key strings.
                return (o.bucket??null)===(row.storage_bucket??null);
            });
            if(exactObject||configs.some(config=>configPrefixMatches(config,row,table))){
                if(!ownership.has(keyFor(table,row.id)))fail('complete_reference_foreign_storage_location');
                admit(table,row);locationRows++;
            }
        }
    }
    return {...catalog,tablesLocked:frozenTables.length,logicalScanPasses:passes,tableScans:scans,rowsAdmitted:admitted.size,ownedUuidCount:ids.size,locationRows,foreignRows:0,deletesIssued:0};
}
