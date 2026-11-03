// Root-only Issue-first registration; preserves complete raw API receipts.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const base = '565661b9113372de4da6662a4a692fbfd2296dd6';
const branch = 'codex/poms-r4def-next28';
const out = 'tmp/rust-r4def/root/g0-online01';
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), base);
assert.equal(execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(), branch);
assert(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
let ordinal = 0;
const commands = [];
const pin = file => { const b = fs.readFileSync(file); return { file, bytes: b.length, rawBytesSha256: createHash('sha256').update(b).digest('hex') }; };
function api(name, args, payload) {
    const prefix = `${out}/${String(++ordinal).padStart(2, '0')}-${name}`;
    if (payload !== undefined) { fs.writeFileSync(prefix + '-input.json', JSON.stringify(payload, null, 2) + '\n', { flag: 'wx' }); args = [...args, '--input', prefix + '-input.json']; }
    const r = spawnSync('gh', ['api', ...args], { encoding: null, windowsHide: true, maxBuffer: 16000000, timeout: 55000 });
    fs.writeFileSync(prefix + '-stdout-original.json', r.stdout || Buffer.alloc(0), { flag: 'wx' });
    fs.writeFileSync(prefix + '-stderr-original.bin', r.stderr || Buffer.alloc(0), { flag: 'wx' });
    commands.push({ name, args, exitCode: r.status, stdout: pin(prefix + '-stdout-original.json'), stderr: pin(prefix + '-stderr-original.bin') });
    assert.equal(r.status, 0, 'Inspect partial live registration before retrying');
    const value = JSON.parse(r.stdout); assert(!value.errors); return value;
}
const prior = api('before', ['graphql'], { query: 'query{repository(owner:"illusion-tech",name:"poms"){stage:issue(number:101){number state body subIssues(first:100){nodes{number title state}}} root:issue(number:57){number state body} upstream:issue(number:102){number state} issues(first:100,states:OPEN,orderBy:{field:CREATED_AT,direction:DESC}){nodes{number title state}}}}' }).data.repository;
assert.equal(prior.stage.state, 'OPEN'); assert.equal(prior.root.state, 'OPEN'); assert.equal(prior.upstream.state, 'CLOSED');
const common = `基线main ${base}，分支 ${branch}。用户授权本批G0→联合G1→三线实现→实际验收→独立G3/fixed/main/G4，仅收本批；#101/#57保持Open。\n\n业务语义、正确性、合理性优先，不追求Node缺陷级对齐。必要业务/版本/快照/审计/会话写入借同一外层事务整体提交或回滚。公共契约、路由、DDL/迁移入口、生成物、Git/GitHub和真实运行环境由Root单一写入。三作者分别独占D/E/F模块；G2使用隔离工作树、端口/数据/构建输出，G1独立审查与线上冻结前禁止产品编码。子代理显式gpt-6.1-sol/max，Fast未核实。\n\nR3和R4首批37已G4；新批不重复计其交付。经营核算17、验收完工归档8及R5仅冻结依赖和必要边界，不在本批实现。必要内部机制按本批真实消费归属纳入，不虚构公开路由、不以prepared-state/测试seed冒充真实生产者。PG17/旧private/历史证据保留；无部署、切流或性能结论。\n`;
const checklist = '\n- [x] G0：原生父子Issue及范围\n- [ ] 联合G1：28入口canonical/DTO/DDL/内部producer/事务/版本/金额精度/审批归属冻结\n- [ ] 三线实现及独占文件交付\n- [ ] 统一候选真实上游消费、HTTP/PG/权限/故障/并发/原UI验收及精确清理\n- [ ] 非作者G3、固定提交与main集成\n- [ ] 生命周期归档、独立G4及线上实际读回\n';
function create(key, title, body) {
    assert(!prior.issues.nodes.some(x => x.title === title), 'Existing issue: resume rather than duplicate');
    return api('create-' + key, ['repos/illusion-tech/poms/issues', '--method', 'POST'], { title, body });
}
function attach(parent, child, key) {
    const before = api('children-before-' + key, [`repos/illusion-tech/poms/issues/${parent}/sub_issues?per_page=100`]);
    if (!before.some(x => x.number === child.number)) api('attach-' + key, [`repos/illusion-tech/poms/issues/${parent}/sub_issues`, '--method', 'POST'], { sub_issue_id: child.id });
    const after = api('children-after-' + key, [`repos/illusion-tech/poms/issues/${parent}/sub_issues?per_page=100`]);
    assert(after.some(x => x.number === child.number));
}
const batch = create('batch', '[RUST-R4-DEF] 移交与成本事实二批联合迁移28入口', '状态：G0完成 / 联合G1准备，产品实现未准入。\n\n父#101，总体#57。D移交5/E成本基础11/F成本治理12，共28现有HTTP及必要内部机制。D/E可并行；F按冻结接口并行实现，真实验收依赖E实际成本与适用D阶段事实。\n\n' + common + checklist);
attach(101, batch, 'batch');
const definitions = [
    ['D', '[RUST-R4D] 移交五入口与回款判断冻结真实机制', '5入口：合同承接摘要、项目最新/指定移交详情、确认、再基线化；补齐真实移交准备/参与人确认/摘要与回款判断冻结，验收R2附件真实消费。复核与R5角色冻结边界，不能将回款判断冻结当提成冻结或制造循环依赖。'],
    ['E', '[RUST-R4E] 实际成本与费用基础十一入口', '11入口：费率版本、统一多来源实际成本登记/列表/详情/人力替换、费用列表/详情/创建/修改/确认/作废；冻结真实payment/invoice/expense/procurement/labor来源、计入范围、映射唯一、版本链和精度，向F输出可依赖真实成本。'],
    ['F', '[RUST-R4F] 分摊阶段归属税务十二入口', '12入口：共享成本分摊4、阶段归属4、税务处理4。冻结跨项目权重/金额守恒/舍入/币种、真实来源和阶段证据、锁定/替换/重分类链、必要同事务审计。最终验收消费E真实成本，适用场景消费D事实。'],
];
const children = [];
for (const [key, title, scope] of definitions) {
    const child = create(key, title, `状态：G0 / 输入审计，G1待冻结。\n\n父#${batch.number}（上级#101，总体#57）。\n\n${scope}\n\n${common}${checklist}`);
    attach(batch.number, child, key);
    children.push({ key, number: child.number, id: child.id, title, url: child.html_url, scope });
}
api('batch-index', [`repos/illusion-tech/poms/issues/${batch.number}`, '--method', 'PATCH'], { body: batch.body + '\n原生子项：' + children.map(x => `#${x.number} ${x.key}`).join('；') + '。\n' });
const note = `\n\n2026-11-04：用户授权启动第二批 #${batch.number}，D/E/F原生子项 ${children.map(x => '#' + x.number).join('/')}，28入口及必要内部机制；当前仅G0和联合G1输入审计，尚未准入G2。本批G4不等于完整R4，#101/#57保持Open。\n`;
api('stage-index', ['repos/illusion-tech/poms/issues/101', '--method', 'PATCH'], { body: prior.stage.body + note });
api('root-note', ['repos/illusion-tech/poms/issues/57/comments', '--method', 'POST'], { body: note.trim() });
const readback = api('after', ['graphql'], { query: `query{repository(owner:"illusion-tech",name:"poms"){stage:issue(number:101){number state subIssues(first:100){nodes{number state}}} root:issue(number:57){number state} batch:issue(number:${batch.number}){number state body subIssues(first:100){nodes{number state title}}}}}` }).data.repository;
assert.equal(readback.stage.state, 'OPEN'); assert.equal(readback.root.state, 'OPEN');
assert.equal(readback.batch.subIssues.nodes.length, 3);
const receipt = { kind: 'R4-next28-actual-G0-registration', createdAt: new Date().toISOString(), base, branch, stage: 101, root: 57, batch: { number: batch.number, id: batch.id, url: batch.html_url }, children, commands, readback, G1Certified: false, G2Authorized: false };
fs.writeFileSync('docs/design/rust-r4def/g0-registration01.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ batch: batch.number, children: children.map(({ key, number }) => ({ key, number })), stage: readback.stage.state, root: readback.root.state }));
