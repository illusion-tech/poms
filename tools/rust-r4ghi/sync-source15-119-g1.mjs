import fs from'node:fs';import assert from'node:assert/strict';import{spawnSync}from'node:child_process';import{createHash}from'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',O=R+'/tmp/rust-r4ghi/root/source15-119-online-g1',repo='repos/illusion-tech/poms',commit='4b7554e4a7065dd3a91caad99516a32b951df8c8',sha=b=>createHash('sha256').update(b).digest('hex');
assert(!fs.existsSync(O));fs.mkdirSync(O,{recursive:true});
function api(label,url,method='GET',body){const args=['api',url];if(method!=='GET'){const f=O+'/'+label+'-input.json';fs.writeFileSync(f,JSON.stringify(body)+'\n',{flag:'wx'});args.push('--method',method,'--input',f);}const r=spawnSync('gh',args,{cwd:R,windowsHide:true,encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024});fs.writeFileSync(O+'/'+label+'-stdout.json',r.stdout??'',{flag:'wx'});fs.writeFileSync(O+'/'+label+'-stderr.txt',r.stderr??'',{flag:'wx'});assert.equal(r.status,0,label+': reconcile before retry');return JSON.parse(r.stdout);}
assert.equal(api('remote-commit',repo+'/commits/'+commit).sha,commit);
const before=api('before',repo+'/issues/119');assert.equal(before.state,'open');const original=JSON.parse(fs.readFileSync(R+'/tmp/rust-r4ghi/root/source15-g0/created.json'));assert.equal(before.body,original.body,'Changed Issue body needs reconciliation');
api('comments-before',repo+'/issues/119/comments?per_page=100');
const base='https://github.com/illusion-tech/poms/blob/'+commit+'/';
const body=`<!-- POMS-SOURCE15-G1-CODE-ONLY -->
当前 **Doing（仅隔离代码实施）**，父任务#114、联合批#110、生产纠偏#111；#118原生依赖#119。新增业务操作0，Rust正式240、R4已交付67，本批新增认证0。

Root已冻结[基线](${base}docs/design/rust-r4ghi/source15-admission119-baseline.md)及[唯一代码实施许可](${base}tools/rust-r4ghi/source15-admission119-g1/Root-G1-source15-119.json)（SHA b644c6b493e95126cfec32cf27624938bcaaf52b7c48c9813a93efa344018ffc），采纳[非作者设计建议](${base}tools/rust-r4ghi/independent/final-gates13/source15-g1-proposal119-review01/review-G1-proposal119-02.json) b404be2f… 。proposal02是当前输入，01保留原历史标签。

范围固定14个生产叶＝H3 4ADD＋4MOD、外置6ADD；另4验证叶不入runtime/H3，详见[逐叶表](${base}tools/rust-r4ghi/source15-admission119-g1/proposal02/exact-files02.json)。context及原108/119/252等14保护参照不改；核心贡献222不是最终H3，所有已知后继amendment须在真实publish前组合冻结测量。只准I在独占候选目录实施和隔离Node测试，不准直接写Root/H2或运行真实工具mode。

发布协议固定三具名hash槽、单独bootstrap-only exact G2产生真实B0、最终审件同时绑定scope和确切B0。实际Reg5→B1→state最后激活；builder显式消费已写B1，state atomic no-replace，孤件/冲突/中断保留并停止。Reg5是工具schema5，不是业务R5或M99。

验收清单：

- [x] 原生父子/阻塞关系、精确文件/ABI/审批域、非作者G1建议及Root代码范围冻结。
- [ ] 完成14生产叶＋4验证叶，提供真实源码差分、unit/negative及旧分支回归，经独立代码审。
- [ ] 最终Source14双139×2 raw/xmin/meta/sequence/object、全部auth/ownership/birth及执行原件retention和独审。746叶输入保全已独立通过，不能替代此数据证明。
- [ ] 产品code02最终独审及原G1完整Rust验证，最终source/compile/H3/external组合、独立ROOT15构建/API/Common/readiness和fresh双观察。
- [ ] 独立exact G2、真实B0、最终plan/Reg5/B1/state原子发布与独立实际读回；普通15入口不得冒用旧14 guard。
- [ ] 技术子片独立G3/G4、代码与证据提交后，仅收口本项。

实际15 source/helper/build/API/observation/Reg5/B1/state和实际G2目前全部为空；旧14 prepare失败保留，无FI、Tax正常命令或Main重放。[当前状态345](${base}docs/design/rust-r4ghi/continuation-status345.json)。#118、真实Tax准备/FI/201、H15支持和reader/caller各另冻有限amendment，不在本项实施权内。未变Shared/OAS/SDK/Admin仅精确hash/ABI确认，不重复无关完整套件。

原13/M97/108-M98谱系、339/341、Reg4/B1/H2218及14真实auth均保原件；不重放migration、restore或baseline reset。Main13原一次201不重放。#57、完整业务R5 #116及未完成父子Issue保持开放，未合并main或部署切换。
`;
const pre=api('prewrite',repo+'/issues/119');assert.equal(pre.body,before.body);assert.equal(pre.comments,before.comments);assert.equal(pre.state,'open');api('patch',repo+'/issues/119','PATCH',{body});const after=api('after-body',repo+'/issues/119');assert.equal(after.body,body);assert.equal(after.state,'open');
const commentBody='<!-- SOURCE15-119-G1-FREEZE -->\nRoot完成线上G1冻结：commit `'+commit+'`，freeze `b644c6b493e95126cfec32cf27624938bcaaf52b7c48c9813a93efa344018ffc`。仅14生产叶＋4验证叶的I独占代码实施；Root推广、实际环境操作、Source15实际G2与业务G3/G4均未授权。实际B1/no-replace、三槽/B0及最终完整H3条件见当前基线和Issue清单。Root另明确派发后开始代码；新增认证0，#57开放。';
const c=api('g1-comment',repo+'/issues/119/comments','POST',{body:commentBody}),cr=api('comment-readback',repo+'/issues/comments/'+c.id);assert.equal(cr.body,commentBody);
const children=api('parent-children',repo+'/issues/114/sub_issues');assert.equal(children.filter(x=>x.number===119).length,1);const deps=api('blockers118',repo+'/issues/118/dependencies/blocked_by');assert.equal(deps.filter(x=>x.number===119).length,1);
const receipt={kind:'actual-Source15-119-online-code-G1-readback',commit,issue:119,parent:114,blocks:118,nativeRelationsVerified:true,state:'open',stage:'Doing-code-only',bodySHA256:sha(body),commentURL:c.html_url,freezeSHA256:'b644c6b493e95126cfec32cf27624938bcaaf52b7c48c9813a93efa344018ffc',implementationScopeOnly:true,actualG2:false,newBusinessCertified:0,G3:false,G4:false};fs.writeFileSync(O+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
