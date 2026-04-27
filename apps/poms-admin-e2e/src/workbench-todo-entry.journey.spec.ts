import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, login } from './support/auth';

const WORKSPACE_PROJECT_ID = '21000000-0000-4000-8000-000000000201';
const CONTRACT_ID = '31000000-0000-4000-8000-000000000391';
const PAYOUT_ID = '51000000-0000-4000-8000-000000000391';
const ADJUSTMENT_ID = '52000000-0000-4000-8000-000000000391';
const PAYOUT_APPROVAL_ID = '61000000-0000-4000-8000-000000000391';
const ADJUSTMENT_APPROVAL_ID = '62000000-0000-4000-8000-000000000391';

async function mockWorkbenchTodos(page: Page): Promise<void> {
    await page.route('**/api/me/todos', async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify([
                createTodo({
                    id: '41000000-0000-4000-8000-000000000391',
                    title: 'FE39 项目待办',
                    businessDomain: '项目',
                    targetObjectType: 'Project',
                    targetObjectId: WORKSPACE_PROJECT_ID,
                    projectId: WORKSPACE_PROJECT_ID,
                    targetTitle: 'E2E EX-13B main'
                }),
                createTodo({
                    id: '41000000-0000-4000-8000-000000000392',
                    title: 'FE39 合同待办',
                    businessDomain: '合同',
                    targetObjectType: 'Contract',
                    targetObjectId: CONTRACT_ID,
                    targetTitle: 'FE39 合同上下文'
                }),
                createTodo({
                    id: '41000000-0000-4000-8000-000000000393',
                    sourceId: PAYOUT_APPROVAL_ID,
                    title: 'FE39 工作台提成发放审批',
                    businessDomain: '提成',
                    targetObjectType: 'CommissionPayout',
                    targetObjectId: PAYOUT_ID,
                    projectId: WORKSPACE_PROJECT_ID,
                    targetTitle: '首期发放审批'
                }),
                createTodo({
                    id: '41000000-0000-4000-8000-000000000394',
                    sourceId: ADJUSTMENT_APPROVAL_ID,
                    title: 'FE39 顶栏提成调整审批',
                    businessDomain: '提成',
                    targetObjectType: 'CommissionAdjustment',
                    targetObjectId: ADJUSTMENT_ID,
                    projectId: WORKSPACE_PROJECT_ID,
                    targetTitle: '调整审批'
                })
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
                    projectNo: 'E2E-OSG-FXT-MAIN',
                    projectName: 'E2E EX-13B main',
                    customerName: 'FE39 客户',
                    customerProjectNo: 'CUS-FE39',
                    currentStage: 'handover',
                    status: 'active',
                    ownerOrgName: 'FE39 事业部',
                    ownerName: 'FE39 Owner',
                    latestMilestoneAt: '2026-04-28T09:00:00.000Z',
                    createdAt: '2026-04-20T09:00:00.000Z'
                }
            ])
        });
    });
}

test.describe('poms-admin workbench todo entry journey', () => {
    test('admin enters workbench from the menu and opens project, contract, and commission todos', async ({ page }) => {
        await mockWorkbenchTodos(page);
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.getByRole('link', { name: '项目管理' }).click();
        await expect(page).toHaveURL(/\/projects$/);

        await page.getByRole('link', { name: '工作台' }).click();
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(page.getByRole('button', { name: /FE39 项目待办/ })).toBeVisible();

        await page.getByRole('button', { name: /FE39 项目待办/ }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}$`));

        await page.goto('/dashboard');
        await page.getByRole('button', { name: /FE39 合同待办/ }).click();
        await expect(page).toHaveURL(new RegExp(`/contracts/${CONTRACT_ID}$`));

        await page.goto('/dashboard');
        await page.getByRole('button', { name: /FE39 工作台提成发放审批/ }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/operations\\?payoutId=${PAYOUT_ID}&approvalRecordId=${PAYOUT_APPROVAL_ID}$`));
    });

    test('admin opens a commission adjustment todo from the topbar', async ({ page }) => {
        await mockWorkbenchTodos(page);
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.getByRole('link', { name: '项目管理' }).click();
        await expect(page).toHaveURL(/\/projects$/);

        await page.getByLabel('待办事项').click();
        await page.locator('.topbar-menu').getByRole('button', { name: 'FE39 顶栏提成调整审批' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/operations\\?adjustmentId=${ADJUSTMENT_ID}&approvalRecordId=${ADJUSTMENT_APPROVAL_ID}$`));
    });
});

function createTodo(overrides: Record<string, unknown>) {
    return {
        id: '41000000-0000-4000-8000-000000000399',
        sourceType: 'ApprovalRecord',
        sourceId: '61000000-0000-4000-8000-000000000399',
        todoType: 'approval',
        businessDomain: '项目',
        targetObjectType: 'Project',
        targetObjectId: WORKSPACE_PROJECT_ID,
        projectId: null,
        title: 'FE39 待办',
        summary: null,
        targetTitle: null,
        currentNodeName: '审批节点',
        allowedActions: ['open'],
        assigneeUserId: '10000000-0000-4000-8000-000000000001',
        status: 'open',
        priority: 'normal',
        dueAt: null,
        completedAt: null,
        rowVersion: 1,
        createdAt: '2026-04-28T09:00:00.000Z',
        updatedAt: '2026-04-28T09:00:00.000Z',
        ...overrides
    };
}
