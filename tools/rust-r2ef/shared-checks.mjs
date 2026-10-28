import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {validateSource,sourceHead} from './fixture-guard.mjs';
const require=createRequire(import.meta.url),runtime=require('../e2e/runtime.cjs');
const tag=process.argv[2];assert.equal(process.argv.length,3);assert(/^[a-z0-9-]{1,35}$/.test(tag));
const output=`tmp/rust-r2ef/shared-checks-${process.platform}-${tag}.json`;assert(!existsSync(output));validateSource();
const nxPackage=require.resolve('nx/package.json'),p=JSON.parse(readFileSync(nxPackage));const nx=path.resolve(path.dirname(nxPackage),typeof p.bin==='string'?p.bin:p.bin.nx);
const tsc=require.resolve('typescript/bin/tsc');
const env={...process.env,NX_DAEMON:'false',NX_TUI:'false',NX_SKIP_NX_CACHE:'true',NG_CLI_ANALYTICS:'false',CI:'true'};
for(const k of Object.keys(env))if(/^(?:PG|DB_|MIKRO_)/i.test(k)||/^(?:DATABASE_URL|JWT_SECRET|NODE_OPTIONS|POMS_ENV_FILE)$/.test(k))delete env[k];
const report={formatVersion:1,sourceHead,node:process.version,platform:process.platform,result:'pending',steps:[]};
const steps=[
    ['lint-tests',[nx,'run-many','--targets=lint,test','--projects=poms-api,poms-admin,poms-admin-e2e','--parallel=2','--skip-nx-cache']],
    ['admin-production-build',[nx,'run','poms-admin:build','--skip-nx-cache']],
    ['admin-e2e-typecheck',[tsc,'--project','tools/e2e/browser-tsconfig.json','--noEmit','--pretty','false']],
    ['openapi-client',[nx,'run','shared-api-client:check','--skip-nx-cache']]
];
try{
    for(const [id,args] of steps){const log=`tmp/rust-r2ef/shared-${process.platform}-${tag}-${id}.log`;const step={id,args:args.map(a=>a===nx?'installed nx CLI':a===tsc?'installed tsc CLI':a),log,result:'pending'};report.steps.push(step);
        try{await runtime.runOwnedCommand({executable:process.execPath,args,cwd:process.cwd(),env,logPath:path.resolve(log),timeoutMs:300000});step.result='pass';}
        catch(error){step.result='fail';step.failureType=error.name;report.result='fail';}
        finally{step.logSha256=createHash('sha256').update(readFileSync(log)).digest('hex');console.log(JSON.stringify(step));}
    }
    validateSource();if(report.result==='pending')report.result='pass';
}finally{writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
if(report.result!=='pass')process.exitCode=1;
