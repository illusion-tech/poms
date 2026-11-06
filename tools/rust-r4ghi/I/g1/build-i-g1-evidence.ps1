$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath '.').Path
$taskOutput = Join-Path $taskRoot 'tools/rust-r4ghi/I/g1'
$taskExpectedOutput = 'E:\projects\worktrees\poms-r3hijk-next28\poms\tools\rust-r4ghi\I\g1'
if ($taskOutput -ne $taskExpectedOutput) { throw 'Unexpected audit output directory' }
$taskSourcePaths = @(
    '.agents/skills/poms-implementation-governance/SKILL.md',
    '.agents/skills/poms-implementation-governance/references/governance-summary.md',
    'docs/design/api-route-canonical-inventory.md',
    'docs/adr/015-api-route-canonical-grammar.md',
    'docs/design/rust-r0-api-operations.json',
    'docs/design/rust-r4-scope-and-dependencies.md',
    'docs/design/backend-rust-migration-plan.md',
    'docs/design/project-lifecycle-design.md',
    'docs/design/phase2-commission-freeze-at-handover.md',
    'docs/design/phase2-handover-closure-rules.md',
    'docs/design/commission-settlement-design.md',
    'docs/design/table-structure-freeze-design.md',
    'docs/design/interface-command-design.md',
    'docs/design/interface-openapi-dto-design.md',
    'docs/design/archive/slices/ex-09a-commission-freeze-version-baseline.md',
    'docs/design/archive/slices/ex-09b-commission-freeze-command-query-baseline.md',
    'docs/design/archive/slices/ex-09d-commission-freeze-dispute-change-baseline.md',
    'apps/poms-api/src/app/features/project/project.controller.ts',
    'apps/poms-api/src/app/features/project/project.service.ts',
    'apps/poms-api/src/app/features/project/project.repository.ts',
    'apps/poms-api/src/app/features/project/project-query.service.ts',
    'apps/poms-api/src/app/features/project/acceptance-record.entity.ts',
    'apps/poms-api/src/app/features/project/project-completion-record.entity.ts',
    'apps/poms-api/src/app/features/project/project-archive-record.entity.ts',
    'apps/poms-api/src/app/features/project/project.service.spec.ts',
    'apps/poms-api/src/app/features/project/project-query.service.spec.ts',
    'apps/poms-api/src/app/features/project-handover/project-handover-command.service.ts',
    'apps/poms-api/src/app/features/commission/commission.controller.ts',
    'apps/poms-api/src/app/features/commission/commission-role-assignment.controller.ts',
    'apps/poms-api/src/app/features/commission/commission.service.ts',
    'apps/poms-api/src/app/features/commission/commission.repository.ts',
    'apps/poms-api/src/app/features/commission/commission-role-assignment.entity.ts',
    'apps/poms-api/src/migrations/Migration20260423130000_ex23_acceptance_record.ts',
    'apps/poms-api/src/migrations/Migration20260424100000_ex24_project_completion_record.ts',
    'apps/poms-api/src/migrations/Migration20260424143000_ex25_project_archive_record.ts',
    'apps/poms-api/src/migrations/Migration20260426100000_ex34a_project_archive_record_reversal_replacement.ts',
    'apps/poms-api/src/migrations/Migration20260416130000_ex09a_commission_freeze_chain.ts',
    'apps/poms-api/src/migrations/Migration20260418110000_ex11d3_commission_current_unique.ts',
    'apps/poms-api/src/migrations/Migration20260502133000_ex56d3_commission_enum_checks.ts',
    'apps/poms-api/src/migrations/Migration20261104060000_rust_r4def_execution_cost.ts',
    'libs/api/contracts/src/lib/project/project.dto.ts',
    'libs/api/contracts/src/lib/commission/commission.dto.ts',
    'libs/shared/contracts/src/lib/shared-contracts.ts',
    'libs/shared/api-spec/openapi.json',
    'apps/poms-api-rust/src/lib.rs',
    'apps/poms-api-rust/src/http.rs',
    'apps/poms-api-rust/src/projects/service.rs',
    'apps/poms-api-rust/src/projects/validation.rs',
    'apps/poms-api-rust/src/projects/store.rs',
    'apps/poms-api-rust/src/contract_support/http.rs',
    'apps/poms-api-rust/src/contract_support/mod.rs',
    'apps/poms-api-rust/src/project_handover/service.rs',
    'apps/poms-api-rust/src/project_handover/sources.rs',
    'apps/poms-api-rust/src/project_handover/view.rs',
    'apps/poms-api-rust/src/handover_facts/mod.rs',
    'apps/poms-api-rust/src/approval/domain.rs',
    'apps/poms-api-rust/src/approval_common/domain_schema.rs',
    'apps/poms-api-rust/src/approval_common/session.rs',
    'apps/poms-api-rust/src/approval_common/service.rs',
    'tools/rust-r4def/combined-operation-map16.json',
    'apps/poms-admin/src/app/features/project/project-detail.ts',
    'apps/poms-admin/src/app/features/project/project-list.ts',
    'apps/poms-admin/src/app/features/commission/project-commission-freeze-binding.ts',
    'libs/admin/data-access/src/lib/project/project.store.ts'
)
$taskSources = foreach ($taskPath in $taskSourcePaths) {
    $taskAbsolute = Join-Path $taskRoot $taskPath
    if (-not (Test-Path -LiteralPath $taskAbsolute -PathType Leaf)) { throw "Missing source $taskPath" }
    $taskBytes = [System.IO.File]::ReadAllBytes($taskAbsolute)
    $taskText = [System.Text.Encoding]::UTF8.GetString($taskBytes)
    $taskNormalized = $taskText.Replace("`r`n", "`n")
    [ordered]@{
        path = $taskPath
        bytes = $taskBytes.Length
        rawSha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($taskBytes)).ToLowerInvariant()
        normalizedSha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData([System.Text.Encoding]::UTF8.GetBytes($taskNormalized))).ToLowerInvariant()
        lineCount = ($taskNormalized -split "`n").Length
    }
}
$taskManifest = [ordered]@{
    formatVersion = 1
    auditKind = 'read-only-static-g1-candidate'
    providedHead = 'aaa4b16ac66092f0cb1dc6646a02cf14e80823ee'
    headIndependentlyVerified = $false
    reason = 'Owner prohibited Git and GitHub operations in this audit worktree'
    root = $taskRoot
    normalization = 'UTF8 decode; CRLF-to-LF only; preserve BOM, bare CR, other whitespace'
    files = @($taskSources)
}
$taskInventory = Get-Content -Raw -LiteralPath 'docs/design/rust-r0-api-operations.json' | ConvertFrom-Json
$taskCanonical = @{
    ProjectController_createAcceptanceRecord = 251
    ProjectController_listAcceptanceRecords = 252
    ProjectController_createProjectCompletionRecord = 253
    ProjectController_listProjectCompletionRecords = 254
    ProjectController_createProjectArchiveRecord = 255
    ProjectController_listProjectArchiveRecords = 256
    ProjectArchiveRecordController_replaceProjectArchiveRecord = 257
    ProjectArchiveRecordController_voidProjectArchiveRecord = 258
    CommissionController_getCurrentRoleAssignment = 200
    CommissionController_createRoleAssignment = 201
    CommissionRoleAssignmentController_getRoleAssignmentDetail = 118
    CommissionRoleAssignmentController_freezeRoleAssignment = 119
}
$taskOperations = for ($taskIndex = 0; $taskIndex -lt $taskInventory.operations.Count; $taskIndex++) {
    $taskOperation = $taskInventory.operations[$taskIndex]
    if ($taskCanonical.ContainsKey($taskOperation.operationId)) {
        [ordered]@{
            operationId = $taskOperation.operationId
            method = $taskOperation.method
            path = $taskOperation.path
            canonicalPath = $taskOperation.path -replace '^/api', ''
            canonicalCapability = $taskOperation.canonicalInventory.capability
            canonicalCurrentLine = $taskCanonical[$taskOperation.operationId]
            inventorySource = 'docs/design/rust-r0-api-operations.json'
            inventoryJsonPointer = "/operations/$taskIndex"
            migrationPrimary = $taskOperation.migration.primary
            migrationDependencies = $taskOperation.migration.dependencies
            permissionsAll = $taskOperation.authorization.all
            csrf = $taskOperation.authorization.csrf
            requestBody = $taskOperation.contract.requestBody
            responseStatusesDeclared = $taskOperation.contract.responseStatusCodes
            schemas = $taskOperation.contract.schemaRefs
            dtoSources = @($taskOperation.contract.dtoSources | ForEach-Object { [ordered]@{name=$_.name;schema=$_.schema;path=$_.path} })
            currentControllerPath = $taskOperation.source.path
            limitation = 'R0 inventory source line numbers are historical; current controller/schema/manifest are authoritative for this audit'
        }
    }
}
$taskAudit = [ordered]@{
    formatVersion = 1
    status = 'G1-Pending'
    slice = 'I: acceptance 2 + completion 2 + archive 4'
    taskIds = @{batch=110;I=113;stageAcceptance=114;independentUserFix=115;R4Parent=101;migrationParent=57}
    baseline = @{providedHead='aaa4b16ac66092f0cb1dc6646a02cf14e80823ee';providedBranch='codex/poms-r4ghi-next25';root=$taskRoot;headVerified=$false;formalRustOperationsInput=240;formalR4DeliveredInput=67;formalR4TotalInput=92;IAddedCertified=0}
    scope = @{allowedWrites='tools/rust-r4ghi/I/g1/**';gitOrGithubUsed=$false;credentialsRead=$false;databaseOrApiStarted=$false;productImplementation=$false;runtimeTestClaims=$false;expectedModel='gpt-6.1-sol/max';actualModelVerified=$false;FastVerified=$false}
    artifacts = @{review='i-lifecycle-g1-audit.md';sources='i-source-manifest.json'}
    operations = @($taskOperations | Where-Object { $_.migrationPrimary -eq 'R4' })
    minimumR5Dependency = @($taskOperations | Where-Object { $_.migrationPrimary -eq 'R5' })
    currentProducerAudit = @(
        @{capability='commission role assignment / freeze';present=$false;evidence=@('apps/poms-api-rust/src/lib.rs','apps/poms-api-rust/src/contract_support/http.rs:44-52','apps/poms-api-rust/src/approval/domain.rs:90-91');note='Approval consumes current frozen rows; generic ORM mapping is not a producer'},
        @{capability='attachment handover minimal facts';present=$true;evidence=@('apps/poms-api-rust/src/handover_facts/mod.rs:1-3');note='Four read projections only, no writes, status gate or role freeze producer'},
        @{capability='real handover and receipt-mode freeze';present=$true;evidence=@('apps/poms-api-rust/src/project_handover/service.rs:568-646');note='Leaves project stage unchanged and explicitly blocks execution pending R5 freeze'},
        @{capability='handover to execution / execution to acceptance command';present=$false;evidence=@('apps/poms-api-rust/src/project_handover/service.rs:646','apps/poms-api-rust/src/projects/service.rs:158-161','apps/poms-api/src/app/features/project/project.service.ts:266-475');note='Creation accepts arbitrary currentStage; not valid progression evidence'}
    )
    blockers = @(
        @{id='I-B1';classification='existing-baseline-drift';summary='Arbitrary advanced CreateProject.currentStage bypasses actual admission; freeze/create/phase commands absent';resolution='Tighten new creation, deliver minimum R5 and two governed phase commands; never fabricate state via SQL'},
        @{id='I-B2';classification='design-change-required';summary='New phase action routes have no canonical inventory rows';resolution='Root freezes authoritative rows, DTO/OpenAPI, stage facts and permissions before coding'},
        @{id='I-B3';classification='design-change-required';summary='Creation=assessment has no route to handover if upstream producer stage synchronization is omitted';resolution='Real D prepare emits handover-entered plus project CAS in same outer transaction; do not invent early history'},
        @{id='I-B4';classification='existing-baseline-drift';summary='Node allows createRoleAssignment to supersede frozen assignment directly, and lacks valid weight-total and responsibility guards';resolution='Minimum R5 replaces drafts only; freeze exact weights and responsibilities; frozen changes remain dispute-first'},
        @{id='I-B5';classification='design-change-required';summary='Native freeze summarySnapshotId aliases handover summary, which does not freeze assignment participants/weights';resolution='Freeze own immutable payload/summary and document field semantics before implementation'}
    )
    dependencyOrder = @('real pre-signing and activated contract plus receivable plan','D prepare and handover-entered, real per-user confirmations, confirmed handover plus receipt freeze','R5-P1 current draft and explicit role freeze with same immutable source chain','R4 explicit startExecution','R4 explicit startAcceptance','I acceptance confirmed','I completion and project completed atomically','I archive optional terminal milestone, replace or void')
    dependencyCycleRule = 'R5-P1 may consume confirmed handover facts and receipt freeze, never I acceptance/completion or H/R5 payout; I terminal facts do not require payout. H consumes real R4 producers without waiting for R5.'
    stageCommandProposals = @(
        @{operationId='ProjectController_startExecution';method='POST';path='/api/projects/{projectId}:startExecution';canonicalFrozen=$false;permission='project:write';requestFields=@('expectedProjectVersion: positive int','sourceHandoverId: UUID','commissionRoleAssignmentId: UUID','expectedRoleAssignmentVersion: positive int','handoverSummarySnapshotId: UUID','sourcePayloadHash: lowercase 64 hex','reason: trimmed 1..1000');sourceGate='active handover project + current confirmed producer handover + current frozen producer role assignment, same chain';effects=@('execution-entered immutable record','project stage CAS to execution','same-transaction audit')},
        @{operationId='ProjectController_startAcceptance';method='POST';path='/api/projects/{projectId}:startAcceptance';canonicalFrozen=$false;permission='project:write';requestFields=@('expectedProjectVersion: positive int','executionStageRecordId: UUID','readinessSummary: trimmed 1..2000','evidenceSummary: trimmed 1..2000');sourceGate='active execution project and true same-project execution record, still-valid freeze chain';effects=@('acceptance-entered immutable record','project stage CAS to acceptance','same-transaction audit')}
    )
    creationPolicyProposal = @{newCreate='currentStage missing or assessment only; explicit invalid advanced stage 400; no silent rewrite';historicalRead='Preserve stored stage and source facts; do not backfill generated admission history';historicalWrite='Require real source qualification; missing producer facts cannot pass certification';historicalRecovery='Separate controlled requalification/import slice if needed';upstreamBridge='Real D prepare validates approved activated contract, plan, pre-signing producers, then handover-entered + project CAS in same outer TX'}
    transactionRules = @('one outer transaction and borrowed CommonSession/PendingAuthentication','project lock then source/target rows in stable order; re-read after locking','CAS checked row_version even when legacy expectedVersion omitted','completion insert + project CAS + audit atomically','archive old exit current + new insert + audit atomically','freeze payload/summary + assignment CAS + audit atomically','audit or pending-auth flush failure rolls back business facts','unknown commit remains unknown, not certified rollback')
    archiveRules = @{stage='terminal ancillary milestone, no new stage';current='recorded status; existing partial unique';completedSource='same-project confirmed completion';closedSource='project closed-lost/closed-terminated with status closed and closedAt';replacement='path identity old current recorded, status superseded, new recorded with same anchor and supersedes id';void='current recorded to voided, keep history, no project rollback';afterVoid='no current, new create allowed';settlement='archive/completion does not assert payout or final financial settlement complete'}
    independentDelivery = @{canImplement='All 8 after their own G1, independently of future full R5 settlement';canAcceptBeforeDependencies=@('three lists under genuine missing/empty/history read scenarios','guard rejection/authorization/DTO behavior','archive behavior only against genuine existing terminal facts, labeled partial compatibility');cannotCertify=@('real execution to completion happy path without minimum R5 and phase producer facts','closed branch from fresh project without a real close producer','UI producer flow using current read-only acceptance/completion/freeze pages')}
    publicEditOwner = 'Root; I agent only proposes DDL/DTO/UI in own directory'
    userDecisionsPending = @('4 R5 operations + 2 phase commands + initial-stage tightening and D handover bridge','exact commission role categories, duplicate-user-role/zero-weight/precision/responsibility policy','own freeze-summary field semantics','whether completion remains accepted/conditional of any existing acceptanceType','whether fresh closed path is required, which would require a governed close producer')
    checks = @{staticSourceAudit='ran and completed';gitDiff='not allowed in this audit';HTTP='not run';PostgreSQL='not run';UI='not run';faultInjection='not run';concurrency='not run';RustAndNodeBuildTests='not required for read-only audit; final G1 must freeze implementation checks'}
    parentCloseRule = '#113 child close does not close #101; #114 complete stage acceptance is mandatory before #101. #57 remains Open.'
    memoryUsed = @{path='MEMORY.md';lines='347-352';rolloutId='01a1745d-bfa3-7603-b07d-16afa227d566';purpose='governance boundaries only, not current business/runtime evidence'}
}
$taskManifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $taskOutput 'i-source-manifest.json') -Encoding utf8
$taskAudit | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath (Join-Path $taskOutput 'i-lifecycle-g1-audit.json') -Encoding utf8
[ordered]@{operations=$taskAudit.operations.Count;minimumR5Operations=$taskAudit.minimumR5Dependency.Count;sources=$taskSources.Count;status=$taskAudit.status} | ConvertTo-Json
