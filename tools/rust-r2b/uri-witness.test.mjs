import assert from 'node:assert/strict';
import test from 'node:test';
import { upperStatic, uriCases, uriWireRequest } from './uri-witness.mjs';
const id = 'a0000000-b000-4000-8000-000000000001';

test('URI witness has all eight operations and five bounded spelling variants', () => {
    const cases = uriCases(id, 'owned-key');
    assert.equal(cases.length, 51);
    assert.equal(cases.filter((row) => row.variant === 'canonical').length, 8);
    for (const variant of ['static-uppercase', 'one-trailing-slash', 'two-trailing-slashes', 'encoded-api']) assert.equal(cases.filter((row) => row.variant === variant).length, 8);
    assert(cases.filter((row) => row.operation === 'create-duplicate').every((row) => row.json.roleKey === 'owned-key'));
});

test('static casing never changes dynamic UUID or command suffix bytes', () => {
    assert.equal(upperStatic('/api/platform/roles/' + id + ':activate'), '/API/PLATFORM/ROLES/' + id + ':activate');
    assert.equal(upperStatic('/api/platform/roles/' + id + '/permissions'), '/API/PLATFORM/ROLES/' + id + '/PERMISSIONS');
});

test('encoded static and colon probes are literal encoded paths, not decoded aliases', () => {
    const cases = uriCases(id, 'owned-key');
    assert.equal(cases.filter((row) => row.variant === 'encoded-colon').length, 2);
    assert(cases.filter((row) => row.variant === 'encoded-colon').every((row) => row.route.includes('%3A')));
    assert.equal(cases.find((row) => row.id === 'permissions:encoded-permissions').route, '/api/platform/roles/' + id + '/%70ermissions');
    assert.equal(cases.find((row) => row.id === 'guard:original-path').route, '/API/PLATFORM/ROLES/' + id + '/?raw=1');
    assert.equal(cases.find((row) => row.id === 'detail:uppercase-uuid').route, '/api/platform/roles/' + id.toUpperCase());
});

test('native wire sender preserves raw uppercase/encoded/query paths and memory-only CSRF policy', () => {
    const session = {
        origin: 'http://127.0.0.1:5100',
        identity: { userAgent: 'synthetic-agent', requestId: 'synthetic-id' },
        cookies: new Map([
            ['poms_csrf', 'synthetic-csrf'],
            ['poms_session', 'synthetic-session']
        ])
    };
    for (const route of ['/API/PLATFORM/ROLES/' + id + '/?raw=1', '/%61pi/platform/roles/' + id, '/api/platform/roles/' + id + '%3Aactivate']) {
        const wire = uriWireRequest(session, { method: 'PATCH', route, json: {}, options: { csrf: false } });
        assert.equal(wire.options.path, route);
        assert(!wire.options.headers.includes('X-CSRF-Token'));
    }
    assert.throws(() => uriWireRequest({ ...session, origin: 'https://example.com' }, { method: 'GET', route: '/api/platform/roles' }));
    assert.throws(() => uriWireRequest(session, { method: 'GET', route: '//example.com/api' }));
});
