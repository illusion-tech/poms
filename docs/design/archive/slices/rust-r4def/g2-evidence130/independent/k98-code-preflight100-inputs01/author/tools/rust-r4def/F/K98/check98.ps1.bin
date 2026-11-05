param([ValidatePattern('^[0-9]{2}$')][string]$Attempt='01')
$ErrorActionPreference = 'Stop'
$k98Root = 'E:/projects/worktrees/poms-r4f-cost-governance/poms'
$k98Output = Join-Path $k98Root "tools/rust-r4def/F/K98/author-checks$Attempt"
if (Test-Path -LiteralPath $k98Output) { throw 'Refusing to overwrite existing author checks' }
[IO.Directory]::CreateDirectory($k98Output) | Out-Null
$k98Files = @(
    'apps/poms-api-rust/src/attachments/store.rs'
)
function Get-K98Fingerprints {
    @($k98Files | ForEach-Object {
        $k98Path = Join-Path $k98Root $_
        [ordered]@{file=$_; bytes=(Get-Item -LiteralPath $k98Path).Length; rawBytesSha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $k98Path).Hash.ToLowerInvariant()}
    })
}
$k98Before = Get-K98Fingerprints
$k98Commands = @()
$k98Passed = $true
foreach ($k98Mode in @('version','fmt-check','clippy','test','regression')) {
    $k98Started = [DateTime]::UtcNow.ToString('o')
    $k98Log = Join-Path $k98Output "$k98Mode.log"
    [IO.File]::WriteAllBytes($k98Log,[byte[]]@())
    & wsl -d Debian -- bash /mnt/e/projects/worktrees/poms-r4f-cost-governance/poms/tools/rust-r4def/F/K98/check98.sh $k98Mode 2>&1 | Tee-Object -FilePath $k98Log
    $k98Exit = $LASTEXITCODE
    $k98Commands += [ordered]@{mode=$k98Mode; startedAtUtc=$k98Started; endedAtUtc=[DateTime]::UtcNow.ToString('o'); exitCode=$k98Exit; log=(Split-Path -Leaf $k98Log); logBytes=(Get-Item -LiteralPath $k98Log).Length; logRawBytesSha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $k98Log).Hash.ToLowerInvariant()}
    if ($k98Exit -ne 0) { $k98Passed = $false; break }
}
$k98After = Get-K98Fingerprints
$k98Stable = ($k98Before | ConvertTo-Json -Depth 6 -Compress) -ceq ($k98After | ConvertTo-Json -Depth 6 -Compress)
$k98Receipt = [ordered]@{
    kind='K98-actual-isolated-crate-author-check-receipt'
    passed=($k98Passed -and $k98Stable)
    sourceStableDuringChecks=$k98Stable
    sourceBefore=$k98Before
    sourceAfter=$k98After
    commands=$k98Commands
    compilerScope='Real application lib, Root-owned existing E module registration; no fake source producer'
    resourceScope='WSL Debian cargo +1.99.1 --offline, dedicated target-F, jobs2'
    actualPGExecuted=$false
    actualHTTPExecuted=$false
    actualObjectProviderIOExecuted=$false
    actualConcurrencyExecuted=$false
    S3Accepted=$false
}
[IO.File]::WriteAllText((Join-Path $k98Output 'receipt.json'),($k98Receipt|ConvertTo-Json -Depth 10)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
if (-not $k98Receipt.passed) { exit 1 }
