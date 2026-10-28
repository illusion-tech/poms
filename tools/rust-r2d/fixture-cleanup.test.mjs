import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRoleIncomingForeignKeys, rowOwned, ownedAuditPredicate, AUDIT_EVENTS } from './fixture-cleanup.mjs';
import { facts } from './fixture-snapshot.mjs';

const runId = '00000000-0000-4000-8000-000000000001';
const actor = '00000000-0000-4000-8000-000000000002';
const user = '00000000-0000-4000-8000-000000000003';
const role = '00000000-0000-4000-8000-000000000004';
const org = '00000000-0000-4000-8000-000000000005';
const foreign = '00000000-0000-4000-8000-000000000006';
const j = { runId, accounts: [{ userId: actor }], users: [{ userId: user }], roles: [{ id: role }], orgs: [{ id: org }] };
const edges = () =>
    ['role_permission_assignment', 'user_role_assignment'].map((table) => ({
        schema: 'poms',
        table,
        conname: `${table}_role_id_foreign`,
        columns: ['role_id'],
        up: 'c',
        del: 'c',
        target_schema: 'poms',
        target_table: 'role',
        target_columns: ['id'],
        match_type: 's',
        convalidated: true,
        condeferrable: false,
        condeferred: false
    }));

test('role FK guard accepts only both exact nondeferrable validated id edges', () => {
    assert.doesNotThrow(() => assertRoleIncomingForeignKeys(edges()));
    for (const [field, value] of Object.entries({
        schema: 'foreign',
        table: 'foreign',
        conname: 'foreign',
        columns: ['foreign'],
        up: 'a',
        del: 'n',
        target_schema: 'foreign',
        target_table: 'foreign',
        target_columns: ['role_key'],
        match_type: 'f',
        convalidated: false,
        condeferrable: true,
        condeferred: true
    })) {
        for (const i of [0, 1]) {
            const rows = edges();
            rows[i][field] = value;
            assert.throws(() => assertRoleIncomingForeignKeys(rows), /role_incoming_fk_changed/, field);
        }
    }
    for (const rows of [[], edges().slice(0, 1), [edges()[0], edges()[0]], [...edges(), edges()[0]]]) assert.throws(() => assertRoleIncomingForeignKeys(rows), /role_incoming_fk_changed/);
});
test('audit ownership requires a permitted event, exact target type/id and run actor', () => {
    for (const event of AUDIT_EVENTS.PlatformUser) {
        const id = event === 'platform.user.self-updated' ? actor : user;
        for (const target of [id, id.toUpperCase(), id.replaceAll('-', ''), id.replaceAll('-', '').toUpperCase()]) {
            const row = { operator_id: actor, target_type: 'PlatformUser', target_id: target, event_type: event, result: 'success' };
            assert.equal(rowOwned('audit_log', row, j), true);
            for (const delta of [{ operator_id: foreign }, { target_id: foreign }, { target_type: 'Customer' }, { event_type: 'customer.updated' }, { result: 'failed' }]) assert.equal(rowOwned('audit_log', { ...row, ...delta }, j), false);
        }
    }
    assert.equal(rowOwned('audit_log', { operator_id: actor, target_type: 'PlatformUser', target_id: user, event_type: 'platform.user.self-updated', result: 'success' }, j), false);
    assert.equal(rowOwned('audit_log', { operator_id: actor, target_type: 'Customer', target_id: foreign, event_type: 'customer.updated' }, j), false);
    assert.equal(rowOwned('audit_log', { operator_id: actor, target_type: 'NavigationTree', target_id: 'global', event_type: 'platform.navigation.synced' }, j), false);
});
test('shared SQL predicate includes target ownership and all event allowlists', () => {
    const audit = ownedAuditPredicate(j, 6);
    assert.deepEqual(audit.args, [[actor, user], [actor, actor.replaceAll('-', ''), user, user.replaceAll('-', '')], AUDIT_EVENTS.PlatformUser]);
    assert.match(audit.sql, /operator_id=any\(\$6::uuid\[\]\)/);
    assert.match(audit.sql, /target_id=any\(\$7::text\[\]\)/);
    assert.match(audit.sql, /event_type=any\(\$8::text\[\]\)/);
});
test('facts refuses a foreign-target audit even when its actor belongs to the run', async () => {
    const client = {
        async query(sql) {
            return { rows: sql.includes('poms.audit_log') ? [{ row: { operator_id: actor, target_type: 'Customer', target_id: foreign, event_type: 'customer.updated' } }] : [] };
        }
    };
    await assert.rejects(facts(client, j), /foreign_fixture_reference/);
});
