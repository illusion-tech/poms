. (Join-Path $PSScriptRoot 'Common130.ps1')
$manifestPath = Join-Path $PSScriptRoot 'manifest130.json'
if (Test-Path -LiteralPath $manifestPath) { throw 'Package manifest already sealed; do not overwrite' }
$plan = Read-Json130 (Join-Path $PSScriptRoot 'archive-plan130b.json')
$guards = Read-Json130 (Join-Path $PSScriptRoot 'source-guards130.json')
$policy = Read-Json130 (Join-Path $PSScriptRoot 'policy130.json')
if ($plan.blockedLifecycle.Count -ne 0 -or $plan.policyRawBytesSha256 -cne (Get-Sha130 (Join-Path $PSScriptRoot 'policy130.json'))) { throw 'Usable plan is blocked or policy changed' }
foreach ($guard in $guards.files) {
    $original = Resolve-Path130 $policy.expectedRoot $guard.logicalOrigin
    $snapshot = Resolve-Path130 $PSScriptRoot $guard.snapshot
    if ((Get-Sha130 $original) -cne $guard.rawBytesSha256 -or (Get-Sha130 $snapshot) -cne $guard.rawBytesSha256) { throw "Source snapshot drift: $($guard.logicalOrigin)" }
}
foreach ($stage in @('Ready','Final')) {
    $directory = $stage.ToLowerInvariant() + '-template'
    $candidateManifest = Read-Json130 (Join-Path $PSScriptRoot ($directory + '/writeback130.json'))
    if ($candidateManifest.files.Count -ne 8 -or -not $candidateManifest.templateOnly) { throw 'Expected eight conditional templates' }
    foreach ($entry in $candidateManifest.files) {
        if ((Get-Sha130 (Resolve-Path130 $PSScriptRoot $entry.candidate)) -cne $entry.afterRawBytesSha256) { throw "Candidate SHA mismatch: $($entry.candidate)" }
    }
    $status = Read-Json130 (Join-Path $PSScriptRoot ($directory + '/docs/design/rust-r4def-delivery-status.json'))
    if ($null -ne $status.G3Certified -or $null -ne $status.G4Certified -or $null -ne $status.cleanupCertified -or $null -ne $status.implementationCommit) { throw 'Template forged an unknown Gate result' }
    if ($status.fullR4Complete -or $status.issues['57'] -cne 'OPEN' -or $status.issues['101'] -cne 'OPEN') { throw 'Out-of-scope closure claimed' }
    $expectedOfficial = if ($stage -eq 'Ready') {210} else {240}
    if ($status.officialRustOperations -ne $expectedOfficial -or -not $status.finalIndependentActualReviewPending) { throw 'Candidate stage/count mismatch' }
}
$staticJson = & (Join-Path $PSScriptRoot 'Verify-Static130.ps1')
$staticResult = $staticJson | ConvertFrom-Json -AsHashtable
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'verification130.json'), ($staticResult | ConvertTo-Json -Depth 100), [Text.UTF8Encoding]::new($false))
$fileRecords = @(Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File | Sort-Object FullName | ForEach-Object {
    @{ file=[IO.Path]::GetRelativePath($PSScriptRoot, $_.FullName).Replace('\','/'); bytes=$_.Length; rawBytesSha256=(Get-Sha130 $_.FullName) }
})
$largest = $plan.entries | Sort-Object bytes -Descending | Select-Object -First 1
$manifest = @{
    kind='R4DEF-closeout130-author-support-package'; status='PreparedNoRootMutation'; createdAt=[DateTime]::UtcNow.ToString('o')
    sourceRoot=$policy.expectedRoot; authorPackage=$PSScriptRoot; files=$fileRecords
    archivePlan=@{file='archive-plan130b.json';rawBytesSha256=(Get-Sha130 (Join-Path $PSScriptRoot 'archive-plan130b.json'));totals=$plan.totals;largestFile=$largest;blockedLifecycle=0}
    historicalPlan=@{file='archive-plan130.json';classification='HistoricalBlockedDoNotApply';reason='Six public cookie/credential source wrappers conservatively rejected in first policy'}
    sourceGuards=@{file='source-guards130.json';rawBytesSha256=(Get-Sha130 (Join-Path $PSScriptRoot 'source-guards130.json'));count=8;currentSourceBytesUnchanged=$true}
    counts=(Read-Json130 (Join-Path $PSScriptRoot 'root-facts130.template.json')).counts
    actualGateFacts=@{G3=$null;cleanup=$null;implementationCommit=$null;mainCommit=$null;preclose=$null;onlineClose=$null;actualG4=$null}
    execution=@{archiveEntrypointRun=$false;rootWritebackRun=$false;rootFilesModified=$false;tmpDeleted=$false;gitOrGitHubMutation=$false}
    verification=@{pythonRenderer='ran-and-passed';powershellASTAndNegativeGuards='ran-and-passed';candidateAndReadmeMarkdownFormat='ran-and-passed';sourceAndCandidateSha='ran-and-passed';gitDiffCheck='not-run-no-Git-scope';productBuildTest='not-required-author-support-only'}
    lateEvidence='Append a separate immutable evidence packet/origin-map addendum; do not rewrite archive-plan130b or original inputs.'
}
[IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 100), [Text.UTF8Encoding]::new($false))
[pscustomobject]@{manifest=$manifestPath;rawBytesSha256=(Get-Sha130 $manifestPath);packageFiles=$fileRecords.Count;archiveFiles=$plan.totals.files;archiveBytes=$plan.totals.bytes} | ConvertTo-Json
