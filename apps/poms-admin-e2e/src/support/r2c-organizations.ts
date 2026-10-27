import { randomUUID } from 'node:crypto';
import { type BrowserContext, test as base, expect, type Page, type Response } from '@playwright/test';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R2C E2E only: guarded synthetic fixtures, no production dependency.
import { type FixtureAction, type FixtureBackend, type FixtureResponse, type FixtureOrgSlot, fixtureCredentials, fixtureRequestIdentity } from '../../../../tools/rust-r2c/fixture-protocol.cjs';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R2C E2E only: single reviewed stdin fixture transport.
import { invokeFixture } from '../../../../tools/rust-r2c/invoke-fixture.cjs';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R2C fixed role creation intent.
import { orgFixtureSpec } from '../../../../tools/rust-r2c/org-fixture-spec.cjs';

export interface OrganizationsRun {
    runId: string;
    backend: FixtureBackend;
    page: Page;
    verification: Record<string, unknown>;
    login(page: Page, account: 'admin' | 'viewer'): Promise<void>;
    viewer(): Promise<Page>;
    setAccess(account: 'admin' | 'viewer', allowed: boolean): Promise<FixtureResponse>;
    fixture(action: FixtureAction, slot?: FixtureOrgSlot, parentSlot?: FixtureOrgSlot): Promise<FixtureResponse>;
    snapshot(page: Page, account: 'admin' | 'viewer'): Promise<NonNullable<FixtureResponse['snapshot']>>;
    screenshot(name: string): Promise<void>;
}
export function orgResponse(page: Page, route: string, method = 'GET'): Promise<Response> {
    return page.waitForResponse((response) => new URL(response.url()).pathname === route && response.request().method() === method, { timeout: 20_000 });
}
export interface Organization {
    id: string;
    code: string;
    name: string;
    slot: FixtureOrgSlot;
}
export async function openOrganizations(run: OrganizationsRun): Promise<void> {
    const page = run.page,
        wrapper = page.locator('.layout-wrapper');
    const width = page.viewportSize()?.width ?? 1280,
        classes = (await wrapper.getAttribute('class')) ?? '';
    if ((width <= 991 && !classes.includes('layout-mobile-active')) || (width > 991 && classes.includes('layout-static-inactive'))) await page.locator('.layout-topbar .menu-button').click();
    const label = page.locator('.layout-menu a > span.layout-menuitem-text').filter({ hasText: /^组织架构$/ });
    const parent = label.locator('..').locator('..');
    await expect(label).toBeVisible();
    if (!((await parent.getAttribute('class')) ?? '').split(/\s+/).includes('active-menuitem')) await label.click();
    const [flat, tree] = await Promise.all([orgResponse(page, '/api/platform/org-units'), orgResponse(page, '/api/platform/org-unit-tree'), page.locator('.layout-menu a[href="/platform/org-units"]').click()]);
    expect(flat.status()).toBe(200);
    expect(tree.status()).toBe(200);
    await expect.poll(() => new URL(page.url()).pathname).toBe('/platform/org-units');
    await expect(page.getByPlaceholder('搜索组织名称或编码')).toBeVisible();
    if ((await wrapper.getAttribute('class'))?.includes('layout-mobile-active')) await page.locator('.layout-topbar .menu-button').click();
}
export async function createOrganization(run: OrganizationsRun, slot: FixtureOrgSlot, parent?: Organization): Promise<Organization> {
    const spec = orgFixtureSpec(run.runId, slot);
    await run.fixture('org-plan', slot, parent?.slot);
    await run.page.getByRole('button', { name: '新建组织', exact: true }).click();
    const dialog = run.page.getByRole('dialog', { name: '新建组织', exact: true });
    await dialog.getByLabel('新建组织名称', { exact: true }).fill(spec.name);
    await dialog.getByLabel('新建组织编码', { exact: true }).fill(spec.code);
    if (parent) await dialog.getByLabel('新建组织上级组织', { exact: true }).selectOption({ label: parent.name });
    await dialog.getByLabel('新建组织排序', { exact: true }).fill(String(spec.displayOrder));
    const [response] = await Promise.all([orgResponse(run.page, '/api/platform/org-units', 'POST'), dialog.getByRole('button', { name: '创建', exact: true }).click()]);
    expect(response.status()).toBe(201);
    const body = (await response.json()) as { id: string; code: string; name: string };
    const adopted = await run.fixture('org-adopt', slot);
    expect(adopted.org?.orgId).toBe(body.id);
    expect(body.code).toBe(spec.code);
    await expect(dialog).toBeHidden();
    return { id: body.id, code: spec.code, name: spec.name, slot };
}
export async function organizationRow(run: OrganizationsRun, organization: Organization) {
    await run.page.getByPlaceholder('搜索组织名称或编码').fill(organization.code);
    const row = run.page.locator('tbody tr').filter({ hasText: organization.code });
    await expect(row).toHaveCount(1);
    return row;
}
export async function toggleOrganization(run: OrganizationsRun, organization: Organization, active: boolean, status = 200): Promise<void> {
    const row = await organizationRow(run, organization);
    const [response] = await Promise.all([orgResponse(run.page, `/api/platform/org-units/${organization.id}:${active ? 'activate' : 'deactivate'}`, 'POST'), row.getByRole('button', { name: active ? '启用组织' : '停用组织', exact: true }).click()]);
    expect(response.status()).toBe(status);
    if (status === 200) await expect(row.locator('p-tag')).toHaveText(active ? '启用' : '停用');
}
export const test = base.extend<{ organizationsRun: OrganizationsRun }>({
    organizationsRun: async ({ browser }, use, info) => {
        const metadata = info.config.metadata['pomsBrowser'] as { suite?: string; stageBackend?: string } | undefined;
        if (metadata?.suite !== 'organizations' || !['nest', 'rust'].includes(metadata.stageBackend ?? '')) throw Error('Explicit R2C organizations suite/backend required');
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
        const invoke = async (action: FixtureAction, account: 'admin' | 'viewer' | 'none' = 'none', orgSlot?: FixtureOrgSlot, sessionToken?: string, parentSlot?: FixtureOrgSlot) => {
            const started = performance.now();
            const result = await invokeFixture({
                formatVersion: 1,
                runId,
                backend,
                action,
                account,
                ...(orgSlot ? { orgSlot } : {}),
                ...(parentSlot ? { parentSlot } : {}),
                ...(sessionToken ? { sessionToken } : {})
            });
            fixtureEvents.push({ action, orgSlot, elapsedMs: Math.round(performance.now() - started), matched: result.matched, changed: result.changed, state: result.state });
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
            const run: OrganizationsRun = {
                runId,
                backend,
                page,
                verification,
                viewer: newPage,
                setAccess: (account, allowed) => invoke(allowed ? 'restore' : 'permissions-none', account),
                screenshot,
                fixture: (action, slot, parentSlot) => invoke(action, 'none', slot, undefined, parentSlot),
                async login(target, account) {
                    const credentials = fixtureCredentials(runId, account);
                    await target.goto('/auth/login', { waitUntil: 'domcontentloaded' });
                    await target.getByLabel('用户名', { exact: true }).fill(credentials.username);
                    await target.getByLabel('密码', { exact: true }).fill(credentials.password);
                    const [auth, navigation] = await Promise.all([orgResponse(target, '/api/auth/sessions', 'POST'), orgResponse(target, '/api/me/navigation'), target.getByRole('button', { name: '登录', exact: true }).click()]);
                    expect(auth.status()).toBe(200);
                    expect(navigation.status()).toBe(200);
                    // SPA route readiness is proved by its URL and real navigation
                    // response; a predicate toHaveURL also waits for window load.
                    await expect.poll(() => new URL(target.url()).pathname).toBe('/dashboard');
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
                    await screenshot('organizations-failure');
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
            await info.attach('r2c-organizations-sanitized-evidence', {
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
                            observationBoundary: 'Only implemented health/auth/navigation/organization operations are acceptance; other original-app requests are observations.',
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
        if (cleanupFailed) throw Error('R2C cleanup failed; preserve journal');
    }
});
export { expect } from '@playwright/test';
