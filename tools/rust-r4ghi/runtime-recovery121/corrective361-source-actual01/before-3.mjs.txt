// Root-only FS publication. No context factory, SQL, HTTP or process control.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const PRIVATE='/home/wangzishi/.local/share/poms-r4ghi/private';
const DATA=PRIVATE+'/business/g2-business15/main01';
const SELF=ROOT+'/tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
function read(pin) {
  assert(pin&&typeof pin.file==='string'&&path.resolve(pin.file)===pin.file);
  assert(/^[a-f0-9]{64}$/.test(pin.rawBytesSha256));
  const st=fs.lstatSync(pin.file);
  assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);
  assert.equal(fs.realpathSync(pin.file),pin.file);
  const bytes=fs.readFileSync(pin.file);assert.equal(sha(bytes),pin.rawBytesSha256);
  if(pin.bytes!==undefined)assert.equal(pin.bytes,bytes.length);return bytes;
}
const json=pin=>JSON.parse(read(pin));
function pin(file) {const b=fs.readFileSync(file);const p={file,bytes:b.length,rawBytesSha256:sha(b)};read(p);return p;}
function privatePin(p) { assert(p.file.startsWith(PRIVATE+'/'));return read(p); }
function canonicalSources(list) {
  assert(Array.isArray(list));
  const result=list.map(p=>{
    assert(p.file.startsWith(ROOT+'/'));read(p);
    return{file:p.file,rawBytesSha256:p.rawBytesSha256};
  }).sort((a,b)=>Buffer.compare(Buffer.from(a.file),Buffer.from(b.file)));
  assert.equal(new Set(result.map(x=>x.file)).size,result.length);return result;
}
function preimport(plan,input,approvalPin=null) {
  // Only built-in local strict readers run before the complete module closure.
  assert.equal(plan.kind,'source15-append-runtime-plan121');
  assert.equal(plan.namespace,'poms-r4ghi');assert.equal(plan.epoch,'g2-business15');
  privatePin(input);privatePin(plan.current.helperPins);
  const helpers=json(plan.current.helperPins);assert.equal(helpers.length,229);
  const names=fs.readdirSync(ROOT+'/tools/rust-r4ghi/business')
    .filter(n=>/\.(mjs|json)$/.test(n)).sort();
  assert.deepEqual(names,helpers.map(p=>path.posix.basename(p.file)));
  for(const p of helpers) {
    assert.equal(p.file,'tools/rust-r4ghi/business/'+path.posix.basename(p.file));
    assert(/^[a-f0-9]{64}$/.test(p.sha256));
    read({file:ROOT+'/'+p.file,rawBytesSha256:p.sha256});
  }
  const sources=canonicalSources(plan.tooling.executionSources);
  for(const name of ['runtime-admission121.mjs','runtime-admission-core121.mjs'])
    assert(sources.some(p=>p.file===ROOT+'/tools/rust-r4ghi/business/'+name));
  const self=pin(SELF);assert.equal(fileURLToPath(import.meta.url),SELF);
  assert(sources.some(p=>p.file===self.file&&p.rawBytesSha256===self.rawBytesSha256));
  const manifest=json(plan.tooling.manifest);assert.equal(manifest.kind,'I-runtime121-code-candidate');
  assert.equal(manifest.production.length,9);
  for(const e of manifest.production)
    assert(sources.some(p=>p.file===ROOT+'/'+e.file&&p.rawBytesSha256===e.afterSHA256));
  if(approvalPin) {
    privatePin(approvalPin);const approval=json(approvalPin);
    assert.equal(approval.kind,'Root-approved-exact-runtime-admission121');
    assert.equal(approval.actualG2Authorized,true);
    assert.equal(approval.FSStatePublicationGranted,true);
    for(const flag of ['APIStartGranted','PGWriteGranted','TaxHTTPGranted'])assert.equal(approval[flag],false);
    assert.deepEqual({file:approval.operator.file,rawBytesSha256:approval.operator.rawBytesSha256},
      {file:self.file,rawBytesSha256:self.rawBytesSha256});
    assert.deepEqual({file:approval.approvedPlan.file,rawBytesSha256:approval.approvedPlan.rawBytesSha256},
      {file:input.file,rawBytesSha256:input.rawBytesSha256});
  }
  return sources;
}
export function installWx121(file,value) {
  assert.equal(path.resolve(file),file);assert.equal(fs.realpathSync(path.dirname(file)),path.dirname(file));
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value,null,2)+'\n');
  fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});
  const actual=pin(file);assert.equal(actual.rawBytesSha256,sha(bytes));return actual;
}
export function assertStateCAS121(file,expected) {
  const actual=pin(file);assert.equal(actual.rawBytesSha256,expected.rawBytesSha256);
  if(expected.bytes!==undefined)assert.equal(actual.bytes,expected.bytes);
  return fs.readFileSync(file);
}
export async function main121(args=process.argv.slice(2)) {
  if(args.length===1&&args[0]==='--help') {
    console.log('Root121 FS only: --input FILE --approved-input-sha SHA --inspect; or --input FILE --approved-input-sha SHA --review ROOT-G2 --approved-review-sha SHA --execute');return;
  }
  assert.equal(process.platform,'linux');assert.equal(process.cwd(),ROOT);assert.equal(process.getuid(),1000);
  assert.equal(process.version,'v24.19.0');assert.deepEqual(process.execArgv,[]);
  assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
  const inspect=args.length===5&&args[4]==='--inspect';
  assert(inspect||args.length===9&&args[8]==='--execute');
  assert.equal(args[0],'--input');assert.equal(args[2],'--approved-input-sha');
  const input={file:args[1],rawBytesSha256:args[3]};privatePin(input);
  const plan=json(input);
  let approvalPin=null;
  if(!inspect) {
    assert.equal(args[4],'--review');assert.equal(args[6],'--approved-review-sha');
    approvalPin={file:args[5],rawBytesSha256:args[7]};
  }
  const sourceBefore=preimport(plan,input,approvalPin);
  const n=await import(pathToFileURL(ROOT+'/tools/rust-r4ghi/business/runtime-admission121.mjs').href);
  const c=await import(pathToFileURL(ROOT+'/tools/rust-r4ghi/business/runtime-admission-core121.mjs').href);
  assert.deepEqual(preimport(plan,input,approvalPin),sourceBefore);
  const facts=n.verifyRuntimePlan121(input);
  if(inspect) {
    console.log(JSON.stringify({kind:'runtime121-FS-plan-inspected',approvedPlan:input,
      scope121:c.scope121(plan),currentGranted:false,statePublished:false}));return;
  }
  const approval=json(approvalPin),reviewPin=approval.independentInputReview,review=json(reviewPin);
  c.assertRuntimeApproval121(plan,input,reviewPin,review,approval);
  const lock=DATA+'/driver.lock',lockBytes=Buffer.from(JSON.stringify({
    kind:'runtime121-exclusive-FS-publication',pid:process.pid,nonce:plan.nonce,input,approval:approvalPin,
  })+'\n');
  fs.writeFileSync(lock,lockBytes,{flag:'wx',mode:0o600});
  let made=false,published=false;
  try {
    const original=assertStateCAS121(DATA+'/state.json',plan.stateTransfer.expectedState);
    assertStateCAS121(DATA+'/ownership.jsonl',plan.stateTransfer.expectedOwnership);
    c.publishIdle121(JSON.parse(original));
    assert(!fs.existsSync(plan.outputs.receiptDirectory),'Existing/orphan runtime output requires Root reconciliation');
    assert.equal(path.dirname(plan.outputs.receiptDirectory),DATA);
    fs.mkdirSync(plan.outputs.receiptDirectory,{mode:0o700});made=true;
    installWx121(plan.outputs.receiptDirectory+'/intent.json',{
      kind:'actual-runtime121-FS-publication-intent',input,approval:approvalPin,review:reviewPin,
      sourceBefore,ordinaryContextCreated:false,SQLHTTP:false,
    });
    const refreshed=n.verifyRuntimePlan121(input);
    assert.deepEqual(refreshed.current,facts.current);
    const registry=c.registryBody121(plan,input,refreshed,reviewPin,approvalPin);
    const registryPin=installWx121(plan.outputs.registryFile,registry);
    assert.deepEqual(json(registryPin),registry);
    const candidate=c.candidateBody121(plan,registryPin,registry);
    const candidatePin=installWx121(plan.outputs.candidateFile,candidate);
    assert.deepEqual(json(candidatePin),candidate);
    assertStateCAS121(DATA+'/state.json',plan.stateTransfer.expectedState);
    assertStateCAS121(DATA+'/ownership.jsonl',plan.stateTransfer.expectedOwnership);
    assert(fs.readFileSync(lock).equals(lockBytes));
    const state=c.stateBody121(JSON.parse(original),plan,{verifiedFromDisk:true,
      registryPin,registryBody:json(registryPin),candidatePin,candidateBody:json(candidatePin)},new Date().toISOString());
    const temp=DATA+'/state.json.runtime121-'+plan.nonce+'.tmp';
    const staged=installWx121(temp,state);
    assertStateCAS121(DATA+'/state.json',plan.stateTransfer.expectedState);
    assert(fs.readFileSync(lock).equals(lockBytes));fs.renameSync(temp,DATA+'/state.json');published=true;
    const written=pin(DATA+'/state.json');assert.equal(written.rawBytesSha256,staged.rawBytesSha256);
    assert.deepEqual(json(written),state);
    const complete=installWx121(plan.outputs.receiptDirectory+'/complete.json',{
      kind:'actual-Source15-runtime121-FS-publication-complete',input,approval:approvalPin,
      registry:registryPin,candidate:candidatePin,state:written,ordinaryContextCreated:false,
      statePublished:true,APIStarted:false,SQLHTTP:false,G3:false,G4:false,
    });
    assert(fs.readFileSync(lock).equals(lockBytes));fs.unlinkSync(lock);
    console.log(JSON.stringify({complete,statePublished:true,realConstructorAcceptanceStillRequired:true}));
  } catch(error) {
    if(made)try {
      installWx121(plan.outputs.receiptDirectory+'/partial.json',{
        kind:'runtime121-FS-publication-partial-preserve',input,approval:approvalPin,
        error:{name:error.name,message:error.message},stateMayBePublished:published,
        orphanFilesAndLockPreserved:true,blindRetryForbidden:true,
      });
    } catch(secondary) { error.partialWriteError=secondary.message; }
    throw error;
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  main121().catch(error=>{console.error(JSON.stringify({
    kind:'runtime121-FS-stopped-preserve',message:error.message,
    partialWriteError:error.partialWriteError??null,blindRetryForbidden:true,
  }));process.exitCode=1;});
