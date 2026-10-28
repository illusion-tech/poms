import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { mergeNoProxy, resolveBrowserPlan } from '../e2e/admin-launcher.cjs';

const plan = resolveBrowserPlan();
const isolated = mergeNoProxy(process.env);
process.env['NO_PROXY'] = isolated['NO_PROXY'];
process.env['no_proxy'] = isolated['no_proxy'];

export default defineConfig({
    testDir: '.',
    testMatch: ['g-browser.spec.ts', 'h-browser.spec.ts'],
    globalSetup: resolve(process.cwd(), 'apps/poms-admin-e2e/src/support/server-setup.ts'),
    fullyParallel: false,
    workers: 1,
    timeout: 600_000,
    expect: { timeout: 15_000 },
    use: { baseURL: plan.adminOrigin, channel: 'chromium', trace: 'off', screenshot: 'only-on-failure', video: 'off' },
    metadata: { backend: plan.stageBackend, mode: plan.apiMode, apiOrigin: plan.apiOrigin, adminOrigin: plan.adminOrigin }
});
