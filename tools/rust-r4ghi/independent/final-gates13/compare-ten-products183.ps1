$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$workspace183 = 'E:\projects\worktrees\poms-r3hijk-next28\poms'
$reviewRoot183 = [IO.Path]::GetFullPath($PSScriptRoot)
$compositionPath183 = Join-Path $workspace183 'tools/rust-r4ghi/corrective-composed106/manifest106.json'
$sourceManifestPath183 = Join-Path $workspace183 'docs/design/rust-r4ghi/retention/final12-source140/sources.json'
$sourceZipPath183 = Join-Path $workspace183 'docs/design/rust-r4ghi/retention/final12-source140/source-packet.zip'
function Sha183([byte[]]$bytes183) { return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes183)).ToLowerInvariant() }
function AssertHash183([string]$file183, [string]$expected183) {
  if ((Get-FileHash -LiteralPath $file183 -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected183) { throw "Fixed file mismatch: $file183" }
}
function WriteReview183([string]$relative183, [byte[]]$bytes183) {
  $target183 = [IO.Path]::GetFullPath((Join-Path $reviewRoot183 $relative183))
  if (-not $target183.StartsWith($reviewRoot183 + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Review write escaped exclusive directory' }
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target183)) | Out-Null
  [IO.File]::WriteAllBytes($target183, $bytes183)
  return $target183
}
AssertHash183 $compositionPath183 '5adc6d8b0179b5d2505e318d24101d400fde725dfcd48384c4d8189143d97b27'
AssertHash183 $sourceManifestPath183 '28a8af77dcad73ee0aba28458c2cdadce4fcd8cff02cc68525f7ee52936b599c'
AssertHash183 $sourceZipPath183 '7b18c4f00fa9c0d94cb6ca46ce70c88201eb777c8b07cf7bcad4cebe79868853'
$composition183 = Get-Content -Raw -LiteralPath $compositionPath183 | ConvertFrom-Json -AsHashtable
$source183 = Get-Content -Raw -LiteralPath $sourceManifestPath183 | ConvertFrom-Json -AsHashtable
if ($composition183.files.Count -ne 10 -or $source183.files.Count -ne 406 -or $source183.epoch -cne 'g2-business12' -or $source183.sourcePinsSHA256 -cne '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa') { throw 'Fixed source scope mismatch' }
$sourceMap183 = @{}
foreach ($member183 in $source183.files) { $sourceMap183[$member183.file] = $member183.sha256 }
$zip183 = [IO.Compression.ZipFile]::OpenRead($sourceZipPath183)
$files183 = @()
try {
  if ($zip183.Entries.Count -ne 406) { throw 'Source package member count changed' }
  foreach ($file183 in $composition183.files) {
    $entry183 = $zip183.GetEntry($file183.file)
    $beforePath183 = $null
    $beforeLength183 = $null
    if ($null -eq $file183.beforeSHA256) {
      if ($entry183 -or $sourceMap183.ContainsKey($file183.file)) { throw 'New product path existed in frozen producer package' }
    } else {
      if (-not $entry183 -or $sourceMap183[$file183.file] -cne $file183.beforeSHA256) { throw 'Producer member pin mismatch' }
      $stream183 = $entry183.Open()
      $memory183 = [IO.MemoryStream]::new()
      try { $stream183.CopyTo($memory183); $beforeBytes183 = $memory183.ToArray() } finally { $stream183.Dispose(); $memory183.Dispose() }
      if ((Sha183 $beforeBytes183) -cne $file183.beforeSHA256) { throw 'Frozen producer raw member mismatch' }
      $beforePath183 = WriteReview183 ('source12-before183/' + $file183.file) $beforeBytes183
      $beforeLength183 = $beforeBytes183.Length
    }
    $productPath183 = Join-Path $workspace183 $file183.file
    $afterBytes183 = [IO.File]::ReadAllBytes($productPath183)
    if ((Sha183 $afterBytes183) -cne $file183.afterSHA256) { throw 'Current staged product differs from exact composition106' }
    $afterPath183 = WriteReview183 ('staged-after183/' + $file183.file) $afterBytes183
    $files183 += [ordered]@{file=$file183.file;beforeSHA256=$file183.beforeSHA256;afterSHA256=$file183.afterSHA256;beforeAbsent=($null -eq $file183.beforeSHA256);beforePath=$beforePath183;beforeBytes=$beforeLength183;afterPath=$afterPath183;afterBytes=$afterBytes183.Length}
  }
} finally { $zip183.Dispose() }
$result183 = [ordered]@{
  kind='bounded-ten-product-raw-precomparison183'
  producerEpoch='g2-business12'
  producerSourcePinsSHA256='5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa'
  consumerEpoch=$null
  expectedFutureConsumerEpoch='g2-business13'
  consumerSourcePinsSHA256=$null
  isActualCompleteSourceComparisonReceipt=$false
  finalSource13H0OrB0Frozen=$false
  M98ExecutedByReviewer=$false
  GateCertified=$false
  scope='Only exact composition106 ten products; full final source/helper/migration comparison remains required'
  files=$files183
}
$json183 = $result183 | ConvertTo-Json -Depth 15
[IO.File]::WriteAllText((Join-Path $reviewRoot183 'product-raw-precomparison183.json'), $json183 + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
[ordered]@{products=$files183.Count;modified=@($files183|Where-Object {-not $_.beforeAbsent}).Count;added=@($files183|Where-Object beforeAbsent).Count;scope=$result183.scope;consumerDigest=$null}|ConvertTo-Json -Depth 5
