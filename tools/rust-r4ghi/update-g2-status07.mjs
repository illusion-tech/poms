import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const out='tmp/rust-r4ghi/root/g2-online-status07',repo='repos/illusion-tech/poms',sha=b=>createHash('sha256').update(b).digest('hex');assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
function api(name,endpoint,body){const args=['api',endpoint];if(body){const file=out+'/'+name+'-input.json';fs.writeFileSync(file,JSON.stringify(body)+'\n',{flag:'wx'});args.push('--method','PATCH','--input',file);}
 const r=spawnSync('gh',args,{encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:8000000});fs.writeFileSync(out+'/'+name+'-stdout.json',r.stdout??'',{flag:'wx'});fs.writeFileSync(out+'/'+name+'-stderr.log',r.stderr??'',{flag:'wx'});assert.equal(r.status,0,'Inspect exact GitHub original; never blindly retry mutation');return JSON.parse(r.stdout);}
const branch=api('branch-main',repo+'/branches/main');assert.equal(branch.commit.sha,'d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5');
const children=api('children110',repo+'/issues/110/sub_issues');for(const number of[111,112,113,114])assert(children.some(child=>child.number===number));
const commit='c4192c4842f40ec1d4667d7189863f7093f37975',base='https://github.com/illusion-tech/poms/blob/'+commit+'/';
const common=`状态：**Doing / OPEN；联合G1不变，G2验收与窄纠偏继续**。2026-11-08（Asia/Tokyo）。

正式Rust仍**240**，R4正式**67/95**、余28，本批32项新增交付认证**0**。Runtime272与完整canonical296 operations／690 schemas是不同口径，均不等于本批已交付。

[已发布工作分支检查点](${base}docs/design/rust-r4ghi/implementation-checkpoint66.md)固定实现与原始来源；G3 Pending、G4 false，不进入main、不关闭Issue。旧编译缓存已从该检查点移出并保留本地，业务源码和验收数据不变。

API134/source11经过显式留存数据准入，双库278表2421行的raw SHA/xmin、目录、序列和对象与53封存记录一致。旧API133的21项partial和原失败保持原标签，未拼凑到新结果。

API134实际新增验收：
- 非空E/F整闭包更正：**102类**故障每类primary1/fallback0、完整回滚；同body正常201，**286项必要行共享xmin3082**，2项目3实际终端、旧事实/current/四阶段binding、十进制金额与未知税务均核实。
- 主线生命周期：**45类**必要写入故障及**8次**正常提交完成，真实最终附条件验收、双本人关闭、pending归档409、错误关闭人403、归档替代/撤销不改原结论。
- 16现代写及支持C命令：**34次**真实422/400拒绝，业务行及xmin不变。
- A05三个独立项目：MAX/MAX零毛利、一分回款对MAX成本、13%净税拆分的真实G快照和H读回完成。真实新增0.01后旧hash请求409原件保留；新public preparation实际422容量超限且全回滚，**未声称执行了capture容量422命令**，没有本地造hash或重发回款。

[完整静态验证闭包](${base}docs/design/rust-r4ghi/current-static-validation64.json)：Native863／Admin463 tests、两端构建和lint、Native tsc八项实际通过，均绑定同一2838份输入且sourceStable。API134 Rust为511通过／54历史忽略，真实UI仍待运行，构建和单测不替代DOM。

另有非作者发现的新主责空/原样PATCH因updated_by误计dirty的窄问题；本地61修复已通过fmt、Clippy、整Rust测试（513通过／54历史忽略）及构建。API134和真实数据先经70封存（双PG归档、16对象、原binary/state，所有行/xmin与目录等不变、未restore），再准备API135/source12显式准入；新owner真实HTTP仍待该候选。61/70后续证据尚待下一提交发布，不以状态说明替代证书。

剩余：新候选无变化更新真验、共享来源stage/tax自动整批重建、真实浏览器各表单、并发/敏感读取失败无payload、联合独立G3/G4。期末依用户决定保留真实来源，最早**香港2026-11-09 00:00／日本01:00**再验，实时current与独立期间历史分离；不改时钟、伪造历史或提前收口。#115独立CLOSED；#57/#101/#110及未完成子项/#116保持OPEN，无部署或切流。
`;
const checks={
 57:'- [x] R0–R3按各阶段G4收口\n- [ ] R4 #101：本批剩余验收与完整阶段收口\n- [ ] R5 #116：最小依赖不代表完整提成链\n- [ ] R6迁移发布与回滚演练\n- [ ] R7正式切换及旧后端退出',
 110:'- [x] 联合G1精确32项冻结\n- [x] 原source10保真留存与source11显式数据准入\n- [x] API134 102更正FI／45生命周期FI／34协议负例\n- [x] 三个真实金额边界与public-preparation容量拒绝\n- [ ] 新owner空更新修复的新候选HTTP\n- [ ] 共享stage/tax自动整批重建、真实UI、权限和并发\n- [ ] 自然跨期后的期末正向\n- [ ] 联合独立G3/G4与实际线上读回',
 111:'- [x] G9正式输入与联合G1\n- [x] 消费桥/SourceSnapshot/proof/cutoff修复及API134完整102FI\n- [x] 三个真实金额G/H快照边界\n- [ ] 共享来源stage/tax无override自动整批重建\n- [ ] 新候选整体验收及自然期末\n- [ ] 独立G3/G4',
 113:'- [x] I11与R5最小依赖联合G1\n- [x] 真实创建归属/永久首次指派消费/旧候选真实首派竞争原件\n- [x] API134主线生命周期45类FI及8次正常命令\n- [ ] 61新owner空/同值更新修复与实际HTTP\n- [ ] 真实UI、双CAS并发、冻结参与人负控和敏感读取失败\n- [ ] 独立G3/G4',
 114:'- [x] 原联合G1与隔离M97/139环境\n- [x] 53／显式source11准入／API134实际102+45+34\n- [x] 三个独立真实金额边界及实际容量拒绝层\n- [ ] 新候选no-op与共享stage/tax补验\n- [ ] 真实JSON/DOM、本人操作、权限与并发\n- [ ] 自然期末正向及联合独立G3/G4\n- [ ] 条件满足后的精确清理、归档和实际线上读回'
};
const plan=[];for(const number of[57,110,111,113,114]){const before=api('before-'+number,repo+'/issues/'+number);assert.equal(before.state,'open');api('comments-'+number,repo+'/issues/'+number+'/comments?per_page=100');
 let tail=before.body??'';const match=/^(<!-- poms-r4ghi-g2-current\d+ -->)/.exec(tail);if(match){const end=match[1].replace('<!-- ','<!-- /'),at=tail.indexOf(end);assert(at>=0);tail=tail.slice(at+end.length);}
 const body='<!-- poms-r4ghi-g2-current07 -->\n\n'+common+'\n'+checks[number]+'\n\n<!-- /poms-r4ghi-g2-current07 -->'+tail;assert(body.length<65000);plan.push({number,beforeBody:before.body,body});}
fs.writeFileSync(out+'/reviewed-plan.json',JSON.stringify({kind:'scoped-current-G2-progress-only',targets:plan,allMustStayOpen:true,formalRust:240,newDelivery:0,G3:false,G4:false},null,2)+'\n',{flag:'wx'});
const receipts=[];for(const item of plan){const fresh=api('prewrite-'+item.number,repo+'/issues/'+item.number);assert.equal(fresh.state,'open');assert.equal(fresh.body,item.beforeBody,'Concurrent body update');api('patch-'+item.number,repo+'/issues/'+item.number,{body:item.body});const after=api('after-'+item.number,repo+'/issues/'+item.number);assert.equal(after.state,'open');assert.equal(after.body,item.body);receipts.push({number:item.number,url:after.html_url,state:after.state,bodySHA256:sha(item.body)});}
const receipt={kind:'actual-GitHub-API134-evidence-and-noop61-pending-status07',receipts,implementationCommit:commit,formalRust:240,newOfficialDelivery:0,correctionFI102:true,lifecycleFI45:true,modernNegatives34:true,periodPositivePassed:false,G3Certified:false,G4Certified:false};fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
const file='docs/design/rust-r4ghi-delivery-status.json',index=JSON.parse(fs.readFileSync(file));index.g2CurrentOnline='../../'+out+'/receipt.json';index.implementationCheckpointCommit=commit;
Object.assign(index.currentCorrective,{current102Series:'API134-complete-102-one-hit-plus-samebody201',lifecycle45:'API134-complete-8-successes',modernProtocol34:'API134-complete',source11Retained70:'rust-r4ghi/retained-source11-before-noop70.json',newNoopCheckpoint:'rust-r4ghi/g2-project-metadata-noop61.md',newSource12Admission:'pending',G3Certified:false,G4Certified:false});fs.writeFileSync(file,JSON.stringify(index,null,2)+'\n');
console.log(JSON.stringify({updated:receipts.map(r=>r.number),allOpen:true,formalRust:240,newDelivery:0,G3Certified:false,G4Certified:false}));
