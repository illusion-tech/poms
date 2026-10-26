import { defineConfig } from '@playwright/test';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R1D E1: this E2E entry reuses the single owned-process test tool; root tools is not a production library.
import { mergeNoProxy, resolveBrowserPlan } from '../../tools/e2e/admin-launcher.cjs';

const plan = resolveBrowserPlan();
const isolatedProxy = mergeNoProxy(process.env);
process.env['NO_PROXY'] = isolatedProxy['NO_PROXY'];
process.env['no_proxy'] = isolatedProxy['no_proxy'];

export default defineConfig({
    testDir: './src',
    testMatch: [...plan.testMatch],
    globalSetup: './src/support/server-setup.ts',
    fullyParallel: false,
    workers: 1,
    timeout: plan.suite === 'stage' || plan.suite === 'navigation' || plan.suite === 'roles' ? 180_000 : 60_000,
    expect: { timeout: 10_000 },
    outputDir: '../../dist/playwright/poms-admin-e2e/results',
    reporter: [['list'], ['html', { open: 'never', outputFolder: '../../dist/playwright/poms-admin-e2e/report' }]],
    metadata: { pomsBrowser: { mode: plan.apiMode, suite: plan.suite, stageBackend: plan.stageBackend, adminOrigin: plan.adminOrigin, apiOrigin: plan.apiOrigin, database: plan.database } },
    use: {
        baseURL: plan.adminOrigin,
        channel: 'chromium',
        // A trace contains request credentials; auth evidence is sanitized.
        trace: plan.suite === 'legacy' ? 'retain-on-failure' : 'off',
        screenshot: 'only-on-failure',
        video: 'off'
    }
});
