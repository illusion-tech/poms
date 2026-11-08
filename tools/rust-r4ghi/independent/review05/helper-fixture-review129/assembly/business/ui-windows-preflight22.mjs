// Task-private Windows preflight only. No top-level process/filesystem I/O.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const sha = value => createHash('sha256').update(value).digest('hex');

export function childEnvironment22(parent, additions) {
  const env = Object.fromEntries(Object.entries(parent).filter(([key]) => key.toLowerCase() !== 'psmodulepath'));
  return { ...env, ...additions };
}
export function scriptArguments22(file) { return ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', file]; }
export function redactDiagnostic22(value) {
  return String(value ?? '').replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/(["']?(?:poms_session|poms_csrf|password|secret|access_token|refresh_token|authorization|cookie)["']?\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s;,]+)/gi, '$1[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]');
}
export function failureDiagnostic22(error) {
  return { kind: 'owned-Windows-preflight-failure22', name: String(error?.name ?? 'Error'), code: error?.code == null ? null : String(error.code),
    phase: error?.preflightPhase22 ?? 'runtime14-preflight-or-worker', message: redactDiagnostic22(String(error?.message ?? error).split(/\r?\n/, 1)[0]).slice(0, 1200),
    stackFrames: redactDiagnostic22(String(error?.stack ?? '').split(/\r?\n/).filter(line => /^\s+at\s/.test(line)).slice(0, 16).join('\n')),
    childStderr: error?.safePowerShellStderr22 == null ? null : redactDiagnostic22(error.safePowerShellStderr22).slice(0, 8000),
    DOMSuccessClaimed: false, environmentDumped: false, rawActorOrCookieObjectsDumped: false };
}
export function emitFailure22(error) { console.error(JSON.stringify(failureDiagnostic22(error))); }

export const privateACLBody22 = "$taskIdentity=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; $taskAcl=[System.Security.AccessControl.DirectorySecurity]::new(); $taskAcl.SetAccessRuleProtection($true,$false); $taskAcl.SetOwner($taskIdentity); $taskAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($taskIdentity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')); $taskAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new([System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'),'FullControl','ContainerInherit,ObjectInherit','None','Allow')); Set-Acl -LiteralPath $env:POMS_R4GHI_UI_PRIVATE -AclObject $taskAcl; $result=Get-Acl -LiteralPath $env:POMS_R4GHI_UI_PRIVATE; if(-not $result.AreAccessRulesProtected){throw 'private ACL inheritance remained enabled'}";
const shellGuard22 = "$ErrorActionPreference='Stop'\nif($PSEdition -ne 'Core' -or $PSVersionTable.PSVersion.Major -lt 7){throw 'Pinned PowerShell7 Core is required'}\nif($PSVersionTable.PSVersion.ToString() -ne $env:POMS_R4GHI_PWSH_VERSION){throw 'Pinned PowerShell version changed'}\n";
export function bindPowerShell22(runtime) {
  assert.equal(process.platform, 'win32');
  assert(runtime && typeof runtime.executablePath === 'string' && path.win32.isAbsolute(runtime.executablePath) && /[\\/]pwsh\.exe$/i.test(runtime.executablePath), 'Explicit pinned PowerShell7 executable required');
  assert(/^[a-f0-9]{64}$/.test(runtime.rawBytesSha256)); assert(/^7\.\d+\.\d+(?:[-.][A-Za-z0-9.]+)?$/.test(runtime.version));
  assert.equal(sha(fs.readFileSync(runtime.executablePath)), runtime.rawBytesSha256);
  return Object.freeze({ executablePath: runtime.executablePath, rawBytesSha256: runtime.rawBytesSha256, version: runtime.version });
}
function runScript22(runtime, directory, leaf, script, additions, phase) {
  assert.equal(process.platform, 'win32'); assert.equal(path.basename(leaf), leaf); assert(leaf.endsWith('.ps1'));
  assert.equal(sha(fs.readFileSync(runtime.executablePath)), runtime.rawBytesSha256);
  const file = path.join(directory, leaf), source = Buffer.from(shellGuard22 + script + '\n', 'utf8');
  // ACL bootstrap script contains no cookies, actors, credentials or profiles.
  // Only that public code is written before the new directory is protected.
  if (!fs.existsSync(file)) fs.writeFileSync(file, source, { flag: 'wx', mode: 0o600 });
  assert.equal(sha(fs.readFileSync(file)), sha(source), 'This run script changed; never overwrite it');
  try {
    const output = execFileSync(runtime.executablePath, scriptArguments22(file), { windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      env: childEnvironment22(process.env, { ...additions, POMS_R4GHI_PWSH_VERSION: runtime.version }) });
    assert.equal(sha(fs.readFileSync(file)), sha(source)); return JSON.parse(output);
  } catch (error) {
    // This child only reads the two explicit task paths/version; it does not
    // load any actor/session material. Preserve useful module/ACL diagnostics.
    const failure = new Error(`PowerShell7 ${phase} failed; inspect the sanitized child stderr`);
    failure.name = 'WindowsPreflightError'; failure.preflightPhase22 = phase; failure.code = error.code ?? error.status ?? null;
    failure.safePowerShellStderr22 = redactDiagnostic22(error.stderr?.toString('utf8') ?? error.message); throw failure;
  }
}
export function createPrivateDirectory22(directory, runtime) {
  assert.equal(process.platform, 'win32'); assert(!fs.existsSync(directory), 'A Chrome task profile directory may never be reused'); fs.mkdirSync(directory, { recursive: true });
  const proof = runScript22(runtime, directory, 'private-acl22.ps1', privateACLBody22 + "; [pscustomobject]@{Protected=$result.AreAccessRulesProtected;PowerShellVersion=$PSVersionTable.PSVersion.ToString();PSEdition=$PSEdition}|ConvertTo-Json -Compress", { POMS_R4GHI_UI_PRIVATE: directory }, 'private-ACL');
  assert.equal(proof.Protected, true); assert.equal(proof.PSEdition, 'Core'); assert.equal(proof.PowerShellVersion, runtime.version);
  fs.writeFileSync(path.join(directory, 'private-acl22-proof.json'), JSON.stringify({ ...proof, runtime, inheritedPSModulePathUsed: false }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
export function fileVersion22(executable, runtime, directory) {
  return runScript22(runtime, directory, 'file-version22.ps1', "$taskItem=Get-Item -LiteralPath $env:POMS_R4GHI_UI_EXE; [pscustomobject]@{ProductVersion=$taskItem.VersionInfo.ProductVersion;FileVersion=$taskItem.VersionInfo.FileVersion}|ConvertTo-Json -Compress", { POMS_R4GHI_UI_EXE: executable }, 'browser-file-version');
}
