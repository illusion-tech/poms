import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {databaseClient,privateRoot} from './database-client.mjs';
import {executeBatchFixture} from './batch-fixture.mjs';
import {validateSource,sourceHead} from './fixture-guard.mjs';
const require=createRequire(import.meta.url),runtime=require('../e2e/runtime.cjs');
assert.equal(process.platform,'linux');assert.equal(process.argv.length,2);validateSource();
const out='tmp/rust-r2ef/final-state01.json';assert(!existsSync(out));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={formatVersion:1,sourceHead,node:process.version,result:'pending',absenceRestore:[],journals:[],ports:[],startedAt:new Date().toISOString()};let failed=false;
for(const backend of ['nest','rust']){
    const client=await databaseClient(backend);let request;
    try{
        const runId=randomUUID();request=action=>({formatVersion:1,runId,backend,action,account:'none'});
        await executeBatchFixture(client,request('prepare'));const absent=await executeBatchFixture(client,request('setting-absent'));assert.equal(absent.state,'setting-absent');
        const facts=await executeBatchFixture(client,request('facts'));assert.equal(facts.extension.settings,null);
    }catch(error){failed=true;report.absenceRestore.push({backend,phase:'absence',error:{name:error.name,code:error.code}});}
    finally{if(request)for(let pass=0;pass<2;pass++)try{const value=await executeBatchFixture(client,request('cleanup'));report.absenceRestore.push({backend,pass,result:value});assert.equal(value.extension.zero,true);if(pass===1){assert.equal(value.changed,0);assert.equal(value.matched,0);}}catch(error){failed=true;report.absenceRestore.push({backend,pass,error:{name:error.name,code:error.code}});}}
    const dir=path.join(privateRoot,'runs'),files=readdirSync(dir).filter(file=>new RegExp('^'+backend+'-[0-9a-f-]{36}\\.json$').test(file)).sort();
    try{for(const file of files){const absolute=path.join(dir,file),s=lstatSync(absolute);assert(s.isFile()&&!s.isSymbolicLink()&&(s.mode&0o077)===0);const bytes=readFileSync(absolute),j=JSON.parse(bytes);assert.equal(j.state,'cleaned','Every attempted base run is closed before final audit');const ef=absolute.replace(/\.json$/,'-ef.json'),ext=JSON.parse(readFileSync(ef));assert.equal(ext.state,'cleaned');
            const row={backend,runId:j.runId,journalRawSha256:sha(bytes),extensionRawSha256:sha(readFileSync(ef)),checks:[]};report.journals.push(row);
            for(let pass=0;pass<2;pass++){const value=await executeBatchFixture(client,{formatVersion:1,backend,runId:j.runId,action:'cleanup',account:'none'});assert.equal(value.state,'cleaned');assert.equal(value.matched,0);assert.equal(value.changed,0);assert.equal(value.extension.zero,true);assert.equal(value.extension.remaining,0);row.checks.push({pass,matched:0,changed:0,extensionZero:true});}
            assert.equal(sha(readFileSync(absolute)),row.journalRawSha256);assert.equal(sha(readFileSync(ef)),row.extensionRawSha256);row.rawJournalsUnchanged=true;
        }}catch(error){failed=true;report.journalFailure={backend,name:error.name,code:error.code};}
    await client.end();
}
for(const port of [5500,5501,5600])try{await runtime.assertPortAvailable({host:'127.0.0.1',port});report.ports.push({host:'127.0.0.1',port,available:true});}catch{failed=true;report.ports.push({host:'127.0.0.1',port,available:false});}
report.result=failed?'fail':'pass';report.finishedAt=new Date().toISOString();writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({result:report.result,runs:report.journals.length,absenceRestore:report.absenceRestore.map(r=>({backend:r.backend,pass:r.pass,matched:r.result?.matched,changed:r.result?.changed,error:r.error})),journalFailure:report.journalFailure,ports:report.ports,output:out}));if(failed)process.exitCode=1;
