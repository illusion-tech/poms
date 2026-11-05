$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$archiveRoot = Join-Path $PSScriptRoot 'source-originals25'
if (Test-Path -LiteralPath $archiveRoot) { throw 'Preserve the existing original archive' }
$deliveryPath = Join-Path $PSScriptRoot 'delivery01.json'
$delivery = Get-Content -LiteralPath $deliveryPath -Raw | ConvertFrom-Json
$pins = @($delivery.productFiles | ForEach-Object {
    $source = Join-Path $taskRoot $_.file
    $hash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hash -ne $_.rawBytesSha256) { throw ('Original source does not match delivery01: ' + $_.file) }
    [ordered]@{ file = $_.file; archiveFile = ([IO.Path]::GetFileName($source) + '.bin'); bytes = (Get-Item -LiteralPath $source).Length; rawBytesSha256 = $hash }
})
if ($pins.Count -ne 6) { throw 'Expected exactly six original F source files' }
New-Item -ItemType Directory -Path $archiveRoot | Out-Null
foreach ($pin in $pins) {
    $source = Join-Path $taskRoot $pin.file
    $destination = Join-Path $archiveRoot $pin.archiveFile
    Copy-Item -LiteralPath $source -Destination $destination -ErrorAction Stop
    if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $pin.rawBytesSha256) { throw 'Archive copy hash mismatch' }
}
$preserved = @('delivery01.json', 'HANDOFF.md', 'build-delivery01.py', 'run-author-checks01.ps1', 'build/author-checks03/receipt.json') | ForEach-Object {
    $path = Join-Path $PSScriptRoot $_
    [ordered]@{ file = ('tools/rust-r4def/F/' + $_); bytes = (Get-Item -LiteralPath $path).Length; rawBytesSha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() }
}
[ordered]@{
    kind = 'R4F-pre-integration-correction25-originals'
    capturedAt = [DateTimeOffset]::UtcNow.ToString('o')
    baseCommit = '756d813c9578090fcf8e56821acce01b46b40420'
    reason = 'Root preflight22 precision/status/safe-audit corrections; old author evidence remains unchanged'
    productFiles = $pins
    preservedArtifacts = @($preserved)
} | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $archiveRoot 'manifest.json') -Encoding utf8NoBOM
Write-Host ('Archived six exact delivery01 sources: ' + $archiveRoot)
