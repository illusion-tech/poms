import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fail} from './fixture-guard.mjs';

const bytes=readFileSync(new URL('./reference-authority.json',import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),'07b662d5df88b2ade90adfa3fb4c00b1f616e2a59ca85cf6c68a0a20a1e7e9f7');
export const authority=JSON.parse(bytes);
export const frozenTables=Object.freeze(authority.tables.map(t=>t.name).toSorted());
assert.equal(frozenTables.length,107);
assert.equal(new Set(frozenTables).size,107);
assert.equal(authority.incoming.length,207);
const fields=['source_schema','source_table','conname','source_columns','target_schema','target_table','target_columns','update_action','delete_action','match_type','convalidated','condeferrable','condeferred'];
const fkKey=row=>`${row.source_schema}.${row.source_table}.${row.conname}`;
export const ident=name=>{
    if(!/^[a-z_][a-z0-9_]*$/.test(name))fail('complete_reference_identifier');
    return '"'+name+'"';
};
export const incomingSql=`select source_ns.nspname as source_schema,
source_table.relname as source_table,c.conname,
array(select a.attname::text from unnest(c.conkey) with ordinality k(attnum,position)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum order by k.position) as source_columns,
target_ns.nspname as target_schema,target_table.relname as target_table,
array(select a.attname::text from unnest(c.confkey) with ordinality k(attnum,position)
    join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.attnum order by k.position) as target_columns,
c.confupdtype::text as update_action,c.confdeltype::text as delete_action,
c.confmatchtype::text as match_type,c.convalidated,c.condeferrable,c.condeferred
from pg_constraint c
join pg_class source_table on source_table.oid=c.conrelid
join pg_namespace source_ns on source_ns.oid=source_table.relnamespace
join pg_class target_table on target_table.oid=c.confrelid
join pg_namespace target_ns on target_ns.oid=target_table.relnamespace
where c.contype='f' and target_ns.nspname=$1 and target_table.relname=any($2::text[])
order by source_ns.nspname,source_table.relname,c.conname`;

export function assertIncomingShape(rows){
    if(!Array.isArray(rows)||rows.length!==authority.incoming.length)fail('complete_incoming_fk_changed');
    const expected=new Map(authority.incoming.map(row=>[fkKey(row),row])),seen=new Set();
    for(const row of rows){
        const key=fkKey(row),match=expected.get(key);
        if(!match||seen.has(key)||fields.some(field=>JSON.stringify(row[field])!==JSON.stringify(match[field])))fail('complete_incoming_fk_changed');
        seen.add(key);
    }
}

export const allForeignKeysSql=incomingSql.replace('target_ns.nspname=$1 and target_table.relname=any($2::text[])','(source_ns.nspname=$1 or target_ns.nspname=$1)');
export function assertAllForeignKeyShape(rows){
    if(!Array.isArray(rows)||rows.length!==authority.allForeignKeys.length)fail('complete_all_fk_changed');
    const expected=new Map(authority.allForeignKeys.map(row=>[fkKey(row),row])),seen=new Set();
    for(const row of rows){const key=fkKey(row),match=expected.get(key);if(!match||seen.has(key)||fields.some(field=>JSON.stringify(row[field])!==JSON.stringify(match[field])))fail('complete_all_fk_changed');seen.add(key);}
}

function physicalType(type){
    return type.toLowerCase().replace(/^varchar/,'character varying').replace(/^decimal/,'numeric')
        .replace(/^(?:int|serial)$/,'integer')
        .replace(/^timestamptz(?:\(([0-9]+)\))?$/,(_,precision)=>`timestamp${precision===undefined?'':`(${precision})`} with time zone`);
}

export async function verifyFullCatalog(client,{lock=false}={}){
    const {rows:tables}=await client.query("select table_name from information_schema.tables where table_schema='poms' and table_type='BASE TABLE' order by table_name");
    if(JSON.stringify(tables.map(row=>row.table_name))!==JSON.stringify(frozenTables))fail('complete_reference_table_catalog_changed');
    if(lock)await client.query(`lock table ${frozenTables.map(name=>'poms.'+ident(name)).join(',')} in share row exclusive mode`);
    const {rows:columns}=await client.query(`select t.relname as table_name,a.attname as name,a.attnum::int as attnum,
        typ.typname as udt,not a.attnotnull as nullable,typ.typcategory='A' as array,format_type(a.atttypid,a.atttypmod) as sql_type
        from pg_class t join pg_namespace ns on ns.oid=t.relnamespace
        join pg_attribute a on a.attrelid=t.oid and a.attnum>0 and not a.attisdropped
        join pg_type typ on typ.oid=a.atttypid
        where ns.nspname='poms' and t.relkind='r' order by t.relname,a.attnum`);
    const expected=authority.tables.toSorted((a,b)=>a.name.localeCompare(b.name)).flatMap(t=>t.columns.map(c=>({table_name:t.name,name:c.name,attnum:c.attnum,udt:c.udt,nullable:c.nullable,array:c.array,sql_type:physicalType(c.sqlType)})));
    if(JSON.stringify(columns)!==JSON.stringify(expected)){
        const mismatch=columns.findIndex((row,i)=>JSON.stringify(row)!==JSON.stringify(expected[i]));
        // Column names/types are public schema metadata, never row contents.
        const error=new Error('complete_reference_column_catalog_changed');error.detail={actual:columns[mismatch],expected:expected[mismatch],actualCount:columns.length,expectedCount:expected.length};throw error;
    }
    const {rows:keys}=await client.query(`select t.relname as table_name,c.conname as name,
        array(select a.attname::text from unnest(c.conkey) with ordinality k(attnum,position)
        join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum order by k.position) as columns
        from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
        where n.nspname='poms' and c.contype='p' order by t.relname`);
    // Unnamed inline PRIMARY KEY clauses (including the framework journal)
    // use PostgreSQL's deterministic table_pkey name in these fresh clusters.
    // Named constraints and every ordered PK column set remain source-owned.
    const primary=authority.tables.toSorted((a,b)=>a.name.localeCompare(b.name)).map(t=>({table_name:t.name,name:t.primaryKey.name??`${t.name}_pkey`,columns:t.primaryKey.columns}));
    if(JSON.stringify(keys)!==JSON.stringify(primary)){
        const mismatch=keys.findIndex((row,i)=>JSON.stringify(row)!==JSON.stringify(primary[i]));
        const error=new Error('complete_reference_primary_key_catalog_changed');error.detail={actual:keys[mismatch],expected:primary[mismatch],actualCount:keys.length,expectedCount:primary.length};throw error;
    }
    const allForeign=await client.query(allForeignKeysSql,['poms']);
    assertAllForeignKeyShape(allForeign.rows);
    const incoming=await client.query(incomingSql,['poms',authority.targets]);
    assertIncomingShape(incoming.rows);
    return {tables:tables.length,columns:columns.length,primaryKeys:keys.length,incomingForeignKeys:incoming.rows.length,allForeignKeys:allForeign.rows.length,
        implicitPrimaryKeyNames:authority.tables.filter(t=>t.primaryKey.name===null).map(t=>({table:t.name,name:`${t.name}_pkey`,rule:'Fresh PostgreSQL default unnamed-primary-key naming; actual name/ordered columns verified'})),
        columnsSha256:createHash('sha256').update(JSON.stringify(columns)).digest('hex'),incomingSha256:createHash('sha256').update(JSON.stringify(incoming.rows)).digest('hex')};
}
