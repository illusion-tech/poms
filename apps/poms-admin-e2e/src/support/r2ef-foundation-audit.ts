import { randomUUID } from 'node:crypto';
import { test as base, expect, type Page, type Response } from '@playwright/test';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R2E/F synthetic run identity only; no direct database access.
import { fixtureCredentials, fixtureRequestIdentity, type FixtureJournal } from '../../../../tools/rust-r2ef/fixture-protocol.cjs';
// eslint-disable-next-line @nx/enforce-module-boundaries -- Root-owned guarded batch transport; this support writes no SQL.
import { invokeBatchFixture, type BatchFixtureAction, type BatchFixtureBackend, type BatchFixtureExtension, type BatchFixtureResponse } from '../../../../tools/rust-r2ef/batch-client.cjs';

export interface FoundationAuditRun {
    runId: string;
    backend: BatchFixtureBackend;
    page: Page;
    owned: FixtureJournal;
    extension: BatchFixtureExtension;
    identity: ReturnType<typeof fixtureRequestIdentity>;
    verification: Record<string, unknown>;
    login(account?: 'admin' | 'viewer'): Promise<void>;
    permissions(account: 'admin' | 'viewer', permissions: string[]): Promise<BatchFixtureResponse>;
    facts(): Promise<BatchFixtureResponse>;
    screenshot(name: string): Promise<void>;
}

export function foundationResponse(page: Page, path: string, method = 'GET'): Promise<Response> {
    return page.waitForResponse((response) => new URL(response.url()).pathname === path && response.request().method() === method, { timeout: 20_000 });
}

export async function browserJson(page: Page, path: string): Promise<{ status: number; body: unknown }> {
    return page.evaluate(async (url) => {
        const response = await fetch(url, { credentials: 'include' });
        return { status: response.status, body: JSON.parse(await response.text()) as unknown };
    }, path);
}

export function recordArray(value: unknown, boundary: string): Record<string, unknown>[] {
    if (!Array.isArray(value) || value.some((row) => row === null || typeof row !== 'object' || Array.isArray(row))) throw Error(`${boundary} did not return object rows`);
    return value as Record<string, unknown>[];
}

export const test = base.extend<{ foundationRun: FoundationAuditRun }>({
    foundationRun: async ({ browser }, use, info) => {
        const metadata = info.config.metadata['pomsBrowser'] as { suite?: string; stageBackend?: string } | undefined;
        if (metadata?.suite !== 'foundation-audit' || !['nest', 'rust'].includes(metadata.stageBackend ?? '')) throw Error('Explicit R2E/F foundation-audit suite/backend required');
        const backend = metadata.stageBackend as BatchFixtureBackend;
        const runId = randomUUID();
        const identity = fixtureRequestIdentity(runId);
        const baseURL = info.project.use.baseURL;
        if (!baseURL) throw Error('Explicit admin origin required');
        const events: unknown[] = [];
        const observations: unknown[] = [];
        const cleanups: unknown[] = [];
        const screenshots: unknown[] = [];
        const verification: Record<string, unknown> = {};
        const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 }, userAgent: identity.userAgent, extraHTTPHeaders: { 'x-request-id': identity.requestId } });
        context.setDefaultTimeout(20_000);
        context.setDefaultNavigationTimeout(30_000);
        const page = await context.newPage();
        let cleanupFailed = false;
        let currentAccount: 'admin' | 'viewer' | null = null;
        context.on('response', (response) => {
            const url = new URL(response.url());
            if (url.pathname.startsWith('/api/')) observations.push({ operation: `${response.request().method()} ${url.pathname}`, status: response.status() });
        });
        const invoke = async (action: BatchFixtureAction, account: 'none' | 'admin' | 'viewer' = 'none', permissions?: string[]) => {
            const result = await invokeBatchFixture({ formatVersion: 1, runId, backend, action, account, ...(permissions === undefined ? {} : { permissions }) });
            expect({ formatVersion: result.formatVersion, runId: result.runId, backend: result.backend, action: result.action }).toEqual({ formatVersion: 1, runId, backend, action });
            events.push({ action, account, state: result.state, matched: result.matched, changed: result.changed });
            return result;
        };
        const screenshot = async (name: string) => {
            if (page.isClosed()) return;
            const metrics = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, knownPrimeUiLicense: document.body.innerText.includes('Invalid PrimeUI License') }));
            const path = info.outputPath(`${name}.png`);
            await page.screenshot({ path, fullPage: false });
            await info.attach(name, { path, contentType: 'image/png' });
            screenshots.push({ name, viewport: page.viewportSize(), ...metrics });
        };
        try {
            const prepared = await invoke('prepare');
            if (!prepared.fixture || !prepared.extension || typeof prepared.extension.createdCode !== 'string') throw Error('Prepared E/F fixture ownership or extension absent');
            await use({
                runId,
                backend,
                page,
                identity,
                owned: prepared.fixture,
                extension: prepared.extension,
                verification,
                facts: () => invoke('facts'),
                permissions: (account, permissions) => invoke('permissions', account, permissions),
                screenshot,
                async login(account = 'admin') {
                    if (currentAccount !== null && currentAccount !== account) await context.clearCookies();
                    const credentials = fixtureCredentials(runId, account);
                    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
                    await page.getByLabel('用户名', { exact: true }).fill(credentials.username);
                    await page.getByLabel('密码', { exact: true }).fill(credentials.password);
                    const [auth, navigation] = await Promise.all([foundationResponse(page, '/api/auth/sessions', 'POST'), foundationResponse(page, '/api/me/navigation'), page.getByRole('button', { name: '登录', exact: true }).click()]);
                    expect(auth.status()).toBe(200);
                    expect(navigation.status()).toBe(200);
                    await expect.poll(() => new URL(page.url()).pathname).toBe('/dashboard');
                    expect(await page.evaluate(() => Object.hasOwn(window, '__POMS_R1E_STAGE__'))).toBe(false);
                    currentAccount = account;
                }
            });
        } finally {
            if (info.status !== info.expectedStatus)
                try {
                    await screenshot('foundation-audit-failure');
                } catch {
                    /* Retain fixture and cleanup receipts even if screenshot fails. */
                }
            try {
                const facts = await invoke('facts');
                verification['finalFacts'] = { audits: facts.extension.audits, securityEvents: facts.extension.securityEvents };
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
            await info.attach('r2ef-foundation-audit-sanitized-evidence', {
                contentType: 'application/json',
                body: Buffer.from(JSON.stringify({
                    formatVersion: 1, runId, backend, os: process.platform, nodeVersion: process.version, browserVersion: browser.version(), testStatus: info.status,
                    routeMocks: false, usedBridge: false,
                    acceptanceBoundary: {
                        originalUi: ['dictionary create/edit/status', 'system setting read/update'],
                        browserHttp: ['GET audit-logs', 'GET audit-logs/targets', 'GET security-events'],
                        frontendPermissionGuard: 'Original route rejection -> recordRouteDenied 202 empty body -> run-owned PG facts',
                        globalAuditSecurityPages: 'No such original Angular pages/routes exist in this source',
                        businessAuditPanel: 'Original lead/customer/project audit panels depend on R3/R4 business reads and are outside this batch'
                    },
                    verification, observations, events, cleanups, cleanupPassed: !cleanupFailed, screenshots
                }, null, 2))
            });
        }
        if (cleanupFailed) throw Error('R2E/F cleanup or final facts failed; preserve the run journal');
    }
});

export { expect } from '@playwright/test';
