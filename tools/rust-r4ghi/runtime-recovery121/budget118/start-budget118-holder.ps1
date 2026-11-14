param(
  [string]$InputFile, [string]$InputSha,
  [string]$RootReviewFile, [string]$RootReviewSha,
  [string]$PeerReviewFile, [string]$PeerReviewSha,
  [switch]$Execute
)

# Dot-sourcing only defines private functions. The real entry uses the same
# validation body as the owned-I/O model; only physical transport leaves differ.
$script:TaskRoot118='E:/projects/worktrees/poms-r3hijk-next28/poms'
$script:LinuxRoot118='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms'
$script:Runtime118=$script:LinuxRoot118+'/tools/rust-r4ghi/runtime-recovery121/budget118/reenter-budget118-runtime.mjs'
$script:Launcher118=$script:LinuxRoot118+'/tools/rust-r4ghi/runtime-recovery121/budget118/start-budget118-holder.ps1'
$script:LinuxNode118='/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node'
$script:LinuxNodeSha118='bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12'
$script:Private118='/home/wangzishi/.local/share/poms-r4ghi/private'
$script:G1File118=$script:LinuxRoot118+'/tools/rust-r4ghi/budget-probe118-g1-v3/Root-G1-budget-probe118-v3.json'
$script:G1Sha118='80ea3db59386f935b733e5e29b7b8a4db860c408ccb84f9204b9b5adebac00a1'
$script:CorrectiveFile118=$script:LinuxRoot118+'/tools/rust-r4ghi/runtime118-graph-RO-corrective01/Root-G3-corrective-runtime118-01.json'
$script:CorrectiveSha118='56b922e657b4db4b8429aff638fe0f80a8dfa808cf53cb42a4211ccb59aed806'
$script:Pwsh118='C:/Users/ynh2/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe'
$script:PwshSha118='2a6769a3330dc1084d0154bfde7d164ab750ca7f700f313f9d417c1be78b2233'
$script:Wsl118='C:/Windows/System32/wsl.exe'
$script:WslSha118='97b8172d68ef95e47fe07ab6de231f9b00a73cc5b37f9ffa3d9b5ca13cf8d950'

# The only first-WSL bootstrap. Every command and executable is fixed here.
# All arguments are separately bound data; nothing is evaluated as script.
$script:Bootstrap118=@'
set -eu
umask 077
node=$1; node_sha=$2; root=$3; entry=$4; input=$5; input_sha=$6; root_review=$7; root_sha=$8; peer=$9
shift 9
peer_sha=$1; out=$2
shift 2
[ "$(/usr/bin/id -u)" = 1000 ]
[ "$(/usr/bin/readlink -f .)" = "$root" ]
[ "$node" = /home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node ]
[ -f "$node" ] && [ ! -L "$node" ]
[ "$(/usr/bin/readlink -f "$node")" = "$node" ]
[ "$(/usr/bin/stat -c %h "$node")" = 1 ]
[ "$(/usr/bin/stat -c %s "$node")" = 125989464 ]
digest=$(/usr/bin/sha256sum "$node"); digest=${digest%% *}
[ "$digest" = "$node_sha" ]
while [ "$#" -gt 0 ]; do
  [ "$#" -ge 3 ]
  item=$1; expected=$2; size=$3
  shift 3
  [ -f "$item" ] && [ ! -L "$item" ]
  [ "$(/usr/bin/readlink -f "$item")" = "$item" ]
  [ "$(/usr/bin/stat -c %h "$item")" = 1 ]
  [ "$(/usr/bin/stat -c %s "$item")" = "$size" ]
  digest=$(/usr/bin/sha256sum "$item"); digest=${digest%% *}
  [ "$digest" = "$expected" ]
done
# No Node invocation occurs until all data and stable source bytes pass.
unset PWD OLDPWD SHLVL _
version=$(/usr/bin/env -i HOME=/home/wangzishi USER=wangzishi LOGNAME=wangzishi PATH=/usr/bin:/bin LANG=C.UTF-8 LC_ALL=C.UTF-8 "$node" --version)
[ "$version" = v24.19.0 ]
# The fixed descriptor carries data only. Node owns the sole L10 before any
# private directory/control write and seals these observed bytes with wx.
exec 3<<RUNTIME118_BOOTSTRAP_FACTS
kind=runtime118-system-bootstrap
uid=1000
node=$node
nodeSHA256=$node_sha
version=$version
entry=$entry
$(/usr/bin/stat -c 'node.dev=%d node.ino=%i node.nlink=%h node.mode=%a node.bytes=%s' "$node")
input=$input
inputSHA256=$input_sha
rootReview=$root_review
rootSHA256=$root_sha
peerReview=$peer
peerSHA256=$peer_sha
output=$out
RUNTIME118_BOOTSTRAP_FACTS
exec /usr/bin/env -i HOME=/home/wangzishi USER=wangzishi LOGNAME=wangzishi PATH=/usr/bin:/bin LANG=C.UTF-8 LC_ALL=C.UTF-8 "$node" "$entry" --input "$input" --input-sha "$input_sha" --root-review "$root_review" --root-review-sha "$root_sha" --peer-review "$peer" --peer-review-sha "$peer_sha" --execute
'@

function RawRead118([string]$File) { return ,([IO.File]::ReadAllBytes($File)) }
function RawFacts118([string]$File) {
  $i=Get-Item -LiteralPath $File -Force
  $stream=[IO.File]::Open($File,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
  try {
    if(-not ('Runtime118FileIdentity' -as [type])) {
      Add-Type -TypeDefinition @'
using System; using System.Text; using System.Runtime.InteropServices; using Microsoft.Win32.SafeHandles;
public static class Runtime118FileIdentity {
 [StructLayout(LayoutKind.Sequential)] public struct F {public uint Attributes; public System.Runtime.InteropServices.ComTypes.FILETIME Creation; public System.Runtime.InteropServices.ComTypes.FILETIME Access; public System.Runtime.InteropServices.ComTypes.FILETIME Write; public uint Volume; public uint SizeHigh; public uint SizeLow; public uint Links; public uint IndexHigh; public uint IndexLow;}
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool GetFileInformationByHandle(SafeFileHandle h,out F f);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] public static extern uint GetFinalPathNameByHandle(SafeFileHandle h,StringBuilder s,uint n,uint flags);
 public static string[] Read(SafeFileHandle h){F f;if(!GetFileInformationByHandle(h,out f))throw new System.ComponentModel.Win32Exception();var b=new StringBuilder(32768);uint n=GetFinalPathNameByHandle(h,b,(uint)b.Capacity,0);if(n==0||n>=b.Capacity)throw new System.ComponentModel.Win32Exception();string p=b.ToString();if(!p.StartsWith(@"\\?\"))throw new InvalidOperationException("Expected local DOS path");p=p.Substring(4);return new[]{f.Volume.ToString(),(((ulong)f.IndexHigh<<32)|f.IndexLow).ToString(),f.Links.ToString(),p};}
}
'@
    }
    $f=[Runtime118FileIdentity]::Read($stream.SafeFileHandle)
    return @{file=$f[3].Replace('\','/'); bytes=[long]$i.Length; regular=(-not $i.PSIsContainer); reparse=(($i.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0); dev=$f[0]; ino=$f[1]; nlink=$f[2]; lastWriteTicks=$i.LastWriteTimeUtc.Ticks.ToString(); creationTicks=$i.CreationTimeUtc.Ticks.ToString()}
  } finally {$stream.Dispose()}
}
function RawHost118 { return @{cwd=(Get-Location).Path.Replace('\','/'); executable=([Diagnostics.Process]::GetCurrentProcess().MainModule.FileName.Replace('\','/')); script=$PSCommandPath.Replace('\','/')} }
function RawExists118([string]$File) {try{[void](Get-Item -LiteralPath $File -Force -ErrorAction Stop);return $true}catch{if($_.CategoryInfo.Category -eq [Management.Automation.ErrorCategory]::ObjectNotFound){return $false};throw}}
function RawMkdir118([string]$Folder) {$current='E:';foreach($part in $Folder.Substring(3).Split('/')){$current+='/'+$part;if(-not (RawExists118 $current)){[void][IO.Directory]::CreateDirectory($current)};$item=Get-Item -LiteralPath $current -Force;Assert118 ($item.PSIsContainer -and (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0));Assert118 ([string]::Equals($item.FullName.Replace('\','/'),$current,[StringComparison]::OrdinalIgnoreCase))}}
function RawWrite118([string]$File,[byte[]]$Bytes) { $s=[IO.File]::Open($File,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$s.Write($Bytes,0,$Bytes.Length);$s.Flush($true)}finally{$s.Dispose()} }
function RawProcess118([int]$Id) { $p=Get-CimInstance Win32_Process -Filter "ProcessId=$Id";if($null -eq $p){throw 'Actual WSL Windows process missing'};return @{pid=[int]$p.ProcessId;creationTime=$p.CreationDate.ToUniversalTime().ToString('o');executable=$p.ExecutablePath.Replace('\','/');commandLine=[string]$p.CommandLine} }
function RawStart118([string[]]$Arguments,[string]$Stdout,[string]$Stderr) {
  $encoded=($Arguments | ForEach-Object { QuoteNative118 $_ }) -join ' '
  $envGate=@{WSLENV=$null;NODE_OPTIONS=$null;NODE_PATH=$null;ENV=$null;BASH_ENV=$null;LD_PRELOAD=$null;LD_LIBRARY_PATH=$null}
  return Start-Process -FilePath $script:Wsl118 -ArgumentList $encoded -WorkingDirectory $script:TaskRoot118 -WindowStyle Hidden -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -Environment $envGate -PassThru
}
function RawReady118([string]$LinuxFile) { $file='//wsl.localhost/Debian'+$LinuxFile;if(-not (Test-Path -LiteralPath $file)){return $null};return ,([IO.File]::ReadAllBytes($file)) }
function RawWait118 {Start-Sleep -Milliseconds 200}

function Assert118([bool]$Condition,[string]$Message='Exact holder preflight rejected') {if(-not $Condition){throw $Message}}
function Keys118($Value,[string[]]$Expected) {Assert118 ($Value -is [System.Collections.IDictionary]);Assert118 ((@($Value.Keys | Sort-Object) -join '|') -ceq (@($Expected | Sort-Object) -join '|'))}
function Version118($Value) {Assert118 ($Value -is [ValueType] -and $Value -isnot [bool] -and $Value -eq 1)}
function SHA118([byte[]]$Bytes) {return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Bytes)).ToLowerInvariant()}
function LinuxPath118([string]$Value) {Assert118 ($Value -cmatch '^/(?:mnt/[ec]/|home/wangzishi/)[^\\\x00\r\n]*$');Assert118 (-not $Value.Contains('//'));Assert118 (-not ($Value.Split('/') | Where-Object {$_ -ceq '.' -or $_ -ceq '..'}));return $Value}
function PublicPath118([string]$File) { [void](LinuxPath118 $File);if($File.StartsWith('/mnt/e/')){return 'E:/'+$File.Substring(7)};if($File.StartsWith('/mnt/c/')){return 'C:/'+$File.Substring(7)};throw 'Windows preflight never reads private/WSL paths'}
function Pin118($Pin) {Keys118 $Pin @('file','bytes','rawBytesSha256');[void](LinuxPath118 $Pin.file);Assert118 ($Pin.bytes -is [ValueType] -and $Pin.bytes -isnot [bool] -and $Pin.bytes -ge 0 -and [long]$Pin.bytes -eq $Pin.bytes);Assert118 ($Pin.rawBytesSha256 -cmatch '^[a-f0-9]{64}$')}
function SamePin118($A,$B) {Pin118 $A;Pin118 $B;Assert118 ($A.file -ceq $B.file -and $A.bytes -eq $B.bytes -and $A.rawBytesSha256 -ceq $B.rawBytesSha256)}
function Identity118($A,$B) {foreach($k in @('file','bytes','regular','reparse','dev','ino','nlink','lastWriteTicks','creationTicks')){Assert118 ($A[$k] -ceq $B[$k])}}
function Strong118($Pin) {Pin118 $Pin;$f=PublicPath118 $Pin.file;$a=RawFacts118 $f;Assert118 ($a.regular -and -not $a.reparse -and $a.nlink -ceq '1');Assert118 ($a.file -ceq $f);$bytes=RawRead118 $f;$b=RawFacts118 $f;Identity118 $a $b;Assert118 ($bytes.Length -eq $Pin.bytes -and (SHA118 $bytes) -ceq $Pin.rawBytesSha256);return ,$bytes}
function ReadCLI118([string]$File,[string]$Digest) {Assert118 ($Digest -cmatch '^[a-f0-9]{64}$');$f=PublicPath118 $File;$a=RawFacts118 $f;$p=@{file=$File;bytes=$a.bytes;rawBytesSha256=$Digest};[void](Strong118 $p);return $p}
function JSON118($Pin) {return [Text.Encoding]::UTF8.GetString((Strong118 $Pin)) | ConvertFrom-Json -AsHashtable -Depth 100}
function WriteJSON118([string]$File,$Body) {$bytes=[Text.UTF8Encoding]::new($false).GetBytes(($Body | ConvertTo-Json -Depth 100)+"`n");$wrote=$false;try{RawWrite118 $File $bytes;$wrote=$true;$pin=@{file='/mnt/e/'+$File.Substring(3);bytes=$bytes.Length;rawBytesSha256=(SHA118 $bytes)};[void](Strong118 $pin);return $pin}catch{$exists=$false;try{$exists=RawExists118 $File}catch{};$status=if($wrote){'readback-failed'}else{'write-failed'};$script:WriteFailure118=@{file=('/mnt/e/'+$File.Substring(3));existingFilePreserved=[bool]$exists;status=$status;message='Control output not certified complete'};throw 'Control output write/readback incomplete; preserve without retry'}}
function QuoteNative118([string]$Value) {if($Value.Length -gt 0 -and $Value -cnotmatch '[\s"]'){return $Value};$s='"';$n=0;foreach($ch in $Value.ToCharArray()){if($ch -ceq '\'){$n++;continue};if($ch -ceq '"'){$s+=(' '*0)+(('\' * (2*$n+1)) -join '')+'"';$n=0;continue};$s+=(('\' * $n) -join '')+$ch;$n=0};return $s+(('\' * (2*$n)) -join '')+'"'}
function SplitNative118([string]$Line) {
  $result=[Collections.Generic.List[string]]::new();$at=0
  while($at -lt $Line.Length){while($at -lt $Line.Length -and [char]::IsWhiteSpace($Line[$at])){$at++};if($at -ge $Line.Length){break};$word='';$quoted=$false
    while($at -lt $Line.Length){if(-not $quoted -and [char]::IsWhiteSpace($Line[$at])){break};$slashes=0;while($at -lt $Line.Length -and $Line[$at] -ceq '\'){$slashes++;$at++}
      if($at -lt $Line.Length -and $Line[$at] -ceq '"'){$word+=(('\' * [int][Math]::Floor($slashes/2)) -join '');if(($slashes%2) -eq 1){$word+='"'}else{$quoted=-not $quoted};$at++}
      else{$word+=(('\' * $slashes) -join '');if($at -lt $Line.Length){$word+=$Line[$at];$at++}}
    };Assert118 (-not $quoted) 'Unclosed Windows command line';$result.Add($word)
  };return ,($result.ToArray())
}

function InvokeHolder118([string]$InputFile,[string]$InputSha,[string]$RootReviewFile,[string]$RootReviewSha,[string]$PeerReviewFile,[string]$PeerReviewSha,[switch]$Execute) {
  $script:Stopped118=$null
  $script:WriteFailure118=$null
  Assert118 $Execute.IsPresent 'Explicit exact execution required'
  $hostFacts=RawHost118;Assert118 ($hostFacts.cwd -ceq $script:TaskRoot118);Assert118 ($hostFacts.executable -ceq $script:Pwsh118);Assert118 ($hostFacts.script -ceq ($script:TaskRoot118+'/tools/rust-r4ghi/runtime-recovery121/budget118/start-budget118-holder.ps1'))
  # The installed Windows system wsl.exe has its approved WinSxS hard link.
  # This finite executable role never changes Strong118's single-link rule.
  foreach($exe in @(@{file=$script:Pwsh118;sha=$script:PwshSha118;bytes=301360;nlink='1'},@{file=$script:Wsl118;sha=$script:WslSha118;bytes=212992;nlink='2'})){$f=RawFacts118 $exe.file;Assert118 ([string]::Equals($f.file,$exe.file,[StringComparison]::OrdinalIgnoreCase) -and $f.regular -and -not $f.reparse -and $f.nlink -ceq $exe.nlink -and $f.bytes -eq $exe.bytes);$b=RawRead118 $exe.file;Assert118 ((SHA118 $b) -ceq $exe.sha);Identity118 $f (RawFacts118 $exe.file)}
  $inputPin=ReadCLI118 $InputFile $InputSha;$rootPin=ReadCLI118 $RootReviewFile $RootReviewSha;$peerPin=ReadCLI118 $PeerReviewFile $PeerReviewSha
  $p=JSON118 $inputPin;$r=JSON118 $rootPin;$e=JSON118 $peerPin
  foreach($value in @($p.schemaVersion,$r.schemaVersion,$e.schemaVersion)){Version118 $value}
  Keys118 $p @('kind','schemaVersion','recoveryG1','phase','nonce','operator','codeQualification','expectedState','expectedOwnership','preparation','prior','outputDirectory','windowsOutputDirectory')
  Assert118 ($p.kind -ceq 'Root-runtime118-reentry-phase-input' -and $p.schemaVersion -eq 1 -and $p.phase -ceq 'holder-start');Assert118 ($p.nonce -cmatch '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$');Keys118 $p.prior @()
  $g1=@{file=$script:G1File118;bytes=32283;rawBytesSha256=$script:G1Sha118};SamePin118 $p.recoveryG1 $g1;$g=JSON118 $g1;Assert118 ($g.implementationAuthorized -ceq $true -and $g.actualG2Granted -ceq $false)
  $ci=@{file=$script:CorrectiveFile118;bytes=7322;rawBytesSha256=$script:CorrectiveSha118};$checkpoint=JSON118 $ci;SamePin118 $checkpoint.frozenG1 $g1
  Assert118 ($p.expectedState.rawBytesSha256 -ceq '6c1fabbacebc43fea8636c8fd91afac81dd66e8b6200ca5a769c08ae41401b3b' -and $p.expectedState.bytes -eq 15045544);Assert118 ($p.expectedOwnership.rawBytesSha256 -ceq '1da85861708f1d1c37389385f6c86741e46a7053d5c0eb034260ff8c01aba517' -and $p.expectedOwnership.bytes -eq 13016);Assert118 ($p.preparation.rawBytesSha256 -ceq '847fe81ffbc4cf4f73b369ac1466e3185e051a6d0d87ca429b444111767115e7' -and $p.preparation.bytes -eq 367950)
  foreach($pin in @($p.expectedState,$p.expectedOwnership,$p.preparation)){Pin118 $pin};$birthDir=$script:Private118+'/runtime121-prepare362-completed01/6458f733-0fe1-4b5e-b2ff-076908543af3';Assert118 ($p.expectedState.file -ceq ($birthDir+'/state-after.json') -and $p.expectedOwnership.file -ceq ($birthDir+'/ownership-after.jsonl') -and $p.preparation.file -ceq ($script:Private118+'/business/g2-business15/main01/000065-tax121-prepare-continuation.json'))
  Assert118 ($p.outputDirectory -ceq ($script:Private118+'/runtime118-reentry/holder-start/'+$p.nonce));Assert118 ($p.windowsOutputDirectory -ceq ($script:LinuxRoot118+'/tmp/rust-r4ghi/root/runtime118-reentry-windows/'+$p.nonce));Assert118 ($p.operator.file -ceq $script:Runtime118);[void](Strong118 $p.operator)
  $q=JSON118 $p.codeQualification;Keys118 $q @('kind','schemaVersion','technicalG1','operator','executionSources','author','reviewer','reviewerIsAuthor','verdict','modelEvidence','engines');Assert118 ($q.kind -ceq 'non-author-runtime118-reentry-tool-code-qualification' -and $q.schemaVersion -eq 1);SamePin118 $q.technicalG1 $g1;SamePin118 $q.operator $p.operator;Assert118 ($q.author -and $q.reviewer -and $q.author -cne $q.reviewer -and $q.reviewerIsAuthor -ceq $false -and $q.verdict -ceq 'approved-bounded-reentry-tool-code');[void](Strong118 $q.modelEvidence)
  Version118 $q.schemaVersion;Assert118 ($q.reviewerIsAuthor -is [bool] -and -not $q.reviewerIsAuthor)
  $names=@($q.executionSources | ForEach-Object {$_.file});Assert118 (($names -join '|') -ceq ((@($names | Sort-Object -Unique)) -join '|'));Assert118 ($names -ccontains $script:Runtime118 -and $names -ccontains $script:Launcher118);foreach($source in $q.executionSources){Assert118 ($source.file.StartsWith($script:LinuxRoot118+'/'));Assert118 (-not ($g.existingSources | Where-Object {($script:LinuxRoot118+'/'+$_.target) -ceq $source.file}));[void](Strong118 $source)}
  Keys118 $q.engines @('linuxNode','windowsNode');Keys118 $q.engines.linuxNode @('expectedExecutable','expectedVersion','observationStage');Assert118 ($q.engines.linuxNode.expectedExecutable.file -ceq $script:LinuxNode118 -and $q.engines.linuxNode.expectedExecutable.bytes -eq 125989464 -and $q.engines.linuxNode.expectedExecutable.rawBytesSha256 -ceq $script:LinuxNodeSha118);Assert118 ($q.engines.linuxNode.expectedVersion -ceq 'v24.19.0' -and $q.engines.linuxNode.observationStage -ceq 'holder-system-bootstrap');Keys118 $q.engines.windowsNode @('executable','versionEvidence','modelResults');foreach($pin in $q.engines.windowsNode.Values){[void](Strong118 $pin)};Assert118 ($q.engines.windowsNode.executable.file -ceq '/mnt/c/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe' -and $q.engines.windowsNode.executable.rawBytesSha256 -ceq '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237')
  Keys118 $r @('kind','schemaVersion','input','G1','codeQualification','operator','operatorIdentity','nonce','grants','retryPolicy');Assert118 ($r.kind -ceq 'Root-approved-runtime118-exact-reentry-phase' -and $r.schemaVersion -eq 1);SamePin118 $r.input $inputPin;SamePin118 $r.G1 $g1;SamePin118 $r.codeQualification $p.codeQualification;SamePin118 $r.operator $p.operator;Assert118 ($r.operatorIdentity -ceq 'Root' -and $r.nonce -ceq $p.nonce -and $r.retryPolicy -ceq 'preserve-partial-no-blind-retry')
  Keys118 $r.grants @('holderStartGranted','startOriginalPGGranted','readonlyPGGranted','APIStartGranted','canonicalApiProcessWriteGranted','ownControlWritesGranted','contextAuthGranted','FIOrNormalGranted');foreach($key in $r.grants.Keys){Assert118 ($r.grants[$key] -is [bool]);Assert118 ($r.grants[$key] -ceq ($key -cin @('holderStartGranted','ownControlWritesGranted')))}
  Keys118 $e @('kind','schemaVersion','input','G1','codeQualification','operator','RootApproval','author','reviewer','reviewerIsAuthor','reviewerIsExecutor','verdict','evidence');Assert118 ($e.kind -ceq 'non-author-runtime118-exact-reentry-phase-review' -and $e.schemaVersion -eq 1);SamePin118 $e.input $inputPin;SamePin118 $e.G1 $g1;SamePin118 $e.codeQualification $p.codeQualification;SamePin118 $e.operator $p.operator;SamePin118 $e.RootApproval $rootPin;Assert118 ($e.author -ceq $q.author -and $e.reviewer -and $e.reviewer -cne $q.author -and $e.reviewer -cne 'Root' -and $e.reviewerIsAuthor -ceq $false -and $e.reviewerIsExecutor -ceq $false -and $e.verdict -ceq 'approved-exact-reentry-phase');[void](Strong118 $e.evidence)
  Assert118 ($e.reviewerIsAuthor -is [bool] -and $e.reviewerIsExecutor -is [bool] -and -not $e.reviewerIsAuthor -and -not $e.reviewerIsExecutor)
  $out=PublicPath118 $p.windowsOutputDirectory;Assert118 (-not (RawExists118 $out));RawMkdir118 $out
  $stdout=$out+'/wsl-holder.stdout.log';$stderr=$out+'/wsl-holder.stderr.log';$arguments=@('-d','Debian','--cd',$script:LinuxRoot118,'--exec','/usr/bin/env','-i','HOME=/home/wangzishi','USER=wangzishi','LOGNAME=wangzishi','PATH=/usr/bin:/bin','LANG=C.UTF-8','LC_ALL=C.UTF-8','/bin/sh','-c',$script:Bootstrap118,'--',$script:LinuxNode118,$script:LinuxNodeSha118,$script:LinuxRoot118,$script:Runtime118,$inputPin.file,$inputPin.rawBytesSha256,$rootPin.file,$rootPin.rawBytesSha256,$peerPin.file,$peerPin.rawBytesSha256,$p.outputDirectory)
  foreach($pin in @($q.executionSources)+@($inputPin,$rootPin,$peerPin)){$arguments+=@($pin.file,$pin.rawBytesSha256,[string]$pin.bytes)}
  $spawned=$false;$processId=$null;$creationTime=$null;$launch=$null
  try {
    # Every Windows-only preflight completed before this sole WSL launch.
    $spawned=$true;$child=RawStart118 $arguments $stdout $stderr;$processId=[int]$child.Id;$actual=RawProcess118 $processId;$creationTime=$actual.creationTime;Assert118 ([string]::Equals($actual.executable,$script:Wsl118,[StringComparison]::OrdinalIgnoreCase) -and $actual.pid -eq $processId)
    $parsed=SplitNative118 $actual.commandLine;Assert118 ($parsed.Count -eq $arguments.Count+1);Assert118 ([string]::Equals($parsed[0].Replace('\','/'),$script:Wsl118,[StringComparison]::OrdinalIgnoreCase));for($at=0;$at -lt $arguments.Count;$at++){Assert118 ($parsed[$at+1] -ceq $arguments[$at])}
    $launcherPin=$q.executionSources | Where-Object {$_.file -ceq $script:Launcher118};Assert118 ($null -ne $launcherPin)
    $launch=WriteJSON118 ($out+'/windows-launch.json') ([ordered]@{kind='Root-runtime118-holder-Windows-launch';schemaVersion=1;recoveryG1=$g1;input=$inputPin;RootApproval=$rootPin;executionReview=$peerPin;operator=$launcherPin;nonce=$p.nonce;pid=$processId;creationTime=$creationTime;executable=$script:Wsl118;argv=$arguments;stdoutFile=($p.windowsOutputDirectory+'/wsl-holder.stdout.log');stderrFile=($p.windowsOutputDirectory+'/wsl-holder.stderr.log')})
    $readyBytes=$null;for($attempt=0;$attempt -lt 300;$attempt++){$now=RawProcess118 $processId;Assert118 ($now.creationTime -ceq $creationTime -and [string]::Equals($now.executable,$script:Wsl118,[StringComparison]::OrdinalIgnoreCase) -and $now.commandLine -ceq $actual.commandLine);$readyBytes=RawReady118 ($p.outputDirectory+'/holder-ready.json');if($null -ne $readyBytes){break};RawWait118}
    Assert118 ($null -ne $readyBytes) 'No holder ready; preserve actual process without retry';$h=[Text.Encoding]::UTF8.GetString($readyBytes) | ConvertFrom-Json -AsHashtable -Depth 100;Keys118 $h @('kind','schemaVersion','recoveryG1','input','RootApproval','executionReview','operator','nonce','bootId','pid','startTime','startedAt','identity','bootObservation');Assert118 ($h.kind -ceq 'actual-runtime118-holder-ready' -and $h.schemaVersion -eq 1 -and $h.nonce -ceq $p.nonce);SamePin118 $h.recoveryG1 $g1;SamePin118 $h.input $inputPin;SamePin118 $h.RootApproval $rootPin;SamePin118 $h.executionReview $peerPin;SamePin118 $h.operator $p.operator
    return @{kind='Root-runtime118-holder-wrapper-observed-ready';windowsLaunch=$launch;holderReadyFile=($p.outputDirectory+'/holder-ready.json');windowsPid=$processId;holderStillRequiresRootLiveReadback=$true;APIStarted=$false;PGStarted=$false}
  } catch {
    $state=if($spawned){'unknown-preserve'}else{'not-spawned'};$partial=[ordered]@{kind='Root-runtime118-reentry-partial-preserve';schemaVersion=1;recoveryG1=$g1;input=$inputPin;RootApproval=$rootPin;executionReview=$peerPin;operator=$p.operator;phase='holder-start';completedOutputs=@{holderReady=$null;windowsLaunch=$launch;launchCommand=$null;bootObservation=$null;lifetimeOwner=$null};error=@{name='Error';message='Holder launch incomplete; preserve actual process and outputs';phase='holder-start';primaryEvidence=@($launch | Where-Object {$null -ne $_});writeFailures=@($script:WriteFailure118 | Where-Object {$null -ne $_});replayForbidden=$true};processes=@(@{role='holder-WSL';state=$state;command=$null;pid=$processId;startTime=$creationTime;bootId=$null;record=$launch;error=$null});retryPolicy='preserve-partial-no-blind-retry'}
    try{[void](WriteJSON118 ($out+'/partial.json') $partial)}catch{if($script:WriteFailure118){$partial.error.writeFailures+=$script:WriteFailure118}else{$partial.error.writeFailures+=@{file=($p.windowsOutputDirectory+'/partial.json');existingFilePreserved=$false;status='unknown';message='Partial write/readback failed; primary process facts preserved'}}}
    $script:Stopped118=$partial
    throw 'Holder launch incomplete; actual process may remain live; preserve without retry'
  }
}

if($MyInvocation.InvocationName -ne '.') {
  $ErrorActionPreference='Stop'
  try {InvokeHolder118 -InputFile $InputFile -InputSha $InputSha -RootReviewFile $RootReviewFile -RootReviewSha $RootReviewSha -PeerReviewFile $PeerReviewFile -PeerReviewSha $PeerReviewSha -Execute:$Execute | ConvertTo-Json -Depth 100 -Compress}
  catch {if($script:Stopped118){[Console]::Error.WriteLine(($script:Stopped118 | ConvertTo-Json -Depth 100 -Compress))}else{[Console]::Error.WriteLine('{"kind":"Root-runtime118-holder-wrapper-stopped","preserveOriginals":true,"blindRetryForbidden":true}')};exit 1}
}
