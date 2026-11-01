// Root-owned actual internal/supplier hooks. Import opens no runtime resource.
import assert from'node:assert/strict';import fs from'node:fs';import{spawn}from'node:child_process';import{createHash}from'node:crypto';
import{createNumberLease}from'./number-lease.mjs';import{digest}from'./fixture-core.mjs';import{marker}from'./fixture-guard.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const priv='/home/wangzishi/.local/share/poms-r2m-continuation01/private';
export async function createAcceptanceExtensions({backend,tag,sourceCap}){
 assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]{1,24}$/.test(tag));
 // Seal before Native's original bootstrap temporarily populates process.env.
 const {managed}=await import('./database-client.mjs');const rustEnvironment=backend==='rust'?managed('rust').childEnv:null;
 const {createSupplierExtensions}=await import('./acceptance-suppliers.mjs');const suppliers=await createSupplierExtensions({backend,tag,sourceCap});
 let numbers,numberRows=[],numberRun;const writers=[];
 async function rustInternalProbe(example,input,retain){assert(['m_number_probe','m_shared_uow_probe'].includes(example));
  const binary='/home/wangzishi/.local/share/poms-r2m-continuation01/target/release/examples/'+example,bound=sourceCap.artifacts.find(a=>a.kind==='rust-internal-probe'&&a.file===binary);assert(bound);assert.equal(sha(fs.readFileSync(binary)),bound.rawBytesSha256);
  const directory=priv+'/execution-logs',parent=fs.lstatSync(directory);assert(parent.isDirectory()&&!parent.isSymbolicLink()&&(parent.mode&0o077)===0);const file=`${directory}/probe-${example}-${tag}-${input.runId}-${sha(String(input.caseId??'number')).slice(0,12)}.log`,fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
  let child,identity,timer;const chunks=[];let length=0,timedOut=false;
  const processIdentity=pid=>{const s=fs.readFileSync(`/proc/${pid}/stat`,'utf8');return{pid,startTicks:s.slice(s.lastIndexOf(')')+2).split(' ')[19]}};
  const stopIfOwned=signal=>{try{if(identity&&digest(processIdentity(child.pid))===digest(identity))child.kill(signal)}catch(error){if(!['ENOENT','ESRCH'].includes(error.code))timedOut=true}};
  try{const exit=await new Promise((resolve,reject)=>{child=spawn(binary,[],{cwd:process.cwd(),env:rustEnvironment,stdio:['pipe','pipe',fd]});child.once('error',reject);child.once('spawn',()=>{identity=processIdentity(child.pid)});child.stdout.on('data',b=>{length+=b.length;if(length>8*1024*1024){child.kill('SIGTERM');return}chunks.push(b)});child.once('close',(code,signal)=>resolve({code,signal}));timer=setTimeout(()=>{timedOut=true;{stopIfOwned('SIGTERM');setTimeout(()=>{if(child.exitCode===null&&child.signalCode===null)stopIfOwned('SIGKILL')},5000).unref()}},120000);child.stdin.once('error',()=>undefined);child.stdin.end(JSON.stringify(input));});
   clearTimeout(timer);fs.fsyncSync(fd);const raw=Buffer.concat(chunks);numberRun={kind:'actual-owned-Rust-internal-probe',example,identity,exit,timedOut,inputSha256:digest(input),binary,rawBytesSha256:bound.rawBytesSha256,stdoutSha256:sha(raw),privateLog:{file,bytes:fs.fstatSync(fd).size,contentsExported:false},stopped:true};writers.push({kind:'rust-number-probe',identity:String(identity.pid)+':'+identity.startTicks,stopped:true});await retain({kind:'number-probe-actual-private',record:{...numberRun,stdout:raw.toString('utf8')}});assert(!timedOut&&exit.code===0&&exit.signal===null);return{rawBytes:raw,process:numberRun};
  }finally{clearTimeout(timer);fs.closeSync(fd)}
 }
 return{
  beforeCase:ctx=>suppliers.beforeCase(ctx),
  supplier:ctx=>suppliers.supplier(ctx),
  additionalRowIsScoped(table,row){return table==='business_number_sequence'&&numberRows.some(expected=>digest(expected)===digest(row))},
  async internal(ctx){if(ctx.operation==='common-shared-uow'){const {runSharedUow}=await import('./acceptance-uow.mjs');return runSharedUow({...ctx,sourceCapId:sourceCap.id,runRust:rustInternalProbe})}assert.equal(ctx.operation,'numbers-nine-scopes','Only ready source-bound internal hook admitted');assert(!numbers,'One number probe lease per run');const year=ctx.bindings.numberYear??8437;numbers=await createNumberLease({fixture:ctx.fixture,year,sourceCapId:sourceCap.id,recordPrivate:(kind,record)=>ctx.retain({kind,record})});
   const actual=backend==='nest'?await numbers.runNative(ctx.native,ctx.nextContext(ctx.caseId,'m.internal-numbers')):JSON.parse((await rustInternalProbe('m_number_probe',{runId:ctx.fixture.runId,marker,year},ctx.retain)).rawBytes);numberRows=await numbers.capture(actual);return{...actual,sourceCapId:sourceCap.id,certificates:{leaseRows:18,actualProbe:numberRun??{kind:'one-original-Native-number-service-and-independent-visible-rows'},beforeAbsent:true}};
  },
  async beforeDrainClose(){const closed=await suppliers.beforeDrainClose();return{...closed,writers:[...writers,...closed.writers]}},
  async afterDrainRestore(){return{numbers:numbers?await numbers.restoreAfterDrain():{used:false}}},
 };
}
