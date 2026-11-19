// Keep the immutable G1 candidate untouched. Advance only the live Issue/doc
// indexes after actual online admission, with every body read back.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
process.chdir('E:/projects/worktrees/poms-r3hijk-next28/poms');
const receiptPath = 'docs/design/rust-r4ghi/g1-online01.json';
const online = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
assert(online.G1Certified && online.G2Authorized && online.officialNewDelivered === 0);
const out = 'tmp/rust-r4ghi/root/business-g2-activation02';
assert(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const calls = [], sha = bytes => createHash('sha256').update(bytes).digest('hex');
let sequence = 0;
function api(label, endpoint, method = 'GET', body) {
  for (let attempt = 1; attempt <= (method === 'GET' ? 3 : 1); attempt++) {
    const prefix = `${out}/${String(++sequence).padStart(3, '0')}-${label}-${attempt}`;
    const args = ['api', endpoint, '--method', method];
    if (body !== undefined) { fs.writeFileSync(`${prefix}-input.json`, JSON.stringify(body, null, 2) + '\n', { flag: 'wx' }); args.push('--input', `${prefix}-input.json`); }
    const result = spawnSync('gh', args, { encoding: null, windowsHide: true, timeout: 55_000, maxBuffer: 12_000_000 });
    fs.writeFileSync(`${prefix}-stdout.json`, result.stdout ?? Buffer.alloc(0), { flag: 'wx' });
    fs.writeFileSync(`${prefix}-stderr.bin`, result.stderr ?? Buffer.alloc(0), { flag: 'wx' });
    calls.push({ label, attempt, endpoint, method, exitCode: result.status, file: `${prefix}-stdout.json`, rawBytesSHA256: sha(result.stdout ?? Buffer.alloc(0)) });
    fs.writeFileSync(`${out}/progress.json`, JSON.stringify(calls, null, 2) + '\n');
    if (result.status === 0) return JSON.parse(result.stdout);
    if (method !== 'GET' || attempt === 3) assert.equal(result.status, 0, 'inspect partial activation before retry');
  }
}
const repo = 'repos/illusion-tech/poms', updated = [];
for (const number of [110, 111, 112, 113, 114, 117]) {
  const prior = api(`before-${number}`, `${repo}/issues/${number}`);
  assert.equal(prior.state, 'open');
  assert(prior.body.includes('<!-- poms-r4ghi-joint-g1-01 -->'));
  // A previously read-back activation marker is adopted idempotently.
  const current = '状态：Doing / 联合G1已冻结；实现、验收及独立G3/G4待完成。';
  let body = /^状态[：:].*$/m.test(prior.body) ? prior.body.replace(/^状态[：:].*$/m, current) : current + '\n\n' + prior.body;
  body = body.replace(/^- \[ \] ((?:联合\s*)?G1(?:[^A-Za-z0-9].*)?)$/gm, '- [x] $1');
  if (!prior.body.includes('<!-- poms-r4ghi-doing-01 -->')) body = body.trimEnd() + '\n\n<!-- poms-r4ghi-doing-01 -->\n';
  if (body !== prior.body) api(`update-${number}`, `${repo}/issues/${number}`, 'PATCH', { body });
  const actual = api(`readback-${number}`, `${repo}/issues/${number}`);
  assert.equal(actual.state, 'open');
  assert.equal(actual.body, body);
  assert(!/^- \[ \] (?:联合\s*)?G1(?:[^A-Za-z0-9].*)?$/m.test(body));
  updated.push({ number, state: actual.state, bodySHA256: sha(Buffer.from(body)) });
}
for (const number of [57, 101, 116]) assert.equal(api(`protected-${number}`, `${repo}/issues/${number}`).state, 'open');
assert.equal(api('protected-115', `${repo}/issues/115`).state, 'closed');

const statusPath = 'docs/design/rust-r4ghi-delivery-status.json';
const state = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
state.stage = 'Doing';
state.G1Certified = true;
state.G2Authorized = true;
state.candidateScope.exactContractFreezePending = false;
state.g1InputCommit = online.inputCommit;
state.g1Review = online.independentReview;
state.g1Online = 'rust-r4ghi/g1-online01.json';
state.g1Admission = 'rust-r4ghi/g1-admission01.json';
state.productBase = 'd5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5';
state.implementationWorktrees = {
  G: 'E:/projects/worktrees/poms-r4g-operating/poms',
  H: 'E:/projects/worktrees/poms-r4h-signals/poms',
  I: 'E:/projects/worktrees/poms-r4i-lifecycle/poms',
};
fs.writeFileSync(statusPath, JSON.stringify(state, null, 2) + '\n');
const indexes = [
  'docs/design/backend-rust-migration-plan.md', 'docs/design/rust-migration-execution-tracker.md',
  'docs/design/rust-r4-scope-and-dependencies.md', 'docs/design/phase2-development-execution-tracker.md',
];
for (const file of indexes) {
  let text = fs.readFileSync(file, 'utf8');
  assert(!text.includes('<!-- poms-r4ghi-actual-g1-admission -->'));
  text = text.trimEnd() + '\n\n<!-- poms-r4ghi-actual-g1-admission -->\n\n### 2026-11-06 R4 GHI 联合 G1 实际准入\n\n候选 `9e010077` 的223项输入及133项未改产品源已通过[非作者G1](../../tools/rust-r4ghi/independent/business-g1/round02/g1-review02.json)；[实际线上冻结](rust-r4ghi/g1-online01.json)与[准入索引](rust-r4ghi/g1-admission01.json)已读回，三线从同一输入进入G2。此前Pending基线/失败为保留的原始检查点，不改写。G9/H8/I11/R5最小4共32项尚未正式验收或G3/G4，Rust仍240、R4已交付67/规划95；#57/#101/#110/#116/#117保持Open。\n';
  fs.writeFileSync(file, text);
}
const readmePath = 'docs/design/README.md';
let readme = fs.readFileSync(readmePath, 'utf8');
assert(readme.includes('正在独立 G1 复核，尚未准入 G2'));
readme = readme.replace('正在独立 G1 复核，尚未准入 G2', '已完成独立 G1 与线上冻结，三线进入 G2，验收和 G3/G4 待完成');
fs.writeFileSync(readmePath, readme);
const mutableIndexes = new Set([...indexes, readmePath, statusPath]);
const manifestPath = 'docs/design/rust-r4ghi/g1-source-manifest01.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const changed = manifest.entries.filter(entry => sha(fs.readFileSync(entry.path)) !== entry.sha256).map(entry => entry.path);
assert(changed.every(file => mutableIndexes.has(file)), 'immutable contract changed after admission');
const admission = {
  kind: 'actual-G1-admission-and-live-G2-index', capturedAt: new Date().toISOString(),
  G1Certified: true, G2Authorized: true, G3Certified: false, G4Certified: false,
  inputCommit: online.inputCommit, sourceManifestSHA256: online.sourceManifestSHA256,
  onlineReceipt: receiptPath, onlineReceiptSHA256: sha(fs.readFileSync(receiptPath)),
  independentReview: online.independentReview, independentReviewSHA256: online.independentReviewSHA256,
  scope: { G: 9, H: 8, I: 11, R5Minimum: 4, total: 32 },
  officialNewDelivered: 0, officialRustOperations: 240,
  changedInputMetadataOnly: changed, immutableBusinessContractChanged: false,
  indexRule: 'Frozen Pending candidate bytes are historical inputs bound to inputCommit; this admission and GitHub readback own current gate state.',
  implementationWorktrees: state.implementationWorktrees, updated, calls,
};
fs.writeFileSync('docs/design/rust-r4ghi/g1-admission01.json', JSON.stringify(admission, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ G1Certified: true, G2Authorized: true, issueIndexesUpdated: updated.length, productChanges: 0, officialNewDelivered: 0 }));
