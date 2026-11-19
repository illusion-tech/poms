// Mirror the completed status357 receipt. Never repeats remote writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',O=R+'/tmp/rust-r4ghi/root/status357-online',sha=b=>createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(O+'/receipt.json'),r=JSON.parse(raw);
assert.equal(r.kind,'actual-runtime121-status357-asof-source06-host-restart-online-sync');assert.equal(r.updates.length,12);assert.equal(r.APIStarted,false);assert.equal(r.newBusinessCertified,0);
for(const item of r.updates){const result=JSON.parse(fs.readFileSync(O+'/'+item.issue+'-final-readback-stdout.json'));assert.equal(result.state,item.state);assert.equal(sha(result.body),item.bodySHA256);assert(result.body.includes('<!-- POMS-R4GHI-CURRENT-357 -->'));assert.equal(JSON.parse(fs.readFileSync(O+'/'+item.issue+'-final-readback-command.json')).exitCode,0);}
for(const name of ['121-comment-readback','57-comment-readback','116-final-readonly'])assert.equal(JSON.parse(fs.readFileSync(O+'/'+name+'-command.json')).exitCode,0);
assert.equal(JSON.parse(fs.readFileSync(O+'/116-final-readonly-stdout.json')).state,'open');
fs.writeFileSync(R+'/docs/design/rust-r4ghi/continuation-status357-online.json',raw,{flag:'wx'});
const indexFile=R+'/docs/design/rust-r4ghi-delivery-status.json',index=JSON.parse(fs.readFileSync(indexFile));assert.equal(index.latestExecutionStatus,'rust-r4ghi/continuation-status356.json');assert(!index.currentExecution357);
index.latestExecutionStatus='rust-r4ghi/continuation-status357.json';index.currentExecution357={status:'rust-r4ghi/continuation-status357.json',onlineEvidence:'rust-r4ghi/continuation-status357-online.json',sourceCommit:'8db702a50f0b42c9d09492a5f99789e60e56fde2',sourceGraphCounts:{helper:229,external:55,execution:284},sourceReadback:'eb41256a',compositionReadback:'1798e98b',currentPGStarted:false,currentBoot:'a077fa56-73ab-485c-924d-8676f7585f01',currentLogicalConservationObserved:false,historicalAReceiptsPreserved:true,metadataPreflight04:'stopped-preserve-old-holder-boot-mismatch',APIStarted:false,NativeContextGranted:false,currentRuntimeReady:false,newCertified:0,businessG3:false,businessG4:false,parent57:'OPEN',fullR5_116:'OPEN'};fs.writeFileSync(indexFile,JSON.stringify(index,null,2)+'\n');
const trackerFile=R+'/docs/design/phase2-development-execution-tracker.md',old=fs.readFileSync(trackerFile,'utf8');assert(!old.includes('<!-- poms-r4ghi-status357 -->'));
fs.writeFileSync(trackerFile,old+`

<!-- poms-r4ghi-status357 -->

### 2026-11-12 状态357：源码修订已交付，整机重启后运行前置重新验证

[固定状态357](rust-r4ghi/continuation-status357.json)、[源码与当前预检结果](rust-r4ghi/runtime121-source-actual-result.md)及[在线读回](rust-r4ghi/continuation-status357-online.json)保留Source06 actual91a4/eb412、M06 actual9124/1798及当前41项Git源码的实际字节证据。原03历史注册漏字段已修；新04通过该历史重建后，在原保活boot校验处首停。

Windows选定事件和CIM确认整机关机后开机，WSL由3e3e变为a077，原Windows51024/Linux4802/PG6360身份失效。新只读9c3观测确认原CID/镜像/数据卷/端口/PG15/OID目录和四书挡仍在；PG当前exited，本boot逻辑守恒待重验，不能把旧A三mode和原双RO当作当前运行前置。恢复提案保原A7字节及8015历史anchor，另绑新loss，三新nonce/逐exactG2和新owner/PG/双RO后才能进入B；不增加主机配置或开机自启。

[12项Issue同步读回](${r.issue121Comment})，[父#57已维护](${r.parentComment})。API request/review/env/process仍无；Native/Ctor/fresh准备与原批业务验收待完成。Rust240、R4 67/95、本批32candidate、新认证0、业务G3/G4未通过，#57与完整R5 #116开放，#119历史技术G4不改。

<!-- /poms-r4ghi-status357 -->
`);
console.log(JSON.stringify({mirrored357:true,updatesVerified:12,receiptSHA256:sha(raw),currentPGStarted:false,APIStarted:false}));
