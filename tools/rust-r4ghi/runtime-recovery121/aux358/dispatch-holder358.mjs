// Stable-policy holder transport. Import is pure; only the two closed CLI paths run.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { isProxy } from 'node:util/types';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const freeze = v => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
export const CONTRACT358 = freeze({
  root: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',
  winRoot: 'E:/projects/worktrees/poms-r3hijk-next28/poms',
  private: '/home/wangzishi/.local/share/poms-r4ghi/private',
  nodeWin: 'C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe',
  nodeWinSHA: '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237',
  nodeLinux: '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node',
  nodeLinuxSHA: 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12',
  nodeVersion: 'v24.19.0',
  G1Policy: {
    file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/g1A-transport358-policy01/Root-G1A-holder-transport-policy358.json',
    bytes: 12056, rawBytesSha256: '3082f94a4f0c1a6cb0de7f807c24c32b534722369690f2c873a5dbc8b75b4be6',
  },
  trustedPowerShell: {
    bytes: 301360, rawBytesSha256: '2a6769a3330dc1084d0154bfde7d164ab750ca7f700f313f9d417c1be78b2233', version: '7.6.9',
    pathRegex: '^C:/Program Files/WindowsApps/OpenAI\\.CodexPrimaryRuntime\\.v[0-9]+-[0-9]+-[0-9]+-[0-9]+_[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+_x64__3k8sg7r9htsxt/dependencies/native/powershell/pwsh\\.exe$',
  },
  oldG1: { file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/g1A/Root-G1A-121.json', bytes: 4887, rawBytesSha256: 'c20283d9a4e30d96f23d7f3890882e58a6f22e394fa9c747baa4c3a07968a68b' },
  oldReview: { file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-A-code-review02/review-A-code02b.json', bytes: 14378, rawBytesSha256: '0071eb7c620ea57cf5213a8e3ce008552ab1d33b98b2dc11a2fb4a04b60b5126' },
  oldLoss: { file: '/home/wangzishi/.local/share/poms-r4ghi/private/runtime-loss353-observation01/observation.json', bytes: 2753, rawBytesSha256: '80151bd29512f869a4aee63fd5e0d020f3bc3a2c0d136a983d4452d81a1ef698' },
  retention: { file: '/home/wangzishi/.local/share/poms-r4ghi/private/failed15-retained353-01/retained-failed15-mapping.json', bytes: 1367, rawBytesSha256: '10ff9393ddaf17815cb92037950cc9d91ab193b8908319b15842d77d32ea8ac0' },
  stateSHAs: { state13: 'af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4', state14: 'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97', state15: '4c354c9190cdae04135ddedd1da7e8652fe5aa6e0aa8f5c74805faef9bc903ea', ownership15: 'b76bb9d8345b0364554f05fb0d719f5083278b332ff54303946d9df3f167a918' },
  wsl: 'C:/Windows/System32/wsl.exe',
  bootPolicy: 'capture-and-bind-own-holder-launch',
  limits: { holderStartOnly: true, readonlyOwnedHolderSubentryOnly: true, PGControl: false, APIStart: false, NativeContext: false, domainSQLHTTP: false, businessStateWrite: false, hostConfiguration: false, scheduledTasksOrAutostart: false, automaticRetry: false },
});
const C = CONTRACT358, ROOT = C.root + '/tools/rust-r4ghi/runtime-recovery121/';
const OP = ROOT + 'aux358/dispatch-holder358.mjs', PS = ROOT + 'root/start-holder121.ps1', FACTS = ROOT + 'root/facts121.mjs', HOLDER = ROOT + 'root/hold-runtime121.mjs';
const INPUT15 = ['kind', 'schemaVersion', 'mode', 'namespace', 'nonce', 'G1', 'codeReview', 'executionSources', 'expectedStates', 'runtimeLossObservation', 'failedRetention', 'holder', 'pgStart', 'baseline', 'outputDirectory'];
const SUPPORT6 = ['G1Append', 'newLossObservation', 'bootPolicy', 'actualOperator', 'codeReview', 'executablePin'];
const ROUND14 = ['kind', 'recordedAt', 'G1Policy', 'roundId', 'currentLossObservation', 'hostObservation', 'executablePin', 'powerShellVersion', 'actualOperator', 'codeReview', 'holderRequest', 'bootPolicy', 'limits', 'actualG2Authorized'];
const OBSERVATION_KEYS = ['kind', 'recordedAt', 'mode', 'nonce', 'G1Policy', 'G1Append', 'actualOperator', 'codeReview', 'newLossObservation', 'executablePin', 'bootPolicy', 'request', 'independentReview', 'input', 'RootReview', 'dispatch', 'holderReady', 'windowsLaunch', 'holder', 'windows', 'rawProc', 'readonly', 'PGControl', 'APIStart', 'NativeContext', 'SQLHTTP'];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function eq(a, b, message) { assert(isDeepStrictEqual(a, b), message); }
function plain(v) {
  assert(v && typeof v === 'object' && !Array.isArray(v) && !isProxy(v) && Object.getPrototypeOf(v) === Object.prototype, 'Plain metadata required');
  assert.equal(Reflect.ownKeys(v).length, Object.keys(v).length, 'No symbol metadata');
  for (const d of Object.values(Object.getOwnPropertyDescriptors(v))) assert(Object.hasOwn(d, 'value'), 'No metadata accessors');
}
function keys(v, expected) { plain(v); eq(Object.keys(v).sort(), [...expected].sort(), 'Closed metadata keys'); }
function dataOnly(v, active = new Set()) {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
  if (typeof v === 'number') { assert(Number.isFinite(v)); return; }
  assert(v && typeof v === 'object' && !isProxy(v) && !active.has(v), 'JSON data only'); active.add(v);
  if (Array.isArray(v)) {
    assert(Object.getPrototypeOf(v) === Array.prototype && Reflect.ownKeys(v).length === v.length + 1, 'Plain dense arrays only');
    for (let i = 0; i < v.length; i++) { const d = Object.getOwnPropertyDescriptor(v, String(i)); assert(d && Object.hasOwn(d, 'value'), 'No array accessors'); dataOnly(d.value, active); }
  } else { plain(v); for (const x of Object.values(v)) dataOnly(x, active); }
  active.delete(v);
}
function pinShape(p, { full = false, windows = false } = {}) {
  plain(p); keys(p, full || Object.hasOwn(p, 'bytes') ? ['file', 'bytes', 'rawBytesSha256'] : ['file', 'rawBytesSha256']);
  assert(typeof p.file === 'string' && !/[\0\r\n]/.test(p.file) && /^[a-f0-9]{64}$/.test(p.rawBytesSha256), 'Pin identity');
  if (windows) assert(/^[A-Z]:\//.test(p.file) && !p.file.includes('\\') && path.win32.normalize(p.file).replaceAll('\\', '/') === p.file, 'Canonical Windows pin');
  else assert(p.file.startsWith('/') && !p.file.includes('\\') && !p.file.includes('//') && path.posix.resolve(p.file) === p.file, 'Canonical Linux pin');
  if (Object.hasOwn(p, 'bytes')) assert(Number.isSafeInteger(p.bytes) && p.bytes >= 0, 'Nonnegative pin length');
}
function same(a, b) {
  pinShape(a, { windows: /^[A-Z]:\//.test(a?.file ?? '') }); pinShape(b, { windows: /^[A-Z]:\//.test(b?.file ?? '') });
  assert.equal(a.file, b.file, 'Exact pin path'); assert.equal(a.rawBytesSha256, b.rawBytesSha256, 'Exact pin SHA');
  if (a.bytes !== undefined && b.bytes !== undefined) assert.equal(a.bytes, b.bytes, 'Exact pin length');
}
export function localPath358(file, platform = process.platform) {
  if (platform !== 'win32') return file;
  return file.startsWith('/mnt/e/') ? 'E:/' + file.slice(7) : file.startsWith('/home/') ? '//wsl.localhost/Debian' + file : file;
}
const local = file => localPath358(file);
function raw(p, binary = false) {
  pinShape(p, { windows: /^[A-Z]:\//.test(p?.file ?? '') });
  const file = local(p.file), st = fs.lstatSync(file);
  assert(st.isFile() && !st.isSymbolicLink() && (binary ? st.nlink >= 1 : st.nlink === 1), 'Regular nonalias file');
  assert.equal(fs.realpathSync(file), path.resolve(file), 'Canonical physical file');
  const b = fs.readFileSync(file); assert.equal(sha(b), p.rawBytesSha256, 'Pinned bytes differ');
  if (p.bytes !== undefined) assert.equal(b.length, p.bytes, 'Pinned length differs'); return b;
}
function actualPin(file, binary = false) { const b = fs.readFileSync(local(file)), p = { file, bytes: b.length, rawBytesSha256: sha(b) }; raw(p, binary); return p; }
const json = p => JSON.parse(raw(p));
function fullPin(p, windows = false) { pinShape(p, { full: true, windows }); }
function validTime(t) { assert(typeof t === 'string' && Number.isFinite(Date.parse(t)), 'Recorded timestamp'); }
function canonicalSources(list) { assert(Array.isArray(list)); const v = list.map(p => { fullPin(p); return p; }).sort((a, b) => Buffer.compare(Buffer.from(a.file), Buffer.from(b.file))); assert.equal(new Set(v.map(p => p.file)).size, v.length); return v; }
export function trustedExecutable358(p) {
  fullPin(p, true); assert(new RegExp(C.trustedPowerShell.pathRegex).test(p.file), 'Approved WindowsApps path form');
  assert.equal(p.bytes, C.trustedPowerShell.bytes); assert.equal(p.rawBytesSha256, C.trustedPowerShell.rawBytesSha256); return p;
}
export function parseCLI358(args) {
  assert(Array.isArray(args) && args.length === 9, 'Exactly nine CLI arguments');
  eq([args[0], args[2], args[4], args[6], args[8]], ['--request', '--request-sha', '--independent-review', '--independent-review-sha', '--execute'], 'Fixed CLI');
  const request = { file: args[1], rawBytesSha256: args[3] }, peer = { file: args[5], rawBytesSha256: args[7] }; pinShape(request); pinShape(peer); return { request, peer };
}
export function assertHolderMode358(q) { plain(q); assert.equal(q.mode, 'holder-start', 'Aux358 only holder-start; PG modes forbidden'); assert.equal(q.kind, 'Root-runtime121-A-exact-G2-request'); }
export function reviewBody358(p, input) { return { kind: 'Root-approved-exact-runtime121-A', approvedInput: input, G1: p.G1, codeReview: p.codeReview, mode: p.mode, nonce: p.nonce, actualG2Authorized: true, processControl: true, readonlyPG: false, APIStart: false, businessDML: false, createReplaceRestoreMigrate: false }; }
export function childInvocation358(input, review, executablePin) {
  fullPin(input); fullPin(review); trustedExecutable358(executablePin);
  return { entry: PS, executable: executablePin.file, argv: ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', localPath358(PS, 'win32'), '-InputFile', input.file, '-InputSha', input.rawBytesSha256, '-ReviewFile', review.file, '-ReviewSha', review.rawBytesSha256, '-Execute'] };
}
export function readonlyInvocation358(request, peer) {
  fullPin(request); fullPin(peer);
  return { executable: C.wsl, argv: ['-d', 'Debian', '--cd', C.root, '--exec', C.nodeLinux, OP, '--read-owned-holder', '--request', request.file, '--request-sha', request.rawBytesSha256, '--independent-review', peer.file, '--independent-review-sha', peer.rawBytesSha256, '--execute'] };
}
export function validateEnvelope358(value) {
  keys(value, ['request', 'requestPin', 'peer', 'peerPin', 'input', 'round', 'auxReview', 'originalReview', 'operatorPin', 'policy']);
  assertHolderMode358(value.request); dataOnly(value);
  const { request: q, requestPin, peer: g, peerPin, input: p, round: a, auxReview: r, originalReview: old, operatorPin, policy } = value;
  fullPin(requestPin); fullPin(peerPin); fullPin(q.input); fullPin(q.expectedRootReview); fullPin(operatorPin); assert.equal(operatorPin.file, OP);
  assert.equal(policy.kind, 'Root-frozen-stable-holder-transport358-G1-policy'); assert.equal(policy.codeImplementationGranted, true); assert.equal(policy.actualG2Authorized, false); assert.equal(policy.anyModeExecuted, false);
  eq(policy.limits, C.limits, 'Frozen policy limits'); eq(policy.immutableHostRules.trustedPowerShell, C.trustedPowerShell, 'Trusted executable policy');
  keys(p, INPUT15); assert.equal(p.kind, 'Root-runtime121-A-operation-input'); assert.equal(p.schemaVersion, 1); assert.equal(p.mode, 'holder-start'); assert.equal(p.namespace, 'poms-r4ghi');
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(p.nonce), 'New UUID');
  for (const k of ['holder', 'pgStart', 'baseline']) assert.equal(p[k], null, 'Holder-only phase matrix');
  assert.equal(p.outputDirectory, C.private + '/runtime121-A/holder-start/' + p.nonce);
  same(p.G1, C.oldG1); same(p.codeReview, C.oldReview); same(p.runtimeLossObservation, C.oldLoss); same(p.failedRetention, C.retention);
  assert.equal(g.kind, 'non-author-runtime121-A-exact-G2'); assert.equal(g.mode, 'holder-start'); assert.equal(g.verdict, 'approved-once-holder-start-with-capture-bound-transport358'); assert.equal(g.reviewerIsAuthor, false);
  eq(g.approvedInput, q.input, 'G2 input'); eq(g.expectedRootReview, q.expectedRootReview, 'G2 Root pin'); keys(g.transport358, SUPPORT6); const t = g.transport358;
  for (const k of ['G1Append', 'newLossObservation', 'actualOperator', 'codeReview']) fullPin(t[k]); trustedExecutable358(t.executablePin); assert.equal(t.bootPolicy, C.bootPolicy);
  same(t.actualOperator, operatorPin); assert.notEqual(t.newLossObservation.file, C.oldLoss.file, 'A fresh loss observation is separate from the historical A15 anchor');
  keys(a, ROUND14); validTime(a.recordedAt); assert.equal(a.kind, 'Root-frozen-runtime121-A-current-recovery-round'); assert.equal(a.actualG2Authorized, false);
  assert(typeof a.roundId === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/.test(a.roundId), 'Round identifier');
  fullPin(a.G1Policy); same(a.G1Policy, C.G1Policy); fullPin(a.hostObservation); fullPin(a.holderRequest); same(a.holderRequest, requestPin);
  same(a.currentLossObservation, t.newLossObservation); same(a.actualOperator, operatorPin); same(a.codeReview, t.codeReview); eq(a.executablePin, t.executablePin, 'Round-bound executable');
  assert.equal(a.powerShellVersion, C.trustedPowerShell.version); assert.equal(a.bootPolicy, C.bootPolicy); eq(a.limits, C.limits, 'Closed round limits');
  assert.equal(r.kind, 'non-author-runtime121-A-holder-transport358-code-review'); assert.equal(r.verdict, 'code-ready-for-exact-holder-transport358-input-review'); assert.equal(r.reviewerIsAuthor, false);
  assert(typeof r.author === 'string' && r.author && typeof r.reviewer === 'string' && r.reviewer && r.author !== r.reviewer, 'Separate code reviewer');
  assert(!Object.hasOwn(r, 'G1Append') && !Object.hasOwn(r, 'currentRound'), 'Code review binds stable policy, not a concrete round');
  fullPin(r.G1Policy); same(r.G1Policy, C.G1Policy); fullPin(r.operator); same(r.operator, operatorPin); assert(Array.isArray(r.executionSources) && r.executionSources.length === 1, 'Exactly one new auxiliary source'); fullPin(r.executionSources[0]); same(r.executionSources[0], operatorPin);
  assert.equal(old.kind, 'non-author-runtime121-A-code-review'); assert.equal(old.verdict, 'code-ready-for-exact-runtime121-A-input-review'); assert.equal(old.reviewerIsAuthor, false);
  eq(p.executionSources, old.executionSources, 'Original0071 proves only original7'); assert.equal(p.executionSources.length, 7); eq(canonicalSources(p.executionSources), canonicalSources(policy.originalABI.originalA7ExecutionSources), 'Frozen original7');
  keys(p.expectedStates, Object.keys(C.stateSHAs)); for (const k of Object.keys(C.stateSHAs)) { fullPin(p.expectedStates[k]); assert.equal(p.expectedStates[k].rawBytesSha256, C.stateSHAs[k]); }
  const parent = C.private + '/runtime121-A-inputs/holder-start/' + p.nonce;
  assert.equal(q.input.file, parent + '/input.json'); assert.equal(requestPin.file, parent + '/request-exact-G2.json'); assert.equal(q.expectedRootReview.file, parent + '/Root-review.json');
  const body = reviewBody358(p, q.input); eq(q.expectedRootReviewBody, body, 'Original Root12'); const b = Buffer.from(JSON.stringify(body, null, 2) + '\n'); assert.equal(b.length, q.expectedRootReview.bytes); assert.equal(sha(b), q.expectedRootReview.rawBytesSha256);
  for (const k of ['actualG2', 'RootReviewSigned', 'effectsExecuted']) assert.equal(q[k], false, 'Request is not prior execution'); return body;
}
function host358(platform) {
  assert.equal(process.platform, platform); assert.equal(process.version, C.nodeVersion); assert.equal(process.execArgv.length, 0); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH, 'No Node injection');
  const expected = platform === 'win32' ? C.nodeWin : C.nodeLinux, cwd = platform === 'win32' ? C.winRoot : C.root;
  assert.equal(path.resolve(process.cwd()), path.resolve(cwd)); if (platform === 'linux') assert.equal(process.getuid(), 1000);
  assert.equal(fs.realpathSync(process.execPath), path.resolve(expected)); const node = actualPin(expected, true); assert.equal(node.rawBytesSha256, platform === 'win32' ? C.nodeWinSHA : C.nodeLinuxSHA); return node;
}
function assertAbsentControl358(file) { try { fs.lstatSync(local(file)); } catch (e) { if (e?.code === 'ENOENT') return; throw e; } assert.fail('Existing driver control entry'); }
function assertAbsentPath358(file) { try { fs.lstatSync(local(file)); } catch (e) { if (e?.code === 'ENOENT') return; throw e; } assert.fail('Existing nonce/output entry; preserve without replay'); }
function verifyStatesBuiltin358(p) {
  const files = { state13: C.private + '/business/g2-business13/main01/state.json', state14: C.private + '/business/g2-business14/main01/state.json', state15: C.private + '/business/g2-business15/main01/state.json', ownership15: C.private + '/business/g2-business15/main01/ownership.jsonl' }, mapping = json(p.failedRetention);
  assert.equal(mapping.originalsUnmodified, true);
  for (const k of Object.keys(files)) {
    const expected = raw(p.expectedStates[k]); assert(expected.equals(fs.readFileSync(local(files[k]))), 'Original state/log changed: ' + k);
    if (k === 'state15' || k === 'ownership15') assert(mapping.mappings.some(m => m.original.file === files[k] && m.privateRetainedCopy.file === p.expectedStates[k].file && m.privateRetainedCopy.rawBytesSha256 === p.expectedStates[k].rawBytesSha256), 'Immutable retained copy required');
  }
  for (const n of [13, 14, 15]) assertAbsentControl358(C.private + '/business/g2-business' + n + '/main01/driver.lock');
}
function checkPins358(inv) { for (const p of inv.critical) raw(p); raw(inv.node, true); if (process.platform === 'win32') raw(inv.t.executablePin, true); verifyStatesBuiltin358(inv.meta.input); }
function writeWx358(dir, name, value) { assert.equal(path.posix.basename(name), name); const file = dir + '/' + name, b = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n'); fs.writeFileSync(local(file), b, { flag: 'wx', mode: 0o600 }); return actualPin(file); }
const error358 = e => ({ name: typeof e?.name === 'string' ? e.name : 'Error', code: typeof e?.code === 'string' ? e.code : null, message: 'Holder transport failed; preserve original logs and nonce' });
const cleanEnv358 = () => { const env = { ...process.env }; delete env.NODE_OPTIONS; delete env.NODE_PATH; return env; };
function loadEnvelope358(args, platform) {
  const cli = parseCLI358(args), q = json(cli.request); assertHolderMode358(q); const node = host358(platform), g = json(cli.peer); dataOnly(g); keys(g.transport358, SUPPORT6);
  const t = g.transport358, round = json(t.G1Append), policy = json(C.G1Policy), p = json(q.input), auxReview = json(t.codeReview), originalReview = json(p.codeReview), self = actualPin(OP), requestPin = actualPin(cli.request.file), peerPin = actualPin(cli.peer.file);
  same(requestPin, cli.request); same(peerPin, cli.peer); assert.equal(path.resolve(fileURLToPath(import.meta.url)), path.resolve(local(OP)), 'Actual installed source only');
  const meta = { request: q, requestPin, peer: g, peerPin, input: p, round, auxReview, originalReview, operatorPin: self, policy }, rootBody = validateEnvelope358(meta);
  const critical = [C.G1Policy, requestPin, peerPin, q.input, t.G1Append, t.newLossObservation, round.hostObservation, t.codeReview, p.codeReview, p.G1, p.runtimeLossObservation, p.failedRetention, self, ...p.executionSources];
  const inv = { meta, t, node, critical, rootBody }; checkPins358(inv); return inv;
}
async function facts358(inv) {
  checkPins358(inv); const factsPin = inv.meta.input.executionSources.find(p => p.file === FACTS); assert(factsPin);
  const verifiedBytes = raw(factsPin); const f = await import('data:text/javascript;base64,' + verifiedBytes.toString('base64'));
  f.shape(inv.meta.input); f.verifySources(inv.meta.input); f.verifyStates(inv.meta.input); checkPins358(inv); return f;
}
function provenance358(inv) { return { G1Policy: C.G1Policy, G1Append: inv.t.G1Append, actualOperator: inv.meta.operatorPin, codeReview: inv.t.codeReview, executablePin: inv.t.executablePin, newLossObservation: inv.t.newLossObservation, bootPolicy: C.bootPolicy }; }
export function validateDispatch358(meta, d) {
  dataOnly(d); const { request: q, input: p, peerPin, requestPin } = meta, t = meta.peer.transport358;
  assert.equal(d.kind, 'actual-runtime121-A-single-dispatch'); assert.equal(d.transportKind, 'actual-runtime121-A-holder-transport358-dispatch'); assert.equal(d.mode, 'holder-start');
  same(d.input, q.input); same(d.RootReview, q.expectedRootReview); same(d.independentReview, peerPin); same(d.request, requestPin); same(d.entry, p.executionSources.find(x => x.file === PS));
  const invocation = childInvocation358(q.input, q.expectedRootReview, t.executablePin); assert.equal(d.executable, invocation.executable); eq(d.argv, invocation.argv, 'Actual PowerShell argv');
  same(d.G1Policy, C.G1Policy); for (const k of ['G1Append', 'actualOperator', 'codeReview', 'executablePin', 'newLossObservation']) same(d[k], t[k]); assert.equal(d.bootPolicy, C.bootPolicy); assert(uuid.test(d.capturedBootId));
  assert.equal(d.originalStdout, p.outputDirectory + '/stdout-original.log'); assert.equal(d.originalStderr, p.outputDirectory + '/stderr-original.log'); assert.equal(d.APIStart, false); assert.equal(d.businessDML, false);
}
export function validateOwnedObservation358(meta, o, anchors) {
  dataOnly(o); dataOnly(anchors); keys(o, OBSERVATION_KEYS); keys(anchors, ['dispatch', 'holderReady', 'windowsLaunch', 'beforeBootId', 'afterBootId']);
  const q = meta.request, p = meta.input, t = meta.peer.transport358, h = o.holder, w = o.windows;
  assert.equal(o.kind, 'actual-runtime121-A-holder-transport358-owned-holder-readback'); validTime(o.recordedAt); assert.equal(o.mode, 'holder-start'); assert.equal(o.nonce, p.nonce);
  same(o.G1Policy, C.G1Policy); for (const k of ['G1Append', 'actualOperator', 'codeReview', 'executablePin', 'newLossObservation']) same(o[k], t[k]); assert.equal(o.bootPolicy, C.bootPolicy);
  same(o.request, meta.requestPin); same(o.independentReview, meta.peerPin); same(o.input, q.input); same(o.RootReview, q.expectedRootReview);
  for (const k of ['dispatch', 'holderReady', 'windowsLaunch']) { fullPin(o[k]); same(o[k], anchors[k]); }
  assert.equal(o.dispatch.file, p.outputDirectory + '/dispatch.json'); assert.equal(o.holderReady.file, p.outputDirectory + '/holder-ready.json'); assert.equal(o.windowsLaunch.file, p.outputDirectory + '/windows-launch.json');
  assert.equal(h.kind, 'actual-runtime121-A-holder-ready'); assert.equal(h.namespace, 'poms-r4ghi'); assert.equal(h.nonce, p.nonce); same(h.input, q.input); same(h.review, q.expectedRootReview);
  same(h.source, p.executionSources.find(x => x.file === HOLDER)); fullPin(h.node); assert.equal(h.node.file, C.nodeLinux); assert.equal(h.node.rawBytesSha256, C.nodeLinuxSHA); assert.equal(h.cwd, C.root);
  assert(Number.isSafeInteger(h.pid) && h.pid > 0); assert(typeof h.startTime === 'string' && /^[0-9]+$/.test(h.startTime)); assert(uuid.test(h.bootId));
  const argv = [C.nodeLinux, HOLDER, '--input', q.input.file, '--input-sha', q.input.rawBytesSha256, '--review', q.expectedRootReview.file, '--review-sha', q.expectedRootReview.rawBytesSha256, '--execute']; eq(h.argv, argv, 'Owned holder argv');
  for (const k of ['PGStarted', 'APIStarted', 'contextCreated']) assert.equal(h[k], false);
  assert.equal(w.kind, 'actual-runtime121-A-Windows-holder-launch'); assert(Number.isSafeInteger(w.windowsPid) && w.windowsPid > 0); validTime(w.creationTime); assert.equal(w.nonce, p.nonce);
  assert.equal(w.inputFile, q.input.file); assert.equal(w.inputSha, q.input.rawBytesSha256); assert.equal(w.reviewFile, q.expectedRootReview.file); assert.equal(w.reviewSha, q.expectedRootReview.rawBytesSha256);
  assert.equal(w.APIStarted, false); assert.equal(w.PGStarted, false); assert.equal(w.executable, C.wsl); eq(w.argv, ['-d', 'Debian', '--cd', C.root, '--exec', C.nodeLinux, HOLDER, ...argv.slice(2)], 'Windows launch tuple');
  const r = o.rawProc; keys(r, ['bootBeforeText', 'statText', 'exe', 'cwd', 'cmdlineBase64', 'bootAfterText']);
  for (const k of Object.keys(r)) assert(typeof r[k] === 'string', 'Actual raw proc strings required');
  assert(/^[a-f0-9-]{36}\n$/.test(r.bootBeforeText) && /^[a-f0-9-]{36}\n$/.test(r.bootAfterText), 'Raw kernel boot output');
  assert(uuid.test(anchors.beforeBootId) && uuid.test(anchors.afterBootId)); assert.equal(anchors.beforeBootId, anchors.afterBootId, 'Captured before/after boot mismatch');
  for (const boot of [h.bootId, r.bootBeforeText.trim(), r.bootAfterText.trim()]) assert.equal(boot, anchors.beforeBootId, 'Before/after/ready/live boot mismatch');
  const left = r.statText.indexOf(' ('), right = r.statText.lastIndexOf(') '); assert(left > 0 && right > left); const fields = r.statText.slice(right + 2).trim().split(/\s+/); assert(fields.length >= 20); assert.equal(Number(r.statText.slice(0, left)), h.pid); assert.equal(fields[19], h.startTime);
  assert.equal(r.exe, C.nodeLinux); assert.equal(r.cwd, C.root); const cmdline = Buffer.from(r.cmdlineBase64, 'base64'); assert.equal(cmdline.toString('base64'), r.cmdlineBase64); assert.equal(cmdline.at(-1), 0); const cmdText = new TextDecoder('utf-8', { fatal: true }).decode(cmdline); eq(cmdText.split('\0').slice(0, -1), argv, 'Real proc argv');
  assert.equal(o.readonly, true); for (const k of ['PGControl', 'APIStart', 'NativeContext', 'SQLHTTP']) assert.equal(o[k], false); return h;
}
async function readOwnedHolder358(args) {
  // This entry never calls directory/writeWx/loadCLI, never starts a child and
  // never requires a future command receipt or lifetime-owner bundle.
  const inv = loadEnvelope358(args, 'linux'), { meta } = inv, q = meta.request, p = meta.input;
  same(actualPin(q.expectedRootReview.file), q.expectedRootReview); eq(json(q.expectedRootReview), inv.rootBody, 'Existing reviewed Root12');
  const dispatchPin = actualPin(p.outputDirectory + '/dispatch.json'), dispatch = json(dispatchPin); validateDispatch358(meta, dispatch); checkPins358(inv);
  const f = await facts358(inv), holderReady = actualPin(p.outputDirectory + '/holder-ready.json'), windowsLaunch = actualPin(p.outputDirectory + '/windows-launch.json');
  const holder = f.holderFacts({ holder: holderReady }), windows = json(windowsLaunch);
  const proc = '/proc/' + holder.pid, rawProc = { bootBeforeText: fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8'), statText: fs.readFileSync(proc + '/stat', 'utf8'), exe: fs.realpathSync(proc + '/exe'), cwd: fs.realpathSync(proc + '/cwd'), cmdlineBase64: fs.readFileSync(proc + '/cmdline').toString('base64'), bootAfterText: fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8') };
  const observation = { kind: 'actual-runtime121-A-holder-transport358-owned-holder-readback', recordedAt: new Date().toISOString(), mode: 'holder-start', nonce: p.nonce, ...provenance358(inv), request: meta.requestPin, independentReview: meta.peerPin, input: q.input, RootReview: q.expectedRootReview, dispatch: dispatchPin, holderReady, windowsLaunch, holder, windows, rawProc, readonly: true, PGControl: false, APIStart: false, NativeContext: false, SQLHTTP: false };
  validateOwnedObservation358(meta, observation, { dispatch: dispatchPin, holderReady, windowsLaunch, beforeBootId: dispatch.capturedBootId, afterBootId: rawProc.bootAfterText.trim() });
  checkPins358(inv); raw(q.expectedRootReview); raw(dispatchPin); raw(holderReady); raw(windowsLaunch); f.verifySources(p); f.verifyStates(p); eq(f.holderFacts({ holder: holderReady }), holder, 'Same live holder at final readback'); checkPins358(inv);
  console.log(JSON.stringify(observation));
}
function boot358(inv, review, phase) {
  const p = inv.meta.input, argv = ['-d', 'Debian', '--cd', C.root, '--exec', '/usr/bin/cat', '/proc/sys/kernel/random/boot_id'];
  const result = spawnSync(C.wsl, argv, { cwd: C.winRoot, env: cleanEnv358(), windowsHide: true, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const stdout = writeWx358(p.outputDirectory, 'boot-' + phase + '.stdout.log', Buffer.from(result.stdout ?? '')), stderr = writeWx358(p.outputDirectory, 'boot-' + phase + '.stderr.log', Buffer.from(result.stderr ?? ''));
  const text = Buffer.from(result.stdout ?? '').toString('utf8'), bootId = /^[a-f0-9-]{36}\r?\n$/.test(text) && uuid.test(text.trim()) ? text.trim() : null;
  const body = { kind: 'actual-runtime121-A-holder-transport358-boot-observation', phase, nonce: p.nonce, input: inv.meta.request.input, RootReview: review, G1Policy: C.G1Policy, G1Append: inv.t.G1Append, bootPolicy: C.bootPolicy, bootId, executable: C.wsl, argv, exitCode: result.status ?? null, signal: result.signal ?? null, processError: result.error ? error358(result.error) : null, stdout, stderr };
  return { pin: writeWx358(p.outputDirectory, 'boot-' + phase + '.json', body), body };
}
export function validBoot358(body) { dataOnly(body); assert(body.exitCode === 0 && body.signal === null && body.processError === null && typeof body.bootId === 'string' && uuid.test(body.bootId), 'Known actual boot observation required'); return body.bootId; }
function identity358(inv) {
  const p = inv.meta.input, invocation = readonlyInvocation358(inv.meta.requestPin, inv.meta.peerPin), stdout = p.outputDirectory + '/holder-identity.stdout.log', stderr = p.outputDirectory + '/holder-identity.stderr.log';
  let out = null, err = null, result; const began = new Date().toISOString();
  try {
    out = fs.openSync(local(stdout), 'wx', 0o600); err = fs.openSync(local(stderr), 'wx', 0o600); checkPins358(inv);
    try { result = spawnSync(invocation.executable, invocation.argv, { cwd: C.winRoot, env: cleanEnv358(), windowsHide: true, stdio: ['ignore', out, err] }); } catch (e) { result = { status: null, signal: null, error: e }; }
  } finally { if (out !== null) fs.closeSync(out); if (err !== null) fs.closeSync(err); }
  const receipt = writeWx358(p.outputDirectory, 'holder-identity-command.json', { kind: 'actual-runtime121-A-holder-transport358-readonly-child-command', ...provenance358(inv), request: inv.meta.requestPin, independentReview: inv.meta.peerPin, executable: invocation.executable, argv: invocation.argv, began, ended: new Date().toISOString(), exitCode: result.status ?? null, signal: result.signal ?? null, processError: result.error ? error358(result.error) : null, stdout: actualPin(stdout), stderr: actualPin(stderr), noHolderOrPGOrAPIControl: true, blindRetryForbidden: true });
  return { receipt, result, stdout, stderr, pin: null, body: null };
}
async function dispatchHolder358(args) {
  const inv = loadEnvelope358(args, 'win32'), { meta } = inv, q = meta.request, p = meta.input, t = inv.t, f = await facts358(inv);
  checkPins358(inv); assertAbsentPath358(q.expectedRootReview.file); assertAbsentPath358(p.outputDirectory); f.directory121(p.outputDirectory, { exclusive: true });
  let review = null, before = null, after = null, childReceipt = null, identity = null, receipt = null, spawnAttempted = false, phase = 'owned-output-created';
  try {
    checkPins358(inv); review = f.writeWx(q.input.file.slice(0, q.input.file.lastIndexOf('/')), 'Root-review.json', inv.rootBody); same(review, q.expectedRootReview);
    checkPins358(inv); before = boot358(inv, review, 'before'); validBoot358(before.body); phase = 'before-boot-captured'; checkPins358(inv); f.verifySources(p); f.verifyStates(p); checkPins358(inv);
    const invocation = childInvocation358(q.input, review, t.executablePin), entry = p.executionSources.find(x => x.file === PS), stdout = p.outputDirectory + '/stdout-original.log', stderr = p.outputDirectory + '/stderr-original.log', began = new Date().toISOString(), start = performance.now();
    let out = null, err = null, dispatch = null, result;
    try {
      out = fs.openSync(local(stdout), 'wx', 0o600); err = fs.openSync(local(stderr), 'wx', 0o600);
      dispatch = writeWx358(p.outputDirectory, 'dispatch.json', { kind: 'actual-runtime121-A-single-dispatch', transportKind: 'actual-runtime121-A-holder-transport358-dispatch', began, mode: p.mode, pid: process.pid, input: q.input, RootReview: review, independentReview: meta.peerPin, request: meta.requestPin, entry, executable: invocation.executable, argv: invocation.argv, originalStdout: stdout, originalStderr: stderr, ...provenance358(inv), bootBefore: before.pin, capturedBootId: before.body.bootId, APIStart: false, businessDML: false });
      checkPins358(inv); raw(entry); spawnAttempted = true; phase = 'child-attempted';
      try { result = spawnSync(invocation.executable, invocation.argv, { cwd: C.winRoot, env: cleanEnv358(), windowsHide: true, stdio: ['ignore', out, err] }); } catch (e) { result = { status: null, signal: null, error: e }; }
    } finally { if (out !== null) fs.closeSync(out); if (err !== null) fs.closeSync(err); }
    childReceipt = writeWx358(p.outputDirectory, 'child-command-receipt.json', { kind: 'actual-runtime121-A-holder-transport358-child-command', dispatch, mode: p.mode, began, ended: new Date().toISOString(), elapsedSeconds: (performance.now() - start) / 1000, exitCode: result.status ?? null, signal: result.signal ?? null, processError: result.error ? error358(result.error) : null, stdout: actualPin(stdout), stderr: actualPin(stderr), blindRetryForbidden: true }); phase = 'child-command-preserved';
    assert(result.status === 0 && result.signal === null && !result.error, 'Unknown/failed child outcome; no retry or stop'); checkPins358(inv);
    after = boot358(inv, review, 'after'); assert.equal(validBoot358(after.body), validBoot358(before.body), 'Captured before/after boot mismatch'); checkPins358(inv); phase = 'after-boot-verified';
    identity = identity358(inv); phase = 'readonly-child-preserved';
    assert(identity.result.status === 0 && identity.result.signal === null && !identity.result.error, 'Unknown/failed readonly observation; preserve all originals'); assert.equal(fs.readFileSync(local(identity.stderr)).length, 0, 'Readonly stderr must be empty');
    identity.body = JSON.parse(fs.readFileSync(local(identity.stdout), 'utf8')); identity.pin = writeWx358(p.outputDirectory, 'holder-identity.json', identity.body);
    const holderReady = actualPin(p.outputDirectory + '/holder-ready.json'), windowsLaunch = actualPin(p.outputDirectory + '/windows-launch.json');
    validateDispatch358(meta, json(dispatch)); eq(json(holderReady), identity.body.holder, 'Raw ready body'); eq(json(windowsLaunch), identity.body.windows, 'Raw Windows launch body');
    validateOwnedObservation358(meta, identity.body, { dispatch, holderReady, windowsLaunch, beforeBootId: before.body.bootId, afterBootId: after.body.bootId }); phase = 'owned-identity-verified';
    for (const pin of [review, dispatch, childReceipt, before.pin, after.pin, identity.receipt, identity.pin, holderReady, windowsLaunch]) raw(pin);
    checkPins358(inv); f.verifySources(p); f.verifyStates(p); checkPins358(inv); phase = 'final-guards-verified';
    receipt = writeWx358(p.outputDirectory, 'command-receipt.json', { kind: 'actual-runtime121-A-command', dispatch, mode: p.mode, began, ended: new Date().toISOString(), elapsedSeconds: (performance.now() - start) / 1000, exitCode: 0, signal: null, processError: null, stdout: actualPin(stdout), stderr: actualPin(stderr), bootBefore: before.pin, bootAfter: after.pin, ownedHolderObservation: identity.pin, ownedHolderCommand: identity.receipt, holderReady, windowsLaunch, ...provenance358(inv), blindRetryForbidden: true });
    console.log(JSON.stringify({ receipt, exitCode: 0, APIStart: false, businessDML: false }));
  } catch (e) {
    try { writeWx358(p.outputDirectory, 'partial.json', { kind: 'runtime121-A-holder-transport358-preserve', phase, request: meta.requestPin, input: q.input, independentReview: meta.peerPin, RootReview: review, ...provenance358(inv), bootBefore: before?.pin ?? null, bootAfter: after?.pin ?? null, childCommandReceipt: childReceipt, ownedHolderObservation: identity?.pin ?? null, ownedHolderCommand: identity?.receipt ?? null, commandReceipt: receipt, spawnAttempted, error: error358(e), processMayExist: spawnAttempted, automaticStop: false, automaticRollback: false, blindRetryForbidden: true }); } catch {}
    throw e;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), run = args[0] === '--read-owned-holder' ? readOwnedHolder358(args.slice(1)) : dispatchHolder358(args);
  run.catch(() => { console.error('Holder transport rejected/failed; preserve nonce and originals; no retry, rollback or stop.'); process.exitCode = 1; });
}
