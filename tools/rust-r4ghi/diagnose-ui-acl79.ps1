$ErrorActionPreference = 'Stop'
$taskTarget = 'E:/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/private/ui-runtime14/dom14-source12-01'
if ((Get-ChildItem -LiteralPath $taskTarget -Force | Measure-Object).Count -ne 0) { throw 'Only the unused empty task directory may be diagnosed.' }
try {
    $taskIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $taskAcl = [System.Security.AccessControl.DirectorySecurity]::new()
    $taskAcl.SetAccessRuleProtection($true, $false)
    $taskAcl.SetOwner($taskIdentity)
    $taskAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($taskIdentity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
    $taskAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new([System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'), 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
    Set-Acl -LiteralPath $taskTarget -AclObject $taskAcl
    $taskResult = Get-Acl -LiteralPath $taskTarget
    if (-not $taskResult.AreAccessRulesProtected) { throw 'private ACL inheritance remained enabled' }
    [pscustomobject]@{ status = 'passed'; taskDirectoryOnly = $true; protected = $taskResult.AreAccessRulesProtected } | ConvertTo-Json -Compress
} catch {
    [pscustomobject]@{ status = 'failed'; type = $_.Exception.GetType().FullName; message = $_.Exception.Message; position = $_.InvocationInfo.PositionMessage; taskDirectoryOnly = $true } | ConvertTo-Json -Compress
    exit 1
}
