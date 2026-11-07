import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const out='tmp/rust-r4ghi/root/g2-online-status04';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const repo='repos/illusion-tech/poms',start='<!-- poms-r4ghi-g2-current03 -->',end='<!-- /poms-r4ghi-g2-current03 -->',marker='<!-- poms-r4ghi-g2-current04 -->';
function api(name,endpoint,body){const args=['api',endpoint];if(body){const file=out+'/'+name+'-input.json';fs.writeFileSync(file,JSON.stringify(body)+'\n',{flag:'wx'});args.push('--method','PATCH','--input',file);}const r=spawnSync('gh',args,{encoding:'utf8',windowsHide:true,timeout:60000});fs.writeFileSync(out+'/'+name+'-stdout.json',r.stdout??'',{flag:'wx'});fs.writeFileSync(out+'/'+name+'-stderr.log',r.stderr??'',{flag:'wx'});assert.equal(r.status,0,'GitHub call failed; original output retained: '+name);return JSON.parse(r.stdout);}
const children=api('native-children110',repo+'/issues/110/sub_issues');for(const n of[111,112,113,114])assert(children.some(x=>x.number===n));
const common=`状态：**Doing / OPEN；联合G1已冻结，G2实现及真实验收继续**。2026-11-07（Asia/Tokyo）。

正式Rust仍为**240**；R4已交付**67/95**、余28。本批G9/H8/I11与R5最小角色4共**32项**（29既有、3新增）；272仍是验收后的目标，新增正式交付0。

用户已补充裁决：现有创建入口可选组织承接，省略仍由创建人主责；实时快照维护当前，期末只留独立期间历史。用户已批准保留最终真实合格来源和隔离候选跨期继续验收。有效条款本周才生效，既有历史来源也不合格，最早在**香港时间2026-11-09 00:00／日本时间01:00后**才具备本周关账日期条件；仍须当时核真实来源，不提前记期末正向通过。

已发布G2输入／工具：[S6完整输入A2](https://github.com/illusion-tech/poms/commit/2cd1be6029cf1b14ebfb1fc4530af894507a4c5a)、[S6工具及登记B2](https://github.com/illusion-tech/poms/commit/8c6e98db9cae598787da095084965c434ee1105a)。完整共享规范242 paths／296 operations／690 schemas；固定JAR全SDK683文件实际write/check、Windows并发入口及Linux同manifest通过；完整Rust331枚举族／339来源实际guarded write/check通过。S4/S5原件保留。

本地限定证据：两库M97函数追加迁移及138个原业务表完整行／xmin保留；此前API132候选Rust490 passed／54历史ignored、Native863、Admin440及生产构建通过。真实组织首派／永久消费／改派后原创建人全权限404、双会话两锁等待200/409均已观察；一个明确标注的受控Legacy兼容负例验证最小读取及权限拒绝，不当作历史生产入口。早期候选已精确清理并双noop。失败原件保留。后续正在纳入正式编辑审计操作名与逐成本税务覆盖修复，最终统一候选仍须重新实际验收；上述不认证整体G3/G4。

期末相关项及父批次继续OPEN。#115已独立CLOSED；#57/#101/#110/#111/#114/#116及未完成子项不提前收口。无部署、切流、性能或外部存储认证。
`;
const checks={57:'- [x] R0–R3按各阶段G4收口\n- [ ] R4 #101：本批32项及完整阶段验收\n- [ ] R5 #116：最小依赖 #117不代表完整提成链\n- [ ] R6迁移发布接管与回滚演练\n- [ ] R7正式切换及旧后端退出',
110:'- [x] 联合G1精确32项冻结\n- [ ] G2全部实现与最终候选\n- [ ] 真实联合HTTP／PG／故障／并发／原UI\n- [ ] 自然跨期后的真实期末正向验收\n- [ ] 独立G3／G4、集成与实际线上读回',
114:'- [x] 联合G1验收输入与范围冻结\n- [x] 隔离PG15／M95–M97及精确清理探针\n- [x] API132限定归属／Legacy权限／两会话首派竞争早期证据\n- [ ] 最终统一候选的完整真实业务链和全部必要写故障\n- [ ] 非空E/F完整影响闭包与跨项目验收\n- [ ] 真实JSON／DOM投影和本人操作闭环\n- [ ] 保留合格来源，自然跨期完成期末正向验证\n- [ ] 最终清理／归档及独立G3／G4'};
const receipts=[];
for(const number of[57,110,114]){const prior=api('before-'+number,repo+'/issues/'+number);assert.equal(prior.state,'open');assert(prior.body.startsWith(start)&&prior.body.includes(end)&&!prior.body.includes(marker));api('comments-'+number,repo+'/issues/'+number+'/comments?per_page=100');
 const tail=prior.body.slice(prior.body.indexOf(end)+end.length);const body=marker+'\n\n'+common+'\n'+checks[number]+'\n\n<!-- /poms-r4ghi-g2-current04 -->'+tail;
 const fresh=api('prewrite-'+number,repo+'/issues/'+number);assert.equal(fresh.body,prior.body,'Issue body changed during preparation');api('patch-'+number,repo+'/issues/'+number,{body});const after=api('after-'+number,repo+'/issues/'+number);assert.equal(after.state,'open');assert.equal(after.body,body);receipts.push({number,state:after.state,url:after.html_url,bodySHA256:createHash('sha256').update(body).digest('hex')});}
fs.writeFileSync(out+'/receipt.json',JSON.stringify({kind:'actual-GitHub-current-G2-and-approved-natural-period-retention-refresh',capturedAt:new Date().toISOString(),receipts,formalRust:240,newOfficialDelivery:0,periodPositivePassed:false,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
const file='docs/design/rust-r4ghi-delivery-status.json',index=JSON.parse(fs.readFileSync(file));index.pendingBusinessDecisions=[];index.g2CurrentOnline='../../'+out+'/receipt.json';index.periodAcceptance={status:'waiting-natural-period-with-approved-retention',earliestHongKong:'2026-11-09T00:00:00+08:00',earliestTokyo:'2026-11-09T01:00:00+09:00',passed:false};fs.writeFileSync(file,JSON.stringify(index,null,2)+'\n');
console.log(JSON.stringify({updated:receipts.map(x=>x.number),allOpen:true,formalRust:240,periodPositivePassed:false,G3Certified:false,G4Certified:false}));
