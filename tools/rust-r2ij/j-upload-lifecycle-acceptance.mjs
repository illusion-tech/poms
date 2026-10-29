import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {sha} from './j-command-fixtures.mjs';
import {normalizeCommandReport} from './j-command-normalize.mjs';
import {projectVerifiedAuditClock} from './j-upload-diagnostics.mjs';
const [tag,nestOwner,rustOwner,mode,suffix]=process.argv.slice(2);assert([5,6,7].includes(process.argv.length)&&[tag,nestOwner,rustOwner].every(value=>/^[a-z0-9-]{1,35}$/.test(value??'')));
assert(mode===undefined||mode==='reuse');assert(suffix===undefined||(mode==='reuse'&&/^delta[0-9]{2}$/.test(suffix)));
const runId=process.env.POMS_R2IJ_SHARED_RUN??randomUUID();assert(/^[0-9a-f-]{36}$/.test(runId));const output=`tmp/rust-r2ij/j-upload-comparison-${tag}${suffix?'-'+suffix:''}.json`;assert(!existsSync(output));
const report={formatVersion:1,tag,runId,at:new Date().toISOString(),result:'pending',scope:mode==='reuse'?'Offline strict lifecycle comparison over immutable real receipts; zero HTTP repeated':'Actual Native/Rust upload lifecycle response+PG/audit/local-object parity',projectionPolicy:'Existing J bounded timestamp/injective generated-ID projection plus exact actual object bytes/SHA, object absence and request bytes; no product effects rolled back by fixture restoration',toolSources:['j-upload-lifecycle-acceptance.mjs','j-upload-diagnostics.mjs','j-command-normalize.mjs'].map(name=>({file:'tools/rust-r2ij/'+name,sha256:sha(readFileSync('tools/rust-r2ij/'+name))})),inputs:[],differences:[],childFailures:[]};
function project(input){
    const value=normalizeCommandReport(projectVerifiedAuditClock(input)),substitutions=[[input.runId,'$run'],...input.bindings.map(row=>[row.id,'$'+row.label])].sort((a,b)=>b[0].length-a[0].length);
    function convert(value){if(typeof value==='string'){for(const [from,to] of substitutions)value=value.replaceAll(from,to);return value;}if(Array.isArray(value))return value.map(convert);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,convert(item)]));return value;}
    for(let i=0;i<value.cases.length;i++){value.cases[i].objects=convert(input.cases[i].objects).sort((a,b)=>a.key.localeCompare(b.key));value.cases[i].request=convert(input.cases[i].request);}
    return value;
}
const values=[];
for(const [backend,owner] of [['nest',nestOwner],['rust',rustOwner]])try{
    if(mode!=='reuse')try{execFileSync(process.execPath,['tools/rust-r2ij/j-upload-lifecycle-scenario.mjs',backend,tag,owner],{env:{...process.env,POMS_R2IJ_SHARED_RUN:runId},stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:2*1024*1024});}catch(error){report.childFailures.push({backend,status:error.status??null,stdout:error.stdout?.toString(),stderr:error.stderr?.toString()});}
    const file=`tmp/rust-r2ij/j-upload-${backend}-${tag}.json`,raw=readFileSync(file),input=JSON.parse(raw);assert.equal(input.runId,runId);assert.equal(input.ownerTag,owner);report.inputs.push({backend,file,sha256:sha(raw),result:input.result,http:input.cases.length,binarySha256:input.owner.binarySha256});assert.equal(input.result,'pass');assert.equal(input.cases.length,50);values.push(project(input));
}catch(error){report.result='fail';report.failure={backend,name:error.name,message:error.message};process.exitCode=1;break;}
if(values.length===2)try{
    assert.equal(values[0].cases.length,values[1].cases.length);for(let i=0;i<values[0].cases.length;i++)try{assert.deepEqual(values[1].cases[i],values[0].cases[i]);}catch{report.differences.push({name:values[0].cases[i].name,nest:values[0].cases[i],rust:values[1].cases[i]});}
    assert.deepEqual(values[1].payloads,values[0].payloads);assert.equal(report.differences.length,0,'Lifecycle HTTP/PG/audit/object differences');report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,message:error.message};process.exitCode=1;}
report.finishedAt=new Date().toISOString();writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:report.result,inputs:report.inputs,differences:report.differences.map(row=>row.name),failure:report.failure,childFailures:report.childFailures}));
