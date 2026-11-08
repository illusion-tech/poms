import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const workspace = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const repo = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/';
const privateLinux = '/home/wangzishi/.local/share/poms-r4ghi/private/';
const privateFS = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function host(file) { if (file.startsWith(repo)) return path.join(workspace,file.slice(repo.length)); if(file.startsWith(privateLinux)) return privateFS+file.slice(privateLinux.length); if(path.isAbsolute(file)) return file; assert(!file.split('/').includes('..')); return path.join(workspace,file); }
function pin(file,digest) { const bytes=fs.readFileSync(host(file)); assert.equal(sha(bytes),digest,file); return JSON.parse(bytes); }
function rawPin(file,digest) { assert.equal(sha(fs.readFileSync(host(file))),digest,file); }
function sourceMap(values) { const m=new Map(); for(const x of values){assert(!m.has(x.file));assert(/^[a-f0-9]{64}$/.test(x.sha256));m.set(x.file,x.sha256);}return m; }
function compare(before,after) { const b=sourceMap(before),a=sourceMap(after);return {added:after.filter(x=>!b.has(x.file)),modified:after.filter(x=>b.has(x.file)&&b.get(x.file)!==x.sha256).map(x=>({file:x.file,beforeSHA256:b.get(x.file),afterSHA256:x.sha256})),removed:before.filter(x=>!a.has(x.file)),unchanged:after.filter(x=>b.get(x.file)===x.sha256)}; }
function jsonChanges(a,b,p=''){if(JSON.stringify(a)===JSON.stringify(b))return[];if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)||Array.isArray(b))return[{path:p,before:a,after:b}];const out=[];for(const k of new Set([...Object.keys(a),...Object.keys(b)])){const q=p+'/'+k.replaceAll('~','~0').replaceAll('/','~1');if(!(k in a))out.push({path:q,added:b[k]});else if(!(k in b))out.push({path:q,removed:a[k]});else out.push(...jsonChanges(a[k],b[k],q));}return out;}
const previousSeal=pin(path.join(root,'manifest183.json'),'ccfa730c95e3f639e78ed684057649f939d12e2a8395946ac8991271e1f1cbd9');
for(const x of previousSeal.files)rawPin(x.path,x.rawBytesSHA256);
const previousComparison=pin(path.join(root,'source-comparison183.json'),'d15a3219c4a23b3308499efc2d88a41fe4f43c147f727b646ea05a952639fc6b');
const receiptPin={file:privateLinux+'source13-preparation189/receipt189.json',rawBytesSha256:'44f731f79bbfdcc0713f95c5af4393ecb7cb6cb636fada10c28b794dc8ca3992'};
const receipt=pin(receiptPin.file,receiptPin.rawBytesSha256);
const oldSources=pin(receipt.originalSourcesRetained.file,receipt.originalSourcesRetained.rawBytesSha256);
const nextSources=pin(receipt.sourcePins.file,receipt.sourcePins.rawBytesSha256);
assert.equal(oldSources.length,416);assert.equal(nextSources.length,416);
assert.equal(sha(JSON.stringify(oldSources)),'937a55affa775787d7507b94f3fc425affa9ec700c1aaabf449f564ee8d203fe');
assert.equal(sha(JSON.stringify(nextSources)),'c337f56f035b76010b841559c5c81c5c6abb62158a300a1765511f2ac7d1a9d2');
assert.deepEqual(oldSources.map(x=>x.file),nextSources.map(x=>x.file));
const revision=compare(oldSources,nextSources);assert.equal(revision.added.length,0);assert.equal(revision.removed.length,0);assert.equal(revision.modified.length,1);
assert.deepEqual(revision.modified[0],{file:'docs/design/rust-r4ghi/source13-g2-freeze136.json',beforeSHA256:'f0a8cf9ce22bb032bc28ac599d6ff00946d6013e29084975a265048faa849115',afterSHA256:'eb8db18312975c99c55fe7e2bd18d1fb1108d866d298c26694653fb839836d0a'});
for(const x of nextSources)rawPin(x.file,x.sha256);
const oldApproval=pin(receipt.originalApprovalRetained.file,receipt.originalApprovalRetained.rawBytesSha256);
const newApproval=pin(receipt.approval.file,receipt.approval.rawBytesSha256);
const changes=jsonChanges(oldApproval,newApproval);
const allowed=['/frozenAtUTC','/supportingTools/source13BuildRunner/file','/supportingTools/source13BuildRunner/rawBytesSha256','/preMintBuildRevision189'];
assert(changes.every(x=>allowed.includes(x.path)));assert.equal(changes.length,4);
for(const key of ['forwardMigration','finalHelperH0','businessDecisions','scopedOperations','retainedSource12','finalHToolManifests','publicRouteAndDTOChanges'])assert.deepEqual(oldApproval[key],newApproval[key]);
assert.equal(newApproval.actualM98Applied,false);assert.equal(newApproval.G3Certified,false);assert.equal(newApproval.G4Certified,false);
const h0=pin(receipt.helperH0.file,receipt.helperH0.rawBytesSha256);assert.equal(h0.length,195);assert.equal(receipt.helperH0.rawBytesSha256,'e65db96998f5dc15ed406bf5d30b2a1bfa95c82affb448b625ca3295227d0459');
for(const x of h0)rawPin(x.file,x.sha256);
pin(receipt.originalFreezeRetained.file,receipt.originalFreezeRetained.rawBytesSha256);
rawPin(newApproval.preMintBuildRevision189.independentApproval.file,'bcfa3be54beacaaa24a5bc4caf1854d71f3f252474548d7b2d2485f92e89299f');
rawPin(receipt.newDriver.file,'68a1aca0d656bb1daf827ee139d6f9e31e9c1692008f70b5c03efe2e06fb6bf8');
rawPin(newApproval.preMintBuildRevision189.corrector.file,newApproval.preMintBuildRevision189.corrector.rawBytesSha256);
const partial=pin(receipt.originalBuildPartial.file,receipt.originalBuildPartial.rawBytesSha256);
for(const m of receipt.mirrors){rawPin(m.preservedBefore.file,m.preservedBefore.rawBytesSha256);rawPin(m.file,m.synchronizedToRootSHA256);}
const producer=pin(previousComparison.producerSourceManifest.file,previousComparison.producerSourceManifest.rawBytesSha256).files;
const full=compare(producer,nextSources);assert.equal(producer.length,406);assert.equal(full.added.length,10);assert.equal(full.modified.length,6);assert.equal(full.removed.length,0);assert.equal(full.unchanged.length,400);
assert.deepEqual(full.modified,previousComparison.files.modified);
const result={
 kind:'independent-single-leaf-refreeze-source-comparison189',reviewer:'/root/r4ghi_final_gates13',
 producerEpoch:'g2-business12',consumerEpoch:'g2-business13',producerSourcePinsSHA256:'5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa',consumerSourcePinsSHA256:'c337f56f035b76010b841559c5c81c5c6abb62158a300a1765511f2ac7d1a9d2',producerSourceCount:406,consumerSourceCount:416,
 priorConsumerSourcePinsSHA256:'937a55affa775787d7507b94f3fc425affa9ec700c1aaabf449f564ee8d203fe',prior183Seal:{file:repo+'tools/rust-r4ghi/independent/final-gates13/manifest183.json',rawBytesSha256:'ccfa730c95e3f639e78ed684057649f939d12e2a8395946ac8991271e1f1cbd9'},prior183SourceComparison:{file:repo+'tools/rust-r4ghi/independent/final-gates13/source-comparison183.json',rawBytesSha256:'d15a3219c4a23b3308499efc2d88a41fe4f43c147f727b646ea05a952639fc6b'},
 all37Prior183OutputPinsUnchanged:true,producer406ZIPRawReadbackInheritedByImmutable183Pin:true,
 revisionReceipt:receiptPin,priorApproval:receipt.originalApprovalRetained,priorSources:receipt.originalSourcesRetained,priorFreeze:receipt.originalFreezeRetained,newApproval:receipt.approval,newSources:receipt.sourcePins,
 consumerRevision:{added:revision.added,modified:revision.modified,removed:revision.removed,unchangedCount:revision.unchanged.length,sameNamesAndOrder:true},approvalJSONChanges:changes,
 producerToNewConsumerFiles:full,allNew416CurrentSourceFilesHashed:true,
 helperH0:receipt.helperH0,helperCount:195,all195CurrentHelperFilesHashedAndUnchanged:true,
 productsSQLTSForwardMigrationBusinessDecisionsAndScopeUnchanged:true,newBusinessSchemaIntroduced:false,
 newBuildDriver:receipt.newDriver,nonAuthorToolReview:newApproval.preMintBuildRevision189.independentApproval,
 originalBuildPartial:receipt.originalBuildPartial,originalBuildPartialRetainsOriginalLabel:true,partialKind:partial.kind??null,
 mirrorBeforeCopiesAndRootAfterTargetsHashed:receipt.mirrors,activeBuildMirrorNotRead:true,
 observationBoundary:'Only completed189 fixed files and current frozen source/H0 inputs read; active build output/mutable state/DB not inspected. At receipt189 completion no Cargo/M98/state; subsequent active four-step build is not certified here.',
 actualM98Receipt:null,actualAfterSchema:null,actualB0:null,actualSource13State:null,
 currentConsumerCertificationGranted:false,retainHistoricalLabels:true,G3Certified:false,G4Certified:false,newCertifiedOperations:0
};
fs.writeFileSync(path.join(root,'source-comparison189.json'),JSON.stringify(result,null,2)+'\n');
process.stdout.write(JSON.stringify({prior183PinsUnchanged:37,newSources:416,onlyChangedSourceLeaf:revision.modified[0],unchangedSourceFiles:415,H0:195,approvalChangedPaths:changes.map(x=>x.path),consumerDigest:result.consumerSourcePinsSHA256,runtimeOrSchemaCertified:false})+'\n');
