import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {OwnedFixture} from './owned-fixture.mjs';
const [input,tag]=process.argv.slice(2);assert.equal(process.argv.length,4);assert(/^[a-z0-9-]{1,35}$/.test(tag));const prior=JSON.parse(readFileSync(input));
const out=`tmp/rust-r2gh/cleanup-${tag}.json`;assert(!existsSync(out));const report={formatVersion:1,prior:input,runId:prior.runId,result:'pending',cleanup:[],startedAt:new Date().toISOString()};
let fixture;
try{fixture=await OwnedFixture.connect(prior.backend??'nest',prior.runId);report.cleanup.push(await fixture.cleanup());report.cleanup.push(await fixture.cleanup());assert.equal(report.cleanup[1].zero,true);report.result='pass';}
catch(error){report.result='fail';report.error={type:error.name,assertion:error.name==='AssertionError'?error.message:undefined};process.exitCode=1;}
finally{if(fixture)await fixture.close();report.finishedAt=new Date().toISOString();writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(report));}
