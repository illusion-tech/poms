param([Parameter(Mandatory = $true)][ValidateRange(1, 2147483647)][int]$ProcessId)
$ErrorActionPreference = 'Stop'
$ownedProcess = Get-CimInstance -ClassName Win32_Process -Filter "ProcessId = $ProcessId"
if ($null -ne $ownedProcess) {
    [pscustomobject]@{
        pid = [int]$ownedProcess.ProcessId
        parentPid = [int]$ownedProcess.ParentProcessId
        startIdentity = $ownedProcess.CreationDate.ToUniversalTime().Ticks.ToString()
    } | ConvertTo-Json -Compress
}
