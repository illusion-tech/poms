$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath '.').Path
$taskOut = Join-Path $taskRoot 'tools/rust-r4ghi/I/final-g1'
if ($taskOut -ne 'E:\projects\worktrees\poms-r3hijk-next28\poms\tools\rust-r4ghi\I\final-g1') { throw 'Unexpected output' }
$taskBase = Get-Content -Raw -LiteralPath 'libs/shared/api-spec/openapi.json' | ConvertFrom-Json -AsHashtable
$taskSchemas = [ordered]@{}
function Ref([string]$name) { return @{ '$ref' = "#/components/schemas/$name" } }
function Uuid { return @{ type='string'; format='uuid' } }
function Version { return @{ type='integer'; minimum=1; maximum=2147483647 } }
function Hash { return @{ type='string'; pattern='^[0-9a-f]{64}$' } }
function Text([int]$max=2000) { return @{type='string';minLength=1;maxLength=$max;'x-trim'=$true} }
function Stamp { return @{type='string';format='date-time'} }
function Nullable($schema) { return @{anyOf=@($schema,@{type='null'})} }
function Obj($props,[string[]]$required) { return @{type='object';properties=$props;required=@($required);additionalProperties=$false} }
function Arr($item,[int]$min=0) { return @{type='array';items=$item;minItems=$min} }
function SchemaEnum([string[]]$values) { return @{type='string';enum=@($values)} }
function Base([string]$name) {
    if (-not $taskBase.components.schemas.ContainsKey($name)) { throw "Missing schema $name" }
    return ($taskBase.components.schemas[$name] | ConvertTo-Json -Depth 80 | ConvertFrom-Json -AsHashtable)
}
function Extend([string]$name,$props,[string[]]$required) {
    $schema = Base $name
    foreach($key in $props.Keys) { $schema.properties[$key] = $props[$key] }
    $schema.required = @(@($schema.required) + @($required) | Sort-Object -Unique)
    $taskSchemas[$name] = $schema
}
$taskSchemas['LifecycleEvidenceRef'] = Obj @{attachmentLinkId=(Uuid)} @('attachmentLinkId')
$taskSchemas['FrozenLifecycleEvidence'] = Obj @{
    attachmentLinkId=(Uuid);attachmentId=(Uuid);attachmentRowVersion=(Version);checksumSha256=(Hash);fileName=(Text 255)
} @('attachmentLinkId','attachmentId','attachmentRowVersion','checksumSha256','fileName')
$evidence = Arr (Ref 'LifecycleEvidenceRef') 1
$qualification = SchemaEnum @('verified-producer','legacy-unverified')
$taskSchemas['CommissionParticipantInput'] = Obj @{
    userId=(Uuid);roleType=(Text 64);weight=@{type='number';minimum=0;maximum=1;multipleOf=0.000001;'x-exact-decimal-scale'=6};
    responsibilitySummary=(Text);zeroWeightReason=(Nullable (Text 1000));
    displayName=@{type='string';deprecated=$true;description='Accepted legacy hint only; canonical displayName is loaded server-side'}
} @('userId','roleType','weight','responsibilitySummary')
$taskSchemas['CommissionParticipantInput']['allOf'] = @(
    @{if=@{properties=@{weight=@{const=0}};required=@('weight')};then=@{required=@('zeroWeightReason');properties=@{zeroWeightReason=(Text 1000)}};else=@{properties=@{zeroWeightReason=@{type='null'}}}}
)
$taskSchemas['CommissionParticipantRead'] = Obj @{
    userId=(Uuid);displayName=@{type='string'};roleType=@{type='string'};weight=@{type='number'};
    weightExact=(Nullable @{type='string';pattern='^(0\.[0-9]{6}|1\.000000)$'});
    responsibilitySummary=(Nullable @{type='string'});zeroWeightReason=(Nullable @{type='string'})
} @('userId','displayName','roleType','weight','weightExact','responsibilitySummary','zeroWeightReason')
$taskSchemas['CreateCommissionRoleAssignmentRequest'] = Obj @{
    participants=(Arr (Ref 'CommissionParticipantInput') 1);
    expectedCurrentAssignmentId=(Nullable (Uuid));expectedCurrentRowVersion=(Nullable (Version))
} @('participants','expectedCurrentAssignmentId','expectedCurrentRowVersion')
$taskSchemas['FreezeCommissionRoleAssignmentRequest'] = Obj @{
    sourceHandoverId=(Uuid);handoverSummarySnapshotId=(Uuid);expectedVersion=(Version);expectedHandoverVersion=(Version);
    handoverBasisSnapshotId=(Uuid);expectedSourceHash=(Hash);comment=@{type='string';maxLength=1000;'x-trim'=$true}
} @('sourceHandoverId','handoverSummarySnapshotId','expectedVersion','expectedHandoverVersion','handoverBasisSnapshotId','expectedSourceHash')
Extend 'CommissionRoleAssignmentSummary' @{
    participantsJson=(Arr (Ref 'CommissionParticipantRead'));
    sourceQualification=$qualification;weightsPolicyVersion=(Nullable @{type='string'});sourcePayloadHash=(Nullable (Hash));
    freezeSummarySnapshotId=(Nullable (Uuid));frozenBy=(Nullable (Uuid))
} @('sourceQualification','weightsPolicyVersion','sourcePayloadHash','freezeSummarySnapshotId','frozenBy')
Extend 'CommissionRoleAssignmentDetailView' @{
    sourceQualification=$qualification;sourcePayloadHash=(Nullable (Hash));
    handoverBasisSnapshotId=(Nullable (Uuid));receiptJudgmentFreezeId=(Nullable (Uuid));freezeSummarySnapshotId=(Nullable (Uuid))
} @('sourceQualification','sourcePayloadHash','handoverBasisSnapshotId','receiptJudgmentFreezeId','freezeSummarySnapshotId')
Extend 'FreezeCommissionRoleAssignmentResult' @{
    summaryPackageKey=@{type='string';const='commission-role-freeze-confirmation'};
    projectionLevel=@{type='string';const='commission-role-freeze'};exportPolicy=@{type='string';const='commission-controlled'};
    sourcePayloadHash=(Hash);handoverBasisSnapshotId=(Uuid);receiptJudgmentFreezeId=(Uuid);rowVersion=(Version)
} @('summaryPackageKey','sourcePayloadHash','handoverBasisSnapshotId','receiptJudgmentFreezeId','rowVersion')
$taskSchemas['StartProjectExecutionRequest'] = Obj @{
    expectedProjectVersion=(Version);handoverStageRecordId=(Uuid);sourceHandoverId=(Uuid);commissionRoleAssignmentId=(Uuid);
    expectedRoleAssignmentVersion=(Version);handoverSummarySnapshotId=(Uuid);sourcePayloadHash=(Hash);reason=(Text 1000)
} @('expectedProjectVersion','handoverStageRecordId','sourceHandoverId','commissionRoleAssignmentId','expectedRoleAssignmentVersion','handoverSummarySnapshotId','sourcePayloadHash','reason')
$taskSchemas['StartProjectAcceptanceRequest'] = Obj @{
    expectedProjectVersion=(Version);executionStageRecordId=(Uuid);readinessSummary=(Text);evidenceSummary=(Text);evidenceRefs=$evidence
} @('expectedProjectVersion','executionStageRecordId','readinessSummary','evidenceSummary','evidenceRefs')
$taskSchemas['ProjectStageTransitionResult'] = Obj @{
    targetId=(Uuid);projectStageRecordId=(Uuid);businessStatusAfter=(SchemaEnum @('execution','acceptance'));projectRowVersion=(Version);
    sourceHandoverId=(Uuid);commissionRoleAssignmentId=(Uuid);summarySnapshotId=(Uuid);sourcePayloadHash=(Hash);enteredAt=(Stamp);enteredBy=(Uuid)
} @('targetId','projectStageRecordId','businessStatusAfter','projectRowVersion','sourceHandoverId','commissionRoleAssignmentId','summarySnapshotId','sourcePayloadHash','enteredAt','enteredBy')
Extend 'CreateAcceptanceRecordRequest' @{
    expectedProjectVersion=(Version);acceptanceStageRecordId=(Uuid);evidenceRefs=$evidence;conditionalSummary=(Text)
} @('expectedProjectVersion','acceptanceStageRecordId','evidenceRefs')
$taskSchemas['CreateAcceptanceRecordRequest']['allOf'] = @(
    @{if=@{properties=@{acceptanceResult=@{const='conditional'}};required=@('acceptanceResult')};then=@{required=@('conditionalSummary')};else=@{not=@{required=@('conditionalSummary')}}}
)
$taskSchemas['ProjectCompletionConditionInput'] = Obj @{
    summary=(Text);responsibleUserId=(Uuid);dueAt=(Stamp);evidenceRefs=$evidence
} @('summary','responsibleUserId','dueAt','evidenceRefs')
Extend 'CreateProjectCompletionRecordRequest' @{
    expectedProjectVersion=(Version);expectedAcceptanceVersion=(Version);evidenceRefs=$evidence;
    completionConditions=(Arr (Ref 'ProjectCompletionConditionInput') 1)
} @('expectedProjectVersion','expectedAcceptanceVersion','evidenceRefs')
$taskSchemas['CreateProjectCompletionRecordRequest']['allOf'] = @(
    @{if=@{properties=@{completionResult=@{const='conditional-completed'}};required=@('completionResult')};then=@{required=@('completionConditions')};else=@{not=@{required=@('completionConditions')}}}
)
Extend 'CreateProjectArchiveRecordRequest' @{expectedProjectVersion=(Version)} @('expectedProjectVersion')
Extend 'ReplaceProjectArchiveRecordRequest' @{expectedVersion=(Version)} @('expectedVersion')
Extend 'VoidProjectArchiveRecordRequest' @{expectedVersion=(Version)} @('expectedVersion')
$taskSchemas['CloseProjectCompletionConditionRequest'] = Obj @{
    expectedCompletionVersion=(Version);expectedConditionVersion=(Version);closureSummary=(Text);evidenceRefs=$evidence
} @('expectedCompletionVersion','expectedConditionVersion','closureSummary','evidenceRefs')
$taskSchemas['CloseProjectCompletionConditionResult'] = Obj @{
    targetId=(Uuid);conditionId=(Uuid);conditionStatus=@{type='string';const='closed'};
    completionConditionStatus=(SchemaEnum @('pending','closed'));completionRowVersion=(Version);conditionRowVersion=(Version);
    closureRecordId=(Uuid);closedAt=(Stamp);closedBy=(Uuid);sourcePayloadHash=(Hash)
} @('targetId','conditionId','conditionStatus','completionConditionStatus','completionRowVersion','conditionRowVersion','closureRecordId','closedAt','closedBy','sourcePayloadHash')
$taskSchemas['ProjectCompletionConditionSummary'] = Obj @{
    id=(Uuid);completionRecordId=(Uuid);summary=@{type='string'};responsibleUserId=(Uuid);responsibleUserName=(Nullable @{type='string'});
    dueAt=(Stamp);status=(SchemaEnum @('pending','closed'));rowVersion=(Version);evidenceRefs=(Arr (Ref 'FrozenLifecycleEvidence'));
    closedAt=(Nullable (Stamp));closedBy=(Nullable (Uuid));closureRecordId=(Nullable (Uuid));closureSummary=(Nullable @{type='string'});
    closureEvidenceRefs=(Arr (Ref 'FrozenLifecycleEvidence'));allowedActions=(Arr @{type='string'})
} @('id','completionRecordId','summary','responsibleUserId','responsibleUserName','dueAt','status','rowVersion','evidenceRefs','closedAt','closedBy','closureRecordId','closureSummary','closureEvidenceRefs','allowedActions')
foreach($name in @('AcceptanceRecordSummary','ProjectCompletionRecordSummary','ProjectArchiveRecordSummary')) {
    Extend $name @{
        sourceQualification=$qualification;sourceStageRecordId=(Nullable (Uuid));sourcePayloadHash=(Nullable (Hash));
        evidenceRefs=(Arr (Ref 'FrozenLifecycleEvidence'))
    } @('sourceQualification','sourceStageRecordId','sourcePayloadHash','evidenceRefs')
}
$taskSchemas['AcceptanceRecordSummary'].properties['conditionalSummary']=(Nullable @{type='string'})
$taskSchemas['AcceptanceRecordSummary'].required += 'conditionalSummary'
$taskSchemas['ProjectCompletionRecordSummary'].properties['conditionStatus']=(SchemaEnum @('not-applicable','pending','closed','legacy-unverified'))
$taskSchemas['ProjectCompletionRecordSummary'].properties['conditions']=(Arr (Ref 'ProjectCompletionConditionSummary'))
$taskSchemas['ProjectCompletionRecordSummary'].required += @('conditionStatus','conditions')
foreach($name in @('AcceptanceRecordList','ProjectCompletionRecordList','ProjectArchiveRecordList')) { $taskSchemas[$name]=Base $name }
Extend 'CreateProjectRequest' @{currentStage=@{type='string';const='assessment'}} @()
Extend 'ProjectHandoverDetailView' @{handoverStageRecordId=(Nullable (Uuid));projectRowVersion=(Version)} @('handoverStageRecordId','projectRowVersion')
Extend 'ProjectDetailView' @{currentStageRecordId=(Nullable (Uuid));projectRowVersion=(Version)} @('currentStageRecordId','projectRowVersion')
$taskSchemas['PrepareProjectHandoverRequest']=Base 'PrepareProjectHandoverRequest'
$taskTargets = @(
    @('R5','CommissionController_getCurrentRoleAssignment','GET','/api/projects/{projectId}/commission-role-assignment',$null,'CommissionRoleAssignmentSummary',200,'commission:assignments:manage',200,'commission_assignment','read'),
    @('R5','CommissionController_createRoleAssignment','POST','/api/projects/{projectId}/commission-role-assignments','CreateCommissionRoleAssignmentRequest','CommissionRoleAssignmentSummary',200,'commission:assignments:manage',201,'commission_assignment','draft'),
    @('R5','CommissionRoleAssignmentController_getRoleAssignmentDetail','GET','/api/commission-role-assignments/{id}',$null,'CommissionRoleAssignmentDetailView',200,'commission:assignments:manage',118,'commission_assignment','read'),
    @('R5','CommissionRoleAssignmentController_freezeRoleAssignment','POST','/api/commission-role-assignments/{id}:freeze','FreezeCommissionRoleAssignmentRequest','FreezeCommissionRoleAssignmentResult',200,'commission:assignments:manage',119,'commission_assignment','freeze'),
    @('I','ProjectController_listAcceptanceRecords','GET','/api/projects/{projectId}/acceptance-records',$null,'AcceptanceRecordList',200,'project:read',252,'project_lifecycle','read'),
    @('I','ProjectController_createAcceptanceRecord','POST','/api/projects/{projectId}/acceptance-records','CreateAcceptanceRecordRequest','AcceptanceRecordSummary',201,'project:write',251,'project_lifecycle','acceptance'),
    @('I','ProjectController_listProjectCompletionRecords','GET','/api/projects/{projectId}/completion-records',$null,'ProjectCompletionRecordList',200,'project:read',254,'project_lifecycle','read'),
    @('I','ProjectController_createProjectCompletionRecord','POST','/api/projects/{projectId}/completion-records','CreateProjectCompletionRecordRequest','ProjectCompletionRecordSummary',201,'project:write',253,'project_lifecycle','completion'),
    @('I','ProjectController_listProjectArchiveRecords','GET','/api/projects/{projectId}/archive-records',$null,'ProjectArchiveRecordList',200,'project:read',256,'project_lifecycle','read'),
    @('I','ProjectController_createProjectArchiveRecord','POST','/api/projects/{projectId}/archive-records','CreateProjectArchiveRecordRequest','ProjectArchiveRecordSummary',201,'project:write',255,'project_lifecycle','archive'),
    @('I','ProjectArchiveRecordController_replaceProjectArchiveRecord','POST','/api/project-archive-records/{id}:replace','ReplaceProjectArchiveRecordRequest','ProjectArchiveRecordSummary',200,'project:write',257,'project_lifecycle','archive'),
    @('I','ProjectArchiveRecordController_voidProjectArchiveRecord','POST','/api/project-archive-records/{id}:void','VoidProjectArchiveRecordRequest','ProjectArchiveRecordSummary',200,'project:write',258,'project_lifecycle','archive'),
    @('stage','ProjectController_startExecution','POST','/api/projects/{projectId}:startExecution','StartProjectExecutionRequest','ProjectStageTransitionResult',200,'project:write',$null,'project_lifecycle','execution-entry'),
    @('stage','ProjectController_startAcceptance','POST','/api/projects/{projectId}:startAcceptance','StartProjectAcceptanceRequest','ProjectStageTransitionResult',200,'project:write',$null,'project_lifecycle','acceptance-entry'),
    @('condition','ProjectCompletionRecordController_closeCompletionCondition','POST','/api/project-completion-records/{id}/conditions/{conditionId}:close','CloseProjectCompletionConditionRequest','CloseProjectCompletionConditionResult',200,'project:write',$null,'project_lifecycle','condition-close')
) | ForEach-Object {
    [ordered]@{group=$_[0];operationId=$_[1];method=$_[2];path=$_[3];requestDto=$_[4];responseDto=$_[5];successStatus=$_[6];permission=$_[7];canonicalCurrentLine=$_[8];module=$_[9];guardPolicy=$_[10];csrf=($_[2] -ne 'GET');canonicalFreezeRequired=($null -eq $_[8]);nullableResponse=($_[1] -eq 'CommissionController_getCurrentRoleAssignment')}
}
$taskResult = [ordered]@{
    formatVersion=2;status='ReviewReady-G1-Pending';providedHead='aaa4b16ac66092f0cb1dc6646a02cf14e80823ee';providedHeadVerified=$false;
    taskIds=@{batch=110;I=113;stageAcceptance=114;R5Parent=$null;R5MinimumChild=$null;R5IssueRegistrationOwner='Root'};
    targetCounts=@{R5Existing=4;IExisting=8;stageNew=2;conditionNew=1;total=15;existingEntryBehaviorCorrections=2};
    userDecisions=@{coreMinimum=$true;weight='0..1, max6 exact decimal scale, sumUnits=1000000, zero requires reason';completion='final accepted -> completed; final conditional -> conditional-completed with tracked conditions';conditionClose='responsible person logged in, same-project data scope, per-condition CAS; all closed -> conditionStatus closed';archive='pending conditions reject archive';managerDelegation='proposal only; no implementation fallback'};
    rulesProducerDependency=@{required=$false;additionalOperations=@();seedAllowed=$false;source=@('docs/design/commission-settlement-design.md:110-134,401-417','docs/design/interface-command-design.md:136','apps/poms-api/src/app/features/commission/commission.service.ts:260-361,715-725');note='Rule version is a calculation input; freeze validates assignment policy separately'};
    existingEvidenceProducerOperations=@(
        @{operationId='AttachmentUploadSessionController_create';method='POST';path='/api/attachment-upload-sessions'},
        @{operationId='AttachmentUploadSessionController_proxyUploadObject';method='PUT';path='/api/attachment-upload-sessions/{id}/object'},
        @{operationId='AttachmentUploadSessionController_complete';method='POST';path='/api/attachment-upload-sessions/{id}:complete'},
        @{operationId='AttachmentController_link';method='POST';path='/api/attachments/{id}/links'}
    );
    targets=@($taskTargets);components=@{schemas=$taskSchemas};
    inheritedSpec=@{path='libs/shared/api-spec/openapi.json';hash=(Get-FileHash -Algorithm SHA256 -LiteralPath 'libs/shared/api-spec/openapi.json').Hash.ToLowerInvariant();rule='Changed components above override the base. Unchanged referenced components remain from this exact source. No complete generated spec claim.'};
    runtimeInvariants=@(
        'All write actors from session, no supplied user/approver/status/stage truth',
        'Exact weight raw token -> checked millionths -> sum exactly1000000; no f64 epsilon; zero reason required',
        'CreateAssignment expectedCurrentAssignmentId/expectedCurrentRowVersion both null or both match current draft; current frozen rejected',
        'Freeze has exact current true handover, actual self-confirmations, basis/hash/summaries/current receipt freeze and project scope',
        'Own immutable freeze summarySnapshotId differs in meaning from upstream handoverSummarySnapshotId',
        'D real prepare enters handover atomically; does not invent early history or auto-enter execution',
        'startExecution only handover+true frozen same chain; startAcceptance only true execution+real attachment evidence',
        'Final accepted maps only completed; final conditional maps only conditional-completed; stage or rejected cannot complete project',
        'Condition closer actor equals responsibleUserId and has same-project data scope; no generic ProjectWrite override',
        'Last closed condition updates conditionStatus only; original completionResult immutable; pending blocks archive',
        'Archive terminal ancillary fact; recorded is single current; replacement and void keep complete audited chain',
        'One borrowed CommonSession inside outer TX; domain+summary+audit+pending auth atomic; unknown commit remains unknown'
    );
    authorizationPolicies=@{
        read='existing route permission + true same-project data scope';
        draft='commission permission + same-project data scope + actual project sales-owner responsibility';
        freeze='commission permission + same-project scope + current handover sales-owner or business-admin responsibility';
        executionEntry='project write + same-project scope + current handover execution-owner responsibility';
        acceptanceEntry='project write + same-project scope + current execution-owner responsibility';
        acceptance='project write + same-project scope + current execution-owner as accountable confirmation actor';
        completion='project write + same-project scope + current execution-owner as accountable completion actor';
        archive='project write + same-project scope + project sales-owner, execution-owner, or same handover business-admin';
        conditionClose='project write + same-project data scope + condition.responsibleUserId equals actor';
        rootReview='Freeze exact responsibility/data-scope resolver in joint G1; never guess business authority from arbitrary roleKey/system role or a seed account'
    };
    existingCorrections=@(
        @{operationId='ProjectController_create';dto='CreateProjectRequest';target='currentStage literal assessment optional; advanced stage rejected400, not rewritten';history='preserve read values; missing true phase facts remain legacy-unverified; no SQL backfill';operationDelta=0},
        @{operationId='ProjectHandoverController_prepareProjectHandover';target='after real approved activated contract/plan/pre-signing source checks: stage handover fact + project CAS same outer TX';repeat='current handover requalification may retain handover; never regress execution/acceptance/terminal';operationDelta=0}
    );
    existingReadProjectionExtensions=@(
        @{operationId='ProjectController_getById';fields=@('currentStageRecordId:UUID|null','projectRowVersion:positive int');purpose='Hard-refresh UI can submit exact stage/row preconditions without a new GET route'},
        @{operationId='ProjectController_getTimeline';purpose='Project stage ledger supplies genuine handover/execution/acceptance stage-entered events; completed event stays anchored to actual completion record to avoid duplicate completion claims';enumAddition='ProjectTimelineSourceType project-stage-record'}
    );
    approvedCrossLineDecisions=@{receipts='tax-inclusive receipt -> net-tax basis by real G/H producer';cost='explicit classification then server-derived cost basis';IandR5='consume immutable source refs/hash; do not recompute or require H/rules/payout before role freeze'};
    legacyCertification='Read/display only for upstream old advanced stages. Archive compatibility commands may retain real existing terminal anchors but remain legacy-unverified; they certify this archive write/audit, never a fresh close/completion producer. Unknown conditional completion cannot archive.';
    services=@(
        'commission_assignment::execute(&mut CommonSession,Operation,ResourceKeys,AssignmentRequestWithRawWeights,&Actor)->Result<Value>',
        'commission_assignment::require_current_frozen(&mut CommonSession,projectId,exactRefs)->FrozenAssignmentFacts',
        'project_lifecycle::execute(&mut CommonSession,Operation,ResourceKeys,LifecycleRequest,&Actor)->Result<Value>',
        'project_lifecycle::enter_handover(&mut CommonSession,&Actor,projectLocked,handover,basis,expectedProjectVersion)->StageFact',
        'lifecycle_evidence::validate_and_freeze(&mut CommonSession,projectId,refs)->FrozenEvidenceSet',
        'project_action_authorization::require(&mut CommonSession,&Actor,project,action,trueResponsibilities)->Result<()>'
    );
    adapterConstraints=@{resourceKeys='Preserve both completionRecordId(path id) and conditionId. Current last-id-only matcher cannot represent this route.';weightParser='Validate raw JSON numeric tokens before Value/f64 conversion; retain exact weightUnits. Reject0.10000000000000001, accept1e-6, reject1e-7.';openapiMultipleOf='Contract annotation only; never sufficient runtime validation'};
    dependencyDAG='R4 source and handover facts -> R5-P1 role freeze -> R4 explicit execution -> acceptance evidence -> I acceptance -> completion/conditions -> archive. No wait for full R5 rules/calculation/payout or H recommendation producer.';
    files=@{review='contract.md';ddl='ddl-proposal.sql';sources='sources.json'};
    verification=@{staticAudit='completed';jsonSchemaProposal='not generated OpenAPI';SQL='not executed';DB='not started';HTTP='not run';UI='not run';productCode='not changed';Git='not used';secrets='not read'};
    remainingGate='Root canonical/DTO/DDL/authorization/UI joint freeze and independent G1. Then separate worktrees; no G2 until frozen.'
}
$taskPrevious=Get-Content -Raw -LiteralPath 'tools/rust-r4ghi/I/g1/i-source-manifest.json' | ConvertFrom-Json
$taskPaths=@($taskPrevious.files.path) + @(
    'docs/design/archive/slices/ex-23-acceptance-record-timeline-fact-source-baseline.md',
    'docs/design/archive/slices/ex-24-project-completion-fact-source-timeline-baseline.md',
    'docs/design/archive/slices/ex-24-project-completion-fact-source-timeline-g3-g4-closeout.md',
    'docs/design/business-authorization-matrix.md','docs/design/phase2-commission-retention-final-settlement.md',
    'apps/poms-api/src/app/features/commission/commission-rule-version.entity.ts',
    'apps/poms-api-rust/src/auth/model.rs','apps/poms-api-rust/src/users/store.rs',
    'apps/poms-api-rust/src/attachments/store.rs','apps/poms-api-rust/src/attachment_storage/registry.rs'
)
$taskSources=foreach($taskPath in ($taskPaths | Sort-Object -Unique)) {
    $taskBytes=[System.IO.File]::ReadAllBytes((Join-Path $taskRoot $taskPath))
    $taskText=[System.Text.Encoding]::UTF8.GetString($taskBytes).Replace("`r`n","`n")
    [ordered]@{path=$taskPath;bytes=$taskBytes.Length;rawSha256=[Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($taskBytes)).ToLowerInvariant();normalizedSha256=[Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData([System.Text.Encoding]::UTF8.GetBytes($taskText))).ToLowerInvariant()}
}
$taskResult | ConvertTo-Json -Depth 85 | Set-Content -Encoding utf8 -LiteralPath (Join-Path $taskOut 'contracts.json')
[ordered]@{providedHead=$taskResult.providedHead;headVerified=$false;normalization='UTF8 decode; CRLF-to-LF only; preserve BOM and bare CR';files=@($taskSources)} | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 -LiteralPath (Join-Path $taskOut 'sources.json')
if($taskTargets.Count -ne 15 -or @($taskTargets.operationId | Sort-Object -Unique).Count -ne 15) { throw 'Target uniqueness/count mismatch' }
if(@($taskTargets | Where-Object canonicalFreezeRequired).Count -ne 3) { throw 'Exactly three new canonical rows required' }
$taskCanonicalLines=Get-Content -LiteralPath 'docs/design/api-route-canonical-inventory.md'
$taskInventory=Get-Content -Raw -LiteralPath 'docs/design/rust-r0-api-operations.json' | ConvertFrom-Json
foreach($taskTarget in $taskTargets) {
    if($taskTarget.requestDto -and -not $taskSchemas.Contains($taskTarget.requestDto)) { throw "Missing request $($taskTarget.requestDto)" }
    if(-not $taskSchemas.Contains($taskTarget.responseDto)) { throw "Missing response $($taskTarget.responseDto)" }
    if(-not $taskTarget.canonicalFreezeRequired) {
        $taskCanonicalPath=$taskTarget.path -replace '^/api',''
        if(-not $taskCanonicalLines[$taskTarget.canonicalCurrentLine-1].Contains($taskCanonicalPath)) { throw "Canonical line mismatch $($taskTarget.operationId)" }
        $taskOriginal=@($taskInventory.operations | Where-Object operationId -eq $taskTarget.operationId)
        if($taskOriginal.Count -ne 1 -or $taskOriginal[0].path -ne $taskTarget.path -or $taskOriginal[0].method -ne $taskTarget.method) { throw "Original operation mismatch $($taskTarget.operationId)" }
    }
}
function CheckRefs($node) {
    if($node -is [System.Collections.IDictionary]) {
        if($node.Contains('$ref')) {
            $refName=$node['$ref'] -replace '^#/components/schemas/',''
            if(-not $taskSchemas.Contains($refName) -and -not $taskBase.components.schemas.ContainsKey($refName)) { throw "Unresolved schema $refName" }
        }
        foreach($nodeKey in $node.Keys) { CheckRefs $node[$nodeKey] }
    } elseif($node -is [System.Collections.IList]) { foreach($item in $node) { CheckRefs $item } }
}
CheckRefs $taskSchemas
$taskArtifacts=foreach($name in @('contract.md','contracts.json','ddl-proposal.sql','sources.json','build-contracts.ps1')) {
    $path=Join-Path $taskOut $name
    [ordered]@{path=$name;bytes=(Get-Item -LiteralPath $path).Length;sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()}
}
[ordered]@{status='static-contract-consistency-passed';G1='Pending-Root-joint-freeze';targets=15;existingCanonicalMatched=12;newCanonicalPending=3;requestResponseAndSchemaRefs='resolved against exact inherited base';sourceCount=$taskSources.Count;runtime='not run';SQL='not executed or DB-certified';artifacts=@($taskArtifacts)} | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 -LiteralPath (Join-Path $taskOut 'proposal-receipt.json')
[ordered]@{status=$taskResult.status;targets=$taskTargets.Count;schemas=$taskSchemas.Count;sources=$taskSources.Count;productImplementation=$false} | ConvertTo-Json
