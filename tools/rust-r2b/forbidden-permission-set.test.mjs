import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createForbiddenPermissionNormalizer } from './forbidden-permission-set.mjs';

// Small synthetic comparison fixture only; it makes no live HTTP claim.
function synthetic() {
    const runId = '10000000-0000-4000-8000-000000000001',
        roleId = '20000000-0000-4000-8000-000000000001',
        viewer = '30000000-0000-4000-8000-000000000001';
    const result = {
        runId,
        identities: { viewer },
        observations: [
            {
                id: 'inactive-user-still-counted',
                roleAfter: {
                    role: { id: roleId, role_key: 'r2b_' + runId.replaceAll('-', '') + '_main', is_active: true },
                    permissions: ['nav:profile:view', 'project:read'].map((permission_key) => ({ role_id: roleId, status: 'active', permission_key })),
                    users: [{ role_id: roleId, user_id: viewer, status: 'active' }]
                }
            }
        ]
    };
    const events = [];
    for (const [index, id] of ['forbidden-get-permissions', 'forbidden-get-roles', 'forbidden-post-role', 'forbidden-get-role', 'forbidden-patch-role', 'forbidden-activate', 'forbidden-deactivate', 'forbidden-replace'].entries()) {
        const before = structuredClone(events);
        events.push({
            id: 'event-' + index,
            eventType: 'authz.permission.denied',
            actorId: viewer,
            path: '/api/synthetic/' + index,
            method: 'GET',
            permissionKey: 'platform:roles:manage',
            result: 'blocked',
            details: { requiredPermissions: ['platform:roles:manage'], userPermissions: ['nav:profile:view', 'project:read', 'nav:dashboard:view', 'platform:org-units:manage'] }
        });
        result.observations.push({
            id,
            route: '/api/synthetic/' + index,
            method: 'GET',
            status: 403,
            response: { code: 'permission_denied' },
            before: { audits: [], securityEvents: before },
            after: { audits: [], securityEvents: structuredClone(events) }
        });
    }
    return result;
}

test('only the exact unique user-permission union is independent of SQL row order', () => {
    const original = synthetic(),
        changed = synthetic();
    for (const row of changed.observations.slice(1)) for (const event of [...row.before.securityEvents, ...row.after.securityEvents]) event.details.userPermissions.reverse();
    const left = createForbiddenPermissionNormalizer(original),
        right = createForbiddenPermissionNormalizer(changed);
    assert.deepEqual(left.normalizeEvents(original.observations.at(-1).after.securityEvents), right.normalizeEvents(changed.observations.at(-1).after.securityEvents));
});

test('missing, additional and duplicate permission members are rejected', () => {
    for (const mutate of [(values) => values.pop(), (values) => values.push('unknown:extra'), (values) => values.push(values[0])]) {
        const run = synthetic();
        mutate(run.observations[1].after.securityEvents[0].details.userPermissions);
        assert.throws(() => createForbiddenPermissionNormalizer(run));
    }
});

test('requiredPermissions are never normalized or weakened', () => {
    const run = synthetic();
    run.observations[1].after.securityEvents[0].details.requiredPermissions.push('unexpected:required');
    assert.throws(() => createForbiddenPermissionNormalizer(run));
});

test('the source role permission and viewer membership proof is mandatory', () => {
    for (const mutate of [
        (run) => {
            run.observations[0].roleAfter.permissions[0].permission_key = 'unknown:changed';
        },
        (run) => {
            run.observations[0].roleAfter.users[0].user_id = 'other';
        },
        (run) => {
            run.observations[0].roleAfter.role.is_active = false;
        },
        (run) => {
            run.observations.pop();
        }
    ]) {
        const run = synthetic();
        mutate(run);
        assert.throws(() => createForbiddenPermissionNormalizer(run));
    }
});

test('security-event array order and all other fields remain visible', () => {
    const run = synthetic(),
        normalizer = createForbiddenPermissionNormalizer(run),
        events = run.observations.at(-1).after.securityEvents;
    assert.notDeepEqual(normalizer.normalizeEvents([...events].reverse()), normalizer.normalizeEvents(events));
    const changed = structuredClone(events);
    changed[0].unexpected = true;
    assert.throws(() => normalizer.normalizeEvents(changed));
});

test('unregistered security events and their arrays remain unchanged', () => {
    const run = synthetic(),
        normalizer = createForbiddenPermissionNormalizer(run);
    const event = { id: 'another', eventType: 'auth.csrf.denied', details: { userPermissions: ['z', 'a'], requiredPermissions: ['z', 'a'] } };
    assert.strictEqual(normalizer.normalizeEvents([event])[0], event);
    assert.deepEqual(event.details.userPermissions, ['z', 'a']);
});

test('previous security-event state must be immutable within the run', () => {
    const run = synthetic();
    run.observations[2].before.securityEvents[0].details.userPermissions.reverse();
    assert.throws(() => createForbiddenPermissionNormalizer(run));
});
