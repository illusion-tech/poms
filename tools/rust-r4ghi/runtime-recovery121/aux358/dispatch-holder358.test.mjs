// Synthetic metadata validators and explicitly labelled own-temp-FS source
// projections only. No Root/private/WSL/PowerShell/PG/API/namespace is accessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { CONTRACT358 as C, localPath358, trustedExecutable358, parseCLI358, assertHolderMode358, reviewBody358, childInvocation358, readonlyInvocation358, validateEnvelope358, validateDispatch358, validateOwnedObservation358, validBoot358 } from './dispatch-holder358.mjs';

const clone = structuredClone, H = 'a'.repeat(64), HASH = b => createHash('sha256').update(b).digest('hex');
const PIN = (file, bytes = 10, rawBytesSha256 = H) => ({ file, bytes, rawBytesSha256 });
const ROOT = C.root + '/tools/rust-r4ghi/runtime-recovery121/', OP = ROOT + 'aux358/dispatch-holder358.mjs', PS = ROOT + 'root/start-holder121.ps1', HOLDER = ROOT + 'root/hold-runtime121.mjs';
const BOOT = '123e4567-e89b-42d3-a456-426614174000', BOOT2 = 'c53aacb8-76d3-442a-9e53-c870827aa570';
const PACKAGE = n => 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v' + n + '_' + n.replaceAll('-', '.') + '_x64__3k8sg7r9htsxt/dependencies/native/powershell/pwsh.exe';
const SOURCES = [
  ['hold-runtime121.mjs', 2131, 'b607a5dd56190b16c86d4deb03ff4ad7f9f68b8942374a15e0c8a7684ebcf8d8'],
  ['start-holder121.ps1', 3896, '9e1b5db26c5422133a019871188bb0e9bf0f267b455ba6d44306c6808cd51753'],
  ['resume-original-pg121.mjs', 4623, '1da250ed2553b767d123f2d4669af4f283c4a046267eb3c0e81b408036309d51'],
  ['observe-conservation121.mjs', 14419, 'adcbfd9d07ef5d98a5675cd3b15adc54771c787bba6ef585e20973e9ad30c7ca'],
  ['prepare121.mjs', 3507, '50623e25bb4c294529ee92ef721caaf958bfc5660acba825f873a83ff53d8eaf'],
  ['dispatch121.mjs', 4285, 'd59f9ed7095e66fca1ae9ea0b08c79e8d050fbaad7912c934451e3be46430ed5'],
  ['facts121.mjs', 13288, '6f81a1cd71f2ced84e0cb5190e18fd5ef86d2f1a4dfad0dee42110c832748382'],
].map(([name, bytes, hash]) => PIN(ROOT + 'root/' + name, bytes, hash));
function fixture() {
  const nonce = 'f53aacb8-76d3-442a-9e53-c870827aa57e', parent = C.private + '/runtime121-A-inputs/holder-start/' + nonce;
  const input = { kind: 'Root-runtime121-A-operation-input', schemaVersion: 1, mode: 'holder-start', namespace: 'poms-r4ghi', nonce, G1: clone(C.oldG1), codeReview: clone(C.oldReview), executionSources: clone(SOURCES), expectedStates: Object.fromEntries(Object.entries(C.stateSHAs).map(([k, h]) => [k, PIN(C.private + '/synthetic/' + k + '.json', 10, h)])), runtimeLossObservation: clone(C.oldLoss), failedRetention: clone(C.retention), holder: null, pgStart: null, baseline: null, outputDirectory: C.private + '/runtime121-A/holder-start/' + nonce };
  const inputPin = PIN(parent + '/input.json', 4249), body = reviewBody358(input, inputPin), bodyBytes = Buffer.from(JSON.stringify(body, null, 2) + '\n');
  const expectedRootReview = PIN(parent + '/Root-review.json', bodyBytes.length, HASH(bodyBytes));
  const requestPin = PIN(parent + '/request-exact-G2.json', 5432), peerPin = PIN(C.root + '/independent/synthetic-exact-G2.json'), operatorPin = PIN(OP, 12345), codeReviewPin = PIN(C.root + '/independent/synthetic-code-review.json');
  const request = { kind: 'Root-runtime121-A-exact-G2-request', recordedAt: '2026-11-12T00:00:00.000Z', mode: 'holder-start', input: inputPin, expectedRootReview, expectedRootReviewBody: body, actualG2: false, RootReviewSigned: false, effectsExecuted: false };
  const t = { G1Append: PIN(C.root + '/synthetic/current-round.json'), newLossObservation: PIN(C.private + '/synthetic/current-loss.json'), bootPolicy: C.bootPolicy, actualOperator: clone(operatorPin), codeReview: clone(codeReviewPin), executablePin: PIN(PACKAGE('1-2-3-4'), C.trustedPowerShell.bytes, C.trustedPowerShell.rawBytesSha256) };
  const round = { kind: 'Root-frozen-runtime121-A-current-recovery-round', recordedAt: '2026-11-12T00:00:00.000Z', G1Policy: clone(C.G1Policy), roundId: 'synthetic-round01', currentLossObservation: clone(t.newLossObservation), hostObservation: PIN(C.private + '/synthetic/host-observation.json'), executablePin: clone(t.executablePin), powerShellVersion: C.trustedPowerShell.version, actualOperator: clone(operatorPin), codeReview: clone(codeReviewPin), holderRequest: clone(requestPin), bootPolicy: C.bootPolicy, limits: clone(C.limits), actualG2Authorized: false };
  return { request, requestPin, peerPin, input, operatorPin, peer: { kind: 'non-author-runtime121-A-exact-G2', mode: 'holder-start', verdict: 'approved-once-holder-start-with-capture-bound-transport358', reviewerIsAuthor: false, approvedInput: clone(inputPin), expectedRootReview: clone(expectedRootReview), transport358: t }, round,
    auxReview: { kind: 'non-author-runtime121-A-holder-transport358-code-review', verdict: 'code-ready-for-exact-holder-transport358-input-review', author: 'I', reviewer: 'non-author', reviewerIsAuthor: false, G1Policy: clone(C.G1Policy), operator: clone(operatorPin), executionSources: [clone(operatorPin)] },
    originalReview: { kind: 'non-author-runtime121-A-code-review', verdict: 'code-ready-for-exact-runtime121-A-input-review', reviewerIsAuthor: false, executionSources: clone(SOURCES) },
    // Explicit partial synthetic policy body for pure validation; never hashed
    // or relabelled as the actual frozen policy's bytes.
    policy: { kind: 'Root-frozen-stable-holder-transport358-G1-policy', codeImplementationGranted: true, actualG2Authorized: false, anyModeExecuted: false, limits: clone(C.limits), immutableHostRules: { trustedPowerShell: clone(C.trustedPowerShell) }, originalABI: { originalA7ExecutionSources: clone(SOURCES) } },
  };
}
function evidence(meta = fixture()) {
  const q = meta.request, p = meta.input, t = meta.peer.transport358, out = p.outputDirectory;
  const anchors = { dispatch: PIN(out + '/dispatch.json'), holderReady: PIN(out + '/holder-ready.json'), windowsLaunch: PIN(out + '/windows-launch.json'), beforeBootId: BOOT, afterBootId: BOOT };
  const argv = [C.nodeLinux, HOLDER, '--input', q.input.file, '--input-sha', q.input.rawBytesSha256, '--review', q.expectedRootReview.file, '--review-sha', q.expectedRootReview.rawBytesSha256, '--execute'];
  const holder = { kind: 'actual-runtime121-A-holder-ready', namespace: 'poms-r4ghi', nonce: p.nonce, pid: 1234, startTime: '987654321', bootId: BOOT, node: PIN(C.nodeLinux, 1000, C.nodeLinuxSHA), source: clone(SOURCES[0]), cwd: C.root, argv, input: clone(q.input), review: clone(q.expectedRootReview), intent: PIN(out + '/intent.json'), startedAt: '2026-11-12T00:00:01.000Z', PGStarted: false, APIStarted: false, contextCreated: false };
  const windows = { kind: 'actual-runtime121-A-Windows-holder-launch', windowsPid: 4321, creationTime: '2026-11-12T00:00:00.000Z', executable: C.wsl, argv: ['-d', 'Debian', '--cd', C.root, '--exec', C.nodeLinux, HOLDER, ...argv.slice(2)], nonce: p.nonce, inputFile: q.input.file, inputSha: q.input.rawBytesSha256, reviewFile: q.expectedRootReview.file, reviewSha: q.expectedRootReview.rawBytesSha256, APIStarted: false, PGStarted: false };
  const provenance = { G1Policy: clone(C.G1Policy), G1Append: clone(t.G1Append), actualOperator: clone(t.actualOperator), codeReview: clone(t.codeReview), newLossObservation: clone(t.newLossObservation), executablePin: clone(t.executablePin), bootPolicy: C.bootPolicy };
  const observation = { kind: 'actual-runtime121-A-holder-transport358-owned-holder-readback', recordedAt: '2026-11-12T00:00:02.000Z', mode: 'holder-start', nonce: p.nonce, ...clone(provenance), request: clone(meta.requestPin), independentReview: clone(meta.peerPin), input: clone(q.input), RootReview: clone(q.expectedRootReview), dispatch: clone(anchors.dispatch), holderReady: clone(anchors.holderReady), windowsLaunch: clone(anchors.windowsLaunch), holder, windows,
    rawProc: { bootBeforeText: BOOT + '\n', statText: '1234 (synthetic (holder) with spaces) ' + ['S', ...Array(18).fill('0'), holder.startTime].join(' ') + '\n', exe: C.nodeLinux, cwd: C.root, cmdlineBase64: Buffer.from(argv.join('\0') + '\0').toString('base64'), bootAfterText: BOOT + '\n' }, readonly: true, PGControl: false, APIStart: false, NativeContext: false, SQLHTTP: false };
  const invocation = childInvocation358(q.input, q.expectedRootReview, t.executablePin), dispatch = { kind: 'actual-runtime121-A-single-dispatch', transportKind: 'actual-runtime121-A-holder-transport358-dispatch', mode: 'holder-start', input: clone(q.input), RootReview: clone(q.expectedRootReview), independentReview: clone(meta.peerPin), request: clone(meta.requestPin), entry: clone(SOURCES[1]), executable: invocation.executable, argv: invocation.argv, originalStdout: out + '/stdout-original.log', originalStderr: out + '/stderr-original.log', ...clone(provenance), capturedBootId: BOOT, APIStart: false, businessDML: false };
  return { meta, anchors, observation, dispatch };
}
const SOURCE = fs.readFileSync(new URL('./dispatch-holder358.mjs', import.meta.url), 'utf8');
function ownTemp(run) {
  const base = process.env.POMS_AUX358_TEST_TMP || os.tmpdir(), folder = fs.mkdtempSync(path.join(base, 'poms-aux358-owned-'));
  try { return run(folder); } finally { const resolved = path.resolve(folder), prefix = path.join(path.resolve(base), 'poms-aux358-owned-'); assert(resolved.startsWith(prefix) && resolved !== path.resolve(base)); fs.rmSync(resolved, { recursive: true, force: true }); }
}
test('pure import and exact-source evaluation model perform no filesystem/process/application work', () => {
  assert(Object.isFrozen(C)); assert(Object.isFrozen(C.limits)); assert.equal(typeof validateEnvelope358, 'function');
  let effects = 0; const reject = () => { effects++; throw Error('unexpected module-evaluation effect'); };
  const projected = SOURCE.replace(/^import .*;\n/gm, '').replace(/^export /gm, '').replaceAll('import.meta.url', "'file:///synthetic-module.mjs'");
  vm.runInNewContext(projected, { process: { argv: ['synthetic-test-runner'] }, fs: new Proxy({}, { get: reject }), spawnSync: reject, createHash: reject, path, assert, URL, Buffer }); assert.equal(effects, 0);
});
test('original15/root12/support6 remain unchanged; no ordinary holder context is required', () => {
  const f = fixture(); assert.equal(Object.keys(f.input).length, 15); assert.equal(Object.keys(f.request.expectedRootReviewBody).length, 12); assert.equal(Object.keys(f.peer.transport358).length, 6); assert.deepEqual(validateEnvelope358(f), f.request.expectedRootReviewBody);
});
test('Windows and Linux path mapping use their own physical paths', () => {
  const linux = C.private + '/unit.json', root = C.root + '/unit.json'; assert.equal(localPath358(linux, 'linux'), linux); assert.equal(localPath358(root, 'linux'), root);
  assert.equal(localPath358(linux, 'win32'), '//wsl.localhost/Debian' + linux); assert.equal(localPath358(root, 'win32'), 'E:/' + root.slice(7));
});
test('closed CLI rejects extra modes, arbitrary subentries and omitted execution marker', () => {
  const args = ['--request', '/synthetic/request.json', '--request-sha', H, '--independent-review', '/synthetic/peer.json', '--independent-review-sha', H, '--execute']; assert.equal(parseCLI358(args).request.file, args[1]);
  for (const bad of [args.slice(0, 8), [...args, '--probe'], args.map((v, i) => i === 8 ? '--inspect' : v), ['--read-owned-holder', ...args], args.map((v, i) => i === 0 ? '--callback' : v)]) assert.throws(() => parseCLI358(bad));
});
for (const mode of ['pg-start', 'pg-observe', 'unknown']) test('holder-mode rejection precedes any peer access: ' + mode, () => {
  const f = fixture(); f.request.mode = mode; f.peer = new Proxy({}, { get() { throw Error('peer was touched'); } }); assert.throws(() => validateEnvelope358(f), /only holder-start/); assert.throws(() => assertHolderMode358(f.request), /only holder-start/);
});
test('same trusted bytes at two synthetic approved package paths require independent round binding', () => {
  const f = fixture(), originalReview = clone(f.auxReview); validateEnvelope358(f);
  f.peer.transport358.executablePin.file = PACKAGE('8-7-6-5'); assert.throws(() => validateEnvelope358(f), /Round-bound executable/);
  f.round.executablePin = clone(f.peer.transport358.executablePin); f.round.roundId = 'synthetic-round02'; f.round.hostObservation = PIN(C.private + '/synthetic/host02.json'); validateEnvelope358(f); assert.deepEqual(f.auxReview, originalReview);
  assert.equal(childInvocation358(f.request.input, f.request.expectedRootReview, f.peer.transport358.executablePin).executable, PACKAGE('8-7-6-5'));
});
test('invocations use the approved concrete executable and one fixed readonly self/Node/WSL chain', () => {
  const f = fixture(), child = childInvocation358(f.request.input, f.request.expectedRootReview, f.peer.transport358.executablePin), ro = readonlyInvocation358(f.requestPin, f.peerPin);
  assert.equal(child.argv.length, 14); assert.equal(child.entry, PS); assert.deepEqual(child.argv.slice(0, 4), ['-NoLogo', '-NoProfile', '-NonInteractive', '-File']); assert.equal(child.argv.at(-1), '-Execute');
  assert.equal(ro.executable, C.wsl); assert.deepEqual(ro.argv.slice(0, 8), ['-d', 'Debian', '--cd', C.root, '--exec', C.nodeLinux, OP, '--read-owned-holder']); assert.deepEqual(parseCLI358(ro.argv.slice(8)), { request: { file: f.requestPin.file, rawBytesSha256: H }, peer: { file: f.peerPin.file, rawBytesSha256: H } });
});
const envelopeMutations = [
  ['extra input key', f => { f.input.extra = true; }], ['missing input key', f => { delete f.input.baseline; }], ['holder slot', f => { f.input.holder = PIN('/synthetic/forbidden'); }], ['PG slot', f => { f.input.pgStart = PIN('/synthetic/forbidden'); }], ['baseline slot', f => { f.input.baseline = PIN('/synthetic/forbidden'); }],
  ['source eighth', f => { f.input.executionSources.push(PIN('/synthetic/foreign')); }], ['source changed', f => { f.input.executionSources[0].rawBytesSha256 = 'b'.repeat(64); }], ['old G1 replacement', f => { f.input.G1 = clone(C.G1Policy); }], ['old loss replacement', f => { f.input.runtimeLossObservation = clone(f.peer.transport358.newLossObservation); }],
  ['wrong policy', f => { f.round.G1Policy.rawBytesSha256 = 'b'.repeat(64); }], ['proposal instead of frozen policy', f => { f.policy.kind = 'Root-proposed-stable-holder-transport358-G1-policy'; }], ['policy code grant missing', f => { f.policy.codeImplementationGranted = false; }],
  ['wrong peer kind', f => { f.peer.kind = 'Root-approval'; }], ['wrong verdict', f => { f.peer.verdict = 'approved-anything'; }], ['peer author flag', f => { f.peer.reviewerIsAuthor = true; }], ['wrong peer input', f => { f.peer.approvedInput.rawBytesSha256 = 'b'.repeat(64); }],
  ['support seventh key', f => { f.peer.transport358.extra = true; }], ['support missing loss', f => { delete f.peer.transport358.newLossObservation; }], ['arbitrary supplied boot authority', f => { f.peer.transport358.expectedBootId = BOOT; }], ['boot policy changed', f => { f.peer.transport358.bootPolicy = 'trust-supplied-boot'; }],
  ['wrong round request', f => { f.round.holderRequest.rawBytesSha256 = 'b'.repeat(64); }], ['wrong round operator', f => { f.round.actualOperator.file = ROOT + 'aux357/dispatch-holder357.mjs'; }], ['wrong round review', f => { f.round.codeReview.rawBytesSha256 = 'b'.repeat(64); }], ['wrong round loss', f => { f.round.currentLossObservation.file = C.private + '/other-loss.json'; }],
  ['round pre-frozen boot', f => { f.round.expectedBootId = BOOT; }], ['round effect grant', f => { f.round.actualG2Authorized = true; }], ['round PG limits', f => { f.round.limits.PGControl = true; }], ['round version', f => { f.round.powerShellVersion = '0.0.0'; }], ['host pin not full', f => { delete f.round.hostObservation.bytes; }],
  ['wrong auxiliary kind', f => { f.auxReview.kind = f.originalReview.kind; }], ['aux author reviewer same', f => { f.auxReview.reviewer = f.auxReview.author; }], ['aux source count7', f => { f.auxReview.executionSources = clone(SOURCES); }], ['aux source partial pin', f => { delete f.auxReview.executionSources[0].bytes; }], ['aux review policy', f => { f.auxReview.G1Policy.rawBytesSha256 = 'b'.repeat(64); }], ['aux review coupled to round', f => { f.auxReview.G1Append = clone(f.peer.transport358.G1Append); }],
  ['wrong executable SHA', f => { f.peer.transport358.executablePin.rawBytesSha256 = 'b'.repeat(64); }], ['wrong executable length', f => { f.peer.transport358.executablePin.bytes++; }], ['wrong executable path', f => { f.peer.transport358.executablePin.file = 'C:/Other/pwsh.exe'; }], ['aliased executable path', f => { f.peer.transport358.executablePin.file = f.peer.transport358.executablePin.file.replace('/dependencies/', '/temporary/../dependencies/'); }],
  ['wrong namespace', f => { f.input.namespace = 'production'; }], ['state hash drift', f => { f.input.expectedStates.state15.rawBytesSha256 = 'b'.repeat(64); }], ['Root12 changed', f => { f.request.expectedRootReviewBody.APIStart = true; }], ['Root expected pin mismatch', f => { f.peer.expectedRootReview.rawBytesSha256 = 'b'.repeat(64); }], ['already signed request', f => { f.request.RootReviewSigned = true; }], ['wrong request nonce path', f => { f.requestPin.file = C.private + '/wrong/request-exact-G2.json'; }],
];
for (const [name, mutate] of envelopeMutations) test('synthetic metadata rejects ' + name, () => { const f = fixture(); mutate(f); assert.throws(() => validateEnvelope358(f)); });
test('no getters/proxies/callbacks/symbols or hidden array channels are evaluated', () => {
  let calls = 0;
  for (const mutate of [f => { f.input.callback = () => { calls++; }; }, f => { f.round[Symbol('hidden')] = true; }, f => { f.auxReview = new Proxy(f.auxReview, {}); }, f => { Object.defineProperty(f.input, 'G1', { enumerable: true, get() { calls++; return C.oldG1; } }); }, f => { Object.defineProperty(f.input.executionSources, '0', { get() { calls++; return null; } }); }, f => { f.input.executionSources[Symbol.iterator] = () => { calls++; return [][Symbol.iterator](); }; }, f => { Object.setPrototypeOf(f.input.executionSources, { [Symbol.iterator]() { calls++; return [][Symbol.iterator](); } }); }]) { const f = fixture(); mutate(f); assert.throws(() => validateEnvelope358(f)); }
  assert.equal(calls, 0);
});
test('valid raw owned-holder observation validates real-identity fields and the complete owned chain', () => { const e = evidence(); validateEnvelope358(e.meta); validateDispatch358(e.meta, e.dispatch); assert.deepEqual(validateOwnedObservation358(e.meta, e.observation, e.anchors), e.observation.holder); });
const observationMutations = [
  ['before-after mismatch', e => { e.anchors.afterBootId = BOOT2; }], ['ready boot mismatch', e => { e.observation.holder.bootId = BOOT2; }], ['live boot mismatch', e => { e.observation.rawProc.bootAfterText = BOOT2 + '\n'; }], ['raw boot missing', e => { delete e.observation.rawProc.bootBeforeText; }],
  ['ready nonce', e => { e.observation.holder.nonce = BOOT; }], ['ready input', e => { e.observation.holder.input.rawBytesSha256 = 'b'.repeat(64); }], ['ready review', e => { e.observation.holder.review.rawBytesSha256 = 'b'.repeat(64); }], ['ready source', e => { e.observation.holder.source.rawBytesSha256 = 'b'.repeat(64); }], ['ready node', e => { e.observation.holder.node.rawBytesSha256 = 'b'.repeat(64); }], ['ready cwd', e => { e.observation.holder.cwd = '/other'; }], ['ready argv', e => { e.observation.holder.argv.push('--extra'); }], ['ready claims PG', e => { e.observation.holder.PGStarted = true; }],
  ['raw PID', e => { e.observation.rawProc.statText = e.observation.rawProc.statText.replace('1234 (', '9999 ('); }], ['raw startTime', e => { e.observation.rawProc.statText = e.observation.rawProc.statText.replace('987654321', '987654322'); }], ['raw exe', e => { e.observation.rawProc.exe = '/other/node'; }], ['raw cwd', e => { e.observation.rawProc.cwd = '/other'; }], ['raw argv', e => { e.observation.rawProc.cmdlineBase64 = Buffer.from('other\0').toString('base64'); }], ['invalid raw base64', e => { e.observation.rawProc.cmdlineBase64 += '!!'; }], ['raw argv terminal NUL missing', e => { e.observation.rawProc.cmdlineBase64 = Buffer.from(e.observation.holder.argv.join('\0')).toString('base64'); }],
  ['Windows PID', e => { e.observation.windows.windowsPid = 0; }], ['Windows creation', e => { e.observation.windows.creationTime = 'invalid'; }], ['Windows input', e => { e.observation.windows.inputSha = 'b'.repeat(64); }], ['Windows review', e => { e.observation.windows.reviewSha = 'b'.repeat(64); }], ['Windows argv', e => { e.observation.windows.argv.push('--other'); }], ['Windows exe', e => { e.observation.windows.executable = 'C:/other/wsl.exe'; }],
  ['observation source', e => { e.observation.actualOperator.rawBytesSha256 = 'b'.repeat(64); }], ['observation round', e => { e.observation.G1Append.rawBytesSha256 = 'b'.repeat(64); }], ['observation input', e => { e.observation.input.rawBytesSha256 = 'b'.repeat(64); }], ['observation peer', e => { e.observation.independentReview.rawBytesSha256 = 'b'.repeat(64); }], ['observation pathname', e => { e.observation.holderReady.file = C.private + '/foreign-ready.json'; }], ['observation callback', e => { e.observation.callback = () => {}; }], ['readonly boundary', e => { e.observation.SQLHTTP = true; }],
];
for (const [name, mutate] of observationMutations) test('synthetic owned identity rejects ' + name, () => { const e = evidence(); mutate(e); assert.throws(() => validateOwnedObservation358(e.meta, e.observation, e.anchors)); });
for (const [name, mutate] of [
  ['legacy transport pretence', e => { e.dispatch.transportKind = 'actual-runtime121-A-single-dispatch'; }], ['legacy executable', e => { e.dispatch.executable = 'C:/old/pwsh.exe'; }], ['dispatch argv', e => { e.dispatch.argv.push('--arbitrary'); }], ['dispatch input', e => { e.dispatch.input.rawBytesSha256 = 'b'.repeat(64); }], ['dispatch review', e => { e.dispatch.RootReview.rawBytesSha256 = 'b'.repeat(64); }], ['dispatch request', e => { e.dispatch.request.rawBytesSha256 = 'b'.repeat(64); }], ['dispatch peer', e => { e.dispatch.independentReview.rawBytesSha256 = 'b'.repeat(64); }],
]) test('synthetic existing dispatch rejects ' + name, () => { const e = evidence(); mutate(e); assert.throws(() => validateDispatch358(e.meta, e.dispatch)); });
test('boot acceptance has no pre-frozen UUID; only complete known successful observations can bind', () => {
  for (const bootId of [BOOT, BOOT2]) assert.equal(validBoot358({ exitCode: 0, signal: null, processError: null, bootId }), bootId);
  for (const body of [{ exitCode: 1, signal: null, processError: null, bootId: BOOT }, { exitCode: null, signal: 'SIGTERM', processError: null, bootId: BOOT }, { exitCode: 0, signal: null, processError: { code: 'EIO' }, bootId: BOOT }, { exitCode: 0, signal: null, processError: null, bootId: 'arbitrary' }]) assert.throws(() => validBoot358(body));
});
function controlPredicate(io) { const span = SOURCE.match(/^function assertAbsentControl358\(file\).*$/m)?.[0]; assert(span); return vm.runInNewContext('(' + span + ')', { fs: io, local: file => file, assert }); }
test('own-temp-FS actual control predicate: absent accepts; ordinary/directory/dangling entries reject', () => ownTemp(folder => {
  const guard = controlPredicate(fs), missing = path.join(folder, 'absent.lock'), ordinary = path.join(folder, 'file.lock'), directory = path.join(folder, 'dir.lock'), dangling = path.join(folder, 'dangling.lock');
  assert.doesNotThrow(() => guard(missing)); fs.writeFileSync(ordinary, 'owned synthetic control', { flag: 'wx' }); fs.mkdirSync(directory); fs.symlinkSync(path.join(folder, 'missing-target'), dangling, process.platform === 'win32' ? 'junction' : 'file');
  assert.equal(fs.existsSync(dangling), false); assert(fs.lstatSync(dangling).isSymbolicLink()); for (const file of [ordinary, directory, dangling]) assert.throws(() => guard(file), /Existing driver control entry/);
}));
test('actual control predicate error model: only ENOENT accepts; EACCES/ENOTDIR/EIO propagate', () => {
  for (const code of ['ENOENT', 'EACCES', 'ENOTDIR', 'EIO']) { const error = Object.assign(Error('synthetic lstat failure'), { code }), guard = controlPredicate({ lstatSync() { throw error; } }); if (code === 'ENOENT') assert.doesNotThrow(() => guard('/synthetic/missing')); else assert.throws(() => guard('/synthetic/unknown'), e => e === error); }
});
test('own-temp-FS source raw physical-file layer rejects hardlink aliases and directory-junction aliases', () => ownTemp(folder => {
  const start = SOURCE.indexOf('function raw(p, binary = false) {'), end = SOURCE.indexOf('\nfunction actualPin', start); assert(start > 0 && end > start);
  const projectedRaw = vm.runInNewContext('(' + SOURCE.slice(start, end) + ')', { fs, path, assert, sha: HASH, local: file => file, pinShape() {} });
  const file = path.join(folder, 'original.bin'), alias = path.join(folder, 'hardlink.bin'); fs.writeFileSync(file, 'synthetic executable', { flag: 'wx' }); const pin = file => { const b = fs.readFileSync(file); return PIN(file, b.length, HASH(b)); };
  assert.doesNotThrow(() => projectedRaw(pin(file))); fs.linkSync(file, alias); assert.throws(() => projectedRaw(pin(file)), /Regular nonalias/); assert.doesNotThrow(() => projectedRaw(pin(file), true));
  const target = path.join(folder, 'target'), junction = path.join(folder, 'junction'); fs.mkdirSync(target); fs.writeFileSync(path.join(target, 'source.bin'), 'synthetic bytes', { flag: 'wx' }); fs.symlinkSync(target, junction, process.platform === 'win32' ? 'junction' : 'dir'); assert.throws(() => projectedRaw(pin(path.join(junction, 'source.bin')), true), /Canonical physical/);
}));
test('readonly source entry has no write/start/context or future generic/bundle dependency', () => {
  const start = SOURCE.indexOf('async function readOwnedHolder358(args) {'), end = SOURCE.indexOf('\nfunction boot358', start), body = SOURCE.slice(start, end).replace(/^\s*\/\/.*$/gm, ''); assert(start > 0 && end > start);
  for (const forbidden of ['writeWx358(', '.writeWx(', '.directory121(', '.loadCLI(', 'spawnSync(', 'command-receipt.json', 'lifetimeOwner', 'launchCommand']) assert(!body.includes(forbidden), forbidden);
  assert(body.includes("loadEnvelope358(args, 'linux')")); assert(body.includes('f.holderFacts({ holder: holderReady })')); assert(body.includes("fs.readFileSync(proc + '/stat'")); assert(body.includes("fs.readFileSync(proc + '/cmdline'"));
  const importPos = SOURCE.indexOf("await import('data:"), guardPos = SOURCE.lastIndexOf('checkPins358(inv);', importPos); assert(guardPos > 0 && guardPos < importPos);
});
test('own-temp-FS actual source-tail ordering model: every failed postcondition retains child raw without generic success', () => ownTemp(folder => {
  const start = SOURCE.indexOf('    childReceipt = writeWx358('), end = SOURCE.indexOf('\n  } catch (e) {', start), span = SOURCE.slice(start, end); assert(start > 0 && end > start);
  const faults = [null, 'child-status', 'child-signal', 'child-error', 'boot', 'identity-status', 'identity-stderr', 'identity-json', 'ready', 'windows', 'identity', 'critical', 'sources', 'states', 'final-lock'];
  for (const fault of faults) {
    const dir = path.join(folder, fault || 'success'); fs.mkdirSync(dir); const e = evidence(), pin = file => { const b = fs.readFileSync(file); return PIN(file, b.length, HASH(b)); };
    const write = (dir, name, value) => { const file = path.join(dir, name); fs.writeFileSync(file, Buffer.isBuffer(value) ? value : JSON.stringify(value) + '\n', { flag: 'wx' }); return pin(file); };
    const seed = (name, body = {}) => write(dir, name, body), stdout = path.join(dir, 'stdout-original.log'), stderr = path.join(dir, 'stderr-original.log'); fs.writeFileSync(stdout, 'explicit synthetic child ACK', { flag: 'wx' }); fs.writeFileSync(stderr, '', { flag: 'wx' });
    seed('holder-ready.json', e.observation.holder); seed('windows-launch.json', e.observation.windows); const review = seed('Root-review.json'), dispatch = seed('dispatch.json');
    let checks = 0; const fail = name => { if (fault === name) throw Error('explicit synthetic ' + name + ' failure'); };
    const ctx = { inv: {}, meta: e.meta, q: e.meta.request, p: { mode: 'holder-start', outputDirectory: dir }, f: { verifySources() { fail('sources'); }, verifyStates() { fail('states'); } }, review, dispatch, stdout, stderr, result: { status: fault === 'child-status' ? 1 : 0, signal: fault === 'child-signal' ? 'SIGTERM' : null, error: fault === 'child-error' ? Error('synthetic spawn failure') : null }, before: { pin: seed('boot-before.json'), body: { bootId: BOOT } }, after: null, identity: null, childReceipt: null, receipt: null, phase: 'child-attempted', began: '2026-11-12T00:00:00.000Z', start: 0, performance: { now: () => 1 }, assert, JSON, fs, local: file => file, actualPin: pin, error358: () => ({ message: 'synthetic' }), writeWx358: write,
      checkPins358() { checks++; if (checks === 4) fail('final-lock'); }, boot358() { fail('boot'); return { pin: seed('boot-after.json'), body: { bootId: BOOT } }; }, validBoot358: body => body.bootId,
      identity358() { const out = path.join(dir, 'holder-identity.stdout.log'), err = path.join(dir, 'holder-identity.stderr.log'); fs.writeFileSync(out, fault === 'identity-json' ? '{invalid' : JSON.stringify(e.observation), { flag: 'wx' }); fs.writeFileSync(err, fault === 'identity-stderr' ? 'synthetic stderr' : '', { flag: 'wx' }); return { receipt: seed('holder-identity-command.json'), result: { status: fault === 'identity-status' ? 1 : 0, signal: null, error: null }, stdout: out, stderr: err, pin: null, body: null }; },
      json: p => JSON.parse(fs.readFileSync(p.file, 'utf8')), validateDispatch358() {}, eq(a, b, why) { if (why === 'Raw ready body') fail('ready'); if (why === 'Raw Windows launch body') fail('windows'); assert.deepEqual(a, b); }, validateOwnedObservation358() { fail('identity'); }, raw(p) { fail('critical'); assert(fs.existsSync(p.file)); }, provenance358: () => ({}), console: { log() {} },
    };
    if (fault === null) assert.doesNotThrow(() => vm.runInNewContext(span, ctx)); else assert.throws(() => vm.runInNewContext(span, ctx));
    assert(fs.existsSync(path.join(dir, 'child-command-receipt.json')), fault || 'success'); assert.equal(fs.existsSync(path.join(dir, 'command-receipt.json')), fault === null, fault || 'success');
    const raw = JSON.parse(fs.readFileSync(path.join(dir, 'child-command-receipt.json'), 'utf8')); assert.equal(raw.kind, 'actual-runtime121-A-holder-transport358-child-command'); assert.equal(raw.stderr.bytes, 0);
    if (fault === null) assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'command-receipt.json'), 'utf8')).kind, 'actual-runtime121-A-command');
  }
}));
test('original consumer bundle4 and generic kinds remain distinct from truthful transport provenance', () => {
  const e = evidence(), owner = { kind: 'actual-runtime121-lifetime-owner', holderReady: e.anchors.holderReady, windowsLaunch: e.anchors.windowsLaunch, launchCommand: PIN(e.meta.input.outputDirectory + '/command-receipt.json') };
  assert.equal(Object.keys(owner).length, 4); assert.equal(e.dispatch.kind, 'actual-runtime121-A-single-dispatch'); assert.equal(e.dispatch.transportKind, 'actual-runtime121-A-holder-transport358-dispatch');
  assert.equal(C.oldG1.rawBytesSha256, 'c20283d9a4e30d96f23d7f3890882e58a6f22e394fa9c747baa4c3a07968a68b'); assert.equal(C.oldLoss.rawBytesSha256, '80151bd29512f869a4aee63fd5e0d020f3bc3a2c0d136a983d4452d81a1ef698');
});
