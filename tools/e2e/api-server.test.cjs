const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { resolveApiPlan, startApiServer } = require('./api-server.cjs');
const runtime = require('./runtime.cjs');
function fixture(t, mode = 'nest', profile = 'r1d') {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'poms-api-plan-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const file = path.join(directory, 'synthetic.env');
    fs.writeFileSync(
        file,
        `NODE_ENV=test\nHOST=127.0.0.1\nPORT=${profile === 'r2a' ? '5100' : profile === 'r1e' ? '4900' : '4700'}\nDB_HOST=127.0.0.1\nDB_PORT=15432\nDB_DATABASE=poms_${profile}_${mode}\nDB_USER=poms_${profile}_app\nDB_PASSWORD=${'0'.repeat(64)}\nDB_SCHEMA=poms\nDB_CONNECT=true\nJWT_SECRET=public-synthetic-key-more-than-32-characters\n`
    );
    return file;
}
test('managed default retains Nest full suite and effective file env, without DB I/O', (t) => {
    const file = fixture(t);
    const plan = resolveApiPlan({ env: { POMS_ENV_FILE: file, PORT: '9999', DB_HOST: 'untrusted.invalid' } });
    assert.equal(plan.suite, 'nest-full');
    assert.equal(plan.target.mode, 'managed-nest');
    assert.equal(plan.target.port, 4700);
    assert.equal(plan.managedEnvironment.childEnv.DB_HOST, '127.0.0.1');
    assert.equal(plan.managedEnvironment.childEnv.PORT, '4700');
    assert.throws(() => resolveApiPlan({ env: {} }), /explicit POMS_ENV_FILE/);
    assert.throws(() => resolveApiPlan({ env: { POMS_ENV_FILE: file, POMS_API_BASE_URL: 'http://localhost' } }), /conflicts/);
});
test('Rust foundation and suite/mode failures are explicit before launch', (t) => {
    const file = fixture(t, 'rust');
    assert.equal(resolveApiPlan({ env: { POMS_E2E_MODE: 'managed-rust', POMS_ENV_FILE: file } }).suite, 'foundation');
    assert.throws(() => resolveApiPlan({ env: { POMS_E2E_MODE: 'managed-rust', POMS_E2E_SUITE: 'nest-full', POMS_ENV_FILE: file } }), /only the foundation/);
    for (const mode of ['', 'rust', 'managed']) assert.throws(() => resolveApiPlan({ env: { POMS_E2E_MODE: mode } }), /MODE/);
    assert.throws(() => resolveApiPlan({ env: { POMS_E2E_MODE: 'external', POMS_API_BASE_URL: 'http://localhost' } }), /explicit POMS_E2E_SUITE/);
});
test('external requires explicit origin/suite and does not inspect local DB/env', () => {
    const plan = resolveApiPlan({ env: { POMS_E2E_MODE: 'external', POMS_E2E_SUITE: 'foundation', POMS_API_BASE_URL: 'http://127.0.0.1:4701/', POMS_ENV_FILE: '/definitely/missing/private.env', DB_HOST: 'production.invalid' } });
    assert.equal(plan.target.apiBaseUrl, 'http://127.0.0.1:4701/api');
    assert.equal(plan.managedEnvironment, undefined);
});
test('explicit R1E profile admits only R1E tuple; absent profile remains R1D', (t) => {
    const file = fixture(t, 'nest', 'r1e');
    const plan = resolveApiPlan({ env: { POMS_E2E_ENV_PROFILE: 'r1e', POMS_ENV_FILE: file } });
    assert.equal(plan.target.port, 4900);
    assert.equal(plan.managedEnvironment.database, 'poms_r1e_nest');
    assert.equal(plan.managedEnvironment.childEnv.DB_USER, 'poms_r1e_app');
    assert.throws(() => resolveApiPlan({ env: { POMS_ENV_FILE: file } }), /R1D environment mismatch/);
    assert.throws(() => resolveApiPlan({ env: { POMS_E2E_ENV_PROFILE: 'r1e', POMS_ENV_FILE: fixture(t) } }), /R1E environment mismatch/);
    const rust = resolveApiPlan({ env: { POMS_E2E_ENV_PROFILE: 'r1e', POMS_E2E_MODE: 'managed-rust', POMS_ENV_FILE: fixture(t, 'rust', 'r1e') } });
    assert.equal(rust.suite, 'foundation');
    assert.equal(rust.managedEnvironment.database, 'poms_r1e_rust');
});
test('R2A admission rejects old copies and maps each backend to the new low-privilege database', (t) => {
    for (const backend of ['nest', 'rust']) {
        const file = fixture(t, backend, 'r2a');
        const plan = resolveApiPlan({ env: { POMS_E2E_ENV_PROFILE: 'r2a', POMS_E2E_MODE: `managed-${backend}`, POMS_ENV_FILE: file } });
        assert.equal(plan.managedEnvironment.database, `poms_r2a_${backend}`);
        assert.equal(plan.managedEnvironment.childEnv.DB_USER, 'poms_r2a_app');
        assert.throws(() => resolveApiPlan({ env: { POMS_E2E_ENV_PROFILE: 'r1e', POMS_E2E_MODE: `managed-${backend}`, POMS_ENV_FILE: file } }), /R1E environment mismatch/);
        assert.throws(() => resolveApiPlan({ env: { POMS_E2E_ENV_PROFILE: 'r2a', POMS_E2E_MODE: `managed-${backend}`, POMS_ENV_FILE: fixture(t, backend, 'r1e') } }), /R2A environment mismatch/);
    }
    const plan = resolveApiPlan({ env: { POMS_E2E_ENV_PROFILE: 'r2a', POMS_E2E_MODE: 'external', POMS_E2E_SUITE: 'foundation', POMS_API_BASE_URL: 'http://127.0.0.1:5101', POMS_ENV_FILE: '/missing' } });
    assert.equal(plan.managedEnvironment, undefined);
});

test('unknown or aliased profile fails before filesystem access; valid external R1E reads no env', () => {
    for (const profile of ['', 'R1E', 'r1c', 'production']) {
        assert.throws(() => resolveApiPlan({ env: { POMS_E2E_ENV_PROFILE: profile, POMS_ENV_FILE: '/missing' } }), /POMS_E2E_ENV_PROFILE/);
    }
    assert.throws(() => resolveApiPlan({ env: { poms_e2e_env_profile: 'r1e', POMS_ENV_FILE: '/missing' } }), /exact uppercase/);
    const plan = resolveApiPlan({ env: { POMS_E2E_ENV_PROFILE: 'r1e', POMS_E2E_MODE: 'external', POMS_E2E_SUITE: 'foundation', POMS_API_BASE_URL: 'http://127.0.0.1:4901', POMS_ENV_FILE: '/missing', DATABASE_URL: 'unrelated' } });
    assert.equal(plan.target.apiBaseUrl, 'http://127.0.0.1:4901/api');
    assert.equal(plan.managedEnvironment, undefined);
});
test('actual external readiness and stop cause zero build/spawn/stop operations', async () => {
    const server = http.createServer((_request, response) => response.end(JSON.stringify({ service: 'poms-api', status: 'ready', checks: { process: { status: 'pass' }, database: { status: 'pass' } } })));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const keys = ['runOwnedCommand', 'startOwned', 'stopOwned', 'assertPortAvailable'];
    const originals = keys.map((key) => runtime[key]);
    for (const key of keys)
        runtime[key] = () => {
            throw new Error('External attempted owned process operation');
        };
    try {
        const result = await startApiServer({ env: { POMS_E2E_MODE: 'external', POMS_E2E_SUITE: 'foundation', POMS_API_BASE_URL: `http://127.0.0.1:${server.address().port}`, POMS_ENV_FILE: '/missing' } });
        assert.equal(result.handle, null);
        await result.stop();
        assert(server.listening);
    } finally {
        keys.forEach((key, i) => (runtime[key] = originals[i]));
        await new Promise((resolve) => server.close(resolve));
    }
});
