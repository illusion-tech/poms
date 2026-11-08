import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)), workspace='E:/projects/worktrees/poms-r3hijk-next28/poms';
const repo='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/', priv='/home/wangzishi/.local/share/poms-r4ghi/private/', unc='//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function host(f){if(f.startsWith(repo))return path.join(workspace,f.slice(repo.length));if(f.startsWith(priv))return unc+f.slice(priv.length);if(path.isAbsolute(f))return f;assert(!f.split('/').includes('..'));return path.join(workspace,f);}
function raw(f,h){const b=fs.readFileSync(host(f));assert.equal(sha(b),h,f);return b;}
function read(f,h){return JSON.parse(raw(f,h));}
function map(a){const m=new Map();for(const x of a){assert(!m.has(x.file));assert(/^[a-f0-9]{64}$/.test(x.sha256));m.set(x.file,x.sha256);}return m;}
function compare(b,a){const bm=map(b),am=map(a);return{added:a.filter(x=>!bm.has(x.file)),modified:a.filter(x=>bm.has(x.file)&&bm.get(x.file)!==x.sha256).map(x=>({file:x.file,beforeSHA256:bm.get(x.file),afterSHA256:x.sha256})),removed:b.filter(x=>!am.has(x.file)),unchanged:a.filter(x=>bm.get(x.file)===x.sha256)};}
function changes(a,b,p=''){if(JSON.stringify(a)===JSON.stringify(b))return[];if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)||Array.isArray(b))return[{path:p,before:a,after:b}];const r=[];for(const k of new Set([...Object.keys(a),...Object.keys(b)])){const q=p+'/'+k.replaceAll('~','~0').replaceAll('/','~1');if(!(k in a))r.push({path:q,added:b[k]});else if(!(k in b))r.push({path:q,removed:a[k]});else r.push(...changes(a[k],b[k],q));}return r;}
const seals=[['manifest183.json','ccfa730c95e3f639e78ed684057649f939d12e2a8395946ac8991271e1f1cbd9'],['manifest189.json','80f6e995c92de0df0b019621318921658edf0d7f21901b863204e0ef37891959']];
for(const [f,h] of seals){const s=read(path.join(root,f),h);for(const p of s.files)raw(p.path,p.rawBytesSHA256);}
const prior=read(path.join(root,'source-comparison189.json'),'d29eb754f4dd97e4580f1ccf487a30f4562c8b2bcad13f76b826330b39b691d1');
const base=read(path.join(root,'source-comparison183.json'),'d15a3219c4a23b3308499efc2d88a41fe4f43c147f727b646ea05a952639fc6b');
const receiptPin={file:priv+'source13-preparation193/receipt193.json',rawBytesSha256:'9416e27093a0539b1695f4cd4fc4c8ecaa8570af5e90289351468224f8c46acb'};
const receipt=read(receiptPin.file,receiptPin.rawBytesSha256);
const oldSources=read(receipt.preserved.sources.file,receipt.preserved.sources.rawBytesSha256),nextSources=read(receipt.sourcePins.file,receipt.sourcePins.rawBytesSha256);
assert.equal(oldSources.length,416);assert.equal(nextSources.length,416);assert.deepEqual(oldSources.map(x=>x.file),nextSources.map(x=>x.file));
assert.equal(sha(JSON.stringify(oldSources)),'c337f56f035b76010b841559c5c81c5c6abb62158a300a1765511f2ac7d1a9d2');
assert.equal(sha(JSON.stringify(nextSources)),'5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e');
const delta=compare(oldSources,nextSources);assert.equal(delta.added.length,0);assert.equal(delta.removed.length,0);assert.equal(delta.modified.length,1);
assert.deepEqual(delta.modified[0],{file:'docs/design/rust-r4ghi/source13-g2-freeze136.json',beforeSHA256:'eb8db18312975c99c55fe7e2bd18d1fb1108d866d298c26694653fb839836d0a',afterSHA256:'b15582a0d32e60f9f7f462c9ce3db7ef1d90431b5edfb22a0c12b430c567328d'});
for(const p of nextSources)raw(p.file,p.sha256);
const oldApproval=read(receipt.preserved.approval.file,receipt.preserved.approval.rawBytesSha256),approval=read(receipt.approval.file,receipt.approval.rawBytesSha256);
const diff=changes(oldApproval,approval),allowed=['/frozenAtUTC','/supportingTools/source13BuildRunner/file','/supportingTools/source13BuildRunner/rawBytesSha256','/supportingTools/source13Constructor/rawBytesSha256','/productionClippyRevision193'];
assert.equal(diff.length,5);assert(diff.every(x=>allowed.includes(x.path)));
for(const k of ['forwardMigration','finalHelperH0','businessDecisions','scopedOperations','retainedSource12','finalHToolManifests','publicRouteAndDTOChanges','preMintBuildRevision189'])assert.deepEqual(oldApproval[k],approval[k]);
for(const pin of Object.values(receipt.preserved))raw(pin.file,pin.rawBytesSha256);
const ctorOld=raw(receipt.preserved.constructor03.file,receipt.preserved.constructor03.rawBytesSha256).toString('utf8'),ctorNew=raw(receipt.constructor.file,receipt.constructor.rawBytesSha256).toString('utf8');
const oldClippy="clippy: ['--all-targets', '--', '-D', 'warnings']",newClippy="clippy: ['--lib', '--no-deps', '--', '-D', 'warnings']";
assert.equal(ctorOld.split(oldClippy).length,2);assert.equal(ctorOld.replace(oldClippy,newClippy),ctorNew);
for(const text of [ctorOld,ctorNew]){assert(text.includes("test: ['--all-targets']"));assert(text.includes("build: ['--bin', 'poms-api-rust', '--example', 'r4ghi_summary_producer08']"));}
raw(receipt.newDriver.file,receipt.newDriver.rawBytesSha256);
const rev=approval.productionClippyRevision193;raw(rev.independentApproval.file,'4bd5bdb6cbb005fd68316e50d29db23909f5327ae27f787a1f8ac589cc3b6b0a');raw(rev.corrector.file,rev.corrector.rawBytesSha256);
const h0=read(receipt.helperH0.file,receipt.helperH0.rawBytesSha256);assert.equal(h0.length,195);assert.equal(receipt.helperH0.rawBytesSha256,'e65db96998f5dc15ed406bf5d30b2a1bfa95c82affb448b625ca3295227d0459');for(const p of h0)raw(p.file,p.sha256);
const failed=read(receipt.originalFailed180_02.file,receipt.originalFailed180_02.rawBytesSha256);
const oldBuild=priv+'source13-build180-02/';
const fmtPin={file:oldBuild+'fmt-command.json',rawBytesSha256:'3d4187435cfe568bd508e7cf38dd1b0b28d8b6b46340e7d2a3fd81c12d02d549'},clippyPin={file:oldBuild+'clippy-command.json',rawBytesSha256:'0d1d706371d6b85014af279426bef246eeae0de50b94405dcb132f089c288ab3'};
const fmt=read(fmtPin.file,fmtPin.rawBytesSha256),clippy=read(clippyPin.file,clippyPin.rawBytesSha256);assert.equal(fmt.exitCode,0);assert.equal(clippy.exitCode,101);assert(clippy.argv.includes('--all-targets'));
const stderr=raw(clippy.stderr.file,clippy.stderr.rawBytesSha256).toString('utf8');assert(stderr.includes('(lib test) due to 166 previous errors'));
assert(!fs.existsSync(host(oldBuild+'test-command.json')));assert(!fs.existsSync(host(oldBuild+'build-command.json')));
const producer=read(base.producerSourceManifest.file,base.producerSourceManifest.rawBytesSha256).files,full=compare(producer,nextSources);assert.equal(full.added.length,10);assert.equal(full.modified.length,6);assert.equal(full.removed.length,0);assert.equal(full.unchanged.length,400);assert.deepEqual(full.modified,base.files.modified);
const result={kind:'independent-production-Clippy-protocol-source-comparison193',reviewer:'/root/r4ghi_final_gates13',producerEpoch:'g2-business12',consumerEpoch:'g2-business13',producerSourcePinsSHA256:'5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa',consumerSourcePinsSHA256:'5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e',producerSourceCount:406,consumerSourceCount:416,priorConsumerSourcePinsSHA256:'c337f56f035b76010b841559c5c81c5c6abb62158a300a1765511f2ac7d1a9d2',
prior183And189Seals:seals.map(([f,h])=>({file:repo+'tools/rust-r4ghi/independent/final-gates13/'+f,rawBytesSha256:h})),all37Source183And8Source189OutputPinsUnchanged:true,priorSourceComparison189:{file:repo+'tools/rust-r4ghi/independent/final-gates13/source-comparison189.json',rawBytesSha256:'d29eb754f4dd97e4580f1ccf487a30f4562c8b2bcad13f76b826330b39b691d1'},
revisionReceipt:receiptPin,oldSources:receipt.preserved.sources,newSources:receipt.sourcePins,oldApproval:receipt.preserved.approval,newApproval:receipt.approval,consumerRevision:{added:delta.added,modified:delta.modified,removed:delta.removed,unchangedCount:415,sameNamesAndOrder:true},approvalJSONChanges:diff,producerToNewConsumerFiles:full,all416CurrentSourceFilePinsHashed:true,
helperH0:receipt.helperH0,helperCount:195,all195CurrentH0FilePinsHashedAndUnchanged:true,allRuntimeProductsSQLTS98MigrationBusinessDecisionsAndScopeUnchanged:true,newBusinessSchemaIntroduced:false,
constructorChange:{old:receipt.preserved.constructor03,new:receipt.constructor,entireTextOnlyExactClippySuffixReplacement:true,oldClippySuffix:['--all-targets','--','-D','warnings'],newClippySuffix:['--lib','--no-deps','--','-D','warnings'],testAllTargetsUnchanged:true,apiAndSummaryCommonExampleBuildUnchanged:true},newDriver:receipt.newDriver,toolReview117:rev.independentApproval,
oldFailedBuild18002:{partial:receipt.originalFailed180_02,fmt:fmtPin,fmtExitCode:0,clippy:clippyPin,clippyExitCode:101,actualClippyTarget:'all-targets/lib test',libTestStyleErrors:166,stderr:clippy.stderr,testExecuted:false,buildExecuted:false,originalFailureLabelPreserved:true,partialName:failed.name??null},
observationBoundary:'Completed193 files and frozen source/H0 only. Production-lib Clippy is the new explicit protocol; test-target Clippy is not claimed passed. Current18003 Cargo/build/runtime outputs are not read or certified.',actualM98Receipt:null,actualAfterSchema:null,actualB0:null,actualSource13State:null,currentConsumerCertificationGranted:false,retainHistoricalLabels:true,G3Certified:false,G4Certified:false,newCertifiedOperations:0};
fs.writeFileSync(path.join(root,'source-comparison193.json'),JSON.stringify(result,null,2)+'\n');
process.stdout.write(JSON.stringify({prior183And189Unchanged:true,sources:416,onlyChangedLeaf:delta.modified[0],H0:195,G2ChangedPaths:diff.map(x=>x.path),constructorOnlyClippySuffixChanged:true,testAllTargetsAndBuildUnchanged:true,oldFmt:0,oldAllTargetsClippy:101,oldLibTestStyleErrors:166,oldTestBuildExecuted:false,consumerDigest:result.consumerSourcePinsSHA256,currentExecutionCertified:false})+'\n');
