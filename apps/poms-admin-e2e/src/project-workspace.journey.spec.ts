import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, login, VIEWER_CREDENTIALS } from './support/auth';

const WORKSPACE_PROJECT_CODE = 'E2E-OSG-FXT-MAIN';
const WORKSPACE_PROJECT_ID = '21000000-0000-4000-8000-000000000201';

async function openProjectList(page: Page): Promise<void> {
    await page.getByRole('link', { name: '项目管理' }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await page.getByPlaceholder('搜索项目').fill(WORKSPACE_PROJECT_CODE);
}

async function locateProjectRow(page: Page) {
    const row = page.locator('tr').filter({ hasText: WORKSPACE_PROJECT_CODE }).first();
    await expect(row).toBeVisible();
    return row;
}

async function openWorkspaceFromProjectListMenu(page: Page): Promise<void> {
    await openProjectList(page);
    const projectRow = await locateProjectRow(page);
    await projectRow.locator('button').last().click();

    const workspaceMenuItem = page.locator('a.p-menu-item-link').filter({ hasText: '项目工作区' }).last();
    await expect(workspaceMenuItem).toBeVisible();
    await workspaceMenuItem.click({ force: true });

    await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/workspace$`));
    await expect(page.getByRole('heading', { name: /项目工作区/ })).toBeVisible();
}

async function openProjectDetailFromList(page: Page): Promise<void> {
    await openProjectList(page);
    const projectRow = await locateProjectRow(page);
    await projectRow.getByText(WORKSPACE_PROJECT_CODE, { exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}$`));
    await expect(page.getByRole('heading', { name: /E2E EX-13B main/i })).toBeVisible();
}

async function openWorkspaceHomeEntry(page: Page, title: string): Promise<void> {
    const entry = page
        .locator('div.py-4')
        .filter({ hasText: title })
        .filter({ has: page.getByRole('link', { name: '进入' }) })
        .first();

    await expect(entry).toBeVisible();
    await entry.getByRole('link', { name: '进入' }).click();
}

async function returnToWorkspaceHome(page: Page): Promise<void> {
    const workspaceHomeTab = page.getByRole('link', { name: '工作区总览' });
    if (await workspaceHomeTab.count()) {
        await workspaceHomeTab.click();
    } else {
        await page.getByRole('button', { name: '返回项目工作区' }).click();
    }

    await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/workspace$`));
    await expect(page.getByRole('heading', { name: /项目工作区/ })).toBeVisible();
}

test.describe('poms-admin project workspace journey', () => {
    test('admin can enter from the project list menu and traverse the workspace through real links', async ({ page }) => {
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await openWorkspaceFromProjectListMenu(page);

        await openWorkspaceHomeEntry(page, '经营总览');
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/workspace/operating-overview$`));
        await expect(page.getByText('Tax package is pending closeout')).toBeVisible();
        await expect(page.getByText('Allocation basis shifted after restatement')).toBeVisible();

        await returnToWorkspaceHome(page);
        await openWorkspaceHomeEntry(page, '偏差与风险');
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/workspace/variance-risk$`));
        await expect(page.getByText('Gross margin deviates from baseline expectation')).toBeVisible();
        await expect(page.getByText('Unmapped delivery cost detected')).toBeVisible();

        await returnToWorkspaceHome(page);
        await openWorkspaceHomeEntry(page, '提成阶段解释');
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/gate-overview$`));
        await expect(page.getByText('Review commission settlement package')).toBeVisible();
        await expect(page.getByText('Commission payout workflow')).toBeVisible();

        await page.getByRole('link', { name: '进入提成操作' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/operations$`));
        await expect(page.getByRole('heading', { name: /提成操作/ })).toBeVisible();

        await page.getByRole('button', { name: '阶段解释' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/gate-overview$`));

        await returnToWorkspaceHome(page);
        await openWorkspaceHomeEntry(page, '提成操作');
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/operations$`));
        await expect(page.getByRole('heading', { name: /提成操作/ })).toBeVisible();
    });

    test('admin can move between project detail workspace and commission pages with real buttons', async ({ page }) => {
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await openProjectDetailFromList(page);

        await page.getByRole('button', { name: '项目工作区' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/workspace$`));

        await page.getByRole('button', { name: '项目详情' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}$`));

        await page.getByRole('button', { name: '提成操作' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/operations$`));
        await expect(page.getByRole('heading', { name: /提成操作/ })).toBeVisible();

        await page.getByRole('button', { name: '阶段解释' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/gate-overview$`));

        await page.getByRole('link', { name: '查看经营总览' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/workspace/operating-overview$`));
        await expect(page.getByText('Tax package is pending closeout')).toBeVisible();

        await page.getByRole('link', { name: '查看提成阶段解释' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/gate-overview$`));
    });

    test('viewer can enter the workspace from the project list but only see allowed navigation', async ({ page }) => {
        await login(page, VIEWER_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await openWorkspaceFromProjectListMenu(page);

        await expect(page.getByRole('link', { name: '工作区总览' })).toBeVisible();
        await expect(page.getByRole('link', { name: '经营总览' })).toHaveCount(0);
        await expect(page.getByRole('link', { name: '提成操作' })).toHaveCount(0);
        await expect(page.getByText('经营总览 · 需要项目读取和经营核算权限')).toBeVisible();
        await expect(page.getByText('提成操作 · 需要提成治理操作权限')).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/workspace/operating-overview`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/operations`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
    });
});
