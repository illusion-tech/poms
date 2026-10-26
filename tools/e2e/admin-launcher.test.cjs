const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');
const { resolveBrowserPlan, startBrowserServers, mergeNoProxy, validateAdminReady } = require('./admin-launcher.cjs');
const runtime = require('./runtime.cjs');
const actualApi = require('./api-server.cjs');

const root = path.resolve(__dirname, '../..');
const credentials = { POMS_E2E_USERNAME: 'public-synthetic-user', POMS_E2E_PASSWORD: 'public-synthetic-password' };
const authEnv = { ...credentials, POMS_ADMIN_E2E_SUITE: 'auth' };

function mockedDependencies({ apiPort = 4700, adminFailure = false, external = false, changedTarget = false, failedStop = false } = {}) {
    const calls = [];
    const deps = {
        resolveTarget: runtime.resolveTarget,
        resolveApiPlan({ env }) {
            calls.push(['plan', env.POMS_E2E_MODE]);
            if (env.POMS_E2E_MODE === 'external') return actualApi.resolveApiPlan({ env, cwd: root });
            return {
                target: runtime.resolveTarget({ mode: env.POMS_E2E_MODE, host: '127.0.0.1', port: apiPort }),
                suite: env.POMS_E2E_SUITE,
                managedEnvironment: { database: 'poms_r1d_nest', childEnv: { DB_PASSWORD: 'must-not-escape-plan' }, envFile: '/synthetic-only.env' }
            };
        },
        async startApiServer({ env }) {
            calls.push(['api-start', env.POMS_E2E_MODE]);
            const { target } = deps.resolveApiPlan({ env });
            return { target: changedTarget ? { ...target, origin: 'http://127.0.0.1:4999' } : target, handle: external ? null : {}, stop: async () => calls.push([target.managed ? 'api-stop' : 'external-api-noop']) };
        },
        async startOwned(options) {
            calls.push(['admin-start', options]);
            if (adminFailure) throw new Error('controlled start failure');
            return Object.freeze({ marker: 'only-the-runtime-owns-this' });
        },
        async stopOwned(handle) {
            calls.push(['admin-stop', handle]);
            if (failedStop) {
                failedStop = false;
                throw new Error('controlled cleanup failure');
            }
        },
        async waitForReadiness(options) {
            calls.push(['external-admin-ready', options.url]);
        }
    };
    return { deps, calls };
}

test('managed plan follows the adapter effective port, preserves all eight legacy specs, and exposes no credentials', () => {
    const { deps } = mockedDependencies({ apiPort: 4717 });
    const plan = resolveBrowserPlan({ env: {}, cwd: root, platform: 'linux', deps });
    assert.equal(plan.apiOrigin, 'http://127.0.0.1:4717');
    assert.equal(plan.adminOrigin, 'http://127.0.0.1:4800');
    assert.equal(plan.suite, 'legacy');
    assert.equal(plan.testMatch.length, 8);
    const files = fs.readdirSync(path.join(root, 'apps/poms-admin-e2e/src')).filter((name) => name.endsWith('.spec.ts') && !['r1d-auth.smoke.spec.ts', 'r1e-stage.spec.ts', 'r2a-navigation.spec.ts'].includes(name));
    assert.deepEqual(plan.testMatch.map((entry) => entry.slice(3)).sort(), files.sort());
    assert(!JSON.stringify(plan).includes('must-not-escape-plan'));
    assert(!JSON.stringify(plan).includes('envFile'));
    assert.equal(resolveBrowserPlan({ env: { POMS_ADMIN_START_TIMEOUT_MS: '300000' }, cwd: root, platform: 'linux', deps }).timeoutMs, 300000);
});

test('explicit auth selection uses only the new spec; Rust legacy and Windows-managed Rust are refused', () => {
    const { deps } = mockedDependencies();
    assert.deepEqual(resolveBrowserPlan({ env: authEnv, cwd: root, platform: 'linux', deps }).testMatch, ['**/r1d-auth.smoke.spec.ts']);
    assert.equal(resolveBrowserPlan({ env: { ...authEnv, POMS_E2E_MODE: 'managed-rust' }, cwd: root, platform: 'linux', deps }).apiSuite, 'foundation');
    assert.throws(() => resolveBrowserPlan({ env: { POMS_E2E_MODE: 'managed-rust', POMS_ADMIN_E2E_SUITE: 'legacy' }, platform: 'linux', deps }));
    assert.throws(() => resolveBrowserPlan({ env: { ...authEnv, POMS_E2E_MODE: 'managed-rust' }, platform: 'win32', deps }));
});

test('stage uses its isolated profile, precise backend, test-only bootstrap and foundation API suite', async () => {
    const { deps, calls } = mockedDependencies({ apiPort: 4703 });
    const env = { POMS_ADMIN_E2E_SUITE: 'stage', POMS_E2E_MODE: 'managed-rust', POMS_E2E_ENV_PROFILE: 'r1e' };
    const plan = resolveBrowserPlan({ env, cwd: root, platform: 'linux', deps });
    assert.equal(plan.stageBackend, 'rust');
    assert.equal(plan.apiSuite, 'foundation');
    assert.deepEqual(plan.testMatch, ['**/r1e-stage.spec.ts']);
    const servers = await startBrowserServers({ env, cwd: root, platform: 'linux', deps });
    const options = calls.find(([name]) => name === 'admin-start')[1];
    assert(options.args.includes('--configuration=e2e-stage'));
    assert.equal(options.env.POMS_E2E_ENV_PROFILE, undefined);
    await servers.stop();
    for (const bad of [
        { ...env, POMS_E2E_ENV_PROFILE: undefined },
        { ...env, POMS_E2E_ENV_PROFILE: 'r1d' },
        { ...env, POMS_R1E_BACKEND: 'nest' }
    ])
        assert.throws(() => resolveBrowserPlan({ env: bad, cwd: root, platform: 'linux', deps }));
    const external = { POMS_ADMIN_E2E_SUITE: 'stage', POMS_API_BASE_URL: 'http://127.0.0.1:4703', POMS_ADMIN_BASE_URL: 'http://127.0.0.1:4800', POMS_R1E_BACKEND: 'rust', POMS_ENV_FILE: '/must-not-read.env' };
    assert.equal(resolveBrowserPlan({ env: external, cwd: root, deps }).stageBackend, 'rust');
    assert.throws(() => resolveBrowserPlan({ env: { ...external, POMS_R1E_BACKEND: undefined }, cwd: root, deps }));
});

test('navigation uses the R2A profile and original app bootstrap, refusing mismatched backend or old profiles', async () => {
    const { deps, calls } = mockedDependencies({ apiPort: 5101 });
    const env = { POMS_ADMIN_E2E_SUITE: 'navigation', POMS_E2E_MODE: 'managed-rust', POMS_E2E_ENV_PROFILE: 'r2a', POMS_ADMIN_PORT_SEED: '800' };
    const plan = resolveBrowserPlan({ env, cwd: root, platform: 'linux', deps });
    assert.equal(plan.stageBackend, 'rust');
    assert.equal(plan.apiSuite, 'foundation');
    assert.equal(plan.adminOrigin, 'http://127.0.0.1:5200');
    assert.deepEqual(plan.testMatch, ['**/r2a-navigation.spec.ts']);
    const servers = await startBrowserServers({ env, cwd: root, platform: 'linux', deps });
    const options = calls.find(([name]) => name === 'admin-start')[1];
    assert(!options.args.some((arg) => arg.startsWith('--configuration=')));
    assert.equal(options.env.POMS_E2E_ENV_PROFILE, undefined);
    await servers.stop();
    for (const bad of [
        { ...env, POMS_E2E_ENV_PROFILE: undefined },
        { ...env, POMS_E2E_ENV_PROFILE: 'r1e' },
        { ...env, POMS_R2A_BACKEND: 'nest' }
    ]) {
        assert.throws(() => resolveBrowserPlan({ env: bad, cwd: root, platform: 'linux', deps }));
    }
    assert.throws(() => resolveBrowserPlan({ env, cwd: root, platform: 'win32', deps }));
    const external = { POMS_ADMIN_E2E_SUITE: 'navigation', POMS_API_BASE_URL: 'http://127.0.0.1:5101', POMS_R2A_BACKEND: 'rust', POMS_ENV_FILE: '/must-not-read.env' };
    assert.equal(resolveBrowserPlan({ env: external, cwd: root, deps }).stageBackend, 'rust');
    assert.throws(() => resolveBrowserPlan({ env: { ...external, POMS_R2A_BACKEND: undefined }, cwd: root, deps }));
});

test('both external URLs use actual external parsing, never read an envfile, and never spawn or stop an external service', async () => {
    const { deps, calls } = mockedDependencies({ external: true });
    const env = {
        ...authEnv,
        POMS_API_BASE_URL: 'http://127.0.0.1:4701/',
        POMS_ADMIN_BASE_URL: 'http://127.0.0.1:4801',
        POMS_ENV_FILE: '/must-not-read/real.env',
        HOST: 'ignored',
        PORT: 'invalid',
        POMS_E2E_LOOPBACK_HOST: 'ignored',
        POMS_E2E_PORT_SEED: 'invalid'
    };
    const servers = await startBrowserServers({ env, cwd: root, deps });
    assert.equal(servers.plan.apiOrigin, 'http://127.0.0.1:4701');
    assert.equal(servers.plan.adminOrigin, 'http://127.0.0.1:4801');
    await servers.stop();
    await servers.stop();
    assert.equal(calls.filter(([name]) => name === 'admin-start').length, 0);
    assert.equal(calls.filter(([name]) => name === 'admin-stop').length, 0);
    assert.equal(calls.filter(([name]) => name === 'api-stop').length, 0);
    assert.equal(calls.filter(([name]) => name === 'external-admin-ready').length, 1);
});

test('external API plus managed admin delegates only its own Node/Nx child with a secret-free environment', async () => {
    const { deps, calls } = mockedDependencies({ external: true });
    const env = { ...authEnv, POMS_API_BASE_URL: 'http://127.0.0.1:4701', DB_PASSWORD: 'must-not-reach-admin', POMS_ENV_FILE: '/must-not-read/real.env' };
    const servers = await startBrowserServers({ env, cwd: root, deps });
    const options = calls.find(([name]) => name === 'admin-start')[1];
    assert.equal(options.executable, process.execPath);
    assert(options.args[0].endsWith(path.join('dist', 'bin', 'nx.js')));
    assert.deepEqual(options.args.slice(1), ['serve', 'poms-admin', '--port=4800', '--host=127.0.0.1']);
    assert.equal(options.env.POMS_API_PROXY_TARGET, 'http://127.0.0.1:4701');
    assert.equal(options.env.DB_PASSWORD, undefined);
    assert.equal(options.env.POMS_ENV_FILE, undefined);
    assert.equal(options.env.POMS_E2E_PASSWORD, undefined);
    await servers.stop();
    await servers.stop();
    assert.equal(calls.filter(([name]) => name === 'admin-stop').length, 1);
});

test('external admin plus managed API only probes the admin and stops its API once', async () => {
    const { deps, calls } = mockedDependencies();
    const servers = await startBrowserServers({ env: { ...authEnv, POMS_ADMIN_BASE_URL: 'http://127.0.0.1:4900' }, cwd: root, deps });
    await servers.stop();
    assert.equal(calls.filter(([name]) => name === 'admin-start').length, 0);
    assert.equal(calls.filter(([name]) => name === 'api-stop').length, 1);
});

test('admin startup failure and a changed API target stop only the already-owned API', async () => {
    for (const options of [{ adminFailure: true }, { changedTarget: true }]) {
        const { deps, calls } = mockedDependencies(options);
        await assert.rejects(startBrowserServers({ env: authEnv, cwd: root, deps }));
        assert.equal(calls.filter(([name]) => name === 'api-stop').length, 1);
        assert.equal(calls.filter(([name]) => name === 'admin-stop').length, 0);
    }
});

test('teardown is reverse order, still stops API on admin failure, and can retry the failed owned cleanup', async () => {
    const { deps, calls } = mockedDependencies({ failedStop: true });
    const servers = await startBrowserServers({ env: authEnv, cwd: root, deps });
    await assert.rejects(servers.stop(), /owned service cleanup failed/);
    assert.deepEqual(
        calls.filter(([name]) => name.endsWith('-stop')).map(([name]) => name),
        ['admin-stop', 'api-stop']
    );
    await servers.stop();
    await servers.stop();
    assert.equal(calls.filter(([name]) => name === 'api-stop').length, 1);
    assert.equal(calls.filter(([name]) => name === 'admin-stop').length, 2);
});

test('bad configuration refuses before any start and never reflects supplied secret input', () => {
    const failures = [
        { POMS_E2E_MODE: 'password-secret' },
        { POMS_ADMIN_E2E_SUITE: 'password-secret' },
        { POMS_ADMIN_E2E_SUITE: 'auth' },
        { ...authEnv, POMS_E2E_SUITE: 'nest-full' },
        { ...authEnv, POMS_E2E_MODE: 'managed-nest', POMS_API_BASE_URL: 'http://127.0.0.1:4700' },
        ...['', 'http://user:password-secret@127.0.0.1', 'http://127.0.0.1/path', 'http://127.0.0.1?x=secret', 'file:///tmp/browser'].map((url) => ({ ...authEnv, POMS_ADMIN_BASE_URL: url })),
        ...['-1', '1.5', 'NaN', '', '61136'].map((seed) => ({ ...authEnv, POMS_ADMIN_PORT_SEED: seed })),
        { ...authEnv, POMS_ADMIN_PORT_SEED: '400', POMS_E2E_PORT_SEED: '300' },
        { ...authEnv, POMS_ADMIN_START_TIMEOUT_MS: '0' },
        { ...authEnv, POMS_ADMIN_START_TIMEOUT_MS: '300001' },
        { ...authEnv, POMS_E2E_LOOPBACK_HOST: '0.0.0.0' }
    ];
    for (const env of failures) {
        const { deps, calls } = mockedDependencies();
        assert.throws(
            () => resolveBrowserPlan({ env, cwd: root, platform: 'linux', deps }),
            (error) => !error.message.includes('password-secret')
        );
        assert(!calls.some(([name]) => name.endsWith('-start')));
    }
    const { deps } = mockedDependencies({ apiPort: 4800 });
    assert.throws(() => resolveBrowserPlan({ env: authEnv, cwd: root, deps }), /distinct listeners/);
});

test('loopback proxy exclusions preserve both casings; admin readiness rejects arbitrary successful pages', () => {
    const env = mergeNoProxy({ NO_PROXY: 'existing.invalid', no_proxy: 'other.invalid' });
    assert.equal(env.NO_PROXY, env.no_proxy);
    for (const value of ['localhost', '127.0.0.1', '::1', '[::1]', 'existing.invalid', 'other.invalid']) assert(env.NO_PROXY.split(',').includes(value));
    assert(validateAdminReady({ status: 200, bodyText: '<html><app-root class="demo"></app-root></html>' }));
    assert(!validateAdminReady({ status: 200, bodyText: '<html>unrelated</html>' }));
    assert(!validateAdminReady({ status: 503, bodyText: '<app-root></app-root>' }));
});

function collectPlaywright(suite) {
    const cli = path.join(path.dirname(require.resolve('@playwright/test/package.json')), 'cli.js');
    return spawnSync(process.execPath, [cli, 'test', '--list', '--config', 'apps/poms-admin-e2e/playwright.config.ts'], {
        cwd: root,
        windowsHide: true,
        timeout: 15000,
        encoding: 'utf8',
        env: {
            ...process.env,
            ...credentials,
            POMS_E2E_MODE: 'external',
            POMS_E2E_SUITE: suite === 'legacy' ? 'nest-full' : 'foundation',
            POMS_ADMIN_E2E_SUITE: suite,
            POMS_R1E_BACKEND: 'rust',
            POMS_API_BASE_URL: 'http://127.0.0.1:47473',
            POMS_ADMIN_BASE_URL: 'http://127.0.0.1:48473',
            POMS_ENV_FILE: '/must-not-read/real.env'
        }
    });
}

test('actual Playwright --list loads the auth config without global setup, envfile reads, services or a browser', () => {
    const result = collectPlaywright('auth');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Total: 1 test in 1 file/);
    assert.match(result.stdout, /r1d-auth\.smoke\.spec\.ts/);
});

test('actual Playwright --list preserves the eight legacy files and excludes the new auth suite', () => {
    const result = collectPlaywright('legacy');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Total: 36 tests in 8 files/);
    assert(!result.stdout.includes('r1d-auth.smoke.spec.ts'));
});

test('actual Playwright --list stage performs no fixture action and selects only real stage journeys', () => {
    const result = collectPlaywright('stage');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /r1e-stage\.spec\.ts/);
    assert.match(result.stdout, /Total: 16 tests in 1 file/);
    assert(!result.stdout.includes('r1d-auth.smoke.spec.ts'));
    assert(!result.stdout.includes('contract-management.journey.spec.ts'));
});
