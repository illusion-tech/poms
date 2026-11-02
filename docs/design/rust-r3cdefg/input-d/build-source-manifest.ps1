$ErrorActionPreference = 'Stop'

# Static source/hash collection only. This script runs no build, test, service,
# database, HTTP, environment discovery, installation or Git mutation.
$sliceWorkspacePath = 'E:/projects/worktrees/poms-r3cdefg-next16/poms'
$sliceInputPath = Join-Path $sliceWorkspacePath 'tmp/rust-r3cdefg/d-input'
$manifestOutputPath = Join-Path $sliceInputPath 'source-manifest.json'
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function New-SourceEntry {
    param([string]$RelativePath, [object[]]$KeySymbols = @(), [string]$Role = 'reviewed-source-input')
    $absoluteSourcePath = Join-Path $sliceWorkspacePath $RelativePath
    $sourceInfo = Get-Item -LiteralPath $absoluteSourcePath
    $sourceLineCount = [System.IO.File]::ReadAllLines($absoluteSourcePath).Count
    foreach ($keySymbol in $KeySymbols) {
        if ($keySymbol.lineStart -lt 1 -or $keySymbol.lineEnd -lt $keySymbol.lineStart -or $keySymbol.lineEnd -gt $sourceLineCount) {
            throw ('Invalid static source range: {0} / {1}' -f $RelativePath, $keySymbol.symbol)
        }
    }
    [ordered]@{
        relativePath = $RelativePath.Replace('\', '/')
        bytes = $sourceInfo.Length
        rawBytesSha256 = (Get-FileHash -LiteralPath $absoluteSourcePath -Algorithm SHA256).Hash.ToLowerInvariant()
        lineCount = $sourceLineCount
        role = $Role
        keySymbols = @($KeySymbols)
    }
}

function Key {
    param([string]$Symbol, [int]$Start, [int]$End)
    [ordered]@{ symbol = $Symbol; lineStart = $Start; lineEnd = $End }
}

$sourceSpecs = @(
    @{ path = 'docs/design/backend-rust-migration-plan.md'; keys = @((Key 'agent configuration and ownership' 31 50)) },
    @{ path = 'docs/design/rust-r3-scope-and-dependencies.md'; keys = @((Key 'R3 previous A/B14 and remaining44' 4 36)) },
    @{ path = 'docs/design/rust-r3-operation-slices.json'; keys = @() },
    @{ path = 'docs/design/api-route-canonical-inventory.md'; keys = @((Key 'sales-follow-up four operations' 343 346), (Key 'customer-contact three operations' 352 354)) },
    @{ path = 'docs/design/schema-ddl-design.md'; keys = @((Key 'design document is not migration SQL' 31 40), (Key 'common schema naming' 50 58)) },
    @{ path = 'docs/design/archive/slices/rust-r3ab-customer-project-baseline.md'; keys = @((Key 'joint original Zod code-point decision' 35 35)) },
    @{ path = '.agents/skills/poms-implementation-governance/SKILL.md'; keys = @() },
    @{ path = '.agents/skills/poms-github-task-governance/SKILL.md'; keys = @() },
    @{ path = '.agents/skills/poms-implementation-governance/references/governance-summary.md'; keys = @() },
    @{ path = 'package.json'; keys = @((Key 'zod dependency declared' 58 58)) },
    @{ path = 'pnpm-lock.yaml'; keys = @() },
    @{ path = 'libs/shared/contracts/src/lib/shared-contracts.ts'; keys = @((Key 'DictionaryCodeSchema' 2396 2404), (Key 'contact enums' 2883 2907), (Key 'contact request/query/summary schemas' 3090 3167), (Key 'follow-up enums/query/request/summary schemas' 3460 3615)) },
    @{ path = 'libs/api/contracts/src/lib/sales-intelligence/sales-intelligence.dto.ts'; keys = @((Key 'contact createZodDto wrappers' 24 32)) },
    @{ path = 'libs/api/contracts/src/lib/sales-follow-up/sales-follow-up.dto.ts'; keys = @((Key 'follow-up createZodDto wrappers' 11 21)) },
    @{ path = 'libs/vendor/nestjs-zod/src/exception.ts'; keys = @((Key 'ZodValidationException envelope' 7 22)) },
    @{ path = 'libs/vendor/nestjs-zod/src/validate.ts'; keys = @((Key 'schema.parse and exception handling' 10 21)) },
    @{ path = 'libs/vendor/nestjs-zod/src/pipe.ts'; keys = @((Key 'global DTO transform path' 46 68)) },
    @{ path = 'apps/poms-api/src/app/app.module.ts'; keys = @((Key 'Zod APP_PIPE and serializer interceptor' 67 74)) },
    @{ path = 'apps/poms-api/src/app/core/auth/guards/permissions.guard.ts'; keys = @((Key 'all/any permission decisions and denied audit/error' 27 77)) },
    @{ path = 'apps/poms-api/src/app/core/persistence/persistence.config.ts'; keys = @((Key 'existing ORM runtime options; no explicit flushMode' 12 68)) },
    @{ path = 'apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.controller.ts'; keys = @((Key 'CustomerContactController routes and missing create gender projection' 30 71)) },
    @{ path = 'apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.service.ts'; keys = @((Key 'contact audit ordered fields and redaction' 44 46), (Key 'list/create/update contact' 67 159), (Key 'requireCustomer and requireContact existence-only' 475 489), (Key 'buildCustomerContactAuditValues' 578 591), (Key 'collectAuditChangedFields and recordSalesFactFieldAudit' 630 667), (Key 'redacted UTF16 length and JSON equality' 669 693), (Key 'mapCustomerContact' 695 715), (Key 'optionalText' 810 813)) },
    @{ path = 'apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.repository.ts'; keys = @((Key 'EM/context and contact reads/writes/order' 29 79)) },
    @{ path = 'apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.entity.ts'; keys = @((Key 'CustomerContactSchema' 38 81)) },
    @{ path = 'apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.service.spec.ts'; keys = @((Key 'direct service gender is not HTTP evidence' 163 195), (Key 'mocked redacted audit and no-op tests' 198 287)) },
    @{ path = 'apps/poms-api/src/app/features/sales-follow-up/sales-follow-up.controller.ts'; keys = @((Key 'list/create/replace/void routes and any permissions' 15 94)) },
    @{ path = 'apps/poms-api/src/app/features/sales-follow-up/sales-follow-up.service.ts'; keys = @((Key 'list context mapping' 26 40), (Key 'create validation order and defaults' 42 81), (Key 'append-only replacement and post-save audit' 83 141), (Key 'void and post-save audit' 143 181), (Key 'operator/anchors existence and same-customer checks' 183 226), (Key 'create owner/null/org fallback' 228 257), (Key 'replacement owner/null/org fallback' 259 288), (Key 'list batched context reads' 290 318), (Key 'expectedVersion and appendComment' 320 333), (Key 'auditSnapshot and standalone recordAudit' 335 368)) },
    @{ path = 'apps/poms-api/src/app/features/sales-follow-up/sales-follow-up.repository.ts'; keys = @((Key 'reminder enums and open statuses' 14 20), (Key 'findMany customer AND opportunity OR ordering' 52 79), (Key 'save methods with implicit flush boundaries' 93 121), (Key 'reference reads' 123 181), (Key 'syncReminderTodoForActiveRecord' 183 252), (Key 'cancelReminderTodosForSource' 254 267), (Key 'resolveReminderTarget' 269 297), (Key 'UTF16 reminder summary length/slice' 299 306)) },
    @{ path = 'apps/poms-api/src/app/features/sales-follow-up/sales-follow-up.mapper.ts'; keys = @((Key 'fixed response mapping and fallback names' 18 51)) },
    @{ path = 'apps/poms-api/src/app/features/sales-follow-up/sales-follow-up-record.entity.ts'; keys = @((Key 'indexes/uniques/checks' 20 73), (Key 'fields/FKs/version/timestamps' 74 171)) },
    @{ path = 'apps/poms-api/src/app/features/sales-follow-up/sales-follow-up.repository.spec.ts'; keys = @((Key 'mocked reminder tests are not SQL acceptance' 12 137)) },
    @{ path = 'apps/poms-api/src/app/features/sales-follow-up/sales-follow-up.service.spec.ts'; keys = @() },
    @{ path = 'apps/poms-api/src/app/features/customer/customer.service.ts'; keys = @((Key 'requireActiveCustomer' 258 264)) },
    @{ path = 'apps/poms-api/src/app/features/customer/customer.entity.ts'; keys = @() },
    @{ path = 'apps/poms-api/src/app/features/customer/customer.repository.ts'; keys = @() },
    @{ path = 'apps/poms-api/src/app/features/lead/lead.entity.ts'; keys = @((Key 'lead customer/nullable owner inputs' 68 87)) },
    @{ path = 'apps/poms-api/src/app/features/project/project.entity.ts'; keys = @((Key 'project optional source/customer and owners' 36 43)) },
    @{ path = 'apps/poms-api/src/app/features/platform/platform-user.entity.ts'; keys = @((Key 'actor primaryOrg reference' 24 34)) },
    @{ path = 'apps/poms-api/src/app/features/platform/org-unit.entity.ts'; keys = @() },
    @{ path = 'apps/poms-api/src/app/features/dictionary/dictionary.service.ts'; keys = @((Key 'requireActiveItem domain/code status lookup' 66 76)) },
    @{ path = 'apps/poms-api/src/app/features/dictionary/dictionary.repository.ts'; keys = @() },
    @{ path = 'apps/poms-api/src/app/core/runtime-audit/runtime-audit.service.ts'; keys = @((Key 'recordAuditLog supplied EM vs standalone save' 55 76)) },
    @{ path = 'apps/poms-api/src/app/core/runtime-audit/runtime-audit.repository.ts'; keys = @() },
    @{ path = 'apps/poms-api/src/app/core/runtime-audit/runtime-audit-request.utils.ts'; keys = @() },
    @{ path = 'apps/poms-api/src/app/features/approval/todo-item.entity.ts'; keys = @() },
    @{ path = 'apps/poms-api/src/app/features/approval/approval.controller.ts'; keys = @((Key 'GET me/todos' 46 51)) },
    @{ path = 'apps/poms-api/src/app/features/approval/approval.service.ts'; keys = @((Key 'real open Todo query and context reads' 426 470), (Key 'mapTodoItemToSummary and China reminder node name' 1142 1193)) },
    @{ path = 'apps/poms-api-rust/src/customers/service.rs'; keys = @((Key 'require_active_customer restricted reuse' 84 98)) },
    @{ path = 'apps/poms-api-rust/src/customers/store.rs'; keys = @((Key 'workspace_follow_ups current R3A consumer' 439 445)) },
    @{ path = 'apps/poms-api-rust/src/customers/validation.rs'; keys = @() },
    @{ path = 'apps/poms-api-rust/src/projects/service.rs'; keys = @() },
    @{ path = 'apps/poms-api-rust/src/projects/model.rs'; keys = @((Key 'Wire and JsString helpers are Root-owned reuse input' 49 86)) },
    @{ path = 'apps/poms-api-rust/src/error.rs'; keys = @() },
    @{ path = 'apps/poms-api-rust/src/auth/js_json.rs'; keys = @((Key 'JS UTF16 lossless string and JSON object' 18 148)) },
    @{ path = 'apps/poms-api-rust/src/compat/json.rs'; keys = @((Key 'Field Missing/Null/Value' 13 18)) },
    @{ path = 'apps/poms-api-rust/src/compat/scalars.rs'; keys = @() },
    @{ path = 'apps/poms-api-rust/src/approval/service.rs'; keys = @((Key 'get_my_todos_with_session real fact reads' 158 247)) },
    @{ path = 'apps/poms-api-rust/src/approval_common/projection.rs'; keys = @((Key 'todo reminder projection' 145 177)) },
    @{ path = 'apps/poms-api-rust/src/approval_common/service.rs'; keys = @((Key 'open_todos current assignee open/processing createdAt order' 1206 1225)) },
    @{ path = 'apps/poms-api-rust/src/approval_common/schema.rs'; keys = @() },
    @{ path = 'apps/poms-api-rust/src/approval_common/store.rs'; keys = @() },
    @{ path = 'libs/admin/data-access/src/lib/sales-intelligence/sales-intelligence.store.ts'; keys = @((Key 'contact load/create/update with reload' 47 131)) },
    @{ path = 'libs/admin/data-access/src/lib/sales-follow-up/sales-follow-up.store.ts'; keys = @() },
    @{ path = 'libs/admin/data-access/src/lib/auth/auth.store.ts'; keys = @((Key 'refreshTodos' 120 127)) },
    @{ path = 'apps/poms-admin/src/app/shared/ui/sales-intelligence-panel.ts'; keys = @((Key 'contact edit/write UI' 272 319), (Key 'contact dialog and field limits' 454 514), (Key 'contact create sends gender and update only known changed fields' 893 971), (Key 'buildContactUpdateRequest and normalization' 1162 1216)) },
    @{ path = 'apps/poms-admin/src/app/shared/ui/sales-follow-up-panel.ts'; keys = @((Key 'list/history and dictionary options' 386 416), (Key 'create/replace/void payload and reload' 529 605)) },
    @{ path = 'apps/poms-admin/src/app/features/customer/customer-workspace.ts'; keys = @((Key 'original customer contact panel' 454 454)) },
    @{ path = 'apps/poms-admin/src/app/features/project/project-detail.ts'; keys = @() },
    @{ path = 'apps/poms-admin/src/app/features/lead/lead-list.ts'; keys = @() },
    @{ path = 'apps/poms-admin/src/app/shared/navigation/todo-navigation.ts'; keys = @((Key 'real customer/lead/project reminder navigation' 31 83)) }
)

$sourceEntries = @($sourceSpecs | ForEach-Object { New-SourceEntry -RelativePath $_.path -KeySymbols $_.keys })
$migrationEntries = @(
    Get-ChildItem -LiteralPath (Join-Path $sliceWorkspacePath 'apps/poms-api/src/migrations') -File -Filter '*.ts' |
        Sort-Object Name |
        ForEach-Object {
            New-SourceEntry -RelativePath ('apps/poms-api/src/migrations/' + $_.Name) -Role 'protected-existing-cumulative-DDL'
        }
)
$clientEntries = @(
    Get-ChildItem -LiteralPath (Join-Path $sliceWorkspacePath 'libs/shared/api-client') -Recurse -File |
        Sort-Object FullName |
        ForEach-Object {
            $clientRelativePath = [System.IO.Path]::GetRelativePath($sliceWorkspacePath, $_.FullName).Replace('\', '/')
            New-SourceEntry -RelativePath $clientRelativePath -Role 'protected-generated-client-no-edit'
        }
)
$specAbsolutePath = Join-Path $sliceWorkspacePath 'libs/shared/api-spec/openapi.json'
$nativeSpec = [System.IO.File]::ReadAllText($specAbsolutePath) | ConvertFrom-Json
$operationCount = 0
$httpMethods = @('get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace')
foreach ($pathEntry in $nativeSpec.paths.PSObject.Properties) {
    foreach ($operation in $pathEntry.Value.PSObject.Properties) {
        if ($httpMethods -contains $operation.Name) { $operationCount++ }
    }
}
$manifest = [ordered]@{
    version = 1
    kind = 'G1-static-source-input-no-runtime-certification'
    workspace = $sliceWorkspacePath
    branch = 'codex/poms-r3cdefg-next16'
    baseCommit = '0fced204c917a37b84a2ad50838e722e764b8f78'
    owner = 'author-3; R3E #90 / R3F #91'
    collectedAtUtc = [System.DateTime]::UtcNow.ToString('o')
    scope = [ordered]@{ customerContacts = 3; salesFollowUp = 4; total = 7 }
    evidenceBoundary = 'Static source read and raw hash only; no Native/Rust runtime, database, tests or UI execution. Source expectation is not actual Pass.'
    protectedCounts = [ordered]@{
        fullNativePaths = @($nativeSpec.paths.PSObject.Properties).Count
        fullNativeOperations = $operationCount
        fullNativeSchemas = @($nativeSpec.components.schemas.PSObject.Properties).Count
        migrationFiles = $migrationEntries.Count
        generatedClientFiles = $clientEntries.Count
    }
    sources = $sourceEntries
    protectedArtifacts = @(
        (New-SourceEntry -RelativePath 'libs/shared/api-spec/openapi.json' -Role 'protected-full-Native-OpenAPI-no-edit'),
        (New-SourceEntry -RelativePath 'apps/poms-api-rust/src/shared/generated.rs' -Role 'protected-shared-enum-generated-no-edit')
    )
    migrationFiles = $migrationEntries
    generatedClientFiles = $clientEntries
    importantMigrationSymbols = @(
        @{ relativePath = 'apps/poms-api/src/migrations/Migration20260322235500_init_approval_and_todo.ts'; keySymbols = @((Key 'todo schema and open-source unique index' 14 21)) },
        @{ relativePath = 'apps/poms-api/src/migrations/Migration20260430120000_ex44_sales_follow_up_record.ts'; keySymbols = @((Key 'follow-up table fields and restrictive/context FKs' 6 40)) },
        @{ relativePath = 'apps/poms-api/src/migrations/Migration20260501100000_ex48a_sales_follow_up_change_lifecycle.ts'; keySymbols = @((Key 'status/self-FKs and partial unique links' 5 52)) },
        @{ relativePath = 'apps/poms-api/src/migrations/Migration20260503160000_ex58b_enum_code_value_direct_cutover.ts'; keySymbols = @((Key 'stable lowercase todo source/type/target checks' 348 350)) },
        @{ relativePath = 'apps/poms-api/src/migrations/Migration20260503170000_ex58c_configurable_dictionary_runtime.ts'; keySymbols = @((Key 'dictionary schema and remove fixed follow-up type CHECK' 6 46)) },
        @{ relativePath = 'apps/poms-api/src/migrations/Migration20260504100000_ex61_sales_intelligence_discussion.ts'; keySymbols = @((Key 'customer_contact table' 6 24), (Key 'contact FK/status CHECK' 127 128), (Key 'contact customer/status index' 263 263)) },
        @{ relativePath = 'apps/poms-api/src/migrations/Migration20260504110000_ex62_customer_contact_gender.ts'; keySymbols = @((Key 'gender column/check/default' 5 7)) }
    )
}
$manifestJson = ($manifest | ConvertTo-Json -Depth 40).Replace("`r`n", "`n") + "`n"
[System.IO.File]::WriteAllText($manifestOutputPath, $manifestJson, $utf8NoBom)
[ordered]@{
    output = 'tmp/rust-r3cdefg/d-input/source-manifest.json'
    sourceFiles = $sourceEntries.Count
    migrationFiles = $migrationEntries.Count
    generatedClientFiles = $clientEntries.Count
    bytes = (Get-Item -LiteralPath $manifestOutputPath).Length
    rawBytesSha256 = (Get-FileHash -LiteralPath $manifestOutputPath -Algorithm SHA256).Hash.ToLowerInvariant()
} | ConvertTo-Json
