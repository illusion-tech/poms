'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, writeFileSync, rmSync, mkdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { loadManagedEnvironment } = require('./managed-environment.cjs');
const valid = {
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '4700',
    DB_CONNECT: 'true',
    DB_HOST: '127.0.0.1',
    DB_PORT: '15432',
    DB_DATABASE: 'poms_r1d_nest',
    DB_USER: 'poms_r1d_app',
    DB_PASSWORD: 'a'.repeat(64),
    DB_SCHEMA: 'poms',
    JWT_SECRET: 'b'.repeat(64)
};
function fixture(t, values = valid) {
    const directory = mkdtempSync(join(tmpdir(), 'poms-r1d-env-'));
    t.after(() => rmSync(directory, { recursive: true }));
    const path = join(directory, 'explicit space.env');
    writeFileSync(
        path,
        Object.entries(values)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n')
    );
    return path;
}
test('explicit file wins and parent database/process injection is omitted', (t) => {
    const result = loadManagedEnvironment({ mode: 'managed-nest', env: { POMS_ENV_FILE: fixture(t), DATABASE_URL: 'postgres://unrelated', PGHOST: 'other', DB_PORT: '5432', NODE_OPTIONS: '--inspect', PORT: '9999', PATH: process.env.PATH } });
    assert.equal(result.port, 4700);
    assert.equal(result.childEnv.DB_PORT, '15432');
    for (const key of ['DATABASE_URL', 'PGHOST', 'NODE_OPTIONS']) assert.equal(result.childEnv[key], undefined);
});
test('external and absent env file fail before reading default env', () => {
    assert.throws(() => loadManagedEnvironment({ mode: 'external', env: {} }), /managed backend/);
    assert.throws(() => loadManagedEnvironment({ mode: 'managed-nest', env: {} }), /explicit/);
});
test('reserved default and deployment files are rejected before content parsing', (t) => {
    const directory = mkdtempSync(join(tmpdir(), 'poms-r1d-reserved-'));
    t.after(() => rmSync(directory, { recursive: true }));
    mkdirSync(join(directory, 'deploy', 'private'), { recursive: true });
    for (const path of [join(directory, '.env'), join(directory, 'deploy', 'private', 'nest.env')]) {
        writeFileSync(path, 'not-a-valid-test-environment');
        assert.throws(() => loadManagedEnvironment({ mode: 'managed-nest', env: { POMS_ENV_FILE: path } }), /refuses default or deployment/);
    }
});
for (const [name, changes] of Object.entries({
    pg17: { DB_PORT: '5432' },
    ordinaryDatabase: { DB_DATABASE: 'poms' },
    adminRole: { DB_USER: 'postgres' },
    wrongBackend: { DB_DATABASE: 'poms_r1d_rust' },
    remoteHost: { DB_HOST: '192.0.2.1' },
    malformedPort: { PORT: '4700suffix' },
    overflowPort: { PORT: '65536' },
    urlOverride: { DATABASE_URL: 'postgres://other' },
    pgOverride: { PGHOST: 'other' },
    ormOverride: { MIKRO_ORM_HOST: 'other' },
    nodeOverride: { NODE_OPTIONS: '--inspect' },
    lowercaseNodeOverride: { node_options: '--inspect' },
    foldedDatabaseAlias: { db_host: 'unrelated.invalid' },
    foldedPathOverride: { Path: 'unrelated' },
    loaderOverride: { LD_PRELOAD: '/unrelated.so' },
    libraryPathOverride: { LD_LIBRARY_PATH: '/unrelated' },
    unknownKey: { UNRECOGNIZED_CONFIGURATION: 'value' },
    envRedirect: { POMS_ENV_FILE: 'another.env' }
})) {
    test(`reject ${name}`, (t) => assert.throws(() => loadManagedEnvironment({ mode: 'managed-nest', env: { POMS_ENV_FILE: fixture(t, { ...valid, ...changes }) } })));
}
test('Rust requires its own database and preserves its effective port', (t) => {
    const result = loadManagedEnvironment({ mode: 'managed-rust', env: { POMS_ENV_FILE: fixture(t, { ...valid, DB_DATABASE: 'poms_r1d_rust', PORT: '4701' }) } });
    assert.equal(result.database, 'poms_r1d_rust');
    assert.equal(result.port, 4701);
});
