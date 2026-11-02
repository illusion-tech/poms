// Root-only current-source checks. Logs stay in this task's private directory.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {parse} from 'dotenv';
const root=process.cwd(),priv='/home/wangzishi/.local/share/poms-r3cdefg/private';assert.equal(root,'/home/wangzishi/projects/poms-rust-r3cdefg');
const output=root+'/tmp/rust-r3cdefg/shared-checks01';assert(!fs.existsSync(output));fs.mkdirSync(output,{recursive:true});const logs=priv+'/shared-checks01';fs.mkdirSync(logs,{mode:0o700});
const sha=b=>createHash('sha256').update(b).digest('hex'),pin=file=>{const b=fs.readFileSync(root+'/'+file);return{file,bytes:b.length,rawBytesSha256:sha(b)}};
const manifest=JSON.parse(fs.readFileSync(root+'/docs/design/rust-r3cdefg/g1-input-manifest02.json'));for(const p of manifest.nativeFiles)assert.deepEqual(pin(p.file),p);
const env={};for(const k of ['PATH','HOME','USER','LANG','LC_ALL','TMPDIR'])if(process.env[k])env[k]=process.env[k];Object.assign(env,{NX_DAEMON:'false',NX_ISOLATE_PLUGINS:'false',CI:'true',NO_PROXY:'localhost,127.0.0.1,::1'});
const checks=[],nx=root+'/node_modules/nx/dist/bin/nx.js',cli=root+'/node_modules/@mikro-orm/cli/cli.js';
function run(name,args,extra={}){const start=new Date().toISOString(),file=logs+'/'+name+'.log',fd=fs.openSync(file,'wx',0o600);let result;try{result=spawnSync(process.execPath,args,{cwd:root,env:{...env,...extra},stdio:['ignore',fd,fd],timeout:300000})}finally{fs.closeSync(fd)}const b=fs.readFileSync(file),record={name,command:[process.execPath,...args],startedAt:start,completedAt:new Date().toISOString(),exitCode:result.status,signal:result.signal,errorName:result.error?.name||null,privateLog:{file,bytes:b.length,rawBytesSha256:sha(b)}};checks.push(record);fs.writeFileSync(output+'/'+name+'.json',JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({name,exitCode:record.exitCode,errorName:record.errorName}));}
run('native-and-admin-lint',[nx,'run-many','-t','lint','--projects=poms-api,poms-admin','--parallel=2','--skip-nx-cache']);
run('native-unit-tests',[nx,'test','poms-api','--skip-nx-cache']);
run('admin-unit-tests',[nx,'test','poms-admin','--skip-nx-cache']);
run('admin-build',[nx,'build','poms-admin','--skip-nx-cache']);
const dbEnv={...parse(fs.readFileSync(priv+'/nest.env')),DB_USER:'poms_r0e_owner',DB_PASSWORD:fs.readFileSync(priv+'/owner-password','utf8'),NODE_ENV:'test',DB_DEBUG:'false',POMS_ENV_FILE:priv+'/nest.env',MIKRO_ORM_CLI_TS_CONFIG_PATH:'tsconfig.base.json'};assert.equal(dbEnv.DB_DATABASE,'poms_r3ab_nest');assert.equal(dbEnv.DB_PORT,'22432');
run('original-migration-check',[cli,'migration:check','--config','apps/poms-api/src/mikro-orm.config.ts'],dbEnv);
run('original-schema-dump',[cli,'schema:update','--dump','--config','apps/poms-api/src/mikro-orm.config.ts'],dbEnv);
for(const p of manifest.nativeFiles)assert.deepEqual(pin(p.file),p,'Frozen Native source changed by generation/check');
fs.writeFileSync(output+'/report01.json',JSON.stringify({kind:'R3CDEFG-current-source-common-checks',createdAt:new Date().toISOString(),checks,frozenNativeSourceCount:manifest.nativeFiles.length,frozenNativeBeforeAfterEqual:true,DDLExecuted:false,migrationCheckFailureRequiresClassification:true,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
