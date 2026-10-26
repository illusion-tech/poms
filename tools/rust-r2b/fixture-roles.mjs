import { createRequire } from 'node:module';
import { fail } from './fixture-guard.mjs';

const require = createRequire(import.meta.url);
const { roleFixtureSpec } = require('./role-fixture-spec.cjs');
const textEncoded = (value) => value === null ? null : Buffer.from(value, 'utf8').toString('utf8');
export function ownedRoleIds(journal) {
    return [...journal.accounts.map((a) => a.roleId), ...journal.roles.filter((r) => r.roleId !== null).map((r) => r.roleId)];
}
export async function adoptRoles(client, journal, allowMissing = false) {
    for (const entry of journal.roles) {
        const result = await client.query('select id::text,role_key,name,description,display_order,is_active,is_system_role,created_by::text,updated_by::text from poms.role where role_key=$1 or id=$2 for update', [entry.roleKey, entry.roleId]);
        if (!result.rows.length && (allowMissing || entry.roleId === null)) continue;
        if (result.rows.length !== 1 || result.rows[0].role_key !== entry.roleKey || (entry.roleId !== null && result.rows[0].id !== entry.roleId)) fail('role_fixture_ownership');
        if (entry.roleId === null) {
            const row = result.rows[0];
            const spec = roleFixtureSpec(journal.runId, entry.slot);
            if (row.name !== textEncoded(spec.name) || row.description !== textEncoded(spec.description) || row.display_order !== spec.displayOrder || row.is_active !== true || row.is_system_role !== false || row.created_by !== null || row.updated_by !== null) fail('role_fixture_unexpected_create');
            entry.roleId = row.id;
        }
    }
}
export async function roleFixture(client, request, journal, store) {
    let entry = journal.roles.find((r) => r.slot === request.roleSlot);
    if (request.action === 'role-plan') {
        if (entry) fail('role_fixture_already_planned');
        const spec = roleFixtureSpec(request.runId, request.roleSlot);
        const found = await client.query('select id from poms.role where role_key=$1 for update', [spec.databaseKey]);
        if (found.rows.length) fail('role_fixture_preexisting');
        entry = { slot: request.roleSlot, roleKey: spec.databaseKey, roleId: null };
        journal.roles.push(entry);
        // This durable intent precedes the separately executed product HTTP call.
        await store.write(journal);
        return { matched: 0, changed: 0, state: 'role-planned', role: entry };
    }
    if (!entry) fail('role_fixture_not_planned');
    await adoptRoles(client, journal);
    if (request.action === 'role-adopt') return { matched: entry.roleId ? 1 : 0, changed: 0, state: 'role-adopted', role: entry };
    if (!entry.roleId) fail('role_fixture_missing');
    if (request.action === 'role-bind-viewer') {
        const viewer = journal.accounts.find((a) => a.account === 'viewer');
        const result = await client.query("insert into poms.user_role_assignment(user_id,role_id) values($1,$2) on conflict (user_id,role_id) where status='active' do nothing", [viewer.userId, entry.roleId]);
        return { matched: 1, changed: result.rowCount, state: 'role-bound-viewer' };
    }
    if (request.action === 'role-set-system') {
        if (entry.slot !== 'unknown-system') fail('role_fixture_wrong_slot');
        const result = await client.query('update poms.role set is_system_role=true where id=$1', [entry.roleId]);
        return { matched: 1, changed: result.rowCount, state: 'role-system' };
    }
    if (request.action === 'role-insert-historical') {
        if (entry.slot !== 'unicode') fail('role_fixture_wrong_slot');
        const keys = ['unknown:z','unknown:Z','未知:中文','unknown:a\u0301','unknown:á','\u1113\u1161','𠀀','unknown:old'];
        const found = await client.query('select count(*)::int as count from poms.role_permission_assignment where role_id=$1', [entry.roleId]);
        if (found.rows[0].count !== 0) fail('role_fixture_history_exists');
        for (const key of keys) await client.query("insert into poms.role_permission_assignment(role_id,permission_key,status) values($1,$2,$3)", [entry.roleId,key,key==='unknown:old'?'revoked':'active']);
        return { matched: 1, changed: keys.length, state: 'role-history-inserted' };
    }
    if (request.action !== 'role-snapshot') fail('invalid_action');
    const role = await client.query('select to_jsonb(r) as data from poms.role r where id=$1', [entry.roleId]);
    const permissions = await client.query('select to_jsonb(r) as data from poms.role_permission_assignment r where role_id=$1 order by assigned_at,created_at,id', [entry.roleId]);
    const users = await client.query('select to_jsonb(r) as data from poms.user_role_assignment r where role_id=$1 order by assigned_at,created_at,id', [entry.roleId]);
    return { matched: 1, changed: 0, state: 'role-snapshot', role: entry, roleSnapshot: { role: role.rows[0].data, permissions: permissions.rows.map((r)=>r.data), users: users.rows.map((r)=>r.data) } };
}
