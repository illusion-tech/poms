import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { expect, test as base, type BrowserContext, type Page, type Request as BrowserRequest } from '@playwright/test';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R1E: only this E2E helper consumes the guarded, test-only fixture protocol; no production dependency is introduced.
import { fixtureCommand, fixtureCredentials } from '../../../../tools/rust-r1e/fixture-protocol.cjs';

export type StageAccount = 'admin' | 'viewer';
type Action = 'prepare' | 'expire-idle' | 'expire-absolute' | 'revoke' | 'disable' | 'restore' | 'permission' | 'cleanup';
interface Snapshot {
    authenticated: boolean;
    username: string | null;
    permissions: string[];
    navigationCount: number;
    todoCount: number;
    csrfInMemory: boolean;
}
interface Bridge {
    snapshot(): Snapshot;
    logout(variant?: 'normal' | 'wrong-csrf'): Promise<{ status: number; code: string | null; revoked: boolean }>;
    navigate(destination: 'dashboard' | 'attachments' | 'platformUsers' | 'externalOrgSync'): Promise<boolean>;
}
type StageWindow = Window & { __POMS_R1E_STAGE__?: Bridge };
const pageMechanisms = new WeakMap<Page, Set<string>>();

function recordMechanism(page: Page, mechanism: string): void {
    pageMechanisms.get(page)?.add(mechanism);
}

interface FixtureRequest {
    formatVersion: 1;
    runId: string;
    backend: 'nest' | 'rust';
    action: Action;
    account: StageAccount | 'none';
    sessionToken?: string;
}

async function invokeFixture(request: FixtureRequest): Promise<{ matched: number; changed: number }> {
    const cwd = path.resolve(__dirname, '../../../..');
    const command = fixtureCommand({ platform: process.platform, cwd });
    return new Promise((resolve, reject) => {
        const child = spawn(command.executable, command.args, { cwd: command.cwd, env: command.env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let settled = false;
        const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (error) {
                child.kill();
                child.stdin.destroy();
                reject(error);
            }
        };
        const timer = setTimeout(() => {
            child.kill();
            child.stdin.destroy();
            child.stdout.destroy();
            child.stderr.destroy();
            finish(new Error('R1E fixture timed out; its run journal requires cleanup'));
        }, 60_000);
        child.on('error', () => finish(new Error('R1E fixture could not start')));
        child.stdin.on('error', () => finish(new Error('R1E fixture stdin failed')));
        child.stdout.on('data', (chunk: Buffer) => {
            stdout += chunk.toString('utf8');
            if (stdout.length > 32_768) {
                child.kill();
                finish(new Error('R1E fixture returned invalid protocol output'));
            }
        });
        // Never reflect stderr: a tool/library failure may contain connection
        // details. The fixture tool retains its own sanitized evidence.
        child.stderr.resume();
        child.on('close', (code) => {
            if (settled) return;
            if (code !== 0) return finish(new Error('R1E fixture rejected the guarded operation'));
            try {
                const result = JSON.parse(stdout) as Record<string, unknown>;
                if (
                    result['formatVersion'] !== 1 ||
                    result['runId'] !== request.runId ||
                    result['backend'] !== request.backend ||
                    result['action'] !== request.action ||
                    !Number.isSafeInteger(result['matched']) ||
                    !Number.isSafeInteger(result['changed']) ||
                    (result['matched'] as number) < 0 ||
                    (result['changed'] as number) < 0
                )
                    throw new Error('protocol');
                settled = true;
                clearTimeout(timer);
                resolve({ matched: result['matched'] as number, changed: result['changed'] as number });
            } catch {
                finish(new Error('R1E fixture returned invalid protocol output'));
            }
        });
        child.stdin.end(JSON.stringify(request));
    });
}

export async function waitForBridge(page: Page): Promise<void> {
    await page.waitForFunction(() => typeof (window as StageWindow).__POMS_R1E_STAGE__?.snapshot === 'function');
}

export async function snapshot(page: Page): Promise<Snapshot> {
    recordMechanism(page, 'test-bridge-readonly-snapshot');
    await waitForBridge(page);
    return page.evaluate(() => {
        const bridge = (window as StageWindow).__POMS_R1E_STAGE__;
        if (!bridge) throw new Error('R1E stage bootstrap is unavailable');
        return bridge.snapshot();
    });
}

export async function fixedLogout(page: Page, variant: 'normal' | 'wrong-csrf' = 'normal') {
    recordMechanism(page, `test-bridge-fixed-angular-http-logout:${variant}`);
    await waitForBridge(page);
    return page.evaluate((kind) => {
        const bridge = (window as StageWindow).__POMS_R1E_STAGE__;
        if (!bridge) throw new Error('R1E stage bootstrap is unavailable');
        return bridge.logout(kind);
    }, variant);
}

export async function navigate(page: Page, destination: Parameters<Bridge['navigate']>[0]): Promise<void> {
    recordMechanism(page, 'test-bridge-fixed-angular-router-navigation');
    await waitForBridge(page);
    await page.evaluate((target) => {
        const bridge = (window as StageWindow).__POMS_R1E_STAGE__;
        if (!bridge) throw new Error('R1E stage bootstrap is unavailable');
        return bridge.navigate(target);
    }, destination);
}

export async function formLogin(page: Page, credentials: { username: string; password: string }, returnUrl = '/dashboard'): Promise<void> {
    await page.goto(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    await waitForBridge(page);
    await submitLogin(page, credentials);
}

/** Submit the current original form. This deliberately does not reload or
 * replace its already-preserved reason/returnUrl query parameters. */
export async function submitLogin(page: Page, credentials: { username: string; password: string }, expectedStatus: 200 | 401 = 200): Promise<void> {
    recordMechanism(page, `actual-current-login-form-submit:POST-${expectedStatus}`);
    await base.step(`Current Angular login form: actual POST ${expectedStatus}`, async () => {
        await page.getByLabel('用户名').fill(credentials.username);
        await page.getByLabel('密码', { exact: true }).fill(credentials.password);
        const response = page.waitForResponse((result) => new URL(result.url()).pathname === '/api/auth/sessions' && result.request().method() === 'POST');
        await page.getByRole('button', { name: '登录', exact: true }).click();
        const result = await response;
        expect(result.status()).toBe(expectedStatus);
        if (expectedStatus === 200) {
            await expect(page).not.toHaveURL(/\/auth\/login/);
            await expect.poll(async () => (await snapshot(page)).username).toBe(credentials.username);
        } else {
            expect(((await result.json()) as { code?: unknown }).code === 'invalid_credentials').toBe(true);
            await expect(page.getByText('用户名或密码错误，请重试', { exact: true })).toBeVisible();
            expect((await snapshot(page)).authenticated).toBe(false);
        }
    });
}

/** A guard 401 retains Cookie headers. The first actual form submission then
 * fails in GET csrf-token and clears those cookies before any login POST. */
export async function submitRetainedInvalidCookie(page: Page, context: BrowserContext, credentials: { username: string; password: string }, expectedCode: 'session_expired' | 'session_revoked'): Promise<void> {
    recordMechanism(page, `actual-current-login-form-submit:csrf-401-${expectedCode}-no-POST`);
    await base.step('First current-form submission: actual CSRF 401 clears retained Cookie; no login POST', async () => {
        expect((await context.cookies()).some((cookie) => cookie.name === 'poms_session')).toBe(true);
        let loginPosts = 0;
        const observe = (request: BrowserRequest) => {
            if (new URL(request.url()).pathname === '/api/auth/sessions' && request.method() === 'POST') loginPosts++;
        };
        page.on('request', observe);
        try {
            await page.getByLabel('用户名').fill(credentials.username);
            await page.getByLabel('密码', { exact: true }).fill(credentials.password);
            const response = page.waitForResponse((result) => new URL(result.url()).pathname === '/api/auth/csrf-token' && result.request().method() === 'GET');
            await page.getByRole('button', { name: '登录', exact: true }).click();
            const result = await response;
            expect(result.status()).toBe(401);
            expect(((await result.json()) as { code?: unknown }).code === expectedCode).toBe(true);
            await expect(page.getByText('用户名或密码错误，请重试', { exact: true })).toBeVisible();
            expect(loginPosts).toBe(0);
            expect((await context.cookies()).some((cookie) => cookie.name === 'poms_session' || cookie.name === 'poms_csrf')).toBe(false);
        } finally {
            page.off('request', observe);
        }
    });
}

export function menuEntry(page: Page, href: '/dashboard' | '/projects' | '/leads' | '/attachments' | '/platform/users' | '/platform/external-org-sync') {
    return page.locator(`.layout-menu a[href="${href}"]`);
}

export async function topbarLogout(page: Page): Promise<void> {
    recordMechanism(page, 'actual-topbar-logout-click');
    await page.locator('.profile-item > .right-sidebar-button').click();
    const response = page.waitForResponse((result) => new URL(result.url()).pathname === '/api/auth/session:logout' && result.request().method() === 'POST');
    await page.getByText('退出登录', { exact: true }).click();
    expect((await response).status()).toBe(200);
    await expect(page).toHaveURL(/\/auth\/login$/);
    expect((await snapshot(page)).authenticated).toBe(false);
}

export async function sessionToken(context: BrowserContext): Promise<string> {
    const token = (await context.cookies()).find((cookie) => cookie.name === 'poms_session')?.value;
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Expected a real browser-managed session cookie');
    return token;
}

export interface StageHarness {
    runId: string;
    backend: 'nest' | 'rust';
    credentials(account?: StageAccount): { username: string; password: string };
    fixture(action: Action, account?: StageAccount | 'none', token?: string): Promise<void>;
}

const sevenOperations = new Set(['GET /api', 'GET /api/health', 'GET /api/health/readiness', 'GET /api/auth/session', 'GET /api/auth/csrf-token', 'POST /api/auth/sessions', 'POST /api/auth/session:logout']);

export const test = base.extend<{ stage: StageHarness }>({
    stage: async ({ context }, use, testInfo) => {
        const runId = randomUUID();
        const metadata = testInfo.config.metadata['pomsBrowser'] as { stageBackend?: unknown; adminOrigin?: unknown };
        if (metadata?.stageBackend !== 'nest' && metadata?.stageBackend !== 'rust') throw new Error('Stage requires a precise declared fixture backend');
        const backend = metadata.stageBackend;
        await context.setExtraHTTPHeaders({ 'x-request-id': `r1e:${runId}` });
        const mechanisms = new Set<string>();
        for (const page of context.pages()) pageMechanisms.set(page, mechanisms);
        context.on('page', (page) => pageMechanisms.set(page, mechanisms));
        const fixtureEvents: { action: Action; account: StageAccount | 'none'; matched: number; changed: number }[] = [];
        const outsideR1 = new Map<string, { operation: string; status: number }>();
        const r1Responses: { operation: string; status: number }[] = [];
        context.on('response', (response) => {
            const url = new URL(response.url());
            if (url.origin !== metadata.adminOrigin || !url.pathname.startsWith('/api')) return;
            const operation = `${response.request().method()} ${url.pathname}`;
            if (sevenOperations.has(operation)) r1Responses.push({ operation, status: response.status() });
            else outsideR1.set(`${operation} ${response.status()}`, { operation, status: response.status() });
        });
        const stage: StageHarness = {
            runId,
            backend,
            credentials: (account = 'admin') => fixtureCredentials(runId, account),
            async fixture(action, account = 'none', token) {
                const result = await invokeFixture({ formatVersion: 1, runId, backend, action, account, ...(token === undefined ? {} : { sessionToken: token }) });
                fixtureEvents.push({ action, account, ...result });
            }
        };
        let cleanupPassed = false;
        try {
            await stage.fixture('prepare');
            await use(stage);
        } finally {
            try {
                await stage.fixture('cleanup');
                cleanupPassed = true;
            } finally {
                await testInfo.attach('r1e-sanitized-evidence', {
                    contentType: 'application/json',
                    body: Buffer.from(
                        JSON.stringify(
                            {
                                runId,
                                backend,
                                os: process.platform,
                                node: process.version,
                                evidenceKind: testInfo.title.startsWith('Angular interceptor:')
                                    ? 'actual-angular-http-interceptor-with-form-login'
                                    : [...mechanisms].some((value) => value.startsWith('test-bridge-fixed-'))
                                      ? 'mixed-actual-ui-and-fixed-angular-bridge'
                                      : testInfo.title.startsWith('Session recovery:')
                                        ? r1Responses.some((response) => response.operation === 'GET /api/auth/session' && response.status === 401)
                                            ? 'actual-browser-reload-public-session401-initializer-and-interceptor'
                                            : 'actual-browser-reload-public-session200-and-auth-guard'
                                        : 'actual-browser-ui-with-readonly-bridge-observation',
                                mechanisms: [...mechanisms].sort(),
                                testStatus: testInfo.status ?? 'unknown',
                                r1Responses,
                                fixtureEvents,
                                cleanupPassed,
                                outsideR1: [...outsideR1.values()],
                                outsideR1Meaning: 'observations only; no R2 business success claim'
                            },
                            null,
                            2
                        )
                    )
                });
            }
        }
    }
});

export { expect } from '@playwright/test';
