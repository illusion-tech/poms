import { expect, test, type BrowserContext, type Page, type Response } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { invokeBatchFixture } from './batch-client.cjs';
import { fixtureCredentials } from './fixture-protocol.cjs';

// Real Angular + real API + Root's controlled loopback upstream. No route mocks.
// Opaque OAuth state/code/ticket/cookies remain in memory; browser traces are off.
test.use({ trace: 'off', video: 'off', screenshot: 'off' });
test.describe.configure({ mode: 'serial' });

type Backend = 'nest' | 'rust';
type Extension = {
    runId: string; backend: Backend; rootId: string; providerId: string;
    tenant: string; clientId: string; subject: string;
    accounts: { account: string; userId: string; username: string }[];
};
type BatchReply = { formatVersion: number; matched: number; changed: number; state: string; zero?: boolean; extension?: Extension & { zero?: boolean }; fixture?: { accounts: Extension['accounts'] } };
type BatchRequest = { formatVersion: 1; runId: string; backend: Backend; action: string; account: 'none'; key?: string; table?: string; selector?: Record<string, string>; max?: number };
const invoke = invokeBatchFixture as unknown as (request: BatchRequest) => Promise<BatchReply>;
const pathname = (value: string): string => new URL(value).pathname;
const isResponse = (method: string, path: string) => (response: Response): boolean => response.request().method() === method && pathname(response.url()) === path;
// PrimeNG icons and the provider logo can prefix the accessible name. Require
// the complete final label, so e.g. “绑定” cannot also match “解绑”.
const buttonLabel = (label: string): RegExp => new RegExp(`(?:^|\\s)${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'u');
async function waitForResponse(page: Page, predicate: (response: Response) => boolean, action: () => Promise<unknown>, timeout = 15_000): Promise<Response> {
    const [response] = await Promise.all([page.waitForResponse(predicate, { timeout }), action()]);
    return response;
}

async function login(page: Page, runId: string): Promise<void> {
    const credentials = fixtureCredentials(runId, 'admin');
    await page.goto('/auth/login?returnUrl=%2Fplatform%2Fidentity-providers', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('用户名', { exact: true }).fill(credentials.username);
    await page.getByLabel('密码', { exact: true }).fill(credentials.password);
    const accepted = await waitForResponse(page, isResponse('POST', '/api/auth/sessions'), () => page.getByRole('button', { name: '登录', exact: true }).click());
    expect(accepted.status()).toBe(200);
    await expect.poll(() => pathname(page.url())).toBe('/platform/identity-providers');
}

async function userDetails(page: Page, username: string): Promise<void> {
    await page.goto('/platform/users', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('搜索用户、用户名、组织').fill(username);
    const row = page.locator('tbody tr').filter({ hasText: username });
    await expect(row).toHaveCount(1);
    await row.locator('button').click();
    await page.getByRole('menuitem', { name: '查看详情' }).click();
    await expect(page.getByRole('dialog', { name: '用户详情', exact: true })).toBeVisible();
}

test('G 原Angular身份配置、组织就绪、管理员授权、候选绑定和外部登录真实链路', async ({ page, context }, testInfo) => {
    test.setTimeout(120_000);
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(15_000);
    const backend = process.env['POMS_R2GH_BACKEND'];
    expect(['nest', 'rust']).toContain(backend);
    const selectedBackend = backend as Backend;
    const apiOrigin = new URL(process.env['POMS_API_BASE_URL'] ?? process.env['API_ORIGIN'] ?? '').origin;
    expect(['127.0.0.1', 'localhost']).toContain(new URL(apiOrigin).hostname);
    expect(['5700', '5701']).toContain(new URL(apiOrigin).port);
    const uiOrigin = new URL(String(testInfo.project.use.baseURL ?? process.env['POMS_ADMIN_BASE_URL'] ?? 'http://127.0.0.1:5800')).origin;
    expect(new URL(uiOrigin).port).toBe('5800');
    await context.addInitScript(({ apiBase }) => {
        (window as unknown as { __POMS_API_BASE_URL__: string }).__POMS_API_BASE_URL__ = apiBase;
    }, { apiBase: apiOrigin });
    const runId = randomUUID();
    const command = (action: string, extra: Partial<BatchRequest> = {}): Promise<BatchReply> => invoke({ formatVersion: 1, runId, backend: selectedBackend, action, account: 'none', ...extra });
    const observed: { method: string; path: string; status: number }[] = [];
    const capture = (response: Response): void => {
        const url = new URL(response.url());
        if (url.origin === apiOrigin && url.pathname.startsWith('/api/')) observed.push({ method: response.request().method(), path: url.pathname, status: response.status() });
    };
    context.on('response', capture);
    let prepared = false;
    let bindingId: string | undefined;
    const cleanup: { matched: number; changed: number; state: string; zero?: boolean }[] = [];
    try {
        const preparedReply = await command('prepare');
        prepared = true;
        const fixture = preparedReply.extension;
        expect(fixture?.runId).toBe(runId);
        expect(fixture?.backend).toBe(selectedBackend);
        if (!fixture) throw new Error('Root did not return the admitted G fixture extension');
        const admin = (preparedReply.fixture?.accounts ?? fixture.accounts).find(account => account.account === 'admin');
        if (!admin) throw new Error('Admitted admin fixture is missing');
        await command('configure-upstream');
        await command('plan', { key: 'g-browser-grant', table: 'identity_provider_oauth_grant', selector: { identity_provider_config_id: fixture.providerId, poms_user_id: admin.userId }, max: 1 });
        await command('plan', { key: 'g-browser-binding', table: 'external_identity', selector: { identity_provider_config_id: fixture.providerId, poms_user_id: admin.userId, subject_id: fixture.subject }, max: 1 });

        await login(page, runId);
        const card = page.locator('app-identity-provider-card').filter({ hasText: fixture.clientId });
        await expect(card).toHaveCount(1);
        await expect(card.getByText('secret 已配置', { exact: true })).toBeVisible();
        await card.getByRole('button', { name: buttonLabel('编辑') }).click();
        const edit = page.getByRole('dialog', { name: '编辑提供商配置', exact: true });
        const displayName = `GH browser ${runId.slice(0, 8)}`;
        await edit.locator('#identityProviderDisplayName').fill(displayName);
        await edit.locator('#identityProviderRedirectUri').fill(`${uiOrigin}/auth/identity-providers:callback`);
        await edit.locator('#identityProviderSearchRedirectUri').fill(`${apiOrigin}/api/platform/identity-provider-oauth-grants:callback`);
        await expect(edit.locator('#identityProviderClientSecret')).toHaveValue('');
        const updated = await waitForResponse(page, isResponse('PATCH', `/api/platform/identity-providers/${fixture.providerId}`), () => edit.getByRole('button', { name: '保存', exact: true }).click());
        expect(updated.status()).toBe(200);
        await expect(edit).toBeHidden();
        await expect(card.getByRole('heading', { name: displayName, exact: true })).toBeVisible();

        const readinessResponse = await waitForResponse(page, isResponse('POST', `/api/platform/identity-providers/${fixture.providerId}:testConnection`), () => card.getByRole('button', { name: buttonLabel('组织同步') }).click());
        expect(readinessResponse.status()).toBe(200);
        const readinessBody = await readinessResponse.json() as { capability: string; status: string };
        expect(readinessBody.capability).toBe('external-org-sync');
        expect(readinessBody.status).toBe('success');
        await expect(card.getByText('组织同步可用性检查通过，飞书通讯录读取正常。', { exact: true })).toBeVisible();

        await userDetails(page, admin.username);
        const detail = page.getByRole('dialog', { name: '用户详情', exact: true });
        await detail.getByRole('button', { name: buttonLabel('绑定飞书') }).click();
        const bindDialog = page.getByRole('dialog', { name: '绑定飞书身份', exact: true });
        await expect(bindDialog).toBeVisible();
        // The panel auto-selects its first bindable provider. Select the admitted
        // provider explicitly so another isolated run can never be used by chance.
        await bindDialog.getByRole('combobox').click();
        await page.getByRole('option', { name: `${displayName} (飞书)`, exact: true }).click();
        const [callback, popup] = await Promise.all([
            context.waitForEvent('response', { predicate: isResponse('GET', '/api/platform/identity-provider-oauth-grants:callback'), timeout: 15_000 }),
            context.waitForEvent('page', { timeout: 15_000 }),
            bindDialog.getByRole('button', { name: buttonLabel('授权') }).click()
        ]);
        expect(callback.status()).toBe(302);
        await command('adopt', { key: 'g-browser-grant' });
        await popup.close();
        const refreshed = await waitForResponse(page, isResponse('GET', `/api/platform/identity-provider-oauth-grants/${fixture.providerId}`), () => bindDialog.locator('button:has(.pi-refresh)').click());
        expect(refreshed.status()).toBe(200);
        await expect(bindDialog.getByText('已授权', { exact: true })).toBeVisible();
        await bindDialog.getByPlaceholder('输入姓名搜索').fill('GH controlled');
        const searched = await waitForResponse(page, response => response.request().method() === 'GET' && pathname(response.url()) === `/api/platform/identity-providers/${fixture.providerId}/external-users`, () => bindDialog.getByRole('button', { name: buttonLabel('搜索') }).click());
        expect(searched.status()).toBe(200);
        const candidate = bindDialog.locator('tbody tr').filter({ hasText: fixture.subject });
        await expect(candidate).toHaveCount(1);
        await expect(candidate).toContainText('GH controlled department');
        await expect(candidate).toContainText('gh-user@example.test');
        const boundResponse = await waitForResponse(page, isResponse('POST', `/api/platform/users/${admin.userId}/external-identities`), () => candidate.getByRole('button', { name: buttonLabel('绑定') }).click());
        expect(boundResponse.status()).toBe(201);
        const binding = await boundResponse.json() as { id: string; subjectId: string; pomsUserId: string };
        expect(binding.subjectId).toBe(fixture.subject);
        expect(binding.pomsUserId).toBe(admin.userId);
        bindingId = binding.id;
        await command('adopt', { key: 'g-browser-binding' });
        await expect(bindDialog).toBeHidden();
        await expect(detail.getByText(fixture.subject, { exact: true })).toBeVisible();
        await command('plan', { key: 'g-browser-ticket', table: 'external_login_ticket', selector: { identity_provider_config_id: fixture.providerId, external_identity_id: binding.id, poms_user_id: admin.userId }, max: 1 });

        // A separate clean browser context exercises the actual logged-out
        // provider button and Angular callback/CSRF/session/profile sequence.
        const loginContext: BrowserContext = await context.browser()!.newContext({ baseURL: uiOrigin });
        try {
            await loginContext.addInitScript(({ apiBase }) => {
                (window as unknown as { __POMS_API_BASE_URL__: string }).__POMS_API_BASE_URL__ = apiBase;
            }, { apiBase: apiOrigin });
            loginContext.on('response', capture);
            const loginPage = await loginContext.newPage();
            loginPage.setDefaultTimeout(15_000);
            loginPage.setDefaultNavigationTimeout(15_000);
            await loginPage.goto('/auth/login?returnUrl=%2Fprofile', { waitUntil: 'domcontentloaded' });
            const providerButton = loginPage.getByRole('button', { name: buttonLabel(`使用 ${displayName} 登录`) });
            await expect(providerButton).toBeVisible();
            const consumedResponse = await waitForResponse(loginPage, isResponse('POST', '/api/auth/external-login-sessions'), () => providerButton.click());
            expect(consumedResponse.status()).toBe(200);
            const session = await consumedResponse.json() as { authenticated: boolean; user: { id: string } };
            expect(session.authenticated).toBe(true);
            expect(session.user.id).toBe(admin.userId);
            await expect.poll(() => pathname(loginPage.url())).toBe('/profile');
            const cookies = await loginContext.cookies(`${apiOrigin}/api`);
            expect(cookies.some(cookie => cookie.name === 'poms_session' && /^[A-Za-z0-9_-]{43}$/.test(cookie.value))).toBe(true);
            expect(cookies.some(cookie => cookie.name === 'poms_csrf' && /^[A-Za-z0-9_-]{43}$/.test(cookie.value))).toBe(true);
            await command('adopt', { key: 'g-browser-ticket' });
        } finally { await loginContext.close(); }

        const unbind = await waitForResponse(page, isResponse('POST', `/api/platform/external-identities/${binding.id}:unbind`), async () => {
            await detail.getByRole('button', { name: buttonLabel('解绑') }).click();
            const confirmation = page.getByRole('alertdialog').filter({ hasText: '确认解绑外部身份' });
            await confirmation.getByRole('button', { name: '解绑', exact: true }).click();
        });
        expect(unbind.status()).toBe(200);
        await expect(detail.getByText('已解绑', { exact: true })).toBeVisible();
    } finally {
        context.off('response', capture);
        if (prepared) {
            for (let pass = 0; pass < 2; pass++) {
                const result = await command('cleanup');
                expect(result.state).toBe('cleaned');
                cleanup.push({ matched: result.matched, changed: result.changed, state: result.state, zero: result.zero ?? result.extension?.zero });
                if (pass === 1) { expect(result.matched).toBe(0); expect(result.changed).toBe(0); expect(result.zero ?? result.extension?.zero).toBe(true); }
            }
        }
        await testInfo.attach('g-real-angular-journey.json', { contentType: 'application/json', body: Buffer.from(JSON.stringify({ formatVersion: 1, backend: selectedBackend, runId, boundary: 'Actual Angular UI, actual selected backend and controlled loopback upstream; no real Feishu account certification', opaqueValuesPersisted: false, bindingId, requests: observed, cleanup }, null, 2)) });
    }
});
