param(
  [Parameter(Mandatory=$true)][string]$InputFile,
  [Parameter(Mandatory=$true)][string]$InputSha,
  [Parameter(Mandatory=$true)][string]$ReviewFile,
  [Parameter(Mandatory=$true)][string]$ReviewSha,
  [switch]$Execute
)
$ErrorActionPreference='Stop'
if(-not $Execute){throw 'Explicit reviewed execution required'}
$taskRoot='E:/projects/worktrees/poms-r3hijk-next28/poms'
$taskLinuxRoot='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms'
$taskNode='C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe'
$taskLinuxNode='/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node'
$taskFacts=$taskRoot+'/tools/rust-r4ghi/runtime-recovery121/root/facts121.mjs'
$taskHolder=$taskLinuxRoot+'/tools/rust-r4ghi/runtime-recovery121/root/hold-runtime121.mjs'
if((Get-Location).Path.Replace('\','/') -cne $taskRoot){throw 'Fixed Root checkout required'}
foreach($taskArg in @($InputFile,$ReviewFile)){if($taskArg -cnotmatch '^/[A-Za-z0-9_./:-]+$'){throw 'Canonical fixed CLI pin path required'}}
foreach($taskDigest in @($InputSha,$ReviewSha)){if($taskDigest -cnotmatch '^[a-f0-9]{64}$'){throw 'Exact digest required'}}
$taskValidation=& $taskNode $taskFacts --validate-holder --input $InputFile --input-sha $InputSha --review $ReviewFile --review-sha $ReviewSha --execute
if($LASTEXITCODE -ne 0){throw 'Whole input/review/source preflight rejected'}
$taskSpec=$taskValidation | ConvertFrom-Json -AsHashtable
if($taskSpec['mode'] -cne 'holder-start'){throw 'Holder-only mode required'}
$taskOutput=$taskSpec['outputDirectory']
$taskStdout=$taskOutput+'/wsl-stdout-original.log'
$taskStderr=$taskOutput+'/wsl-stderr-original.log'
if((Test-Path -LiteralPath $taskStdout) -or (Test-Path -LiteralPath $taskStderr)){throw 'Existing original pipes forbid replay'}
$taskWsl='C:/Windows/System32/wsl.exe'
$taskArguments=@('-d','Debian','--cd',$taskLinuxRoot,'--exec',$taskLinuxNode,$taskHolder,'--input',$InputFile,'--input-sha',$InputSha,'--review',$ReviewFile,'--review-sha',$ReviewSha,'--execute')
$taskSpawned=Start-Process -FilePath $taskWsl -ArgumentList $taskArguments -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput $taskStdout -RedirectStandardError $taskStderr -PassThru
$taskWindows=@{kind='actual-runtime121-A-Windows-holder-launch';windowsPid=$taskSpawned.Id;creationTime=$taskSpawned.StartTime.ToUniversalTime().ToString('o');executable=$taskWsl;argv=$taskArguments;nonce=$taskSpec['nonce'];inputFile=$InputFile;inputSha=$InputSha;reviewFile=$ReviewFile;reviewSha=$ReviewSha;APIStarted=$false;PGStarted=$false}
$taskWindowsFile=$taskOutput+'/windows-launch.json'
if(Test-Path -LiteralPath $taskWindowsFile){throw 'Windows launch original already exists; preserve process'}
$taskWindowsBytes=[Text.Encoding]::UTF8.GetBytes(($taskWindows|ConvertTo-Json -Depth 12)+"`n")
$taskStream=[IO.File]::Open($taskWindowsFile,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
try{$taskStream.Write($taskWindowsBytes,0,$taskWindowsBytes.Length);$taskStream.Flush($true)}finally{$taskStream.Dispose()}
$taskReadyFile=$taskOutput+'/holder-ready.json'
for($taskAttempt=0;$taskAttempt -lt 300;$taskAttempt++){
  if(Test-Path -LiteralPath $taskReadyFile){break}
  if($taskSpawned.HasExited){throw 'Holder exited before ready; preserve originals and do not retry'}
  Start-Sleep -Milliseconds 200
}
if(-not(Test-Path -LiteralPath $taskReadyFile)){throw 'No holder ready original; preserve live process and reconcile'}
$taskReady=Get-Content -LiteralPath $taskReadyFile -Raw|ConvertFrom-Json -AsHashtable
if($taskReady['kind'] -cne 'actual-runtime121-A-holder-ready' -or $taskReady['nonce'] -cne $taskSpec['nonce']){throw 'Ready identity mismatch; preserve process'}
@{holderReadyFile=$taskReadyFile;windowsLaunchFile=$taskWindowsFile;windowsPid=$taskSpawned.Id;PGStarted=$false;APIStarted=$false}|ConvertTo-Json -Compress
