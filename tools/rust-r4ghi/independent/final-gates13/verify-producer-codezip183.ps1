$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$workspace183 = 'E:\projects\worktrees\poms-r3hijk-next28\poms'
$source183 = Join-Path $workspace183 'docs/design/rust-r4ghi/retention/final12-source140/sources.json'
$zipPath183 = Join-Path $workspace183 'docs/design/rust-r4ghi/retention/final12-source140/source-packet.zip'
if ((Get-FileHash -LiteralPath $source183 -Algorithm SHA256).Hash.ToLowerInvariant() -cne '28a8af77dcad73ee0aba28458c2cdadce4fcd8cff02cc68525f7ee52936b599c') { throw 'Source manifest pin' }
if ((Get-FileHash -LiteralPath $zipPath183 -Algorithm SHA256).Hash.ToLowerInvariant() -cne '7b18c4f00fa9c0d94cb6ca46ce70c88201eb777c8b07cf7bcad4cebe79868853') { throw 'Source zip pin' }
$manifest183 = Get-Content -Raw -LiteralPath $source183 | ConvertFrom-Json -AsHashtable
$zip183 = [IO.Compression.ZipFile]::OpenRead($zipPath183)
$verified183 = @()
try {
  if ($manifest183.files.Count -ne 406 -or $zip183.Entries.Count -ne 406) { throw 'Producer count mismatch' }
  foreach ($member183 in $manifest183.files) {
    $entry183 = $zip183.GetEntry($member183.file)
    if (-not $entry183) { throw 'Frozen member absent' }
    $stream183 = $entry183.Open()
    $memory183 = [IO.MemoryStream]::new()
    try { $stream183.CopyTo($memory183); $bytes183 = $memory183.ToArray() } finally { $stream183.Dispose(); $memory183.Dispose() }
    $digest183 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes183)).ToLowerInvariant()
    if ($digest183 -cne $member183.sha256) { throw ('Producer raw member mismatch: ' + $member183.file) }
    $verified183 += [ordered]@{file=$member183.file;sha256=$digest183;bytes=$bytes183.Length}
  }
} finally { $zip183.Dispose() }
$result183 = [ordered]@{kind='independent-complete-Source12-codeZIP-readback183';producerEpoch='g2-business12';sourceCount=406;sourcePinsSHA256='5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa';zipSHA256='7b18c4f00fa9c0d94cb6ca46ce70c88201eb777c8b07cf7bcad4cebe79868853';sourceManifestSHA256='28a8af77dcad73ee0aba28458c2cdadce4fcd8cff02cc68525f7ee52936b599c';all406RawMembersMatched=$true;files=$verified183;runtimeCertificationGranted=$false}
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'producer-codezip-readback183.json'), ($result183|ConvertTo-Json -Depth 12)+[Environment]::NewLine, [Text.UTF8Encoding]::new($false))
[ordered]@{verified=$verified183.Count;allMatched=$true;sourceDigest=$result183.sourcePinsSHA256}|ConvertTo-Json
