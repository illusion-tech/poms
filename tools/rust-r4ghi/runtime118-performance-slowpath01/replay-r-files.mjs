import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root='E:/projects/worktrees/poms-r3hijk-next28/poms',logical='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',work=root+'/tools/rust-r4ghi/runtime118-performance-slowpath01/inputs';
assert.equal(process.version,'v24.19.0');
const selection=process.argv[2]??'01';assert(['01','02','03'].includes(selection));
const candidate=root+'/tools/rust-r4ghi/runtime118-performance-candidate'+selection+'/candidate';
const {createObservationController118,createPhaseMetrics118}=await import(pathToFileURL(candidate+'/tools/rust-r4ghi/performance118/observation118.mjs').href);
const digest=b=>createHash('sha256').update(b).digest('hex'),norm=p=>p.replaceAll('\\','/');
const source=JSON.parse(fs.readFileSync(work+'/sourcePins-linux-order02.json')),compile=JSON.parse(fs.readFileSync(work+'/compileInputs-current03.json'));
assert(JSON.parse(fs.readFileSync(work+'/source-inventory-check02.json')).exactBytesHashMatch);assert(JSON.parse(fs.readFileSync(work+'/compile-inventory-check03.json')).exactBytesHashMatch);
const peer=JSON.parse(fs.readFileSync(root+'/tools/rust-r4ghi/runtime118-resume-actual01/Native-exact-peer.json'));
const graph=peer.sourceClosures,helpers=graph.filter(p=>p.file.startsWith(logical+'/tools/rust-r4ghi/business/')).map(p=>({file:p.file.slice(logical.length+1),sha256:p.rawBytesSha256}));
assert.equal(helpers.length,229);assert.equal(source.length,420);assert.equal(compile.length,528);assert.equal(graph.length,284);
const physical=p=>{assert(typeof p==='string'&&(p===logical||p.startsWith(logical+'/')),'Only exact R paths allowed');assert.equal(path.posix.normalize(p),p);return path.resolve(root,p.slice(logical.length+1));};
const logicalReal=p=>{const actual=norm(fs.realpathSync(p)),r=norm(fs.realpathSync(root));assert(actual===r||actual.startsWith(r+'/'),'Real path escaped R');return logical+actual.slice(r.length);};
const pinAdapter=p=>{assert(p&&/^[a-f0-9]{64}$/.test(p.rawBytesSha256));physical(p.file);};
const sourceIDs=[];
function extract(file,start,end){const text=fs.readFileSync(file,'utf8'),a=text.indexOf(start),b=text.indexOf(end,a+start.length);assert(a>=0&&b>a,file+' function boundaries');const body=text.slice(a,b).replaceAll('export function ','function ').replaceAll('export const ','const ');sourceIDs.push({file,bytes:Buffer.byteLength(text),rawBytesSha256:digest(Buffer.from(text)),extractedBodySHA256:digest(Buffer.from(body))});return body;}
function factory(body,env,result){return Function(...Object.keys(env),body+';return '+result+';')(...Object.values(env));}
function variant(base,optimized){
 const metrics=createPhaseMetrics118(),controller=createObservationController118({metrics});let direct={contentReads:0,contentReadBytes:0,shaBytes:0,metadataCalls:0,directoryEnumerations:0};
 const ffi={...fs,
  existsSync(p){direct.metadataCalls++;return fs.existsSync(physical(p));},
  lstatSync(p,o){direct.metadataCalls++;return fs.lstatSync(physical(p),o);},
  statSync(p,o){direct.metadataCalls++;return fs.statSync(physical(p),o);},
  realpathSync(p){direct.metadataCalls++;return logicalReal(physical(p));},
  readdirSync(p,o){direct.directoryEnumerations++;return fs.readdirSync(physical(p),o);},
  openSync(p,flags){direct.metadataCalls++;return fs.openSync(physical(p),flags);},
  fstatSync(fd,o){direct.metadataCalls++;return fs.fstatSync(fd,o);},
  readFileSync(p,...args){const b=fs.readFileSync(typeof p==='number'?p:physical(p),...args);direct.contentReads++;direct.contentReadBytes+=Buffer.byteLength(b);return b;},
  closeSync(fd){return fs.closeSync(fd);},
 };
 const hash=b=>{direct.shaBytes+=Buffer.byteLength(b);return digest(b);};
 const convert=p=>({...p,file:physical(p.file)});
 const observedRead118=(p,policy)=>controller.active()?controller.read(convert(p),policy):null;
 const observedVerify118=(p,policy)=>controller.active()?controller.verify(convert(p),policy):null;
 const observedJSON118=(p,policy)=>controller.active()?controller.json(convert(p),policy):null;
 const observedDirectory118=(p,o)=>controller.active()?controller.directory(physical(p),o):null;
 const common={fs:ffi,path:path.posix,assert,createHash,sha:hash,sha15:hash,sha118:hash,sha121:hash,hash,pin15:pinAdapter,pin118:pinAdapter,pin121:pinAdapter,observedRead118,observedVerify118,observedJSON118,observedDirectory118};
 const context=extract(base+'/tools/rust-r4ghi/business/context.mjs','const directFiles = ','export function createContext(');
 const sourcePins=factory(context,{...common,FIXED:{win:logical}},'sourcePins');
 const build=factory(extract(base+'/tools/rust-r4ghi/source15-admission119/build-source15.mjs','export function buildRead15(','export function assertBuildPhase15('),common,'({assertFreshBuildTree15,enumerateCargo15})');
 const helper=factory(extract(base+'/tools/rust-r4ghi/business/retained-source14-for15.mjs','export function readPin15(','const json = json15'),common,'({leaf15,helpers15,cargoFiles15})');
 const taxRead=factory(extract(base+'/tools/rust-r4ghi/tax15-invocation118/retained-tax-proof.mjs','export function read118(','export const json118'),common,'read118');
 const runtimeRead=factory(extract(base+'/tools/rust-r4ghi/business/runtime-admission121.mjs','function read121(','const json121'),common,'read121');
 const leaf=p=>({file:logical+'/'+p.file,rawBytesSha256:p.sha256});
 function taxFiles(){
  assert.deepEqual(sourcePins(optimized?source:null),source);
  const names=ffi.readdirSync(logical+'/tools/rust-r4ghi/business').filter(n=>/\.(mjs|json)$/.test(n)).sort();assert.equal(names.length,229);
  for(const n of names){const q=helpers.find(p=>p.file==='tools/rust-r4ghi/business/'+n);assert(q);taxRead(leaf(q));}
  build.assertFreshBuildTree15(logical,source,compile);
  for(const p of [...source,...compile])taxRead(leaf(p));
 }
 function tree(){for(const p of compile)helper.leaf15(logical,p.file,p.sha256);assert.deepEqual(helper.cargoFiles15(logical),compile.filter(p=>p.file.startsWith('apps/poms-api-rust/')||p.file.startsWith('.cargo/')).map(p=>p.file).sort());for(const p of source)helper.leaf15(logical,p.file,p.sha256);assert.deepEqual(helper.helpers15(logical,optimized?helpers:null),helpers);for(const p of graph)runtimeRead(p);}
 const staticPins=[...source,...compile,...helpers].map(p=>({file:physical(logical+'/'+p.file),rawBytesSha256:p.sha256})).concat(graph.map(convert));
 const counters=()=>{const current=metrics.snapshot().totals;return Object.fromEntries(Object.keys(direct).map(k=>[k,direct[k]+(current[k]??0)]));};
 return{run(kind){const begin=counters(),start=process.hrtime.bigint();const body=()=>{if(kind==='checkpoint-R'){taxFiles();tree();if(optimized)tree();}else{tree();taxFiles();for(let i=0;i<(optimized?2:7);i++)tree();}};if(optimized)controller.run(kind,body,selection!=='01'?{staticPins}:undefined);else body();const elapsedNs=process.hrtime.bigint()-start,end=counters();return{elapsedNs:elapsedNs.toString(),elapsedMs:Number(elapsedNs)/1e6,counters:Object.fromEntries(Object.keys(begin).map(k=>[k,end[k]-begin[k]]))};},dispose(){controller.dispose();}};
}
const old=variant(root,false),next=variant(candidate,true),samples=[];
for(const kind of ['checkpoint-R','close-R']){old.run(kind);next.run(kind);for(let i=0;i<3;i++){for(const [name,v]of i%2?[['candidate'+selection,next],['original',old]]:[['original',old],['candidate'+selection,next]])samples.push({component:kind,variant:name,sample:i,...v.run(kind)});}}
old.dispose();next.dispose();
const groups=[];for(const component of ['checkpoint-R','close-R'])for(const name of ['original','candidate'+selection]){const rows=samples.filter(p=>p.component===component&&p.variant===name),times=rows.map(p=>p.elapsedMs).sort((a,b)=>a-b);groups.push({component,variant:name,medianMs:times[1],rangeMs:[times[0],times[2]],counters:rows[0].counters});}
const result={kind:'runtime118-real-R-file-components',schemaVersion:1,baseCommit:'72275c80e92fad30bb736af3c5e5ee5a00731739',candidate:selection,candidateSupportSHA256:digest(fs.readFileSync(candidate+'/tools/rust-r4ghi/performance118/observation118.mjs')),engine:{file:process.execPath,version:process.version},inputCounts:{sources:420,compile:528,helpers:229,execution:284},sourceIDs,plan:{file:work+'/BENCHMARK-PLAN.md',rawBytesSha256:digest(fs.readFileSync(work+'/BENCHMARK-PLAN.md'))},workload:'Actual currentTaxFiles/currentTree file component loops on exact same current R files; no Native ticket/current state/close executed',pathBridge:'Exact Linux R prefix to native Windows R only; realpath and actual metadata/FD/content/SHA preserved; no runtime identity claim',cache:'warm/uncontrolled OS; no cache reset',warmupsPerVariantPerComponent:1,measuredSamplesPerVariantPerComponent:3,samples,groups,outputAssertionsPassed:true,actualEffects:{SQL:0,HTTP:0,Auth:0,snapshots:0,probes:0},limits:['Windows direct I/O, not Linux /mnt/e latency','M/P/history/ELFs/process/holder/control state/real CP/close unavailable','Explicit metadata calls only; implicit syscalls inside readFileSync not separately counted','Component model with sealed function bodies/reader adapters; not genuine Native qualification']};
const output=root+'/tmp/rust-r4ghi/root/runtime118-performance-slowpath-replays';fs.mkdirSync(output,{recursive:true});const dir=output+'/r-files-bench-'+randomUUID();fs.mkdirSync(dir);fs.writeFileSync(dir+'/result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:dir+'/result.json',groups,outputAssertionsPassed:true}));
