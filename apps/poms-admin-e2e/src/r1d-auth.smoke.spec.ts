import { expect, test, type Page } from '@playwright/test';

interface BrowserResponse {
    status: number;
    data: unknown;
    tokenShape: boolean | null;
    tokenMatchesCookie: boolean | null;
}

function object(value: unknown): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON response object');
    return value as Record<string, unknown>;
}

// These are actual fetches in the browser origin. No Playwright APIRequest,
// request interception, cookie injection, or backend doubles participate.
async function browserRequest(page: Page, path: string, method = 'GET', withCsrf = false): Promise<BrowserResponse> {
    return page.evaluate(
        async ({ path, method, withCsrf }) => {
            const csrf = document.cookie
                .split(';')
                .map((entry) => entry.trim())
                .find((entry) => entry.startsWith('poms_csrf='))
                ?.slice('poms_csrf='.length);
            const response = await fetch(path, {
                method,
                credentials: 'include',
                headers: method === 'GET' ? {} : { 'content-type': 'application/json', ...(withCsrf && csrf ? { 'X-CSRF-Token': decodeURIComponent(csrf) } : {}) },
                ...(method === 'GET' ? {} : { body: '{}' })
            });
            const data: unknown = await response.json();
            let tokenShape: boolean | null = null;
            let tokenMatchesCookie: boolean | null = null;
            if (data !== null && typeof data === 'object' && !Array.isArray(data) && 'token' in data) {
                const record = data as Record<string, unknown>;
                const currentCsrf = document.cookie
                    .split(';')
                    .map((entry) => entry.trim())
                    .find((entry) => entry.startsWith('poms_csrf='))
                    ?.slice('poms_csrf='.length);
                tokenShape = typeof record['token'] === 'string' && /^[A-Za-z0-9_-]{43}$/.test(record['token']);
                tokenMatchesCookie = record['token'] === (currentCsrf === undefined ? undefined : decodeURIComponent(currentCsrf));
                record['token'] = '<checked-redacted-csrf>';
            }
            return { status: response.status, data, tokenShape, tokenMatchesCookie };
        },
        { path, method, withCsrf }
    );
}

test('R1D real Angular and same-origin seven-operation authentication smoke', async ({ page, context, browser }, testInfo) => {
    const username = process.env['POMS_E2E_USERNAME'];
    const password = process.env['POMS_E2E_PASSWORD'];
    if (!username || !password) throw new Error('Explicit synthetic browser credentials are required');
    const adminOrigin = new URL(testInfo.project.use.baseURL ?? '').origin;
    const metadata = testInfo.config.metadata['pomsBrowser'];
    const supported = new Set(['GET /api', 'GET /api/health', 'GET /api/health/readiness', 'GET /api/auth/session', 'GET /api/auth/csrf-token', 'POST /api/auth/sessions', 'POST /api/auth/session:logout']);
    const covered = new Set<string>();
    const outsideFoundation: { operation: string; status: number }[] = [];
    context.on('response', (response) => {
        const url = new URL(response.url());
        if (url.origin !== adminOrigin || !url.pathname.startsWith('/api')) return;
        const operation = `${response.request().method()} ${url.pathname}`;
        if (!supported.has(operation)) outsideFoundation.push({ operation, status: response.status() });
    });
    const apiPage = await context.newPage();
    let ownedSession = false;
    let cleanupPassed = true;
    let originalFailure = false;
    let originalError: unknown;
    let formLoginSucceeded = false;
    let cookieAssertionsPassed = false;
    const operationResults: { operation: string; status: number }[] = [];
    const request = async (path: string, method = 'GET', withCsrf = false) => {
        const response = await browserRequest(apiPage, path, method, withCsrf);
        covered.add(`${method} ${path}`);
        operationResults.push({ operation: `${method} ${path}`, status: response.status });
        return response;
    };
    try {
        await apiPage.goto(`${adminOrigin}/api`, { waitUntil: 'domcontentloaded' });
        const root = await request('/api');
        expect(root.status).toBe(200);
        expect(object(root.data)['message'] === 'Hello API').toBe(true);
        for (const path of ['/api/health', '/api/health/readiness']) {
            const health = await request(path);
            expect(health.status).toBe(200);
            expect(object(health.data)['service'] === 'poms-api').toBe(true);
            expect(object(object(health.data)['checks'])['process'] !== undefined).toBe(true);
            if (path.endsWith('/readiness')) {
                expect(object(health.data)['status'] === 'ready').toBe(true);
                expect(object(object(object(health.data)['checks'])['database'])['status'] === 'pass').toBe(true);
            }
        }
        const anonymous = await request('/api/auth/session');
        expect(anonymous.status).toBe(200);
        expect(object(anonymous.data)['authenticated'] === false).toBe(true);
        const csrf = await request('/api/auth/csrf-token');
        expect(csrf.status).toBe(200);
        expect(csrf.tokenShape).toBe(true);
        expect(csrf.tokenMatchesCookie).toBe(true);

        await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: '登录', exact: true })).toBeVisible();
        await page.getByLabel('用户名', { exact: true }).fill(username);
        await page.getByLabel('密码', { exact: true }).fill(password);
        const loginResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/sessions' && response.request().method() === 'POST');
        await page.getByRole('button', { name: '登录', exact: true }).click();
        expect((await loginResponse).status()).toBe(200);
        ownedSession = true;
        covered.add('POST /api/auth/sessions');
        operationResults.push({ operation: 'POST /api/auth/sessions', status: 200 });
        await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'));
        formLoginSucceeded = true;

        const cookies = await context.cookies(`${adminOrigin}/api`);
        const sessionCookie = cookies.find((cookie) => cookie.name === 'poms_session');
        const csrfCookie = cookies.find((cookie) => cookie.name === 'poms_csrf');
        expect(Boolean(sessionCookie && sessionCookie.httpOnly && sessionCookie.path === '/api' && sessionCookie.sameSite === 'Lax')).toBe(true);
        expect(Boolean(csrfCookie && !csrfCookie.httpOnly && csrfCookie.path === '/api' && csrfCookie.sameSite === 'Lax')).toBe(true);
        expect(await apiPage.evaluate(() => !document.cookie.includes('poms_session=') && document.cookie.includes('poms_csrf='))).toBe(true);
        cookieAssertionsPassed = true;

        const session = await request('/api/auth/session');
        expect(session.status).toBe(200);
        expect(object(session.data)['authenticated'] === true).toBe(true);
        expect(object(object(session.data)['user'])['username'] === username).toBe(true);
        const forbiddenKeys = new Set(['password', 'passwordHash', 'password_hash', 'tokenHash', 'token_hash', 'csrfTokenHash', 'csrf_token_hash']);
        const hasSecretField = (value: unknown): boolean => value !== null && typeof value === 'object' && Object.entries(value).some(([key, child]) => forbiddenKeys.has(key) || hasSecretField(child));
        expect(hasSecretField(session.data)).toBe(false);

        const denied = await request('/api/auth/session:logout', 'POST');
        expect(denied.status).toBe(403);
        expect(object(denied.data)['code'] === 'csrf_failed').toBe(true);
        const rotated = await request('/api/auth/csrf-token');
        expect(rotated.status).toBe(200);
        expect(rotated.tokenShape).toBe(true);
        expect(rotated.tokenMatchesCookie).toBe(true);
        const logout = await request('/api/auth/session:logout', 'POST', true);
        expect(logout.status).toBe(200);
        expect(object(logout.data)['revoked'] === true).toBe(true);
        ownedSession = false;
        expect((await context.cookies(`${adminOrigin}/api`)).some((cookie) => cookie.name === 'poms_session' || cookie.name === 'poms_csrf')).toBe(false);
        expect(object((await request('/api/auth/session')).data)['authenticated'] === false).toBe(true);
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/auth\/login(?:\?|$)/);
        await expect(page.getByRole('heading', { name: '登录', exact: true })).toBeVisible();
        expect([...covered].sort()).toEqual([...supported].sort());
    } catch (error) {
        originalFailure = true;
        originalError = error;
    } finally {
        if (ownedSession) {
            try {
                const csrf = await browserRequest(apiPage, '/api/auth/csrf-token');
                const logout = await browserRequest(apiPage, '/api/auth/session:logout', 'POST', true);
                cleanupPassed = csrf.status === 200 && logout.status === 200;
            } catch {
                cleanupPassed = false;
            }
        }
        try {
            await testInfo.attach('r1d-browser-evidence', {
                body: JSON.stringify({
                    kind: 'real-browser-auth-smoke',
                    os: process.platform,
                    node: process.version,
                    browser: browser.version(),
                    target: metadata,
                    operations: [...covered].sort(),
                    result: originalFailure || !cleanupPassed ? 'failed' : 'pass',
                    operationResults,
                    realAngularFormLogin: formLoginSucceeded,
                    browserCookieAssertionsPassed: cookieAssertionsPassed,
                    proxy: 'same-origin Angular /api',
                    outsideFoundation: [...new Map(outsideFoundation.map((entry) => [`${entry.operation}:${entry.status}`, entry])).values()],
                    outsideFoundationClaim: 'Observed only; no R2 provider/navigation/todo/business contract is certified',
                    syntheticSessionCleanupPassed: cleanupPassed
                }),
                contentType: 'application/json'
            });
        } catch (error) {
            if (!originalFailure) {
                originalFailure = true;
                originalError = error;
            }
        }
        try {
            await apiPage.close();
        } catch (error) {
            if (!originalFailure) {
                originalFailure = true;
                originalError = error;
            }
        }
    }
    if (originalFailure) throw originalError;
    if (!cleanupPassed) throw new Error('Owned synthetic browser session cleanup failed');
});
