// Root-only, exact-input source promotion. Importing this module has no effects.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {C,assertOperatorHost121,json,pin,read,sha,directory121,writeWx} from './root/facts121.mjs';

const base=C.root+'/tools/rust-r4ghi/runtime-recovery121/corrective361-g3-freeze01/';
export const G3_361=Object.freeze({file:base+'Root-G3-code-input361.json',bytes:4167,rawBytesSha256:'820f727595c37cbe7eae6aa53ff3b9606ae6f0922be237f63fb8eb26f534ae07'});
const baselinePin={file:base+'baseline-pins361.json',bytes:8026,rawBytesSha256:'8e3660761c3b9e3c44750b5e6b6922aa6340280abf4d38c0c9ec2c695c1917a1'};
const prefix=C.private+'/runtime121-corrective361-source/';
const lockFile=C.private+'/runtime121-corrective361-source.lock';
const sourceFiles=[
  'tools/rust-r4ghi/tax15-invocation118/invocation-proof.mjs',
  'tools/rust-r4ghi/business/runtime-admission-core121.mjs',
  'tools/rust-r4ghi/business/runtime-admission121.mjs',
  'tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs',
  'tools/rust-r4ghi/runtime-recovery121/Native-plan-data-candidate01/prepare-native-plan121.mjs',
  'tools/rust-r4ghi/runtime-recovery121/Tax121-current-metadata-data-candidate01/prepare-tax121-current-metadata.mjs',
];
const closed=(v,keys)=>{assert(v&&typeof v==='object'&&!Array.isArray(v));assert.deepEqual(Object.keys(v).sort(),[...keys].sort());};
const full=p=>{closed(p,['file','bytes','rawBytesSha256']);assert(Number.isSafeInteger(p.bytes)&&p.bytes>=0);read(p);return p;};
const equalPin=(a,b)=>assert.deepEqual(a,b);
const order=(a,b)=>Buffer.compare(Buffer.from(a.file),Buffer.from(b.file));

export function inputShape361(p){
  closed(p,['kind','protocolVersion','nonce','G3','sourcePlan','operator','outputDirectory']);
  assert.equal(p.kind,'Root-runtime121-corrective361-source-promotion-input');assert.equal(p.protocolVersion,1);
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(p.nonce));
  equalPin(p.G3,G3_361);full(p.G3);full(p.sourcePlan);full(p.operator);
  assert.equal(p.operator.file,C.root+'/tools/rust-r4ghi/runtime-recovery121/promote-corrective361-once.mjs');
  assert.equal(p.outputDirectory,prefix+p.nonce);return p;
}
export function rootBody361(p,input){return{kind:'Root-approved-exact-runtime121-corrective361-source-promotion',input,G3:p.G3,sourcePlan:p.sourcePlan,operator:p.operator,nonce:p.nonce,productionMOD:4,outside284DataMOD:2,sourcePromotionGranted:true,stateHandoffGranted:false,modeRetryGranted:false,APIOrPGControlGranted:false,businessG3:false,businessG4:false};}
export function peerBody361(p,input,approval){return{kind:'non-author-runtime121-corrective361-source-safety',author:'Root',reviewer:'/root/transport358_code_review',reviewerIsAuthor:false,verdict:'approved-exact-six-source-promotion-only',input,G3:p.G3,sourcePlan:p.sourcePlan,operator:p.operator,expectedRootApproval:approval,productionMOD:4,outside284DataMOD:2,unchangedExecutionMembers:280,executionMembers:284,canonicalStateWriteGranted:false,APIOrPGControlGranted:false};}

export function sourcePlan361(p){
  inputShape361(p);const freeze=json(p.G3),b=json(baselinePin),s=json(p.sourcePlan);
  assert.equal(freeze.codeImplementationGranted,true);assert.equal(freeze.sourcePromotionGranted,false);
  closed(s,['kind','G3','productionManifest','productionCodeReview','dataManifest','dataCodeReview','operations','baselinePins']);
  assert.equal(s.kind,'Root-runtime121-corrective361-six-source-plan');equalPin(s.G3,p.G3);equalPin(s.baselinePins,baselinePin);
  for(const key of ['productionManifest','productionCodeReview','dataManifest','dataCodeReview'])full(s[key]);
  assert(Array.isArray(s.operations)&&s.operations.length===6);
  assert.deepEqual(s.operations.map(x=>x.file),sourceFiles);
  const m=json(s.productionManifest),r=json(s.productionCodeReview);
  assert.equal(m.kind,'I-runtime121-code-candidate');assert.equal(m.edition,361);equalPin(m.correctiveG3,p.G3);
  assert.equal(m.production.length,4);assert.equal(new Set(m.production.map(x=>x.file)).size,4);
  assert.equal(r.kind,'non-author-runtime121-finite-code-step');assert.equal(r.verdict,'approved-bounded-step-only');assert.equal(r.reviewerIsAuthor,false);
  assert(typeof r.author==='string'&&r.author.length>0);assert(typeof r.reviewer==='string'&&r.reviewer.length>0);assert.notEqual(r.author,r.reviewer);
  equalPin(r.componentManifest,s.productionManifest);equalPin(r.correctiveG3,p.G3);assert.equal(r.technicalG1.rawBytesSha256,'be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc');full(r.technicalG1);
  assert.equal(r.entries.length,4);
  const dm=json(s.dataManifest),dr=json(s.dataCodeReview);
  assert.equal(dm.kind,'I-runtime121-code-candidate');assert.equal(dm.edition,361);equalPin(dm.correctiveG3,p.G3);assert.equal(dm.production.length,2);assert.equal(new Set(dm.production.map(x=>x.file)).size,2);
  assert.equal(dr.kind,'non-author-runtime121-finite-code-step');assert.equal(dr.verdict,'approved-bounded-step-only');assert.equal(dr.reviewerIsAuthor,false);
  assert(typeof dr.author==='string'&&dr.author.length>0);assert(typeof dr.reviewer==='string'&&dr.reviewer.length>0);assert.notEqual(dr.author,dr.reviewer);
  equalPin(dr.componentManifest,s.dataManifest);equalPin(dr.correctiveG3,p.G3);equalPin(dr.technicalG1,r.technicalG1);assert.equal(dr.entries.length,2);
  const measured=s.operations.map((o,i)=>{
    closed(o,['file','before','candidate']);equalPin(o.before,freeze.exactBeforeSources[i]);assert.equal(o.before.file,C.root+'/'+o.file);
    full(o.before);full(o.candidate);assert(o.candidate.file.startsWith('/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/'));
    assert.notEqual(o.before.rawBytesSha256,o.candidate.rawBytesSha256);
    if(i<4){
      const product=m.production.find(x=>x.file===o.file),index=m.production.indexOf(product);assert(product);assert.equal(product.operation,'MOD');
      assert.equal(product.beforeSHA256,o.before.rawBytesSha256);assert.equal(product.afterSHA256,o.candidate.rawBytesSha256);equalPin(product.candidate,o.candidate);
      const entry=r.entries.find(x=>x.file===o.file);assert(entry);assert.equal(entry.beforeSHA256,product.beforeSHA256);assert.equal(entry.afterSHA256,product.afterSHA256);assert.equal(entry.productPointer,'/production/'+index);
    }else{
      const product=dm.production.find(x=>x.file===o.file),index=dm.production.indexOf(product);assert(product);assert.equal(product.operation,'MOD');
      assert.equal(product.beforeSHA256,o.before.rawBytesSha256);assert.equal(product.afterSHA256,o.candidate.rawBytesSha256);equalPin(product.candidate,o.candidate);
      const entry=dr.entries.find(x=>x.file===o.file);assert(entry);assert.equal(entry.beforeSHA256,product.beforeSHA256);assert.equal(entry.afterSHA256,product.afterSHA256);assert.equal(entry.productPointer,'/production/'+index);
    }
    return{...o,bytes:read(o.candidate)};
  });
  const old=json(b.oldExecution284),h=json(b.oldHelper229),e=json(b.oldExternal55);assert.equal(old.length,284);assert.equal(h.length,229);assert.equal(e.length,55);
  const paths=new Set(old.map(x=>x.file));assert.equal(paths.size,284);assert.deepEqual(old,[...old].sort(order));
  for(const q of old)read(q);for(const o of measured.slice(0,4)){const q=old.find(x=>x.file===o.before.file);assert(q);assert.equal(q.rawBytesSha256,o.before.rawBytesSha256);}
  for(const o of measured.slice(4))assert(!paths.has(o.before.file));
  const retained=json(b.retainedChangedSources);assert.equal(retained.mappings.length,4);
  for(const o of measured.slice(0,4)){const entry=retained.mappings.find(x=>x.relative===o.file);assert(entry);equalPin(entry.original,o.before);assert(read(entry.retainedCopy).equals(read(o.before)));}
  // Read-only pins: no private state body is returned, copied publicly or logged.
  const guards=[b.currentFailedState32bd,b.ownership,b.APIProcess,b.oldFailedBookend,
    {file:C.private+'/business/g2-business13/main01/state.json',rawBytesSha256:'af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4'},
    {file:C.private+'/business/g2-business14/main01/state.json',rawBytesSha256:'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97'},
    {file:C.private+'/business/g2-business15/main01/state.json',bytes:b.currentFailedState32bd.bytes,rawBytesSha256:b.currentFailedState32bd.rawBytesSha256},
    {file:C.private+'/business/g2-business15/main01/ownership.jsonl',bytes:b.ownership.bytes,rawBytesSha256:b.ownership.rawBytesSha256}];
  for(const q of guards)read(q);for(const n of [13,14,15])assert(!fs.existsSync(C.private+'/business/g2-business'+n+'/main01/driver.lock'));
  assert.equal(fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),'0e313ea7-9ac2-4a55-b1fe-fb472441344a');
  const api=json(b.APIProcess);assert(fs.existsSync('/proc/'+api.pid));assert.equal(fs.realpathSync('/proc/'+api.pid+'/cwd'),C.mirror);
  return{b,s,measured,old,h,e,guards};
}

async function main(){
  assertOperatorHost121();assert.equal(process.platform,'linux');const a=process.argv.slice(2);assert.equal(a.length,13);
  assert.deepEqual([a[0],a[2],a[4],a[6],a[8],a[10],a[12]],['--input','--input-sha','--peer-review','--peer-review-sha','--Root-review','--Root-review-sha','--execute']);
  const input=pin(a[1]);assert.equal(input.rawBytesSha256,a[3]);const p=inputShape361(json(input));
  const peer=pin(a[5]);assert.equal(peer.rawBytesSha256,a[7]);const root=pin(a[9]);assert.equal(root.rawBytesSha256,a[11]);
  equalPin(p.operator,pin(C.root+'/tools/rust-r4ghi/runtime-recovery121/promote-corrective361-once.mjs'));
  assert.deepEqual(json(root),rootBody361(p,input));assert.deepEqual(json(peer),peerBody361(p,input,root));
  const c=sourcePlan361(p);assert(!fs.existsSync(p.outputDirectory));assert(!fs.existsSync(lockFile));directory121(p.outputDirectory,{exclusive:true});
  const lockBytes=Buffer.from(JSON.stringify({nonce:p.nonce,input,pid:process.pid})+'\n');fs.writeFileSync(lockFile,lockBytes,{flag:'wx',mode:0o600});
  writeWx(p.outputDirectory,'intent.json',{kind:'actual-corrective361-source-promotion-intent',input,peerReview:peer,RootReview:root,operator:p.operator,sourcePlan:p.sourcePlan,canonicalStateWrite:false});
  const steps=[];
  for(const [index,o]of c.measured.entries()){
    const backup=writeWx(p.outputDirectory,'before-'+index+'.bin',read(o.before));
    const target=o.before.file,temp=target+'.corrective361-'+p.nonce;
    assert(!fs.existsSync(temp));fs.writeFileSync(temp,o.bytes,{flag:'wx',mode:fs.statSync(target).mode&0o777});
    assert(read(o.candidate).equals(o.bytes));read(o.before);assert.equal(sha(fs.readFileSync(temp)),o.candidate.rawBytesSha256);
    fs.renameSync(temp,target);const after=pin(target);assert.equal(after.rawBytesSha256,o.candidate.rawBytesSha256);assert.equal(after.bytes,o.candidate.bytes);
    steps.push(writeWx(p.outputDirectory,'step-'+index+'.json',{file:o.file,before:o.before,backup,candidate:o.candidate,after}));
  }
  for(const q of c.guards)read(q);
  const mods=new Map(c.measured.slice(0,4).map(o=>[o.file,o.candidate.rawBytesSha256]));
  const h=c.h.map(q=>mods.has(q.file)?{file:q.file,sha256:mods.get(q.file)}:q),e=c.e.map(q=>mods.has(q.file)?{file:q.file,sha256:mods.get(q.file)}:q);
  assert.equal(h.filter((q,i)=>q.sha256!==c.h[i].sha256).length,2);assert.equal(e.filter((q,i)=>q.sha256!==c.e[i].sha256).length,2);
  const x=[...h,...e].map(q=>({file:C.root+'/'+q.file,rawBytesSha256:q.sha256})).sort(order);
  assert.equal(x.length,284);assert.equal(new Set(x.map(q=>q.file)).size,284);assert.deepEqual(x.map(q=>q.file),c.old.map(q=>q.file));
  const changed=x.filter((q,i)=>q.rawBytesSha256!==c.old[i].rawBytesSha256);assert.equal(changed.length,4);assert.deepEqual(changed.map(q=>q.file).sort(),c.measured.slice(0,4).map(q=>q.before.file).sort());
  for(const q of x)read(q);for(const q of c.guards)read(q);
  const helper=writeWx(p.outputDirectory,'actual-helper-pins229.json',h),external=writeWx(p.outputDirectory,'actual-external-pins55.json',e),execution=writeWx(p.outputDirectory,'actual-execution-sources284.json',x);
  const witness=writeWx(p.outputDirectory,'source-witness13.json',{kind:'Root-runtime121-two-stage-client-source-witness',schemaVersion:1,baselineCompositionComplete:c.b.M06,baselineHelperPins:c.b.oldHelper229,baselineExternalPins:c.b.oldExternal55,baselineExecutionSources:c.b.oldExecution284,baselineStageManifest:c.b.oldNativeStageManifest9,retainedChangedSources:c.b.retainedChangedSources,successorManifest:c.s.productionManifest,successorCodeReview:c.s.productionCodeReview,currentHelperPins:helper,currentExternalPins:external,currentExecutionSources:execution});
  const successor=writeWx(p.outputDirectory,'successor12.json',{kind:'Root-runtime121-client-successor-handoff',schemaVersion:1,predecessorPlan:c.b.oldPlan,predecessorRegistry:c.b.oldRegistry,predecessorCandidate:c.b.oldCandidate,predecessorPublication:c.b.oldPublication,predecessorReadback:c.b.oldPublicationReadback,retainedCurrentState:c.b.currentFailedState32bd,failurePartial:c.b.failurePartial,failureRetention:c.b.failureRetention,failureReadback:c.b.failureReadback,sourceWitness:witness});
  const complete=writeWx(p.outputDirectory,'complete.json',{kind:'actual-runtime121-corrective361-source-promotion-complete',recordedAt:new Date().toISOString(),input,peerReview:peer,RootReview:root,steps,helperPins:helper,externalPins:external,executionSources:execution,sourceWitness:witness,successor,productionMOD:4,outside284DataMOD:2,unchangedExecutionMembers:280,canonicalStateWritten:false,APIOrPGControlled:false,modeExecuted:false,businessG3:false,businessG4:false});
  assert(fs.readFileSync(lockFile).equals(lockBytes));fs.unlinkSync(lockFile);console.log(JSON.stringify({complete,sourceWitness:witness,successor,canonicalStateWritten:false,modeExecuted:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{const frames=String(e.stack??'').split('\n').slice(1).filter(x=>/^\s+at /.test(x));console.error(JSON.stringify({kind:'Root-corrective361-source-promotion-stopped',name:e.name,code:e.code??null,frames,preservePartialAndLock:true,blindRetryForbidden:true}));process.exitCode=1;});
