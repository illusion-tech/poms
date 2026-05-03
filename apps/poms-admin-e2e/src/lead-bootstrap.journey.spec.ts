import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, login, SALES_CREDENTIALS, VIEWER_CREDENTIALS } from './support/auth';

function uniqueSuffix(): string {
    return Date.now().toString(36);
}

async function openLeadsFromMenu(page: Page): Promise<void> {
    await page.getByRole('link', { name: '线索管理' }).click();
    await expect(page).toHaveURL(/\/leads$/);
    await expect(page.getByRole('heading', { name: '线索管理' })).toBeVisible();
}

async function openLeadsFromProjectEntry(page: Page): Promise<void> {
    await page.getByRole('link', { name: '项目管理' }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole('heading', { name: '项目管理' })).toBeVisible();
    await expect(page.getByRole('button', { name: '新建项目' })).toHaveCount(0);

    await page.getByRole('button', { name: '从线索创建项目' }).click();
    await expect(page).toHaveURL(/\/leads$/);
    await expect(page.getByRole('heading', { name: '线索管理' })).toBeVisible();
}

async function createLeadFromDialog(page: Page, lead: { name: string; customerName: string; sourceName: string }): Promise<void> {
    await page.getByRole('button', { name: '登记线索' }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: '登记线索' }).last();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('线索编号', { exact: true })).toHaveCount(0);
    await dialog.getByLabel('线索标题').fill(lead.name);
    await dialog.getByRole('combobox', { name: '选择客户主数据' }).click();
    await page.getByRole('option', { name: new RegExp(lead.customerName) }).first().click();
    await dialog.getByRole('combobox', { name: '选择来源' }).click();
    await page.getByRole('option', { name: lead.sourceName, exact: true }).click();
    await dialog.getByLabel('需求描述').fill('客户希望补强运营平台的项目协同能力。');
    await dialog.getByRole('combobox', { name: '预算未知' }).click();
    await page.getByRole('option', { name: '预算已确认', exact: true }).click();
    await dialog.getByLabel('预计金额').fill('1200000');
    await dialog.getByRole('combobox').nth(5).click();
    await page.getByRole('option', { name: /销售人员.*华南销售一部/ }).click();
    await expect(dialog.getByRole('combobox', { name: '华南销售一部', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: '登记线索' }).click();

    const row = page.locator('tr').filter({ hasText: lead.name }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(/LD-\d{4}-\d{6}/);
    await expect(row.getByText('待确认')).toBeVisible();
    await expect(row).toContainText(lead.customerName);
    await expect(row).toContainText(lead.sourceName);
    await expect(row).toContainText('销售人员');
    await expect(row).toContainText('华南销售一部');
}

async function qualifyLead(page: Page, leadName: string): Promise<void> {
    const row = page.locator('tr').filter({ hasText: leadName }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: '确认有效' }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: '确认线索有效' }).last();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('当前销售主责')).toBeVisible();
    await expect(dialog.getByText('销售人员')).toBeVisible();
    await dialog.getByPlaceholder('例如：客户预算明确，已确认采购意向。').fill('客户预算明确，采购窗口已确认。');
    await dialog.getByRole('button', { name: '确认有效' }).click();

    await expect(row.getByText('已有效')).toBeVisible();
    await expect(row.getByRole('button', { name: '转入项目' })).toBeVisible();
}

async function convertLeadToProject(page: Page, leadName: string, project: { customerProjectNo: string; name: string }): Promise<void> {
    const row = page.locator('tr').filter({ hasText: leadName }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: '转入项目' }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: '转入项目' }).last();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('项目编号', { exact: true })).toHaveCount(0);
    await expect(dialog.getByText('项目销售主责（继承线索）')).toBeVisible();
    await expect(dialog.getByText('销售人员')).toBeVisible();
    await expect(dialog.getByText('华南销售一部')).toBeVisible();
    await dialog.getByLabel('客户项目编号', { exact: true }).fill(project.customerProjectNo);
    await dialog.getByLabel('项目名称').fill(project.name);
    await dialog.getByRole('button', { name: '转入项目' }).click();

    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: project.name })).toBeVisible();
}

async function reassignProjectOwner(page: Page): Promise<void> {
    await expect(page.getByRole('button', { name: '变更销售主责' })).toBeVisible();
    await page.getByRole('button', { name: '变更销售主责' }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: '变更销售主责' }).last();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('当前销售主责')).toBeVisible();
    await dialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /销售负责人.*销售管理中心/ }).click();
    await dialog.getByLabel('变更原因').fill('E2E 销售责任归属调整。');
    await dialog.getByRole('button', { name: '提交变更' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('销售负责人').first()).toBeVisible();
    await expect(page.getByText('销售管理中心').first()).toBeVisible();
}

async function createProjectDiscussion(page: Page, body: string): Promise<void> {
    await expect(page.getByText('项目销售情报')).toBeVisible();
    await expect(page.getByText('项目业务讨论')).toBeVisible();
    await expect(page.getByRole('button', { name: '联系人' })).toBeVisible();
    await expect(page.getByRole('button', { name: '新增讨论' })).toBeVisible();

    await page.getByRole('button', { name: '新增讨论' }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: '新增业务讨论' }).last();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('讨论内容').fill(body);
    await dialog.getByRole('button', { name: '发布讨论' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(body)).toBeVisible();
}

test.describe('poms-admin lead bootstrap journey', () => {
    test('admin can enter leads from menu and convert a lead into a project from the project entry', async ({ page }) => {
        const suffix = uniqueSuffix();
        const lead = {
            name: `E2E 线索转项目 ${suffix}`,
            customerName: '华南地铁集团',
            sourceName: '客户拜访'
        };
        const project = {
            customerProjectNo: `E2E-CUS-PRJ-${suffix}`,
            name: `E2E 转化项目 ${suffix}`
        };

        await login(page, ADMIN_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await openLeadsFromMenu(page);
        await expect(page.getByRole('button', { name: '登记线索' })).toBeVisible();

        await openLeadsFromProjectEntry(page);
        await createLeadFromDialog(page, lead);
        await qualifyLead(page, lead.name);
        await convertLeadToProject(page, lead.name, project);

        await expect(page.getByRole('heading', { name: '来源线索' })).toBeVisible();
        await expect(page.getByText(lead.name)).toBeVisible();
        await expect(page.getByText(project.customerProjectNo)).toBeVisible();
        await expect(page.getByText('已转项目')).toBeVisible();
        await createProjectDiscussion(page, `项目讨论连续视图 ${suffix}`);
        await reassignProjectOwner(page);
    });

    test('viewer cannot see or directly enter the lead workspace', async ({ page }) => {
        await login(page, VIEWER_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await expect(page.getByRole('link', { name: '线索管理' })).toHaveCount(0);
        await page.goto('/leads');

        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();
    });

    test('sales writer can load owner candidates without platform management permission', async ({ page }) => {
        await login(page, SALES_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await openLeadsFromMenu(page);
        await page.getByRole('button', { name: '登记线索' }).click();

        const dialog = page.getByRole('dialog').filter({ hasText: '登记线索' }).last();
        await expect(dialog).toBeVisible();

        await dialog.getByRole('combobox').nth(5).click();
        await expect(page.getByRole('option', { name: /销售人员.*华南销售一部/ })).toBeVisible();

        await dialog.getByRole('combobox').nth(6).click();
        await expect(page.getByRole('option', { name: '华南销售一部', exact: true })).toBeVisible();
    });

    test('anonymous direct lead access keeps the returnUrl through login', async ({ page }) => {
        await page.goto('/leads');

        await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fleads$/);

        await page.getByLabel('用户名').fill(ADMIN_CREDENTIALS.username);
        await page.getByLabel('密码').fill(ADMIN_CREDENTIALS.password);
        await page.getByRole('button', { name: '登录' }).click();

        await expect(page).toHaveURL(/\/leads$/);
        await expect(page.getByRole('heading', { name: '线索管理' })).toBeVisible();
    });
});
