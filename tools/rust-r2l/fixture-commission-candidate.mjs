// Historical proposal 01 inspection. Its original bytes and receipt are
// preserved in fixture-source-epoch02-before and candidate01 respectively.
// Active epoch 02 admission is explicit in fixture-commission-policy.mjs.
import assert from 'node:assert/strict';
import { authority } from './catalog-complete.mjs';
import { supportedTables } from './fixture-core.mjs';
import { commissionPreparedSource, preparedInsertProjections } from './l-producer-recipes.mjs';

export const boundary = Object.freeze({
    enabled: false,
    status: 'Historical-disabled-proposal01; active-epoch02-source-is-reviewed-separately',
    databaseOrDMLExecuted: false,
    firstContractIdentityDefinitionsUnchanged: true,
    epoch02SourceExtendsClosure: true,
    existingSourceCandidate: 'tmp/rust-r2l/fixture-source-candidate01.json',
    preparedStateIsNativeProducerSuccess: false
});
export const additionalIdentities = Object.freeze(Object.fromEntries(Object.entries({
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

export const requiredActivationDeltas = Object.freeze([
    'Explicitly add these individually reviewed table/identity entries; keep all remaining tables unsupported.',
    'Readonly-borrow only the three original canonical package definitions named by the recipe, with full-row before/after hashes; never adopt or delete them.',
    'Permit case.borrowedDefinitions only for definitions already in that readonly registry; preserve actor8/14 restrictions.',
    'Derive project ownership through immutable owned-parent references for term/confirmation/projection/review rows lacking project_id, with cycle detection and exact case project scope.',
    'For global commission_rule_version require a fresh run-qualified rule_code plus real case actor and actual create/commit evidence.',
    'Select only the named original seeder INSERT projections; substitute every PK/FK/text/JSON UUID and source constant. Do not execute whole seed functions or upserts.',
    'Expose a separately reviewed prepared-batch API over the existing transaction-owned batch implementation: all batch PKs absent before DML, all forward logical UUIDs admitted only within that exact batch, one actual outer COMMIT/ACK, captured per-row identities/xmins. A planned future id is not owned and cannot justify a single-row contract/snapshot INSERT.',
    'Keep change_package_baseline, business_number_sequence, contract amendment/rebaseline and the optional readiness/commercial branch unowned and unexecuted for this minimum recipe.',
    'PG observer generated-table scope must grow only by reviewed explicit entries; actual top/sub xid, status, identity and epoch proof remains mandatory.',
    'Snapshot/current/version and domain default/hook/flush behavior remain actual Native-before-store work; this proposal is not such evidence.'
]);

export function inspectCommissionCandidate() {
    const originalFirstClosure = supportedTables.filter((table) => !Object.hasOwn(additionalIdentities, table));
    const all = new Set([...supportedTables, ...Object.keys(additionalIdentities)]);
    for (const [table, fields] of Object.entries(additionalIdentities)) {
        const schema = authority.tables.find((entry) => entry.name === table);
        assert(schema && JSON.stringify(schema.primaryKey.columns) === '["id"]');
        assert(fields.every((field) => schema.columns.some((column) => column.name === field)), 'Unmapped proposed immutable field in ' + table);
        assert(!fields.some((field) => /^(?:status|current_status|is_current|version|row_version|assignee_user_id|current_approver_user_id)$/.test(field)));
    }
    const selected = new Set(commissionPreparedSource.inputs.flatMap((input) => input.selectTables));
    for (const projection of preparedInsertProjections.filter((entry) => selected.has(entry.table))) {
        assert(all.has(projection.table), 'Prepared projection is not explicitly covered');
        const schema = authority.tables.find((entry) => entry.name === projection.table);
        assert(projection.columns.every((field) => schema.columns.some((column) => column.name === field)), 'Original INSERT projection drift');
    }
    return {
        ...boundary, inspectionMode: 'historical-disabled-proposal01-with-live-epoch02-context', originalSourceArchive: 'tmp/rust-r2l/fixture-source-epoch02-before', originalFirstClosure,
        currentOwnedTables: [...supportedTables], proposedAdditionalTables: Object.keys(additionalIdentities).sort(),
        proposedCombinedTableCount: all.size,
        stillUnsupported: authority.tables.map((entry) => entry.name).filter((table) => !all.has(table)).sort(),
        selectedPreparedTables: [...selected].sort(),
        source: commissionPreparedSource,
        selectedOriginalInsertProjections: preparedInsertProjections.filter((entry) => selected.has(entry.table)),
        requiredActivationDeltas
    };
}
