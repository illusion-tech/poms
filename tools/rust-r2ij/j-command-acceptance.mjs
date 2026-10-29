import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {sha} from './j-command-fixtures.mjs';
import {normalizeCommandReport} from './j-command-normalize.mjs';

const [tag,nestOwner,rustOwner,mode,suffix]=process.argv.slice(2);
assert([5,6,7].includes(process.argv.length)&&[tag,nestOwner,rustOwner].every(value=>/^[a-z0-9-]{1,35}$/.test(value??'')));
assert(mode===undefined||mode==='reuse','reuse consumes existing immutable backend receipts without repeating HTTP');
assert(suffix===undefined||(mode==='reuse'&&/^delta[0-9]{2}$/.test(suffix)));
const output=`tmp/rust-r2ij/j-command-comparison-${tag}${suffix?'-'+suffix:''}.json`;assert(!existsSync(output),'Immutable comparison tag already exists');
const runId=process.env.POMS_R2IJ_SHARED_RUN??randomUUID();assert(/^[0-9a-f-]{36}$/.test(runId));
const report={formatVersion:1,tag,runId,at:new Date().toISOString(),result:'pending',scope:mode==='reuse'?'Strict offline comparison of unchanged real HTTP/PG/file receipts; no HTTP repeated':'Actual Nest/Rust first-upload, six-target commands, legacy history, binary bytes/headers and precise local stream faults',projectionPolicy:'Injective actual generated-UUID aliases; bounded known server timestamps; fixed SQL fixture dates retained; successful binary bytes and literal headers exact; error weak validators checked against actual raw GET payload (also HEAD), then generated identities projected and JSON keys ordered for stable comparison',toolSources:['j-command-acceptance.mjs','j-command-normalize.mjs'].map(file=>({file:'tools/rust-r2ij/'+file,sha256:sha(readFileSync('tools/rust-r2ij/'+file))})),inputs:[],differences:[],childFailures:[]};
const observed=[];
for(const [backend,ownerTag] of [['nest',nestOwner],['rust',rustOwner]]){
    const file=`tmp/rust-r2ij/j-command-${backend}-${tag}.json`;
    try{
        if(mode!=='reuse')try{execFileSync(process.execPath,['tools/rust-r2ij/j-command-scenario.mjs',backend,tag,ownerTag],{env:{...process.env,POMS_R2IJ_SHARED_RUN:runId},stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:2*1024*1024});}
        catch(error){report.childFailures.push({backend,status:error.status??null,signal:error.signal??null,stdout:error.stdout?.toString(),stderr:error.stderr?.toString()});}
        const raw=readFileSync(file),input=JSON.parse(raw);assert.equal(input.runId,runId);assert.equal(input.ownerTag,ownerTag);
        report.inputs.push({backend,file,sha256:sha(raw),result:input.result,http:input.cases.length,binarySha256:input.owner.binarySha256});
        assert.equal(input.result,'pass',backend+' actual scenario must pass before parity projection');observed.push(normalizeCommandReport(input));
    }catch(error){report.result='fail';report.failure={backend,name:error.name,message:error.message};process.exitCode=1;break;}
}
if(observed.length===2){
    try{
        assert.equal(observed[1].cases.length,observed[0].cases.length);
        for(let index=0;index<observed[0].cases.length;index++)try{assert.deepEqual(observed[1].cases[index],observed[0].cases[index]);}catch{report.differences.push({name:observed[0].cases[index].name,nest:observed[0].cases[index],rust:observed[1].cases[index]});}
        assert.deepEqual(observed[1].fixtureSteps,observed[0].fixtureSteps);assert.deepEqual(observed[1].payloads,observed[0].payloads);
        assert.equal(report.differences.length,0,'Actual command/binary response and persisted-fact differences');report.result='pass';
    }catch(error){report.result='fail';report.failure={name:error.name,message:error.message};process.exitCode=1;}
}
report.finishedAt=new Date().toISOString();writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:report.result,inputs:report.inputs,differences:report.differences.map(row=>row.name),failure:report.failure,childFailures:report.childFailures}));
