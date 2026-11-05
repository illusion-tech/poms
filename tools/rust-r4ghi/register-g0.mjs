// Root-owned, authorized Issue-first registration. Original API streams stay in tmp.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const base = 'aaa4b16ac66092f0cb1dc6646a02cf14e80823ee';
const branch = 'codex/poms-r4ghi-next25';
const out = 'tmp/rust-r4ghi/root/g0-01';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim(), base);
assert.equal(execFileSync('git', ['branch', '--show-current'], {encoding:'utf8'}).trim(), branch);
assert(!fs.existsSync(out), 'Inspect previous registration before retrying');
fs.mkdirSync(out, {recursive:true});
const commands = []; let ordinal = 0;
const pin = file => {const bytes=fs.readFileSync(file);return {file,bytes:bytes.length,rawBytesSha256:sha(bytes)};};
function api(name, endpoint, method='GET', payload) {
  const prefix = `${out}/${String(++ordinal).padStart(2,'0')}-${name}`;
  const args = ['api', endpoint, '--method', method];
  if (payload !== undefined) {const file=prefix+'-input.json';fs.writeFileSync(file,JSON.stringify(payload,null,2)+'\n',{flag:'wx'});args.push('--input',file);}
  const result=spawnSync('gh',args,{encoding:null,windowsHide:true,timeout:55000,maxBuffer:12000000});
  fs.writeFileSync(prefix+'-stdout.json',result.stdout??Buffer.alloc(0),{flag:'wx'});
  fs.writeFileSync(prefix+'-stderr.bin',result.stderr??Buffer.alloc(0),{flag:'wx'});
  commands.push({name,endpoint,method,exitCode:result.status,stdout:pin(prefix+'-stdout.json'),stderr:pin(prefix+'-stderr.bin')});
  fs.writeFileSync(out+'/progress.json',JSON.stringify({base,branch,commands},null,2)+'\n');
  assert.equal(result.status,0,'API failed; inspect saved partial registration before retrying');
  const parsed=JSON.parse(result.stdout);assert(!parsed.errors);return parsed;
}
const repo='repos/illusion-tech/poms';
const before={stage:api('stage-before',`${repo}/issues/101`),root:api('root-before',`${repo}/issues/57`),open:api('open-before',`${repo}/issues?state=open&per_page=100`)};
assert.equal(before.stage.state,'open');assert.equal(before.root.state,'open');
for(const n of [106,107,108,109])assert.equal(api('upstream-'+n,`${repo}/issues/${n}`).state,'closed');
const common=`基线 main ${base}；分支 ${branch}；2026-11-06（Asia/Tokyo）。Rust 正式240，R4已交付67/92、余25。用户已授权：建立父子Issue、复核归属与联合G1、三线并行实现、补缺和验收准备、统一候选真实阶段验收及独立G3/G4。\n\n以业务语义、正确性和合理性为准，不追Node缺陷级对齐。必要事实/版本/快照/审计/会话写入同一外层事务整体提交或回滚。Root单一维护DDL/迁移、公共路由/契约/生成物、Git/GitHub及受控环境；作者独立worktree与写入范围。子代理显式gpt-6.1-sol/max，Fast未核实。\n\n经营评价须消费真实经营快照和合同/资金/成本/税务分摊事实。移交事实不自动进入execution，仍需同一事实链上的有效提成角色冻结；联合G1核清最小R5依赖归属和交付顺序。相应内部producer、审批和敏感视图纳入实际验收，不能用改库或合成映射fixture冒充生产交付。完整阶段未通过前#101保持Open，#57持续Open。无生产部署、切流、性能或完整R5–R7交付结论。\n`;
const checklist=`\n- [x] G0：原生父子Issue及范围\n- [ ] G1：canonical/DTO/DDL/真实producer/审批/事务/版本/金额精度/跨线依赖冻结\n- [ ] G2：限定实现及文件交付\n- [ ] 统一候选真实HTTP/PG/权限/必要写故障/并发/原UI验收\n- [ ] 非作者G3、固定提交及main集成\n- [ ] 精确清理、生命周期归档、独立G4及线上实际读回\n`;
function create(key,title,scope,parent){
  assert(!before.open.some(x=>x.title===title),'Existing work item: inspect and resume');
  const issue=api('create-'+key,`${repo}/issues`,'POST',{title,body:`状态：G0完成 / G1输入审计中，尚未准入产品实现。\n\n父#${parent}；总体#57。\n\n${scope}\n\n${common}${checklist}`});
  const children=api('children-before-'+key,`${repo}/issues/${parent}/sub_issues?per_page=100`);
  if(!children.some(x=>x.number===issue.number))api('attach-'+key,`${repo}/issues/${parent}/sub_issues`,'POST',{sub_issue_id:issue.id});
  assert(api('children-after-'+key,`${repo}/issues/${parent}/sub_issues?per_page=100`).some(x=>x.number===issue.number));
  return {key,number:issue.number,id:issue.id,title,url:issue.html_url,body:issue.body};
}
const batch=create('batch','[RUST-R4-GHI] 经营与项目收尾二十五入口及阶段集成','本批25个既有HTTP：G经营基线/快照/期末冻结/重述9；H经营评价与视图8；I验收/完工/归档8。配套真实内部机制与完整R4阶段验收单列证据；操作数量在联合G1去重复核。',101);
const definitions=[
 ['G','[RUST-R4G] 经营基线快照冻结与重述九入口','9个既有入口：经营基线包生效/读取2、项目经营快照创建/读取2、期末冻结创建/读取2、经营重述创建/列表/详情3。冻结服务端真实事实来源、基线与版本选择、精确金额、窗口/期末/迟到事实重述、锁与事务；为H提供真实producer。'],
 ['H','[RUST-R4H] 经营评价与反馈视图八入口','8个既有入口：经营信号复核/详情2、经营反馈gate绑定复核/详情2、经营总览/统一核算/偏差风险/经营反哺4。补齐真实快照→成熟度→信号→gate绑定生成/复核及敏感视图；实现可并行，实际消费验收依赖G和已交付成本真实事实。'],
 ['I','[RUST-R4I] 项目验收完工归档八入口','8个既有入口：验收创建/列表2、完工创建/列表2、归档创建/列表/替代/撤销4。冻结同项目有效来源、主生命周期/终态及附属归档事实、并发版本链、权限/审计/整体回滚；复核R5有效角色冻结最小依赖，完整链验收不得绕过执行准入。'],
 ['acceptance','[RUST-R4-ACCEPT] 完整阶段交付审计与统一验收','审计首批37、第二批30、本批25及相应非HTTP/审批真实机制，冻结统一候选、真实合同→资金→移交→成本→经营→验收完工归档链、R5冻结依赖、权限/故障/并发/原UI、精确清理及独立G3/G4。本项完成不自动代表完整R5–R7完成。'],
];
const children=definitions.map(([key,title,scope])=>create(key,title,scope,batch.number));
const userFix=create('userFix','[RUST-R2-FIX] 修复创建用户初始角色与组织关联失败','修复#57已登记的POST /api/platform/users携带非空initialRoleIds返回500；同时核对同根因primaryOrgUnitId。用户UUID物化后写真实角色/组织关联，验证角色/组织有效性、重复关系、唯一用户名并发、必要审计/会话及业务写整体回滚。不增加公开路由，不计入R4新增25；后续独立验收和G3/G4。',57);
api('batch-index',`${repo}/issues/${batch.number}`,'PATCH',{body:batch.body+'\n原生子项：'+children.map(x=>`#${x.number} ${x.key}`).join('；')+'。并行独立补缺：#'+userFix.number+'。\n'});
const managed=`\n\n<!-- poms-r4ghi-current-batch -->\n\n2026-11-06：用户授权启动#${batch.number}，${children.map(x=>`#${x.number} ${x.key}`).join('；')}；并行R2补缺#${userFix.number}。当前仅G0及联合G1输入审计，G2尚未准入。正式Rust240、R4累计67/92，剩25（经营17＋验收/完工/归档8），本批新增正式交付0。完整R4通过阶段验收及独立G3/G4后才可关闭#101；#57保持OPEN。R5有效角色冻结最小依赖在G1按能力复核。\n\n<!-- /poms-r4ghi-current-batch -->\n`;
for(const [key,n] of [['stage',101],['root',57]]){
  const original=before[key];assert(!original.body.includes('<!-- poms-r4ghi-current-batch -->'));
  const current=api(key+'-cas-read',`${repo}/issues/${n}`);assert.equal(current.body,original.body);
  let body=original.body.replace(/^状态：[\s\S]*?\n\n/,`状态：**Doing / OPEN**。R0–R3已完成；R4累计67/92，第三批#${batch.number}正在G1输入审计；R5–R7尚未交付。最后核验2026-11-06（Asia/Tokyo）。\n\n`);
  if(n===101){body=body.replace('- [ ] 其余移交/实际成本40/经营/验收完工归档子片G4',`- [x] 第二批#106：移交与成本事实30入口G4\n- [ ] 第三批#${batch.number}：经营17与验收/完工/归档8及内部机制G4`);}
  else {
    body=body.replace(/当前Rust公开surface累计210[^\n]*/, '当前Rust正式公开操作累计240；R4累计67/92，余25。完整共享契约293 operations/626 schemas、client616文件；真实producer与完整阶段验收分别认定。');
    body=body.replace('- [ ] R4 #101：合同、资金、移交、成本与执行；首批#102及#103/#104/#105共37入口已收口，完整阶段保持Doing',`- [ ] R4 #101：累计67/92，#102/#106已收口；第三批#${batch.number}经营与项目收尾25入口及阶段验收进行中`);
  }
  api(key+'-update',`${repo}/issues/${n}`,'PATCH',{body:body+managed});
  api(key+'-g0-note',`${repo}/issues/${n}/comments`,'POST',{body:managed.trim()});
}
const readback=[];
for(const item of [batch,...children,userFix,{number:101},{number:57}]){
  const actual=api('readback-'+item.number,`${repo}/issues/${item.number}`);assert.equal(actual.state,'open');
  readback.push({number:item.number,state:actual.state,bodySHA256:sha(Buffer.from(actual.body)),url:actual.html_url});
}
const receipt={kind:'actual-R4-GHI-and-user-fix-G0',capturedAt:new Date().toISOString(),base,branch,batch,children,userFix,readback,commands,G1Certified:false,G2Authorized:false,officialRustOperations:240,r4Progress:{delivered:67,total:92,remaining:25},modelTargets:{subagents:{model:'gpt-6.1-sol',reasoningEffort:'max',fast:'unverified'}}};
fs.mkdirSync('docs/design/rust-r4ghi',{recursive:true});
fs.writeFileSync('docs/design/rust-r4ghi/g0-registration01.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({batch:batch.number,children:children.map(({key,number})=>({key,number})),userFix:userFix.number,allOpen:true,G1Certified:false,G2Authorized:false}));
