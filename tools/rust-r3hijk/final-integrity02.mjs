// Root verifies the final executable, original contracts and actual owned schemas.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { guardNative, pin, sha } from './source-guard.mjs';
const root = '/home/wangzishi/projects/poms-rust-r3hijk';
const state = '/home/wangzishi/.local/share/poms-r3hijk';
assert.equal(process.cwd(), root);
const out = 'tmp/rust-r3hijk/final-integrity02';
assert(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const protectedFiles = guardNative();
const build = JSON.parse(fs.readFileSync('tmp/rust-r3hijk/rust-check09/report01.json'));
for (const input of build.after) assert.deepEqual(pin(input.file), input);
assert.deepEqual(pin(build.artifact.file), build.artifact);
const runtime = JSON.parse(fs.readFileSync(state + '/private/rust-candidate04.json'));
assert.equal(sha(fs.readFileSync('/proc/' + runtime.pid + '/cmdline')), runtime.argvSha256);
assert.equal(runtime.artifactSha256, build.artifact.rawBytesSha256);
const result = spawnSync(build.artifact.file, ['--openapi'], { env: { PATH: '/usr/bin:/bin' }, encoding: null, maxBuffer: 16000000 });
assert.equal(result.status, 0);
fs.writeFileSync(out + '/rust-openapi-original.json', result.stdout, { flag: 'wx' });
const spec = JSON.parse(result.stdout), native = JSON.parse(fs.readFileSync('libs/shared/api-spec/openapi.json'));
const operations = s => Object.entries(s.paths).flatMap(([path, methods]) => Object.entries(methods).filter(([method]) => ['get','post','put','patch','delete','head','options'].includes(method)).map(([method, value]) => ({ path, method, value })));
assert.equal(operations(spec).length, 173);
assert.equal(Object.keys(spec.paths).length, 138);
assert.equal(Object.keys(spec.components.schemas).length, 585);
assert.deepEqual(spec.components.schemas, native.components.schemas);
assert.equal(operations(native).length, 291);
assert.equal(Object.keys(native.paths).length, 237);
const subset = JSON.parse(fs.readFileSync('tools/rust-r3hijk/openapi.json'));
for (const operation of operations(subset)) assert.deepEqual(spec.paths[operation.path][operation.method], operation.value);
assert.equal(operations(subset).length, 28);
const require = createRequire(import.meta.url);
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const identity = JSON.parse(fs.readFileSync(state + '/identity.json'));
const databases = [];
for (const backend of ['nest', 'rust']) {
  const database = 'poms_r3hijk_' + backend;
  const db = new Client({ host:'127.0.0.1',port:22433,database,user:'poms_r0e_owner',password:fs.readFileSync(state + '/private/owner-password','utf8'),application_name:'poms-r3hijk-final-integrity' });
  await db.connect();
  try {
    assert.equal((await db.query('select instance_id::text marker from r3hijk_control.marker')).rows[0].marker, identity.marker);
    const migrations = (await db.query('select name from poms.poms_migrations order by name')).rows;
    assert.equal(migrations.length, 92);
    const columns = (await db.query("select table_name,column_name,ordinal_position,column_default,is_nullable,data_type,character_maximum_length,numeric_precision,numeric_scale,udt_schema,udt_name from information_schema.columns where table_schema='poms' order by table_name,ordinal_position")).rows;
    const constraints = (await db.query("select c.relname table_name,con.conname,pg_get_constraintdef(con.oid) definition from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' order by c.relname,con.conname")).rows;
    const indexes = (await db.query("select tablename,indexname,indexdef from pg_indexes where schemaname='poms' order by tablename,indexname")).rows;
    const privileges = (await db.query("select c.relname table_name,v.privilege,has_table_privilege('poms_r3hijk_app',format('%I.%I',n.nspname,c.relname),v.privilege) allowed from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join(values('SELECT'),('INSERT'),('UPDATE'),('DELETE')) v(privilege) where n.nspname='poms' and c.relkind='r' order by c.relname,v.privilege")).rows;
    assert.equal(privileges.length, 428); assert(privileges.every(x => x.allowed));
    const schema = { migrations, columns, constraints, indexes, privileges };
    fs.writeFileSync(out + '/' + backend + '-schema.json', JSON.stringify(schema,null,2)+'\n', {flag:'wx'});
    databases.push({ database, schema });
  } finally { await db.end(); }
}
assert.deepEqual(databases[0].schema, databases[1].schema);
const walk = directory => fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(directory+'/'+e.name):[directory+'/'+e.name]);
const clientCount = walk('libs/shared/api-client').length;
const migrationCount = walk('apps/poms-api/src/migrations').filter(f=>/\/Migration.*\.ts$/.test(f)).length;
assert.equal(clientCount,579); assert.equal(migrationCount,92);
const syntax = [];
for (const file of walk('tools/rust-r3hijk').filter(f=>f.endsWith('.mjs'))) {
  const checked = spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert.equal(checked.status,0,file+' syntax');
  syntax.push({ ...pin(file), exitCode:checked.status });
}
const report = {kind:'R3HIJK-final-executable-contract-and-schema-integrity',createdAt:new Date().toISOString(),protectedNativeSources:protectedFiles,rustSourceInputs:build.after.length,artifact:build.artifact,finalRuntimeIdentityVerified:true,openapi:{paths:138,operations:173,schemas:585,newOperationsExactlyMatchOriginalContract:28,nativePaths:237,nativeOperations:291},clientCount,migrationCount,databases:databases.map(x=>({database:x.database,tables:107,migrations:92,individualPrivileges:428,allRestored:true})),bothActualSchemasEqual:true,schemaReceipts:['nest','rust'].map(x=>pin(out+'/'+x+'-schema.json')),syntax,allChecksPassed:true,DDLChanged:false,G3Certified:false,G4Certified:false};
fs.writeFileSync(out+'/report01.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({allChecksPassed:true,protectedNativeSources:protectedFiles,openapi:report.openapi,clientCount,migrationCount,schemasEqual:true,syntaxFiles:syntax.length}));
