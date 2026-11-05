param([ValidateSet('check','test','clippy','fmt')][string]$Mode='check')
$ErrorActionPreference='Stop'
$DRepo=Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../..')
$DArgs=@('-d','Debian','--cd','/mnt/e/projects/worktrees/poms-r4d-handover/poms','--','env',
    'PATH=/home/wangzishi/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    'RUSTUP_HOME=/home/wangzishi/.rustup','CARGO_HOME=/home/wangzishi/.cache/poms-r4def-cargo-home',
    'CARGO_TARGET_DIR=/home/wangzishi/.cache/poms-r4def-target-D','CARGO_BUILD_JOBS=2')
if($Mode -eq 'fmt'){
    $DArgs+=@('/home/wangzishi/.cargo/bin/rustfmt','+1.99.1','--edition','2024',
        'apps/poms-api-rust/src/project_handover/mod.rs','apps/poms-api-rust/src/contracts/mod.rs',
        'apps/poms-api-rust/src/contract_readiness/mod.rs','apps/poms-api-rust/src/approval/domain.rs')
}else{
    $DArgs+=@('/home/wangzishi/.cargo/bin/cargo','+1.99.1',$Mode,'--offline','--lib','--manifest-path','apps/poms-api-rust/Cargo.toml')
    if($Mode -eq 'test'){$DArgs+='project_handover'}
    if($Mode -eq 'clippy'){$DArgs+=@('--','-D','warnings')}
}
$DRun=Get-Date -AsUTC -Format 'yyyyMMddTHHmmssfffZ'
$DLog=Join-Path $PSScriptRoot ($Mode+'-'+$DRun+'-original.log')
Push-Location -LiteralPath $DRepo
try {
    & wsl.exe @DArgs *> $DLog
    $DExit=$LASTEXITCODE
    $DSourcePaths=@(
        'apps/poms-api-rust/src/project_handover',
        'apps/poms-api-rust/src/contracts',
        'apps/poms-api-rust/src/contract_readiness',
        'apps/poms-api-rust/src/approval/domain.rs',
        'apps/poms-api-rust/src/lib.rs'
    )
    $DSourceHashes=@(foreach($DSourcePath in $DSourcePaths){
        Get-ChildItem -LiteralPath (Join-Path $DRepo $DSourcePath) -File -Recurse | Where-Object Extension -eq '.rs' | ForEach-Object {
            [ordered]@{path=[IO.Path]::GetRelativePath($DRepo,$_.FullName).Replace('\','/');rawBytesSha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
        }
    })
    $DMetadata=[ordered]@{kind='D-isolated-Rust-check';mode=$Mode;startedUtc=$DRun;finishedUtc=(Get-Date -AsUTC -Format o);exitCode=$DExit;baseline=(& git rev-parse HEAD);command=@('wsl.exe')+$DArgs;originalLog=[IO.Path]::GetFileName($DLog);rawLogSha256=(Get-FileHash -LiteralPath $DLog -Algorithm SHA256).Hash.ToLowerInvariant();sourceHashes=$DSourceHashes;realHttpRun=$false;databaseRun=$false;browserRun=$false;g3Certified=$false;g4Certified=$false}
    [IO.File]::WriteAllText(($DLog -replace '-original\.log$','-metadata.json'),(($DMetadata|ConvertTo-Json -Depth 10)+"`n"),[Text.UTF8Encoding]::new($false))
    Write-Output $DLog
    Get-Content -LiteralPath $DLog -Tail 65
    if($DExit -ne 0){exit $DExit}
}
finally {Pop-Location}
