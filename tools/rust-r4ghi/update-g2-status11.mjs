import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
const out = 'tmp/rust-r4ghi/root/g2-online-status11', repo = 'repos/illusion-tech/poms';
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
const commit = '0b82739a5c194f9185a7cbbed8fe05e74b202241';
const base = 'https://github.com/illusion-tech/poms/blob/' + commit + '/';
const initial = await Promise.allSettled([
  api('main', repo + '/branches/main'), api('children110', repo + '/issues/110/sub_issues'), api('publishedCommit', repo + '/commits/' + commit),
  api('parent101', repo + '/issues/101'), api('parent116', repo + '/issues/116'), api('closed115', repo + '/issues/115'),
]);
for (const item of initial) assert.equal(item.status, 'fulfilled', 'Initial live read failed');
assert.equal(initial[0].value.commit.sha, 'd5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5');
for (const number of [111, 112, 113, 114]) assert(initial[1].value.some(item => item.number === number));
assert.equal(initial[2].value.sha, commit); assert.equal(initial[3].value.state, 'open'); assert.equal(initial[4].value.state, 'open'); assert.equal(initial[5].value.state, 'closed');
const common = "状态：**Doing / OPEN；联合G1仍为32项，G2继续，G3 Pending / G4 false**。2026-11-09（Asia/Tokyo）。\n\n正式Rust **240**，R4正式 **67/95**、余28，本批新增认证 **0**。Runtime272与canonical296 operations／242 paths／690 schemas保持各自口径。\n\n[Source13实际技术检查点](https://github.com/illusion-tech/poms/blob/0b82739a5c194f9185a7cbbed8fe05e74b202241/docs/design/rust-r4ghi/source13-actual208.json)已发布工作分支0b82739a；main仍d5c79b26，无合并、部署或切流。原Source12/135/1351保全和成功、失败、partial标签均留。当前为Source13/API136、416份输入、原H0 195文件、M98、每库139表。\n\n已完成并有实际原件：\n\n- 修正TaxRef根发现、跨项目财务父来源闭包、真实历史期末来源资格以及冻结参与人父锁。Rust实际镜像四条命令exit0，535通过、54历史忽略；Root是实际盘点和复制，未冒称Root编译。H0 26个Node文件共211通过、0失败，原416/195字节不变。Native lint/build通过，2839输入仅新增M98，原两条警告保留。\n- 双库分别通过正常MikroORM forward M98。独立复核5份sealed snapshot及1112唯一row文件：旧97迁移行、138业务表及raw/xmin保留，仅批准的函数body、M98行和对应sequence前进。原M97业务基线未重置，不声称跨数据库原子提交或实际restore。\n- API136实际readiness200；B0→final plan/R3→B1无回写环，R3永远指原B0。显式schema3单独核准M98规范变化。双真实父行先锁定的五项冻结参与人负控均23514并整体回滚，旧M97原件不改标。\n- [独立技术事实审计](https://github.com/illusion-tech/poms/blob/0b82739a5c194f9185a7cbbed8fe05e74b202241/tools/rust-r4ghi/independent/final-gates13/actual13-facts01.md)核完构建、迁移、原业务基线、进程及准入固定原件；它没有授予业务验收、G3或G4认证。\n- 已自然跨过香港11月9日零点。真实2026-W45准备：Receiver GET200且eligible；Main GET200仅缺成本分类；MAX夹具准备实际422容量超限，原partial保留且不作为期末正向。尚无期末POST。\n\n当前补缺和后续：\n\n- Tax203在任何Tax HTTP前被exact共享资源58准入漏项挡住。记录真实producer为12、两项目HTTP真实诞生10；不能盲加JSON、借别的path或重标来源。正准备经独立复核的119/H1工具及资源sidecar、新B2；原G2/H0/R3/B0/B1和API136原构建身份保留，尚未宣称H1已准入。\n- 此后继续fresh Main G、Tax-only完整目标FI及同body原子提交；再完成H01/20%/H04规则边界、真实EO最小权限及传递Labor遮罩/必要敏感审计。\n- Tax完成后，使用真实合格来源验证期末创建、读取、期间目标遮罩及实时current/闸门不回退。期末工具正在补强实际准备原件、全成本单位及分类来源绑定，未审准前不执行。\n- 统一候选补齐影响面和阶段验收、独立G3/G4及精确保全清理后，才增加正式交付和收口满足条件的子项。\n\n[此前真实表单验收](https://github.com/illusion-tech/poms/blob/0b82739a5c194f9185a7cbbed8fe05e74b202241/docs/design/rust-r4ghi/source12-tail170-actual.json)与Stage87全87必要写入FI/共享201-capture409、Native17、API134的102/45/34、金额边界及敏感审计回滚，继续保持各自真实候选及原标签。\n\n历史首次补关选包策略仍待用户裁决；目前只核真实来源并在不能证明时阻断，没有批准自动重选历史预算。用户已明确保留真实来源、自然跨期续验；不调时钟、不回填来源。\n\n#115保持独立CLOSED；#57/#101/#110及未完成子项、#116继续OPEN。部分成功、编译或事实审计均不替代Gate。\n";
const checks = {
  "57": "- [x] R0–R3按各阶段G4收口\n- [ ] R4 #101：剩余联合验收与完整阶段收口\n- [ ] R5 #116：最小依赖不代表完整提成链\n- [ ] R6迁移发布与回滚演练\n- [ ] R7正式切换及旧后端退出",
  "101": "- [x] R4正式交付67项及剩余28项联合最小R5四项G1\n- [x] Source12真实表单及原候选保全\n- [x] Source13实际构建、正常双库M98与schema3\n- [ ] 119/H1资源补录及Tax、H、Labor完整影响面\n- [ ] 期末真实创建/读取、独立G3/G4及完整R4收口",
  "110": "- [x] 联合G1精确32项冻结\n- [x] 历史候选保真与真实表单精确续验\n- [x] Source13实际535/211、Native检查、双库正常M98\n- [x] 原M97基线保留、schema3/B0/R3/B1及五项冻结负控\n- [ ] 119/H1/B2显式工具与资源准入\n- [ ] Tax完整闭包/原子性、H边界/Labor/权限\n- [ ] 自然期末实际写入、统一独立G3/G4",
  "111": "- [x] G9联合G1、原API134完整102FI\n- [x] 真实金额/重述、Stage87共享全批FI与capture竞态\n- [x] Source13真实历史来源/TAX根/跨项目父闭包纠偏及构建\n- [ ] exact58工具资源准入、fresh Main G与Tax-only完整闭包/原子性\n- [ ] 真实合格期末创建/读取、独立G3/G4",
  "112": "- [x] H8联合G1、原金额和四阶段输出\n- [x] 敏感GET必要审计失败整体回滚\n- [x] 真实H08质性复核及首阶段闸门收紧UI\n- [ ] 完整H01/20%/H04规则边界\n- [ ] EO真实最小权限、传递Labor及期间目标遮罩\n- [ ] 新候选联合验收与独立G3/G4",
  "113": "- [x] I11/R5最小依赖G1、原生命周期45FI/8成功\n- [x] 归属/首派/编辑、本人关闭/同任务与不同任务CAS\n- [x] 三材料真实上传及验收/完工/归档UI\n- [x] 冻结父锁M98正常双库前向迁移及五项安全回滚负控\n- [x] Source13真实构建及原基线保留的schema3\n- [ ] 新候选影响面联合验收与独立G3/G4",
  "114": "- [x] 联合G1与历次候选保全\n- [x] Stage87共享竞态、Native17与原生会话清理守恒\n- [x] Source12真实表单精确续验及独立raw/ledger审计\n- [x] Source13实际构建/M98/schema3独立技术事实审计\n- [ ] 119/H1/B2、Tax、H边界/Labor/权限\n- [ ] 真实期末及统一独立G3/G4、留存清理与线上读回",
  "117": "- [x] 最小角色四项联合G1\n- [x] 真实create/freeze UI及公开freeze-revised-create竞态\n- [x] 冻结冷读、零权重职责及五项父锁负控\n- [x] M98正常双库前向迁移、Source13/schema3\n- [ ] 新候选影响面联合验收与独立G3/G4"
};
const targets = [57, 101, 110, 111, 112, 113, 114, 117];
const reads = await Promise.allSettled(targets.map(async number => {
  const before = await api('before-' + number, repo + '/issues/' + number); assert.equal(before.state, 'open');
  const pages = Math.max(1, Math.ceil(before.comments / 100));
  for (let page = 1; page <= pages; page++) await api('comments-' + number + '-' + page, repo + '/issues/' + number + '/comments?per_page=100&page=' + page);
  let tail = before.body ?? ''; const match = /^(<!-- poms-r4ghi-g2-current\d+ -->)/.exec(tail);
  if (match) { const end = match[1].replace('<!-- ', '<!-- /'), at = tail.indexOf(end); assert(at >= 0); tail = tail.slice(at + end.length); }
  const body = '<!-- poms-r4ghi-g2-current11 -->\n\n' + common + '\n' + checks[number] + '\n\n<!-- /poms-r4ghi-g2-current11 -->' + tail;
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
fs.writeFileSync(out + '/receipt.json', JSON.stringify({ kind: 'actual-online-source13-progress11', receipts, implementationCommit: commit, formalRust: 240, newOfficialDelivery: 0, periodPositivePassed: false, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
const candidate = JSON.parse(fs.readFileSync('//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business13/main01/B1-Source13-admitted.json'));
const file = 'docs/design/rust-r4ghi-delivery-status.json'; assert(!candidate.sourcePins.some(pin => pin.file === file));
const index = JSON.parse(fs.readFileSync(file)); index.g2CurrentOnline = '../../' + out + '/receipt.json'; index.implementationCheckpointCommit = commit;
index.currentAcceptance86 = 'rust-r4ghi/current-source12-acceptance86.json';
index.native122 = 'rust-r4ghi/native122-actual-and-conservation.json';
index.pendingBusinessDecisions = [{ decision: 'historical-period-baseline-selection', status: 'awaiting-user', currentBoundary: 'only-real-source-validation-and-reconciliation-guard; no-automatic-historical-selection-approved' }];
fs.writeFileSync(file, JSON.stringify(index, null, 2) + '\n');
console.log(JSON.stringify({ updated: receipts.map(item => item.number), allOpen: true, publishedCommit: commit, formalRust: 240, newDelivery: 0, G3Certified: false, G4Certified: false }));
