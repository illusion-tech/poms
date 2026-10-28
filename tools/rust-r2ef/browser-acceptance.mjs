import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),runtime=require('../e2e/runtime.cjs');
const [backend,receiptFile,tag]=process.argv.slice(2);assert.equal(process.argv.length,5);assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]{1,35}$/.test(tag));
const receipt=JSON.parse(readFileSync(receiptFile));assert.equal(receipt.backend,backend);assert.equal(receipt.sourceHead,'7a343c543fe0031d7d6b42c1f7e18a7e861c72b7');assert.equal(receipt.origin,'http://127.0.0.1:'+(backend==='nest'?'5500':'5501'));
const stem=`tmp/rust-r2ef/browser-${process.platform}-${backend}-${tag}`,out=stem+'.json',jsonReport=stem+'/report.json',log=stem+'.log';assert(!existsSync(out)&&!existsSync(stem));mkdirSync(stem,{recursive:true,mode:0o700});
const report={formatVersion:1,backend,tag,sourceHead:receipt.sourceHead,node:process.version,platform:process.platform,receiptFile,receiptSha256:createHash('sha256').update(readFileSync(receiptFile)).digest('hex'),log,jsonReport,result:'pending'};
try{
    const env={...process.env,POMS_ADMIN_E2E_SUITE:'foundation-audit',POMS_E2E_MODE:'external',POMS_E2E_ENV_PROFILE:'r2ef',POMS_E2E_SUITE:'foundation',POMS_R2EF_BACKEND:backend,POMS_API_BASE_URL:receipt.origin,POMS_ADMIN_PORT_SEED:'1200',PLAYWRIGHT_JSON_OUTPUT_FILE:path.resolve(jsonReport),NX_DAEMON:'false',NX_TUI:'false',CI:'true'};
    for(const key of ['POMS_ENV_FILE','POMS_E2E_FIXTURE_RUN_ID','POMS_E2E_USERNAME','POMS_E2E_PASSWORD'])delete env[key];
    const pkg=require.resolve('@playwright/test/package.json'),p=JSON.parse(readFileSync(pkg)),cli=path.resolve(path.dirname(pkg),typeof p.bin==='string'?p.bin:p.bin.playwright);
    await runtime.runOwnedCommand({executable:process.execPath,args:[cli,'test','--config','apps/poms-admin-e2e/playwright.config.ts','--workers=1','--reporter=list,json','--output='+stem+'/results'],cwd:process.cwd(),env,logPath:path.resolve(log),timeoutMs:300000});
    const raw=JSON.parse(readFileSync(jsonReport));assert.equal(raw.stats.expected,2);assert.equal(raw.stats.unexpected,0);assert.equal(raw.stats.skipped,0);report.stats=raw.stats;report.result='pass';
}catch(error){report.result='fail';report.error={name:error.name};if(existsSync(jsonReport))report.stats=JSON.parse(readFileSync(jsonReport)).stats;process.exitCode=1;}
finally{try{await runtime.assertPortAvailable({host:'127.0.0.1',port:5600});report.adminPortReleased=true;}catch{report.adminPortReleased=false;report.result='fail';process.exitCode=1;}writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({backend,platform:process.platform,result:report.result,stats:report.stats,adminPortReleased:report.adminPortReleased,output:out,log}));}
