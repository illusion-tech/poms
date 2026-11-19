import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createContext, ownedFile } from './business/context.mjs';
import { capture, readRows } from './business/snapshot.mjs';
const ctx=createContext({epoch:'g2-orm96',run:'owner-dump07'});
const ownerEnv=ctx.private+'/orm-owner-dump07.env';
const lines=ownedFile(ctx.private+'/native.env').toString().split(/\r?\n/).filter(line=>! /^(?:DATABASE_URL|DB_USER|DB_PASSWORD|DB_DATABASE|DB_HOST|DB_PORT|DB_CONNECT|POMS_ENV_FILE)=/.test(line));
lines.push('DB_CONNECT=true','DB_HOST='+ctx.host,'DB_PORT='+ctx.port,'DB_DATABASE='+ctx.databases[0],'DB_USER='+ctx.owner,'DB_PASSWORD='+ownedFile(ctx.private+'/owner-password').toString());
fs.writeFileSync(ownerEnv,lines.join('\n')+'\n',{flag:'wx',mode:0o600});
const inputSHA=bytes=>createHash('sha256').update(bytes).digest('hex');
function listNative(folder){return fs.readdirSync(ctx.win+'/'+folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?listNative(folder+'/'+e.name):e.name.endsWith('.ts')?[folder+'/'+e.name]:[]);}
const nativeInputs=listNative('apps/poms-api/src').sort().map(file=>{const a=inputSHA(fs.readFileSync(ctx.win+'/'+file)),b=inputSHA(fs.readFileSync(ctx.mirror+'/'+file));assert.equal(a,b,'Actual native source mirror differs');return{file,sha256:a};});
ctx.artifact('orm-input-sources07.json',{nativeInputs,exactCorrectiveManifests:['orm-generator-promotion21.json','orm-upload-fk-promotion22.json','orm-fk-promotion19.json']},{kind:'actual-native-check-source-closure',files:nativeInputs.length,allRootMirrorBytesMatch:true});
const before=await capture(ctx,'orm-before01');
const env={PATH:'/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin:/usr/bin:/bin',HOME:'/home/wangzishi',USER:'wangzishi',LANG:'C.UTF-8',NODE_ENV:'test',DB_CONNECT:'true',DB_HOST:ctx.host,DB_PORT:String(ctx.port),DB_DATABASE:ctx.databases[0],DB_USER:ctx.owner,DB_PASSWORD:ownedFile(ctx.private+'/owner-password').toString(),DB_SCHEMA:'poms',JWT_SECRET:ownedFile(ctx.private+'/jwt-secret').toString(),POMS_ENV_FILE:ownerEnv,MIKRO_ORM_CLI_TS_CONFIG_PATH:'tsconfig.base.json',PGOPTIONS:'-c default_transaction_read_only=on'};
const log=ctx.priv+'/orm-check-original.bin';const fd=fs.openSync(log,'wx',0o600);let result;
try{result=spawnSync(process.execPath,[ctx.mirror+'/node_modules/@mikro-orm/cli/cli.js','schema:update','--dump','--no-drop-tables','--config','apps/poms-api/src/mikro-orm.config.ts'],{cwd:ctx.mirror,env,stdio:['ignore',fd,fd],timeout:180000});}finally{fs.closeSync(fd);}
ctx.artifact("orm-command-result01.json",{exitCode:result.status,errorCode:result.error?.code??null,privateOriginal:log});
const after=await capture(ctx,'orm-after01');
assert(nativeInputs.every(p=>inputSHA(fs.readFileSync(ctx.win+'/'+p.file))===p.sha256&&inputSHA(fs.readFileSync(ctx.mirror+'/'+p.file))===p.sha256),'Native sources changed during actual check');
for(const databaseName of [ctx.databases[0]]){
    assert.deepEqual(before.databases[databaseName].meta.normative,after.databases[databaseName].meta.normative,'Catalog changed during ORM check');
    assert.deepEqual(before.databases[databaseName].meta.sequences,after.databases[databaseName].meta.sequences,'Sequence changed during ORM check');
    for(const [tableName,table]of Object.entries(before.databases[databaseName].tables))assert.deepEqual(readRows(table),readRows(after.databases[databaseName].tables[tableName]),'Table rows changed during ORM check');
}
ctx.artifact('orm-check-receipt01.json',{kind:'actual-isolated-native-M96-MikroORM-migration-check',exitCode:result.status,errorCode:result.error?.code??null,originalLog:log,before:before.manifest,after:after.manifest,nativeDataAndCatalogStable:true,readonlyRequested:true,productG3:false},{kind:'actual-native-M96-ORM-check',exitCode:result.status,nativeDataAndCatalogStable:true,productG3:false});
console.log(JSON.stringify({exitCode:result.status,errorCode:result.error?.code??null,privateOriginal:log,nativeDataAndCatalogStable:true}));
if(result.status!==0)process.exitCode=1;
