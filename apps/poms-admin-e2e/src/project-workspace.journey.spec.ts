import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, login, VIEWER_CREDENTIALS } from './support/auth';

const WORKSPACE_PROJECT_NO = 'E2E-OSG-FXT-MAIN';
const WORKSPACE_PROJECT_ID = '21000000-0000-4000-8000-000000000201';
const HANDOVER_PROJECT_NO = 'E2E-HO-MAIN';
const HANDOVER_PROJECT_ID = '21000000-0000-4000-8000-000000000002';
const PRESIGNING_PROJECT_NO = 'PRJ-2026-001';
const PRESIGNING_PROJECT_ID = '20000000-0000-4000-8000-000000000001';

async function openProjectList(page: Page, projectNo = WORKSPACE_PROJECT_NO): Promise<void> {
    await page.getByRole('link', { name: '项目管理' }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await page.getByPlaceholder('搜索项目').fill(projectNo);
}

async function locateProjectRow(page: Page, projectNo = WORKSPACE_PROJECT_NO) {
    const row = page.locator('tr').filter({ hasText: projectNo }).first();
    await expect(row).toBeVisible();
    return row;
}

async function openWorkspaceFromProjectList(page: Page, projectNo = WORKSPACE_PROJECT_NO, projectId = WORKSPACE_PROJECT_ID): Promise<void> {
    await openProjectList(page, projectNo);
    const projectRow = await locateProjectRow(page, projectNo);
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

async function openProjectDetailByNo(page: Page, projectNo: string, projectId: string, heading: string): Promise<void> {
    await openProjectList(page, projectNo);
    const projectRow = await locateProjectRow(page, projectNo);
    await projectRow.getByRole('button', { name: '详情' }).click();

    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
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
    const entry = page.locator('div.py-4').filter({ hasText: title }).filter({ hasText: reason }).first();

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

async function expectRuleExplanationSurface(page: Page): Promise<void> {
    await expect(page.getByText(/规则解释暂不可用|当前规则结论/)).toBeVisible();
}

async function mockProjectArchiveHistory(page: Page): Promise<void> {
    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}`, async (route) => {
        const response = await route.fetch();
        const project = (await response.json()) as {
            allowedActions?: string[];
            currentStage?: string;
            stageSummary?: {
                currentStage?: string;
                status?: string;
                blockingReasons?: string[];
            };
            status?: string;
        };
        project.currentStage = 'completed';
        project.status = 'completed';
        project.stageSummary = {
            ...(project.stageSummary ?? {}),
            currentStage: 'completed',
            status: 'completed',
            blockingReasons: []
        };
        project.allowedActions = [...new Set([...(project.allowedActions ?? []), 'edit-project-basic-info'])];

        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(project)
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/archive-records`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify([
                {
                    id: '38000000-0000-4000-8000-000000000202',
                    projectId: WORKSPACE_PROJECT_ID,
                    archiveAnchorStage: 'completed',
                    archiveAnchorSourceType: 'project-completion-record',
                    archiveAnchorSourceId: '37000000-0000-4000-8000-000000000202',
                    status: 'recorded',
                    archivedAt: '2026-04-24T15:20:00.000Z',
                    archivedBy: '10000000-0000-4000-8000-000000000001',
                    archivedByName: '归档负责人',
                    archiveSummary: 'e2e 归档记录已更新',
                    evidenceSummary: 'e2e 新版归档清单',
                    supersedesArchiveRecordId: '38000000-0000-4000-8000-000000000201',
                    replacementReason: 'e2e 补充验收附件',
                    voidedAt: null,
                    voidedBy: null,
                    voidedByName: null,
                    voidReason: null,
                    createdAt: '2026-04-24T15:20:00.000Z',
                    createdBy: '10000000-0000-4000-8000-000000000001',
                    updatedAt: '2026-04-24T15:20:00.000Z',
                    updatedBy: '10000000-0000-4000-8000-000000000001',
                    rowVersion: 7,
                    allowedActions: ['replace-project-archive-record', 'void-project-archive-record']
                },
                {
                    id: '38000000-0000-4000-8000-000000000201',
                    projectId: WORKSPACE_PROJECT_ID,
                    archiveAnchorStage: 'completed',
                    archiveAnchorSourceType: 'project-completion-record',
                    archiveAnchorSourceId: '37000000-0000-4000-8000-000000000201',
                    status: 'superseded',
                    archivedAt: '2026-04-23T10:00:00.000Z',
                    archivedBy: '10000000-0000-4000-8000-000000000001',
                    archivedByName: '归档负责人',
                    archiveSummary: 'e2e 原始归档记录',
                    evidenceSummary: 'e2e 原始归档清单',
                    supersedesArchiveRecordId: null,
                    replacementReason: null,
                    voidedAt: null,
                    voidedBy: null,
                    voidedByName: null,
                    voidReason: null,
                    createdAt: '2026-04-23T10:00:00.000Z',
                    createdBy: '10000000-0000-4000-8000-000000000001',
                    updatedAt: '2026-04-24T15:20:00.000Z',
                    updatedBy: '10000000-0000-4000-8000-000000000001',
                    rowVersion: 4,
                    allowedActions: []
                },
                {
                    id: '38000000-0000-4000-8000-000000000200',
                    projectId: WORKSPACE_PROJECT_ID,
                    archiveAnchorStage: 'completed',
                    archiveAnchorSourceType: 'project-completion-record',
                    archiveAnchorSourceId: '37000000-0000-4000-8000-000000000200',
                    status: 'voided',
                    archivedAt: '2026-04-22T10:00:00.000Z',
                    archivedBy: '10000000-0000-4000-8000-000000000001',
                    archivedByName: '归档负责人',
                    archiveSummary: 'e2e 撤销归档记录',
                    evidenceSummary: 'e2e 撤销归档清单',
                    supersedesArchiveRecordId: null,
                    replacementReason: null,
                    voidedAt: '2026-04-22T12:00:00.000Z',
                    voidedBy: '10000000-0000-4000-8000-000000000001',
                    voidedByName: '审计负责人',
                    voidReason: 'e2e 资料重复',
                    createdAt: '2026-04-22T10:00:00.000Z',
                    createdBy: '10000000-0000-4000-8000-000000000001',
                    updatedAt: '2026-04-22T12:00:00.000Z',
                    updatedBy: '10000000-0000-4000-8000-000000000001',
                    rowVersion: 3,
                    allowedActions: []
                }
            ])
        });
    });
}

async function mockProjectArchiveCreateFlow(page: Page): Promise<void> {
    const createdArchiveRecord = {
        id: '38000000-0000-4000-8000-000000000301',
        projectId: WORKSPACE_PROJECT_ID,
        archiveAnchorStage: 'completed',
        archiveAnchorSourceType: 'project-completion-record',
        archiveAnchorSourceId: '37000000-0000-4000-8000-000000000301',
        status: 'recorded',
        archivedAt: '2026-04-26T10:30:00.000Z',
        archivedBy: '10000000-0000-4000-8000-000000000001',
        archivedByName: '归档负责人',
        archiveSummary: 'e2e 首次归档结论',
        evidenceSummary: 'e2e 首次归档清单',
        supersedesArchiveRecordId: null,
        replacementReason: null,
        voidedAt: null,
        voidedBy: null,
        voidedByName: null,
        voidReason: null,
        createdAt: '2026-04-26T10:30:00.000Z',
        createdBy: '10000000-0000-4000-8000-000000000001',
        updatedAt: '2026-04-26T10:30:00.000Z',
        updatedBy: '10000000-0000-4000-8000-000000000001',
        rowVersion: 1,
        allowedActions: ['replace-project-archive-record', 'void-project-archive-record']
    };
    let archiveCreated = false;

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}`, async (route) => {
        const response = await route.fetch();
        const project = (await response.json()) as {
            allowedActions?: string[];
            currentStage?: string;
            stageSummary?: {
                currentStage?: string;
                status?: string;
                blockingReasons?: string[];
            };
            status?: string;
        };
        project.currentStage = 'completed';
        project.status = 'completed';
        project.stageSummary = {
            ...(project.stageSummary ?? {}),
            currentStage: 'completed',
            status: 'completed',
            blockingReasons: []
        };
        project.allowedActions = [...new Set([...(project.allowedActions ?? []), 'edit-project-basic-info'])];

        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(project)
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/timeline`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                projectId: WORKSPACE_PROJECT_ID,
                events: [
                    {
                        eventKey: 'project-completion:37000000-0000-4000-8000-000000000301',
                        stage: 'completed',
                        stageLabel: '已完成',
                        eventType: 'stage-completed',
                        occurredAt: '2026-04-25T09:00:00.000Z',
                        actorUserId: '10000000-0000-4000-8000-000000000001',
                        actorName: '交付负责人',
                        resultLabel: '项目完成已确认',
                        sourceType: 'project-completion-record',
                        sourceId: '37000000-0000-4000-8000-000000000301',
                        evidenceLabel: '项目完成确认单',
                        isAuthoritative: true
                    }
                ],
                generatedAt: '2026-04-26T10:00:00.000Z'
            })
        });
    });

    await page.route(`**/api/projects/${WORKSPACE_PROJECT_ID}/archive-records`, async (route) => {
        if (route.request().method() === 'POST') {
            const requestBody = route.request().postDataJSON() as {
                archivedAt: string;
                archiveSummary: string;
                evidenceSummary: string;
            };
            archiveCreated = true;
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    ...createdArchiveRecord,
                    archivedAt: requestBody.archivedAt,
                    archiveSummary: requestBody.archiveSummary,
                    evidenceSummary: requestBody.evidenceSummary,
                    allowedActions: []
                })
            });
            return;
        }

        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(archiveCreated ? [createdArchiveRecord] : [])
        });
    });
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

        await openWorkspaceFromProjectList(page, HANDOVER_PROJECT_NO, HANDOVER_PROJECT_ID);

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

    test('admin can enter the pre-signing workspace from project detail and workspace links', async ({ page }) => {
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await openProjectDetailByNo(page, PRESIGNING_PROJECT_NO, PRESIGNING_PROJECT_ID, 'POMS 首期项目主链路样例');

        await page.getByRole('button', { name: '项目工作区' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${PRESIGNING_PROJECT_ID}/workspace$`));

        await openWorkspaceHomeEntry(page, '签约前主线');
        await expect(page).toHaveURL(new RegExp(`/projects/${PRESIGNING_PROJECT_ID}/workspace/pre-signing$`));
        await expect(page.getByRole('heading', { name: '签约前主线' })).toBeVisible();
        await expect(page.locator('app-project-pre-signing-overview').getByText('商务收口').first()).toBeVisible();
        await expect(page.locator('app-project-pre-signing-overview').getByText('报价与毛利评审').first()).toBeVisible();
        await expect(page.getByText('范围边界、排除项、技术风险和前期成本。')).toBeVisible();
        await expect(page.getByText('签约就绪承接包尚未形成')).toBeVisible();

        await returnToWorkspaceHome(page, PRESIGNING_PROJECT_ID);
        await openWorkspaceHomeEntry(page, '技术与成本');
        await expect(page).toHaveURL(new RegExp(`/projects/${PRESIGNING_PROJECT_ID}/workspace/technical-cost$`));
        await expect(page.getByRole('heading', { name: '技术与成本', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: '技术与成本版本包尚未形成' })).toBeVisible();

        await returnToWorkspaceHome(page, PRESIGNING_PROJECT_ID);
        await openWorkspaceHomeEntry(page, '招投标 / 商务竞标');
        await expect(page).toHaveURL(new RegExp(`/projects/${PRESIGNING_PROJECT_ID}/workspace/bid-commercial$`));
        await expect(page.getByRole('heading', { name: '招投标 / 商务竞标', exact: true })).toBeVisible();
        await expect(page.getByText(/竞标过程尚未形成|当前竞标过程/)).toBeVisible();

        await page.getByRole('link', { name: '进入报价与毛利评审' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${PRESIGNING_PROJECT_ID}/workspace/pricing-margin$`));
        await expect(page.getByRole('heading', { name: '报价与毛利评审', exact: true })).toBeVisible();
        await expect(page.getByText(/报价与毛利评审尚未形成|当前报价评审/)).toBeVisible();

        await returnToWorkspaceHome(page, PRESIGNING_PROJECT_ID);
        await page.getByRole('link', { name: '签约前主线' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${PRESIGNING_PROJECT_ID}/workspace/pre-signing$`));

        await page.goto(`/projects/${PRESIGNING_PROJECT_ID}/workspace/pre-signing`);
        await expect(page.getByText('当前阻断与下一步')).toBeVisible();

        await page.goto(`/projects/${PRESIGNING_PROJECT_ID}/workspace/technical-cost`);
        await expect(page.getByText('缺少技术与成本版本包')).toBeVisible();

        await page.goto(`/projects/${PRESIGNING_PROJECT_ID}/workspace/bid-commercial`);
        await expect(page.getByText(/缺少正式竞标事实|当前竞标过程/)).toBeVisible();

        await page.goto(`/projects/${PRESIGNING_PROJECT_ID}/workspace/pricing-margin`);
        await expect(page.getByText(/缺少正式报价评审事实|当前报价评审/)).toBeVisible();
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

        await expect(page.getByRole('button', { name: '最终结算 · 项目进入验收或完成阶段后再查看最终结算。' })).toBeDisabled();

        await page.getByRole('link', { name: '规则解释' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/rule-explanation$`));
        await expectRuleExplanationSurface(page);
    });

    test('admin can inspect archive audit history from project detail opened from the project list', async ({ page }) => {
        await mockProjectArchiveHistory(page);
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await openProjectDetailFromList(page);

        await expect(page.getByText('项目归档')).toBeVisible();
        await expect(page.getByText('e2e 归档记录已更新').first()).toBeVisible();
        await expect(page.getByText('归档历史')).toBeVisible();
        await expect(page.getByText('已被替代')).toBeVisible();
        await expect(page.getByText('已撤销')).toBeVisible();
        await expect(page.getByText('e2e 补充验收附件')).toBeVisible();
        await expect(page.getByText('e2e 资料重复')).toBeVisible();

        await page.getByRole('button', { name: '替代归档' }).click();
        await expect(page.getByRole('dialog', { name: '替代归档记录' })).toBeVisible();
        await page.getByRole('button', { name: '取消' }).click();

        await page.getByRole('button', { name: '撤销归档' }).click();
        await expect(page.getByRole('dialog', { name: '撤销归档记录' })).toBeVisible();
    });

    test('admin can create the first archive record from project detail opened from the project list in archive audit flow', async ({ page }) => {
        await mockProjectArchiveCreateFlow(page);
        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await openProjectDetailFromList(page);

        await expect(page.getByText('项目归档')).toBeVisible();
        await expect(page.getByText('尚未形成归档记录')).toBeVisible();

        await page.getByRole('button', { name: '创建归档记录' }).click();
        const dialog = page.getByRole('dialog', { name: '创建归档记录' });
        await expect(dialog).toBeVisible();
        await dialog.getByLabel('归档时间').fill('2026-04-26T10:30');
        await dialog.getByLabel('归档结论').fill('e2e 首次归档结论');
        await dialog.getByLabel('证据摘要').fill('e2e 首次归档清单');
        await dialog.getByRole('button', { name: '提交归档' }).click();

        await expect(dialog).toBeHidden();
        await expect(page.getByText('e2e 首次归档结论').first()).toBeVisible();
        await expect(page.getByText('e2e 首次归档清单').first()).toBeVisible();
        await expect(page.getByText('归档历史')).toBeVisible();
        await expect(page.getByRole('button', { name: '替代归档' })).toBeVisible();
        await expect(page.getByRole('button', { name: '撤销归档' })).toBeVisible();
    });

    test('admin can use the core workspace chain on a mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });

        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.goto(`/projects/${PRESIGNING_PROJECT_ID}`);
        await expect(page.getByRole('heading', { name: 'POMS 首期项目主链路样例' })).toBeVisible();

        await page.getByRole('button', { name: '项目工作区' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${PRESIGNING_PROJECT_ID}/workspace$`));
        await expect(page.getByRole('heading', { name: /项目工作区/ })).toBeVisible();

        await openWorkspaceHomeEntry(page, '签约前主线');
        await expect(page).toHaveURL(new RegExp(`/projects/${PRESIGNING_PROJECT_ID}/workspace/pre-signing$`));
        await expect(page.getByRole('heading', { name: '签约前主线' })).toBeVisible();
        await expect(page.getByText('当前阻断与下一步')).toBeVisible();

        await page.getByRole('link', { name: '返回工作区总览' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${PRESIGNING_PROJECT_ID}/workspace$`));

        await openWorkspaceHomeEntry(page, '技术与成本');
        await expect(page).toHaveURL(new RegExp(`/projects/${PRESIGNING_PROJECT_ID}/workspace/technical-cost$`));
        await expect(page.getByRole('heading', { name: '技术与成本', exact: true })).toBeVisible();
        await expect(page.getByText('缺少技术与成本版本包')).toBeVisible();

        await page.getByRole('link', { name: '返回签约前主线' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${PRESIGNING_PROJECT_ID}/workspace/pre-signing$`));

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}`);
        await expect(page.getByRole('heading', { name: /E2E EX-13B main/i })).toBeVisible();

        await page.getByRole('button', { name: '项目工作区' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/workspace$`));

        await openWorkspaceHomeEntry(page, '提成阶段解释');
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/gate-overview$`));
        await expect(page.getByRole('heading', { name: '当前 gate 结论' })).toBeVisible();

        await page.getByRole('link', { name: '查看经营总览' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/workspace/operating-overview$`));
        await expect(page.getByText('Tax package is pending closeout')).toBeVisible();

        await page.getByRole('link', { name: '查看提成阶段解释' }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${WORKSPACE_PROJECT_ID}/commission/gate-overview$`));
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

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/freeze-binding`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/workspace/operating-overview`);
        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();

        await page.goto(`/projects/${WORKSPACE_PROJECT_ID}/commission/final-settlement`);
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
