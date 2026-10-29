import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {existsSync,lstatSync,readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {databaseClient,privateRoot} from './database-client.mjs';
import {validateSource,fail} from './fixture-guard.mjs';
import {executeFixture} from './fixture-run.mjs';
import {journalStore} from './fixture-journal.mjs';
import {extensionStore,newExtension,uuid} from './fixture-extension-journal.mjs';
import {identityFields,assertObjectIdentity,assertCompleteReferences} from './fixture-complete-references.mjs';
import {ident} from './catalog-complete.mjs';
import {prepareProjections} from './fixture-projections.mjs';
import {NavigationHttpSession} from './http-client.mjs';
import {localRootFor,scanLocal,objectHash,preflightObjects,removeObjects,pruneNewEmptyDirectories} from './fixture-objects.mjs';

const auditEvents=new Set(['attachment_upload_session.created','attachment_upload_session.aborted','attachment.uploaded','attachment.version_created','attachment.downloaded','attachment.previewed','attachment.thumbnail_viewed','attachment.final_marked','attachment.final_cleared','attachment.metadata_updated','attachment.voided','attachment.linked','attachment.unlinked']);
const providerEvents=new Set(['attachment-storage-provider.config.created','attachment-storage-provider.config.updated','attachment-storage-provider.config.default-set']);
const uid=value=>typeof value==='string'?value.toLowerCase().replaceAll('-',''):'';
const rowHash=row=>createHash('sha256').update(JSON.stringify(row)).digest('hex');
const creationKinds={provider:'attachment_storage_provider_config',session:'attachment_upload_session'};

export class OwnedFixture {
    static async open(backend,runId=randomUUID(),options={}){
        assert(['nest','rust'].includes(backend)&&uuid.test(runId));
        const client=await databaseClient(backend),store=extensionStore(backend,runId);
        const fixture=new OwnedFixture(client,backend,runId,store,options);
        try{
            let journal=store.read();
            if(!journal){
                // A failed prior run must be reconciled before sharing a global
                // default or the fixed backend storage root with another run.
                for(const name of readdirSync(store.directory).filter(name=>name.startsWith(backend+'-')&&name.endsWith('.json'))){
                    const file=path.join(store.directory,name),stat=lstatSync(file);
                    assert(stat.isFile()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0);
                    const other=JSON.parse(readFileSync(file,'utf8'));assert.equal(other.state,'cleaned','Unfinished IJ run must be recovered first');
                }
                journal=newExtension(backend,runId);
                const local=scanLocal(localRootFor(backend));assert.equal(local.files.length,0,'Unregistered initial object');
                journal.baselineDirectories=local.directories;store.write(journal);
            }
            assert.notEqual(journal.state,'cleaned','Use a fresh run ID');fixture.journal=journal;
            const baseExisting=fixture.baseStore.read();
            if(baseExisting?.state==='cleaned'){
                fixture.base=baseExisting;fixture.recoveryOnly=true;
            }else{
                const prepared=await executeFixture(client,fixture.baseRequest('prepare'),validateSource(),fixture.baseStore);
                fixture.base=prepared.fixture;
            }
            fixture.journal.state='prepared';store.write(fixture.journal);
            return fixture;
        }catch(error){await client.end();throw error;}
    }
    constructor(client,backend,runId,store,options){
        this.client=client;this.backend=backend;this.runId=runId;this.store=store;this.upstream=options.upstream;
        this.baseStore=journalStore({backend,runId},privateRoot);this.sessions=new Map();this.activeRequests=0;
    }
    baseRequest(action,account='admin'){return {formatVersion:1,backend:this.backend,runId:this.runId,action,account};}
    register(table,id,identity){
        assert(identityFields[table]&&uuid.test(id));
        const current=this.journal.objects.find(o=>o.table===table&&o.id===id);
        if(current){assert.deepEqual(current.identity,identity);return current;}
        const object={table,id,identity};
        assert.deepEqual(Object.keys(identity).sort(),[...identityFields[table]].sort());
        this.journal.objects.push(object);this.store.write(this.journal);return object;
    }
    registerRow(table,row){return this.register(table,row.id,Object.fromEntries(identityFields[table].map(key=>[key,row[key]??null])));}
    async targets(){return prepareProjections(this);}
    actor(account='admin'){const actor=this.base.accounts.find(a=>a.account===account);assert(actor);return actor;}
    async login(origin,account='admin'){
        assert(!this.recoveryOnly,'Only cleanup may resume after base cleanup committed');
        const session=new NavigationHttpSession(origin,this.runId);await session.login(account);this.sessions.set(account,session);return session;
    }
    async request(session,method,route,options={}){
        this.activeRequests++;
        try{return await session.request(method,route,options);}finally{this.activeRequests--;}
    }
    async planCreation(kind,selectors,account='admin'){
        const table=creationKinds[kind];assert(table&&selectors&&Object.keys(selectors).length>0);
        const allowed=kind==='provider'?['provider_type','display_name','key_prefix']:['operation_type','original_name','target_type','target_id','base_attachment_id'];
        assert(Object.keys(selectors).every(key=>allowed.includes(key)));
        assert(Object.values(selectors).some(value=>typeof value==='string'&&value.includes(this.runId)),'Creation marker must contain exact run UUID');
        const {rows}=await this.client.query(`select id::text from poms.${ident(table)}`);
        const intent={id:randomUUID(),kind,table,selectors,actor:this.actor(account).userId,beforeIds:rows.map(r=>r.id),state:'pending',at:new Date().toISOString()};
        this.journal.intents.push(intent);this.store.write(this.journal);return intent.id;
    }
    async planSessionPayload(selectors,bytes,account='admin'){
        assert(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=2*1024*1024);
        const id=await this.planCreation('session',selectors,account);
        const intent=this.journal.intents.find(entry=>entry.id===id);
        intent.predeclaredPayload={sha256:objectHash(bytes),size:bytes.length,at:new Date().toISOString()};
        this.store.write(this.journal);return id;
    }
    async adoptRuntime({settle=true}={}){
        assert.equal(this.activeRequests,0);
        const actors=new Set(this.base.accounts.map(a=>a.userId));
        for(const intent of this.journal.intents.filter(i=>creationKinds[i.kind]&&i.state==='pending')){
            const {rows}=await this.client.query(`select to_jsonb(t) as row from poms.${ident(intent.table)} t`);
            const found=rows.map(r=>r.row).filter(row=>!intent.beforeIds.includes(row.id)&&row.created_by===intent.actor&&Object.entries(intent.selectors).every(([key,value])=>row[key]===value));
            assert(found.length<=1,'Unexpected additional creation row');
            for(const row of found){
                this.registerRow(intent.table,row);
                if(intent.kind==='session'&&intent.predeclaredPayload){
                    const payload=intent.predeclaredPayload;
                    assert(/^[0-9a-f]{64}$/.test(payload.sha256)&&Number.isSafeInteger(payload.size)&&payload.size>0&&payload.size<=2*1024*1024);
                    assert.equal(Number(row.size_bytes),payload.size,'Predeclared UI payload size differs from session');
                    let object=this.journal.storageObjects.find(entry=>entry.sessionId===row.id);
                    if(!object){object={provider:row.provider_type,bucket:row.storage_bucket,key:row.storage_key,sessionId:row.id,writes:[]};this.journal.storageObjects.push(object);}
                    assert.deepEqual([object.provider,object.bucket,object.key],[row.provider_type,row.storage_bucket,row.storage_key]);
                    if(!object.writes.some(write=>write.sha256===payload.sha256&&write.size===payload.size))object.writes.push({...payload});
                }
            }
            if(settle){intent.state=found.length?'adopted':'no-row';intent.ids=found.map(row=>row.id);}
        }
        const sessionIds=this.journal.objects.filter(o=>o.table==='attachment_upload_session').map(o=>o.id);
        const sessions=sessionIds.length?(await this.client.query('select to_jsonb(t) as row from poms.attachment_upload_session t where id=any($1::uuid[])',[sessionIds])).rows.map(r=>r.row):[];
        for(const session of sessions){
            const {rows}=await this.client.query('select to_jsonb(t) as row from poms.attachment t where storage_provider=$1 and storage_bucket is not distinct from $2 and storage_key=$3',[session.provider_type,session.storage_bucket,session.storage_key]);
            for(const {row} of rows){assert(actors.has(row.uploaded_by));this.registerRow('attachment',row);}
        }
        const attachments=this.journal.objects.filter(o=>o.table==='attachment').map(o=>o.id),targets=new Set(Object.values(this.journal.targets??{}));
        if(attachments.length){
            const {rows}=await this.client.query('select to_jsonb(t) as row from poms.attachment_link t where attachment_id=any($1::uuid[])',[attachments]);
            for(const {row} of rows){assert(actors.has(row.linked_by)&&targets.has(row.target_id),'Unknown attachment link identity');this.registerRow('attachment_link',row);}
        }
        const configIds=new Set(this.journal.objects.filter(o=>o.table==='attachment_storage_provider_config').map(o=>uid(o.id)));
        const attachmentIds=new Set([...attachments,...sessionIds].map(uid));
        const {rows:audits}=await this.client.query('select to_jsonb(t) as row from poms.audit_log t where operator_id=any($1::uuid[])',[[...actors]]);
        for(const {row} of audits){
            if(row.result!=='success')continue;
            const attachment=row.target_type==='attachment'&&auditEvents.has(row.event_type)&&attachmentIds.has(uid(row.target_id));
            const provider=row.target_type==='AttachmentStorageProviderConfig'&&providerEvents.has(row.event_type)&&configIds.has(uid(row.target_id));
            if(attachment||provider)this.registerRow('audit_log',row);
        }
        this.store.write(this.journal);
        return {providers:configIds.size,sessions:sessionIds.length,attachments:attachments.length,objects:this.journal.objects.length};
    }
    async assertOwnedDefault(){
        const owned=new Set(this.journal.objects.filter(o=>o.table==='attachment_storage_provider_config').map(o=>o.id));
        const {rows}=await this.client.query('select id::text from poms.attachment_storage_provider_config where enabled=true and is_default=true');
        assert(rows.every(row=>owned.has(row.id)),'Unowned enabled default blocks configuration mutation');
    }
    async planObject(sessionId,bytes){
        assert(this.journal.objects.some(o=>o.table==='attachment_upload_session'&&o.id===sessionId));
        const {rows}=await this.client.query('select provider_type,storage_bucket,storage_key from poms.attachment_upload_session where id=$1::uuid',[sessionId]);
        assert.equal(rows.length,1);const row=rows[0];
        let object=this.journal.storageObjects.find(o=>o.provider===row.provider_type&&o.bucket===row.storage_bucket&&o.key===row.storage_key);
        if(!object){object={provider:row.provider_type,bucket:row.storage_bucket,key:row.storage_key,sessionId,writes:[]};this.journal.storageObjects.push(object);}
        if(bytes!==undefined)object.writes.push({sha256:objectHash(bytes),size:bytes.length,at:new Date().toISOString()});
        this.store.write(this.journal);return object;
    }
    async facts(){
        const facts={};
        for(const table of Object.keys(identityFields)){
            const ids=this.journal.objects.filter(o=>o.table===table).map(o=>o.id);
            facts[table]=ids.length?(await this.client.query(`select to_jsonb(t) as row from poms.${ident(table)} t where id=any($1::uuid[]) order by id`,[ids])).rows.map(r=>r.row):[];
        }
        return facts;
    }
    async verifyReadOnlyReferences(){
        for(const reference of this.journal.readOnlyReferences){
            assert.equal(reference.table,'approval_summary_package_definition');
            const {rows}=await this.client.query('select to_jsonb(t) as row from poms.approval_summary_package_definition t where id=$1::uuid',[reference.id]);
            assert.equal(rows.length,1);assert.equal(rowHash(rows[0].row),reference.sha256,'Read-only definition changed');
        }
    }
    async cleanup(){
        assert.equal(this.activeRequests,0);assert.equal(this.journal.faults.filter(f=>f.state!=='restored').length,0,'Restore registered faults first');
        await this.adoptRuntime();
        await this.client.query('begin');
        let result;
        try{
            const guard=await assertCompleteReferences(this.client,this.base,this.journal);
            await this.verifyReadOnlyReferences();
            const storage=await preflightObjects(this);
            const cleanupIntent={id:randomUUID(),kind:'cleanup',state:'started',at:new Date().toISOString(),catalog:{columns:guard.columnsSha256,incoming:guard.incomingSha256},objects:storage.present.map(entry=>({provider:entry.object.provider,bucket:entry.object.bucket,key:entry.object.key,sha256:entry.sha256,size:entry.size})),rows:this.journal.objects.map(o=>({table:o.table,id:o.id}))};
            this.journal.intents.push(cleanupIntent);this.store.write(this.journal);
            // Both complete preflights have passed before the first unlink or
            // DELETE. No ownership is inferred from a prefix or operator alone.
            const filesDeleted=await removeObjects(this,storage);
            let rowsDeleted=0;
            const order=['attachment_upload_session','attachment_link','attachment','project_handover','approval_summary_snapshot','contract_term_snapshot','sales_follow_up_record','contract','project','lead','customer','attachment_storage_provider_config','audit_log'];
            for(const table of order){
                const ids=this.journal.objects.filter(o=>o.table===table).map(o=>o.id);
                if(!ids.length)continue;
                const rows=await this.client.query(`select to_jsonb(t) as row from poms.${ident(table)} t where id=any($1::uuid[]) for update`,[ids]);
                for(const {row} of rows.rows)assertObjectIdentity(row,this.journal.objects.find(o=>o.table===table&&o.id===row.id));
                const deleted=await this.client.query(`delete from poms.${ident(table)} where id=any($1::uuid[])`,[ids]);rowsDeleted+=deleted.rowCount;
            }
            await this.client.query('commit');
            result={guard,storageObjectsBefore:storage.present.length,filesDeleted,rowsDeleted,cleanupIntentId:cleanupIntent.id};
        }catch(error){await this.client.query('rollback');throw error;}
        const base=await executeFixture(this.client,this.baseRequest('cleanup','none'),validateSource(),this.baseStore);
        assert(Object.values(base.cleanup.after).every(count=>count===0));
        const after=await this.facts();assert(Object.values(after).every(rows=>rows.length===0));
        const storage=await preflightObjects(this);assert.equal(storage.present.length,0);
        const directoriesRemoved=pruneNewEmptyDirectories(this);
        this.journal.intents.find(intent=>intent.id===result.cleanupIntentId).state='completed';
        this.journal.state='cleaned';this.store.write(this.journal);
        return {...result,base:base.cleanup??base,matched:result.rowsDeleted+result.filesDeleted+base.matched,changed:result.rowsDeleted+result.filesDeleted+base.changed,directoriesRemoved,zero:true};
    }
    async close(){await this.client.end();}
}
