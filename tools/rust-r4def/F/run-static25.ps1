$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$runRoot = Join-Path $PSScriptRoot 'build/static-checks25'
if (Test-Path -LiteralPath $runRoot) { throw 'Preserve the prior static check run' }
New-Item -ItemType Directory -Path $runRoot | Out-Null
$checks = [Collections.Generic.List[object]]::new()
$markdownLog = Join-Path $runRoot 'markdown.stdout.log'
[IO.File]::WriteAllBytes($markdownLog, [byte[]]@())
$arguments = @('run','--cached-only','--allow-read','tools/format-md-tables.ts','--check','tools/rust-r4def/F/HANDOFF25.md','tools/rust-r4def/F/PG-REPLAY25.md')
& deno @arguments 2>&1 | Tee-Object -FilePath $markdownLog | Out-Host
$markdownExit = $LASTEXITCODE
$checks.Add([ordered]@{ name = 'owned-markdown-table-formatter'; exitCode = $markdownExit; argv = @('deno') + $arguments; log = $markdownLog; rawBytesSha256 = (Get-FileHash -LiteralPath $markdownLog -Algorithm SHA256).Hash.ToLowerInvariant() })
$files = @(
    Get-ChildItem -LiteralPath (Join-Path $taskRoot 'apps/poms-api-rust/src/project_cost_governance') -Filter '*.rs'
    Get-Item -LiteralPath (Join-Path $PSScriptRoot 'HANDOFF25.md')
    Get-Item -LiteralPath (Join-Path $PSScriptRoot 'PG-REPLAY25.md')
    Get-Item -LiteralPath (Join-Path $PSScriptRoot 'archive-source25.ps1')
    Get-Item -LiteralPath (Join-Path $PSScriptRoot 'build-delivery25.py')
    Get-Item -LiteralPath (Join-Path $PSScriptRoot 'run-static25.ps1')
)
$bad = @()
foreach ($file in $files) {
    $content = [IO.File]::ReadAllText($file.FullName)
    if ($content -match '(?m)[ \t]+\r?$' -or -not $content.EndsWith("`n")) { $bad += $file.FullName }
}
$checks.Add([ordered]@{ name = 'owned-source-support-whitespace'; exitCode = [int]($bad.Count -ne 0); files = @($files.FullName); failures = $bad })
$diffLog = Join-Path $runRoot 'git-diff-check.stdout.log'
[IO.File]::WriteAllBytes($diffLog, [byte[]]@())
& git diff --check 2>&1 | Tee-Object -FilePath $diffLog | Out-Host
$diffExit = $LASTEXITCODE
$checks.Add([ordered]@{ name = 'tracked-root-scaffolding-git-diff-check'; exitCode = $diffExit; argv = @('git','diff','--check'); log = $diffLog; rawBytesSha256 = (Get-FileHash -LiteralPath $diffLog -Algorithm SHA256).Hash.ToLowerInvariant() })
[ordered]@{
    kind = 'R4F-correction25-owned-static-checks'
    capturedAt = [DateTimeOffset]::UtcNow.ToString('o')
    checks = $checks
    productScope = 'F untracked source checked by explicit file scan; git diff --check covers only tracked Root scaffolding'
    sharedDatabaseExecuted = $false
} | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $runRoot 'receipt.json') -Encoding utf8NoBOM
if (@($checks | Where-Object { $_.exitCode -ne 0 }).Count -ne 0) { exit 1 }
Write-Host 'F25 owned Markdown / source whitespace checks passed'
