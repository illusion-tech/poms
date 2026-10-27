import { createRequire } from 'node:module';
import { assertOwned } from './fixture-core.mjs';
import { fail } from './fixture-guard.mjs';

const require = createRequire(import.meta.url);
const { fixtureRequestIdentity } = require('./fixture-protocol.cjs');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function exact(value, fields) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== fields.length || fields.some((field) => !Object.hasOwn(value, field))) fail('snapshot_shape');
}
function timestamp(value, nullable = false) {
    if (nullable && value === null) return null;
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) fail('snapshot_timestamp');
    return value.toISOString();
}
export function navigationSummary(value) {
    exact(value, ['targetId', 'nodeCount', 'routeCount', 'hiddenCount', 'disabledCount', 'treeChecksum', 'navigationKeys', 'routeLinks']);
    if (value.targetId !== 'platform-navigation' || !/^[0-9a-f]{64}$/.test(value.treeChecksum)) fail('snapshot_shape');
    for (const field of ['nodeCount', 'routeCount', 'hiddenCount', 'disabledCount']) if (!Number.isSafeInteger(value[field]) || value[field] < 0) fail('snapshot_shape');
    for (const field of ['navigationKeys', 'routeLinks']) if (!Array.isArray(value[field]) || value[field].some((item) => typeof item !== 'string')) fail('snapshot_shape');
    if (value.navigationKeys.length !== value.nodeCount || value.routeLinks.length !== value.routeCount) fail('snapshot_shape');
    return value;
}
export function auditSnapshot(row, userIds) {
    exact(row, ['id', 'eventType', 'targetType', 'targetId', 'operatorId', 'requestId', 'result', 'reason', 'beforeSnapshot', 'afterSnapshot', 'metadata', 'occurredAt']);
    if (row.targetType === 'OrgUnit') return orgAuditSnapshot(row, userIds);
    if (row.targetType === 'PlatformRole') return roleAuditSnapshot(row, userIds);
    if (
        !uuid.test(row.id) ||
        !userIds.includes(row.operatorId) ||
        row.eventType !== 'platform.navigation.synced' ||
        row.targetType !== 'NavigationTree' ||
        row.targetId !== 'platform-navigation' ||
        row.result !== 'success' ||
        row.reason !== null ||
        row.beforeSnapshot !== null
    )
        fail('snapshot_audit');
    if (row.requestId !== null && typeof row.requestId !== 'string') fail('snapshot_audit');
    exact(row.metadata, ['source']);
    if (row.metadata.source !== 'static-navigation-ssot') fail('snapshot_audit');
    navigationSummary(row.afterSnapshot);
    return { ...row, occurredAt: timestamp(row.occurredAt) };
}
function orgAuditSnapshot(row, userIds) {
    const events = ['platform.org-unit.created', 'platform.org-unit.updated', 'platform.org-unit.activated', 'platform.org-unit.deactivated', 'platform.org-unit.moved', 'platform.org-unit.activate.rejected', 'platform.org-unit.move.rejected'];
    if (!uuid.test(row.id) || !uuid.test(row.targetId) || !userIds.includes(row.operatorId) || !events.includes(row.eventType) || row.requestId !== null) fail('snapshot_org_audit');
    const fields =
        row.eventType === 'platform.org-unit.created'
            ? ['code', 'name', 'parentId', 'displayOrder', 'isActive']
            : row.eventType === 'platform.org-unit.updated'
              ? ['name', 'code', 'description', 'displayOrder']
              : row.eventType === 'platform.org-unit.activated'
                ? ['isActive']
                : row.eventType === 'platform.org-unit.deactivated'
                  ? ['orgUnits']
                  : ['parentId', 'displayOrder'];
    if (row.result === 'rejected') {
        if (
            row.afterSnapshot !== null ||
            !['platform.org-unit.activate.rejected', 'platform.org-unit.move.rejected'].includes(row.eventType) ||
            row.reason !== (row.eventType === 'platform.org-unit.activate.rejected' ? 'inactive-parent' : 'cycle-detected')
        )
            fail('snapshot_org_audit');
        exact(row.beforeSnapshot, row.eventType === 'platform.org-unit.activate.rejected' ? ['isActive', 'parentId'] : fields);
        exact(row.metadata, ['request']);
    } else {
        if (row.result !== 'success' || row.reason !== null || row.eventType.endsWith('.rejected')) fail('snapshot_org_audit');
        exact(row.afterSnapshot, fields);
        if (row.eventType === 'platform.org-unit.created') {
            if (row.beforeSnapshot !== null) fail('snapshot_org_audit');
        } else exact(row.beforeSnapshot, fields);
        if (row.eventType === 'platform.org-unit.deactivated') {
            exact(row.metadata, ['request', 'cascadedCount']);
            if (!Number.isSafeInteger(row.metadata.cascadedCount) || row.metadata.cascadedCount < 0) fail('snapshot_org_audit');
            for (const snapshot of [row.beforeSnapshot, row.afterSnapshot]) {
                if (!Array.isArray(snapshot.orgUnits)) fail('snapshot_org_audit');
                for (const org of snapshot.orgUnits) {
                    exact(org, ['id', 'isActive']);
                    if (!uuid.test(org.id) || typeof org.isActive !== 'boolean') fail('snapshot_org_audit');
                }
            }
        } else if (row.eventType === 'platform.org-unit.moved') exact(row.metadata, ['request']);
        else if (row.metadata !== null) fail('snapshot_org_audit');
    }
    return { ...row, occurredAt: timestamp(row.occurredAt) };
}
function roleAuditSnapshot(row, userIds) {
    const events = ['platform.role.created', 'platform.role.updated', 'platform.role.activated', 'platform.role.deactivated', 'platform.role.permissions.replaced', 'platform.role.permissions.baseline.rejected'];
    if (!uuid.test(row.id) || !uuid.test(row.targetId) || !userIds.includes(row.operatorId) || !events.includes(row.eventType) || row.requestId !== null) fail('snapshot_role_audit');
    if (row.result === 'rejected') {
        if (row.eventType !== 'platform.role.permissions.baseline.rejected' || row.reason !== 'system-role-baseline-violation' || row.beforeSnapshot !== null || row.afterSnapshot !== null) fail('snapshot_role_audit');
        exact(row.metadata, ['missingPermissionKeys']);
        if (!Array.isArray(row.metadata.missingPermissionKeys) || row.metadata.missingPermissionKeys.some((k) => typeof k !== 'string')) fail('snapshot_role_audit');
    } else {
        if (row.result !== 'success' || row.reason !== null || row.metadata !== null) fail('snapshot_role_audit');
        const fields =
            row.eventType === 'platform.role.created'
                ? ['roleKey', 'name', 'isActive', 'isSystemRole', 'displayOrder']
                : row.eventType === 'platform.role.updated'
                  ? ['name', 'description', 'displayOrder']
                  : row.eventType === 'platform.role.permissions.replaced'
                    ? ['permissionKeys']
                    : ['isActive'];
        exact(row.afterSnapshot, fields);
        if (row.eventType === 'platform.role.created') {
            if (row.beforeSnapshot !== null) fail('snapshot_role_audit');
        } else exact(row.beforeSnapshot, fields);
    }
    return { ...row, occurredAt: timestamp(row.occurredAt) };
}
export function securitySnapshot(row) {
    exact(row, ['id', 'eventType', 'actorId', 'principal', 'requestId', 'path', 'method', 'permissionKey', 'result', 'details', 'occurredAt']);
    if (!uuid.test(row.id) || !['auth.login.failed', 'auth.session.invalid', 'auth.csrf.failed', 'authz.permission.denied', 'authz.route.denied'].includes(row.eventType)) fail('snapshot_security');
    if (row.actorId !== null && !uuid.test(row.actorId)) fail('snapshot_security');
    for (const key of ['principal', 'requestId', 'method', 'permissionKey']) if (row[key] !== null && typeof row[key] !== 'string') fail('snapshot_security');
    if (typeof row.path !== 'string' || !['blocked', 'failed', 'expired'].includes(row.result)) fail('snapshot_security');
    if (row.eventType === 'authz.route.denied') {
        if (row.method !== 'ROUTE' || row.result !== 'blocked') fail('snapshot_security');
        exact(row.details, ['requiredPermissions', 'returnUrl']);
        if (!Array.isArray(row.details.requiredPermissions) || row.details.requiredPermissions.some((value) => typeof value !== 'string') || (row.details.returnUrl !== null && typeof row.details.returnUrl !== 'string')) fail('snapshot_security');
    } else if (row.details !== null) {
        if (typeof row.details !== 'object' || Array.isArray(row.details)) fail('snapshot_security');
        for (const [key, value] of Object.entries(row.details)) {
            if (key === 'reason') {
                if (typeof value !== 'string') fail('snapshot_security');
            } else if (['requiredPermissions', 'requiredAnyPermissions', 'userPermissions'].includes(key)) {
                if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) fail('snapshot_security');
            } else fail('snapshot_security');
        }
    }
    return { ...row, occurredAt: timestamp(row.occurredAt) };
}
export async function snapshot(client, request, journal) {
    await assertOwned(client, journal);
    const account = journal.accounts.find((value) => value.account === request.account);
    if (!account) fail('invalid_account');
    const sessionResult = await client.query(
        `select id::text,row_version as "rowVersion",status,last_seen_at as "lastSeenAt",idle_expires_at as "idleExpiresAt",
        absolute_expires_at as "absoluteExpiresAt",updated_at as "updatedAt",revoked_at as "revokedAt",revoked_reason as "revokedReason"
        from poms.auth_session where user_id=$1 and token_hash=$2`,
        [account.userId, request.sessionHash]
    );
    if (sessionResult.rows.length !== 1) fail('fixture_target_not_found');
    const session = sessionResult.rows[0];
    exact(session, ['id', 'rowVersion', 'status', 'lastSeenAt', 'idleExpiresAt', 'absoluteExpiresAt', 'updatedAt', 'revokedAt', 'revokedReason']);
    if (!uuid.test(session.id) || !Number.isSafeInteger(session.rowVersion) || !['active', 'expired', 'revoked'].includes(session.status) || (session.revokedReason !== null && typeof session.revokedReason !== 'string')) fail('snapshot_session');
    const userIds = journal.accounts.map((entry) => entry.userId);
    const audits = await client.query(
        `select id::text,event_type as "eventType",target_type as "targetType",target_id as "targetId",operator_id::text as "operatorId",
        request_id as "requestId",result,reason,before_snapshot as "beforeSnapshot",after_snapshot as "afterSnapshot",metadata,occurred_at as "occurredAt"
        from poms.audit_log where operator_id=any($1::uuid[]) order by occurred_at,id limit 129`,
        [userIds]
    );
    const identity = fixtureRequestIdentity(request.runId);
    const events = await client.query(
        `select id::text,event_type as "eventType",actor_id::text as "actorId",principal,request_id as "requestId",path,method,
        permission_key as "permissionKey",result,details,occurred_at as "occurredAt"
        from poms.security_event where actor_id=any($1::uuid[]) or request_id=$2 or user_agent=$3 order by occurred_at,id limit 129`,
        [userIds, identity.requestId, identity.userAgent]
    );
    if (audits.rows.length > 128 || events.rows.length > 128) fail('snapshot_limit');
    return {
        matched: 1,
        changed: 0,
        state: 'snapshot',
        snapshot: {
            session: {
                ...session,
                lastSeenAt: timestamp(session.lastSeenAt),
                idleExpiresAt: timestamp(session.idleExpiresAt),
                absoluteExpiresAt: timestamp(session.absoluteExpiresAt),
                updatedAt: timestamp(session.updatedAt),
                revokedAt: timestamp(session.revokedAt, true)
            },
            audits: audits.rows.map((row) => auditSnapshot(row, userIds)),
            securityEvents: events.rows.map(securitySnapshot)
        }
    };
}
