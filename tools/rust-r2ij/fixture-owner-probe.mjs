import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {regularPrivate,privateRoot} from './database-client.mjs';
import {verifyConnection,databaseFor} from './fixture-guard.mjs';
import {ident} from './catalog-complete.mjs';
const require=createRequire(import.meta.url),{Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');

/** Only a new owner-only control table, never a product table or old cluster. */
export async function createIncomingProbe(fixture,sessionId){
    assert(fixture.journal.objects.some(o=>o.table==='attachment_upload_session'&&o.id===sessionId));
    const table='guard_probe_'+fixture.runId.replaceAll('-','').slice(0,16),id=randomUUID(),constraint='guard_fk_'+fixture.runId.replaceAll('-','').slice(0,16);
    const client=new Client({host:'127.0.0.1',port:16432,database:databaseFor(fixture.backend),user:'poms_r0e_owner',password:regularPrivate(privateRoot+'/owner-password'),connectionTimeoutMillis:5000,query_timeout:15000,application_name:'poms-r2ij-exact-owned-foreign-reference-probe'});
    await client.connect();
    try{
        await verifyConnection(client,databaseFor(fixture.backend),true);
        const present=await client.query('select to_regclass($1) as relation',['r2ij_control.'+table]);assert.equal(present.rows[0].relation,null);
        const intent={id:randomUUID(),kind:'incoming-control-probe',state:'started',schema:'r2ij_control',table,constraint,rowId:id,sessionId};
        fixture.journal.intents.push(intent);fixture.store.write(fixture.journal);
        await client.query('begin');
        try{
            await client.query(`create table r2ij_control.${ident(table)} (id uuid primary key,session_id uuid not null,constraint ${ident(constraint)} foreign key(session_id) references poms.attachment_upload_session(id) on update cascade on delete cascade)`);
            await client.query(`insert into r2ij_control.${ident(table)}(id,session_id) values($1::uuid,$2::uuid)`,[id,sessionId]);
            await client.query('commit');
        }catch(error){await client.query('rollback');throw error;}
        return {schema:'r2ij_control',table,constraint,id,sessionId,async remove(){
            await verifyConnection(client,databaseFor(fixture.backend),true);
            await client.query('begin');
            try{
                const {rows}=await client.query(`select id::text,session_id::text from r2ij_control.${ident(table)} for update`);
                assert.deepEqual(rows,[{id,session_id:sessionId}]);
                const shape=await client.query("select column_name,udt_name,is_nullable from information_schema.columns where table_schema='r2ij_control' and table_name=$1 order by ordinal_position",[table]);
                assert.deepEqual(shape.rows,[{column_name:'id',udt_name:'uuid',is_nullable:'NO'},{column_name:'session_id',udt_name:'uuid',is_nullable:'NO'}]);
                const edges=await client.query("select c.conname,tn.nspname as target_schema,t.relname as target_table,c.confdeltype::text as delete_action from pg_constraint c join pg_class s on s.oid=c.conrelid join pg_namespace sn on sn.oid=s.relnamespace join pg_class t on t.oid=c.confrelid join pg_namespace tn on tn.oid=t.relnamespace where sn.nspname='r2ij_control' and s.relname=$1 and c.contype='f'",[table]);
                assert.deepEqual(edges.rows,[{conname:constraint,target_schema:'poms',target_table:'attachment_upload_session',delete_action:'c'}]);
                const incoming=await client.query("select count(*)::int as count from pg_constraint c join pg_class t on t.oid=c.confrelid join pg_namespace n on n.oid=t.relnamespace where c.contype='f' and n.nspname='r2ij_control' and t.relname=$1",[table]);assert.equal(incoming.rows[0].count,0);
                await client.query(`drop table r2ij_control.${ident(table)}`);await client.query('commit');
                intent.state='restored';fixture.store.write(fixture.journal);
            }catch(error){await client.query('rollback');throw error;}
        },async close(){await client.end();}};
    }catch(error){await client.end();throw error;}
}
