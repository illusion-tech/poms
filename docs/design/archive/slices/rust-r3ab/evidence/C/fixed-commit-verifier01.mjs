// Independent C. Read-only immutable Git blobs and saved public pins only.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=process.cwd().replaceAll('\\','/');assert.equal(root,'E:/projects/worktrees/poms-r3ab-customer-project/poms');
const base='a3a8c167f9cbeefc591dbaf2e75e7d5de9ce470d',commit='df0d99decffbe974c988e85eea97767331044cbe',branch='codex/poms-r3ab-customer-project',primary='E:/projects/poms';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f)),pin=f=>{const b=fs.readFileSync(f);return{file:f,bytes:b.length,rawBytesSha256:sha(b)}};
const git=(args,cwd=root,extra={})=>execFileSync('git',args,{cwd,maxBuffer:128*1024*1024,...extra});
const text=(args,cwd=root)=>git(args,cwd).toString('utf8').trim();
assert.equal(text(['rev-parse','HEAD']),commit);assert.equal(text(['rev-parse','refs/heads/'+branch]),commit);assert.equal(text(['rev-parse','refs/remotes/origin/'+branch]),commit);
assert.equal(text(['rev-list','--parents','-n','1',commit]),commit+' '+base);assert.equal(text(['merge-base',base,commit]),base);
const worktreeStatusAtStart=text(['status','--porcelain=v1']);assert.equal(worktreeStatusAtStart,'');
const primaryBefore={branch:text(['symbolic-ref','--short','HEAD'],primary),HEAD:text(['rev-parse','HEAD'],primary),main:text(['rev-parse','refs/heads/main'],primary),originMain:text(['rev-parse','refs/remotes/origin/main'],primary),status:text(['status','--porcelain=v1'],primary)};
assert.deepEqual(primaryBefore,{branch:'main',HEAD:base,main:base,originMain:base,status:''});assert.equal(text(['rev-parse','refs/remotes/origin/main']),base);
const signed=read('tmp/rust-r3ab/c-review/g3-independent-review01.json');assert.equal(pin('tmp/rust-r3ab/c-review/g3-independent-review01.json').rawBytesSha256,'34218f90438d0ccae6a1513a58f62b47565cc895dca4de8cd4724fddb05f72bb');assert.equal(signed.result,'Pass');assert(signed.G3Certified);assert.equal(signed.G4Certified,false);
const manifest=read('docs/design/rust-r3ab/g1-input-manifest02.json'),evidence=read('docs/design/rust-r3ab/acceptance-evidence01.json'),sourceProof=read('docs/design/rust-r3ab/source-and-format-proof01.json');
const diff=text(['diff','--name-status','--no-renames',base,commit]).split('\n').map(l=>{const[status,file]=l.split('\t');return{status,file}});assert.equal(diff.length,133);assert(diff.every(x=>x.status==='A'||x.status==='M'));
const categories={production:[],attributes:[],governance:[],scope:[],formal:[],actualEvidence:[],tools:[]};
const governance=new Set(['docs/design/README.md','docs/design/backend-rust-migration-plan.md','docs/design/phase2-development-execution-tracker.md','docs/design/rust-migration-execution-tracker.md']);
const product=new Set(evidence.productionSources.map(p=>p.file));
for(const d of diff){let kind;
 if(product.has(d.file))kind='production';else if(d.file==='.gitattributes')kind='attributes';else if(governance.has(d.file))kind='governance';else if(['docs/design/rust-r3-operation-slices.json','docs/design/rust-r3-scope-and-dependencies.md'].includes(d.file))kind='scope';else if(d.file.startsWith('docs/design/archive/slices/rust-r3ab/evidence/'))kind='actualEvidence';else if(d.file.startsWith('docs/design/rust-r3ab/')||/^docs\/design\/rust-r3ab-(?:customer-project-baseline|g3-checkpoint|numbering-corrective-checkpoint)\.md$/.test(d.file))kind='formal';else if(d.file.startsWith('tools/rust-r3ab/'))kind='tools';else assert.fail('Unexplained fixed-commit file '+d.file);categories[kind].push(d.file);
}
assert.equal(categories.production.length,15);assert.equal(categories.attributes.length,1);assert.equal(categories.governance.length,4);assert.equal(categories.scope.length,2);
const expected=new Map();function expect(p,file=p.file){const previous=expected.get(file);if(previous){assert.equal(previous.bytes,p.bytes);assert.equal(previous.rawBytesSha256,p.rawBytesSha256);}else expected.set(file,{...p,file});}
for(const p of [...manifest.formalFiles,...manifest.nativeFiles,...evidence.productionSources,...sourceProof.stagedRawSourceOrFormalInputs])expect(p);
for(const c of evidence.retainedRawCopies)expect(c.archive);
expect(sourceProof.activeAttributes);
for(const p of Object.values(signed.authorities).filter(p=>p?.file&&p.bytes&&p.file.startsWith('docs/')))expect(p);
for(const [origin,destinations]of [
 ['tmp/rust-r3ab/c-review/g3-independent-review01.json',['docs/design/rust-r3ab/g3-independent-review01.json','docs/design/archive/slices/rust-r3ab/evidence/C/g3-independent-review01.json']],
 ['tmp/rust-r3ab/c-review/g3-public-verification01.json',['docs/design/archive/slices/rust-r3ab/evidence/C/g3-public-verification01.json']],
 ['tmp/rust-r3ab/c-review/g3-public-verifier01.mjs',['docs/design/archive/slices/rust-r3ab/evidence/C/g3-public-verifier01.mjs']],
 ['tmp/rust-r3ab/c-review/g1-independent-review01.json',['docs/design/rust-r3ab/g1-independent-review01.json']],
 ['tmp/rust-r3ab/c-review/g1-independent-review02.json',['docs/design/rust-r3ab/g1-independent-review02.json']],
 ['tmp/rust-r3ab/c-review/corrective-review01.json',['docs/design/rust-r3ab/corrective-review01.json']]
])for(const f of destinations)expect(pin(origin),f);
for(const d of diff)if(!expected.has(d.file))expect(pin(d.file));
const paths=[...expected.keys()].sort(),batch=git(['cat-file','--batch'],root,{input:paths.map(p=>commit+':'+p+'\n').join('')});let offset=0;const hashes=new Map();
for(const file of paths){const end=batch.indexOf(10,offset);assert(end>=offset);const header=batch.subarray(offset,end).toString('ascii');const m=/^([0-9a-f]{40}) blob (\d+)$/.exec(header);assert(m,'Not a normal committed blob '+file+': '+header);const length=Number(m[2]),bytes=batch.subarray(end+1,end+1+length);assert.equal(bytes.length,length);assert.equal(batch[end+1+length],10);offset=end+2+length;const p={file,gitBlob:m[1],bytes:length,rawBytesSha256:sha(bytes)};hashes.set(file,p);const want=expected.get(file);assert.equal(p.bytes,want.bytes,'commit length '+file);assert.equal(p.rawBytesSha256,want.rawBytesSha256,'commit raw hash '+file);}
assert.equal(offset,batch.length);
for(const p of evidence.productionSources){assert.equal(pin(p.file).rawBytesSha256,p.rawBytesSha256);assert.equal(hashes.get(p.file).rawBytesSha256,p.rawBytesSha256);}
const unchangedNativePaths=new Set(manifest.nativeFiles.map(p=>p.file));assert(diff.every(d=>!unchangedNativePaths.has(d.file)));
const oldModified=diff.filter(d=>d.status==='M').map(d=>d.file).sort();assert.deepEqual(oldModified,['.gitattributes','apps/poms-api-rust/src/http.rs','apps/poms-api-rust/src/lib.rs','apps/poms-api-rust/tests/http.rs',...governance].sort());
const oldCheckpoint=git(['show',commit+':docs/design/rust-r3ab/g1-independent-review01.json']).toString('utf8');assert.equal(JSON.parse(oldCheckpoint).decision.result,'Needs-correction');assert.equal(JSON.parse(git(['show',commit+':docs/design/rust-r3ab/g1-independent-review02.json'])).decision.result,'Pass');
for(const file of governance){const before=git(['show',base+':'+file]).toString('utf8'),after=git(['show',commit+':'+file]).toString('utf8');assert(after.startsWith(before),'Existing governance history rewritten '+file);const append=after.slice(before.length);assert(append.includes('R3A/B 联合 G3 Pass'));assert(append.includes('R3暂0/58'));assert(append.includes('#86/#87尚不关闭'));assert(append.includes('#85/#57保持Open'));}
const actualSpecs=[...hashes.keys()].filter(p=>p.startsWith('libs/shared/api-spec/')||p.startsWith('libs/shared/api-client/'));assert(actualSpecs.length>0);
const addedToolOutsideG3Proof=categories.tools.filter(f=>!sourceProof.stagedRawSourceOrFormalInputs.some(p=>p.file===f));assert.deepEqual(addedToolOutsideG3Proof,['tools/rust-r3ab/preserve-evidence.mjs']);
const preservationSource=git(['show',commit+':tools/rust-r3ab/preserve-evidence.mjs']).toString('utf8');assert(preservationSource.includes('COPYFILE_EXCL'));assert(preservationSource.includes('assert(!fs.existsSync(dest))'));assert(!/\b(?:fetch|spawn|process\.kill)\s*\(/.test(preservationSource));
const result={kind:'R3AB-independent-C-fixed-commit-public-blob-verification',createdAt:new Date().toISOString(),result:'Pass',base,commit,commitTree:text(['rev-parse',commit+'^{tree}']),parent:base,branch,localAndPushedBranchRefEqual:true,remoteMainTrackingRef:base,worktreeStatusAtStart,primaryBefore,readOnlyGitBlobInputsChecked:paths.length,NativeFrozenBlobInputs:manifest.nativeFiles.length,formalFrozenInputs:manifest.formalFiles.length,productionBlobsEqualActualG3:15,stagedG3RawBlobsEqual:sourceProof.stagedRawSourceOrFormalInputs.length,originalArchivedPairs:evidence.retainedRawCopies.length,CG3SameByteFormalAndArchiveCopies:true,completeChanges:diff.map(d=>({...d,...hashes.get(d.file)})),counts:Object.fromEntries(Object.entries(categories).map(([k,v])=>[k,v.length])),existingModifiedPaths:oldModified,noDDLNativeContractsSpecClientOrSharedGuardChanges:true,additionalMetadataTool:{file:addedToolOutsideG3Proof[0],rawBytesSha256:hashes.get(addedToolOutsideG3Proof[0]).rawBytesSha256,assessment:'Previously source-reviewed exclusive raw copy/hash preservation only; no actual runtime or product behavior.'},currentCountBeforeG4:0,keepOpen:[85,57],mayFastForwardPrimaryMain:true,mayPushMainExactCommit:true,mayMarkDone:false,G4Certified:false,noActualTestBuildDBHTTPBrowserOrPrivateAccess:true};
fs.writeFileSync('tmp/rust-r3ab/c-review/fixed-commit-public-verification01.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'Pass',commit,commitTree:result.commitTree,changedFiles:diff.length,blobInputsChecked:paths.length,counts:result.counts,productionBlobs:15,mayFFMain:true,G4Certified:false}));
