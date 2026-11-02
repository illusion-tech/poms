$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath('E:/projects/worktrees/poms-r3hijk-next28/poms')
$outRoot = [IO.Path]::GetFullPath((Join-Path $taskRoot 'tmp/rust-r3hijk/a-input'))
if (-not $outRoot.StartsWith($taskRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected output root' }
$encoding = [Text.UTF8Encoding]::new($false)
function Write-InputText([string]$relative,[string]$value) {
    $target = [IO.Path]::GetFullPath((Join-Path $outRoot $relative))
    if (-not $target.StartsWith($outRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Output escaped author directory' }
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
    [IO.File]::WriteAllText($target,$value.Replace("`r`n","`n").TrimEnd()+"`n",$encoding)
}
function Write-InputJson([string]$relative,$value) { Write-InputText $relative ($value | ConvertTo-Json -Depth 100) }
function Read-Source([string]$relative) {
    $bytes = [IO.File]::ReadAllBytes((Join-Path $taskRoot $relative))
    [ordered]@{ path=$relative.Replace('\','/'); bytes=$bytes.Length; rawSha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant(); text=[Text.Encoding]::UTF8.GetString($bytes) }
}
$relativePaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$groups = @(
    'apps/poms-api/src/app/features/lead',
    'apps/poms-api/src/migrations'
)
foreach($group in $groups) {
    Get-ChildItem -LiteralPath (Join-Path $taskRoot $group) -File -Filter '*.ts' | ForEach-Object {
        [void]$relativePaths.Add([IO.Path]::GetRelativePath($taskRoot,$_.FullName).Replace('\','/'))
    }
}
foreach($path in @(
    'libs/shared/contracts/src/lib/shared-contracts.ts','libs/api/contracts/src/lib/lead/lead.dto.ts',
    'libs/shared/api-spec/openapi.json','libs/shared/api-client/api/lead.service.ts',
    'apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.service.ts',
    'apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.repository.ts',
    'apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.entity.ts',
    'apps/poms-api/src/app/features/attachment/attachment.service.ts',
    'apps/poms-api/src/app/features/attachment/attachment.repository.ts',
    'apps/poms-api/src/app/features/attachment/attachment.entity.ts',
    'apps/poms-api/src/app/features/business-number/business-number.service.ts',
    'apps/poms-api/src/app/features/business-number/business-number-sequence.entity.ts',
    'apps/poms-api/src/app/features/customer/customer.service.ts',
    'apps/poms-api/src/app/features/dictionary/dictionary.service.ts',
    'apps/poms-api/src/app/features/project/project.entity.ts',
    'apps/poms-api/src/app/features/sales-follow-up/sales-follow-up-record.entity.ts',
    'apps/poms-api/src/app/core/date/business-date.utils.ts',
    'apps/poms-api/src/app/core/runtime-audit/runtime-audit.service.ts',
    'apps/poms-api/src/app/core/runtime-audit/runtime-audit.repository.ts',
    'apps/poms-api/src/app/core/runtime-audit/audit-log.entity.ts',
    'apps/poms-api/src/app/core/auth/auth-session.service.ts',
    'apps/poms-api/src/app/core/auth/auth-session.repository.ts',
    'apps/poms-api/src/app/core/auth/auth.module.ts',
    'apps/poms-api/src/app/core/auth/guards/session-auth.guard.ts',
    'apps/poms-api/src/app/core/auth/guards/auth-csrf.guard.ts',
    'apps/poms-api/src/app/core/auth/guards/permissions.guard.ts',
    'apps/poms-api/src/app/core/persistence/persistence.config.ts',
    'apps/poms-api/src/app/app.module.ts','apps/poms-api/src/main.ts',
    'libs/vendor/nestjs-zod/src/pipe.ts','libs/vendor/nestjs-zod/src/validate.ts',
    'libs/vendor/nestjs-zod/src/exception.ts','libs/vendor/nestjs-zod/src/serializer.ts',
    'libs/admin/data-access/src/lib/lead/lead.store.ts','apps/poms-admin/src/app/features/lead/lead-list.ts',
    'apps/poms-admin/src/app/features/lead/lead-list.spec.ts','apps/poms-admin/src/app.routes.ts',
    'apps/poms-admin-e2e/src/lead-bootstrap.journey.spec.ts',
    'apps/poms-api-e2e/src/poms-api/lead-workflow.e2e-spec.ts','apps/poms-api-e2e/src/support/lead-api.ts',
    'apps/poms-api-rust/src/projects/store.rs','apps/poms-api-rust/src/projects/service.rs',
    'apps/poms-api-rust/src/projects/model.rs','apps/poms-api-rust/src/customers/service.rs',
    'apps/poms-api-rust/src/business_numbers/service.rs','apps/poms-api-rust/src/attachments/service.rs',
    'apps/poms-api-rust/src/attachments/store.rs','apps/poms-api-rust/src/auth/model.rs',
    'apps/poms-api-rust/src/auth/store.rs','apps/poms-api-rust/src/auth/js_json.rs',
    'apps/poms-api-rust/src/compat/json.rs','apps/poms-api-rust/src/compat/scalars.rs',
    'apps/poms-api-rust/src/database.rs','apps/poms-api-rust/src/error.rs',
    'package.json','pnpm-lock.yaml','docs/design/api-route-canonical-inventory.md',
    'docs/design/rust-r3-operation-slices.json','docs/design/backend-rust-migration-plan.md',
    '.agents/skills/poms-implementation-governance/SKILL.md',
    '.agents/skills/poms-implementation-governance/references/governance-summary.md',
    '.agents/skills/poms-github-task-governance/SKILL.md'
)) { [void]$relativePaths.Add($path) }
$ranges = @{
    'libs/shared/contracts/src/lib/shared-contracts.ts' = @(@(2074,2792))
    'apps/poms-api/src/app/features/attachment/attachment.service.ts' = @(@(862,925),@(2180,2193))
    'apps/poms-api/src/app/features/attachment/attachment.repository.ts' = @(@(125,166),@(260,267))
    'apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.service.ts' = @(@(515,537))
    'apps/poms-api/src/app/features/business-number/business-number.service.ts' = @(@(1,82))
    'apps/poms-api/src/app/core/runtime-audit/runtime-audit.service.ts' = @(@(62,87))
    'apps/poms-api/src/app/core/date/business-date.utils.ts' = @(@(1,33))
}
$sources = [Collections.Generic.List[object]]::new()
$excerpts = [Text.StringBuilder]::new()
[void]$excerpts.AppendLine('H14 static source excerpts. Full raw source bytes/hash in source-manifest.json. Excerpts only normalize line endings; no runtime result.')
foreach($path in ($relativePaths | Sort-Object)) {
    $source=Read-Source $path
    $lines=$source.text -split '\r?\n'
    $keyLines=[Collections.Generic.List[object]]::new()
    for($n=0;$n -lt $lines.Length;$n++) {
        if($lines[$n] -match '^export (class|interface|const|function)|^    (async|private|public) |^    @(Get|Post|Patch)|pub (async )?fn|^pub struct|copyActiveLinksToTarget|uq_lso_lead_|source_lead_id_foreign') {
            if($keyLines.Count -lt 38){$keyLines.Add([ordered]@{line=$n+1;text=$lines[$n].Trim()})}
        }
    }
    if($keyLines.Count -eq 0){$keyLines.Add([ordered]@{line=1;text=$lines[0]})}
    $role=if($path.StartsWith('apps/poms-api/src/migrations/')){'protected-existing-DDL'}elseif($path.StartsWith('apps/poms-api-rust/')){'existing-Rust-adapter-read-only-interface-reference'}elseif($path -match '\.spec\.|e2e'){ 'static-test-or-locator-hint-not-runtime-proof'}elseif($path.StartsWith('docs/') -or $path.StartsWith('.agents/')){'formal-governance-or-route-input-root-owned'}else{'protected-Native-contract-or-consumer-source'}
    $sources.Add([ordered]@{path=$source.path;bytes=$source.bytes;rawSha256=$source.rawSha256;role=$role;keySourceLines=$keyLines})
    if($path.StartsWith('apps/poms-api/src/app/features/lead/') -and $path -notmatch '\.spec\.ts$'){
        $take=@(@(1,$lines.Length))
    }elseif($ranges.ContainsKey($path)){$take=$ranges[$path]}else{$take=@()}
    if($take.Count -gt 0 -and $take[0] -is [int]) { $take=,$take }
    if($take.Count -gt 0){
        [void]$excerpts.AppendLine('')
        [void]$excerpts.AppendLine(('SOURCE '+$source.path+' rawSHA256='+$source.rawSha256))
        foreach($range in $take){
            $first=[int]$range[0];$last=[Math]::Min([int]$range[1],[int]$lines.Length)
            for($n=$first;$n -le $last;$n++){[void]$excerpts.AppendLine(('{0}: {1}' -f $n,$lines[$n-1]))}
        }
    }
}
Write-InputText 'snapshots/native-source-excerpts.txt' $excerpts.ToString()
$inventorySource=Read-Source 'docs/design/rust-r3-operation-slices.json'
$inventory=$inventorySource.text | ConvertFrom-Json -AsHashtable
$leadOperations=@($inventory.operations | Where-Object {$_.owner -eq 'future:lead'})
$specSource=Read-Source 'libs/shared/api-spec/openapi.json'
$spec=$specSource.text | ConvertFrom-Json -AsHashtable
$paths=[ordered]@{}
foreach($operation in $leadOperations){
    if(-not $paths.Contains($operation.path)){$paths[$operation.path]=[ordered]@{}}
    $method=$operation.method.ToLowerInvariant()
    $paths[$operation.path][$method]=$spec.paths[$operation.path][$method]
}
$refs=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$queue=[Collections.Generic.Queue[string]]::new()
function Collect-Refs($node){
    if($node -is [Collections.IDictionary]){
        if($node.Contains('$ref') -and $node['$ref'] -match '^#/components/schemas/(.+)$'){
            if($refs.Add($Matches[1])){$queue.Enqueue($Matches[1])}
        }
        foreach($key in $node.Keys){Collect-Refs $node[$key]}
    }elseif($node -is [Collections.IEnumerable] -and $node -isnot [string]){foreach($item in $node){Collect-Refs $item}}
}
Collect-Refs $paths
while($queue.Count -gt 0){$name=$queue.Dequeue();Collect-Refs $spec.components.schemas[$name]}
$schemas=[ordered]@{}
foreach($name in ($refs | Sort-Object)){$schemas[$name]=$spec.components.schemas[$name]}
Write-InputJson 'snapshots/openapi-lead14.json' ([ordered]@{
    kind='static-original-OpenAPI-extract-not-generated-spec';base='7f970c992291c61477eb9bd83a48cec19a769d88'
    sourcePath=$specSource.path;sourceBytes=$specSource.bytes;sourceRawSha256=$specSource.rawSha256
    openapi=$spec.openapi;paths=$paths;components=[ordered]@{schemas=$schemas;securitySchemes=$spec.components.securitySchemes}
    operationCount=$leadOperations.Count;pathCount=$paths.Count;recursiveSchemaCount=$schemas.Count
})
Write-InputJson 'snapshots/operation-inventory-lead14.json' ([ordered]@{
    kind='static-current-future-lead-operation-assignment-extract';base='7f970c992291c61477eb9bd83a48cec19a769d88'
    sourcePath=$inventorySource.path;sourceBytes=$inventorySource.bytes;sourceRawSha256=$inventorySource.rawSha256;operations=$leadOperations
})
Write-InputJson 'source-manifest.json' ([ordered]@{
    kind='H-lead14-G1-static-source-material';base='7f970c992291c61477eb9bd83a48cec19a769d88'
    sourceRoot='E:/projects/worktrees/poms-r3hijk-next28/poms';branch='codex/poms-r3hijk-next28'
    baseIdentity='Root supplied; raw source hashes captured from one ReadAllBytes per file; no product/environment execution'
    authority='Current Native source plus Root future Native actual witnesses; this package has no runtime/G1 certification'
    sourceCount=$sources.Count;migrationCount=@($sources | Where-Object {$_.role -eq 'protected-existing-DDL'}).Count
    sourceMetadataNote='Root may update current governance metadata; exact captured bytes/lines remain explicit and are not silently claimed to be a Git readback.'
    sources=$sources
})
$artifacts=[Collections.Generic.List[object]]::new()
foreach($relative in @('input-review.txt','interfaces-proposal.txt','acceptance-matrix.json','native-fixture-draft01.mjs','prepare-input.ps1','source-manifest.json','snapshots/native-source-excerpts.txt','snapshots/openapi-lead14.json','snapshots/operation-inventory-lead14.json')){
    $bytes=[IO.File]::ReadAllBytes((Join-Path $outRoot $relative))
    $artifacts.Add([ordered]@{path=('tmp/rust-r3hijk/a-input/'+$relative);bytes=$bytes.Length;rawSha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant();utf8Bom=($bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191);containsCR=([Array]::IndexOf($bytes,[byte]13)-ge 0)})
}
Write-InputJson 'artifact-receipt.json' ([ordered]@{kind='H-G1-static-byte-receipt';status='prepared-not-run-not-G1-Pass';sourceCount=$sources.Count;operationCount=$leadOperations.Count;openapiPaths=$paths.Count;recursiveSchemas=$schemas.Count;artifacts=$artifacts})
[ordered]@{sourceCount=$sources.Count;operationCount=$leadOperations.Count;openapiPaths=$paths.Count;recursiveSchemas=$schemas.Count;artifacts=$artifacts} | ConvertTo-Json -Depth 5
