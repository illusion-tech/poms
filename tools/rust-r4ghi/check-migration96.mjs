import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createContext, ownedFile } from './business/context.mjs';
import { capture } from './business/snapshot.mjs';
const ctx=createContext({epoch:'g2-orm96',run:'check01'});
const before=await capture(ctx,'orm-before01');
const env={PATH:'/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin:/usr/bin:/bin',HOME:'/home/wangzishi',USER:'wangzishi',LANG:'C.UTF-8',NODE_ENV:'test',DB_CONNECT:'true',DB_HOST:ctx.host,DB_PORT:String(ctx.port),DB_DATABASE:ctx.databases[0],DB_USER:ctx.owner,DB_PASSWORD:ownedFile(ctx.private+'/owner-password').toString(),DB_SCHEMA:'poms',JWT_SECRET:ownedFile(ctx.private+'/jwt-secret').toString(),POMS_ENV_FILE:ctx.private+'/native.env',MIKRO_ORM_CLI_TS_CONFIG_PATH:'tsconfig.base.json',PGOPTIONS:'-c default_transaction_read_only=on'};
const log=ctx.priv+'/orm-check-original.bin';const fd=fs.openSync(log,'wx',0o600);let result;
try{result=spawnSync(process.execPath,[ctx.mirror+'/node_modules/@mikro-orm/cli/cli.js','migration:check','--config','apps/poms-api/src/mikro-orm.config.ts'],{cwd:ctx.mirror,env,stdio:['ignore',fd,fd],timeout:180000});}finally{fs.closeSync(fd);}
const after=await capture(ctx,'orm-after01');
for(const name of ctx.databases){
    assert.deepEqual(before.databases[name].meta.normative,after.databases[name].meta.normative,'Catalog changed during ORM check');
    assert.deepEqual(before.databases[name].meta.sequences,after.databases[name].meta.sequences,'Sequence changed during ORM check');
    for(const [name,table]of Object.entries(before.databases[name].tables))assert.deepEqual(table,after.databases[name].tables[name],'Table snapshot changed during ORM check');
}
ctx.artifact('orm-check-receipt01.json',{kind:'actual-isolated-native-M96-MikroORM-migration-check',exitCode:result.status,errorCode:result.error?.code??null,originalLog:log,before:before.manifest,after:after.manifest,allDatabaseDataAndCatalogStable:true,readonlyRequested:true,productG3:false},{kind:'actual-native-M96-ORM-check',exitCode:result.status,allDatabaseDataAndCatalogStable:true,productG3:false});
console.log(JSON.stringify({exitCode:result.status,errorCode:result.error?.code??null,privateOriginal:log,dataAndCatalogStable:true}));
if(result.status!==0)process.exitCode=1;
