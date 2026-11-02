$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath('E:/projects/worktrees/poms-r3cdefg-next16/poms')
$outRoot = [IO.Path]::GetFullPath((Join-Path $taskRoot 'tmp/rust-r3cdefg/a-input'))
if (-not $outRoot.StartsWith($taskRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Unexpected output root'
}
$encoding = [Text.UTF8Encoding]::new($false)
function Write-InputText([string]$relative, [string]$value) {
    $targetPath = [IO.Path]::GetFullPath((Join-Path $outRoot $relative))
    if (-not $targetPath.StartsWith($outRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Output escaped input directory'
    }
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($targetPath)) | Out-Null
    [IO.File]::WriteAllText($targetPath, $value.Replace("`r`n", "`n").TrimEnd() + "`n", $encoding)
}
function Write-InputJson([string]$relative, $value) {
    Write-InputText $relative ($value | ConvertTo-Json -Depth 100)
}
function Raw-Source([string]$relative) {
    $sourcePath = Join-Path $taskRoot $relative
    $bytes = [IO.File]::ReadAllBytes($sourcePath)
    [ordered]@{
        path = $relative.Replace('\', '/')
        bytes = $bytes.Length
        rawSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
        utf8Bom = $bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191
        text = [Text.Encoding]::UTF8.GetString($bytes)
    }
}
$definitions = @(
    @{ path='apps/poms-api/src/app/features/project/project.controller.ts'; role='protected-native-controller-and-mappers'; symbols=@('ProjectController.listProjectPricingMarginReviews','ProjectController.getProjectPricingMarginWorkspace','ProjectController.listProjectTechnicalCostPackages','ProjectController.getProjectTechnicalCostWorkspace','ProjectController.createProjectPricingMarginReview','ProjectController.createProjectTechnicalCostPackage','mapProjectPricingMarginReviewToSummary','mapProjectTechnicalCostPackageToSummary'); ranges=@(@(154,185),@(298,315),@(440,506)) },
    @{ path='apps/poms-api/src/app/features/project/project.service.ts'; role='protected-native-command-algorithms'; symbols=@('PRESIGNING_PROJECT_STAGES','createProjectPricingMarginReview','createProjectTechnicalCostPackage','assertPricingMarginReferencesConsistent','assertPricingAmounts','countPricingMarginBlockers','assertMoneyConsistent','parseNonNegativeDecimal','parseSignedDecimal','formatMoney','resolveHighestRiskLevel'); ranges=@(@(94,105),@(557,765),@(793,881),@(914,921)) },
    @{ path='apps/poms-api/src/app/features/project/project-query.service.ts'; role='protected-native-query-mappers-projection'; symbols=@('listProjectPricingMarginReviews','getProjectPricingMarginWorkspace','listProjectTechnicalCostPackages','getProjectTechnicalCostWorkspace','mapProjectBidCommercialProcess','mapProjectPricingMarginReview','mapProjectTechnicalCostPackage','buildPricingMarginAllowedActions','buildTechnicalCostAllowedActions','buildOwnerLabel','isClosedProject'); ranges=@(@(63,63),@(457,587),@(819,845),@(878,1010),@(1069,1204),@(1653,1658),@(1673,1674)) },
    @{ path='apps/poms-api/src/app/features/project/project.repository.ts'; role='protected-native-repository-order-and-flush'; symbols=@('findCurrentProjectBidCommercialProcessByProjectId','findProjectTechnicalCostPackageById','findCurrentProjectTechnicalCostPackageByProjectId','findProjectPricingMarginReviewsByProjectId','findCurrentProjectPricingMarginReviewByProjectId','saveProjectPricingMarginReview','saveProjectTechnicalCostPackage'); ranges=@(@(268,387),@(422,443),@(484,505)) },
    @{ path='apps/poms-api/src/app/features/project/project-technical-cost-package.entity.ts'; role='protected-native-cost-orm'; symbols=@('ProjectTechnicalCostPackageSchema','ProjectTechnicalScopeItemSchema','ProjectTechnicalRiskItemSchema','ProjectTechnicalCostItemSchema'); ranges=@(@(1,204)) },
    @{ path='apps/poms-api/src/app/features/project/project-pricing-margin-review.entity.ts'; role='protected-native-pricing-orm'; symbols=@('ProjectPricingMarginReviewSchema','ProjectPricingMarginConditionItemSchema'); ranges=@(@(1,170)) },
    @{ path='apps/poms-api/src/app/features/project/project-bid-commercial-process.entity.ts'; role='protected-native-bid-producer-orm'; symbols=@('ProjectBidCommercialProcessSchema') },
    @{ path='apps/poms-api/src/app/features/project/project.entity.ts'; role='protected-native-project-orm'; symbols=@('ProjectSchema') },
    @{ path='apps/poms-api/src/app/features/project/project.module.ts'; role='protected-native-provider-wiring'; symbols=@('ProjectModule') },
    @{ path='libs/shared/contracts/src/lib/shared-contracts.ts'; role='protected-zod-dto-and-enum-ssot'; symbols=@('TECHNICAL_FEASIBILITY_DECISION_DEFINITIONS','TAX_REVIEW_STATUS_DEFINITIONS','NonNegativeDecimalStringSchema','NonNegativeMoneyStringSchema','NonNegativeRatioStringSchema','SignedRatioStringSchema','CreateProjectTechnicalCostPackageRequestSchema','ProjectTechnicalCostPackageSummarySchema','ProjectTechnicalCostWorkspaceViewSchema','CreateProjectPricingMarginReviewRequestSchema','ProjectPricingMarginReviewSummarySchema','ProjectPricingMarginWorkspaceViewSchema'); ranges=@(@(4524,4767),@(4888,4979),@(4981,5174)) },
    @{ path='libs/api/contracts/src/lib/project/project.dto.ts'; role='protected-nest-dto-bindings'; symbols=@('CreateProjectPricingMarginReviewRequestDto','CreateProjectTechnicalCostPackageRequestDto') },
    @{ path='libs/shared/api-spec/openapi.json'; role='protected-full-native-openapi'; symbols=@('ProjectController_createProjectTechnicalCostPackage','ProjectController_createProjectPricingMarginReview') },
    @{ path='libs/shared/api-client/api/project.service.ts'; role='protected-generated-client-consumer'; symbols=@('projectControllerCreateProjectPricingMarginReview','projectControllerCreateProjectTechnicalCostPackage','projectControllerGetProjectPricingMarginWorkspace','projectControllerGetProjectTechnicalCostWorkspace','projectControllerListProjectPricingMarginReviews','projectControllerListProjectTechnicalCostPackages') },
    @{ path='apps/poms-api/src/app/app.module.ts'; role='protected-global-zod-boundary'; symbols=@('APP_PIPE ZodValidationPipe','APP_INTERCEPTOR ZodSerializerInterceptor') },
    @{ path='apps/poms-api/src/main.ts'; role='protected-native-global-prefix-parser-bootstrap'; symbols=@('bootstrap') },
    @{ path='apps/poms-api/src/config/openapi.config.ts'; role='protected-prefix-operation-configuration'; symbols=@('GLOBAL_PREFIX','buildOpenApiConfig') },
    @{ path='libs/vendor/nestjs-zod/src/pipe.ts'; role='protected-vendor-validation-boundary'; symbols=@('createZodValidationPipe') },
    @{ path='libs/vendor/nestjs-zod/src/validate.ts'; role='protected-vendor-schema-parse'; symbols=@('validate') },
    @{ path='libs/vendor/nestjs-zod/src/exception.ts'; role='protected-validation-envelope'; symbols=@('ZodValidationException') },
    @{ path='libs/vendor/nestjs-zod/src/serializer.ts'; role='protected-response-metadata-boundary'; symbols=@('getContextResponseSchema') },
    @{ path='apps/poms-api/src/app/core/auth/auth.module.ts'; role='protected-guard-order'; symbols=@('AuthModule') },
    @{ path='apps/poms-api/src/app/core/auth/guards/session-auth.guard.ts'; role='protected-session-guard'; symbols=@('SessionAuthGuard') },
    @{ path='apps/poms-api/src/app/core/auth/guards/auth-csrf.guard.ts'; role='protected-csrf-guard'; symbols=@('AuthCsrfGuard') },
    @{ path='apps/poms-api/src/app/core/auth/guards/permissions.guard.ts'; role='protected-permission-guard'; symbols=@('PermissionsGuard') },
    @{ path='apps/poms-api/src/app/core/auth/auth-session.service.ts'; role='protected-session-managed-state'; symbols=@('resolveSessionToken','#touchSession') },
    @{ path='apps/poms-api/src/app/core/auth/auth-session.repository.ts'; role='protected-independent-session-sql'; symbols=@('touchLastSeenIfDue','saveAll') },
    @{ path='apps/poms-api/src/app/core/persistence/persistence.config.ts'; role='protected-native-uow-config'; symbols=@('createBaseMikroOrmOptions','createNestMikroOrmOptions') },
    @{ path='apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection.module.ts'; role='protected-provider-only-not-global-interceptor'; symbols=@('SensitiveFieldProjectionModule') },
    @{ path='apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection.policy.ts'; role='protected-projection-reference'; symbols=@('source policy not invoked by six operations') },
    @{ path='apps/poms-api/src/app/core/runtime-audit/runtime-audit.service.ts'; role='protected-auth-security-audit'; symbols=@('recordSecurityEvent') },
    @{ path='apps/poms-admin/src/app.routes.ts'; role='protected-original-route-journey'; symbols=@('projects/:id/workspace','technical-cost','pricing-margin'); ranges=@(@(72,124)) },
    @{ path='apps/poms-admin/src/app/features/project/project-technical-cost-workspace.ts'; role='protected-original-cost-readonly-ui'; symbols=@('ProjectTechnicalCostWorkspace','ngOnInit','riskItems','costItems') },
    @{ path='apps/poms-admin/src/app/features/project/project-pricing-margin-workspace.ts'; role='protected-original-pricing-ui'; symbols=@('ProjectPricingMarginWorkspace','canWritePricingMargin','submitPricingReview','createEmptyPricingForm','createPricingFormFromWorkspace','buildPricingRequest'); ranges=@(@(499,560),@(941,1093)) },
    @{ path='apps/poms-admin/src/app/features/project/project-pre-signing-overview.ts'; role='protected-original-reachable-entry'; symbols=@('technical-cost entry','pricing-margin entry') },
    @{ path='apps/poms-admin/src/app/features/project/project-workspace-shell.ts'; role='protected-original-workspace-provider'; symbols=@('ProjectWorkspaceShell') },
    @{ path='libs/admin/data-access/src/lib/project/project-workspace.store.ts'; role='protected-original-generated-client-usage'; symbols=@('loadTechnicalCostWorkspace','loadPricingMarginWorkspace','loadPricingMarginReviewHistory','createPricingMarginReview'); ranges=@(@(383,402),@(467,527)) },
    @{ path='apps/poms-api/src/app/features/project/project.service.spec.ts'; role='static-test-hints-mocked-not-runtime-proof'; symbols=@('creates a pricing margin review','creates a technical cost package') },
    @{ path='apps/poms-api/src/app/features/project/project-query.service.spec.ts'; role='static-query-test-hints-mocked-not-runtime-proof'; symbols=@('returns an actionable pricing margin workspace','returns an actionable technical cost workspace') },
    @{ path='apps/poms-api/src/app/features/project/project.controller.spec.ts'; role='static-controller-test-hints-not-runtime-proof'; symbols=@('ProjectController') },
    @{ path='apps/poms-admin-e2e/src/project-workspace.journey.spec.ts'; role='static-locator-hints-route-mocks-not-backend-proof'; symbols=@('page.route','pricingDialog','technical-cost') },
    @{ path='apps/poms-admin/src/app/features/project/project-technical-cost-workspace.spec.ts'; role='static-ui-test-hints-not-runtime-proof'; symbols=@('ProjectTechnicalCostWorkspace') },
    @{ path='apps/poms-admin/src/app/features/project/project-pricing-margin-workspace.spec.ts'; role='static-ui-test-hints-not-runtime-proof'; symbols=@('ProjectPricingMarginWorkspace') },
    @{ path='apps/poms-api-rust/src/projects/store.rs'; role='existing-public-project-read-adapter'; symbols=@('ProjectRow','find','user_names','org_names') },
    @{ path='apps/poms-api-rust/src/projects/model.rs'; role='existing-public-wire-and-trim'; symbols=@('Wire','trim_js') },
    @{ path='apps/poms-api-rust/src/projects/service.rs'; role='existing-project-integration-pattern-not-new-source-contract'; symbols=@('ProjectsService','ProjectsError') },
    @{ path='apps/poms-api-rust/src/projects/validation.rs'; role='existing-static-validator-reference-private-helpers-not-imported'; symbols=@('validate_create') },
    @{ path='apps/poms-api-rust/src/projects/http.rs'; role='existing-root-owned-http-reference'; symbols=@('router','dispatch','normalize_uri') },
    @{ path='apps/poms-api-rust/src/auth/js_json.rs'; role='existing-public-utf16-json'; symbols=@('JsString','JsObject') },
    @{ path='apps/poms-api-rust/src/auth/model.rs'; role='existing-request-local-session-types'; symbols=@('ResolvedSession','SessionFlush','clock_now') },
    @{ path='apps/poms-api-rust/src/auth/store.rs'; role='existing-public-managed-session-flush'; symbols=@('flush_managed_session') },
    @{ path='apps/poms-api-rust/src/compat/scalars.rs'; role='existing-public-js-number-and-date'; symbols=@('legacy_number','js_to_fixed','js_iso_string') },
    @{ path='apps/poms-api-rust/src/compat/json.rs'; role='existing-public-presence-types'; symbols=@('Field') },
    @{ path='apps/poms-api-rust/src/database.rs'; role='existing-database-transaction-and-quarantine'; symbols=@('Database.with_connection','DbError') },
    @{ path='package.json'; role='pinned-root-dependency-source'; symbols=@('zod','@mikro-orm/core') },
    @{ path='pnpm-lock.yaml'; role='exact-dependency-lock'; symbols=@('zod@4.6.1','@mikro-orm/core@7.0.11') },
    @{ path='docs/design/api-route-canonical-inventory.md'; role='formal-existing-route-inventory'; symbols=@('EX-26','EX-28'); ranges=@(@(232,234),@(238,240)) },
    @{ path='docs/design/backend-rust-migration-plan.md'; role='formal-migration-governance-root-may-amend'; symbols=@('1.1','1.2','3.1','R3A/B actual G4') },
    @{ path='docs/design/rust-r3-operation-slices.json'; role='formal-operation-assignment-root-may-amend'; symbols=@('R3C','R3G') },
    @{ path='docs/design/schema-ddl-design.md'; role='design-background-migrations-own-exact-existing-ddl'; symbols=@('Schema 与命名基线') },
    @{ path='docs/design/table-structure-freeze-design.md'; role='design-background-not-substitute-for-existing-ddl'; symbols=@('commercial_release_baseline') },
    @{ path='docs/design/archive/slices/ex-26-presigning-technical-cost-fact-source-baseline.md'; role='historical-design-known-differences-current-source-wins'; symbols=@('5. DTO / Contract Boundary','Required enums') },
    @{ path='docs/design/archive/slices/ex-28-presigning-pricing-margin-fact-source-baseline.md'; role='historical-design-business-background'; symbols=@('5. DTO / Contract Boundary') },
    @{ path='docs/design/archive/slices/fe-10-technical-cost-workspace-frontend-baseline.md'; role='historical-read-ui-background'; symbols=@('Browser journey') },
    @{ path='docs/design/archive/slices/fe-11-bid-pricing-workspace-frontend-baseline.md'; role='historical-ui-background-current-ui-wins'; symbols=@('FE-11') },
    @{ path='docs/design/archive/slices/fe-11-bid-pricing-workspace-frontend-g1-unblock-addendum.md'; role='historical-ui-background-not-current-write-contract'; symbols=@('only reading originally') },
    @{ path='.agents/skills/poms-implementation-governance/SKILL.md'; role='governance'; symbols=@('G1','cross-layer-high-risk') },
    @{ path='.agents/skills/poms-implementation-governance/references/governance-summary.md'; role='governance-risk-scaled-evidence'; symbols=@('Slice Type To Evidence') },
    @{ path='.agents/skills/poms-github-task-governance/SKILL.md'; role='github-issue-first-governance'; symbols=@('Phase 1 Rule') }
)
$sourceEntries = [Collections.Generic.List[object]]::new()
$excerpts = [Text.StringBuilder]::new()
[void]$excerpts.AppendLine('R3C/R3G static Native source excerpts. Numbered lines are verbatim text with line endings normalized to LF. Full raw source identity is in source-manifest.json. No runtime results.')
foreach ($def in $definitions) {
    $source = Raw-Source $def.path
    $sourceLines = $source.text -split '\r?\n'
    $entry = [ordered]@{
        path = $source.path
        bytes = $source.bytes
        rawSha256 = $source.rawSha256
        utf8Bom = $source.utf8Bom
        role = $def.role
        keySymbols = $def.symbols
        keyLineRanges = $(if($def.ranges) { @($def.ranges | ForEach-Object { [ordered]@{ start=$_[0]; end=$_[1] } }) } else { @() })
    }
    $sourceEntries.Add($entry)
    if ($def.ranges) {
        [void]$excerpts.AppendLine('')
        [void]$excerpts.AppendLine(('SOURCE ' + $source.path + ' rawSHA256=' + $source.rawSha256))
        foreach ($range in $def.ranges) {
            [void]$excerpts.AppendLine(('LINES ' + $range[0] + '-' + $range[1]))
            $rangeStart=[int]$range[0]
            $rangeEnd=[int]$range[1]
            $lastSourceLine=[int]$sourceLines.Length
            for ($lineNo=$rangeStart; $lineNo -le [Math]::Min($rangeEnd,$lastSourceLine); $lineNo++) {
                [void]$excerpts.AppendLine(('{0}: {1}' -f $lineNo, $sourceLines[$lineNo-1]))
            }
        }
    }
}
$migrationPaths = Get-ChildItem -LiteralPath (Join-Path $taskRoot 'apps/poms-api/src/migrations') -Filter '*.ts' -File | Sort-Object Name
foreach ($migrationFile in $migrationPaths) {
    $relative = [IO.Path]::GetRelativePath($taskRoot,$migrationFile.FullName).Replace('\','/')
    $source = Raw-Source $relative
    $sourceEntries.Add([ordered]@{
        path=$source.path; bytes=$source.bytes; rawSha256=$source.rawSha256; utf8Bom=$source.utf8Bom
        role='protected-existing-migration-raw-file'; keySymbols=@($migrationFile.BaseName); keyLineRanges=@()
    })
    if ($migrationFile.Name -match 'ex26_project_technical_cost_package|ex28_project_pricing_margin_review') {
        [void]$excerpts.AppendLine('')
        [void]$excerpts.AppendLine(('SOURCE ' + $source.path + ' rawSHA256=' + $source.rawSha256))
        $sourceLines = $source.text -split '\r?\n'
        for($lineNo=1;$lineNo -le $sourceLines.Length;$lineNo++) {
            [void]$excerpts.AppendLine(('{0}: {1}' -f $lineNo,$sourceLines[$lineNo-1]))
        }
    }
}
Write-InputText 'snapshots/native-source-excerpts.txt' $excerpts.ToString()
$specSource = Raw-Source 'libs/shared/api-spec/openapi.json'
$spec = $specSource.text | ConvertFrom-Json -AsHashtable
$paths = [ordered]@{}
foreach ($route in @('/api/projects/{projectId}/technical-cost-packages','/api/projects/{projectId}/technical-cost-workspace','/api/projects/{projectId}/pricing-margin-reviews','/api/projects/{projectId}/pricing-margin-workspace')) {
    $paths[$route] = $spec.paths[$route]
}
$refs = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$queue = [Collections.Generic.Queue[string]]::new()
function Collect-Refs($node) {
    if ($node -is [Collections.IDictionary]) {
        if ($node.Contains('$ref') -and $node['$ref'] -match '^#/components/schemas/(.+)$') {
            $name = $Matches[1]
            if ($refs.Add($name)) { $queue.Enqueue($name) }
        }
        foreach ($key in $node.Keys) { Collect-Refs $node[$key] }
    } elseif ($node -is [Collections.IEnumerable] -and $node -isnot [string]) {
        foreach($item in $node) { Collect-Refs $item }
    }
}
Collect-Refs $paths
while($queue.Count -gt 0) {
    $name = $queue.Dequeue()
    if(-not $spec.components.schemas.Contains($name)) { throw ('Unresolved schema '+$name) }
    Collect-Refs $spec.components.schemas[$name]
}
$schemas = [ordered]@{}
foreach($name in ($refs | Sort-Object)) { $schemas[$name]=$spec.components.schemas[$name] }
$operationIds = [Collections.Generic.List[string]]::new()
foreach($route in $paths.Keys) {
    foreach($verb in @('get','post')) {
        if($paths[$route].Contains($verb)) { $operationIds.Add($paths[$route][$verb].operationId) }
    }
}
Write-InputJson 'snapshots/openapi-six-operations.json' ([ordered]@{
    kind='static-original-openapi-extract-not-new-spec'; baseCommit='0fced204c917a37b84a2ad50838e722e764b8f78'
    sourcePath=$specSource.path; sourceBytes=$specSource.bytes; sourceRawSha256=$specSource.rawSha256
    openapi=$spec.openapi; paths=$paths
    components=[ordered]@{ schemas=$schemas; securitySchemes=$spec.components.securitySchemes }
    pathCount=$paths.Count; operationCount=$operationIds.Count; recursiveSchemaCount=$schemas.Count; operationIds=$operationIds
})
Write-InputJson 'source-manifest.json' ([ordered]@{
    schemaVersion=1; kind='static-source-material-manifest'; baseCommit='0fced204c917a37b84a2ad50838e722e764b8f78'
    baselineIdentity='Root supplied and checked out; this author records exact current raw bytes without running git or runtime checks'
    sourceRoot='E:/projects/worktrees/poms-r3cdefg-next16/poms'; issues=[ordered]@{R3C=88;R3G=92;parent=85;overall=57}
    hashMethod='SHA256 of single ReadAllBytes result; bytes before decoding or line-ending normalization'
    authority='Current Native source plus Root Native runtime witness; historical baselines are background with known drift'
    migrationFileCount=$migrationPaths.Count; sourceFileCount=$sourceEntries.Count
    scope='All entries are read only. Full native migrations listed for DDL protection; no DDL changes requested. Source roles distinguish protected product, public Rust adapters, historical background and Root-owned governance.'
    sources=$sourceEntries
})
$receipt = [Collections.Generic.List[object]]::new()
foreach($relative in @('input-review.md','acceptance-matrix.json','interfaces-proposal.md','prepare-source-input.ps1','source-manifest.json','snapshots/native-source-excerpts.txt','snapshots/openapi-six-operations.json')) {
    $bytes=[IO.File]::ReadAllBytes((Join-Path $outRoot $relative))
    $receipt.Add([ordered]@{
        path=('tmp/rust-r3cdefg/a-input/'+$relative); bytes=$bytes.Length
        rawSha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
        utf8Bom=$bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191
        containsCR=([Array]::IndexOf($bytes,[byte]13) -ge 0)
    })
}
Write-InputJson 'artifact-receipt.json' ([ordered]@{
    kind='static-input-artifact-byte-receipt'; status='prepared-not-G1-Pass-not-runtime-tested'
    sourceFiles=$sourceEntries.Count; migrations=$migrationPaths.Count
    openapiPaths=$paths.Count; openapiOperations=$operationIds.Count; recursiveSchemas=$schemas.Count
    artifacts=$receipt
})
[ordered]@{
    sourceFiles=$sourceEntries.Count; migrations=$migrationPaths.Count
    openapiPaths=$paths.Count; openapiOperations=$operationIds.Count; recursiveSchemas=$schemas.Count
    operationIds=$operationIds; artifacts=$receipt
} | ConvertTo-Json -Depth 6
