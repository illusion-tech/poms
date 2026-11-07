import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const out = 'tmp/rust-r4ghi/root/g2-online-status06'; assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const repo = 'repos/illusion-tech/poms', marker = '<!-- poms-r4ghi-g2-current06 -->', end = '<!-- /poms-r4ghi-g2-current06 -->';
function api(name, endpoint, body) {
  const args = ['api', endpoint];
  if (body) { const input = `${out}/${name}-input.json`; fs.writeFileSync(input, JSON.stringify(body) + '\n', { flag: 'wx' }); args.push('--method', 'PATCH', '--input', input); }
  for (let n = 0; n < (body ? 1 : 3); n++) {
    const label = name + (n ? `-retry${n}` : ''), result = spawnSync('gh', args, { encoding: 'utf8', windowsHide: true, timeout: 45000 });
    fs.writeFileSync(`${out}/${label}-stdout.json`, result.stdout ?? '', { flag: 'wx' }); fs.writeFileSync(`${out}/${label}-stderr.log`, result.stderr ?? '', { flag: 'wx' });
    if (result.status === 0) return JSON.parse(result.stdout);
    if (body || n === 2) throw new Error(`GitHub call failed; inspect preserved original ${label}; never blindly retry a mutation`);
  }
}
const children = api('children110', `${repo}/issues/110/sub_issues`); for (const number of [111, 112, 113, 114]) assert(children.some(child => child.number === number));
const common = `状态：**Doing / OPEN；联合G1不变，G2正在修复真实联合验收发现的引用迁移缺口**。2026-11-08（Asia/Tokyo）。

正式Rust仍为**240**；R4已交付**67/95**、余28。本批G9/H8/I11及R5最小角色4共**32项**，新增正式交付**0**。先前实际导出的runtime272、完整规范242 paths／296 operations／690 schemas，与正式认证交付分列。

source10/API133实际完成了两合同真实审批、激活、正式应收计划、净税回款依据、本人移交确认、角色冻结和执行准入。限定证据包括G/H四类命令48项必要写入故障回滚及成功、角色/执行16项、基础编辑3项；原创建归属/永久首派消费/真实两会话200-409竞争也保留。上述均属于明确的旧候选，不挪作后续候选已通过。

新的非空E/F联合验收由服务端发现2项目、3 live终端、102必要写入族。前21族实际命中一次且完整回滚；002340在G-share-consumption命中前返回409 operating_classification_evidence_changed，primary/fallback均0。本轮是**partial，尚无成功重述**。源码核对发现消费前后self evidence桥、完整分摊SourceSnapshot迁移及basis/result跨项目proof选择缺口；以业务正确性修复，保留一致性校验，不能改宽预期或丢旧证据绕过。当前本地正式纠偏为g2-consumed-evidence-corrective54.md（待发布），不是新增业务G1。

用户已批准保留真实来源跨期验收。Root53已封存原404源码包、原binary、两份PG15 custom归档（TOC已核、未restore）、6对象及原state/全部私有原件；备份前后所有行/xmin、catalog、sequence和对象保持不变，原volume继续保留，API133已准确停。原source10不重绑定、不清理；后续独立候选须显式消费保留数据并重新验收。

最小费用→确认→E实际成本→F阶段表单已补：实际生产构建、66 suites／463 tests、Admin与data-access lint通过；真实浏览器仍待新后端候选。MAX真实商业差异必须走合法新baseline/资格及正式审批，不能用轻复核绕过重差异。其余UI、权限、并发、阶段验收和独立G3/G4继续完成。

本周期末最早具备日期条件的时间仍为**香港2026-11-09 00:00／日本同日01:00**；届时还须核真实来源资格、完整影响闭包与统一候选。现在不记期末正向通过，不改时钟或伪造历史资格。实时current与独立期间历史按已决策口径维护。

已发布输入仍为[S6 A2](https://github.com/illusion-tech/poms/commit/2cd1be6029cf1b14ebfb1fc4530af894507a4c5a)及[工具B2](https://github.com/illusion-tech/poms/commit/8c6e98db9cae598787da095084965c434ee1105a)。当前G2新证据和修复待正式提交发布，不能把本状态说明视作G3/G4。#115独立CLOSED；#57/#101/#110及未完成子项/#116保持OPEN，无部署或切流。
`;
const checks = {
  57: '- [x] R0–R3按各阶段G4收口\n- [ ] R4 #101：本批32项及完整阶段验收\n- [ ] R5 #116：最小依赖 #117不代表完整提成链\n- [ ] R6迁移发布接管与回滚演练\n- [ ] R7正式切换及旧后端退出',
  110: '- [x] 联合G1精确32项冻结\n- [x] 原source10限定HTTP/PG证据与53真实来源封存\n- [ ] 纠偏54及独立新候选/保留数据准入\n- [ ] 完整102项非空更正FI及统一候选验收\n- [ ] 真实UI、权限、并发和阶段验收\n- [ ] 自然跨期后的期末正向验收\n- [ ] 独立G3/G4及实际线上读回',
  111: '- [x] G9正式输入与联合G1已冻结\n- [x] 原source10真实G捕获及限定故障回滚证据留存\n- [ ] 纠偏54的消费桥/SourceSnapshot/proof修复\n- [ ] 新统一候选的完整更正与旧事实/current验收\n- [ ] 自然跨期后的真实期末正向验证\n- [ ] 独立G3/G4',
  114: '- [x] 联合G1验收范围及隔离M97/139环境\n- [x] 原候选创建归属/首派竞争、限定写入FI及53封存原件\n- [ ] 统一新候选的完整业务链/102项FI\n- [ ] MAX等边界、真实JSON/DOM与本人操作闭环\n- [ ] 权限、真实并发和阶段验收\n- [ ] 自然跨期的期末正向验证\n- [ ] 独立G3/G4和最终条件满足后的清理归档',
};
const receipts = [];
for (const number of [57, 110, 111, 114]) {
  const prior = api(`before-${number}`, `${repo}/issues/${number}`); assert.equal(prior.state, 'open');
  api(`comments-${number}`, `${repo}/issues/${number}/comments?per_page=100`);
  let tail = prior.body ?? '';
  const match = /^(<!-- poms-r4ghi-g2-current\d+ -->)/.exec(tail);
  if (match) { const closing = match[1].replace('<!-- ', '<!-- /'); const at = tail.indexOf(closing); assert(at >= 0); tail = tail.slice(at + closing.length); }
  else assert.equal(number, 111, 'Unknown current marker: preserve issue body');
  const body = `${marker}\n\n${common}\n${checks[number]}\n\n${end}${tail}`;
  const fresh = api(`prewrite-${number}`, `${repo}/issues/${number}`); assert.equal(fresh.body, prior.body, 'Concurrent issue body change; retain originals');
  if (prior.body !== body) api(`patch-${number}`, `${repo}/issues/${number}`, { body });
  const after = api(`after-${number}`, `${repo}/issues/${number}`); assert.equal(after.state, 'open'); assert.equal(after.body, body);
  receipts.push({ number, state: after.state, url: after.html_url, bodySHA256: createHash('sha256').update(body).digest('hex') });
}
const evidence = { kind: 'actual-GitHub-corrective54-and-retained-real-source-status', capturedAt: new Date().toISOString(), receipts,
  formalRust: 240, newOfficialDelivery: 0, partialFIFamilies: 21, fullFIPassed: false, periodPositivePassed: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(`${out}/receipt.json`, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
const file = 'docs/design/rust-r4ghi-delivery-status.json', index = JSON.parse(fs.readFileSync(file));
index.date = '2026-11-08'; index.g2CurrentOnline = `../../${out}/receipt.json`;
index.currentCorrective = { checkpoint: 'rust-r4ghi/g2-consumed-evidence-corrective54.md', status: 'Block', classification: 'new-real-drift',
  originalSourceEpoch: 'g2-business10', originalAPI: 133, originalAPIStopped: true, originalDataRetained: true,
  retention: 'rust-r4ghi/retained-source10-before-correction53.json', requiredWriteFamilies: 102, originalPassedFamilies: 21,
  originalSeries: 'partial-no-successful-restatement', nextConsumerAdmission: 'pending', G3Certified: false, G4Certified: false };
index.currentUIValidation = { build: '../../tmp/rust-r4ghi/root/admin-build05/receipt.json', tests: 463, suites: 66,
  testReceipt: '../../tmp/rust-r4ghi/root/admin-test04/receipt.json', realDOMPassed: false };
fs.writeFileSync(file, JSON.stringify(index, null, 2) + '\n');
console.log(JSON.stringify({ updated: receipts.map(item => item.number), allOpen: true, formalRust: 240, newOfficialDelivery: 0, G3Certified: false, G4Certified: false }));
