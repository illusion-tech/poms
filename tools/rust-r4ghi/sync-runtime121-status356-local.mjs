// Mirror the completed online receipt; never replay online writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',O=R+'/tmp/rust-r4ghi/root/status356-online';
const sha=b=>createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(O+'/receipt.json'),r=JSON.parse(raw);
assert.equal(r.kind,'actual-runtime121-source-metadata-preflight-stopped-online-status356');assert.equal(r.updates.length,12);assert.equal(r.APIStarted,false);assert.equal(r.newBusinessCertified,0);
for(const item of r.updates){const body=JSON.parse(fs.readFileSync(O+'/'+item.issue+'-readback-stdout.json'));assert.equal(body.state,item.state);assert.equal(sha(body.body),item.bodySHA256);assert(body.body.includes('<!-- POMS-R4GHI-CURRENT-356 -->'));assert.equal(JSON.parse(fs.readFileSync(O+'/'+item.issue+'-readback-command.json')).exitCode,0);}
for(const name of ['121-comment-readback','57-comment-readback','116-state'])assert.equal(JSON.parse(fs.readFileSync(O+'/'+name+'-command.json')).exitCode,0);
assert.equal(JSON.parse(fs.readFileSync(O+'/116-state-stdout.json')).state,'open');
fs.writeFileSync(R+'/docs/design/rust-r4ghi/continuation-status356-online.json',raw,{flag:'wx'});
const indexFile=R+'/docs/design/rust-r4ghi-delivery-status.json',index=JSON.parse(fs.readFileSync(indexFile));assert.equal(index.latestExecutionStatus,'rust-r4ghi/continuation-status355.json');assert(!index.currentExecution356);
index.latestExecutionStatus='rust-r4ghi/continuation-status356.json';index.currentExecution356={status:'rust-r4ghi/continuation-status356.json',onlineEvidence:'rust-r4ghi/continuation-status356-online.json',sourceCommit:'fb6e6630a9b109cb9804643a62320447bb764228',physicalHelperDirectoryCount:229,actualSourceGraphCounts:{helper:229,external:55,execution:284},actualSourceReadback:'db3574f7',actualCompositionReadback:'24ec0f6c',APIStarted:false,NativeContextGranted:false,currentRuntimeReady:false,metadataPreflight03:'stopped-preserve-Reg5-facts-apiRecord-omission',newCertified:0,businessG3:false,businessG4:false,parent57:'OPEN',fullR5_116:'OPEN'};fs.writeFileSync(indexFile,JSON.stringify(index,null,2)+'\n');
const trackerFile=R+'/docs/design/phase2-development-execution-tracker.md',old=fs.readFileSync(trackerFile,'utf8');assert(!old.includes('<!-- poms-r4ghi-status356 -->'));
const text=`

<!-- poms-r4ghi-status356 -->

### 2026-11-12 状态356：源码完整图实际读回，启动预检首停待修订

[固定状态356](rust-r4ghi/continuation-status356.json)、[源码实际结果](rust-r4ghi/runtime121-source-actual-result.md)和[在线读回](rust-r4ghi/continuation-status356-online.json)保留原33项与单Native源码推广、当前41项Git原始字节核验以及真实229/55/284完整图；非作者db3574源码读回及24ec元数据composition读回通过，原像、失败输入和书挡保留。

真实启动元数据预检03退出1，首停于原Reg5重建：已核验的原15 process未传入facts.apiRecord。非作者f853纯数据对照确认补该原记录后完整Reg5一致，错误记录仍拒；正在有限修订。API request、Root-review、API process和新env未生成，后继须新具体源安全包与实际图/输入，不重放失败预检或已消费审批。

[12项Issue已同步读回](${r.issue121Comment})，[父#57已维护](${r.parentComment})。API启动G2、真实进程与原生准入/Ctor、fresh prepare121/body67及原批业务验收仍待完成。Rust240、R4 67/95、新认证0、业务G3/G4未通过，#57和完整R5 #116开放，#119历史技术G4不改。

<!-- /poms-r4ghi-status356 -->
`;
fs.writeFileSync(trackerFile,old+text);
console.log(JSON.stringify({onlineReceiptSHA256:sha(raw),mirrored356:true,individualReadbacksVerified:12,outerPollUnknownReconciledByDurableReceipt:true,APIStarted:false}));
