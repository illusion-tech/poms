param()
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath '.').Path
$out = [IO.Path]::GetFullPath((Join-Path $root 'tools/rust-r4ghi/H/g1'))
if (-not $out.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid output root' }
$paths = @(
'.agents/skills/poms-implementation-governance/SKILL.md',
'.agents/skills/poms-implementation-governance/references/governance-summary.md',
'docs/design/rust-r4-scope-and-dependencies.md',
'docs/design/backend-rust-migration-plan.md',
'docs/design/api-route-canonical-inventory.md',
'docs/design/phase2-project-business-outcome-overview.md',
'docs/design/phase2-project-unified-accounting-view-caliber.md',
'docs/design/phase2-project-variance-risk-explanation.md',
'docs/design/phase2-business-accounting-feedback-rules.md',
'docs/design/phase2-actual-cost-accumulation-stage-view.md',
'docs/design/phase2-estimated-to-actual-cost-bridge.md',
'docs/design/schema-ddl-design.md',
'docs/design/data-model-prerequisites.md',
'docs/design/interface-command-design.md',
'docs/design/interface-openapi-dto-design.md',
'docs/design/query-view-boundary-design.md',
'docs/design/workflow-and-approval-design.md',
'docs/design/phase2-data-permission-and-sensitive-visibility-design.md',
'docs/design/commission-settlement-design.md',
'libs/shared/contracts/src/lib/shared-contracts.ts',
'libs/api/contracts/src/lib/project-cost/project-cost.dto.ts',
'libs/shared/api-spec/openapi.json',
'libs/shared/api-client/api/project-cost.service.ts',
'apps/poms-api/src/app/features/project-cost/project-cost.controller.ts',
'apps/poms-api/src/app/features/project-cost/project-cost.service.ts',
'apps/poms-api/src/app/features/project-cost/project-cost.repository.ts',
'apps/poms-api/src/app/features/project-cost/data-maturity-evaluation-result.entity.ts',
'apps/poms-api/src/app/features/project-cost/operating-signal-evaluation-result.entity.ts',
'apps/poms-api/src/app/features/project-cost/operating-signal-gate-binding.entity.ts',
'apps/poms-api/src/app/features/project-cost/operating-signal-review-record.entity.ts',
'apps/poms-api/src/app/features/project-cost/commission-gate-review-record.entity.ts',
'apps/poms-api/src/app/features/project-cost/project-cost.service.spec.ts',
'apps/poms-api/src/app/features/approval/approval.service.ts',
'apps/poms-api/src/app/features/commission/commission.service.ts',
'apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection.service.ts',
'apps/poms-api/src/seeders/database.seeder.ts',
'apps/poms-api/src/migrations/Migration20260418170000_ex13a_operating_signal_model.ts',
'apps/poms-api/src/migrations/Migration20260418183000_ex13b1_gate_review_summary_anchor.ts',
'apps/poms-api-e2e/src/poms-api/operating-signal-workflow.e2e-spec.ts',
'apps/poms-api-e2e/src/support/operating-signal-seed-fixtures.ts',
'apps/poms-api-rust/src/contract_support/http.rs',
'apps/poms-api-rust/src/contract_support/mod.rs',
'apps/poms-api-rust/src/approval_common/session.rs',
'apps/poms-api-rust/src/approval_common/service.rs',
'apps/poms-api-rust/src/approval_common/receipt.rs',
'apps/poms-api-rust/src/project_actual_cost/view.rs',
'apps/poms-api-rust/src/project_cost_governance/mod.rs',
'apps/poms-api-rust/src/project_cost_governance/projection.rs',
'apps/poms-api-rust/src/project_cost_governance/store.rs',
'apps/poms-api-rust/src/project_cost_governance/service.rs',
'apps/poms-admin/src/app/features/project/project-operating-overview.ts',
'apps/poms-admin/src/app/features/project/project-variance-risk.ts',
'apps/poms-admin/src/app/features/commission/project-commission-gate-overview.ts',
'libs/admin/data-access/src/lib/project/project-workspace.store.ts'
)
$files = foreach ($path in $paths) {
  $full = Join-Path $root $path
  $file = Get-Item -LiteralPath $full
  [ordered]@{ path = $path; sha256 = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant(); bytes = $file.Length }
}
$manifest = [ordered]@{
  schemaVersion=1; stage='G1-input-audit-only'; auditedAt=[DateTimeOffset]::Now.ToString('o'); root=$root;
  branch='codex/poms-r4ghi-next25'; head='aaa4b16ac66092f0cb1dc6646a02cf14e80823ee';
  identityEvidence='Read .git, worktrees/poms3/HEAD and refs/heads/codex/poms-r4ghi-next25; no Git command executed';
  sourceHashMeaning='SHA256 of current exact local file bytes, not a claim that source has no historical drift';
  files=@($files)
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $out 'source-manifest01.json') -Encoding utf8NoBOM
$spec = Get-Content -LiteralPath 'libs/shared/api-spec/openapi.json' -Raw | ConvertFrom-Json -AsHashtable
$inventory = Get-Content -LiteralPath 'docs/design/api-route-canonical-inventory.md'
$controller = Get-Content -LiteralPath 'apps/poms-api/src/app/features/project-cost/project-cost.controller.ts'
$rows = @(
 @{ id='reviewOperatingSignalEvaluation'; canonicalLine=286; controllerStart=384; controllerEnd=396; serviceStart=1409; serviceEnd=1474; dto='ReviewOperatingSignalEvaluationRequestDto'; response='ReviewOperatingSignalEvaluationResult' },
 @{ id='getOperatingSignalEvaluation'; canonicalLine=287; controllerStart=398; controllerEnd=404; serviceStart=1476; serviceEnd=1506; dto=$null; response='OperatingSignalEvaluationView' },
 @{ id='reviewCommissionGateBinding'; canonicalLine=288; controllerStart=406; controllerEnd=418; serviceStart=1508; serviceEnd=1602; dto='ReviewCommissionGateBindingRequestDto'; response='ReviewCommissionGateBindingResult' },
 @{ id='getCommissionGateBinding'; canonicalLine=289; controllerStart=420; controllerEnd=426; serviceStart=1604; serviceEnd=1659; dto=$null; response='CommissionGateBindingHistoryView' },
 @{ id='getProjectBusinessOutcomeOverview'; canonicalLine=290; controllerStart=428; controllerEnd=441; serviceStart=1662; serviceEnd=1710; dto=$null; response='ProjectBusinessOutcomeOverviewView' },
 @{ id='getProjectUnifiedAccounting'; canonicalLine=291; controllerStart=443; controllerEnd=453; serviceStart=1712; serviceEnd=1757; dto=$null; response='ProjectUnifiedAccountingView' },
 @{ id='getProjectVarianceRiskExplanation'; canonicalLine=292; controllerStart=455; controllerEnd=468; serviceStart=1759; serviceEnd=1788; dto=$null; response='ProjectVarianceRiskExplanationView' },
 @{ id='getBusinessAccountingFeedback'; canonicalLine=293; controllerStart=470; controllerEnd=480; serviceStart=1790; serviceEnd=1846; dto=$null; response='BusinessAccountingFeedbackView' }
)
$schemas=[ordered]@{}
$operations=foreach($row in $rows) {
 $opId='ProjectCostController_'+$row.id
 $matches=@(foreach($path in $spec.paths.Keys){foreach($method in $spec.paths[$path].Keys){$operation=$spec.paths[$path][$method];if($operation.operationId -eq $opId){@{path=$path;method=$method;operation=$operation}}}})
 if($matches.Count -ne 1){throw "Expected exactly one OpenAPI operation: $opId"}
 $match=$matches[0]; $op=$match.operation
 $requestSchema=if($op.Contains('requestBody')){$op.requestBody.content['application/json'].schema['$ref'] -replace '^#/components/schemas/',''}else{$null}
 foreach($name in @($requestSchema,$row.response)){if($name){$schemas[$name]=$spec.components.schemas[$name]}}
 $canonicalRoute=($match.method.ToUpperInvariant())+' '+($match.path -replace '^/api','')
 $inventoryRow=$inventory[$row.canonicalLine-1]
 if(-not $inventoryRow.Contains($canonicalRoute)){throw "Inventory mismatch: $opId"}
 [ordered]@{
  operationId=$opId; method=$match.method.ToUpperInvariant(); path=$match.path; canonical=$canonicalRoute;
  canonicalStatus='aligned'; canonicalInventoryLine=$row.canonicalLine; canonicalInventoryRow=$inventoryRow;
  permissionKeys=@('contract:finance:manage'); security=$op.security;
  authorizationSource='controller @HasPermissions plus shared session/CSRF adapter; no per-project data-scope check found in the H service';
  parameterSchemas=$op.parameters; requestDto=$row.dto; requestSchema=$requestSchema; requestBody=if($op.Contains('requestBody')){$op.requestBody}else{$null};
  responseDto=$row.response+'Dto'; responseSchema=$row.response; successStatus=200; responses=$op.responses;
  controllerLines=@($row.controllerStart,$row.controllerEnd); serviceLines=@($row.serviceStart,$row.serviceEnd);
  sourceHashes=[ordered]@{controller=($files|Where-Object path -eq 'apps/poms-api/src/app/features/project-cost/project-cost.controller.ts').sha256;service=($files|Where-Object path -eq 'apps/poms-api/src/app/features/project-cost/project-cost.service.ts').sha256;sharedContract=($files|Where-Object path -eq 'libs/shared/contracts/src/lib/shared-contracts.ts').sha256;openapi=($files|Where-Object path -eq 'libs/shared/api-spec/openapi.json').sha256;inventory=($files|Where-Object path -eq 'docs/design/api-route-canonical-inventory.md').sha256}
 }
}
[ordered]@{schemaVersion=1;phase='G1-input-audit-only';operationCount=$operations.Count;newPublicRoutes=0;operations=@($operations);exactPrimaryOpenapiSchemas=$schemas;schemaNote='Exact current OpenAPI primary schemas; shared refs resolve in source-manifest OpenAPI. Proposals below do not modify this baseline.'}|ConvertTo-Json -Depth 35|Set-Content -LiteralPath (Join-Path $out 'operations01.json') -Encoding utf8NoBOM
$searches=@(
 @{id='repository-producer-calls';path='apps/poms-api/src/app';glob='!*.spec.ts';pattern='dataMaturityEvaluationResultRepository\.(create|save|saveAll)|operatingSignalEvaluationResultRepository\.(create|save|saveAll)|operatingSignalToCommissionGateBindingRepository\.(create|save|saveAll)'},
 @{id='entity-runtime-consumers';path='apps/poms-api/src/app';glob='!*.spec.ts';pattern='DataMaturityEvaluationResult|OperatingSignalEvaluationResult|OperatingSignalToCommissionGateBinding'},
 @{id='seed-inserts';path='apps/poms-api/src/seeders/database.seeder.ts';glob='*.ts';pattern='insert into.*(data_maturity_evaluation_result|operating_signal_evaluation_result|operating_signal_gate_binding)'},
 @{id='runtime-sql-write';path='apps/poms-api/src/app';glob='!*.spec.ts';pattern='(?i)(insert into|create\(|persist\().*(data_maturity_evaluation_result|operating_signal_evaluation_result|operating_signal_gate_binding)'},
 @{id='rust-runtime-producer';path='apps/poms-api-rust/src';glob='!**/shared/**';pattern='(?i)(insert into).*(data_maturity_evaluation_result|operating_signal_evaluation_result|operating_signal_gate_binding)'},
 @{id='seeded-e2e';path='apps/poms-api-e2e/src/poms-api/operating-signal-workflow.e2e-spec.ts';glob='*.ts';pattern='OPERATING_SIGNAL_E2E_FIXTURES|const fixture'}
)
$searchEvidence=foreach($search in $searches){
 $rgArgs=@('-n','--glob',$search.glob,$search.pattern,$search.path)
 $lines=@(& rg @rgArgs)
 $code=$LASTEXITCODE
 if($code -notin @(0,1)){throw "rg failed: $($search.id)"}
 [ordered]@{id=$search.id;root=$root;command=@('rg')+$rgArgs;exitCode=$code;lines=$lines;interpretation=if($search.id -eq 'repository-producer-calls'){'Only reviewCommissionGateBinding save(binding); no create producer calls for the three result entities'}else{$null}}
}
[ordered]@{schemaVersion=1;phase='read-only-static-search';searches=@($searchEvidence);limit='Static source inspection only. Seeder and mock-based tests are real baseline evidence but do not certify a production evaluation chain.'}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $out 'producer-search01.json') -Encoding utf8NoBOM
Write-Output ([ordered]@{files=$files.Count;operations=$operations.Count;searches=$searchEvidence.Count;output=$out}|ConvertTo-Json -Compress)
