// C independent public JSON comparison; no Root runner or product execution.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
assert.equal(process.cwd().replaceAll('\\','/'),'E:/projects/worktrees/poms-r3cdefg-next16/poms');
const files=['docs/design/rust-r3cdefg/evidence/actual/native/coverage1124/report01.json','docs/design/rust-r3cdefg/evidence/actual/rust/coverage1124/report01.json'];
const output='tmp/rust-r3cdefg/c-review/g3-coverage-winner-scope01.json';assert(!fs.existsSync(output));
const sha=b=>createHash('sha256').update(b).digest('hex'),pin=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)}};
const reports=files.map(f=>JSON.parse(fs.readFileSync(f))),analysis=JSON.parse(fs.readFileSync('tmp/rust-r3cdefg/c-review/g3-semantic-deep-compare01.json'));
const rootCompare=JSON.parse(fs.readFileSync('docs/design/rust-r3cdefg/evidence/original/coverage-compare-parity01-06.json'));
for(let i=0;i<2;i++){const a=pin(files[i]),b=rootCompare.inputs[i];assert.equal(a.bytes,b.bytes);assert.equal(a.rawBytesSha256,b.rawBytesSha256);}
const maps=[new Map,new Map],identityPairs=[...analysis.identityPairs];for(const p of identityPairs){maps[0].set(p.native.toLowerCase(),p.logical);maps[1].set(p.rust.toLowerCase(),p.logical)}
function bind(a,b,path){if(a.toLowerCase()===b.toLowerCase())return;const aa=maps[0].get(a.toLowerCase()),bb=maps[1].get(b.toLowerCase());if(aa||bb){assert(aa&&bb&&aa===bb,'identity conflict '+path);return}const key='coverage-generated.'+identityPairs.length;maps[0].set(a.toLowerCase(),key);maps[1].set(b.toLowerCase(),key);identityPairs.push({native:a,rust:b,logical:key,origin:path})}
function discover(a,b,path){if(Array.isArray(a)&&Array.isArray(b)){assert.equal(a.length,b.length,'array '+path);for(let i=0;i<a.length;i++)discover(a[i],b[i],path+'.'+i);return}if(a&&b&&typeof a==='object'&&typeof b==='object'){if(typeof a.id==='string'&&typeof b.id==='string')bind(a.id,b.id,path+'.real-response.id');for(const k of Object.keys(a))if(Object.hasOwn(b,k))discover(a[k],b[k],path+'.'+k)}}
assert.equal(reports[0].events.length,1124);assert.equal(reports[1].events.length,1124);
for(let i=0;i<1124;i++)discover(reports[0].events[i].response.body,reports[1].events[i].response.body,'response.'+i);
const generated=new Set(['generatedAt','voidedAt','createdAt','updatedAt','effectiveAt','completedAt','canceledAt','created_at','updated_at','effective_at','completed_at','canceled_at']);
const uuid=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const winnerNormalizations=[],dateNormalizations=[];
function norm(v,side,path,key=''){
 if(Array.isArray(v))return v.map((x,i)=>norm(x,side,path+'.'+i,key));
 if(v&&typeof v==='object'){
  const fact=rootCompare.controlledContactRaceFacts[side];
  if(v.id===fact.id){assert.equal(v.name,fact.winner.name);assert.equal(v.updatedBy,fact.winner.updatedBy);assert.equal(v.rowVersion,fact.winner.rowVersion);winnerNormalizations.push({side,path,id:v.id,changedKeys:['name','updatedBy'],originalName:v.name,originalUpdatedBy:v.updatedBy});v={...v,name:'proven-race-winner-name',updatedBy:'proven-race-winner-actor'}}
  return Object.fromEntries(Object.keys(v).sort().map(k=>[k,norm(v[k],side,path+'.'+k,k)]));
 }
 if(typeof v!=='string')return v;
 if(generated.has(key)&&Number.isFinite(Date.parse(v))){dateNormalizations.push({side,path,original:v});return'generated-server-time'}
 const prefix='R3CG coverage '+(side?'parity04':'parity01');
 return v.replaceAll(prefix,'R3CG coverage run').replace(uuid,id=>{const p=maps[side].get(id.toLowerCase());return p?(id===id.toUpperCase()&&/[A-F]/.test(id)?'UPPER:':'')+p:id});
}
function diff(a,b,path='',out=[]){if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){for(const k of new Set([...Object.keys(a),...Object.keys(b)])){if(!Object.hasOwn(a,k)||!Object.hasOwn(b,k))out.push({path:path+'.'+k,nativePresent:Object.hasOwn(a,k),rustPresent:Object.hasOwn(b,k),native:a[k],rust:b[k]});else diff(a[k],b[k],path+'.'+k,out)}}else if(!Object.is(a,b))out.push({path,native:a,rust:b});return out}
const differences=[];
for(let i=0;i<1124;i++){
 const shape=e=>({method:e.method,label:e.label,route:e.route,...(Object.hasOwn(e,'request')?{request:e.request}:{}),status:e.response.status,body:e.response.body});
 const a=norm(shape(reports[0].events[i]),0,String(i)),b=norm(shape(reports[1].events[i]),1,String(i));const ds=diff(a,b);if(ds.length)differences.push({index:i,label:a.label,changes:ds});
}
const result={kind:'C-independent-1124-public-request-body-and-response-body-verification',inputs:files.map(pin),rootComparison:pin('docs/design/rust-r3cdefg/evidence/original/coverage-compare-parity01-06.json'),analysis:pin('tmp/rust-r3cdefg/c-review/g3-semantic-deep-compare01.json'),events:1124,differenceCount:differences.length,differences,identityPairCount:identityPairs.length,winnerNormalizationCount:winnerNormalizations.length,winnerNormalizations,dateNormalizations,normalizationBoundary:'Only exact proven contact race entity name/updatedBy, explicit generated dates, strictly reused generated IDs, and exact run fixture name prefix; all input dates/money/errors and every other field are compared. Generated timestamp relationships are separately checked in the45 semantic analysis.',independentlyReadRootActualOriginals:true,independentlyExecutedProduct:false,G3Certified:false,G4Certified:false};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,pin:pin(output),differences:differences.length,winnerNormalizations,first:differences.slice(0,5)}));
