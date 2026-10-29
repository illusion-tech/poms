import { createRequire } from 'node:module';
import { fail } from './fixture-guard.mjs';
const require = createRequire(import.meta.url);
const { userFixtureSpec } = require('./fixture-protocol.cjs');

export const ownedUserIds = (j) => [...j.accounts.map((a) => a.userId), ...j.users.map((u) => u.userId).filter(Boolean)];
export const ownedRoleIds = (j) => j.roles.map((r) => r.id);
export const ownedOrgIds = (j) => j.orgs.map((o) => o.id);
export function userFor(j, slot) {
    const a = j.accounts.find((a) => a.account === slot);
    return a ? { slot: slot, username: a.username, userId: a.userId } : j.users.find((u) => u.slot === slot);
}
export async function adoptUsers(client, j, allowMissing = false) {
    let changed = 0;
    for (const user of j.users) {
        const { rows } = await client.query('select id::text,username from poms.platform_user where username=$1 or id=$2::uuid for update', [user.username, user.userId]);
        if (rows.length === 0) {
            if (user.userId !== null && !allowMissing) fail('fixture_user_missing');
            continue;
        }
        if (rows.length !== 1 || rows[0].username !== user.username || (user.userId !== null && rows[0].id !== user.userId)) fail('fixture_user_ownership');
        if (user.userId === null) {
            user.userId = rows[0].id;
            changed++;
        }
    }
    return changed;
}
export async function userFixture(client, request, j, store) {
    let u = userFor(j, request.userSlot);
    if (request.action === 'user-plan') {
        if (!u) {
            const spec = userFixtureSpec(j.runId, request.userSlot);
            const found = await client.query('select 1 from poms.platform_user where username=$1', [spec.username]);
            if (found.rowCount) fail('unowned_username');
            u = { slot: spec.slot, username: spec.username, userId: null };
            j.users.push(u);
            await store.write(j);
        }
        return { matched: u.userId ? 1 : 0, changed: 0, state: 'planned', user: u };
    }
    if (!u) fail('user_not_planned');
    if (request.action === 'user-adopt') {
        const changed = await adoptUsers(client, j);
        return { matched: u.userId ? 1 : 0, changed, state: 'adopted', user: u };
    }
    if (!u.userId) fail('user_not_created');
    const owner = await client.query('select id::text,username from poms.platform_user where id=$1 for update', [u.userId]);
    if (owner.rowCount !== 1 || owner.rows[0].username !== u.username) fail('fixture_user_ownership');
    let result;
    if (['user-set-active', 'user-set-inactive'].includes(request.action))
        result = await client.query('update poms.platform_user set is_active=$2,row_version=row_version+1,updated_at=clock_timestamp() where id=$1', [u.userId, request.action === 'user-set-active']);
    else if (request.action === 'user-bump-version') result = await client.query('update poms.platform_user set row_version=row_version+1 where id=$1', [u.userId]);
    else if (request.action === 'user-created-at') {
        const suffix = { 'micro-low': '123100', 'micro-high': '123900', 'tie-first': '123500', 'tie-second': '123500' }[request.timeCase];
        if (!suffix) fail('invalid_time_case');
        result = await client.query('update poms.platform_user set created_at=$2::timestamptz where id=$1', [u.userId, `2020-01-02T00:00:00.${suffix}Z`]);
    } else if (request.action === 'user-membership-without-active-primary') {
        const changed = await client.query("update poms.user_org_membership set status='revoked' where user_id=$1 and status='active' and membership_type='primary'", [u.userId]);
        return { matched: 1, changed: changed.rowCount, state: request.action, user: u };
    } else if (request.action === 'user-nullable-null-no-version') result = await client.query('update poms.platform_user set email=null,phone=null,avatar_url=null,last_login_at=null,primary_org_unit_id=null where id=$1', [u.userId]);
    else if (request.action === 'user-nullable-values-no-version')
        result = await client.query("update poms.platform_user set email='witness@example.test',phone='12345',avatar_url='https://example.test/avatar.png',last_login_at='2020-02-03T04:05:06.123Z',primary_org_unit_id=$2 where id=$1", [
            u.userId,
            j.orgs.find((o) => o.slot === 'alpha').id
        ]);
    else if (request.action === 'user-profile-null')
        result = await client.query('update poms.platform_user set email=null,phone=null,avatar_url=null,last_login_at=null,primary_org_unit_id=null,row_version=row_version+1,updated_at=clock_timestamp() where id=$1', [u.userId]);
    else if (request.action === 'user-profile-values')
        result = await client.query(
            "update poms.platform_user set email='witness@example.test',phone='12345',avatar_url='https://example.test/avatar.png',last_login_at='2020-02-03T04:05:06.123Z',primary_org_unit_id=$2,row_version=row_version+1,updated_at=clock_timestamp() where id=$1",
            [u.userId, j.orgs.find((o) => o.slot === 'alpha').id]
        );
    else if (request.action === 'user-profile-verified') result = await client.query('update poms.platform_user set email_verified=true,phone_verified=true,row_version=row_version+1,updated_at=clock_timestamp() where id=$1', [u.userId]);
    else if (request.action === 'user-profile-unverified') result = await client.query('update poms.platform_user set email_verified=false,phone_verified=false where id=$1', [u.userId]);
    else if (request.action === 'user-null-last-login') result = await client.query('update poms.platform_user set last_login_at=null,row_version=row_version+1,updated_at=clock_timestamp() where id=$1', [u.userId]);
    else if (request.action === 'user-role-matrix') {
        await client.query('delete from poms.user_role_assignment where user_id=$1', [u.userId]);
        for (const [i, r] of j.roles.entries()) await client.query('insert into poms.user_role_assignment(user_id,role_id,status) values($1,$2,$3)', [u.userId, r.id, i === 0 ? 'revoked' : 'active']);
        return { matched: 1, changed: 4, state: request.action, user: u };
    } else if (request.action === 'user-membership-matrix') {
        await client.query('delete from poms.user_org_membership where user_id=$1', [u.userId]);
        for (const [i, o] of j.orgs.entries())
            await client.query("insert into poms.user_org_membership(user_id,org_unit_id,membership_type,status,revoked_at) values($1,$2,$3,$4,'2020-01-01T00:00:00Z')", [
                u.userId,
                o.id,
                ['secondary', 'primary', 'unexpected', 'secondary'][i],
                i === 0 ? 'revoked' : 'active'
            ]);
        return { matched: 1, changed: 4, state: request.action, user: u };
    } else fail('invalid_user_action');
    if (result.rowCount !== 1) fail('fixture_target_not_found');
    return { matched: 1, changed: 1, state: request.action, user: u };
}
