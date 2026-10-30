// Epoch 02: explicit SOURCE admission only. Review/Root runtime execution is
// separate. The archived epoch 01 receipts still describe fifteen tables.
export const commissionIdentities = Object.freeze(Object.fromEntries(Object.entries({
    contract_term_snapshot: ['contract_id', 'source_readiness_id', 'source_baseline_id', 'created_by'],
    payment_record: ['project_id', 'contract_id', 'payable_record_id', 'source_type'],
    receipt_record: ['project_id', 'contract_id', 'source_type'],
    confirmation_record: ['confirmation_type', 'business_domain', 'target_type', 'target_id', 'project_id', 'created_by'],
    confirmation_participant: ['confirmation_record_id', 'participant_id', 'participant_role_key'],
    approval_summary_snapshot: ['target_type', 'target_id', 'approval_scenario_key', 'summary_package_id', 'summary_package_key', 'created_by'],
    approval_summary_field_projection: ['summary_snapshot_id', 'field_key'],
    project_handover: ['project_id', 'created_by'],
    project_receipt_judgment_freeze: ['project_id', 'source_type', 'source_id', 'created_by'],
    operating_baseline_package: ['project_id', 'created_by'],
    project_operating_snapshot: ['project_id', 'created_by'],
    data_maturity_evaluation_result: ['project_id', 'referenced_snapshot_id', 'created_by'],
    operating_signal_evaluation_result: ['project_id', 'referenced_snapshot_id', 'created_by'],
    operating_signal_gate_binding: ['project_id', 'signal_evaluation_id', 'created_by'],
    operating_signal_review_record: ['signal_evaluation_id', 'created_by'],
    commission_gate_review_record: ['binding_id', 'created_by'],
    commission_rule_version: ['rule_code', 'created_by'],
    commission_role_assignment: ['project_id', 'created_by'],
    commission_calculation: ['project_id', 'rule_version_id', 'created_by'],
    commission_payout: ['project_id', 'calculation_id', 'stage_type', 'payout_kind', 'created_by'],
    commission_adjustment: ['project_id', 'adjustment_type', 'related_payout_id', 'related_calculation_id', 'created_by'],
    commission_departure_exception_decision: ['project_id', 'freeze_version_id', 'created_by'],
    commission_freeze_dispute_record: ['project_id', 'freeze_version_id', 'created_by'],
    commission_final_settlement_snapshot: ['project_id', 'created_by'],
    commission_rule_explanation_snapshot: ['project_id', 'created_by']
}).map(([table, fields]) => [table, Object.freeze(fields)])));

// Original database.seeder.ts constants / definition INSERT projections. These
// are only readonly selectors; no definition is inserted, updated or adopted.
export const canonicalDefinitions = Object.freeze([
    { id: '68000000-0000-4000-8000-000000000001', approval_scenario_key: 'handover-confirmation', summary_package_key: 'contract-handover-summary' },
    { id: '68000000-0000-4000-8000-000000000002', approval_scenario_key: 'project-handover', summary_package_key: 'project-handover-confirmation' },
    { id: '69000000-0000-4000-8000-000000000003', approval_scenario_key: 'commission-gate-review', summary_package_key: 'operating-signal-commission-gate-e2e' }
].map(Object.freeze));

// Only the named immutable parent edges establish a project for rows without
// project_id. Mutable current/snapshot/assignee links cannot establish ownership.
export const projectParentEdges = Object.freeze({
    contract_term_snapshot: Object.freeze([Object.freeze(['contract_id', 'contract'])]),
    confirmation_participant: Object.freeze([Object.freeze(['confirmation_record_id', 'confirmation_record'])]),
    approval_summary_field_projection: Object.freeze([Object.freeze(['summary_snapshot_id', 'approval_summary_snapshot'])]),
    operating_signal_review_record: Object.freeze([Object.freeze(['signal_evaluation_id', 'operating_signal_evaluation_result'])]),
    commission_gate_review_record: Object.freeze([Object.freeze(['binding_id', 'operating_signal_gate_binding'])])
});
export const summaryTargetTables = Object.freeze({
    project: 'project',
    'project-handover': 'project_handover'
});
