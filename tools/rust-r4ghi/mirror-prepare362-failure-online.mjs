// Mirror exact online body/comment readbacks, preserving older as-of checkpoints.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',D=R+'/tmp/rust-r4ghi/root/prepare362-failure-online';
assert.equal(process.cwd().replaceAll('\\','/'),R);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=n=>JSON.parse(fs.readFileSync(D+'/'+n));
const issues=[];
for(const n of [121,57]){
  const request=read(n+'-body-request.json'),write=read(n+'-body-write.json'),actual=read(n+'-body-readback.json');
  assert.equal(actual.number,n);assert.equal(actual.state,'open');assert.equal(write.body,request.body);assert.equal(actual.body,request.body);
  const commentRequest=read(n+'-comment-request.json'),commentWrite=read(n+'-comment-write.json'),commentActual=read(n+'-comment-readback.json');
  assert.equal(commentWrite.id,commentActual.id);assert.equal(commentActual.body,commentRequest.body);assert.equal(commentWrite.body,commentRequest.body);
  issues.push({number:n,state:'OPEN',bodyBeforeSHA256:sha(read(n+'-before.json').body),bodyAfterSHA256:sha(actual.body),commentId:commentActual.id,commentURL:commentActual.html_url,bodyAndCommentExactReadback:true});
}
const receipt={kind:'Root-real-prepare1899-failed-checkpoint362-online',recordedAt:new Date().toISOString(),commit:'ef6d460d',issues,realConstructorCapabilityEntryAccepted:true,failedExitVerified:true,nonce:'1899fb63-42e3-4bd5-94d2-f1fbd8c57d57',outerExit:1,closedPhase:'closed-failed',authHTTP200:3,businessGETSent:false,businessPOSTSent:false,freshPrepared:false,K:false,full67:false,FI:false,normalTax:false,MainReplayed:false,stateSHA256:'e0d9ae5799c2c0adaccd98a0b5463915073089d596b7fe768666b9e6e3276a38',ownershipSHA256:'eb4aa89f5ce253bae776101a66dd06d8cfb5fd4748d69f341dd7059eef5a3989',sequence:39,businessG3:false,businessG4:false,newCertified:0,fullR5_116:'OPEN',historical119:'CLOSED'};
const evidence=R+'/docs/design/rust-r4ghi/runtime121-prepare362-failure-online.json',indexFile=R+'/docs/design/rust-r4ghi-delivery-status.json',trackerFile=R+'/docs/design/phase2-development-execution-tracker.md';
assert(!fs.existsSync(evidence));const indexRaw=fs.readFileSync(indexFile),trackerRaw=fs.readFileSync(trackerFile),index=JSON.parse(indexRaw),tracker=trackerRaw.toString('utf8');
assert.equal(index.officialRustOperations,240);assert.equal(index.officialNewDelivered,0);assert.equal(index.r4Progress.delivered,67);assert.equal(index.r4Progress.total,95);assert(!index.prepareFailureCheckpoint362);assert(!tracker.includes('<!-- poms-runtime121-prepare1899-failed-362 -->'));
index.date='2026-11-13';index.currentRuntimeCheckpoint='prepareFailureCheckpoint362';
index.prepareFailureCheckpoint362={...receipt,baseline:'rust-r4ghi/runtime121-real-prepare-G3-checkpoint362.md',onlineEvidence:'rust-r4ghi/runtime121-prepare362-failure-online.json',next:'Freeze minimal technical G3 correction after independent design review; no old-nonce retry. Source/lease handoff, measured real budget and fresh exact G2 still required.'};
const note=`\n\n<!-- poms-runtime121-prepare1899-failed-362 -->\n\n### 2026-11-13 纠正362：真实构造及entry/failed-exit完成，prepare会话余量不足\n\n[真实失败检查点](rust-r4ghi/runtime121-real-prepare-G3-checkpoint362.md)及[在线逐字读回](rust-r4ghi/runtime121-prepare362-failure-online.json)对应[子片#121](${issues[0].commentURL})和[父项#57](${issues[1].commentURL})。nonce1899单次退出1，真实Ctor/cap/entry完成，failed-exit校验并closed-failed；三个认证200后首个业务GET尚未发送。fresh prepared/K/全67、FI、Tax正常命令均未产生，原Main13一次201不重放。\n\n实际after-state e0d9/ownership eb4a/seq39私有保全，真实manager cookies/完整37权限与auth_session来源保留，旧823/26/13/14/原prepared-full67保持。独立34项关系读回仅证明失败与保全。下一步冻结有限技术G3纠正，消除重复全检并把真实会话检查放到发送前，源/lease续接、真实耗时预算及新G2仍后置。官方Rust240、R4 67/95、32 candidate、认证0、业务G3/G4未签；#57/#116开放、#119历史CLOSED。\n\n<!-- /poms-runtime121-prepare1899-failed-362 -->\n`;
assert(fs.readFileSync(indexFile).equals(indexRaw));assert(fs.readFileSync(trackerFile).equals(trackerRaw));
fs.writeFileSync(D+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});fs.writeFileSync(evidence,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});fs.writeFileSync(indexFile,JSON.stringify(index,null,2)+'\n');fs.writeFileSync(trackerFile,tracker+note);
console.log(JSON.stringify({mirrored:true,issues:issues.map(q=>({number:q.number,commentURL:q.commentURL})),realConstructor:true,freshPrepared:false,newCertified:0}));
