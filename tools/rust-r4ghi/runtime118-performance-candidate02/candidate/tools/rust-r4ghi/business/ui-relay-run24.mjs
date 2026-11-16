// Root executes on Windows only. Launches temporary owned byte relays, then
// invokes the unchanged14/18 Windows entry point with its exact original args.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bindPowerShell22, createPrivateDirectory22, emitFailure22 } from './ui-windows-preflight22.mjs';
import { validateBindingShape } from '../H/implementation/support-patches/ui-integration/runtime13/binding13.mjs';
import { validatePlanIdentity } from '../H/implementation/support-patches/ui-integration/runtime14/dom-common14.mjs';
import { relayFixed24, sha24, newJSON24, args24, readPlan24, validateRelay24, verifyNode24, verifyHelper24 } from './ui-relay-common24.mjs';

const workerFiles24 = Object.freeze({ runtime14: 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime14/windows14.mjs',
  role18: 'tools/rust-r4ghi/business/ui-role18-windows.mjs', expense18: 'tools/rust-r4ghi/business/ui-expense18-windows.mjs', gh18: 'tools/rust-r4ghi/business/ui-gh18-windows.mjs', lifecycle18: 'tools/rust-r4ghi/business/ui-lifecycle18-windows.mjs' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function filePin24(file) { const bytes = fs.readFileSync(file); return { file, rawBytesSha256: sha24(bytes) }; }
function readPinnedJSON24(pin) { const bytes = fs.readFileSync(pin.file); assert.equal(sha24(bytes), pin.rawBytesSha256); return JSON.parse(bytes); }
async function waitFile24(file, timeout, valid, child = null) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) { try { const bytes = fs.readFileSync(file), value = JSON.parse(bytes); if (valid(value)) return { value, pin: { file, rawBytesSha256: sha24(bytes) } }; } catch (error) { if (!(error instanceof SyntaxError)) throw error; } }
    if (child && (child.exitCode !== null || child.signalCode !== null)) throw new Error('Owned child exited before relay readiness; inspect private metadata logs');
    await pause(100);
  }
  throw new Error('Bounded relay ready/stop deadline exceeded');
}
async function waitExit24(child, timeout) {
  if (!child || child.exitCode !== null) return true; const deadline = Date.now() + timeout;
  while (Date.now() < deadline && child.exitCode === null && child.signalCode === null) await pause(100);
  return child.exitCode !== null || child.signalCode !== null;
}

export async function runRelay24(argv) {
  assert.equal(process.platform, 'win32'); assert.equal(argv.at(-1), '--execute'); const a = args24(argv.slice(0, -1)); assert.deepEqual(Object.keys(a).sort(), ['--approved-binding-sha', '--approved-plan-sha', '--plan'].sort());
  const plan = readPlan24(a['--plan'], a['--approved-plan-sha']), r = validateRelay24(plan), locations = validatePlanIdentity(plan); verifyNode24(plan, 'windows'); verifyHelper24(plan, import.meta.url, 'windows');
  assert.equal(path.win32.normalize(a['--plan']).toLowerCase(), path.win32.normalize(locations.windowsPlan).toLowerCase());
  const binding = validateBindingShape(readPinnedJSON24({ file: locations.windowsBinding, rawBytesSha256: a['--approved-binding-sha'] }));
  assert.equal(binding.plan.rawBytesSha256, a['--approved-plan-sha']); assert.equal(binding.purpose, 'dom'); assert.equal(binding.actorBindingsFinal, true);
  for (const leaf of plan.sourceBases) { assert.equal(sha24(fs.readFileSync(path.join(relayFixed24.win, leaf.file))), leaf.rawBytesSha256); }
  assert.equal(r.wsl.executablePath, 'C:/Windows/System32/wsl.exe'); assert.equal(sha24(fs.readFileSync(r.wsl.executablePath)), r.wsl.rawBytesSha256);
  assert(!fs.existsSync(locations.windowsPrivate) && !fs.existsSync(locations.windowsIPC), 'A previous UI/private profile must never be reused');
  const shell = bindPowerShell22(plan.windows.powershell); createPrivateDirectory22(r.paths.windows, shell);
  const nonce = randomBytes(32).toString('hex'), report = { kind: 'Root-owned-UI-byte-relay-wrapper24', planSHA256: a['--approved-plan-sha'], bindingSHA256: a['--approved-binding-sha'], workerKind: r.workerKind,
    nonce, status: 'failed', ready: {}, stops: {}, payloadOrCookiesLogged: false, networkGlobalConfigurationChanged: false, G3Certified: false, G4Certified: false };
  const logs = [], start = (name, executable, args) => {
    const stdout = fs.openSync(`${r.paths.windows}/${name}-stdout.log`, 'wx'), stderr = fs.openSync(`${r.paths.windows}/${name}-stderr.log`, 'wx'); logs.push(stdout, stderr);
    const child = spawn(executable, args, { cwd: relayFixed24.win, windowsHide: true, stdio: ['ignore', stdout, stderr] });
    child.on('error', error => { report[`${name}SpawnError`] = { name: error.name, code: error.code ?? null }; }); return child;
  };
  const linuxEntry = `${relayFixed24.linux}/tools/rust-r4ghi/business/ui-relay-linux24.mjs`, windowsEntry = `${relayFixed24.win}/tools/rust-r4ghi/business/ui-relay-windows24.mjs`;
  const bridgeArgs = (planFile) => ['--plan', planFile, '--plan-sha', a['--approved-plan-sha'], '--nonce', nonce];
  let linuxChild, windowsChild, worker, linuxReady, windowsReady;
  try {
    linuxChild = start('linux-bridge', r.wsl.executablePath, ['-d', 'Debian', '--', plan.linuxNodeExecutable, linuxEntry, ...bridgeArgs(locations.linuxPlan)]);
    linuxReady = await waitFile24(`${r.paths.unc}/linux-ready.json`, r.readyTimeoutMs, value => value.nonce === nonce && value.planSHA256 === a['--approved-plan-sha'] && value.mode === 'linux', linuxChild);
    assert.equal(linuxReady.value.listen.address, r.wslIPv4); assert.equal(linuxReady.value.listen.port, 44552); assert.equal(linuxReady.value.identity.executableSHA256, plan.metadata16.linuxNode.rawBytesSha256);
    report.ready.linux = linuxReady.pin;
    windowsChild = start('windows-bridge', process.execPath, [windowsEntry, ...bridgeArgs(locations.windowsPlan)]);
    windowsReady = await waitFile24(`${r.paths.windows}/windows-ready.json`, r.readyTimeoutMs, value => value.nonce === nonce && value.planSHA256 === a['--approved-plan-sha'] && value.mode === 'windows', windowsChild);
    assert.equal(windowsReady.value.identity.pid, windowsChild.pid); assert.equal(windowsReady.value.identity.executableSHA256, plan.windows.node.rawBytesSha256); report.ready.windows = windowsReady.pin;
    // The original worker owns browser/HTTP/ledger behavior. The relays add no
    // request, retry, response mock, proxy header or body transformation.
    const workerFile = `${relayFixed24.win}/${workerFiles24[r.workerKind]}`; report.worker = { file: workerFile, rawBytesSha256: sha24(fs.readFileSync(workerFile)) };
    worker = start('original-worker', process.execPath, [workerFile, '--plan', locations.windowsPlan, '--approved-binding-sha', a['--approved-binding-sha'], '--execute']);
    assert(await waitExit24(worker, (plan.overallTimeoutSeconds + 180) * 1000), 'Original bounded worker did not exit; preserve its exact PID and private logs');
    report.workerExitCode = worker.exitCode; report.workerPID = worker.pid; assert.equal(worker.exitCode, 0); report.status = 'original-worker-exited-zero';
  } catch (error) { report.failure = { name: error.name, code: error.code ?? null, message: String(error.message).split('\n', 1)[0] }; }
  finally {
    for (const [mode, ready, child, directory] of [['windows', windowsReady, windowsChild, r.paths.windows], ['linux', linuxReady, linuxChild, r.paths.unc]]) {
      if (!ready) {
        if (!child || child.exitCode !== null || child.signalCode !== null) continue;
        try {
          if (mode === 'windows') child.kill('SIGTERM');
          else {
            const processFile = `${directory}/linux-process.json`;
            if (!fs.existsSync(processFile)) { assert(await waitExit24(child, 30000), 'No exact Linux identity record; preserve launcher PID, do not signal an unknown process'); report.stops[mode] = { exitedBeforeIdentity: true, launcherPID: child.pid }; continue; }
            const processPin = filePin24(processFile), record = readPinnedJSON24(processPin);
            assert.equal(record.nonce, nonce); assert.equal(record.planSHA256, a['--approved-plan-sha']);
            execFileSync(r.wsl.executablePath, ['-d', 'Debian', '--', plan.linuxNodeExecutable, linuxEntry, '--stop', ...bridgeArgs(locations.linuxPlan), '--record-name', 'linux-process.json', '--record-sha', processPin.rawBytesSha256], { cwd: relayFixed24.win, windowsHide: true, timeout: r.stopTimeoutMs, stdio: 'pipe' });
          }
          assert(await waitExit24(child, r.stopTimeoutMs)); report.stops[mode] = { stoppedBeforeReady: true, launcherPID: child.pid };
        } catch (error) { report.status = 'failed'; report[`${mode}StopBeforeReadyFailure`] = { name: error.name, code: error.code ?? null, message: String(error.message).split('\n', 1)[0] }; }
        continue;
      }
      try {
        newJSON24(`${directory}/${mode}-stop.json`, { nonce, pid: ready.value.identity.pid, planSHA256: a['--approved-plan-sha'] });
        try { report.stops[mode] = (await waitFile24(`${directory}/${mode}-done.json`, r.stopTimeoutMs, value => value.nonce === nonce && value.planSHA256 === a['--approved-plan-sha'])).pin; }
        catch {
          if (mode === 'windows') {
            assert.equal(child.pid, ready.value.identity.pid); if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
          } else {
            // Only this exact Linux bridge PID/start/exe/nonce may be signaled.
            execFileSync(r.wsl.executablePath, ['-d', 'Debian', '--', plan.linuxNodeExecutable, linuxEntry, '--stop', ...bridgeArgs(locations.linuxPlan), '--record-name', 'linux-ready.json', '--record-sha', ready.pin.rawBytesSha256], { cwd: relayFixed24.win, windowsHide: true, timeout: r.stopTimeoutMs, stdio: 'pipe' });
          }
          report.stops[mode] = (await waitFile24(`${directory}/${mode}-done.json`, r.stopTimeoutMs, value => value.nonce === nonce && value.planSHA256 === a['--approved-plan-sha'])).pin;
        }
        assert(await waitExit24(child, r.stopTimeoutMs), 'Owned bridge launcher did not exit after stop');
      } catch (error) { report.status = 'failed'; report[`${mode}StopFailure`] = { name: error.name, code: error.code ?? null, message: String(error.message).split('\n', 1)[0] }; }
    }
    for (const fd of logs) fs.closeSync(fd);
    if (worker && worker.exitCode === null && worker.signalCode === null) report.unfinishedOriginalWorkerPID = worker.pid;
    newJSON24(`${r.paths.windows}/relay-wrapper-done.json`, report);
  }
  assert.equal(report.status, 'original-worker-exited-zero', 'Relay wrapper failed; inspect task-private metadata, no DOM success claimed'); return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runRelay24(process.argv.slice(2)).then(report => { console.log(JSON.stringify({ kind: report.kind, status: report.status, workerKind: report.workerKind, bridgeReadyCount: Object.keys(report.ready).length, bridgeStoppedCount: Object.keys(report.stops).length, G3Certified: false })); }).catch(error => { emitFailure22(error); process.exitCode = 1; });
