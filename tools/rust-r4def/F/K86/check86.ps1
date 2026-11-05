param([ValidatePattern('^[0-9]{2}$')][string]$Attempt='01')
$ErrorActionPreference = 'Stop'
$k86Root = 'E:/projects/worktrees/poms-r4f-cost-governance/poms'
$k86Output = Join-Path $k86Root "tools/rust-r4def/F/K86/author-checks$Attempt"
if (Test-Path -LiteralPath $k86Output) { throw 'Refusing to overwrite existing author checks' }
[IO.Directory]::CreateDirectory($k86Output) | Out-Null
$k86Files = @(
    'apps/poms-api-rust/src/attachments/service.rs',
    'apps/poms-api-rust/src/attachments/store.rs'
)
function Get-K86Fingerprints {
    @($k86Files | ForEach-Object {
        $k86Path = Join-Path $k86Root $_
        [ordered]@{file=$_; bytes=(Get-Item -LiteralPath $k86Path).Length; rawBytesSha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $k86Path).Hash.ToLowerInvariant()}
    })
}
$k86Before = Get-K86Fingerprints
$k86Commands = @()
$k86Passed = $true
foreach ($k86Mode in @('version','fmt-check','clippy','test','regression')) {
    $k86Started = [DateTime]::UtcNow.ToString('o')
    $k86Log = Join-Path $k86Output "$k86Mode.log"
    [IO.File]::WriteAllBytes($k86Log,[byte[]]@())
    & wsl -d Debian -- bash /mnt/e/projects/worktrees/poms-r4f-cost-governance/poms/tools/rust-r4def/F/K86/check86.sh $k86Mode 2>&1 | Tee-Object -FilePath $k86Log
    $k86Exit = $LASTEXITCODE
    $k86Commands += [ordered]@{mode=$k86Mode; startedAtUtc=$k86Started; endedAtUtc=[DateTime]::UtcNow.ToString('o'); exitCode=$k86Exit; log=(Split-Path -Leaf $k86Log); logBytes=(Get-Item -LiteralPath $k86Log).Length; logRawBytesSha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $k86Log).Hash.ToLowerInvariant()}
    if ($k86Exit -ne 0) { $k86Passed = $false; break }
}
$k86After = Get-K86Fingerprints
$k86Stable = ($k86Before | ConvertTo-Json -Depth 6 -Compress) -ceq ($k86After | ConvertTo-Json -Depth 6 -Compress)
$k86Receipt = [ordered]@{
    kind='K86-actual-isolated-crate-author-check-receipt'
    passed=($k86Passed -and $k86Stable)
    sourceStableDuringChecks=$k86Stable
    sourceBefore=$k86Before
    sourceAfter=$k86After
    commands=$k86Commands
    compilerScope='Real application lib, Root-owned existing E module registration; no fake source producer'
    resourceScope='WSL Debian cargo +1.99.1 --offline, dedicated target-F, jobs2'
    actualPGExecuted=$false
    actualHTTPExecuted=$false
    actualObjectProviderIOExecuted=$false
    actualConcurrencyExecuted=$false
    S3Accepted=$false
}
[IO.File]::WriteAllText((Join-Path $k86Output 'receipt.json'),($k86Receipt|ConvertTo-Json -Depth 10)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
if (-not $k86Receipt.passed) { exit 1 }
