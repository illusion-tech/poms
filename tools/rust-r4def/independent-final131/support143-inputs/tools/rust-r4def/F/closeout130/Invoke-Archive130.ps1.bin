[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $Root,
    [Parameter(Mandatory)] [string] $PlanPath,
    [Parameter(Mandatory)] [string] $FactsPath,
    [switch] $Apply
)
. (Join-Path $PSScriptRoot 'Common130.ps1')
$policy = Read-Json130 (Join-Path $PSScriptRoot 'policy130.json')
$plan = Read-Json130 $PlanPath
$facts = Read-Json130 $FactsPath
Assert-Root130 $Root $policy
Assert-Facts130 $Root $facts 'Ready'
Assert-Plan130 $Root $plan $policy
$mapRelative = 'docs/design/archive/slices/rust-r4def/archive-origin-map130.json'
$journalRelative = 'docs/design/archive/slices/rust-r4def/archive-journal130.json'
$mapPath = Resolve-Path130 $Root $mapRelative
$journalPath = Resolve-Path130 $Root $journalRelative
if ((Test-Path -LiteralPath $mapPath) -or (Test-Path -LiteralPath $journalPath)) { throw 'Archive map/journal already exists; no overwrite' }
if (-not $Apply) {
    [pscustomobject]@{ kind='verified-only-no-mutation'; entries=$plan.entries.Count; planSha256=(Get-Sha130 $PlanPath); applyRequired=$true } | ConvertTo-Json
    return
}
$completed = [Collections.Generic.List[object]]::new()
$journal = @{ kind='R4DEF-closeout130-archive-journal'; stage='Partial'; planRawBytesSha256=(Get-Sha130 $PlanPath); factsRawBytesSha256=(Get-Sha130 $FactsPath); completed=@() }
$null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($journalPath)) -Force
try {
    [IO.File]::WriteAllText($journalPath, ($journal | ConvertTo-Json -Depth 100), [Text.UTF8Encoding]::new($false))
    # Freeze/copy public tmp observations first. Never remove or move tmp evidence.
    foreach ($entry in ($plan.entries | Sort-Object @{Expression={ if ($_.operation -eq 'copy') { 0 } else { 1 } }}, logicalOrigin)) {
        Assert-Allowed130 $Root $entry $policy
        $source = Resolve-Path130 $Root $entry.logicalOrigin
        $destination = Resolve-Path130 $Root $entry.storedAt
        if (Test-Path -LiteralPath $destination) { throw "Destination appeared: $($entry.storedAt)" }
        $null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($destination)) -Force
        if ($entry.operation -eq 'move') { Move-Item -LiteralPath $source -Destination $destination -ErrorAction Stop }
        else { Copy-Item -LiteralPath $source -Destination $destination -ErrorAction Stop }
        if ((Get-Item -LiteralPath $destination).Length -ne $entry.bytes -or (Get-Sha130 $destination) -cne $entry.rawBytesSha256) { throw "Destination byte mismatch: $($entry.storedAt)" }
        $completed.Add($entry)
        $journal.completed = @($completed.ToArray())
        [IO.File]::WriteAllText($journalPath, ($journal | ConvertTo-Json -Depth 100), [Text.UTF8Encoding]::new($false))
    }
    $map = @{ kind='actual-raw-byte-preserving-R4DEF-lifecycle-archive'; createdAt=[DateTime]::UtcNow.ToString('o'); implementationCommit=$facts.implementationCommit; permanentS4=$facts.permanentS4; planRawBytesSha256=(Get-Sha130 $PlanPath); factsRawBytesSha256=(Get-Sha130 $FactsPath); origins=$completed.ToArray(); tmpRemoved=$false; historicalLabelsReclassified=$false }
    [IO.File]::WriteAllText($mapPath, ($map | ConvertTo-Json -Depth 100), [Text.UTF8Encoding]::new($false))
    $journal.stage = 'ArchivedRawBytesVerified'
    $journal.originMapRawBytesSha256 = Get-Sha130 $mapPath
    [IO.File]::WriteAllText($journalPath, ($journal | ConvertTo-Json -Depth 100), [Text.UTF8Encoding]::new($false))
    [pscustomobject]@{ kind='archive-applied'; origins=$completed.Count; map=$mapRelative; rawBytesSha256=(Get-Sha130 $mapPath); G4Certified=$false } | ConvertTo-Json
} catch {
    $journal.stage = 'FailedPartial'
    $journal.error = $_.Exception.Message
    $journal.completed = @($completed.ToArray())
    [IO.File]::WriteAllText($journalPath, ($journal | ConvertTo-Json -Depth 100), [Text.UTF8Encoding]::new($false))
    throw
}
