// Preserve the completed #115 environment scripts and advance only its owned DBs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const input = 'tools/rust-r4ghi/environment01.mjs';
const output = 'tools/rust-r4ghi/business-environment02.mjs';
const original = fs.readFileSync(input);
let source = original.toString('utf8');
function replace(from, to) { assert.equal(source.split(from).length, 2, from); source = source.replace(from, () => to); }
replace("root/environment01'", "root/business-environment02'");
replace("assert(['provision','migrate','seed','status','stop'].includes(mode));", "assert(['start','migrate','status','stop'].includes(mode));");
replace("const gate=JSON.parse(fs.readFileSync(win+'/docs/design/rust-r4ghi/user-fix-online01.json','utf8'));assert(gate.G1Certified&&gate.G2Authorized);", "const gate=JSON.parse(fs.readFileSync(win+'/docs/design/rust-r4ghi/g1-online01.json','utf8'));assert(gate.G1Certified&&gate.G2Authorized&&gate.counts.total===32&&gate.inputCommit==='9e010077e3010ff09447e9d77cb1bf1f7adbf68d'); const promotion=JSON.parse(fs.readFileSync(win+'/docs/design/rust-r4ghi/migration-promotion01.json')); assert.equal(createHash('sha256').update(fs.readFileSync(win+'/'+promotion.target)).digest('hex'),promotion.targetSHA256);");
replace("assert.equal(names.length,94);", "assert.equal(names.length,95);");
replace("const before=await orm.migrator.getExecuted(),applied=await orm.migrator.up(),after=await orm.migrator.getExecuted();assert.equal(after.length,94);receipts.push({database:name,before:before.length,applied:applied.length,after:after.length})", "const before=await orm.migrator.getExecuted();assert.equal(before.length,94);const preserved=await db(name,c=>preservation(c));const applied=await orm.migrator.up(),after=await orm.migrator.getExecuted();assert.equal(after.length,95);assert.equal(applied.length,1);const checked=await db(name,c=>preservation(c,preserved));receipts.push({database:name,before:before.length,applied:applied.length,after:after.length,existingDataPreserved:checked})");
replace("kind:'R4-original93-plus-DEF-forward-migration'", "kind:'R4-GHI-original94-plus-single-forward-migration'");
replace("if(mode==='provision')await provision();", "if(mode==='start'){ownedContainer(false);pod('start',container);ownedContainer();await db(databases[0],async()=>{});json(out+'/started01.json',{namespace,containerId:ownedContainer(),started:true,oldEnvironmentTouched:false});}");
replace("if(mode==='seed')await seed();", "");
const preservation = `
async function preservation(c, frozen) {
 const tables=frozen??(await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='poms' AND table_type='BASE TABLE' AND table_name<>'poms_migrations' ORDER BY table_name")).rows;
 const result=[];
 for(const table of tables){
  const name=table.table_name;assert(/^[a-z_]+$/.test(name));
  const columns=table.columns??(await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='poms' AND table_name=$1 ORDER BY ordinal_position",[name])).rows.map(r=>r.column_name);
  assert(columns.every(n=>/^[a-z0-9_]+$/.test(n)));
  const projected='jsonb_build_array('+columns.map(n=>'t."'+n+'"').join(',')+')';
  const {rows:[r]}=await c.query('SELECT count(*)::int AS count,COALESCE(jsonb_agg(p ORDER BY p::text)::text,$$[]$$) AS original FROM (SELECT '+projected+' AS p FROM poms."'+name+'" t) q');
  const item={table_name:name,columns,count:r.count,rawProjectionSHA256:sha(Buffer.from(r.original))};
  if(frozen){assert.equal(item.count,table.count,name+' row count');assert.equal(item.rawProjectionSHA256,table.rawProjectionSHA256,name+' original columns changed');}
  result.push(item);
 }
 return result;
}
`;
source = source.replace("async function migrate(){", () => preservation + "\nasync function migrate(){");
assert(!fs.existsSync(output));
fs.writeFileSync(output, source, { flag: 'wx' });
console.log(JSON.stringify({ output, sourceSHA256: createHash('sha256').update(original).digest('hex'), expectedMigrations: 95, ownedDatabaseOnly: true, SQLExecuted: false }));
