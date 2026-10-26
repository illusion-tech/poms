import { createRequire } from 'node:module';
import { fail } from './fixture-guard.mjs';
const require = createRequire(import.meta.url);
const { fixtureCredentials, fixtureRequestIdentity } = require('./fixture-protocol.cjs');
const bcrypt = require('bcryptjs');

export function fixturePermissions(account, permissions, profile = 'default') {
    if (profile === 'none') return [];
    if (profile === 'and-full') return ['nav:dashboard:view', 'platform:org-units:manage', 'platform:org-sync:manage'];
    if (profile === 'and-partial' || (profile === 'default' && account === 'viewer')) return ['nav:dashboard:view', 'platform:org-units:manage'];
    if (profile !== 'default' || account !== 'admin') fail('invalid_permission_profile');
    return [...permissions];
}
function ids(journal, key) {
    return journal.accounts.map((account) => account[key]);
}
export async function assertOwned(client, journal, allowMissing = false) {
    let present = 0;
    for (const account of journal.accounts) {
        const user = await client.query('select id::text,username from poms.platform_user where id=$1 or username=$2 for update', [account.userId, account.username]);
        const role = await client.query('select id::text,role_key from poms.role where id=$1 or role_key=$2 for update', [account.roleId, account.roleKey]);
        const org = await client.query('select id::text,code from poms.org_unit where id=$1 or code=$2 for update', [account.orgId, account.orgCode]);
        for (const [result, id, name, key] of [
            [user, account.userId, account.username, 'username'],
            [role, account.roleId, account.roleKey, 'role_key'],
            [org, account.orgId, account.orgCode, 'code']
        ]) {
            if (result.rows.length === 0 && allowMissing) continue;
            if (result.rows.length !== 1 || result.rows[0].id !== id || result.rows[0][key] !== name) fail('fixture_ownership');
            present++;
        }
    }
    const foreignRole = await client.query('select count(*)::int as count from poms.user_role_assignment where role_id=any($1::uuid[]) and not(user_id=any($2::uuid[]))', [ids(journal, 'roleId'), ids(journal, 'userId')]);
    const foreignOrg = await client.query('select count(*)::int as count from poms.user_org_membership where org_unit_id=any($1::uuid[]) and not(user_id=any($2::uuid[]))', [ids(journal, 'orgId'), ids(journal, 'userId')]);
    // Frozen migrations also contain ON DELETE SET NULL edges. Refuse them
    // rather than changing any non-run row through a cascade. FOR UPDATE above
    // prevents new FK references from racing this preflight and the deletion.
    const foreignNullable = await client.query(
        `select (
        (select count(*) from poms.platform_user where primary_org_unit_id=any($1::uuid[]) and not(id=any($2::uuid[]))) +
        (select count(*) from poms.org_unit where parent_id=any($1::uuid[]) and not(id=any($1::uuid[]))) +
        (select count(*) from poms.customer where owner_org_id=any($1::uuid[]) or owner_user_id=any($2::uuid[])) +
        (select count(*) from poms.sales_follow_up_record where owner_org_id=any($1::uuid[]) or owner_user_id=any($2::uuid[])) +
        (select count(*) from poms.external_department_mapping where org_unit_id=any($1::uuid[])) +
        (select count(*) from poms.org_sync_run where requested_by=any($2::uuid[])) +
        (select count(*) from poms.org_sync_diff_item where org_unit_id=any($1::uuid[]))
        )::int as count`,
        [ids(journal, 'orgId'), ids(journal, 'userId')]
    );
    if (foreignRole.rows[0].count !== 0 || foreignOrg.rows[0].count !== 0 || foreignNullable.rows[0].count !== 0) fail('foreign_fixture_reference');
    return present;
}
async function setPermissions(client, account, permissions) {
    const removed = await client.query('delete from poms.role_permission_assignment where role_id=$1', [account.roleId]);
    for (const key of permissions) await client.query('insert into poms.role_permission_assignment(role_id,permission_key) values($1,$2)', [account.roleId, key]);
    return removed.rowCount + permissions.length;
}
export async function prepare(client, request, journal, permissions) {
    const present = await assertOwned(client, journal, true);
    if (present === 6) return { matched: 2, changed: 0, state: 'prepared' };
    if (present !== 0) fail('partial_fixture');
    for (const account of journal.accounts) {
        const { password } = fixtureCredentials(request.runId, account.account);
        const hash = await bcrypt.hash(password, 4);
        await client.query('insert into poms.platform_user(id,username,display_name,is_active) values($1,$2,$3,true)', [account.userId, account.username, `R2A ${account.account} synthetic`]);
        await client.query('insert into poms.local_credential(user_id,password_hash) values($1,$2)', [account.userId, hash]);
        await client.query('insert into poms.role(id,role_key,name,is_active) values($1,$2,$3,true)', [account.roleId, account.roleKey, `R2A ${account.account} synthetic`]);
        await client.query('insert into poms.user_role_assignment(user_id,role_id) values($1,$2)', [account.userId, account.roleId]);
        await setPermissions(client, account, fixturePermissions(account.account, permissions));
        await client.query('insert into poms.org_unit(id,name,code,is_active) values($1,$2,$3,true)', [account.orgId, `R2A ${account.account} synthetic`, account.orgCode]);
        await client.query("insert into poms.user_org_membership(user_id,org_unit_id,membership_type) values($1,$2,'primary')", [account.userId, account.orgId]);
    }
    return { matched: 2, changed: 2, state: 'prepared' };
}
export async function mutate(client, request, journal, permissions) {
    await assertOwned(client, journal);
    const account = journal.accounts.find((value) => value.account === request.account);
    if (!account) fail('invalid_account');
    let result;
    // Each statement is a fixed fixture operation, never caller-provided SQL or
    // a substitute for the auth business writer. Hash + journal user must agree.
    if (request.action === 'session-due' || request.action === 'session-non-due') {
        result = await client.query(
            "update poms.auth_session set last_seen_at=date_trunc('milliseconds',clock_timestamp())-make_interval(secs=>$3::int),updated_at=date_trunc('milliseconds',clock_timestamp()),row_version=row_version+1 where user_id=$1 and token_hash=$2 and status='active'",
            [account.userId, request.sessionHash, request.action === 'session-due' ? 61 : 0]
        );
    } else if (request.action === 'expire-idle') {
        result = await client.query("update poms.auth_session set idle_expires_at=clock_timestamp()-interval '1 second',updated_at=clock_timestamp(),row_version=row_version+1 where user_id=$1 and token_hash=$2 and status='active'", [
            account.userId,
            request.sessionHash
        ]);
    } else if (request.action === 'expire-absolute') {
        result = await client.query("update poms.auth_session set absolute_expires_at=clock_timestamp()-interval '1 second',updated_at=clock_timestamp(),row_version=row_version+1 where user_id=$1 and token_hash=$2 and status='active'", [
            account.userId,
            request.sessionHash
        ]);
    } else if (request.action === 'revoke') {
        result = await client.query(
            "update poms.auth_session set status='revoked',revoked_reason='admin-revoked',revoked_at=clock_timestamp(),updated_at=clock_timestamp(),row_version=row_version+1 where user_id=$1 and token_hash=$2 and status='active'",
            [account.userId, request.sessionHash]
        );
    } else if (request.action === 'disable') {
        result = await client.query('update poms.platform_user set is_active=false,updated_at=clock_timestamp(),row_version=row_version+1 where id=$1', [account.userId]);
    } else if (['permissions-none', 'permissions-and-partial', 'permissions-and-full'].includes(request.action)) {
        const changed = await setPermissions(client, account, fixturePermissions(account.account, permissions, request.action.slice('permissions-'.length)));
        return { matched: 1, changed, state: request.action };
    } else if (request.action === 'restore') {
        result = await client.query('update poms.platform_user set is_active=true,updated_at=clock_timestamp(),row_version=row_version+1 where id=$1', [account.userId]);
        await setPermissions(client, account, fixturePermissions(account.account, permissions));
    } else fail('invalid_action');
    if (result.rowCount !== 1) fail('fixture_target_not_found');
    return { matched: 1, changed: 1, state: request.action === 'restore' ? 'restored' : request.action };
}
export async function ownedCounts(client, request, journal) {
    const users = ids(journal, 'userId');
    const identity = fixtureRequestIdentity(request.runId);
    const query = await client.query(
        `select
        (select count(*)::int from poms.platform_user where id=any($1::uuid[])) as users,
        (select count(*)::int from poms.auth_session where user_id=any($1::uuid[])) as sessions,
        (select count(*)::int from poms.role where id=any($2::uuid[])) as roles,
        (select count(*)::int from poms.org_unit where id=any($3::uuid[])) as organizations,
        (select count(*)::int from poms.security_event where actor_id=any($1::uuid[]) or request_id=$4 or user_agent=$5) as events,
        (select count(*)::int from poms.audit_log where operator_id=any($1::uuid[])) as audits`,
        [users, ids(journal, 'roleId'), ids(journal, 'orgId'), identity.requestId, identity.userAgent]
    );
    return query.rows[0];
}
export async function cleanup(client, request, journal) {
    await assertOwned(client, journal, true);
    const before = await ownedCounts(client, request, journal);
    const users = ids(journal, 'userId');
    const identity = fixtureRequestIdentity(request.runId);
    await client.query('delete from poms.security_event where actor_id=any($1::uuid[]) or request_id=$2 or user_agent=$3', [users, identity.requestId, identity.userAgent]);
    await client.query('delete from poms.audit_log where operator_id=any($1::uuid[])', [users]);
    await client.query('delete from poms.platform_user where id=any($1::uuid[])', [users]);
    await client.query('delete from poms.role where id=any($1::uuid[])', [ids(journal, 'roleId')]);
    await client.query('delete from poms.org_unit where id=any($1::uuid[])', [ids(journal, 'orgId')]);
    const after = await ownedCounts(client, request, journal);
    if (Object.values(after).some((count) => count !== 0)) fail('cleanup_residual');
    return { matched: before.users, changed: Object.values(before).reduce((sum, count) => sum + count, 0), state: 'cleaned' };
}
