import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {AsyncLocalStorage} from 'node:async_hooks';
import {CommonFixture,identities} from './common-fixture.mjs';
import {managed} from './database-client.mjs';
import {createNativeAdapter} from './l-native-adapter.mjs';
import {createNativeWriteWitness} from './l-native-write-witness.mjs';
import {commonCorpus} from './common-corpus.mjs';
const require=createRequire(import.meta.url),{Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg'),{installQueryCapture}=require('../rust-r2c/witness-query-core.cjs');
const tag=process.argv[2];assert(process.argv.length===3&&/^[a-z0-9-]{1,35}$/.test(tag??''));assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');
const output=`tmp/rust-r2l1/common-acceptance-${tag}.json`;assert(!fs.existsSync(output));
const hash=b=>createHash('sha256').update(b).digest('hex'),binary='/home/wangzishi/.local/share/poms-r2l1/target/release/examples/approval_common_probe';
function sourceTree(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{assert(!e.isSymbolicLink());const file=dir+'/'+e.name;return e.isDirectory()?sourceTree(file):e.isFile()?[file]:[];});}
const files=[...new Set(['apps/poms-api-rust/Cargo.toml','apps/poms-api-rust/Cargo.lock','apps/poms-api-rust/examples/approval_common_probe.rs',...sourceTree('apps/poms-api-rust/src'),...sourceTree('tools/rust-r2l1')])].sort();
const sources=()=>files.map(file=>({file,rawBytesSha256:hash(fs.readFileSync(file))}));
const runId=randomUUID(),ids=Object.fromEntries(['definition','summary','missing','outsider','repoDefinition','repoSnapshotBad','repoField','repoSnapshot1','repoSnapshot2','repoTarget','repoBadNull','repoBadUndefined','repoBadLength','repoNullDefault','approval','terminal','approvalTarget','todo1','todo2',...Array.from({length:9},(_,i)=>'s'+i),...Array.from({length:9},(_,i)=>'c'+i)].map(k=>[k,randomUUID()]));
const report={formatVersion:1,kind:'finite-internal-service-paired-PG-observations',tag,runId,at:new Date().toISOString(),node:process.version,result:'pending',ids,sourceBefore:sources(),binary:{path:binary,rawBytesSha256:hash(fs.readFileSync(binary))},backends:{}};
const storage=new AsyncLocalStorage();let originalQuery,capture,currentBackend,currentCase,currentStep,currentOp,currentEntry;
const fixtures=new Map(),closed=new Set();
function guardTree(f,value,seen=new WeakSet()){
 if(typeof value==='string'&&/^[0-9a-f-]{32,36}$/i.test(value)&&/^[0-9a-f]{32}$/i.test(value.replaceAll('-','')))assert(f.hasId(value),'Unregistered fixture UUID');
 if(value===null||typeof value!=='object'||value instanceof Date||seen.has(value))return;seen.add(value);for(const item of Object.values(value))guardTree(f,item,seen);
}
function rustCase(request){
 const args=[],env={PATH:process.env.PATH,HOME:process.env.HOME,LANG:'C.UTF-8',POMS_ENV_FILE:'/home/wangzishi/.local/share/poms-r2l1/private/rust.env'};
 return new Promise((resolve,reject)=>{let out='',err='';const child=spawn(binary,args,{cwd:process.cwd(),env,stdio:['pipe','pipe','pipe']});const timer=setTimeout(()=>child.kill('SIGTERM'),30000);child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);child.on('error',reject);child.on('close',(code,signal)=>{clearTimeout(timer);if(code!==0)return reject(Object.assign(new Error('Rust internal probe failed'),{probeProcess:{code,signal,stdout:out,stderr:err}}));try{const lines=out.trim().split('\n');assert.equal(lines.length,1);resolve(JSON.parse(lines[0]));}catch(error){reject(error);}});child.stdin.end(JSON.stringify(request)+'\n');});
}
async function planInput(f,step,input,caseId){
 guardTree(f,input);
 // Repeated service admission inside this same case uses its first sealed
 // creation plan. It does not reclassify an already committed result as a new
 // fixture input, nor seal a still-uncommitted caller transaction early.
 const intent=async(table,selector,extra)=>{if(f.j.intents.some(i=>i.state==='planned'&&i.table===table&&i.extra.caseId===caseId&&JSON.stringify(i.selector)===JSON.stringify(selector)))return;await f.intent(table,selector,{...extra,caseId});};
 if(step.op==='summary.create')await intent('approval_summary_snapshot',{target_type:input.targetType,target_id:input.targetId,approval_scenario_key:input.approvalScenarioKey,summary_package_id:ids.definition,summary_package_key:input.summaryPackageKey},{fieldKeys:input.fieldProjections.map(x=>x.fieldKey)});
 if(step.op==='confirmation.create'){const v=input.input;assert.equal(v.confirmationType,'project-handover');await intent('confirmation_record',{confirmation_type:v.confirmationType,business_domain:v.businessDomain,target_type:v.targetType,target_id:v.targetId,project_id:v.projectId??null,created_by:input.actorId},{participants:v.participants});}
 if(['summary.definition.create','summary.snapshot.create','summary.projection.create'].includes(step.op)){
  const table=step.op==='summary.definition.create'?'approval_summary_package_definition':step.op==='summary.snapshot.create'?'approval_summary_snapshot':'approval_summary_field_projection';
  const snake=s=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());const row=Object.fromEntries(Object.entries(input).map(([k,v])=>[snake(k),v]));await intent(table,Object.fromEntries(identities[table].map(k=>[k,row[k]??null])),{});
 }
}
try{
 // Admit both fresh owner/app connections before loading the original module
 // graph. MikroORM may set its own process flags; no ambient value from that
 // graph is subsequently used to choose the Rust connection or probe config.
 const nativeEnv=managed('nest').childEnv;
 for(const backend of ['nest','rust'])fixtures.set(backend,await CommonFixture.open(backend,runId));
 originalQuery=Client.prototype.query;capture=installQueryCapture(Client,{append:row=>{report.backends[currentBackend]?.sql.push({...row,caseId:currentCase,step:currentStep,backendPid:storage.getStore()?.client?.processID??null});}});const captured=Client.prototype.query;Client.prototype.query=function(...args){if([...fixtures.values()].some(f=>f.client===this))return originalQuery.apply(this,args);return storage.run({client:this},()=>captured.apply(this,args));};
 for(const backend of ['nest','rust']){
  currentBackend=backend;const b={cases:[],sql:[],cleanup:[],result:'pending'};report.backends[backend]=b;const f=fixtures.get(backend);let adapter,witness,metadata;
  try{
   await f.prepare();b.actors=f.actors;for(const id of Object.values(ids))f.logical(id);
   if(backend==='nest'){
    witness=createNativeWriteWitness({onCommitted:rows=>f.recordCommittedCreates(rows),context:()=>({runId,caseId:currentCase,index:currentStep,op:currentOp})});
    adapter=await createNativeAdapter({subscribers:[witness.subscriber],connection:{host:'127.0.0.1',port:17432,dbName:'poms_r2l1_nest',user:'poms_r2l1_app',password:nativeEnv.DB_PASSWORD,schema:'poms'},guardCase:request=>{assert.equal(request.runId,runId);return{runId};},guardInput:({step,input})=>planInput(f,step,input,currentCase),guardManagedEntity:({entity,metadata:meta,input})=>{assert(f.hasId(entity.id));for(const key of Object.keys(input.changes))assert(!identities[meta.tableName].includes(meta.properties[key]?.fieldNames?.[0]),'Cannot mutate fixture identity');return true;},approvalIdentity:({id})=>id===ids.missing?null:[ids.approval,ids.terminal].includes(id)?{approvalType:'contract-review',targetObjectType:'project'}:undefined,onLoaded:({source,metadata:m,orm})=>{b.loadedSource=source;b.metadata=metadata=m;b.witnessConfiguration=witness.assertConfiguration(orm);},onStepStart:({index,step})=>{currentStep=index;currentOp=step.op;currentEntry.stepTimings.push({index,startedAt:new Date().toISOString()});},onStepEnd:({value})=>{
     currentEntry.stepTimings.at(-1).finishedAt=new Date().toISOString();
     const walk=(v,seen=new WeakSet())=>{if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);if(v.id&&metadata.some(m=>m.className===v.constructor?.name))f.logical(v.id);if(v.confirmationRecordId)f.logical(v.confirmationRecordId);for(const id of v.todoItemIds??[])f.logical(id);for(const child of Object.values(v))walk(child,seen);};walk(value);
    }});
   }
   await commonCorpus(f,ids,async input=>{
    currentCase=input.caseId;currentStep=null;currentOp=null;const entry={input,startedAt:new Date().toISOString(),before:await f.facts(),stepTimings:[]};b.cases.push(entry);currentEntry=entry;
    if(backend==='rust')for(const step of input.steps)if(step.input&&!JSON.stringify(step.input).includes('"$ref"'))await planInput(f,step,step.input,input.caseId);
    entry.observation=backend==='nest'?await adapter.runCase(input):await rustCase(input);
    if(witness){await witness.drain();witness.assertComplete();}else{entry.stepTimings=entry.observation.stepTimings;assert.equal(entry.observation.receiptIncomplete,false);for(const item of entry.observation.created){const context=item.proof.createContext;assert.equal(context.caseId,input.caseId);assert.equal(input.steps[context.index]?.op,context.op);}f.recordCommittedCreates(entry.observation.created);}
    entry.after=await f.facts();entry.finishedAt=new Date().toISOString();assert.equal(entry.observation.execution,'observed','Infrastructure must not become a product error');
    console.log(JSON.stringify({backend,caseId:input.caseId,result:'observed',steps:entry.observation.steps.length}));
   });
   if(adapter)b.sourceAfter=adapter.sourceReport();b.result='observed';
  }catch(error){b.result='fail';b.failure={name:error.name,message:error.message,...(error.probeProcess?{probeProcess:error.probeProcess}:{})};throw error;}
  finally{
   b.fixtureSetupWrites=f.setupWrites??[];if(adapter)b.adapterClose=await adapter.close();if(witness){b.writeWitness=await witness.drain();b.writeWitnessSources=witness.sourceReport();}
   try{for(let i=0;i<3;i++)b.cleanup.push(await f.cleanup());assert(b.cleanup.slice(1).every(v=>v.deleted===0&&v.base.changed===0));b.doubleZero=true;}catch(error){b.cleanupError={name:error.name,message:error.message};b.result='fail';report.result='fail';process.exitCode=1;}await f.close();closed.add(backend);b.ambientDatabaseKeyNamesAfter=Object.keys(process.env).filter(k=>/^(?:PG|DB_|MIKRO_)/i.test(k)||/^(?:DATABASE_URL|JWT_SECRET|NODE_OPTIONS|POMS_ENV_FILE)$/i.test(k));
  }
  assert.equal(b.result,'observed');
 }
 assert.equal(capture.isIncomplete(),false);assert.deepEqual(sources(),report.sourceBefore);assert.equal(hash(fs.readFileSync(binary)),report.binary.rawBytesSha256);report.sourceUnchanged=true;report.result='observed';
 report.scope='Raw observations only until a separate strict normalizer checks paired observations and facts; no L HTTP or real domain approval certification.';
}catch(error){report.result='fail';report.failure={name:error.name,message:error.message};process.exitCode=1;}
finally{for(const [backend,f]of fixtures)if(!closed.has(backend))await f.close();capture?.uninstall();if(originalQuery)Client.prototype.query=originalQuery;report.finishedAt=new Date().toISOString();fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({result:report.result,output,failure:report.failure??null}));}
