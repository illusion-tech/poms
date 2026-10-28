const fs = require('node:fs');
const path = require('node:path');
const runtime = require('./runtime.cjs');
function suiteFor(mode, value) {
    if (value === undefined) {
        if (mode === 'external') throw new Error('External API mode requires explicit POMS_E2E_SUITE');
        return mode === 'managed-rust' ? 'foundation' : 'nest-full';
    }
    if (!['foundation', 'nest-full'].includes(value)) throw new Error('Invalid POMS_E2E_SUITE');
    if (mode === 'managed-rust' && value !== 'foundation') throw new Error('Rust API supports only the foundation suite');
    return value;
}
function resolveApiPlan({ env = process.env, cwd = process.cwd() } = {}) {
    if (Object.keys(env).some((key) => key.toUpperCase() === 'POMS_E2E_ENV_PROFILE' && key !== 'POMS_E2E_ENV_PROFILE')) throw new Error('Environment profile must use its exact uppercase name');
    const profile = env.POMS_E2E_ENV_PROFILE ?? 'r1d';
    if (!['r1d', 'r1e', 'r2a', 'r2b', 'r2c', 'r2d', 'r2ef'].includes(profile)) throw new Error('Invalid POMS_E2E_ENV_PROFILE');
    const mode = env.POMS_E2E_MODE === undefined ? 'managed-nest' : env.POMS_E2E_MODE;
    if (!['managed-nest', 'managed-rust', 'external'].includes(mode)) throw new Error('Invalid POMS_E2E_MODE');
    const suite = suiteFor(mode, env.POMS_E2E_SUITE);
    if (mode === 'external') return Object.freeze({ target: runtime.resolveTarget({ mode, baseUrl: env.POMS_API_BASE_URL }), suite });
    if (env.POMS_API_BASE_URL !== undefined) throw new Error('Managed API mode conflicts with POMS_API_BASE_URL');
    // Import and call this guard only for managed mode. External needs no local
    // dotenv/DB environment and cannot inherit its filesystem side effects.
    const { loadManagedEnvironment } =
        profile === 'r2ef'
            ? require('../rust-r2ef/managed-environment.cjs')
            : profile === 'r2d'
            ? require('../rust-r2d/managed-environment.cjs')
            : profile === 'r2c'
              ? require('../rust-r2c/managed-environment.cjs')
              : profile === 'r2b'
                ? require('../rust-r2b/managed-environment.cjs')
                : profile === 'r2a'
                  ? require('../rust-r2a/managed-environment.cjs')
                  : profile === 'r1e'
                    ? require('../rust-r1e/managed-environment.cjs')
                    : require('../rust-r1d/managed-environment.cjs');
    const managedEnvironment = loadManagedEnvironment({ mode, env, cwd });
    const target = runtime.resolveTarget({ mode, host: managedEnvironment.host, port: managedEnvironment.port });
    return Object.freeze({ target, suite, managedEnvironment });
}
async function startApiServer({ env = process.env, cwd = process.cwd(), logPath, runId, timeoutMs = 120000 } = {}) {
    const plan = resolveApiPlan({ env, cwd });
    if (!plan.target.managed) {
        await runtime.waitForReadiness({ url: plan.target.readinessUrl, timeoutMs });
        return Object.freeze({ target: plan.target, handle: null, stop: async () => undefined });
    }
    await runtime.assertPortAvailable(plan.target);
    const { childEnv } = plan.managedEnvironment;
    let executable, args;
    if (plan.target.mode === 'managed-nest') {
        const packageFile = require.resolve('nx/package.json', { paths: [cwd] });
        const nxPackage = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
        const bin = typeof nxPackage.bin === 'string' ? nxPackage.bin : nxPackage.bin?.nx;
        if (typeof bin !== 'string') throw new Error('Installed Nx CLI entry is unavailable');
        const nx = path.resolve(path.dirname(packageFile), bin);
        await runtime.runOwnedCommand({ executable: process.execPath, args: [nx, 'run', 'poms-api:build', '--skip-nx-cache'], cwd, env: childEnv, logPath, runId, timeoutMs });
        executable = process.execPath;
        args = [path.join(cwd, 'dist/apps/poms-api/main.js')];
        if (!fs.statSync(args[0]).isFile()) throw new Error('Managed Nest entry is not a regular file');
    } else {
        if (typeof env.POMS_RUST_API_BINARY !== 'string' || !env.POMS_RUST_API_BINARY.trim()) throw new Error('Managed Rust requires POMS_RUST_API_BINARY');
        executable = fs.realpathSync(path.resolve(cwd, env.POMS_RUST_API_BINARY));
        if (!fs.statSync(executable).isFile() || (process.platform === 'win32' && !executable.toLowerCase().endsWith('.exe'))) throw new Error('Managed Rust requires a native executable');
        args = [];
    }
    const handle = await runtime.startOwned({
        kind: plan.target.mode === 'managed-rust' ? 'rust' : 'nest',
        executable,
        args,
        cwd,
        env: childEnv,
        host: plan.target.host,
        port: plan.target.port,
        readyUrl: plan.target.readinessUrl,
        timeoutMs,
        logPath,
        runId
    });
    return Object.freeze({ target: plan.target, handle, stop: () => runtime.stopOwned(handle) });
}
async function startManagedBackend(options = {}) {
    if (resolveApiPlan(options).target.mode === 'external') throw new Error('startManagedBackend requires managed mode');
    return startApiServer(options);
}
module.exports = { resolveApiPlan, startApiServer, startManagedBackend };
