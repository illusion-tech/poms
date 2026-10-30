// L ownership is evidence, never a DTO id or a matching query result.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { authority } from './catalog-complete.mjs';
import { marker, databaseFor } from './fixture-guard.mjs';
import { commissionIdentities } from './fixture-commission-policy.mjs';
import { profileFromEnvironment, assertProfileCertificateEnvelope } from './l-todo-profile-candidate.mjs';
export const fixtureProfile = profileFromEnvironment(process.env);

export const canonical = (value) => Object.prototype.toString.call(value) === '[object Date]' ? value.toISOString() : Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
export const digest = (value) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export const uuidKey = (value) => typeof value === 'string' && /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(value) ? value.replaceAll('-', '').toLowerCase() : null;
export function uuid(value) {
    const key = uuidKey(value);
    assert(key, 'Invalid UUID');
    return [key.slice(0, 8), key.slice(8, 12), key.slice(12, 16), key.slice(16, 20), key.slice(20)].join('-');
}
export const SEED_ACTORS = Object.freeze(['00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000014']);

// Mutable status/current/version/assignee/name/amount fields are deliberately
// absent. PK id is always added separately. Unsupported tables stay rejected.
export const identities = Object.freeze(Object.fromEntries(Object.entries({
    platform_user: ['username'], local_credential: ['user_id'], role: ['role_key'], org_unit: ['code'],
    user_role_assignment: ['user_id', 'role_id'], user_org_membership: ['user_id', 'org_unit_id', 'membership_type'], role_permission_assignment: ['role_id', 'permission_key'],
    auth_session: ['user_id', 'token_hash'],
    audit_log: ['event_type', 'target_type', 'target_id', 'operator_id', 'request_id'],
    security_event: ['event_type', 'actor_id', 'principal', 'request_id', 'path', 'method'],
    approval_record: ['approval_type', 'business_domain', 'target_object_type', 'target_object_id', 'project_id', 'initiator_user_id'],
    todo_item: ['source_type', 'source_id', 'todo_type', 'business_domain', 'target_object_type', 'target_object_id', 'project_id'],
    contract: ['project_id', 'contract_no', 'created_by'], project: ['project_no', 'created_by'], customer: ['customer_no', 'created_by'],
    ...commissionIdentities, ...fixtureProfile.additionalIdentities
}).map(([table, fields]) => [table, Object.freeze(fields)])));
export const columns = new Map(authority.tables.map((table) => [table.name, new Map(table.columns.map((column) => [column.name, column]))]));
export const supportedTables = Object.freeze(Object.keys(identities).sort());
export const unsupportedTables = Object.freeze(authority.tables.map((table) => table.name).filter((table) => !Object.hasOwn(identities, table)).sort());
assert.equal(supportedTables.length, fixtureProfile.supportedTableCount); assert.equal(unsupportedTables.length, 107 - fixtureProfile.supportedTableCount);
for (const [table, fields] of Object.entries(identities)) {
    assert.deepEqual(authority.tables.find((entry) => entry.name === table)?.primaryKey.columns, ['id'], 'Only reviewed UUID-id tables admitted: ' + table);
    assert(fields.every((field) => columns.get(table)?.has(field)), 'Unknown immutable field: ' + table);
    assert(!fields.some((field) => /^(?:status|current_status|is_current|version|row_version|assignee_user_id|current_approver_user_id)$/.test(field)));
}
export function normalize(table, values) {
    assert(Object.hasOwn(identities, table), 'unsupported_fixture_table: ' + table);
    assert(values && typeof values === 'object' && !Array.isArray(values));
    return Object.fromEntries(Object.entries(values).map(([key, value]) => {
        const column = columns.get(table).get(key);
        assert(column, 'Unknown fixture column');
        return [key, value == null ? null : column.udt === 'uuid' ? uuid(value) : value];
    }));
}
export function rowIdentity(table, row) {
    const value = normalize(table, row);
    assert(uuidKey(value.id));
    for (const key of identities[table]) assert(Object.hasOwn(value, key), 'Missing immutable field: ' + table + '.' + key);
    return Object.fromEntries(['id', ...identities[table]].map((key) => [key, value[key]]));
}
export function insertParameters(table, values) {
    const normalized = normalize(table, values), names = Object.keys(normalized);
    return { names, params: names.map((name) => normalized[name] !== null && ['json', 'jsonb'].includes(columns.get(table).get(name).udt) ? JSON.stringify(normalized[name]) : normalized[name]) };
}
export const rowKey = (table, row) => table + ':' + uuid(row.id);
export const sameIdentity = (table, row, identity) => digest(rowIdentity(table, row)) === digest(identity);
export function caseIdentity(runId, caseId) {
    assert(uuidKey(runId));
    assert(typeof caseId === 'string' && /^[a-z][a-z0-9_.-]{0,79}$/.test(caseId));
    return { caseId, requestId: 'r2l:' + uuid(runId) + ':' + createHash('sha256').update(caseId).digest('hex').slice(0, 12), userAgent: 'poms-r2l-fixture/' + uuid(runId) };
}
export function assertCreationProof(journal, item, intent) {
    assertProfileCertificateEnvelope(item, fixtureProfile);
    assert(Object.hasOwn(identities, item.table), 'unsupported_fixture_table: ' + item.table);
    assert.equal(item.table, intent.table);
    const proof = item.proof, context = proof?.createContext;
    assert(context && context.runId === journal.runId && context.caseId === intent.caseId && Number.isInteger(context.index) && context.index >= 0, 'Create context mismatch');
    assert.equal(context.op?.startsWith('l.'), true);
    assert.equal(item.intentId, intent.id);
    assert.equal(intent.beforeObserved, true);
    assert(!intent.beforeIds.includes(uuid(item.id)), 'Generated row was present before create');
    const authority = journal.authorities.find((entry) => entry.id === item.authorityId);
    assert(authority && authority.kind === proof.kind, 'Unregistered creation authority');
    assertProfileCertificateEnvelope(authority, fixtureProfile);
    assert.equal(authority.database, databaseFor(journal.backend));
    assert.equal(authority.marker, marker);
    if (proof.kind === 'mikro-orm-afterCreate-outer-commit') {
        assert.equal(proof.sdkVersion, '7.0.11');
        assert(authority.trace.complete && authority.trace.diagnostics.length === 0 && authority.trace.openTransactions.length === 0 && authority.trace.pendingStartCount === 0);
        assert(authority.trace.committed.some((entry) => entry.table === item.table && uuid(entry.id) === uuid(item.id) && digest(entry.proof) === digest(proof)), 'Proof is absent from saved actual Native trace');
        const event = (seq, name) => authority.trace.events.find((entry) => entry.seq === seq && entry.event === name);
        assert(event(proof.createEventSeq, 'afterCreate')?.table === item.table);
        assert(event(proof.outerBeforeCommitEventSeq, 'beforeTransactionCommit')?.transaction === proof.outerTransaction);
        assert(event(proof.outerCommitEventSeq, 'afterTransactionCommit')?.transaction === proof.outerTransaction);
        assert(authority.trace.events.some((entry) => entry.event === 'afterTransactionStart' && entry.transaction === proof.outerTransaction && entry.parent === null && entry.savepointName === null), 'Not an outer transaction commit');
        assert(proof.createEventSeq < proof.outerBeforeCommitEventSeq && proof.outerBeforeCommitEventSeq < proof.outerCommitEventSeq);
        assert.equal(proof.commitContext?.runId, journal.runId);
        assert.equal(proof.commitContext?.caseId, intent.caseId);
        let currentTransaction = proof.createTransaction;
        for (const release of proof.releases) {
            assert.equal(release.transaction, currentTransaction);
            assert(event(release.beforeEventSeq, 'beforeTransactionCommit')?.transaction === release.transaction);
            assert(event(release.afterEventSeq, 'afterTransactionCommit')?.transaction === release.transaction);
            const started = authority.trace.events.find((entry) => entry.event === 'afterTransactionStart' && entry.transaction === release.transaction && entry.parent !== null && entry.savepointName === release.savepointName);
            assert(started); currentTransaction = started.parent;
        }
        assert.equal(currentTransaction, proof.outerTransaction, 'Create was not released into this outer transaction');
        assert(journal.backend === 'nest' || context.op === 'l.producer', 'Native SDK proof in Rust DB is only an original producer');
    } else if (proof.kind === 'pg-after-insert-observed-outer-commit') {
        assert.equal(proof.database, authority.database);
        assert.equal(proof.marker, marker);
        assert.equal(proof.sourceAuthority, authority.sourceAuthority);
        for (const key of ['topXid8', 'eventXid8', 'eventXmin', 'observedFullXid8']) assert(/^[0-9]+$/.test(String(proof[key])), 'Actual PG transaction/xmin/epoch evidence required');
        assert.equal(String(BigInt(proof.eventXid8) % 4294967296n), String(proof.eventXmin));
        assert(BigInt(proof.topXid8) <= BigInt(proof.eventXid8) && BigInt(proof.eventXid8) < BigInt(proof.observedFullXid8));
        assert(BigInt(proof.observedFullXid8) - BigInt(proof.eventXid8) < 2147483648n, 'Ambiguous row-xmin epoch');
        assert.equal(proof.outerCommitObserved, true);
        assert.equal(proof.observerId, authority.observerId);
        assert.equal(proof.functionOid, authority.functionOid);
        assert.equal(proof.outerStatus, 'committed');
        assert.equal(proof.eventXminStatus, 'committed');
        assert.equal(proof.topXidStatus, 'committed');
        assert.equal(proof.visibleFromIndependentOwnerConnection, true);
        assert(proof.eventId !== null && proof.eventId !== undefined);
    } else assert.fail('Actual Native SDK or PG INSERT/outer-COMMIT evidence required');
    return proof;
}
