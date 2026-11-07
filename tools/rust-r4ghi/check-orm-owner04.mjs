import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createContext, ownedFile } from './business/context.mjs';
import { capture, readRows } from './business/snapshot.mjs';
const ctx=createContext({epoch:'g2-orm96',run:'owner04'});
const ownerEnv=ctx.private+'/orm-owner04.env';
const lines=ownedFile(ctx.private+'/native.env').toString().split(/\r?\n/).filter(line=>! /^(?:DATABASE_URL|DB_USER|DB_PASSWORD|DB_DATABASE|DB_HOST|DB_PORT|DB_CONNECT|POMS_ENV_FILE)=/.test(line));
lines.push('DB_CONNECT=true','DB_HOST='+ctx.host,'DB_PORT='+ctx.port,'DB_DATABASE='+ctx.databases[0],'DB_USER='+ctx.owner,'DB_PASSWORD='+ownedFile(ctx.private+'/owner-password').toString());
fs.writeFileSync(ownerEnv,lines.join('\n')+'\n',{flag:'wx',mode:0o600});
const before=await capture(ctx,'orm-before01');
const env={PATH:'/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin:/usr/bin:/bin',HOME:'/home/wangzishi',USER:'wangzishi',LANG:'C.UTF-8',NODE_ENV:'test',DB_CONNECT:'true',DB_HOST:ctx.host,DB_PORT:String(ctx.port),DB_DATABASE:ctx.databases[0],DB_USER:ctx.owner,DB_PASSWORD:ownedFile(ctx.private+'/owner-password').toString(),DB_SCHEMA:'poms',JWT_SECRET:ownedFile(ctx.private+'/jwt-secret').toString(),POMS_ENV_FILE:ownerEnv,MIKRO_ORM_CLI_TS_CONFIG_PATH:'tsconfig.base.json',PGOPTIONS:'-c default_transaction_read_only=on'};
const log=ctx.priv+'/orm-check-original.bin';const fd=fs.openSync(log,'wx',0o600);let result;
try{result=spawnSync(process.execPath,[ctx.mirror+'/node_modules/@mikro-orm/cli/cli.js','migration:check','--config','apps/poms-api/src/mikro-orm.config.ts'],{cwd:ctx.mirror,env,stdio:['ignore',fd,fd],timeout:180000});}finally{fs.closeSync(fd);}
ctx.artifact("orm-command-result01.json",{exitCode:result.status,errorCode:result.error?.code??null,privateOriginal:log});
const after=await capture(ctx,'orm-after01');
for(const databaseName of [ctx.databases[0]]){
    assert.deepEqual(before.databases[databaseName].meta.normative,after.databases[databaseName].meta.normative,'Catalog changed during ORM check');
    assert.deepEqual(before.databases[databaseName].meta.sequences,after.databases[databaseName].meta.sequences,'Sequence changed during ORM check');
    for(const [tableName,table]of Object.entries(before.databases[databaseName].tables))assert.deepEqual(readRows(table),readRows(after.databases[databaseName].tables[tableName]),'Table rows changed during ORM check');
}
ctx.artifact('orm-check-receipt01.json',{kind:'actual-isolated-native-M96-MikroORM-migration-check',exitCode:result.status,errorCode:result.error?.code??null,originalLog:log,before:before.manifest,after:after.manifest,nativeDataAndCatalogStable:true,readonlyRequested:true,productG3:false},{kind:'actual-native-M96-ORM-check',exitCode:result.status,nativeDataAndCatalogStable:true,productG3:false});
console.log(JSON.stringify({exitCode:result.status,errorCode:result.error?.code??null,privateOriginal:log,nativeDataAndCatalogStable:true}));
if(result.status!==0)process.exitCode=1;
