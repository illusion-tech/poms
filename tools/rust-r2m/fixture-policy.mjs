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
    attachment_download_package_item: Object.freeze([Object.freeze(['package_id', 'attachment_download_package']), Object.freeze(['handover_id', 'project_handover'])]),
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

// R2M explicit M0-M5 ownership union; all other catalog tables remain scan-only.
export const additionalIdentities = Object.freeze({
  "commercial_release_baseline": ["project_id", "baseline_code"],
  "commercial_baseline_diff_result": ["baseline_id", "project_id"],
  "contract_readiness_package": ["project_id", "source_baseline_id"],
  "lead": [
    "lead_no",
    "customer_id",
    "created_by"
  ],
  "sales_follow_up_record": [
    "customer_id",
    "lead_id",
    "project_id",
    "created_by"
  ],
  "dictionary_item": [
    "domain",
    "code",
    "created_by"
  ],
  "business_number_sequence": [
    "scope",
    "period"
  ],
  "identity_provider_config": [
    "provider",
    "tenant_id",
    "client_id",
    "created_by"
  ],
  "identity_provider_oauth_grant": [
    "identity_provider_config_id",
    "poms_user_id",
    "created_by"
  ],
  "external_identity": [
    "identity_provider_config_id",
    "poms_user_id",
    "subject_id",
    "created_by"
  ],
  "external_login_ticket": [
    "identity_provider_config_id",
    "external_identity_id",
    "poms_user_id",
    "ticket_hash"
  ],
  "external_org_source": [
    "provider",
    "provider_config_id",
    "external_tenant_id",
    "created_by"
  ],
  "external_department_mapping": [
    "source_id",
    "external_department_id"
  ],
  "org_sync_run": [
    "source_id"
  ],
  "org_sync_diff_item": [
    "run_id",
    "external_department_id",
    "action"
  ],
  "attachment_storage_provider_config": [
    "provider_type",
    "created_by"
  ],
  "attachment_upload_session": [
    "created_by",
    "operation_type",
    "original_name"
  ],
  "attachment": [
    "uploaded_by",
    "storage_provider",
    "storage_bucket",
    "storage_key"
  ],
  "attachment_link": [
    "attachment_id",
    "target_type",
    "target_id",
    "relation_type",
    "linked_by"
  ],
  "attachment_download_package": [
    "handover_id",
    "project_id",
    "created_by"
  ],
  "attachment_download_package_item": [
    "package_id",
    "handover_id",
    "attachment_id",
    "version_group_id"
  ],
  "project_handover_attachment_selection": [
    "handover_id",
    "project_id",
    "version_group_id"
  ]
});
export const ownershipIdentities = Object.freeze(Object.fromEntries(Object.entries({ ...{"platform_user":["username"],"local_credential":["user_id"],"role":["role_key"],"org_unit":["code"],"user_role_assignment":["user_id","role_id"],"user_org_membership":["user_id","org_unit_id","membership_type"],"role_permission_assignment":["role_id","permission_key"],"auth_session":["user_id","token_hash"],"audit_log":["event_type","target_type","target_id","operator_id","request_id"],"security_event":["event_type","actor_id","principal","request_id","path","method"],"approval_record":["approval_type","business_domain","target_object_type","target_object_id","project_id","initiator_user_id"],"todo_item":["source_type","source_id","todo_type","business_domain","target_object_type","target_object_id","project_id"],"contract":["project_id","contract_no","created_by"],"project":["project_no","created_by"],"customer":["customer_no","created_by"]}, ...commissionIdentities, ...additionalIdentities }).map(([table, fields]) => [table, Object.freeze(fields)])));
export const stageGlobalTables = Object.freeze(["dictionary_item","business_number_sequence","identity_provider_config","identity_provider_oauth_grant","external_identity","external_login_ticket","external_org_source","external_department_mapping","org_sync_run","org_sync_diff_item","attachment_storage_provider_config","attachment_upload_session","attachment","attachment_link","platform_user","local_credential","role","org_unit","user_role_assignment","user_org_membership","role_permission_assignment"]);
export const keyedTables = Object.freeze({ system_setting: Object.freeze({ primaryKey: 'key', immutable: Object.freeze(['key']) }) });
export const handoverSourceOnlyTables = Object.freeze(['commercial_release_baseline', 'commercial_baseline_diff_result', 'contract_readiness_package']);

export const producerCertification = Object.freeze({
  native: 'Actual SDK7.0.11 afterCreate, nested release chain and outer before/after commit; original producer in either DB is labelled m.producer.',
  rust: 'Actual PG after-INSERT observer, top/subtransaction committed status and independent visible row; response/query IDs never certify.',
  prepared: 'Named original seeder source+mapping/columns, before-PK absence, actual INSERT/RETURNING, xid/xmin, outer COMMIT ACK and independent visibility.',
  setting: 'Only canonical attachment.max-upload-size-mb when before-absent; exact-key PG insert/outer-COMMIT certificate. Pre-existing setting refuses ownership.'
});
