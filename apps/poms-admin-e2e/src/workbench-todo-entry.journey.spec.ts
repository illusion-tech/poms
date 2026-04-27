import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, login } from './support/auth';

const WORKSPACE_PROJECT_ID = '21000000-0000-4000-8000-000000000201';
const CONTRACT_ID = '31000000-0000-4000-8000-000000000391';
const CALCULATION_ID = '53000000-0000-4000-8000-000000000391';
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

    await mockCommissionOperationsData(page);
}

async function mockCommissionOperationsData(page: Page): Promise<void> {
    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(createProjectDetail())
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/workspace-guidance`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(createWorkspaceGuidance())
        });
    });

    await page.route('**/api/commission-rule-versions', async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify([])
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/commission-calculations`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify([createCalculation()])
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/commission-payouts`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify([createPayout()])
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/commission-adjustments`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify([createAdjustment()])
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/commission-final-settlement`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                projectId: WORKSPACE_PROJECT_ID,
                summarySnapshotId: '71000000-0000-4000-8000-000000000391',
                summaryPackageKey: 'commission-final-settlement',
                projectionLevel: 'commission-final-settlement',
                exportPolicy: 'internal',
                generatedAt: '2026-04-28T09:00:00.000Z'
            })
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
        await expect(page.getByTestId('commission-todo-context')).toContainText('已定位提成发放待办');
        await expect(page.getByTestId('commission-todo-context')).toContainText('FE39 工作台提成发放审批');
        await expect(page.getByTestId('commission-todo-context')).toContainText(PAYOUT_APPROVAL_ID);
        await expect(page.getByTestId('commission-payout-highlighted-row')).toContainText('首期发放');
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
        await expect(page.getByTestId('commission-todo-context')).toContainText('已定位提成调整待办');
        await expect(page.getByTestId('commission-todo-context')).toContainText('FE39 顶栏提成调整审批');
        await expect(page.getByTestId('commission-todo-context')).toContainText(ADJUSTMENT_APPROVAL_ID);
        await expect(page.getByTestId('commission-adjustment-highlighted-row')).toContainText('扣回');
    });
});

function createProjectDetail() {
    return {
        id: WORKSPACE_PROJECT_ID,
        projectNo: 'E2E-OSG-FXT-MAIN',
        projectName: 'E2E EX-13B main',
        customerId: null,
        customerName: 'FE39 客户',
        customerProjectNo: 'CUS-FE39',
        status: 'active',
        currentStage: 'handover',
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        plannedSignAt: null,
        closedAt: null,
        closedReason: null,
        rowVersion: 3,
        createdAt: '2026-04-20T09:00:00.000Z',
        createdBy: 'system',
        updatedAt: '2026-04-28T09:00:00.000Z',
        updatedBy: 'admin',
        ownerName: 'FE39 Owner',
        ownerOrgName: 'FE39 事业部',
        stageSummary: {
            currentStage: 'handover',
            status: 'active',
            plannedSignAt: null,
            closedAt: null,
            closedReason: null,
            blockingReasons: []
        },
        currentBidSummary: {
            bidProcessId: null,
            bidStatus: 'not_configured',
            resultStatus: null,
            summary: null
        },
        currentContractSummary: {
            activeContractCount: 1,
            latestContractId: CONTRACT_ID,
            latestContractNo: 'HT-FE39',
            latestContractStatus: 'active',
            signedAmount: '100000.00',
            currencyCode: 'CNY',
            signedAt: '2026-04-20T00:00:00.000Z',
            currentSnapshotId: 'snapshot-1'
        },
        currentApprovalSummary: {
            summarySnapshotId: 'summary-1',
            summaryPackageKey: 'project-detail',
            projectionLevel: 'project',
            exportPolicy: 'internal',
            generatedAt: '2026-04-28T09:00:00.000Z'
        },
        currentConfirmationSummary: {
            confirmationRecordId: null,
            status: 'not_configured',
            requiredCount: 0,
            confirmedCount: 0,
            pendingCount: 0,
            confirmedAt: null
        },
        summarySnapshotId: 'summary-1',
        projectionLevel: 'project',
        exportPolicy: 'internal',
        allowedActions: ['view-project-workspace', 'manage-project-commission'],
        generatedAt: '2026-04-28T09:00:00.000Z'
    };
}

function createWorkspaceGuidance() {
    return {
        projectId: WORKSPACE_PROJECT_ID,
        currentStage: 'handover',
        status: 'active',
        currentStageLabel: '项目移交',
        statusLabel: '正常推进',
        headline: 'FE40 提成工作区',
        currentFocus: '处理待办深链',
        currentGap: '无',
        nextStep: '处理提成审批待办',
        ownerLabel: '提成负责人',
        blockingReasons: [],
        basisSummary: {
            summarySnapshotId: 'summary-1',
            projectionLevel: 'workspace-guidance',
            exportPolicy: 'internal',
            generatedAt: '2026-04-28T09:00:00.000Z'
        },
        recommendedEntries: [
            {
                key: 'commission-operations',
                label: '提成操作',
                description: '处理提成规则、计算、发放和调整。',
                route: `/projects/${WORKSPACE_PROJECT_ID}/commission/operations`,
                enabled: true,
                disabledReason: null,
                actionKey: 'manage-project-commission'
            }
        ],
        generatedAt: '2026-04-28T09:00:00.000Z'
    };
}

function createCalculation() {
    return {
        id: CALCULATION_ID,
        projectId: WORKSPACE_PROJECT_ID,
        ruleVersionId: '54000000-0000-4000-8000-000000000391',
        version: 1,
        rowVersion: 1,
        isCurrent: true,
        status: 'effective',
        recognizedRevenueTaxExclusive: '100000.00',
        recognizedCostTaxExclusive: '60000.00',
        contributionMargin: '40000.00',
        contributionMarginRate: '0.4000',
        commissionPool: '12000.00',
        recalculatedFromId: null,
        approvedAt: '2026-04-28T09:00:00.000Z',
        createdAt: '2026-04-28T08:00:00.000Z',
        updatedAt: '2026-04-28T09:00:00.000Z'
    };
}

function createPayout() {
    return {
        id: PAYOUT_ID,
        projectId: WORKSPACE_PROJECT_ID,
        calculationId: CALCULATION_ID,
        rowVersion: 2,
        stageType: 'first',
        payoutKind: 'primary',
        sourcePayoutId: null,
        selectedTier: 'basic',
        theoreticalCapAmount: '5000.00',
        approvedAmount: null,
        paidRecordAmount: null,
        status: 'pending-approval',
        approvedAt: null,
        handledAt: null,
        createdAt: '2026-04-28T08:10:00.000Z',
        updatedAt: '2026-04-28T09:00:00.000Z'
    };
}

function createAdjustment() {
    return {
        id: ADJUSTMENT_ID,
        projectId: WORKSPACE_PROJECT_ID,
        rowVersion: 2,
        adjustmentType: 'clawback',
        relatedPayoutId: PAYOUT_ID,
        relatedCalculationId: CALCULATION_ID,
        amount: '800.00',
        reason: 'FE40 调整审批上下文',
        status: 'pending-approval',
        executedAt: null,
        createdAt: '2026-04-28T08:20:00.000Z',
        updatedAt: '2026-04-28T09:00:00.000Z'
    };
}

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
