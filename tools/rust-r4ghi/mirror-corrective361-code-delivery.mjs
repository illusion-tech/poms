// Mirror exact online code-delivery comments, not execution authority.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',O=R+'/tmp/rust-r4ghi/root/corrective361-code-ready-online';
assert.equal(process.cwd().replaceAll('\\','/'),R);
const raw=fs.readFileSync(O+'/receipt.json'),receipt=JSON.parse(raw);
assert.equal(receipt.kind,'Root-corrective361-code-delivery-online-readback');assert.equal(receipt.bothBodiesExactReadback,true);
for(const n of [121,57])assert.equal(fs.readFileSync(O+'/'+n+'-body.md','utf8'),JSON.parse(fs.readFileSync(O+'/'+n+'-readback.json')).body);
for(const k of ['RootApprovalSigned','sourcePromotionExecuted','stateHandoffExecuted','businessG3','businessG4'])assert.equal(receipt[k],false);
const indexFile=R+'/docs/design/rust-r4ghi-delivery-status.json',trackerFile=R+'/docs/design/phase2-development-execution-tracker.md',evidence=R+'/docs/design/rust-r4ghi/runtime121-corrective361-code-delivery-online.json';
assert(!fs.existsSync(evidence));const beforeIndex=fs.readFileSync(indexFile),beforeTracker=fs.readFileSync(trackerFile),index=JSON.parse(beforeIndex),tracker=beforeTracker.toString('utf8');
assert(index.currentCorrectiveInput361);assert(!index.codeDeliveryCheckpoint361);assert(!tracker.includes('<!-- poms-runtime121-corrective361-code-delivery -->'));
index.codeDeliveryCheckpoint361={kind:'immutable-code-delivery-before-source-promotion',asOf:receipt.recordedAt,commit:receipt.commit,delivery:'rust-r4ghi/runtime121-corrective361-source-delivery.md',onlineEvidence:'rust-r4ghi/runtime121-corrective361-code-delivery-online.json',request:'tools/rust-r4ghi/runtime-recovery121/corrective361-source-request01/actual-request.json',requestSHA256:'681ea4a9af1f19c45ca740e65993cb39340fcd8ad30efb339ec821e62faed08f',fourCodeReviewSHA256:'63d2f46d655b85f33b03933bc0298506a7d5caa229c75d1734e0a5299c3cbca4',dataCodeReviewSHA256:'35e79639cdafc561f699d2ce8b1baf2d6ae1a0dc9b3350110d46ca29f4d5eb75',independentCodeReady:true,RootApprovalSigned:false,sourcePromotionExecuted:false,stateHandoffExecuted:false,newCertified:0,businessG3:false,businessG4:false};
const note=`\n\n<!-- poms-runtime121-corrective361-code-delivery -->\n\n### 2026-11-13 纠正361：代码交付与具体六源请求\n\n[独立代码交付及实际请求](rust-r4ghi/runtime121-corrective361-source-delivery.md)已提交推送873dbc5b；[在线逐字读回](rust-r4ghi/runtime121-corrective361-code-delivery-online.json)对应[子片#121](${receipt.issue121Comment})及[父项#57](${receipt.issue57Comment})。四叶、两data及提升工具独审通过；真实旧284与固定六源当前before仍匹配。Root metadata-only生成request退出0，具体nonce a3d3040f-54ce-4f37-85ea-1aaacb18fe0d，input1117/cccfd8ef，request2901/681ea4a9。\n\n本条固定为源提升前检查点：Root审批未签、生产源及canonical state未写，状态续接和实际模式尚未执行。须精确source peer后另签Root，仅准四生产MOD和两图外dataMOD，再独立核真实新229/55/284及保留280。旧M06、823失败、32bd、旧26和原Main13一次201保持；业务G3/G4与新增认证0不变，#57/#116开放、#119历史CLOSED。\n\n<!-- /poms-runtime121-corrective361-code-delivery -->\n`;
assert(fs.readFileSync(indexFile).equals(beforeIndex));assert(fs.readFileSync(trackerFile).equals(beforeTracker));
fs.writeFileSync(evidence,raw,{flag:'wx'});fs.writeFileSync(indexFile,JSON.stringify(index,null,2)+'\n');fs.writeFileSync(trackerFile,tracker+note);
console.log(JSON.stringify({mirroredCodeDelivery361:true,sourcePromotionExecuted:false,stateHandoffExecuted:false,businessG3:false,businessG4:false}));
