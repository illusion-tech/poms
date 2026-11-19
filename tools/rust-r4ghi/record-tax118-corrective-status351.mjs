// Append the actual failed invocation and separately reviewed code02; no effects.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms', H='E:/projects/worktrees/poms-r4h-signals/poms', I='E:/projects/worktrees/poms-r4i-lifecycle/poms';
const P='//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const O=R+'/tools/rust-r4ghi/independent/tax118-corrective-code02';
const sha=b=>createHash('sha256').update(b).digest('hex');
function pin(file,h){const b=fs.readFileSync(file);if(h)assert.equal(sha(b),h,file);return{file,bytes:b.length,rawBytesSha256:sha(b)};}
assert(!fs.existsSync(O));fs.mkdirSync(O,{recursive:true});const copies=[];
function copy(file,target,h){const original=pin(file,h),dest=O+'/'+target;fs.mkdirSync(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});fs.writeFileSync(dest,fs.readFileSync(file),{flag:'wx'});assert.equal(pin(dest).rawBytesSha256,original.rawBytesSha256);copies.push({original,copy:pin(dest)});return original;}
const hb=H+'/tools/rust-r4ghi/H/implementation/independent-tax15-invocation118-code02';
const code=pin(hb+'/review118-code02.json','feff98a01aa0a693c4e60061e41733c5527f0bb5bd4307efc9b193dcc3f9a3ab');
const review=JSON.parse(fs.readFileSync(code.file));assert.equal(review.verdict,'code-ready-for-exact-input-review');assert.equal(review.reviewerIsAuthor,false);
for(const e of fs.readdirSync(hb,{withFileTypes:true}).filter(x=>x.isFile()))copy(hb+'/'+e.name,'H-code02/'+e.name);
const failure=copy(H+'/tools/rust-r4ghi/H/implementation/independent-prepare118-actual-failure01/review-actual-failure-NOTREADY01.json','H-failure01/review-actual-failure-NOTREADY01.json','46065e69e4c8dfb1b290354c4f9a3506ea583e834178f949074ab338d5768101');
for(const [dir,base,hash] of[
 ['independent-tax118-open-reference-audit01','review-open-reference118-code01.json','2d881796ff41b29b4610263ea336b24ca75bce6f243b34ece834f02ef364256a'],
 ['independent-tax118-new8-reference-audit02','review-new8-references118-code02-work.json','6295d1dfeb3c4f3db5117cc1632b02d25b9fb4d74cfb77679d4d221796515008']]){
 const b=I+'/tools/rust-r4ghi/I/'+dir;pin(b+'/'+base,hash);for(const e of fs.readdirSync(b,{withFileTypes:true}).filter(x=>x.isFile()))copy(b+'/'+e.name,'I/'+dir+'/'+e.name);
}
const command=copy(P+'/tax15-prepare118-prepared01/run01/command-receipt.json','actual-failure01/command-receipt.json','16acf217fbbac315d6598dba9f722aa4bbc138f53ba7ef02496d4e52c16eef6c');
copy(P+'/tax15-prepare118-prepared01/run01/stderr.log','actual-failure01/stderr.log');
copy(P+'/business/g2-business15/main01/tax118-invocation-88160fd3-c7d7-439b-89e6-70209be4e3c6/partial.json','actual-failure01/partial.json');
const live=pin(P+'/business/g2-business15/main01/state.json','a6fda93cca0b21d8377254b3bbe7bce80687108cfd67cc1c7380012fef00b7fd');
const own=pin(P+'/business/g2-business15/main01/ownership.jsonl','e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
fs.writeFileSync(O+'/raw-copies-provenance.json',JSON.stringify({kind:'raw-original-evidence-copies-not-new-grants',copies},null,2)+'\n',{flag:'wx'});
const status={kind:'R4-Tax118-actual-first-prepare-failed-code02-independent-ready-status351',recordedAt:new Date().toISOString(),
 Source15Admitted:true,technical119:{state:'CLOSED',G3:true,G4:true,issueG4:'https://github.com/illusion-tech/poms/issues/119#issuecomment-6785021427'},
 actualFirstPrepare:{exitCode:1,command,failureReview:failure,constructorReturned:true,nativeExitAttempted:false,capabilityReturned:false,wireOrAuthOrDBClientPathReached:false,TaxPOST:false,liveState:live,ownership:own,oldAttemptReplayForbidden:true},
 corrective:{manifest:review.manifest,independentCodeReview:code,externalLeaves:8,modified:4,unchanged:4,tests:70,independentTests:70,newActualModes:0,exactNewG2Required:true},
 official:{Rust:240,R4Delivered:67,R4Total:95,batchCandidate:32,newCertified:0},businessG3:false,businessG4:false,parent57:'OPEN',fullR5_116:'OPEN',issues118And120:'OPEN',
 inheritedManifestFieldClarification:'code02 source15Admitted:false is inherited author-code-candidate metadata, not a revocation of completed technical119. actualModesExecutedForCode02 remains0.'};
const f=R+'/docs/design/rust-r4ghi/continuation-status351.json';fs.writeFileSync(f,JSON.stringify(status,null,2)+'\n',{flag:'wx'});
const ix=R+'/docs/design/rust-r4ghi-delivery-status.json',index=JSON.parse(fs.readFileSync(ix));index.date='2026-11-11';index.latestExecutionStatus='rust-r4ghi/continuation-status351.json';index.currentExecution351={status:index.latestExecutionStatus,Source15Admitted:true,firstPrepare:'failed-preserved',code02:'independent-code-ready',newExactG2Required:true,newCertified:0,businessG3:false,businessG4:false};fs.writeFileSync(ix,JSON.stringify(index,null,2)+'\n');
const tr=R+'/docs/design/phase2-development-execution-tracker.md',old=fs.readFileSync(tr,'utf8');assert(!old.includes('<!-- poms-r4ghi-status351 -->'));
fs.writeFileSync(tr,old+'\n\n<!-- poms-r4ghi-status351 -->\n\n### 2026-11-11 状态351：#118首次准备失败保留，code02独审通过\n\n[固定状态351](rust-r4ghi/continuation-status351.json)记录首次实际prepare exit1：真实constructor已返回，但原cap未返回，因此未尝试native exit；缺失sha绑定发生在首个保留expense checkpoint，未到wire/Auth/DB client路径。初始A6/空ownership原字节仍在，旧输入与nonce禁止重试。#119已完成的技术G3/G4保持。\n\n[code02纠偏](rust-r4ghi/tax118-corrective-code02.md)修复两个引用及post-constructor失败出口和主次错留存，八叶边界不变、H3/backend增量0。完整非作者审feff及独立70项通过，只允许进入新exact-input review；必须新nonce/phase/entry及单独G2后才可执行。业务新增认证0、正式Rust240、R4 67/95，#118/#120与业务父子Issue保持开放，#57/完整R5 #116保持开放。350等原快照保留原时点。\n\n<!-- /poms-r4ghi-status351 -->\n');
console.log(JSON.stringify({status:pin(f),copiedEvidenceFiles:copies.length,codeReview:code,newBusinessCertified:0}));
