import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, login, VIEWER_CREDENTIALS } from './support/auth';

const WORKSPACE_PROJECT_CODE = 'E2E-OSG-FXT-MAIN';
const WORKSPACE_PROJECT_ID = '21000000-0000-4000-8000-000000000201';
const HANDOVER_PROJECT_CODE = 'E2E-HO-MAIN';
const HANDOVER_PROJECT_ID = '21000000-0000-4000-8000-000000000002';

async function openProjectList(page: Page, projectCode = WORKSPACE_PROJECT_CODE): Promise<void> {
    await page.getByRole('link', { name: '项目管理' }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await page.getByPlaceholder('搜索项目').fill(projectCode);
}

async function locateProjectRow(page: Page, projectCode = WORKSPACE_PROJECT_CODE) {
    const row = page.locator('tr').filter({ hasText: projectCode }).first();
    await expect(row).toBeVisible();
    return row;
}

async function openWorkspaceFromProjectList(page: Page, projectCode = WORKSPACE_PROJECT_CODE, projectId = WORKSPACE_PROJECT_ID): Promise<void> {
    await openProjectList(page, projectCode);
    const projectRow = await locateProjectRow(page, projectCode);
    await projectRow.getByRole('button', { name: '工作区' }).click();

    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/workspace$`));
    await expect(page.getByRole('heading', { name: /项目工作区/ })).toBeVisible();
}

async function openProjectDetailFromList(page: Page): Promise<void> {
    await openProjectList(page);
    const projectRow = await locateProjectRow(page);
    await projectRow.getByRole('button', { name: '详情' }).click();

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

async function expectWorkspaceHomeEntryDisabled(page: Page, title: string, reason: string): Promise<void> {
    const entry = page
        .locator('div.py-4')
        .filter({ hasText: title })
        .filter({ hasText: reason })
        .first();

    await expect(entry).toBeVisible();
    await expect(entry.getByText('暂不可进入')).toBeVisible();
    await expect(entry.getByRole('link', { name: '进入' })).toHaveCount(0);
}

async function returnToWorkspaceHome(page: Page, projectId = WORKSPACE_PROJECT_ID): Promise<void> {
    const workspaceHomeTab = page.getByRole('link', { name: '工作区总览', exact: true });
    if (await workspaceHomeTab.count()) {
        await workspaceHomeTab.click();
    } else {
        await page.getByRole('button', { name: '返回项目工作区' }).click();
    }

    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/workspace$`));
    await expect(page.getByRole('heading', { name: /项目工作区/ })).toBeVisible();
}

async function expectFinalSettlementSurface(page: Page): Promise<void> {
    await expect(page.getByText(/最终结算暂不可用|当前结算链状态/)).toBeVisible();
}

async function expectRuleExplanationSurface(page: Page): Promise<void> {
    await expect(page.getByText(/规则解释暂不可用|当前规则结论/)).toBeVisible();
}

test.describe('poms-admin project workspace journey', () => {
    test('admin can enter from the project list and traverse the workspace through real links', async ({ page }) => {
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await openWorkspaceFromProjectList(page);

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

        await page.getByRole('link', { name: '冻结与责任边界' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/freeze-binding$`));
        await expect(page.getByRole('heading', { name: '当前冻结状态' })).toBeVisible();

        await page.getByRole('link', { name: '提成阶段解释', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/gate-overview$`));

        await returnToWorkspaceHome(page);
        await expectWorkspaceHomeEntryDisabled(page, '最终结算', '项目进入验收或完成阶段后再查看最终结算。');

        await openWorkspaceHomeEntry(page, '规则解释');
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/rule-explanation$`));
        await expectRuleExplanationSurface(page);

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

    test('admin can enter the contract handover workspace from project workspace navigation', async ({ page }) => {
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await openWorkspaceFromProjectList(page, HANDOVER_PROJECT_CODE, HANDOVER_PROJECT_ID);

        await openWorkspaceHomeEntry(page, '合同承接');
        await expect(page).toHaveURL(new RegExp(`/projects/${HANDOVER_PROJECT_ID}/workspace/contract-handover$`));
        await expect(page.getByText('当前有效合同集合')).toBeVisible();
        await expect(page.getByRole('cell', { name: 'E2E-HO-HT-MAIN' })).toBeVisible();
        await expect(page.getByText('Current handover baseline comes from the latest project handover record')).toBeVisible();
        await expect(page.getByText('Receivable plan has been initialized from the current contract readiness package')).toBeVisible();

        await returnToWorkspaceHome(page, HANDOVER_PROJECT_ID);
        await page.getByRole('link', { name: '合同承接' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${HANDOVER_PROJECT_ID}/workspace/contract-handover$`));
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

        await page.getByRole('link', { name: '最终结算' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/final-settlement$`));
        await expectFinalSettlementSurface(page);

        await page.getByRole('link', { name: '查看规则解释' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/rule-explanation$`));
        await expectRuleExplanationSurface(page);
    });

    test('viewer can enter the workspace from the project list but only see allowed navigation', async ({ page }) => {
        await login(page, VIEWER_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await openWorkspaceFromProjectList(page);

        await expect(page.getByRole('link', { name: '工作区总览' })).toBeVisible();
        await expect(page.getByRole('link', { name: '经营总览' })).toHaveCount(0);
        await expect(page.getByRole('link', { name: '冻结与责任边界' })).toHaveCount(0);
        await expect(page.getByRole('link', { name: '提成操作' })).toHaveCount(0);
        await expect(page.getByText('经营总览 · 需要项目查看和合同资金权限。')).toBeVisible();
        await expect(page.getByText('最终结算 · 项目进入验收或完成阶段后再查看最终结算。')).toBeVisible();
        await expect(page.getByText('规则解释 · 需要项目查看和提成发放权限。')).toBeVisible();
        await expect(page.getByText('提成操作 · 需要完整的提成治理操作权限。')).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/workspace/operating-overview`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/final-settlement`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/freeze-binding`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/rule-explanation`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/operations`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();
    });
});
