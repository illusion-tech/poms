// Prepare reviewable Issue-first failure checkpoint bodies; no network effects.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',D=R+'/tmp/rust-r4ghi/root/prepare362-failure-online';
assert.equal(process.cwd().replaceAll('\\','/'),R);
const commit='ef6d460d',marker='<!-- POMS-RUNTIME121-PREPARE1899-FAILED-362 -->';
const note=`${marker}
### 当前状态 362：真实准入路径已完成，prepare 因会话余量不足停止

本条取代下文较早状态的“当前”称谓；历史原文及其 as-of 证据保留。Rust 正式 **240**、R4 **67/95**、本批 **32 candidate / 新增业务认证0**，业务 G3/G4 未通过。#57 与完整 R5 #116 保持 OPEN；#119 历史技术 G4/CLOSED 保留。

[实际失败检查点](https://github.com/illusion-tech/poms/blob/${commit}/docs/design/rust-r4ghi/runtime121-real-prepare-G3-checkpoint362.md)与[无凭据原始元数据及独立读回](https://github.com/illusion-tech/poms/tree/${commit}/tools/rust-r4ghi/runtime-recovery121/prepare361-failure-actual01)已提交。nonce1899 单次 prepare-only 于 18:06:06—19:26:22 UTC 退出1，真实 Native constructor、私有 capability、entry 均完成；exit 通过失败校验，journal 已 closed-failed。只产生 CSRF、登录、当前会话三个200；首个业务 GET 未发出，fresh prepared/K/全67、FI、Tax正常命令均未产生，Main13未重放。#121/#118 继续开放。

错误为 Real session expired or too close to deadline。首个业务 GET 的 before snapshot 完成后 idle deadline 仅余7.952秒；之后重复完整校验消耗了余量。发包前 guard 的位置来自源码和原件顺序，原日志没有实际 stack 或 SQL observation time。完整历史证明已有缓存；51次Native fresh及15次Tax扫描为限定源码模型，不冒实测阶段耗时。安全检查与两秒阈值保持。

失败 state14666792/e0d9、ownership7456/eb4a、sequence39已逐字私有保留。真实认证引起 manager cookies/37权限缓存及owned auth_session变化，完整37权限等于预期；原ownership前缀、13/14、旧823/26、旧prepared/full67及Main13原201保全。独立34项只读关系通过证明失败与保全，不能当prepare通过。

下一步是具名技术G3纠正：消除数据accessor和同checkpoint内的重复全检，保留全部源/FD/Facts6/进程/状态谓词；最终真实权限及会话SQL紧贴dispatch并保守核验单调时间余量。设计独审后冻结有限代码输入，再经源和lease续接、真实耗时预算及新nonce具体G2继续；不延长TTL、不清记录、不重试1899。

<!-- /POMS-RUNTIME121-PREPARE1899-FAILED-362 -->`;
for(const n of [121,57]){
  const before=JSON.parse(fs.readFileSync(D+'/'+n+'-before.json'));
  assert.equal(before.number,n);assert.equal(before.state,'open');assert(!before.body.includes(marker));
  const body=note+'\n\n'+before.body;
  fs.writeFileSync(D+'/'+n+'-body-request.json',JSON.stringify({body},null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(D+'/'+n+'-body.md',body,{flag:'wx'});
  fs.writeFileSync(D+'/'+n+'-comment-request.json',JSON.stringify({body:note},null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({preparedIssues:[121,57],actualFailureCommit:commit,networkEffects:false,sourceModified:false,businessCertified:0}));
