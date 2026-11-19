// One-shot Issue-first status synchronization. No application/runtime effects.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',O=R+'/tmp/rust-r4ghi/root/status356-online',repo='repos/illusion-tech/poms';
const sha=b=>createHash('sha256').update(b).digest('hex');
assert(!fs.existsSync(O));fs.mkdirSync(O);
function api(name,url,method='GET',body){
  const args=['api',url];if(body){const file=O+'/'+name+'-input.json';fs.writeFileSync(file,JSON.stringify(body)+'\n',{flag:'wx'});args.push('--method',method,'--input',file);}
  const began=new Date().toISOString(),r=spawnSync('gh',args,{cwd:R,windowsHide:true,encoding:'utf8',timeout:45000,maxBuffer:16*1024*1024});
  fs.writeFileSync(O+'/'+name+'-stdout.json',r.stdout??'',{flag:'wx'});fs.writeFileSync(O+'/'+name+'-stderr.txt',r.stderr??'',{flag:'wx'});
  fs.writeFileSync(O+'/'+name+'-command.json',JSON.stringify({began,ended:new Date().toISOString(),method,url,exitCode:r.status,signal:r.signal,processError:r.error?{name:r.error.name,code:r.error.code??null}:null,blindRetryForbidden:true},null,2)+'\n',{flag:'wx'});
  assert.equal(r.status,0,name+': preserve originals and reconcile before retry');return JSON.parse(r.stdout);
}
const head='c5449620fd51ed868387448064e694d25bb68c2a';assert.equal(api('commit',repo+'/commits/'+head).sha,head);
const raw=fs.readFileSync(R+'/docs/design/rust-r4ghi/continuation-status356.json');assert.equal(sha(raw),'2511beaa5182c8c23f1b13c40ac62ff467c91b4e3a410af7cd7ff5db37940199');
const url='https://github.com/illusion-tech/poms/blob/'+head+'/',marker='<!-- POMS-R4GHI-CURRENT-356 -->';
const section=`

${marker}
### 当前推进状态（356：源码完整图已实际读回，启动预检首停待修订）

Rust正式 **240**，R4交付 **67/95**，本批32项 **新增业务认证0、业务G3/G4未通过**。#57及完整R5 #116保持开放；#119历史技术G4/CLOSED不改写。#121尚未收口、#118仍阻塞，#120后继条件未满足。

[固定状态356](${url}docs/design/rust-r4ghi/continuation-status356.json)及[当前源码与预检结果](${url}docs/design/rust-r4ghi/runtime121-source-actual-result.md)保留实际交付和首停。原33项源码推广及单Native修订已执行，Root8/I05/H03当前41项源码的Git字节与独审候选一致；非作者db3574确认单叶2ebe→5753、其余283项及四份状态/日志书挡不变、无残留partial/锁/暂存。helper229、external55、execution284均为实际完整清单。新composition af8b经非作者24ec元数据读回通过，保留原始登记语义和base18/227/45/七键固定依赖；不是原生运行授权。

真实API启动元数据预检03退出1，在原Reg5与registryBody15重建结果比对处首停。非作者f853纯数据诊断确认：已严格核验的原15 process未传入facts.apiRecord，使重建consumer.process.record缺失；补该原记录后完整Reg5比对相等，错误记录仍拒。下一步只对该历史接线作有限修订和代码独审，再建立新的单Native源安全包、实际图/新输入与预检；失败输入和首停不重放、不改写。

**API尚未启动；API request/Root-review/process/new-env均未生成，Native/current registry/candidate/prepare121仍无。** [A三个实际mode和原卷守恒](${url}docs/design/rust-r4ghi/runtime121-A-conservation-result.md)保留原观测结论和已消费nonce，不主张跨库原子性或当前持续状态。当前源码与元数据进展不计本批32业务认证。

后继仍须同字节API具体G2及真实PID/env/socket/readiness独审、具体FS准入/真实Ctor、fresh prepare121完整peer/CAS/body67同值，再执行新FI、单独唯一正常201和剩余业务验收。原Reg5/B1/process/old15、08e3/full67/body0f92、失败journal及Main13原201均保留。
<!-- /POMS-R4GHI-CURRENT-356 -->
`;
const updates=[];
for(const n of [57,101,110,111,112,113,114,117,118,119,120,121]){
  const before=api(n+'-before',repo+'/issues/'+n),state=n===119?'closed':'open';assert.equal(before.state,state);assert(before.body.includes('<!-- POMS-R4GHI-CURRENT-355 -->'));assert(!before.body.includes(marker));
  let body=before.body.replace(/\n\n<!-- POMS-R4GHI-CURRENT-355 -->[\s\S]*?<!-- \/POMS-R4GHI-CURRENT-355 -->\n/,section);
  if(n===121){
    body=body.replace('（当前以355为准）','（当前以356为准）');
    const code=body.match(/^- \[x\] 有界代码独审：.*$/gm);assert.equal(code?.length,1);body=body.replace(code[0],'- [x] 有界代码独审：Root8/I05/H03已有独立approved-bounded-step-only及41项源码交付；后续发现的原Reg5重建漏字段正作有限修订，不冒实际运行或业务交付。');
    const graph=body.match(/^- \[ \] 实际完整图：.*$/gm);assert.equal(graph?.length,1);body=body.replace(graph[0],'- [x] 实际完整图：原33项及单Native05实际推广、helper229/external55/execution284与Root8逐字节读回通过（db3574）；后继Native修订须重新实际度量，旧图保其时点。');
  }
  assert.notEqual(body,before.body);assert(body.length<65000);const fresh=api(n+'-prewrite',repo+'/issues/'+n);assert.equal(fresh.body,before.body);assert.equal(fresh.comments,before.comments);assert.equal(fresh.state,state);
  api(n+'-patch',repo+'/issues/'+n,'PATCH',{body});const after=api(n+'-readback',repo+'/issues/'+n);assert.equal(after.body,body);assert.equal(after.state,state);updates.push({issue:n,state,bodySHA256:sha(body)});
}
const comment='<!-- RUNTIME121-STATUS356-ACTUAL-SOURCE-PREFLIGHT-STOP -->\n当前41项源码与实际229/55/284完整图已交付并独审读回；真实API元数据预检03在原Reg5重建缺少apiRecord处停止，失败原件和非作者纯数据诊断已保留。[固定状态356]('+url+'docs/design/rust-r4ghi/continuation-status356.json)。API未启动，等待有限修订和新具体源安全输入，不重放旧预检/审批；新增业务认证0，#121/#118/#57/完整R5 #116开放。';
const c=api('121-comment',repo+'/issues/121/comments','POST',{body:comment});assert.equal(api('121-comment-readback',repo+'/issues/comments/'+c.id).body,comment);
const parent='<!-- R4GHI-356-CURRENT-READBACK -->\n12项当前状态已同步读回。[源码实际交付与启动预检首停]('+c.html_url+')：源码229/55/284已有实际证据，API及原生准入仍待完成，正在修订原历史注册重建的漏传字段。Rust240、R4 67/95、新认证0、业务G3/G4未通过；#57与完整R5 #116继续开放。';
const pc=api('57-comment',repo+'/issues/57/comments','POST',{body:parent});assert.equal(api('57-comment-readback',repo+'/issues/comments/'+pc.id).body,parent);assert.equal(api('116-state',repo+'/issues/116').state,'open');
const receipt={kind:'actual-runtime121-source-metadata-preflight-stopped-online-status356',commit:head,statusSHA256:sha(raw),updates,issue121Comment:c.html_url,parentComment:pc.html_url,PGStarted:true,sourcePromotionExecuted:true,APIStarted:false,NativeContextGranted:false,newBusinessCertified:0,businessG3:false,businessG4:false};
fs.writeFileSync(O+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
