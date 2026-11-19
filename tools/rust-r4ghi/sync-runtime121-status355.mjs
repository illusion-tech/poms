// One-shot Issue-first actual status update; never restarts or publishes a runtime.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',O=R+'/tmp/rust-r4ghi/root/status355-online',repo='repos/illusion-tech/poms',sha=b=>createHash('sha256').update(b).digest('hex');
assert(!fs.existsSync(O));fs.mkdirSync(O);
function api(name,url,method='GET',body){
  const args=['api',url];if(body){const file=O+'/'+name+'-input.json';fs.writeFileSync(file,JSON.stringify(body)+'\n',{flag:'wx'});args.push('--method',method,'--input',file);}
  const began=new Date().toISOString(),r=spawnSync('gh',args,{cwd:R,windowsHide:true,encoding:'utf8',timeout:45000,maxBuffer:16*1024*1024});
  fs.writeFileSync(O+'/'+name+'-stdout.json',r.stdout??'',{flag:'wx'});fs.writeFileSync(O+'/'+name+'-stderr.txt',r.stderr??'',{flag:'wx'});fs.writeFileSync(O+'/'+name+'-command.json',JSON.stringify({began,ended:new Date().toISOString(),method,url,exitCode:r.status,signal:r.signal,processError:r.error?{name:r.error.name,code:r.error.code??null}:null,blindRetryForbidden:true},null,2)+'\n',{flag:'wx'});
  assert.equal(r.status,0,name+': preserve originals and reconcile before retry');return JSON.parse(r.stdout);
}
const head='58f0fc9c85b6f5ddbc0489993262d029eda09e01';assert.equal(api('commit',repo+'/commits/'+head).sha,head);
const status=fs.readFileSync(R+'/docs/design/rust-r4ghi/continuation-status355.json');assert.equal(sha(status),'60c462e9d87786904d532201647343c45fcab80a6e10e89a6d7065fb47372420');
const url='https://github.com/illusion-tech/poms/blob/'+head+'/',marker='<!-- POMS-R4GHI-CURRENT-355 -->';
const section=`

${marker}
### 当前推进状态（355：原PG恢复与守恒已独审，三个代码组件已独审）

Rust正式 **240**，R4交付 **67/95**，本批32项 **新增业务认证0、业务G3/G4未通过**。#57及完整R5 #116保持开放；#119历史技术G4/CLOSED不改写。#121尚未收口、#118仍阻塞，#120后续业务验收条件未满足。

[固定状态355](${url}docs/design/rust-r4ghi/continuation-status355.json)与[实际原卷守恒结果](${url}docs/design/rust-r4ghi/runtime121-A-conservation-result.md)已提交。A三个mode均已单次实际完成：原holder身份、原CID/镜像/单卷/OID/端口恢复、两库defaultRO＋显式只读事务各139表两次观察。Native542/Rust4394行，三组raw/xmin/key/cells/meta/sequence/objects比对全等；非作者5fd27完整重算834文件/14808行通过。结论仅本次观测时点，不主张跨库原子性或持续数据库状态。三个nonce均已消费，禁止重发；原cgroup警告和早期失败标签保留。

[代码交付与独审原件](${url}docs/design/rust-r4ghi/runtime121-API-code-delivery.md)：I03 274f4e、H03 8816ac、Root8 687b6a均为非作者approved-bounded-step-only。当前/历史记录与真实对象身份、两项custom HTTP pre/post guard、原始env fullPin与真实启动时间等具名纠偏已闭合于代码范围。Root独立55＋9、I独立49＋17及H16组有限检查通过；不是实际namespace正向。原53/2隔离环境失败及两行冻结日志空白的E1保原，不把整体diff检查冒记全通过。

**API仍未启动，实际Native/current registry/candidate/prepare121仍无。** business目录物理数仍227；229 helper/55 external仅候选目标。下一步仅在具体SourceSafety后推广I9＋H24共33叶并实测完整集合，Root8在位逐raw验证；再分别完成同字节API启动exactG2/真实PID-env-socket-readiness读回、原子FS准入与真实Ctor验收、fresh完整prepare121/全部peer/CAS/body67同值及独立读回。之后才可新FI和单独正常一次201，不能用旧prepare/G2或1351 overlay替代新实际前驱。

原Reg5/B1/process/old15整块、08e3/full67/body0f92、7f失败journal及Main13一次201均保留，272源码原像不执行。#121的代码/原PG进展不计为本批32业务交付或G3/G4。
<!-- /POMS-R4GHI-CURRENT-355 -->
`;
const updates=[];
for(const n of [57,101,110,111,112,113,114,117,118,119,120,121]){
  const before=api(n+'-before',repo+'/issues/'+n),state=n===119?'closed':'open';assert.equal(before.state,state);assert(before.body.includes('<!-- POMS-R4GHI-CURRENT-354 -->'));assert(!before.body.includes(marker));
  let body=before.body.replace(/\n\n<!-- POMS-R4GHI-CURRENT-354 -->[\s\S]*?<!-- \/POMS-R4GHI-CURRENT-354 -->\n/,section);
  if(n===121){
    body=body.replace('## 问题与范围','## G0故障事实与范围（历史）');
    body=body.replace('### 实际恢复进展：保活身份通过，原 PG/API 尚未启动','### 历史记录：保活身份读回时点（当前以355为准）');
    const g1=body.match(/^- \[x\] G1：.*$/gm);assert.equal(g1?.length,1);body=body.replace(g1[0],'- [x] G1：A/B、真实构造/视图、固定依赖、current/custom-wire及启动器/原env输入均已具名冻结为有限代码实施。实际B前驱和每步G2/G3/G4仍后置。');
    const implemented=body.match(/^- \[ \] 实现与代码独审：.*$/gm);assert.equal(implemented?.length,1);body=body.replace(implemented[0],'- [x] 有界代码独审：Root8/I03/H03均已独立approved-bounded-step-only，旧失败原件保留；不代表实际完整运行图或业务交付。\n- [ ] 实际完整图：具体SourceSafety后推广33叶并逐项度量helper229/external55，Root8在位核原始字节。');
    const actual=body.match(/^- \[ \] 实际G2与验收：.*$/gm);assert.equal(actual?.length,1);body=body.replace(actual[0],'- [x] A实际G2与验收：三个mode单次完成，原PG及双139表两次raw/xmin/meta/seq/objects守恒经非作者5fd27读回通过，不主张跨库原子性。\n- [ ] B实际G2与验收：同字节新API真实启动/readiness/PID-env-socket、新原生准入、真实Ctor及fresh准备仍待完成。');
  }
  assert.notEqual(body,before.body);assert(body.length<65000);const fresh=api(n+'-prewrite',repo+'/issues/'+n);assert.equal(fresh.body,before.body);assert.equal(fresh.comments,before.comments);assert.equal(fresh.state,state);
  api(n+'-patch',repo+'/issues/'+n,'PATCH',{body});const after=api(n+'-readback',repo+'/issues/'+n);assert.equal(after.body,body);assert.equal(after.state,state);updates.push({issue:n,state,bodySHA256:sha(body)});
}
const comment='<!-- RUNTIME121-STATUS355-ACTUAL-A-CONSERVED -->\nA三个mode实际完成，原PG恢复与双139表两次守恒经非作者5fd27完整读回；Root8/I03/H03三个代码组件独审通过。API/Native/实际22955仍未就绪，33叶SourceSafety及各后继exactG2后置。[固定355]('+url+'docs/design/rust-r4ghi/continuation-status355.json)。新增业务认证0、业务G3/G4未通过，#121/#118/#57/完整R5 #116保持开放。';
const c=api('121-comment',repo+'/issues/121/comments','POST',{body:comment});assert.equal(api('121-comment-readback',repo+'/issues/comments/'+c.id).body,comment);
const parent='<!-- R4GHI-355-CURRENT-READBACK -->\n12项当前状态均已同步读回；[#121原卷守恒与组件代码独审进展]('+c.html_url+')。实际API/新准入及本批业务验收仍后置，Rust240、R4 67/95、新认证0，#57与完整R5 #116继续开放。';
const pc=api('57-comment',repo+'/issues/57/comments','POST',{body:parent});assert.equal(api('57-comment-readback',repo+'/issues/comments/'+pc.id).body,parent);assert.equal(api('116-state',repo+'/issues/116').state,'open');
const receipt={kind:'actual-runtime121-A-conserved-three-code-components-online-status355',commit:head,statusSHA256:sha(status),updates,issue121Comment:c.html_url,parentComment:pc.html_url,PGStarted:true,APIStarted:false,sourcePromotionExecuted:false,NativeContextGranted:false,newBusinessCertified:0,businessG3:false,businessG4:false};fs.writeFileSync(O+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
