import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, login, VIEWER_CREDENTIALS } from './support/auth';

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

async function createLeadFromDialog(page: Page, lead: { name: string; customerName: string; sourceChannel: string }): Promise<void> {
    await page.getByRole('button', { name: '登记线索' }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: '登记线索' }).last();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('线索编号', { exact: true })).toHaveCount(0);
    await dialog.getByLabel('线索标题').fill(lead.name);
    await dialog.getByLabel('客户名称').fill(lead.customerName);
    await dialog.getByLabel('来源渠道').fill(lead.sourceChannel);
    await dialog.getByRole('button', { name: '登记线索' }).click();

    const row = page.locator('tr').filter({ hasText: lead.name }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(/LD-\d{4}-\d{6}/);
    await expect(row.getByText('待确认')).toBeVisible();
}

async function qualifyLead(page: Page, leadName: string): Promise<void> {
    const row = page.locator('tr').filter({ hasText: leadName }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: '确认有效' }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: '确认线索有效' }).last();
    await expect(dialog).toBeVisible();
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
    await dialog.getByLabel('客户项目编号', { exact: true }).fill(project.customerProjectNo);
    await dialog.getByLabel('项目名称').fill(project.name);
    await dialog.getByRole('button', { name: '转入项目' }).click();

    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: project.name })).toBeVisible();
}

test.describe('poms-admin lead bootstrap journey', () => {
    test('admin can enter leads from menu and convert a lead into a project from the project entry', async ({ page }) => {
        const suffix = uniqueSuffix();
        const lead = {
            name: `E2E 线索转项目 ${suffix}`,
            customerName: `E2E 客户 ${suffix}`,
            sourceChannel: '浏览器端到端'
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

        await expect(page.getByText('来源线索')).toBeVisible();
        await expect(page.getByText(lead.name)).toBeVisible();
        await expect(page.getByText(project.customerProjectNo)).toBeVisible();
        await expect(page.getByText('已转项目')).toBeVisible();
    });

    test('viewer cannot see or directly enter the lead workspace', async ({ page }) => {
        await login(page, VIEWER_CREDENTIALS);
        await expect(page).toHaveURL(/\/dashboard$/);

        await expect(page.getByRole('link', { name: '线索管理' })).toHaveCount(0);
        await page.goto('/leads');

        await expect(page).toHaveURL(new RegExp('/auth/access\\?returnUrl='));
        await expect(page.getByRole('heading', { name: '无权访问' })).toBeVisible();
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
