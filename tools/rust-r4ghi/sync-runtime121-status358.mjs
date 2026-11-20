// Root-only Issue-first status358 synchronization candidate. Never auto-executes on import.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const O = R + '/tmp/rust-r4ghi/root/status358-online';
const repo = 'repos/illusion-tech/poms';
const head = '6a4b839dd83cf1357c7d21583e1dd9030b01601d';
const statusPath = 'docs/design/rust-r4ghi/continuation-status358.json';
const statusSHA = '69ea319572efd9ef6b6aef9e156df11e9e4e9eddf08ad7f3f895055c90dd6196';
const sha = b => createHash('sha256').update(b).digest('hex');
const url = 'https://github.com/illusion-tech/poms/blob/' + head + '/';
export const issues358 = Object.freeze([57, 101, 110, 111, 112, 113, 114, 117, 118, 119, 120, 121]);
export const marker358 = '<!-- POMS-R4GHI-CURRENT-358 -->';
const close358 = '<!-- /POMS-R4GHI-CURRENT-358 -->';
const oldMarker = '<!-- POMS-R4GHI-CURRENT-357 -->';
const oldClose = '<!-- /POMS-R4GHI-CURRENT-357 -->';
export const comment121Marker358 = '<!-- RUNTIME121-STATUS358-STABLE-HOLDER-POLICY -->';
export const comment57Marker358 = '<!-- R4GHI-358-CURRENT-ASOF-READBACK -->';
const section = `${marker358}
### 当前推进状态（358：稳定holder策略已冻结，代码实施中，恢复尚未执行）

Rust正式 **240**，R4交付 **67/95**，本批32项仍为 **candidate、新增业务认证0、业务G3/G4未通过**。#57及完整R5 #116保持开放；#119历史技术G4/CLOSED不改写。#121未收口，#118继续阻塞，#120后继条件未满足。

[固定状态358](${url}${statusPath})记录本次as-of边界。Source I06/Root8/H03当前41项、[Git源码8db702a](https://github.com/illusion-tech/poms/commit/8db702a50f0b42c9d09492a5f99789e60e56fde2)、单Native06 actual91a4/非作者eb412及helper229/external55/execution284、composition06 actual9124/独立1798均保原观测时点；旧33/05/af8图与失败输入保原件，代码/metadata/旧code-ready不冒当前运行许可。

357的d963 holder input及ce0a支持材料没有Root-review或实际output，恢复从未执行；仍保未执行标签。原03漏传apiRecord已由I06修复，真实04预检随后因旧holder.boot失配首停，无API request/review/new-env/process。原Windows51024/Linux4802/PG6360寿命已随整机关机丢失，旧日志的具体操作者与深层原因仍未知。

本轮Host snapshot记录Windows UTC11:16:17.500开机，PS目录1110→1111，可信pwsh仍301360字节/SHA2a6769a3…/7.6.9。没有新holder保活时，WSL observedBoot在审查等待间多次变化；loss358 bfb54观察boot仅为历史支持，不能冻结成未来启动条件。**PG仍exited，本boot逻辑守恒尚未重验；API/Native registry/candidate/Ctor/prepare121均未建立。** 原CID513925…/imageb718…/同volume/PG15/OID16385,16387/port25434和四份state/log书挡SHA仍同；现存物理事实不替代新双库raw/xmin/meta/seq/object观测。

稳定G1Policy358（3082f94a…/12056B，独审148928b3…）已冻结，只授code1+test1，实施中，actualG2=false。可信PS字节/版本与固定原PS脚本不放宽；current-round及各自exactG2实绑具体路径/loss/source/peer。holder只在执行时捕获before/after/ready boot三等并真实Linux PID/start/exe/cwd/argv与输入审件链读回后，才产生generic成功；其后PG/RO仍须已验证live holder.boot、fresh nonce/逐mode exactG2和独立读回。A15/Root12/bundle4/A7/Root8/Native/284原契约与字节不改；原8015 anchor保留，新loss358另绑。

原A三mode与旧双RO actual passed/非作者5fd27仍是历史，不主张跨库原子性，不重放已消费nonce。之后仍需新owner bundle、原container/volume一次恢复和新双RO守恒、新API真实PID/env/socket/readiness、具体Native inspect/exactG2/准入/Ctor及fresh prepare121完整物理根/allpeer/CAS/body67，才可新FI、单独唯一normal201和剩余业务验收。old15/Reg5/B1/旧process、08e3/full67/body0f92、7f75失败journal及Main13原201均不改写或重放。
${close358}`;

function exactlyOne(text, needle) { assert.equal(text.split(needle).length - 1, 1, 'Unique exact predecessor required'); }
function replaceLine(text, pattern, replacement) {
  const found = text.match(pattern); assert.equal(found?.length, 1, 'Unique exact checklist predecessor required');
  return text.replace(found[0], typeof replacement === 'function' ? replacement(found[0]) : replacement);
}
export function body358(issue, before) {
  assert(issues358.includes(issue)); assert(typeof before === 'string');
  exactlyOne(before, oldMarker); exactlyOne(before, oldClose); assert(!before.includes(marker358)); assert(!before.includes(close358));
  const start = before.indexOf(oldMarker), end = before.indexOf(oldClose) + oldClose.length; assert(end > start);
  let body = before.slice(0, start) + section + before.slice(end);
  if (issue === 121) {
    exactlyOne(body, '（当前以357为准）'); body = body.replace('（当前以357为准）', '（当前以358为准）');
    body = replaceLine(body, /^- \[x\] 有界代码独审：.*$/gm,
      '- [x] 有界代码独审：Root8/H03/I06当前41项与Git8db为as-of代码交付；稳定G1Policy358已独审冻结、仅授code1+test1且实施中。旧code-ready不冒本轮实际G2，357 d963/ce0a从未执行恢复。');
    body = replaceLine(body, /^- \[x\] 实际完整图：.*$/gm,
      '- [x] 实际完整图：Source06 actual91a4/eb412及helper229/external55/execution284、M06 actual9124/1798保as-of；A7/Root8/Native/284不改，PGexited与新boot守恒待验，旧33/05图和失败输入保原。');
    body = replaceLine(body, /^- \[ \] A当前boot恢复G2与验收（357）：.*$/gm,
      '- [ ] A当前boot恢复G2与验收（358）：稳定holder策略code-only实施中，357 d963/ce0a无Root-review/output、恢复从未执行；须current-round实绑PS路径/loss/source/peer及fresh exactG2，holder捕获before/after/ready boot与真实身份闭合后，再逐mode原卷PG/双RO验收和新owner bundle，均未完成。');
  }
  exactlyOne(body, marker358); exactlyOne(body, close358); assert(!body.includes(oldMarker)); assert(!body.includes(oldClose));
  assert.notEqual(body, before); assert(body.length < 65000); return body;
}
export function comment121358() {
  return comment121Marker358 + '\n[固定状态358](' + url + statusPath + ')：Source06 actual91a4/eb412、M06 actual9124/1798与Git8db只保as-of代码交付；357 d963/ce0a无Root-review/output、恢复从未执行。Host UTC11:16:17.500 boot；PS1110→1111仍301360B/2a/7.6.9，等待间WSL observedBoot多次变化而无新holder，loss358 bfb54仅historical。PGexited，原CID/卷/PG15/OID/四书挡同，新boot守恒待验。稳定G1Policy358已独审冻结、只授code1+test1且实施中，未授actualG2；current-round/exactG2实绑路径/loss/source/peer，holder before-after-ready捕获+真实Linuxidentity读回后才generic成功，PG/RO后续仍绑verifiedholder.boot逐freshG2。A15/Root12/bundle4/A7/Root8/Native/284不改。旧A历史passed及失败/未执行标签保留，8015 anchor不替换，不重放旧nonce/Main13原201；API/Native/Ctor/prepare未建立。Rust240/R4 67/95/32candidate/新增认证0/业务G3G4未过，#57/116开放、#119历史closed。';
}
export function comment57358(issue121CommentURL) {
  assert(/^https:\/\/github\.com\/illusion-tech\/poms\/issues\/121#issuecomment-[0-9]+$/.test(issue121CommentURL));
  return comment57Marker358 + '\n12项CURRENT块已按[固定状态358](' + url + statusPath + ')同步读回。[稳定holder策略与未执行恢复边界](' + issue121CommentURL + ')：Source06/M06/Git8db只保as-of，357 d963/ce0a从未执行；新loss358保原物理卷与四书挡，PGexited、新boot守恒待验。G1Policy358只授code1+test1、实施中，具体round/exactG2和真实holder捕获读回仍后置，后续PG/RO绑verifiedholder.boot。原A7/Root8/Native/284和历史失败/未执行标签保留，API及Native/Ctor未建立。Rust240、R4 67/95、本批32candidate/新增认证0、业务G3/G4未通过；#57与完整R5 #116继续开放，#119历史技术closed保留。';
}
function absent(file) { try { fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return; throw e; } throw new Error('Existing receipt namespace: preserve and reconcile, do not retry'); }
function run358() {
  assert.equal(fileURLToPath(import.meta.url).replaceAll('\\', '/'), R + '/tools/rust-r4ghi/sync-runtime121-status358.mjs');
  assert.equal(process.cwd().replaceAll('\\', '/'), R);
  const raw = fs.readFileSync(R + '/' + statusPath); assert.equal(raw.length, 12812); assert.equal(sha(raw), statusSHA); const status = JSON.parse(raw);
  assert.equal(status.kind, 'R4-runtime121-stable-holder-policy-status358');
  assert.deepEqual(status.official, { Rust: 240, R4Delivered: 67, R4Total: 95, batchCandidate: 32, newCertified: 0 });
  assert.equal(status.current.PGStarted, false); assert.equal(status.current.APIStarted, false); assert.equal(status.current.logicalDataConservationObservedForCurrentBoot, false);
  assert.equal(status.businessG3, false); assert.equal(status.businessG4, false); assert.equal(status.current.NativeContextGranted, false);
  assert.equal(status.stableHolderPolicy.codeImplementationGranted, true); assert.equal(status.stableHolderPolicy.actualG2Authorized, false); assert.equal(status.stableHolderPolicy.implementationPending, true);
  assert.equal(status.prior357Unexecuted.noRootReviewOrActualOutput, true); assert.equal(status.secondLoss.transientObservedBootNotFutureAuthority, true);
  assert.equal(status.parent57, 'OPEN'); assert.equal(status.fullR5_116, 'OPEN'); assert.equal(status.technical119HistoricalG4, 'CLOSED');
  absent(O); fs.mkdirSync(O);
  const updates = [], createdComments = []; let phase = 'initial-read';
  function api(name, endpoint, method = 'GET', body) {
    phase = name; const args = ['api', endpoint];
    if (body !== undefined) { const file = O + '/' + name + '-input.json'; fs.writeFileSync(file, JSON.stringify(body) + '\n', { flag: 'wx' }); args.push('--method', method, '--input', file); }
    const began = new Date().toISOString(), r = spawnSync('gh', args, { cwd: R, windowsHide: true, encoding: 'utf8', timeout: 45000, maxBuffer: 16 * 1024 * 1024 });
    fs.writeFileSync(O + '/' + name + '-stdout.json', r.stdout ?? '', { flag: 'wx' }); fs.writeFileSync(O + '/' + name + '-stderr.txt', r.stderr ?? '', { flag: 'wx' });
    fs.writeFileSync(O + '/' + name + '-command.json', JSON.stringify({ began, ended: new Date().toISOString(), method, endpoint, exitCode: r.status, signal: r.signal, processError: r.error ? { name: r.error.name, code: r.error.code ?? null } : null, blindRetryForbidden: true }, null, 2) + '\n', { flag: 'wx' });
    assert.equal(r.status, 0, 'Preserve remote ambiguity and all originals'); assert.equal(r.signal, null); assert(!r.error); return JSON.parse(r.stdout);
  }
  function comments(issue, label) {
    const all = [];
    for (let page = 1; page <= 20; page++) { const a = api(label + '-page' + page, repo + '/issues/' + issue + '/comments?per_page=100&page=' + page); assert(Array.isArray(a)); all.push(...a); if (a.length < 100) return all; }
    throw new Error('Bounded comment pagination exhausted; stop without posting');
  }
  const expectedState = n => n === 119 ? 'closed' : 'open';
  function unchanged(a, b, state) { assert.equal(a.body, b.body); assert.equal(a.comments, b.comments); assert.equal(a.state, state); assert.equal(b.state, state); assert.equal(a.updated_at, b.updated_at); }
  try {
    assert.equal(api('commit', repo + '/commits/' + head).sha, head);
    const remoteStatus = api('committed-status358', repo + '/contents/' + statusPath + '?ref=' + head); assert.equal(remoteStatus.encoding, 'base64'); assert.equal(sha(Buffer.from(remoteStatus.content, 'base64')), statusSHA);
    assert.equal(api('116-before-readonly', repo + '/issues/116').state, 'open');
    const before = new Map();
    for (const n of issues358) { const v = api(n + '-before', repo + '/issues/' + n); assert.equal(v.state, expectedState(n)); body358(n, v.body); before.set(n, v); }
    for (const n of [121, 57]) { const existing = comments(n, n + '-unique358-before'); assert.equal(existing.length, before.get(n).comments); assert(!existing.some(c => typeof c.body === 'string' && (c.body.includes(comment121Marker358) || c.body.includes(comment57Marker358)))); }
    for (const n of issues358) {
      const original = api(n + '-prepare', repo + '/issues/' + n);
      assert.equal(original.body, before.get(n).body); assert.equal(original.comments, before.get(n).comments); assert.equal(original.state, expectedState(n));
      const body = body358(n, original.body), fresh = api(n + '-prewrite', repo + '/issues/' + n); unchanged(original, fresh, expectedState(n));
      api(n + '-patch', repo + '/issues/' + n, 'PATCH', { body }); const after = api(n + '-readback', repo + '/issues/' + n);
      assert.equal(after.body, body); assert.equal(after.state, expectedState(n)); updates.push({ issue: n, state: after.state, bodySHA256: sha(body) });
    }
    function postOne(n, marker, body, label) {
      const beforePost = api(label + '-issue-before', repo + '/issues/' + n); assert.equal(beforePost.state, expectedState(n)); assert.equal(beforePost.body, body358(n, before.get(n).body));
      const existing = comments(n, label + '-fresh-unique'); assert(!existing.some(c => typeof c.body === 'string' && c.body.includes(marker)));
      const fresh = api(label + '-issue-prepost', repo + '/issues/' + n); unchanged(beforePost, fresh, expectedState(n));
      const comment = api(label + '-post', repo + '/issues/' + n + '/comments', 'POST', { body }); assert(Number.isSafeInteger(comment.id)); createdComments.push({ issue: n, id: comment.id, html_url: comment.html_url });
      assert.equal(api(label + '-readback', repo + '/issues/comments/' + comment.id).body, body);
      assert.equal(comments(n, label + '-unique-readback').filter(c => typeof c.body === 'string' && c.body.includes(marker)).length, 1); return comment;
    }
    const c = postOne(121, comment121Marker358, comment121358(), '121-comment');
    const pc = postOne(57, comment57Marker358, comment57358(c.html_url), '57-comment');
    assert.equal(api('116-final-readonly', repo + '/issues/116').state, 'open');
    for (const n of issues358) { const last = api(n + '-final-readback', repo + '/issues/' + n); assert.equal(last.state, expectedState(n)); assert.equal(last.body, body358(n, before.get(n).body)); }
    const receipt = { kind: 'actual-runtime121-status358-stable-holder-policy-online-sync', commit: head, statusSHA256: statusSHA,
      updates, issue121Comment: c.html_url, parentComment: pc.html_url, historicalAThreeModesPassed: true,
      currentAPreconditionsPending: true, stablePolicyCodeOnly: true, prior357RecoveryNeverExecuted: true, PGStartedByThisScript: false, sourcePromotedByThisScript: false,
      currentPGStartedAsOfStatus358: false, currentLogicalConservationAsOfStatus358: false,
      APIStarted: false, NativeContextGranted: false, newBusinessCertified: 0, businessG3: false, businessG4: false };
    fs.writeFileSync(O + '/receipt.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(receipt));
  } catch {
    try { fs.writeFileSync(O + '/partial.json', JSON.stringify({ kind: 'status358-online-partial-preserve', phase, updates, createdComments,
      message: 'Stop; remote result may be partial or unknown. Preserve all originals and reconcile before any new execution.', automaticRetry: false }, null, 2) + '\n', { flag: 'wx' }); } catch { /* No overwrite or error masking. */ }
    throw new Error('Status358 stopped; preserve all original receipts and reconcile remote state before retry');
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { assert.equal(process.argv.length, 3); assert.equal(process.argv[2], '--execute'); run358(); }
  catch { console.error(JSON.stringify({ kind: 'status358-sync-stopped', message: 'No blind retry; inspect retained records and current remote state.' })); process.exitCode = 1; }
}
