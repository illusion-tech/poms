import { expect, test, type Page, type Route } from '@playwright/test';

async function fulfillJson(route: Route, body: unknown): Promise<void> {
    await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body)
    });
}

async function installExternalLoginMocks(page: Page): Promise<void> {
    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());

        if (request.method() === 'GET' && url.pathname === '/api/auth/identity-providers') {
            await fulfillJson(route, [
                {
                    id: 'identity-provider-1',
                    provider: 'feishu',
                    tenantId: null,
                    displayName: '飞书生产租户',
                    loginScopes: ['contact:user.base:readonly']
                }
            ]);
            return;
        }

        if (request.method() === 'GET' && url.pathname === '/api/auth/identity-providers/identity-provider-1:authorize') {
            const authorizeUrl = `${url.origin}/auth/identity-providers:callback?code=auth-code&state=callback-state`;
            await fulfillJson(route, {
                authorizeUrl,
                stateExpiresAt: '2026-05-07T08:30:00.000Z'
            });
            return;
        }

        if (request.method() === 'GET' && url.pathname === '/api/auth/identity-providers:callback') {
            expect(url.searchParams.get('code')).toBe('auth-code');
            expect(url.searchParams.get('state')).toBe('callback-state');
            await fulfillJson(route, {
                ticket: 'external-login-ticket-value-1234567890',
                expiresAt: '2026-05-07T08:31:00.000Z',
                provider: 'feishu',
                identityProviderConfigId: 'identity-provider-1',
                pomsUserId: 'user-1'
            });
            return;
        }

        if (request.method() === 'POST' && url.pathname === '/api/auth/external-login-sessions') {
            await fulfillJson(route, { accessToken: 'mocked-external-jwt' });
            return;
        }

        if (request.method() === 'GET' && url.pathname === '/api/auth/profile') {
            await fulfillJson(route, {
                id: 'user-1',
                username: 'admin',
                displayName: '管理员',
                roles: ['平台管理员'],
                permissions: ['nav:dashboard:view', 'nav:profile:view'],
                email: 'admin@example.com',
                avatarUrl: null,
                isActive: true,
                lastLoginAt: '2026-05-07T08:32:00.000Z',
                emailVerified: true,
                phoneVerified: true,
                phone: '13800000000',
                orgUnits: []
            });
            return;
        }

        if (request.method() === 'GET' && (url.pathname === '/api/me/navigation' || url.pathname === '/api/me/todos')) {
            await fulfillJson(route, []);
            return;
        }

        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: `Unhandled mock ${request.method()} ${url.pathname}` }) });
    });
}

test.describe('external login frontend journey', () => {
    test('shows enabled provider and completes callback session exchange', async ({ page }) => {
        await installExternalLoginMocks(page);

        await page.goto('/auth/login?returnUrl=%2Fprofile', { waitUntil: 'domcontentloaded' });

        await expect(page.getByRole('button', { name: '使用 飞书生产租户 登录' })).toBeVisible();
        await page.getByRole('button', { name: '使用 飞书生产租户 登录' }).click();

        await expect(page).toHaveURL(/\/profile$/);
        await expect
            .poll(() => page.evaluate(() => globalThis.localStorage.getItem('poms_access_token')))
            .toBe('mocked-external-jwt');
    });
});
