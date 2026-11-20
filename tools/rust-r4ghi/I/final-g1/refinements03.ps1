$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path -LiteralPath '.').Path
$taskDir=Join-Path $taskRoot 'tools/rust-r4ghi/I/final-g1'
if($taskDir -ne 'E:\projects\worktrees\poms-r3hijk-next28\poms\tools\rust-r4ghi\I\final-g1') { throw 'Unexpected worktree/output' }
$taskSealed=@{
    'contract.md'='8d3f220d50da87cc1411d3b41e2b60a8dc5cc510eac70b0bc3e8b439031c1786'
    'contracts.json'='4b91cc1b1f42a526368fdb3b4dbd29ee0b87b847305642d457a385c220459913'
    'ddl-proposal.sql'='b7a550b60b72f0531999788051ac29fa6752b522635c4c1190e97526b188153d'
    'sources.json'='aca0bf5f9901e08a75a159ba38f2d08054f4f88db434fbdfdfeeebc4cd59f79a'
}
$taskSealEvidence=foreach($taskName in $taskSealed.Keys) {
    $taskHash=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $taskDir $taskName)).Hash.ToLowerInvariant()
    if($taskHash -ne $taskSealed[$taskName]) { throw "Sealed proposal changed externally: $taskName" }
    [ordered]@{path=$taskName;sha256=$taskHash;unchanged=$true}
}
$taskFacts=[ordered]@{
    actor='Actor.id == session.user.user_id == session.user_snapshot.id; authenticated request; fresh platform_user.is_active'
    permission='Exact known PermissionKey in actor.session.user.permissions, produced by the existing request-local active-role/active-assignment guard; no role-name/superuser override'
    membership='Fresh active nonrevoked user_org_membership primary/secondary JOIN active org_unit; cached primaryOrg/profile orgUnits alone never suffice'
    ownerRead='project.owner_user_id == actor.id; old missing org only permits bounded anchor read, not new business admission'
    ownerWrite='ownerRead AND active project.owner_org_id AND actor current membership contains exact ownerOrg'
    handover='Exactly current producer_version=1, status draft/confirmed; basis project and salesOwner match current project; payload/hash valid; no latest fallback'
    participant='Matched handover role + confirmation_record target/project + exact confirmation_participant actor; c and cp pending/confirmed'
    confirmedDuty='participant AND h/c/cp all confirmed; execution-owner additionally h.execution_owner_user_id equals actor'
    delegatedOrg='Project ownerOrg active and actor has current active organization membership; cross-department explicit duty is a project-bound delegation, same-org alone grants nothing'
    ownCondition='Exact path completion+condition+project; true producer completion conditional-completed; condition.responsible_user_id equals actor; narrow task scope only'
    bootstrapSource='Current org-owned, new verified ownership-origin initial org-owned, never any personal owner, available state, exact real creator/source/payload, actor current exact ownerOrg membership'
}
$taskActions=@(
    @{action='ReadProjectAnchorOrIList';permissions=@('project:read');allow=@('owner-read','current-participant');proof='FullProject';sensitive='Still apply existing package projection'},
    @{action='ReadOwnCompletionTask';permissions=@('project:read');allow=@('own-condition');proof='OwnConditionOnly';filter='Only own completion parents/own conditions; aggregate conditionStatus from all conditions'},
    @{action='ReadFirstAssignmentAnchor';permissions=@('project:read');allow=@('bootstrap-source');proof='CreatorFirstAssignmentOnly';filter='Minimal owner-assignment context only, not G/H/R5 business data'},
    @{action='FirstAssignOwner';operationId='ProjectController_reassignOwner';permissions=@('project:write');allow=@('bootstrap-source');proof='CreatorFirstAssignmentOnly';extra=@('expectedVersion required and exact','active target user with same ownerOrg active membership','project+origin lock and CAS','consume bootstrap permanently in same TX')},
    @{action='ReassignCurrentOwner';operationId='ProjectController_reassignOwner';permissions=@('project:write');allow=@('owner-write');extra=@('Authorize old state, never body new owner','new owner active and true target-org member','project CAS/history/audit same TX','creator identity irrelevant after first personal assignment')},
    @{action='PrepareHandover';operationId='ProjectHandoverController_prepareProjectHandover';permissions=@('project:write');allow=@('owner-write');extra=@('New body duty claims cannot authorize own request')},
    @{action='ConfirmHandoverSelf';operationId='ProjectHandoverController_confirmProjectHandoverParticipant';permissions=@('project:read');csrf=$true;allow=@('current-participant-self');extra=@('draft current handover','only actor confirmation participant','all own duties, no proxy')},
    @{action='FinalizeHandover';operationId='ProjectHandoverController_confirmProjectHandover';permissions=@('project:write');allow=@('owner-write','delegated-org AND confirmed-business-admin');extra=@('Domain verifies all real self confirmations and fixed source refs')},
    @{action='RebaselineHandover';operationId='ProjectHandoverController_rebaselineContractHandover';permissions=@('project:write');allow=@('owner-write','delegated-org AND confirmed-business-admin');extra=@('Real approved amendment/rebaseline chain and CAS')},
    @{action='ReadCommissionAssignment';permissions=@('commission:assignments:manage');allow=@('owner-read','current-participant');sensitive='Scope is separate from commission-compensation projection and existing commission:amount:sensitive:read'},
    @{action='CreateCommissionAssignmentDraft';operationId='CommissionController_createRoleAssignment';permissions=@('commission:assignments:manage');allow=@('owner-write');extra=@('No manager producer or creator fallback','Current frozen cannot be downgraded')},
    @{action='FreezeCommissionAssignment';operationId='CommissionRoleAssignmentController_freezeRoleAssignment';permissions=@('commission:assignments:manage');allow=@('owner-write','delegated-org AND confirmed-business-admin');extra=@('Current true confirmed handover/receipt freeze, same source chain; no automatic execution')},
    @{action='StartExecution';operationId='ProjectController_startExecution';permissions=@('project:write');allow=@('delegated-org AND confirmed-execution-owner');extra=@('Same true current frozen role/handover chain')},
    @{action='StartAcceptanceConfirmAcceptanceConfirmCompletion';permissions=@('project:write');allow=@('delegated-org AND confirmed-execution-owner');extra=@('Match true execution stage source owner','Evidence/final-result/CAS checks remain domain-owned')},
    @{action='CreateReplaceVoidArchive';permissions=@('project:write');allow=@('owner-write','delegated-org AND confirmed-execution-owner','delegated-org AND confirmed-business-admin');extra=@('Terminal source/current chain/CAS','No pending conditions')},
    @{action='CloseCompletionCondition';operationId='ProjectCompletionRecordController_closeCompletionCondition';permissions=@('project:write');allow=@('own-condition AND delegated-org');proof='OwnConditionOnly';extra=@('actor strictly responsible person','two target UUIDs verified','completion and condition CAS','no manager/project-owner proxy fallback')}
)
$taskSources=@(
    'docs/design/business-authorization-matrix.md',
    'docs/design/phase2-data-permission-and-sensitive-visibility-design.md',
    'docs/design/platform-governance/role-permission-design.md',
    'apps/poms-api/src/app/features/system-setting/system-setting.registry.ts',
    'apps/poms-api-rust/src/system_settings/mod.rs','tools/rust-r2ef/e-authority.json',
    'libs/shared/contracts/src/lib/shared-contracts.ts',
    'apps/poms-api/src/app/features/platform/role.entity.ts',
    'apps/poms-api/src/app/features/platform/org-unit.entity.ts',
    'apps/poms-api/src/app/features/platform/user-role-assignment.entity.ts',
    'apps/poms-api/src/app/features/platform/user-org-membership.entity.ts',
    'apps/poms-api/src/app/features/project/project.entity.ts',
    'apps/poms-api/src/app/features/project/project-owner-reassignment-record.entity.ts',
    'apps/poms-api-rust/src/auth/model.rs','apps/poms-api-rust/src/auth/store.rs',
    'apps/poms-api-rust/src/auth/guards.rs','apps/poms-api-rust/src/compat/permissions.rs',
    'apps/poms-api-rust/src/contract_support/mod.rs','apps/poms-api-rust/src/approval_common/session.rs',
    'apps/poms-api-rust/src/projects/service.rs','apps/poms-api-rust/src/projects/store.rs',
    'apps/poms-api-rust/src/project_handover/service.rs','apps/poms-api-rust/src/project_handover/sources.rs',
    'apps/poms-api-rust/src/leads/service.rs','apps/poms-api-rust/src/leads/store.rs',
    'tools/rust-r4def/combined-operation-map16.json'
)
$taskSourceHashes=foreach($taskPath in $taskSources) {
    $bytes=[System.IO.File]::ReadAllBytes((Join-Path $taskRoot $taskPath))
    [ordered]@{path=$taskPath;bytes=$bytes.Length;rawSha256=[Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()}
}
$taskResult=[ordered]@{
    refinement=3;status='ReviewReady-Root-joint-G1-pending';providedHead='aaa4b16ac66092f0cb1dc6646a02cf14e80823ee';headIndependentlyVerified=$false;
    userDecision=@{source='Root message; actual user Q/A receipt user-decision-scope03.json to be registered by Root';safeV1Accepted=$true;creatorOnceOnlyFirstAssignment=$true;bootstrapNeverRevives=$true;historyUnknownFailClosed=$true;ownerAndDPrepareProducerGatesAccepted=$true};
    canonicalDelta=@(
        @{operationId='ProjectController_startExecution';method='POST';old='/projects/{projectId}:startExecution';target='/projects/{id}:startExecution';parameters=@{id='ProjectId'}},
        @{operationId='ProjectController_startAcceptance';method='POST';old='/projects/{projectId}:startAcceptance';target='/projects/{id}:startAcceptance';parameters=@{id='ProjectId'}},
        @{operationId='ProjectCompletionRecordController_closeCompletionCondition';method='POST';old='/project-completion-records/{id}/conditions/{conditionId}:close';target='/project-completion-records/{completionRecordId}/conditions/{id}:close';parameters=@{completionRecordId='CompletionRecordId';id='CompletionConditionId'}}
    );
    canonicalRules='Runtime adds /api; keep operationIds/request DTOs/status/15-target count. New named ResourceKeys map retains both UUIDs. Legacy ABCDEF single-id APIs unchanged.';
    currentCapabilities=@{projectDataScopeSettingProducer=$false;managerScopeProducer=$false;orgManagerProducer=$false;roleDataScopeFields=$false;registeredSettingKeys=@('attachment.max-upload-size-mb');roleMeaning='Permission set only';noNewGlobalPermission=$true;noAdminStringBypass=$true;noSeedAuthority=$true};
    factDefinitions=$taskFacts;actionMatrix=$taskActions;
    signature='pub async fn require(session: &mut CommonSession<_,_>, actor: &Actor, action: ProjectAction, target: ProjectActionTarget) -> Result<ProjectAccessProof, contract_support::Error>';
    actualFields=@{Actor=@('id:Uuid','request_id:Option<String>','session:ResolvedSession','request_context:ProjectionRequestContext');ResolvedSession=@('session','user','user_snapshot','role_snapshots','pending_flush');CommonSession=@('connection:&mut PgConnection','state:&mut CommonState','participant:Option<CommonFlushParticipant>','request_id');absent=@('actor.dataScope','role.orgScope','org.managerUserId','system project-scope setting')};
    targetKinds=@('Project{id}','OwnerReassignment{project_id,expected_version,new_owner_user_id,new_owner_org_id}','Handover{id}','Assignment{id}','Archive{id}','Condition{completion_record_id,condition_id}');
    proofKinds=@{FullProject='Current owner or exact current handover role relation; still action- and field-limited';CreatorFirstAssignmentOnly='Only minimal assignment anchor/once first-person assignment; never valid G/H/R5 proof';OwnConditionOnly='Only relevant parent completion and own conditions/close; never full project data scope'};
    bootstrap=@{
        originTable='poms.project_ownership_origin; proposed new-production-only provenance, not a manager configuration producer';
        sourceEligibility=@('current owner_user_id NULL and owner_org_id present/active','verified new origin initial org-owned with exact same initial ownerOrg','origin creator equals project.created_by equals actor','origin source matches project id/direct-create or source lead/conversion','source payload/hash verified','bootstrap available and no first personal owner/time','no history previous/new personal owner ever','actor current exact ownerOrg membership');
        writeExtra=@('ProjectWrite','mandatory expectedVersion','active target individual with same ownerOrg membership','project/origin locks plus CAS/history/audit/auth flush one outer TX');
        consume='Atomic available->consumed, first personal owner/time/history ref. Once consumed forever, including current owner later returning to NULL. Creator is no longer privileged after assignment.';
        existingProducerAudit=@(
            @{operationId='ProjectController_create';source='projects/service.rs158-166 + store.rs299';createdByReliable=$true;initialPersonalOwner='actor';originInitialization='personal + consumed + firstPersonal actor at actual creation; no bootstrap ever'},
            @{operationId='LeadController_convertToProject';source='leads/service.rs1470-1477';createdByReliable=$true;creator='actual conversion operator';initialOwner='actual lead owner inherited, may be org-owned';originInitialization='same TX: org-owned available only if real ownerOrg, otherwise initial personal consumed'}
        );
        historical='No backfill. createdBy equality or no reassignment rows alone cannot establish never-personal ownership. Missing/unverified origin fails first assignment closed.';
        routeDelta=0;newGlobalPermissionDelta=0;newOwnershipModeOrReturnToOrgRoute=$false
    };
    producerGateFixes=@(
        @{operationId='ProjectController_reassignOwner';currentGap='projects/service.rs462-565 only status/target user-org/CAS, no calling-owner check';target='old-state current owner branch OR strict once bootstrap branch; never body target grants self authority'},
        @{operationId='ProjectHandoverController_prepareProjectHandover';currentGap='service.rs86-90 require_write only; prepare266-315 has no actor-project check';target='current OwnerWrite before minting duty grant; no body participant self-grant'}
    );
    managerPolicy='No data-scope/manager producer: deny manager/ancestor/same-org/system-role bypass. A manager may act only through a separately true current owner/duty relationship.';
    transactionAndFailure=@{oneOuterTx=$true;secondPool=$false;helperCommitOrFlush=$false;writeLocks='project -> stable account/org/membership -> current handover/confirmation or own condition/origin; re-read after locks';scopeFailure='opaque404 same as missing';actionDeniedWithinKnownScope='403';sourceOrCasChanged='409';DBError='500';rbac='existing request-local resolved permission snapshot';organization='fresh same-TX joined rows, never profile cache'};
    crossGH='Reuse FullProject facts and private proof constructors; finance permission alone grants no global scope. Domain permissions/relation map frozen per G/H action. Global no-project objects keep their own existing guard, never fabricated project scope.';
    formalDeltas=@('Role is not data scope; direct relation safe v1 adopted by user','Creator org-owned bootstrap is explicit once-only business decision, not a general createdBy grant','Current sales owner with C is bounded draft actor mapping, not inferred sales-manager role','Cross-functional current project assignment grants project-bound duty, same organization alone grants nothing','Legacy global routes not all declared fixed; only touched/new scope plus necessary fact producers are certified');
    verification=@{type='static source and proposed contract review';SQL='not executed';product='not changed';DB='not started';HTTP='not run';Git='not used';credentials='not read';sealedArtifacts=@($taskSealEvidence)};
    sources=@($taskSourceHashes);
    artifacts=@{review='refinements03.md';queriesAndOriginDDL='refinements03.sql';generator='refinements03.ps1'}
}
if($taskResult.canonicalDelta.Count -ne 3) { throw 'Canonical delta count mismatch' }
if(@($taskResult.canonicalDelta.operationId | Sort-Object -Unique).Count -ne 3) { throw 'Canonical delta duplicate' }
if($taskActions.Count -ne 16) { throw 'Action matrix count mismatch' }
$taskResult | ConvertTo-Json -Depth 35 | Set-Content -LiteralPath (Join-Path $taskDir 'refinements03.json') -Encoding utf8
[ordered]@{status=$taskResult.status;canonicalDeltas=3;actionPolicies=$taskActions.Count;sourceHashes=$taskSourceHashes.Count;sealedArtifactsUnchanged=$taskSealEvidence.Count;writesOnly='refinements03.*'} | ConvertTo-Json
