import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { digest, SEED_ACTORS, uuid } from './fixture-core.mjs';
import { ident } from './catalog-complete.mjs';
import { canonicalDefinitions } from './fixture-commission-policy.mjs';
const require = createRequire(import.meta.url);
const { fixtureCredentials } = require('./fixture-protocol.cjs');

export function plannedBase(runId) {
    const roles = ['admin', 'viewer'].map((slot) => ({ slot, id: randomUUID(), key: 'r2l_role_' + slot + '_' + runId }));
    const orgs = ['admin', 'viewer'].map((slot) => ({ slot, id: randomUUID(), key: 'r2l_org_' + slot + '_' + runId }));
    return { roles, orgs, accounts: ['admin', 'viewer'].map((account, index) => ({ account, userId: randomUUID(), username: fixtureCredentials(runId, account).username, roleId: roles[index].id, orgId: orgs[index].id })) };
}
export function viewerPermissionPlan(permissions, requested = ['nav:dashboard:view']) {
    assert(Array.isArray(permissions) && permissions.length === 37 && new Set(permissions).size === 37);
    assert(Array.isArray(requested) && requested.every((key) => typeof key === 'string' && permissions.includes(key)), 'Viewer permission must be an exact manifest permission');
    assert.equal(new Set(requested).size, requested.length, 'Duplicate viewer permission');
    return { formatVersion: 1, manifestPermissionsSha256: digest([...permissions].sort()), viewerPermissions: [...requested].sort() };
}
export async function baseRows(runId, base, permissions, viewerPermissions = ['nav:dashboard:view']) {
    const config = viewerPermissionPlan(permissions, viewerPermissions);
    const bcrypt = require('bcryptjs');
    const rows = [];
    for (const role of base.roles) rows.push({ table: 'role', values: { id: role.id, role_key: role.key, name: role.key, is_active: true, is_system_role: false } });
    for (const org of base.orgs) rows.push({ table: 'org_unit', values: { id: org.id, code: org.key, name: org.key, is_active: true, parent_id: null } });
    for (const account of base.accounts) {
        rows.push({ table: 'platform_user', values: { id: account.userId, username: account.username, display_name: 'R2L ' + account.account, is_active: true, primary_org_unit_id: account.orgId } });
        rows.push({ table: 'local_credential', values: { id: randomUUID(), user_id: account.userId, password_hash: await bcrypt.hash(fixtureCredentials(runId, account.account).password, 4) } });
        rows.push({ table: 'user_role_assignment', values: { id: randomUUID(), user_id: account.userId, role_id: account.roleId } });
        rows.push({ table: 'user_org_membership', values: { id: randomUUID(), user_id: account.userId, org_unit_id: account.orgId, membership_type: 'primary' } });
        for (const permission of account.account === 'admin' ? permissions : config.viewerPermissions) rows.push({ table: 'role_permission_assignment', values: { id: randomUUID(), role_id: account.roleId, permission_key: permission } });
    }
    return rows;
}
export async function readSeedPrincipals(client) {
    const rows = [];
    const read = async (table, condition, args) => {
        const result = await client.query('select to_jsonb(t) as row from poms.' + ident(table) + ' t where ' + condition + ' order by id', args);
        for (const item of result.rows) rows.push({ table, row: item.row });
        return result.rows.map((item) => item.row);
    };
    const users = await read('platform_user', 'id=any($1::uuid[])', [SEED_ACTORS]);
    assert.equal(users.length, 2);
    for (const [index, username] of ['vp_owner', 'finance_mgr'].entries()) assert(users.some((row) => row.id === SEED_ACTORS[index] && row.username === username), 'Seed principal mismatch');
    const credentials = await read('local_credential', 'user_id=any($1::uuid[])', [SEED_ACTORS]); assert.equal(credentials.length, 2);
    const assignments = await read('user_role_assignment', 'user_id=any($1::uuid[])', [SEED_ACTORS]);
    const memberships = await read('user_org_membership', 'user_id=any($1::uuid[])', [SEED_ACTORS]);
    const roleIds = [...new Set(assignments.map((row) => uuid(row.role_id)))];
    await read('role', 'id=any($1::uuid[])', [roleIds]);
    await read('role_permission_assignment', 'role_id=any($1::uuid[])', [roleIds]);
    const orgIds = [...new Set([...users.map((row) => row.primary_org_unit_id), ...memberships.map((row) => row.org_unit_id)].filter(Boolean).map(uuid))];
    await read('org_unit', 'id=any($1::uuid[])', [orgIds]);
    return { rows, digest: digest(rows), readOnly: true };
}
export async function assertSeedUnchanged(client, journal) {
    if (journal.borrowed.principalSnapshot) {
        const current = await readSeedPrincipals(client);
        assert.equal(current.digest, journal.borrowed.principalSnapshot.digest, 'Readonly principal/credential/role/membership/permission definition changed');
    }
    if (journal.borrowed.definitions.length) {
        const current = await readCanonicalDefinitions(client);
        assert.equal(digest(current), digest(journal.borrowed.definitions), 'Readonly canonical definition full-row snapshot changed');
        journal.borrowed.definitionChecks ??= [];
        journal.borrowed.definitionChecks.push({ kind: 'independent-full-row-readonly-recheck', fullSnapshotSha256: digest(current), rowSha256: current.map(({ id, fullRowSha256 }) => ({ id, fullRowSha256 })) });
    }
}
export function canonicalDefinitionSnapshot(rows) {
    assert.equal(rows.length, canonicalDefinitions.length, 'All three canonical readonly definitions are required');
    return canonicalDefinitions.map((expected) => {
        const matches = rows.filter((row) => row.id === expected.id); assert.equal(matches.length, 1);
        const row = matches[0];
        for (const [key, value] of Object.entries(expected)) assert.equal(row[key], value, 'Canonical definition selector mismatch');
        assert.equal(row.status, 'active', 'Canonical readonly definition must already be active');
        return { ...expected, readOnly: true, row: structuredClone(row), fullRowSha256: digest(row) };
    });
}
export async function readCanonicalDefinitions(client) {
    const ids = canonicalDefinitions.map(({ id }) => id);
    const { rows } = await client.query('select to_jsonb(t) as row from poms.approval_summary_package_definition t where id=any($1::uuid[]) order by id', [ids]);
    return canonicalDefinitionSnapshot(rows.map(({ row }) => row));
}
