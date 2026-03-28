import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, login, VIEWER_CREDENTIALS } from './support/auth';

async function loginForApi(page: Page, credentials: { username: string; password: string }): Promise<string> {
    const response = await page.request.post('/api/auth/login', {
        data: credentials
    });
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as { accessToken: string };
    return payload.accessToken;
}

test.describe('poms-admin platform governance smoke', () => {
    test('admin can submit a real platform governance form', async ({ page }) => {
        const unique = Date.now().toString(36).toUpperCase();
        const name = `E2E 组织 ${unique}`;
        const code = `E2EORG${unique}`;

        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.goto('/platform/org-units');
        await expect(page).toHaveURL(/\/platform\/org-units$/);

        await page.getByRole('button', { name: '新建组织' }).click();
        await expect(page.getByRole('dialog', { name: '新建组织' })).toBeVisible();

        await page.getByPlaceholder('如 华北销售部').fill(name);
        await page.getByPlaceholder('如 SALES-NORTH').fill(code);
        await page.getByPlaceholder('组织简介（可选）').fill('用于验证浏览器端真实提交链路');
        await page.getByRole('button', { name: '创建' }).click();

        await expect(page.getByText('创建成功')).toBeVisible();
        await page.getByPlaceholder('搜索组织').fill(code);
        await expect(page.getByText(name, { exact: true })).toBeVisible();
        await expect(page.getByText(code)).toBeVisible();
    });

    test('admin can reach the platform governance pages', async ({ page }) => {
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.goto('/platform/users');
        await expect(page).toHaveURL(/\/platform\/users$/);
        await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();

        await page.goto('/platform/roles');
        await expect(page).toHaveURL(/\/platform\/roles$/);
        await expect(page.getByRole('heading', { name: '角色管理' })).toBeVisible();

        await page.goto('/platform/org-units');
        await expect(page).toHaveURL(/\/platform\/org-units$/);
        await expect(page.getByRole('heading', { name: '组织管理' })).toBeVisible();

        await page.goto('/platform/navigation');
        await expect(page).toHaveURL(/\/platform\/navigation$/);
        await expect(page.getByRole('heading', { name: '导航治理' })).toBeVisible();
        await page.getByRole('button', { name: '记录同步审计' }).click();
        await expect(page.getByText('已记录同步审计')).toBeVisible();
    });

    test('viewer does not see platform governance menu entries', async ({ page }) => {
        await login(page, VIEWER_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await expect(page.getByRole('link', { name: '用户管理' })).toHaveCount(0);
        await expect(page.getByRole('link', { name: '角色管理' })).toHaveCount(0);
        await expect(page.getByRole('link', { name: '组织管理' })).toHaveCount(0);
        await expect(page.getByRole('link', { name: '导航菜单' })).toHaveCount(0);
    });

    test('viewer is redirected to the access page when directly entering a protected platform route', async ({ page }) => {
        await login(page, VIEWER_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);
        const from = new Date().toISOString();

        await page.goto('/platform/users');

        await expect(page).toHaveURL(/\/auth\/access\?returnUrl=%2Fplatform%2Fusers$/);
        await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
        await expect(page.getByText("You don’t have the permissions to access this page")).toBeVisible();

        const viewerToken = await page.evaluate(() => globalThis.localStorage.getItem('poms_access_token'));
        expect(viewerToken).toBeTruthy();
        if (!viewerToken) {
            throw new Error('viewer token not found after login');
        }
        const viewerProfileResponse = await page.request.get('/api/auth/profile', {
            headers: {
                Authorization: `Bearer ${viewerToken}`
            }
        });
        expect(viewerProfileResponse.status()).toBe(200);
        const viewerProfile = (await viewerProfileResponse.json()) as { id: string };

        const adminToken = await loginForApi(page, ADMIN_CREDENTIALS);
        await expect
            .poll(async () => {
                const response = await page.request.get('/api/security-events', {
                    headers: {
                        Authorization: `Bearer ${adminToken}`
                    },
                    params: {
                        from,
                        eventType: 'authz.route.denied',
                        actorId: viewerProfile.id,
                        path: '/platform/users',
                        limit: '5'
                    }
                });

                if (response.status() !== 200) {
                    return false;
                }

                const events = (await response.json()) as Array<{ eventType: string; actorId: string | null; path: string; result: string }>;
                return events.some(
                    (event) =>
                        event.eventType === 'authz.route.denied' &&
                        event.actorId === viewerProfile.id &&
                        event.path === '/platform/users' &&
                        event.result === 'blocked'
                );
            })
            .toBe(true);
    });

    test('anonymous users are redirected to login and keep the returnUrl', async ({ page }) => {
        await page.goto('/platform/users');

        await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fplatform%2Fusers$/);

        await page.getByLabel('用户名').fill(ADMIN_CREDENTIALS.username);
        await page.getByLabel('密码').fill(ADMIN_CREDENTIALS.password);
        await page.getByRole('button', { name: '登录' }).click();

        await expect(page).toHaveURL(/\/platform\/users$/);
        await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();
    });
});
