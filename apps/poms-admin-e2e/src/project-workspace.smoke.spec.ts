import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, login, VIEWER_CREDENTIALS } from './support/auth';

const WORKSPACE_PROJECT_CODE = 'E2E-OSG-FXT-MAIN';
const WORKSPACE_PROJECT_ID = '21000000-0000-4000-8000-000000000201';

async function loginForApi(page: Page, credentials: { username: string; password: string }): Promise<string> {
    const response = await page.request.post('/api/auth/login', {
        data: credentials
    });
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as { accessToken: string };
    return payload.accessToken;
}

async function getProjectIdByCode(page: Page, token: string, projectCode: string): Promise<string> {
    const response = await page.request.get(`/api/projects/code/${projectCode}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    expect(response.status()).toBe(200);
    const project = (await response.json()) as { id: string };
    return project.id;
}

test.describe('poms-admin project workspace smoke', () => {
    test('admin can enter the project workspace from the project page and follow the L4/L5 explanation chain', async ({ page }) => {
        const token = await loginForApi(page, ADMIN_CREDENTIALS);
        const projectId = await getProjectIdByCode(page, token, WORKSPACE_PROJECT_CODE);

        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.goto(`/projects/${projectId}`);
        await expect(page.getByRole('heading', { name: /E2E EX-13B main/i })).toBeVisible();
        await page.getByRole('button', { name: '项目工作区' }).click();

        await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/workspace$`));
        await expect(page.getByRole('heading', { name: /项目工作区/ })).toBeVisible();
        await expect(page.getByRole('link', { name: '经营总览' })).toBeVisible();

        await page.goto(`/projects/${projectId}/workspace/operating-overview`);
        await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/workspace/operating-overview$`));
        await expect(page.getByText('Tax package is pending closeout')).toBeVisible();
        await expect(page.getByText('Allocation basis shifted after restatement')).toBeVisible();

        await page.goto(`/projects/${projectId}/workspace/variance-risk`);
        await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/workspace/variance-risk$`));
        await expect(page.getByText('Gross margin deviates from baseline expectation')).toBeVisible();
        await expect(page.getByText('Unmapped delivery cost detected')).toBeVisible();

        await page.goto(`/projects/${projectId}/commission/gate-overview`);
        await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/commission/gate-overview$`));
        await expect(page.getByText('Review commission settlement package')).toBeVisible();
        await expect(page.getByText('Commission payout workflow')).toBeVisible();

        await page.goto(`/projects/${projectId}/commission/final-settlement`);
        await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/commission/final-settlement$`));
        await expect(page.getByText(/最终结算暂不可用|当前结算链状态/)).toBeVisible();

        await page.goto(`/projects/${projectId}/commission/rule-explanation`);
        await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/commission/rule-explanation$`));
        await expect(page.getByText(/规则解释暂不可用|当前规则结论/)).toBeVisible();

        await page.goto(`/projects/${projectId}/commission/operations`);
        await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/commission/operations$`));
        await expect(page.getByRole('heading', { name: /提成操作/ })).toBeVisible();
        await expect(page.getByRole('button', { name: '阶段解释' })).toBeVisible();
    });

    test('viewer can enter the workspace shell but is blocked from finance pages and commission operations', async ({ page }) => {
        const token = await loginForApi(page, VIEWER_CREDENTIALS);
        const projectId = await getProjectIdByCode(page, token, WORKSPACE_PROJECT_CODE);

        await login(page, VIEWER_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.goto('/projects');
        await expect(page).toHaveURL(/\/projects$/);
        await expect(page.getByRole('heading', { name: '项目管理' })).toBeVisible();

        await page.goto(`/projects/${projectId}`);
        await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
        await expect(page.getByRole('heading', { name: /E2E EX-13B main/i })).toBeVisible();

        await page.goto(`/projects/${projectId}/workspace`);
        await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/workspace$`));
        await expect(page.getByRole('heading', { name: /项目工作区/ })).toBeVisible();
        await expect(page.getByText('经营总览 · 需要项目查看和合同资金权限。')).toBeVisible();
        await expect(page.getByText('最终结算 · 项目进入验收或完成阶段后再查看最终结算。')).toBeVisible();
        await expect(page.getByText('规则解释 · 需要项目查看和提成发放权限。')).toBeVisible();
        await expect(page.getByText('提成操作 · 需要完整的提成治理操作权限。')).toBeVisible();

        await page.goto(`/projects/${projectId}/workspace/operating-overview`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${projectId}/commission/final-settlement`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${projectId}/commission/rule-explanation`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${projectId}/commission/operations`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();
    });

    test('anonymous direct project list access keeps the returnUrl', async ({ page }) => {
        await page.goto('/projects');

        await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fprojects$/);

        await page.getByLabel('用户名').fill(ADMIN_CREDENTIALS.username);
        await page.getByLabel('密码').fill(ADMIN_CREDENTIALS.password);
        await page.getByRole('button', { name: '登录' }).click();

        await expect(page).toHaveURL(/\/projects$/);
        await expect(page.getByRole('heading', { name: '项目管理' })).toBeVisible();
    });

    test('anonymous direct workspace access keeps the returnUrl', async ({ page }) => {
        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/workspace`);

        await expect(page).toHaveURL(new RegExp(`/auth/login\\?returnUrl=%2Fprojects%2F${WORKSPACE_PROJECT_ID}%2Fworkspace$`));

        await page.getByLabel('用户名').fill(ADMIN_CREDENTIALS.username);
        await page.getByLabel('密码').fill(ADMIN_CREDENTIALS.password);
        await page.getByRole('button', { name: '登录' }).click();

        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/workspace$`));
        await expect(page.getByRole('heading', { name: /项目工作区/ })).toBeVisible();
    });
});
