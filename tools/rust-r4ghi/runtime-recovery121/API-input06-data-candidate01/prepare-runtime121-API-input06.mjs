// FS/data-only candidate. No application helper, Native, OS liveness or effect imports.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private';
const W='E:/projects/worktrees/poms-r3hijk-next28/poms',F=R+'/tools/rust-r4ghi/runtime-recovery121/root';
const full=(file,bytes,rawBytesSha256)=>({file,bytes,rawBytesSha256});
const SHA=b=>createHash('sha256').update(b).digest('hex');
const sort=(a,b)=>Buffer.compare(Buffer.from(a.file),Buffer.from(b.file));
const fixed={
  G1Policy:full(R+'/tools/rust-r4ghi/runtime-recovery121/g1A-transport358-policy01/Root-G1A-holder-transport-policy358.json',12056,'3082f94a4f0c1a6cb0de7f807c24c32b534722369690f2c873a5dbc8b75b4be6'),
  composition06:full(P+'/runtime121-compositions06/17ca9a05-544f-486d-be19-2807de42b0c0/complete.json',6150,'9124829bdb1aa311055e99a4604767936914970c27d96b33ffc58e3fefb56c1a'),
  source06:full(P+'/runtime121-native06-source-promotion/e226bfb4-59e2-4fdb-9682-504c9a6cde61/complete.json',2753,'91a4ce4d701f0d81d509bca2f2e5c4f5e2c916a4d2854d129c437bcdf48ce19e'),
  base:full(R+'/tools/rust-r4ghi/runtime-recovery121/retained-preparation01/base18/base-spec121.json',4579,'da64371a483b18b17f2af3cb47fa72572b051f26f6ee4097d81ed848d0df86de'),
  G1B:full(R+'/tools/rust-r4ghi/runtime-recovery121/g1B/Root-G1B-121.json',5254,'be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc'),
  APIBaseline:full(R+'/tools/rust-r4ghi/runtime-recovery121/g1B-API-append02/Root-G1B-API-append02.json',10198,'ac9cb66a6501f6e42f26ffe5470f49726dda2b37709e375bd8e043ae13430aad'),
  Root8Review:full(R+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-Root8-API-code-review02/review-Root8-API-code03-step121.json',14442,'577ef5922ecfe58420b121fab19c0069938c497170e2ad11fd783e496110d8b1'),
  env:full(P+'/rust.env',718,'d42dc1e25b6fff80268586b42e23df50c33e04db16843f70f3f23df79a2e646d'),
  node:full('/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node',125989464,'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12'),
};
const a15=['kind','schemaVersion','mode','namespace','nonce','G1','codeReview','executionSources','expectedStates','runtimeLossObservation','failedRetention','holder','pgStart','baseline','outputDirectory'];
// Completed old A nonces and retained unexecuted d963 are not new-round inputs.
const oldNonces=['18922a5d-22d8-45c8-871a-8a0339649653','d785af86-078b-4ba2-b325-b1fbc53028b0','4a48e0ae-2c5a-4f5f-b1d4-067d04b7892c','d963bb1d-4848-43cc-8d19-a00dcc7200a9'];
export const schemaKeys06=Object.freeze({
  options4:Object.freeze(["compositionComplete","lifetimeOwner","PGStart","PGConservation"]),
  currentRound14:Object.freeze(["kind","recordedAt","G1Policy","roundId","currentLossObservation","hostObservation","executablePin","powerShellVersion","actualOperator","codeReview","holderRequest","bootPolicy","limits","actualG2Authorized"]),
  support6:Object.freeze(["G1Append","newLossObservation","bootPolicy","actualOperator","codeReview","executablePin"]),
  rawProc6:Object.freeze(["bootBeforeText","statText","exe","cwd","cmdlineBase64","bootAfterText"]),
  ownedObservation26:Object.freeze(["kind","recordedAt","mode","nonce","G1Policy","G1Append","actualOperator","codeReview","newLossObservation","executablePin","bootPolicy","request","independentReview","input","RootReview","dispatch","holderReady","windowsLaunch","holder","windows","rawProc","readonly","PGControl","APIStart","NativeContext","SQLHTTP"])
});

const statePins={
  state13:full(P+'/business/g2-business13/main01/state.json',13529606,'af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4'),
  state14:full(P+'/business/g2-business14/main01/state.json',13834997,'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97'),
  state15:full(P+'/business/g2-business15/main01/state.json',14237432,'4c354c9190cdae04135ddedd1da7e8652fe5aa6e0aa8f5c74805faef9bc903ea'),
  ownership15:full(P+'/business/g2-business15/main01/ownership.jsonl',5560,'b76bb9d8345b0364554f05fb0d719f5083278b332ff54303946d9df3f167a918'),
};
const readSet=new Map();
function keys(v,k){assert(v&&Object.getPrototypeOf(v)===Object.prototype);assert.deepEqual(Object.keys(v).sort(),[...k].sort());}
function abs(f){assert(typeof f==='string'&&f.startsWith('/')&&!f.includes('\\')&&!f.includes('//')&&!f.split('/').some(x=>x==='.'||x==='..')&&!/[\0\r\n]/.test(f));}
function pinShape(p,forceFull=false){keys(p,forceFull||Object.hasOwn(p??{},'bytes')?['file','bytes','rawBytesSha256']:['file','rawBytesSha256']);abs(p.file);assert(/^[a-f0-9]{64}$/.test(p.rawBytesSha256));if(p.bytes!==undefined)assert(Number.isSafeInteger(p.bytes)&&p.bytes>=0);}
function same(a,b){pinShape(a);pinShape(b);assert.equal(a.file,b.file);assert.equal(a.rawBytesSha256,b.rawBytesSha256);if(a.bytes!==undefined&&b.bytes!==undefined)assert.equal(a.bytes,b.bytes);}
function bytes(file){abs(file);const s=fs.lstatSync(file,{bigint:true});assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1n);assert.equal(fs.realpathSync(file),file);const b=fs.readFileSync(file),t=fs.lstatSync(file,{bigint:true});for(const k of['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(s[k],t[k]);return b;}
function read(p){pinShape(p);const b=bytes(p.file);assert.equal(SHA(b),p.rawBytesSha256);if(p.bytes!==undefined)assert.equal(b.length,p.bytes);if(readSet.has(p.file))same(readSet.get(p.file),p);readSet.set(p.file,p);return b;}
function filePin(file){const b=bytes(file);return full(file,b.length,SHA(b));}
const json=p=>JSON.parse(read(p).toString('utf8'));
function absent(file){try{fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Preserve existing entry; no replay');}
function rootBody(p,input){return{kind:'Root-approved-exact-runtime121-A',approvedInput:input,G1:p.G1,codeReview:p.codeReview,mode:p.mode,nonce:p.nonce,actualG2Authorized:true,processControl:p.mode!=='pg-observe',readonlyPG:p.mode==='pg-observe',APIStart:false,businessDML:false,createReplaceRestoreMigrate:false};}
function actualAInput(p,mode,g){
  const a=g.originalABI;
  keys(p,a15);assert.equal(p.kind,'Root-runtime121-A-operation-input');assert.equal(p.schemaVersion,1);assert.equal(p.namespace,'poms-r4ghi');assert.equal(p.mode,mode);
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(p.nonce));assert(!oldNonces.includes(p.nonce));
  same(p.G1,a.originalG1);same(p.codeReview,a.originalCodeReview);same(p.runtimeLossObservation,a.originalLossAnchor);same(p.failedRetention,a.retention);
  for(const k of['G1','codeReview','runtimeLossObservation','failedRetention'])read(p[k]);
  assert.deepEqual([...p.executionSources].sort(sort),[...a.originalA7ExecutionSources].sort(sort));for(const q of p.executionSources)read(q);
  keys(p.expectedStates,Object.keys(statePins));for(const k of Object.keys(statePins)){pinShape(p.expectedStates[k]);assert.equal(p.expectedStates[k].rawBytesSha256,statePins[k].rawBytesSha256);}
  assert.equal(p.outputDirectory,P+'/runtime121-A/'+mode+'/'+p.nonce);
  for(const k of['holder','pgStart','baseline']){const required=mode==='pg-observe'||k==='holder'&&mode==='pg-start';if(required)pinShape(p[k]);else assert.equal(p[k],null);}
  return p;
}
function sameFull(a,b){pinShape(a,true);pinShape(b,true);same(a,b);}
function executablePin06(p,g){keys(p,['file','bytes','rawBytesSha256']);const t=g.immutableHostRules.trustedPowerShell;assert(typeof p.file==='string'&&new RegExp(t.pathRegex).test(p.file));assert.equal(p.bytes,t.bytes);assert.equal(p.rawBytesSha256,t.rawBytesSha256);return p;}
function actualCommand(commandPin,mode,inputPin,reviewPin){
  const c=json(commandPin);assert.equal(c.kind,'actual-runtime121-A-command');assert.equal(c.mode,mode);assert.equal(c.exitCode,0);assert.equal(c.signal,null);assert.equal(c.processError,null);
  const d=json(c.dispatch);assert.equal(d.kind,'actual-runtime121-A-single-dispatch');assert.equal(d.mode,mode);sameFull(d.input,inputPin);sameFull(d.RootReview,reviewPin);
  assert.equal(d.APIStart,false);assert.equal(d.businessDML,false);assert.equal(c.stdout.file,d.originalStdout);assert.equal(c.stderr.file,d.originalStderr);
  const q=json(d.request),peer=json(d.independentReview);keys(q,['kind','recordedAt','mode','input','expectedRootReview','expectedRootReviewBody','actualG2','RootReviewSigned','effectsExecuted']);
  assert.equal(q.kind,'Root-runtime121-A-exact-G2-request');assert.equal(q.mode,mode);sameFull(q.input,inputPin);sameFull(q.expectedRootReview,reviewPin);for(const k of['actualG2','RootReviewSigned','effectsExecuted'])assert.equal(q[k],false);
  const rb=Buffer.from(JSON.stringify(q.expectedRootReviewBody,null,2)+'\n');assert.equal(q.expectedRootReview.bytes,rb.length);assert.equal(q.expectedRootReview.rawBytesSha256,SHA(rb));assert(read(reviewPin).equals(rb));
  assert.equal(peer.kind,'non-author-runtime121-A-exact-G2');assert.equal(peer.mode,mode);assert.equal(peer.reviewerIsAuthor,false);assert(typeof peer.verdict==='string'&&peer.verdict.startsWith('approved-'));sameFull(peer.approvedInput,inputPin);sameFull(peer.expectedRootReview,reviewPin);
  for(const k of['stdout','stderr']){pinShape(c[k],true);read(c[k]);}
  return{command:c,dispatch:d,request:q,peer};
}
function currentRound06(round,g){
  keys(round,schemaKeys06.currentRound14);assert.equal(round.kind,'Root-frozen-runtime121-A-current-recovery-round');assert(Number.isFinite(Date.parse(round.recordedAt)));assert(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/.test(round.roundId));sameFull(round.G1Policy,fixed.G1Policy);
  for(const k of['currentLossObservation','hostObservation','actualOperator','codeReview','holderRequest'])pinShape(round[k],true);
  assert.equal(round.actualOperator.file,R+'/tools/rust-r4ghi/runtime-recovery121/aux358/dispatch-holder358.mjs');executablePin06(round.executablePin,g);assert.equal(round.powerShellVersion,g.immutableHostRules.trustedPowerShell.version);
  assert.equal(round.bootPolicy,'capture-and-bind-own-holder-launch');assert.deepEqual(round.limits,g.limits);assert.equal(round.actualG2Authorized,false);return round;
}
function bootText06(text,expected){assert(typeof text==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\r?\n?$/.test(text));assert.equal(text.trim(),expected);}
function bootObservation(p,phase,expected,inputPin,reviewPin,nonce,outputDirectory,roundPin){
  pinShape(p,true);assert.equal(p.file,outputDirectory+'/boot-'+phase+'.json');
  const b=json(p);assert.equal(b.kind,'actual-runtime121-A-holder-transport358-boot-observation');assert.equal(b.phase,phase);assert(!Object.hasOwn(b,'expectedBootId'));assert.equal(b.bootId,expected);
  assert.equal(b.exitCode,0);assert.equal(b.signal,null);assert.equal(b.processError,null);sameFull(b.G1Policy,fixed.G1Policy);sameFull(b.G1Append,roundPin);assert.equal(b.bootPolicy,'capture-and-bind-own-holder-launch');
  sameFull(b.input,inputPin);sameFull(b.RootReview,reviewPin);assert.equal(b.nonce,nonce);
  assert.equal(b.executable,'C:/Windows/System32/wsl.exe');assert.deepEqual(b.argv,['-d','Debian','--cd',R,'--exec','/usr/bin/cat','/proc/sys/kernel/random/boot_id']);
  pinShape(b.stdout,true);pinShape(b.stderr,true);assert.equal(b.stdout.file,outputDirectory+'/boot-'+phase+'.stdout.log');assert.equal(b.stderr.file,outputDirectory+'/boot-'+phase+'.stderr.log');
  bootText06(new TextDecoder('utf-8',{fatal:true}).decode(read(b.stdout)),expected);assert.equal(read(b.stderr).length,0);
}
function recordedProc06(raw,h){
  keys(raw,schemaKeys06.rawProc6);bootText06(raw.bootBeforeText,h.bootId);bootText06(raw.bootAfterText,h.bootId);assert.equal(raw.exe,fixed.node.file);assert.equal(raw.cwd,R);
  assert(typeof raw.statText==='string');const left=raw.statText.indexOf(' ('),right=raw.statText.lastIndexOf(') ');assert(left>0&&right>left);const pid=raw.statText.slice(0,left),fields=raw.statText.slice(right+2).trim().split(/\s+/);assert(/^[0-9]+$/.test(pid)&&fields.length>=20&&/^[0-9]+$/.test(fields[19]));assert.equal(Number(pid),h.pid);assert.equal(fields[19],h.startTime);
  assert(typeof raw.cmdlineBase64==='string'&&/^[A-Za-z0-9+/]*={0,2}$/.test(raw.cmdlineBase64));const b=Buffer.from(raw.cmdlineBase64,'base64');assert.equal(b.toString('base64'),raw.cmdlineBase64);assert(b.length>0&&b[b.length-1]===0);const argv=new TextDecoder('utf-8',{fatal:true}).decode(b).split('\0');assert.equal(argv.pop(),'');assert(argv.every(x=>x.length>0));assert.deepEqual(argv,h.argv);
}
function ownedReadback06(c,d,h,w,o,roundPin,p){
  sameFull(c.holderReady,o.holderReady);sameFull(c.windowsLaunch,o.windowsLaunch);pinShape(c.ownedHolderObservation,true);pinShape(c.ownedHolderCommand,true);assert.equal(c.ownedHolderObservation.file,p.outputDirectory+'/holder-identity.json');assert.equal(c.ownedHolderCommand.file,p.outputDirectory+'/holder-identity-command.json');
  const report=json(c.ownedHolderObservation),command=json(c.ownedHolderCommand);keys(report,schemaKeys06.ownedObservation26);assert.equal(report.kind,'actual-runtime121-A-holder-transport358-owned-holder-readback');assert(Number.isFinite(Date.parse(report.recordedAt)));assert.equal(report.mode,'holder-start');assert.equal(report.nonce,h.nonce);
  sameFull(report.G1Policy,fixed.G1Policy);sameFull(report.G1Append,roundPin);for(const k of['actualOperator','codeReview','newLossObservation'])sameFull(report[k],d[k]);assert.deepEqual(report.executablePin,d.executablePin);assert.equal(report.bootPolicy,d.bootPolicy);
  sameFull(report.request,d.request);sameFull(report.independentReview,d.independentReview);sameFull(report.input,h.input);sameFull(report.RootReview,h.review);sameFull(report.dispatch,c.dispatch);sameFull(report.holderReady,o.holderReady);sameFull(report.windowsLaunch,o.windowsLaunch);assert.deepEqual(report.holder,h);assert.deepEqual(report.windows,w);
  assert.equal(report.readonly,true);for(const k of['PGControl','APIStart','NativeContext','SQLHTTP'])assert.equal(report[k],false);recordedProc06(report.rawProc,h);
  assert.equal(command.kind,'actual-runtime121-A-holder-transport358-readonly-child-command');assert.equal(command.exitCode,0);assert.equal(command.signal,null);assert.equal(command.processError,null);pinShape(command.stdout,true);pinShape(command.stderr,true);assert.equal(command.stdout.file,p.outputDirectory+'/holder-identity.stdout.log');assert.equal(command.stderr.file,p.outputDirectory+'/holder-identity.stderr.log');
  const stdout=new TextDecoder('utf-8',{fatal:true}).decode(read(command.stdout));assert(stdout.endsWith('\n')&&!stdout.slice(0,-1).includes('\n'));assert.deepEqual(JSON.parse(stdout),report);assert.equal(read(command.stderr).length,0);
  return{observation:c.ownedHolderObservation,command:c.ownedHolderCommand};
}
function ownerLineage(ownerPin,g){
  const o=json(ownerPin);keys(o,['kind','holderReady','windowsLaunch','launchCommand']);assert.equal(o.kind,'actual-runtime121-lifetime-owner');for(const k of['holderReady','windowsLaunch','launchCommand'])pinShape(o[k],true);
  const h=json(o.holderReady),w=json(o.windowsLaunch),p=actualAInput(json(h.input),'holder-start',g);assert.equal(h.kind,'actual-runtime121-A-holder-ready');assert.equal(h.namespace,'poms-r4ghi');assert.equal(h.nonce,p.nonce);assert(typeof h.bootId==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(h.bootId));
  assert(Number.isSafeInteger(h.pid)&&h.pid>0);assert(/^\d+$/.test(h.startTime));for(const k of['PGStarted','APIStarted','contextCreated'])assert.equal(h[k],false);same(h.node,fixed.node);same(h.source,p.executionSources.find(x=>x.file===F+'/hold-runtime121.mjs'));
  const argv=[h.node.file,h.source.file,'--input',h.input.file,'--input-sha',h.input.rawBytesSha256,'--review',h.review.file,'--review-sha',h.review.rawBytesSha256,'--execute'];assert.deepEqual(h.argv,argv);assert.equal(h.cwd,R);
  assert.equal(h.input.file,P+'/runtime121-A-inputs/holder-start/'+p.nonce+'/input.json');assert.equal(h.review.file,P+'/runtime121-A-inputs/holder-start/'+p.nonce+'/Root-review.json');assert.equal(o.holderReady.file,p.outputDirectory+'/holder-ready.json');assert.equal(o.windowsLaunch.file,p.outputDirectory+'/windows-launch.json');assert.equal(o.launchCommand.file,p.outputDirectory+'/command-receipt.json');assert.deepEqual(json(h.review),rootBody(p,h.input));absent(p.outputDirectory+'/partial.json');absent(p.outputDirectory+'/holder-ended.json');
  assert.equal(w.kind,'actual-runtime121-A-Windows-holder-launch');assert(Number.isSafeInteger(w.windowsPid)&&w.windowsPid>0);assert(Number.isFinite(Date.parse(w.creationTime)));assert.equal(w.nonce,h.nonce);assert.equal(w.inputFile,h.input.file);assert.equal(w.inputSha,h.input.rawBytesSha256);assert.equal(w.reviewFile,h.review.file);assert.equal(w.reviewSha,h.review.rawBytesSha256);assert.equal(w.PGStarted,false);assert.equal(w.APIStarted,false);assert.equal(w.executable,'C:/Windows/System32/wsl.exe');assert.deepEqual(w.argv,['-d','Debian','--cd',R,'--exec',h.node.file,h.source.file,...argv.slice(2)]);
  const {command:c,dispatch:d,request:q,peer}=actualCommand(o.launchCommand,'holder-start',h.input,h.review);assert.equal(d.transportKind,'actual-runtime121-A-holder-transport358-dispatch');pinShape(d.G1Append,true);const round=currentRound06(json(d.G1Append),g);sameFull(d.G1Policy,fixed.G1Policy);sameFull(d.newLossObservation,round.currentLossObservation);read(round.currentLossObservation);read(round.hostObservation);sameFull(d.actualOperator,round.actualOperator);read(round.actualOperator);sameFull(d.codeReview,round.codeReview);assert.deepEqual(d.executablePin,round.executablePin);assert.equal(d.executable,d.executablePin.file);assert.equal(d.bootPolicy,round.bootPolicy);assert.equal(d.capturedBootId,h.bootId);sameFull(d.bootBefore,c.bootBefore);sameFull(round.holderRequest,d.request);assert.equal(d.request.file,P+'/runtime121-A-inputs/holder-start/'+p.nonce+'/request-exact-G2.json');
  same(d.entry,p.executionSources.find(x=>x.file===F+'/start-holder121.ps1'));assert.deepEqual(q.expectedRootReviewBody,rootBody(p,h.input));assert.equal(peer.verdict,'approved-once-holder-start-with-capture-bound-transport358');keys(peer.transport358,schemaKeys06.support6);for(const k of['G1Append','newLossObservation','actualOperator','codeReview'])sameFull(peer.transport358[k],d[k]);assert.deepEqual(peer.transport358.executablePin,d.executablePin);assert.equal(peer.transport358.bootPolicy,round.bootPolicy);
  assert.deepEqual(d.argv,['-NoLogo','-NoProfile','-NonInteractive','-File',W+'/tools/rust-r4ghi/runtime-recovery121/root/start-holder121.ps1','-InputFile',h.input.file,'-InputSha',h.input.rawBytesSha256,'-ReviewFile',h.review.file,'-ReviewSha',h.review.rawBytesSha256,'-Execute']);
  const r=json(d.codeReview);assert.equal(r.kind,'non-author-runtime121-A-holder-transport358-code-review');assert.equal(r.verdict,'code-ready-for-exact-holder-transport358-input-review');assert.equal(r.reviewerIsAuthor,false);assert(typeof r.author==='string'&&r.author&&typeof r.reviewer==='string'&&r.reviewer);assert.notEqual(r.author,r.reviewer);sameFull(r.operator,d.actualOperator);sameFull(r.G1Policy,fixed.G1Policy);assert(!Object.hasOwn(r,'G1Append')&&!Object.hasOwn(r,'currentRound'));assert.deepEqual(r.executionSources,[d.actualOperator]);
  for(const x of[c,d]){sameFull(x.G1Policy,fixed.G1Policy);sameFull(x.G1Append,d.G1Append);for(const k of['actualOperator','codeReview','newLossObservation'])sameFull(x[k],d[k]);assert.deepEqual(x.executablePin,d.executablePin);assert.equal(x.bootPolicy,round.bootPolicy);}
  bootObservation(c.bootBefore,'before',h.bootId,h.input,h.review,h.nonce,p.outputDirectory,d.G1Append);bootObservation(c.bootAfter,'after',h.bootId,h.input,h.review,h.nonce,p.outputDirectory,d.G1Append);const owned=ownedReadback06(c,d,h,w,o,d.G1Append,p);
  const childPin=filePin(p.outputDirectory+'/child-command-receipt.json'),child=json(childPin);assert.equal(child.kind,'actual-runtime121-A-holder-transport358-child-command');assert.equal(child.mode,'holder-start');sameFull(child.dispatch,c.dispatch);assert.equal(child.exitCode,0);assert.equal(child.signal,null);assert.equal(child.processError,null);sameFull(child.stdout,c.stdout);sameFull(child.stderr,c.stderr);
  const stdout=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(read(c.stdout)).trim());assert.equal(stdout.holderReadyFile,'//wsl.localhost/Debian'+o.holderReady.file);assert.equal(stdout.windowsLaunchFile,'//wsl.localhost/Debian'+o.windowsLaunch.file);assert.equal(stdout.windowsPid,w.windowsPid);assert.equal(stdout.PGStarted,false);assert.equal(stdout.APIStarted,false);
  return{owner:o,holder:h,input:p,round,roundPin:d.G1Append,owned,childCommand:childPin};
}
function pgLineage(pgPin,proofPin,holder,g,base){
  const pg=json(pgPin),proof=json(proofPin);
  assert.equal(pg.kind,'actual-runtime121-A-original-PG-resumed');assert.equal(proof.kind,'actual-runtime121-A-original-data-conserved');
  same(pg.holder,holder.owner.holderReady);same(proof.holder,holder.owner.holderReady);assert.equal(pg.bootId,holder.holder.bootId);same(proof.originalPGStart,pgPin);same(proof.baseline,base.preparedBaseline);same(proof.baseline,g.originalABI.baseline);
  const inputs=[];for(const[value,pinValue,mode]of[[pg,pgPin,'pg-start'],[proof,proofPin,'pg-observe']]){
    const p=actualAInput(json(value.input),mode,g);inputs.push(p);same(p.holder,holder.owner.holderReady);assert.equal(pinValue.file,p.outputDirectory+'/complete.json');assert.deepEqual(json(value.RootReview),rootBody(p,value.input));absent(p.outputDirectory+'/partial.json');
    const command=actualCommand(filePin(p.outputDirectory+'/command-receipt.json'),mode,value.input,value.RootReview);same(command.dispatch.entry,p.executionSources.find(q=>q.file===F+'/'+(mode==='pg-start'?'resume-original-pg121.mjs':'observe-conservation121.mjs')));
    const intent=json(value.intent);assert.equal(intent.kind,'actual-runtime121-A-operation-intent');assert.equal(intent.mode,mode);assert.equal(intent.nonce,p.nonce);same(intent.input,value.input);same(intent.RootReview,value.RootReview);
    if(mode==='pg-observe'){same(p.pgStart,pgPin);same(p.baseline,base.preparedBaseline);}
  }
  assert.equal(new Set([holder.input.nonce,...inputs.map(x=>x.nonce)]).size,3);
  for(const k of['containerCreated','volumeCreated','migrationOrBackupRestore','businessDML','APIStarted'])assert.equal(pg[k],false);
  assert.equal(pg.before.status,'exited');assert.equal(pg.before.running,false);assert.equal(pg.before.pid,0);assert.equal(pg.after.status,'running');assert.equal(pg.after.running,true);assert(pg.after.pid>0);
  for(const x of[pg.before,pg.after]){assert.equal(x.id,'513925616f4e1c1c988753e385be7f441dc98f6fb490101537498f60e8d5e00f');assert.equal(x.image,'b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a');assert.equal(x.volume,'poms-r4ghi-pg15-data');assert.equal(x.volumeSource,'/home/wangzishi/.local/share/containers/storage/volumes/poms-r4ghi-pg15-data/_data');assert.equal(x.volumeTarget,'/var/lib/postgresql/data');assert.equal(x.volumeType,'volume');assert.equal(x.volumeReadWrite,true);assert.equal(x.PGDATA,x.volumeTarget);assert.equal(x.mountCount,1);assert.deepEqual(x.portBinding,[{HostIp:'127.0.0.1',HostPort:'25434'}]);}
  const before=json(filePin(inputs[0].outputDirectory+'/before.json'));assert.deepEqual(before.before,pg.before);same(before.holder,holder.owner.holderReady);assert.equal(before.holderBoot,holder.holder.bootId);assert.equal(before.PGVersion,'15');assert.deepEqual(before.originalOIDDirectories,['16385','16387']);
  for(const k of['defaultReadOnly','transactionReadOnly'])assert.equal(proof[k],true);for(const k of['newAPIStarted','nativeAuthorityGranted','businessDML','baselineReset','backupRestore'])assert.equal(proof[k],false);
  assert.equal(proof.observations.length,2);assert.notEqual(proof.observations[0].file,proof.observations[1].file);read(proof.baseline);for(const p of proof.observations)read(p); // Opaque; do not re-run or parse database rows.
  for(const k of['first','second','between']){assert.equal(proof[k].tablesPerDB,139);assert.equal(proof[k].allRawXminMetaSequencesObjectsEqual,true);assert.equal(proof[k].crossDatabaseAtomicityClaimed,false);}
  return{pg,proof};
}
function freshBinary(p){pinShape(p,true);const s=fs.lstatSync(p.file,{bigint:true});assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink>=1n);assert.equal(fs.realpathSync(p.file),p.file);const b=fs.readFileSync(p.file);assert.equal(SHA(b),p.rawBytesSha256);assert.equal(b.length,p.bytes);return{file:p.file,rawBytesSha256:p.rawBytesSha256,bytes:b.length,dev:String(s.dev),ino:String(s.ino),nlink:Number(s.nlink)};}
function projection(p){keys(p,['file','rawBytesSha256','bytes','dev','ino','nlink']);return full(p.file,p.bytes,p.rawBytesSha256);}
export function prepareAPIInput06(options){
  assert.equal(process.platform,'linux');assert.equal(process.cwd(),R);assert.equal(process.getuid(),1000);assert.equal(process.execPath,fixed.node.file);assert.deepEqual(process.execArgv,[]);assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
  keys(options,schemaKeys06.options4);for(const p of Object.values(options))pinShape(p,true);
  const g=json(fixed.G1Policy),base=json(fixed.base);assert.equal(g.kind,"Root-frozen-stable-holder-transport358-G1-policy");assert.equal(g.codeImplementationGranted,true);assert.equal(g.actualG2Authorized,false);assert.equal(Object.keys(base).length,18);
  const holder=ownerLineage(options.lifetimeOwner,g);pgLineage(options.PGStart,options.PGConservation,holder,g,base);
  sameFull(options.compositionComplete,fixed.composition06);const c=json(options.compositionComplete);assert.equal(c.kind,'Root-runtime121-Native06-composition-materialized');assert.equal(c.rootSourceRawRechecked,true);assert.equal(c.oldInputsUnmodified,true);
  for(const k of['nativeOrHelperExecuted','runtimeAuthorityGranted','actualG2Granted','APIStartGranted','businessG3','businessG4'])assert.equal(c[k],false);
  sameFull(c.sourceSafetyComplete,fixed.source06);const source=json(c.sourceSafetyComplete);assert.equal(source.kind,'actual-single-Native-source-promotion-complete121');assert.deepEqual(source.copiedExactly,[{file:'tools/rust-r4ghi/business/runtime-admission121.mjs',beforeSHA256:'575332154922858204cd0088528001a540606cc3cd52217e39a251b0ebe97993',afterSHA256:'ef958a654e517cf417fe39c21f4deaadcb942aab69bf3a51602e6aed92636f38'}]);
  for(const k of['APIStarted','nativeAuthorityGranted','SQLHTTP','businessStateWrite','G3','G4'])assert.equal(source[k],false);
  assert.deepEqual(c.actualGraphs,{helper:source.helperPins,external:source.externalPins,execution:source.executionSources});
  const composition=json(c.planComposition);keys(composition,['helperComposition','externalComposition','independentCodeReviews']);same(composition.helperComposition,c.helperComposition);same(composition.externalComposition,c.externalComposition);
  const execution=json(source.executionSources);assert.equal(execution.length,284);assert.equal(new Set(execution.map(p=>p.file)).size,284);for(const p of execution){assert(p.file.startsWith(R+'/'));read(p);}
  const helpers=json(source.helperPins);assert.equal(helpers.length,229);assert.deepEqual(fs.readdirSync(R+'/tools/rust-r4ghi/business').filter(n=>/\.(mjs|json)$/.test(n)).map(n=>'tools/rust-r4ghi/business/'+n).sort(),helpers.map(p=>p.file).sort());
  const external=json(source.externalPins);assert.equal(external.length,55);assert.deepEqual([...helpers,...external].map(p=>({file:R+'/'+p.file,rawBytesSha256:p.sha256})).sort(sort),execution.map(p=>({file:p.file,rawBytesSha256:p.rawBytesSha256})).sort(sort));
  same(json(composition.helperComposition).finalHelperPins,source.helperPins);assert.deepEqual(json(composition.externalComposition).finalSources,external);
  const original=json(base.approvedCodePlan15),binary=projection(original.consumer.binary),summaryBinary=projection(original.consumer.summaryBinary),binaryFiles=[freshBinary(binary),freshBinary(summaryBinary)];
  read(fixed.G1B);read(fixed.APIBaseline);const r=json(fixed.Root8Review);assert.equal(r.kind,'non-author-runtime121-finite-code-step');assert.equal(r.verdict,'approved-bounded-step-only');assert.equal(r.reviewerIsAuthor,false);assert.equal(r.entries.length,8);same(r.technicalG1,fixed.APIBaseline);
  for(const p of Object.values(statePins))read(p);read(fixed.node);read(fixed.env);const es=fs.lstatSync(fixed.env.file,{bigint:true});assert.equal(es.uid,1000n);assert.equal(es.mode&0o777n,0o600n); // Env bytes are hashed, never decoded or parsed.
  const nonce=randomUUID(),dir=P+'/runtime121-B-inputs/api-start/'+nonce,O=R+'/tools/rust-r4ghi/runtime-recovery121/API-start-input06';
  const input={kind:'Root-runtime121-B-API-operation-input',schemaVersion:1,namespace:'poms-r4ghi',epoch:'g2-business15',run:'main01',nonce,G1B:fixed.G1B,operatorBaseline:fixed.APIBaseline,codeReview:fixed.Root8Review,base,
    current:{sourcePins:base.sourcePins,compilePins:base.compilePins,helperPins:source.helperPins,helperCount:229,binary,summaryBinary,binaryFiles,nodeExecutable:fixed.node,lifetimeOwner:options.lifetimeOwner,PGStart:options.PGStart,PGConservation:options.PGConservation,baseNormalEnv:fixed.env},
    composition,expectedStates:statePins,executionSources:execution,outputDirectory:P+'/runtime121-B/api-start/'+nonce,processFile:P+'/rust-api121-process.json',normalEnvFile:P+'/rust-api121.env'};
  assert.equal(Object.keys(input).length,17);assert.equal(Object.keys(input.current).length,12);for(const f of[dir,O,input.outputDirectory,input.processFile,input.normalEnvFile])absent(f);
  for(const p of [...readSet.values()])read(p);freshBinary(binary);freshBinary(summaryBinary);
  const save=(root,name,value)=>{const file=root+'/'+name,b=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value,null,2)+'\n');fs.writeFileSync(file,b,{flag:'wx',mode:0o600});const p=full(file,b.length,SHA(b));read(p);return p;};
  fs.mkdirSync(path.posix.dirname(dir),{recursive:true,mode:0o700});assert.equal(fs.realpathSync(path.posix.dirname(dir)),path.posix.dirname(dir));fs.mkdirSync(dir,{mode:0o700});
  try{const inputPin=save(dir,'input.json',input);fs.mkdirSync(O,{mode:0o700});const copy=save(O,'actual-input.json',read(inputPin));assert.equal(copy.rawBytesSha256,inputPin.rawBytesSha256);
    for(const p of [...readSet.values()])read(p);freshBinary(binary);freshBinary(summaryBinary);
    const receipt=save(O,'metadata-preparation.json',{kind:'Root-runtime121-concrete-API-input-prepared',input:inputPin,compositionResult:options.compositionComplete,sourcePromotion:c.sourceSafetyComplete,baseSpec:fixed.base,codeReview:fixed.Root8Review,
      freshA2:{lifetimeOwner:options.lifetimeOwner,holder:holder.owner.holderReady,PGStart:options.PGStart,PGConservation:options.PGConservation,bootId:holder.holder.bootId,G1Policy:fixed.G1Policy,G1Append:holder.roundPin,ownedHolderObservation:holder.owned.observation,ownedHolderCommand:holder.owned.command,childCommand:holder.childCommand},binaryCurrentFacts:binaryFiles,
      originalEnvValuesPrinted:false,originalEnvValuesParsed:false,independentWindowsPIDCheckedByThisHelper:false,RootReviewSigned:false,NamespaceNativeCalled:false,OSLivenessChecked:false,APIStarted:false,PGControlCalled:false,actualG2Authorized:false});return{input:inputPin,receipt,preflightNotYetRun:true,APIStarted:false};
  }catch{try{save(dir,'partial.json',{kind:'API-input06-metadata-preserve',message:'Stop and preserve outputs; no automatic retry or API action.',actualG2Authorized:false});}catch{}throw Error('API input06 metadata stopped; preserve originals');}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const a=process.argv.slice(2);assert.equal(a.length,7);assert.equal(a[6],'--execute');const v={};for(let n=0;n<6;n+=2){assert(['--input','--input-sha','--input-bytes'].includes(a[n])&&!Object.hasOwn(v,a[n]));v[a[n]]=a[n+1];}keys(v,['--input','--input-sha','--input-bytes']);assert(/^(0|[1-9][0-9]*)$/.test(v['--input-bytes']));console.log(JSON.stringify(prepareAPIInput06(json(full(v['--input'],Number(v['--input-bytes']),v['--input-sha'])))));}
  catch{console.error(JSON.stringify({kind:'API-input06-data-stopped',message:'No runtime action granted; preserve any metadata and review before retry.'}));process.exitCode=1;}
}
