// Root-only Issue-first status357 synchronization candidate. Never auto-executes on import.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const O = R + '/tmp/rust-r4ghi/root/status357-online';
const repo = 'repos/illusion-tech/poms';
const head = 'e0385b8647f1643e227626f7b2e80947fdc97238';
const statusPath = 'docs/design/rust-r4ghi/continuation-status357.json';
const statusSHA = '64531bcff197b31ee2e08e21983ede11e0d2cf2eba94ef9d9f32b4dcb489bf12';
const sha = b => createHash('sha256').update(b).digest('hex');
const url = 'https://github.com/illusion-tech/poms/blob/' + head + '/';
export const issues357 = Object.freeze([57, 101, 110, 111, 112, 113, 114, 117, 118, 119, 120, 121]);
export const marker357 = '<!-- POMS-R4GHI-CURRENT-357 -->';
const close357 = '<!-- /POMS-R4GHI-CURRENT-357 -->';
const oldMarker = '<!-- POMS-R4GHI-CURRENT-356 -->';
const oldClose = '<!-- /POMS-R4GHI-CURRENT-356 -->';
export const comment121Marker357 = '<!-- RUNTIME121-STATUS357-SOURCE06-HOST-RESTART -->';
export const comment57Marker357 = '<!-- R4GHI-357-CURRENT-ASOF-READBACK -->';
const section = `${marker357}
### 当前推进状态（357：Source06已交付，宿主重启后运行前置待重验）

Rust正式 **240**，R4交付 **67/95**，本批32项仍为 **candidate、新增业务认证0、业务G3/G4未通过**。#57及完整R5 #116保持开放；#119历史技术G4/CLOSED不改写。#121未收口，#118继续阻塞，#120后继条件未满足。

[固定状态357](${url}${statusPath})记录当前边界。Source I06/Root8/H03当前41项已有独立code-step及[Git源码8db702a](https://github.com/illusion-tech/poms/commit/8db702a50f0b42c9d09492a5f99789e60e56fde2)逐raw证据；单Native06 actual91a4/非作者eb412及helper229/external55/execution284通过，composition06 actual9124/独立1798通过，均保其观测时点。旧33/05/af8图与失败输入仍保原件，不把源码或metadata当作原生运行授权。

原03预检的Reg5重建漏传apiRecord已由I06修复；真实04预检已通过该历史重建，随后在holderFacts的boot身份不符处首停。原boot3e3ee369→新a077fa56；Windows日志显示UTC00:04:35关机、01:00:24开机，原Windows holder51024/Linux holder4802/PG6360寿命已失效。仅知日志发起进程，具体操作者和深层触发原因未知。

**PG当前exited；本boot逻辑守恒尚未重验。API request/Root-review/new-env/process仍无，API/Native registry/candidate/Ctor/prepare121均未建立。** 原CID513925…/imageb718…/同volume/PG15/OID16385,16387/port25434仍在，四份state/log书挡SHA不变；这些现存物理事实不替代新boot双库raw/xmin/meta/seq/object观测。

原A三个mode和旧双RO实际passed/非作者5fd27继续保留为历史（不主张跨库原子性）；原8015运行丢失anchor不替换，本次9c3新loss另绑。当前round357的G1-A恢复append提案正在独审，**尚未恢复**：A7保持原字节，仍需三个fresh nonce/各自exactG2、新owner bundle、原container/volume一次恢复与新双RO守恒，不重放已消费的旧nonce，不新增自启或主机配置。

恢复后仍须新API真实PID/env/socket/readiness、具体Native inspect/exactG2/准入和Ctor、fresh prepare121完整物理根/allpeer/CAS/body67同值，然后才可新FI、单独唯一normal201与剩余真实业务验收。old15/Reg5/B1/旧process、08e3/full67/body0f92、7f75失败journal及Main13原201均不改写或重放。
${close357}`;

function exactlyOne(text, needle) { assert.equal(text.split(needle).length - 1, 1, 'Unique exact predecessor required'); }
function replaceLine(text, pattern, replacement) {
  const found = text.match(pattern); assert.equal(found?.length, 1, 'Unique exact checklist predecessor required');
  return text.replace(found[0], typeof replacement === 'function' ? replacement(found[0]) : replacement);
}
export function body357(issue, before) {
  assert(issues357.includes(issue)); assert(typeof before === 'string');
  exactlyOne(before, oldMarker); exactlyOne(before, oldClose); assert(!before.includes(marker357)); assert(!before.includes(close357));
  const start = before.indexOf(oldMarker), end = before.indexOf(oldClose) + oldClose.length; assert(end > start);
  let body = before.slice(0, start) + section + before.slice(end);
  if (issue === 121) {
    exactlyOne(body, '（当前以356为准）'); body = body.replace('（当前以356为准）', '（当前以357为准）');
    body = replaceLine(body, /^- \[x\] 有界代码独审：.*$/gm,
      '- [x] 有界代码独审：Root8/H03/I06真实approved-bounded-step-only与当前41项Git源码已交付；旧03漏字段已修，04因新boot停止。源码与历史审件不冒当前运行或业务交付。');
    body = replaceLine(body, /^- \[x\] 实际完整图：.*$/gm,
      '- [x] 实际完整图：单Native06 actual91a4/eb412及helper229/external55/execution284、M06 actual9124/1798均已读回；这些证据保as-of，当前boot运行守恒和authority另验，旧33/05图不改写。');
    body = replaceLine(body, /^- \[x\] A实际G2与验收：.*$/gm, old =>
      '- [ ] A当前boot恢复G2与验收（357）：round357恢复append提案独审中，A7原字节；三个fresh nonce/各自exactG2/new owner bundle及原卷双RO重验均未执行，不能沿用旧boot身份。\n' +
      '  > 历史已passed（原356原句保留，非当前运行前置）：' + old);
  }
  exactlyOne(body, marker357); exactlyOne(body, close357); assert(!body.includes(oldMarker)); assert(!body.includes(oldClose));
  assert.notEqual(body, before); assert(body.length < 65000); return body;
}
export function comment121357() {
  return comment121Marker357 + '\nSource06/Root8/H03当前41源码（Git8db）、actual91a/eb41与composition06 actual912/1798均已通过as-of；API04预检在holder.boot失配首停，无APIrequest/review/env/process。原Windows51024/Linux4802/PG6360跨整机关机→开机已失效，具体操作者/深层原因未知。[固定状态357](' + url + statusPath + ')。PGexited、本boot逻辑守恒待重验；原A三mode历史passed保留，A7不改，round357恢复append独审中，须三个新nonce/exactG2/newowner及原卷双RO。原8015 anchor保留、新loss9c3另绑；不重放旧失败或旧nonce。Rust240/R4 67/95/32candidate/新认证0/业务G3G4未过，#57/116开放、#119历史closed。';
}
export function comment57357(issue121CommentURL) {
  assert(/^https:\/\/github\.com\/illusion-tech\/poms\/issues\/121#issuecomment-[0-9]+$/.test(issue121CommentURL));
  return comment57Marker357 + '\n12项CURRENT块已按[固定状态357](' + url + statusPath + ')同步读回。[Source06与宿主重启后运行前置](' + issue121CommentURL + ')：代码/实际图仅保as-of，PG当前exited、新boot守恒与恢复未完成，API及Native/Ctor未建立。原A历史passed不抹，当前恢复checkbox pending，A7不改，三新nonce/exactG2后置。Rust240、R4 67/95、本批32candidate/新认证0、业务G3/G4未通过；#57与完整R5 #116继续开放，#119历史技术closed保留。';
}
function absent(file) { try { fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return; throw e; } throw new Error('Existing receipt namespace: preserve and reconcile, do not retry'); }
function run357() {
  assert.equal(fileURLToPath(import.meta.url).replaceAll('\\', '/'), R + '/tools/rust-r4ghi/sync-runtime121-status357.mjs');
  assert.equal(process.cwd().replaceAll('\\', '/'), R);
  const raw = fs.readFileSync(R + '/' + statusPath); assert.equal(sha(raw), statusSHA); const status = JSON.parse(raw);
  assert.deepEqual(status.official, { Rust: 240, R4Delivered: 67, R4Total: 95, batchCandidate: 32, newCertified: 0 });
  assert.equal(status.current.PGStarted, false); assert.equal(status.current.APIStarted, false); assert.equal(status.current.logicalDataConservationObservedForCurrentBoot, false);
  assert.equal(status.parent57, 'OPEN'); assert.equal(status.fullR5_116, 'OPEN'); assert.equal(status.technical119HistoricalG4, 'CLOSED');
  absent(O); fs.mkdirSync(O);
  const updates = [], createdComments = []; let phase = 'initial-read';
  function api(name, endpoint, method = 'GET', body) {
    phase = name; const args = ['api', endpoint];
    if (body !== undefined) { const file = O + '/' + name + '-input.json'; fs.writeFileSync(file, JSON.stringify(body) + '\n', { flag: 'wx' }); args.push('--method', method, '--input', file); }
    const began = new Date().toISOString(), r = spawnSync('gh', args, { cwd: R, windowsHide: true, encoding: 'utf8', timeout: 45000, maxBuffer: 16 * 1024 * 1024 });
    fs.writeFileSync(O + '/' + name + '-stdout.json', r.stdout ?? '', { flag: 'wx' }); fs.writeFileSync(O + '/' + name + '-stderr.txt', r.stderr ?? '', { flag: 'wx' });
    fs.writeFileSync(O + '/' + name + '-command.json', JSON.stringify({ began, ended: new Date().toISOString(), method, endpoint, exitCode: r.status, signal: r.signal, processError: r.error ? { name: r.error.name, code: r.error.code ?? null } : null, blindRetryForbidden: true }, null, 2) + '\n', { flag: 'wx' });
    assert.equal(r.status, 0, 'Preserve remote ambiguity and all originals'); return JSON.parse(r.stdout);
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
    const remoteStatus = api('committed-status357', repo + '/contents/' + statusPath + '?ref=' + head); assert.equal(remoteStatus.encoding, 'base64'); assert.equal(sha(Buffer.from(remoteStatus.content, 'base64')), statusSHA);
    assert.equal(api('116-before-readonly', repo + '/issues/116').state, 'open');
    const before = new Map();
    for (const n of issues357) { const v = api(n + '-before', repo + '/issues/' + n); assert.equal(v.state, expectedState(n)); body357(n, v.body); before.set(n, v); }
    for (const n of [121, 57]) { const existing = comments(n, n + '-unique357-before'); assert.equal(existing.length, before.get(n).comments); assert(!existing.some(c => typeof c.body === 'string' && (c.body.includes(comment121Marker357) || c.body.includes(comment57Marker357)))); }
    for (const n of issues357) {
      const original = api(n + '-prepare', repo + '/issues/' + n);
      assert.equal(original.body, before.get(n).body); assert.equal(original.comments, before.get(n).comments); assert.equal(original.state, expectedState(n));
      const body = body357(n, original.body), fresh = api(n + '-prewrite', repo + '/issues/' + n); unchanged(original, fresh, expectedState(n));
      api(n + '-patch', repo + '/issues/' + n, 'PATCH', { body }); const after = api(n + '-readback', repo + '/issues/' + n);
      assert.equal(after.body, body); assert.equal(after.state, expectedState(n)); updates.push({ issue: n, state: after.state, bodySHA256: sha(body) });
    }
    function postOne(n, marker, body, label) {
      const beforePost = api(label + '-issue-before', repo + '/issues/' + n); assert.equal(beforePost.state, expectedState(n)); assert(beforePost.body.includes(marker357));
      const existing = comments(n, label + '-fresh-unique'); assert(!existing.some(c => typeof c.body === 'string' && c.body.includes(marker)));
      const fresh = api(label + '-issue-prepost', repo + '/issues/' + n); unchanged(beforePost, fresh, expectedState(n));
      const comment = api(label + '-post', repo + '/issues/' + n + '/comments', 'POST', { body }); assert(Number.isSafeInteger(comment.id)); createdComments.push({ issue: n, id: comment.id, html_url: comment.html_url });
      assert.equal(api(label + '-readback', repo + '/issues/comments/' + comment.id).body, body);
      assert.equal(comments(n, label + '-unique-readback').filter(c => typeof c.body === 'string' && c.body.includes(marker)).length, 1); return comment;
    }
    const c = postOne(121, comment121Marker357, comment121357(), '121-comment');
    const pc = postOne(57, comment57Marker357, comment57357(c.html_url), '57-comment');
    assert.equal(api('116-final-readonly', repo + '/issues/116').state, 'open');
    for (const n of issues357) { const last = api(n + '-final-readback', repo + '/issues/' + n); assert.equal(last.state, expectedState(n)); assert.equal(last.body, body357(n, before.get(n).body)); }
    const receipt = { kind: 'actual-runtime121-status357-asof-source06-host-restart-online-sync', commit: head, statusSHA256: statusSHA,
      updates, issue121Comment: c.html_url, parentComment: pc.html_url, historicalAThreeModesPassed: true,
      currentAPreconditionsPending: true, PGStartedByThisScript: false, sourcePromotedByThisScript: false,
      currentPGStartedAsOfStatus357: false, currentLogicalConservationAsOfStatus357: false,
      APIStarted: false, NativeContextGranted: false, newBusinessCertified: 0, businessG3: false, businessG4: false };
    fs.writeFileSync(O + '/receipt.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(receipt));
  } catch {
    try { fs.writeFileSync(O + '/partial.json', JSON.stringify({ kind: 'status357-online-partial-preserve', phase, updates, createdComments,
      message: 'Stop; remote result may be partial or unknown. Preserve all originals and reconcile before any new execution.', automaticRetry: false }, null, 2) + '\n', { flag: 'wx' }); } catch { /* No overwrite or error masking. */ }
    throw new Error('Status357 stopped; preserve all original receipts and reconcile remote state before retry');
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { assert.equal(process.argv.length, 3); assert.equal(process.argv[2], '--execute'); run357(); }
  catch { console.error(JSON.stringify({ kind: 'status357-sync-stopped', message: 'No blind retry; inspect retained records and current remote state.' })); process.exitCode = 1; }
}
