import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, login } from './support/auth';

const PICKER_PROJECT_ID = '21000000-0000-4000-8000-000000000901';
const PICKER_PROJECT_NO = 'P-E2E-PICKER';

async function mockContractProjectPickerFlow(page: Page): Promise<{ createBody: () => unknown }> {
    let contractCreateBody: unknown = null;
    const project = {
        id: PICKER_PROJECT_ID,
        projectNo: PICKER_PROJECT_NO,
        projectName: '合同选择器项目',
        customerName: '合同客户集团',
        customerProjectNo: 'CUS-E2E-PICKER',
        currentStage: 'handover',
        status: 'active',
        ownerOrgName: '合同事业部',
        ownerName: '合同负责人',
        latestMilestoneAt: '2026-04-26T09:00:00.000Z',
        createdAt: '2026-04-20T09:00:00.000Z'
    };

    await page.route('**/api/projects', async (route) => {
        if (route.request().method() !== 'GET') {
            await route.fallback();
            return;
        }

        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify([project])
        });
    });

    await page.route('**/api/contracts', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify([])
            });
            return;
        }

        if (route.request().method() === 'POST') {
            contractCreateBody = route.request().postDataJSON();
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'contract-picker-1',
                    projectId: PICKER_PROJECT_ID,
                    projectName: project.projectName,
                    customerName: project.customerName,
                    contractNo: 'CT-E2E-PICKER',
                    customerContractNo: 'KH-E2E-PICKER',
                    status: 'draft',
                    signedAmount: '880000.00',
                    currencyCode: 'CNY',
                    currentSnapshotId: null,
                    signedAt: null,
                    retentionDueDate: null,
                    rowVersion: 1,
                    createdAt: '2026-04-26T10:00:00.000Z',
                    createdBy: '10000000-0000-4000-8000-000000000001',
                    updatedAt: '2026-04-26T10:00:00.000Z',
                    updatedBy: '10000000-0000-4000-8000-000000000001'
                })
            });
            return;
        }

        await route.fallback();
    });

    return {
        createBody: () => contractCreateBody
    };
}

test.describe('poms-admin contract management journey', () => {
    test('admin creates a contract from the menu using the project picker context', async ({ page }) => {
        const flow = await mockContractProjectPickerFlow(page);

        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.getByRole('link', { name: '合同管理' }).click();
        await expect(page).toHaveURL(/\/contracts$/);

        await page.getByRole('button', { name: '新建合同' }).click();
        await expect(page.getByRole('dialog', { name: '新建合同' })).toBeVisible();
        await expect(page.getByText('关联项目 ID')).toHaveCount(0);
        await expect(page.getByPlaceholder('请输入项目 UUID')).toHaveCount(0);

        await page.getByLabel('关联项目').fill('P-E2E-PICKER');
        await page.locator('li').filter({ hasText: 'P-E2E-PICKER' }).first().click();
        await expect(page.getByText('P-E2E-PICKER · 合同选择器项目')).toBeVisible();
        await expect(page.getByText('合同客户集团', { exact: true })).toBeVisible();
        await expect(page.getByText('项目移交', { exact: true })).toBeVisible();

        await page.getByLabel('客户合同编号').fill('KH-E2E-PICKER');
        await page.getByLabel('签约金额').fill('880000.00');
        await page.getByRole('button', { name: '创建' }).click();

        await expect(page.getByRole('dialog', { name: '新建合同' })).toBeHidden();
        await expect(page.getByText('CT-E2E-PICKER')).toBeVisible();
        await expect(page.getByText('KH-E2E-PICKER')).toBeVisible();

        expect(flow.createBody()).toEqual({
            projectId: PICKER_PROJECT_ID,
            customerContractNo: 'KH-E2E-PICKER',
            signedAmount: '880000.00',
            currencyCode: 'CNY'
        });
    });
});
