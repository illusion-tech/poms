import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { assertOwnedBase, rowOwned } from './fixture-cleanup.mjs';
import { ownedUserIds, ownedRoleIds, ownedOrgIds } from './fixture-users.mjs';
import { EXPECTED_USER_INCOMING_FOREIGN_KEYS } from '../rust-r2d/catalog-users.mjs';
import { EXPECTED_ORG_UNIT_INCOMING_FOREIGN_KEYS } from '../rust-r2c/catalog-org-units.mjs';
import { fail } from './fixture-guard.mjs';

const require = createRequire(import.meta.url);
const { fixtureRequestIdentity } = require('./fixture-protocol.cjs');

// Frozen from the controlled original 92-migration catalog, not live discovery.
// schema-nest-before.json sha256 ffaeecdb57b3e2dd12b83c8208f3f5d0c7c54c23c2f7707a2c2cc2be3a76931e
// catalog-alignment01.json sha256 7af5fe4a8afff3cda3a30980a44db78d80eb7b9e364247dd5527a4378acc7fdb
export const FROZEN_POMS_TABLES = Object.freeze(`
acceptance_record accounting_tax_treatment_snapshot approval_record approval_summary_field_projection
approval_summary_package_definition approval_summary_snapshot attachment attachment_download_package
attachment_download_package_item attachment_link attachment_storage_provider_config attachment_upload_session
audit_log auth_session business_discussion_comment business_discussion_thread business_number_sequence
change_package_baseline commercial_baseline_diff_item commercial_baseline_diff_result commercial_baseline_review_record
commercial_release_baseline commission_adjustment commission_calculation commission_departure_exception_decision
commission_final_settlement_snapshot commission_freeze_change_request commission_freeze_dispute_record
commission_gate_review_record commission_payout commission_role_assignment commission_rule_explanation_snapshot
commission_rule_version competitor_intelligence_record confirmation_participant confirmation_record contract
contract_amendment contract_handover_rebaseline_record contract_readiness_package contract_readiness_package_item
contract_term_snapshot cost_stage_attribution_snapshot customer customer_alias customer_contact
data_maturity_evaluation_result dictionary_item expense_record external_department_mapping external_identity
external_login_ticket external_org_source handover_baseline_impact_item identity_provider_config
identity_provider_oauth_grant internal_cost_rate_version invoice_record lead lead_owner_assignment_record
lead_score_override lead_score_snapshot local_credential operating_baseline_package operating_restatement_record
operating_signal_evaluation_result operating_signal_gate_binding operating_signal_review_record
opportunity_stakeholder org_sync_diff_item org_sync_run org_unit payable_record payment_record
period_closing_snapshot platform_user poms_migrations project project_actual_cost_record project_archive_record
project_bid_commercial_material_item project_bid_commercial_process project_bid_commercial_timeline_item
project_completion_record project_handover project_handover_attachment_selection project_operating_snapshot
project_owner_reassignment_record project_pricing_margin_condition_item project_pricing_margin_review
project_receipt_judgment_freeze project_technical_cost_item project_technical_cost_package
project_technical_risk_item project_technical_scope_item receipt_record role role_permission_assignment
sales_discovery_record sales_follow_up_record security_event shared_cost_allocation_basis
shared_cost_allocation_result system_setting todo_item user_org_membership user_role_assignment
`.trim().split(/\s+/).toSorted());
assert.equal(FROZEN_POMS_TABLES.length, 107);

const ghIdentityKeys = Object.freeze({
    identity_provider_config: ['tenant_id', 'client_id', 'display_name'],
    external_identity: ['identity_provider_config_id', 'poms_user_id', 'subject_id'],
    identity_provider_oauth_grant: ['identity_provider_config_id', 'poms_user_id'],
    external_login_ticket: ['identity_provider_config_id', 'external_identity_id', 'poms_user_id', 'ticket_hash'],
    external_org_source: ['provider_config_id', 'external_tenant_id', 'display_name'],
    external_department_mapping: ['source_id', 'external_department_id'],
    org_sync_run: ['source_id'],
    org_sync_diff_item: ['run_id', 'external_department_id', 'action'],
    org_unit: ['code', 'parent_id', 'name'],
    audit_log: ['target_type', 'target_id', 'event_type', 'operator_id']
});
const baseTables = ['platform_user', 'role', 'org_unit', 'local_credential', 'auth_session', 'user_role_assignment', 'user_org_membership', 'role_permission_assignment', 'audit_log', 'security_event'];
export const COMPLETE_REFERENCE_TARGET_TABLES = Object.freeze([...new Set([...baseTables, ...Object.keys(ghIdentityKeys)])].toSorted());

function edge(source_table, column, conname, target_table, delete_action, source_schema = 'poms') {
    return Object.freeze({ source_schema, source_table, conname, source_columns: Object.freeze([column]), target_schema: 'poms', target_table, target_columns: Object.freeze(['id']), update_action: 'c', delete_action, match_type: 's', convalidated: true, condeferrable: false, condeferred: false });
}
// GH incoming edges are frozen from the original EX64C/D/E and EX72B migrations.
// Targets such as audit_log/auth_session/credentials/assignments currently have
// no incoming FKs; they are nevertheless queried so a new edge cannot hide.
export const EXPECTED_COMPLETE_INCOMING_FOREIGN_KEYS = Object.freeze([
    ...EXPECTED_USER_INCOMING_FOREIGN_KEYS.map((row) => edge(row.source_table, row.column, row.conname, 'platform_user', row.delete_action, row.source_schema)),
    ...EXPECTED_ORG_UNIT_INCOMING_FOREIGN_KEYS.map((row) => edge(row.source_table, row.column, row.conname, 'org_unit', row.delete_action, row.source_schema)),
    edge('role_permission_assignment', 'role_id', 'role_permission_assignment_role_id_foreign', 'role', 'c'),
    edge('user_role_assignment', 'role_id', 'user_role_assignment_role_id_foreign', 'role', 'c'),
    edge('external_identity', 'identity_provider_config_id', 'external_identity_provider_config_id_foreign', 'identity_provider_config', 'r'),
    edge('external_login_ticket', 'identity_provider_config_id', 'external_login_ticket_provider_config_id_foreign', 'identity_provider_config', 'r'),
    edge('external_org_source', 'provider_config_id', 'external_org_source_provider_config_id_foreign', 'identity_provider_config', 'n'),
    edge('identity_provider_oauth_grant', 'identity_provider_config_id', 'identity_provider_oauth_grant_provider_config_id_foreign', 'identity_provider_config', 'r'),
    edge('external_login_ticket', 'external_identity_id', 'external_login_ticket_external_identity_id_foreign', 'external_identity', 'r'),
    edge('external_department_mapping', 'source_id', 'external_department_mapping_source_id_foreign', 'external_org_source', 'c'),
    edge('org_sync_run', 'source_id', 'org_sync_run_source_id_foreign', 'external_org_source', 'c'),
    edge('org_sync_diff_item', 'run_id', 'org_sync_diff_item_run_id_foreign', 'org_sync_run', 'c')
]);

export const COMPLETE_INCOMING_FOREIGN_KEYS_SQL = `select source_ns.nspname as source_schema,
    source_table.relname as source_table,c.conname,
    array(select a.attname::text from unnest(c.conkey) with ordinality k(attnum,position)
        join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum order by k.position) as source_columns,
    target_ns.nspname as target_schema,target_table.relname as target_table,
    array(select a.attname::text from unnest(c.confkey) with ordinality k(attnum,position)
        join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.attnum order by k.position) as target_columns,
    c.confupdtype::text as update_action,c.confdeltype::text as delete_action,
    c.confmatchtype::text as match_type,c.convalidated,c.condeferrable,c.condeferred
    from pg_constraint c
    join pg_class source_table on source_table.oid=c.conrelid
    join pg_namespace source_ns on source_ns.oid=source_table.relnamespace
    join pg_class target_table on target_table.oid=c.confrelid
    join pg_namespace target_ns on target_ns.oid=target_table.relnamespace
    where c.contype='f' and target_ns.nspname=$1 and target_table.relname=any($2::text[])
    order by source_ns.nspname,source_table.relname,c.conname`;

const ident = (value) => {
    if (!/^[a-z_][a-z0-9_]*$/.test(value)) fail('complete_reference_identifier');
    return `"${value}"`;
};
function uuidKey(value) {
    if (typeof value !== 'string') return null;
    const key = value.toLowerCase().replaceAll('-', '');
    return /^[0-9a-f]{32}$/.test(key) ? key : null;
}
function requireId(value) {
    const key = uuidKey(value);
    if (!key) fail('complete_reference_journal_id');
    return key;
}
function assertIncomingShape(actual) {
    if (!Array.isArray(actual) || actual.length !== EXPECTED_COMPLETE_INCOMING_FOREIGN_KEYS.length) fail('complete_incoming_fk_changed');
    const fields = Object.keys(EXPECTED_COMPLETE_INCOMING_FOREIGN_KEYS[0]);
    const key = (row) => `${row.source_schema}.${row.source_table}.${row.conname}`;
    const expected = new Map(EXPECTED_COMPLETE_INCOMING_FOREIGN_KEYS.map((row) => [key(row), row]));
    const seen = new Set();
    for (const row of actual) {
        const name = key(row), match = expected.get(name);
        if (!match || seen.has(name) || fields.some((field) => JSON.stringify(row[field]) !== JSON.stringify(match[field]))) fail('complete_incoming_fk_changed');
        seen.add(name);
    }
}
function ghOwnership(journal) {
    const objects = new Map(), orgs = new Set();
    for (const object of journal.objects) {
        const id = requireId(object.id), keys = ghIdentityKeys[object.table];
        if (!keys || !object.identity || typeof object.identity !== 'object' || Array.isArray(object.identity)) fail('complete_reference_gh_identity');
        const identity = Object.entries(object.identity);
        if (!identity.length || identity.some(([key, value]) => !keys.includes(key) || (value !== null && typeof value !== 'string'))) fail('complete_reference_gh_identity');
        if (object.table === 'audit_log' && !['target_type', 'target_id', 'event_type', 'operator_id'].every((key) => Object.hasOwn(object.identity, key))) fail('complete_reference_gh_identity');
        const key = `${object.table}:${id}`;
        if (objects.has(key)) fail('complete_reference_duplicate_object');
        objects.set(key, object);
        if (object.table === 'org_unit') orgs.add(id);
    }
    return { objects, orgs };
}

/**
 * Caller must already own the verified GH connection and BEGIN transaction,
 * after all owned requests have settled. Call before the first extension/base DELETE and
 * retain the existing subtree/cleanup checks. LOCK TABLE also fails closed if
 * accidentally called outside a PostgreSQL transaction block.
 * No connection, transaction lifecycle, DML, GH adoption or durable journal
 * write occurs.
 * Existing assertOwnedBase may resolve a planned base user's exact UUID in the
 * supplied in-memory base journal; the caller owns its normal durable journal.
 */
export async function assertCompleteReferences(client, baseJournal, ghJournal) {
    if (!baseJournal || !ghJournal || baseJournal.runId !== ghJournal.runId || baseJournal.backend !== ghJournal.backend || !['nest', 'rust'].includes(ghJournal.backend)
        || !['accounts', 'users', 'roles', 'orgs'].every((key) => Array.isArray(baseJournal[key])) || !Array.isArray(ghJournal.objects)) fail('complete_reference_journals');
    const ownership = ghOwnership(ghJournal);
    const { rows: catalog } = await client.query("select table_name from information_schema.tables where table_schema='poms' and table_type='BASE TABLE' order by table_name");
    if (!Array.isArray(catalog) || JSON.stringify(catalog.map((row) => row.table_name).toSorted()) !== JSON.stringify(FROZEN_POMS_TABLES)) fail('complete_reference_table_catalog_changed');
    await client.query(`lock table ${FROZEN_POMS_TABLES.map((table) => `poms.${ident(table)}`).join(',')} in share row exclusive mode`);
    const incoming = await client.query(COMPLETE_INCOMING_FOREIGN_KEYS_SQL, ['poms', COMPLETE_REFERENCE_TARGET_TABLES]);
    assertIncomingShape(incoming.rows);
    await assertOwnedBase(client, baseJournal, true);

    const ids = new Set([...ownedUserIds(baseJournal), ...ownedRoleIds(baseJournal), ...ownedOrgIds(baseJournal), ...ghJournal.objects.map((object) => object.id)].map(requireId));
    const admitted = new Set();
    const admit = (table, row) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) fail('complete_reference_row_shape');
        const id = uuidKey(row.id), object = id && ownership.objects.get(`${table}:${id}`);
        if (object) {
            // Registered GH IDs cannot fall through to a broader base predicate
            // when their recorded exact identity has changed.
            if (Object.entries(object.identity).some(([key, value]) => !Object.hasOwn(row, key) || row[key] !== value)) fail('complete_reference_gh_identity_changed');
            if (table === 'org_unit' && row.parent_id !== null && !ownership.orgs.has(uuidKey(row.parent_id))) fail('complete_reference_gh_subtree_escaped');
        } else if (!rowOwned(table, row, baseJournal)) fail('complete_reference_foreign_row');
        if (!id) fail('complete_reference_owned_id_missing');
        admitted.add(`${table}:${id}`);
        const fresh = !ids.has(id);
        ids.add(id);
        return fresh;
    };
    // Anonymous security events can be owned solely by the exact existing
    // request identity, with no initial user/role/org ID in their row. Discover
    // their actual UUIDs before closing over references to deleted base rows.
    const identity = fixtureRequestIdentity(baseJournal.runId);
    const security = await client.query('select to_jsonb(t) as row from poms.security_event t where request_id=$1 or user_agent=$2 for update', [identity.requestId, identity.userAgent]);
    for (const { row } of security.rows) admit('security_event', row);

    let pending = [...ids], passes = 0, scans = 0;
    while (pending.length) {
        passes++;
        const needles = pending.map((id) => `%${id}%`), discovered = new Set();
        for (const table of FROZEN_POMS_TABLES) {
            const { rows } = await client.query(`select to_jsonb(t) as row from poms.${ident(table)} t where lower(replace(to_jsonb(t)::text,'-','')) like any($1::text[]) for update`, [needles]);
            scans++;
            for (const { row } of rows) if (admit(table, row)) discovered.add(requireId(row.id));
        }
        pending = [...discovered];
    }
    return { tablesLocked: FROZEN_POMS_TABLES.length, logicalScanPasses: passes, tableScans: scans, rowsAdmitted: admitted.size, ownedUuidCount: ids.size, incomingForeignKeys: incoming.rows.length, unknownForeignKeys: 0, foreignRows: 0, deletesIssued: 0 };
}
