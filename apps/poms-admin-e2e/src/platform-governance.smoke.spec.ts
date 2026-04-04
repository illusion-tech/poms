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

    test('admin can edit move and toggle an org unit from the real page', async ({ page }) => {
        const unique = Date.now().toString(36).toUpperCase();
        const sourceName = `E2E 源组织 ${unique}`;
        const sourceCode = `E2ESRC${unique}`;
        const targetName = `E2E 目标组织 ${unique}`;
        const targetCode = `E2ETGT${unique}`;

        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);
        await page.goto('/platform/org-units');
        await expect(page).toHaveURL(/\/platform\/org-units$/);

        await page.getByRole('button', { name: '新建组织' }).click();
        await page.getByLabel('新建组织名称').fill(sourceName);
        await page.getByLabel('新建组织编码').fill(sourceCode);
        await page.getByLabel('新建组织描述').fill('用于验证编辑、移动与启停');
        await page.getByRole('button', { name: '创建' }).click();
        await expect(page.getByText('创建成功')).toBeVisible();

        await page.getByRole('button', { name: '新建组织' }).click();
        await page.getByLabel('新建组织名称').fill(targetName);
        await page.getByLabel('新建组织编码').fill(targetCode);
        await page.getByLabel('新建组织描述').fill('用于验证移动目标');
        await page.getByRole('button', { name: '创建' }).click();
        await expect(page.getByText('创建成功')).toBeVisible();

        await page.getByPlaceholder('搜索组织').fill(sourceCode);
        const sourceRow = page.locator('tr').filter({ hasText: sourceCode }).first();
        await expect(sourceRow).toBeVisible();

        await sourceRow.getByRole('button', { name: '编辑组织' }).click();
        await expect(page.getByRole('dialog', { name: '编辑组织' })).toBeVisible();
        await page.getByLabel('编辑组织名称').fill(`${sourceName}-已编辑`);
        await page.getByLabel('编辑组织编码').fill(`${sourceCode}X`);
        await page.getByLabel('编辑组织排序').fill('5');
        await page.getByRole('button', { name: '保存' }).click();
        await expect(page.getByText('保存成功')).toBeVisible();

        await page.getByPlaceholder('搜索组织').fill(`${sourceCode}X`);
        const editedRow = page.locator('tr').filter({ hasText: `${sourceCode}X` }).first();
        await expect(editedRow).toContainText(`${sourceName}-已编辑`);
        await expect(editedRow).toContainText('5');

        await editedRow.getByRole('button', { name: '移动组织' }).click();
        await expect(page.getByRole('dialog', { name: '移动组织' })).toBeVisible();
        await page.getByLabel('移动组织上级组织').selectOption({ label: targetName });
        await page.getByLabel('移动组织排序').fill('7');
        await page.getByRole('button', { name: '保存位置' }).click();
        await expect(page.getByText('移动成功')).toBeVisible();
        await expect(editedRow).toContainText(targetName);
        await expect(editedRow).toContainText('7');

        await editedRow.getByRole('button', { name: '停用组织' }).click();
        await expect(page.getByText('状态已更新')).toBeVisible();
        await expect(editedRow).toContainText('停用');

        await editedRow.getByRole('button', { name: '启用组织' }).click();
        await expect(page.getByText('状态已更新')).toBeVisible();
        await expect(editedRow).toContainText('启用');
    });

    test('admin can create edit assign and toggle a role from the real page', async ({ page }) => {
        const unique = Date.now().toString(36).toUpperCase();
        const roleKey = `e2e-role-${unique.toLowerCase()}`;
        const roleName = `E2E 角色 ${unique}`;
        const editedRoleName = `${roleName}-已编辑`;

        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);
        await page.goto('/platform/roles');
        await expect(page).toHaveURL(/\/platform\/roles$/);

        await page.getByRole('button', { name: '新建角色' }).click();
        await page.locator('#create-role-key').fill(roleKey);
        await page.locator('#create-role-name').fill(roleName);
        await page.locator('#create-role-description').fill('用于验证角色管理闭环');
        await page.getByRole('button', { name: '创建' }).click();

        await expect(page.getByText('创建成功')).toBeVisible();
        await page.getByPlaceholder('搜索角色').fill(roleKey);
        const roleRow = page.locator('tr').filter({ hasText: roleKey }).first();
        await expect(roleRow).toBeVisible();

        await roleRow.getByRole('button', { name: `编辑角色 ${roleName}` }).click();
        await page.locator('#edit-role-name').fill(editedRoleName);
        await page.locator('#edit-role-description').fill('编辑后的角色说明');
        await page.locator('#edit-role-order').fill('6');
        await page.getByRole('button', { name: '保存' }).click();
        await expect(page.getByText('保存成功')).toBeVisible();
        await expect(roleRow).toContainText(editedRoleName);
        await expect(roleRow).toContainText('6');

        await roleRow.getByRole('button', { name: `分配权限 ${editedRoleName}` }).click();
        await page.getByText('platform:roles:manage').click();
        await page.getByRole('button', { name: '保存' }).click();
        await expect(page.getByText('保存成功')).toBeVisible();

        await roleRow.getByRole('button', { name: `停用角色 ${editedRoleName}` }).click();
        await expect(page.getByText('状态已更新')).toBeVisible();
        await expect(roleRow).toContainText('停用');

        await roleRow.getByRole('button', { name: `启用角色 ${editedRoleName}` }).click();
        await expect(page.getByText('状态已更新')).toBeVisible();
        await expect(roleRow).toContainText('启用');
    });

    test('admin can reach the platform governance pages', async ({ page }) => {
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(page.locator('.layout-menuitem-root-text').filter({ hasText: '总览' })).toBeVisible();
        await expect(page.locator('.layout-menuitem-root-text').filter({ hasText: '业务管理' })).toBeVisible();
        await expect(page.locator('.layout-menuitem-root-text').filter({ hasText: '平台配置' })).toBeVisible();
        await expect(page.locator('.layout-menuitem-root-text').filter({ hasText: '个人设置' })).toBeVisible();

        await page.getByRole('link', { name: '项目管理' }).click();
        await expect(page).toHaveURL(/\/projects$/);

        await page.getByRole('link', { name: '合同管理' }).click();
        await expect(page).toHaveURL(/\/contracts$/);

        await page.getByRole('link', { name: '用户管理' }).click();
        await expect(page).toHaveURL(/\/platform\/users$/);
        await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();

        await page.getByRole('link', { name: '角色与权限' }).click();
        await expect(page).toHaveURL(/\/platform\/roles$/);
        await expect(page.getByRole('heading', { name: '角色管理' })).toBeVisible();

        await page.getByRole('link', { name: '组织单元' }).click();
        await expect(page).toHaveURL(/\/platform\/org-units$/);
        await expect(page.getByRole('heading', { name: '组织管理' })).toBeVisible();

        await page.getByRole('link', { name: '导航菜单' }).click();
        await expect(page).toHaveURL(/\/platform\/navigation$/);
        await expect(page.getByRole('heading', { name: '导航治理' })).toBeVisible();
        await page.getByRole('button', { name: '记录同步审计' }).click();
        await expect(page.getByText('已记录同步审计')).toBeVisible();

        await page.getByRole('link', { name: '个人中心' }).click();
        await expect(page).toHaveURL(/\/profile(?:\/list)?$/);
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
