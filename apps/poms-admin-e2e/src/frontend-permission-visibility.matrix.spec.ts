import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, login, VIEWER_CREDENTIALS } from './support/auth';

const WORKSPACE_PROJECT_ID = '21000000-0000-4000-8000-000000000201';
const CONTRACT_ID = '31000000-0000-4000-8000-000000000421';

async function mockContractList(page: Page): Promise<void> {
    await page.route('**/api/contracts', async (route) => {
        if (route.request().method() !== 'GET') {
            await route.fallback();
            return;
        }

        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify([
                {
                    id: CONTRACT_ID,
                    projectId: WORKSPACE_PROJECT_ID,
                    projectName: 'FE42 权限矩阵项目',
                    customerName: 'FE42 客户',
                    contractNo: 'CT-FE42-MATRIX',
                    customerContractNo: 'KH-FE42-MATRIX',
                    status: 'active',
                    signedAmount: '660000.00',
                    currencyCode: 'CNY',
                    currentSnapshotId: null,
                    signedAt: '2026-04-28T00:00:00.000Z',
                    retentionDueDate: null,
                    rowVersion: 1,
                    createdAt: '2026-04-28T09:00:00.000Z',
                    createdBy: '10000000-0000-4000-8000-000000000001',
                    updatedAt: '2026-04-28T09:00:00.000Z',
                    updatedBy: '10000000-0000-4000-8000-000000000001'
                }
            ])
        });
    });

    await page.route('**/api/projects', async (route) => {
        if (route.request().method() !== 'GET') {
            await route.fallback();
            return;
        }

        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify([
                {
                    id: WORKSPACE_PROJECT_ID,
                    projectNo: 'P-FE42-MATRIX',
                    projectName: 'FE42 权限矩阵项目',
                    customerName: 'FE42 客户',
                    customerProjectNo: 'CUS-FE42',
                    currentStage: 'handover',
                    status: 'active',
                    ownerOrgName: 'FE42 事业部',
                    ownerName: 'FE42 Owner',
                    latestMilestoneAt: '2026-04-28T09:00:00.000Z',
                    createdAt: '2026-04-20T09:00:00.000Z'
                }
            ])
        });
    });
}

test.describe('poms-admin frontend permission and sensitive visibility matrix', () => {
    test('viewer navigation exposes read-only business entrances and hides restricted menus', async ({ page }) => {
        await login(page, VIEWER_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await expect(page.getByRole('link', { name: '工作台' })).toBeVisible();
        await expect(page.getByRole('link', { name: '项目管理' })).toBeVisible();
        await expect(page.getByRole('link', { name: '合同管理' })).toBeVisible();
        await expect(page.getByRole('link', { name: '线索管理' })).toHaveCount(0);
        await expect(page.getByRole('link', { name: /用户管理|角色与权限|组织单元|导航菜单/ })).toHaveCount(0);
    });

    test('admin can see contract finance fields from the contract menu entrance', async ({ page }) => {
        await login(page, ADMIN_CREDENTIALS);
        await mockContractList(page);

        await page.getByRole('link', { name: '合同管理' }).click();
        await expect(page).toHaveURL(/\/contracts$/);
        await expect(page.getByText('CT-FE42-MATRIX')).toBeVisible();
        await expect(page.getByText('660,000.00 CNY')).toBeVisible();
        await expect(page.getByText('经营敏感字段已隐藏')).toHaveCount(0);
        await expect(page.getByRole('button', { name: '新建合同' })).toBeVisible();
    });

    test('viewer can enter contracts but sees masked finance fields and no create action', async ({ page }) => {
        await login(page, VIEWER_CREDENTIALS);
        await mockContractList(page);

        await page.getByRole('link', { name: '合同管理' }).click();
        await expect(page).toHaveURL(/\/contracts$/);
        await expect(page.getByText('CT-FE42-MATRIX')).toBeVisible();
        await expect(page.getByText('经营敏感字段已隐藏')).toBeVisible();
        await expect(page.getByText('660,000.00 CNY')).toHaveCount(0);
        await expect(page.getByRole('button', { name: '新建合同' })).toHaveCount(0);
    });

    test('viewer direct URLs are rejected for lead, finance, and commission operation surfaces', async ({ page }) => {
        await login(page, VIEWER_CREDENTIALS);

        await page.goto('/leads');
        await expect(page).toHaveURL(/\/auth\/access\?returnUrl=%2Fleads$/);
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/workspace/operating-overview`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/operations?payoutId=51000000-0000-4000-8000-000000000421`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();
    });

    test('anonymous protected routes redirect to login and preserve returnUrl', async ({ page }) => {
        await page.goto('/contracts');
        await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fcontracts$/);

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/operations?payoutId=51000000-0000-4000-8000-000000000421`);
        await expect(page).toHaveURL(
            new RegExp(
                `/auth/login\\?returnUrl=%2Fprojects%2F${WORKSPACE_PROJECT_ID}%2Fcommission%2Foperations%3FpayoutId%3D51000000-0000-4000-8000-000000000421$`
            )
        );
    });
});
