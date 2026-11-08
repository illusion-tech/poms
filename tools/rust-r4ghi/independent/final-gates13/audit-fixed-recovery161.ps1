$ErrorActionPreference = 'Stop'

# Reviewer-owned, fixed-file-only audit. No live state, SQL, HTTP, service or Root helper code.
$privateRoot161 = '\\wsl.localhost\Debian\home\wangzishi\.local\share\poms-r4ghi\private\'
$linuxPrivateRoot161 = '/home/wangzishi/.local/share/poms-r4ghi/private/'
$checkedFiles161 = [ordered]@{}

function Convert-PrivatePath161([string]$path161) {
  if (-not $path161.StartsWith($linuxPrivateRoot161, [StringComparison]::Ordinal)) {
    throw "Reference outside approved fixed private FS root: $path161"
  }
  $relative161 = $path161.Substring($linuxPrivateRoot161.Length)
  if (($relative161 -split '/') -contains '..') { throw 'Parent traversal rejected' }
  return $privateRoot161 + $relative161.Replace('/', '\')
}

function Assert-FilePin161([string]$path161, [string]$expected161) {
  if ($checkedFiles161.Contains($path161)) {
    if ($checkedFiles161[$path161].sha256 -cne $expected161) { throw 'Conflicting pin' }
    return
  }
  $actual161 = (Get-FileHash -LiteralPath $path161 -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual161 -cne $expected161) { throw "Fixed file pin mismatch: $path161" }
  $checkedFiles161[$path161] = [ordered]@{
    path = $path161
    bytes = (Get-Item -LiteralPath $path161).Length
    sha256 = $actual161
  }
}

function Read-PinnedJson161([string]$relative161, [string]$expected161) {
  $path161 = $privateRoot161 + $relative161.Replace('/', '\')
  Assert-FilePin161 $path161 $expected161
  return (Get-Content -Raw -LiteralPath $path161 | ConvertFrom-Json -AsHashtable)
}

function Same-Json161($left161, $right161) {
  return (($left161 | ConvertTo-Json -Depth 100 -Compress) -ceq ($right161 | ConvertTo-Json -Depth 100 -Compress))
}

$snapshotInputs161 = @(
  @('oldFinal', 'business/g2-business12/main01/snapshot-007126-ui10-http-after.json', '9205a910aa03686a0f70973f8b4c606b001e54a49b055d80abdd10d07ddaa9df'),
  @('recoveryFresh1', 'environment-recovery147/data-verification148/snapshot-environment148-fresh1.json', 'd30bb875bb22ba40bc3c2681272a8638ef8ebbbd2d67314bdf2bb85af48af1a5'),
  @('recoveryFresh2', 'environment-recovery147/data-verification148/snapshot-environment148-fresh2.json', '8055dfadd14c817c16edcd488cf0191894a046198dfa55cd3b0d1b13ab6bb957'),
  @('startup1', 'business/g2-business12/main01/snapshot-007131-p1351-startup1.json', '7dd28b78c8c5ec25942a4b94abdbbfab904d703fbc8108fc9784c7a2c9ff06f5'),
  @('startup2', 'business/g2-business12/main01/snapshot-007132-p1351-startup2.json', 'a65b384f60dfdef1fe167595fcced4e32480f5b79d59619164741922010ba063')
)
$snapshots161 = [ordered]@{}
$rowFileReferences161 = 0
foreach ($input161 in $snapshotInputs161) {
  $snapshot161 = Read-PinnedJson161 $input161[1] $input161[2]
  foreach ($database161 in $snapshot161.databases.Keys) {
    foreach ($table161 in $snapshot161.databases[$database161].tables.Keys) {
      $descriptor161 = $snapshot161.databases[$database161].tables[$table161]
      Assert-FilePin161 (Convert-PrivatePath161 $descriptor161.file) $descriptor161.rawBytesSha256
      $rowFileReferences161++
    }
  }
  $snapshots161[$input161[0]] = $snapshot161
}

$comparisons161 = @()
foreach ($name161 in @('recoveryFresh1', 'recoveryFresh2', 'startup1', 'startup2')) {
  $old161 = $snapshots161.oldFinal
  $fresh161 = $snapshots161[$name161]
  $databaseResults161 = @()
  foreach ($database161 in $old161.databases.Keys) {
    $left161 = $old161.databases[$database161]
    $right161 = $fresh161.databases[$database161]
    $changedTables161 = @()
    $tableSetEqual161 = Same-Json161 @($left161.tables.Keys | Sort-Object) @($right161.tables.Keys | Sort-Object)
    foreach ($table161 in $left161.tables.Keys) {
      $leftDescriptor161 = $left161.tables[$table161]
      $rightDescriptor161 = $right161.tables[$table161]
      foreach ($field161 in @('count', 'pk', 'columns', 'rawBytesSha256', 'logicalRowsSha256')) {
        if (-not (Same-Json161 $leftDescriptor161[$field161] $rightDescriptor161[$field161])) {
          $changedTables161 += "$table161/$field161"
        }
      }
    }
    $databaseResults161 += [ordered]@{
      database = $database161
      tableCount = $left161.tables.Count
      tableSetEqual = $tableSetEqual161
      rawRowXminDescriptorFieldsEqual = ($changedTables161.Count -eq 0)
      changedTableFields = $changedTables161
      completeMetadataIncludingNormativeAndSequencesEqual = (Same-Json161 $left161.meta $right161.meta)
      migrationRowCount = $right161.tables.poms_migrations.count
    }
  }
  $comparisons161 += [ordered]@{
    comparison = "oldFinal->$name161"
    namespaceEpochRunMarkerEqual = (($old161.epoch -ceq $fresh161.epoch) -and ($old161.run -ceq $fresh161.run) -and ($old161.marker -ceq $fresh161.marker))
    databases = $databaseResults161
    capturedObjectManifestsEqual = (Same-Json161 $old161.objects $fresh161.objects)
  }
}

$oldCandidate161 = Read-PinnedJson161 'business/g2-business12/main01/004534-candidate-source-binding12.json' 'b5c86c8882657aac1e1affc153510a728bc304943265e51a230b6be19a0429b7'
$newCandidate161 = Read-PinnedJson161 'business/g2-business12/main01/007133-p1351-candidate.json' '1dde0fda6f0c23682568f8256ea98da4137ebd7793da7915238e0ac066a9740c'
$oldProcess161 = Read-PinnedJson161 'rust-api135-process.json' 'a42333c74b7afd8aa7359bb3cf915444cc7cbbfebff9049a467c2cdb33ccef06'
$newProcess161 = Read-PinnedJson161 'rust-api1351-process.json' 'fd81b926dbaad79debc0343ac63b6cff7c967ac4a52cd64db0a7d0e7d4dbc2a1'
$oldRegistry161 = Read-PinnedJson161 'business/g2-business12/main01/000002-consumer-admission54-registry.json' '3ed7bd387b6f4f3b8e44201e7985043b18b71cefceba3194f83ab19300f7d29c'
$overlayRegistry161 = Read-PinnedJson161 'business/g2-business12/main01/007134-p1351-registry.json' '05985940f4a4085fab81d0711d2285931818a2b78fb29a9612bfcc1365b1667b'
$frozenState161 = Read-PinnedJson161 'business/g2-business12/main01/007128-p1351-original-state.json' '8e297fdb95b88442ebded8c37c44863b73838798b2fe0dbd9f798e4a5064c605'

[ordered]@{
  kind = 'independent-fixed-FS-recovery161-readback'
  mode = 'fixed-immutable-files-only-no-live-state-no-SQL-HTTP-service-or-product-command'
  snapshotCount = 5
  pinnedTableFileReferences = $rowFileReferences161
  independentlyHashedUniqueFiles = $checkedFiles161.Count
  comparisonExclusions = @('capture label', 'capture timestamp', 'per-capture table output path; exact referenced bytes were independently hashed')
  comparisons = $comparisons161
  sameCompleteProductSourceVector = (Same-Json161 $oldCandidate161.sourcePins $newCandidate161.sourcePins)
  actualSourceArrayCount = @($newCandidate161.sourcePins).Count
  sourceCount = $newCandidate161.sourceCount
  sourcePinsSHA256 = $newCandidate161.sourcePinsSHA256
  oldAndNewBinaryEqual = ($oldProcess161.binarySha256 -ceq $newProcess161.binarySha256)
  oldPhysicalIdentity = @{pid=$oldProcess161.pid;startTime=$oldProcess161.startTime;startedAt=$oldProcess161.startedAt}
  newPhysicalIdentity = @{pid=$newProcess161.pid;startTime=$newProcess161.startTime;startedAt=$newProcess161.startedAt}
  newProcessMatchesCandidate = (Same-Json161 $newProcess161 $newCandidate161.process.record)
  originalSchema2StillPinned = ($oldRegistry161.schemaVersion -eq 2)
  overlayPinsOriginalSchema2 = ($overlayRegistry161.originalRegistry.rawBytesSha256 -ceq '3ed7bd387b6f4f3b8e44201e7985043b18b71cefceba3194f83ab19300f7d29c')
  frozenStateBaselineMatchesOriginalRegistry = (Same-Json161 $frozenState161.baseline $oldRegistry161.originalBaseline)
  baselineStateType = $frozenState161.baseline.GetType().Name
  originalRegistryBaselineType = $oldRegistry161.originalBaseline.GetType().Name
  overlayBusinessWrites = $overlayRegistry161.businessWrites
  overlayHTTPRequests = $overlayRegistry161.HTTPRequests
  oldEvidenceRelabelledAsNew = $overlayRegistry161.oldEvidenceRelabelledAsNew
  businessStateBaselineReset = $overlayRegistry161.businessStateBaselineReset
  G3Certified = $false
  G4Certified = $false
  allReferencedTableFileRawHashesMatched = $true
  fixedSnapshotInputPins = $snapshotInputs161
  pinVerificationRule = 'Every file referenced by all five fixed snapshot table descriptors was independently SHA256 checked against that descriptor; any mismatch aborts this readback.'
} | ConvertTo-Json -Depth 100
