$ErrorActionPreference = 'Stop'
# Reviewer-owned fixed-FS reader: no Root helper/current dist/live state/SQL/HTTP/service calls.
$privateBase162 = '\\wsl.localhost\Debian\home\wangzishi\.local\share\poms-r4ghi\private\'
$linuxBase162 = '/home/wangzishi/.local/share/poms-r4ghi/private/'
$receiptInputs162 = @(
  @('tmp/rust-r4ghi/root/ui-runtime14/role18-source12-03/receipt18-05.json', '4a63f6c2a1f031c8796a3bbb6d095b6d2b55652dcc739b1fd85c37f6fa4cfeb3'),
  @('tmp/rust-r4ghi/root/ui-runtime14/expense18-source12-02/receipt18-04.json', 'e5af97c68eb02c554dce90f18ae75306f7a5c3ecedfc19522324467e1342b882'),
  @('tmp/rust-r4ghi/root/ui-runtime14/role18-source12-frozen01/receipt18-05.json', '75a4afd447ae0b85cd1380292a982c67b6bab76219dd299e6a84b1f969d4e747'),
  @('tmp/rust-r4ghi/root/ui-runtime14/gh18-source12-02/receipt18-06.json', 'f999ef43fa6c2b2bf82aafd21cade195c9aba906739c60516ff0b1592d4770a9'),
  @('tmp/rust-r4ghi/root/ui-runtime14/lifecycle18-source12-01/receipt18-03.json', '897264dadbdbbe851372447cb30ec451afafd6d3c589f6194e2cb3701d3262c2'),
  @('tmp/rust-r4ghi/root/ui-runtime14/gh18-source12-03/receipt18-06.json', 'cd59d801d6380843207863dcfa2a7bd1528dcad9d43b5c070bc8052f3721395f'),
  @('tmp/rust-r4ghi/root/ui-runtime14/lifecycle18-source12-02/receipt18-03.json', '14a66bdd00019794534b739ce321a2d364f3036c9b1caadb41416fbb1e88962f'),
  @('tmp/rust-r4ghi/root/ui-runtime14/gh18-source12-04/receipt18-06.json', '66c3bb8bde03a443304f6fedb89082383b47f39c9762a2dd94912516ca54b00e')
)
function Hash162([string]$path162) {
  return (Get-FileHash -LiteralPath $path162 -Algorithm SHA256).Hash.ToLowerInvariant()
}
function AssertPin162([string]$path162, [string]$expected162) {
  if ((Hash162 $path162) -cne $expected162) { throw "Immutable file mismatch: $path162" }
}
function Private162([string]$path162) {
  if (-not $path162.StartsWith($linuxBase162, [StringComparison]::Ordinal)) { throw 'Unexpected private root' }
  return $privateBase162 + $path162.Substring($linuxBase162.Length).Replace('/', '\')
}
function ShaBytes162([byte[]]$bytes162) {
  return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes162)).ToLowerInvariant()
}
function SafePath162([string]$path162) {
  $parts162 = $path162 -split '\?', 2
  $base162 = $parts162[0] -replace '(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '{uuid}'
  if ($parts162.Count -eq 1) { return $base162 }
  $keys162 = @($parts162[1] -split '&' | ForEach-Object { ($_ -split '=', 2)[0] } | Sort-Object)
  return $base162 + '?' + ($keys162 -join '&')
}
$operationMap162 = 'tools/rust-r4ghi/independent/final-gates13/operation-checklist13.json'
AssertPin162 $operationMap162 '8e7abf1ddf70ab3837ef2bb11d640251f381e7ceed2a452f8f81b276470b4cb3'
$operations162 = (Get-Content -Raw -LiteralPath $operationMap162 | ConvertFrom-Json -AsHashtable).operations
$modernWrites162 = @($operations162 | Where-Object method -ne 'GET' | ForEach-Object operationId)
$runResults162 = @()
$commandResults162 = @()
$allRawPins162 = @()
$gh04Ledgers162 = @()
$gh04Artifacts162 = @()
foreach ($input162 in $receiptInputs162) {
  AssertPin162 $input162[0] $input162[1]
  $receipt162 = Get-Content -Raw -LiteralPath $input162[0] | ConvertFrom-Json -AsHashtable
  if ($receipt162.exchanges.Count -ne $receipt162.observerReceipts.Count) { throw 'Observer count mismatch' }
  $counts162 = [ordered]@{}
  $modernCount162 = 0
  foreach ($exchange162 in $receipt162.exchanges) {
    $rawName162 = $exchange162.privateRaw.file
    if ($rawName162 -notmatch '^http-[0-9]{4}\.json$') { throw 'Unsafe raw exchange basename' }
    $path162 = $privateBase162 + 'ui\runtime14\' + $receipt162.uiRun + '\http\' + $rawName162
    AssertPin162 $path162 $exchange162.privateRaw.rawBytesSha256
    if ((Get-Item -LiteralPath $path162).Length -ne $exchange162.privateRaw.bytes) { throw 'Raw byte count mismatch' }
    $raw162 = Get-Content -Raw -LiteralPath $path162 | ConvertFrom-Json -AsHashtable
    if ($raw162.failure -or -not $raw162.response.complete) { throw 'Incomplete raw exchange' }
    if ($raw162.request.method -cne $exchange162.method -or $raw162.response.status -ne $exchange162.status) { throw 'Raw method/status mismatch' }
    if ((SafePath162 $raw162.request.path) -cne (SafePath162 $exchange162.path)) { throw ('Raw path mismatch: ' + (SafePath162 $raw162.request.path)) }
    $responseBytes162 = [Convert]::FromBase64String($raw162.response.bodyBase64)
    if ($responseBytes162.Length -ne $raw162.response.bodyBytes) { throw 'Response body size mismatch' }
    if ((ShaBytes162 $responseBytes162) -cne $raw162.response.bodySHA256) { throw 'Response body digest mismatch' }
    $observer162 = $receipt162.observerReceipts[$exchange162.index]
    if ($observer162.ledger.rawBytesSha256 -cne $exchange162.ledger.rawBytesSha256 -or $observer162.status -ne $exchange162.status) { throw 'Observer/ledger linkage mismatch' }
    $key162 = $exchange162.method + '-' + $exchange162.status
    if (-not $counts162.Contains($key162)) { $counts162[$key162] = 0 }
    $counts162[$key162]++
    $allRawPins162 += [ordered]@{uiRun=$receipt162.uiRun;file=$path162;rawBytesSHA256=$exchange162.privateRaw.rawBytesSha256;bytes=$exchange162.privateRaw.bytes}
    if ($exchange162.method -ne 'GET') {
      $requestBytes162 = [Convert]::FromBase64String($raw162.request.bodyBase64)
      $requestJson162 = $null
      try { $requestJson162 = [Text.Encoding]::UTF8.GetString($requestBytes162) | ConvertFrom-Json -AsHashtable } catch { }
      $responseJson162 = $null
      try { $responseJson162 = [Text.Encoding]::UTF8.GetString($responseBytes162) | ConvertFrom-Json -AsHashtable } catch { }
      $modern162 = $observer162.operationId -in $modernWrites162
      if ($modern162) {
        if ($requestJson162.inputVersion -cne 'server-derived-v1') { throw 'Modern inputVersion mismatch' }
        $modernCount162++
      }
      $anchors162 = [ordered]@{}
      if ($responseJson162 -is [System.Collections.IDictionary]) {
        foreach ($key163 in $responseJson162.Keys) {
          if (($key163 -match 'Id$' -or $key163 -in @('rowVersion','businessStatusAfter','status')) -and ($responseJson162[$key163] -is [string] -or $responseJson162[$key163] -is [long] -or $responseJson162[$key163] -is [int])) {
            $anchors162[$key163] = $responseJson162[$key163]
          }
        }
      }
      $commandResults162 += [ordered]@{uiRun=$receipt162.uiRun;index=$exchange162.index;operationId=$observer162.operationId;method=$exchange162.method;status=$exchange162.status;isModern32Write=$modern162;inputVersion=$requestJson162.inputVersion;requestKeys=if($requestJson162 -is [System.Collections.IDictionary]){@($requestJson162.Keys)}else{@()};requestBodySHA256=(ShaBytes162 $requestBytes162);responseBodySHA256=$raw162.response.bodySHA256;responseKeys=if($responseJson162 -is [System.Collections.IDictionary]){@($responseJson162.Keys)}else{@()};responseAnchors=$anchors162}
    }
    if ($receipt162.uiRun -eq 'gh18-source12-04') {
      $ledgerPath162 = Private162 $exchange162.ledger.file
      AssertPin162 $ledgerPath162 $exchange162.ledger.rawBytesSha256
      $ledger162 = Get-Content -Raw -LiteralPath $ledgerPath162 | ConvertFrom-Json -AsHashtable
      if ($ledger162.operationId -cne $observer162.operationId -or -not $ledger162.ownershipComplete -or $ledger162.blockers.Count -gt 0 -or $ledger162.responseStatusIsAcceptance -ne $false) { throw 'GH04 ledger mismatch' }
      $gh04Ledgers162 += [ordered]@{file=$exchange162.ledger.file;rawBytesSHA256=$exchange162.ledger.rawBytesSha256;operationId=$ledger162.operationId;ownershipComplete=$ledger162.ownershipComplete;blockers=$ledger162.blockers;responseStatusIsAcceptance=$ledger162.responseStatusIsAcceptance;recordedTableCounts=@($ledger162.recorded|Group-Object table|Select-Object Name,Count)}
    }
  }
  if ($receipt162.uiRun -eq 'gh18-source12-04') {
    foreach ($artifact162 in $receipt162.cases[0].privateWindowsArtifacts) {
      $artifactPath162 = 'tmp/rust-r4ghi/private/ui-runtime14/' + $receipt162.uiRun + '/case-0/' + $artifact162.file
      AssertPin162 $artifactPath162 $artifact162.rawBytesSha256
      $gh04Artifacts162 += [ordered]@{file=$artifactPath162;rawBytesSHA256=$artifact162.rawBytesSha256;bytes=(Get-Item -LiteralPath $artifactPath162).Length}
    }
  }
  $runResults162 += [ordered]@{uiRun=$receipt162.uiRun;receipt=$input162[0];receiptSHA256=$input162[1];status=$receipt162.status;rawExchangeCount=$receipt162.exchanges.Count;methodStatusCounts=$counts162;modern32WriteCount=$modernCount162;allA08FormsPassed=$receipt162.allA08FormsPassed;G3Certified=$receipt162.G3Certified;G4Certified=$receipt162.G4Certified}
}
[ordered]@{
  kind='independent-completed-eight-run-proxy-raw-and-GH04-readback162'
  fixedFSOnly=$true
  noRootHelpersCurrentDistOrMutableStateRead=$true
  rawRoot=$privateBase162+'ui\runtime14\<uiRun>\http\'
  rawExchangeCount=$allRawPins162.Count
  rawHashesSizesMethodsStatusesPathsAndBodyChecksumsAllMatched=$true
  headerAndCookieValuesEmitted=$false
  completeDecodedBusinessBodiesCopied=$false
  runs=$runResults162
  commandSummaries=$commandResults162
  GH04LedgerCount=$gh04Ledgers162.Count
  GH04Ledgers=$gh04Ledgers162
  GH04CaseArtifacts=$gh04Artifacts162
  allRawExchangePins=$allRawPins162
  G3Certified=$false
  G4Certified=$false
  newCertifiedOperations=0
} | ConvertTo-Json -Depth 100
