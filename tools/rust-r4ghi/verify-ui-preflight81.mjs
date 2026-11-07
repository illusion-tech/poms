import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { bindPowerShell22, createPrivateDirectory22, fileVersion22 } from './business/ui-windows-preflight22.mjs';
assert.equal(process.platform, 'win32');
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const config = JSON.parse(fs.readFileSync(new URL('./H/implementation/support-patches/ui-integration/windows-preflight22/powershell22.plan-fragment.json', import.meta.url)));
const before = JSON.stringify(Object.entries(process.env).filter(([key]) => key.toLowerCase() === 'psmodulepath'));
const runtime = bindPowerShell22(config.windows.powershell);
const directory = root + '/tmp/rust-r4ghi/private/ui-runtime14/acl-preflight81-01';
createPrivateDirectory22(directory, runtime);
const browser = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
assert.equal(sha(fs.readFileSync(browser)), '46461accbdc87dc88a5bdd6d611be095dd6147db009863d794f742ca90662efa');
const version = fileVersion22(browser, runtime, directory);
assert.equal(version.ProductVersion, '156.0.8078.80'); assert.equal(version.FileVersion, '156.0.8078.80');
assert.equal(JSON.stringify(Object.entries(process.env).filter(([key]) => key.toLowerCase() === 'psmodulepath')), before);
const proof = fs.readFileSync(directory + '/private-acl22-proof.json');
const result = { kind: 'Root-actual-Windows-preflight81-only', status: 'passed', powershell: runtime,
  aclProof: { file: directory + '/private-acl22-proof.json', rawBytesSha256: sha(proof) }, browserFileVersion: version,
  parentEnvironmentUnchanged: true, newTaskDirectoryOnly: true, oldRun01Reused: false, HTTPExecuted: false, browserStarted: false, G3Certified: false };
const output = root + '/tmp/rust-r4ghi/root/ui-preflight81'; fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(output + '/receipt.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: result.status, actualPowerShellVersion: runtime.version, protectedTaskDirectory: true, browserFileVersion: version.ProductVersion, parentEnvironmentUnchanged: true, HTTPExecuted: false, browserStarted: false }));
