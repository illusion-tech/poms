// Root-only same-byte API startup. No ordinary context, registry or domain command.
// Only built-ins load before the complete current source closure is checked.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { types, TextDecoder } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as pause } from 'node:timers/promises';
import http from 'node:http';

export const API121=Object.freeze({
  root:'/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',
  mirror:'/home/wangzishi/projects/poms-rust-r4ghi',
  private:'/home/wangzishi/.local/share/poms-r4ghi/private',
  node:'/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node',
  nodeSHA:'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12',
  G1B:'be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc',
  appendSHA:'ac9cb66a6501f6e42f26ffe5470f49726dda2b37709e375bd8e043ae13430aad',
  appendFile:'/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/g1B-API-append02/Root-G1B-API-append02.json',
  namespace:'poms-r4ghi',epoch:'g2-business15',run:'main01',port:31441,
});
const A=API121,folder=A.root+'/tools/rust-r4ghi/runtime-recovery121/root',self=folder+'/start-api121.mjs';
const appendFile=A.appendFile;
const names=['hold-runtime121.mjs','start-holder121.ps1','resume-original-pg121.mjs','observe-conservation121.mjs','prepare121.mjs','dispatch121.mjs','facts121.mjs','start-api121.mjs'].sort();
export const inputKeysAPI121=Object.freeze(['kind','schemaVersion','namespace','epoch','run','nonce','G1B','operatorBaseline','codeReview','base','current','composition','expectedStates','executionSources','outputDirectory','processFile','normalEnvFile']);
export const recordKeysAPI121=Object.freeze(['kind','protocolVersion','namespace','epoch','run','root','port','pid','startTime','startedAt','bootId','binary','binarySha256','binaryFiles','baseBuildBinding','sourcePins','compilePins','helperPins','baseAPIProcess','lifetimeOwner','normalEnv','baseNormalEnv','readinessAttempt','input','code']);
export const envKeysAPI121=Object.freeze(['NODE_ENV','HOST','PORT','DB_CONNECT','DB_HOST','DB_PORT','DB_DATABASE','DB_USER','DB_PASSWORD','DB_SCHEMA','JWT_SECRET','CORS_ORIGIN','ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY','IDENTITY_PROVIDER_SECRET_KEY','IDENTITY_PROVIDER_STATE_KEY','POMS_ATTACHMENT_LOCAL_ROOT']);
const sha=b=>createHash('sha256').update(b).digest('hex');
export function exactKeysAPI121(value,keys,label='object') {
  assert(value&&typeof value==='object'&&!Array.isArray(value)&&!types.isProxy(value),label);
  assert([Object.prototype,null].includes(Object.getPrototypeOf(value)),label);
  assert.equal(Object.getOwnPropertySymbols(value).length,0,label);
  const ds=Object.getOwnPropertyDescriptors(value);for(const d of Object.values(ds))assert(Object.hasOwn(d,'value'),label);
  assert.deepEqual(Object.keys(ds).sort(),[...keys].sort(),label);return value;
}
function pinShape(p) {
  assert(p&&typeof p==='object'&&!Array.isArray(p)&&!types.isProxy(p),'pin');
  const ds=Object.getOwnPropertyDescriptors(p);
  exactKeysAPI121(p,Object.hasOwn(ds,'bytes')?['file','bytes','rawBytesSha256']:['file','rawBytesSha256'],'pin');
  assert(typeof p.file==='string'&&p.file.startsWith('/')&&path.posix.resolve(p.file)===p.file);
  assert(/^[a-f0-9]{64}$/.test(p.rawBytesSha256));if(p.bytes!==undefined)assert(Number.isSafeInteger(p.bytes)&&p.bytes>=0);return p;
}
function read(p) {
  pinShape(p);const st=fs.lstatSync(p.file);assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);assert.equal(fs.realpathSync(p.file),p.file);
  const b=fs.readFileSync(p.file);assert.equal(sha(b),p.rawBytesSha256,p.file);if(p.bytes!==undefined)assert.equal(b.length,p.bytes);return b;
}
function pin(file) {const b=fs.readFileSync(file);const p={file,bytes:b.length,rawBytesSha256:sha(b)};read(p);return p;}
const json=p=>JSON.parse(read(p));
function same(a,b) {pinShape(a);pinShape(b);assert.equal(a.file,b.file);assert.equal(a.rawBytesSha256,b.rawBytesSha256);read(a);read(b);}
function fileIdentity(stat) {return Object.fromEntries(['dev','ino','uid','gid','mode','nlink','size','mtimeNs','ctimeNs','birthtimeNs'].map(key=>[key,String(stat[key])]));}
function readBaseEnv(p) {
  const expected=p.current.baseNormalEnv;exactKeysAPI121(expected,['file','bytes','rawBytesSha256'],'Original environment full pin');pinShape(expected);
  assert.equal(expected.file,A.private+'/rust.env');assert(expected.bytes>0,'Empty original startup environment');
  const before=fs.lstatSync(expected.file,{bigint:true});assert(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n&&before.uid===1000n&&(before.mode&0o777n)===0o600n,'Original startup environment file identity');
  const bytes=read(expected),after=fs.lstatSync(expected.file,{bigint:true});assert.deepEqual(fileIdentity(after),fileIdentity(before),'Original startup environment changed while read');return bytes;
}
function binaryFact(p) {
  pinShape(p);const st=fs.lstatSync(p.file,{bigint:true});assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink>=1n);assert.equal(fs.realpathSync(p.file),p.file);
  const b=fs.readFileSync(p.file);assert.equal(sha(b),p.rawBytesSha256,p.file);if(p.bytes!==undefined)assert.equal(b.length,p.bytes);
  return{file:p.file,rawBytesSha256:p.rawBytesSha256,bytes:b.length,dev:String(st.dev),ino:String(st.ino),nlink:Number(st.nlink)};
}
const order=(a,b)=>Buffer.compare(Buffer.from(a.file),Buffer.from(b.file));
function normalizedSources(list) {
  assert(Array.isArray(list));const out=list.map(p=>{pinShape(p);assert(p.file.startsWith(A.root+'/'));read(p);return{file:p.file,rawBytesSha256:p.rawBytesSha256};}).sort(order);
  assert.equal(new Set(out.map(p=>p.file)).size,out.length);return out;
}
export function inputShapeAPI121(p) {
  exactKeysAPI121(p,inputKeysAPI121,'API input');assert.equal(p.kind,'Root-runtime121-B-API-operation-input');assert.equal(p.schemaVersion,1);
  for(const key of ['namespace','epoch','run'])assert.equal(p[key],A[key]);assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(p.nonce));
  for(const key of ['G1B','operatorBaseline','codeReview'])pinShape(p[key]);
  assert.equal(p.G1B.file,A.root+'/tools/rust-r4ghi/runtime-recovery121/g1B/Root-G1B-121.json');assert.equal(p.G1B.rawBytesSha256,A.G1B);
  assert.equal(p.operatorBaseline.file,appendFile);assert.equal(p.operatorBaseline.rawBytesSha256,A.appendSHA);
  exactKeysAPI121(p.current,['sourcePins','compilePins','helperPins','helperCount','binary','summaryBinary','binaryFiles','nodeExecutable','lifetimeOwner','PGStart','PGConservation','baseNormalEnv'],'current pre-API');
  assert.equal(p.current.helperCount,229);for(const key of ['sourcePins','compilePins','helperPins','binary','summaryBinary','nodeExecutable','lifetimeOwner','PGStart','PGConservation'])pinShape(p.current[key]);
  exactKeysAPI121(p.current.baseNormalEnv,['file','bytes','rawBytesSha256'],'Original environment full pin');pinShape(p.current.baseNormalEnv);assert.equal(p.current.baseNormalEnv.file,A.private+'/rust.env');assert(p.current.baseNormalEnv.bytes>0,'Empty original startup environment');
  exactKeysAPI121(p.composition,['helperComposition','externalComposition','independentCodeReviews'],'composition');
  pinShape(p.composition.helperComposition);pinShape(p.composition.externalComposition);assert(Array.isArray(p.composition.independentCodeReviews));
  assert.equal(p.outputDirectory,A.private+'/runtime121-B/api-start/'+p.nonce);
  assert.equal(p.processFile,A.private+'/rust-api121-process.json');assert.equal(p.normalEnvFile,A.private+'/rust-api121.env');
  assert(Array.isArray(p.executionSources)&&p.executionSources.length===284);return p;
}
export function reviewBodyAPI121(p,input) {
  return{kind:'Root-approved-exact-runtime121-B-API',approvedInput:input,G1B:p.G1B,operatorBaseline:p.operatorBaseline,codeReview:p.codeReview,nonce:p.nonce,processControl:true,APIStart:true,readinessOnly:true,businessDML:false,nativeAuthority:false,createReplaceRestoreMigrate:false};
}
export function deriveEnvAPI121(bytes) {
  assert(Buffer.isBuffer(bytes),'Private startup environment bytes required');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const env=new Map();for(const line of text.split(/\r?\n/)){
    if(!line.trim()||line.trim().startsWith('#'))continue;
    const m=/^([A-Z_][A-Z0-9_]*)=([^\r\n]*)$/.exec(line);assert(m,'Invalid private startup environment syntax');
    assert(envKeysAPI121.includes(m[1])&&!env.has(m[1]),'Invalid private startup environment keys');
    assert(!/["'#$`\\\0]/.test(m[2]),'Invalid private startup environment encoding');env.set(m[1],m[2]);
  }
  assert.deepEqual([...env.keys()].sort(),[...envKeysAPI121].sort(),'Private startup environment key set');
  for(const [key,value]of Object.entries({DB_CONNECT:'true',DB_HOST:'127.0.0.1',DB_PORT:'25434',DB_DATABASE:'poms_r4ghi_rust',DB_USER:'poms_r4ghi_rust_app',DB_SCHEMA:'poms',POMS_ATTACHMENT_LOCAL_ROOT:A.private.slice(0,-'/private'.length)+'/objects/rust'}))assert(env.get(key)===value,'Private startup database/storage binding differs');
  env.set('HOST','127.0.0.1');env.set('PORT',String(A.port));env.set('CORS_ORIGIN','http://127.0.0.1:44551,http://localhost:44551');
  return Buffer.from([...env].map(([key,value])=>key+'='+value).join('\n')+'\n');
}
export function readinessAPI121(attempt) {
  assert.equal(attempt.method,'GET');assert.equal(attempt.url,'http://127.0.0.1:31441/api/health/readiness');assert.equal(attempt.status,200,'Readiness HTTP status');
  assert.equal(attempt.complete,true,'Incomplete readiness response');assert.equal(attempt.errorCode,null,'Unknown readiness transport');
  const b=JSON.parse(attempt.body);assert.equal(b.service,'poms-api');assert.equal(b.status,'ready');assert.equal(b.checks?.process?.status,'pass');assert.equal(b.checks?.database?.status,'pass');return true;
}
async function host() {
  assert.equal(process.platform,'linux');assert.equal(process.cwd(),A.root);assert.equal(process.getuid(),1000);assert.equal(process.version,'v24.19.0');
  assert.deepEqual(process.execArgv,[]);assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);assert.equal(process.execPath,A.node);assert.equal(fileURLToPath(import.meta.url),self);
  assert.equal(sha(fs.readFileSync(process.execPath)),A.nodeSHA);
}
function outputsAbsent(p) {for(const file of [p.outputDirectory,p.processFile,p.normalEnvFile])assert(!fs.existsSync(file),'Existing startup output requires reconciliation');}
function rootSources(p) {
  const roots=p.executionSources.filter(q=>path.posix.dirname(q.file)===folder);
  assert.deepEqual(roots.map(q=>path.posix.basename(q.file)).sort(),names);return roots.map(q=>({...q})).sort(order);
}
function verifyPreimport(p) {
  const baseline=json(p.operatorBaseline);assert.equal(baseline.kind,'Root-frozen-runtime121-G1B-API-operator-append');assert.equal(baseline.codeImplementationGranted,true);assert.equal(baseline.actualG2Authorized,false);
  assert.equal(baseline.edition,2);assert.equal(baseline.parentAPIAppend.rawBytesSha256,'96f0090e2965cc96e9557ff297192ecad15f712b74e39934bb00b2396e1a4b3c');read(baseline.parentAPIAppend);assert.deepEqual([...baseline.currentKeys].sort(),Object.keys(p.current).sort());
  same(baseline.parentG1B,p.G1B);assert.deepEqual(baseline.inputKeys,[...inputKeysAPI121]);assert.deepEqual(baseline.APIRecordKeys,[...recordKeysAPI121]);
  for(const q of baseline.protectedA7ExecutionSources)read(q);assert.equal(baseline.protectedA7ExecutionSources.length,7);read(baseline.protectedAuthReader);
  const all=normalizedSources(p.executionSources),helpers=json(p.current.helperPins),external=json(p.composition.externalComposition).finalSources;
  assert.equal(helpers.length,229);assert.equal(external.length,55);
  const descriptors=[...helpers,...external].map(q=>({file:A.root+'/'+q.file,rawBytesSha256:q.sha256}));assert.deepEqual(all,normalizedSources(descriptors));
  const actualNames=fs.readdirSync(A.root+'/tools/rust-r4ghi/business').filter(n=>/\.(mjs|json)$/.test(n)).sort();assert.deepEqual(actualNames,helpers.map(q=>path.posix.basename(q.file)).sort());
  const roots=rootSources(p),review=json(p.codeReview);assert.equal(review.kind,'non-author-runtime121-finite-code-step');assert.equal(review.verdict,'approved-bounded-step-only');assert.equal(review.reviewerIsAuthor,false);same(review.technicalG1,p.operatorBaseline);
  assert.equal(review.entries.length,8);const component=json(review.componentManifest);
  for(const q of roots){const file=q.file.slice(A.root.length+1),entry=review.entries.find(x=>x.file===file);assert(entry);assert.equal(entry.beforeSHA256,null);assert.equal(entry.afterSHA256,q.rawBytesSha256);const node=entry.productPointer.split('/').slice(1).reduce((o,k)=>o[k],component);assert.equal(node.file,file);assert.equal(node.beforeSHA256,null);assert.equal(node.afterSHA256,q.rawBytesSha256);read(node.candidate);}
  return{all,roots,helpers,external};
}
function compositionProof(p,parent,closure,core) {
  const h=json(p.composition.helperComposition),e=json(p.composition.externalComposition);
  assert.equal(h.kind,'Root-Source15-runtime121-H3-composition');same(h.baseHelperPins,p.base.helperPins227);same(h.finalHelperPins,p.current.helperPins);
  core.finiteDelta121(parent.code.helper,closure.helpers,h.frames,core.H3Changes121);
  const dep=e.protectedDependencies;exactKeysAPI121(dep,['kind','sourceManifest','sourcePointer','sources','archive','independentReview','RootAppendFreeze']);assert.equal(dep.kind,'Root-runtime121-fixed-protected261-registration');
  assert.equal(dep.sourceManifest.rawBytesSha256,'1570b7187ec4a714c3c92f57b22147a53242084c1636c326a11d297b05e8db5a');assert.equal(dep.sourcePointer,'/protected261GenericDependencyOnly');
  const fixed=[{file:A.root+'/tools/rust-r4ghi/policy-replayless261-continuation03/cases261.mjs',rawBytesSha256:'a75d9dbed57869ca3299c7edcc2dd3bbdf526cf2a8cd21235e2aa8c0611f9331'},{file:A.root+'/tools/rust-r4ghi/policy-replayless261-continuation03/core261.mjs',rawBytesSha256:'0fe889f86e59c253ca8e397338b535509d5ec0485a8ab09f6c5a7abf5bfef6d3'}];
  assert.deepEqual(normalizedSources(dep.sources),normalizedSources(fixed));assert.deepEqual(normalizedSources(json(dep.sourceManifest).protected261GenericDependencyOnly),normalizedSources(fixed));
  assert.equal(dep.archive.rawBytesSha256,'3b724ea1c258f25a037a4675d243757ca91e9ae7371af8abe72c74356dd2a598');assert.equal(dep.RootAppendFreeze.rawBytesSha256,'4ce7369f93c9ecdc2ab9fb06dccb6eb3c4372535f140130e31ef6e04ae7d3f95');assert.equal(dep.independentReview.rawBytesSha256,'42226f43be965d3985f0140a66c946f7619e1f5f1eac32c80c096a67b1853b2f');
  for(const q of [dep.archive,dep.RootAppendFreeze,dep.independentReview])read(q);
  const map=json(dep.archive);same(map.baseArchive,p.base.sourceArchive121);same(map.H9Supplement,p.base.sourceArchiveSupplement121);same(map.originalCode120Manifest,dep.sourceManifest);assert.equal(map.originalPointer,dep.sourcePointer);assert.equal(map.sourceCount,2);assert.equal(map.combinedUniqueSourceCount,272);assert.equal(map.mappings.length,2);
  assert.deepEqual(normalizedSources(map.mappings.map(x=>x.originalPin)),normalizedSources(fixed));for(const m of map.mappings){assert(m.privateRawCopy.file.startsWith(A.private+'/base-source15-retained121-dependency-supplement01/'));assert.equal(m.originalPin.rawBytesSha256,m.privateRawCopy.rawBytesSha256);read(m.privateRawCopy);}
  const before=[...parent.sourceArchive.index.values()].map(x=>({file:x.originalPin.file.slice(A.root.length+1),sha256:x.originalPin.rawBytesSha256})).filter(q=>!q.file.startsWith('tools/rust-r4ghi/business/'));
  before.push(...fixed.map(q=>({file:q.file.slice(A.root.length+1),sha256:q.rawBytesSha256})));before.sort(order);assert.equal(before.length,45);assert.deepEqual(e.baseSources,before);assert.equal(e.kind,'Root-Source15-runtime121-external-composition');
  core.finiteDelta121(before,closure.external,e.frames,[...core.ExternalChanges121,...core.ExternalAdds121]);
  const technicalG1s=new Set([A.G1B,A.appendSHA,'c20283d9a4e30d96f23d7f3890882e58a6f22e394fa9c747baa4c3a07968a68b','72dc2677f51b2a430b5970a81b40b9301aaf3d97dd9f00f2b8fe6356a90748cb','77083554eb09b8cfb24ddee8bfe4fdc75d2261f01a5a6462a0a309815dcfe714','96f0090e2965cc96e9557ff297192ecad15f712b74e39934bb00b2396e1a4b3c','b4d05c19a867b4f4e1990e36b4a742cd23e00958fb0bae6e7e5725e96cc7b15f']);
  for(const f of [...h.frames,...e.frames]){read(f.candidate);read(f.technicalG1);assert(technicalG1s.has(f.technicalG1.rawBytesSha256),'Unfrozen technical G1');const m=json(f.componentManifest),n=core.pointer121(m,f.productPointer),r=json(f.independentReview);assert.equal(n.file,f.file);assert.equal(n.beforeSHA256,f.beforeSHA256);assert.equal(n.afterSHA256,f.afterSHA256);same(n.candidate,f.candidate);assert.equal(r.kind,'non-author-runtime121-finite-code-step');assert.equal(r.verdict,'approved-bounded-step-only');assert.equal(r.reviewerIsAuthor,false);same(r.componentManifest,f.componentManifest);same(r.technicalG1,f.technicalG1);assert(r.entries.some(x=>x.file===f.file&&x.beforeSHA256===f.beforeSHA256&&x.afterSHA256===f.afterSHA256&&x.productPointer===f.productPointer));}
  for(const q of p.composition.independentCodeReviews)read(q);
}
async function preflight(p) {
  await host();inputShapeAPI121(p);readBaseEnv(p);const closure=verifyPreimport(p);
  // All task modules are loaded only after their actual current bytes are checked.
  const [native,core,old,af,pg,ob,auth]=await Promise.all(['business/runtime-admission121.mjs','business/runtime-admission-core121.mjs','business/retained-source14-for15.mjs','runtime-recovery121/root/facts121.mjs','runtime-recovery121/root/resume-original-pg121.mjs','runtime-recovery121/root/observe-conservation121.mjs','business/auth-config-binding.mjs'].map(q=>import(pathToFileURL(A.root+'/tools/rust-r4ghi/'+q).href)));
  assert.deepEqual(normalizedSources(p.executionSources),closure.all);
  const parent=native.verifyRetainedSource15For121(p.base);assert.equal(parent.retainedParentOnly,true);assert.equal(parent.currentRuntimeGranted,false);compositionProof(p,parent,closure,core);
  const source=json(p.current.sourcePins),compile=json(p.current.compilePins);assert.deepEqual(source,parent.code.source);assert.deepEqual(compile,parent.code.compile);assert.equal(source.length,420);assert.equal(compile.length,528);
  same(p.current.sourcePins,p.base.sourcePins);same(p.current.compilePins,p.base.compilePins);
  for(const root of [A.root,A.mirror]){for(const q of compile)old.leaf15(root,q.file,q.sha256);assert.deepEqual(old.cargoFiles15(root),compile.filter(q=>q.file.startsWith('apps/poms-api-rust/')||q.file.startsWith('.cargo/')).map(q=>q.file).sort());}
  for(const q of source)old.leaf15(A.root,q.file,q.sha256);assert.deepEqual(old.helpers15(A.root),closure.helpers);
  exactKeysAPI121(p.expectedStates,Object.keys(af.stateFiles));for(const key of Object.keys(af.stateFiles)){const expected=read(p.expectedStates[key]);assert.equal(p.expectedStates[key].rawBytesSha256,af.stateSHAs[key]);assert(expected.equals(fs.readFileSync(af.stateFiles[key])),'Runtime state bookend changed');}
  for(const e of [13,14,15])assert(!fs.existsSync(A.private+'/business/g2-business'+e+'/main01/driver.lock'));
  const owner=json(p.current.lifetimeOwner);exactKeysAPI121(owner,['kind','holderReady','windowsLaunch','launchCommand']);assert.equal(owner.kind,'actual-runtime121-lifetime-owner');
  const holder=af.holderFacts({holder:owner.holderReady}),windows=json(owner.windowsLaunch),command=json(owner.launchCommand),hi=json(holder.input);
  assert.equal(owner.windowsLaunch.file,hi.outputDirectory+'/windows-launch.json');assert.equal(owner.launchCommand.file,hi.outputDirectory+'/command-receipt.json');assert.equal(windows.kind,'actual-runtime121-A-Windows-holder-launch');assert.equal(windows.nonce,holder.nonce);assert.equal(windows.inputFile,holder.input.file);assert.equal(windows.inputSha,holder.input.rawBytesSha256);assert.equal(windows.reviewFile,holder.review.file);assert.equal(windows.reviewSha,holder.review.rawBytesSha256);assert.deepEqual(windows.argv,['-d','Debian','--cd',A.root,'--exec',holder.node.file,holder.source.file,...holder.argv.slice(2)]);
  assert.equal(command.kind,'actual-runtime121-A-command');assert.equal(command.mode,'holder-start');assert.equal(command.exitCode,0);assert.equal(command.signal,null);assert.equal(command.processError,null);const dispatch=json(command.dispatch);same(dispatch.input,holder.input);same(dispatch.RootReview,holder.review);read(command.stdout);read(command.stderr);
  const pgStart=json(p.current.PGStart),proof=json(p.current.PGConservation);assert.equal(pgStart.kind,'actual-runtime121-A-original-PG-resumed');assert.equal(proof.kind,'actual-runtime121-A-original-data-conserved');same(proof.originalPGStart,p.current.PGStart);same(proof.holder,owner.holderReady);same(pgStart.holder,owner.holderReady);same(proof.baseline,p.base.preparedBaseline);assert.equal(proof.defaultReadOnly,true);assert.equal(proof.transactionReadOnly,true);
  for(const k of ['newAPIStarted','nativeAuthorityGranted','businessDML','baselineReset','backupRestore'])assert.equal(proof[k],false);
  for(const k of ['containerCreated','volumeCreated','migrationOrBackupRestore','businessDML','APIStarted'])assert.equal(pgStart[k],false);
  assert.equal(proof.observations.length,2);assert.notEqual(proof.observations[0].file,proof.observations[1].file);const baseline=json(proof.baseline),observed=proof.observations.map(json);ob.equalSnapshots121(baseline,observed[0]);ob.equalSnapshots121(baseline,observed[1]);ob.equalSnapshots121(observed[0],observed[1]);
  assert.deepEqual(pg.inspectOriginalPG121(),pgStart.after);assert.equal(pgStart.after.running,true);assert.equal(pgStart.bootId,holder.bootId);
  // Historical build containers include old stat fields. Compare their admitted
  // byte identity; fresh inode/link facts are measured separately below.
  for(const key of ['binary','summaryBinary'])assert.deepEqual({file:p.current[key].file,rawBytesSha256:p.current[key].rawBytesSha256},core.pinOnly121(parent.code.plan.consumer[key]),'Current binary differs from the admitted original byte identity');
  const facts=[binaryFact(p.current.binary),binaryFact(p.current.summaryBinary)];assert.deepEqual(facts,p.current.binaryFiles);assert.equal(p.current.nodeExecutable.file,A.node);assert.equal(p.current.nodeExecutable.rawBytesSha256,A.nodeSHA);binaryFact(p.current.nodeExecutable);
  return{closure,parent,af,pg,auth,holder,pgStart,binaryFiles:facts};
}

function writeWx(dir,name,value) {
  assert.equal(path.posix.basename(name),name);const file=dir+'/'+name,b=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value,null,2)+'\n');
  fs.writeFileSync(file,b,{flag:'wx',mode:0o600});const p=pin(file);assert.equal(p.rawBytesSha256,sha(b));return p;
}
function requestDirectory(p) {return A.private+'/runtime121-B-inputs/api-start/'+p.nonce;}
function inputPin(file,hash) {const p=pin(file);assert.equal(p.rawBytesSha256,hash);assert(p.file.startsWith(A.private+'/'));return p;}
function loadInput(file,hash) {const input=inputPin(file,hash),p=inputShapeAPI121(json(input));assert.equal(input.file,requestDirectory(p)+'/input.json');return{input,p};}
function expectedReview(p,input) {const b=Buffer.from(JSON.stringify(reviewBodyAPI121(p,input),null,2)+'\n');return{file:requestDirectory(p)+'/Root-review.json',bytes:b.length,rawBytesSha256:sha(b)};}
function safeError(error) {return{name:/^[A-Za-z0-9_]+$/.test(error?.name??'')?error.name:'Error',code:/^[A-Z0-9_]+$/.test(error?.code??'')?error.code:null,message:'Bounded API startup stopped; preserve original inputs, logs and process identity; no automatic retry'};}
async function prepareRequest(args) {
  assert.deepEqual([args[0],args[1],args[3]],['--prepare-request','--input','--input-sha']);assert.equal(args.length,5);
  const {input,p}=loadInput(args[2],args[4]);await preflight(p);outputsAbsent(p);
  const review=expectedReview(p,input);assert(!fs.existsSync(review.file));
  const request=writeWx(requestDirectory(p),'request-exact-G2.json',{kind:'Root-runtime121-B-API-exact-G2-request',recordedAt:new Date().toISOString(),input,expectedRootReview:review,expectedRootReviewBody:reviewBodyAPI121(p,input),actualG2:false,RootReviewSigned:false,effectsExecuted:false});
  console.log(JSON.stringify({request,input,expectedRootReview:review,effectsExecuted:false}));
}
async function dispatch(args) {
  assert.equal(args.length,9);assert.deepEqual([args[0],args[2],args[4],args[6],args[8]],['--request','--request-sha','--independent-review','--independent-review-sha','--execute']);
  const request=inputPin(args[1],args[3]),q=json(request);exactKeysAPI121(q,['kind','recordedAt','input','expectedRootReview','expectedRootReviewBody','actualG2','RootReviewSigned','effectsExecuted']);
  assert.equal(q.kind,'Root-runtime121-B-API-exact-G2-request');for(const key of ['actualG2','RootReviewSigned','effectsExecuted'])assert.equal(q[key],false);
  const {input,p}=loadInput(q.input.file,q.input.rawBytesSha256);assert.deepEqual(input,q.input);assert.equal(request.file,requestDirectory(p)+'/request-exact-G2.json');
  const independent=inputPin(args[5],args[7]),g=json(independent);assert.equal(g.kind,'non-author-runtime121-B-API-exact-G2');assert.equal(g.verdict,'approved-one-same-byte-API-start-readiness-only');assert.equal(g.reviewerIsAuthor,false);assert.deepEqual(g.approvedInput,input);assert.deepEqual(g.expectedRootReview,expectedReview(p,input));
  assert.deepEqual(q.expectedRootReview,g.expectedRootReview);assert.deepEqual(q.expectedRootReviewBody,reviewBodyAPI121(p,input));
  const facts=await preflight(p);outputsAbsent(p);assert(!fs.existsSync(q.expectedRootReview.file));
  facts.af.directory121(p.outputDirectory,{exclusive:true});const review=writeWx(requestDirectory(p),'Root-review.json',q.expectedRootReviewBody);assert.deepEqual(review,q.expectedRootReview);
  const stdout=p.outputDirectory+'/stdout-original.log',stderr=p.outputDirectory+'/stderr-original.log';
  const out=fs.openSync(stdout,'wx',0o600),err=fs.openSync(stderr,'wx',0o600),began=new Date().toISOString();
  const argv=[self,'--input',input.file,'--input-sha',input.rawBytesSha256,'--review',review.file,'--review-sha',review.rawBytesSha256,'--execute'];
  const dispatched=writeWx(p.outputDirectory,'dispatch.json',{kind:'actual-runtime121-B-API-single-dispatch',began,input,RootReview:review,independentReview:independent,request,executable:A.node,argv,entry:p.executionSources.find(q=>q.file===self),APIStart:true,readinessOnly:true,businessDML:false,nativeAuthority:false});
  const started=performance.now();let result;try{result=spawnSync(A.node,argv,{cwd:A.root,env:{...process.env},stdio:['ignore',out,err]});}finally{fs.closeSync(out);fs.closeSync(err);}
  const command=writeWx(p.outputDirectory,'command-receipt.json',{kind:'actual-runtime121-B-API-command',dispatch:dispatched,began,ended:new Date().toISOString(),elapsedSeconds:(performance.now()-started)/1000,exitCode:result.status,signal:result.signal,processError:result.error?safeError(result.error):null,stdout:pin(stdout),stderr:pin(stderr),blindRetryForbidden:true});
  console.log(JSON.stringify({command,exitCode:result.status,nativeAuthorityGranted:false,businessDML:false}));if(result.status!==0)process.exitCode=1;
}
export async function waitAfterEnvAPI121(stat) {
  const ns=[stat.mtimeNs,stat.ctimeNs,stat.birthtimeNs].filter(x=>typeof x==='bigint'&&x>0n);assert(ns.length>=2,'Missing actual startup file times');
  const latest=ns.reduce((a,b)=>a>b?a:b),required=Number((latest+999999n)/1000000n);assert(Number.isSafeInteger(required));
  assert(required-Date.now()<=1000,'Unexplained future startup file time');const deadline=performance.now()+1000;
  while(Date.now()<required){assert(performance.now()<deadline,'Real time did not reach startup file identity');await pause(1);}
  return new Date().toISOString();
}
function listeners() {
  const found=[];for(const [version,file]of [[4,'/proc/net/tcp'],[6,'/proc/net/tcp6']])for(const line of fs.readFileSync(file,'utf8').trim().split('\n').slice(1)){
    const f=line.trim().split(/\s+/);if(f.length>=10&&f[3]==='0A'&&parseInt(f[1].split(':')[1],16)===A.port)found.push({version,host:f[1].split(':')[0],inode:f[9]});
  }return found;
}
function processIdentity(p,facts,pid,startTime=null,withSocket=false) {
  const bootId=fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim();assert.equal(bootId,facts.holder.bootId);
  const actual=facts.af.procStat(fs.readFileSync('/proc/'+pid+'/stat','utf8'));assert.equal(actual.pid,pid);if(startTime!==null)assert.equal(actual.startTime,startTime);
  assert.equal(fs.realpathSync('/proc/'+pid+'/exe'),p.current.binary.file);assert.equal(fs.realpathSync('/proc/'+pid+'/cwd'),A.mirror);assert.equal(fs.statSync('/proc/'+pid).uid,1000);
  const argv=fs.readFileSync('/proc/'+pid+'/cmdline').toString().split('\0').filter(Boolean);assert.deepEqual(argv,[p.current.binary.file]);
  const env=Object.fromEntries(fs.readFileSync('/proc/'+pid+'/environ').toString().split('\0').filter(Boolean).map(s=>{const at=s.indexOf('=');return[s.slice(0,at),s.slice(at+1)];}));
  const wanted={PATH:'/home/wangzishi/.cargo/bin:/usr/bin:/bin',HOME:'/home/wangzishi',USER:'wangzishi',LANG:'C.UTF-8',POMS_ENV_FILE:p.normalEnvFile};
  assert(Object.keys(env).length===5&&Object.entries(wanted).every(([k,v])=>env[k]===v),'Actual API environment differs; values private');
  const st=fs.statSync('/proc/'+pid+'/exe',{bigint:true}),f=facts.binaryFiles.find(x=>x.file===p.current.binary.file);assert.equal(String(st.dev),f.dev);assert.equal(String(st.ino),f.ino);
  let socket=null;if(withSocket){const l=listeners();assert.equal(l.length,1);assert.equal(l[0].version,4);assert.equal(l[0].host,'0100007F');const targets=[];for(const fd of fs.readdirSync('/proc/'+pid+'/fd'))try{targets.push(fs.readlinkSync('/proc/'+pid+'/fd/'+fd));}catch(error){if(error.code!=='ENOENT')throw error;}assert(targets.includes('socket:['+l[0].inode+']'));socket=l[0];}
  return{pid,startTime:actual.startTime,bootId,argv,uid:1000,cwd:A.mirror,executable:p.current.binary.file,environmentSHA256:sha(fs.readFileSync('/proc/'+pid+'/environ')),socket};
}
function healthAttempt() {
  const url='http://127.0.0.1:31441/api/health/readiness',began=new Date().toISOString();
  return new Promise(resolve=>{const chunks=[];let bytes=0,settled=false;const done=value=>{if(settled)return;settled=true;resolve({method:'GET',url,began,ended:new Date().toISOString(),...value});};
    const request=http.request(url,{method:'GET',headers:{'Accept-Encoding':'identity'},timeout:3000},response=>{
      response.on('data',b=>{bytes+=b.length;if(bytes>1024*1024)request.destroy(Error('Readiness response exceeds bound'));else chunks.push(Buffer.from(b));});
      response.once('aborted',()=>done({status:response.statusCode,body:Buffer.concat(chunks).toString(),complete:false,errorCode:'RESPONSE_ABORTED'}));
      response.once('error',()=>done({status:response.statusCode,body:Buffer.concat(chunks).toString(),complete:false,errorCode:'RESPONSE_ERROR'}));
      response.once('end',()=>done({status:response.statusCode,body:Buffer.concat(chunks).toString(),complete:response.complete,errorCode:null,rawHeaders:response.rawHeaders}));
    });request.once('error',error=>done({status:null,body:'',complete:false,errorCode:error.code==='ECONNREFUSED'?'ECONNREFUSED':'READINESS_TRANSPORT_UNKNOWN'}));request.once('timeout',()=>request.destroy(Error('Readiness timeout')));request.end();
  });
}
async function start(args) {
  assert.equal(args.length,9);assert.deepEqual([args[0],args[2],args[4],args[6],args[8]],['--input','--input-sha','--review','--review-sha','--execute']);
  const {input,p}=loadInput(args[1],args[3]),review=inputPin(args[5],args[7]);assert.deepEqual(review,expectedReview(p,input));assert.deepEqual(json(review),reviewBodyAPI121(p,input));
  assert(fs.existsSync(p.outputDirectory));const dispatch=json(pin(p.outputDirectory+'/dispatch.json'));same(dispatch.input,input);same(dispatch.RootReview,review);assert.equal(dispatch.kind,'actual-runtime121-B-API-single-dispatch');
  assert(!fs.existsSync(p.outputDirectory+'/intent.json'));assert(!fs.existsSync(p.processFile));assert(!fs.existsSync(p.normalEnvFile));
  let phase='preflight',pid=null,startTime=null,intent=null,spawnAttempted=false;
  try {
    const facts=await preflight(p);assert.equal(listeners().length,0,'Existing API listener; preserve it');
    intent=writeWx(p.outputDirectory,'intent.json',{kind:'actual-runtime121-B-API-start-intent',input,RootReview:review,operator:p.executionSources.find(q=>q.file===self),Root8:facts.closure.roots,processFile:p.processFile,normalEnvFile:p.normalEnvFile,spawnOnce:true,ordinaryContextCreated:false,nativeAuthorityGranted:false,businessDML:false});
    phase='environment';const baseNormalEnv=p.current.baseNormalEnv,normalEnv=writeWx(A.private,path.posix.basename(p.normalEnvFile),deriveEnvAPI121(readBaseEnv(p)));
    const beforeStat=fs.lstatSync(p.normalEnvFile,{bigint:true});assert(beforeStat.isFile()&&beforeStat.nlink===1n&&beforeStat.uid===1000n&&(beforeStat.mode&0o777n)===0o600n);
    const out=fs.openSync(p.outputDirectory+'/API-stdout-live.log','wx',0o600),err=fs.openSync(p.outputDirectory+'/API-stderr-live.log','wx',0o600);
    let child,startedAt;phase='spawn';try{
      assert.deepEqual(fileIdentity(fs.lstatSync(p.normalEnvFile,{bigint:true})),fileIdentity(beforeStat));read(normalEnv);facts.af.holderFacts({holder:json(p.current.lifetimeOwner).holderReady});assert.deepEqual(facts.pg.inspectOriginalPG121(),facts.pgStart.after);normalizedSources(p.executionSources);
      await waitAfterEnvAPI121(beforeStat);readBaseEnv(p);read(normalEnv);const launchStat=fs.lstatSync(p.normalEnvFile,{bigint:true});assert.deepEqual(fileIdentity(launchStat),fileIdentity(beforeStat));startedAt=new Date().toISOString();facts.auth.assertStartupFileIdentity(launchStat,{startedAt,processUid:1000});
      spawnAttempted=true;child=spawn(p.current.binary.file,[],{cwd:A.mirror,env:{PATH:'/home/wangzishi/.cargo/bin:/usr/bin:/bin',HOME:'/home/wangzishi',USER:'wangzishi',LANG:'C.UTF-8',POMS_ENV_FILE:p.normalEnvFile},detached:true,stdio:['ignore',out,err]});
      await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});pid=child.pid;assert(Number.isSafeInteger(pid)&&pid>1);child.unref();
    }finally{fs.closeSync(out);fs.closeSync(err);}
    let identity=processIdentity(p,facts,pid);startTime=identity.startTime;
    writeWx(p.outputDirectory,'spawn.json',{kind:'actual-runtime121-B-API-spawn',input,RootReview:review,startedAt,...identity,normalEnv,baseNormalEnv,source420:p.current.sourcePins,compile528:p.current.compilePins,helper229:p.current.helperPins,binaryFiles:facts.binaryFiles,liveLogsMutable:true});
    phase='readiness';let readinessAttempt=null;const attempts=[];
    for(let at=0;at<30;at++){
      facts.af.holderFacts({holder:json(p.current.lifetimeOwner).holderReady});normalizedSources(p.executionSources);processIdentity(p,facts,pid,startTime);
      const attempt=await healthAttempt(),raw=writeWx(p.outputDirectory,'readiness-attempt-'+String(at+1).padStart(2,'0')+'.json',attempt);attempts.push(raw);
      if(attempt.errorCode==='ECONNREFUSED'){assert(at<29,'Readiness never accepted a connection');await pause(500);continue;}
      assert.equal(attempt.errorCode,null,'Unknown readiness outcome');assert.equal(attempt.complete,true,'Incomplete readiness response');readinessAPI121(attempt);readinessAttempt=raw;break;
    }
    assert(readinessAttempt);phase='completion';const after=await preflight(p);identity=processIdentity(p,after,pid,startTime,true);read(normalEnv);facts.auth.assertStartupFileIdentity(fs.lstatSync(p.normalEnvFile,{bigint:true}),{startedAt,processUid:1000});
    const record={kind:'actual-source15-owned-API-process121',protocolVersion:1,namespace:A.namespace,epoch:A.epoch,run:A.run,root:A.mirror,port:A.port,pid,startTime,startedAt,bootId:identity.bootId,binary:p.current.binary.file,binarySha256:p.current.binary.rawBytesSha256,binaryFiles:facts.binaryFiles,baseBuildBinding:p.base.buildBinding,sourcePins:p.current.sourcePins,compilePins:p.current.compilePins,helperPins:p.current.helperPins,baseAPIProcess:facts.parent.code.plan.consumer.apiProcess,lifetimeOwner:p.current.lifetimeOwner,normalEnv,baseNormalEnv,readinessAttempt,input,code:facts.closure.roots};
    exactKeysAPI121(record,recordKeysAPI121);const apiProcess=writeWx(A.private,path.posix.basename(p.processFile),record);assert.deepEqual(json(apiProcess),record);
    const readiness=writeWx(p.outputDirectory,'readiness.json',{mode:'start',port:A.port,readiness:200,privateCredentialsPrinted:false,pid,binarySha256:record.binarySha256});
    const processEvidence=writeWx(p.outputDirectory,'actual-process.json',identity);
    const startupLogs=['stdout','stderr'].map(kind=>writeWx(p.outputDirectory,'API-'+kind+'-startup-asof.bin',fs.readFileSync(p.outputDirectory+'/API-'+kind+'-live.log')));
    const complete=writeWx(p.outputDirectory,'complete.json',{kind:'actual-runtime121-B-API-start-readiness-complete',input,RootReview:review,intent,apiProcess,readiness,processEvidence,attempts,startupLogs,liveLogsMutable:true,APIStarted:true,ordinaryContextCreated:false,nativeAuthorityGranted:false,businessDML:false,registryOrCandidateCreated:false,statePublished:false});
    console.log(JSON.stringify({complete,apiProcess,readiness,APIStarted:true,nativeAuthorityGranted:false,businessDML:false}));
  }catch(error){
    writeWx(p.outputDirectory,'partial.json',{kind:'runtime121-B-API-preserve',input,RootReview:review,intent,phase,spawnAttempted,pid,startTime,processMayBeRunning:spawnAttempted,error:safeError(error),automaticStop:false,blindRetryForbidden:true});throw error;
  }
}
export async function mainAPI121(args=process.argv.slice(2)) {
  await host();if(args[0]==='--prepare-request')return prepareRequest(args);
  if(args[0]==='--request')return dispatch(args);if(args[0]==='--input')return start(args);throw Error('No implicit API startup mode');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)mainAPI121().catch(error=>{console.error(JSON.stringify({kind:'runtime121-B-API-stopped',error:safeError(error),preserveOriginals:true,blindRetryForbidden:true}));process.exitCode=1;});
