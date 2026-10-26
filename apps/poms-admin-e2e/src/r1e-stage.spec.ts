import { expect, fixedLogout, formLogin, menuEntry, navigate, sessionToken, snapshot, submitLogin, submitRetainedInvalidCookie, test, topbarLogout, waitForBridge, type StageHarness } from './support/r1e-stage';
import type { BrowserContext, Page } from '@playwright/test';

const notices = {
    session_missing: '请先登录后继续。',
    session_expired: '登录已过期，请重新登录后继续。',
    session_revoked: '当前登录已退出，请重新登录后继续。',
    account_disabled: '当前账号已被停用，请联系管理员。'
} as const;

async function expectCleared(page: Page, reason: keyof typeof notices, returnUrl: string): Promise<void> {
    await expect(page).toHaveURL((url) => url.pathname === '/auth/login' && url.searchParams.get('reason') === reason && url.searchParams.get('returnUrl') === returnUrl);
    await expect(page.getByText(notices[reason], { exact: true })).toBeVisible();
    expect(await snapshot(page)).toEqual({ authenticated: false, username: null, permissions: [], navigationCount: 0, todoCount: 0, csrfInMemory: false });
}

async function expiredFlow(page: Page, context: BrowserContext, stage: StageHarness, action: 'expire-idle' | 'expire-absolute' | 'revoke' | 'disable', code: keyof typeof notices): Promise<void> {
    const returnUrl = `/dashboard?stage=${action}`;
    await formLogin(page, stage.credentials(), returnUrl);
    const token = await sessionToken(context);
    await stage.fixture(action, 'admin', action === 'disable' ? undefined : token);
    expect((await snapshot(page)).authenticated).toBe(true);
    expect(await fixedLogout(page)).toEqual({ status: 401, code, revoked: false });
    await expectCleared(page, code, returnUrl);
    await submitRetainedInvalidCookie(page, context, stage.credentials(), action === 'expire-idle' || action === 'expire-absolute' ? 'session_expired' : 'session_revoked');
    await expectCleared(page, code, returnUrl);
    if (action === 'disable') {
        await submitLogin(page, stage.credentials(), 401);
    }
    await stage.fixture('restore', 'admin');
    await submitLogin(page, stage.credentials());
    await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === returnUrl);
    await topbarLogout(page);
}

test('UI: no Cookie yields public session 200 anonymous; deep link and incorrect-password retry preserve returnUrl', async ({ page, context, stage }) => {
    expect((await context.cookies()).some((cookie) => cookie.name === 'poms_session')).toBe(false);
    const anonymous = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/session' && response.request().method() === 'GET');
    await page.goto('/dashboard?stage=deep-link');
    const anonymousResponse = await anonymous;
    expect(anonymousResponse.status()).toBe(200);
    const anonymousView = (await anonymousResponse.json()) as { authenticated?: unknown; user?: unknown };
    expect(anonymousView.authenticated === false && anonymousView.user === null).toBe(true);
    await expect(page).toHaveURL((url) => url.pathname === '/auth/login' && url.searchParams.get('returnUrl') === '/dashboard?stage=deep-link');
    await waitForBridge(page);
    await page.getByLabel('用户名').fill(stage.credentials().username);
    await page.getByLabel('密码', { exact: true }).fill('r1e-public-deliberately-wrong-password');
    const failed = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/sessions' && response.request().method() === 'POST');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    expect((await failed).status()).toBe(401);
    await expect(page.getByText('用户名或密码错误，请重试', { exact: true })).toBeVisible();
    expect((await snapshot(page)).authenticated).toBe(false);
    await page.getByLabel('密码', { exact: true }).fill(stage.credentials().password);
    const success = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/sessions' && response.request().method() === 'POST');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    expect((await success).status()).toBe(200);
    await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === '/dashboard?stage=deep-link');
    await expect.poll(async () => (await snapshot(page)).username).toBe(stage.credentials().username);
    await topbarLogout(page);
});

test('UI: browser-managed Cookie attributes, full reload restore and actual desktop topbar logout', async ({ page, context, stage }, testInfo) => {
    await formLogin(page, stage.credentials());
    const cookies = await context.cookies();
    expect(cookies.some((cookie) => cookie.name === 'poms_session' && cookie.httpOnly && cookie.path === '/api' && cookie.sameSite === 'Lax')).toBe(true);
    expect(cookies.some((cookie) => cookie.name === 'poms_csrf' && !cookie.httpOnly && cookie.path === '/api' && cookie.sameSite === 'Lax')).toBe(true);
    await page.reload();
    await expect.poll(async () => (await snapshot(page)).username).toBe(stage.credentials().username);
    await expect(page.locator('.profile-item')).toBeVisible();
    await testInfo.attach('desktop-shell', { contentType: 'image/png', body: await page.screenshot() });
    await topbarLogout(page);
    expect((await context.cookies()).some((cookie) => cookie.name === 'poms_session' || cookie.name === 'poms_csrf')).toBe(false);
    await page.goto('/dashboard');
    await expect(page).toHaveURL((url) => url.pathname === '/auth/login' && url.searchParams.get('returnUrl') === '/dashboard');
});

test('UI: narrow viewport keeps the real login form and topbar logout reachable', async ({ page, stage }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await formLogin(page, stage.credentials());
    await expect(page.locator('.profile-item > .right-sidebar-button')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await testInfo.attach('narrow-shell', { contentType: 'image/png', body: await page.screenshot() });
    await topbarLogout(page);
    await expect(page.getByLabel('用户名')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
});

test('Mixed UI/Angular bridge: independent contexts and another tab observe CSRF rotation and logout on the next protected request', async ({ page, context, browser, stage }, testInfo) => {
    await formLogin(page, stage.credentials());
    const origin = new URL(testInfo.project.use.baseURL ?? '').origin;
    const isolated = await browser.newContext({ extraHTTPHeaders: { 'x-request-id': `r1e:${stage.runId}` } });
    const otherTab = await context.newPage();
    try {
        const independent = await isolated.newPage();
        await independent.goto(`${origin}/dashboard`);
        await expect(independent).toHaveURL((url) => url.pathname === '/auth/login');
        expect((await snapshot(independent)).authenticated).toBe(false);
        await otherTab.goto(`${origin}/dashboard`);
        await expect.poll(async () => (await snapshot(otherTab)).username).toBe(stage.credentials().username);
        const originalTab = await snapshot(page);
        // Existing per-tab CSRF stores do not synchronize when another tab
        // restores and rotates the shared cookie. Record the real 403 rather
        // than inventing broadcast or silently retrying the mutation.
        expect(await fixedLogout(page)).toEqual({ status: 403, code: 'csrf_failed', revoked: false });
        expect(await snapshot(page)).toEqual(originalTab);
        await topbarLogout(otherTab);
        // The original tab has no broadcast listener. The next real request
        // sees the cleared shared cookie and drives the actual interceptor.
        expect((await snapshot(page)).authenticated).toBe(true);
        expect(await fixedLogout(page)).toEqual({ status: 401, code: 'session_missing', revoked: false });
        await expectCleared(page, 'session_missing', '/dashboard');
    } finally {
        await otherTab.close();
        await isolated.close();
    }
});

test('Angular interceptor: fixed CSRF 403 preserves the authenticated user and in-memory state', async ({ page, stage }) => {
    await formLogin(page, stage.credentials());
    const before = await snapshot(page);
    expect(await fixedLogout(page, 'wrong-csrf')).toEqual({ status: 403, code: 'csrf_failed', revoked: false });
    expect(await snapshot(page)).toEqual(before);
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard');
    await topbarLogout(page);
});

test('Angular interceptor: missing Cookie yields session_missing, clears state and supports real re-login', async ({ page, context, stage }) => {
    const returnUrl = '/dashboard?stage=missing';
    await formLogin(page, stage.credentials(), returnUrl);
    await context.clearCookies({ name: 'poms_session' });
    expect((await snapshot(page)).authenticated).toBe(true);
    expect(await fixedLogout(page)).toEqual({ status: 401, code: 'session_missing', revoked: false });
    await expectCleared(page, 'session_missing', returnUrl);
    await submitLogin(page, stage.credentials());
    await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === returnUrl);
    await topbarLogout(page);
});

test('Angular interceptor: idle expiry retains returnUrl through first CSRF 401 and explicit current-form retry', async ({ page, context, stage }) => {
    await expiredFlow(page, context, stage, 'expire-idle', 'session_expired');
});

test('Angular interceptor: absolute expiry retains returnUrl through first CSRF 401 and explicit current-form retry', async ({ page, context, stage }) => {
    await expiredFlow(page, context, stage, 'expire-absolute', 'session_expired');
});

test('Angular interceptor: revocation retains returnUrl through first CSRF 401 and explicit current-form retry', async ({ page, context, stage }) => {
    await expiredFlow(page, context, stage, 'revoke', 'session_revoked');
});

test('Angular interceptor: disabled account requires CSRF 401 retry, invalid-credentials POST and restore before login', async ({ page, context, stage }) => {
    await expiredFlow(page, context, stage, 'disable', 'account_disabled');
});

test('Mixed UI/Angular bridge: viewer permissions drive menu hiding and fixed Router any/all route guards', async ({ page, stage }) => {
    await formLogin(page, stage.credentials('viewer'));
    expect((await snapshot(page)).permissions).toEqual(['project:read']);
    await expect(menuEntry(page, '/projects').getByText('项目管理', { exact: true })).toBeVisible();
    await expect(menuEntry(page, '/leads')).toHaveCount(0);
    await expect(menuEntry(page, '/platform/users')).toHaveCount(0);
    await navigate(page, 'platformUsers');
    await expect(page).toHaveURL((url) => url.pathname === '/auth/access' && url.searchParams.get('returnUrl') === '/platform/users');
    await expect(page.getByRole('heading', { name: '无权访问', exact: true })).toBeVisible();
    await navigate(page, 'externalOrgSync');
    await expect(page).toHaveURL((url) => url.pathname === '/auth/access' && url.searchParams.get('returnUrl') === '/platform/external-org-sync');
    await navigate(page, 'attachments');
    await expect(page).toHaveURL((url) => url.pathname === '/attachments');
    // This asserts only the real guard's any-mode route admission. R2
    // attachment data/statuses are recorded separately, never certified.
    expect((await snapshot(page)).authenticated).toBe(true);
    await navigate(page, 'dashboard');
    await topbarLogout(page);
});

test('Mixed UI/Angular bridge: a real account without permissions keeps unprivileged entrances and fails fixed Router checks', async ({ page, stage }) => {
    await stage.fixture('permission', 'viewer');
    await formLogin(page, stage.credentials('viewer'));
    expect((await snapshot(page)).permissions).toEqual([]);
    await expect(menuEntry(page, '/dashboard').getByText('工作台', { exact: true })).toBeVisible();
    await expect(menuEntry(page, '/projects')).toHaveCount(0);
    await expect(menuEntry(page, '/attachments')).toHaveCount(0);
    await navigate(page, 'attachments');
    await expect(page).toHaveURL((url) => url.pathname === '/auth/access' && url.searchParams.get('returnUrl') === '/attachments');
    await navigate(page, 'dashboard');
    await topbarLogout(page);
});

test('Mixed UI/Angular bridge: real admin permissions expose the fallback and admit the fixed all-mode route', async ({ page, stage }) => {
    await formLogin(page, stage.credentials());
    const permissions = (await snapshot(page)).permissions;
    expect(permissions.includes('platform:org-units:manage') && permissions.includes('platform:org-sync:manage')).toBe(true);
    await page.locator('.layout-menu').getByText('人员与权限', { exact: true }).click();
    await expect(menuEntry(page, '/platform/users').getByText('用户管理', { exact: true })).toBeVisible();
    await page.locator('.layout-menu').getByText('组织架构', { exact: true }).click();
    await expect(menuEntry(page, '/platform/external-org-sync').getByText('外部组织同步', { exact: true })).toBeVisible();
    await navigate(page, 'externalOrgSync');
    await expect(page).toHaveURL((url) => url.pathname === '/platform/external-org-sync');
    // Route admission and permission display are R1 evidence. The page's
    // real R2 network responses remain excluded observations.
    await navigate(page, 'dashboard');
    await topbarLogout(page);
});

test('UI: unsafe external returnUrl is rejected without an external navigation', async ({ page, stage }, testInfo) => {
    await formLogin(page, stage.credentials(), 'https://r1e-invalid.example/never-follow');
    const origin = new URL(testInfo.project.use.baseURL ?? '').origin;
    await expect(page).toHaveURL(`${origin}/dashboard`);
    await topbarLogout(page);
});

test('Session recovery: permissions removed after login are read from the real session on reload and protected entrances disappear', async ({ page, stage }) => {
    await formLogin(page, stage.credentials('viewer'));
    expect((await snapshot(page)).permissions).toEqual(['project:read']);
    await expect(menuEntry(page, '/projects').getByText('项目管理', { exact: true })).toBeVisible();
    await stage.fixture('permission', 'viewer');
    const restored = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/session' && response.request().method() === 'GET');
    await page.reload();
    const response = await restored;
    expect(response.status()).toBe(200);
    const session = (await response.json()) as { authenticated?: unknown; user?: { permissions?: unknown } };
    expect(session.authenticated === true && Array.isArray(session.user?.permissions) && session.user.permissions.length === 0).toBe(true);
    await expect.poll(async () => (await snapshot(page)).permissions).toEqual([]);
    await expect(menuEntry(page, '/projects')).toHaveCount(0);
    await expect(menuEntry(page, '/attachments')).toHaveCount(0);
    await page.goto('/attachments');
    await expect(page).toHaveURL((url) => url.pathname === '/auth/access' && url.searchParams.get('returnUrl') === '/attachments');
    await expect(page.getByRole('heading', { name: '无权访问', exact: true })).toBeVisible();
    await page.goto('/dashboard');
    await topbarLogout(page);
});

test('Session recovery: expired Cookie reload returns public session 401 and initializer/interceptor preserve reason and returnUrl', async ({ page, context, stage }) => {
    const returnUrl = '/dashboard?stage=public-expired-reload';
    await formLogin(page, stage.credentials(), returnUrl);
    await stage.fixture('expire-idle', 'admin', await sessionToken(context));
    const recovered = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/session' && response.request().method() === 'GET');
    await page.reload();
    const response = await recovered;
    expect(response.status()).toBe(401);
    expect(((await response.json()) as { code?: unknown }).code === 'session_expired').toBe(true);
    await expectCleared(page, 'session_expired', returnUrl);
    expect((await context.cookies()).some((cookie) => cookie.name === 'poms_session' || cookie.name === 'poms_csrf')).toBe(false);
    // The public session request itself rejected the retained invalid Cookie.
    // No protected logout request or test-induced reload of the login form is used.
    await submitLogin(page, stage.credentials());
    await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === returnUrl);
    await topbarLogout(page);
});
