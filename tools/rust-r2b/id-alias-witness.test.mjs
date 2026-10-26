import assert from 'node:assert/strict';
import test from 'node:test';
import { aliasAuditSql, assertViewerBinding, idAliases, readOwnedAliasAudits } from './id-alias-witness.mjs';

const context = {
    runId: 'a0000000-0000-4000-8000-000000000001',
    actorId: 'b0000000-0000-4000-8000-000000000001',
    roleId: 'c0000000-0000-4000-8000-000000000001',
    username: 'r2b_admin_a0000000000040008000000000000001',
    roleKey: 'r2b_a0000000000040008000000000000001_main'
};
const audit = (targetId) => ({
    id: 'd0000000-0000-4000-8000-000000000001',
    eventType: 'platform.role.permissions.replaced',
    targetType: 'PlatformRole',
    targetId,
    operatorId: context.actorId,
    requestId: null,
    result: 'success',
    reason: null,
    beforeSnapshot: { permissionKeys: [] },
    afterSnapshot: { permissionKeys: ['project:read'] },
    metadata: null,
    occurredAt: new Date('2026-10-26T12:00:00.000Z')
});
function reader(rows) {
    const calls = [];
    return {
        calls,
        async query(sql, values) {
            calls.push({ sql, values });
            if (sql.includes('cross join poms.role')) return { rows: [{ actor_id: context.actorId, username: context.username, role_id: context.roleId, role_key: context.roleKey }] };
            if (sql === aliasAuditSql) return { rows };
            return { rows: [] };
        }
    };
}

test('aliases retain literal canonical, uppercase and compact path strings', () => {
    assert.deepEqual(idAliases(context.roleId), [
        { kind: 'canonical', value: context.roleId },
        { kind: 'uppercase', value: 'C0000000-0000-4000-8000-000000000001' },
        { kind: 'compact', value: 'c0000000000040008000000000000001' }
    ]);
    assert.throws(() => idAliases(context.roleId.toUpperCase()));
    assert.throws(() => idAliases('not-a-uuid'));
});

test('viewer binding checks the outcome within the original fixture envelope', () => {
    const reply = { formatVersion: 1, runId: context.runId, backend: 'nest', action: 'role-bind-viewer', matched: 1, changed: 1, state: 'role-bound-viewer' };
    assertViewerBinding(reply);
    assert.throws(() => assertViewerBinding({ ...reply, changed: 0 }));
    assert.throws(() => assertViewerBinding({ ...reply, state: 'unexpected' }));
});

test('read-only observer keeps noncanonical audit targets and all twelve columns', async () => {
    const client = reader(idAliases(context.roleId).map((alias) => audit(alias.value)));
    const rows = await readOwnedAliasAudits(client, context);
    assert.deepEqual(
        rows.map((row) => row.targetId),
        idAliases(context.roleId).map((alias) => alias.value)
    );
    assert.equal(Object.keys(rows[0]).length, 12);
    assert.equal(client.calls[0].sql, 'BEGIN READ ONLY');
    assert.equal(client.calls.at(-1).sql, 'ROLLBACK');
    assert.deepEqual(client.calls.find((call) => call.sql === aliasAuditSql).values, [context.actorId, idAliases(context.roleId).map((alias) => alias.value)]);
    assert(aliasAuditSql.includes('operator_id=$1::uuid'));
    assert(aliasAuditSql.includes('target_id=any($2::text[])'));
    assert(!/lower\(|target_id::uuid|for update/i.test(aliasAuditSql));
});

test('foreign actors and unknown target IDs reject and still roll back', async () => {
    for (const value of [{ ...audit(context.roleId), operatorId: 'e0000000-0000-4000-8000-000000000001' }, audit('e0000000-0000-4000-8000-000000000001')]) {
        const client = reader([value]);
        await assert.rejects(readOwnedAliasAudits(client, context));
        assert.equal(client.calls.at(-1).sql, 'ROLLBACK');
    }
});

test('unowned main-role contexts reject before database I/O', async () => {
    for (const changed of [{ roleKey: 'platform-admin' }, { username: 'admin' }, { roleId: 'not-a-uuid' }]) {
        const client = reader([]);
        await assert.rejects(readOwnedAliasAudits(client, { ...context, ...changed }));
        assert.equal(client.calls.length, 0);
    }
});
