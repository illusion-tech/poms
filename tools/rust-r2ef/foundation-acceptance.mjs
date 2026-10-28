import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),{invokeBatchFixture}=require('./batch-client.cjs'),{fixtureCredentials}=require('./fixture-protocol.cjs'),runtime=require('../e2e/runtime.cjs');
const [backend,receiptFile,tag]=process.argv.slice(2);assert.equal(process.argv.length,5);assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]{1,35}$/.test(tag));
const receipt=JSON.parse(readFileSync(receiptFile));assert.equal(receipt.backend,backend);assert.equal(receipt.sourceHead,'7a343c543fe0031d7d6b42c1f7e18a7e861c72b7');assert.equal(receipt.origin,'http://127.0.0.1:'+(backend==='nest'?'5500':'5501'));
const runId=randomUUID(),out=`tmp/rust-r2ef/foundation-${process.platform}-${backend}-${tag}.json`,log=`tmp/rust-r2ef/foundation-${process.platform}-${backend}-${tag}.log`;assert(!existsSync(out));
const report={formatVersion:1,backend,tag,runId,sourceHead:receipt.sourceHead,node:process.version,platform:process.platform,log,result:'pending',steps:[]};let failed=false;
const invoke=action=>invokeBatchFixture({formatVersion:1,backend,runId,account:'none',action});
try{const r=await invoke('prepare');report.steps.push({action:'prepare',state:r.state,matched:r.matched,changed:r.changed});
    const credentials=fixtureCredentials(runId,'admin');
    const env={...process.env,POMS_E2E_MODE:'external',POMS_E2E_SUITE:'foundation',POMS_E2E_ENV_PROFILE:'r2ef',POMS_API_BASE_URL:receipt.origin,POMS_E2E_FIXTURE_RUN_ID:runId,POMS_E2E_USERNAME:credentials.username,POMS_E2E_PASSWORD:credentials.password,NX_DAEMON:'false',NX_TUI:'false',CI:'true'};
    const pkg=require.resolve('nx/package.json'),p=JSON.parse(readFileSync(pkg)),nx=path.resolve(path.dirname(pkg),typeof p.bin==='string'?p.bin:p.bin.nx);
    await runtime.runOwnedCommand({executable:process.execPath,args:[nx,'run','poms-api-e2e:e2e','--skip-nx-cache'],cwd:process.cwd(),env,logPath:path.resolve(log),timeoutMs:300000});report.testResult='pass';
}catch(error){failed=true;report.error={name:error.name};}
finally{for(let pass=0;pass<2;pass++)try{const r=await invoke('cleanup');report.steps.push({action:'cleanup',pass,result:r});assert.equal(r.state,'cleaned');assert.equal(r.extension.zero,true);if(pass===1){assert.equal(r.matched,0);assert.equal(r.changed,0);}}catch(error){failed=true;report.steps.push({action:'cleanup',pass,error:{name:error.name}});}report.result=failed?'fail':'pass';writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({backend,result:report.result,output:out,log}));}if(failed)process.exitCode=1;
