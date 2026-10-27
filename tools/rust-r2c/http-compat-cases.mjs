import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const requiredGroups = Object.freeze(['business', 'guards', 'dto', 'parser', 'uri', 'head', 'membership', 'sort', 'encoding', 'id-spelling', 'regression']);
export const operationNames = Object.freeze(['tree', 'list', 'create', 'detail', 'update', 'activate', 'deactivate', 'move']);

export function operationCases(orgId, code) {
    assert(/^[0-9a-f-]{36}$/.test(orgId));
    const route = '/api/platform/org-units/' + orgId;
    return [
        { operation: 'tree', method: 'GET', route: '/api/platform/org-unit-tree' },
        { operation: 'list', method: 'GET', route: '/api/platform/org-units' },
        { operation: 'create', method: 'POST', route: '/api/platform/org-units', json: { name: 'R2C duplicate code', code } },
        { operation: 'detail', method: 'GET', route },
        { operation: 'update', method: 'PATCH', route, json: { description: null } },
        { operation: 'activate', method: 'POST', route: route + ':activate', json: {} },
        { operation: 'deactivate', method: 'POST', route: route + ':deactivate', json: {} },
        { operation: 'move', method: 'POST', route: route + ':move', json: { parentId: null } }
    ];
}

export function upperStatic(route) {
    return route
        .split('/')
        .map((part) => (['api', 'platform', 'org-units', 'org-unit-tree'].includes(part) ? part.toUpperCase() : part))
        .join('/');
}
export function uriCases(orgId, inactiveId, code) {
    const operations = operationCases(orgId, code).map((entry) => (entry.operation === 'deactivate' ? { ...entry, route: `/api/platform/org-units/${inactiveId}:deactivate` } : entry));
    const variants = [
        ['canonical', (route) => route],
        ['static-uppercase', upperStatic],
        ['one-trailing-slash', (route) => route + '/'],
        ['two-trailing-slashes', (route) => route + '//'],
        ['encoded-api', (route) => route.replace('/api/', '/%61pi/')]
    ];
    const rows = operations.flatMap((entry) => variants.map(([variant, convert]) => ({ ...entry, id: `uri:${entry.operation}:${variant}`, variant, route: convert(entry.route), matched: !['two-trailing-slashes', 'encoded-api'].includes(variant) })));
    for (const operation of ['activate', 'deactivate', 'move']) {
        const entry = operations.find((value) => value.operation === operation);
        rows.push({ ...entry, id: `uri:${operation}:uppercase-suffix`, variant: 'uppercase-suffix', route: entry.route.replace(':' + operation, ':' + operation.toUpperCase()), matched: true });
        rows.push({ ...entry, id: `uri:${operation}:encoded-colon`, variant: 'encoded-colon', route: entry.route.replace(':', '%3A'), matched: false });
    }
    for (const [operation, route] of [
        ['tree', '/api/platform/%6frg-unit-tree'],
        ['list', '/api/%70latform/org-units'],
        ['detail', '/api/platform/%6frg-units/' + orgId]
    ])
        rows.push({ operation, method: 'GET', route, id: `uri:${operation}:encoded-static`, variant: 'encoded-static', matched: false });
    assert.equal(rows.length, 49);
    return rows;
}
export function headCases(orgId) {
    return operationCases(orgId, 'unused')
        .filter((entry) => entry.method === 'GET')
        .flatMap((entry) =>
            [
                ['canonical', entry.route],
                ['static-uppercase', upperStatic(entry.route)],
                ['one-trailing-slash', entry.route + '/'],
                ['two-trailing-slashes', entry.route + '//'],
                ['encoded-api', entry.route.replace('/api/', '/%61pi/')]
            ].map(([variant, route]) => ({ operation: entry.operation, method: 'HEAD', route, id: `head:${entry.operation}:${variant}`, matched: !['two-trailing-slashes', 'encoded-api'].includes(variant) }))
        );
}
export function dtoCases(golden, orgId) {
    const path = '/api/platform/org-units/' + orgId;
    return golden.cases
        .filter((entry) => !entry.nonWireOwnUndefined && !entry.expected.success)
        .map((entry) => {
            const [operation, method, route] =
                entry.schema === 'CreateOrgUnitRequest'
                    ? ['create', 'POST', '/api/platform/org-units']
                    : entry.schema === 'UpdateOrgUnitRequest'
                      ? ['update', 'PATCH', path]
                      : entry.schema === 'UpdateOrgUnitActivationRequest'
                        ? ['activate', 'POST', path + ':activate']
                        : ['move', 'POST', path + ':move'];
            return { id: `dto:${entry.schema}:${entry.name}`, operation, method, route, ...(entry.inputRaw === null ? {} : { options: { body: entry.inputRaw, contentType: 'application/json' } }) };
        });
}
export function frozenGolden() {
    return JSON.parse(readFileSync(new URL('./org-units-golden.json', import.meta.url), 'utf8'));
}
// This plan is built before any HTTP or fixture action. It is independent of
// observe(), and the comparator rebuilds it from this source and frozen golden.
export function completeCasePlan(golden = frozenGolden()) {
    const plan = [];
    const add = (id, group, operation, method) => plan.push(Object.freeze({ id, group, operation, method }));
    const business = (id, operation, method = 'POST') => add(id, 'business', operation, method);
    for (const slot of ['main', 'second', 'child', 'grandchild', 'sibling', 'inactive-parent', 'inactive-child']) business('create:' + slot, 'create');
    for (const due of [true, false]) {
        business(`update:dirty:${due}`, 'update', 'PATCH');
        business(`update:noop:${due}`, 'update', 'PATCH');
        business(`activate:noop:${due}`, 'activate');
        business(`move:noop:${due}`, 'move');
    }
    for (const [id, operation] of [
        ['update:code-trim', 'update'],
        ['update:code-restore', 'update'],
        ['create:duplicate-code', 'create'],
        ['update:duplicate-code', 'update'],
        ['sibling:other-parent-name-allowed', 'update'],
        ['move:sibling-name-refused', 'move'],
        ['sibling:restore-name', 'update'],
        ['move:child-order-only-keeps-parent', 'move'],
        ['move:under-second-retains-order', 'move'],
        ['move:restore-main', 'move'],
        ['deactivate:inactive-parent', 'deactivate']
    ])
        business(id, operation, operation === 'update' ? 'PATCH' : 'POST');
    for (const due of [true, false])
        for (const [id, operation] of [
            ['activate:inactive-parent-refused', 'activate'],
            ['move:inactive-parent-refused', 'move'],
            ['move:descendant-refused', 'move'],
            ['move:self-db-check', 'move']
        ])
            business(`${id}:${due}`, operation);
    for (const slot of ['race-code-a', 'race-code-b', 'race-name-a', 'race-name-b']) business('create:parent-or-name:' + slot, 'create');
    business('move:uppercase-parent-refused', 'move');
    business('deactivate:mixed-main', 'deactivate');
    business('deactivate:noop-main', 'deactivate');
    for (const slot of ['main', 'child', 'grandchild']) business('activate:only-' + slot, 'activate');
    for (const [id, operation] of [
        ['query:list-includes-inactive', 'list'],
        ['query:tree-all', 'tree'],
        ['query:detail', 'detail']
    ])
        business(id, operation, 'GET');
    business('create:unicode', 'create');
    business('sibling:contextual-Greek-name', 'update', 'PATCH');
    business('sibling:final-sigma-duplicate', 'update', 'PATCH');
    const probe = 'a0000000-0000-4000-8000-000000000001';
    for (const row of operationCases(probe, 'fixed-probe')) {
        add(`guard:anonymous:${row.operation}`, 'guards', row.operation, row.method);
        add(`guard:forbidden:${row.operation}`, 'guards', row.operation, row.method);
        if (row.method !== 'GET') {
            add(`guard:csrf:${row.operation}`, 'guards', row.operation, row.method);
            add(`guard:csrf-before-permission:${row.operation}`, 'guards', row.operation, row.method);
        }
    }
    for (const row of headCases(probe).filter((row) => row.matched && row.id.endsWith(':canonical'))) {
        add('guard:anonymous:' + row.id, 'guards', row.operation, row.method);
        add('guard:forbidden:' + row.id, 'guards', row.operation, row.method);
    }
    for (const row of dtoCases(golden, probe)) add(row.id, 'dto', row.operation, row.method);
    for (const [id, method] of [
        ['malformed-json', 'PATCH'],
        ['malformed-before-auth', 'POST'],
        ['wrong-content-type', 'PATCH'],
        ['body-limit', 'PATCH'],
        ['get-ignored-body', 'GET'],
        ['get-malformed-body', 'GET'],
        ['unsupported-delete', 'DELETE'],
        ['old-slash-move', 'POST']
    ])
        add('parser:' + id, 'parser', method === 'GET' ? 'list' : 'update', method);
    for (const kind of ['uppercase', 'compact', 'braces', 'invalid', 'missing']) {
        add('id:get:' + kind, 'id-spelling', 'detail', 'GET');
        add('id:update:' + kind, 'id-spelling', 'update', 'PATCH');
    }
    add('id:get:encoded-parameter', 'id-spelling', 'detail', 'GET');
    add('id:update:encoded-parameter', 'id-spelling', 'update', 'PATCH');
    for (const row of uriCases(probe, 'b0000000-0000-4000-8000-000000000001', 'fixed-probe')) add(row.id, 'uri', row.operation, row.method);
    add('uri:guard-original-path', 'uri', 'update', 'PATCH');
    add('uri:unknown-original-path', 'uri', 'unknown', 'GET');
    add('uri:unknown-command', 'uri', 'unknown', 'POST');
    for (const row of headCases(probe)) add(row.id, 'head', row.operation, row.method);
    for (const slot of ['utf16-name', 'utf16-code', 'utf16-description']) add('create:' + slot, 'encoding', 'create', 'POST');
    for (const id of ['surrogate', 'surrogate-repeat', 'restore', 'NUL']) add('encoding:update:' + id, 'encoding', 'update', 'PATCH');
    add('encoding:rejected-surrogate-reason', 'encoding', 'activate', 'POST');
    add('create:order-overflow', 'encoding', 'create', 'POST');
    for (const value of [2147483648, 9007199254740991]) add('encoding:update-int4-overflow:' + value, 'encoding', 'update', 'PATCH');
    business('create:max-order', 'create');
    business('create:negative-order', 'create');
    add('encoding:historical-negative-output', 'encoding', 'detail', 'GET');
    add('create:negative-default', 'encoding', 'create', 'POST');
    add('encoding:default-int4-overflow', 'encoding', 'create', 'POST');
    for (const [id, operation] of [
        ['permissions', 'permissions'],
        ['role-detail', 'role-detail'],
        ['current-session', 'auth-session'],
        ['csrf-refresh', 'auth-csrf']
    ])
        add('regression:' + id, 'regression', operation, 'GET');
    for (const slot of ['main', 'child', 'grandchild']) add('membership:detail:' + slot, 'membership', 'detail', 'GET');
    add('membership:tree', 'membership', 'tree', 'GET');
    for (const slot of ['tie-a', 'tie-b', 'tie-c', 'tie-d']) business('create:' + slot, 'create');
    add('sort:flat-microseconds', 'sort', 'list', 'GET');
    add('sort:tree-millisecond-zh-CN', 'sort', 'tree', 'GET');
    assert.equal(plan.length, 354);
    assert.equal(new Set(plan.map((row) => row.id)).size, plan.length);
    return Object.freeze(plan);
}
export function coverageManifest(golden = frozenGolden()) {
    const plan = completeCasePlan(golden);
    return Object.freeze({ planVersion: 1, planSha256: createHash('sha256').update(JSON.stringify(plan)).digest('hex'), groups: Object.freeze([...requiredGroups]), expectedCaseIds: Object.freeze(plan.map((row) => row.id)) });
}
export function wireOrganizations(response, operation, status, method = 'GET') {
    if (method === 'HEAD' || status < 200 || status >= 300 || !operationNames.includes(operation)) return [];
    const rows = [];
    function visit(value) {
        assert(value && typeof value === 'object' && !Array.isArray(value), 'Successful organization response must contain full organization objects');
        assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.id), 'Wire organization identity must be canonical');
        for (const key of ['code', 'displayOrder', 'createdAt', 'updatedAt']) assert(Object.hasOwn(value, key), 'Wire organization omitted ' + key);
        rows.push(value);
        if (operation === 'tree') {
            assert(Array.isArray(value.children), 'Tree children must remain an array');
            value.children.forEach(visit);
        }
    }
    if (['list', 'tree'].includes(operation)) {
        assert(Array.isArray(response), 'List/tree response must remain an array');
        response.forEach(visit);
    } else visit(response);
    assert.equal(new Set(rows.map((row) => row.id)).size, rows.length, 'A response cannot repeat an organization');
    return rows;
}
export function assertCompleteCoverage(report) {
    const expected = coverageManifest();
    assert.equal(report.coverage.complete, true);
    for (const key of ['planVersion', 'planSha256', 'groups', 'expectedCaseIds']) assert.deepEqual(report.coverage[key], expected[key], 'Frozen independent HTTP plan: ' + key);
    assert.deepEqual([...new Set(report.observations.map((row) => row.group))].sort(), [...requiredGroups].sort());
    const successful = new Set(report.observations.filter((row) => row.status >= 200 && row.status < 300 && row.method !== 'HEAD').map((row) => row.operation));
    for (const operation of operationNames) assert(successful.has(operation), `Missing successful existing operation: ${operation}`);
    assert.deepEqual(
        report.observations.map((row) => row.id),
        expected.expectedCaseIds
    );
    assert.deepEqual(
        report.observations.map(({ id, group, operation, method }) => ({ id, group, operation, method })),
        completeCasePlan(),
        'Every planned case and its operation/group/method must complete in order'
    );
}
