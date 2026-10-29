import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {regularPrivate,privateRoot} from './database-client.mjs';
import {verifyConnection,databaseFor} from './fixture-guard.mjs';
import {verifyFullCatalog,ident} from './catalog-complete.mjs';
const require=createRequire(import.meta.url),{Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const allConstraints="select n.nspname as schema,t.relname as table,c.conname,c.contype::text,c.convalidated,pg_get_constraintdef(c.oid,true) as definition from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='poms' order by t.relname,c.conname";
const ownConstraint="select c.oid::text,n.nspname as schema,t.relname as table,c.conname,c.contype::text,c.convalidated,pg_get_constraintdef(c.oid,true) as definition from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='poms' and t.relname='audit_log' and c.conname=$1";

/** One precise future audit failure in the fresh, marker-checked IJ database. */
export async function uploadedAuditFault(fixture,sessionId){
    assert.equal(process.platform,'linux');assert(fixture.journal.objects.some(row=>row.table==='attachment_upload_session'&&row.id===sessionId));
    const actor=fixture.actor().userId,name='j_upload_audit_'+fixture.runId.replaceAll('-','');assert(/^[a-z_][a-z0-9_]+$/.test(name));
    const client=new Client({host:'127.0.0.1',port:16432,database:databaseFor(fixture.backend),user:'poms_r0e_owner',password:regularPrivate(privateRoot+'/owner-password'),connectionTimeoutMillis:5000,query_timeout:15000,application_name:'poms-r2ij-exact-owned-upload-audit-fault'});
    await client.connect();let fault;
    try{
        await verifyConnection(client,databaseFor(fixture.backend),true);const catalog=await verifyFullCatalog(client),baseline=(await client.query(allConstraints)).rows;
        assert.equal((await client.query(ownConstraint,[name])).rows.length,0);
        assert(/^[0-9a-f-]{36}$/.test(actor)&&/^[0-9a-f-]{36}$/.test(sessionId));
        fault={id:randomUUID(),kind:'j-upload-audit-check',state:'active',schema:'poms',table:'audit_log',constraint:name,actorId:actor,sessionId,event:'attachment.uploaded',baselineConstraintsSha256:digest(baseline),baselineCatalog:catalog,at:new Date().toISOString()};
        fixture.journal.faults.push(fault);fixture.store.write(fixture.journal);
        await client.query('begin');
        try{
            await client.query(`alter table poms.audit_log add constraint ${ident(name)} check (not (operator_id='${actor}'::uuid and event_type='attachment.uploaded'::text and metadata->>'uploadSessionId'='${sessionId}'::text)) not valid`);
            const installed=(await client.query(ownConstraint,[name])).rows;assert.equal(installed.length,1);assert.equal(installed[0].contype,'c');assert.equal(installed[0].convalidated,false);assert.equal(installed[0].table,'audit_log');
            for(const literal of [actor,sessionId,'attachment.uploaded','uploadSessionId'])assert(installed[0].definition.includes(literal));fault.installed=installed[0];
            await client.query('commit');fixture.store.write(fixture.journal);
        }catch(error){await client.query('rollback');assert.deepEqual((await client.query(allConstraints)).rows,baseline);fault.state='restored';fixture.store.write(fixture.journal);throw error;}
        return {receipt:{id:fault.id,kind:fault.kind,constraint:name,sessionId,actorId:actor,event:fault.event,definition:fault.installed.definition,baselineConstraintsSha256:fault.baselineConstraintsSha256},async restore(){
            await verifyConnection(client,databaseFor(fixture.backend),true);await client.query('begin');
            try{assert.deepEqual((await client.query(ownConstraint,[name])).rows,[fault.installed],'Exact name/OID/type/definition must still match before DROP');await client.query(`alter table poms.audit_log drop constraint ${ident(name)}`);assert.deepEqual((await client.query(allConstraints)).rows,baseline,'Full original constraint catalog restored');assert.deepEqual(await verifyFullCatalog(client),catalog,'Full original columns/PK/FK catalog restored');await client.query('commit');}
            catch(error){await client.query('rollback');throw error;}
            fault.state='restored';fault.restoredAt=new Date().toISOString();fixture.store.write(fixture.journal);await client.end();return {id:fault.id,restored:true,constraintsSha256:digest(baseline),fullCatalogRestored:true};
        }};
    }catch(error){await client.end();throw error;}
}
