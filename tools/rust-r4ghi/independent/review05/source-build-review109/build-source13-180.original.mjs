// Root source inventory/copy and one actual owned-mirror Cargo validation/build.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { FIXED, sourcePins, ownedFile } from './business/context.mjs';
import { helperGraph13 } from './construct-source13-bindings.mjs';
import { sha } from './business/pure.mjs';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', M = '/home/wangzishi/projects/poms-rust-r4ghi', P = '/home/wangzishi/.local/share/poms-r4ghi/private', N = '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node', CARGO = '/home/wangzishi/.cargo/bin/cargo';
assert.equal(process.platform, 'linux'); assert.equal(process.execPath, N); assert.deepEqual(process.execArgv, []); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH); assert.equal(FIXED.migrations, 98);
const argv = process.argv.slice(2); assert(argv.length === 5 && argv[0] === '--plan' && argv[2] === '--approved-plan-sha' && argv[4] === '--execute');
const planRaw = ownedFile(argv[1]); assert.equal(sha(planRaw), argv[3]); const plan = JSON.parse(planRaw);
function read(pin) { const raw = ownedFile(pin.file); assert.equal(sha(raw), pin.rawBytesSha256); return raw; }
const pin = file => { const stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink()); return { file, rawBytesSha256: sha(fs.readFileSync(file)) }; };
assert.equal(plan.kind, 'Root-approved-Source13-actual-build180'); assert.equal(plan.outputDirectory, P + '/source13-build180'); assert(!fs.existsSync(plan.outputDirectory)); assert.equal(plan.G3Certified, false);
const approval = JSON.parse(read(plan.approval)); assert.equal(approval.kind, 'Root-frozen-Source13-corrective-G2-136'); assert.equal(approval.G2Authorized, true); assert.equal(approval.actualM98Applied, false); assert.deepEqual(approval.supportingTools.source13BuildRunner, pin(R + '/tools/rust-r4ghi/build-source13-180.mjs'));
assert(!fs.existsSync(P + '/business/g2-business12/main01/driver.lock')); assert(!fs.existsSync(P + '/business/g2-business13/main01/state.json')); assert(!fs.existsSync(P + '/rust-api136-process.json'));
const oldProcess = JSON.parse(ownedFile(P + '/rust-api1351-process.json')); if (fs.existsSync('/proc/' + oldProcess.pid + '/stat')) { const stat = fs.readFileSync('/proc/' + oldProcess.pid + '/stat', 'utf8'); assert.notEqual(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], oldProcess.startTime); }
for (const port of [31441, 31442]) await new Promise((resolve, reject) => { const socket = net.createConnection({ host: '127.0.0.1', port }); socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Unknown API listener before rebuild')); }); socket.once('connect', () => { socket.destroy(); reject(new Error('No API may be live while rebuilding its binary')); }); socket.once('error', error => error.code === 'ECONNREFUSED' ? resolve() : reject(error)); });
const pins = JSON.parse(read(plan.sourcePins)), helpers = JSON.parse(read(plan.helperH0)); assert.deepEqual(sourcePins(), pins); assert.deepEqual(helperGraph13(), helpers); assert.equal(fs.realpathSync(M), M);
const expected = new Map(pins.map(item => [item.file, item.sha256]));
function scan(relative) { for (const entry of fs.readdirSync(R + '/' + relative, { withFileTypes: true })) { const file = relative + '/' + entry.name; if (entry.isDirectory()) scan(file); else { assert(entry.isFile()); expected.set(file, sha(ownedFile(R + '/' + file))); } } }
for (const relative of ['apps/poms-api-rust/src', 'apps/poms-api-rust/tests', 'apps/poms-api-rust/examples']) scan(relative);
const includesRaw = ownedFile(M + '/.poms-r4ghi-include-inputs.json'); for (const item of JSON.parse(includesRaw)) { assert.equal(sha(ownedFile(R + '/' + item.file)), item.rawBytesSha256); expected.set(item.file, item.rawBytesSha256); }
const files = [...expected].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([file, sha256]) => ({ file, sha256 }));
const out = plan.outputDirectory; fs.mkdirSync(out, { mode: 0o700 });
const artifact = (leaf, value) => { assert.equal(path.basename(leaf), leaf); const file = out + '/' + leaf, raw = Buffer.from(JSON.stringify(value, null, 2) + '\n'); fs.writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); return pin(file); };
const rootInputs = [], copiedInputs = [], previousMirrorInputs = [];
const oldPacket = JSON.parse(read(approval.retainedSource12.sourcePacket)), source12File = R + '/docs/design/rust-r4ghi/retention/final12-source140/sources.json', source12Raw = ownedFile(source12File);
assert.equal(oldPacket.kind, 'actual-raw-candidate-code-retention-packet-created-and-fully-read-back'); assert.equal(sha(source12Raw), oldPacket.files.find(item => item.file === 'sources.json').rawBytesSha256);
const source12 = new Map(JSON.parse(source12Raw).files.map(item => [item.file, item.sha256]));
function mirrorDirectory(relative, create) { let current = M; for (const part of relative.split('/').filter(Boolean)) { assert(part !== '..' && part !== '.'); current += '/' + part; if (fs.existsSync(current)) { const stat = fs.lstatSync(current); assert(stat.isDirectory() && !stat.isSymbolicLink()); assert.equal(fs.realpathSync(current), current); } else if (create) fs.mkdirSync(current); } return current; }
try {
  const copies = [];
  for (const item of files) {
    assert(item.file && !path.isAbsolute(item.file) && !item.file.split('/').includes('..')); const from = R + '/' + item.file, target = path.resolve(M, item.file); assert(target.startsWith(M + '/'));
    const raw = ownedFile(from); assert.equal(sha(raw), item.sha256); rootInputs.push({ file: from, sha256: item.sha256 });
    mirrorDirectory(path.posix.dirname(item.file), false);
    if (fs.existsSync(target)) { const old = fs.lstatSync(target); assert(old.isFile() && !old.isSymbolicLink() && old.nlink === 1); const previous = pin(target); assert(previous.rawBytesSha256 === item.sha256 || previous.rawBytesSha256 === source12.get(item.file), 'Preserve unexplained mirror source drift before any copy: ' + item.file); previousMirrorInputs.push(previous); }
    copies.push({ item, target, raw });
  }
  for (const { item, target, raw } of copies) { mirrorDirectory(path.posix.dirname(item.file), true); fs.writeFileSync(target, raw); assert.equal(sha(ownedFile(target)), item.sha256); copiedInputs.push({ file: target, sha256: item.sha256 }); }
  const stable = () => files.every(item => sha(ownedFile(R + '/' + item.file)) === item.sha256 && sha(ownedFile(M + '/' + item.file)) === item.sha256) && sha(JSON.stringify(sourcePins())) === sha(JSON.stringify(pins)) && sha(JSON.stringify(helperGraph13())) === sha(JSON.stringify(helpers));
  assert(stable());
  const rootReceipt = artifact('Root-source-inventory-copy.json', { kind: 'actual-Source13-source-inventory-and-copy', operation: 'source-inventory-and-copy', root: R, destinationRoot: M, observedAt: new Date().toISOString(), sourceStable: true, inputs: rootInputs, copiedInputs, previousMirrorInputs,
    RootCompilationExecuted: false, actualSourcePins: plan.sourcePins, helperH0: plan.helperH0, approval: plan.approval });
  const env = { HOME: '/home/wangzishi', USER: 'wangzishi', LOGNAME: 'wangzishi', LANG: 'C.UTF-8', PATH: '/home/wangzishi/.cargo/bin:/usr/bin:/bin', CARGO_HOME: '/home/wangzishi/.cache/poms-r4def-cargo-home', RUSTUP_HOME: '/home/wangzishi/.rustup', CARGO_TARGET_DIR: '/home/wangzishi/.cache/poms-r4ghi-target-ROOT', CARGO_BUILD_JOBS: '2', CARGO_NET_OFFLINE: 'true' };
  const manifest = M + '/apps/poms-api-rust/Cargo.toml', steps = {}, suffixes = { fmt: ['--', '--check'], clippy: ['--all-targets', '--', '-D', 'warnings'], test: ['--all-targets'], build: ['--bin', 'poms-api-rust', '--example', 'r4ghi_summary_producer08'] };
  for (const command of ['fmt', 'clippy', 'test', 'build']) {
    const commandArgv = [CARGO, '+1.99.1', command, '--manifest-path', manifest, ...suffixes[command]], stdout = fs.openSync(out + '/' + command + '-stdout.log', 'wx', 0o600), stderr = fs.openSync(out + '/' + command + '-stderr.log', 'wx', 0o600), startedAt = new Date().toISOString();
    console.log(JSON.stringify({ started: command, target: env.CARGO_TARGET_DIR, actualMirrorCommand: true })); let result;
    try { result = spawnSync(CARGO, commandArgv.slice(1), { cwd: M, env, stdio: ['ignore', stdout, stderr], timeout: 900000 }); } finally { fs.closeSync(stdout); fs.closeSync(stderr); }
    steps[command] = { kind: 'actual-owned-mirror-cargo-command', command, cwd: M, argv: commandArgv, startedAt, completedAt: new Date().toISOString(), exitCode: result.status, signal: result.signal, errorCode: result.error?.code ?? null, stdout: pin(out + '/' + command + '-stdout.log'), stderr: pin(out + '/' + command + '-stderr.log'), sourceStable: stable() };
    artifact(command + '-command.json', steps[command]); assert.equal(result.status, 0, 'Actual Cargo command failed; inspect its private stdout/stderr'); assert.equal(steps[command].sourceStable, true);
  }
  const binary = pin(env.CARGO_TARGET_DIR + '/debug/poms-api-rust'), commonProducer = pin(env.CARGO_TARGET_DIR + '/debug/examples/r4ghi_summary_producer08'); assert(stable()); read(plan.approval); read(plan.sourcePins); read(plan.helperH0); assert.deepEqual(ownedFile(argv[1]), planRaw);
  const mirrorReceipt = artifact('mirror-cargo-checks-build.json', { kind: 'actual-Source13-owned-mirror-cargo-checks-and-build', operation: 'fmt-clippy-test-build', root: M, inputs: copiedInputs, sourceStable: true, RootSourceAlsoStableAfterCargo: true, environment: env, steps, binary, commonProducer, actualSourcePins: plan.sourcePins, helperH0: plan.helperH0, approval: plan.approval, ambientDatabaseOptInInherited: false });
  const binding = artifact('actual-build-binding.json', { kind: 'actual-Source13-source-inventory-and-owned-mirror-build-binding', namespace: 'poms-r4ghi', sourcePins: pins, sourcePinsSHA256: sha(JSON.stringify(pins)), sourceCount: pins.length, binary,
    Root: { receipt: rootReceipt, sourceStablePointer: '/sourceStable', inputsPointer: '/inputs', copiedInputsPointer: '/copiedInputs' }, mirror: { receipt: mirrorReceipt, sourceStablePointer: '/sourceStable', inputsPointer: '/inputs', stepPointers: Object.fromEntries(Object.keys(steps).map(key => [key, '/steps/' + key])), binaryPointer: '/binary' }, RootCompilationExecuted: false, commonProducer, G3Certified: false });
  console.log(JSON.stringify({ completed: true, actualBuild: binding, binary, commonProducer, sourceCount: pins.length, helperCount: helpers.length, RootCompilationExecuted: false, G3Certified: false }));
} catch (error) { const partial = artifact('partial180.json', { name: error.name, stack: error.stack, privateOriginalsRetained: true }); console.error(JSON.stringify({ completed: false, partial, privateDetailsPublished: false, noBlindRetry: true })); process.exitCode = 1; }
