. (Join-Path $PSScriptRoot 'Common130.ps1')
$results = [Collections.Generic.List[object]]::new()
foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1' -File) {
    $tokens = $null
    $errors = $null
    $null = [Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$errors)
    if ($errors.Count -ne 0) { throw ($errors | Out-String) }
    $results.Add(@{check='PowerShell-AST'; file=$file.Name; result='Pass'})
}
$facts = Read-Json130 (Join-Path $PSScriptRoot 'root-facts130.template.json')
$blocked = $false
try { Assert-Facts130 'E:/projects/worktrees/poms-r3hijk-next28/poms' $facts 'Ready' }
catch { $blocked = $_.Exception.Message -eq 'Root facts not certified' }
if (-not $blocked) { throw 'Null facts unexpectedly admitted' }
$results.Add(@{check='null-facts-rejected-before-Root-I/O'; result='Pass'})
foreach ($unsafePath in @('../escape', 'C:/escape', 'docs/../../escape', '')) {
    $blocked = $false
    try { $null = Resolve-Path130 $PSScriptRoot $unsafePath } catch { $blocked = $true }
    if (-not $blocked) { throw "Unsafe path admitted: $unsafePath" }
}
$results.Add(@{check='path-escapes-rejected'; result='Pass'})
$example = @{issues=@(@{state='OPEN'})}
if ((Resolve-Pointer130 $example '/issues/0/state') -cne 'OPEN') { throw 'JSON pointer failed' }
$results.Add(@{check='actual-JSON-pointer-lookup'; result='Pass'})
@{kind='static-support-packet-verification'; rootMutation=$false; archiveEntrypointRun=$false; checks=$results.ToArray()} | ConvertTo-Json -Depth 10
