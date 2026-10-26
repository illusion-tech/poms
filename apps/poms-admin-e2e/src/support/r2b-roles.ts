import { randomUUID } from 'node:crypto';
import { type BrowserContext, test as base, expect, type Page, type Response } from '@playwright/test';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R2B E2E only: guarded synthetic fixtures, no production dependency.
import { type FixtureAction, type FixtureBackend, type FixtureResponse, type FixtureRoleSlot, fixtureCredentials, fixtureRequestIdentity } from '../../../../tools/rust-r2b/fixture-protocol.cjs';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R2B E2E only: single reviewed stdin fixture transport.
import { invokeFixture } from '../../../../tools/rust-r2b/invoke-fixture.cjs';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R2B fixed role creation intent.
import { roleFixtureSpec } from '../../../../tools/rust-r2b/role-fixture-spec.cjs';

export interface RolesRun {
    runId: string;
    backend: FixtureBackend;
    page: Page;
    verification: Record<string, unknown>;
    login(page: Page, account: 'admin' | 'viewer'): Promise<void>;
    viewer(): Promise<Page>;
    fixture(action: FixtureAction, slot?: FixtureRoleSlot): Promise<FixtureResponse>;
    snapshot(page: Page, account: 'admin' | 'viewer'): Promise<NonNullable<FixtureResponse['snapshot']>>;
    screenshot(name: string): Promise<void>;
}
export function roleResponse(page: Page, route: string, method = 'GET'): Promise<Response> {
    return page.waitForResponse((response) => new URL(response.url()).pathname === route && response.request().method() === method, { timeout: 20_000 });
}
export async function openRoles(run: RolesRun): Promise<void> {
    const page = run.page;
    const wrapper = page.locator('.layout-wrapper');
    const width = page.viewportSize()?.width ?? 1280;
    const classes = (await wrapper.getAttribute('class')) ?? '';
    if ((width <= 991 && !classes.includes('layout-mobile-active')) || (width > 991 && classes.includes('layout-static-inactive'))) await page.locator('.layout-topbar .menu-button').click();
    const label = page.locator('.layout-menu a > span.layout-menuitem-text').filter({ hasText: /^人员与权限$/ });
    const parent = label.locator('..').locator('..');
    await expect(label).toBeVisible();
    if (!((await parent.getAttribute('class')) ?? '').split(/\s+/).includes('active-menuitem')) await label.click();
    const [roles, permissions] = await Promise.all([roleResponse(page, '/api/platform/roles'), roleResponse(page, '/api/platform/permissions'), page.locator('.layout-menu a[href="/platform/roles"]').click()]);
    expect(roles.status()).toBe(200);
    expect(permissions.status()).toBe(200);
    const dictionary = (await permissions.json()) as { key: string }[];
    expect(dictionary).toHaveLength(37);
    expect(new Set(dictionary.map((p) => p.key)).size).toBe(37);
    await expect(page).toHaveURL((url) => url.pathname === '/platform/roles');
    await expect(page.locator('app-role-list').getByPlaceholder('搜索角色、Key、说明')).toBeVisible();
    if ((await wrapper.getAttribute('class'))?.includes('layout-mobile-active')) await page.locator('.layout-topbar .menu-button').click();
    run.verification['permissionDictionaryCount'] = 37;
}
export async function createRole(run: RolesRun): Promise<{ id: string; key: string; name: string }> {
    const spec = roleFixtureSpec(run.runId, 'ui');
    await run.fixture('role-plan', 'ui');
    await run.page.getByRole('button', { name: '新建角色', exact: true }).click();
    const dialog = run.page.getByRole('dialog', { name: '新建角色', exact: true });
    await dialog.locator('#create-role-key').fill(spec.roleKey);
    await dialog.locator('#create-role-name').fill(spec.name);
    const [response] = await Promise.all([roleResponse(run.page, '/api/platform/roles', 'POST'), dialog.getByRole('button', { name: '创建', exact: true }).click()]);
    // Adopt committed rows before interpreting status; teardown also recovers failures.
    const adopted = await run.fixture('role-adopt', 'ui');
    expect(response.status()).toBe(201);
    const body = (await response.json()) as { id: string; roleKey: string; name: string };
    expect(adopted.role?.roleId).toBe(body.id);
    expect(body.roleKey).toBe(spec.roleKey);
    await expect(dialog).toBeHidden();
    await run.page.getByPlaceholder('搜索角色、Key、说明').fill(spec.roleKey);
    await expect(run.page.locator('tbody tr').filter({ hasText: spec.roleKey })).toHaveCount(1);
    return { id: body.id, key: spec.roleKey, name: spec.name };
}
export async function assignPermissions(run: RolesRun, role: { id: string; key: string; name: string }, keys: string[]): Promise<void> {
    const row = run.page.locator('tbody tr').filter({ hasText: role.key });
    const [detail] = await Promise.all([roleResponse(run.page, `/api/platform/roles/${role.id}`), row.getByRole('button', { name: `分配权限 ${role.name}`, exact: true }).click()]);
    expect(detail.status()).toBe(200);
    const dialog = run.page.getByRole('dialog').filter({ hasText: '选中的权限将全量替换该角色现有权限' });
    const labels = dialog.locator('label').filter({ has: run.page.locator('input[type="checkbox"]') });
    await expect(labels).toHaveCount(37);
    for (const label of await labels.all()) {
        const key = await label.locator('.font-mono').innerText();
        await label.locator('input[type="checkbox"]').setChecked(keys.includes(key));
    }
    const [result] = await Promise.all([roleResponse(run.page, `/api/platform/roles/${role.id}/permissions`, 'PUT'), dialog.getByRole('button', { name: '保存', exact: true }).click()]);
    expect(result.status()).toBe(200);
    await expect(dialog).toBeHidden();
}
export async function toggleRole(run: RolesRun, role: { id: string; key: string; name: string }, active: boolean): Promise<void> {
    const row = run.page.locator('tbody tr').filter({ hasText: role.key });
    const [result] = await Promise.all([roleResponse(run.page, `/api/platform/roles/${role.id}:${active ? 'activate' : 'deactivate'}`, 'POST'), row.getByRole('button', { name: `${active ? '启用' : '停用'}角色 ${role.name}`, exact: true }).click()]);
    expect(result.status()).toBe(200);
    await expect(row).toContainText(active ? '启用' : '停用');
}
export const test = base.extend<{ rolesRun: RolesRun }>({
    rolesRun: async ({ browser }, use, info) => {
        const metadata = info.config.metadata['pomsBrowser'] as { suite?: string; stageBackend?: string } | undefined;
        if (metadata?.suite !== 'roles' || !['nest', 'rust'].includes(metadata.stageBackend ?? '')) throw Error('Explicit R2B roles suite/backend required');
        const backend = metadata.stageBackend as FixtureBackend,
            runId = randomUUID(),
            identity = fixtureRequestIdentity(runId);
        const baseURL = info.project.use.baseURL;
        if (!baseURL) throw Error('Explicit admin origin required');
        const contexts: BrowserContext[] = [];
        const fixtureEvents: unknown[] = [],
            observations: unknown[] = [],
            cleanup: unknown[] = [],
            screenshots: unknown[] = [];
        const verification: Record<string, unknown> = {};
        let page: Page | undefined,
            cleanupFailed = false;
        const invoke = async (action: FixtureAction, account: 'admin' | 'viewer' | 'none' = 'none', roleSlot?: FixtureRoleSlot, sessionToken?: string) => {
            const result = await invokeFixture({
                formatVersion: 1,
                runId,
                backend,
                action,
                account,
                ...(roleSlot ? { roleSlot } : {}),
                ...(sessionToken ? { sessionToken } : {})
            });
            fixtureEvents.push({ action, matched: result.matched, changed: result.changed, state: result.state });
            return result;
        };
        async function newPage() {
            const context = await browser.newContext({
                baseURL,
                viewport: { width: 1280, height: 900 },
                userAgent: identity.userAgent,
                extraHTTPHeaders: { 'x-request-id': identity.requestId }
            });
            contexts.push(context);
            context.on('response', (response) => {
                const url = new URL(response.url());
                if (url.pathname === '/api' || url.pathname.startsWith('/api/')) observations.push({ operation: `${response.request().method()} ${url.pathname}`, status: response.status() });
            });
            return context.newPage();
        }
        async function screenshot(name: string) {
            if (!page || page.isClosed()) return;
            const metrics = await page.evaluate(() => ({
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                knownPrimeUiLicense: document.body.innerText.includes('Invalid PrimeUI License')
            }));
            const file = info.outputPath(`${name}.png`);
            await page.screenshot({ path: file, fullPage: false });
            await info.attach(name, { path: file, contentType: 'image/png' });
            screenshots.push({ name, viewport: page.viewportSize(), ...metrics });
        }
        try {
            await invoke('prepare');
            page = await newPage();
            const run: RolesRun = {
                runId,
                backend,
                page,
                verification,
                viewer: newPage,
                screenshot,
                fixture: (action, slot) => invoke(action, 'none', slot),
                async login(target, account) {
                    const credentials = fixtureCredentials(runId, account);
                    await target.goto('/auth/login', { waitUntil: 'domcontentloaded' });
                    await target.getByLabel('用户名', { exact: true }).fill(credentials.username);
                    await target.getByLabel('密码', { exact: true }).fill(credentials.password);
                    const [auth, navigation] = await Promise.all([roleResponse(target, '/api/auth/sessions', 'POST'), roleResponse(target, '/api/me/navigation'), target.getByRole('button', { name: '登录', exact: true }).click()]);
                    expect(auth.status()).toBe(200);
                    expect(navigation.status()).toBe(200);
                    await expect(target).toHaveURL((url) => url.pathname === '/dashboard');
                    expect(await target.evaluate(() => Object.hasOwn(window, '__POMS_R1E_STAGE__'))).toBe(false);
                },
                async snapshot(target, account) {
                    const token = (await target.context().cookies(new URL('/api', baseURL).href)).find((cookie) => cookie.name === 'poms_session')?.value;
                    if (!token) throw Error('Real session required');
                    const result = await invoke('snapshot', account, undefined, token);
                    if (!result.snapshot) throw Error('Snapshot absent');
                    return result.snapshot;
                }
            };
            await use(run);
        } finally {
            if (info.status !== info.expectedStatus)
                try {
                    await screenshot('roles-failure');
                } catch {
                    /* evidence remains in report */
                }
            for (const context of contexts)
                try {
                    await context.close();
                } catch {
                    cleanupFailed = true;
                }
            for (let pass = 0; pass < 2; pass++)
                try {
                    const result = await invoke('cleanup');
                    cleanup.push(result);
                    expect(result.state).toBe('cleaned');
                    if (pass === 1) {
                        expect(result.matched).toBe(0);
                        expect(result.changed).toBe(0);
                    }
                } catch {
                    cleanupFailed = true;
                }
            await info.attach('r2b-roles-sanitized-evidence', {
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
                            observationBoundary: 'Only implemented health/auth/navigation/role operations are acceptance; other original-app requests are observations.',
                            fixtureEvents,
                            cleanup,
                            cleanupPassed: !cleanupFailed,
                            screenshots
                        },
                        null,
                        2
                    )
                )
            });
        }
        if (cleanupFailed) throw Error('R2B cleanup failed; preserve journal');
    }
});
export { expect } from '@playwright/test';
