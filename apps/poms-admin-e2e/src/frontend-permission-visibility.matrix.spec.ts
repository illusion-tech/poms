import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, login, VIEWER_CREDENTIALS } from './support/auth';

const WORKSPACE_PROJECT_NO = 'E2E-OSG-FXT-MAIN';
const WORKSPACE_PROJECT_ID = '21000000-0000-4000-8000-000000000201';
const CONTRACT_ID = '31000000-0000-4000-8000-000000000421';

type SensitiveFieldPackageKey = 'contract-finance' | 'operating-finance' | 'commission-compensation';

function sensitiveProjection(value: string | null, fieldPackageKey: SensitiveFieldPackageKey = 'contract-finance', maskedDisplayText = '经营敏感字段已隐藏') {
    return {
        fieldPackageKey,
        mode: value === null ? 'masked' : 'full',
        value,
        displayText: value ?? maskedDisplayText,
        reasonCode: value === null ? 'missing-sensitive-read-permission' : 'allowed'
    };
}

function operatingProjection(value: string | null) {
    return sensitiveProjection(value, 'operating-finance', '敏感字段已隐藏');
}

function commissionProjection(value: string | null) {
    return sensitiveProjection(value, 'commission-compensation', '敏感字段已隐藏');
}

function freezeVersionSummary() {
    return {
        id: '51000000-0000-4000-8000-000000000441',
        projectId: WORKSPACE_PROJECT_ID,
        version: 3,
        rowVersion: 1,
        isCurrent: true,
        status: 'frozen',
        participantsJson: [
            {
                userId: '10000000-0000-4000-8000-000000000001',
                displayName: 'FE44 冻结负责人',
                roleType: 'project-owner',
                weight: 100
            }
        ],
        sourceHandoverId: null,
        sourceHandoverRebaselineRecordId: null,
        contractSummarySnapshotId: null,
        handoverSummarySnapshotId: null,
        effectiveHandoverBaselineSnapshotId: null,
        frozenAt: '2026-04-28T09:00:00.000Z',
        createdAt: '2026-04-28T09:00:00.000Z',
        updatedAt: '2026-04-28T09:00:00.000Z'
    };
}

async function mockContractList(page: Page, signedAmount: string | null = '660000.00'): Promise<void> {
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
                    signedAmount,
                    signedAmountProjection: sensitiveProjection(signedAmount),
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

async function mockL4L5ProjectionViews(page: Page): Promise<void> {
    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/business-outcome-overview`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                projectId: WORKSPACE_PROJECT_ID,
                effectiveContractSetSummaryProjection: operatingProjection('880000.00'),
                receivableConfirmedAmountSummaryProjection: operatingProjection(null),
                includedCostTotalSummaryProjection: operatingProjection('530000.00'),
                currentEffectiveBaselineCostSummaryProjection: operatingProjection('500000.00'),
                grossMarginAmountProjection: operatingProjection('FE44 毛利可见'),
                grossMarginRateProjection: operatingProjection('0.320000'),
                taxImpactSummaryProjection: operatingProjection(null),
                allocationStabilitySummary: 'FE44 分摊稳定性 residual 说明',
                unmappedCostSummary: 'FE44 未映射成本 residual 说明',
                dataMaturityLevel: 'stable',
                currentActionLevel: 'REVIEW',
                referencedBaselineVersion: 'baseline-fe44',
                referencedSnapshotVersion: 'snapshot-fe44',
                allowedActions: []
            })
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/unified-accounting`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                projectId: WORKSPACE_PROJECT_ID,
                snapshotId: 'snapshot-fe44',
                originalBaselineCostSummaryProjection: operatingProjection('480000.00'),
                currentEffectiveBaselineCostSummaryProjection: operatingProjection('500000.00'),
                includedCostTotalSummaryProjection: operatingProjection('530000.00'),
                receivableConfirmedAmountSummaryProjection: operatingProjection(null),
                taxImpactSummaryProjection: operatingProjection(null),
                taxImpactPendingAmountProjection: operatingProjection(null),
                allocationStabilitySummary: 'FE44 统一核算分摊 residual',
                unmappedCostSummary: 'FE44 统一核算未映射 residual',
                dataMaturityLevel: 'stable',
                costActionRecommendation: 'REVIEW',
                referencedBaselineVersion: 'baseline-fe44',
                referencedSnapshotVersion: 'snapshot-fe44',
                allowedActions: []
            })
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/variance-risk-explanation`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                projectId: WORKSPACE_PROJECT_ID,
                signalEvaluationId: 'signal-fe44',
                varianceSourceSummaryProjection: operatingProjection(null),
                riskLevel: 'ATTENTION',
                taxImpactSummaryProjection: operatingProjection('FE44 偏差税务可见'),
                allocationStabilitySummary: 'FE44 偏差分摊 residual 说明',
                unmappedCostSummary: 'FE44 偏差未映射 residual 说明',
                dataMaturityLevel: 'stable',
                costActionRecommendation: 'REVIEW',
                currentActionLevel: 'REVIEW',
                referencedBaselineVersion: 'baseline-fe44',
                referencedSnapshotVersion: 'snapshot-fe44',
                recommendedActionSummary: 'FE44 推荐动作 residual 说明',
                allowedActions: []
            })
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/business-accounting-feedback`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                projectId: WORKSPACE_PROJECT_ID,
                signalLevel: 'ATTENTION',
                currentActionLevel: 'REVIEW',
                taxImpactSummaryProjection: operatingProjection('FE44 gate 税务可见'),
                allocationStabilitySummary: 'FE44 gate 分摊 residual 说明',
                unmappedCostSummary: 'FE44 gate 未映射 residual 说明',
                dataMaturityLevel: 'stable',
                costActionRecommendation: 'REVIEW',
                referencedBaselineVersion: 'baseline-fe44',
                referencedSnapshotVersion: 'snapshot-fe44',
                nextActionSummaryProjection: commissionProjection(null),
                downstreamConsumerSummaryProjection: commissionProjection('FE44 下游提成消费可见'),
                allowedActions: []
            })
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/commission-final-settlement`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                projectId: WORKSPACE_PROJECT_ID,
                finalSettlementStatus: 'pending-final-settlement',
                nonRetentionSettlementStatus: 'settled',
                retentionSettlementStatus: 'waiting-retention',
                retentionDueDate: '2026-05-20',
                retentionDueStatus: 'pending',
                retentionRequirementSummary: 'FE44 质保金条件 residual 说明',
                retentionReceiptSummary: 'FE44 质保金到账 residual 说明',
                departureExceptionSummary: 'FE44 离场例外 residual 说明',
                freezeVersionSummary: freezeVersionSummary(),
                baselineSelectionSource: 'original',
                taxImpactSummaryProjection: operatingProjection(null),
                taxImpactPendingAmountProjection: operatingProjection(null),
                dataMaturityLevel: 'stable',
                costActionRecommendation: 'REVIEW',
                currentActionLevel: 'BLOCK',
                referencedBaselineVersion: 'baseline-fe44',
                referencedSnapshotVersion: 'snapshot-fe44',
                summaryPackageKey: 'commission-final-settlement',
                summarySnapshotId: 'snapshot-fe44',
                projectionLevel: 'final-settlement',
                exportPolicy: 'controlled',
                allowedActions: []
            })
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/commission-rule-explanation`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                projectId: WORKSPACE_PROJECT_ID,
                currentStageStatus: 'blocked-retention',
                gateDecisionCode: 'BLOCK_RETENTION',
                blockingReasonCategory: 'retention',
                blockingReasonCode: 'RETENTION_RECEIPT_PENDING',
                blockingReasonSummary: 'FE44 阻塞说明 residual 文本',
                gateDecisionSummary: 'FE44 gate 结论 residual 文本',
                nextActionSummaryProjection: commissionProjection(null),
                freezeVersionSummary: freezeVersionSummary(),
                baselineSelectionSource: 'original',
                taxImpactSummaryProjection: operatingProjection('FE44 规则税务可见'),
                taxImpactPendingAmountProjection: operatingProjection(null),
                dataMaturityLevel: 'stable',
                costActionRecommendation: 'REVIEW',
                currentActionLevel: 'BLOCK',
                referencedBaselineVersion: 'baseline-fe44',
                referencedSnapshotVersion: 'snapshot-fe44',
                summaryPackageKey: 'commission-final-settlement',
                summarySnapshotId: 'snapshot-fe44',
                projectionLevel: 'final-settlement',
                exportPolicy: 'controlled',
                allowedActions: []
            })
        });
    });
}

async function openProjectList(page: Page): Promise<void> {
    await page.getByRole('link', { name: '项目管理' }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await page.getByPlaceholder('搜索项目').fill(WORKSPACE_PROJECT_NO);
}

async function locateProjectRow(page: Page) {
    const row = page.locator('tr').filter({ hasText: WORKSPACE_PROJECT_NO }).first();
    await expect(row).toBeVisible();
    return row;
}

async function openWorkspaceFromProjectList(page: Page): Promise<void> {
    await openProjectList(page);
    const projectRow = await locateProjectRow(page);
    await projectRow.getByRole('button', { name: '工作区' }).click();

    await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/workspace$`));
    await expect(page.getByRole('heading', { name: /项目工作区/ })).toBeVisible();
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
        await mockContractList(page, '660000.00');

        await page.getByRole('link', { name: '合同管理' }).click();
        await expect(page).toHaveURL(/\/contracts$/);
        await expect(page.getByText('CT-FE42-MATRIX')).toBeVisible();
        await expect(page.getByText('660,000.00 CNY')).toBeVisible();
        await expect(page.getByText('经营敏感字段已隐藏')).toHaveCount(0);
        await expect(page.getByRole('button', { name: '新建合同' })).toBeVisible();
    });

    test('viewer can enter contracts but sees masked finance fields and no create action', async ({ page }) => {
        await login(page, VIEWER_CREDENTIALS);
        await mockContractList(page, null);

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

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/workspace/variance-risk`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/gate-overview`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/final-settlement`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/rule-explanation`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/operations?payoutId=51000000-0000-4000-8000-000000000421`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();
    });

    test('admin enters L4 and L5 workspace pages from the signed-in project path and renders projection modes', async ({ page }) => {
        await mockL4L5ProjectionViews(page);
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await openWorkspaceFromProjectList(page);

        await openWorkspaceHomeEntry(page, '经营总览');
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/workspace/operating-overview$`));
        await expect(page.getByText('880,000.00')).toBeVisible();
        await expect(page.getByText('FE44 毛利可见')).toBeVisible();
        await expect(page.getByText('敏感字段已隐藏').first()).toBeVisible();
        await expect(page.getByText('FE44 分摊稳定性 residual 说明')).toBeVisible();
        await expect(page.getByText('FE44 未映射成本 residual 说明')).toBeVisible();

        await page.getByRole('link', { name: '偏差与风险', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/workspace/variance-risk$`));
        await expect(page.getByText('FE44 推荐动作 residual 说明')).toBeVisible();
        await expect(page.getByText('FE44 偏差分摊 residual 说明')).toBeVisible();
        await expect(page.getByText('FE44 偏差税务可见')).toBeVisible();

        await page.getByRole('link', { name: '提成阶段解释', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/gate-overview$`));
        await expect(page.getByText('FE44 下游提成消费可见')).toBeVisible();
        await expect(page.getByText('FE44 gate 分摊 residual 说明')).toBeVisible();
        await expect(page.getByText('敏感字段已隐藏').first()).toBeVisible();
    });

    test('admin direct L5 settlement and rule explanation pages honor projections and residual text classification', async ({ page }) => {
        await mockL4L5ProjectionViews(page);
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/final-settlement`);
        await expect(page.getByRole('heading', { name: '当前结算链状态' })).toBeVisible();
        await expect(page.getByText('FE44 质保金条件 residual 说明')).toBeVisible();
        await expect(page.getByText('FE44 质保金到账 residual 说明')).toBeVisible();
        await expect(page.getByText('FE44 离场例外 residual 说明')).toBeVisible();
        await expect(page.getByText('敏感字段已隐藏').first()).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/rule-explanation`);
        await expect(page.getByRole('heading', { name: '当前规则结论' })).toBeVisible();
        await expect(page.getByText('FE44 gate 结论 residual 文本')).toBeVisible();
        await expect(page.getByText('FE44 阻塞说明 residual 文本')).toBeVisible();
        await expect(page.getByText('FE44 规则税务可见')).toBeVisible();
        await expect(page.getByText('敏感字段已隐藏').first()).toBeVisible();
    });

    test('anonymous protected routes redirect to login and preserve returnUrl', async ({ page }) => {
        await page.goto('/contracts');
        await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fcontracts$/);

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/workspace/variance-risk`);
        await expect(page).toHaveURL(new RegExp(`/auth/login\\?returnUrl=%2Fprojects%2F${WORKSPACE_PROJECT_ID}%2Fworkspace%2Fvariance-risk$`));

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/rule-explanation`);
        await expect(page).toHaveURL(new RegExp(`/auth/login\\?returnUrl=%2Fprojects%2F${WORKSPACE_PROJECT_ID}%2Fcommission%2Frule-explanation$`));

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/operations?payoutId=51000000-0000-4000-8000-000000000421`);
        await expect(page).toHaveURL(new RegExp(`/auth/login\\?returnUrl=%2Fprojects%2F${WORKSPACE_PROJECT_ID}%2Fcommission%2Foperations%3FpayoutId%3D51000000-0000-4000-8000-000000000421$`));
    });
});
