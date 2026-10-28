import { createRequire } from 'node:module';
import { fail } from './fixture-guard.mjs';
import { ownedUserIds, ownedRoleIds, ownedOrgIds, adoptUsers } from './fixture-users.mjs';
import { readUserIncomingForeignKeys, assertUserIncomingForeignKeys } from '../rust-r2d/catalog-users.mjs';
import { readOrgUnitIncomingForeignKeys, assertOrgUnitIncomingForeignKeys } from '../rust-r2c/catalog-org-units.mjs';
const require = createRequire(import.meta.url);
const { fixtureRequestIdentity } = require('./fixture-protocol.cjs');
const ident = (value) => {
    if (!/^[a-z_][a-z0-9_]*$/.test(value)) fail('catalog_identifier');
    return `"${value}"`;
};
const expectedRoleEdges = [
    ['role_permission_assignment', 'role_permission_assignment_role_id_foreign', 'role_id'],
    ['user_role_assignment', 'user_role_assignment_role_id_foreign', 'role_id']
];
export function assertRoleIncomingForeignKeys(rows) {
    if (!Array.isArray(rows) || rows.length !== expectedRoleEdges.length) fail('role_incoming_fk_changed');
    for (const [table, conname, column] of expectedRoleEdges) {
        const found = rows.filter((r) => r.schema === 'poms' && r.table === table && r.conname === conname);
        if (found.length !== 1) fail('role_incoming_fk_changed');
        const r = found[0];
        if (
            r.up !== 'c' ||
            r.del !== 'c' ||
            JSON.stringify(r.columns) !== JSON.stringify([column]) ||
            r.target_schema !== 'poms' ||
            r.target_table !== 'role' ||
            JSON.stringify(r.target_columns) !== '["id"]' ||
            r.match_type !== 's' ||
            r.convalidated !== true ||
            r.condeferrable !== false ||
            r.condeferred !== false
        )
            fail('role_incoming_fk_changed');
    }
}
export const AUDIT_EVENTS = Object.freeze({
    PlatformUser: Object.freeze(['platform.user.created', 'platform.user.updated', 'platform.user.self-updated', 'platform.user.activated', 'platform.user.deactivated', 'platform.user.roles.replaced', 'platform.user.org-memberships.replaced'])
});
const auditTargetIds = (ids) => [...new Set(ids.flatMap((id) => [id, id.toUpperCase(), id.replaceAll('-', ''), id.replaceAll('-', '').toUpperCase()]))];
// Shared predicate keeps admitted audit rows, counts and deletes identical.
// Fixed/shared targets are intentionally absent from this slice's fixture.
export function ownedAuditPredicate(j, first = 1) {
    const p = (n) => `$${first + n}`;
    return {
        sql: `operator_id=any(${p(0)}::uuid[]) and target_type='PlatformUser' and target_id=any(${p(1)}::text[]) and event_type=any(${p(2)}::text[]) and result='success' and (event_type<>'platform.user.self-updated' or lower(replace(target_id,'-',''))=replace(operator_id::text,'-',''))`,
        args: [ownedUserIds(j), auditTargetIds(ownedUserIds(j)), AUDIT_EVENTS.PlatformUser]
    };
}
export async function assertIncoming(client) {
    assertUserIncomingForeignKeys(await readUserIncomingForeignKeys(client));
    assertOrgUnitIncomingForeignKeys(await readOrgUnitIncomingForeignKeys(client));
    const { rows } = await client.query(
        "select sn.nspname as schema,st.relname as table,c.conname,c.confupdtype::text as up,c.confdeltype::text as del,array(select a.attname::text from unnest(c.conkey) with ordinality k(attnum,position) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum order by k.position) as columns,tn.nspname as target_schema,tt.relname as target_table,array(select a.attname::text from unnest(c.confkey) with ordinality k(attnum,position) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.attnum order by k.position) as target_columns,c.confmatchtype::text as match_type,c.convalidated,c.condeferrable,c.condeferred from pg_constraint c join pg_class st on st.oid=c.conrelid join pg_namespace sn on sn.oid=st.relnamespace join pg_class tt on tt.oid=c.confrelid join pg_namespace tn on tn.oid=tt.relnamespace where c.contype='f' and tn.nspname='poms' and tt.relname='role'"
    );
    assertRoleIncomingForeignKeys(rows);
}
export function rowOwned(table, row, j) {
    const users = ownedUserIds(j),
        roles = ownedRoleIds(j),
        orgs = ownedOrgIds(j),
        identity = fixtureRequestIdentity(j.runId);
    switch (table) {
        case 'platform_user':
            return users.includes(row.id);
        case 'role':
            return roles.includes(row.id);
        case 'org_unit':
            return orgs.includes(row.id) && (row.parent_id === null || orgs.includes(row.parent_id));
        case 'local_credential':
        case 'auth_session':
            return users.includes(row.user_id);
        case 'user_role_assignment':
            return users.includes(row.user_id) && roles.includes(row.role_id);
        case 'user_org_membership':
            return users.includes(row.user_id) && orgs.includes(row.org_unit_id);
        case 'role_permission_assignment':
            return roles.includes(row.role_id);
        case 'audit_log':
            return (
                users.includes(row.operator_id) &&
                row.target_type === 'PlatformUser' &&
                auditTargetIds(users).includes(row.target_id) &&
                AUDIT_EVENTS.PlatformUser.includes(row.event_type) &&
                row.result === 'success' &&
                (row.event_type !== 'platform.user.self-updated' || row.target_id.replaceAll('-', '').toLowerCase() === row.operator_id.replaceAll('-', ''))
            );
        case 'security_event':
            return users.includes(row.actor_id) || row.request_id === identity.requestId || row.user_agent === identity.userAgent;
        default:
            return false;
    }
}
export async function assertOwnedBase(client, j, allowMissing = false) {
    let count = 0;
    for (const [table, id, key, value] of [...j.accounts.map((a) => ['platform_user', a.userId, 'username', a.username]), ...j.roles.map((r) => ['role', r.id, 'role_key', r.key]), ...j.orgs.map((o) => ['org_unit', o.id, 'code', o.key])]) {
        const { rows } = await client.query(`select id::text,${ident(key)} as key from poms.${ident(table)} where id=$1 or ${ident(key)}=$2 for update`, [id, value]);
        if (!rows.length && allowMissing) continue;
        if (rows.length !== 1 || rows[0].id !== id || rows[0].key !== value) fail('fixture_ownership');
        count++;
    }
    await adoptUsers(client, j, allowMissing);
    return count;
}
export async function scanExternalReferences(client, j) {
    const { rows: tables } = await client.query("select table_name from information_schema.tables where table_schema='poms' and table_type='BASE TABLE' order by table_name");
    if (tables.length !== 107) fail('unexpected_table_catalog');
    // Fixture teardown, after owned servers stop: table locks close races for
    // logical UUID/text/JSON edges that intentionally have no product FK.
    await client.query(`lock table ${tables.map((t) => `poms.${ident(t.table_name)}`).join(',')} in share row exclusive mode`);
    await assertIncoming(client);
    await assertOwnedBase(client, j, true);
    const ids = [...ownedUserIds(j), ...ownedRoleIds(j), ...ownedOrgIds(j)];
    const needles = ids.map((id) => `%${id}%`);
    let scanned = 0,
        matched = 0;
    for (const { table_name: table } of tables) {
        const { rows } = await client.query(`select to_jsonb(t) as row from poms.${ident(table)} t where lower(to_jsonb(t)::text) like any($1::text[]) for update`, [needles]);
        scanned++;
        for (const { row } of rows) {
            matched++;
            if (!rowOwned(table, row, j)) fail('foreign_fixture_reference');
        }
    }
    return { tablesScanned: scanned, rowsAdmitted: matched, foreignRows: 0, unknownForeignKeys: 0 };
}
export async function ownedCounts(client, j) {
    const u = ownedUserIds(j),
        r = ownedRoleIds(j),
        o = ownedOrgIds(j),
        identity = fixtureRequestIdentity(j.runId),
        audit = ownedAuditPredicate(j, 6);
    const {
        rows: [row]
    } = await client.query(
        `select
 (select count(*)::int from poms.platform_user where id=any($1::uuid[])) as users,
 (select count(*)::int from poms.local_credential where user_id=any($1::uuid[])) as credentials,
 (select count(*)::int from poms.auth_session where user_id=any($1::uuid[])) as sessions,
 (select count(*)::int from poms.role where id=any($2::uuid[])) as roles,
 (select count(*)::int from poms.org_unit where id=any($3::uuid[])) as organizations,
 (select count(*)::int from poms.user_role_assignment where user_id=any($1::uuid[]) or role_id=any($2::uuid[])) as assignments,
 (select count(*)::int from poms.user_org_membership where user_id=any($1::uuid[]) or org_unit_id=any($3::uuid[])) as memberships,
 (select count(*)::int from poms.role_permission_assignment where role_id=any($2::uuid[])) as permissions,
 (select count(*)::int from poms.audit_log where ${audit.sql}) as audits,
 (select count(*)::int from poms.security_event where actor_id=any($1::uuid[]) or request_id=$4 or user_agent=$5) as events`,
        [u, r, o, identity.requestId, identity.userAgent, ...audit.args]
    );
    return row;
}
export async function cleanup(client, request, j) {
    await adoptUsers(client, j, true);
    const guard = await scanExternalReferences(client, j);
    const before = await ownedCounts(client, j),
        u = ownedUserIds(j),
        r = ownedRoleIds(j),
        o = ownedOrgIds(j),
        identity = fixtureRequestIdentity(j.runId);
    await client.query('delete from poms.security_event where actor_id=any($1::uuid[]) or request_id=$2 or user_agent=$3', [u, identity.requestId, identity.userAgent]);
    const audit = ownedAuditPredicate(j);
    await client.query(`delete from poms.audit_log where ${audit.sql}`, audit.args);
    for (const table of ['auth_session', 'local_credential', 'user_role_assignment', 'user_org_membership']) await client.query(`delete from poms.${ident(table)} where user_id=any($1::uuid[])`, [u]);
    await client.query('delete from poms.role_permission_assignment where role_id=any($1::uuid[])', [r]);
    await client.query('delete from poms.platform_user where id=any($1::uuid[])', [u]);
    await client.query('delete from poms.role where id=any($1::uuid[])', [r]);
    await client.query('delete from poms.org_unit where id=any($1::uuid[])', [o]);
    const after = await ownedCounts(client, j);
    if (Object.values(after).some((n) => n !== 0)) fail('cleanup_residual');
    return { matched: before.users, changed: Object.values(before).reduce((a, b) => a + b, 0), state: 'cleaned', cleanup: { before, after, guard } };
}
