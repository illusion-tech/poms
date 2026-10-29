// Exact fresh-IJ owned-row scheduler. No product patch, response substitution,
// broad privilege grant, FOR ALL policy, or CASCADE is used.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {regularPrivate,privateRoot,databaseClient} from './database-client.mjs';
import {verifyConnection,databaseFor} from './fixture-guard.mjs';
import {verifyFullCatalog,ident} from './catalog-complete.mjs';
const require=createRequire(import.meta.url),{Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const table='attachment_storage_provider_config',fixtureApp='poms-r2ij-owned-fixture';
const policiesSql=`select p.oid::text,t.oid::text as table_oid,t.relname,p.polname,p.polcmd::text,p.polpermissive,p.polroles::text,
 pg_get_expr(p.polqual,p.polrelid,true) as using_expression,pg_get_expr(p.polwithcheck,p.polrelid,true) as check_expression
 from pg_policy p join pg_class t on t.oid=p.polrelid join pg_namespace n on n.oid=t.relnamespace
 where n.nspname='poms' order by t.relname,p.polname`;
const functionsSql=`select p.oid::text,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
 p.proowner::text,p.proacl::text,p.provolatile::text,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) as definition
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='poms' and p.prokind in ('f','p','w') order by p.oid`;
async function catalog(client){
    const full=await verifyFullCatalog(client);
    const queries={
        relations:`select c.oid::text,c.relname,c.relkind::text,c.relowner::text,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity,c.reloptions
          from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' order by c.oid`,
        constraints:`select c.oid::text,t.relname,c.conname,c.contype::text,c.convalidated,c.condeferrable,c.condeferred,pg_get_constraintdef(c.oid,true) as definition
          from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='poms' order by c.oid`,
        indexes:`select i.indexrelid::text,i.indrelid::text,i.indisunique,i.indisprimary,i.indisvalid,i.indisready,pg_get_indexdef(i.indexrelid) as definition
          from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' order by i.indexrelid`,
        triggers:`select g.oid::text,g.tgrelid::text,g.tgname,g.tgenabled::text,pg_get_triggerdef(g.oid,true) as definition
          from pg_trigger g join pg_class c on c.oid=g.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' order by g.oid`,
        types:`select t.oid::text,t.typname,t.typtype::text,t.typowner::text,t.typacl::text,
          (select json_agg(json_build_object('sort',e.enumsortorder,'label',e.enumlabel) order by e.enumsortorder) from pg_enum e where e.enumtypid=t.oid) as enum_values
          from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='poms' order by t.oid`,
        schemas:`select oid::text,nspname,nspowner::text,nspacl::text from pg_namespace where nspname in ('poms','public','r2ij_control') order by nspname`,
        database:`select oid::text,datname,datdba::text,datacl::text from pg_database where datname=current_database()`,
        roles:`select oid::text,rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolconnlimit,rolvaliduntil::text,rolbypassrls,rolconfig
          from pg_roles where rolname in ('poms_r0e_owner','poms_r2ij_app') order by rolname`,
        memberships:`select roleid::text,member::text,grantor::text,admin_option from pg_auth_members
          where roleid in (select oid from pg_roles where rolname in ('poms_r0e_owner','poms_r2ij_app')) or member in (select oid from pg_roles where rolname in ('poms_r0e_owner','poms_r2ij_app')) order by roleid,member,grantor`,
        defaultPrivileges:`select oid::text,defaclrole::text,defaclnamespace::text,defaclobjtype::text,defaclacl::text from pg_default_acl order by oid`,
        policies:policiesSql,functions:functionsSql
    };
    const result={full};for(const [key,sql] of Object.entries(queries))result[key]=(await client.query(sql)).rows;return result;
}
function ownObjects(snapshot,names){return {table:snapshot.relations.find(r=>r.relname===table),functions:snapshot.functions.filter(r=>r.proname===names.fn),policies:snapshot.policies.filter(r=>names.policies.includes(r.polname))};}
function assertInstalledDelta(before,installed,names){
    const restored=structuredClone(installed);restored.functions=restored.functions.filter(r=>r.proname!==names.fn);restored.policies=restored.policies.filter(r=>!names.policies.includes(r.polname));
    restored.relations=restored.relations.map(r=>r.relname===table?{...r,relrowsecurity:false}:r);assert.deepEqual(restored,before,'Only the exact function, four policies, and target RLS flag may differ');
}
async function targetRow(client,id){return (await client.query('select to_jsonb(c) as row from poms.attachment_storage_provider_config c where id=$1::uuid',[id])).rows[0]?.row;}

export async function selfQueryGate(fixture,id){
    assert.equal(process.platform,'linux');assert(uuid.test(id)&&uuid.test(fixture.runId));
    assert(fixture.journal.objects.some(o=>o.table===table&&o.id===id&&o.identity.created_by===fixture.actor().userId&&o.identity.provider_type==='local'));
    const database=databaseFor(fixture.backend),client=new Client({host:'127.0.0.1',port:16432,database,user:'poms_r0e_owner',password:regularPrivate(privateRoot+'/owner-password'),connectionTimeoutMillis:5000,query_timeout:15000,options:'-c statement_timeout=12000 -c lock_timeout=10000',application_name:'poms-r2ij-exact-self-query-cas-owner'});
    await client.connect();let listener,fault,lockHeld=false,closed=false;
    const suffix=fixture.runId.replaceAll('-',''),names={fn:'i_cas_'+suffix,policies:['s','i','u','d'].map(c=>'i_cas_'+suffix+'_'+c),channel:'i_cas_'+suffix};
    const key1=0x5232494a,key2=Buffer.from(createHash('sha256').update(fixture.runId).digest()).readInt32BE(0),notifications=[];
    const save=()=>fixture.store.write(fixture.journal);
    try{
        await verifyConnection(client,database,true);await verifyConnection(fixture.client,database);
        assert.equal((await fixture.client.query("select current_setting('application_name') as name")).rows[0].name,fixtureApp);
        const baseline=await catalog(client),target=baseline.relations.find(r=>r.relname===table);assert(target&&!target.relrowsecurity&&!target.relforcerowsecurity);assert.equal(baseline.policies.filter(r=>r.relname===table).length,0);assert.equal(baseline.functions.filter(r=>r.proname===names.fn).length,0);
        const original=await targetRow(fixture.client,id);assert(original&&original.created_by===fixture.actor().userId&&original.provider_type==='local'&&original.key_prefix.includes(fixture.runId)&&original.row_version===1&&original.enabled===true&&original.is_default===false&&original.display_name==='Initial');
        assert.equal((await fixture.client.query('select count(*)::int as n from poms.attachment_storage_provider_config where enabled=true and is_default=true')).rows[0].n,0);
        fault={id:randomUUID(),kind:'i-self-query-cas-rls-gate',state:'planned',database,targetId:id,actorId:fixture.actor().userId,names,key1,key2,baseline,baselineSha256:digest(baseline),original,at:new Date().toISOString()};fixture.journal.faults.push(fault);save();
        listener=await databaseClient(fixture.backend);listener.on('notification',message=>{if(message.channel!==names.channel)return;const value=JSON.parse(message.payload);assert.equal(value.id,id);notifications.push(value);});await listener.query(`listen ${ident(names.channel)}`);
        const fn=`poms.${ident(names.fn)}`,signature=fn+'(uuid,integer,boolean,text)';
        const definition=`create function ${fn}(row_id uuid,row_version integer,is_default boolean,display_name text) returns boolean language plpgsql volatile security invoker set search_path=pg_catalog as $i_cas$
begin
 if row_id='${id}'::uuid and current_setting('application_name',true) is distinct from '${fixtureApp}' then
  perform pg_catalog.pg_notify('${names.channel}',pg_catalog.json_build_object('id',row_id,'rowVersion',row_version,'isDefault',is_default,'displayName',display_name,'pid',pg_catalog.pg_backend_pid(),'query',pg_catalog.current_query(),'snapshot',pg_catalog.txid_current_snapshot()::text)::text);
  perform pg_catalog.pg_advisory_xact_lock(${key1},${key2});
 end if;
 return true;
end;
$i_cas$`;
        fault.plannedDefinition=definition;save();await client.query('begin');
        try{
            await client.query(definition);await client.query(`revoke all on function ${signature} from public`);await client.query(`grant execute on function ${signature} to poms_r2ij_app`);
            await client.query(`create policy ${ident(names.policies[0])} on poms.${table} for select to poms_r2ij_app using (${fn}(id,row_version,is_default,display_name))`);
            await client.query(`create policy ${ident(names.policies[1])} on poms.${table} for insert to poms_r2ij_app with check (true)`);
            await client.query(`create policy ${ident(names.policies[2])} on poms.${table} for update to poms_r2ij_app using (true) with check (true)`);
            await client.query(`create policy ${ident(names.policies[3])} on poms.${table} for delete to poms_r2ij_app using (true)`);
            await client.query(`alter table poms.${table} enable row level security`);
            const installed=await catalog(client);assertInstalledDelta(baseline,installed,names);fault.installed=ownObjects(installed,names);assert.equal(fault.installed.functions.length,1);assert.equal(fault.installed.policies.length,4);assert.deepEqual(fault.installed.policies.map(p=>p.polcmd).toSorted(),['a','d','r','w']);
            assert.equal((await client.query('select has_function_privilege($1,$2,$3) as allowed',['poms_r2ij_app',signature,'EXECUTE'])).rows[0].allowed,true);
            fault.state='active';save();await client.query('commit');
        }catch(error){await client.query('rollback');assert.deepEqual(await catalog(client),baseline);fault.state='restored';save();throw error;}
        const receipt={faultId:fault.id,targetId:id,function:fault.installed.functions[0],policies:fault.installed.policies,tableFlags:fault.installed.table,key1,key2,baselineSha256:fault.baselineSha256,fullCatalog:baseline.full,originalFields:{displayName:original.display_name,isDefault:original.is_default,rowVersion:original.row_version}};
        return {receipt,notifications,
            async arm(){assert(!lockHeld);assert.equal((await client.query("show default_transaction_isolation")).rows[0].default_transaction_isolation,'read committed');await client.query('begin');await client.query('select pg_advisory_xact_lock($1::integer,$2::integer)',[key1,key2]);lockHeld=true;fault.lockerPid=(await client.query('select pg_backend_pid() as pid')).rows[0].pid;fault.armedAt=new Date().toISOString();save();return {pid:fault.lockerPid,key1,key2};},
            async waitForBlockedApp(){
                assert(lockHeld);let waiting=[];const until=Date.now()+10000;
                while(Date.now()<until){await client.query('select pg_stat_clear_snapshot()');waiting=(await client.query(`select pid,usename,application_name,state,wait_event_type,wait_event,query,backend_start::text,pg_blocking_pids(pid) as blockers from pg_stat_activity where datname=current_database() and usename='poms_r2ij_app' and wait_event_type='Lock' and $1=any(pg_blocking_pids(pid)) and position('attachment_storage_provider_config' in query)>0`,[fault.lockerPid])).rows;if(waiting.length)break;await new Promise(r=>setTimeout(r,15));}
                assert.equal(waiting.length,1,'One exact application initial SELECT must wait on our locker');const app=waiting[0];assert.notEqual(app.application_name,fixtureApp);assert(/^\s*select\b/i.test(app.query));assert(/\bid"?\s*=\s*(?:\$\d+|')/i.test(app.query),'Waiting query must be the initial ID SELECT rather than the location query');assert.deepEqual(app.blockers,[fault.lockerPid]);
                const locks=(await client.query(`select pid,mode,granted,classid::text,objid::text,objsubid,virtualtransaction from pg_locks where locktype='advisory' and database=(select oid from pg_database where datname=current_database()) and classid=$1::oid and objid=$2::oid and objsubid=2 order by pid,granted`,[String(key1>>>0),String(key2>>>0)])).rows;assert(locks.some(l=>l.pid===fault.lockerPid&&l.granted)&&locks.some(l=>l.pid===app.pid&&!l.granted));
                fault.waitGraph={app,lockerPid:fault.lockerPid,locks,at:new Date().toISOString()};save();return fault.waitGraph;
            },
            async writeConcurrent(){
                assert(lockHeld&&fault.waitGraph);assert.equal((await targetRow(client,id)).row_version,1);fault.writer={id:randomUUID(),kind:'i-self-query-concurrent-writer',state:'planned',columns:['row_version','display_name','is_default'],targetId:id,actorId:original.created_by};fixture.journal.intents.push(fault.writer);save();
                const found=await fixture.client.query(`update poms.${table} set row_version=row_version+1,display_name='Concurrent',is_default=true where id=$1::uuid and row_version=1 and provider_type='local' and created_by=$2::uuid and key_prefix=$3 returning id::text,row_version,display_name,is_default`,[id,original.created_by,original.key_prefix]);assert.equal(found.rows.length,1);assert.deepEqual(found.rows[0],{id,row_version:2,display_name:'Concurrent',is_default:true});
                const visible=await targetRow(client,id);assert.equal(visible.row_version,2);assert.equal(visible.is_default,true);assert.equal(visible.display_name,'Concurrent');Object.assign(fault.writer,{state:'completed',committed:true,returning:found.rows[0],visibleFromLocker:true,at:new Date().toISOString()});save();return fault.writer;
            },
            async release(){if(lockHeld){await client.query('commit');lockHeld=false;fault.releasedAt=new Date().toISOString();save();}},
            async assertSnapshots(){const until=Date.now()+1500;while(Date.now()<until&&!notifications.some(n=>/^\s*select\b/i.test(n.query)&&n.rowVersion===2))await new Promise(r=>setTimeout(r,20));const selects=notifications.filter(n=>/^\s*select\b/i.test(n.query));assert(selects.some(n=>n.pid===fault.waitGraph.app.pid&&n.rowVersion===1&&n.displayName==='Initial'&&n.isDefault===false),'Initial app SELECT must actually return the v1 MVCC snapshot');assert(selects.some(n=>n.rowVersion===2&&n.displayName==='Concurrent'&&n.isDefault===true),'Later self SELECT must actually see committed v2');fault.notifications=notifications;save();return notifications;},
            async restore(){
                assert.equal(fixture.activeRequests,0,'Subject HTTP must settle before restoration');if(lockHeld){await client.query('rollback');lockHeld=false;}
                await verifyConnection(client,database,true);const current=await catalog(client);assert.deepEqual(ownObjects(current,names),fault.installed,'Exact OID/definition/ACL/flags must match before DROP');assertInstalledDelta(baseline,current,names);
                const final=await targetRow(fixture.client,id);assert(final&&final.created_by===original.created_by&&final.provider_type==='local'&&final.key_prefix===original.key_prefix);fault.finalProductState={row:final,sha256:digest(final),leftIntactUntilOwnedCleanup:true};save();
                await client.query('begin');try{assert.deepEqual(ownObjects(await catalog(client),names),fault.installed);for(const name of names.policies)await client.query(`drop policy ${ident(name)} on poms.${table}`);await client.query(`drop function poms.${ident(names.fn)}(uuid,integer,boolean,text)`);await client.query(`alter table poms.${table} disable row level security`);assert.deepEqual(await catalog(client),baseline,'All original catalog definitions, RLS flags, ACLs and role/schema/database privileges restored');await client.query('commit');}catch(error){await client.query('rollback');throw error;}
                assert.deepEqual(await targetRow(fixture.client,id),final,'Instrumentation restoration must not change product data');await verifyConnection(fixture.client,database);fault.state='restored';fault.restoredAt=new Date().toISOString();save();await listener.query(`unlisten ${ident(names.channel)}`);await listener.end();listener=null;await client.end();closed=true;return {restored:true,faultId:fault.id,baselineSha256:fault.baselineSha256,fullCatalogAndPrivilegesRestored:true,productDataLeftIntact:true,finalProductStateSha256:digest(final)};
            },
            async closeConnectionsOnly(){if(lockHeld){try{await client.query('rollback');}finally{lockHeld=false;}}if(listener){await listener.end();listener=null;}if(!closed){await client.end();closed=true;}}
        };
    }catch(error){if(lockHeld)await client.query('rollback');if(listener)await listener.end();if(!closed)await client.end();throw error;}
}
