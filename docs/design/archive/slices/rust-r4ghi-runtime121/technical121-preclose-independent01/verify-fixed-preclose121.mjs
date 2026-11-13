// Independent read-only checks. Git/FS reads only; no app imports or process probes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms';
const I='E:/projects/worktrees/poms-r4i-lifecycle/poms';
const O=I+'/tools/rust-r4ghi/I/implementation/technical121-preclose-independent01';
const RL='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const H='c10e3aa3829d985ce4bc73109b41a0d77e1d9583';
const A='33646ef44f1b884cd59ec3e4b85a19193eea9eb4';
const sha=b=>createHash('sha256').update(b).digest('hex');
const local=f=>f.startsWith('/mnt/e/')?'E:/'+f.slice(7):f.startsWith('/home/')?'//wsl.localhost/Debian'+f:f;
const json=f=>JSON.parse(fs.readFileSync(local(f)));
const reads=[];
function raw(p){assert.equal(typeof p.file,'string');const file=local(p.file),st=fs.lstatSync(file);assert(st.isFile()&&!st.isSymbolicLink());const b=fs.readFileSync(file);if(p.bytes!==undefined)assert.equal(b.length,p.bytes,p.file+' bytes');assert.equal(sha(b),p.rawBytesSha256,p.file+' sha');reads.push({file:p.file,bytes:b.length,rawBytesSha256:sha(b)});return b;}
const pin=f=>{const b=fs.readFileSync(local(f));return {file:f,bytes:b.length,rawBytesSha256:sha(b)};};
const git=(...args)=>execFileSync('git',['--no-optional-locks',...args],{cwd:R,encoding:null,windowsHide:true,maxBuffer:30*1024*1024});
const txt=(...args)=>git(...args).toString('utf8').trim();
const blob=(commit,f)=>git('cat-file','blob',commit+':'+f);
const blobJSON=(commit,f)=>JSON.parse(blob(commit,f));
assert.equal(txt('rev-parse','HEAD'),H);
assert.equal(txt('rev-parse',H+'^'),A);
assert.equal(txt('ls-remote','--heads','origin','refs/heads/codex/poms-r4ghi-next25').split(/\s+/)[0],H);
const candidateFile='docs/design/archive/slices/rust-r4ghi-runtime121/technical121-preclose-candidate.json';
const candidateBytes=blob(H,candidateFile);assert.equal(candidateBytes.length,4935);assert.equal(sha(candidateBytes),'29470e16181f57a5ef77c73be83c99252149ae1550f87778fc9f3a253bf4e77d');
const c=JSON.parse(candidateBytes);
const formal=c.formalInputs.map(p=>{const b=blob(H,p.file);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.rawBytesSha256);raw({...p,file:RL+'/'+p.file});return p;});
const acceptance=c.actualPrepare;
for(const p of [acceptance.carrier,acceptance.seal]){const b=blob(H,p.file);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.rawBytesSha256);}
const filesA=txt('diff-tree','--no-commit-id','--name-only','-r',A).split('\n');
const filesH=txt('diff-tree','--no-commit-id','--name-only','-r',H).split('\n');
assert.equal(filesA.length,101);assert.equal(filesH.length,4);
const all=[...new Set([...filesA,...filesH])],blobs=[],workingDrift=[];let jsonCount=0;
for(const f of all){const b=blob(H,f);if(f.endsWith('.json')){JSON.parse(b);if(filesA.includes(f))jsonCount++;}const w=fs.readFileSync(R+'/'+f);if(!w.equals(b))workingDrift.push(f);blobs.push({file:f,bytes:b.length,rawBytesSha256:sha(b)});}
assert.equal(jsonCount,67);
assert(all.every(f=>f.startsWith('docs/')||f.startsWith('tools/rust-r4ghi/runtime-recovery121/Tax362-prepare-G2-actual01/')||f.startsWith('tools/rust-r4ghi/runtime-recovery121/prepare362-completed-actual01/')));
// Archive original mappings are verified against fixed Git blobs, not post-review wording edits.
const archives=all.filter(f=>f.startsWith('docs/design/archive/')&&f.endsWith('/archive.json'));
let archivedOriginalPairs=0;
for(const f of archives){const a=blobJSON(H,f);for(const row of a.files){const ob=raw(row.original);const rel=row.archive.file.slice(RL.length+1);const ab=blob(H,rel);assert(ab.equals(ob));assert.equal(row.archive.bytes,ab.length);assert.equal(row.archive.rawBytesSha256,sha(ab));assert.equal(row.rawEqual,true);archivedOriginalPairs++;}}
const provPath='tools/rust-r4ghi/runtime-recovery121/prepare362-completed-actual01/provenance.json';
const provenance=blobJSON(H,provPath);let safeOriginalPairs=0;
for(const row of provenance.files){assert.equal(typeof row.archive,'string');assert.equal(path.posix.basename(row.archive),row.archive);const ob=raw(row.original);const ab=blob(H,path.posix.dirname(provPath)+'/'+row.archive);assert(ab.equals(ob));assert.equal(row.rawEqual,true);safeOriginalPairs++;}
assert.equal(safeOriginalPairs,24);
const phase=json(I+'/tools/rust-r4ghi/I/implementation/runtime121-prepare362-actual-independent01/phase04-final-source-sequence-and-raw.json');
assert.equal(phase.finalRoot8,8);assert.equal(phase.finalSource284,284);
const input=JSON.parse(raw(phase.input));const carrier=JSON.parse(raw(input.codeReview));
assert.equal(input.executionSources.length,8);assert.deepEqual(input.executionSources,carrier.executionSources);
const graphPin=carrier.basis.currentSource362.execution,graph=JSON.parse(raw(graphPin));assert.equal(graph.length,284);
for(const p of graph)raw(p);
for(const p of input.executionSources){raw(p);assert.equal(graph.filter(q=>q.file===p.file&&q.rawBytesSha256===p.rawBytesSha256).length,1);}
const sourceManifest=JSON.parse(raw(input.actualSourcePins)),compileManifest=JSON.parse(raw(input.actualCompilePins)),helperManifest=JSON.parse(raw(input.actualHelperPins));
assert.equal(sourceManifest.length,420);assert.equal(compileManifest.length,528);assert.equal(helperManifest.length,229);
for(const p of [...sourceManifest,...compileManifest])raw({file:RL+'/'+p.file,rawBytesSha256:p.sha256});
// Raw-only private bookends and immutable prefix, no state/actor/cookie decoding.
const P='/home/wangzishi/.local/share/poms-r4ghi/private',B=P+'/business/g2-business15/main01',N='6458f733-0fe1-4b5e-b2ff-076908543af3',RET=P+'/runtime121-prepare362-completed01/'+N;
const statePin={file:RET+'/state-after.json',bytes:15045544,rawBytesSha256:'6c1fabbacebc43fea8636c8fd91afac81dd66e8b6200ca5a769c08ae41401b3b'};
const ownPin={file:RET+'/ownership-after.jsonl',bytes:13016,rawBytesSha256:'1da85861708f1d1c37389385f6c86741e46a7053d5c0eb034260ff8c01aba517'};
const state=raw(statePin),own=raw(ownPin);assert(raw({...statePin,file:B+'/state.json'}).equals(state));assert(raw({...ownPin,file:B+'/ownership.jsonl'}).equals(own));
const ownBeforePin={file:P+'/runtime121-prepare361-failed01/1899fb63-42e3-4bd5-94d2-f1fbd8c57d57/after-ownership.jsonl',bytes:7456,rawBytesSha256:'eb4aa89f5ce253bae776101a66dd06d8cfb5fd4748d69f341dd7059eef5a3989'};
const ownBefore=raw(ownBeforePin);assert(own.subarray(0,ownBefore.length).equals(ownBefore));
raw(input.expectedEntryState);raw(input.apiProcess);
const live=json(O+'/live-readonly-receipts121.json');assert(live.allGETOnly&&live.mutations===0);for(const r of live.requests){assert.equal(r.exitCode,0);raw(r);}
const issues=[121,114,118,120,57,116,119].map(n=>{const x=json(O+'/issue-'+n+'.json');return {number:x.number,state:x.state,updatedAt:x.updated_at,bodySHA256:sha(Buffer.from(x.body)),title:x.title};});
for(const x of issues)assert.equal(x.state,x.number===119?'closed':'open');
const nums=name=>{const x=json(O+'/'+name+'.json');return (Array.isArray(x)?x:[x]).map(i=>i.number);};
assert.deepEqual(nums('parent-121'),[114]);assert.deepEqual(nums('blocked-by-121'),[]);assert.deepEqual(nums('blocking-121'),[118]);assert.deepEqual(nums('blocked-by-118').sort((a,b)=>a-b),[119,121]);assert.deepEqual(nums('blocked-by-120').sort((a,b)=>a-b),[118,119]);
const online=blobJSON(H,'docs/design/rust-r4ghi/runtime121-prepare362-actual-online.json');
for(const row of online.issues){const issue=json(O+'/issue-'+row.number+'.json'),comment=json(O+'/comment-'+row.number+'-actual.json');assert.equal(sha(Buffer.from(issue.body)),row.bodySHA256);assert.equal(sha(Buffer.from(comment.body)),row.commentSHA256);}
const output={kind:'non-author-fixed-technical121-preclose-FS-and-live-input-evidence',recordedAt:new Date().toISOString(),reviewer:'/root/transport358_code_review',fixedHead:H,evidenceCommit:A,candidate:{file:RL+'/'+candidateFile,bytes:candidateBytes.length,rawBytesSha256:sha(candidateBytes)},formalInputs:formal,selectedEvidenceFiles:filesA.length,selectedJSONParsed:jsonCount,headChangedFiles:filesH,allChangedPathsDocumentationOrEvidence:true,fixedBlobInventory:blobs,workingDriftAfterRootAnnouncedWordingCorrection:workingDrift,archivedOriginalPairs,safeOriginalPairs,currentExecutionSources:input.executionSources,currentGraph:graphPin,currentGraphCount:graph.length,sourceManifestCount:sourceManifest.length,compileManifestCount:compileManifest.length,helperManifestCount:helperManifest.length,currentStateOpaque:statePin,currentOwnershipOpaque:ownPin,complete7456OwnershipPrefixPassed:true,currentSourceAndOpaqueBookendsPassed:true,liveIssues:issues,nativeRelations:{parent121:nums('parent-121'),blocking121:nums('blocking-121'),blockedBy118:nums('blocked-by-118'),blockedBy120:nums('blocked-by-120')},onlineMirrorExact:true,liveGETReceipts:pin(O+'/live-readonly-receipts121.json'),readLedger:reads,actualApplicationOrProbeOrStateWrites:0,privateActorStateDecoded:false,continuousResourceLivenessClaimed:false};
const outfile=O+'/evidence-fixed-preclose121.json';fs.writeFileSync(outfile,JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file:outfile,bytes:fs.statSync(outfile).size,rawBytesSha256:sha(fs.readFileSync(outfile)),selected:filesA.length,JSON:jsonCount,archivedOriginalPairs,safeOriginalPairs,graph:graph.length,sources:sourceManifest.length,compile:compileManifest.length,workingDrift,liveMirrorExact:true,opaqueBookendsPassed:true}));
