import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
const out = 'tmp/rust-r4ghi/root/g2-online-status08', repo = 'repos/illusion-tech/poms';
const sha = value => createHash('sha256').update(value).digest('hex');
assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
async function api(name, endpoint, body) {
  const args = ['api', endpoint];
  if (body) { const file = out + '/' + name + '-input.json'; fs.writeFileSync(file, JSON.stringify(body) + '\n', { flag: 'wx', mode: 0o600 }); args.push('--method', 'PATCH', '--input', file); }
  const result = await new Promise((resolve, reject) => {
    const child = spawn('gh', args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Bounded GitHub request timed out; inspect originals before any retry')); }, 45000);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8'); child.stdout.on('data', value => stdout += value); child.stderr.on('data', value => stderr += value);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', status => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
  });
  fs.writeFileSync(out + '/' + name + '-stdout.json', result.stdout, { flag: 'wx', mode: 0o600 });
  fs.writeFileSync(out + '/' + name + '-stderr.log', result.stderr, { flag: 'wx', mode: 0o600 });
  assert.equal(result.status, 0, 'Inspect exact original; never blindly retry a mutation'); return JSON.parse(result.stdout);
}
const commit = 'd62e38b5c0705ac942ed5aea92a658dfabcc63fb';
const base = 'https://github.com/illusion-tech/poms/blob/' + commit + '/';
const initial = await Promise.allSettled([
  api('main', repo + '/branches/main'), api('children110', repo + '/issues/110/sub_issues'), api('publishedCommit', repo + '/commits/' + commit),
  api('parent101', repo + '/issues/101'), api('parent116', repo + '/issues/116'), api('closed115', repo + '/issues/115'),
]);
for (const item of initial) assert.equal(item.status, 'fulfilled', 'Initial live read failed');
assert.equal(initial[0].value.commit.sha, 'd5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5');
for (const number of [111, 112, 113, 114]) assert(initial[1].value.some(item => item.number === number));
assert.equal(initial[2].value.sha, commit); assert.equal(initial[3].value.state, 'open'); assert.equal(initial[4].value.state, 'open'); assert.equal(initial[5].value.state, 'closed');
const common = `状态：**Doing / OPEN；联合 G1 不变，G2 补验继续，G3 Pending / G4 false**。2026-11-08（Asia/Tokyo）。

正式 Rust **240**，R4 正式 **67/95**、余28，本批32项新增交付认证 **0**。Runtime272 与 canonical296 operations／690 schemas 各保留原口径。

[已发布 source12 检查点](${base}docs/design/rust-r4ghi/current-source12-evidence75.json)固定 API135、406份输入和原始来源；[本轮实际验收](${base}docs/design/rust-r4ghi/current-source12-acceptance86.json)记录完整私有原件 SHA。仅保存工作分支，未进入 main，未通过独立 G3/G4。

API134/source11 的102类非空更正 FI＋同体201、45类生命周期 FI＋8次成功、34项协议负例、三个真实金额边界及 public-preparation 容量422原件保留；不改标为 API135，不把 capture409说成容量422。

API134 已经70保真封存，source12经显式准入保持双库278表3415行 raw SHA/xmin、目录、序列和对象一致，保留旧夹具各自出生来源。API135实际新增：

- 修复换主责后的有效同值 PATCH 误记 updated_by；同值200保持项目原行、版本及审计，空对象仍按原契约400，真实编辑3类必要写入 FI 回滚及正常提交完成。
- 读回 API134 的3条真实重述：2个列表、3个详情；原77映射工具失败保留，修正后仅补剩余2个详情，没有重发旧POST。
- 跨父子 UUID404、跨项目证据409、错误关闭人403；敏感 GET 必要审计 primary1 失败返回500、无保护载荷且完整回滚。
- 不同责任任务两次并发关闭真实200/409，刷新父版本后关闭另一任务；最终只在两项实际关闭后汇总closed，原conditional结论不变。
- 原合同条款锁竞争：真实C确认200；无值改变的控制UPDATE直接等待该事务、55P03后ROLLBACK；原条款raw/xmin不变，回款、净税依据与审计同xmin，全部无关行与目录等不变。

Rust fmt/clippy/build及 **513通过／54历史忽略**；当前工具103项纯测试通过。[既有固定输入静态闭包](${base}docs/design/rust-r4ghi/current-static-validation64.json)的 Native863／Admin463 与八项检查保留。构建、纯测、夹具准备均不替代真实 DOM。

真实界面通过数仍 **0**：两轮先后停在 Windows PowerShell模块预检及 Windows→WSL localhost连接，均未发送界面业务命令；原件保留。PowerShell7隔离预检已实际通过，后续受控转发工具待新闭包实际执行。共享stage/tax自动整批重建、完整并发及角色父锁补强仍待完成；父锁迁移只是未注册候选，当前仍 M97/139。

期末按用户决定保留真实来源，最早 **香港2026-11-09 00:00／日本01:00**自然跨期后再验；实时current与期间历史分离。#115独立CLOSED；#57/#101/#110及未完成子项/#116保持OPEN，无部署或切流。
`;
const checks = {
  57: '- [x] R0–R3按各阶段G4收口\n- [ ] R4 #101：剩余联合验收与完整阶段收口\n- [ ] R5 #116：最小依赖不代表完整提成链\n- [ ] R6迁移发布与回滚演练\n- [ ] R7正式切换及旧后端退出',
  110: '- [x] 联合G1精确32项冻结\n- [x] 原source10/11保真留存与source12显式准入\n- [x] API134 102/45/34及三个真实金额边界原件\n- [x] API135同值编辑、重述读回、敏感审计失败、不同任务CAS、C条款锁\n- [ ] 共享stage/tax整批重建、真实UI、同任务及角色完整并发\n- [ ] 父锁防御正式注册、实际迁移及新候选准入\n- [ ] 自然期末正向、联合独立G3/G4及实际线上读回',
  111: '- [x] G9正式输入与联合G1\n- [x] 消费桥/SourceSnapshot/proof/cutoff修复及API134完整102FI\n- [x] 三个真实金额边界及历史重述实际列表/详情读回\n- [ ] 共享stage/tax无override自动整批重建与capture竞态\n- [ ] 自然期末正向及独立G3/G4',
  112: '- [x] H8正式输入与联合G1\n- [x] 原真实金额及四阶段输出证据保留\n- [x] 必要敏感GET审计失败500无保护载荷与完整回滚\n- [ ] 真实信号/闸门复核UI及完整规则边界验收\n- [ ] 新候选联合验收与独立G3/G4',
  113: '- [x] I11与R5最小依赖联合G1\n- [x] 原真实归属/首派竞争与API134生命周期45FI/8成功\n- [x] 新主责同值/真实编辑修复及实际HTTP\n- [x] 跨父子/证据归属/错误责任人拒绝与不同任务并发CAS\n- [ ] 真实本人UI及同任务并发、冻结参与人负控与父锁新候选\n- [ ] 独立G3/G4',
  114: '- [x] 联合G1与M97/139隔离环境\n- [x] 保真留存、显式source12准入及已发布实际原件\n- [x] API135同值编辑、读回、敏感审计、不同任务CAS和C条款锁\n- [ ] 共享stage/tax、真实JSON/DOM、权限与完整并发\n- [ ] 新候选迁移复核及自然期末正向\n- [ ] 联合独立G3/G4、精确清理归档与线上读回',
  117: '- [x] 最小角色四项与联合G1冻结\n- [ ] 真实角色创建/冻结UI与公开freeze-revised-create并发\n- [ ] 冻结零权重/正权重归属负控及父锁补强实际迁移\n- [ ] 新候选联合验收与独立G3/G4',
};
const targets = [57, 110, 111, 112, 113, 114, 117];
const reads = await Promise.allSettled(targets.map(async number => {
  const before = await api('before-' + number, repo + '/issues/' + number); assert.equal(before.state, 'open');
  const pages = Math.max(1, Math.ceil(before.comments / 100));
  for (let page = 1; page <= pages; page++) await api('comments-' + number + '-' + page, repo + '/issues/' + number + '/comments?per_page=100&page=' + page);
  let tail = before.body ?? ''; const match = /^(<!-- poms-r4ghi-g2-current\d+ -->)/.exec(tail);
  if (match) { const end = match[1].replace('<!-- ', '<!-- /'), at = tail.indexOf(end); assert(at >= 0); tail = tail.slice(at + end.length); }
  const body = '<!-- poms-r4ghi-g2-current08 -->\n\n' + common + '\n' + checks[number] + '\n\n<!-- /poms-r4ghi-g2-current08 -->' + tail;
  assert(body.length < 65000); return { number, beforeBody: before.body, body };
}));
for (const result of reads) assert.equal(result.status, 'fulfilled', 'Issue read failed; no write may follow');
const plan = reads.map(result => result.value);
fs.writeFileSync(out + '/reviewed-plan.json', JSON.stringify({ targets: plan, allMustStayOpen: true, formalRust: 240, newDelivery: 0, G3: false, G4: false }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const receipts = [];
for (const item of plan) {
  const fresh = await api('prewrite-' + item.number, repo + '/issues/' + item.number); assert.equal(fresh.state, 'open'); assert.equal(fresh.body, item.beforeBody, 'Concurrent body update');
  await api('patch-' + item.number, repo + '/issues/' + item.number, { body: item.body });
  const after = await api('after-' + item.number, repo + '/issues/' + item.number); assert.equal(after.state, 'open'); assert.equal(after.body, item.body);
  receipts.push({ number: item.number, url: after.html_url, state: after.state, bodySHA256: sha(item.body) });
}
fs.writeFileSync(out + '/receipt.json', JSON.stringify({ kind: 'actual-online-source12-progress08', receipts, implementationCommit: commit, formalRust: 240, newOfficialDelivery: 0, periodPositivePassed: false, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
const candidate = JSON.parse(fs.readFileSync('//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/004534-candidate-source-binding12.json'));
const file = 'docs/design/rust-r4ghi-delivery-status.json'; assert(!candidate.sourcePins.some(pin => pin.file === file));
const index = JSON.parse(fs.readFileSync(file)); index.g2CurrentOnline = '../../' + out + '/receipt.json'; index.implementationCheckpointCommit = commit;
index.currentAcceptance86 = 'rust-r4ghi/current-source12-acceptance86.json';
fs.writeFileSync(file, JSON.stringify(index, null, 2) + '\n');
console.log(JSON.stringify({ updated: receipts.map(item => item.number), allOpen: true, publishedCommit: commit, formalRust: 240, newDelivery: 0, G3Certified: false, G4Certified: false }));
