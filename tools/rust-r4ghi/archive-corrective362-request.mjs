// Archive only code and nonsecret control metadata, never private runtime state/env/auth.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',I='/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private',D=R+'/tools/rust-r4ghi/runtime-recovery121/corrective362-source-request01';assert.equal(process.cwd().replaceAll('\\','/'),R);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),local=f=>f.startsWith('/mnt/e/')?'E:/'+f.slice(7):f.startsWith('/home/')?'//wsl.localhost/Debian'+f:f;
const files=[],load=(name,p)=>{const raw=fs.readFileSync(local(p.file));if(p.bytes!==undefined)assert.equal(raw.length,p.bytes,name);if(p.rawBytesSha256)assert.equal(sha(raw),p.rawBytesSha256,name);files.push({name,original:{...p,bytes:raw.length,rawBytesSha256:sha(raw)},raw});return raw;};
const dir=P+'/runtime121-corrective362-source-inputs/a6e8e1ed-787a-4ab2-9595-eec42b617bfd';
const request=JSON.parse(load('actual-request.json',{file:dir+'/request-exact-review.json',bytes:2906,rawBytesSha256:'8fa4a37af84f31d11d30023b995dafa2b5cda879f8626ee321ea038d4f7e30da'}));
const input=JSON.parse(load('actual-input.json',request.input)),plan=JSON.parse(load('eight-source-plan.json',request.sourcePlan));assert.equal(input.nonce,'a6e8e1ed-787a-4ab2-9595-eec42b617bfd');assert.equal(request.RootApprovalSigned,false);assert.equal(request.sourcePromotionExecuted,false);assert.equal(plan.operations.length,8);
load('operator.mjs.txt',request.operator);load('production6-manifest.json',plan.productionManifest);load('production6-review.json',plan.productionCodeReview);load('data2-manifest.json',plan.dataManifest);load('data2-review.json',plan.dataCodeReview);
for(const[o,index]of plan.operations.map((q,i)=>[q,i]))load('candidate-'+index+'.mjs.txt',o.candidate);
for(const[name,file,bytes,digest]of[
 ['hot3-review.json',I+'/tools/rust-r4ghi/I/implementation/corrective362-hot-independent03/review-hot362-code03.json',9691,'b396daf14001ff2712cfffe19e2368c3c9382859819d60f40e313406079ce9d1'],
 ['control3-review.json',I+'/tools/rust-r4ghi/I/implementation/control362-independent01/review-control362-approved02a.json',11114,'a563fcb1b9a0545901f61dae314f311fdb39fce01a6f09738d69f6e0869131f2'],
 ['combined-review-seal.json',I+'/tools/rust-r4ghi/I/implementation/corrective362-combined-independent01/seal-combined362.json',2304,'3029970cd025d97371f83ac29c5a3d98f21529bb1f9ae9fc036a40ada2063d77'],
 ['hot02-NOTREADY.json',I+'/tools/rust-r4ghi/I/implementation/corrective362-hot-independent02/review-hot362-NOTREADY02.json',8196,'1c10b30390eace3616d5b6abae49b2de6e91badfa3d90fc84d77de155c16a94d'],
 ['hot02-NOTREADY-seal.json',I+'/tools/rust-r4ghi/I/implementation/corrective362-hot-independent02/seal-hot362-NOTREADY02.json',4867,'aee55cb22f090a88c092e88339da697914f719003822a0f6008d915355b7ad28'],
 ['hot02-trailing-hole-counterexample.json',I+'/tools/rust-r4ghi/I/implementation/corrective362-hot-independent02/trailing-hole-counterexample-hot02.json',1475,'c032bf6f7e52c0cd6f8f41807413ae5cd864df3b0c1ab8706eac20005d6652e1'],
 ['hot02-nonenumerable-counterexample.json',I+'/tools/rust-r4ghi/I/implementation/corrective362-hot-independent02/nonenumerable-role-counterexample-hot02.json',1272,'15f3849d7e764d28d765701485d2bb93b16d554591e325cfd4267a7679244002'],
 ['control01-NOTREADY.json',I+'/tools/rust-r4ghi/I/implementation/control362-independent01/review-control362-notready01.json',9224,'344bd89e1504b57c1a1b9a0815f6d6cf3e17d331754ebe7710c962b564e20db1'],
 ['control01-tail-cas-counterexample.json',I+'/tools/rust-r4ghi/I/implementation/control362-independent01/finding-publisher-tail-cas362.json',12321,'d45ce33a66280c4790a792066cfc12a969ffa3373867b47aa1a0ffdc535442df'],
])load(name,{file,bytes,rawBytesSha256:digest});
for(const[name,relative]of [['metadata-command.json','command.json'],['metadata-invocation.json','invocation.json'],['metadata-stdout.json','stdout.log'],['metadata-stderr-empty.log','stderr-private.log']])load(name,{file:R+'/tmp/rust-r4ghi/root/Source362-request-actual01/'+relative});
assert(!fs.existsSync(D));fs.mkdirSync(D,{recursive:true});for(const q of files)fs.writeFileSync(D+'/'+q.name,q.raw,{flag:'wx'});
fs.writeFileSync(D+'/raw-copies-provenance.json',JSON.stringify({kind:'Root-corrective362-code-and-exact-source-request-archive-before-approval',recordedAt:new Date().toISOString(),files:files.map(({raw,...q})=>q),candidateCopies:8,actualRequestPrepared:true,actualRootApprovalSigned:false,sourcePromotionExecuted:false,canonicalStateWritten:false,privateStateOwnershipEnvAuthBodiesCopied:false,businessG3:false,businessG4:false,newCertified:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({archivedFiles:files.length,candidateCopies:8,actualRequestPrepared:true,approvalSigned:false,sourcePromotionExecuted:false,privateBodiesCopied:false}));
