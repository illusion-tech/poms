import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fail } from './fixture-guard.mjs';
import { ownedUserIds, ownedRoleIds, ownedOrgIds, userFor } from './fixture-users.mjs';
import { rowOwned } from './fixture-cleanup.mjs';
const require = createRequire(import.meta.url);
const { fixtureRequestIdentity } = require('./fixture-protocol.cjs');
const digest = (v) => (v === null ? null : createHash('sha256').update(v).digest('hex'));
function redact(table, row) {
    const copy = { ...row };
    if (table === 'local_credential') {
        copy.passwordFingerprint = digest(copy.password_hash);
        delete copy.password_hash;
    }
    if (table === 'auth_session') {
        copy.tokenFingerprint = digest(copy.token_hash);
        copy.csrfFingerprint = digest(copy.csrf_token_hash);
        delete copy.token_hash;
        delete copy.csrf_token_hash;
    }
    return copy;
}
export async function facts(client, j) {
    const users = ownedUserIds(j),
        roles = ownedRoleIds(j),
        orgs = ownedOrgIds(j),
        identity = fixtureRequestIdentity(j.runId);
    const result = {};
    const definitions = [
        ['platform_user', 'id=any($1::uuid[])', [users]],
        ['local_credential', 'user_id=any($1::uuid[])', [users]],
        ['auth_session', 'user_id=any($1::uuid[])', [users]],
        ['user_role_assignment', 'user_id=any($1::uuid[])', [users]],
        ['user_org_membership', 'user_id=any($1::uuid[])', [users]],
        ['role', 'id=any($1::uuid[])', [roles]],
        ['org_unit', 'id=any($1::uuid[])', [orgs]],
        ['role_permission_assignment', 'role_id=any($1::uuid[])', [roles]],
        ['audit_log', 'operator_id=any($1::uuid[])', [users]],
        ['security_event', 'actor_id=any($1::uuid[]) or request_id=$2 or user_agent=$3', [users, identity.requestId, identity.userAgent]]
    ];
    for (const [table, condition, args] of definitions) {
        const { rows } = await client.query(`select to_jsonb(t) as row from poms.${table} t where ${condition} order by id limit 4097`, args);
        if (rows.length > 4096) fail('snapshot_limit');
        if (table === 'audit_log' && rows.some(({ row }) => !rowOwned(table, row, j))) fail('foreign_fixture_reference');
        result[table] = rows.map(({ row }) => redact(table, row));
    }
    return result;
}
function auditRow(row) {
    return {
        id: row.id,
        eventType: row.event_type,
        targetType: row.target_type,
        targetId: row.target_id,
        operatorId: row.operator_id,
        requestId: row.request_id,
        result: row.result,
        reason: row.reason,
        beforeSnapshot: row.before_snapshot,
        afterSnapshot: row.after_snapshot,
        metadata: row.metadata,
        occurredAt: new Date(row.occurred_at).toISOString()
    };
}
function securityRow(row) {
    return {
        id: row.id,
        eventType: row.event_type,
        actorId: row.actor_id,
        principal: row.principal,
        requestId: row.request_id,
        path: row.path,
        method: row.method,
        permissionKey: row.permission_key,
        result: row.result,
        details: row.details,
        occurredAt: new Date(row.occurred_at).toISOString()
    };
}
export async function snapshot(client, request, j) {
    const account = j.accounts.find((a) => a.account === request.account);
    if (!account) fail('invalid_account');
    const { rows } = await client.query('select id::text from poms.auth_session where user_id=$1 and token_hash=$2', [account.userId, request.sessionHash]);
    if (rows.length !== 1) fail('fixture_target_not_found');
    const all = await facts(client, j),
        s = all.auth_session.find((s) => s.id === rows[0].id);
    if (!s) fail('snapshot_session');
    const date = (v) => (v === null ? null : new Date(v).toISOString());
    return {
        matched: 1,
        changed: 0,
        state: 'snapshot',
        snapshot: {
            session: {
                id: s.id,
                rowVersion: s.row_version,
                status: s.status,
                lastSeenAt: date(s.last_seen_at),
                idleExpiresAt: date(s.idle_expires_at),
                absoluteExpiresAt: date(s.absolute_expires_at),
                updatedAt: date(s.updated_at),
                revokedAt: date(s.revoked_at),
                revokedReason: s.revoked_reason
            },
            audits: all.audit_log.toSorted((a, b) => a.occurred_at.localeCompare(b.occurred_at) || a.id.localeCompare(b.id)).map(auditRow),
            securityEvents: all.security_event.toSorted((a, b) => a.occurred_at.localeCompare(b.occurred_at) || a.id.localeCompare(b.id)).map(securityRow)
        },
        facts: all
    };
}
export async function userSnapshot(client, request, j) {
    const user = userFor(j, request.userSlot);
    if (!user) fail('user_not_planned');
    return { matched: user.userId ? 1 : 0, changed: 0, state: 'user-snapshot', user, facts: await facts(client, j) };
}
