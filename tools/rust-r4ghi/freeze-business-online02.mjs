// Root only. Independent design approval is necessary; exact online readback
// completes the G1 admission. No product, main, issue closure or deployment.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

process.chdir('E:/projects/worktrees/poms-r3hijk-next28/poms');
const reviewPath = process.argv[2];
assert(reviewPath?.startsWith('tools/rust-r4ghi/independent/business-g1/round02/'));
const manifestPath = 'docs/design/rust-r4ghi/g1-source-manifest01.json';
const receiptPath = 'docs/design/rust-r4ghi/g1-online01.json';
const out = 'tmp/rust-r4ghi/root/business-g1-online02';
assert(!fs.existsSync(out), 'inspect partial online evidence before a retry');
assert(!fs.existsSync(receiptPath));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function git(args) {
  const result = spawnSync('git', args, { encoding: null, windowsHide: true, maxBuffer: 30_000_000 });
  assert.equal(result.status, 0, `git ${args[0]} failed`);
  return result.stdout;
}
const review = json(reviewPath), manifest = json(manifestPath);
assert.equal(review.nonAuthor, true);
assert.equal(review.G1Certified, true);
assert.equal(review.readyForOnlineFreeze, true);
assert.deepEqual(review.unresolvedFindings, []);
assert.match(review.approvedInputCommit, /^[0-9a-f]{40}$/);
assert.equal(review.sourceManifestSHA256, sha(fs.readFileSync(manifestPath)));
const input = review.approvedInputCommit;
const head = git(['rev-parse', 'HEAD']).toString().trim();
git(['merge-base', '--is-ancestor', input, head]);
assert.equal(sha(git(['show', `${head}:${reviewPath}`])), sha(fs.readFileSync(reviewPath)), 'review must be committed');
for (const entry of manifest.entries) {
  assert.equal(sha(git(['show', `${input}:${entry.path}`])), entry.sha256, `approved input changed: ${entry.path}`);
  assert.equal(sha(git(['show', `${head}:${entry.path}`])), entry.sha256, `candidate changed after review: ${entry.path}`);
  assert.equal(sha(fs.readFileSync(entry.path)), entry.sha256, `uncommitted normative change: ${entry.path}`);
}
fs.mkdirSync(out, { recursive: true });
const repo = 'repos/illusion-tech/poms', calls = [];
let sequence = 0;
function api(label, endpoint, method = 'GET', body) {
  for (let attempt = 1; attempt <= (method === 'GET' ? 3 : 1); attempt++) {
    const prefix = out + '/' + String(++sequence).padStart(3, '0') + '-' + label + '-attempt' + attempt;
    const args = ['api', endpoint, '--method', method];
    if (body !== undefined) { fs.writeFileSync(prefix + '-input.json', JSON.stringify(body, null, 2) + '\n', { flag: 'wx' }); args.push('--input', prefix + '-input.json'); }
    const result = spawnSync('gh', args, { encoding: null, windowsHide: true, timeout: 55000, maxBuffer: 12000000 });
    fs.writeFileSync(prefix + '-stdout.json', result.stdout ?? Buffer.alloc(0), { flag: 'wx' });
    fs.writeFileSync(prefix + '-stderr.bin', result.stderr ?? Buffer.alloc(0), { flag: 'wx' });
    calls.push({ label, attempt, endpoint, method, exitCode: result.status, file: prefix + '-stdout.json', rawBytesSHA256: sha(result.stdout ?? Buffer.alloc(0)) });
    fs.writeFileSync(out + '/progress.json', JSON.stringify(calls, null, 2) + '\n');
    if (result.status === 0) return result.stdout?.length ? JSON.parse(result.stdout) : null;
    if (method !== 'GET' || attempt === 3) assert.equal(result.status, 0, 'inspect partial read/write acknowledgement before proceeding');
  }
}
assert.equal(api('feature-ref', `${repo}/git/ref/heads/codex/poms-r4ghi-next25`).object.sha, head);
assert.equal(api('main-ref', `${repo}/git/ref/heads/main`).object.sha, manifest.productBase);
const numbers = [57, 101, 110, 111, 112, 113, 114, 116, 117];
const before = new Map(numbers.map(number => [number, api(`before-${number}`, `${repo}/issues/${number}`)]));
assert([...before.values()].every(issue => issue.state === 'open'));
const userfix = api('userfix-protected', `${repo}/issues/115`);
assert.equal(userfix.state, 'closed');
assert.equal(userfix.state_reason, 'completed');
for (const [parent, children] of [[101, [110]], [110, [111, 112, 113, 114]], [116, [117]], [57, [101, 116]]]) {
  const actual = api(`children-${parent}`, `${repo}/issues/${parent}/sub_issues?per_page=100`);
  assert(children.every(child => actual.some(issue => issue.number === child)), `parent relation changed: ${parent}`);
}
// These are actual completion dependencies. They do not serialize independent
// business implementation after one common G1; real integration consumes them.
const dependencyPlan = [[113, [117]], [114, [111, 112, 113, 117]]];
for (const [consumer, producers] of dependencyPlan) {
  const existing = api(`dependencies-before-${consumer}`, `${repo}/issues/${consumer}/dependencies/blocked_by?per_page=100`);
  for (const producer of producers) {
    if (!existing.some(issue => issue.id === before.get(producer).id)) api(`dependency-${consumer}-${producer}`, `${repo}/issues/${consumer}/dependencies/blocked_by`, 'POST', { issue_id: before.get(producer).id });
  }
  const actual = api(`dependencies-readback-${consumer}`, `${repo}/issues/${consumer}/dependencies/blocked_by?per_page=100`);
  assert(producers.every(producer => actual.some(issue => issue.id === before.get(producer).id)));
}
const marker = '<!-- poms-r4ghi-joint-g1-01 -->';
const url = `https://github.com/illusion-tech/poms/blob/${head}/`;
const note = `G1 已冻结。\n\n- 联合范围：G9、H8、I11、R5最小角色4，共32项（29既有、3新增）；R4规划95、已交付67，Rust正式240，272仅为验收后的目标。\n- 冻结输入提交：${input}；[联合基线](${url}docs/design/rust-r4ghi-next32-baseline.md)、[精确操作表](${url}docs/design/rust-r4ghi/operation-map01.json)、[原字节manifest](${url}${manifestPath})，SHA256 ${review.sourceManifestSHA256}。\n- [非作者G1复核](${url}${reviewPath})；有效v2是唯一目标，首轮2P1/1P2与原草案保留。最小DTO、未知税额、冻结成员不可改挂、真实F纠正及完整影响集和第六项责任链裁决已纳冻结。\n- Root统公共契约、迁移/ORM、既有关键producer、接线/生成、Git与统一环境；G/H/I从同一输入按模块并行。项目集成必须消费真实交付，不能用旧Node错误行为作正确性目标。\n- 精确命名/类型/日期/UUID/金额/版本/状态/投影/事务/锁/真实UI及验收见基线与acceptance-plan01.json。新3canonical见inventory6.25；必要写整体回滚；无Gate例外。\n- 仅实际通过后收口本批子片；完整R4阶段真实验收及独立G3/G4后才可关#101，#57/#116保持Open。#115已独立G4且Closed，不重复计交付。无部署切流、性能或外部存储认证。\n\n${marker}`;
const comments = [], updated = [];
const titleUpdates = new Map([[110, '[RUST-R4-GHI] 经营与项目收口及最小角色32项联合批'], [113, '[RUST-R4I] 验收完工归档及受控阶段11入口真实闭环']]);
for (const number of numbers) {
  const prior = before.get(number);
  assert(!prior.body.includes(marker), `online G1 already recorded: ${number}`);
  let body = prior.body;
  if ([110, 111, 112, 113, 114, 117].includes(number)) body = body.replace(/^- \[ \] ((?:联合)?G1[：:].*)$/gm, '- [x] $1');
  body = `${body.trimEnd()}\n\n${note}\n`;
  const change = { body, ...(titleUpdates.has(number) ? { title: titleUpdates.get(number) } : {}) };
  api(`update-${number}`, `${repo}/issues/${number}`, 'PATCH', change);
  if ([110, 111, 112, 113, 114, 117].includes(number)) {
    const comment = api(`comment-${number}`, `${repo}/issues/${number}/comments`, 'POST', { body: note });
    comments.push({ number, id: comment.id, url: comment.html_url });
    assert.equal(api(`comment-readback-${number}`, `${repo}/issues/comments/${comment.id}`).body, note);
  }
  const actual = api(`readback-${number}`, `${repo}/issues/${number}`);
  assert.equal(actual.state, 'open');
  assert.equal(actual.body, body);
  if (titleUpdates.has(number)) assert.equal(actual.title, titleUpdates.get(number));
  updated.push({ number, state: actual.state, title: actual.title, bodySHA256: sha(Buffer.from(actual.body)) });
}
const receipt = {
  kind: 'actual-R4GHI-minimalR5-joint-G1-online-freeze', capturedAt: new Date().toISOString(),
  inputCommit: input, certificateCommit: head, sourceManifestSHA256: review.sourceManifestSHA256,
  independentReview: reviewPath, independentReviewSHA256: sha(fs.readFileSync(reviewPath)),
  G1Certified: true, G2Authorized: true, officialNewDelivered: 0, officialRustOperations: 240,
  counts: manifest.counts, protectedOpen: numbers, protectedClosed: [115], dependencyPlan,
  comments, updated, calls,
};
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ G1Certified: true, G2Authorized: true, inputCommit: input, comments: comments.length, protectedOpen: numbers, officialNewDelivered: 0 }));
