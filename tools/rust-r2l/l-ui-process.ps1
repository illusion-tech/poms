#requires -Version 7.0
param(
    [Parameter(Mandatory = $true)][ValidateSet('Inspect', 'Discover', 'Stop', 'SelfTest')][string]$Mode,
    [ValidateRange(0, 2147483647)][int]$ProcessId = 0,
    [string]$BridgeId = ''
)
$ErrorActionPreference = 'Stop'
$nodePath = 'C:\Users\ynh2\AppData\Roaming\fnm\node-versions\v24.19.0\installation\node.exe'
$nodeHash = '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237'
$driverPath = 'E:\projects\worktrees\poms-r2ef-foundation-audit\poms\tools\rust-r2l\l-ui-windows-driver.mjs'
$inspectionWatch = [System.Diagnostics.Stopwatch]::StartNew()
function Check-Budget {
    if ($inspectionWatch.ElapsedMilliseconds -gt 12000) { throw 'Windows identity/stop total deadline' }
}

function Same-Path([string]$Left, [string]$Right) {
    return [string]::Equals($Left.Replace('/', '\'), $Right.Replace('/', '\'), [System.StringComparison]::OrdinalIgnoreCase)
}
function Fixed-Command([string]$CommandLine, [string]$Nonce) {
    # WSL interop supplies basename argv0 even though ExecutablePath and Node's
    # process.execPath identify the independently hash-checked full executable.
    $fullNode = [regex]::Escape($nodePath)
    $first = '(?:"' + $fullNode + '"|' + $fullNode + '|"node\.exe"|node\.exe)'
    $parts = @($driverPath, '--bridge-id', $Nonce) | ForEach-Object {
        $escaped = [regex]::Escape($_)
        '(?:"' + $escaped + '"|' + $escaped + ')'
    }
    return [regex]::IsMatch($CommandLine, '^\s*' + $first + '\s+' + ($parts -join '\s+') + '\s*$', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
}
function Same-Identity($Current, $Expected) {
    return $null -ne $Current -and $null -ne $Expected -and
        [int]$Current.pid -eq [int]$Expected.pid -and
        [string]$Current.startTimeUtcTicks -ceq [string]$Expected.startTimeUtcTicks -and
        (Same-Path ([string]$Current.executablePath) ([string]$Expected.executablePath)) -and
        [string]$Current.commandLine -ceq [string]$Expected.commandLine
}
function May-EnumerateParent($Captured, $Fresh, [decimal]$UpperTicks) {
    return (Same-Identity $Fresh $Captured) -and
        [string]$Fresh.cimCreationUtcTicks -ceq [string]$Captured.cimCreationUtcTicks -and
        [decimal]$Captured.startTimeUtcTicks -le $UpperTicks -and
        [decimal]$Captured.cimCreationUtcTicks -le $UpperTicks
}
function May-QueueChild($ParentIdentity, $Queried, $Fresh, [decimal]$UpperTicks) {
    return $null -ne $Fresh -and
        [int]$Queried.pid -eq [int]$Fresh.pid -and
        [int]$Queried.parentPid -eq [int]$ParentIdentity.pid -and
        [int]$Fresh.parentPid -eq [int]$ParentIdentity.pid -and
        [string]$Queried.cimCreationUtcTicks -ceq [string]$Fresh.cimCreationUtcTicks -and
        [decimal]$Fresh.startTimeUtcTicks -ge [decimal]$ParentIdentity.startTimeUtcTicks -and
        [decimal]$Fresh.cimCreationUtcTicks -ge [decimal]$ParentIdentity.cimCreationUtcTicks -and
        [decimal]$Fresh.startTimeUtcTicks -le $UpperTicks -and
        [decimal]$Fresh.cimCreationUtcTicks -le $UpperTicks
}
function Read-ProcessIdentity([int]$OwnedId, [int]$Depth = 0) {
    Check-Budget
    $ownedProcess = Get-Process -Id $OwnedId -ErrorAction SilentlyContinue
    if ($null -eq $ownedProcess) { return $null }
    $cim = Get-CimInstance -ClassName Win32_Process -Filter "ProcessId = $OwnedId" -OperationTimeoutSec 3
    if ($null -eq $cim) { return $null }
    try {
        $ticks = $ownedProcess.StartTime.ToUniversalTime().Ticks.ToString()
        $executable = $ownedProcess.Path
        if (-not (Same-Path $executable $cim.ExecutablePath)) { throw 'Process executable observations disagree' }
        return [pscustomobject]@{
            pid = [int]$cim.ProcessId
            parentPid = [int]$cim.ParentProcessId
            startTimeUtcTicks = $ticks
            cimCreationUtcTicks = $cim.CreationDate.ToUniversalTime().Ticks.ToString()
            executablePath = [string]$executable
            commandLine = [string]$cim.CommandLine
            depth = $Depth
        }
    } finally { $ownedProcess.Dispose() }
}
function Assert-Root($Identity, [string]$Nonce) {
    if ($null -eq $Identity -or -not (Same-Path $Identity.executablePath $nodePath) -or -not (Fixed-Command $Identity.commandLine $Nonce)) {
        throw 'Fixed UI driver identity rejected'
    }
    if ((Get-FileHash -LiteralPath $nodePath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $nodeHash) { throw 'Fixed Node executable hash differs' }
}
function Read-Tree($RootIdentity) {
    $members = [System.Collections.Generic.List[object]]::new()
    $queue = [System.Collections.Generic.Queue[object]]::new()
    $queue.Enqueue($RootIdentity)
    $seen = [System.Collections.Generic.HashSet[int]]::new()
    while ($queue.Count -gt 0) {
        Check-Budget
        $parent = $queue.Dequeue()
        if (-not $seen.Add([int]$parent.pid)) { continue }
        if ($members.Count -ge 128 -or [int]$parent.depth -gt 16) { throw 'Owned tree exceeds bounded capture' }
        # Take the birth-time upper bound BEFORE the fresh parent check. A
        # matching parent verified afterwards was alive at this bound; children
        # born later cannot be attributed if that parent exits/reuses its PID.
        $parentAliveUpper = [DateTime]::UtcNow.Ticks
        $freshParent = Read-ProcessIdentity ([int]$parent.pid) ([int]$parent.depth)
        if (-not (May-EnumerateParent $parent $freshParent $parentAliveUpper)) {
            if ([int]$parent.pid -eq [int]$RootIdentity.pid) { throw 'Anchor changed before child enumeration' }
            continue
        }
        $members.Add($parent)
        $children = Get-CimInstance -ClassName Win32_Process -Filter "ParentProcessId = $($parent.pid)" -OperationTimeoutSec 3
        foreach ($child in $children) {
            $queriedChild = [pscustomobject]@{
                pid = [int]$child.ProcessId
                parentPid = [int]$child.ParentProcessId
                cimCreationUtcTicks = $child.CreationDate.ToUniversalTime().Ticks.ToString()
            }
            $identity = Read-ProcessIdentity ([int]$child.ProcessId) ([int]$parent.depth + 1)
            if (May-QueueChild $parent $queriedChild $identity $parentAliveUpper) { $queue.Enqueue($identity) }
        }
    }
    if (-not (Same-Identity (Read-ProcessIdentity $RootIdentity.pid) $RootIdentity)) { throw 'Anchor changed during tree capture' }
    return @($members.ToArray())
}

if ($Mode -eq 'SelfTest') {
    $sampleNonce = 'e8899bec-c89d-4c0b-ad94-f597cd33f1df'
    $sampleCommand = '"' + $nodePath + '" "' + $driverPath + '" --bridge-id ' + $sampleNonce
    if (-not (Fixed-Command $sampleCommand $sampleNonce)) { throw 'Valid fixed command rejected' }
    if (Fixed-Command ($sampleCommand + ' other.js') $sampleNonce) { throw 'Extra argv accepted' }
    if (Fixed-Command $sampleCommand 'e8899bec-c89d-4c0b-ad94-f597cd33f1de') { throw 'Foreign nonce accepted' }
    $interopCommand = 'node.exe "' + $driverPath + '" --bridge-id ' + $sampleNonce
    if (-not (Fixed-Command $interopCommand $sampleNonce)) { throw 'Measured WSL basename argv0 rejected' }
    if (-not (Fixed-Command ('"node.exe" "' + $driverPath + '" --bridge-id ' + $sampleNonce) $sampleNonce)) { throw 'Quoted literal basename rejected' }
    if (Fixed-Command ('C:\other\node.exe "' + $driverPath + '" --bridge-id ' + $sampleNonce) $sampleNonce) { throw 'Other executable directory accepted' }
    if (Fixed-Command ('pwsh.exe "' + $driverPath + '" --bridge-id ' + $sampleNonce) $sampleNonce) { throw 'Other basename accepted' }
    if (Fixed-Command ('node.exe E:\other\driver.mjs --bridge-id ' + $sampleNonce) $sampleNonce) { throw 'Other driver accepted' }
    $original = [pscustomobject]@{pid=44; startTimeUtcTicks='638900000000000000'; executablePath=$nodePath; commandLine=$sampleCommand}
    $reused = [pscustomobject]@{pid=44; startTimeUtcTicks='638900000000000001'; executablePath=$nodePath; commandLine=$sampleCommand}
    $foreign = [pscustomobject]@{pid=44; startTimeUtcTicks=$original.startTimeUtcTicks; executablePath='C:\other\node.exe'; commandLine=$sampleCommand}
    if (-not (Same-Identity $original $original) -or (Same-Identity $reused $original) -or (Same-Identity $foreign $original)) { throw 'Identity guard failed' }
    $parentSample = [pscustomobject]@{pid=50; startTimeUtcTicks='638900000000000000'; cimCreationUtcTicks='638900000000000000'; executablePath=$nodePath; commandLine=$sampleCommand}
    $reusedParent = [pscustomobject]@{pid=50; startTimeUtcTicks='638900000000000040'; cimCreationUtcTicks='638900000000000040'; executablePath=$nodePath; commandLine=$sampleCommand}
    $upper = [decimal]'638900000000000030'
    if (-not (May-EnumerateParent $parentSample $parentSample $upper)) { throw 'Valid parent rejected' }
    if (May-EnumerateParent $parentSample $reusedParent $upper) { throw 'Reused queued parent accepted' }
    $queried = [pscustomobject]@{pid=51; parentPid=50; cimCreationUtcTicks='638900000000000010'}
    $validChild = [pscustomobject]@{pid=51; parentPid=50; startTimeUtcTicks='638900000000000010'; cimCreationUtcTicks='638900000000000010'}
    $reusedChild = [pscustomobject]@{pid=51; parentPid=99; startTimeUtcTicks='638900000000000020'; cimCreationUtcTicks='638900000000000020'}
    $changedCreation = [pscustomobject]@{pid=51; parentPid=50; startTimeUtcTicks='638900000000000020'; cimCreationUtcTicks='638900000000000020'}
    $lateQueried = [pscustomobject]@{pid=51; parentPid=50; cimCreationUtcTicks='638900000000000040'}
    $lateChild = [pscustomobject]@{pid=51; parentPid=50; startTimeUtcTicks='638900000000000040'; cimCreationUtcTicks='638900000000000040'}
    if (-not (May-QueueChild $parentSample $queried $validChild $upper)) { throw 'Valid child rejected' }
    if (May-QueueChild $parentSample $queried $reusedChild $upper) { throw 'Reused child parent accepted' }
    if (May-QueueChild $parentSample $queried $changedCreation $upper) { throw 'Changed child CIM creation accepted' }
    if (May-QueueChild $parentSample $lateQueried $lateChild $upper) { throw 'Child born after confirmed-parent bound accepted' }
    [pscustomobject]@{result='pure-identity-tests-pass'; checks=17; processQueries=0; processStops=0; raceGuards=@('queued-parent-reuse','queried-child-reuse','birth-after-confirmed-parent-bound');argv0Shapes=@('fixed-full-executable','literal-node.exe-only')} | ConvertTo-Json -Compress
    return
}
if (-not $IsWindows) { throw 'Windows process inspection only' }
if ($BridgeId -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') { throw 'Public bridge ID required' }
$payloadText = [Console]::In.ReadToEnd()
if ($payloadText.Length -gt 2097152) { throw 'Identity input exceeds bound' }
$expected = if ($payloadText.Trim()) { $payloadText | ConvertFrom-Json } else { $null }

if ($Mode -eq 'Discover') {
    $found = @()
    foreach ($candidate in (Get-CimInstance -ClassName Win32_Process -Filter "Name = 'node.exe'" -OperationTimeoutSec 3)) {
        if (Fixed-Command ([string]$candidate.CommandLine) $BridgeId) {
            $identity = Read-ProcessIdentity ([int]$candidate.ProcessId)
            Assert-Root $identity $BridgeId
            $found += $identity
        }
    }
    if ($found.Count -gt 1) { throw 'Bridge ID is not unique' }
    if ($found.Count -eq 0) { @{exists=$false; bridgeId=$BridgeId; root=$null; members=@()} | ConvertTo-Json -Compress; return }
    $rootIdentity = $found[0]
} else {
    if ($ProcessId -lt 1) { throw 'Exact Windows PID required' }
    $rootIdentity = Read-ProcessIdentity $ProcessId
}

if ($Mode -ne 'Stop') {
    if ($null -eq $rootIdentity) { @{exists=$false; bridgeId=$BridgeId; root=$null; members=@()} | ConvertTo-Json -Compress; return }
    Assert-Root $rootIdentity $BridgeId
    if ($null -ne $expected -and -not (Same-Identity $rootIdentity $expected.root)) { throw 'Registered anchor identity changed' }
    $rootIdentity | Add-Member -NotePropertyName executableSha256 -NotePropertyValue $nodeHash
    @{exists=$true; bridgeId=$BridgeId; root=$rootIdentity; members=@(Read-Tree $rootIdentity)} | ConvertTo-Json -Depth 8 -Compress
    return
}

if ($null -eq $expected -or $null -eq $expected.root -or $expected.bridgeId -cne $BridgeId) { throw 'Registered identity required before stop' }
Assert-Root $expected.root $BridgeId
$known = @($expected.members)
$terminated = @(); $alreadyGone = @(); $foreignSkipped = @()
if (Same-Identity $rootIdentity $expected.root) {
    Assert-Root $rootIdentity $BridgeId
    $currentTree = @(Read-Tree $rootIdentity)
    $known += $currentTree
    $anchor = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($null -ne $anchor) { try {
        # Recheck PID/ticks/exe/hash/fixed command immediately before using the
        # acquired Process instance. .NET kills only this verified process tree.
        $last = Read-ProcessIdentity $ProcessId
        if (Same-Identity $last $expected.root) { Assert-Root $last $BridgeId; try {
            $anchor.Kill($true)
            if (-not $anchor.WaitForExit(5000)) { throw 'Owned anchor stop deadline' }
            $terminated += $ProcessId
        } catch {
            # A cooperative exit may win the final race. Never fall through to
            # a recycled PID; only the already captured members remain eligible.
            if (Same-Identity (Read-ProcessIdentity $ProcessId) $expected.root) { throw }
        } } elseif ($null -ne $last -and $last.startTimeUtcTicks -ceq $expected.root.startTimeUtcTicks) { throw 'Anchor changed before force stop' }
    } finally { $anchor.Dispose() } }
} elseif ($null -ne $rootIdentity) {
    if ($rootIdentity.startTimeUtcTicks -ceq $expected.root.startTimeUtcTicks) { throw 'Unverifiable anchor; no force stop' }
    $foreignSkipped += [int]$rootIdentity.pid
}

# If the anchor exited, only members previously captured while it was verified
# are eligible. Never infer ownership from a recycled parent PID or process name.
$memberIds = [System.Collections.Generic.HashSet[string]]::new()
foreach ($member in ($known | Sort-Object -Property depth -Descending)) {
    if (-not $memberIds.Add(([string]$member.pid + ':' + [string]$member.startTimeUtcTicks))) { continue }
    $current = Read-ProcessIdentity ([int]$member.pid) ([int]$member.depth)
    if ($null -eq $current) { $alreadyGone += [int]$member.pid; continue }
    if (-not (Same-Identity $current $member)) { $foreignSkipped += [int]$member.pid; continue }
    $owned = Get-Process -Id ([int]$member.pid) -ErrorAction SilentlyContinue
    if ($null -eq $owned) { $alreadyGone += [int]$member.pid; continue }
    try {
        $lastMember = Read-ProcessIdentity ([int]$member.pid)
        if (-not (Same-Identity $lastMember $member)) { $foreignSkipped += [int]$member.pid; continue }
        try {
            $owned.Kill()
            if (-not $owned.WaitForExit(3000)) { throw 'Known member stop deadline' }
            $terminated += [int]$member.pid
        } catch {
            if (Same-Identity (Read-ProcessIdentity ([int]$member.pid)) $member) { throw }
        }
    } finally { $owned.Dispose() }
}
foreach ($member in $known) {
    if (Same-Identity (Read-ProcessIdentity ([int]$member.pid)) $member) { throw 'Registered owned process remains alive' }
}
@{result='owned-tree-stopped'; bridgeId=$BridgeId; terminated=$terminated; alreadyGone=$alreadyGone; foreignPidReuseSkipped=$foreignSkipped; unregisteredProcessesStopped=0} | ConvertTo-Json -Depth 8 -Compress
