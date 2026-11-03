// Root activates G2 only after the independently reviewed input is public and read back.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { pin, base } from './source-guard.mjs';
const commit = '546c6c243ea6162077cb065ced54c5a8188afe23';
const formal = 'docs/design/rust-r3m', out = 'tmp/rust-r3m/root/g1-online01';
assert(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), commit);
assert.equal(execFileSync('git', ['ls-remote', '--heads', 'origin', 'codex/poms-r3-closeout'], { encoding: 'utf8' }).trim().split(/\s+/)[0], commit);
const reviewFile = formal + '/C/g1-independent-review01.json', review = JSON.parse(fs.readFileSync(reviewFile));
assert.equal(pin(reviewFile).rawBytesSha256, '2bdc08872f601cd7f14daf30b446a30ec2065b9f5e95fe406d8e0578f0384bfa');
assert(review.reviewCompleted && review.G1Certified && review.G2AuthorizedAfterOnlineFreeze && !review.G2AuthorizedNow && review.E1Approved);
const manifestFile = formal + '/g1-input-manifest01.json', manifest = JSON.parse(fs.readFileSync(manifestFile));
assert.equal(pin(manifestFile).rawBytesSha256, '7c41d08b0021ba0c7937948bd61ef990f4b4a7cac7bf4276d736a363a69b749e');
for (const p of [...manifest.protectedFiles, ...manifest.rustFiles, ...manifest.controls, ...manifest.originals]) assert.deepEqual(pin(p.file), p);
let ordinal = 0;
function api(name, args, payload) {
  const prefix = `${out}/${String(++ordinal).padStart(2, '0')}-${name}`;
  if (payload !== undefined) { fs.writeFileSync(prefix + '-input.json', JSON.stringify(payload, null, 2) + '\n', { flag: 'wx' }); args = [...args, '--input', prefix + '-input.json']; }
  const r = spawnSync('gh', ['api', ...args], { encoding: null, windowsHide: true, maxBuffer: 16_000_000 });
  fs.writeFileSync(prefix + '-stdout-original.json', r.stdout || Buffer.alloc(0), { flag: 'wx' });
  fs.writeFileSync(prefix + '-stderr-original.log', r.stderr || Buffer.alloc(0), { flag: 'wx' });
  assert.equal(r.status, 0, name + ': inspect remote before retry');
  return JSON.parse(r.stdout);
}
const marker = 'R3-CO-JOINT-G1-546c6c24';
const link = p => `https://github.com/illusion-tech/poms/blob/${commit}/${p}`;
const body = `G1 已冻结；本条仅认证本批输入，不认证实现或阶段验收。\n\n${marker}\n\n- 基线提交：${commit}；[联合基线](${link('docs/design/rust-r3-closeout-baseline.md')})。\n- [输入清单](${link(manifestFile)}) SHA-256 7c41d08b0021ba0c7937948bd61ef990f4b4a7cac7bf4276d736a363a69b749e；[独立审查](${link(reviewFile)}) SHA-256 2bdc08872f601cd7f14daf30b446a30ec2065b9f5e95fe406d8e0578f0384bfa，Pass。\n- supplement01/02/03 是联合冻结组成部分：A14+B38+Root项目基础6；D旧baseline目录指向和B三治理旧pin按来源重述；转换用例只用POST /api/leads/{id}:convertToProject，不加别名。\n- 三线：#98 Lead内部/评分tuple；#99客户销售项目内部/四补缺；#100交付审计/E1/统一验收定义。Root独占共享接线、原UI两文件及全部实际执行；非作者独立G3/固定提交/G4。\n- 用户裁决：历史缺少匹配系统快照时，在审批同一事务先补算系统评分并留快照，再执行覆盖审批，任一必要写入失败整体回滚；正常manual沿用匹配已存tuple。\n- 公共操作增量0；当前Rust173/138/585，R3既有58/58不重复计数。六具名产品缺口尚待G2修复、统一候选实际阶段验收。\n- E1本批重新批准仅原5 regular文件419264B和23 legacy消费者，只为退出工作；Root负责、2026-11-09不延，G3前须受支持归档重放实测并删除5aliases。\n- 仅本批新namespace/actors/secrets；旧private/PG17不动。历史failed/partial/stopped/uncertified、ignored和平台轴保留。未来合同R4/佣金R5和部署/切流/迁移接管不在本批。\n- 本条与在线状态读回完成后才G2；本批完整G3/G4实际满足才可关闭#97/#85，#57保持Open。\n`;
const comments = [];
for (const number of [97, 98, 99, 100, 85]) {
  const issue = api('before-' + number, [`repos/illusion-tech/poms/issues/${number}`]);
  assert.equal(issue.state, 'open');
  const previous = api('comments-' + number, [`repos/illusion-tech/poms/issues/${number}/comments?per_page=100`]);
  assert(!previous.some(x => x.body.includes(marker)), 'Existing freeze; resume instead of duplicate');
  const comment = api('freeze-' + number, [`repos/illusion-tech/poms/issues/${number}/comments`, '--method', 'POST'], { body });
  const next = number === 85 ? issue.body + '\n\n当前收口批#97联合G1已独立Pass并线上冻结，三线进入G2；完整R3阶段尚未认证，#85仍Open。\n' : issue.body.replace('状态：Todo / G1准备。', '状态：Doing / 联合G1已冻结，进入G2。').replace('- [ ] G1：', '- [x] G1：') + '\n联合G1：' + comment.html_url + '\n';
  api('body-' + number, [`repos/illusion-tech/poms/issues/${number}`, '--method', 'PATCH'], { body: next });
  const verified = api('verify-comment-' + number, [`repos/illusion-tech/poms/issues/comments/${comment.id}`]);
  const after = api('after-' + number, [`repos/illusion-tech/poms/issues/${number}`]);
  assert.equal(verified.body, body); assert.equal(after.state, 'open'); assert.equal(after.body, next);
  comments.push({ issue: number, id: comment.id, url: comment.html_url, bodyExact: true, open: true });
}
const p57 = api('before-57', ['repos/illusion-tech/poms/issues/57']); assert.equal(p57.state, 'open');
const p57body = p57.body + `\n\n2026-11-03 R3收口#97（#98/#99/#100）已冻结联合G1，独立Pass，进入三线G2。冻结包${commit}；必要阶段验收、E1退出及独立G3/G4尚待完成。R3 checkbox保持未完成，#85/#57仍Open，R4–R7未因此完成。\n`;
api('body-57', ['repos/illusion-tech/poms/issues/57', '--method', 'PATCH'], { body: p57body });
const verified57 = api('after-57', ['repos/illusion-tech/poms/issues/57']); assert.equal(verified57.state, 'open'); assert.equal(verified57.body, p57body);
const authority = { kind: 'R3-closeout-actual-online-G1-authority', createdAt: new Date().toISOString(), base, baselineCommit: commit, manifest: pin(manifestFile), supplements: [1, 2, 3].map(n => pin(`${formal}/g1-root-supplement0${n}.json`)), independentReview: pin(reviewFile), onlineComments: comments, parent85Open: true, overall57Open: true, G1Certified: true, G2Authorized: true, G3Certified: false, G4Certified: false, stageIntegrationComplete: false, actualProductAcceptanceExecuted: false };
fs.writeFileSync(formal + '/g1-gate-authority01.json', JSON.stringify(authority, null, 2) + '\n', { flag: 'wx' });
const statusFile = 'docs/design/rust-r3-closeout-status.json', status = JSON.parse(fs.readFileSync(statusFile));
Object.assign(status, { phase: 'Doing-G2', G1Certified: true, G2Authorized: true, G1BaselineCommit: commit, G1Authority: pin(formal + '/g1-gate-authority01.json') });
fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
console.log(JSON.stringify({ G1Certified: true, G2Authorized: true, onlineFreezeReadBack: comments.map(x => x.issue), baselineCommit: commit, stageIntegrationComplete: false }));
