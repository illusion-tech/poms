$ErrorActionPreference = 'Stop'
$expectedRoot = 'E:/projects/worktrees/poms-r3hijk-next28/poms'
$expectedBranch = 'codex/poms-r3hijk-next28'
$expectedBase = '7f970c992291c61477eb9bd83a48cec19a769d88'
$rootPath = [System.IO.Path]::GetFullPath($expectedRoot)
$inputRoot = [System.IO.Path]::GetFullPath((Join-Path $rootPath 'tmp/rust-r3hijk/d-input'))
$outputPath = [System.IO.Path]::GetFullPath((Join-Path $inputRoot 'source-manifest.json'))
if (-not $outputPath.StartsWith($inputRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Output outside D input root' }
if (-not [string]::Equals((Get-Location).Path, $rootPath, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Explicit cwd required' }
$head = (& git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'git rev-parse failed' }
$branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) { throw 'git branch failed' }
if ($head -ne $expectedBase -or $branch -ne $expectedBranch) { throw 'Unexpected branch/base; stop before capture' }

# Source/hash/Git capture only. No product, package manager, fixture or test is run.
$sourceDefinitions = @(
  @{ path='apps/poms-api/src/app/features/business-discussion/business-discussion.controller.ts'; role='Native J HTTP delegation and permissions'; ranges=@(@(8,45)); patterns=@('@Get','@Post','HasAnyPermissions') },
  @{ path='apps/poms-api/src/app/features/business-discussion/business-discussion.service.ts'; role='Native J sole behavior input'; ranges=@(@(14,111),@(113,250),@(252,296)); patterns=@('async listBusinessDiscussionComments','async createBusinessDiscussionComment','private async resolveListTargets','private assertRelatedOpportunityAnchor','private mapComment') },
  @{ path='apps/poms-api/src/app/features/business-discussion/business-discussion.repository.ts'; role='Native J query and flush boundaries'; ranges=@(@(41,117)); patterns=@('async findThreadByTarget','async findThreadsByTargets','async findCommentsByThreadIds','async saveThreadAndComment') },
  @{ path='apps/poms-api/src/app/features/business-discussion/business-discussion.entity.ts'; role='Native J tables constraints defaults and date types'; ranges=@(@(13,98)); patterns=@('tableName:','uniques:','createdAt:','deleteRule') },
  @{ path='apps/poms-api/src/app/features/business-discussion/business-discussion.module.ts'; role='Native J injected dependency entities'; ranges=@(@(14,30)); patterns=@('forFeature','providers:') },
  @{ path='apps/poms-api/src/app/features/business-discussion/business-discussion.service.spec.ts'; role='Original J mock-unit test source, not executed'; ranges=@(@(46,113),@(115,153),@(155,159)); patterns=@('    it(') },
  @{ path='apps/poms-api/src/app/features/project/project.controller.ts'; role='Native K HTTP plain path parameter and project read guard'; ranges=@(@(98,112)); patterns=@('getWorkspaceGuidance','getTimeline') },
  @{ path='apps/poms-api/src/app/features/project/project-query.service.ts'; role='Native K sole query behavior input including all text and permission entries'; ranges=@(@(51,187),@(320,357),@(590,748),@(1218,1229),@(1305,1327),@(1342,1674)); patterns=@('async getProjectWorkspaceGuidance','async getProjectTimeline','private buildAllowedActions','private buildWorkspaceGuidanceText','private buildWorkspaceEntries','private isClosedProject') },
  @{ path='apps/poms-api/src/app/features/project/project.repository.ts'; role='Native K fact selectors and complete source ordering keys'; ranges=@(@(97,99),@(124,138),@(171,261)); patterns=@('async findById','async findLatestConfirmedHandoverByProjectId','async findLatestAcceptedAcceptanceRecordByProjectId','async findLatestConfirmedProjectCompletionRecordByProjectId','async findLatestRecordedProjectArchiveRecordByProjectId') },
  @{ path='apps/poms-api/src/app/features/project/project.entity.ts'; role='Shared project nullable anchor datetime and optimistic version fields'; ranges=@(@(10,64)); patterns=@('sourceLeadId:','customerId:','closedAt:','currentStage:') },
  @{ path='apps/poms-api/src/app/features/project/project.module.ts'; role='Native K dependency wiring'; ranges=@(@(24,54)); patterns=@('forFeature','ApprovalSummaryModule','providers:') },
  @{ path='apps/poms-api/src/app/features/project/project-query.service.spec.ts'; role='Original K query mock-unit sources, not executed'; ranges=@(@(342,524),@(526,639),@(1319,1507),@(1509,1512)); patterns=@('workspace guidance','project timeline','into project timeline') },
  @{ path='apps/poms-api/src/app/features/project/project.controller.spec.ts'; role='Original K HTTP delegation mock-unit sources, not executed'; ranges=@(@(191,228)); patterns=@('returns project workspace guidance','returns project timeline') },
  @{ path='libs/api/contracts/src/lib/business-discussion/business-discussion.dto.ts'; role='Native J DTO wrappers over shared Zod schemas'; ranges=@(@(1,15)); patterns=@('createZodDto') },
  @{ path='libs/api/contracts/src/lib/project/project.dto.ts'; role='Native K DTO wrappers'; ranges=@(@(89,91)); patterns=@('ProjectWorkspaceGuidanceViewDto','ProjectTimelineViewDto') },
  @{ path='libs/shared/contracts/src/lib/shared-contracts.ts'; role='Public types enums naming UUID/date/nullability and request limits SSOT'; ranges=@(@(2193,2241),@(3048,3075),@(3383,3454),@(4478,4522),@(5351,5386)); patterns=@('export const BusinessDiscussionCommentSummarySchema','export const BusinessDiscussionListQuerySchema','export const CreateBusinessDiscussionCommentRequestSchema','export const ProjectWorkspaceGuidanceViewSchema','export const ProjectTimelineEventSchema','export const ProjectTimelineViewSchema') },
  @{ path='libs/shared/api-spec/openapi.json'; role='Current generated public contract original, not regenerated'; ranges=@(@(5765,5838),@(10807,10899),@(20837,21084),@(33248,33449)); patterns=@('"operationId": "BusinessDiscussionController','"operationId": "ProjectController_getWorkspaceGuidance"','"operationId": "ProjectController_getTimeline"') },
  @{ path='docs/design/api-route-canonical-inventory.md'; role='Authoritative canonical public route rows'; ranges=@(@(231,231),@(241,241),@(365,366)); patterns=@('getProjectWorkspaceGuidance','getProjectTimeline','listBusinessDiscussionComments','createBusinessDiscussionComment') },
  @{ path='docs/design/rust-r3-operation-slices.json'; role='Current R3 operation inventory pending rows before formal Root G1'; ranges=@(@(391,576),@(4612,4749)); patterns=@('"operationId": "BusinessDiscussionController_list"','"operationId": "BusinessDiscussionController_create"','"operationId": "ProjectController_getTimeline"','"operationId": "ProjectController_getWorkspaceGuidance"') },
  @{ path='apps/poms-api/src/app/features/lead/lead.entity.ts'; role='A dependency raw Lead schema'; patterns=@('tableName:','leadName:','customerId:','convertedProjectId:') },
  @{ path='apps/poms-api/src/app/features/customer/customer.entity.ts'; role='Delivered customer dependency raw schema'; patterns=@('tableName:','displayName:','status:') },
  @{ path='apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.entity.ts'; role='B competitor and delivered contact dependency raw schemas'; patterns=@('tableName:','CompetitorIntelligenceRecordSchema','CustomerContactSchema','customerId:','leadId:','projectId:') },
  @{ path='apps/poms-api/src/app/features/sales-follow-up/sales-follow-up-record.entity.ts'; role='Delivered followup dependency including lifecycle statuses'; patterns=@('tableName:','customerId:','leadId:','projectId:','status:') },
  @{ path='apps/poms-api/src/app/features/platform/platform-user.entity.ts'; role='Actor/owner display lookup raw schema'; patterns=@('tableName:','displayName:') },
  @{ path='apps/poms-api/src/app/features/platform/org-unit.entity.ts'; role='Owner organization lookup raw schema'; patterns=@('tableName:','name:') },
  @{ path='apps/poms-api/src/app/features/contract/contract.entity.ts'; role='R4 contract read dependency only'; patterns=@('tableName:','signedAt:','updatedBy:','createdBy:') },
  @{ path='apps/poms-api/src/app/features/project-handover/project-handover.entity.ts'; role='R4 confirmed handover read dependency only'; ranges=@(@(100,175)); patterns=@('export const ProjectHandoverSchema','confirmedAt:','confirmedBy:') },
  @{ path='apps/poms-api/src/app/features/project/acceptance-record.entity.ts'; role='R4 acceptance read dependency only'; patterns=@('tableName:','acceptanceResult:','confirmedAt:','confirmedBy:') },
  @{ path='apps/poms-api/src/app/features/project/project-completion-record.entity.ts'; role='R4 completion read dependency only'; patterns=@('tableName:','completionResult:','completedAt:','completedBy:') },
  @{ path='apps/poms-api/src/app/features/project/project-archive-record.entity.ts'; role='R4 archive read dependency only'; patterns=@('tableName:','archiveAnchorStage:','status:','archivedAt:','archivedBy:') },
  @{ path='apps/poms-api/src/app/features/approval-summary/approval-summary.repository.ts'; role='Exact active snapshot selector and date ordering'; ranges=@(@(30,53)); patterns=@('async findActiveByTarget','orderBy:') },
  @{ path='apps/poms-api/src/app/features/approval-summary/approval-summary.entity.ts'; role='Workspace snapshot read dependency and export policy'; ranges=@(@(38,98)); patterns=@('export const ApprovalSummarySnapshotSchema','exportPolicy:','generatedAt:') },
  @{ path='apps/poms-api/src/migrations/Migration20260504100000_ex61_sales_intelligence_discussion.ts'; role='Original J/contact/competitor DDL, not executed'; ranges=@(@(95,124),@(153,163),@(239,274)); patterns=@('business_discussion_thread','business_discussion_comment') },
  @{ path='apps/poms-api/src/app/core/auth/auth.module.ts'; role='Global session->CSRF->permission guard order'; ranges=@(@(28,30)); patterns=@('APP_GUARD') },
  @{ path='apps/poms-api/src/app/core/auth/guards/session-auth.guard.ts'; role='Shared exact session guard source'; ranges=@(@(26,53),@(72,77)); patterns=@('function createUnauthorized') },
  @{ path='apps/poms-api/src/app/core/auth/guards/auth-csrf.guard.ts'; role='Shared exact unsafe-method CSRF source'; ranges=@(@(29,59),@(97,101)); patterns=@('UNSAFE_METHODS','csrf_failed') },
  @{ path='apps/poms-api/src/app/core/auth/guards/permissions.guard.ts'; role='Shared all/any permissions source and original denial object'; ranges=@(@(27,46),@(71,75)); patterns=@('hasAll','hasAny','permission_denied') },
  @{ path='apps/poms-api/src/app/core/auth/decorators/has-any-permissions.decorator.ts'; role='Native any permission metadata'; patterns=@('HasAnyPermissions') },
  @{ path='apps/poms-api/src/app/core/auth/decorators/has-permissions.decorator.ts'; role='Native all permission metadata'; patterns=@('HasPermissions') },
  @{ path='apps/poms-api/src/app/app.module.ts'; role='Global Zod pipe and serializer provider'; ranges=@(@(65,74)); patterns=@('ZodValidationPipe','ZodSerializerInterceptor') },
  @{ path='apps/poms-api/src/main.ts'; role='Native runtime prefix/bootstrap context'; ranges=@(@(17,29)); patterns=@('setGlobalPrefix') },
  @{ path='apps/poms-api/src/config/openapi.config.ts'; role='api prefix and auth schemes'; ranges=@(@(4,13)); patterns=@('GLOBAL_PREFIX','addCookieAuth') },
  @{ path='libs/vendor/nestjs-zod/src/pipe.ts'; role='Plain string path not Zod DTO; strict declaration default false'; ranges=@(@(39,68)); patterns=@('strictSchemaDeclaration = false','!isZodDto') },
  @{ path='libs/vendor/nestjs-zod/src/exception.ts'; role='Original validation and serialization error object shapes'; ranges=@(@(7,31)); patterns=@('Validation failed','class ZodSerializationException') },
  @{ path='libs/vendor/nestjs-zod/src/serializer.ts'; role='Response serializer requires explicit response schema metadata; ApiOk alone not assumed runtime parse'; ranges=@(@(57,62),@(151,157)); patterns=@('getContextResponseSchema','ZodSerializerDtoOptions') },
  @{ path='apps/poms-api-rust/src/projects/model.rs'; role='Existing JS text/wire/trim compatibility reference read only'; ranges=@(@(45,92)); patterns=@('pub struct Wire','pub fn trim_js') },
  @{ path='apps/poms-api-rust/src/error.rs'; role='Existing transport error reference; rawSQL behavior still needs Native actual'; ranges=@(@(18,63)); patterns=@('pub fn raw_json','pub fn http_like','pub fn internal') },
  @{ path='apps/poms-api-rust/src/compat/scalars.rs'; role='Existing date/scalar compatibility reference read only'; patterns=@('pub fn ') },
  @{ path='apps/poms-api-rust/src/auth/js_json.rs'; role='Existing UTF-16 code-unit wire reference read only'; patterns=@('pub struct JsString','pub fn ') },
  @{ path='docs/design/archive/slices/ex-61-sales-intelligence-business-discussion-baseline.md'; role='Historical business context; current source/Native supersedes cutoff specifics'; ranges=@(@(11,32),@(47,79)); patterns=@('Project','Lead') },
  @{ path='docs/design/archive/slices/ex-19-project-workspace-guidance-baseline.md'; role='Historical guidance background, not replacement for current entries implementation'; ranges=@(@(46,86)); patterns=@('Response contract','Recommended entries') },
  @{ path='docs/design/archive/slices/ex-22-project-timeline-view-baseline.md'; role='Historical timeline no-synthetic-fact boundary'; ranges=@(@(48,86),@(137,145)); patterns=@('不输出','真实') },
  @{ path='docs/design/archive/slices/ex-24-project-completion-fact-source-timeline-baseline.md'; role='Historical completion fact projection boundary'; patterns=@('Timeline','timeline','只读') }
)
$sourcePaths = @($sourceDefinitions | ForEach-Object { $_.path })
$gitArguments = @('ls-tree','-r','-l',$expectedBase,'--') + $sourcePaths
$treeLines = & git @gitArguments
if ($LASTEXITCODE -ne 0) { throw 'git source tree capture failed' }
$treeByPath = @{}
foreach($line in $treeLines) {
  if($line -match '^\d+\s+blob\s+([0-9a-f]+)\s+(\d+)\t(.+)$') {
    $treeByPath[$Matches[3]] = @{blob=$Matches[1]; bytes=[long]$Matches[2]}
  }
}
$sourceEntries = foreach($definition in $sourceDefinitions) {
  $relativePath = $definition.path
  if(-not $treeByPath.ContainsKey($relativePath)) { throw ('Source missing at base: ' + $relativePath) }
  $absolutePath = [System.IO.Path]::GetFullPath((Join-Path $rootPath $relativePath))
  $bytes = [System.IO.File]::ReadAllBytes($absolutePath)
  $lines = [System.IO.File]::ReadAllLines($absolutePath)
  $rawSha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
  $keyLines = foreach($pattern in $definition.patterns) {
    for($index=0; $index -lt $lines.Length; $index++) {
      if($lines[$index].Contains($pattern)) { [ordered]@{pattern=$pattern; line=($index+1); text=$lines[$index]} }
    }
  }
  $rangeList = [System.Collections.Generic.List[object]]::new()
  if($definition.ContainsKey('ranges')) {
    if($definition.ranges[0] -is [array]) {
      foreach($range in $definition.ranges) { $rangeList.Add($range) }
    } else {
      $rangeList.Add(@($definition.ranges))
    }
  }
  foreach($range in $rangeList) {
    if($range[0] -lt 1 -or $range[1] -gt $lines.Length) { throw ('Key line range outside source: ' + $relativePath) }
  }
  [ordered]@{
    path=$relativePath
    absolutePath=$absolutePath.Replace('\','/')
    role=$definition.role
    wholeFileFrozen=$true
    actualBytes=$bytes.Length
    rawSha256=$rawSha256
    encodingForLineReading='UTF-8; hash always computed from raw bytes'
    lineCount=$lines.Length
    keyLineRanges=$rangeList.ToArray()
    keyLines=@($keyLines)
    baseGitBlobId=$treeByPath[$relativePath].blob
    baseGitBlobBytes=$treeByPath[$relativePath].bytes
    note='Actual raw hash/bytes and Git blob identity are distinct; checkout line endings are not normalized for raw capture.'
  }
}
$inventory = Get-Content -LiteralPath (Join-Path $rootPath 'docs/design/rust-r3-operation-slices.json') -Raw | ConvertFrom-Json -Depth 100
$operationIds = @('BusinessDiscussionController_list','BusinessDiscussionController_create','ProjectController_getWorkspaceGuidance','ProjectController_getTimeline')
$operations = @($inventory.operations | Where-Object { $_.operationId -in $operationIds })
if($operations.Count -ne 4) { throw 'Four source operation rows required' }
$openApi = Get-Content -LiteralPath (Join-Path $rootPath 'libs/shared/api-spec/openapi.json') -Raw | ConvertFrom-Json -Depth 100
$apiPaths = [ordered]@{}
foreach($path in @('/api/business-discussions','/api/projects/{projectId}/workspace-guidance','/api/projects/{projectId}/timeline')) { $apiPaths[$path] = $openApi.paths.$path }
$schemaNames = @('BusinessDiscussionCommentList','BusinessDiscussionCommentSummary','BusinessDiscussionTargetObjectType','BusinessDiscussionType','CreateBusinessDiscussionCommentRequest','ProjectWorkspaceGuidanceView','ProjectWorkspaceBasisSummary','ProjectWorkspaceEntryView','ProjectTimelineView','ProjectTimelineEvent','ProjectStage','ProjectStatus')
$schemas = [ordered]@{}
foreach($schemaName in $schemaNames) {
  $value = $openApi.components.schemas.$schemaName
  if($null -eq $value) { throw ('Missing OpenAPI schema: ' + $schemaName) }
  $schemas[$schemaName] = $value
}
$manifest = [ordered]@{
  kind='poms-r3hijk-d-source-manifest-draft01'
  status='G1-input-source-capture-only-not-formal-freeze'
  workspace=$expectedRoot
  branch=$branch
  base=$expectedBase
  observedHead=$head
  captureUtc=[DateTime]::UtcNow.ToString('o')
  actualSourceCount=@($sourceEntries).Count
  actualSourceBytes=($sourceEntries | ForEach-Object { [long]$_.actualBytes } | Measure-Object -Sum).Sum
  rawShaAlgorithm='SHA-256 over actual filesystem bytes; no normalized text hashing'
  G1Certified=$false
  G2Authorized=$false
  nativeRunCount=0
  nativeActual=$null
  productFilesWritten=@()
  prohibitedRunsPerformed=@()
  ownership='D input preparation only; Root owns all actual product/fixture/check/runtime runs'
  sources=@($sourceEntries)
  originalOperationInventoryRows=$operations
  originalOpenApiPaths=$apiPaths
  originalOpenApiSchemas=$schemas
  originalTestsMissing=@('apps/poms-api/src/app/features/business-discussion/business-discussion.controller.spec.ts','apps/poms-api/src/app/features/business-discussion/business-discussion.repository.spec.ts')
  unresolvedBeforeFormalG1=@('Root original Native N1-N6 witness groups','final shared interfaces and wire/error signatures','formal baseline and issue/task freeze','independent Gate verdict')
  captureTool='tmp/rust-r3hijk/d-input/capture-source-manifest.ps1; hashes/Git/source parsing only; no product/test/fixture execution'
}
$json = $manifest | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($outputPath, $json + "`n", [System.Text.UTF8Encoding]::new($false))
[pscustomobject]@{path=$outputPath;sourceCount=$manifest.actualSourceCount;sourceBytes=$manifest.actualSourceBytes;bytes=([System.IO.FileInfo]$outputPath).Length;rawSha256=(Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash.ToLowerInvariant()} | ConvertTo-Json -Compress
