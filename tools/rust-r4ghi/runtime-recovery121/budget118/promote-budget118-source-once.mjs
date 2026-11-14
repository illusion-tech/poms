// Root-only finite source operation. Importing this module performs no I/O.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { types, TextDecoder } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const P='/home/wangzishi/.local/share/poms-r4ghi/private';
const D=P+'/business/g2-business15/main01';
const SELF=R+'/tools/rust-r4ghi/runtime-recovery121/budget118/promote-budget118-source-once.mjs';
const RUNTIME=R+'/tools/rust-r4ghi/runtime-recovery121/budget118/reenter-budget118-runtime.mjs';
const LAUNCHER=R+'/tools/rust-r4ghi/runtime-recovery121/budget118/start-budget118-holder.ps1';
const LOCK=P+'/runtime118-reentry-operation.lock';
const GPIN=Object.freeze({file:R+'/tools/rust-r4ghi/budget-probe118-g1-v3/Root-G1-budget-probe118-v3.json',bytes:32283,rawBytesSha256:'80ea3db59386f935b733e5e29b7b8a4db860c408ccb84f9204b9b5adebac00a1'});
const CORRECTION=Object.freeze({file:R+'/tools/rust-r4ghi/runtime118-graph-RO-corrective01/Root-G3-corrective-runtime118-01.json',bytes:7322,rawBytesSha256:'56b922e657b4db4b8429aff638fe0f80a8dfa808cf53cb42a4211ccb59aed806'});
const oldNonce='2ba18403-1739-4274-8c3e-5e444f2aa6cf';
const PREDECESSOR=Object.freeze({
 predecessorPlan:{file:P+'/runtime121-native-plan-data/'+oldNonce+'/native-plan121.json',bytes:78405,rawBytesSha256:'f3e56838c28e7006311b6f292b882d8785cb49fd764d4370e60cfa36d9995fef'},
 predecessorRegistry:{file:D+'/runtime121-'+oldNonce+'/registry.json',bytes:134446,rawBytesSha256:'a8bcbc8db0125d3d7b5d0a1e3a941747f66fecc00d7f8dcaaa8752e7164c5a03'},
 predecessorCandidate:{file:D+'/runtime121-'+oldNonce+'/candidate.json',bytes:126007,rawBytesSha256:'2094bdded77e23efb985c90294c259f5458407fe9f79b12d7a9d828c82fd07f8'},
 predecessorPublication:{file:D+'/runtime121-'+oldNonce+'/complete.json',bytes:1522,rawBytesSha256:'5759e7524d1fd59dee9b019d0cc67e6c573dc45e5c0b9f3e73dcab4436ee7ffd'},
 predecessorReadback:{file:'/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/Native362-publication-readback-'+oldNonce+'/review-actual-publication362.json',bytes:73125,rawBytesSha256:'5063a0676cbe76c5d371d774f69f3089cc45769f405921cacb68c887d1cbda14'},
});
const birthDir=P+'/runtime121-prepare362-completed01/6458f733-0fe1-4b5e-b2ff-076908543af3';
const BIRTH=Object.freeze({state:{file:birthDir+'/state-after.json',bytes:15045544,rawBytesSha256:'6c1fabbacebc43fea8636c8fd91afac81dd66e8b6200ca5a769c08ae41401b3b'},ownership:{file:birthDir+'/ownership-after.jsonl',bytes:13016,rawBytesSha256:'1da85861708f1d1c37389385f6c86741e46a7053d5c0eb034260ff8c01aba517'},K:{file:D+'/000065-tax121-prepare-continuation.json',bytes:367950,rawBytesSha256:'847fe81ffbc4cf4f73b369ac1466e3185e051a6d0d87ca429b444111767115e7'}});
const edition='budget-probe118-reentry-v1';
const SOURCE_BASE=P+'/runtime118-source-promotion/';
const RETAIN_BASE=P+'/runtime118-budget-predecessor-source';
const SOURCE_STEP_KEYS=['kind','schemaVersion','input','index','target','group','before','candidate','backup','temp','after','rename','controlOutputs','recordedAt'];
const OP_LOCK_KEYS=['kind','schemaVersion','G1','input','operator','phase','nonce','pid','startTime','bootId'];
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const compare=(a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b));
const same=(a,b)=>assert.deepEqual(a,b);
const uuid=value=>assert(typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value));
const clone=value=>JSON.parse(JSON.stringify(value));
function frozen(value){if(value&&typeof value==='object'){for(const q of Object.values(value))frozen(q);Object.freeze(value);}return value;}
function closed(value,keys){
 assert(value&&typeof value==='object'&&!Array.isArray(value)&&!types.isProxy(value));
 assert([Object.prototype,null].includes(Object.getPrototypeOf(value)));assert.equal(Object.getOwnPropertySymbols(value).length,0);
 const descriptors=Object.getOwnPropertyDescriptors(value);for(const q of Object.values(descriptors))assert(Object.hasOwn(q,'value'));
 same(Object.keys(descriptors).sort(),[...keys].sort());return value;
}
function absolute(file){assert(typeof file==='string'&&/^[A-Za-z0-9_./:-]+$/.test(file)&&file.startsWith('/')&&path.posix.resolve(file)===file);return file;}
function pinShape(pin){closed(pin,['file','bytes','rawBytesSha256']);absolute(pin.file);assert(Number.isSafeInteger(pin.bytes)&&pin.bytes>=0);assert(/^[a-f0-9]{64}$/.test(pin.rawBytesSha256));return pin;}
// Named historical metadata uses Core.pinOnly references. Reads still require a real Full3.
function historicalPinReference(a,b){
 for(const p of[a,b]){closed(p,Object.hasOwn(p,'bytes')?['file','bytes','rawBytesSha256']:['file','rawBytesSha256']);absolute(p.file);assert(/^[a-f0-9]{64}$/.test(p.rawBytesSha256));if(Object.hasOwn(p,'bytes'))assert(Number.isSafeInteger(p.bytes)&&p.bytes>=0);}
 assert.equal(a.file,b.file);assert.equal(a.rawBytesSha256,b.rawBytesSha256);if(Object.hasOwn(a,'bytes')&&Object.hasOwn(b,'bytes'))assert.equal(a.bytes,b.bytes);
}
function statIdentity(file,stat,raw){
 assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1n);assert.equal(fs.realpathSync(file),file);
 return{file,dev:String(stat.dev),ino:String(stat.ino),nlink:String(stat.nlink),mode:String(stat.mode),uid:String(stat.uid),bytes:raw.length,rawBytesSha256:sha(raw),mtimeNs:String(stat.mtimeNs),ctimeNs:String(stat.ctimeNs),birthtimeNs:String(stat.birthtimeNs)};
}
function readMeasured(file){
 absolute(file);const before=fs.lstatSync(file,{bigint:true});assert(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n);assert.equal(fs.realpathSync(file),file);
 let fd=null;try{
  fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);const opened=fs.fstatSync(fd,{bigint:true});
  for(const key of ['dev','ino','nlink','size','mtimeNs','ctimeNs'])assert.equal(opened[key],before[key]);
  const raw=fs.readFileSync(fd);const after=fs.lstatSync(file,{bigint:true});
  for(const key of ['dev','ino','nlink','size','mtimeNs','ctimeNs'])assert.equal(after[key],before[key]);
  assert.equal(BigInt(raw.length),after.size);return{raw,pin:{file,bytes:raw.length,rawBytesSha256:sha(raw)},identity:statIdentity(file,after,raw)};
 }finally{if(fd!==null)fs.closeSync(fd);}
}
function read(pin){pinShape(pin);const measured=readMeasured(pin.file);same(measured.pin,pin);return measured.raw;}
const json=pin=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(read(pin)));
function absent(file){absolute(file);try{fs.lstatSync(file);}catch(error){if(error.code==='ENOENT')return;throw error;}throw Error('Existing bounded output or lock requires reconciliation');}
function directory(dir,{exclusive=false}={}){
 absolute(dir);assert(dir.startsWith(P+'/'));let current=P;const pieces=dir.slice(P.length+1).split('/');
 const check=()=>{const stat=fs.lstatSync(current,{bigint:true});assert(stat.isDirectory()&&!stat.isSymbolicLink()&&stat.uid===1000n);assert.equal(fs.realpathSync(current),current);};check();
 for(const [i,part]of pieces.entries()){assert(/^[A-Za-z0-9_.-]+$/.test(part)&&part!=='.'&&part!=='..');current+='/'+part;let exists=true;try{fs.lstatSync(current);}catch(error){if(error.code==='ENOENT')exists=false;else throw error;}if(exclusive&&i===pieces.length-1)assert(!exists);if(!exists)fs.mkdirSync(current,{mode:0o700});check();}
}
function write(dir,name,value){assert.equal(path.posix.basename(name),name);const file=dir+'/'+name,raw=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value,null,2)+'\n');fs.writeFileSync(file,raw,{flag:'wx',mode:0o600});const actual=readMeasured(file);assert(actual.raw.equals(raw));return actual.pin;}
function procStat(text){const at=text.lastIndexOf(') ');assert(at>0);const parts=text.slice(at+2).trim().split(/\s+/);assert(parts.length>=20);return{pid:Number(text.slice(0,text.indexOf(' ('))),startTime:parts[19]};}
function host(){assert.equal(process.platform,'linux');assert.equal(process.cwd(),R);assert.equal(fileURLToPath(import.meta.url),SELF);assert.equal(process.getuid(),1000);assert.deepEqual(process.execArgv,[]);assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);assert.equal(process.version,'v24.19.0');assert.equal(process.execPath,'/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node');assert.equal(readMeasured(process.execPath).pin.rawBytesSha256,'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12');}
function inputShape(input){
 closed(input,['kind','schemaVersion','nonce','G1','codeReview','sourcePlan','runtimeWindow','operator','outputDirectory']);
 assert.equal(input.kind,'Root-runtime118-successful-prepare-source-promotion-input');assert.equal(input.schemaVersion,1);uuid(input.nonce);same(input.G1,GPIN);
 for(const key of ['G1','codeReview','sourcePlan','runtimeWindow','operator'])pinShape(input[key]);assert.equal(input.operator.file,SELF);assert.equal(input.outputDirectory,SOURCE_BASE+input.nonce);return input;
}
function rootApprovalShape(root,p,input){
 closed(root,['kind','schemaVersion','input','G1','codeReview','operator','operatorIdentity','nonce','grants','retryPolicy']);
 assert.equal(root.kind,'Root-approved-runtime118-exact-source-promotion');assert.equal(root.schemaVersion,1);same(root.input,input);same(root.G1,p.G1);same(root.codeReview,p.codeReview);same(root.operator,p.operator);assert.equal(root.operatorIdentity,'Root');assert.equal(root.nonce,p.nonce);
 same(root.grants,{sourcePromotionGranted:true,canonicalStateWriteGranted:false,APIOrPGControlGranted:false,contextAuthGranted:false});assert.equal(root.retryPolicy,'preserve-partial-no-blind-retry');return root;
}
function codeQualification(p){
 const q=json(p.codeReview),g=json(p.G1);same(json(CORRECTION).frozenG1,GPIN);closed(q,['kind','schemaVersion','G1','operator','executionSources','author','codeAuthors','reviewer','reviewerIsAuthor','verdict','modelEvidence','engines']);
 assert.equal(q.kind,'non-author-runtime118-source-tool-code-qualification');assert.equal(q.schemaVersion,1);same(q.G1,p.G1);same(q.operator,p.operator);assert.equal(q.author,'Root');
 assert(Array.isArray(q.codeAuthors));same([...q.codeAuthors].sort(compare),[...g.authors].sort(compare));assert.equal(new Set(q.codeAuthors).size,q.codeAuthors.length);assert.equal(q.reviewer,g.independentReviewer);assert(!q.codeAuthors.includes(q.reviewer));assert.equal(q.reviewerIsAuthor,false);assert.equal(q.verdict,'approved-bounded-source-tool-code');
 assert(Array.isArray(q.executionSources)&&q.executionSources.length>=3);same(q.executionSources.map(x=>x.file),q.executionSources.map(x=>x.file).sort(compare));assert.equal(new Set(q.executionSources.map(x=>x.file)).size,q.executionSources.length);
 const changed=new Set(g.existingSources.map(x=>R+'/'+x.target));for(const entry of q.executionSources){read(entry);assert(!changed.has(entry.file),'Changing graph leaves cannot enter stable tool closure');}
 for(const file of [SELF,RUNTIME,LAUNCHER])assert(q.executionSources.some(x=>x.file===file));same(q.executionSources.find(x=>x.file===SELF),p.operator);read(q.modelEvidence);
 closed(q.engines,['windowsNode','linuxNode']);closed(q.engines.windowsNode,['executable','versionEvidence','modelResults']);closed(q.engines.linuxNode,['expectedExecutable','expectedVersion','observationStage']);same(q.engines.windowsNode.executable,{file:'/mnt/c/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe',bytes:92825416,rawBytesSha256:'3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237'});read(q.engines.windowsNode.executable);read(q.engines.windowsNode.versionEvidence);read(q.engines.windowsNode.modelResults);same(q.engines.linuxNode.expectedExecutable,g.currentFactBoundary.linuxNodeFrozenExpectation);assert.equal(q.engines.linuxNode.expectedVersion,'v24.19.0');assert.equal(q.engines.linuxNode.observationStage,'holder-system-bootstrap');return{q,g};
}
function peerShape(peer,p,input,approval,q){
 closed(peer,['kind','schemaVersion','input','G1','codeReview','operator','RootApproval','author','reviewer','reviewerIsAuthor','reviewerIsExecutor','verdict']);
 assert.equal(peer.kind,'non-author-runtime118-exact-source-promotion-review');assert.equal(peer.schemaVersion,1);same(peer.input,input);same(peer.G1,p.G1);same(peer.codeReview,p.codeReview);same(peer.operator,p.operator);same(peer.RootApproval,approval);
 assert.equal(peer.author,q.author);assert(typeof peer.reviewer==='string'&&peer.reviewer.length>0);assert(!q.codeAuthors.includes(peer.reviewer));assert.notEqual(peer.reviewer,'Root');assert.equal(peer.reviewerIsAuthor,false);assert.equal(peer.reviewerIsExecutor,false);assert.equal(peer.verdict,'approved-exact-nine-plus-two-source-only');return peer;
}
function graph(list){assert(Array.isArray(list)&&list.length===284);const result=list.map(q=>{assert(q&&typeof q.file==='string'&&q.file.startsWith(R+'/'));assert(/^[a-f0-9]{64}$/.test(q.rawBytesSha256));return{file:q.file,rawBytesSha256:q.rawBytesSha256};});same(result,[...result].sort((a,b)=>compare(a.file,b.file)));assert.equal(new Set(result.map(x=>x.file)).size,284);return result;}
function descriptors(helper,external){assert(Array.isArray(helper)&&helper.length===229);assert(Array.isArray(external)&&external.length===55);for(const list of [helper,external]){same(list,[...list].sort((a,b)=>compare(a.file,b.file)));for(const q of list){closed(q,['file','sha256']);assert(q.file.startsWith('tools/rust-r4ghi/'));assert(/^[a-f0-9]{64}$/.test(q.sha256));}}return graph([...helper,...external].map(x=>({file:R+'/'+x.file,rawBytesSha256:x.sha256})).sort((a,b)=>compare(a.file,b.file)));}
function planShape(p,g){
 const s=json(p.sourcePlan);closed(s,['kind','schemaVersion','G1','combinedManifest','graphReview','dataQualification','operations']);assert.equal(s.kind,'Root-runtime118-nine-plus-two-source-plan');assert.equal(s.schemaVersion,1);same(s.G1,p.G1);
 const m=json(s.combinedManifest);assert.equal(m.kind,'I-runtime121-code-candidate');assert.equal(m.edition,edition);same(m.technicalG1,p.G1);same(m.correctiveG3,p.G1);same(m.correctiveInputs,[CORRECTION]);assert.equal(m.production.length,9);assert.equal(m.dataProduction.length,2);
 const old=graph(json(g.sourceBoundary.graph)),members=new Set(old.map(x=>x.file.slice(R.length+1))),groups=[['production',s.graphReview,9],['dataProduction',s.dataQualification,2]];
 const entries=new Map();for(const[group,reviewPin,count]of groups){const review=json(reviewPin);assert.equal(review.kind,'non-author-runtime121-finite-code-step');assert.equal(review.verdict,'approved-bounded-step-only');same(review.technicalG1,p.G1);same(review.correctiveG3,p.G1);same(review.correctiveInputs,[CORRECTION]);same(review.componentManifest,s.combinedManifest);assert.equal(review.reviewerIsAuthor,false);assert(typeof review.author==='string'&&review.author);assert(typeof review.reviewer==='string'&&review.reviewer);assert.notEqual(review.reviewer,review.author);assert.equal(review.entries.length,count);assert.equal(m[group].length,count);
  for(const[index,e]of m[group].entries()){assert.equal(e.operation,'MOD');assert(!entries.has(e.file));const before=g.existingSources.find(x=>x.target===e.file);assert(before);same(e.before,before.deliveryBefore);assert.equal(e.beforeSHA256,e.before.rawBytesSha256);assert.equal(e.afterSHA256,e.candidate.rawBytesSha256);assert.notEqual(e.beforeSHA256,e.afterSHA256);read(e.candidate);if(before.treatmentFrom04==='CARRY-exact-qualified04'){assert.equal(e.afterSHA256,before.implementationBefore04.rawBytesSha256);assert(read(e.candidate).equals(read(before.retainedImplementationBefore04)));}assert.equal(members.has(e.file),group==='production');const proof=review.entries.find(x=>x.file===e.file);assert(proof);assert.equal(proof.beforeSHA256,e.beforeSHA256);assert.equal(proof.afterSHA256,e.afterSHA256);assert.equal(proof.productPointer,'/'+group+'/'+index);if(proof.candidate)same(proof.candidate,e.candidate);entries.set(e.file,{...e,group});}
 }
 assert.equal(entries.size,11);assert.equal(s.operations.length,11);same(s.operations.map(x=>x.file),g.existingSources.map(x=>x.target));
 const operations=s.operations.map(o=>{closed(o,['file','before','candidate']);const e=entries.get(o.file);assert(e);same(o.before,e.before);same(o.candidate,e.candidate);return{...o,group:e.group,raw:read(o.candidate)};});
 return{s,m,old,operations};
}

const WITNESS_KEYS=['kind','schemaVersion','baselineCompositionComplete','baselineHelperPins','baselineExternalPins','baselineExecutionSources','baselineStageManifest','retainedChangedSources','successorManifest','successorCodeReview','currentHelperPins','currentExternalPins','currentExecutionSources'];
function pointer(value,where){assert(typeof where==='string'&&where.startsWith('/'));return where.slice(1).split('/').reduce((v,key)=>{assert(v&&Object.hasOwn(v,key));return v[key];},value);}
function sourceHistory(g){
 const guards=[];const get=pin=>{const raw=read(pin);guards.push(clone(pin));return JSON.parse(raw);};
 const p3=get(PREDECESSOR.predecessorPlan),reg=get(PREDECESSOR.predecessorRegistry),cand=get(PREDECESSOR.predecessorCandidate),pub=get(PREDECESSOR.predecessorPublication),rb=get(PREDECESSOR.predecessorReadback);
 assert.equal(p3.protocolVersion,3);historicalPinReference(reg.approvedPlan,PREDECESSOR.predecessorPlan);historicalPinReference(cand.runtimeAdmission121,PREDECESSOR.predecessorRegistry);historicalPinReference(pub.input,PREDECESSOR.predecessorPlan);historicalPinReference(pub.registry,PREDECESSOR.predecessorRegistry);historicalPinReference(pub.candidate,PREDECESSOR.predecessorCandidate);assert.equal(pub.statePublished,true);
 assert.equal(rb.kind,'non-author-runtime121-corrective362-actual-FS-publication-readback');assert.equal(rb.verdict,'approved-actual-exact-successor-FS-publication-readback');for(const[key,p]of Object.entries({complete:PREDECESSOR.predecessorPublication,plan:PREDECESSOR.predecessorPlan,registry:PREDECESSOR.predecessorRegistry,candidate:PREDECESSOR.predecessorCandidate}))historicalPinReference(rb[key],p);
 const s3=get(p3.stateTransfer.successor),w3=get(s3.sourceWitness),p2=get(s3.predecessorPlan),s2=get(p2.stateTransfer.successor),w2=get(s2.sourceWitness),p1=get(s2.predecessorPlan);
 assert.equal(p2.protocolVersion,2);assert.equal(p1.protocolVersion,1);
 for(const[s,version]of[[s3,2],[s2,1]]){assert.equal(s.kind,'Root-runtime121-client-successor-handoff');assert.equal(s.schemaVersion,version);for(const key of ['predecessorPlan','predecessorRegistry','predecessorCandidate','predecessorPublication','predecessorReadback'])get(s[key]);}
 for(const[w,version,kind]of[[w3,2,'Root-runtime121-three-stage-client-source-witness'],[w2,1,'Root-runtime121-two-stage-client-source-witness']]){closed(w,WITNESS_KEYS);assert.equal(w.kind,kind);assert.equal(w.schemaVersion,version);for(const key of WITNESS_KEYS.slice(2))pinShape(w[key]);}
 same(w3.baselineCompositionComplete,s3.predecessorPublication);same(w3.baselineStageManifest,p2.tooling.manifest);same(w3.successorManifest,p3.tooling.manifest);same(w2.successorManifest,p2.tooling.manifest);
 for(const k of ['HelperPins','ExternalPins','ExecutionSources'])same(w3['baseline'+k],w2['current'+k]);
 historicalPinReference(w3.currentHelperPins,p3.current.helperPins);historicalPinReference(w2.currentHelperPins,p2.current.helperPins);historicalPinReference(w2.baselineHelperPins,p1.current.helperPins);
 const t6=get(w3.retainedChangedSources),t4=get(w2.retainedChangedSources);
 for(const[t,count,kind]of[[t6,6,'Root-fixed-six-predecessor-source-retained362'],[t4,4,'Root-fixed-four-predecessor-source-retained361']]){assert.equal(t.kind,kind);assert.equal(t.oldExecutionCount,284);assert.equal(t.mappings.length,count);assert.equal(new Set(t.mappings.map(x=>x.relative)).size,count);for(const e of t.mappings){closed(e,['relative','original','retainedCopy']);assert.equal(e.original.file,R+'/'+e.relative);assert.equal(e.original.rawBytesSha256,e.retainedCopy.rawBytesSha256);assert.equal(e.original.bytes,e.retainedCopy.bytes);read(e.retainedCopy);guards.push(clone(e.retainedCopy));}}
 same(t6.oldGraph,w3.baselineExecutionSources);same(t4.oldGraph,w2.baselineExecutionSources);
 const stages=[];
 for(const[w,label]of[[w2,'361'],[w3,'362']]){
  const before=graph(get(w.baselineExecutionSources)),after=graph(get(w.currentExecutionSources)),h=get(w.currentHelperPins),e=get(w.currentExternalPins);same(descriptors(h,e),after);same(before.map(x=>x.file),after.map(x=>x.file));
  const manifest=get(w.successorManifest),review=get(w.successorCodeReview);assert.equal(manifest.kind,'I-runtime121-code-candidate');assert.equal(review.kind,'non-author-runtime121-finite-code-step');assert.equal(review.verdict,'approved-bounded-step-only');assert.equal(review.reviewerIsAuthor,false);assert.notEqual(review.author,review.reviewer);same(review.componentManifest,w.successorManifest);assert.equal(manifest.production.length,label==='361'?4:6);assert.equal(review.entries.length,manifest.production.length);
  const changed=after.filter((x,i)=>x.rawBytesSha256!==before[i].rawBytesSha256);same(changed.map(x=>x.file.slice(R.length+1)).sort(compare),manifest.production.map(x=>x.file).sort(compare));
  for(const[index,entry]of manifest.production.entries()){assert.equal(entry.operation,'MOD');const a=before.find(x=>x.file===R+'/'+entry.file),b=after.find(x=>x.file===a.file);assert(a&&b);assert.equal(entry.beforeSHA256,a.rawBytesSha256);assert.equal(entry.afterSHA256,b.rawBytesSha256);assert.equal(entry.candidate.rawBytesSha256,entry.afterSHA256);getSource(entry.candidate);const proof=review.entries.find(x=>x.file===entry.file);assert(proof);assert.equal(proof.beforeSHA256,entry.beforeSHA256);assert.equal(proof.afterSHA256,entry.afterSHA256);assert.equal(proof.productPointer,'/production/'+index);}
  stages.push({label,before,after,helper:h,external:e});
 }
 function getSource(pin){read(pin);guards.push(clone(pin));}
 const composition=get(w2.baselineCompositionComplete);assert.equal(w2.baselineCompositionComplete.rawBytesSha256,'9124829bdb1aa311055e99a4604767936914970c27d96b33ffc58e3fefb56c1a');assert.equal(composition.kind,'Root-runtime121-Native06-composition-materialized');same(composition.actualGraphs,{helper:w2.baselineHelperPins,external:w2.baselineExternalPins,execution:w2.baselineExecutionSources});
 get(composition.sourceSafetyComplete);get(composition.helperComposition);get(composition.externalComposition);get(composition.planComposition);same(graph(get(composition.normalizedExecutionSources)),stages[0].before);
 assert.equal(composition.components.length,3);same(composition.components.map(x=>x.count),[9,24,8]);same(composition.components[0].manifest,w2.baselineStageManifest);
 for(const c of composition.components){const m=get(c.manifest),r=get(c.review);get(c.G1);assert.equal(r.kind,'non-author-runtime121-finite-code-step');assert.equal(r.verdict,'approved-bounded-step-only');assert.equal(r.reviewerIsAuthor,false);same(r.componentManifest,c.manifest);same(r.technicalG1,c.G1);assert.equal(r.entries.length,c.count);for(const proof of r.entries){const entry=pointer(m,proof.productPointer);assert.equal(entry.file,proof.file);assert.equal(entry.beforeSHA256,proof.beforeSHA256);assert.equal(entry.afterSHA256,proof.afterSHA256);assert.equal(entry.candidate.rawBytesSha256,entry.afterSHA256);getSource(entry.candidate);}}
 const old=stages[1].after;assert.equal(old.length,284);same(old,graph(p3.tooling.executionSources));
 // Original private manifest and public retained mirror are deliberately distinct identities.
 // Both must exist and their bytes must match; neither may replace the other's Full3.
 const originalGraphRaw=read(w3.currentExecutionSources),mirrorGraphRaw=read(g.sourceBoundary.graph);assert(originalGraphRaw.equals(mirrorGraphRaw),'Original source graph and frozen public mirror differ');same(old,graph(JSON.parse(mirrorGraphRaw)));
 const allMappings=[...t6.mappings,...t4.mappings];
 for(const rows of [stages[0].before,stages[0].after,stages[1].after])for(const q of rows){
  const current=old.find(x=>x.file===q.file);assert(current);if(current.rawBytesSha256===q.rawBytesSha256){const measured=readMeasured(q.file);assert.equal(measured.pin.rawBytesSha256,q.rawBytesSha256);}
  else{const matches=allMappings.filter(x=>x.original.file===q.file&&x.original.rawBytesSha256===q.rawBytesSha256);assert.equal(matches.length,1,'Missing or ambiguous named historical source retention');getSource(matches[0].retainedCopy);}
 }
 for(const p of p3.composition.independentCodeReviews)get(p);
 // M06/361/362 metadata and named source archives remain immutable throughout this operation.
 const immutable=[...new Map(guards.map(x=>[x.file,x])).values()];
 return{p3,reg,cand,pub,rb,w3,old,helper:stages[1].helper,external:stages[1].external,beforeGraphs:{helper:w3.currentHelperPins,external:w3.currentExternalPins,execution:w3.currentExecutionSources},immutable};
}

async function runtimeReaders(q){
 for(const p of q.executionSources)read(p);
 const runtimePin=q.executionSources.find(x=>x.file===RUNTIME);assert(runtimePin);read(runtimePin);
 const module=await import(pathToFileURL(RUNTIME).href);read(runtimePin);for(const p of q.executionSources)read(p);
 assert.equal(typeof module.readSourcePromotionWindow118,'function');assert.equal(typeof module.readSourceRecoveryHandoff118,'function');return module;
}
function driverAndLegacyLocksAbsent(){
 for(const n of[13,14,15])absent(P+'/business/g2-business'+n+'/main01/driver.lock');
 for(const name of['runtime121-corrective361-source.lock','runtime121-corrective362-source.lock'])absent(P+'/'+name);
}
function ownLock(lock){
 assert(lock);const current=readMeasured(LOCK);assert.equal(current.identity.dev,lock.identity.dev);assert.equal(current.identity.ino,lock.identity.ino);assert.equal(current.identity.nlink,'1');assert(current.raw.equals(lock.raw));return current;
}
function liveGuard(c){
 for(const p of c.qualification.executionSources)read(p);
 for(const p of c.history.immutable)read(p);
 c.runtime.readSourcePromotionWindow118(c.p.runtimeWindow);driverAndLegacyLocksAbsent();
 if(c.lock)ownLock(c.lock);else absent(LOCK);
 for(const o of c.operations){const expected=c.renamed.has(o.file)?o.candidate:o.before;const actual=readMeasured(o.before.file);assert.equal(actual.pin.bytes,expected.bytes);assert.equal(actual.pin.rawBytesSha256,expected.rawBytesSha256);}
 for(const leaf of c.old){const operation=c.operations.find(o=>o.before.file===leaf.file);if(operation)continue;assert.equal(readMeasured(leaf.file).pin.rawBytesSha256,leaf.rawBytesSha256);}
}
function lockBody(c){const self=procStat(fs.readFileSync('/proc/self/stat','utf8'));return{kind:'Root-runtime118-reentry-operation-lock',schemaVersion:1,G1:GPIN,input:c.input,operator:c.p.operator,phase:'source-promotion',nonce:c.p.nonce,pid:self.pid,startTime:self.startTime,bootId:fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim()};}
function safeError(error){const name=typeof error?.name==='string'&&/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(error.name)?error.name:'Error';const code=typeof error?.code==='string'&&/^[A-Z0-9_]{1,80}$/.test(error.code)?error.code:null;return{name,code,category:'SOURCE_PROMOTION_STOPPED'};}
function safeException(error){const data=safeError(error),result=new Error('Bounded Root source operation stopped; preserve real outputs and locks');result.name='RootSourceOperationError';if(data.code!==null)result.code=data.code;result.category=data.category;return result;}
function tempIdentity(f11){return{dev:f11.dev,ino:f11.ino,nlink:f11.nlink,mode:f11.mode,size:String(f11.bytes),mtimeNs:f11.mtimeNs,ctimeNs:f11.ctimeNs};}
function observedOutputs(c){
 const results=[];for(const file of c.outputFiles){try{results.push(readMeasured(file).pin);}catch{}}
 return results;
}
function controlWrite(c,dir,name,value){const file=dir+'/'+name;c.outputFiles.add(file);const pin=write(dir,name,value);c.outputs.push(pin);return pin;}
function birthOrigin(c){
 const state=json(BIRTH.state),k=json(BIRTH.K),owned=read(BIRTH.ownership);assert.equal(owned.length,13016);
 assert.equal(state.sequence,65);assert.equal(Object.keys(state.actors).length,14);historicalPinReference(state.runtimeAdmission121.registry,PREDECESSOR.predecessorRegistry);historicalPinReference(state.runtimeAdmission121.candidate,PREDECESSOR.predecessorCandidate);
 const previous=json(c.g.previousJointG1),carrierPin=previous.actualPrepareCarrier;assert.equal(carrierPin.rawBytesSha256,'565740aa32a9c8b1b41810dd134566b2f7a6646493534b174c37669ce8d8b8c6');json(carrierPin);
 assert.equal(k.prepared15.rawBytesSha256,'b7ed0bd59bef213af4a7e479055e8221231868f052820cb4cec92d31bb3a889b');assert.equal(k.fullInventory.rawBytesSha256,'fdb957d8c82c0630eefa8ef0517bfa24cc0ec073fcf33bd923c78da09440946b');
 const closedJournal=json(k.closedJournal);assert.equal(closedJournal.mode,'prepare-only');assert.equal(closedJournal.phase,'closed-verified');historicalPinReference(closedJournal.result,k.prepared15);json(k.entryGuard);json(k.exitGuard);json(k.prepared15);json(k.fullInventory);
 for(const key of ['activeFault','blockedObservation','cleaned','cleanupPlan','admissionPending54'])assert(!state[key]);
 for(const name of ['taxContinuation13','taxContinuation14','taxContinuation15','taxContinuation121'])for(const key of ['pendingMain','pendingTaxTrial','normalTaxPending','unexpectedTaxACK'])assert(!state[name]?.[key]);
 return{kind:'Root-runtime121-successful-prepare-origin',schemaVersion:1,state:clone(BIRTH.state),ownership:clone(BIRTH.ownership),recordPointer:'/taxContinuation121',continuation121:clone(BIRTH.K),continuationReadback:clone(carrierPin)};
}
function retainBefore(c){
 const production=c.operations.filter(x=>x.group==='production').sort((a,b)=>compare(a.file,b.file));assert.equal(production.length,9);directory(RETAIN_BASE,{exclusive:true});
 const mappings=[];for(const[index,o]of production.entries()){liveGuard(c);const name=(index+1)+'-'+path.posix.basename(o.file)+'.bin';const backup=controlWrite(c,RETAIN_BASE,name,read(o.before));assert(read(backup).equals(read(o.before)));c.backups.set(o.file,backup);mappings.push({relative:o.file,original:clone(o.before),retainedCopy:backup});}
 c.retained9=controlWrite(c,c.p.outputDirectory,'retained-nine.json',{kind:'Root-fixed-nine-predecessor-source-retained118',recordedAt:new Date().toISOString(),priorPublication:PREDECESSOR.predecessorPublication,oldGraph:c.history.beforeGraphs.execution,oldExecutionCount:284,mappings,remainingUnchangedMembers:275,allPrior284CurrentlyRawMatched:true,priorStagesUnmodified:true,newSourceOrGraphCreated:false,productionWritten:false,canonicalStateWritten:false,modeExecuted:false,actualG2Granted:false});
 const data=[];for(const[index,o]of c.operations.filter(x=>x.group==='dataProduction').entries()){liveGuard(c);const backup=controlWrite(c,c.p.outputDirectory,'before-data-'+index+'.bin',read(o.before));assert(read(backup).equals(read(o.before)));c.backups.set(o.file,backup);data.push({relative:o.file,original:clone(o.before),retainedCopy:backup});}
 c.retainedData2=controlWrite(c,c.p.outputDirectory,'retained-data-two.json',{kind:'Root-fixed-two-metadata-predecessor-source-retained118',schemaVersion:1,G1:GPIN,mappings:data,productionWritten:false});
}
function promoteOne(c,o,index){
 const target=o.before.file,temp=target+'.runtime118-source-'+c.p.nonce+'.tmp';
 const step={kind:'Root-runtime118-source-promotion-step',schemaVersion:1,input:c.input,index,target:o.file,group:o.group,before:clone(o.before),candidate:clone(o.candidate),backup:clone(c.backups.get(o.file)),temp:null,after:null,rename:{attempted:false,confirmed:false,outcome:'NOT_ATTEMPTED'},controlOutputs:[],recordedAt:new Date().toISOString()};closed(step,SOURCE_STEP_KEYS);c.inFlight=step;
 c.phase='before-temp';liveGuard(c);absent(temp);const original=readMeasured(target);same(original.pin,o.before);read(step.backup);assert(read(o.candidate).equals(o.raw));
 c.phase='write-temp';c.outputFiles.add(temp);fs.writeFileSync(temp,o.raw,{flag:'wx',mode:Number(BigInt(original.identity.mode)&0o777n)});fs.chmodSync(temp,Number(BigInt(original.identity.mode)&0o777n));
 const pending=readMeasured(temp);assert(pending.raw.equals(o.raw));step.temp={file:temp,rawCopy:clone(o.candidate),identity:tempIdentity(pending.identity)};
 c.phase='before-rename';liveGuard(c);same(readMeasured(target).pin,o.before);assert(read(o.candidate).equals(o.raw));same(readMeasured(temp).identity,pending.identity);assert(read(step.backup).equals(read(o.before)));
 c.phase='rename';step.rename={attempted:true,confirmed:false,outcome:'UNKNOWN'};fs.renameSync(temp,target);
 c.phase='after-rename';const after=readMeasured(target);assert.equal(after.pin.bytes,o.candidate.bytes);assert.equal(after.pin.rawBytesSha256,o.candidate.rawBytesSha256);assert.equal(after.identity.dev,pending.identity.dev);assert.equal(after.identity.ino,pending.identity.ino);step.after=after.pin;step.rename={attempted:true,confirmed:true,outcome:'CONFIRMED_AFTER_RAW_READBACK'};c.renamed.add(o.file);c.actualAfters.set(o.file,after.pin);
 c.phase='step-receipt';step.recordedAt=new Date().toISOString();const receipt=controlWrite(c,c.p.outputDirectory,'step-'+String(index).padStart(2,'0')+'.json',step);c.steps.push(receipt);c.inFlight=null;
}
function actualGraphs(c){
 liveGuard(c);const modifications=new Map(c.operations.filter(x=>x.group==='production').map(o=>[o.file,o.candidate.rawBytesSha256]));
 const map=list=>list.map(q=>({file:q.file,sha256:modifications.get(q.file)??q.sha256}));const helper=map(c.history.helper),external=map(c.history.external),execution=descriptors(helper,external);
 same(execution.map(x=>x.file),c.old.map(x=>x.file));assert.equal(execution.filter((x,i)=>x.rawBytesSha256!==c.old[i].rawBytesSha256).length,9);assert.equal(helper.filter((x,i)=>x.sha256!==c.history.helper[i].sha256).length,2);assert.equal(external.filter((x,i)=>x.sha256!==c.history.external[i].sha256).length,7);
 for(const q of execution)assert.equal(readMeasured(q.file).pin.rawBytesSha256,q.rawBytesSha256);
 return{helper:controlWrite(c,c.p.outputDirectory,'actual-helper-pins229.json',helper),external:controlWrite(c,c.p.outputDirectory,'actual-external-pins55.json',external),execution:controlWrite(c,c.p.outputDirectory,'actual-execution-sources284.json',execution)};
}
function partial(c,error){
 const record={kind:'Root-runtime118-source-promotion-partial',schemaVersion:1,input:c.input,RootApproval:c.approval,executionReview:c.peer,operator:c.p.operator,sourcePlan:c.p.sourcePlan,runtimeWindow:c.p.runtimeWindow,phase:c.phase,completedSteps:clone(c.steps),inFlight:c.inFlight?clone(c.inFlight):null,error:safeError(error),controlOutputs:observedOutputs(c),canonicalWritten:false,ownershipWritten:false,blindRetryForbidden:true};
 if(c.outReady){try{write(c.p.outputDirectory,'partial.json',record);}catch{}}
 // Source bytes may already have changed even if this safe receipt also failed.
 console.error(JSON.stringify({kind:'Root-runtime118-source-promotion-stopped',phase:c.phase,completedStepCount:c.steps.length,inFlight:record.inFlight,error:record.error,preservePartialAndLocks:true,blindRetryForbidden:true}));
}
async function execute(input,approval,peer){
 const p=inputShape(json(input));same(readMeasured(SELF).pin,p.operator);const{q,g}=codeQualification(p);rootApprovalShape(json(approval),p,input);peerShape(json(peer),p,input,approval,q);
 const plan=planShape(p,g),history=sourceHistory(g);same(plan.old,history.old);const runtime=await runtimeReaders(q);
 const c={p,input,approval,peer,g,qualification:q,...plan,history,runtime,renamed:new Set(),actualAfters:new Map(),backups:new Map(),outputFiles:new Set(),outputs:[],steps:[],inFlight:null,lock:null,outReady:false,phase:'preflight'};
 runtime.readSourcePromotionWindow118(p.runtimeWindow);liveGuard(c);absent(p.outputDirectory);absent(RETAIN_BASE);for(const o of c.operations)absent(o.before.file+'.runtime118-source-'+p.nonce+'.tmp');
 try{
  c.phase='lock';const body=lockBody(c);closed(body,OP_LOCK_KEYS);const raw=Buffer.from(JSON.stringify(body,null,2)+'\n');fs.writeFileSync(LOCK,raw,{flag:'wx',mode:0o600});const lock=readMeasured(LOCK);assert(lock.raw.equals(raw));c.lock={raw,identity:lock.identity};
  c.phase='output-directory';directory(p.outputDirectory,{exclusive:true});c.outReady=true;
  c.lockCopy=controlWrite(c,p.outputDirectory,'operation-lock.raw',raw);liveGuard(c);
  controlWrite(c,p.outputDirectory,'intent.json',{kind:'Root-runtime118-source-promotion-intent',schemaVersion:1,input,RootApproval:approval,executionReview:peer,operator:p.operator,sourcePlan:p.sourcePlan,runtimeWindow:p.runtimeWindow,canonicalModified:false,ownershipModified:false});
  c.phase='retain-before';retainBefore(c);for(const[index,o]of c.operations.entries())promoteOne(c,o,index);
  c.phase='actual-graphs';c.currentGraphs=actualGraphs(c);
  c.phase='source-witness';const sourceWitness=controlWrite(c,p.outputDirectory,'source-witness13.json',{kind:'Root-runtime121-four-stage-budget-source-witness',schemaVersion:3,baselineCompositionComplete:PREDECESSOR.predecessorPublication,baselineHelperPins:history.beforeGraphs.helper,baselineExternalPins:history.beforeGraphs.external,baselineExecutionSources:history.beforeGraphs.execution,baselineStageManifest:history.p3.tooling.manifest,retainedChangedSources:c.retained9,successorManifest:plan.s.combinedManifest,successorCodeReview:plan.s.graphReview,currentHelperPins:c.currentGraphs.helper,currentExternalPins:c.currentGraphs.external,currentExecutionSources:c.currentGraphs.execution});
  c.phase='prepare-origin';const prepareOrigin121=controlWrite(c,p.outputDirectory,'prepare-origin121.json',birthOrigin(c));liveGuard(c);
  c.phase='post-readback';const window=json(p.runtimeWindow),targets=c.operations.map(o=>({file:o.file,before:clone(o.before),after:clone(c.actualAfters.get(o.file)),backup:clone(c.backups.get(o.file))}));
  const postReadback=controlWrite(c,p.outputDirectory,'post-readback.json',{kind:'Root-runtime118-source-only-post-readback',schemaVersion:1,input,targets,graphs:c.currentGraphs,stateBookends:clone(window.states),ownership:clone(window.ownership),lockIdentity:{dev:c.lock.identity.dev,ino:c.lock.identity.ino,nonce:p.nonce,rawCopy:c.lockCopy},actualEffects:{executionSourceMOD:9,dataFactoryMOD:2,canonicalWrites:0,ownershipWrites:0,PGAPIControl:0,contextAuthSQLHTTP:0},verifiedAt:new Date().toISOString()});
  c.phase='complete';liveGuard(c);const complete=controlWrite(c,p.outputDirectory,'complete.json',{kind:'Root-runtime118-successful-prepare-source-only-complete',schemaVersion:1,sourceG1:GPIN,input,RootApproval:approval,peerReview:peer,combinedManifest:plan.s.combinedManifest,graphReview:plan.s.graphReview,dataQualification:plan.s.dataQualification,steps:c.steps,retained9:c.retained9,retainedData2:c.retainedData2,beforeGraphs:history.beforeGraphs,currentGraphs:c.currentGraphs,sourceWitness,prepareOrigin121,postReadback,semantics:{canonicalModified:false,ownershipModified:false,contextCreated:false,APIStarted:false,SQLHTTP:false}});read(complete);liveGuard(c);
  c.phase='unlock';ownLock(c.lock);fs.unlinkSync(LOCK);c.lock=null;
  console.log(JSON.stringify({complete,sourceWitness,prepareOrigin121,currentGraphs:c.currentGraphs,canonicalModified:false,APIStarted:false}));return complete;
 }catch(error){try{partial(c,error);}catch{try{console.error(JSON.stringify({kind:'Root-runtime118-source-partial-output-unknown',error:safeError(error),phase:c.phase,completedStepCount:c.steps.length,preservePartialAndLocks:true}));}catch{}}throw safeException(error);}
}
async function handoffData(input){
 const p=json(input);closed(p,['kind','schemaVersion','G1','nonce','sourceComplete','recoveryBundle','outputDirectory']);assert.equal(p.kind,'Root-runtime118-reentry-handoff-data-input');assert.equal(p.schemaVersion,1);same(p.G1,GPIN);uuid(p.nonce);assert.equal(p.outputDirectory,P+'/runtime118-source-handoff/'+p.nonce);
 const sc=json(p.sourceComplete);assert.equal(sc.kind,'Root-runtime118-successful-prepare-source-only-complete');same(sc.sourceG1,GPIN);const sourceInput=inputShape(json(sc.input));same(readMeasured(SELF).pin,sourceInput.operator);const{q}=codeQualification(sourceInput);const runtime=await runtimeReaders(q);
 const data=runtime.readSourceRecoveryHandoff118(p.sourceComplete,p.recoveryBundle);closed(data,['predecessorPlan','predecessorRegistry','predecessorCandidate','predecessorPublication','predecessorReadback','retainedCurrentState','retainedOwnership','prepareOrigin121','sourceWitness','recoveryReceipt']);for(const key of Object.keys(PREDECESSOR))same(data[key],PREDECESSOR[key]);for(const value of Object.values(data))read(value);
 same(data.prepareOrigin121,sc.prepareOrigin121);same(data.sourceWitness,sc.sourceWitness);same(data.recoveryReceipt,p.recoveryBundle);absent(p.outputDirectory);directory(p.outputDirectory,{exclusive:true});
 const successor=write(p.outputDirectory,'successor13.json',{kind:'Root-runtime121-successful-prepare-adoption-handoff',schemaVersion:4,...clone(data),allowedPurpose:'budget-probe'});const complete=write(p.outputDirectory,'complete.json',{kind:'Root-runtime118-reentry-handoff-data-prepared',schemaVersion:1,G1:GPIN,input,sourceComplete:p.sourceComplete,recoveryBundle:p.recoveryBundle,successor,sourceWritten:false,canonicalWritten:false,processControlled:false,contextCreated:false});console.log(JSON.stringify({complete,successor,dataOnly:true}));return complete;
}
export async function main118(args=process.argv.slice(2)){
 try{host();if(args[0]==='--prepare-handoff'){assert.equal(args.length,5);same([args[0],args[1],args[3]],['--prepare-handoff','--input','--input-sha']);const input=readMeasured(absolute(args[2])).pin;assert.equal(input.rawBytesSha256,args[4]);return await handoffData(input);}
 assert.equal(args.length,13);same([args[0],args[2],args[4],args[6],args[8],args[10],args[12]],['--input','--input-sha','--peer-review','--peer-review-sha','--Root-review','--Root-review-sha','--execute']);
 const input=readMeasured(absolute(args[1])).pin,peer=readMeasured(absolute(args[5])).pin,approval=readMeasured(absolute(args[9])).pin;assert.equal(input.rawBytesSha256,args[3]);assert.equal(peer.rawBytesSha256,args[7]);assert.equal(approval.rawBytesSha256,args[11]);return await execute(input,approval,peer);}catch(error){throw safeException(error);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main118().catch(error=>{console.error(JSON.stringify({kind:'Root-runtime118-source-entry-stopped',error:safeError(error),blindRetryForbidden:true}));process.exitCode=1;});
