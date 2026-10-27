'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = readFileSync(path.join(__dirname, 'managed-environment.cjs'), 'utf8');
const valid = { NODE_ENV: 'test', HOST: '127.0.0.1', PORT: '5300', DB_CONNECT: 'true', DB_HOST: '127.0.0.1', DB_PORT: '15432', DB_DATABASE: 'poms_r2c_nest', DB_USER: 'poms_r2c_app', DB_PASSWORD: 'a'.repeat(64), DB_SCHEMA: 'poms', JWT_SECRET: 'b'.repeat(64), CORS_ORIGIN: 'http://127.0.0.1:5400' };
// Run the actual admission code with a synthetic filesystem; tests never write
// credentials to the real fixed private directories.
function load({ values = valid, platform = 'linux', realpath, regular = true } = {}) {
    const module = { exports: {} };
    const body = Object.entries(values).map(([k, v]) => `${k}=${v}`).join('\n');
    vm.runInNewContext(source, { module, process: { platform }, require(name) {
        if (name === 'node:fs') return { readFileSync: () => Buffer.from(body), realpathSync: (p) => realpath ?? p, statSync: () => ({ isFile: () => regular }) };
        if (name === 'node:path') return platform === 'win32' ? path.win32 : path.posix;
        return require(name);
    } });
    return (options = {}) => module.exports.loadManagedEnvironment({ mode: 'managed-nest', cwd: '/workspace', env: { POMS_ENV_FILE: '/r2c-private/nest.env' }, ...options });
}
test('fixed file wins; parent database/process injection is rejected', () => {
    const result = load()({ env: { POMS_ENV_FILE: '/r2c-private/nest.env', PORT: '9999', PATH: '/synthetic' } });
    assert.equal(result.port, 5300);
    assert.equal(result.childEnv.DB_PORT, '15432');
    for (const key of ['DATABASE_URL', 'PGHOST', 'pgpassword', 'DB_PORT', 'db_host', 'MIKRO_ORM_HOST', 'JWT_SECRET', 'NODE_OPTIONS', 'node_options']) assert.throws(() => load()({ env: { POMS_ENV_FILE: '/r2c-private/nest.env', [key]: 'unrelated' } }), /ambient/);
});
test('only exact per-backend Linux and WSL paths are admitted, including resolved target', () => {
    for (const filename of ['/r2c-private/nest.env', '/home/wangzishi/.local/share/poms-r2c/private/nest.env']) assert.equal(load()({ env: { POMS_ENV_FILE: filename } }).port, 5300);
    const unc = '\\\\wsl.localhost\\Debian\\home\\wangzishi\\.local\\share\\poms-r2c\\private\\nest.env';
    assert.equal(load({ platform: 'win32' })({ cwd: 'E:\\workspace', env: { POMS_ENV_FILE: unc } }).port, 5300);
    for (const filename of ['/tmp/nest.env','/r2c-private/rust.env','/home/wangzishi/.local/share/poms-r2a/private/nest.env','/tmp/.env','/deploy/private/nest.env']) assert.throws(() => load()({ env: { POMS_ENV_FILE: filename } }));
    assert.throws(() => load({ realpath: '/tmp/nest.env' })());
    assert.throws(() => load({ regular: false })());
});
test('absent file and external mode refuse before fallback', () => {
    assert.throws(() => load()({ mode: 'external', env: {} }), /managed backend/);
    assert.throws(() => load()({ env: {} }), /explicit/);
});
for (const [name, changes] of Object.entries({ pg17: { DB_PORT: '5432' }, oldDatabase: { DB_DATABASE: 'poms_r2a_nest' }, ordinaryDatabase: { DB_DATABASE: 'poms' }, adminRole: { DB_USER: 'postgres' }, wrongBackend: { DB_DATABASE: 'poms_r2c_rust' }, remoteHost: { DB_HOST: '192.0.2.1' }, wrongPort: { PORT: '5102' }, wrongOrigin: { CORS_ORIGIN: 'http://127.0.0.1:5201' }, missingOrigin: { CORS_ORIGIN: '' }, badJwt: { JWT_SECRET: 'x'.repeat(64) }, urlOverride: { DATABASE_URL: 'postgres://other' }, pgOverride: { PGHOST: 'other' }, ormOverride: { MIKRO_ORM_HOST: 'other' }, nodeOverride: { NODE_OPTIONS: '--inspect' }, lowercaseNode: { node_options: '--inspect' }, foldedDatabase: { db_host: 'unrelated.invalid' }, foldedPath: { Path: 'other' }, loader: { LD_PRELOAD: '/other.so' }, library: { LD_LIBRARY_PATH: '/other' }, unknown: { UNRECOGNIZED_CONFIGURATION: 'value' }, redirect: { POMS_ENV_FILE: 'another.env' } })) {
    test(`reject ${name}`, () => assert.throws(() => load({ values: { ...valid, ...changes } })()));
}
test('Rust admits only its own fixed database, file and port', () => {
    const options = { mode: 'managed-rust', env: { POMS_ENV_FILE: '/r2c-private/rust.env' } };
    const result = load({ values: { ...valid, DB_DATABASE: 'poms_r2c_rust', PORT: '5301' } })(options);
    assert.equal(result.database, 'poms_r2c_rust');
    assert.equal(result.port, 5301);
    assert.throws(() => load({ values: { ...valid, DB_DATABASE: 'poms_r2c_rust', PORT: '5300' } })(options));
});
