const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { resolveApiPlan, startApiServer } = require('./api-server.cjs');
const runtime = require('./runtime.cjs');
function fixture(t, mode = 'nest') {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'poms-api-plan-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const file = path.join(directory, 'synthetic.env');
    fs.writeFileSync(
        file,
        `NODE_ENV=test\nHOST=127.0.0.1\nPORT=4700\nDB_HOST=127.0.0.1\nDB_PORT=15432\nDB_DATABASE=poms_r1d_${mode}\nDB_USER=poms_r1d_app\nDB_PASSWORD=${'0'.repeat(64)}\nDB_SCHEMA=poms\nDB_CONNECT=true\nJWT_SECRET=public-synthetic-key-more-than-32-characters\n`
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
