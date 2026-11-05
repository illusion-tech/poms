param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$RunId
)
$ErrorActionPreference = 'Stop'
$taskRepoPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../..')).Path
$taskRunPath = Join-Path $PSScriptRoot ('evidence/' + $RunId)
if (Test-Path -LiteralPath $taskRunPath) { throw 'Evidence run already exists; choose a new RunId' }
New-Item -ItemType Directory -Path $taskRunPath | Out-Null
$taskWslRepo = '/mnt/' + $taskRepoPath.Substring(0, 1).ToLowerInvariant() + $taskRepoPath.Substring(2).Replace('\', '/')
$taskFiles = @(
    'apps/poms-api-rust/src/project_actual_cost/logic.rs'
    'apps/poms-api-rust/src/project_actual_cost/mod.rs'
    'apps/poms-api-rust/src/project_actual_cost/store.rs'
    'apps/poms-api-rust/src/project_actual_cost/view.rs'
)
function Get-TaskPins([string[]]$files) {
    @($files | ForEach-Object {
        $full = Join-Path $taskRepoPath $_
        [pscustomobject]@{ file = $_; bytes = (Get-Item -LiteralPath $full).Length; rawBytesSha256 = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant() }
    })
}
$taskBefore = Get-TaskPins $taskFiles
$taskBase = & git -C $taskRepoPath rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'Cannot identify base HEAD' }
$taskPrefix = @('-d', 'Debian', '--cd', $taskWslRepo, '--exec', 'env', 'PATH=/home/wangzishi/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'CARGO_HOME=/home/wangzishi/.cache/poms-r4def-cargo-home', 'CARGO_BUILD_JOBS=2')
$taskChecks = @(
    @{ id = 'rustfmt'; args = @('/home/wangzishi/.cargo/bin/rustfmt', '+1.99.1', '--edition', '2024', '--check') + $taskFiles }
    @{ id = 'clippy'; args = @('/home/wangzishi/.cargo/bin/cargo', '+1.99.1', 'clippy', '--offline', '--manifest-path', 'apps/poms-api-rust/Cargo.toml', '--target-dir', '/home/wangzishi/.cache/poms-r4def-target-E', '--lib', '--', '-D', 'warnings') }
    @{ id = 'pure-tests'; args = @('/home/wangzishi/.cargo/bin/cargo', '+1.99.1', 'test', '--offline', '--manifest-path', 'apps/poms-api-rust/Cargo.toml', '--target-dir', '/home/wangzishi/.cache/poms-r4def-target-E', '--lib', 'project_actual_cost', '--', '--nocapture') }
)
$taskResults = @()
foreach ($check in $taskChecks) {
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = 'wsl.exe'
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    foreach ($arg in ($taskPrefix + $check.args)) { $psi.ArgumentList.Add($arg) }
    $stdoutPath = Join-Path $taskRunPath ($check.id + '-stdout-original.log')
    $stderrPath = Join-Path $taskRunPath ($check.id + '-stderr-original.log')
    $stdoutFile = [System.IO.File]::Create($stdoutPath)
    $stderrFile = [System.IO.File]::Create($stderrPath)
    $started = [DateTimeOffset]::UtcNow
    try {
        $process = [System.Diagnostics.Process]::Start($psi)
        $stdoutCopy = $process.StandardOutput.BaseStream.CopyToAsync($stdoutFile)
        $stderrCopy = $process.StandardError.BaseStream.CopyToAsync($stderrFile)
        $process.WaitForExit()
        [System.Threading.Tasks.Task]::WaitAll(@($stdoutCopy, $stderrCopy))
        $exitCode = $process.ExitCode
    } finally {
        $stdoutFile.Dispose()
        $stderrFile.Dispose()
    }
    $taskResults += [pscustomobject]@{ id = $check.id; executable = 'wsl.exe'; arguments = $taskPrefix + $check.args; exitCode = $exitCode; status = $(if ($exitCode -eq 0) { 'passed' } else { 'failed' }); startedAt = $started.ToString('o'); finishedAt = [DateTimeOffset]::UtcNow.ToString('o'); stdout = 'tools/rust-r4def/E/evidence/' + $RunId + '/' + $check.id + '-stdout-original.log'; stderr = 'tools/rust-r4def/E/evidence/' + $RunId + '/' + $check.id + '-stderr-original.log' }
    Write-Output ($check.id + ': ' + $exitCode)
}
$taskAfter = Get-TaskPins $taskFiles
$taskStable = ($taskBefore | ConvertTo-Json -Compress) -ceq ($taskAfter | ConvertTo-Json -Compress)
$taskReceipt = [ordered]@{
    kind = 'R4E-author-isolated-checks'; base = $taskBase; currentG1 = 'docs/design/rust-r4def/g1-gate-authority07.json'; before = $taskBefore; after = $taskAfter; sourcesUnchangedDuringChecks = $taskStable
    rootOwnedCompileInputs = Get-TaskPins @('apps/poms-api-rust/src/lib.rs', 'apps/poms-api-rust/src/contract_support/mod.rs', 'apps/poms-api-rust/Cargo.toml', 'apps/poms-api-rust/Cargo.lock')
    checks = $taskResults; databaseExecuted = $false; httpExecuted = $false; browserExecuted = $false; G3Certified = $false; G4Certified = $false
}
$taskReceipt | ConvertTo-Json -Depth 14 | Set-Content -LiteralPath (Join-Path $taskRunPath 'receipt.json') -Encoding utf8NoBOM
if (-not $taskStable) { throw 'Source changed during checks; this run cannot certify the final candidate' }
if ($taskResults | Where-Object exitCode -ne 0) { throw 'A check failed; preserve this evidence and fix before a new run' }
Write-Output ('receipt: tools/rust-r4def/E/evidence/' + $RunId + '/receipt.json')
