import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
const out = 'tmp/rust-r4ghi/root/g2-online-status10', repo = 'repos/illusion-tech/poms';
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
const commit = 'd90811f2e422d8037699058452d42cfbbd020345';
const base = 'https://github.com/illusion-tech/poms/blob/' + commit + '/';
const initial = await Promise.allSettled([
  api('main', repo + '/branches/main'), api('children110', repo + '/issues/110/sub_issues'), api('publishedCommit', repo + '/commits/' + commit),
  api('parent101', repo + '/issues/101'), api('parent116', repo + '/issues/116'), api('closed115', repo + '/issues/115'),
]);
for (const item of initial) assert.equal(item.status, 'fulfilled', 'Initial live read failed');
assert.equal(initial[0].value.commit.sha, 'd5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5');
for (const number of [111, 112, 113, 114]) assert(initial[1].value.some(item => item.number === number));
assert.equal(initial[2].value.sha, commit); assert.equal(initial[3].value.state, 'open'); assert.equal(initial[4].value.state, 'open'); assert.equal(initial[5].value.state, 'closed');
const common = "状态：**Doing / OPEN；联合G1仍为32项，G2继续，G3 Pending / G4 false**。2026-11-08（Asia/Tokyo）。\n\n正式Rust **240**，R4正式 **67/95**、余28，本批新增认证 **0**。Runtime272与canonical296 operations／242 paths／690 schemas保持各自口径。\n\n[本轮真实表单与保全检查点](https://github.com/illusion-tech/poms/blob/d90811f2e422d8037699058452d42cfbbd020345/docs/design/rust-r4ghi/source12-tail170-actual.json)已发布至工作分支d90811f2；main仍d5c79b26，没有合并、部署或切流。产品仍Source12/406份输入/M97/每库139表。原135进程退出后的同源1351经过[原卷守恒及显式进程准入](https://github.com/illusion-tech/poms/blob/d90811f2e422d8037699058452d42cfbbd020345/docs/design/rust-r4ghi/process1351-recovery161-actual.json)，旧135证据保持原标签。1351现已精确停止、原卷保留，Source13/M98尚未应用。\n\n本轮新增事实：\n\n- Own真实界面关闭条件A、随后同任务两会话CAS 200/409，全部必要写入和聚合状态均核；旧失败及已上传但未消费的证据仍保留。Creator已提交首次指派另做真实只读读回，未重发消费命令；Legacy、MAX、MASK按各自受审边界完成真实界面。\n- 角色原create200不重发，五项父锁保护负控全部23514/整体回滚；真实UI freeze200与同用户独立会话合法revised-create409形成真实锁等待链。另以新1351绑定冷开current/detail，业务version=1、rowVersion=2、四人及零权重原因准确显示；没有创建或再次冻结入口。\n- Expense四个真实表单完成；生命周期真实上传三份独立材料并完成进入验收、最终验收通过、完工、归档，E仅project read/write。原startExecution不重放，业务时间取实际后端Date。\n- GH03真实采用基线201后精确续验，GH04只提交成本分类与经营快照201、真实H08质性复核200、首阶段闸门收紧200，没有重发基线。GH02/GH03/Life01及其它旧失败不改passed；各subset的原A08 aggregate标记不改。\n- [独立原件复核](https://github.com/illusion-tech/poms/blob/d90811f2e422d8037699058452d42cfbbd020345/tools/rust-r4ghi/independent/final-gates13/addendum162.md)已核8轮192份代理raw及关联ledger/case原件。它是已完成事实审计，G3/G4明确未审未签。\n- [Source12保全](https://github.com/illusion-tech/poms/blob/d90811f2e422d8037699058452d42cfbbd020345/docs/design/rust-r4ghi/retained-source12-before-source13-139.json)包含406成员代码ZIP逐一读回、双库custom archive及TOC、40对象、新旧进程/候选/准入链和工具原件；备份前后全部raw/xmin/catalog/sequence/objects守恒。不声称实际restore或portable xmin恢复认证。\n\n此前Stage87全87必要写入FI及共享201/capture409、Native17参考及单会话清理S0守恒、API134的102/45/34与金额边界、API135同值编辑/审计回滚/C条款锁等原件保持原标签。\n\n仍待完成：四项Source13产品纠偏及最终H0/G2冻结、正常双库M98与显式schema3准入；fresh Main G与TaxRef-only完整目标/原子性、完整H规则边界、传递Labor遮罩及必要权限；自然期末和统一候选独立G3/G4。组合106的535纯测/编译只是未应用提案，不能作Source13实际候选。新的schema准入、无state after观察及真实正常UP捕获工具已复核，但尚未执行M98。\n\n历史首次补关选包策略仍待用户裁决；当前不批准自动历史选包。按用户决定保留真实来源，最早**香港2026-11-09 00:00／日本01:00**自然跨期后再验本周期末，不调时钟、不伪造来源。\n\n#115保持独立CLOSED；#57/#101/#110及未完成子项、#116继续OPEN。本轮不增加正式交付，不将部分成功、编译或独立事实审计替代Gate。\n";
const checks = {
  "57": "- [x] R0–R3按各阶段G4收口\n- [ ] R4 #101：剩余联合验收与完整阶段收口\n- [ ] R5 #116：最小依赖不代表完整提成链\n- [ ] R6迁移发布与回滚演练\n- [ ] R7正式切换及旧后端退出",
  "101": "- [x] 已有R4正式交付67项，原G4保持\n- [x] 剩余28项与最小R5四项联合G1，共32项\n- [x] 本轮Source12真实表单及原候选保全已发布\n- [ ] Source13纠偏/正常M98/schema3与完整影响面验收\n- [ ] 自然期末、独立G3/G4及完整R4收口",
  "110": "- [x] 联合G1精确32项冻结\n- [x] Source10/11/12保真留存及显式消费准入\n- [x] 原102/45/34、Stage87、Native17及敏感审计回滚\n- [x] Own/Role/Expense/GH/Lifecycle真实界面与精确续验\n- [x] 1351新进程真实绑定与冷读、原候选406代码/双库/对象保全\n- [ ] Source13产品纠偏及M98/schema3、Tax完整闭包与权限\n- [ ] H完整边界、Labor遮罩、自然期末、独立G3/G4",
  "111": "- [x] G9与联合G1、原API134完整102FI\n- [x] 金额/重述、Stage87共享全批FI及capture竞态\n- [x] 真实采用基线及已提交基线的快照分类续验\n- [ ] fresh Main G与Tax-only完整闭包/原子性\n- [ ] 新候选自然期末与独立G3/G4",
  "112": "- [x] H8与联合G1、原金额和四阶段输出\n- [x] 敏感GET必要审计失败整体回滚\n- [x] 真实H08质性复核与首阶段闸门收紧UI\n- [ ] 完整H规则边界、传递Labor遮罩及必要权限\n- [ ] 新候选联合验收与独立G3/G4",
  "113": "- [x] I11/R5最小依赖联合G1、原生命周期45FI/8成功\n- [x] 归属/首派/编辑、跨父子/证据/责任人拒绝\n- [x] 本人真实关闭、同任务及不同任务CAS\n- [x] 三材料真实上传及进入验收/最终验收/完工/归档UI\n- [ ] 冻结参与人父锁M98正式前向迁移及新候选schema准入\n- [ ] 新候选联合验收与独立G3/G4",
  "114": "- [x] 联合G1、隔离M97/139环境及原候选保全\n- [x] Stage87共享竞态、Native17与清理守恒\n- [x] 真实表单精确续验和独立raw/ledger事实审计\n- [ ] Tax完整目标/原子性、H边界/Labor/权限\n- [ ] 正常M98、schema3、自然期末\n- [ ] 统一候选独立G3/G4、留存清理与线上读回",
  "117": "- [x] 最小角色四项与联合G1冻结\n- [x] 真实create/freeze UI及公开freeze-revised-create竞态\n- [x] 零/正权重父锁五项安全负控与冻结冷读\n- [ ] 父锁M98正式前向迁移与schema3\n- [ ] 新候选联合验收与独立G3/G4"
};
const targets = [57, 101, 110, 111, 112, 113, 114, 117];
const reads = await Promise.allSettled(targets.map(async number => {
  const before = await api('before-' + number, repo + '/issues/' + number); assert.equal(before.state, 'open');
  const pages = Math.max(1, Math.ceil(before.comments / 100));
  for (let page = 1; page <= pages; page++) await api('comments-' + number + '-' + page, repo + '/issues/' + number + '/comments?per_page=100&page=' + page);
  let tail = before.body ?? ''; const match = /^(<!-- poms-r4ghi-g2-current\d+ -->)/.exec(tail);
  if (match) { const end = match[1].replace('<!-- ', '<!-- /'), at = tail.indexOf(end); assert(at >= 0); tail = tail.slice(at + end.length); }
  const body = '<!-- poms-r4ghi-g2-current10 -->\n\n' + common + '\n' + checks[number] + '\n\n<!-- /poms-r4ghi-g2-current10 -->' + tail;
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
fs.writeFileSync(out + '/receipt.json', JSON.stringify({ kind: 'actual-online-source12-progress10', receipts, implementationCommit: commit, formalRust: 240, newOfficialDelivery: 0, periodPositivePassed: false, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
const candidate = JSON.parse(fs.readFileSync('//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/004534-candidate-source-binding12.json'));
const file = 'docs/design/rust-r4ghi-delivery-status.json'; assert(!candidate.sourcePins.some(pin => pin.file === file));
const index = JSON.parse(fs.readFileSync(file)); index.g2CurrentOnline = '../../' + out + '/receipt.json'; index.implementationCheckpointCommit = commit;
index.currentAcceptance86 = 'rust-r4ghi/current-source12-acceptance86.json';
index.native122 = 'rust-r4ghi/native122-actual-and-conservation.json';
index.pendingBusinessDecisions = [{ decision: 'historical-period-baseline-selection', status: 'awaiting-user', currentBoundary: 'only-real-source-validation-and-reconciliation-guard; no-automatic-historical-selection-approved' }];
fs.writeFileSync(file, JSON.stringify(index, null, 2) + '\n');
console.log(JSON.stringify({ updated: receipts.map(item => item.number), allOpen: true, publishedCommit: commit, formalRust: 240, newDelivery: 0, G3Certified: false, G4Certified: false }));
