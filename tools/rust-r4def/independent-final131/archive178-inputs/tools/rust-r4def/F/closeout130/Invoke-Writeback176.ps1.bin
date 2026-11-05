[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $Root,
    [Parameter(Mandatory)] [string] $PlanPath,
    [Parameter(Mandatory)] [string] $FactsPath,
    [Parameter(Mandatory)] [ValidateSet('Ready','Final','Seal')] [string] $Stage,
    [Parameter(Mandatory)] [string] $OutputName,
    [string] $Python = 'python',
    [string] $PriorReceiptPath,
    [switch] $Apply
)
. (Join-Path $PSScriptRoot 'Common130.ps1')
$policy = Read-Json130 (Join-Path $PSScriptRoot 'policy130.json')
Assert-Root130 $Root $policy
$facts = Read-Json130 $FactsPath
Assert-Facts130 $Root $facts $Stage
if ([string]::IsNullOrWhiteSpace($facts.closedAt) -or $facts.closedAt -notmatch '^\d{4}-\d{2}-\d{2}T') { throw 'Root must provide actual closeout timestamp' }
$outputPath = Resolve-Path130 $PSScriptRoot $OutputName
if (Test-Path -LiteralPath $outputPath) { throw 'Use a new output directory; no candidate overwrite' }
$plan = Read-Json130 $PlanPath
if ($plan.policyRawBytesSha256 -cne (Get-Sha130 (Join-Path $PSScriptRoot 'policy130.json'))) { throw 'Policy changed; freeze a fresh plan' }
$mapPath = Resolve-Path130 $Root 'docs/design/archive/slices/rust-r4def/archive-origin-map130.json'
if (-not (Test-Path -LiteralPath $mapPath -PathType Leaf)) { throw 'Actual raw archive must exist before active links can be replaced' }
$map = Read-Json130 $mapPath
if ($map.kind -cne 'actual-raw-byte-preserving-R4DEF-lifecycle-archive' -or $map.planRawBytesSha256 -cne (Get-Sha130 $PlanPath)) { throw 'Actual archive/plan mismatch' }
foreach ($entry in $map.origins) {
    $file = Resolve-Path130 $Root $entry.storedAt
    if (-not (Test-Path -LiteralPath $file -PathType Leaf) -or (Get-Item -LiteralPath $file).Length -ne $entry.bytes -or (Get-Sha130 $file) -cne $entry.rawBytesSha256) { throw "Archived bytes changed: $($entry.storedAt)" }
    if ($entry.operation -eq 'move' -and (Test-Path -LiteralPath (Resolve-Path130 $Root $entry.logicalOrigin))) { throw "Lifecycle still active: $($entry.logicalOrigin)" }
}
$planRelative = [IO.Path]::GetRelativePath($PSScriptRoot, [IO.Path]::GetFullPath($PlanPath))
$null = Resolve-Path130 $PSScriptRoot $planRelative
$arguments = @((Join-Path $PSScriptRoot 'prepare176.py'), '--render', $Stage, '--output', $OutputName, '--plan-name', $planRelative, '--facts', [IO.Path]::GetFullPath($FactsPath))
if ($PriorReceiptPath) { $arguments += @('--prior-receipt', [IO.Path]::GetFullPath($PriorReceiptPath)) }
& $Python @arguments
$renderExit = $LASTEXITCODE
if ($renderExit -ne 0) { throw "Writeback render failed: $renderExit" }
$rendered = Read-Json130 (Join-Path $outputPath 'writeback130.json')
if ($rendered.templateOnly -or $rendered.factsRawBytesSha256 -cne (Get-Sha130 $FactsPath)) { throw 'Rendered candidate lacks current actual facts' }
$allowed = (Read-Json130 (Join-Path $PSScriptRoot 'source-guards130.json')).files.logicalOrigin
foreach ($entry in $rendered.files) {
    if ($allowed -cnotcontains $entry.logicalOrigin) { throw 'Writeback escaped eight index documents' }
    $original = Resolve-Path130 $Root $entry.logicalOrigin
    $candidate = Resolve-Path130 $PSScriptRoot $entry.candidate
    if ((Get-Sha130 $original) -cne $entry.beforeRawBytesSha256 -or (Get-Sha130 $candidate) -cne $entry.afterRawBytesSha256) { throw "Writeback guard changed: $($entry.logicalOrigin)" }
}
if ($rendered.files.Count -ne 8) { throw 'Expected exactly eight writeback documents' }
if (-not $Apply) {
    [pscustomobject]@{kind='rendered-only-no-root-mutation'; stage=$Stage; candidates=$outputPath; applyRequired=$true} | ConvertTo-Json
    return
}
$completed = [Collections.Generic.List[object]]::new()
$receipt = @{ kind='R4DEF-closeout130-writeback-partial'; stage=$Stage; factsRawBytesSha256=(Get-Sha130 $FactsPath); files=@() }
$receiptPath = Join-Path $outputPath 'applied-receipt130.json'
try {
    foreach ($entry in $rendered.files) {
        $original = Resolve-Path130 $Root $entry.logicalOrigin
        $candidate = Resolve-Path130 $PSScriptRoot $entry.candidate
        if ((Get-Sha130 $original) -cne $entry.beforeRawBytesSha256) { throw "Source changed before write: $($entry.logicalOrigin)" }
        [IO.File]::WriteAllBytes($original, [IO.File]::ReadAllBytes($candidate))
        if ((Get-Sha130 $original) -cne $entry.afterRawBytesSha256) { throw "Applied bytes mismatch: $($entry.logicalOrigin)" }
        $completed.Add($entry)
    }
    $receipt.kind = 'R4DEF-closeout130-writeback-applied'
    $receipt.files = $completed.ToArray()
    [IO.File]::WriteAllText($receiptPath, ($receipt | ConvertTo-Json -Depth 100), [Text.UTF8Encoding]::new($false))
    [pscustomobject]@{kind=$receipt.kind; stage=$Stage; files=$completed.Count; receipt=$receiptPath} | ConvertTo-Json
} catch {
    $receipt.kind = 'R4DEF-closeout130-writeback-FailedPartial'
    $receipt.files = $completed.ToArray()
    $receipt.error = $_.Exception.Message
    [IO.File]::WriteAllText($receiptPath, ($receipt | ConvertTo-Json -Depth 100), [Text.UTF8Encoding]::new($false))
    throw
}
