import { createRequire } from 'node:module';
import { fail } from './fixture-guard.mjs';
import { assertIncoming, assertOwnedBase } from './fixture-cleanup.mjs';
const require = createRequire(import.meta.url);
const { fixtureCredentials } = require('./fixture-protocol.cjs');
const bcrypt = require('bcryptjs');
export function fixturePermissions(account, permissions, profile = 'default') {
    const single = { 'lead-write': 'lead:write', 'lead-assign': 'lead:assign', 'project-write': 'project:write', 'users-manage': 'platform:users:manage', 'orgs-manage': 'platform:org-units:manage' };
    if (profile === 'none') return [];
    if (Object.hasOwn(single, profile)) return [single[profile]];
    if (profile !== 'default') fail('invalid_permission_profile');
    return account === 'admin' ? [...permissions] : ['nav:dashboard:view'];
}
async function setPermissions(client, roleId, permissions) {
    const removed = await client.query('delete from poms.role_permission_assignment where role_id=$1', [roleId]);
    for (const p of permissions) await client.query('insert into poms.role_permission_assignment(role_id,permission_key) values($1,$2)', [roleId, p]);
    return removed.rowCount + permissions.length;
}
export async function prepare(client, request, j, permissions) {
    await assertIncoming(client);
    const present = await assertOwnedBase(client, j, true);
    if (present === 10) return { matched: 2, changed: 0, state: 'prepared', fixture: j };
    if (present !== 0) fail('partial_fixture');
    for (const [i, r] of j.roles.entries()) {
        await client.query("insert into poms.role(id,role_key,name,is_active,display_order,created_at,updated_at) values($1,$2,$3,$4,$5,'2020-01-01T00:00:00Z'::timestamptz+($5::int*interval '1 second'),'2020-01-01T00:00:00Z')", [
            r.id,
            r.key,
            `R2L1 role ${r.slot} ${request.runId.slice(0, 8)}`,
            r.slot !== 'inactive',
            i
        ]);
        await setPermissions(client, r.id, r.slot === 'admin' ? permissions : r.slot === 'viewer' ? ['nav:dashboard:view'] : ['lead:read']);
    }
    for (const [i, o] of j.orgs.entries())
        await client.query("insert into poms.org_unit(id,name,code,is_active,display_order,created_at,updated_at) values($1,$2,$3,$4,$5,'2020-01-01T00:00:00Z'::timestamptz+($5::int*interval '1 second'),'2020-01-01T00:00:00Z')", [
            o.id,
            `R2L1 org ${o.slot} ${request.runId.slice(0, 8)}`,
            o.key,
            o.slot !== 'inactive',
            i
        ]);
    for (const [i, a] of j.accounts.entries()) {
        await client.query(
            "insert into poms.platform_user(id,username,display_name,is_active,primary_org_unit_id,created_at,updated_at) values($1,$2,$3,true,$4,'2020-01-01T00:00:00Z'::timestamptz+($5::int*interval '1 second'),'2020-01-01T00:00:00Z')",
            [a.userId, a.username, `R2L1 ${a.account} ${request.runId.slice(0, 8)}`, a.orgId, i]
        );
        const hash = await bcrypt.hash(fixtureCredentials(request.runId, a.account).password, 4);
        await client.query('insert into poms.local_credential(user_id,password_hash) values($1,$2)', [a.userId, hash]);
        await client.query('insert into poms.user_role_assignment(user_id,role_id) values($1,$2)', [a.userId, a.roleId]);
        await client.query("insert into poms.user_org_membership(user_id,org_unit_id,membership_type) values($1,$2,'primary')", [a.userId, a.orgId]);
    }
    return { matched: 2, changed: 10, state: 'prepared', fixture: j };
}
export async function mutate(client, request, j, permissions) {
    const a = j.accounts.find((a) => a.account === request.account);
    if (!a) fail('invalid_account');
    // Target-only locks avoid waiting on unrelated business rows held by a
    // controlled witness. Ownership is always checked before this mutation.
    const { rows } = await client.query('select id::text,username from poms.platform_user where id=$1', [a.userId]);
    if (rows.length !== 1 || rows[0].username !== a.username) fail('fixture_ownership');
    let result;
    if (request.action === 'session-bump-version') result = await client.query("update poms.auth_session set row_version=row_version+1 where user_id=$1 and token_hash=$2 and status='active'", [a.userId, request.sessionHash]);
    else if (['session-due', 'session-non-due'].includes(request.action))
        result = await client.query(
            "update poms.auth_session set last_seen_at=date_trunc('milliseconds',clock_timestamp())-make_interval(secs=>$3::int),updated_at=date_trunc('milliseconds',clock_timestamp()),row_version=row_version+1 where user_id=$1 and token_hash=$2 and status='active'",
            [a.userId, request.sessionHash, request.action === 'session-due' ? 61 : 0]
        );
    else if (request.action === 'expire-idle')
        result = await client.query("update poms.auth_session set idle_expires_at=clock_timestamp()-interval '1 second',row_version=row_version+1,updated_at=clock_timestamp() where user_id=$1 and token_hash=$2 and status='active'", [
            a.userId,
            request.sessionHash
        ]);
    else if (request.action === 'expire-absolute')
        result = await client.query("update poms.auth_session set absolute_expires_at=clock_timestamp()-interval '1 second',row_version=row_version+1,updated_at=clock_timestamp() where user_id=$1 and token_hash=$2 and status='active'", [
            a.userId,
            request.sessionHash
        ]);
    else if (request.action === 'revoke')
        result = await client.query(
            "update poms.auth_session set status='revoked',revoked_reason='admin-revoked',revoked_at=clock_timestamp(),row_version=row_version+1,updated_at=clock_timestamp() where user_id=$1 and token_hash=$2 and status='active'",
            [a.userId, request.sessionHash]
        );
    else if (request.action === 'disable') result = await client.query('update poms.platform_user set is_active=false,row_version=row_version+1,updated_at=clock_timestamp() where id=$1', [a.userId]);
    else if (request.action.startsWith('permissions-')) {
        const changed = await setPermissions(client, a.roleId, fixturePermissions(a.account, permissions, request.action.slice('permissions-'.length)));
        return { matched: 1, changed, state: request.action };
    } else if (request.action === 'restore') {
        result = await client.query('update poms.platform_user set is_active=true,row_version=row_version+1,updated_at=clock_timestamp() where id=$1', [a.userId]);
        await setPermissions(client, a.roleId, fixturePermissions(a.account, permissions));
        await client.query('delete from poms.user_role_assignment where user_id=$1', [a.userId]);
        await client.query('insert into poms.user_role_assignment(user_id,role_id) values($1,$2)', [a.userId, a.roleId]);
    } else fail('invalid_action');
    if (result.rowCount !== 1) fail('fixture_target_not_found');
    return { matched: 1, changed: 1, state: request.action };
}
