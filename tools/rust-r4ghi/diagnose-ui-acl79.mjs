import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const directory = 'E:/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/private/ui-runtime14/dom14-source12-01';
assert.equal(process.platform, 'win32');
assert.equal(fs.readdirSync(directory).length, 0, 'Only the unused empty task directory may be diagnosed');
const source = fs.readFileSync(new URL('./H/implementation/support-patches/ui-integration/runtime14/windows14.mjs', import.meta.url), 'utf8');
const match = source.match(/function createPrivateDirectory\(directory\) \{[\s\S]*?const script = ("[^\n]+");/);
assert(match);
const script = JSON.parse(match[1]);
assert(script.includes('Set-Acl -LiteralPath $env:POMS_R4GHI_UI_PRIVATE'));
try {
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, POMS_R4GHI_UI_PRIVATE: directory }, windowsHide: true, stdio: 'pipe' });
  console.log(JSON.stringify({ status: 'passed', invocation: 'exact-runtime14-ACL-execFileSync', HTTPExecuted: false, browserExecuted: false }));
} catch (error) {
  console.log(JSON.stringify({ status: 'failed', invocation: 'exact-runtime14-ACL-execFileSync', code: error.status, stderr: String(error.stderr), HTTPExecuted: false, browserExecuted: false }));
  process.exitCode = 1;
}
