[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $Root,
    [Parameter(Mandatory)] [string] $PlanPath,
    [Parameter(Mandatory)] [string] $FactsPath,
    [Parameter(Mandatory)] [ValidatePattern('^[0-9a-f]{64}$')] [string] $ExpectedFactsSha256,
    [switch] $Apply
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Pin the immutable 130 dependencies before loading executable shared code.
$dependencyPins = @{
    'Common130.ps1' = 'c61ec76955c9c5c629f898f3894f744d8bfd6ab1e1c861ed1c570a4f83d4902c'
    'policy130.json' = '34c95843ec0bd198ccd5a5748986e15f18e266da49a38d662d6d916a2abf9519'
}
foreach ($name in $dependencyPins.Keys) {
    $file = Join-Path $PSScriptRoot $name
    if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -cne $dependencyPins[$name]) {
        throw "Immutable dependency changed: $name"
    }
}
. (Join-Path $PSScriptRoot 'Common130.ps1')
$expectedPlanSha256 = 'd3ca0043ebaa924cbdf67177febf8f4a02dea8b9e0a858e3f2c88642c5ff5af9'
if (-not [IO.Path]::IsPathRooted($Root)) { throw 'Root must be an absolute path' }
$Root = [IO.Path]::GetFullPath($Root).TrimEnd([char[]]@('\', '/'))
if ((Get-Sha130 $PlanPath) -cne $expectedPlanSha256) { throw 'Only immutable archive-plan130b original bytes are admitted' }
if ((Get-Sha130 $FactsPath) -cne $ExpectedFactsSha256) { throw 'Actual Root facts SHA mismatch' }
$policy = Read-Json130 (Join-Path $PSScriptRoot 'policy130.json')
$plan = Read-Json130 $PlanPath
$facts = Read-Json130 $FactsPath
Assert-Root130 $Root $policy
Assert-Facts130 $Root $facts 'Ready'

# Full source/target/closed-world preflight precedes every filesystem mutation.
Assert-Plan130 $Root $plan $policy
$mapRelative = 'docs/design/archive/slices/rust-r4def/archive-origin-map130.json'
$summaryRelative = 'docs/design/archive/slices/rust-r4def/archive-journal130.json'
$progressRelative = 'docs/design/archive/slices/rust-r4def/archive-progress130c.jsonl'
$startRelative = 'docs/design/archive/slices/rust-r4def/archive-start130c.json'
$failureRelative = 'docs/design/archive/slices/rust-r4def/archive-failed-partial130c.json'
$mapPath = Resolve-Path130 $Root $mapRelative
$summaryPath = Resolve-Path130 $Root $summaryRelative
$progressPath = Resolve-Path130 $Root $progressRelative
$startPath = Resolve-Path130 $Root $startRelative
$failurePath = Resolve-Path130 $Root $failureRelative
foreach ($file in @($mapPath, $summaryPath, $progressPath, $startPath, $failurePath)) {
    if (Test-Path -LiteralPath $file) { throw "Archive receipt/log already exists; reconcile explicitly: $file" }
}
if ((Get-Sha130 $FactsPath) -cne $ExpectedFactsSha256) { throw 'Actual facts changed during preflight' }
if (-not $Apply) {
    [pscustomobject]@{kind='verified-only-no-mutation'; entries=$plan.entries.Count; planSha256=$expectedPlanSha256; factsSha256=$ExpectedFactsSha256; applyRequired=$true} | ConvertTo-Json
    return
}

function Write-JsonOnce130c([string] $Path, $Value) {
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($Value | ConvertTo-Json -Depth 100) + "`n")
    $fileStream = [IO.FileStream]::new($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try {
        $fileStream.Write($bytes, 0, $bytes.Length)
        $fileStream.Flush($true)
    } finally { $fileStream.Dispose() }
}

$completed = [Collections.Generic.List[object]]::new()
$completedBytes = [long]0
$copied = 0
$moved = 0
$phase = 'Starting'
$inFlight = $null
$progressStream = $null
$failure = $null
$startedAt = [DateTime]::UtcNow.ToString('o')
try {
    $null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($progressPath)) -Force
    Write-JsonOnce130c $startPath @{
        kind='R4DEF-130c-immutable-archive-start'; stage='StartedNotCompletionProof'; startedAt=$startedAt
        planRawBytesSha256=$expectedPlanSha256; factsRawBytesSha256=$ExpectedFactsSha256; plannedFiles=$plan.entries.Count
        completionRequires=$summaryRelative; progress=$progressRelative
    }
    # CreateNew refuses an existing log. There is no Seek, SetLength or rewrite.
    $progressStream = [IO.FileStream]::new($progressPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $lineEncoding = [Text.UTF8Encoding]::new($false)
    # Two ordered passes are O(N); tmp copies complete before lifecycle moves.
    foreach ($operation in @('copy', 'move')) {
        foreach ($entry in $plan.entries) {
            if ($entry.operation -cne $operation) { continue }
            $phase = 'SourceGuard'
            $inFlight = @{entry=$entry; stagedAt=$null; operationStarted=$false; destinationVerified=$false; completionLineDurable=$false}
            Assert-Allowed130 $Root $entry $policy
            $source = Resolve-Path130 $Root $entry.logicalOrigin
            $destination = Resolve-Path130 $Root $entry.storedAt
            if (Test-Path -LiteralPath $destination) { throw "Destination appeared: $($entry.storedAt)" }
            $null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($destination)) -Force
            $phase = 'Applying'
            $inFlight.operationStarted = $true
            if ($operation -eq 'move') {
                # File-system Move-Item without Force refuses an existing file.
                Move-Item -LiteralPath $source -Destination $destination -ErrorAction Stop
            } else {
                # Copy-Item can overwrite an existing destination by default. Copy
                # into a new GUID-named stage, then install by no-Force Move-Item.
                $stageRelative = $entry.storedAt + '.copy-stage130c-' + [Guid]::NewGuid().ToString('N')
                $stagePath = Resolve-Path130 $Root $stageRelative
                if (Test-Path -LiteralPath $stagePath) { throw "Stage unexpectedly exists: $stageRelative" }
                $inFlight.stagedAt = $stageRelative
                Copy-Item -LiteralPath $source -Destination $stagePath -ErrorAction Stop
                if ((Get-Item -LiteralPath $stagePath).Length -ne $entry.bytes -or (Get-Sha130 $stagePath) -cne $entry.rawBytesSha256) {
                    throw "Staged copy byte mismatch: $($entry.logicalOrigin)"
                }
                if (Test-Path -LiteralPath $destination) { throw "Destination appeared before install: $($entry.storedAt)" }
                Move-Item -LiteralPath $stagePath -Destination $destination -ErrorAction Stop
            }
            $phase = 'DestinationGuard'
            if ((Get-Item -LiteralPath $destination).Length -ne $entry.bytes -or (Get-Sha130 $destination) -cne $entry.rawBytesSha256) {
                throw "Destination byte mismatch: $($entry.storedAt)"
            }
            $inFlight.destinationVerified = $true
            $phase = 'PersistingCompletionLine'
            $record = @{kind='R4DEF-130c-archive-entry-success'; sequence=$completed.Count + 1; completedAt=[DateTime]::UtcNow.ToString('o'); entry=$entry}
            $line = $lineEncoding.GetBytes(($record | ConvertTo-Json -Depth 100 -Compress) + "`n")
            $progressStream.Write($line, 0, $line.Length)
            $progressStream.Flush($true)
            $inFlight.completionLineDurable = $true
            $completed.Add($entry)
            $completedBytes += [long]$entry.bytes
            if ($operation -eq 'copy') { $copied++ } else { $moved++ }
            $inFlight = $null
        }
    }
    $phase = 'FinalFactsGuard'
    if ((Get-Sha130 $FactsPath) -cne $ExpectedFactsSha256) { throw 'Actual facts changed during archive' }
    $progressStream.Dispose()
    $progressStream = $null
    $progressSha256 = Get-Sha130 $progressPath
    $phase = 'WritingOriginMapOnce'
    Write-JsonOnce130c $mapPath @{
        kind='actual-raw-byte-preserving-R4DEF-lifecycle-archive'; writer='Invoke-Archive130c.ps1'; createdAt=[DateTime]::UtcNow.ToString('o')
        implementationCommit=$facts.implementationCommit; permanentS4=$facts.permanentS4
        planRawBytesSha256=$expectedPlanSha256; factsRawBytesSha256=$ExpectedFactsSha256; origins=$completed.ToArray()
        completionLog=@{file=$progressRelative;rawBytesSha256=$progressSha256;records=$completed.Count}
        tmpRemoved=$false; historicalLabelsReclassified=$false
    }
    $phase = 'WritingSummaryOnce'
    Write-JsonOnce130c $summaryPath @{
        kind='R4DEF-closeout130c-archive-summary'; stage='ArchivedRawBytesVerified'; startedAt=$startedAt; completedAt=[DateTime]::UtcNow.ToString('o')
        planRawBytesSha256=$expectedPlanSha256; factsRawBytesSha256=$ExpectedFactsSha256
        completedFiles=$completed.Count; completedBytes=$completedBytes; copiedFiles=$copied; movedFiles=$moved
        originMap=@{file=$mapRelative;rawBytesSha256=(Get-Sha130 $mapPath)}
        completionLog=@{file=$progressRelative;rawBytesSha256=$progressSha256;records=$completed.Count}
        startMarker=$startRelative; G4Certified=$false
    }
} catch {
    $failure = $_
    if ($null -ne $progressStream) { $progressStream.Dispose(); $progressStream = $null }
    # Failure metadata never duplicates or rewrites the accumulated completion log.
    # An in-flight entry can have moved before its log line became durable; retain
    # that exact entry/phase/stage path for explicit reconciliation.
    try {
        Write-JsonOnce130c $failurePath @{
            kind='R4DEF-closeout130c-archive-failure'; stage='FailedPartial'; failedAt=[DateTime]::UtcNow.ToString('o')
            phase=$phase; error=$failure.Exception.Message; completedDurableRecords=$completed.Count; completedBytes=$completedBytes
            planRawBytesSha256=$expectedPlanSha256; factsRawBytesSha256=$ExpectedFactsSha256
            startMarker=$startRelative; completionLog=$progressRelative; inFlight=$inFlight
            originMapMayExist=(Test-Path -LiteralPath $mapPath); summaryMayExist=(Test-Path -LiteralPath $summaryPath)
            noAutomaticRollback=$true; G4Certified=$false
        }
    } catch {
        Write-Warning "Failure receipt could not be created without overwrite: $($_.Exception.Message). Retain start/log and inspect $phase."
    }
} finally {
    if ($null -ne $progressStream) { $progressStream.Dispose() }
}
if ($null -ne $failure) { throw $failure }
[pscustomobject]@{kind='archive-applied'; writer='130c'; origins=$completed.Count; bytes=$completedBytes; map=$mapRelative; rawBytesSha256=(Get-Sha130 $mapPath); completionLog=$progressRelative; G4Certified=$false} | ConvertTo-Json
