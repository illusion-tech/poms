const path = require('node:path');
const fs = require('node:fs');

const workspaceRoot = path.resolve(__dirname, '../..');
const legacyFiles = [
    'contract-management.journey.spec.ts',
    'external-login.mocked.spec.ts',
    'frontend-permission-visibility.matrix.spec.ts',
    'lead-bootstrap.journey.spec.ts',
    'platform-governance.smoke.spec.ts',
    'project-workspace.journey.spec.ts',
    'project-workspace.smoke.spec.ts',
    'workbench-todo-entry.journey.spec.ts'
];

function configurationError(message) {
    return new Error(`POMS browser configuration: ${message}`);
}

function mergeNoProxy(env) {
    const values = [env.NO_PROXY, env.no_proxy]
        .filter((value) => typeof value === 'string')
        .flatMap((value) =>
            value
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean)
        );
    const merged = [...new Set(['localhost', '127.0.0.1', '::1', '[::1]', ...values])].join(',');
    return { ...env, NO_PROXY: merged, no_proxy: merged };
}

function dependencies(overrides) {
    if (overrides) return overrides;
    return { ...require('./api-server.cjs'), ...require('./runtime.cjs') };
}

function positiveInteger(value, fallback, maximum, name) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) throw configurationError(`${name} must be an integer in its documented range`);
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maximum) throw configurationError(`${name} must be an integer in its documented range`);
    return parsed;
}

function configure({ env = process.env, cwd = workspaceRoot, platform = process.platform, deps } = {}) {
    const runtime = dependencies(deps);
    const externalApi = env.POMS_API_BASE_URL !== undefined;
    const mode = env.POMS_E2E_MODE ?? (externalApi ? 'external' : 'managed-nest');
    if (!['managed-nest', 'managed-rust', 'external'].includes(mode)) throw configurationError('invalid API mode');
    if (platform === 'win32' && mode === 'managed-rust') throw configurationError('Windows uses an independently owned external Rust server');
    if (externalApi && mode !== 'external') throw configurationError('managed API mode cannot also specify an external API URL');
    const suite = env.POMS_ADMIN_E2E_SUITE ?? (mode === 'managed-nest' ? 'legacy' : undefined);
    if (!['auth', 'legacy', 'stage', 'navigation', 'roles', 'organizations', 'users'].includes(suite)) throw configurationError('explicit POMS_ADMIN_E2E_SUITE=auth|legacy|stage|navigation|roles|organizations|users is required');
    if (mode === 'managed-rust' && suite === 'legacy') throw configurationError('Rust browser coverage uses an explicit auth or stage suite');
    if (suite === 'auth' && (typeof env.POMS_E2E_USERNAME !== 'string' || !env.POMS_E2E_USERNAME.trim() || typeof env.POMS_E2E_PASSWORD !== 'string' || !env.POMS_E2E_PASSWORD)) {
        throw configurationError('auth smoke requires explicit synthetic POMS_E2E_USERNAME and POMS_E2E_PASSWORD');
    }
    let stageBackend = null;
    if (suite === 'stage' || suite === 'navigation' || suite === 'roles' || suite === 'organizations' || suite === 'users') {
        const backendKey = suite === 'users' ? 'POMS_R2D_BACKEND' : suite === 'organizations' ? 'POMS_R2C_BACKEND' : suite === 'roles' ? 'POMS_R2B_BACKEND' : suite === 'navigation' ? 'POMS_R2A_BACKEND' : 'POMS_R1E_BACKEND';
        const profile = suite === 'users' ? 'r2d' : suite === 'organizations' ? 'r2c' : suite === 'roles' ? 'r2b' : suite === 'navigation' ? 'r2a' : 'r1e';
        stageBackend = mode === 'managed-nest' ? 'nest' : mode === 'managed-rust' ? 'rust' : env[backendKey];
        if (!['nest', 'rust'].includes(stageBackend)) throw configurationError(`external ${suite} requires explicit ${backendKey}=nest|rust`);
        if (env[backendKey] !== undefined && env[backendKey] !== stageBackend) throw configurationError(`${suite} backend conflicts with managed API mode`);
        if (mode !== 'external' && env.POMS_E2E_ENV_PROFILE !== profile) throw configurationError(`managed ${suite} requires explicit ${profile.toUpperCase()} environment profile`);
    }
    const apiSuite = suite === 'legacy' ? 'nest-full' : 'foundation';
    if (env.POMS_E2E_SUITE !== undefined && env.POMS_E2E_SUITE !== apiSuite) throw configurationError('API suite conflicts with the selected browser suite');
    const apiEnv = mergeNoProxy({ ...env, POMS_E2E_MODE: mode, POMS_E2E_SUITE: apiSuite });
    // Only the adapter reads/validates the explicit managed synthetic envfile;
    // its effective HOST/PORT always win over browser defaults or port seeds.
    const apiPlan = runtime.resolveApiPlan({ env: apiEnv, cwd });
    if (apiPlan.target.mode !== mode || apiPlan.suite !== apiSuite) throw configurationError('API adapter returned a conflicting target or suite');
    const externalAdmin = env.POMS_ADMIN_BASE_URL !== undefined;
    let admin;
    if (externalAdmin) {
        const target = runtime.resolveTarget({ mode: 'external', baseUrl: env.POMS_ADMIN_BASE_URL });
        admin = { managed: false, origin: target.origin, host: target.host, port: target.port };
    } else {
        const host = env.POMS_E2E_LOOPBACK_HOST ?? '127.0.0.1';
        if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw configurationError('managed admin host must be loopback');
        if (env.POMS_ADMIN_PORT_SEED !== undefined && env.POMS_E2E_PORT_SEED !== undefined && env.POMS_ADMIN_PORT_SEED !== env.POMS_E2E_PORT_SEED) throw configurationError('conflicting admin port seeds');
        const seed = positiveInteger(env.POMS_ADMIN_PORT_SEED ?? env.POMS_E2E_PORT_SEED, 400, 61135, 'admin port seed');
        const port = 4400 + seed;
        admin = { managed: true, origin: `http://${host === '::1' ? '[::1]' : host}:${port}`, host, port };
    }
    if (admin.origin === apiPlan.target.origin || (admin.managed && apiPlan.target.managed && admin.port === apiPlan.target.port)) throw configurationError('admin and API must use distinct listeners');
    const timeoutMs = positiveInteger(env.POMS_ADMIN_START_TIMEOUT_MS, 180000, 300000, 'startup timeout');
    if (timeoutMs < 1) throw configurationError('startup timeout must be positive');
    const publicPlan = Object.freeze({
        cwd: path.resolve(cwd),
        apiMode: mode,
        apiOrigin: apiPlan.target.origin,
        apiReadinessUrl: apiPlan.target.readinessUrl,
        apiManaged: apiPlan.target.managed,
        adminOrigin: admin.origin,
        adminManaged: admin.managed,
        adminHost: admin.host,
        adminPort: admin.port,
        suite,
        apiSuite,
        stageBackend,
        timeoutMs,
        database: apiPlan.managedEnvironment?.database ?? 'external: caller-declared target',
        testMatch: Object.freeze(
            suite === 'auth'
                ? ['**/r1d-auth.smoke.spec.ts']
                : suite === 'stage'
                  ? ['**/r1e-stage.spec.ts']
                  : suite === 'navigation'
                    ? ['**/r2a-navigation.spec.ts']
                    : suite === 'roles'
                      ? ['**/r2b-roles.spec.ts']
                      : suite === 'organizations'
                        ? ['**/r2c-organizations.spec.ts']
                        : suite === 'users'
                          ? ['**/r2d-users.spec.ts']
                          : legacyFiles.map((file) => `**/${file}`)
        )
    });
    // No envfile, childEnv or credentials are exposed in config metadata.
    return { publicPlan, apiEnv, runtime };
}

function resolveBrowserPlan(options) {
    return configure(options).publicPlan;
}

function validateAdminReady({ status, bodyText }) {
    return status >= 200 && status < 300 && typeof bodyText === 'string' && /<app-root(?:\s|>)/i.test(bodyText);
}

function adminChildEnvironment(env, apiOrigin) {
    const child = {};
    for (const name of [
        'PATH',
        'Path',
        'HOME',
        'USERPROFILE',
        'APPDATA',
        'LOCALAPPDATA',
        'SystemRoot',
        'SYSTEMROOT',
        'ComSpec',
        'COMSPEC',
        'TMP',
        'TEMP',
        'TMPDIR',
        'LANG',
        'LC_ALL',
        'PNPM_HOME',
        'COREPACK_HOME',
        'NODE_EXTRA_CA_CERTS',
        'NO_PROXY',
        'no_proxy'
    ]) {
        if (typeof env[name] === 'string') child[name] = env[name];
    }
    return mergeNoProxy({ ...child, POMS_API_PROXY_TARGET: apiOrigin, NX_DAEMON: 'false', NX_TUI: 'false', NG_CLI_ANALYTICS: 'false', CI: 'true' });
}

function resolveNxCli(cwd) {
    const packageFile = require.resolve('nx/package.json', { paths: [cwd] });
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.nx;
    if (typeof bin !== 'string') throw configurationError('installed Nx has no CLI entry');
    const root = path.dirname(packageFile);
    const cli = path.resolve(root, bin);
    const relative = path.relative(root, cli);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !fs.statSync(cli).isFile()) throw configurationError('installed Nx CLI entry is invalid');
    return cli;
}

async function startBrowserServers(options = {}) {
    const { env = process.env } = options;
    const { publicPlan: plan, apiEnv, runtime } = configure(options);
    const stopOperations = [];
    let stopped = false;
    let stopping;
    const stop = async () => {
        if (stopped) return;
        if (stopping) return stopping;
        stopping = (async () => {
            let failure = false;
            for (const operation of [...stopOperations].reverse()) {
                if (operation.done) continue;
                try {
                    await operation.run();
                    operation.done = true;
                } catch {
                    failure = true;
                }
            }
            if (failure) throw new Error('POMS browser owned service cleanup failed');
            stopped = true;
        })();
        try {
            await stopping;
        } finally {
            stopping = undefined;
        }
    };
    try {
        const api = await runtime.startApiServer({ env: apiEnv, cwd: plan.cwd, timeoutMs: plan.timeoutMs });
        stopOperations.push({ run: () => api.stop(), done: false });
        if (api.target.origin !== plan.apiOrigin || api.target.mode !== plan.apiMode) throw configurationError('API target changed during startup');
        const readyUrl = `${plan.adminOrigin}/auth/login`;
        if (plan.adminManaged) {
            const nxCli = options.nxCli ?? resolveNxCli(plan.cwd);
            const childEnv = adminChildEnvironment(env, plan.apiOrigin);
            const handle = await runtime.startOwned({
                kind: 'admin',
                executable: process.execPath,
                args: [nxCli, 'serve', 'poms-admin', ...(plan.suite === 'stage' ? ['--configuration=e2e-stage'] : []), `--port=${plan.adminPort}`, `--host=${plan.adminHost}`],
                cwd: plan.cwd,
                env: childEnv,
                host: plan.adminHost,
                port: plan.adminPort,
                readyUrl,
                timeoutMs: plan.timeoutMs,
                validateReady: validateAdminReady
            });
            stopOperations.push({ run: () => runtime.stopOwned(handle), done: false });
        } else {
            await runtime.waitForReadiness({ url: readyUrl, timeoutMs: plan.timeoutMs, validateReady: validateAdminReady });
        }
        return Object.freeze({ plan, stop });
    } catch (error) {
        try {
            await stop();
        } catch {
            throw new Error('POMS browser startup failed and owned cleanup also failed');
        }
        throw error;
    }
}

module.exports = { mergeNoProxy, resolveBrowserPlan, startBrowserServers, validateAdminReady };
