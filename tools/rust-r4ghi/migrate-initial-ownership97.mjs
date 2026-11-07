// Root-only M97 execution. No schema diff is executed and no existing data is rewritten.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import net from 'node:net';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {catalog} from './business/snapshot.mjs';
assert.equal(process.platform,'linux');assert.deepEqual(process.argv.slice(2),['--execute']);
const win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',mirror='/home/wangzishi/projects/poms-rust-r4ghi';
const state='/home/wangzishi/.local/share/poms-r4ghi',priv=state+'/private',out=win+'/tmp/rust-r4ghi/root/migration97';
const require=createRequire(mirror+'/package.json'),{Migration,Migrator}=require('@mikro-orm/migrations'),{MikroORM}=require('@mikro-orm/postgresql'),ts=require('typescript');
const {Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg'),sha=b=>createHash('sha256').update(b).digest('hex');
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const identity=JSON.parse(fs.readFileSync(state+'/identity.json')),provision=JSON.parse(fs.readFileSync(win+'/tmp/rust-r4ghi/root/environment01/provision01.json'));
assert.equal(identity.namespace,'poms-r4ghi');assert.equal(identity.marker,'0ca66699-053b-4f40-ad5c-82fed4cf1a6f');assert.equal(identity.port,25434);
assert.equal(identity.base,'aaa4b16ac66092f0cb1dc6646a02cf14e80823ee');assert.deepEqual(identity.databases,['poms_r4ghi_native','poms_r4ghi_rust']);
const passwordFile=priv+'/owner-password',stat=fs.lstatSync(passwordFile);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&(stat.mode&0o077)===0);
const password=fs.readFileSync(passwordFile,'utf8');assert(/^[a-f0-9]{64}$/.test(password));
const promotion=JSON.parse(fs.readFileSync(win+'/docs/design/rust-r4ghi/initial-ownership-migration-promotion03.json'));
assert.equal(sha(fs.readFileSync(win+'/'+promotion.target)),promotion.targetSHA256);assert.equal(sha(fs.readFileSync(win+'/'+promotion.input)),promotion.inputSHA256);
const target=path.basename(promotion.target,'.ts');
const sourceManifest=JSON.parse(fs.readFileSync(win+'/tools/openapi/checkpoints/r4ghi-s6/input-manifest01.json'));
assert.equal(sourceManifest.inputs.find(x=>x.file===promotion.target)?.rawBytesSHA256,promotion.targetSHA256);
const files=fs.readdirSync(win+'/apps/poms-api/src/migrations').filter(n=>/^Migration\d{14}.*\.ts$/.test(n)).sort();assert.equal(files.length,97);
const migrations=files.map(name=>{const rel='apps/poms-api/src/migrations/'+name,raw=fs.readFileSync(win+'/'+rel),module={exports:{}};
 const js=ts.transpileModule(raw.toString(),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{require:n=>{assert.equal(n,'@mikro-orm/migrations');return{Migration};},module,exports:module.exports},{filename:name,timeout:5000});
 const classes=Object.values(module.exports);assert.equal(classes.length,1);return{name:name.slice(0,-3),class:classes[0],pin:{file:rel,sha256:sha(raw)}};});
let sequence=0;
function artifact(label,value){const file=priv+'/migration97-'+label+'.json',raw=Buffer.from(JSON.stringify(value,null,2)+'\n');fs.writeFileSync(file,raw,{flag:'wx',mode:0o600});return{file,bytes:raw.length,rawBytesSha256:sha(raw)};}
async function guard(c,name){const r=(await c.query("SELECT current_database() db,current_user usr,current_setting('port') port,current_setting('server_version_num') version,current_setting('poms.r0e_isolated',true) isolated,(SELECT oid::text FROM pg_database WHERE datname=current_database()) oid")).rows[0];
 assert.deepEqual(r,{db:name,usr:'poms_r0e_owner',port:'15432',version:'150012',isolated:'on',oid:provision.databaseOids.find(x=>x.database===name).oid});
 assert.deepEqual((await c.query('SELECT instance_id::text,namespace,source_base FROM r4ghi_control.marker')).rows,[{instance_id:identity.marker,namespace:identity.namespace,source_base:identity.base}]);}
async function db(name,fn){assert(identity.databases.includes(name));const c=new Client({host:'127.0.0.1',port:25434,database:name,user:'poms_r0e_owner',password,application_name:'poms-r4ghi-M97',connectionTimeoutMillis:8000});await c.connect();try{await guard(c,name);return await fn(c);}finally{await c.end();}}
async function snapshot(name,label){return db(name,async c=>{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{const meta=await catalog(c,139),tables={};for(const t of meta.tables){assert(/^[a-z0-9_]+$/.test(t.name));const rows=(await c.query('SELECT row_to_json(t)::text raw,t.xmin::text xmin FROM poms."'+t.name+'" t ORDER BY row_to_json(t)::text')).rows;tables[t.name]=rows;}const functionBody=(await c.query("SELECT prosrc FROM pg_proc WHERE oid='poms.jghi_ownership_origin_insert_guard()'::regprocedure")).rows[0].prosrc;const result={database:name,meta,tables,functionBody};const pin=artifact(label,result);await c.query('COMMIT');return{...result,pin};}catch(e){await c.query('ROLLBACK');throw e;}});}
function compare(before,after){assert.equal(after.functionBody,fs.readFileSync(win+'/'+promotion.input,'utf8').split('$$')[1]);assert.notEqual(before.functionBody,after.functionBody);assert.deepEqual(Object.keys(before.tables),Object.keys(after.tables));for(const name of Object.keys(before.tables))if(name!=='poms_migrations')assert.deepEqual(after.tables[name],before.tables[name],name+' changed');
 const previous=before.tables.poms_migrations,added=after.tables.poms_migrations.filter(row=>!previous.some(old=>old.raw===row.raw));assert.equal(added.length,1);assert.equal(after.tables.poms_migrations.length,97);assert.equal(previous.length,96);for(const row of previous)assert(after.tables.poms_migrations.some(after=>after.raw===row.raw&&after.xmin===row.xmin));
 assert.equal(JSON.parse(added[0].raw).name,target);
 const old=structuredClone(before.meta),next=structuredClone(after.meta);
 for(const data of [old,next])data.normative.functions=data.normative.functions.map(raw=>{const row=JSON.parse(raw);if(row.schema==='poms'&&row.proname==='jghi_ownership_origin_insert_guard')delete row.definition;return JSON.stringify(row);});
 const a=old.sequences.find(x=>x.name==='poms_migrations_id_seq'),b=next.sequences.find(x=>x.name==='poms_migrations_id_seq');assert(a&&b);assert.equal(BigInt(b.value),BigInt(a.value)+1n);assert.equal(b.is_called,true);b.value=a.value;b.is_called=a.is_called;assert.deepEqual(next,old,'Only registered function body and migration-log sequence may change');
 return{businessTablesPreserved:138,businessRowsAndXminPreserved:true,onlyAddedMigrationLog:target,functionOIDAndOwnerACLAndAllOtherCatalogPreserved:true,migrationSequenceAdvancedExactlyOnce:true};}
try{
 await new Promise((resolve,reject)=>{const s=net.createConnection({host:'127.0.0.1',port:31441});s.setTimeout(2000,()=>{s.destroy();reject(new Error('API listener unknown'));});s.once('connect',()=>{s.destroy();reject(new Error('Stop owned API before migration'));});s.once('error',e=>e.code==='ECONNREFUSED'?resolve():reject(e));});
 const receipts=[];
 for(const name of identity.databases){await db(name,async c=>{assert.equal((await c.query('SELECT count(*)::int n FROM poms.poms_migrations')).rows[0].n,96);assert.equal((await c.query('SELECT count(*)::int n FROM pg_stat_activity WHERE datname=ANY($1::text[]) AND usename=ANY($2::text[])',[identity.databases,identity.roles])).rows[0].n,0);});
  const before=await snapshot(name,'before-'+name),orm=await MikroORM.init({host:'127.0.0.1',port:25434,dbName:name,user:'poms_r0e_owner',password,schema:'poms',entities:[],discovery:{warnWhenNoEntities:false},extensions:[Migrator],ensureDatabase:false,debug:false,logger:()=>{},migrations:{migrationsList:migrations.map(({name,class:cl})=>({name,class:cl})),tableName:'poms_migrations',transactional:true,allOrNothing:true,safe:true,snapshot:false}});
  try{const rows=await orm.em.getConnection().execute('SELECT current_database() db,current_user usr,(SELECT instance_id::text FROM r4ghi_control.marker) marker');assert.deepEqual(rows,[{db:name,usr:'poms_r0e_owner',marker:identity.marker}]);
   const pending=await orm.migrator.getPending();assert.equal(pending.length,1);assert.equal(pending[0].name,target);artifact('intent-'+name,{database:name,target,before:before.pin,promotion,inputs:migrations.map(x=>x.pin)});
   const applied=await orm.migrator.up();assert.equal(applied.length,1);assert.equal((await orm.migrator.getExecuted()).length,97);
  }finally{await orm.close(true);}
  const after=await snapshot(name,'after-'+name),proof=compare(before,after);receipts.push({database:name,before:before.pin,after:after.pin,...proof});
 }
 const result={kind:'actual-owned-M97-function-only-forward-migration',capturedAt:new Date().toISOString(),namespace:identity.namespace,marker:identity.marker,sourceInput:promotion.input,inputSHA256:promotion.inputSHA256,receipts,newTables:0,newColumns:0,oldOriginsBackfilled:0,allOrNothingAcrossDatabases:false,G3Certified:false};
 const pin=artifact('complete',result);fs.writeFileSync(out+'/receipt.json',JSON.stringify({kind:result.kind,original:pin,databases:receipts.map(({database,...rest})=>({database,businessRowsAndXminPreserved:rest.businessRowsAndXminPreserved,migrationsBefore:96,migrationsAfter:97,tables:139})),G3Certified:false},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({completed:true,databases:2,migrations:97,tables:139,oldRowsPreserved:true,receipt:out+'/receipt.json',G3Certified:false}));
}catch(e){artifact('failure-'+(++sequence),{name:e.name,message:e.message,stack:e.stack,code:e.code});console.error(JSON.stringify({status:'failed-or-partial',privateOriginalPreserved:true,G3Certified:false}));process.exitCode=1;}
