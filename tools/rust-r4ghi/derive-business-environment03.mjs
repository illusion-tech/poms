// Retain failed verifier02; accept only the six frozen production definitions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const input = 'tools/rust-r4ghi/business-environment02.mjs';
let source = fs.readFileSync(input, 'utf8');
function replace(from, to) { assert.equal(source.split(from).length, 2, from); source = source.replace(from, () => to); }
replace("root/business-environment02'", "root/business-environment03'");
const definitions = [
 ['commission-gate-review','project-operating-commission-gate-v1','commission-gate-review','internal-only','r4h-operating-v1','active'],
 ['commission-role-freeze','commission-role-freeze-confirmation','commission-role-freeze','commission-controlled','r4i-role-freeze-v1','active'],
 ...['project-handover-stage','project-execution-admission','project-acceptance-admission','project-completion-stage'].map(key=>['project-stage-transition',key,'project-stage-admission','internal-only','r4i-lifecycle-v1','active'])
];
replace("const name=table.table_name;assert(/^[a-z_]+$/.test(name));", "const name=table.table_name;assert(/^[a-z0-9_]+$/.test(name));");
replace("const {rows:[r]}=await c.query('SELECT count(*)::int AS count,COALESCE(jsonb_agg(p ORDER BY p::text)::text,$$[]$$) AS original FROM (SELECT '+projected+' AS p FROM poms.\"'+name+'\" t) q');", "const filter=name==='approval_summary_package_definition'?\" WHERE NOT (t.summary_package_key = ANY($1::text[]))\":''; const {rows:[r]}=await c.query('SELECT count(*)::int AS count,COALESCE(jsonb_agg(p ORDER BY p::text)::text,$$[]$$) AS original FROM (SELECT '+projected+' AS p FROM poms.\"'+name+'\" t'+filter+') q',filter?[definitionRows.map(r=>r[1])]:[]);");
const from = "const before=await orm.migrator.getExecuted();assert.equal(before.length,94);const preserved=await db(name,c=>preservation(c));const applied=await orm.migrator.up(),after=await orm.migrator.getExecuted();assert.equal(after.length,95);assert.equal(applied.length,1);const checked=await db(name,c=>preservation(c,preserved));receipts.push({database:name,before:before.length,applied:applied.length,after:after.length,existingDataPreserved:checked})";
const to = "const before=await orm.migrator.getExecuted();assert.equal(before.length,i===0?95:94);const preserved=await db(name,c=>preservation(c));json(out+'/'+name+'-before01.json',{database:name,migrations:before.length,originalColumns:preserved,adoptedAfterVerifier02:i===0});const applied=await orm.migrator.up(),after=await orm.migrator.getExecuted();assert.equal(after.length,95);assert.equal(applied.length,i===0?0:1);const checked=await db(name,c=>preservation(c,preserved));const defs=await db(name,async c=>{const {rows}=await c.query('SELECT approval_scenario_key,summary_package_key,projection_level,export_policy,field_rule_version,status FROM poms.approval_summary_package_definition WHERE summary_package_key=ANY($1::text[])',[definitionRows.map(r=>r[1])]);const actual=rows.map(r=>Object.values(r)).sort((a,b)=>a[1].localeCompare(b[1]));assert.deepEqual(actual,[...definitionRows].sort((a,b)=>a[1].localeCompare(b[1])));return actual;});receipts.push({database:name,before:before.length,applied:applied.length,after:after.length,existingDataPreservedAcrossThisMigration:i===1,adoptedAlreadyCommittedMigrationAfterVerifier02:i===0,verificationScope:i===1?'all-original-column-data-before-after':'current-catalog-and-no-op-only-original-before-image-not-retained-by-verifier02',originalColumns:checked,newDefinitionRows:defs})";
replace(from, to);
source = 'const definitionRows='+JSON.stringify(definitions)+';\n'+source;
const output='tools/rust-r4ghi/business-environment03.mjs';
assert(!fs.existsSync(output));fs.writeFileSync(output,source,{flag:'wx'});
console.log(JSON.stringify({output,allowedNewMetadataRows:definitions.length,native95AdoptionOnly:true,rust94To95:true}));
