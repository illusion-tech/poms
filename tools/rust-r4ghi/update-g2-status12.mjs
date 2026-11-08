// Current issue state only. Does not close issues or grant G3/G4.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const out='tmp/rust-r4ghi/root/g2-online-status12',repo='repos/illusion-tech/poms';
const commit='aade230d1c86efd4b885e51bd2b6226160bea6b1',base='https://github.com/illusion-tech/poms/blob/'+commit+'/';
const sha=v=>createHash('sha256').update(v).digest('hex');
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
async function api(name,endpoint,body){
 const args=['api',endpoint];
 if(body){const f=out+'/'+name+'-input.json';fs.writeFileSync(f,JSON.stringify(body)+'\n',{flag:'wx',mode:0o600});args.push('--method','PATCH','--input',f);}
 const r=await new Promise((resolve,reject)=>{const c=spawn('gh',args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const timer=setTimeout(()=>{c.kill();reject(new Error('Bounded request timed out; inspect original before any retry'));},45000);c.stdout.setEncoding('utf8');c.stderr.setEncoding('utf8');c.stdout.on('data',v=>stdout+=v);c.stderr.on('data',v=>stderr+=v);c.once('error',e=>{clearTimeout(timer);reject(e);});c.once('exit',status=>{clearTimeout(timer);resolve({status,stdout,stderr});});});
 fs.writeFileSync(out+'/'+name+'-stdout.json',r.stdout,{flag:'wx',mode:0o600});fs.writeFileSync(out+'/'+name+'-stderr.log',r.stderr,{flag:'wx',mode:0o600});assert.equal(r.status,0,'Inspect original; no blind mutation retry');return JSON.parse(r.stdout);
}
const initial=await Promise.allSettled([api('main',repo+'/branches/main'),api('children110',repo+'/issues/110/sub_issues'),api('publishedCommit',repo+'/commits/'+commit),api('parent116',repo+'/issues/116'),api('closed115',repo+'/issues/115')]);
for(const r of initial)assert.equal(r.status,'fulfilled');
assert.equal(initial[0].value.commit.sha,'d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5');assert.equal(initial[2].value.sha,commit);
for(const n of [111,112,113,114])assert(initial[1].value.some(v=>v.number===n));assert.equal(initial[3].value.state,'open');assert.equal(initial[4].value.state,'closed');
const common=`状态：**Doing / OPEN；联合G1仍为32项，G2继续，G3 Pending / G4 false**。2026-11-09（Asia/Tokyo）。

正式Rust **240**，R4正式 **67/95**、余28，本批新增认证 **0**。Runtime272与canonical296 operations／242 paths／690 schemas各自保留口径。

[最新工作分支检查点](${base}docs/design/rust-r4ghi/current-progress248.json)为aade230d；main仍d5c79b26，没有合并、部署或切流。当前实际仍Source13/API136、416产品输入、M98、每库139表；原M97业务基线未重置，原候选和成功、失败、partial标签保留。

已完成的真实技术与业务事实：

- Source13 Rust实际镜像四条检查exit0、535通过及54历史忽略；正常双库M98、旧业务raw/xmin保留、五项冻结参与人负控及Native lint/build通过。此前[独立技术审计](${base}tools/rust-r4ghi/independent/final-gates13/actual13-facts01.md)不替代业务G3/G4。
- exact共享来源58通过独立119工具/资源sidecar准入。H0原195文件和R3原身份保留；当前H1为198文件，完整26文件211通过后重新发布119/B2。第一次发布后的209/211失败、测试夹具纠正、显式元数据撤回及再发布原件完整保留。
- [119/B2独立检查点](${base}tools/rust-r4ghi/independent/final-gates13/tool119-checkpoint243/checkpoint243.md)核对真实发布与发布窗口双库139表raw/xmin、序列、对象守恒。该守恒只覆盖发布窗口，之后Main已发生真实业务提交。
- Main经营快照实际一次201、后置条件已核验。保留原producer与HTTP原件，成功命令不重发。
- 已自然跨过香港11月9日零点；保留真实来源，没有调时钟或回填来源。Receiver真实2026-W45原准备eligible；Main原准备缺成本分类；MAX容量超限partial仍不作正向。尚无期末POST。

当前发现与补缺：

- Tax显式TaxRef准备返回服务器5个目标，日期推导工具仅得2；准备已在任何FI或正常Tax POST前停止。两名独立复核已定位：旧Stage仍active，但父Cost已replaced，被错误自动推为late root；历史批图因此拉入3个day07目标。GET/POST共用此服务端闭包，不能客户端删目标。
- 最小Rust修正只收紧Stage自动root的真实当前父Cost资格；保留显式历史roots、历史完整批追踪、同项目/业务日的真实晚到发现及合法独立manual Tax。249候选已封，完整检查与独立审查继续。需要新Source14真实source/binary/process及同M98 retained-data准入；不能热换当前416/198，不能重标旧108/119或重放迁移。
- H01/20%/H04独立真实项目链路正在验收，尚无本批认证；EO仍保留原2项权限。Tax与H46完成后再做最小权限49、传递Labor遮罩和必要敏感审计。
- Tax实际完整闭包FI/一次同体提交通过后，再执行真实合格期末创建/读取及期间遮罩；继续完整批次实时＋期间修正、legacy/modern真实父锁竞争及统一影响面。工具准备或纯回归均不计实际业务完成。
- 历史首次补关选包策略仍待用户裁决；目前只核真实来源并在不能证明时阻断，没有批准自动重选历史预算。当前真实W45合格基线不依赖自动历史选择。

统一候选完成剩余验收、独立G3/G4和精确保全清理后，才增加正式交付并收口满足条件的子项。#115保持独立CLOSED；#57/#101/#110及未完成子项、#116继续OPEN。
`;
const checks={
57:'- [x] R0–R3按各阶段G4收口\n- [ ] R4 #101：余28项联合验收与完整阶段收口\n- [ ] R5 #116：最小依赖不代表完整提成链\n- [ ] R6迁移发布与回滚演练\n- [ ] R7正式切换及旧后端退出',
101:'- [x] R4正式67项及余28项联合最小R5四项G1\n- [x] Source12真实表单与原候选保全\n- [x] Source13构建、正常M98/schema3及119/H1/B2\n- [x] Main真实经营快照一次201与独立事实核验\n- [ ] Stage自动root纠偏的新候选、Tax及H/Labor完整影响面\n- [ ] 真实期末与统一独立G3/G4',
110:'- [x] 联合G1精确32项\n- [x] Source12真实表单及原候选保全\n- [x] Source13实际535/211、Native检查、正常双库M98\n- [x] 原M97基线、schema3及五项冻结负控\n- [x] 119/H1/B2显式工具与资源准入及Main一次201\n- [ ] Stage父生命周期纠偏、Tax完整闭包及H/Labor/权限\n- [ ] 真实期末、完整批次/legacy竞争及统一独立G3/G4',
111:'- [x] G9联合G1及原102FI\n- [x] 真实金额/重述、Stage87完整共享批FI及capture竞争\n- [x] Source13历史来源/Tax根/跨项目父闭包及构建\n- [x] exact58准入及Main真实一次201\n- [ ] Stage自动历史根纠偏、新候选同M98准入及Tax真实闭包FI/提交\n- [ ] 真实期末与完整批次/legacy竞争及独立G3/G4',
112:'- [x] H8联合G1及原金额和四阶段输出\n- [x] 敏感GET必要审计失败整体回滚\n- [x] 真实H08质性复核及首阶段闸门UI\n- [ ] H01/20%/H04真实规则边界结论\n- [ ] EO真实最小权限、传递Labor及期间遮罩\n- [ ] 新候选联合验收及独立G3/G4',
113:'- [x] I11/R5最小依赖G1及原45FI/8成功\n- [x] 首派/归属/编辑、本人条件关闭及同/不同任务CAS\n- [x] 三材料真实上传及验收/完工/归档UI\n- [x] 正常M98及五项冻结父锁回滚负控\n- [x] Source13构建及原基线保留的schema3\n- [ ] 新候选影响面联合验收及独立G3/G4',
114:'- [x] 联合G1及历次候选保全\n- [x] Stage87共享竞争、Native17及原生会话清理守恒\n- [x] Source12真实表单续验及独立raw/ledger审计\n- [x] Source13/M98/schema3/119技术审计及Main201\n- [ ] Stage纠偏/新候选、Tax及H/Labor/权限\n- [ ] 真实期末、完整批次/legacy竞争、独立G3/G4及清理读回',
117:'- [x] 最小角色四项联合G1\n- [x] 真实create/freeze UI及公开freeze/revised-create竞争\n- [x] 冻结冷读、零权重职责及五项父锁负控\n- [x] 正常M98及Source13/schema3\n- [ ] 新候选影响面联合验收及独立G3/G4'
};
const targets=[57,101,110,111,112,113,114,117];
const reads=await Promise.allSettled(targets.map(async number=>{const before=await api('before-'+number,repo+'/issues/'+number);assert.equal(before.state,'open');for(let p=1;p<=Math.max(1,Math.ceil(before.comments/100));p++)await api('comments-'+number+'-'+p,repo+'/issues/'+number+'/comments?per_page=100&page='+p);let tail=before.body??'';const m=/^(<!-- poms-r4ghi-g2-current\d+ -->)/.exec(tail);if(m){const end=m[1].replace('<!-- ','<!-- /'),at=tail.indexOf(end);assert(at>=0);tail=tail.slice(at+end.length);}const body='<!-- poms-r4ghi-g2-current12 -->\n\n'+common+'\n'+checks[number]+'\n\n<!-- /poms-r4ghi-g2-current12 -->'+tail;assert(body.length<65000);return{number,beforeBody:before.body,body};}));
for(const r of reads)assert.equal(r.status,'fulfilled','No mutation after incomplete read');
const plan=reads.map(r=>r.value);fs.writeFileSync(out+'/reviewed-plan.json',JSON.stringify({targets:plan,allMustStayOpen:true,formalRust:240,newDelivery:0,G3:false,G4:false},null,2)+'\n',{flag:'wx',mode:0o600});
const receipts=[];
for(const item of plan){const fresh=await api('prewrite-'+item.number,repo+'/issues/'+item.number);assert.equal(fresh.state,'open');assert.equal(fresh.body,item.beforeBody,'Concurrent issue update');await api('patch-'+item.number,repo+'/issues/'+item.number,{body:item.body});const after=await api('after-'+item.number,repo+'/issues/'+item.number);assert.equal(after.state,'open');assert.equal(after.body,item.body);receipts.push({number:item.number,url:after.html_url,state:after.state,bodySHA256:sha(item.body)});}
fs.writeFileSync(out+'/receipt.json',JSON.stringify({kind:'actual-online-source13-progress12',receipts,implementationCommit:commit,formalRust:240,newOfficialDelivery:0,periodPositivePassed:false,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
const indexFile='docs/design/rust-r4ghi-delivery-status.json',index=JSON.parse(fs.readFileSync(indexFile));index.g2CurrentOnline='../../'+out+'/receipt.json';index.implementationCheckpointCommit=commit;index.currentCorrective.continuationBlock='confirmed-Stage-implicit-root-replaced-parent; Source14-and-same-M98-admission-in-preparation';fs.writeFileSync(indexFile,JSON.stringify(index,null,2)+'\n');
console.log(JSON.stringify({updated:receipts.map(v=>v.number),allOpen:true,publishedCommit:commit,formalRust:240,newDelivery:0,G3Certified:false,G4Certified:false}));
