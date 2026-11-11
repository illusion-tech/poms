// Replace only the prior current-status section; preserve frozen evidence/comments.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', O = R + '/tmp/rust-r4ghi/root/status349-online';
const repo = 'repos/illusion-tech/poms', sha = b => createHash('sha256').update(b).digest('hex');
assert(!fs.existsSync(O)); fs.mkdirSync(O);
function api(name, url, method = 'GET', body) {
  const argv = ['api', url];
  if (body) { const file = O + '/' + name + '-input.json'; fs.writeFileSync(file, JSON.stringify(body) + '\n', { flag: 'wx' }); argv.push('--method', method, '--input', file); }
  const r = spawnSync('gh', argv, { cwd: R, windowsHide: true, encoding: 'utf8', timeout: 45000, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(O + '/' + name + '-stdout.json', r.stdout ?? '', { flag: 'wx' }); fs.writeFileSync(O + '/' + name + '-stderr.txt', r.stderr ?? '', { flag: 'wx' });
  assert.equal(r.status, 0, name + ': reconcile original outcome before retry'); return JSON.parse(r.stdout);
}
const g = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: R, windowsHide: true, encoding: 'utf8' }); assert.equal(g.status, 0);
const head = g.stdout.trim(); assert.equal(head, 'b9a48d85b4d8aea47e02e33d91d42eaff6c7fea7');
assert.equal(api('commit', repo + '/commits/' + head).sha, head);
const base = 'https://github.com/illusion-tech/poms/blob/' + head + '/', marker = '<!-- POMS-R4GHI-CURRENT-349 -->';
const section = '\n\n' + marker + '\n### 当前推进状态（349：新隔离 API 就绪）\n\nRust正式 **240**，R4已交付 **67/95**，联合候选32项（R4 28＋R5最小4）**新增认证0，业务G3/G4未通过**。#57及完整业务R5 #116保持开放；#115已闭合记录保持。\n\n[固定状态349](' + base + 'docs/design/rust-r4ghi/continuation-status349.json)接续原348：两Rust业务纠偏和Root/mirror八条Cargo实际通过的原证据保持，23个组件及完整227 helper已独立实际读回。原API14已唯一受控SIGTERM退役，真实Source15 buildBinding通过完整原生后验；新ROOT15 API已在31441启动，真实readiness 200。原13/14状态、ownership和Main13一次201保持；无迁移、恢复、基线重置或Main成功命令重放。\n\n**API就绪尚不等于Source15状态准入。** 新观察/B0/Reg5/B1/state在349时仍未发布：先完成139表默认只读双快照与完整raw/xmin/meta/sequence/objects/owned守恒，实际B0、scope＋B0非作者审与Root审批，再Reg5→实际B1→no-replace状态最后激活及独立技术读回，之后才进入新业务命令。\n\n#118八外置叶已非作者代码就绪；真实15 prepare、完整闭集FI、独立审批后的唯一正常201和F/C/S尚未执行。#120原code01已确认旧14 code-ready标识会拒绝真正15，原件保NOT READY；code02只修正这一字节，作者75项/23syntax/4help通过，349时独立最终代码复核进行中，25个外置caller尚未推广，H3/backend增量0。旧partial、failed和NOT READY均不改作正向验收。\n\n随后按Tax→H46 equal/above→独立Role→Main旧权限negative/精确restore→Receiver真实W45全FI与唯一正常→mixed完整来源/全批次/冻结期间预算→期后fresh Role/Labor全scope、清理与守恒，完成独立业务G3/G4后再收口合格子片。Rust按业务正确性验收；历史期间更正按真实业务归属纳入，保留实际期后更正证据，真正期后新增费用整体排除。\n\n本段为阶段进度；原固定G1与历史证据保留原时点标签，不代表本批已认证。\n<!-- /POMS-R4GHI-CURRENT-349 -->\n';
const updates = [];
for (const number of [57, 101, 110, 111, 112, 113, 114, 117, 118, 119, 120]) {
  const before = api(number + '-before', repo + '/issues/' + number); assert.equal(before.state, 'open'); assert(!before.body.includes(marker));
  const old = /\n\n<!-- POMS-R4GHI-CURRENT-348 -->[\s\S]*?<!-- \/POMS-R4GHI-CURRENT-348 -->\n/;
  const has348 = before.body.includes('<!-- POMS-R4GHI-CURRENT-348 -->');
  if ([57, 101, 110, 111, 112, 113, 114, 117].includes(number)) assert(has348);
  const body = has348 ? before.body.replace(old, section) : before.body + section;
  assert.notEqual(body, before.body); assert(body.length < 65000);
  const fresh = api(number + '-prewrite', repo + '/issues/' + number); assert.equal(fresh.body, before.body); assert.equal(fresh.comments, before.comments);
  api(number + '-patch', repo + '/issues/' + number, 'PATCH', { body });
  const after = api(number + '-readback', repo + '/issues/' + number); assert.equal(after.body, body); assert.equal(after.state, 'open');
  updates.push({ number, state: 'open', bodySHA256: sha(body), priorCurrentSectionReplaced: has348 });
}
const comments = [];
for (const number of [57, 119]) {
  const body = '<!-- POMS-R4GHI-349-PROGRESS-READBACK -->\n已同步状态349及11项Issue。固定证据commit `' + head + '`：原API14已安全退休，真实Source15绑定完成，新隔离API真实readiness200；新15状态/Reg5/B1及业务验收未完成。新增认证0，业务G3/G4不通过、#57/#116保持开放。原348和旧partial/failed/NOTREADY原件不重标。';
  const c = api(number + '-comment', repo + '/issues/' + number + '/comments', 'POST', { body });
  assert.equal(api(number + '-comment-readback', repo + '/issues/comments/' + c.id).body, body); comments.push(c.html_url);
}
const result = { kind: 'actual-current349-GitHub-issue-readback', commit: head, updates, comments, actualAPIReadiness: 200, Source15Admitted: false, officialRust: 240, R4Delivered: 67, newCertified: 0, G3: false, G4: false };
fs.writeFileSync(O + '/receipt.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(result));
