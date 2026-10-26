import assert from 'node:assert/strict';

const forbiddenCases = ['forbidden-get-permissions', 'forbidden-get-roles', 'forbidden-post-role', 'forbidden-get-role', 'forbidden-patch-role', 'forbidden-activate', 'forbidden-deactivate', 'forbidden-replace'];
const mainKeys = ['nav:profile:view', 'project:read'];
// Frozen fixture-core fixturePermissions(viewer, default). Neither original
// assignment query has ORDER BY; user permissions are their deduplicated union.
const viewerKeys = ['nav:dashboard:view', 'platform:org-units:manage'];
const exactSet = (values, expected) => {
    assert(Array.isArray(values));
    assert.equal(new Set(values).size, values.length, 'Permission union must remain unique');
    assert.deepEqual([...values].sort(), [...expected].sort(), 'Permission union membership must remain exact');
};

export function createForbiddenPermissionNormalizer(run) {
    const state = run.observations.find((row) => row.id === 'inactive-user-still-counted');
    assert(state?.roleAfter);
    const main = state.roleAfter;
    assert.equal(main.role.role_key, 'r2b_' + run.runId.replaceAll('-', '') + '_main');
    assert.equal(main.role.is_active, true);
    const active = main.permissions.filter((row) => row.status === 'active');
    exactSet(
        active.map((row) => row.permission_key),
        mainKeys
    );
    assert(active.every((row) => row.role_id === main.role.id));
    assert.equal(main.users.length, 1);
    assert.equal(main.users[0].role_id, main.role.id);
    assert.equal(main.users[0].user_id, run.identities.viewer);
    assert.equal(main.users[0].status, 'active');
    const expected = [...mainKeys, ...viewerKeys].sort();
    const rows = run.observations.filter((row) => forbiddenCases.includes(row.id));
    assert.deepEqual(
        rows.map((row) => row.id),
        forbiddenCases
    );
    const events = new Map();
    for (const row of rows) {
        assert.equal(row.status, 403);
        assert.equal(row.response.code, 'permission_denied');
        assert.deepEqual(row.after.audits, row.before.audits);
        assert.deepEqual(row.after.securityEvents.slice(0, row.before.securityEvents.length), row.before.securityEvents);
        const added = row.after.securityEvents.slice(row.before.securityEvents.length);
        assert.equal(added.length, 1);
        const event = added[0];
        assert.equal(event.eventType, 'authz.permission.denied');
        assert.equal(event.actorId, run.identities.viewer);
        assert.equal(event.path, row.route);
        assert.equal(event.method, row.method);
        assert.equal(event.permissionKey, 'platform:roles:manage');
        assert.equal(event.result, 'blocked');
        assert.deepEqual(event.details.requiredPermissions, ['platform:roles:manage']);
        exactSet(event.details.userPermissions, expected);
        assert(!events.has(event.id));
        events.set(event.id, structuredClone(event));
    }
    return Object.freeze({
        // Only these eight already-validated event IDs receive this exception.
        // Event arrays, required permissions and every other field keep order.
        normalizeEvents(values) {
            return values.map((event) => {
                const original = events.get(event.id);
                if (!original) return event;
                assert.deepEqual(event, original, 'A previously recorded security event changed');
                return { ...event, details: { ...event.details, userPermissions: [...expected] } };
            });
        }
    });
}
