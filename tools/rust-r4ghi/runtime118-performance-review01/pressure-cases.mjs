import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createObservationController118,createPhaseMetrics118} from '../runtime118-performance-candidate01/candidate/tools/rust-r4ghi/performance118/observation118.mjs';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',work=root+'/tmp/rust-r4ghi/root/runtime118-performance-review01';
const run=fs.realpathSync(fs.mkdtempSync(work+'/pressure-')),sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=Buffer.from(JSON.stringify({value:'x'.repeat(1024)})),file=path.join(run,'large-for-cache.json');fs.writeFileSync(file,bytes,{flag:'wx'});
const pin={file,bytes:bytes.length,rawBytesSha256:sha(bytes)},oldSource=fs.readFileSync(root+'/tools/rust-r4ghi/business/retained-source14-for15.mjs','utf8');
const begin=oldSource.indexOf('export function readPin15(pin) {'),end=oldSource.indexOf('\nexport const json15',begin),body=oldSource.slice(begin,end).replace('export function','function');assert(begin>=0&&end>begin);
let referenceReads=0,referenceBytes=0;const oldFS={...fs,readFileSync(...args){const b=fs.readFileSync(...args);referenceReads++;referenceBytes+=b.length;return b;}};
const reference=Function('fs','path','assert','sha15','pin15',body+';return readPin15;')(oldFS,path,assert,sha,p=>assert(path.isAbsolute(p.file)&&/^[a-f0-9]{64}$/.test(p.rawBytesSha256)));
const metrics=createPhaseMetrics118(),controller=createObservationController118({metrics,maxCacheBytes:64});let candidateValue,referenceValue;
for(let i=0;i<4;i++)referenceValue=JSON.parse(reference(pin));
controller.run('review.cache-pressure',()=>{for(let i=0;i<4;i++)candidateValue=controller.json(pin);});assert.deepEqual(candidateValue,referenceValue);
const pressure={id:'cache-pressure-read-amplification',fixtureBytes:bytes.length,maxCacheBytes:64,consumers:4,referenceReader:'Exact original readPin15 body with Windows descriptor adapter',referenceBodySHA256:sha(Buffer.from(body)),referenceReads,referenceBytes,candidate:metrics.snapshot().totals,outputsEqual:true,productionPrivateInputsMeasured:false};
assert.equal(referenceReads,4);assert.equal(pressure.candidate.contentReads,6);

const complexity=[];
for(const n of [500,1000]){
 const m=createPhaseMetrics118({maxEvents:n});for(let i=0;i<n;i++)m.interval('review.closed-phase',1n,2n);
 const original=Array.prototype.filter;let comparisons=0;
 Array.prototype.filter=function(fn,thisArg){const candidateRows=this;return original.call(this,(value,index,array)=>{if(candidateRows.length===n&&candidateRows[0]?.phaseId===1&&typeof candidateRows[0]?.elapsedNs==='string')comparisons++;return fn.call(thisArg,value,index,array);});};
 let profile;try{profile=m.snapshot();}finally{Array.prototype.filter=original;}
 assert.equal(comparisons,n*n);complexity.push({events:n,measuredRowPredicateInvocations:comparisons,openPhases:profile.openPhases,droppedEvents:profile.droppedEvents});
}
const result={kind:'independent-runtime118-resource-cost-cases',schemaVersion:1,reviewer:'/root/performance118_independent_review01',reviewerIsAuthor:false,reviewedCommit:'72275c80e92fad30bb736af3c5e5ee5a00731739',ownedRun:run,actualTaskEffects:{SQL:0,HTTP:0,Auth:0,newSnapshots:0,probes:0,WSLStarts:0},pressure,snapshotComplexity:{measured:complexity,conclusion:'N squared row scans; costs repeated by each budget dispatch snapshot',atMax20000TheoreticalComparisons:400000000,actualProbeEventCount:'UNKNOWN',productionImpactProven:false}};
const output=path.join(run,'results.json');fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:output,pressure,snapshotComplexity:result.snapshotComplexity}));
