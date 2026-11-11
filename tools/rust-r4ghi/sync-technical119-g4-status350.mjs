// Root online closeout of the completed zero-operation technical child only.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process'; import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', O = R + '/tmp/rust-r4ghi/root/status350-online', repo = 'repos/illusion-tech/poms';
const sha = b => createHash('sha256').update(b).digest('hex'); assert(!fs.existsSync(O)); fs.mkdirSync(O);
function api(name, url, method = 'GET', body) {
  const args = ['api', url]; if (body) { const file = O + '/' + name + '-input.json'; fs.writeFileSync(file, JSON.stringify(body) + '\n', { flag: 'wx' }); args.push('--method', method, '--input', file); }
  const r = spawnSync('gh', args, { cwd: R, windowsHide: true, encoding: 'utf8', timeout: 45000, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(O + '/' + name + '-stdout.json', r.stdout ?? '', { flag: 'wx' }); fs.writeFileSync(O + '/' + name + '-stderr.txt', r.stderr ?? '', { flag: 'wx' }); assert.equal(r.status, 0, name + ': reconcile before retry'); return JSON.parse(r.stdout);
}
const g = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: R, windowsHide: true, encoding: 'utf8' }); assert.equal(g.status, 0);
const head = g.stdout.trim(); assert.equal(head, 'a0090157c0a508e6dd3c2433e840f8b9441b45db'); assert.equal(api('commit', repo + '/commits/' + head).sha, head);
const base = 'https://github.com/illusion-tech/poms/blob/' + head + '/', marker = '<!-- POMS-R4GHI-CURRENT-350 -->';
const section = '\n\n' + marker + '\n### 当前推进状态（350：Source15技术准入独立G3/G4通过）\n\nRust正式 **240**，R4交付 **67/95**，本批候选32项（R4 28＋R5最小4）**新增业务认证0，业务G3/G4未通过**。#57及完整R5 #116保持开放；#115已完成记录保持。\n\n[#119技术G4归档](' + base + 'docs/design/archive/slices/rust-r4ghi-source15-119/technical119-G4.json)已提交：真实Reg5→实际B1→no-replace状态最后激活，独立实际技术G3审8308及候选代码交付G4审7b5均通过；源码候选a808与证据归档a009已推工作分支。完整M98双库各139表、4935行的两新观测与冻结14 raw/xmin/meta/sequence/object守恒；13/14原状态、M97/108、Main13原一次201和旧partial/failed/NOTREADY保持，未迁移、恢复或重置。初始A6/空ownership/pub/journal另存私有同字节副本，原receipt身份不改。\n\n#119仅为0新增业务操作的技术子片，符合条件后只收口它；#118及#120与本批父子Issue继续Doing。#120四caller代码独审75项、23语法、4帮助及实际25文件读回通过，H3/backend增量0；798源码Git证据中795直接同、3旧CRLF可按记录精确还原，三条冻结EOF空白诊断单列未假称lint通过。\n\n#118从真实Source15冷快照推导完整37权限，初始状态与首次prepare-only输入已物化并进行单独exactG2；此时尚未执行普通ctx/新Auth/Tax准备/FI/正常201。下游实际执行仍需每个独立G2及fresh源码、进程、actor/account/role/session、数据scope守卫；本技术收口不授Tax/Main/classification/FI或caller业务命令。\n\n后续继续Tax15完整准备/全闭集FI/独立唯一正常201→H46等值/超值与独立Role→Main旧权限negative/精确restore→Receiver真实W45全FI及唯一正常→mixed全部Live/Period目标/完整批次/冻结预算→fresh Role/Labor全矩阵、守恒清理与业务独立G3/G4。Rust依业务正确性；期后分摊更正保真实归属与实际时间，真正期后新增费用整体排除。\n\n原349等固定快照和G1原件保留原时点；本段不把技术G4计为业务交付。\n<!-- /POMS-R4GHI-CURRENT-350 -->\n';
const updates = [];
for (const number of [57, 101, 110, 111, 112, 113, 114, 117, 118, 119, 120]) {
  const before = api(number + '-before', repo + '/issues/' + number); assert.equal(before.state, 'open'); assert(!before.body.includes(marker));
  assert(before.body.includes('<!-- POMS-R4GHI-CURRENT-349 -->'));
  let body = before.body.replace(/\n\n<!-- POMS-R4GHI-CURRENT-349 -->[\s\S]*?<!-- \/POMS-R4GHI-CURRENT-349 -->\n/, section);
  if (number === 119) {
    const unchecked = (body.match(/^- \[ \] /gm) ?? []).length; assert.equal(unchecked, 5);
    body = body.replace(/^- \[ \] /gm, '- [x] ');
  }
  assert(body.length < 65000); assert.notEqual(body, before.body);
  const fresh = api(number + '-prewrite', repo + '/issues/' + number); assert.equal(fresh.body, before.body); assert.equal(fresh.comments, before.comments);
  api(number + '-patch', repo + '/issues/' + number, 'PATCH', { body });
  const after = api(number + '-readback', repo + '/issues/' + number); assert.equal(after.body, body); assert.equal(after.state, 'open');
  updates.push({ issue: number, bodySHA256: sha(body), technical119ChecklistCompleted: number === 119 });
}
const g4Body = '<!-- POMS-TECHNICAL119-G4-ACTUAL-CLOSEOUT -->\n#119技术G3/G4已独立通过并落盘，零新增业务操作。[归档](' + base + 'docs/design/archive/slices/rust-r4ghi-source15-119/technical119-G4.json)。真实source15 Reg5/B1/state-last及139表双观测守恒已实际验证，初始A6/0ownership原始副本私有保存；源码候选a808、归档a009已推，原Frozen/failed/NOTREADY不重标。按冻结边界仅收口本项，解除#118/#120的技术前置；它们实际G2/业务G3G4仍须完成。正式Rust240、R4 67/95、本批新增业务认证0，#57与完整R5 #116保持开放。';
const c = api('119-G4-comment', repo + '/issues/119/comments', 'POST', { body: g4Body }); assert.equal(api('119-G4-comment-readback', repo + '/issues/comments/' + c.id).body, g4Body);
const beforeClose = api('119-preclose', repo + '/issues/119'); assert.equal(beforeClose.state, 'open'); assert.equal((beforeClose.body.match(/^- \[ \] /gm) ?? []).length, 0); assert(beforeClose.body.includes(marker));
api('119-close', repo + '/issues/119', 'PATCH', { state: 'closed', state_reason: 'completed' });
const closed = api('119-closed-readback', repo + '/issues/119'); assert.equal(closed.state, 'closed'); assert.equal(closed.state_reason, 'completed');
const parent = api('57-final-readback', repo + '/issues/57'); assert.equal(parent.state, 'open'); const fullR5 = api('116-final-readback', repo + '/issues/116'); assert.equal(fullR5.state, 'open');
const summary = '<!-- POMS-R4GHI-350-CURRENT-READBACK -->\n11项当前状态已同步；#119真实技术G3/G4及代码/证据提交后仅该技术Issue已收口。[技术G4](' + c.html_url + ')。业务32项仍新增认证0，后续prepare/Tax/FI/caller均保独立exactG2与实际验收边界。#57和完整R5 #116保持开放。';
const p = api('57-progress-comment', repo + '/issues/57/comments', 'POST', { body: summary }); assert.equal(api('57-progress-comment-readback', repo + '/issues/comments/' + p.id).body, summary);
const result = { kind: 'actual-Source15-119-technical-G4-online-closeout', commit: head, updates, issue119: closed.state, issue119G4: c.html_url, parent57: 'open', fullR5_116: 'open', parentComment: p.html_url, newBusinessCertified: 0 };
fs.writeFileSync(O + '/receipt.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(result));
