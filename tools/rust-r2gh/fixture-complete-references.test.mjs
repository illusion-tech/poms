import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCompleteReferences, FROZEN_POMS_TABLES, COMPLETE_REFERENCE_TARGET_TABLES, EXPECTED_COMPLETE_INCOMING_FOREIGN_KEYS } from './fixture-complete-references.mjs';

const runId = '11111111-1111-4111-8111-111111111111';
const id = (n) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const normalized = (value) => value.toLowerCase().replaceAll('-', '');
const copy = (value) => structuredClone(value);

function fixture() {
    const user = id(10), role = id(11), org = id(12), provider = id(2), ghOrg = id(3), audit = id(4);
    const base = { formatVersion: 1, runId, backend: 'nest', state: 'prepared', accounts: [{ account: 'admin', userId: user, username: 'controlled-admin', roleId: role, orgId: org }], users: [], roles: [{ slot: 'admin', id: role, key: 'controlled-role' }], orgs: [{ slot: 'admin', id: org, key: 'controlled-org' }] };
    const gh = { formatVersion: 1, runId, backend: 'nest', state: 'prepared', baseUsers: [user], objects: [
        { table: 'identity_provider_config', id: provider, origin: 'prepare', identity: { tenant_id: 'controlled-tenant', client_id: 'controlled-client' } },
        { table: 'org_unit', id: ghOrg, origin: 'prepare', identity: { code: 'controlled-gh-org' } },
        { table: 'audit_log', id: audit, origin: 'exact-owned-target-audit', identity: { operator_id: null, target_type: 'IdentityProviderConfig', target_id: provider, event_type: 'identity-provider.updated' } }
    ] };
    const rows = Object.fromEntries(FROZEN_POMS_TABLES.map((table) => [table, []]));
    rows.platform_user.push({ id: user, username: 'controlled-admin', primary_org_unit_id: org });
    rows.role.push({ id: role, role_key: 'controlled-role' });
    rows.org_unit.push({ id: org, code: 'controlled-org', parent_id: null }, { id: ghOrg, code: 'controlled-gh-org', parent_id: null });
    rows.identity_provider_config.push({ id: provider, tenant_id: 'controlled-tenant', client_id: 'controlled-client', created_by: user });
    rows.local_credential.push({ id: id(21), user_id: user });
    rows.auth_session.push({ id: id(20), user_id: user, status: 'revoked' });
    rows.user_role_assignment.push({ id: id(22), user_id: user, role_id: role });
    rows.user_org_membership.push({ id: id(23), user_id: user, org_unit_id: org });
    rows.role_permission_assignment.push({ id: id(24), role_id: role, permission_key: 'nav:dashboard:view' });
    rows.audit_log.push(
        { id: audit, ...gh.objects.find((object) => object.table === 'audit_log').identity, result: 'success' },
        { id: id(25), operator_id: user, target_type: 'PlatformUser', target_id: user.toUpperCase(), event_type: 'platform.user.updated', result: 'success' }
    );
    rows.security_event.push({ id: id(26), actor_id: null, request_id: `r2gh:${runId}`, user_agent: 'synthetic-anonymous-event' });
    return { base, gh, rows, provider, user, role, org, ghOrg, audit };
}

class MemoryClient {
    constructor(data, { edges = EXPECTED_COMPLETE_INCOMING_FOREIGN_KEYS, tables = FROZEN_POMS_TABLES } = {}) {
        this.data = copy(data);
        this.edges = copy(edges);
        this.tables = [...tables];
        this.statements = [];
        this.deletes = 0;
        this.logicalScans = 0;
    }
    async query(sql, args = []) {
        this.statements.push({ sql, args: copy(args) });
        if (/^\s*delete\b/i.test(sql)) { this.deletes++; throw new Error('Unexpected DELETE in pure preflight test'); }
        assert(!/^\s*(?:insert|update|alter|create|drop|truncate|begin|commit|rollback)\b/i.test(sql), 'Preflight must not mutate data or own the transaction');
        if (sql.includes('information_schema.tables')) return { rows: this.tables.map((table_name) => ({ table_name })) };
        if (/^lock table /i.test(sql)) {
            assert.equal((sql.match(/poms\."/g) ?? []).length, 107);
            assert(sql.endsWith('in share row exclusive mode'));
            return { rows: [] };
        }
        if (sql.includes('from pg_constraint')) {
            assert(!sql.includes('cardinality'), 'Composite FKs must reach shape validation');
            assert(!/where[\s\S]*source_ns\.nspname\s*=/i.test(sql), 'Do not filter unknown source schemas');
            assert.deepEqual(args, ['poms', COMPLETE_REFERENCE_TARGET_TABLES]);
            return { rows: copy(this.edges.filter((row) => row.target_schema === args[0] && args[1].includes(row.target_table))) };
        }
        const exact = /from poms\."([a-z_]+)" where id=\$1 or "([a-z_]+)"=\$2 for update/.exec(sql);
        if (exact) return { rows: this.data[exact[1]].filter((row) => row.id === args[0] || row[exact[2]] === args[1]).map((row) => ({ id: row.id, key: row[exact[2]] })) };
        if (sql.includes('where username=$1 or id=$2::uuid for update')) return { rows: this.data.platform_user.filter((row) => row.username === args[0] || row.id === args[1]).map((row) => ({ id: row.id, username: row.username })) };
        if (sql === 'select to_jsonb(t) as row from poms.security_event t where request_id=$1 or user_agent=$2 for update') return { rows: copy(this.data.security_event.filter((row) => row.request_id === args[0] || row.user_agent === args[1])).map((row) => ({ row })) };
        const logical = /from poms\."([a-z_]+)" t where lower\(replace\(to_jsonb\(t\)::text,'-',''\)\) like any\(\$1::text\[\]\) for update/.exec(sql);
        if (logical) {
            this.logicalScans++;
            const needles = args[0].map((value) => { assert(/^%[0-9a-f]{32}%$/.test(value)); return value.slice(1, -1); });
            return { rows: copy(this.data[logical[1]].filter((row) => needles.some((needle) => normalized(JSON.stringify(row)).includes(needle)))).map((row) => ({ row })) };
        }
        throw new Error(`Unreviewed pure-test SQL shape: ${sql}`);
    }
}

async function refusedBeforeDelete(data, options, code) {
    const original = copy(data.rows), client = new MemoryClient(data.rows, options);
    await assert.rejects(async () => {
        await assertCompleteReferences(client, data.base, data.gh);
        await client.query('DELETE FROM poms.identity_provider_config WHERE false');
    }, (error) => error.code === code);
    assert.equal(client.deletes, 0);
    assert.deepEqual(client.data, original, 'Foreign rows and all owned rows remain unchanged');
    return client;
}

test('exact registered GH audit and original base rows pass, including dynamic row-ID closure', async () => {
    const data = fixture(), client = new MemoryClient(data.rows), original = copy(data.rows);
    const result = await assertCompleteReferences(client, data.base, data.gh);
    assert.equal(result.tablesLocked, 107);
    assert.equal(result.incomingForeignKeys, 28);
    assert.equal(result.unknownForeignKeys, 0);
    assert.equal(result.foreignRows, 0);
    assert.equal(result.deletesIssued, 0);
    assert(result.logicalScanPasses >= 2);
    assert(result.ownedUuidCount > data.gh.objects.length + data.base.accounts.length + data.base.roles.length + data.base.orgs.length);
    assert.equal(client.deletes, 0);
    assert.deepEqual(client.data, original);
});

test('C-G3-02 unregistered audit with NULL operator is rejected for canonical/uppercase/compact UUID references', async () => {
    const forms = [(value) => value, (value) => value.toUpperCase(), (value) => value.replaceAll('-', '').toUpperCase(), (value) => value.replaceAll('-', '').match(/.{4}/g).join('-')];
    for (const form of forms) {
        const data = fixture();
        data.rows.audit_log.push({ id: id(90), operator_id: null, target_type: 'UnregisteredGHReference', target_id: form(data.provider), event_type: 'synthetic.foreign-reference' });
        await refusedBeforeDelete(data, {}, 'complete_reference_foreign_row');
    }
});

test('an owned actor or familiar event prefix never adopts an unregistered GH audit', async () => {
    const data = fixture();
    data.rows.audit_log.push({ id: id(90), operator_id: data.user, target_type: 'IdentityProviderConfig', target_id: data.provider, event_type: 'identity-provider.updated', result: 'success' });
    await refusedBeforeDelete(data, {}, 'complete_reference_foreign_row');
});

test('a registered GH identity mismatch cannot fall through to the base audit ownership predicate', async () => {
    const data = fixture();
    Object.assign(data.rows.audit_log[0], { operator_id: data.user, target_type: 'PlatformUser', target_id: data.user, event_type: 'platform.user.updated', result: 'success' });
    await refusedBeforeDelete(data, {}, 'complete_reference_gh_identity_changed');
});

test('nested JSON references to actual session/credential/assignment/base-audit IDs are refused on a later closure pass', async () => {
    for (const table of ['auth_session', 'local_credential', 'user_role_assignment', 'user_org_membership', 'role_permission_assignment', 'audit_log']) {
        const data = fixture();
        const target = table === 'audit_log' ? data.rows.audit_log[1].id : data.rows[table][0].id;
        data.rows.attachment.push({ id: id(90), metadata: { nested: [{ foreignReference: target.replaceAll('-', '').toUpperCase() }] } });
        const client = await refusedBeforeDelete(data, {}, 'complete_reference_foreign_row');
        assert(client.logicalScans > 107, `${table} requires the discovered actual ID, not just initial user/role/org IDs`);
    }
});

test('anonymous owned security-event IDs seed external-reference checks even without an actor UUID', async () => {
    const data = fixture();
    data.rows.attachment.push({ id: id(90), note: `literal reference {${data.rows.security_event[0].id.toUpperCase()}}` });
    await refusedBeforeDelete(data, {}, 'complete_reference_foreign_row');
});

test('existing exact planned-base-user adoption supplies its real UUID before the logical scan', async () => {
    const data = fixture();
    data.base.users.push({ slot: 'u000', username: 'planned-controlled-user', userId: null });
    data.rows.platform_user.push({ id: id(30), username: 'planned-controlled-user', primary_org_unit_id: null });
    data.rows.auth_session.push({ id: id(31), user_id: id(30), status: 'active' });
    const client = new MemoryClient(data.rows);
    await assertCompleteReferences(client, data.base, data.gh);
    assert.equal(data.base.users[0].userId, id(30));
    assert.equal(client.deletes, 0);
});

test('unknown composite and foreign-schema incoming FKs fail before any DELETE', async () => {
    for (const patch of [
        { source_schema: 'foreign_control', source_table: 'external_reference', conname: 'unknown_foreign_provider', source_columns: ['provider_id'] },
        { source_schema: 'poms', source_table: 'attachment', conname: 'unknown_composite_provider', source_columns: ['provider_id', 'other_id'], target_columns: ['id', 'id'] },
        { source_schema: 'poms', source_table: 'attachment', conname: 'unknown_session_reference', source_columns: ['session_id'], target_table: 'auth_session' }
    ]) {
        const data = fixture(), extra = { ...copy(EXPECTED_COMPLETE_INCOMING_FOREIGN_KEYS[0]), target_table: 'identity_provider_config', ...patch };
        await refusedBeforeDelete(data, { edges: [...copy(EXPECTED_COMPLETE_INCOMING_FOREIGN_KEYS), extra] }, 'complete_incoming_fk_changed');
    }
});

test('changed columns, target, actions, validation, match or deferrability never pass as an existing FK', async () => {
    for (const patch of [
        { source_columns: ['user_id', 'extra_column'] }, { target_columns: ['id', 'extra_column'] }, { target_schema: 'foreign_control' }, { target_table: 'auth_session' },
        { update_action: 'n' }, { delete_action: 'n' }, { match_type: 'f' }, { convalidated: false }, { condeferrable: true }, { condeferred: true }
    ]) {
        const data = fixture(), edges = copy(EXPECTED_COMPLETE_INCOMING_FOREIGN_KEYS);
        edges[0] = { ...edges[0], ...patch };
        await refusedBeforeDelete(data, { edges }, 'complete_incoming_fk_changed');
    }
});

test('the exact 107-table set is frozen rather than accepting a same-count replacement', async () => {
    const data = fixture(), tables = [...FROZEN_POMS_TABLES];
    tables[0] = 'unregistered_poms_table';
    const client = await refusedBeforeDelete(data, { tables }, 'complete_reference_table_catalog_changed');
    assert(!client.statements.some(({ sql }) => /^lock table /i.test(sql)));
});

test('an extension organization moved outside the owned GH subtree is refused', async () => {
    const data = fixture();
    data.rows.org_unit.find((row) => row.id === data.ghOrg).parent_id = data.org;
    await refusedBeforeDelete(data, {}, 'complete_reference_gh_subtree_escaped');
});

test('a second cleanup observation with already absent owned rows still performs the complete preflight without deletion', async () => {
    const data = fixture();
    const client = new MemoryClient(Object.fromEntries(FROZEN_POMS_TABLES.map((table) => [table, []])));
    data.base.state = 'cleaned'; data.gh.state = 'cleaned';
    const result = await assertCompleteReferences(client, data.base, data.gh);
    assert.equal(result.rowsAdmitted, 0);
    assert.equal(result.tablesLocked, 107);
    assert.equal(client.deletes, 0);
});
