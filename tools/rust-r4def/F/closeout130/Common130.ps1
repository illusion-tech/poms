Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-Json130([string] $Path) {
    Get-Content -LiteralPath $Path -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
}

function Get-Sha130([string] $Path) {
    (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Resolve-Path130([string] $Root, [string] $Relative) {
    if ([string]::IsNullOrWhiteSpace($Relative) -or [IO.Path]::IsPathRooted($Relative) -or
        $Relative -match '(^|[\\/])\.\.([\\/]|$)|:') { throw "Unsafe relative path: $Relative" }
    $base = [IO.Path]::GetFullPath($Root).TrimEnd([char[]]@('\', '/'))
    $full = [IO.Path]::GetFullPath([IO.Path]::Combine($base, $Relative))
    if (-not $full.StartsWith($base + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path escaped root: $Relative"
    }
    $cursor = $full
    while ($cursor.Length -ge $base.Length) {
        if (Test-Path -LiteralPath $cursor) {
            if ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Reparse point refused: $cursor"
            }
        }
        if ($cursor -eq $base) { break }
        $cursor = [IO.Path]::GetDirectoryName($cursor)
    }
    $full
}

function Assert-Root130([string] $Root, [hashtable] $Policy) {
    $actual = [IO.Path]::GetFullPath($Root).TrimEnd([char[]]@('\', '/'))
    $expected = [IO.Path]::GetFullPath($Policy.expectedRoot).TrimEnd([char[]]@('\', '/'))
    if (-not $actual.Equals($expected, [StringComparison]::OrdinalIgnoreCase)) { throw "Unexpected Root: $actual" }
    if (-not (Test-Path -LiteralPath $actual -PathType Container)) { throw 'Root does not exist' }
    $null = Resolve-Path130 $actual 'docs/design'
}

function Assert-File130([string] $Root, [hashtable] $Entry) {
    $file = Resolve-Path130 $Root $Entry.logicalOrigin
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing source: $($Entry.logicalOrigin)" }
    if ((Get-Item -LiteralPath $file).Length -ne $Entry.bytes -or (Get-Sha130 $file) -cne $Entry.rawBytesSha256) {
        throw "Source SHA/bytes changed: $($Entry.logicalOrigin)"
    }
    $file
}

function Get-Destination130([string] $Origin) {
    if ($Origin -ceq 'docs/design/rust-r4def-next30-baseline.md') {
        return 'docs/design/archive/slices/rust-r4def-next30-baseline.md.bin'
    }
    if ($Origin.StartsWith('docs/design/rust-r4def/')) {
        $destination = 'docs/design/archive/slices/rust-r4def/' + $Origin.Substring('docs/design/rust-r4def/'.Length)
    } elseif ($Origin.StartsWith('tmp/rust-r4def/root/')) {
        $destination = 'docs/design/archive/slices/rust-r4def/g2-evidence130/root/' + $Origin.Substring('tmp/rust-r4def/root/'.Length)
    } elseif ($Origin.StartsWith('tmp/rust-r4def/independent/')) {
        $destination = 'docs/design/archive/slices/rust-r4def/g2-evidence130/independent/' + $Origin.Substring('tmp/rust-r4def/independent/'.Length)
    } else { throw "Unapproved archive source: $Origin" }
    if (-not ($destination.EndsWith('.bin') -or $destination.EndsWith('.png'))) { $destination += '.bin' }
    $destination
}

function Assert-Allowed130([string] $Root, [hashtable] $Entry, [hashtable] $Policy) {
    $origin = [string]$Entry.logicalOrigin
    $parts = $origin.ToLowerInvariant().Split('/')
    foreach ($part in $parts) {
        if ($Policy.deniedDirectoryComponents -contains $part) { throw "Excluded component: $origin" }
    }
    $name = $parts[-1]
    $sourceWrapper = $name -match $Policy.publicSourceWrapperRegex
    if (($name -match $Policy.deniedNameRegex -and -not $sourceWrapper) -or $name.StartsWith('.env')) { throw "Private-looking file: $origin" }
    if ($origin -match $Policy.buildOutputPathRegex) { throw "Build output bulk refused: $origin" }
    foreach ($suffix in $Policy.deniedSuffixes) {
        if ($name.EndsWith($suffix) -or $name.Contains($suffix + '.')) { throw "Excluded binary/secret: $origin" }
    }
    if ($Entry.bytes -gt $Policy.maxBytesPerFile) { throw "Oversize evidence: $origin" }
    if ($Entry.operation -eq 'copy' -and $Policy.allowedExtensions -notcontains [IO.Path]::GetExtension($name)) {
        throw "Unsupported public evidence extension: $origin"
    }
    if ((Get-Destination130 $origin) -cne $Entry.storedAt) { throw "Destination mismatch: $origin" }
    $file = Assert-File130 $Root $Entry
    if ($name.EndsWith('.bin')) {
        $stream = [IO.File]::OpenRead($file)
        try {
            $head = [byte[]]::new(4)
            $read = $stream.Read($head, 0, 4)
            if (($read -ge 2 -and $head[0] -eq 0x4d -and $head[1] -eq 0x5a) -or
                ($read -eq 4 -and $head[0] -eq 0x7f -and $head[1] -eq 0x45 -and $head[2] -eq 0x4c -and $head[3] -eq 0x46) -or
                ($read -ge 2 -and $head[0] -eq 0x50 -and $head[1] -eq 0x4b)) { throw "Runtime/container magic refused: $origin" }
        } finally { $stream.Dispose() }
    }
}

function Resolve-Pointer130($Document, [string] $Pointer) {
    if (-not $Pointer.StartsWith('/')) { throw "JSON pointer required: $Pointer" }
    $value = $Document
    foreach ($token in $Pointer.Substring(1).Split('/')) {
        $key = $token.Replace('~1', '/').Replace('~0', '~')
        if ($value -is [System.Collections.IDictionary] -and $value.Contains($key)) { $value = $value[$key] }
        elseif ($value -is [System.Collections.IList] -and $key -match '^\d+$' -and [int]$key -lt $value.Count) { $value = $value[[int]$key] }
        else { throw "Evidence pointer does not exist: $Pointer" }
    }
    return ,$value
}

function Assert-Proof130([string] $Root, [hashtable] $Proof, [string] $Name) {
    if (-not $Proof.ContainsKey('file') -or [string]::IsNullOrWhiteSpace($Proof.file) -or
        $Proof.rawBytesSha256 -notmatch '^[0-9a-f]{64}$' -or $Proof.checks.Count -lt 1) { throw "Root must supply proof: $Name" }
    $file = Resolve-Path130 $Root $Proof.file
    if (-not (Test-Path -LiteralPath $file -PathType Leaf) -or (Get-Sha130 $file) -cne $Proof.rawBytesSha256) { throw "Evidence SHA mismatch: $Name" }
    $document = Read-Json130 $file
    foreach ($check in $Proof.checks) {
        if (-not $check.ContainsKey('equals')) { throw "Expected JSON value missing: $Name" }
        $actual = Resolve-Pointer130 $document $check.pointer
        if ((ConvertTo-Json -InputObject $actual -Depth 100 -Compress) -cne (ConvertTo-Json -InputObject $check.equals -Depth 100 -Compress)) {
            throw "Evidence check failed: $Name $($check.pointer)"
        }
    }
    return $document
}

function Assert-Facts130([string] $Root, [hashtable] $Facts, [ValidateSet('Ready', 'Final', 'Seal')] [string] $Stage) {
    if ($Facts.kind -cne 'Root-supplied-R4DEF-closeout-facts130' -or $Facts.rootVerified -ne $true) { throw 'Root facts not certified' }
    if ($Facts.implementationCommit -notmatch '^[0-9a-f]{40}$') { throw 'Exact implementation commit required' }
    if ($Facts.permanentS4 -cne '4f0ad88e78622a75b88b4e3cc72aded9da67458a') { throw 'Permanent S4 mismatch' }
    foreach ($key in @('D','E','F','batch','r4DeliveredAfterFinal','r4Total','remaining','operating','acceptanceCompletionArchive','rustTechnical','rustOfficialBeforeFinal','rustOfficialAfterFinal','paths','operations','schemas','clientFiles')) {
        $expected = @{ D=7; E=11; F=12; batch=30; r4DeliveredAfterFinal=67; r4Total=92; remaining=25; operating=17; acceptanceCompletionArchive=8; rustTechnical=240; rustOfficialBeforeFinal=210; rustOfficialAfterFinal=240; paths=239; operations=293; schemas=626; clientFiles=616 }[$key]
        if ($Facts.counts[$key] -ne $expected) { throw "Count mismatch: $key" }
    }
    foreach ($key in @('finalValidation','cleanup','stopped','independentG3','fixedCommitReview')) {
        $null = Assert-Proof130 $Root $Facts.evidence[$key] $key
    }
    foreach ($key in @('exactOwnedCleanup','borrowedOriginalsRestored','secondCleanupNoop','ownedApisStopped','privateAndVolumesRetained','historicalLabelsRetained','s4IsPermanentAncestor','productScopeLimitedToBatch30')) {
        if ($Facts.assertions[$key] -ne $true) { throw "Uncertified assertion: $key" }
    }
    if ($Stage -in @('Final','Seal')) {
        if ($Facts.stage -cne $Stage -or $Facts.mainCommit -notmatch '^[0-9a-f]{40}$' -or $Facts.metadataCommit -notmatch '^[0-9a-f]{40}$') { throw 'Existing main/archive metadata commit facts missing' }
        foreach ($key in @('mainIntegration','preclosePermission','onlineReadback')) {
            $null = Assert-Proof130 $Root $Facts.evidence[$key] $key
        }
        $online = Assert-Proof130 $Root $Facts.evidence.onlineReadback 'onlineReadback'
        foreach ($number in @('57','101','106','107','108','109')) {
            $state = Resolve-Pointer130 $online $Facts.issueStatePointers[$number]
            $expected = if ($number -in @('57','101')) { 'OPEN' } else { 'CLOSED' }
            if ($state -cne $expected) { throw "Actual Issue #$number state must be $expected" }
        }
        foreach ($key in @('sixIssueBodiesCommentsAndNativeTreeMatchApprovedPlan','fullR4RemainsIncomplete','r5AndLaterRemainOutOfScope')) {
            if ($Facts.assertions[$key] -ne $true) { throw "Final assertion missing: $key" }
        }
    }
    if ($Stage -eq 'Seal') {
        $null = Assert-Proof130 $Root $Facts.evidence.independentActualG4 'independentActualG4'
        if ($Facts.finalMetadataCommit -notmatch '^[0-9a-f]{40}$' -or $Facts.assertions.finalIndependentActualG4Pass -ne $true) { throw 'Actual G4 seal and already-existing final metadata commit required' }
    }
}

function Assert-Plan130([string] $Root, [hashtable] $Plan, [hashtable] $Policy) {
    Assert-Root130 $Root $Policy
    if ($Plan.kind -cne 'R4DEF-closeout130-raw-archive-plan' -or $Plan.policyRawBytesSha256 -cne (Get-Sha130 (Join-Path $PSScriptRoot 'policy130.json'))) { throw 'Archive plan/policy mismatch' }
    if ($Plan.blockedLifecycle.Count -ne 0) { throw 'Lifecycle exclusion blocks archive; no silent omission permitted' }
    $origins = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $destinations = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($entry in $Plan.entries) {
        if (-not $origins.Add($entry.logicalOrigin) -or -not $destinations.Add($entry.storedAt)) { throw 'Duplicate source/destination in plan' }
        if ($entry.operation -notin @('move','copy')) { throw 'Invalid archive operation' }
        $expectedOperation = if ($entry.logicalOrigin.StartsWith('docs/design/')) { 'move' } else { 'copy' }
        if ($entry.operation -cne $expectedOperation) { throw 'Lifecycle must move; tmp evidence must copy' }
        Assert-Allowed130 $Root $entry $Policy
        $destination = Resolve-Path130 $Root $entry.storedAt
        if (Test-Path -LiteralPath $destination) { throw "Destination already exists; reconcile explicitly: $($entry.storedAt)" }
    }
    # A new lifecycle file after freeze must trigger a new plan, never be silently left active.
    $lifecyclePath = Resolve-Path130 $Root $Policy.lifecycleRoot
    $stack = [Collections.Generic.Stack[string]]::new()
    $stack.Push($lifecyclePath)
    while ($stack.Count -gt 0) {
        foreach ($item in Get-ChildItem -LiteralPath $stack.Pop() -Force) {
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Reparse point in lifecycle: $($item.FullName)" }
            if ($item.PSIsContainer) { $stack.Push($item.FullName) }
            else {
                $relative = [IO.Path]::GetRelativePath($Root, $item.FullName).Replace('\','/')
                if (-not $origins.Contains($relative)) { throw "Unplanned lifecycle file: $relative" }
            }
        }
    }
    if (-not $origins.Contains($Policy.baseline)) { throw 'Baseline missing from archive plan' }
}
