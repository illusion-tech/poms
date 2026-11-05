param([ValidatePattern('^[0-9]{2}$')][string]$Attempt='02')
$ErrorActionPreference = 'Stop'
$k56Root = 'E:/projects/worktrees/poms-r4f-cost-governance/poms'
$k56Output = Join-Path $k56Root "tools/rust-r4def/F/K56/author-checks$Attempt"
if (Test-Path -LiteralPath $k56Output) { throw 'Refusing to overwrite existing author checks' }
[IO.Directory]::CreateDirectory($k56Output) | Out-Null
$k56Files = @(
    'apps/poms-api-rust/src/attachments/service.rs',
    'apps/poms-api-rust/src/attachments/store.rs',
    'apps/poms-api-rust/src/attachment_storage/registry.rs'
)
function Get-K56Fingerprints {
    @($k56Files | ForEach-Object {
        $k56Path = Join-Path $k56Root $_
        [ordered]@{file=$_; bytes=(Get-Item -LiteralPath $k56Path).Length; rawBytesSha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $k56Path).Hash.ToLowerInvariant()}
    })
}
$k56Before = Get-K56Fingerprints
$k56Commands = @()
$k56Passed = $true
foreach ($k56Mode in @('version','fmt-check','clippy','test','legacy-test')) {
    $k56Started = [DateTime]::UtcNow.ToString('o')
    $k56Log = Join-Path $k56Output "$k56Mode.log"
    [IO.File]::WriteAllBytes($k56Log,[byte[]]@())
    & wsl -d Debian -- bash /mnt/e/projects/worktrees/poms-r4f-cost-governance/poms/tools/rust-r4def/F/K56/check56.sh $k56Mode 2>&1 | Tee-Object -FilePath $k56Log
    $k56Exit = $LASTEXITCODE
    $k56Commands += [ordered]@{mode=$k56Mode; startedAtUtc=$k56Started; endedAtUtc=[DateTime]::UtcNow.ToString('o'); exitCode=$k56Exit; log=(Split-Path -Leaf $k56Log); logBytes=(Get-Item -LiteralPath $k56Log).Length; logRawBytesSha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $k56Log).Hash.ToLowerInvariant()}
    if ($k56Exit -ne 0) { $k56Passed = $false; break }
}
$k56After = Get-K56Fingerprints
$k56Stable = ($k56Before | ConvertTo-Json -Depth 6 -Compress) -ceq ($k56After | ConvertTo-Json -Depth 6 -Compress)
$k56Receipt = [ordered]@{
    kind='K56-actual-isolated-crate-author-check-receipt'
    passed=($k56Passed -and $k56Stable)
    sourceStableDuringChecks=$k56Stable
    sourceBefore=$k56Before
    sourceAfter=$k56After
    commands=$k56Commands
    compilerScope='Real application lib, Root-owned existing E module registration; no fake source producer'
    resourceScope='WSL Debian cargo +1.99.1 --offline, dedicated target-F, jobs2'
    actualPGExecuted=$false
    actualHTTPExecuted=$false
    actualObjectProviderIOExecuted=$false
    actualConcurrencyExecuted=$false
    S3Accepted=$false
}
[IO.File]::WriteAllText((Join-Path $k56Output 'receipt.json'),($k56Receipt|ConvertTo-Json -Depth 10)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
if (-not $k56Receipt.passed) { exit 1 }
