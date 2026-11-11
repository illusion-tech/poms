import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import * as pure from './isolated-code/promote-native05-once.mjs';
const own=path.dirname(fileURLToPath(import.meta.url));
const spec=JSON.parse(fs.readFileSync(own+'/audit-spec.json','utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const recorded=new Map();
function bytes(p){
 pure.pinShape05(p);const s=fs.lstatSync(p.file,{bigint:true});assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1n);
 assert.equal(fs.realpathSync(p.file),p.file);const b=fs.readFileSync(p.file);const a=fs.lstatSync(p.file,{bigint:true});
 for(const k of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(a[k],s[k]);
 assert.equal(b.length,p.bytes);assert.equal(sha(b),p.rawBytesSha256);recorded.set(p.file,p);return b;
}
const json=p=>JSON.parse(bytes(p));
const measure=f=>{const b=fs.readFileSync(f);return{file:f,bytes:b.length,rawBytesSha256:sha(b)}};
const present=f=>{try{fs.lstatSync(f);return true}catch(e){if(e.code==='ENOENT')return false;throw e}};
const no=f=>assert.equal(present(f),false,'Required path absent');
const req=json(spec.request), input=json(req.input), seal=json(spec.seal), source=bytes(req.operator).toString('utf8');
assert.equal(sha(bytes(spec.seal)),'d9c164104527f6e6dca10a528b1c2d847d72ebc449a0be9f2e5aa341c1f7c4d4');
for(const p of seal.files)bytes(p);
assert.equal(sha(fs.readFileSync(own+'/isolated-code/promote-native05-once.mjs')),req.operator.rawBytesSha256);
pure.inputShape05(input);assert.deepEqual(input.operator,req.operator);assert.deepEqual(input.NativeCodeReview,spec.expectedNativeCodeReview);
assert.deepEqual(input.Root8CodeReview,spec.expectedRoot8CodeReview);assert.deepEqual(req.limits,pure.limits05);
const rootBody=pure.rootApprovalBody05(input,req.input);assert.deepEqual(rootBody,req.expectedRootApprovalBody);
const rootImage=Buffer.from(JSON.stringify(rootBody,null,2)+'\n');assert.equal(rootImage.length,req.expectedRootApproval.bytes);assert.equal(sha(rootImage),req.expectedRootApproval.rawBytesSha256);
assert.equal(Object.keys(input).length,11);assert.equal(Object.keys(rootBody).length,12);
const p=json(input.plan);for(const q of Object.values(p.inputs))bytes(q);for(const q of Object.values(p.expectedOnly))bytes(q);
assert.equal(p.copyOperations.length,1);assert.equal(p.alreadyChangedRootVerifyOnly.length,1);assert.equal(p.protectedCurrentFiles282.length,282);
const op=p.copyOperations[0];assert.equal(op.file,pure.F05.target);assert.equal(op.target,pure.F05.R+'/'+pure.F05.target);assert.equal(op.operationForPhysicalPromotion,'MOD');
assert.equal(op.beforeSHA256,pure.F05.before);assert.equal(op.afterSHA256,pure.F05.after);assert.equal(op.originalRegistrationOperation,'ADD');assert.equal(op.originalRegistrationBeforeSHA256,null);
assert.equal(op.productPointer,'/production/1');assert.deepEqual(op.componentManifest,pure.fixedPins05.I05);
const im=json(op.componentManifest), nr=json(input.NativeCodeReview);assert.equal(im.production.length,9);assert.deepEqual(im.production[1].candidate,op.candidate);
assert.equal(nr.kind,'non-author-runtime121-finite-code-step');assert.equal(nr.verdict,'approved-bounded-step-only');assert.equal(nr.reviewerIsAuthor,false);assert.notEqual(nr.author,nr.reviewer);assert.deepEqual(nr.componentManifest,op.componentManifest);assert.equal(nr.entries.length,9);
for(const [n,q] of im.production.entries()){const e=nr.entries.find(e=>e.file===q.file);assert(e);assert.equal(e.beforeSHA256,q.beforeSHA256);assert.equal(e.afterSHA256,q.afterSHA256);assert.equal(e.productPointer,'/production/'+n);bytes(q.candidate);}
const rr=json(input.Root8CodeReview), rm=json(p.inputs.newRoot8);assert.equal(rr.kind,'non-author-runtime121-finite-code-step');assert.equal(rr.verdict,'approved-bounded-step-only');assert.equal(rr.reviewerIsAuthor,false);assert.notEqual(rr.author,rr.reviewer);assert.deepEqual(rr.componentManifest,p.inputs.newRoot8);assert.equal(rr.entries.length,8);
for(const [n,q] of rm.production.entries()){const e=rr.entries.find(e=>e.file===q.file);assert(e);assert.equal(e.afterSHA256,q.afterSHA256);assert.equal(e.productPointer,'/production/'+n);bytes(q.candidate);}
const starter=p.alreadyChangedRootVerifyOnly[0];assert.equal(starter.file,pure.F05.starter);assert.equal(starter.expectedSHA256,pure.F05.starterSHA);bytes(starter.candidate);bytes(starter.observedCurrent);
const before=json(input.basePromotion), prior=json(input.baseReadback);assert.deepEqual(prior.actualComplete,input.basePromotion);assert.deepEqual(before.helperPins,p.inputs.actualPriorHelper229);assert.deepEqual(before.externalPins,p.inputs.actualPriorExternal55);
const oldH=json(before.helperPins), oldE=json(before.externalPins),oldX=json(before.executionSources);
const beforeH=oldH, beforeE=oldE.map(x=>x.file===pure.F05.starter?{file:x.file,sha256:pure.F05.starterSHA}:x);
const afterH=oldH.map(x=>x.file===pure.F05.target?{file:x.file,sha256:pure.F05.after}:x),afterE=beforeE;
assert.equal(oldH.length,229);assert.equal(oldE.length,55);assert.equal(oldX.length,284);assert.equal(oldH.find(x=>x.file===pure.F05.target).sha256,pure.F05.before);
assert.deepEqual(json(p.expectedOnly.helper229),afterH);assert.deepEqual(json(p.expectedOnly.external55),afterE);
const cmp=(a,b)=>Buffer.compare(Buffer.from(a.file),Buffer.from(b.file));
const afterX=[...afterH,...afterE].map(x=>({file:pure.F05.R+'/'+x.file,rawBytesSha256:x.sha256})).sort(cmp);assert.deepEqual(json(p.expectedOnly.executionSources284),afterX);
const protectedExpected=[...beforeH,...beforeE].filter(x=>![pure.F05.target,pure.F05.starter].includes(x.file)).sort(cmp);
assert.deepEqual(p.protectedCurrentFiles282.map(x=>({file:x.file,sha256:x.expectedUnchanged.rawBytesSha256})).sort(cmp),protectedExpected);
const bookends=json(input.statusBookends).unchangedBookends;assert.deepEqual(Object.keys(bookends).sort(),['ownership15','state13','state14','state15']);for(const q of Object.values(bookends))bytes(q);
for(const q of p.protectedCurrentFiles282)bytes(q.expectedUnchanged);bytes(op.observedCurrent);bytes(op.candidate);
const rootGraph=[];for(const q of [...beforeH,...beforeE].sort(cmp)){const f=pure.F05.R+'/'+q.file;const m=measure(f);assert.equal(m.rawBytesSha256,q.sha256);bytes(m);rootGraph.push(m);}
assert.equal(rootGraph.length,284);assert.equal(new Set(rootGraph.map(x=>x.file)).size,284);
const actualNames=fs.readdirSync(pure.F05.R+'/tools/rust-r4ghi/business',{withFileTypes:true}).filter(x=>/\.(mjs|json)$/.test(x.name)).map(x=>'tools/rust-r4ghi/business/'+x.name).sort();assert.deepEqual(actualNames,beforeH.map(x=>x.file).sort());
pure.executionEnvironmentShape05({platform:process.platform,nodeVersion:process.version,execPath:process.execPath,uid:process.getuid(),cwd:process.cwd(),execArgv:process.execArgv,NODE_OPTIONS:process.env.NODE_OPTIONS,NODE_PATH:process.env.NODE_PATH});bytes(pure.fixedPins05.node);
const absences=[req.expectedRootApproval.file,input.outputDirectory,pure.F05.P+'/runtime121-native05-source-promotion.lock',pure.F05.P+'/rust-api121-process.json',pure.F05.P+'/rust-api121.env',...([13,14,15].map(e=>pure.F05.P+'/business/g2-business'+e+'/main01/driver.lock')),pure.F05.R+'/tools/rust-r4ghi/business/.runtime-admission121.'+input.nonce+'.tmp'];for(const f of absences)no(f);
let listenerCount=0;for(const f of ['/proc/net/tcp','/proc/net/tcp6']){for(const line of fs.readFileSync(f,'utf8').trim().split('\n').slice(1)){const a=line.trim().split(/\s+/);if(a[3]==='0A'&&Number.parseInt(a[1].split(':').at(-1),16)===31441)listenerCount++;}}assert.equal(listenerCount,0);
// Project exact reviewed private filesystem functions into an entirely synthetic tree.
function cut(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);assert(start>=0&&end>start);return source.slice(start,end);}
const fragments={strict:cut('function strictBytes(file)','function read(p)'),absent:cut('function absent(file)','function entryPresent05(file)'),entry:cut('function entryPresent05(file)','export function errorSummary05(e)'),graph:cut('function graph05(helper, external)','function wxJSON(file, value)')};
const exactKeys=(v,k)=>{assert(v&&Object.getPrototypeOf(v)===Object.prototype);assert.deepEqual(Object.keys(v).sort(),[...k].sort())};
const pin=(file,bytes,rawBytesSha256)=>({file,bytes,rawBytesSha256});
const fixtureRoot='/tmp/poms-final-gates13-single-native05-'+input.nonce;assert(!present(fixtureRoot));fs.mkdirSync(fixtureRoot,{mode:0o700});
const fixtureR=fixtureRoot+'/tree';fs.mkdirSync(fixtureR+'/tools/rust-r4ghi/business',{recursive:true});fs.mkdirSync(fixtureR+'/external',{recursive:true});
const fakeF={...pure.F05,R:fixtureR};
const pr=vm.compileFunction(fragments.strict+fragments.absent+fragments.entry+'const measuredPin = (file, b = strictBytes(file)) => pin(file, b.length, SHA(b));\n'+fragments.graph+'return {strictBytes,absent,entryPresent05,graph05};',['fs','path','assert','pinShape05','pin','SHA','F05','exactKeys','compare'])(fs,path,assert,pure.pinShape05,pin,sha,fakeF,exactKeys,cmp);
const H=[],E=[];for(let i=0;i<284;i++){const f=i<229?'tools/rust-r4ghi/business/f'+String(i).padStart(3,'0')+'.mjs':'external/f'+i+'.mjs';const b=Buffer.from('// synthetic own fixture '+i+'\n');fs.writeFileSync(fixtureR+'/'+f,b,{mode:0o600});(i<229?H:E).push({file:f,sha256:sha(b)});}
const cases=[];const pass=(name,fn)=>{fn();cases.push({name,passed:true})};
pass('complete synthetic284 graph succeeds',()=>assert.equal(pr.graph05(H,E).length,284));
pass('unknown .mjs file cannot be hidden by isFile filtering',()=>{const f=fixtureR+'/tools/rust-r4ghi/business/unknown.mjs';fs.writeFileSync(f,'unknown');assert.throws(()=>pr.graph05(H,E));fs.unlinkSync(f)});
pass('unknown dangling .mjs link remains a directory member',()=>{const f=fixtureR+'/tools/rust-r4ghi/business/unknown.mjs';fs.symlinkSync(fixtureRoot+'/absent',f);assert.throws(()=>pr.graph05(H,E));fs.unlinkSync(f)});
pass('known symlink is rejected',()=>{const f=fixtureR+'/'+H[0].file,b=fs.readFileSync(f);fs.unlinkSync(f);fs.symlinkSync(fixtureR+'/'+H[1].file,f);assert.throws(()=>pr.graph05(H,E));fs.unlinkSync(f);fs.writeFileSync(f,b)});
pass('known hardlink rejects nlink2 without changing content',()=>{const f=fixtureR+'/'+H[0].file,l=fixtureRoot+'/hardlink';fs.linkSync(f,l);assert.throws(()=>pr.graph05(H,E));fs.unlinkSync(l)});
pass('wrong SHA rejected',()=>{const a=H.map(x=>({...x}));a[0].sha256='0'.repeat(64);assert.throws(()=>pr.graph05(a,E))});
pass('missing known member rejected',()=>{const f=fixtureR+'/'+H[0].file,b=fs.readFileSync(f);fs.unlinkSync(f);assert.throws(()=>pr.graph05(H,E));fs.writeFileSync(f,b)});
pass('dangling lock is present and not absent',()=>{const f=fixtureRoot+'/driver.lock';fs.symlinkSync(fixtureRoot+'/missing',f);assert.equal(pr.entryPresent05(f),true);assert.throws(()=>pr.absent(f));fs.unlinkSync(f)});
pass('canonical parent alias is rejected',()=>{const l=fixtureRoot+'/alias';fs.symlinkSync(fixtureR,l);assert.throws(()=>pr.strictBytes(l+'/'+H[0].file));fs.unlinkSync(l)});
assert.equal(pr.graph05(H,E).length,284);
// Recheck original sources/state opaque byte-images and absent mutable effects after isolated fixtures.
for(const q of rootGraph)bytes(q);for(const q of Object.values(bookends))bytes(q);for(const f of absences)no(f);bytes(req.operator);bytes(req.input);bytes(spec.request);
const evidence={kind:'independent-single-Native05-source-safety-exact-FS-evidence',recordedAt:new Date().toISOString(),request:spec.request,input:req.input,operator:req.operator,seal:spec.seal,expectedRootApproval:req.expectedRootApproval,expectedApprovalByteImageVerified:true,keys:{input:11,RootApproval:12},actualCurrentGraph:rootGraph,actualHelperCount:229,actualExternalCount:55,currentTargetBeforeVerified:true,currentStarter021cVerifiedOnly:true,other282Verified:true,expectedAfterHelper229:json(p.expectedOnly.helper229),expectedAfterExternal55:json(p.expectedOnly.external55),fourOpaqueBookends:Object.values(bookends),bookendsAfterOwnFixturesUnchanged:true,strictPinnedFiles:[...recorded.values()],requiredAbsences:absences,asOfPort31441Listeners:listenerCount,host:{fixedNodePinVerified:true,version:process.version,uid:process.getuid(),cwd:process.cwd(),NODE_OPTIONSAndNODE_PATHEitherAbsentOrEmpty:true},functionProjectionFragments:Object.fromEntries(Object.entries(fragments).map(([k,v])=>[k,{bytes:Buffer.byteLength(v),rawBytesSha256:sha(v)}])),isolatedFS:{root:fixtureRoot,cases,passed:cases.length,failed:0,RootOrPrivateFixtures:false},scope:{oneFixedExistingMOD:true,RootStarterVerifyOnly:true,noADD:true,noFallback:true,noRollback:true,sourceOrNativeRuntimeExecuted:false,RootOrPrivateWrite:false,approvalSigned:false,SQLHTTP:false,processControl:false,actualG2:false,businessG3:false,businessG4:false},readinessIsAsOfOnly:true,compilerSource420AndCargo528NotRescanned:true};
const out=own+'/exact-FS-evidence.json';fs.writeFileSync(out,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({evidence:measure(out),strictPinFiles:recorded.size,RootGraph:284,opaqueBookends:4,isolatedFSCases:cases.length,noNamespaceOrMain:true}));
