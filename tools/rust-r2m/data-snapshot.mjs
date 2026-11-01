import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const authority=JSON.parse(fs.readFileSync(new URL('./reference-authority.json',import.meta.url))),tables=authority.tables.map(x=>x.name).sort();assert.equal(tables.length,107);
export async function allProductRowHashes(client){const rows=[];await client.query('BEGIN READ ONLY');
 try{for(const table of tables){assert(/^[a-z_]+$/.test(table));const{rows:[row]}=await client.query(`select count(*)::int as count,encode(public.digest(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' order by to_jsonb(t)::text),''),'UTF8'),'sha256'),'hex') as sha256 from poms."${table}" t`);assert(Number.isInteger(row.count)&&/^[0-9a-f]{64}$/.test(row.sha256));rows.push({table,...row});}await client.query('COMMIT');}
 catch(error){await client.query('ROLLBACK');throw error;}
 return{kind:'all107-product-complete-row-value-hash-snapshot',tables:107,rows,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),rawCredentialOrRowValuesExported:false};}
