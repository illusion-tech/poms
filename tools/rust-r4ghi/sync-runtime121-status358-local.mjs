// Mirror completed status358 remote evidence; never reruns remote writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',O=R+'/tmp/rust-r4ghi/root/status358-online',sha=b=>createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(O+'/receipt.json'),r=JSON.parse(raw);assert.equal(r.kind,'actual-runtime121-status358-stable-holder-policy-online-sync');assert.equal(r.updates.length,12);assert.equal(r.APIStarted,false);assert.equal(r.prior357RecoveryNeverExecuted,true);assert.equal(r.newBusinessCertified,0);
for(const item of r.updates){const a=JSON.parse(fs.readFileSync(O+'/'+item.issue+'-final-readback-stdout.json'));assert.equal(a.state,item.state);assert.equal(sha(a.body),item.bodySHA256);assert(a.body.includes('<!-- POMS-R4GHI-CURRENT-358 -->'));assert.equal(JSON.parse(fs.readFileSync(O+'/'+item.issue+'-final-readback-command.json')).exitCode,0);}
for(const name of ['121-comment-readback','57-comment-readback','116-final-readonly'])assert.equal(JSON.parse(fs.readFileSync(O+'/'+name+'-command.json')).exitCode,0);assert.equal(JSON.parse(fs.readFileSync(O+'/116-final-readonly-stdout.json')).state,'open');
fs.writeFileSync(R+'/docs/design/rust-r4ghi/continuation-status358-online.json',raw,{flag:'wx'});
const indexFile=R+'/docs/design/rust-r4ghi-delivery-status.json',index=JSON.parse(fs.readFileSync(indexFile));assert.equal(index.latestExecutionStatus,'rust-r4ghi/continuation-status357.json');assert(!index.currentExecution358);
index.latestExecutionStatus='rust-r4ghi/continuation-status358.json';index.currentExecution358={status:'rust-r4ghi/continuation-status358.json',onlineEvidence:'rust-r4ghi/continuation-status358-online.json',stablePolicy:'runtime-recovery121/g1A-transport358-policy01/Root-G1A-holder-transport-policy358.json',policySHA256:'3082f94a4f0c1a6cb0de7f807c24c32b534722369690f2c873a5dbc8b75b4be6',codeImplementationGranted:true,actualG2Authorized:false,implementationPending:true,sourceGraphCounts:{helper:229,external:55,execution:284},prior357NeverExecuted:true,observedBootIsNotFutureRuntimeAuthority:true,currentPGStarted:false,currentLogicalConservationObserved:false,APIStarted:false,NativeContextGranted:false,newCertified:0,businessG3:false,businessG4:false,parent57:'OPEN',fullR5_116:'OPEN'};fs.writeFileSync(indexFile,JSON.stringify(index,null,2)+'\n');
const trackerFile=R+'/docs/design/phase2-development-execution-tracker.md',old=fs.readFileSync(trackerFile,'utf8');assert(!old.includes('<!-- poms-r4ghi-status358 -->'));
fs.writeFileSync(trackerFile,old+`

<!-- poms-r4ghi-status358 -->

### 2026-11-12 状态358：稳定保活协议冻结，逐轮实测绑定后置

[固定状态358](rust-r4ghi/continuation-status358.json)、[稳定协议G1](rust-r4ghi/runtime121-transport358-G1-policy.md)及[在线读回](rust-r4ghi/continuation-status358-online.json)保留357输入与适配从未执行的事实。新的主机／运行时目录及WSL观察boot变化不再写死源码；可信字节、原脚本、有限命令、原A15/Root12/四键bundle和A7/Root8/Native/284不放宽。

G1Policy3082经独审1489仅授1生产源和1验证文件代码实施。holder实际执行时捕获before/after/ready boot并真实核验owned Linux身份后才写generic成功；current-round与每次exactG2另绑实际路径/loss/source/review，PG/RO仍绑定已验证liveholderboot逐freshnonce/G2。原CID/卷/PG15/OID/四书挡保持，PG当前exited，新boot逻辑守恒尚未重验，API和Native/Ctor未建立。

[12项Issue已同步读回](${r.issue121Comment})，[父#57已维护](${r.parentComment})。旧A验收、旧失败和未执行标签保原，不能替代本轮实际前驱。Rust240、R4 67/95、本批32candidate、新认证0、业务G3/G4未通过；#57与完整R5 #116开放，#119历史技术G4不改。

<!-- /poms-r4ghi-status358 -->
`);
console.log(JSON.stringify({mirrored358:true,updatesVerified:12,receiptSHA256:sha(raw),actualG2Authorized:false,APIStarted:false}));
