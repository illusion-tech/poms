// Explicit Root corrective implementation permission; no runtime or business effect.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',H='E:/projects/worktrees/poms-r4h-signals/poms';
const P='/home/wangzishi/.local/share/poms-r4ghi/private',O=R+'/tools/rust-r4ghi/corrective344-g1';
const sha=b=>createHash('sha256').update(b).digest('hex'),physical=f=>f.startsWith('/home/')?'//wsl.localhost/Debian'+f:f.startsWith('/mnt/e/')?'E:/'+f.slice(7):f;
function read(file,digest){const b=fs.readFileSync(physical(file));if(digest)assert.equal(sha(b),digest,file);return b;}
function pin(file,b){return{file,bytes:b.length,rawBytesSha256:sha(b)};}
const [reviewFile,reviewSHA]=process.argv.slice(2);assert(reviewFile&&/^[a-f0-9]{64}$/.test(reviewSHA));
const finalRaw=read(reviewFile,reviewSHA),final=JSON.parse(finalRaw);
assert.equal(final.kind,'non-author-checkpoint344-minimal-plan-scope-review');
assert.equal(final.verdict,'recommended-bounded-two-leaf-code-only-implementation');
assert.equal(final.implementationScopeRecommendationApproved,true);
assert.equal(final.RootExplicitImplementationPermissionStillRequired,true);
assert.equal(final.Source15G1Or14To15ProtocolApproved,false);
const cp=R+'/docs/design/rust-r4ghi/tax-preparation344-corrective-checkpoint.md',cpRaw=read(cp,'4dc6dfa1a697c0e17e471917b6f606c5687c42b7f15a56f3517a9b9c1e35e673');
const hp=H+'/tools/rust-r4ghi/H/implementation/support-patches/tax-preparation344-plan01/manifest-plan344.json',hpRaw=read(hp,'7b8f69556eb4f3e2876f30214c5f082ee440d4ad2c83f8d563128489ff1ef843'),plan=JSON.parse(hpRaw);
assert.equal(plan.kind,'H-author-read-only-minimal-corrective-scheme344');assert.equal(plan.productionCandidates.length,0);
const before=[
 {file:'apps/poms-api-rust/src/project_operating/restatement.rs',sha256:'7251664a65dd189b38ea9349ba6e54b8a2ea84ca307d128e3b01f29ba446890c'},
 {file:'apps/poms-api-rust/src/project_operating/context.rs',sha256:'f0b18b53af2d3288a7b4078f15280a23cc8821a1d2792519733f64d935aaa0ac'}
];for(const p of before)read(R+'/'+p.file,p.sha256);
const archiveFile=P+'/source14-retained-inputs344-01/receipt344.json',archiveRaw=read(archiveFile,'0df8b21ec95ee497feb0c049ecdfea95c7824cdf98b7d6c8363562964717bc77'),archive=JSON.parse(archiveRaw);
assert.equal(archive.treeFileCount,746);assert.equal(archive.Source14StateUnchanged,true);assert.equal(archive.source14StateSequence,24);
assert(!fs.existsSync(O));fs.mkdirSync(O,{recursive:true});
function copy(rel,original,b){const file=O+'/'+rel;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,b,{flag:'wx'});return{original:pin(original,b),retained:pin(file,read(file,sha(b)))};}
const retained=[copy('checkpoint344-frozen.md',cp,cpRaw),copy('H-plan01/manifest-plan344.json',hp,hpRaw),copy('independent-final-review.json',reviewFile,finalRaw)];
for(const p of plan.products){const b=read(p.file,p.rawBytesSha256);assert.equal(b.length,p.bytes);retained.push(copy('H-plan01/'+path.basename(p.file),p.file,b));}
const freeze={kind:'Root-frozen-bounded-corrective-implementation344',recordedAt:new Date().toISOString(),issue:111,jointIssue:110,acceptanceIssue:114,issue57:'OPEN',checkpoint:pin(cp,cpRaw),authorPlan:pin(hp,hpRaw),independentFinalRecommendation:pin(reviewFile,finalRaw),retained,
 implementationGranted:true,implementationOwner:'/root/r4h_engineering',productionFiles:before,tests:'Necessary regression tests only inside the same two production leaves; actual original G1 full regression remains required.',candidateDirectory:H+'/tools/rust-r4ghi/H/implementation/support-patches/tax-preparation344-code01',
 validationScratch:'/home/wangzishi/projects/poms-r4ghi-H344-validation01',validationTarget:'/home/wangzishi/.cache/poms-r4ghi-target-H344',validationBase:pin(archiveFile,archiveRaw),
 allowed:['Copy the fixed Root before bytes into the author proposal directory and produce exactly two candidate Rust leaves with before/after maps.','Copy the already preserved compile inputs into the isolated validation scratch and overlay only those two candidates. Run relevant default Rust unit regressions, fmt and strict Clippy without database opt-in or service startup.','Publish author code/test/manifests as new immutable proposal artifacts.'],
 conditions:['Only inferred AllocationResult roots use actual caller-project projection; preserve complete Catalog peers, explicit roots and foreign real Cost/Tax dependencies.','Use the same complete-source classifier in preview and build. Scan every member before deciding future; empty, missing or invalid source is an error.','All in-window Restatement allocations retain the existing admission path, without FirstPeriod-only policy constraints.','Exclude a future batch only after the existing complete qualifier returns FutureBusiness. An Eligible/future-scan disagreement is an error; never trim a mixed batch.','Prove existing CAS/source-version/locks cover any additional metadata consulted; stop and report a third-leaf need instead of widening silently.','Do not predeclare the actual target count. Close the remaining root enumeration gap and actual preparation on a later genuinely admitted candidate.','Preserve all original G1 regressions and failed/partial labels; code-only permission does not certify business acceptance.'],
 prohibited:['Write Root production or registered H2 files.','Create a live context, alter original state/ownership/SQL/HTTP, run actual prepare or FI, Tax/Main domain commands, API or process signals.','Replace Source14 Reg4/B1/source/binary identities, relabel 341, or implement Source15 without its own frozen G1.','Commit/push, write GitHub state, merge or deploy from the author task.'],
 actualG2:false,RootPromotionGranted:false,Source15AdmissionGranted:false,currentBusinessGate:'Block',newCertified:0,G3Certified:false,G4Certified:false};
const out=O+'/Root-corrective344-freeze.json';fs.writeFileSync(out,JSON.stringify(freeze,null,2)+'\n',{flag:'wx'});
const note='# Root 344 corrective permission\n\nOnly Root-corrective344-freeze.json grants the named author the two-leaf proposal and isolated validation scope. Business acceptance remains blocked. Original 339/341/H2218 and the separate Source15 G1 boundary remain in force.\n';fs.writeFileSync(O+'/README.md',note,{flag:'wx'});
console.log(JSON.stringify({freeze:pin(out,read(out)),implementationOnly:true,RootPromotion:false,actualG2:false,newCertified:0}));
