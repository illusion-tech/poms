// Candidate02 internal verifier support; no import-time I/O or task effects.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {assertBudgetProbeDispatch121,budgetStaticSourcePins121} from '../business/runtime-admission121.mjs';

const digest=b=>createHash('sha256').update(b).digest('hex');
const statKeys=['dev','ino','nlink','size','mtimeNs','ctimeNs','uid','gid','mode'];
const equalStat=(a,b)=>{for(const key of statKeys)assert.equal(a[key],b[key],'Observed file identity/content bookend changed');};
const label=s=>{assert(typeof s==='string'&&/^[a-zA-Z0-9_.:-]{1,96}$/.test(s));return s;};
const metricsKeys=new Set(['contentReads','contentReadBytes','shaBytes','metadataCalls','directoryEnumerations','jsonParseBytes','stateWriteBytes','sqlQueries']);
const safeCount=n=>{assert(Number.isSafeInteger(n)&&n>=0);return n;};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};

export function createPhaseMetrics118({maxEvents=20000}={}) {
 safeCount(maxEvents);const events=[],stack=[],totals=Object.fromEntries([...metricsKeys].map(k=>[k,0])),failures={},noted=new Set();
 let sequence=0,dropped=0,peakRSS=0;
 const note=code=>{failures[code]=(failures[code]??0)+1;};
 const noteOnce=(code,id)=>{const key=code+':'+id;if(!noted.has(key)){noted.add(key);note(code);}};
 const clock=()=>{try{const value=process.hrtime.bigint();if(typeof value!=='bigint')throw Error();return value;}catch{note('clock-sample');return null;}};
 const sampleMemory=()=>{try{const rss=process.memoryUsage().rss;safeCount(rss);peakRSS=Math.max(peakRSS,rss);}catch{note('rss-sample');}};
 const begin=name=>{label(name);const event={phaseId:++sequence,parentId:stack.at(-1)?.phaseId??null,sequence,startNs:clock(),endNs:null,status:'RUNNING'};stack.push(event);sampleMemory();return event;};
 const retain=event=>{if(events.length<maxEvents)events.push(event);else dropped++;};
 const end=(event,status)=>{
  // Observational failures must never replace a body error or success facts.
  try{const index=stack.indexOf(event);if(index<0){note('phase-end-missing');return;}if(index!==stack.length-1)note('phase-overlap');stack.splice(index,1);event.endNs=clock();event.status=status;sampleMemory();retain(event);}catch{note('phase-end');}
 };
 const api={
  add(key,n=1){try{assert(metricsKeys.has(key),'Unknown metric');safeCount(n);safeCount(totals[key]+n);totals[key]+=n;}catch(error){note('counter-contract');throw error;}},
  markFailure(code){assert(typeof code==='string'&&/^[a-z0-9-]{1,64}$/.test(code));note(code);},
  diagnosticClock(){return clock();},
  sync(name,body){const event=begin(name);let status='FAIL';try{const value=body();assert(!value||typeof value.then!=='function','Synchronous observation must not cross await');status='PASS';return value;}finally{end(event,status);}},
  async phase(name,body){const event=begin(name);let status='FAIL';try{const value=await body();status='PASS';return value;}finally{end(event,status);}},
  interval(name,startNs,endNs,status='PASS',parentId=stack.at(-1)?.phaseId??null){label(name);assert(typeof startNs==='bigint'&&typeof endNs==='bigint'&&endNs>=startNs);assert(['PASS','FAIL'].includes(status));const event={phaseId:++sequence,parentId,sequence,startNs,endNs,status};retain(event);return event.phaseId;},
  snapshot(){
   sampleMemory();const childSums=new Map(),unknownChildren=new Set();
   const rows=events.map(e=>{const elapsed=e.startNs!==null&&e.endNs!==null&&e.endNs>=e.startNs?e.endNs-e.startNs:null;if(elapsed===null)noteOnce('unknown-interval',e.phaseId);if(e.parentId!==null){if(elapsed===null)unknownChildren.add(e.parentId);else childSums.set(e.parentId,(childSums.get(e.parentId)??0n)+elapsed);}return{...e,startNs:e.startNs?.toString()??null,endNs:e.endNs?.toString()??null,elapsedNs:elapsed?.toString()??null};});
   for(const row of rows){const elapsed=row.elapsedNs===null?null:BigInt(row.elapsedNs),children=childSums.get(row.phaseId)??0n;if(elapsed===null||unknownChildren.has(row.phaseId)||children>elapsed){row.selfNs=null;if(children>(elapsed??children))noteOnce('child-overlap',row.phaseId);}else row.selfNs=(elapsed-children).toString();}
   return freeze({kind:'runtime118-performance-profile',schemaVersion:2,clock:'process.hrtime.bigint',metricsHealthy:Object.keys(failures).length===0&&dropped===0&&stack.length===0,measurementFailures:{...failures},counterCoverage:'instrumented verified readers; legacy direct I/O remains separately uncovered',events:rows,totals:{...totals},droppedEvents:dropped,openPhases:stack.length,memory:{peakSampledRSS:peakRSS,method:'RSS sampled at phase boundaries; instantaneous peak may be missed'},secretsAndPayloadPublished:false});
  }
 };return Object.freeze(api);
}

// This generic factory cannot activate Native ambient scope or mint a ticket.
export function createObservationController118({maxEntries=20000,maxCacheBytes=64*1024*1024,maxFileBytes=512*1024*1024,maxBufferBytes=64*1024*1024,metrics=createPhaseMetrics118()}={}) {
 for(const n of [maxEntries,maxCacheBytes,maxFileBytes,maxBufferBytes])safeCount(n);
 const account=(key,n=1)=>{try{metrics.add(key,n);}catch{try{metrics.markFailure('counter-update');}catch{/* Never replace a validation failure with telemetry. */}}};
 let current=null,disposed=false,cacheBytes=0;const decoded=new Map(),scratch=Buffer.allocUnsafe(1024*1024);
 const meta=file=>{account('metadataCalls');return fs.lstatSync(file,{bigint:true});};
 const real=file=>{account('metadataCalls');assert.equal(fs.realpathSync(file),file,'Original canonical path required');};
 const canonical=file=>{assert(typeof file==='string'&&path.isAbsolute(file)&&path.resolve(file)===file&&!file.includes('\0'));};
 const policy=(s,p)=>{assert(s.isFile()&&!s.isSymbolicLink(),'Regular original required');assert(s.nlink>=1n);if(p.singleLink!==false)assert.equal(s.nlink,1n,'Single-link role required');for(const key of ['dev','ino','nlink','uid','gid','mode'])if(p[key]!==undefined)assert.equal(s[key].toString(),String(p[key]),'Role identity mismatch');};
 const sizeOf=s=>{const size=Number(s.size);safeCount(size);assert(size<=maxFileBytes,'Original exceeds file byte limit');return size;};
 const dependencyCount=()=>current.files.size+current.directories.size+current.directoryMembers;
 function readBounded(fd,size,collect){
  assert(size<=maxFileBytes,'Original exceeds file byte limit');if(collect)assert(size<=maxBufferBytes,'Mutable buffer exceeds byte limit');
  const hash=createHash('sha256'),parts=[];let bytes=0;account('contentReads');
  for(;;){const capacity=Math.min(scratch.length,size-bytes+1),n=fs.readSync(fd,scratch,0,capacity,null);if(!n)break;bytes+=n;account('contentReadBytes',n);assert(bytes<=size,'Original grew beyond initial byte limit');hash.update(scratch.subarray(0,n));account('shaBytes',n);if(collect)parts.push(Buffer.from(scratch.subarray(0,n)));}
  assert.equal(bytes,size,'Original shrank while read');return{bytes,sha:hash.digest('hex'),buffer:collect?Buffer.concat(parts,size):null};
 }
 const entryFor=(pin,p={},collectRequested=false)=>{
  assert(current&&!disposed,'No live observation');assert(pin&&/^[a-f0-9]{64}$/.test(pin.rawBytesSha256));canonical(pin.file);if(pin.bytes!==undefined)safeCount(pin.bytes);
  const cached=current.files.get(pin.file),allow=current.staticPins.get(pin.file);
  if(allow)assert.equal(allow.rawBytesSha256,pin.rawBytesSha256,'Static manifest descriptor changed');
  if(cached&&allow&&allow.rawBytesSha256===pin.rawBytesSha256&&!p.freshIdentity&&p.singleLink!==false){assert.equal(cached.sha,pin.rawBytesSha256,'Conflicting static descriptor');if(pin.bytes!==undefined)assert.equal(cached.size,pin.bytes);if(collectRequested)assert(cached.size<=maxBufferBytes,'Mutable buffer exceeds byte limit');policy(cached.stat,p);cached.policies.push(Object.freeze({...p}));return{entry:cached,bytes:cached.bytes};}
  const s=meta(pin.file);policy(s,p);real(pin.file);const size=sizeOf(s);if(pin.bytes!==undefined)assert.equal(size,pin.bytes,'Declared byte count changed before read');if(collectRequested)assert(size<=maxBufferBytes,'Mutable buffer exceeds byte limit');
  let entry=current.files.get(pin.file);
  if(entry){assert.equal(entry.sha,pin.rawBytesSha256,'Conflicting descriptor for same original');equalStat(entry.stat,s);if(p.freshIdentity||p.singleLink===false){let fd;try{account('metadataCalls');fd=fs.openSync(pin.file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));account('metadataCalls');const opened=fs.fstatSync(fd,{bigint:true});equalStat(s,opened);policy(opened,p);account('metadataCalls');equalStat(opened,fs.fstatSync(fd,{bigint:true}));equalStat(s,meta(pin.file));real(pin.file);}finally{if(fd!==undefined)fs.closeSync(fd);}}entry.policies.push(Object.freeze({...p}));return{entry,bytes:entry.bytes};}
  assert(dependencyCount()<maxEntries,'Observation dependency limit');let fd;
  try{
   account('metadataCalls');fd=fs.openSync(pin.file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));account('metadataCalls');const opened=fs.fstatSync(fd,{bigint:true});policy(opened,p);equalStat(s,opened);
   const retain=size<=maxBufferBytes&&size<=maxCacheBytes-current.rawBytes-current.nameBytes-cacheBytes,result=readBounded(fd,size,retain||collectRequested);assert.equal(result.sha,pin.rawBytesSha256,'Original SHA changed');
   account('metadataCalls');equalStat(opened,fs.fstatSync(fd,{bigint:true}));equalStat(s,meta(pin.file));real(pin.file);if(retain)current.rawBytes+=result.buffer.length;
   entry={file:pin.file,sha:pin.rawBytesSha256,size,stat:s,bytes:retain?result.buffer:null,policies:[Object.freeze({...p})]};current.files.set(pin.file,entry);return{entry,bytes:result.buffer};
  }finally{if(fd!==undefined)fs.closeSync(fd);}
 };
 const read=(pin,p={})=>{
  const found=entryFor(pin,p,true),entry=found.entry;if(found.bytes)return Buffer.from(found.bytes);assert(entry.size<=maxBufferBytes,'Mutable buffer exceeds byte limit');
  const before=meta(pin.file);equalStat(entry.stat,before);real(pin.file);let fd;
  try{account('metadataCalls');fd=fs.openSync(pin.file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));account('metadataCalls');equalStat(before,fs.fstatSync(fd,{bigint:true}));const result=readBounded(fd,entry.size,true);assert.equal(result.sha,entry.sha,'Original SHA changed');account('metadataCalls');equalStat(before,fs.fstatSync(fd,{bigint:true}));equalStat(before,meta(pin.file));real(pin.file);return result.buffer;}finally{if(fd!==undefined)fs.closeSync(fd);}
 };
 const verify=(pin,p={})=>{const e=entryFor(pin,p).entry;return{file:e.file,rawBytesSha256:e.sha,bytes:e.size,dev:e.stat.dev.toString(),ino:e.stat.ino.toString(),nlink:Number(e.stat.nlink)};};
 const json=(pin,p={})=>{
  const key=pin.file+'\0'+pin.rawBytesSha256,cached=decoded.has(key),found=entryFor(pin,p,!cached);if(cached){const item=decoded.get(key);decoded.delete(key);decoded.set(key,item);return item.value;}
  const bytes=found.bytes??read(pin,p);account('jsonParseBytes',bytes.length);const value=freeze(JSON.parse(bytes));
  if(bytes.length<=maxCacheBytes-current.rawBytes-current.nameBytes){while(cacheBytes+current.rawBytes+current.nameBytes+bytes.length>maxCacheBytes&&decoded.size){const [old,item]=decoded.entries().next().value;decoded.delete(old);cacheBytes-=item.charge;}decoded.set(key,{value,charge:bytes.length});cacheBytes+=bytes.length;}return value;
 };
 const inventory=(folder,retaining)=>{
  account('directoryEnumerations');account('metadataCalls');const dir=fs.opendirSync(folder),values=[];let nameBytes=0;
  try{for(;;){const entry=dir.readSync();if(entry===null)break;assert(values.length<maxEntries,'Directory entry limit');if(retaining)assert(dependencyCount()+values.length+2<=maxEntries,'Directory dependency limit');nameBytes+=Buffer.byteLength(entry.name);assert(nameBytes<=maxCacheBytes,'Directory name byte limit');if(retaining)assert(current.rawBytes+current.nameBytes+cacheBytes+nameBytes<=maxCacheBytes,'Combined directory cache byte limit');values.push(Object.freeze(entry));}}finally{dir.closeSync();}
  return{values,nameBytes};
 };
 const view=(entry,typed)=>typed?entry.values.slice():entry.values.map(e=>e.name);
 const directory=(folder,options)=>{
  assert(current&&!disposed);canonical(folder);assert(options===undefined||(Object.keys(options).length===1&&typeof options.withFileTypes==='boolean'),'Finite directory options');
  const s=meta(folder);assert(s.isDirectory()&&!s.isSymbolicLink());real(folder);let entry=current.directories.get(folder);
  if(entry){equalStat(s,entry.stat);return view(entry,options?.withFileTypes===true);}
  assert(dependencyCount()<maxEntries,'Observation dependency limit');const collected=inventory(folder,true);equalStat(s,meta(folder));real(folder);entry={stat:s,values:collected.values};current.directories.set(folder,entry);current.directoryMembers+=entry.values.length;current.nameBytes+=collected.nameBytes;return view(entry,options?.withFileTypes===true);
 };
 const project=rows=>rows.map(e=>[e.name,e.isDirectory(),e.isFile(),e.isSymbolicLink()]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 const seal=scope=>{
  for(const e of scope.files.values()){
   const before=meta(e.file);equalStat(e.stat,before);real(e.file);for(const p of e.policies)policy(before,p);let fd;
   try{account('metadataCalls');fd=fs.openSync(e.file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));account('metadataCalls');equalStat(before,fs.fstatSync(fd,{bigint:true}));const result=readBounded(fd,e.size,false);assert.equal(result.sha,e.sha,'Original SHA changed at observation seal');account('metadataCalls');equalStat(before,fs.fstatSync(fd,{bigint:true}));equalStat(before,meta(e.file));real(e.file);}finally{if(fd!==undefined)fs.closeSync(fd);}
  }
  for(const [file,e]of scope.directories){equalStat(e.stat,meta(file));real(file);const now=inventory(file,false);assert.deepEqual(project(now.values),project(e.values),'Complete directory changed at seal');equalStat(e.stat,meta(file));real(file);}
 };
 const api={read,verify,json,directory,
  memo(key,body){assert(current);if(current.memo.has(key))return current.memo.get(key);const value=body();current.memo.set(key,value);return value;},
  run(name,body,{staticPins=[]}={}){assert(!current&&!disposed,'No nested or disposed observation');assert(Array.isArray(staticPins)&&staticPins.length<=maxEntries,'Finite static manifest');const staticMap=new Map();for(const pin of staticPins){canonical(pin.file);assert(/^[a-f0-9]{64}$/.test(pin.rawBytesSha256));const previous=staticMap.get(pin.file);if(previous)assert.equal(previous.rawBytesSha256,pin.rawBytesSha256,'Conflicting static manifest');staticMap.set(pin.file,Object.freeze({file:pin.file,rawBytesSha256:pin.rawBytesSha256}));}const scope={files:new Map(),directories:new Map(),memo:new Map(),staticPins:staticMap,rawBytes:0,nameBytes:0,directoryMembers:0};current=scope;try{return metrics.sync(name,()=>{const value=body();assert(!value||typeof value.then!=='function','Observation cannot cross await');metrics.sync('integrity.seal',()=>seal(scope));return value;});}finally{current=null;}},
  active(){return Boolean(current)&&!disposed;},snapshot(){return metrics.snapshot();},dispose(){assert(!current,'Active observation cannot be disposed');decoded.clear();cacheBytes=0;disposed=true;},
 };return Object.freeze(api);
}

let active=null;
const phaseContext=new AsyncLocalStorage();
const owners=new WeakMap();
function owner(root,ticket){assertBudgetProbeDispatch121(root,ticket);let value=owners.get(root);if(!value){const metrics=createPhaseMetrics118();value={metrics,controller:createObservationController118({metrics})};owners.set(root,value);}return value;}
export function budgetObservation118(root,ticket,phase,body){
    const value=owner(root,ticket);assert(!active,'Budget observation cannot reenter');
    const staticPins=budgetStaticSourcePins121(root,ticket);
    return value.controller.run(phase,()=>{active={root,ticket,...value};try{const result=body();assert(!result||typeof result.then!=='function');return result;}finally{active=null;}},{staticPins});
}
export function observedRead118(pin,policy){return active?active.controller.read(pin,policy):null;}
export function observedVerify118(pin,policy){return active?active.controller.verify(pin,policy):null;}
export function observedJSON118(pin,policy){return active?active.controller.json(pin,policy):null;}
export function observedDirectory118(folder,options){return active?active.controller.directory(folder,options):null;}
export function observedFresh118(root,facts,body){
    if(!active)return body();assert.equal(active.root,root);assertBudgetProbeDispatch121(root,active.ticket);
    // The root state may not mutate inside a shared read-only boundary.
    const stateHash=digest(JSON.stringify(root.state));const key='fresh:'+facts.authorityPin.file+':'+facts.authorityPin.rawBytesSha256;
    const value=active.controller.memo(key,()=>{body();return stateHash;});assert.equal(value,stateHash,'Root state changed inside observation');
}
export function profileBudgetPhase118(root,ticket,phase,body){const value=owner(root,ticket);return phaseContext.run(value.metrics,()=>value.metrics.phase(phase,body));}
export function recordBudgetMetric118(key,n){const metrics=phaseContext.getStore();if(metrics)try{metrics.add(key,n);}catch{metrics.markFailure('counter-update');}}
export function profileBudgetSync118(phase,body){const metrics=phaseContext.getStore();return metrics?metrics.sync(phase,body):body();}
export function profileBudgetAsync118(phase,body){const metrics=phaseContext.getStore();return metrics?metrics.phase(phase,body):body();}
export function assertNoBudgetObservation118(){assert(!active,'Mutation/HTTP cannot cross a verified observation');}
export function diagnosticBudgetClock118(){const metrics=phaseContext.getStore();return metrics?metrics.diagnosticClock():null;}
export function recordBudgetHTTP118(root,ticket,startNs,headersNs,endNs,failed){const m=owner(root,ticket).metrics;if(typeof startNs!=='bigint'||typeof endNs!=='bigint'||endNs<startNs){m.markFailure('http-interval');return;}const id=m.interval('http.response',startNs,endNs,failed?'FAIL':'PASS');if(headersNs!==null){if(typeof headersNs==='bigint'&&headersNs>=startNs&&headersNs<=endNs)m.interval('http.headers',startNs,headersNs,'PASS',id);else m.markFailure('http-headers-interval');}}
export function recordBudgetInterval118(root,ticket,phase,startNs,endNs){return owner(root,ticket).metrics.interval(phase,startNs,endNs);}
export function profileBudgetSnapshot118(root,ticket){return owner(root,ticket).metrics.snapshot();}
export function disposeBudgetObservation118(root,ticket){const value=owner(root,ticket);value.controller.dispose();owners.delete(root);}
