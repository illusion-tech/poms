// Code-step evidence only. This does not authorize promotion or actual inputs.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),Root='E:/projects/worktrees/poms-r3hijk-next28/poms',sha=x=>createHash('sha256').update(x).digest('hex'),win=x=>x.replace(/^\/mnt\/e\//,'E:/'),linux=x=>x.replaceAll('\\','/').replace(/^E:\//,'/mnt/e/');
const pin=f=>{f=win(f);const s=fs.lstatSync(f);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1);assert.equal(fs.realpathSync(f).replaceAll('\\','/'),path.resolve(f).replaceAll('\\','/'));const b=fs.readFileSync(f);return{file:linux(f),bytes:b.length,rawBytesSha256:sha(b)};};
const hp=pin('E:/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/support-patches/source15-lease-tax121-code03/sealed-code03/manifest-H121-code03.json');assert.equal(hp.rawBytesSha256,'f3933122cb83bbfc91eb9b532cf13b04ea6e682ba69046dd94ee988839793f03');const H=JSON.parse(fs.readFileSync(win(hp.file)));
const gp=pin(Root+'/tools/rust-r4ghi/runtime-recovery121/g1B-current-wire-append01/Root-G1B-current-wire-append01.json');assert.equal(gp.rawBytesSha256,'b4d05c19a867b4f4e1990e36b4a742cd23e00958fb0bae6e7e5725e96cc7b15f');
const original=pin(path.resolve(here,'../independent-H121-code02-review01/review-H121-code02-NOTREADY.json'));assert.equal(original.rawBytesSha256,'f16240c7db5751f1539642b0543709086bae9a6c1995ae685cea3a16792623c3');
const cp=pin(here+'/checks-H03-corrections121-02.json');assert.equal(cp.rawBytesSha256,'480cf053c00f8c59ff0c94fc672db3a1a42e69d80a67f622e7a20354387ca93d');const checks=JSON.parse(fs.readFileSync(win(cp.file)));assert(checks.allPassed&&checks.checks.length===16);
const combo=pin(path.resolve(here,'../implementation/runtime-recovery121-code03/combination-append01/combination-I03-H24.json'));assert.equal(combo.rawBytesSha256,'38637147004660242c0261db6828357c3bb11b9ef2bc924e9ad2ea55b613f439');const combined=JSON.parse(fs.readFileSync(win(combo.file)));assert(combined.sourceStable&&combined.exactFiniteHScope);assert.equal(combined.actualImportedMJS,31);
const nativeReview=pin(Root+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-B-code03-review01/review-Native-B-code03-step121.json');assert.equal(nativeReview.rawBytesSha256,'274f4ebe7469be27bee7bfdcd3369d2a9e21152485ad3d03a6bafaea5b50f87b');
for(const p of H.production)assert.equal(pin(p.candidate.file).rawBytesSha256,p.afterSHA256);for(const p of H.protectedFiles)assert.equal(pin(p.candidateCopy.file).rawBytesSha256,p.before.rawBytesSha256);
const g1base=pin(Root+'/tools/rust-r4ghi/runtime-recovery121/g1B/Root-G1B-121.json'),appends=['g1B-Ctor-append01/Root-G1B-Ctor-append01.json','g1B-policy-append01/Root-G1B-policy-append01.json','g1B-protected261-append01/Root-G1B-protected261-append01.json'].map(n=>pin(Root+'/tools/rust-r4ghi/runtime-recovery121/'+n));
const closed=[
 {id:'H121-IR01',scope:'284 period current-record selector',resolution:'Uses actual current taxContinuation121; old15-null/new121-valid proceeds only to the next model login boundary, while missing new121 rejects.',evidence:cp},
 {id:'H121-IR02',scope:'mixed current facts selector',resolution:'Actual pure export selects taxContinuation121; old15-only and wrong legacy source ID reject. Remaining facts/money/target/ownership functions are raw unchanged.',evidence:cp},
 {id:'H121-IR03',scope:'Two retained original12 clone call sites',resolution:'Both keep original12 equality/birth checks then pass actual current persisted pointer. Exact frozen identity-predicate projection accepts this reference and rejects the equal detached original.',evidence:cp},
 {id:'H121-IR04',scope:'Two custom Node HTTP transports',resolution:'Fixed actual Native current proof precedes real request without awaited work; exact8 private guard binds approved input/op/request/config/native reference. Raw entity/public attempt are durable before postguard; a failure escapes before control removal/reconcile. Original284 TX finally is raw unchanged.',evidence:cp}
];
const review={kind:'non-author-runtime121-finite-code-step',schemaVersion:1,author:'H /root/r4h_engineering',reviewer:'I /root/r4_period_engineering206',reviewerIsAuthor:false,
  componentManifest:hp,technicalG1:gp,parentTechnicalG1:g1base,technicalG1Appends:appends,
  scope:{reviewed:'H03 bounded six-leaf corrections plus inherited H02 adapter review, H24 MOD/18 protected and exact source ABI integration',
    excluded:['I-authored Native algorithms','unchanged old #120 business algorithms','unchanged H Stage/policy algorithms','Root actual source promotion','actual namespace/lease/permissions/business acceptance'],
    NativeDependencyCodeReview:nativeReview,NativeAlgorithmsNotSelfReviewed:true},
  priorReviewPreserved:original,findings:[],closedPriorFindings:closed,
  limitations:[
    'The source prefix/tail checks use explicit local data/control models; they do not create a real namespace or admit a Native success.',
    'The 271 post-response model exercises the actual private approved-input verifier rejection, not a claimed successful original-input registration. It proves guarded stop ordering only.',
    'True229/full55 measurement, holder/API process/readiness/conservation, exact Root publication and successful constructor need separate actual input review.',
    'Retained prepare08e/full67/body0f92 still require fresh current121 complete preparation/physical roots/all peers/CAS equality before any FI. No FI or normal effect is granted here.'
  ],
  verdict:'approved-bounded-step-only',
  entries:H.production.map((p,n)=>({file:p.file,beforeSHA256:p.beforeSHA256,afterSHA256:p.afterSHA256,productPointer:'/production/'+n})),
  checks:{exactSixForwardInverse:true,other18HMODRawEqual:true,final18ProtectedRawEqual:true,totalProduction:24,totalProtected:18,
    independentChecks:cp,independentCheckGroups:16,guardDataMutationCases:9,actualImportCombination:combo,actualImportedMJS:31,staticClosureSources:78,
    sourceStable:true,originalH01H02NotReadyUnmodified:true,harnessAttempt01:pin(here+'/harness-attempt01.json')},
  actualNativePositive:false,actualContext:false,actualNamespace:false,actualHTTP:false,actualSQL:false,RootOrPrivateWritten:false,
  RootPromotionGranted:false,actualG2Authorized:false,actualRuntimeAdmission121:null,actualRuntimeCandidate:null,actualLease:null,G3:false,G4:false};
const out=here+'/review-H121-code03-step121.json';fs.writeFileSync(out,JSON.stringify(review,null,2)+'\n',{flag:'wx'});
const manifest={kind:'I-independent-H121-code03-bounded-review-package',review:pin(out),files:['check-corrections121.mjs','check-corrections121-02.mjs','checks-H03-corrections121.json','checks-H03-corrections121-02.json','harness-attempt01.json','seal-review121.mjs','review-H121-code03-step121.json'].map(n=>pin(here+'/'+n)),
  actualCombination:combo,SourceAuthorityOnly:'non-author bounded code-step; no Root effects/actual G2/G3/G4'};
const mf=here+'/manifest-review-H121-code03.json';fs.writeFileSync(mf,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({review:pin(out),manifest:pin(mf),entries:24,verdict:review.verdict}));
