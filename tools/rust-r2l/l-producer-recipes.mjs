// SOURCE-only request/recipe construction. No HTTP, ORM, PG, seeder invocation,
// IDs generated here, ownership admission, or runtime acceptance is performed.
// Node 24 can strip the type-only imports in this original pure support file.
import {
  buildProjectInput,
  buildContractInput,
  buildCommissionRuleVersionInput,
  buildRoleAssignmentInput,
  buildCalculationInput,
  buildPayoutInput,
  buildAdjustmentInput,
} from '../../apps/poms-api-e2e/src/support/test-data.ts';

const SUPPORT = 'apps/poms-api-e2e/src/support/';
const SEEDER = 'apps/poms-api/src/seeders/database.seeder.ts';
const APPROVAL = 'apps/poms-api/src/app/features/approval/approval.service.ts';

export const evidenceBoundary = Object.freeze({
  kind: 'source-only-original-producer-request-recipes',
  preparedFactsAreNativeGenerated: false,
  producerRequestsExecuted: false,
  fullR3R4R5Certified: false,
  ownershipDecision: 'Root/B actual before-absence, INSERT and outer-COMMIT proof only',
  fixedReadOnlyPrincipals: {
    vp_owner: '00000000-0000-4000-8000-000000000008',
    finance_mgr: '00000000-0000-4000-8000-000000000014',
  },
});

function request(method, path, body, supportFunction, writes = [], actor = 'initiator') {
  return { method, path, ...(body === undefined ? {} : { body }), source: `${SUPPORT}${supportFunction}`, writes, actor };
}
function id(row, label) {
  if (typeof row?.id !== 'string' || row.id.length === 0) throw new Error(`Actual ${label} row ID is required; this helper does not admit response IDs`);
  return row.id;
}

// The initializer callback belongs to Root/B. These are original INPUT helpers,
// never complete row constructors. Root/B derives the remaining persisted fields
// mechanically from the named original seeder source and actual entity metadata.
export function contractPreparedSourceRequest({ profile, customerId, projectName, customerProjectNo, customerContractNo, signedAmount }) {
  if (typeof customerId !== 'string' || customerId.length === 0) throw new Error('Explicit prepared customer reference required; never use the original helper seed-customer fallback');
  return {
    kind: 'prepared-source-callback-required',
    requiredActualOwnedRows: ['customer', 'project', 'contract'],
    projectInput: buildProjectInput(profile, { customerId, projectName, customerProjectNo, currentStage: 'commercial-closure' }),
    contractInputForProject: (project) => buildContractInput(id(project, 'project'), profile.id, { customerContractNo, signedAmount }),
    source: {
      file: SEEDER,
      function: 'seedProjectHandoverE2EFixture',
      lines: '1279-1366: project and contract INSERT projections',
      sourceArgument: 'fixture.contractStatus=draft; fresh IDs/numbers/actor/org/customer references supplied by Root/B',
      customerDefinition: 'apps/poms-api/src/seeders/dev-seed-data.ts DEV_CUSTOMER_SEEDS plus original customer entity/seed projection',
    },
    exclusions: ['Do not call the full seeder', 'Do not update seed business rows or fixed principals', 'Do not claim public Customer/Project/Contract create was run'],
  };
}

export function contractRequests(contract, { comment, reason } = {}) {
  const contractId = id(contract, 'contract');
  return {
    submit: request('POST', `/contracts/${contractId}:submitReview`, { ...(comment === undefined ? {} : { comment }), expectedVersion: contract.rowVersion }, 'contract-api.ts:35 submitContractReview', ['contract', 'approval_record', 'todo_item']),
    currentContract: request('GET', `/contracts/${contractId}`, undefined, 'contract-api.ts:30 getContract'),
    // Reject first -> original target draft -> actual submit again -> approve
    // permits both decisions on one owned contract, using fresh approval IDs.
    rejectReason: reason,
  };
}

export function approvalRequests(record, { targetType = record.targetObjectType, payoutStage, comment, reason } = {}) {
  const recordId = id(record, 'approval');
  const actor = targetType === 'contract' ? 'vp_owner' : 'finance_mgr';
  const targetTable = targetType === 'contract' ? 'contract' : targetType === 'commission-adjustment' ? 'commission_adjustment' : 'commission_payout';
  const approveWrites = ['approval_record', 'todo_item', targetTable,
    ...(targetType === 'commission-payout' && ['final', 'retention'].includes(payoutStage) ? ['commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot'] : []),
  ];
  return {
    detail: request('GET', `/approval-records/${recordId}`, undefined, 'approval-api.ts:49 getApprovalRecord', [], actor),
    todos: request('GET', '/me/todos', undefined, 'approval-api.ts:11 listMyTodos', [], actor),
    approve: request('POST', `/approval-records/${recordId}:approve`, { ...(comment === undefined ? {} : { comment }), expectedVersion: record.rowVersion }, 'approval-api.ts:59 approveRecord', approveWrites, actor),
    reject: request('POST', `/approval-records/${recordId}:reject`, { reason, ...(comment === undefined ? {} : { comment }), expectedVersion: record.rowVersion }, 'approval-api.ts:71 rejectRecord', ['approval_record', 'todo_item', targetTable], actor),
  };
}

// Record these named original functions with a recording connection, substitute
// every relevant PK/FK/logical UUID/text/JSON reference, then select only the
// explicitly listed INSERT projections. These descriptors do not execute SQL.
export const commissionPreparedSource = Object.freeze({
  kind: 'prepared-seeder-source-not-native-generated',
  file: SEEDER,
  originalFixture: 'COMMISSION_E2E_FIXTURES[0] / COMMISSION_MAIN_OPERATING_SIGNAL_E2E_FIXTURE',
  inputs: [
    {
      function: 'seedProjectHandoverE2EFixture', lines: '1279-1525',
      selectTables: ['project', 'contract', 'contract_term_snapshot', 'payment_record'],
      state: 'contract active/current term active/retentionDueDate 2026-04-14; payment confirmed 70000, payable_record_id null; project/actor/org references fresh',
      excludes: 'Commercial baseline/diff/readiness rows are not needed by the minimum direct commission freeze/calculation chain; receipt may be produced by real createReceipt/confirmReceipt instead of prepared INSERT.',
    },
    {
      function: 'seedProjectHandoverPreparedState', lines: '1533-1695',
      selectTables: ['approval_summary_snapshot', 'project_handover', 'confirmation_record', 'confirmation_participant', 'project_receipt_judgment_freeze'],
      state: 'two active contract/handover summaries; confirmed handover; confirmed 2/2 confirmation with two confirmed participant rows; current receipt freeze sourced from exactly that handover/summary/rebaseline(null)',
      excludes: 'Use the commission-main non-processing-rebaseline branch; no contract amendment/rebaseline rows are needed.',
    },
    {
      function: 'seedOperatingSignalEvidenceState', lines: '1778-2066',
      selectTables: ['operating_baseline_package', 'project_operating_snapshot', 'approval_summary_snapshot', 'data_maturity_evaluation_result', 'operating_signal_evaluation_result', 'operating_signal_gate_binding'],
      state: 'active current baseline; active snapshot; active L4/internal-only commission gate summary; active insufficient/review maturity; active signal; active gateStageType final binding initially review',
      excludes: 'The separate change_package_baseline INSERT is not needed by either original review method or the minimum L consumer; do not silently admit that row.',
    },
  ],
  constantSubstitutions: {
    E2E_ACTOR_ID: 'fresh initiator', E2E_VIEWER_ID: 'fresh second confirmation participant',
    defaultOwnerOrgId: 'fresh org',
    fixtureIdsAndNumbers: 'Root/B registered fresh source identities; include computed participant PKs and all logical text/JSON UUIDs',
  },
  readOnlyDefinitions: ['CONTRACT_HANDOVER_SUMMARY_PACKAGE_ID', 'PROJECT_HANDOVER_SUMMARY_PACKAGE_ID', 'OPERATING_SIGNAL_SUMMARY_PACKAGE_ID'],
  publicCreateExclusion: {
    source: 'BusinessNumberService.next:47-67; CustomerService.createCustomer:109; ProjectService.createAndSave:135; ContractService.createAndSave:75',
    table: 'business_number_sequence',
    reason: 'Public upstream create performs a (scope,period) upsert and can change an existing counter; this minimum recipe uses source-prepared initial rows instead.',
  },
});

export function fundingReceiptRequests(contract, { receiptAmount, receiptDate }) {
  return request('POST', `/contracts/${id(contract, 'contract')}/receipt-records`, { receiptAmount, receiptDate, sourceType: 'manual' }, 'contract-finance-api.ts:37 createReceipt', ['receipt_record']);
}
export function confirmReceiptRequest(receipt) {
  return request('POST', `/receipt-records/${id(receipt, 'receipt')}:confirm`, { expectedVersion: receipt.rowVersion }, 'contract-finance-api.ts:49 confirmReceipt', ['receipt_record']);
}

export function operatingReviewRequests(prepared, { signalVersion, bindingVersion, reviewComment }) {
  return {
    signal: request('POST', `/operating-signal-evaluations/${prepared.signalEvaluationId}:review`, {
      reviewDecision: 'approve', resolvedDataMaturityLevel: 'mature', costActionRecommendation: 'prompt',
      referencedBaselineVersion: prepared.baselinePackageId, referencedSnapshotVersion: prepared.operatingSnapshotId,
      reviewComment, expectedVersion: signalVersion,
    }, 'operating-signal-api.ts:16 reviewOperatingSignalEvaluation', ['operating_signal_review_record']),
    gate: request('POST', `/commission-gate-bindings/${prepared.gateBindingId}:review`, {
      bindingAction: 'prompt', gateReviewDecision: 'allow-retention', baselineSelectionSource: 'original',
      summaryPackageKey: prepared.summaryPackageKey, summarySnapshotId: prepared.summarySnapshotId,
      referencedBaselineVersion: prepared.baselinePackageId, referencedSnapshotVersion: prepared.operatingSnapshotId,
      expectedVersion: bindingVersion,
    }, 'operating-signal-api.ts:30 reviewCommissionGateBinding', ['operating_signal_gate_binding', 'commission_gate_review_record']),
  };
}

export function commissionRuleRequest(unique) {
  return request('POST', '/commission-rule-versions', buildCommissionRuleVersionInput(unique), 'commission-api.ts:59 createRuleVersion', ['commission_rule_version']);
}
export function activateRuleRequest(rule) {
  return request('POST', `/commission-rule-versions/${id(rule, 'rule')}:activate`, undefined, 'commission-api.ts:64 activateRuleVersion', ['commission_rule_version']);
}
export function roleAssignmentRequest(project, profile) {
  return request('POST', `/projects/${id(project, 'project')}/commission-role-assignments`, buildRoleAssignmentInput(profile), 'commission-api.ts:69 createRoleAssignment', ['commission_role_assignment']);
}
export function freezeAssignmentRequest(assignment, prepared) {
  return request('POST', `/commission-role-assignments/${id(assignment, 'assignment')}:freeze`, {
    sourceHandoverId: prepared.handoverId, handoverSummarySnapshotId: prepared.handoverSummarySnapshotId, expectedVersion: assignment.rowVersion,
  }, 'commission-api.ts:84 freezeRoleAssignment', ['commission_role_assignment']);
}
export function calculationRequest(project, rule) {
  return request('POST', `/projects/${id(project, 'project')}/commission-calculations`, buildCalculationInput(id(rule, 'rule')), 'commission-api.ts:109 createCalculation', ['commission_calculation']);
}
export function approveCalculationRequest(calculation) {
  return request('POST', `/commission-calculations/${id(calculation, 'calculation')}:approve`, { expectedVersion: calculation.rowVersion }, 'commission-api.ts:114 approveCalculation', ['commission_calculation']);
}
export function payoutRequest(project, calculation, stageType = 'first') {
  return request('POST', `/projects/${id(project, 'project')}/commission-payouts`, buildPayoutInput(id(calculation, 'calculation'), { stageType }), 'commission-api.ts:124 createPayout', ['commission_payout']);
}
export function submitPayoutRequest(payout, retentionEvidence) {
  return request('POST', `/commission-payouts/${id(payout, 'payout')}:submitApproval`, {
    payoutStage: payout.stageType, ...(retentionEvidence ?? {}), expectedVersion: payout.rowVersion,
  }, 'commission-api.ts:129 submitPayoutApproval', payout.stageType === 'retention'
    ? ['commission_payout', 'approval_record', 'todo_item', 'commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot']
    : ['commission_payout', 'approval_record', 'todo_item']);
}
export function adjustmentRequest(project, calculation, approvedPayout, reason) {
  return request('POST', `/projects/${id(project, 'project')}/commission-adjustments`, buildAdjustmentInput(id(calculation, 'calculation'), id(approvedPayout, 'approved payout'), { reason }), 'commission-api.ts:166 createAdjustment', ['commission_adjustment']);
}
export function submitAdjustmentRequest(adjustment) {
  return request('POST', `/commission-adjustments/${id(adjustment, 'adjustment')}:submitApproval`, { expectedVersion: adjustment.rowVersion }, 'commission-api.ts:171 submitAdjustmentApproval', ['commission_adjustment', 'approval_record', 'todo_item']);
}
export function registerPayoutRequest(approvedPayout, input) {
  return request('POST', `/commission-payouts/${id(approvedPayout, 'approved payout')}:registerPayout`, {
    ...input, payoutStage: approvedPayout.stageType, expectedVersion: approvedPayout.rowVersion,
  }, 'commission-api.ts:161 registerPayout', ['commission_payout', 'commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot']);
}
export function departureRequest(project, frozenAssignment, prepared, input) {
  return request('POST', `/projects/${id(project, 'project')}/commission-departure-exception-decisions`, {
    ...input, freezeVersionId: frozenAssignment.targetId, summarySnapshotId: prepared.handoverSummarySnapshotId,
  }, 'commission-api.ts:144 createDepartureExceptionDecision', ['commission_departure_exception_decision', 'commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot']);
}
export function retentionSubmitEvidence(prepared, gateReview, frozenAssignment, receipt, departure) {
  return {
    gateReviewRecordId: gateReview.gateReviewRecordId, freezeVersionId: frozenAssignment.targetId,
    summarySnapshotId: prepared.summarySnapshotId, retentionReceiptRecordId: id(receipt, 'confirmed receipt'), departureExceptionDecisionId: id(departure, 'departure decision'),
  };
}

export const minimumExecutionOrder = Object.freeze({
  contract: ['prepared callback yields actual owned customer/project/draft contract', 'submitReview actual SDK/API', 'VP todos/detail', 'reject', 'refresh contract then submitReview again', 'VP todos/detail/approve', 'target remains pending-review'],
  firstAndAdjustment: ['prepared commission facts, actual funding receipt confirmed >=100000 and prepared confirmed payment >=70000', 'create unique rule/activate', 'create role assignment/freeze', 'create calculation/approve', 'create first payout/submitApproval', 'finance todos/detail/approve', 'create suspend-payout adjustment only now payout is approved/paid', 'submit adjustment', 'finance todos/detail/reject', 'resubmit adjustment then approve'],
  finalAndRetention: ['actual operating review then gate review', 'create/approve a fresh calculation if the first-stage scenario already consumed that calculation/stage', 'create final payout/submitApproval', 'finance approve -> pending-final-settlement double snapshots', 'actual register final with source E2E 2040.00 -> pending-retention/settled-non-retention', 'create retention payout', 'actual create/confirm retention receipt', 'actual departure decision with confirmationRequirementSummary null', 'retention submit with exact evidence returned above -> ready snapshots', 'finance approve -> still ready-retention, not settled-all', 'optional original register retention is upstream evidence only, not an L operation'],
  source: 'apps/poms-api-e2e/src/poms-api/commission-workflow.e2e-spec.ts:135-305; source input helpers above',
  sqlCalibration: [
    'contract/payout first/adjustment approve and reject; observe target/common/auth update groups',
    'final initial no current snapshots, then final replacement with both current snapshots',
    'retention approve with both current snapshots; observe the two supersede flushes and final flush separately',
    'fail after first flush, fail after second flush, fail final flush; database rollback and parent shared memory separately',
    'same approval controlled two sessions; separate auth sessions prevent an incidental auth conflict hiding approval behavior',
    'two final payouts for different calculation IDs on the same project, current creation/replacement races',
    'at least one caller-owned outer transaction with another dirty same-metadata row to expose batch preflight/RETURNING behavior',
  ],
  approvalAuthority: APPROVAL,
});

// Mechanically extracted literal INSERT column projections, not handwritten rows.
// Source SHA256: c2450781dab397c75c15f70a81bcc258967a18ee467df9befdcbe96b1ccd5fcd.
export const preparedInsertProjections = Object.freeze([
  {
    "function": "seedProjectHandoverE2EFixture",
    "table": "project",
    "sourceLine": 1285,
    "columns": [
      "id",
      "project_no",
      "project_name",
      "customer_id",
      "customer_name",
      "status",
      "current_stage",
      "owner_org_id",
      "owner_user_id",
      "planned_sign_at",
      "created_by",
      "updated_by"
    ]
  },
  {
    "function": "seedProjectHandoverE2EFixture",
    "table": "contract",
    "sourceLine": 1316,
    "columns": [
      "id",
      "project_id",
      "contract_no",
      "status",
      "signed_amount",
      "currency_code",
      "current_snapshot_id",
      "signed_at",
      "retention_due_date",
      "created_by",
      "updated_by"
    ]
  },
  {
    "function": "seedProjectHandoverE2EFixture",
    "table": "contract_term_snapshot",
    "sourceLine": 1345,
    "columns": [
      "id",
      "contract_id",
      "effective_by",
      "retention_due_date",
      "snapshot_status",
      "created_by"
    ]
  },
  {
    "function": "seedProjectHandoverE2EFixture",
    "table": "receipt_record",
    "sourceLine": 1365,
    "columns": [
      "id",
      "contract_id",
      "project_id",
      "receipt_amount",
      "receipt_date",
      "source_type",
      "status",
      "confirmed_at",
      "confirmed_by"
    ]
  },
  {
    "function": "seedProjectHandoverE2EFixture",
    "table": "payment_record",
    "sourceLine": 1392,
    "columns": [
      "id",
      "project_id",
      "contract_id",
      "payable_record_id",
      "currency",
      "amount_excluding_tax",
      "tax_amount",
      "amount_including_tax",
      "payment_date",
      "cost_category",
      "source_type",
      "status",
      "confirmed_at",
      "confirmed_by"
    ]
  },
  {
    "function": "seedProjectHandoverPreparedState",
    "table": "approval_summary_snapshot",
    "sourceLine": 1541,
    "columns": [
      "id",
      "target_type",
      "target_id",
      "approval_scenario_key",
      "summary_package_id",
      "summary_package_key",
      "projection_level",
      "export_policy",
      "business_status_at_snapshot",
      "generated_at",
      "status",
      "created_by",
      "updated_by"
    ]
  },
  {
    "function": "seedProjectHandoverPreparedState",
    "table": "project_handover",
    "sourceLine": 1562,
    "columns": [
      "id",
      "project_id",
      "contract_summary_snapshot_id",
      "effective_handover_baseline_snapshot_id",
      "summary_snapshot_id",
      "handover_rebaseline_record_id",
      "status",
      "confirmed_at",
      "confirmed_by",
      "comment",
      "created_by",
      "updated_by"
    ]
  },
  {
    "function": "seedProjectHandoverPreparedState",
    "table": "confirmation_record",
    "sourceLine": 1593,
    "columns": [
      "id",
      "confirmation_type",
      "business_domain",
      "target_type",
      "target_id",
      "project_id",
      "status",
      "required_count",
      "confirmed_count",
      "confirmation_comment",
      "submitted_at",
      "confirmed_at",
      "created_by",
      "updated_by"
    ]
  },
  {
    "function": "seedProjectHandoverPreparedState",
    "table": "confirmation_participant",
    "sourceLine": 1628,
    "columns": [
      "id",
      "confirmation_record_id",
      "participant_id",
      "participant_role_key",
      "participant_display_name",
      "participant_status",
      "confirmed_at",
      "confirmed_comment",
      "created_by",
      "updated_by"
    ]
  },
  {
    "function": "seedProjectHandoverPreparedState",
    "table": "project_receipt_judgment_freeze",
    "sourceLine": 1651,
    "columns": [
      "id",
      "project_id",
      "receipt_judgment_mode",
      "source_type",
      "source_id",
      "source_handover_id",
      "source_handover_summary_snapshot_id",
      "source_handover_rebaseline_record_id",
      "is_current",
      "frozen_at",
      "frozen_by",
      "supersedes_id",
      "created_by",
      "updated_by"
    ]
  },
  {
    "function": "seedOperatingSignalEvidenceState",
    "table": "operating_baseline_package",
    "sourceLine": 1784,
    "columns": [
      "id",
      "project_id",
      "original_baseline_cost",
      "change_package_total",
      "current_effective_baseline_cost",
      "baseline_selection_source",
      "effective_operating_baseline_id",
      "baseline_summary",
      "is_current",
      "status",
      "effective_at",
      "effective_by",
      "created_by",
      "updated_by"
    ]
  },
  {
    "function": "seedOperatingSignalEvidenceState",
    "table": "project_operating_snapshot",
    "sourceLine": 1844,
    "columns": [
      "id",
      "project_id",
      "snapshot_mode",
      "snapshot_at",
      "source_window_start",
      "source_window_end",
      "effective_contract_total",
      "receivable_confirmed_total",
      "included_cost_total",
      "original_baseline_cost",
      "current_effective_baseline_cost",
      "gross_margin_amount",
      "gross_margin_rate",
      "tax_impact_summary",
      "tax_impact_pending_amount",
      "allocation_stability_summary",
      "unmapped_cost_summary",
      "current_action_level",
      "referenced_baseline_version",
      "baseline_selection_source",
      "handover_rebaseline_record_id",
      "status",
      "supersedes_id",
      "created_by",
      "updated_by"
    ]
  },
  {
    "function": "seedOperatingSignalEvidenceState",
    "table": "approval_summary_snapshot",
    "sourceLine": 1901,
    "columns": [
      "id",
      "target_type",
      "target_id",
      "approval_scenario_key",
      "summary_package_id",
      "summary_package_key",
      "projection_level",
      "export_policy",
      "business_status_at_snapshot",
      "generated_at",
      "status",
      "created_by",
      "updated_by"
    ]
  },
  {
    "function": "seedOperatingSignalEvidenceState",
    "table": "data_maturity_evaluation_result",
    "sourceLine": 1934,
    "columns": [
      "id",
      "project_id",
      "referenced_snapshot_id",
      "data_maturity_level",
      "cost_action_recommendation",
      "tax_impact_pending_amount",
      "allocation_stability_summary",
      "unmapped_cost_summary",
      "evaluation_basis_json",
      "evaluated_at",
      "status",
      "created_by",
      "updated_by"
    ]
  },
  {
    "function": "seedOperatingSignalEvidenceState",
    "table": "operating_signal_evaluation_result",
    "sourceLine": 1967,
    "columns": [
      "id",
      "project_id",
      "referenced_snapshot_id",
      "data_maturity_evaluation_id",
      "signal_level",
      "risk_level",
      "formula_boundary_action",
      "variance_source_summary",
      "tax_impact_summary",
      "allocation_stability_summary",
      "unmapped_cost_summary",
      "current_action_level",
      "recommended_action_summary",
      "referenced_baseline_version",
      "referenced_snapshot_version",
      "review_required",
      "evaluated_at",
      "status",
      "created_by",
      "updated_by"
    ]
  },
  {
    "function": "seedOperatingSignalEvidenceState",
    "table": "operating_signal_gate_binding",
    "sourceLine": 2014,
    "columns": [
      "id",
      "project_id",
      "signal_evaluation_id",
      "binding_action",
      "gate_stage_type",
      "baseline_selection_source",
      "tax_impact_summary",
      "tax_impact_pending_amount",
      "allocation_stability_summary",
      "unmapped_cost_summary",
      "data_maturity_level",
      "cost_action_recommendation",
      "current_action_level",
      "next_action_summary",
      "downstream_consumer_summary",
      "referenced_baseline_version",
      "referenced_snapshot_version",
      "generated_at",
      "status",
      "created_by",
      "updated_by"
    ]
  }
]);
