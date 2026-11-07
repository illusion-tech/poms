import { validateBindingShape } from '../H/implementation/support-patches/ui-integration/runtime13/binding13.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { bindPowerShell22, createPrivateDirectory22, fileVersion22, emitFailure22 } from './ui-windows-preflight22.mjs';
import { fileURLToPath } from 'node:url';
import { executeCase, SOURCE_BASE_SHA256 } from './ui-expense18-browser.mjs';
import { fixed, sha, readJson, validatePlanIdentity, readPinned, writeNew, atomicJson, waitJson } from '../H/implementation/support-patches/ui-integration/runtime14/dom-common14.mjs';

const equalWindows = (left, right) => path.win32.normalize(left).toLowerCase() === path.win32.normalize(right).toLowerCase();
function bindPlaywright(runtime) {
  readPinned(runtime.requireFromPackageJson, runtime.requireFromPackageJsonRawBytesSha256); const require = createRequire(runtime.requireFromPackageJson);
  const entry = require.resolve('@playwright/test'), packageFile = require.resolve('@playwright/test/package.json');
  assert(equalWindows(entry, runtime.entryFile) && equalWindows(packageFile, runtime.packageFile)); readPinned(entry, runtime.entryRawBytesSha256);
  const metadata = JSON.parse(readPinned(packageFile, runtime.packageRawBytesSha256)); assert.equal(metadata.name, '@playwright/test'); assert.equal(metadata.version, runtime.version);
  return require('@playwright/test');
}
async function confirmLocalhost(ready) {
  const observed = await new Promise((resolve, reject) => {
    const request = http.get(`${fixed.origin}/index.html`, { timeout: 15_000, headers: { 'Accept-Encoding': 'identity' } }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(Buffer.from(chunk))); response.once('error', reject);
      response.once('end', () => resolve({ status: response.statusCode, headers: response.headers, bytes: Buffer.concat(chunks), complete: response.complete }));
    }); request.once('error', reject); request.once('timeout', () => request.destroy(new Error('Actual Windows localhost to WSL proxy is unavailable')));
  });
  assert(observed.complete && observed.status === 200); assert.equal(observed.headers['x-poms-r4ghi-ui-run'], ready.nonce, 'Localhost reached the wrong server/run');
  const index = ready.build.files.find(file => file.file === 'index.html'); assert.equal(sha(observed.bytes), index.rawBytesSha256, 'Localhost did not serve the real frozen dist index');
  return { actualReachable: true, origin: fixed.origin, indexRawBytesSha256: index.rawBytesSha256, sameOwnedRunNonce: true };
}
function copyPrivateTree(from, to) {
  assert(!fs.existsSync(to)); fs.mkdirSync(to, { recursive: true }); const files = [];
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name), target = path.join(to, entry.name); assert(!fs.lstatSync(source).isSymbolicLink());
    if (entry.isDirectory()) { const nested = copyPrivateTree(source, target); files.push(...nested.map(file => ({ ...file, file: `${entry.name}/${file.file}` }))); }
    else { const bytes = fs.readFileSync(source); fs.writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 }); files.push({ file: entry.name, bytes: bytes.length, rawBytesSha256: sha(bytes) }); }
  }
  return files;
}

async function execute(plan, planFile, approvedBindingSHA256) {
  assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.19.0'); const locations = validatePlanIdentity(plan);
  assert(equalWindows(planFile, locations.windowsPlan)); const binding=validateBindingShape(JSON.parse(readPinned(locations.windowsBinding,approvedBindingSHA256))); assert.equal(binding.epoch,plan.epoch); assert.equal(binding.run,plan.run); assert(equalWindows(process.execPath, plan.windows.node.executablePath)); readPinned(process.execPath, plan.windows.node.rawBytesSha256);
  for (const item of plan.sourceBases) readPinned(path.join(fixed.windowsRoot, item.file), item.rawBytesSha256);
  assert.equal(SOURCE_BASE_SHA256, plan.browserCasesSourceBaseSHA256);
  const executable = plan.windows.browser.executablePath; assert(path.win32.isAbsolute(executable) && !executable.startsWith('/home/') && /(?:chrome|msedge)\.exe$/i.test(executable));
  readPinned(executable, plan.windows.browser.rawBytesSha256); const powershell22 = bindPowerShell22(plan.windows.powershell); createPrivateDirectory22(locations.windowsPrivate, powershell22); const version = fileVersion22(executable, powershell22, locations.windowsPrivate);
  assert.equal(version.ProductVersion, plan.windows.browser.productVersion); assert.equal(version.FileVersion, plan.windows.browser.fileVersion);
  const { chromium, expect } = bindPlaywright(plan.windows.playwright);
  assert(typeof plan.linuxNodeExecutable === 'string' && plan.linuxNodeExecutable.startsWith('/'), 'Root must bind its actual existing Linux Node absolute path');
  const output = fs.openSync(path.join(locations.windowsPrivate, 'linux-stdout.log'), 'wx'), errorOutput = fs.openSync(path.join(locations.windowsPrivate, 'linux-stderr.log'), 'wx');
  const linuxEntry = `${fixed.linuxRoot}/tools/rust-r4ghi/business/ui-expense18-linux.mjs`;
  const child = spawn('wsl.exe', ['-d', 'Debian', '--', plan.linuxNodeExecutable, linuxEntry, '--plan', locations.linuxPlan, '--approved-binding-sha', approvedBindingSHA256, '--execute'], { cwd: fixed.windowsRoot, windowsHide: true, stdio: ['ignore', output, errorOutput] });
  let childError = null, childExit = null; child.once('error', error => { childError = error; }); child.once('exit', code => { childExit = code; });
  let ready, sequence = 0, active = null; const contexts = new Set(), cases = [], windows = { nodeVersion: process.version, nodeRawBytesSha256: plan.windows.node.rawBytesSha256, browserFileVersion: version, browserRawBytesSha256: plan.windows.browser.rawBytesSha256, playwrightVersion: plan.windows.playwright.version };
  const command = async (action, extra = {}) => {
    assert(ready?.nonce); const file = `${String(++sequence).padStart(4, '0')}.json`;
    const target = path.join(locations.windowsIPC, 'commands', file); atomicJson(target, { nonce: ready.nonce, action, ...extra });
    return waitJson(path.join(locations.windowsIPC, 'acks', file), value => value.nonce === ready.nonce, 120_000, () => { if (childError || childExit !== null) throw new Error('Owned Linux helper stopped before IPC acknowledgement'); });
  };
  try {
    ready = await waitJson(path.join(locations.windowsIPC, 'ready.json'), () => true, 120_000, () => { if (childError || childExit !== null) throw new Error('Owned Linux helper exited before admission'); });
    assert.equal(ready.namespace, fixed.namespace); assert.equal(ready.origin, fixed.origin); assert.equal(ready.planSHA256, sha(fs.readFileSync(planFile)));
    windows.localhost = await confirmLocalhost(ready);
    for (let index = 0; index < ready.cases.length; index++) {
      const admitted = await command('begin', { index }); active = index;
      const caseDirectory = path.join(locations.windowsPrivate, `case-${index}`); fs.mkdirSync(caseDirectory);
      const profileDirectory = path.join(locations.windowsPrivate, `chrome-profile-${index}`); assert(!fs.existsSync(profileDirectory));
      let actualProjectNavigationObserved = false;
      const adapter = { async newContext(options) {
        const context = await chromium.launchPersistentContext(profileDirectory, { ...options, executablePath: executable, downloadsPath: path.join(locations.windowsPrivate, `downloads-${index}`), headless: true, timeout: 60_000, args: ['--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-sync'] });
        contexts.add(context); const browser = context.browser(); assert(browser); const actual = browser.version(); assert.equal(actual, plan.windows.browser.browserVersion); windows.actualBrowserVersion = actual;
        context.on('page', page => page.on('framenavigated', frame => { if (frame === page.mainFrame() && frame.url().startsWith(`${fixed.origin}/projects/`)) actualProjectNavigationObserved = true; }));
        return context;
      } };
      const bridge = { get exchanges() { const status = readJson(path.join(locations.windowsIPC, 'exchanges.json')); assert.equal(status.nonce, ready.nonce); return status.exchanges; }, async settle() { await command('drain'); } };
      let result;
      try { result = await executeCase(adapter, expect, admitted.test, caseDirectory, bridge); }
      catch (error) { writeNew(path.join(caseDirectory, 'worker-failure.log'), Buffer.from(error.stack || String(error))); result = { kind: admitted.test.kind, status: 'failed', failure: 'private-worker-log' }; }
      result.actualProjectNavigationObserved = actualProjectNavigationObserved;
      const copied = copyPrivateTree(caseDirectory, path.join(locations.windowsIPC, `windows-case-${index}`)); result.privateWindowsArtifacts = copied;
      cases.push(result); await command('end', { index, result }); active = null;
    }
    for (const context of contexts) await context.close(); contexts.clear();
    readPinned(executable, plan.windows.browser.rawBytesSha256); assert.deepEqual(fileVersion22(executable, powershell22, locations.windowsPrivate), version);
    await command('finish', { windows });
  } catch (error) {
    writeNew(path.join(locations.windowsPrivate, 'windows-failure.log'), Buffer.from(error.stack || String(error)));
    for (const context of contexts) { try { await context.close(); } catch { /* Only this tool's fresh profiles were opened. */ } } contexts.clear();
    if (ready) {
      if (active !== null) { try { await command('end', { index: active, result: { kind: ready.cases[active].kind, status: 'failed', failure: 'private-Windows-failure' } }); active = null; } catch { /* Linux owns its bounded timeout/close. */ } }
      try { await command('stop', { windows }); } catch { /* No broad kill of WSL/API/DB or by-port termination. */ }
    }
  } finally { fs.closeSync(output); fs.closeSync(errorOutput); }
  if (!ready) throw new Error('Owned Linux admission did not finish; inspect private logs, do not claim DOM acceptance');
  const done = await waitJson(path.join(locations.windowsIPC, 'done.json'), value => value.nonce === ready.nonce, 120_000);
  writeNew(path.join(locations.windowsPrivate, 'windows-complete.json'), { windows, cases, linuxStatus: done.report.status, childExit, G3Certified: false });
  return done.report;
}
async function main() { const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--plan' && args[2] === '--approved-binding-sha' && args[4] === '--execute'); const report = await execute(readJson(args[1]), args[1], args[3]); console.log(JSON.stringify({ namespace: report.namespace, status: report.status, cases: report.cases.map(({ kind, status }) => ({ kind, status })), G3Certified: false })); if (!['passed', 'passed-bound-cases-only'].includes(report.status)) process.exitCode = 1; }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { emitFailure22(error); process.exitCode = 1; });
