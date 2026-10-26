import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test as base, type BrowserContext, type Page, type Response, type TestInfo } from '@playwright/test';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R2A E2E only: reuse the reviewed guarded fixture protocol; no production dependency or second runner.
import { fixtureCredentials, fixtureRequestIdentity, type FixtureAuditSnapshot, type FixtureBackend, type FixtureResponse, type NavigationSummarySnapshot } from '../../../../tools/rust-r2a/fixture-protocol.cjs';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R2A E2E only: the single fixture invoker owns stdin transport and sanitized failures.
import { invokeFixture } from '../../../../tools/rust-r2a/invoke-fixture.cjs';

type Account = 'admin' | 'viewer';
type GoldenId = 'authority-all-permissions' | 'authority-shell-org' | 'authority-shell-org-and-sync';
interface OriginalGolden {
    original: { fullTree: unknown[]; snapshot: NavigationSummarySnapshot; cases: { id: string; permissions: string[]; expectedTree: unknown[] }[] };
}
export const golden = JSON.parse(readFileSync(path.resolve(__dirname, '../../../../tools/rust-r2a/navigation-golden.json'), 'utf8')) as OriginalGolden;

interface OperationObservation {
    operation: string;
    status: number;
}
interface Verification {
    meCases: string[];
    fullTree?: boolean;
    search?: boolean;
    refresh?: boolean;
    syncSummary?: NavigationSummarySnapshot;
    insertedAudit?: FixtureAuditSnapshot;
    forbiddenFetch?: { status: number; code: string | null };
    andMenuVisible?: boolean;
}
export interface NavigationRun {
    readonly runId: string;
    readonly backend: FixtureBackend;
    readonly page: Page;
    readonly identity: Readonly<{ requestId: string; userAgent: string }>;
    readonly verification: Verification;
    login(account: Account, expected: GoldenId): Promise<{ userId: string }>;
    snapshot(account: Account): Promise<NonNullable<FixtureResponse['snapshot']>>;
    enableAndPermissions(): Promise<void>;
    screenshot(name: string): Promise<void>;
    mark(mechanism: string): void;
}

const implemented = new Set([
    'GET /api',
    'GET /api/health',
    'GET /api/health/readiness',
    'GET /api/auth/session',
    'GET /api/auth/csrf-token',
    'POST /api/auth/sessions',
    'POST /api/auth/session:logout',
    'GET /api/me/navigation',
    'GET /api/platform/navigation',
    'POST /api/platform/navigation:sync'
]);

export function navigationResponse(page: Page, requestPath: '/api/me/navigation' | '/api/platform/navigation' | '/api/platform/navigation:sync', method = 'GET'): Promise<Response> {
    return page.waitForResponse((response) => new URL(response.url()).pathname === requestPath && response.request().method() === method, { timeout: 20_000 });
}

export function expectedTree(id: GoldenId): unknown[] {
    const item = golden.original.cases.find((item) => item.id === id);
    if (!item) throw new Error('Missing original TypeScript browser oracle case');
    return item.expectedTree;
}

export async function assertMeNavigation(run: NavigationRun, response: Response, id: GoldenId): Promise<void> {
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(expectedTree(id));
    run.verification.meCases.push(id);
}

export async function showSidebar(page: Page): Promise<void> {
    const wrapper = page.locator('.layout-wrapper');
    await expect(wrapper).toBeVisible();
    const width = page.viewportSize()?.width ?? 1280;
    const classes = (await wrapper.getAttribute('class')) ?? '';
    if ((width <= 991 && !classes.includes('layout-mobile-active')) || (width > 991 && classes.includes('layout-static-inactive'))) {
        await page.locator('.layout-topbar .menu-button').click();
        if (width <= 991) await expect(wrapper).toHaveClass(/layout-mobile-active/);
    }
}

export async function expandMenuGroup(run: NavigationRun, title: '系统治理' | '组织架构'): Promise<void> {
    await showSidebar(run.page);
    const label = run.page.locator('.layout-menu a > span.layout-menuitem-text').filter({ hasText: new RegExp(`^${title}$`) });
    const item = label.locator('..').locator('..');
    await expect(label).toBeVisible();
    // A clipped submenu can retain a bounding box. The component's host class,
    // rather than its child's isVisible(), is the actual expansion state.
    if (!((await item.getAttribute('class')) ?? '').split(/\s+/).includes('active-menuitem')) await label.click({ timeout: 10_000 });
    await expect(item).toHaveClass(/\bactive-menuitem\b/);
    run.mark('actual-parent-menu-expansion');
}

export async function openGovernance(run: NavigationRun): Promise<void> {
    const { page } = run;
    run.mark('phase:governance-expand-parent');
    await expandMenuGroup(run, '系统治理');
    const link = page.locator('.layout-menu a[href="/platform/navigation"]');
    await expect(link.getByText('导航菜单', { exact: true })).toBeVisible();
    run.mark('phase:governance-click-and-read');
    run.mark('actual-menu-navigation');
    const [result] = await Promise.all([navigationResponse(page, '/api/platform/navigation'), link.click({ timeout: 10_000 })]);
    expect(result.status()).toBe(200);
    expect(await result.json()).toEqual(golden.original.fullTree);
    await expect(page).toHaveURL((url) => url.pathname === '/platform/navigation');
    await expect(page.locator('app-navigation-governance').getByRole('columnheader', { name: '导航项', exact: true })).toBeVisible();
    if ((await page.locator('.layout-wrapper').getAttribute('class'))?.includes('layout-mobile-active')) await page.locator('.layout-topbar .menu-button').click();
    run.verification.fullTree = true;
    run.mark('phase:governance-read-complete');
}

function backend(info: TestInfo): FixtureBackend {
    const metadata = info.config.metadata['pomsBrowser'] as { suite?: unknown; stageBackend?: unknown } | undefined;
    if (metadata?.suite !== 'navigation' || (metadata.stageBackend !== 'nest' && metadata.stageBackend !== 'rust')) throw new Error('Explicit navigation suite and backend metadata are required');
    return metadata.stageBackend;
}

export const test = base.extend<{ navigationRun: NavigationRun }>({
    navigationRun: async ({ browser }, use, info) => {
        const runId = randomUUID();
        const target = backend(info);
        const identity = fixtureRequestIdentity(runId);
        const baseURL = info.project.use.baseURL;
        if (!baseURL) throw new Error('Explicit navigation admin origin is required');
        const fixtureEvents: { action: string; matched: number; changed: number; state: string }[] = [];
        const observations: OperationObservation[] = [];
        const outside = new Map<string, OperationObservation>();
        const mechanisms = new Set<string>();
        const phases: string[] = [];
        const verification: Verification = { meCases: [] };
        const screenshots: { name: string; width: number; height: number; clientWidth: number; scrollWidth: number; knownPrimeUiLicense: boolean }[] = [];
        const cleanup: { state: string; matched: number; changed: number }[] = [];
        let context: BrowserContext | undefined;
        let page: Page | undefined;
        let cleanupFailed = false;
        const fixture = async (action: 'prepare' | 'cleanup' | 'snapshot' | 'permissions-and-full', account: Account | 'none' = 'none', sessionToken?: string) => {
            const result = await invokeFixture({ formatVersion: 1, runId, backend: target, action, account, ...(sessionToken === undefined ? {} : { sessionToken }) });
            fixtureEvents.push({ action, matched: result.matched, changed: result.changed, state: result.state });
            return result;
        };
        const capture = async (name: string) => {
            if (!page || page.isClosed()) return;
            const metrics = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, knownPrimeUiLicense: document.body.innerText.includes('Invalid PrimeUI License') }));
            const viewport = page.viewportSize();
            if (!viewport) throw new Error('Fixed navigation viewport is required');
            const file = info.outputPath(`${name}.png`);
            await page.screenshot({ path: file, fullPage: false });
            await info.attach(name, { path: file, contentType: 'image/png' });
            screenshots.push({ name, width: viewport.width, height: viewport.height, ...metrics });
            mechanisms.add('readonly-layout-observation');
        };
        try {
            const prepared = await fixture('prepare');
            expect(prepared.state).toBe('prepared');
            context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 }, userAgent: identity.userAgent, extraHTTPHeaders: { 'x-request-id': identity.requestId } });
            context.on('response', (response) => {
                const url = new URL(response.url());
                if (!(url.pathname === '/api' || url.pathname.startsWith('/api/'))) return;
                const observation = { operation: `${response.request().method()} ${url.pathname}`, status: response.status() };
                if (implemented.has(observation.operation)) observations.push(observation);
                else outside.set(`${observation.operation} ${observation.status}`, observation);
            });
            page = await context.newPage();
            const runPage = page;
            const runContext = context;
            const run: NavigationRun = {
                runId,
                backend: target,
                page,
                identity,
                verification,
                mark(name) {
                    mechanisms.add(name);
                    if (name.startsWith('phase:')) phases.push(name.slice('phase:'.length));
                },
                async login(account, expected) {
                    const credentials = fixtureCredentials(runId, account);
                    run.mark('phase:login-open-form');
                    await runPage.goto('/auth/login', { waitUntil: 'domcontentloaded' });
                    await expect(runPage.getByRole('heading', { name: '登录', exact: true })).toBeVisible();
                    await runPage.getByLabel('用户名', { exact: true }).fill(credentials.username);
                    await runPage.getByLabel('密码', { exact: true }).fill(credentials.password);
                    run.mark('phase:login-submit-and-read-navigation');
                    mechanisms.add('actual-angular-form-login');
                    const [result, me] = await Promise.all([
                        runPage.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/sessions' && response.request().method() === 'POST', { timeout: 20_000 }),
                        navigationResponse(runPage, '/api/me/navigation'),
                        runPage.getByRole('button', { name: '登录', exact: true }).click({ timeout: 10_000 })
                    ]);
                    expect(result.status()).toBe(200);
                    const data = (await result.json()) as { user?: { id?: unknown; username?: unknown } };
                    if (typeof data.user?.id !== 'string' || data.user.username !== credentials.username) throw new Error('Original Angular login did not return the run-owned user');
                    await assertMeNavigation(run, me, expected);
                    await expect(runPage).toHaveURL((url) => url.pathname === '/dashboard');
                    await expect(runPage.locator('.layout-wrapper')).toBeVisible();
                    expect(await runPage.evaluate(() => navigator.userAgent)).toBe(identity.userAgent);
                    expect(await runPage.evaluate(() => Object.prototype.hasOwnProperty.call(window, '__POMS_R1E_STAGE__'))).toBe(false);
                    run.mark('phase:login-complete');
                    return { userId: data.user.id };
                },
                async snapshot(account) {
                    const cookies = await runContext.cookies(new URL('/api', baseURL).href);
                    const token = cookies.find((cookie) => cookie.name === 'poms_session')?.value;
                    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('A real server-issued session cookie is required for the guarded snapshot');
                    const result = await fixture('snapshot', account, token);
                    if (!result.snapshot) throw new Error('Guarded navigation snapshot was absent');
                    mechanisms.add('guarded-fixture-db-snapshot');
                    return result.snapshot;
                },
                async enableAndPermissions() {
                    const result = await fixture('permissions-and-full', 'viewer');
                    expect(result.state).toBe('permissions-and-full');
                },
                screenshot: capture
            };
            await use(run);
        } finally {
            if (page && info.status !== info.expectedStatus) {
                try {
                    await capture('navigation-failure');
                } catch {
                    mechanisms.add('failure-screenshot-unavailable');
                }
            }
            // Stop browser-owned requests before checking the final database
            // state, so no late page request can recreate a security event.
            try {
                await context?.close();
            } catch {
                cleanupFailed = true;
            }
            for (let pass = 0; pass < 2; pass++) {
                try {
                    const result = await fixture('cleanup');
                    cleanup.push({ state: result.state, matched: result.matched, changed: result.changed });
                    expect(result.state).toBe('cleaned');
                    if (pass === 1) {
                        expect(result.matched).toBe(0);
                        expect(result.changed).toBe(0);
                    }
                } catch {
                    cleanupFailed = true;
                }
            }
            const cleanupPassed = !cleanupFailed && cleanup.length === 2;
            await info.attach('r2a-navigation-sanitized-evidence', {
                contentType: 'application/json',
                body: Buffer.from(
                    JSON.stringify(
                        {
                            formatVersion: 1,
                            runId,
                            backend: target,
                            os: process.platform,
                            nodeVersion: process.version,
                            browserVersion: browser.version(),
                            testStatus: info.status,
                            evidenceKind: mechanisms.has('readonly-same-origin-browser-fetch') ? 'actual-angular-ui-and-browser-http-with-guarded-db-fixture' : 'actual-angular-ui-with-guarded-db-fixture',
                            usedBridge: false,
                            routeMocks: false,
                            mechanisms: [...mechanisms].sort(),
                            phases,
                            lastPhase: phases.at(-1) ?? null,
                            verification,
                            implementedTenOperationObservations: observations,
                            outsideImplemented: [...outside.values()],
                            outsideMeaning: 'observations only; no unimplemented R2/domain success claim',
                            fixtureEvents,
                            cleanup,
                            cleanupPassed,
                            screenshots
                        },
                        null,
                        2
                    )
                )
            });
        }
        if (cleanupFailed) throw new Error('Navigation run cleanup or owned browser context close failed; preserve its journal');
    }
});

export { expect } from '@playwright/test';
