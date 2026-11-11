$ErrorActionPreference='Stop'
$taskHolderRows=@(Get-CimInstance -ClassName Win32_Process -Filter 'ProcessId=51024')
if($taskHolderRows.Count -ne 1){throw 'Specified holder Windows PID is absent or ambiguous'}
$taskHolderCim=$taskHolderRows[0]
$taskResult=[ordered]@{kind='independent-specified-holder-Windows-CIM-read';sampledAt=[DateTime]::UtcNow.ToString('o');pid=[int]$taskHolderCim.ProcessId;parentPid=[int]$taskHolderCim.ParentProcessId;name=[string]$taskHolderCim.Name;executablePath=[string]$taskHolderCim.ExecutablePath;creationTime=$taskHolderCim.CreationDate.ToUniversalTime().ToString('o');creationTicks100ns=$taskHolderCim.CreationDate.ToUniversalTime().Ticks.ToString();commandLine=[string]$taskHolderCim.CommandLine;environmentRead=$false;processControl=$false}
$taskBytes=[Text.Encoding]::UTF8.GetBytes(($taskResult|ConvertTo-Json -Depth 6)+[Environment]::NewLine)
$taskFile='E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-A-holder-actual-readback01/windows-cim51024.json'
$taskStream=[IO.File]::Open($taskFile,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
try{$taskStream.Write($taskBytes,0,$taskBytes.Length);$taskStream.Flush($true)}finally{$taskStream.Dispose()}
[ordered]@{pid=$taskResult.pid;creationTime=$taskResult.creationTime;file=$taskFile}|ConvertTo-Json -Compress