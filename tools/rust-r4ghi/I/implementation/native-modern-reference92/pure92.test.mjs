import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import net from 'node:net';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { NATIVE92, args92, taggedCases92, assertUnsupported92, normalizeNativeEnv92, assertSnapshot92 } from './proposed/tools/rust-r4ghi/business/native-modern92-common.mjs';
const inventory = JSON.parse(fs.readFileSync(new URL('./inventory92.json', import.meta.url)));
test('exact17 modern-tag cases are source-mapped without constructing business facts', () => {
    const cases = taggedCases92(inventory); assert.equal(cases.length, 17); assert.equal(new Set(cases.map(c => c.operationId)).size, 17);
    for (const value of cases) { assert.deepEqual(value.body, { inputVersion: 'server-derived-v1' }); assert(!value.path.includes('{')); assert.equal(value.validModernBusinessDTOClaimed, false); assert.equal(value.expectedStatus, 422); }
});
test('only the exact complete Native unsupported reason is admitted', () => {
    for (const c of taggedCases92(inventory)) { const a = { status: 422, responseComplete: true, transportFailure: false, body: { statusCode: 422, code: c.expectedCode, message: c.expectedMessage } }; assertUnsupported92(a, c);
        for (const bad of [{ ...a, status: 400 }, { ...a, responseComplete: false }, { ...a, body: { ...a.body, message: 'a later legacy shape error' } }]) assert.throws(() => assertUnsupported92(bad, c)); }
});
const parse = bytes => Object.fromEntries(bytes.toString().trim().split(/\r?\n/).filter(s => s.includes('=')).map(s => { const i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; }));
const environment = 'PORT=3333\nDB_HOST=127.0.0.1\nDB_PORT=25434\nDB_DATABASE=poms_r4ghi_native\nDB_USER=poms_r4ghi_native_app\nDB_SCHEMA=poms\nDB_CONNECT=true\nDB_PASSWORD=synthetic-unit-only\nOTHER_SECRET=synthetic-unit-only\n';
test('private env normalization changes only PORT and preserves all remaining bytes', () => {
    const output = normalizeNativeEnv92(Buffer.from(environment), parse, { host: '127.0.0.1', port: 25434 }); assert.equal(output.toString(), environment.replace('PORT=3333', 'PORT=31442'));
});
test('default/foreign DB, role and URL are rejected before any startup', () => {
    for (const value of [environment.replace('poms_r4ghi_native\n', 'poms\n'), environment.replace('DB_USER=poms_r4ghi_native_app', 'DB_USER=postgres'), environment + 'DATABASE_URL=postgresql://u:p@remote:5432/real\n'])
        assert.throws(() => normalizeNativeEnv92(Buffer.from(value), parse, { host: '127.0.0.1', port: 25434 }));
});
test('CLI pin duplication or missing values cannot silently win', () => { assert.throws(() => args92(['--plan', 'one', '--plan', 'two'])); assert.throws(() => args92(['--plan'])); });
function row(id, revision = 1) { const raw = JSON.stringify({ id, user_id: 'actor', status: 'active', token_hash: 'unit-hash', row_version: revision }); return { key: [id], raw, sha256: createHash('sha256').update(raw).digest('hex'), xmin: String(revision) }; }
function snapshot(rows = []) { return { objects: { native: { files: [] }, rust: { files: [] } }, databases: { [NATIVE92.database]: { meta: { normative: [], sequences: [] }, tables: { auth_session: rows, platform_user: [row('borrowed-user')] } }, [NATIVE92.rustDatabase]: { meta: { normative: [], sequences: [] }, tables: { auth_session: [], platform_user: [row('original-rust-user')] } } } }; }
const options = { readRows: value => value, rawTouch: (a, b, id, actor) => b.key[0] === id && JSON.parse(b.raw).user_id === actor && JSON.parse(b.raw).row_version === JSON.parse(a.raw).row_version + 1 };
test('login owns only one cookie-linked new Native session, original user/rust rows stay exact', () => {
    const before = snapshot(), after = snapshot([row('new-session')]); assert.equal(assertSnapshot92(before, after, { ...options, mode: 'login', actorId: 'actor', tokenHash: 'unit-hash' }).key[0], 'new-session');
    for (const change of [v => v.databases[NATIVE92.database].tables.platform_user = [row('borrowed-user', 2)], v => v.databases[NATIVE92.rustDatabase].tables.platform_user = [row('original-rust-user', 2)]]) { const modified = structuredClone(after); change(modified); assert.throws(() => assertSnapshot92(before, modified, { ...options, mode: 'login', actorId: 'actor', tokenHash: 'unit-hash' })); }
});
test('modern requests permit only that owned Native session raw touch, never another row or birth', () => {
    const before = snapshot([row('new-session')]), after = snapshot([row('new-session', 2)]); assertSnapshot92(before, after, { ...options, mode: 'modern', sessionId: 'new-session', actorId: 'actor' });
    assert.throws(() => assertSnapshot92(before, snapshot([row('other-session', 2)]), { ...options, mode: 'modern', sessionId: 'new-session', actorId: 'actor' }));
    assert.throws(() => assertSnapshot92(before, snapshot([row('new-session'), row('extra')]), { ...options, mode: 'modern', sessionId: 'new-session', actorId: 'actor' }));
});
test('startup/final conservation rejects xmin-only, catalog, sequence and object drift', () => {
    const before = snapshot(); for (const change of [v => v.databases[NATIVE92.database].tables.platform_user[0].xmin = '999', v => v.databases[NATIVE92.database].meta.sequences.push('changed'), v => v.objects.native.files.push('changed')]) { const after = structuredClone(before); change(after); assert.throws(() => assertSnapshot92(before, after, options)); }
});
function preload(envText = environment.replace('PORT=3333', 'PORT=31442'), overrides = {}) {
    const originalRealListen = net.Server.prototype.listen, calls = []; function FakeServer() {} FakeServer.prototype.listen = function (...args) { calls.push({ receiver: this, args }); return this; };
    const envBytes = Buffer.from(envText), envFile = '/home/wangzishi/.local/share/poms-r4ghi/private/native-reference92/unit-only/native.env';
    const box = { module: { exports: {} }, URL, process: { env: { POMS_R4GHI_NATIVE_REFERENCE_RUN: 'a'.repeat(64), POMS_ENV_FILE: envFile, POMS_R4GHI_NATIVE_ENV_SHA256: createHash('sha256').update(envBytes).digest('hex'), ...overrides } }, require: name => {
        if (name === 'node:net') return { Server: FakeServer }; if (name === 'node:assert/strict') return assert; if (name === 'node:crypto') return { createHash };
        if (name === 'dotenv') return { parse }; if (name === 'node:fs') return { readFileSync: () => envBytes, realpathSync: () => envFile, lstatSync: () => ({ isFile: () => true, isSymbolicLink: () => false, nlink: 1 }) };
        assert.fail('Unexpected preload dependency'); } };
    vm.runInNewContext(fs.readFileSync(new URL('./proposed/tools/rust-r4ghi/business/native-bind-loopback92.cjs', import.meta.url), 'utf8'), box);
    assert.equal(net.Server.prototype.listen, originalRealListen, 'The pure test must not patch the real process net module'); return { normalize: box.module.exports.normalizeListen92, FakeServer, calls };
}
test('preload preserves Nest port/callback/backlog/options while supplying only loopback host', () => {
    const { normalize, FakeServer, calls } = preload(), callback = () => {};
    assert.deepEqual(Array.from(normalize([31442, callback])), [31442, '127.0.0.1', callback]); assert.deepEqual(Array.from(normalize([31442, 511, callback])), [31442, '127.0.0.1', 511, callback]);
    const options = { port: 31442, backlog: 128 }; const actual = normalize([options, callback]); assert.equal(actual[0].host, '127.0.0.1'); assert.equal(actual[0].backlog, 128); assert.equal(options.host, undefined); assert.equal(actual[1], callback);
    const server = new FakeServer(); assert.equal(server.listen(31442, callback), server); assert.equal(calls[0].receiver, server); assert.deepEqual(Array.from(calls[0].args), [31442, '127.0.0.1', callback]);
});
test('preload rejects another port/host, wildcard, pipe and fd handles', () => {
    const { normalize } = preload(); for (const args of [[31441], [0], [31442, '0.0.0.0'], [31442, '::'], [{ port: 31442, host: 'localhost' }], [{ path: '/tmp/socket' }], [{ port: 31442, fd: 3 }]]) assert.throws(() => normalize(args));
});
test('preload fails before bootstrap for missing/foreign env, bad pin or default DB', () => {
    const normal = environment.replace('PORT=3333', 'PORT=31442');
    for (const override of [{ POMS_ENV_FILE: undefined }, { POMS_ENV_FILE: '/tmp/.env' }, { POMS_R4GHI_NATIVE_ENV_SHA256: 'f'.repeat(64) }, { POMS_R4GHI_NATIVE_REFERENCE_RUN: undefined }, { DATABASE_URL: 'postgresql://unit:unit@remote:5432/real' }]) assert.throws(() => preload(normal, override));
    for (const bad of [environment, normal.replace('DB_DATABASE=poms_r4ghi_native', 'DB_DATABASE=poms'), normal.replace('DB_USER=poms_r4ghi_native_app', 'DB_USER=postgres'), normal.replace('DB_CONNECT=true', 'DB_CONNECT=false')]) assert.throws(() => preload(bad));
});
test('real Node HTTP Server inherits the intercepted net listen without requiring a listener', () => {
    assert.equal(Object.hasOwn(http.Server.prototype, 'listen'), false); assert.equal(http.Server.prototype.listen, net.Server.prototype.listen);
});
