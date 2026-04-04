import { defineConfig } from '@playwright/test';

// ── Proxy isolation ──────────────────────────────────────────────────────────
// On developer machines HTTP_PROXY / HTTPS_PROXY may be set (e.g. Clash at
// localhost:7897) without a matching NO_PROXY entry for loopback addresses.
// Playwright's webServer readiness probe sends an HTTP request to the target
// URL; if that request travels through the system proxy instead of hitting
// 127.0.0.1 directly the proxy returns a spurious response and Playwright
// incorrectly concludes "the port is already used" — even when nothing is
// listening there.  Fix: extend NO_PROXY to include localhost/127.0.0.1 for
// this process (and every child process it spawns).
{
    const existing = (process.env['NO_PROXY'] ?? process.env['no_proxy'] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const merged = [...new Set(['localhost', '127.0.0.1', ...existing])].join(',');
    process.env['NO_PROXY'] = merged;
    process.env['no_proxy'] = merged; // some libs only check lowercase
}
// ─────────────────────────────────────────────────────────────────────────────

const useExternalAdminServer = process.env['POMS_ADMIN_BASE_URL'] !== undefined;
const useExternalApiServer = process.env['POMS_API_BASE_URL'] !== undefined;
// Use a stable port seed — do NOT derive from process.pid.
// playwright.config.ts is evaluated in both the main process (webServer setup)
// and each worker process (baseURL resolution); if the seed differs between
// them the worker connects to a port the webServer never listened on.
const portSeed = Number(process.env['POMS_E2E_PORT_SEED'] ?? 300);
const adminPort = 4400 + portSeed; // default 4700
const apiPort = 5400 + portSeed;   // default 5700
const adminBaseUrl = process.env['POMS_ADMIN_BASE_URL'] ?? `http://127.0.0.1:${adminPort}`;
const apiBaseUrl = process.env['POMS_API_BASE_URL'] ?? `http://127.0.0.1:${apiPort}`;

const webServers = [];

if (!useExternalApiServer) {
    webServers.push({
        command: `powershell -NoProfile -Command "$env:PORT='${apiPort}'; corepack pnpm nx serve poms-api"`,
        url: `${apiBaseUrl}/api`,
        reuseExistingServer: false,
        timeout: 180_000
    });
}

if (!useExternalAdminServer) {
    webServers.push({
        command: `powershell -NoProfile -Command "$env:POMS_API_PROXY_TARGET='${apiBaseUrl}'; corepack pnpm nx serve poms-admin --port=${adminPort} --host=127.0.0.1"`,
        url: `${adminBaseUrl}/auth/login`,
        reuseExistingServer: false,
        timeout: 180_000
    });
}

export default defineConfig({
    testDir: './src',
    fullyParallel: false,
    timeout: 60_000,
    expect: {
        timeout: 10_000
    },
    outputDir: '../../dist/playwright/poms-admin-e2e/results',
    reporter: [
        ['list'],
        ['html', { open: 'never', outputFolder: '../../dist/playwright/poms-admin-e2e/report' }]
    ],
    use: {
        baseURL: adminBaseUrl,
        channel: 'chromium',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off'
    },
    webServer: webServers
});
