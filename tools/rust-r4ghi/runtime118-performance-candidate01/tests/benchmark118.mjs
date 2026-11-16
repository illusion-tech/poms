// Component benchmark on existing public inputs, not a runtime/Auth/DB probe.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash,randomUUID} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createObservationController118,createPhaseMetrics118} from '../candidate/tools/rust-r4ghi/performance118/observation118.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
assert.equal(process.version,'v24.19.0');
const dir=root+'/tmp/rust-r4ghi/root/runtime118-performance-impl01/component-bench-'+randomUUID();fs.mkdirSync(dir);
const base=root+'/tools/rust-r4ghi/runtime118-performance-candidate01';
const graph=JSON.parse(fs.readFileSync(base+'/inputs/before-graph.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const inputs=graph.filter(p=>p.relative.endsWith('.json')).map(p=>({file:fs.realpathSync(root+'/'+p.relative),bytes:p.bytes,rawBytesSha256:p.rawBytesSha256}));
for(const name of ['Native-exact-peer.json','budget-stopped-evidence.json']){const file=fs.realpathSync(root+'/tools/rust-r4ghi/runtime118-resume-actual01/'+name),bytes=fs.readFileSync(file);inputs.push({file,bytes:bytes.length,rawBytesSha256:sha(bytes)});}
// Execute the exact original readPin15 function body with an explicit Windows
// pin adapter. It preserves original realpath/type/nlink/read/SHA assertions;
// the adapter is solely for local component comparison, never Native authority.
const oldSource=fs.readFileSync(root+'/tools/rust-r4ghi/business/retained-source14-for15.mjs','utf8');
const start=oldSource.indexOf('export function readPin15(pin) {'),end=oldSource.indexOf('\nexport const json15',start);assert(start>=0&&end>start);
const body=oldSource.slice(start,end).replace('export function','function');
let oldReads=0,oldBytes=0,oldSHA=0,oldParse=0;
const oldFS={...fs,readFileSync(...args){const b=fs.readFileSync(...args);oldReads++;oldBytes+=b.length;return b;}};
const pinAdapter=p=>{assert(p&&path.isAbsolute(p.file)&&/^[a-f0-9]{64}$/.test(p.rawBytesSha256));};
const oldRead=Function('fs','path','assert','sha15','pin15',body+';return readPin15;')(oldFS,path,assert,b=>{oldSHA+=b.length;return sha(b);},pinAdapter);
const metrics=createPhaseMetrics118(),controller=createObservationController118({metrics});
const repetitions=4,samples=[],results={old:null,candidate:null};
function run(kind,sample){const before=kind==='old'?{reads:oldReads,bytes:oldBytes,sha:oldSHA,parse:oldParse}:metrics.snapshot().totals;const begin=process.hrtime.bigint();let outputs;
 if(kind==='old'){for(let i=0;i<repetitions;i++)outputs=inputs.map(p=>{const b=oldRead(p);oldParse+=b.length;return JSON.parse(b);});}
 else controller.run('component.sample',()=>{for(let i=0;i<repetitions;i++)outputs=inputs.map(p=>controller.json(p));});
 const elapsedNs=process.hrtime.bigint()-begin;results[kind]=outputs;
 const after=metrics.snapshot().totals;
 if(sample>=0)samples.push({kind,sample,elapsedNs:elapsedNs.toString(),elapsedMs:Number(elapsedNs)/1e6,contentReads:kind==='old'?oldReads-before.reads:after.contentReads-before.contentReads,contentReadBytes:kind==='old'?oldBytes-before.bytes:after.contentReadBytes-before.contentReadBytes,shaBytes:kind==='old'?oldSHA-before.sha:after.shaBytes-before.shaBytes,jsonParseBytes:kind==='old'?oldParse-before.parse:after.jsonParseBytes-before.jsonParseBytes});
}
run('old',-1);run('candidate',-1);assert.deepEqual(results.old,results.candidate);
for(let i=0;i<3;i++){for(const kind of i%2?['candidate','old']:['old','candidate'])run(kind,i);assert.deepEqual(results.old,results.candidate);}
const median=kind=>samples.filter(s=>s.kind===kind).map(s=>s.elapsedMs).sort((a,b)=>a-b)[1];
const result={kind:'runtime118-public-JSON-component-benchmark',schemaVersion:1,engine:{file:process.execPath,version:process.version},inputs,referenceBodySHA256:sha(Buffer.from(body)),referencePinAdapter:'Explicit Windows canonical absolute descriptor adapter; not production admission',workload:{consumersPerBoundary:repetitions,warmupsPerVariant:1,measuredSamplesPerVariant:3,execution:'serial alternating order',OSCache:'warm/uncontrolled; no cache reset',candidateSeal:'full SHA and complete-directory re-enumeration'},samples,medianMs:{old:median('old'),candidate:median('candidate')},outputsEqual:true,realAuthSQLHTTPSnapshotEffectsExecuted:0,limits:['Public JSON component only; no private history/process/SQL/HTTP timing','Not the actual baseCP, close or whole probe','No production speedup or engineering budget acceptance inferred']};
result.candidateSupportSHA256=sha(fs.readFileSync(base+'/candidate/tools/rust-r4ghi/performance118/observation118.mjs'));
fs.writeFileSync(dir+'/result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:dir+'/result.json',inputCount:inputs.length,samples,medianMs:result.medianMs,outputsEqual:true}));
