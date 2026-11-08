// Start the normal owned API only from the real build and completed M98 observation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sourcePins, ownedFile } from './business/context.mjs';
import { helperGraph13, assertBuildFacts13 } from './construct-source13-bindings.mjs';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private', N = '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node', sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.execPath, N); assert.deepEqual(process.execArgv, []); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--input' && args[2] === '--approved-input-sha' && args[4] === '--execute');
const raw = ownedFile(args[1]); assert.equal(sha(raw), args[3]); const input = JSON.parse(raw);
const pin = file => ({ file, rawBytesSha256: sha(ownedFile(file)) }), json = item => { const bytes = ownedFile(item.file); assert.equal(sha(bytes), item.rawBytesSha256); return JSON.parse(bytes); };
assert.equal(input.kind, 'Root-approved-actual-Source13-API136-start182'); assert.equal(input.G3Certified, false); const approval = json(input.approval); assert.equal(approval.G2Authorized, true); assert.equal(approval.actualM98Applied, false);
assert.deepEqual(approval.supportingTools.apiRuntimeWrapper, pin(R + '/tools/rust-r4ghi/start-api136-182.mjs')); assert.deepEqual(approval.supportingTools.apiRuntimeLauncher, pin(R + '/tools/rust-r4ghi/api-runtime01.mjs'));
assert.equal(approval.supportingTools.apiRuntimeLauncher.rawBytesSha256, '7f5702e6a086900e73fe0afde106bb252485b9a4893b3d5f66ed9a286072dfaf');
assert.deepEqual(json(input.sourcePins), sourcePins()); assert.deepEqual(json(input.helperH0), helperGraph13());
const build = json(input.actualBuild), after = json(input.afterObservation); assert.equal(build.kind, 'actual-Source13-source-inventory-and-owned-mirror-build-binding'); assert.equal(build.binary.file, '/home/wangzishi/.cache/poms-r4ghi-target-ROOT/debug/poms-api-rust');
assert.equal(after.kind, 'actual-state-free-M98-after-observation164'); assert.equal(after.Source13StateMinted, false); assert.equal(after.DMLOrDDLExecuted, false); assert.equal(after.readOnlyConnections, true); assert.deepEqual(after.approval, input.approval); json(after.migrationAfter);
assert.deepEqual(after.sourcePins, input.sourcePins); assert.deepEqual(after.helperGraph, input.helperH0);
assertBuildFacts13(build, sourcePins(), { binary: build.binary.file, binarySha256: build.binary.rawBytesSha256 }, json(build.Root.receipt), json(build.mirror.receipt));
const binaryStat = fs.lstatSync(build.binary.file); assert(binaryStat.isFile() && !binaryStat.isSymbolicLink()); assert.equal(fs.realpathSync(build.binary.file), build.binary.file); assert.equal(sha(fs.readFileSync(build.binary.file)), build.binary.rawBytesSha256); // Cargo may hard-link its own binary artifact.
assert(!fs.existsSync(P + '/rust-api136-process.json')); assert(!fs.existsSync(P + '/business/g2-business13/main01/state.json')); assert(!fs.existsSync(P + '/business/g2-business12/main01/driver.lock'));
const out = P + '/api136-start182'; fs.mkdirSync(out, { mode: 0o700 }); const stdout = fs.openSync(out + '/stdout.json', 'wx', 0o600), stderr = fs.openSync(out + '/stderr.log', 'wx', 0o600);
let result; try { result = spawnSync(N, [R + '/tools/rust-r4ghi/api-runtime01.mjs', 'start', '136'], { cwd: R, env: process.env, stdio: ['ignore', stdout, stderr], timeout: 60000 }); } finally { fs.closeSync(stdout); fs.closeSync(stderr); }
if (result.status !== 0) { const file = out + '/partial182.json'; fs.writeFileSync(file, JSON.stringify({ kind: 'actual-owned-API136-start-failed-or-unknown182', actualExitCode: result.status, stdout: pin(out + '/stdout.json'), stderr: pin(out + '/stderr.log'), noBlindRestart: true }, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.error(JSON.stringify({ completed: false, partial: pin(file), privateDetailsPublished: false })); process.exitCode = 1; }
else {
  const ready = json(pin(out + '/stdout.json')), processPin = pin(P + '/rust-api136-process.json'), processRecord = json(processPin); assert.equal(ready.mode, 'start'); assert.equal(ready.pid, processRecord.pid); assert.equal(ready.port, 31441); assert.equal(ready.readiness, 200); assert.equal(ready.privateCredentialsPrinted, false); assert.equal(ready.binarySha256, build.binary.rawBytesSha256); assert.equal(processRecord.binarySha256, ready.binarySha256);
  assert.deepEqual(json(input.sourcePins), sourcePins()); assert.deepEqual(json(input.helperH0), helperGraph13());
  const receipt = { kind: 'actual-Source13-owned-normal-API136-start182', apiProcess: processPin, readinessOriginal: pin(out + '/stdout.json'), stderr: pin(out + '/stderr.log'), actualExitCode: result.status, actualBuild: input.actualBuild, afterObservation: input.afterObservation,
    sourcePins: input.sourcePins, helperH0: input.helperH0, actualAuthenticationStillRequired: true, Source13StateMinted: false, G3Certified: false }, file = out + '/receipt182.json'; fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ completed: true, ...receipt, receipt: pin(file) }));
}
