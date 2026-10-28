import { randomUUID } from 'node:crypto';
import { test as base, expect, type Page, type Response } from '@playwright/test';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R2D E2E: reviewed run-owned fixture protocol only.
import { type FixtureAction, type FixtureBackend, type FixtureJournal, type FixtureResponse, type FixtureUserSlot, fixtureCredentials, fixtureRequestIdentity } from '../../../../tools/rust-r2d/fixture-protocol.cjs';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R2D E2E: guarded stdin transport, never direct database access.
import { invokeFixture } from '../../../../tools/rust-r2d/invoke-fixture.cjs';

export interface UsersRun {
    runId: string;
    backend: FixtureBackend;
    page: Page;
    owned: FixtureJournal;
    verification: Record<string, unknown>;
    login(): Promise<void>;
    fixture(action: FixtureAction, userSlot?: FixtureUserSlot): Promise<FixtureResponse>;
    access(allowed: boolean): Promise<FixtureResponse>;
    screenshot(name: string): Promise<void>;
}
export function userResponse(page: Page, path: string, method = 'GET'): Promise<Response> {
    return page.waitForResponse((response) => new URL(response.url()).pathname === path && response.request().method() === method, { timeout: 20_000 });
}
export async function openUsers(run: UsersRun): Promise<void> {
    const [users, roles, orgs] = await Promise.all([
        userResponse(run.page, '/api/platform/users'),
        userResponse(run.page, '/api/platform/roles'),
        userResponse(run.page, '/api/platform/org-units'),
        run.page.goto('/platform/users', { waitUntil: 'domcontentloaded' })
    ]);
    for (const response of [users, roles, orgs]) expect(response.status()).toBe(200);
    await expect(run.page.getByPlaceholder('搜索用户、用户名、组织')).toBeVisible();
}
export async function userAction(run: UsersRun, username: string, label: string): Promise<void> {
    await run.page.getByPlaceholder('搜索用户、用户名、组织').fill(username);
    const row = run.page.locator('tbody tr').filter({ hasText: username });
    await expect(row).toHaveCount(1);
    await row.getByRole('button').click();
    await run.page.getByRole('menuitem', { name: label, exact: true }).click();
}
export const test = base.extend<{ usersRun: UsersRun }>({
    usersRun: async ({ browser }, use, info) => {
        const metadata = info.config.metadata['pomsBrowser'] as { suite?: string; stageBackend?: string } | undefined;
        if (metadata?.suite !== 'users' || !['nest', 'rust'].includes(metadata.stageBackend ?? '')) throw Error('Explicit R2D users suite/backend required');
        const backend = metadata.stageBackend as FixtureBackend,
            runId = randomUUID(),
            identity = fixtureRequestIdentity(runId);
        const baseURL = info.project.use.baseURL;
        if (!baseURL) throw Error('Explicit admin origin required');
        const events: unknown[] = [],
            observations: unknown[] = [],
            cleanups: unknown[] = [],
            screenshots: unknown[] = [];
        const verification: Record<string, unknown> = {};
        const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 }, userAgent: identity.userAgent, extraHTTPHeaders: { 'x-request-id': identity.requestId } });
        context.setDefaultTimeout(20_000);
        context.setDefaultNavigationTimeout(30_000);
        const page = await context.newPage();
        page.setDefaultTimeout(20_000);
        page.setDefaultNavigationTimeout(30_000);
        let cleanupFailed = false;
        context.on('response', (response) => {
            const url = new URL(response.url());
            if (url.pathname.startsWith('/api/')) observations.push({ operation: `${response.request().method()} ${url.pathname}`, status: response.status() });
        });
        const invoke = async (action: FixtureAction, userSlot?: FixtureUserSlot) => {
            const result = await invokeFixture({ formatVersion: 1, runId, backend, action, account: action.startsWith('permissions-') ? 'admin' : 'none', ...(userSlot ? { userSlot } : {}) });
            events.push({ action, userSlot, state: result.state, matched: result.matched, changed: result.changed });
            return result;
        };
        async function screenshot(name: string) {
            if (page.isClosed()) return;
            const metrics = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, knownPrimeUiLicense: document.body.innerText.includes('Invalid PrimeUI License') }));
            const path = info.outputPath(`${name}.png`);
            await page.screenshot({ path, fullPage: false });
            await info.attach(name, { path, contentType: 'image/png' });
            screenshots.push({ name, viewport: page.viewportSize(), ...metrics });
        }
        try {
            const prepared = await invoke('prepare');
            if (!prepared.fixture) throw Error('Prepared fixture ownership absent');
            await use({
                runId,
                backend,
                page,
                owned: prepared.fixture,
                verification,
                fixture: invoke,
                access: (allowed) => invoke(allowed ? 'permissions-default' : 'permissions-none'),
                screenshot,
                async login() {
                    const credentials = fixtureCredentials(runId, 'admin');
                    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
                    await page.getByLabel('用户名', { exact: true }).fill(credentials.username);
                    await page.getByLabel('密码', { exact: true }).fill(credentials.password);
                    const [auth, navigation] = await Promise.all([userResponse(page, '/api/auth/sessions', 'POST'), userResponse(page, '/api/me/navigation'), page.getByRole('button', { name: '登录', exact: true }).click()]);
                    expect(auth.status()).toBe(200);
                    expect(navigation.status()).toBe(200);
                    await expect.poll(() => new URL(page.url()).pathname).toBe('/dashboard');
                    expect(await page.evaluate(() => Object.hasOwn(window, '__POMS_R1E_STAGE__'))).toBe(false);
                }
            });
        } finally {
            if (info.status !== info.expectedStatus)
                try {
                    await screenshot('users-failure');
                } catch {
                    /* preserve other receipts */
                }
            try {
                verification['finalFacts'] = (await invoke('facts')).facts;
            } catch {
                cleanupFailed = true;
            }
            try {
                await context.close();
            } catch {
                cleanupFailed = true;
            }
            for (let pass = 0; pass < 2; pass++)
                try {
                    const result = await invoke('cleanup');
                    cleanups.push(result);
                    expect(result.state).toBe('cleaned');
                    if (pass === 1) {
                        expect(result.matched).toBe(0);
                        expect(result.changed).toBe(0);
                    }
                } catch {
                    cleanupFailed = true;
                }
            await info.attach('r2d-users-sanitized-evidence', {
                contentType: 'application/json',
                body: Buffer.from(
                    JSON.stringify(
                        {
                            formatVersion: 1,
                            runId,
                            backend,
                            os: process.platform,
                            nodeVersion: process.version,
                            browserVersion: browser.version(),
                            testStatus: info.status,
                            usedBridge: false,
                            routeMocks: false,
                            verification,
                            observations,
                            observationBoundary: 'R2D and previously delivered auth/navigation/role/org operations are acceptance. R2G external-identity panel failures remain actual observations.',
                            events,
                            cleanups,
                            cleanupPassed: !cleanupFailed,
                            screenshots
                        },
                        null,
                        2
                    )
                )
            });
        }
        if (cleanupFailed) throw Error('R2D cleanup or final facts failed; preserve run journal');
    }
});
export { expect } from '@playwright/test';
