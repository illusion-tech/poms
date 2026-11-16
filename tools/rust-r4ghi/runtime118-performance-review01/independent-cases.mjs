// Independent owned-I/O review of exact candidate 72275c80. No task effects.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createObservationController118,createPhaseMetrics118} from '../runtime118-performance-candidate01/candidate/tools/rust-r4ghi/performance118/observation118.mjs';

const base='E:/projects/worktrees/poms-r3hijk-next28/poms';
const work=base+'/tmp/rust-r4ghi/root/runtime118-performance-review01';
fs.mkdirSync(work,{recursive:true});
const run=fs.realpathSync(fs.mkdtempSync(work+'/owned-cases-'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fixture=(name,bytes)=>{const file=path.join(run,name);fs.writeFileSync(file,bytes,{flag:'wx'});return{file,bytes:bytes.length,rawBytesSha256:sha(bytes)};};
const results=[];

for(const kind of ['sync','async']){
    const metrics=createPhaseMetrics118(),primary=Error('OWNED_PRIMARY'),secondary=Error('OWNED_MEASUREMENT_FAILURE');
    const original=process.memoryUsage;let count=0,caught;
    process.memoryUsage=function(...args){if(++count===2)throw secondary;return original.apply(this,args);};
    try{if(kind==='sync')metrics.sync('review.failure',()=>{throw primary;});else await metrics.phase('review.failure',async()=>{throw primary;});}catch(e){caught=e;}finally{process.memoryUsage=original;}
    results.push({id:'measurement-replaces-primary-'+kind,expected:'Primary failure remains the surfaced failure; metric fault is secondary',primaryPreserved:caught===primary,secondarySurfaced:caught===secondary,receivedName:caught?.name,receivedMessage:caught?.message,confirmedDefect:caught!==primary});
    assert.equal(caught,secondary,'Exact candidate changed; update the independent review rather than silently accepting a new input');
}
console.log(JSON.stringify({partial:'measurement-primary-failure',results:[...results]}));

{
    const metrics=createPhaseMetrics118(),original=process.memoryUsage;let count=0,caught,returned;
    const file=path.join(run,'owned-closed-journal.json');
    process.memoryUsage=function(...args){if(++count===2)throw Error('OWNED_MEASUREMENT_FAILURE');return original.apply(this,args);};
    try{returned=await metrics.phase('review.successful-close-shape',async()=>{fs.writeFileSync(file,'{"phase":"owned-closed-verified"}\n',{flag:'wx'});return{exitGuard:{fixture:true},closedJournal:{file}};});}catch(e){caught=e;}finally{process.memoryUsage=original;}
    results.push({id:'measurement-loses-successful-return',scope:'Exact generic metric wrapper with owned close-shaped output, not genuine Native execution',ownedClosedFileExists:fs.existsSync(file),returnedFactsPresent:Boolean(returned),receivedName:caught?.name,receivedMessage:caught?.message,confirmedDefect:fs.existsSync(file)&&!returned});
    assert.match(caught?.message??'',/^Phase stack mismatch/);
}
console.log(JSON.stringify({partial:'measurement-successful-return',results:[...results]}));

for(const when of ['collect','seal']){
    const pin=fixture('growth-'+when+'.bin',Buffer.alloc(16,0x61)),maxCacheBytes=64,appendBytes=128*1024;
    const metrics=createPhaseMetrics118(),controller=createObservationController118({metrics,maxCacheBytes});
    const originalRead=fs.readSync,originalFrom=Buffer.from;let reads=0,injected=false,copiedBufferBytes=0,caught;
    fs.readSync=function(fd,...args){reads++;if(!injected&&reads===(when==='collect'?1:3)){injected=true;fs.appendFileSync(pin.file,Buffer.alloc(appendBytes,0x62));}return originalRead.call(this,fd,...args);};
    Buffer.from=function(value,...args){if(Buffer.isBuffer(value))copiedBufferBytes+=value.length;return originalFrom.call(this,value,...args);};
    try{controller.run('review.growing-file',()=>controller.verify(pin));}catch(e){caught=e;}finally{fs.readSync=originalRead;Buffer.from=originalFrom;}
    const totals=metrics.snapshot().totals;
    results.push({id:'growth-not-size-bounded-'+when,scope:'Owned file growth injected immediately before actual readSync, after initial FD metadata checks',initialSize:pin.bytes,maxCacheBytes,appendBytes,actualContentReadBytes:totals.contentReadBytes,copiedBufferBytes,injected,receivedMessage:caught?.message,stoppedBySizeLimitBeforeOversizedRead:false,confirmedDefect:when==='collect'?copiedBufferBytes>maxCacheBytes:totals.contentReadBytes>2*pin.bytes});
    assert(injected);assert(totals.contentReadBytes>appendBytes);if(when==='collect')assert(copiedBufferBytes>maxCacheBytes);assert.match(caught?.message??'',/SHA/);
}

// A nested asynchronous metric pair is expected to remain serial. This case
// documents unsupported concurrency without labeling it a production defect.
{
    const m=createPhaseMetrics118();let release;const gate=new Promise(r=>{release=r;});
    const a=m.phase('parallel.a',async()=>{});const b=m.phase('parallel.b',async()=>{await gate;});
    const aa=await a.catch(e=>e);release();const bb=await b.catch(e=>e);
    results.push({id:'parallel-metrics-unsupported',productionPathProven:false,scope:'Concurrency diagnostic only; current task effects require serial execution',firstFailed:aa instanceof Error,secondFailed:bb instanceof Error});
}

const output={kind:'independent-runtime118-owned-cases',schemaVersion:1,reviewer:'/root/performance118_independent_review01',reviewerIsAuthor:false,reviewedCommit:'72275c80e92fad30bb736af3c5e5ee5a00731739',ownedRun:run,actualTaskEffects:{SQL:0,HTTP:0,Auth:0,newSnapshots:0,probes:0,WSLStarts:0},results};
const file=path.join(run,'results.json');fs.writeFileSync(file,JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,results}));
