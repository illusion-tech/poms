param(
    [string]$RunId = 'author-checks01',
    [switch]$Clippy
)
$ErrorActionPreference = 'Stop'
if ($RunId -notmatch '^[a-z0-9-]+$') { throw 'Invalid local run ID' }
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$outputRoot = Join-Path $PSScriptRoot 'build'
$runRoot = Join-Path $outputRoot $RunId
if (Test-Path -LiteralPath $runRoot) { throw 'Preserve the prior run; use a new RunId' }
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null
$linuxRoot = '/mnt/e/projects/worktrees/poms-r4f-cost-governance/poms'
$baseline = '756d813c9578090fcf8e56821acce01b46b40420'
function Get-Inputs {
    $inputs = @(
        Get-ChildItem -LiteralPath (Join-Path $taskRoot 'apps/poms-api-rust/src/project_cost_governance') -Filter '*.rs'
        Get-ChildItem -LiteralPath 'E:/projects/worktrees/poms-r4e-cost-base/poms/apps/poms-api-rust/src/project_actual_cost' -Filter '*.rs'
        Get-Item -LiteralPath (Join-Path $taskRoot 'apps/poms-api-rust/src/lib.rs')
        Get-Item -LiteralPath (Join-Path $taskRoot 'apps/poms-api-rust/src/contract_support/mod.rs')
    )
    @($inputs | Sort-Object FullName | ForEach-Object {
        [ordered]@{ path = $_.FullName; bytes = $_.Length; rawBytesSha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
    })
}
$before = Get-Inputs
$checks = [Collections.Generic.List[object]]::new()
function Invoke-LocalCheck {
    param([string]$Name, [string[]]$NativeArguments)
    $logPath = Join-Path $runRoot ($Name + '.stdout.log')
    [IO.File]::WriteAllBytes($logPath, [byte[]]@())
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & wsl.exe @NativeArguments 2>&1 | Tee-Object -FilePath $logPath | Out-Host
    $exitStatus = $LASTEXITCODE
    $checks.Add([ordered]@{ name = $Name; startedAt = $started; finishedAt = [DateTimeOffset]::UtcNow.ToString('o'); exitCode = $exitStatus; argv = $NativeArguments; log = $logPath; rawBytesSha256 = (Get-FileHash -LiteralPath $logPath -Algorithm SHA256).Hash.ToLowerInvariant() })
    return $exitStatus
}
$commonArgs = @('-d','Debian','--','env',
    'CARGO_HOME=/home/wangzishi/.cache/poms-r4def-cargo-home',
    'CARGO_TARGET_DIR=/home/wangzishi/.cache/poms-r4def-target-F',
    'CARGO_BUILD_JOBS=2',
    'PATH=/home/wangzishi/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin')
$fmtArgs = $commonArgs + @('/home/wangzishi/.cargo/bin/rustfmt','+1.99.1','--edition','2024','--check',($linuxRoot + '/apps/poms-api-rust/src/project_cost_governance/mod.rs'))
$fmt = Invoke-LocalCheck -Name 'rustfmt' -NativeArguments $fmtArgs
$testArgs = $commonArgs + @('/home/wangzishi/.cargo/bin/cargo','+1.99.1','test','--offline','--manifest-path',($linuxRoot + '/apps/poms-api-rust/Cargo.toml'),'--lib','project_cost_governance','--','--nocapture')
$test = Invoke-LocalCheck -Name 'test' -NativeArguments $testArgs
if ($Clippy) {
    $clippyArgs = $commonArgs + @('/home/wangzishi/.cargo/bin/cargo','+1.99.1','clippy','--offline','--manifest-path',($linuxRoot + '/apps/poms-api-rust/Cargo.toml'),'--lib','--no-deps','--','-D','warnings')
    $lint = Invoke-LocalCheck -Name 'clippy' -NativeArguments $clippyArgs
}
$after = Get-Inputs
$changed = @()
for ($index = 0; $index -lt $before.Count; $index++) {
    $same = @($after | Where-Object { $_.path -eq $before[$index].path -and $_.rawBytesSha256 -eq $before[$index].rawBytesSha256 })
    if ($same.Count -ne 1) { $changed += $before[$index].path }
}
$result = [ordered]@{
    kind = 'R4F-author-isolated-pure-checks'; baseCommit = $baseline; runId = $RunId
    checks = $checks; inputsBefore = $before; inputsAfter = $after; changedDuringRun = $changed
    sharedDatabaseExecuted = $false; httpExecuted = $false; migrationExecuted = $false
    independentG3 = 'not-run'; G4 = 'not-run'
    rootOwnedCompilerScaffolding = @('apps/poms-api-rust/src/lib.rs','apps/poms-api-rust/src/contract_support/mod.rs')
    note = 'Root temporary lib imports the real E module by its WSL path; not part of the F product delivery.'
}
$result | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath (Join-Path $runRoot 'receipt.json') -Encoding utf8NoBOM
Write-Host ('Receipt: ' + (Join-Path $runRoot 'receipt.json'))
if ($changed.Count -ne 0) { exit 2 }
if (@($checks | Where-Object { $_.exitCode -ne 0 }).Count -ne 0) { exit 1 }
exit 0
