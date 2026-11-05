// Independent actual G4: public evidence/current raw files only. No subprocesses,
// private reads, DB/HTTP/Git/GH execution, product edits or foreign entry execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root='E:/projects/worktrees/poms-r3hijk-next28/poms',main='E:/projects/poms';
const out='tools/rust-r4def/independent-final131',archive='docs/design/archive/slices/rust-r4def';
const finalCommit='b11246df4e473a29fdd92485f6179a5112a09f3b';
const ready='e5f13b05a47766a4c6a3aa13b7fc7a39799b3e76',implementation='d6c3cff84dd96c981bab075d3f4aca3e98c76c4b';
const permanentS4='4f0ad88e78622a75b88b4e3cc72aded9da67458a';
const payloadSHA256='38ae4f7e88cfd386a69684dfd7baec62aa948523db04a6a251465800a87f96c0';
assert.equal(path.resolve(process.cwd()).toLowerCase(),path.resolve(root).toLowerCase());
const hash=(a,b)=>createHash(a).update(b).digest('hex'),sha=b=>hash('sha256',b);
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
function safe(f){assert.equal(typeof f,'string');assert(!path.isAbsolute(f)&&!f.includes('..')&&!f.includes('/private/'));return f;}
function rawAt(base,f){const full=path.join(base,safe(f)),s=fs.lstatSync(full);assert(s.isFile()&&!s.isSymbolicLink(),f);assert(fs.realpathSync(full).toLowerCase().startsWith(path.resolve(base).toLowerCase()+path.sep),f);return fs.readFileSync(full);}
const bytes=f=>rawAt(root,f),json=f=>JSON.parse(bytes(f));
const pin=f=>{const b=bytes(f);return{file:f,bytes:b.length,sha256:sha(b)}};
function checkPin(p){const actual=pin(p.file);assert.equal(actual.sha256,p.rawBytesSha256??p.sha256);if(p.bytes!==undefined)assert.equal(actual.bytes,p.bytes);return actual;}
function pointer(doc,p){let v=doc;for(const t of p.slice(1).split('/')){const k=t.replaceAll('~1','/').replaceAll('~0','~');assert(v!=null&&Object.hasOwn(v,k));v=v[k];}return v;}

// Freeze the independently established bounded evidence chain, preserving old
// failed/partial labels and the single Native lint correction, rather than replay.
const priorExpected={
 'g3-final131.json':'5fc5301a86a2cdc0709fb43ed824da797056bfaa3910844424b4e378a9c67094',
 'native161-review131.json':'d1f43dc93d80437296245ee4abc3aff6ca0b85ebf63d5f3a1b75fcb1290cdbf0',
 'fixed167-review131.json':'02fc334fcb9745264765de727f4fda64162ab8ae63cda08ab5056dc54faf840a',
 'archive178-review131.json':'c15f60b70855db3ce75f0c814ef66c8253975ff9ba03e4d66ce989cb88fafe12',
 'payload186-preparation131.json':'07e489fbc58f01edc97ff3ada97d952877af5a1c67ffbed02fbcc80df32b4238',
 'preclose186-final131.json':'e9754ba496e2d6de28a1f9388f17ca1834139d85dfdc8fa7695d73d13570808f',
 'online196-review131.json':'e830b11fd92b630a2520652c8e18e47e8aa143f3f0256ede58e97eb40c8b664a',
 'final-source131.json':'f7167fa943f508e2e551d735257262a61189cf69201551ced75a926021b0e205'
};
for(const [f,h]of Object.entries(priorExpected))assert.equal(pin(out+'/'+f).sha256,h);
const g3=json(out+'/g3-final131.json'),previousOnline=json(out+'/online196-review131.json');
assert(g3.G3Pass&&g3.G3Certified&&g3.terminalCleanupCertified&&g3.findingsP0P1P2.length===0);
assert(previousOnline.allOriginalParentPrefixesAndOldCommentsPreserved&&previousOnline.allFourFinalActualG4SealItemsRemainUnchecked);

// Current product bytes on both worktrees are the 708 independently fixed pins,
// including the entire generated client and the six permanent S4 guard sources.
const source=json(out+'/final-source131.json');
const stageFile='tmp/rust-r4def/root/staged-product163/receipt163.json',stage=json(stageFile);
assert.equal(stage.pins.length,708);
const union=new Map();
for(const p of [...source.product,...source.client,...source.sixS4ProtectedSources]){if(union.has(p.file))assert.equal(union.get(p.file).rawBytesSha256,p.rawBytesSha256);union.set(p.file,p);}
assert.equal(union.size,708);assert.deepEqual([...union.keys()].sort(),stage.pins.map(p=>p.file).sort());
for(const p of stage.pins){const b=bytes(p.file),m=rawAt(main,p.file);assert(b.equals(m),p.file);assert.equal(sha(b),p.currentRawSHA256,p.file);assert.equal(sha(b),union.get(p.file).rawBytesSha256,p.file);assert.equal(b.length,p.bytes);assert.equal(hash('sha1',Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])),p.gitBlob);}
for(const p of source.sixS4ProtectedSources){assert.equal(pin(p.file).sha256,p.literalS4BlobSha256);assert.equal(sha(rawAt(main,p.file)),p.literalS4BlobSha256);}
assert.equal(stage.deleted.length,1);for(const p of stage.deleted){assert(p.absent);assert(!fs.existsSync(path.join(root,p.file)));assert(!fs.existsSync(path.join(main,p.file)));checkPin(p.baseBlob);}

// Actual publisher receipts + the reviewed publisher source establish Git blob
// and FF/ancestry bindings; this reviewer additionally checks every current raw
// archive file against main, all five origin maps and the earlier reviewed pins.
const publicationFile='tmp/rust-r4def/root/metadata250/receipt.json',pub=json(publicationFile);
for(const k of ['metadataCommit','mainCommit','remoteMain'])assert.equal(pub[k],finalCommit);
assert.equal(pub.previousMain,ready);assert(pub.mainIntegrated&&pub.mainClean&&pub.S4Ancestor&&pub.onlyFastForward);
assert.equal(pub.productBindingsUnchanged,708);assert.equal(pub.allArchivedGitBlobsMatchRaw,9200);
assert(pub.temporaryCredentialsRemovedByEachTransport&&!pub.productOrGlobalConfigChanged);
const admissionFile='tmp/rust-r4def/root/metadata250/admission.json',admission=json(admissionFile);
assert.deepEqual(admission,{previous:ready,target:finalCommit,productBindings:708,allArchivedGitBlobsMatchRaw:9200});
for(const [f,ref]of [['a-process.json','refs/heads/codex/poms-r4def-next28'],['b-process.json','refs/heads/main']]){const p=json('tmp/rust-r4def/root/metadata250/'+f);assert.equal(p.exitCode,0);assert.equal(p.error,null);const v=JSON.parse(p.stdout);assert.equal(v.commit,finalCommit);assert.equal(v.ref,ref);assert.equal(v.exitCode,0);assert(v.temporaryCredentialRemoved&&!v.credentialBytesPublished&&!v.globalConfigChanged);}

const mapFiles=[archive+'/archive-origin-map130.json',archive+'/terminal170/origin-map170.json',archive+'/increment180/origin-map180.json',archive+'/online207/origin-map207.json',archive+'/operational249/origin-map249.json'];
const expectedMaps=['34d87feaddef23ace0b5210063794798bcd1a2447b66e432b5db50ba922b3732','1010901196c94c61c5abad96f0f09a7db21cd7733fb03f31447c9690b4a9366f','63a31e5721ed97dc5867d9779a62fc658d061c11c7e24d908e50e26b80d31c66'];
const pinnedEarlier=new Map();
for(const f of [out+'/archive178-review131.json',out+'/preclose186-final131.json',out+'/online196-review131.json'])for(const p of json(f).inputPins??[])pinnedEarlier.set(p.file,p);
let mappedBytes=0;const mapped=new Map(),mapChecks=[];
for(const [i,f]of mapFiles.entries()){if(i<3)assert.equal(pin(f).sha256,expectedMaps[i]);if(pinnedEarlier.has(f))checkPin(pinnedEarlier.get(f));const m=json(f);assert.equal(sha(rawAt(main,f)),pin(f).sha256);for(const p of m.origins){assert(['copy','move'].includes(p.operation));assert(!mapped.has(p.storedAt),p.storedAt);const b=bytes(p.storedAt);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.rawBytesSha256,p.storedAt);assert(b.equals(rawAt(main,p.storedAt)),p.storedAt);mapped.set(p.storedAt,p);mappedBytes+=b.length;}mapChecks.push({...pin(f),entries:m.origins.length});}
assert.deepEqual(mapChecks.map(p=>p.entries),[9079,23,47,38,4]);assert.equal(mapped.size,9191);
function walk(base,f){const full=path.join(base,f),s=fs.lstatSync(full);assert(!s.isSymbolicLink());if(s.isDirectory())return fs.readdirSync(full).sort().flatMap(n=>walk(base,f+'/'+n));assert(s.isFile());return[f];}
const externalBaseline='docs/design/archive/slices/rust-r4def-next30-baseline.md.bin';
const allArchive=[...walk(root,archive),externalBaseline].sort(),mainArchive=[...walk(main,archive),externalBaseline].sort();
assert.deepEqual(allArchive,mainArchive);assert.equal(allArchive.length,9200);
const inventory=[];for(const f of allArchive){const b=bytes(f);assert(b.equals(rawAt(main,f)),f);if(pinnedEarlier.has(f))checkPin(pinnedEarlier.get(f));inventory.push({file:f,bytes:b.length,sha256:sha(b),gitBlob:hash('sha1',Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])),mapped:mapped.has(f)});}
assert([...mapped.keys()].every(f=>allArchive.includes(f)));const controls=inventory.filter(p=>!p.mapped);assert.equal(controls.length,9);
const retainedPrivateProjection=json(archive+'/operational249/origin-map249.json');assert.equal(retainedPrivateProjection.privateEvidenceCopied,false);

// Final's eight current files must be the actual rendered/applied bytes, shared
// by main. Pending actual-G4 fields are honest pre-certificate state, for Seal.
const packageRoot='tools/rust-r4def/F/closeout130';
const appliedFile=packageRoot+'/final-actual207/applied-receipt130.json',applied=json(appliedFile),renderFile=packageRoot+'/final-actual207/writeback130.json',render=json(renderFile);
const factsFile='tools/rust-r4def/closeout/facts-final207.json',facts=json(factsFile);
assert.equal(applied.kind,'R4DEF-closeout130-writeback-applied');assert.equal(applied.stage,'Final');assert.equal(applied.factsRawBytesSha256,pin(factsFile).sha256);assert(same(applied.files,render.files));assert.equal(applied.files.length,8);
for(const p of applied.files){const b=bytes(p.logicalOrigin);assert.equal(sha(b),p.afterRawBytesSha256);assert.equal(b.length,p.bytes);assert(b.equals(rawAt(main,p.logicalOrigin)));assert.equal(pin(packageRoot+'/'+p.candidate).sha256,p.afterRawBytesSha256);}
assert.equal(facts.stage,'Final');assert.equal(facts.implementationCommit,implementation);assert.equal(facts.finalMetadataCommit,null);assert.equal(facts.assertions.finalIndependentActualG4Pass,null);
const deliveryFile='docs/design/rust-r4def-delivery-status.json',delivery=json(deliveryFile);
assert.equal(delivery.stage,'G4OnlineApplied');assert(delivery.G3Certified&&delivery.cleanupCertified&&!delivery.G4Certified&&delivery.finalIndependentActualReviewPending);
assert.equal(delivery.officialRustOperations,240);assert.equal(delivery.technicalRustOperations,240);assert.equal(delivery.officialNewDelivered,30);
assert.deepEqual(delivery.scope,{D:7,E:11,F:12,total:30,existing:28,new:2});
assert.deepEqual(delivery.r4Progress,{delivered:67,total:92,remaining:25,pendingBatch:0,later:{operating:17,acceptanceCompletionArchive:8}});
assert(!delivery.fullR4Complete&&!delivery.fullR4StageAcceptanceComplete);assert.equal(delivery.knownOutOfBatchFollowup.fixedByThisBatch,false);
for(const [k,p]of Object.entries(delivery.currentGateEvidence)){if(k==='independentActualG4'){assert.equal(p.file,null);continue;}checkPin(p);for(const c of p.checks)assert(same(pointer(json(p.file),c.pointer),c.equals));}

// Verify real fixed-range whitespace and Markdown checks, including original
// empty/nonempty stream bytes. Neither is substituted by a retrospective claim.
const checkFiles=['tmp/rust-r4def/root/docs-check208/receipt.json','tmp/rust-r4def/root/diff-check252/receipt.json'];
for(const f of checkFiles){const c=json(f);assert.equal(c.exitCode,0);assert.equal(c.error,null);for(const p of c.pins)checkPin(p);}
assert.equal(json(checkFiles[0]).sourceMutation,false);assert.deepEqual(json(checkFiles[1]).args,['diff','--check',ready,finalCommit]);assert.equal(json(checkFiles[1]).productOrDBMutation,false);

const common='E:/projects/poms/.git';
function ref(name){const f=path.join(common,name);if(fs.existsSync(f))return fs.readFileSync(f,'utf8').trim();const line=fs.readFileSync(path.join(common,'packed-refs'),'utf8').split(/\r?\n/).find(l=>l.endsWith(' '+name));assert(line,name);return line.split(' ')[0];}
const refs={main:ref('refs/heads/main'),feature:ref('refs/heads/codex/poms-r4def-next28'),originMainTracking:ref('refs/remotes/origin/main')};assert(Object.values(refs).every(v=>v===finalCommit));
assert.equal(fs.readFileSync(path.join(common,'HEAD'),'utf8').trim(),'ref: refs/heads/main');

// Fresh G4 gate full responses: exact approved bodies/comments/history, four
// CLOSED/two OPEN, five actual native edges, preserved parent prefix and R2.
const payloadFile='tools/rust-r4def/closeout/payload186/plan186.json',plan=json(payloadFile);assert.equal(pin(payloadFile).sha256,payloadSHA256);
const onlineFile='tmp/rust-r4def/root/online196/receipt196.json',online=json(onlineFile);assert.equal(pin(onlineFile).sha256,'86e73bda9cfaac983a42d3bf38a3246551fe8d72b4e662f2cb79232ad2ebe4b3');
const gateFile='tmp/rust-r4def/root/g4gate251/receipt251.json',gate=json(gateFile);assert.equal(gate.finalMetadataMain,finalCommit);assert(gate.allSixBodyStateCommentGatesMatch&&gate.onlyBatchFourClosed&&gate.parentsRemainOpen&&!gate.IssueMutation);
assert.deepEqual(gate.edges.map(e=>[e.child,e.parent]),plan.requiredEdges);assert.equal(Object.keys(gate.issues).length,6);
const approvedComment=bytes(plan.comment.file).toString();checkPin(plan.comment);const issueChecks=[],gateInputs=[];
for(const n of [107,108,109,106,101,57]){const p=gate.issues[n],actual=json(p.file),original=json('tmp/rust-r4def/root/online196/'+n+'-before.json'),after=json('tmp/rust-r4def/root/online196/'+n+'-after.json'),target=bytes(plan.bodies[n].file).toString(),state=plan.mustRemainOpen.includes(n)?'OPEN':'CLOSED';
 checkPin(p);checkPin(plan.bodies[n]);assert.equal(actual.number,n);assert.equal(actual.state,state);assert.equal(p.state,state);assert.equal(actual.body,target);assert.equal(sha(Buffer.from(actual.body)),p.bodySHA256);assert.equal(p.bodySHA256,plan.bodies[n].rawBytesSha256);assert.equal(actual.comments.length,p.comments);assert.equal(delivery.issues[n],state);
 const comment=actual.comments.filter(c=>c.body===approvedComment);assert.equal(comment.length,1);assert.equal(comment[0].url,online.issues[n].comment);
 for(const old of after.comments){const c=actual.comments.find(c=>c.id===old.id);assert(c&&c.body===old.body&&c.url===old.url);}
 if(state==='OPEN'){const prefix=Buffer.from(original.body);assert.equal(sha(prefix),plan.bodies[n].originalParentPrefixSHA256);assert(Buffer.from(actual.body).subarray(0,prefix.length).equals(prefix));}
 else assert(actual.body.includes('- [ ] Final docs/main、独立actual G4终审与Seal；实际线上收口后由Final同步交付镜像，独立actual G4与Seal完成后才补勾本项。'));
 if(n===57)assert(/- \[ \] 既有R2补缺：[^\n]*initialRoleIds/.test(actual.body));
 issueChecks.push({issue:n,state,bodySHA256:p.bodySHA256,exactApprovedBodyAndComment:true,historicalCommentsRetained:true,comment:comment[0].url,parentOriginalPrefixRetained:state==='OPEN',finalCheckboxStillUnchecked:state==='CLOSED'});gateInputs.push(p.file);
}
for(const e of gate.edges){const f='tmp/rust-r4def/root/g4gate251/'+e.child+'-parent.json',p=json(f);assert.equal(p.number,e.parent);assert.equal(p.state.toUpperCase(),gate.issues[e.parent].state);assert.equal(p.state.toUpperCase(),e.parentState);assert.equal(sha(Buffer.from(p.body)),plan.bodies[e.parent].rawBytesSha256);gateInputs.push(f);}

// The future Seal mirror is separately bounded and not represented as executed.
const mirror270='tools/rust-r4def/post-seal270.mjs',mirror272='tools/rust-r4def/post-seal272.mjs';
assert(!fs.existsSync(path.join(root,'tmp/rust-r4def/root/online270/receipt270.json')));
assert(!fs.existsSync(path.join(root,'tmp/rust-r4def/root/post-seal272-link-guard.json')));
const guardCode=bytes(mirror272).toString();for(const token of ["commit+':'+file","actual,expected","commit+':docs/design/rust-r4def-delivery-status.json'","status.G4Certified,true","status.officialRustOperations,240","await import('./post-seal270.mjs')"])assert(guardCode.includes(token));

const inventoryFile=out+'/archive9200-inventory131.json';
fs.writeFileSync(path.join(root,inventoryFile),JSON.stringify({kind:'independent-actualG4-current-archive-inventory131',reviewedAtUtc:new Date().toISOString(),finalMetadataMain:finalCommit,files:inventory},null,2)+'\n',{flag:'wx'});
const inputs=[...Object.keys(priorExpected).map(f=>out+'/'+f),stageFile,publicationFile,admissionFile,'tmp/rust-r4def/root/metadata250/a-process.json','tmp/rust-r4def/root/metadata250/b-process.json',...mapFiles,appliedFile,renderFile,factsFile,...applied.files.map(p=>p.logicalOrigin),...checkFiles,...checkFiles.flatMap(f=>json(f).pins.map(p=>p.file)),payloadFile,...Object.values(plan.bodies).map(p=>p.file),plan.comment.file,onlineFile,gateFile,...gateInputs,'tools/rust-r4def/metadata-publish240.mjs','tools/rust-r4def/g4-gate251.mjs',mirror270,mirror272];
const inputPins=[...new Set(inputs)].map(f=>{const p=pin(f),dest=path.join(root,out,'g4-final-inputs',f+'.bin');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes(f),{flag:'wx'});return{...p,snapshot:path.relative(root,dest).replaceAll('\\','/')};});
const report={kind:'R4DEF-independent-actual-G4-final-certificate131',reviewedAtUtc:new Date().toISOString(),status:'Pass',G4Pass:true,G4Certified:true,G3Pass:true,
 certifiedScope:{D:7,E:11,F:12,total:30,existingPublicOperations:28,newPublicOperations:2,implementationCommit:implementation,ReadyMetadataMain:ready,FinalMetadataMain:finalCommit,permanentS4,officialRustOperations:240,R4Delivered:67,R4Total:92,R4Remaining:25,fullR4Complete:false,fullR4StageAcceptanceComplete:false,closeOrder:[107,108,109,106],mustRemainOpen:[101,57]},
 implementationAndAcceptance:{currentRootAndMainProductUnion708Exact:true,allGeneratedClient616Covered:true,sixLiteralS4GuardsExact:true,oneOldGeneratedClientModelAbsent:true,boundedIndependentG3Reuse:pin(out+'/g3-final131.json'),effectiveAcceptanceAuthority:'independent89/114/124 bounded reuse and effective artifacts; Root160 cross-epoch existence index is supporting only',Rust:'416 passed/54 ignored; ignored cases are not DB acceptance',Native:'74 suites/863 tests and build50 bounded reuse by identical emitted JS after correction161; current lint161 and tsc161 exit0, only two existing _selection warnings',Admin:'60 suites/417 tests',DBAndObjects:'actual149 committed exact2714 operations, dual fresh baseline noops each DB, 62 backed-up literal object removals, own PG15/owned ports stopped/released; retained private/container/volume',noBusinessReplayForThisReview:true},
 actualFinalPublication:{receipt:pin(publicationFile),mainAndFeatureAndOriginTracking:refs,rawProductBindings:708,allArchivedPublishedGitBlobsMatchRaw:9200,allCurrentRootAndPrimaryRawArchiveBytesEqual:true,actualArchiveMaps:mapChecks,mappedDestinations:9191,mappedBytes,additionalControlFiles:controls.map(p=>p.file),fullInventory:pin(inventoryFile),onlyFastForwardAndS4Ancestor:true,actualPushProcessesExit0:true,mainCleanInActualPublisherReceipt:true},
 actualFinalDocs:{applied:pin(appliedFile),allEightCurrentRootAndMainFilesMatchActualAppliedBytes:true,MarkdownCheck:pin(checkFiles[0]),fixedRangeDiffCheck:pin(checkFiles[1]),currentPreCertificateStatusTruthful:true,pendingG4AndFinalCommitFieldsToBeUpdatedBySeal:true},
 actualOnlineGate:{receipt:pin(gateFile),capturedAt:gate.capturedAt,payloadSHA256,issueChecks,fiveNativeEdges:gate.edges,onlyBatchFourClosed:true,parentsRemainOpen:true,originalParentPrefixesAndR2UncheckedFollowupRetained:true,allHistoricalCommentsRetained:true},
 permissions:{SealGovernanceWritebackAndFixedMetadataCommitMain:true,postSealMirrorApproved:true,postSealMirrorOnlyTheseReviewedSources:[pin(mirror272),pin(mirror270)],permittedMirrorScope:['Four closed child first status paragraphs and pending/count paragraph updated to actual G4/Seal facts','Only the four final actualG4/Seal checkboxes may become checked after Seal proof','Only the managed blocks of OPEN101/57 may mirror240/67of92; preserve original prefix, unfinished checklists and #57 R2 unchecked followup','Add the truthful linked final comment to the six issues and read back all six bodies/comments/states plus five native edges'],executionConditions:['Publish actual Seal main containing this original tools certificate and proof-backed delivery-status.G4Certified=true/officialRustOperations240; product708 and six S4 guards unchanged','Before any post-Seal remote write, run the reviewed272 commit-blob guard with this exact certificate SHA and actual Seal commit; require the committed certificate SHA and committed delivery-status fields, then270 requires remote main exactly the Seal commit','At each issue write require the exact approved186 body and expected CLOSED/OPEN state; stop on unexpected drift; preserve all historical/G1/business text and original parent prefix/R2 unfinished item','Record actual final mirror results and read back six issue bodies/comments/states and all five native edges; preserve actual partial failures and inspect before any narrower continuation, never blindly replay','No extra issue closure, unrelated product change, business SQL/HTTP replay, force-main/reset, deploy/cutover or broader R4/R5 certification is authorized']},
 notYetObservedAtCertification:{SealWriteback:false,SealMainPublication:false,postSeal272CommittedCertificateGuard:false,postSeal270OnlineMirrorAndFinalReadback:false,overallFinalBookkeepingComplete:false},
 retainedBoundaries:[...g3.retainedBoundaries,'Full R4 remains67/92 with25 later operations; #101/#57 remain OPEN','#57 existing R2 createUser(initialRoleIds)500 remains an unchecked out-of-batch followup','D/E official author worktrees archived; F current primary retained after actual App refusal, not falsely called all-three-archived','Original failed/partial checkout, lint50, Git transport, cleanup admission and writer attempts retain their real labels; no retrospective success substitution'],
 findingsP0P1P2:[],inputPins,reviewer:{nonAuthor:true,privateRead:false,DBHTTPGitGHOrForeignEntryExecuted:false,readOnlyGitMetadataFiles:true,productOrOldEvidenceModified:false,writesOnly:out+'/**'}};
const reportFile=out+'/g4-final131.json';fs.writeFileSync(path.join(root,reportFile),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({report:pin(reportFile),G4Pass:true,G4Certified:true,FinalMetadataMain:finalCommit,productBindings708:true,archiveRaw9200:true,closeOrder:report.certifiedScope.closeOrder,mustRemainOpen:report.certifiedScope.mustRemainOpen,SealAndMirrorObserved:false})+'\n');
