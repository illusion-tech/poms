// Root-only Issue-first status359 synchronization candidate. Never auto-executes on import.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const O = R + '/tmp/rust-r4ghi/root/status359-online';
const repo = 'repos/illusion-tech/poms';
const statusPath = 'docs/design/rust-r4ghi/continuation-status359.json';
const statusSHA = 'd61067068890c3b0d04c7788d4b9597a5a0a55e522fdbb79839f5bd6aa30a8c3';
const sha = b => createHash('sha256').update(b).digest('hex');
export const issues359 = Object.freeze([57, 101, 110, 111, 112, 113, 114, 117, 118, 119, 120, 121]);
export const marker359 = '<!-- POMS-R4GHI-CURRENT-359 -->';
const close359 = '<!-- /POMS-R4GHI-CURRENT-359 -->';
const oldMarker = '<!-- POMS-R4GHI-CURRENT-358 -->';
const oldClose = '<!-- /POMS-R4GHI-CURRENT-358 -->';
export const comment121Marker359 = '<!-- RUNTIME121-STATUS359-A-API-RECOVERY-ASOF -->';
export const comment57Marker359 = '<!-- R4GHI-359-CURRENT-ASOF-READBACK -->';
export function parseStatus359CLI(args) {
  assert(Array.isArray(args)&&args.length===3); assert.equal(args[0],'--commit'); assert.equal(args[2],'--execute');
  assert(typeof args[1]==='string'&&/^[a-f0-9]{40}$/.test(args[1]),'Real exact commit required'); return args[1];
}
function url359(head) { assert(typeof head==='string'&&/^[a-f0-9]{40}$/.test(head),'Real exact commit required'); return 'https://github.com/illusion-tech/poms/blob/'+head+'/'; }
function section359(head) { const url=url359(head); return `${marker359}
### 当前推进状态（359：A与API真实恢复已独审，Native/prepare前置待完成）

Rust正式 **240**，R4交付 **67/95**，本批32项仍为 **candidate、新增业务认证0、业务G3/G4未通过**。#57及完整R5 #116保持OPEN；#119历史技术G4/CLOSED保留。#121未收口，#118继续阻塞，#120后继条件未满足。

[固定状态359](${url}${statusPath})记录本次as-of边界。新holder双侧身份独审8d7d通过；原CID/同volume/PG15/OID的pg-start4334已实际完成，新PG PID72989。新RO ab8c与独立audit02（2ff9/22a2）通过：三套共834表文件、14808行，每套native542+rust4394，原raw/xmin/meta/sequence/objects三向相等；不主张跨库原子性或持续数据库状态。

Root同字节API唯一启动7fa5…已outer0：complete fac140、apiProcess f822ff、generic68e7、初始readiness200/64c9。独立当前OS身份/socket与原初始200读回308c通过；API PID109023及opaque env绑定只保该读回时点，不表示持续可用或业务认证。API/helper/current284/ELF不改，Source06 actual91a4/eb412、M06 actual9124/1798与Git8db源码继续保as-of证据。

fresh67 metadata helper31496/cad3已由Root交付dc9537be，独审c575和Tax8 carrier eab13为code-ready；仍须真实Native发布和既有immutable entry快照，才能形成具体metadata/prepare-only输入。Native数据plan只作数据准备；**Native FS publication、真实context/Ctor、actual prepare、Tax/FI/normal201均未发生。** 下一步只按既有G1逐真实Native FS G2、发布/构造守卫和fresh prepare67前置推进，不新增治理层。

历史失败不得改写：357 d963/ce0a始终无Root-review/output、从未执行恢复；旧boot holder51024/4802/PG6360和旧A/5fd27仍是历史。audit01 exit1保留，单次safe诊断定位旧verdict误配；source02仅改两处对照字面，实际独立file audit02 exit0，不改原G2/PG/RO结果。稳定G1Policy358仍只授代码，实际各mode各自G2；loss观察boot不冒未来authority。A15/Root12/bundle4/A7/Root8/Native/284不改，原8015 anchor保留。

之后仍需Native实际准入/真实Ctor、fresh prepare121完整物理根/allpeer/CAS/原body67同值及独立实际读回，才可新的FI和单独唯一normal201。old15/Reg5/B1/旧process、08e3/full67/body0f92、7f75失败journal、Main13原201与failed01/diag原件均不改写或重放。
${close359}`; }

function exactlyOne(text, needle) { assert.equal(text.split(needle).length - 1, 1, 'Unique exact predecessor required'); }
function replaceLine(text, pattern, replacement) {
  const found = text.match(pattern); assert.equal(found?.length, 1, 'Unique exact checklist predecessor required');
  return text.replace(found[0], typeof replacement === 'function' ? replacement(found[0]) : replacement);
}
export function body359(issue, before, head) {
  assert(issues359.includes(issue)); assert(typeof before==='string'); url359(head);
  exactlyOne(before,oldMarker); exactlyOne(before,oldClose); assert(!before.includes(marker359)); assert(!before.includes(close359));
  const start=before.indexOf(oldMarker),end=before.indexOf(oldClose)+oldClose.length; assert(end>start);
  let body=before.slice(0,start)+section359(head)+before.slice(end);
  if(issue===121){
    exactlyOne(body,'（当前以358为准）');body=body.replace('（当前以358为准）','（当前以359为准）');
    body=replaceLine(body,/^- \[x\] 有界代码独审：.*$/gm,'- [x] 有界代码独审：Root8/H03/I06当前41项与Git8db仍保as-of；aux358已独审交付，fresh67 metadata cad3/Root dc9537be、独审c575及Tax8 carrier eab13仅code-ready，不冒Native/prepare或业务实际许可。');
    body=replaceLine(body,/^- \[x\] 实际完整图：.*$/gm,'- [x] 实际完整图：Source06 91a4/eb412、helper229/external55/execution284及M06 9124/1798保as-of；API/helper/current284/ELF不改。A与同字节API已真实恢复并独审，Native发布/context/prepare仍后置，旧33/05图不改写。');
    body=replaceLine(body,/^- \[ \] A当前boot恢复G2与验收（358）：.*$/gm,'- [x] A当前boot恢复G2与验收（359）：新holder双侧8d7d、原PGstart4334/PID72989、新ROab8c和独立audit02 2ff9/22a2通过as-of读回；三新nonce/各自exactG2、strict4 owner与原卷双RO已完成，不主张持续DB状态，旧357 d963/ce0a未执行标签保留。');
    body=replaceLine(body,/^- \[ \] B实际G2与验收：.*$/gm,'- [ ] B实际G2与验收：API唯一启动fac140/generic68e7、processf822及初始readiness200/64c9已完成，独立OS/socket/初始200读回308c通过as-of；新Native FS publication/真实context-Ctor及fresh prepare仍未执行，各自实际G2和验收后置。');
  }
  exactlyOne(body,marker359);exactlyOne(body,close359);assert(!body.includes(oldMarker));assert(!body.includes(oldClose));assert.notEqual(body,before);assert(body.length<65000);return body;
}
export function comment121359(head) {
  const url=url359(head);return comment121Marker359+'\n[固定状态359]('+url+statusPath+')：新holder双侧8d7d、原PGstart4334/PID72989、新ROab8c与独立audit02 2ff9/22a2已通过as-of；834表文件、14808行（三套各native542+rust4394），三向raw/xmin/meta/sequence/objects相等。Root唯一同字节API启动fac140/generic68e7、processf822/初始200-64c9及独立OS/socket/初始readiness读回308c通过；不表示持续可用或业务认证。API/helper/current284/ELF不改。fresh67 metadata cad3已Root交付dc9537be、独审c575，Tax8 eab13仅code-ready；Native plan仅数据准备，Native FS/context-Ctor/prepare/Tax/FI/normal201仍未执行，逐真实G2和守卫后置。failed audit01 exit1、safe diag和source02两字面修正均保真，d963/ce0a仍从未执行，旧历史及Main201不重放。Rust240/R4 67of95/32candidate/新增认证0/业务G3G4false；#57/#116 OPEN、#119历史CLOSED，#121不收口。';
}
export function comment57359(issue121CommentURL,head) {
  assert(/^https:\/\/github\.com\/illusion-tech\/poms\/issues\/121#issuecomment-[0-9]+$/.test(issue121CommentURL));const url=url359(head);
  return comment57Marker359+'\n12项CURRENT块按[固定状态359]('+url+statusPath+')同步读回。[A与API恢复、Native前置边界]('+issue121CommentURL+')：新holder/原PG/双RO与独立audit02通过as-of；同字节API唯一启动与独立OS/socket/初始readiness200读回通过。API/helper/current284/ELF不改；fresh67 metadata与Tax8仅code-ready，Native FS/context-Ctor/prepare及业务验收仍未发生。failed01/diag/source02修正和旧未执行/失败标签保留。Rust240、R4 67of95、本批32candidate、新增认证0、业务G3/G4false；#57与完整R5 #116继续OPEN，#119历史技术CLOSED，所有issue状态保持原值。';
}
function absent(file) { try { fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return; throw e; } throw new Error('Existing receipt namespace: preserve and reconcile, do not retry'); }
function run359(head) {
  url359(head);
  assert.equal(fileURLToPath(import.meta.url).replaceAll('\\', '/'), R + '/tools/rust-r4ghi/sync-runtime121-status359.mjs');
  assert.equal(process.cwd().replaceAll('\\', '/'), R);
  const raw = fs.readFileSync(R + '/' + statusPath); assert.equal(raw.length, 26422); assert.equal(sha(raw), statusSHA); const status = JSON.parse(raw);
  assert.equal(status.kind, 'R4-runtime121-A-API-recovered-status359');
  assert.deepEqual(status.official, { Rust: 240, R4Delivered: 67, R4Total: 95, batchCandidate: 32, newCertified: 0 });
  assert.equal(status.current.PGStarted, true); assert.equal(status.current.APIStarted, true); assert.equal(status.current.logicalDataConservationObservedForCurrentBoot, true);
  assert.equal(status.nativeFrontier.actualNativeFSPublication,false); assert.equal(status.nativeFrontier.actualNativeContext,false); assert.equal(status.nativeFrontier.actualPrepare,false); assert.equal(status.nativeFrontier.actualTaxFIOrNormal201,false);
  assert.equal(status.businessG3, false); assert.equal(status.businessG4, false); assert.equal(status.current.NativeContextGranted, false);
  assert.equal(status.stableHolderPolicy.codeImplementationGranted, true); assert.equal(status.stableHolderPolicy.actualG2Authorized, false); assert.equal(status.stableHolderPolicy.implementationPending, false);
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
    const remoteStatus = api('committed-status359', repo + '/contents/' + statusPath + '?ref=' + head); assert.equal(remoteStatus.encoding, 'base64'); const remoteBytes=Buffer.from(remoteStatus.content,'base64'); assert.equal(remoteBytes.length,26422); assert.equal(sha(remoteBytes),statusSHA);
    assert.equal(api('116-before-readonly', repo + '/issues/116').state, 'open');
    const before = new Map();
    for (const n of issues359) { const v = api(n + '-before', repo + '/issues/' + n); assert.equal(v.state, expectedState(n)); body359(n, v.body, head); before.set(n, v); }
    for (const n of [121, 57]) { const existing = comments(n, n + '-unique359-before'); assert.equal(existing.length, before.get(n).comments); assert(!existing.some(c => typeof c.body === 'string' && (c.body.includes(comment121Marker359) || c.body.includes(comment57Marker359)))); }
    for (const n of issues359) {
      const original = api(n + '-prepare', repo + '/issues/' + n);
      assert.equal(original.body, before.get(n).body); assert.equal(original.comments, before.get(n).comments); assert.equal(original.state, expectedState(n));
      const body = body359(n, original.body, head), fresh = api(n + '-prewrite', repo + '/issues/' + n); unchanged(original, fresh, expectedState(n));
      api(n + '-patch', repo + '/issues/' + n, 'PATCH', { body }); const after = api(n + '-readback', repo + '/issues/' + n);
      assert.equal(after.body, body); assert.equal(after.state, expectedState(n)); updates.push({ issue: n, state: after.state, bodySHA256: sha(body) });
    }
    function postOne(n, marker, body, label) {
      const beforePost = api(label + '-issue-before', repo + '/issues/' + n); assert.equal(beforePost.state, expectedState(n)); assert.equal(beforePost.body, body359(n, before.get(n).body, head));
      const existing = comments(n, label + '-fresh-unique'); assert(!existing.some(c => typeof c.body === 'string' && c.body.includes(marker)));
      const fresh = api(label + '-issue-prepost', repo + '/issues/' + n); unchanged(beforePost, fresh, expectedState(n));
      const comment = api(label + '-post', repo + '/issues/' + n + '/comments', 'POST', { body }); assert(Number.isSafeInteger(comment.id)); createdComments.push({ issue: n, id: comment.id, html_url: comment.html_url });
      assert.equal(api(label + '-readback', repo + '/issues/comments/' + comment.id).body, body);
      assert.equal(comments(n, label + '-unique-readback').filter(c => typeof c.body === 'string' && c.body.includes(marker)).length, 1); return comment;
    }
    const c = postOne(121, comment121Marker359, comment121359(head), '121-comment');
    const pc = postOne(57, comment57Marker359, comment57359(c.html_url, head), '57-comment');
    assert.equal(api('116-final-readonly', repo + '/issues/116').state, 'open');
    for (const n of issues359) { const last = api(n + '-final-readback', repo + '/issues/' + n); assert.equal(last.state, expectedState(n)); assert.equal(last.body, body359(n, before.get(n).body, head)); }
    const receipt = { kind: 'actual-runtime121-status359-A-API-recovered-online-sync', commit: head, statusSHA256: statusSHA,
      updates, issue121Comment: c.html_url, parentComment: pc.html_url, historicalAThreeModesPassed: true,
      currentARecoveryReadbackPassedAsOfStatus359:true, currentAPIReadbackPassedAsOfStatus359:true, NativeFSAndCtorAndPreparePending:true, stablePolicyStillCodeOnly:true, prior357RecoveryNeverExecuted:true, PGStartedByThisScript:false, APIStartedByThisScript:false, sourcePromotedByThisScript:false,
      currentPGStartedAsOfStatus359:true, currentLogicalConservationAsOfStatus359:true, currentAPIStartedAsOfStatus359:true,
      NativeContextGranted:false, actualNativeFSPublished:false, actualPrepare:false, newBusinessCertified:0, businessG3: false, businessG4: false };
    fs.writeFileSync(O + '/receipt.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(receipt));
  } catch {
    try { fs.writeFileSync(O + '/partial.json', JSON.stringify({ kind: 'status359-online-partial-preserve', phase, updates, createdComments,
      message: 'Stop; remote result may be partial or unknown. Preserve all originals and reconcile before any new execution.', automaticRetry: false }, null, 2) + '\n', { flag: 'wx' }); } catch { /* No overwrite or error masking. */ }
    throw new Error('Status359 stopped; preserve all original receipts and reconcile remote state before retry');
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const head=parseStatus359CLI(process.argv.slice(2)); run359(head); }
  catch { console.error(JSON.stringify({ kind: 'status359-sync-stopped', message: 'No blind retry; inspect retained records and current remote state.' })); process.exitCode = 1; }
}
