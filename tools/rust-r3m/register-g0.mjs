// Root-owned, Issue-first registration for the authorized R3 closeout batch.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const base = '5041275d7ad82af4becbb4462e7213ffe465bc7a';
const out = 'tmp/rust-r3m/root/g0-online01';
assert(!fs.existsSync(out), 'Existing receipt: inspect online state before any retry');
fs.mkdirSync(out, { recursive: true });
let ordinal = 0;
function api(name, args, payload) {
  const prefix = `${out}/${String(++ordinal).padStart(2, '0')}-${name}`;
  if (payload !== undefined) {
    fs.writeFileSync(prefix + '-input.json', JSON.stringify(payload, null, 2) + '\n', { flag: 'wx' });
    args = [...args, '--input', prefix + '-input.json'];
  }
  const result = spawnSync('gh', ['api', ...args], { encoding: null, windowsHide: true, maxBuffer: 16_000_000 });
  fs.writeFileSync(prefix + '-stdout-original.json', result.stdout || Buffer.alloc(0), { flag: 'wx' });
  fs.writeFileSync(prefix + '-stderr-original.log', result.stderr || Buffer.alloc(0), { flag: 'wx' });
  assert.equal(result.status, 0, name + ': original output retained; inspect remote before retry');
  const value = JSON.parse(result.stdout);
  assert(!value.errors, JSON.stringify(value.errors));
  return value;
}
const before = api('before', ['graphql'], { query: 'query{repository(owner:"illusion-tech",name:"poms"){id p85:issue(number:85){id number state body comments(first:100){nodes{body url}} subIssues(first:100){nodes{number state title}}} p57:issue(number:57){id number state body comments(first:100){nodes{body url}}} issues(first:100,states:OPEN,orderBy:{field:CREATED_AT,direction:DESC}){nodes{id databaseId number title body url state}}}}' }).data.repository;
assert.equal(before.p85.state, 'OPEN');
assert.equal(before.p57.state, 'OPEN');
assert.equal(before.p85.subIssues.nodes.filter(x => x.state === 'CLOSED').length, 11);
const common = `基线 main ${base}；执行分支 codex/poms-r3-closeout。用户已授权本批完整 G0–G4。公共路由增量默认 0；当前 Rust 173 操作 / 138 路径 / 585 schemas，R3 58/58 HTTP 已分片交付，不重复计数。\n\n业务语义、正确性、合理性优先；必要业务状态、评分快照和注册审计须同一事务整体提交或回滚。R3人工评分覆盖审批属于本阶段；通用合同处理属R4，佣金处理属R5，已交付R2机制按具体能力引用，不能制造阶段循环等待。无R4/R5新增命令、部署、切流、迁移接管或性能结论。\n\n联合G1须冻结 source/caller/transaction/guard/receipt 矩阵、真实阶段用例、来源哈希、文件归属与环境。非作者独立Pass及线上冻结前禁止产品实施。Root独占共享连接、正式治理、GitHub与全部真实环境/构建/测试/HTTP/PG/browser/cleanup；作者只做独占模块和纯验收定义。三作者与独立审查均显式 gpt-6.1-sol/max，Fast未核实。全部实际验收使用本批新namespace/actors/secrets/cohorts，旧private与PG17不触碰。历史failed/partial/stopped/uncertified及54ignored保留标签。\n\nE1上批5个兼容机器输入419264B/23个直接消费者的批准不能继承；本G1重新裁定，目标在本批用支持的归档重放入口退出，原2026-11-09期限不延长。保留历史原字节与原脚本，不大量镜像归档。\n`;
const checks = '\n- [ ] G0：原生父子Issue与互斥归属登记\n- [ ] G1：正式矩阵、联合基线及非作者独立冻结\n- [ ] 本片必要补缺/审计/验收定义完成\n- [ ] 统一候选实际阶段验收与自有环境终态核验\n- [ ] 独立G3、固定提交与main集成复核\n- [ ] G4：归档保全、独立关闭许可及线上本地状态一致\n';
function ensureIssue(key, title, scope) {
  const duplicate = before.issues.nodes.find(x => x.title === title);
  assert(!duplicate, 'Issue already exists: inspect and resume instead of creating duplicate');
  return api('create-' + key, ['repos/illusion-tech/poms/issues', '--method', 'POST'], { title, body: '状态：Todo / G1准备。\n\n' + scope + '\n\n' + common + checks });
}
function attach(parent, child, key) {
  const current = api('children-before-' + key, [`repos/illusion-tech/poms/issues/${parent}/sub_issues`]);
  if (!current.some(x => x.number === child.number)) api('attach-' + key, [`repos/illusion-tech/poms/issues/${parent}/sub_issues`, '--method', 'POST'], { sub_issue_id: child.id });
  const verified = api('children-after-' + key, [`repos/illusion-tech/poms/issues/${parent}/sub_issues`]);
  assert(verified.some(x => x.number === child.number));
}
const parent = ensureIssue('batch', '[RUST-R3-CO] R3 内部机制、审批归属与阶段集成收口', '父任务 #85，总体 #57。本批作为R3阶段收口父片，下设三条交付线。先联合G1，再并行补缺、交付审计及验收准备；统一候选完成完整R3阶段验收及独立G3/G4。只有全部条件实际满足才关闭本父片及#85，#57始终保持开放。');
attach(85, parent, 'batch');
const definitions = [
  ['A', '[RUST-R3-CO-A] 线索评分、人工覆盖审批与转换内部机制审计补缺', 'A线：Lead评分v2事实/触发/语义去重，人工覆盖提交/批准/驳回/撤销，状态与CAS，转换项目/附件复制/快照/必要审计的完整事务；必要真实故障、并发与查询无副作用断言。所有 leads/ 产品代码单一作者。'],
  ['B', '[RUST-R3-CO-B] 客户销售协作与项目签约前内部链审计补缺', 'B线：客户/别名/联系人、跟进→唯一Todo提醒、情报/讨论/项目成本竞标报价，以及guidance/timeline读取；按具体来源核验完整内部链、精确金额、版本并发和错误回滚。R4/R5事实适配与真实未来命令严格分列。'],
  ['D', '[RUST-R3-CO-C] R3交付审计、E1退出与统一阶段验收', '第三线：58路由与非HTTP/审批交付盘点、统一候选真实阶段矩阵、54ignored分类、UI范围核验和E1归档重放退出方案。验收定义与支持入口可以并行准备，实际环境/程序运行由Root串行统筹；本线作者不能担任独立Gate审查。'],
];
const children = [];
for (const [key, title, scope] of definitions) {
  const issue = ensureIssue(key, title, `父任务 #${parent.number}（上级#85，总体#57）。\n\n${scope}`);
  attach(parent.number, issue, key);
  const body = issue.body.replace('- [ ] G0：', '- [x] G0：');
  api('g0-' + key, [`repos/illusion-tech/poms/issues/${issue.number}`, '--method', 'PATCH'], { body });
  children.push({ key, number: issue.number, id: issue.id, title, url: issue.html_url, scope });
}
api('g0-batch', [`repos/illusion-tech/poms/issues/${parent.number}`, '--method', 'PATCH'], { body: parent.body.replace('- [ ] G0：', '- [x] G0：') + '\n原生子项：' + children.map(x => `#${x.number} ${x.key}`).join('；') + '。\n' });
const summary = `\n\n2026-11-03 已启动R3收口批 #${parent.number}（子项${children.map(x => '#' + x.number).join('/')}）：联合G1准备中，三线并行输入审计；本批尚未进入产品实现。统一候选阶段验收与独立G3/G4通过后，条件满足才关闭#85，#57保持Open。E1须本次G1重新审定并按原期限处理。\n`;
for (const [number, original] of [[85, before.p85], [57, before.p57]]) api('parent-' + number, [`repos/illusion-tech/poms/issues/${number}`, '--method', 'PATCH'], { body: original.body + summary });
const after = api('after', ['graphql'], { query: `query{repository(owner:"illusion-tech",name:"poms"){p85:issue(number:85){number state subIssues(first:100){nodes{number state title}}} p57:issue(number:57){number state} batch:issue(number:${parent.number}){number state body subIssues(first:100){nodes{number state title}}}}}` }).data.repository;
assert.equal(after.p85.state, 'OPEN');
assert.equal(after.p57.state, 'OPEN');
assert(after.p85.subIssues.nodes.some(x => x.number === parent.number));
for (const child of children) assert(after.batch.subIssues.nodes.some(x => x.number === child.number));
const files = fs.readdirSync(out).sort().map(name => { const b = fs.readFileSync(out + '/' + name); return { file: out + '/' + name, bytes: b.length, rawBytesSha256: createHash('sha256').update(b).digest('hex') }; });
const receipt = { kind: 'R3-closeout-native-G0-registration', createdAt: new Date().toISOString(), base, code: 'RUST-R3-CO', parent85: 85, overall57: 57, batch: { number: parent.number, title: parent.title, url: parent.html_url }, children, publicOperationsAdded: 0, R3HTTPDelivered: 58, G1Certified: false, G3Certified: false, G4Certified: false, stageIntegrationComplete: false, files };
fs.writeFileSync('tmp/rust-r3m/root/g0-issue-registration.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ batch: receipt.batch.number, children: children.map(x => ({ key: x.key, number: x.number })), nativeRelationsVerified: true, G1Certified: false }));
