import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
const out = 'tmp/rust-r4ghi/root/g2-online-status09', repo = 'repos/illusion-tech/poms';
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
const commit = '6ca4f722cbbdea4fb3d8043712b827e5ad18be6b';
const base = 'https://github.com/illusion-tech/poms/blob/' + commit + '/';
const initial = await Promise.allSettled([
  api('main', repo + '/branches/main'), api('children110', repo + '/issues/110/sub_issues'), api('publishedCommit', repo + '/commits/' + commit),
  api('parent101', repo + '/issues/101'), api('parent116', repo + '/issues/116'), api('closed115', repo + '/issues/115'),
]);
for (const item of initial) assert.equal(item.status, 'fulfilled', 'Initial live read failed');
assert.equal(initial[0].value.commit.sha, 'd5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5');
for (const number of [111, 112, 113, 114]) assert(initial[1].value.some(item => item.number === number));
assert.equal(initial[2].value.sha, commit); assert.equal(initial[3].value.state, 'open'); assert.equal(initial[4].value.state, 'open'); assert.equal(initial[5].value.state, 'closed');
const common = `状态：**Doing / OPEN；联合 G1 不变，G2 实现与补验继续，G3 Pending / G4 false**。2026-11-08（Asia/Tokyo）。

正式 Rust **240**；R4 正式 **67/95**、余28；本批32项新增认证 **0**。Runtime272 与 canonical296 operations／690 schemas保持各自口径。

[已发布检查点](${base}docs/design/rust-r4ghi/native122-actual-and-conservation.json)为工作分支6ca4f722，main仍d5c79b26，无合并、部署或切流。运行候选仍 Source12/API135、406份产品输入、M97/每库139表。此前[Source12来源](${base}docs/design/rust-r4ghi/current-source12-evidence75.json)及[验收86](${base}docs/design/rust-r4ghi/current-source12-acceptance86.json)保留，不把其它版本改标。

新增已证事实：

- [共享Stage87](${base}docs/design/rust-r4ghi/shared-stage95-actual.json)：87/87真实必要写入故障点均primary1/fallback0、全表回滚；无override完整2:1批次。正常更正201与并发capture409 operating_preparation_changed，真实锁等待链；271必要匹配/268行共xmin4339。
- Tax真实Expense/E/F及Receiver G已提交，Main G完整409 operating_cost_source_missing且零域写入；旧成功POST不重发。缺口定位为跨项目费用父来源未加载；Tax-only影响范围也需补齐。新候选尚未应用。
- Native参考真实3次认证200＋17项专用protocol guard422，独立完整FS复核；仅新增的一个cookie-born会话精确清理，after＋两次fresh严格回到S0，原Native与Rust所有行/raw/xmin、目录、序列、对象保持。Native协议164工具图和清理165图独立，不计Rust交付，不声称完整现代业务DTO有效。
- Creator真实UI首次指派后端200而观察器漏登记Origin导致浏览器502；原失败保留，仅元数据恢复一条Origin。UI05真实进入执行200及四步本人证据上传均已提交；条件close尚未发送。UI05仍失败：外部字体阻断与工具动态name选择器错误，续验保留已消费动作，不重放。
- [组合106静态证据](${base}docs/design/rust-r4ghi/composed125-static.json)：四项纠偏十候选在隔离完整crate fmt/clippy/test/build全部通过，535通过/54忽略/26套。它是未应用提案，不能代替Source13实际候选、M98迁移、业务验收或G3。

API134的102类非空更正FI＋同体201、45类生命周期FI＋8成功、34项协议负例和三个真实金额边界原件继续保留。API135此前有效同值PATCH、真实编辑3FI、重述读回、敏感GET必要审计失败、不同任务CAS、C条款锁等证据均保持原标签。

待完成：本人关闭/同任务CAS、角色创建冻结及公开竞态、Expense/GH/Lifecycle真实表单、完整H规则边界；正式冻结/应用四项纠偏、正常M98迁移与显式schema准入、fresh Main G/Tax完整影响面与原子性；自然期末及统一候选独立G3/G4。

历史补关选包策略仍待用户裁决，当前仅准备真实来源核验与不明来源阻断，不默认批准自动历史选包。按已确认决定保留真实来源，最早 **香港2026-11-09 00:00／日本01:00**自然跨期后再验本周期末，不回填/伪造来源或调时钟。

#115维持独立CLOSED。#57/#101/#110、未完成子项及#116保持OPEN，构建/纯测/部分成功不替代交付认证。
`;
const checks = {
  "57": "- [x] R0–R3按各阶段G4收口\n- [ ] R4 #101：剩余联合验收与完整阶段收口\n- [ ] R5 #116：最小依赖不代表完整提成链\n- [ ] R6迁移发布与回滚演练\n- [ ] R7正式切换及旧后端退出",
  "110": "- [x] 联合G1精确32项冻结\n- [x] source10/11保真留存与source12显式准入\n- [x] API134 102/45/34及金额边界原件\n- [x] API135同值编辑/读回/敏感审计/不同任务CAS/C条款锁\n- [x] Stage87全批FI及共享201/capture409竞态\n- [x] Native17参考与单会话清理S0守恒\n- [ ] Tax修复及完整影响面、真实UI/权限/完整并发\n- [ ] M98迁移与显式schema准入、自然期末、独立G3/G4",
  "111": "- [x] G9正式输入与联合G1\n- [x] 消费桥/proof/cutoff及API134完整102FI\n- [x] 真实金额与重述读回\n- [x] Stage87无override整批重建和capture竞态\n- [ ] fresh Main G及Tax-only完整影响面/原子性\n- [ ] 自然期末与独立G3/G4",
  "112": "- [x] H8正式输入与联合G1\n- [x] 原金额和四阶段输出证据\n- [x] 敏感GET必要审计失败500无保护载荷/全回滚\n- [ ] 真实信号/闸门UI及完整规则边界\n- [ ] 新候选联合验收与独立G3/G4",
  "113": "- [x] I11/R5最小依赖联合G1\n- [x] 原归属/首派竞争及生命周期45FI/8成功\n- [x] 同值/真实编辑修复、跨父子/证据/责任人拒绝及不同任务CAS\n- [x] 实际UI首派/进入执行/本人purpose上传提交，原失败ACK保留\n- [ ] 本人关闭及同任务CAS、完整表单、冻结参与人负控/M98\n- [ ] 独立G3/G4",
  "114": "- [x] 联合G1与M97/139隔离环境\n- [x] 保真留存、source12准入及已发布实际原件\n- [x] Stage87共享竞态及Native17/临时会话清理守恒\n- [ ] Tax完整闭包、真实UI/权限/完整并发\n- [ ] 新候选正常迁移与schema准入、自然期末\n- [ ] 统一候选独立G3/G4、留存清理与线上读回",
  "117": "- [x] 最小角色四项与联合G1冻结\n- [ ] 真实角色创建/冻结UI与公开freeze-revised-create竞态\n- [ ] 零/正权重冻结归属负控、父锁正式M98迁移\n- [ ] 新候选联合验收与独立G3/G4"
};
const targets = [57, 110, 111, 112, 113, 114, 117];
const reads = await Promise.allSettled(targets.map(async number => {
  const before = await api('before-' + number, repo + '/issues/' + number); assert.equal(before.state, 'open');
  const pages = Math.max(1, Math.ceil(before.comments / 100));
  for (let page = 1; page <= pages; page++) await api('comments-' + number + '-' + page, repo + '/issues/' + number + '/comments?per_page=100&page=' + page);
  let tail = before.body ?? ''; const match = /^(<!-- poms-r4ghi-g2-current\d+ -->)/.exec(tail);
  if (match) { const end = match[1].replace('<!-- ', '<!-- /'), at = tail.indexOf(end); assert(at >= 0); tail = tail.slice(at + end.length); }
  const body = '<!-- poms-r4ghi-g2-current09 -->\n\n' + common + '\n' + checks[number] + '\n\n<!-- /poms-r4ghi-g2-current09 -->' + tail;
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
fs.writeFileSync(out + '/receipt.json', JSON.stringify({ kind: 'actual-online-source12-progress09', receipts, implementationCommit: commit, formalRust: 240, newOfficialDelivery: 0, periodPositivePassed: false, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
const candidate = JSON.parse(fs.readFileSync('//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/004534-candidate-source-binding12.json'));
const file = 'docs/design/rust-r4ghi-delivery-status.json'; assert(!candidate.sourcePins.some(pin => pin.file === file));
const index = JSON.parse(fs.readFileSync(file)); index.g2CurrentOnline = '../../' + out + '/receipt.json'; index.implementationCheckpointCommit = commit;
index.currentAcceptance86 = 'rust-r4ghi/current-source12-acceptance86.json';
index.native122 = 'rust-r4ghi/native122-actual-and-conservation.json';
index.pendingBusinessDecisions = [{ decision: 'historical-period-baseline-selection', status: 'awaiting-user', currentBoundary: 'only-real-source-validation-and-reconciliation-guard; no-automatic-historical-selection-approved' }];
fs.writeFileSync(file, JSON.stringify(index, null, 2) + '\n');
console.log(JSON.stringify({ updated: receipts.map(item => item.number), allOpen: true, publishedCommit: commit, formalRust: 240, newDelivery: 0, G3Certified: false, G4Certified: false }));
