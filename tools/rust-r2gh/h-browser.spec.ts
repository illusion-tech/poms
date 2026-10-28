import { randomUUID } from 'node:crypto';
import { test, expect, type Page, type Response } from '@playwright/test';
import { invokeBatchFixture } from './batch-client.cjs';
import { fixtureCredentials } from './fixture-protocol.cjs';

interface BatchResponse {
    state: string;
    matched: number;
    changed: number;
    zero?: boolean;
    adoptedIds?: string[];
    fixture?: unknown;
    extension?: {
        runId: string;
        backend: string;
        rootId: string;
        providerId: string;
        tenant: string;
        clientId: string;
        subject: string;
    };
    facts?: Record<string, Array<Record<string, unknown>>>;
}
interface DiffItem {
    id: string;
    action: string;
    externalDepartmentId: string;
    orgUnitId: string | null;
    candidateSnapshot: {
        targetCode?: string;
        targetName?: string;
        targetParentOrgUnitId?: string | null;
        targetParentExternalDepartmentId?: string | null;
        appliedOrgUnitId?: string;
    };
}
function response(page: Page, pathname: string | RegExp, method = 'GET'): Promise<Response> {
    return page.waitForResponse((result) => {
        const path = new URL(result.url()).pathname;
        return (typeof pathname === 'string' ? path === pathname : pathname.test(path)) && result.request().method() === method;
    }, { timeout: 15_000 });
}
function escaped(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('原组织同步页面：草稿、目录预览、应用、人工映射与归档', async ({ page }, info) => {
    test.setTimeout(120_000);
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(15_000);
    const backend = process.env['POMS_R2GH_BACKEND'];
    if (backend !== 'nest' && backend !== 'rust') throw new Error('Explicit GH backend required');
    const api = new URL(process.env['POMS_API_BASE_URL'] ?? '');
    expect(api.origin).toBe(backend === 'nest' ? 'http://127.0.0.1:5700' : 'http://127.0.0.1:5701');
    const runId = randomUUID();
    const compact = runId.replaceAll('-', '');
    const operations: Array<{ method: string; path: string; status: number }> = [];
    const fixtureEvents: Array<{ action: string; state: string; matched: number; changed: number }> = [];
    const cleanup: BatchResponse[] = [];
    const verification: Record<string, unknown> = {};
    const invoke = async (action: string, extra: Record<string, unknown> = {}) => {
        const result = await invokeBatchFixture({ formatVersion: 1, runId, backend, action, ...extra }) as BatchResponse;
        fixtureEvents.push({ action, state: result.state, matched: result.matched, changed: result.changed });
        return result;
    };
    await page.setViewportSize({ width: 1440, height: 1100 });
    page.on('response', (result) => {
        const path = new URL(result.url()).pathname;
        if (path.startsWith('/api/')) operations.push({ method: result.request().method(), path, status: result.status() });
    });
    let cleanupFailed = false;
    try {
        const prepared = await invoke('prepare');
        expect(prepared.fixture).toBeTruthy();
        const owned = prepared.extension;
        if (!owned) throw new Error('Owned GH extension missing');
        expect(owned.runId).toBe(runId);
        expect(owned.backend).toBe(backend);
        await invoke('configure-upstream');
        const sourceName = `GH UI source ${compact}`;
        await invoke('plan', { key: 'h-browser-source', table: 'external_org_source', selector: { external_tenant_id: owned.tenant, provider_config_id: owned.providerId }, max: 1 });

        const credentials = fixtureCredentials(runId, 'admin');
        await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
        await page.getByLabel('用户名', { exact: true }).fill(credentials.username);
        await page.getByLabel('密码', { exact: true }).fill(credentials.password);
        const loggedIn = response(page, '/api/auth/sessions', 'POST');
        await page.getByRole('button', { name: '登录', exact: true }).click();
        expect((await loggedIn).status()).toBe(200);
        await expect.poll(() => new URL(page.url()).pathname).toBe('/dashboard');
        await page.goto('/platform/external-org-sync', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: '外部组织同步', exact: true })).toBeVisible();

        await page.getByRole('button', { name: /新建同步源$/ }).click();
        const wizard = page.getByRole('dialog', { name: '新建同步源', exact: true });
        await wizard.locator('#externalOrgWizardDisplayName').fill(sourceName);
        await wizard.locator('#externalOrgWizardTenantId').fill(owned.tenant);
        await wizard.getByRole('button', { name: /下一步$/ }).click();
        const connection = response(page, `/api/platform/identity-providers/${owned.providerId}:testConnection`, 'POST');
        await wizard.locator('#externalOrgProviderConfig').click();
        await page.getByRole('option', { name: new RegExp(`GH owned provider ${escaped(compact)}`) }).click();
        expect((await connection).status()).toBe(200);
        await wizard.getByRole('button', { name: /下一步$/ }).click();
        const rootConnection = page.waitForResponse((result) => new URL(result.url()).pathname === `/api/platform/identity-providers/${owned.providerId}:testConnection` && result.request().method() === 'POST' && result.request().postDataJSON()?.externalRootDepartmentId === 'gh-root', { timeout: 15_000 });
        await wizard.locator('#externalOrgWizardRootDepartmentId').fill('gh-root');
        await wizard.locator('#externalOrgWizardAuthoritativeUnit').click();
        await page.getByRole('option', { name: new RegExp(`GH owned root ${escaped(compact)}`) }).click();
        await wizard.locator('#externalOrgWizardSyncScopes').fill('controlled-departments');
        expect((await rootConnection).status()).toBe(200);
        await wizard.getByRole('button', { name: /下一步$/ }).click();
        const sourceCreated = response(page, '/api/platform/external-org-sources', 'POST');
        await wizard.getByRole('button', { name: /保存草稿$/ }).click();
        const created = await sourceCreated;
        expect(created.status()).toBe(201);
        const source = await created.json() as { id: string; status: string; authoritativeOrgUnitId: string };
        expect(source.status).toBe('draft');
        expect(source.authoritativeOrgUnitId).toBe(owned.rootId);
        await invoke('adopt', { key: 'h-browser-source' });
        await expect(wizard).not.toBeVisible();
        const sourceRow = () => page.getByRole('row').filter({ has: page.getByRole('button', { name: `选择同步源 ${sourceName}`, exact: true }) });
        const activation = response(page, `/api/platform/external-org-sources/${source.id}:activate`, 'POST');
        await sourceRow().getByRole('button', { name: /启用同步源$/ }).click();
        expect((await activation).status()).toBe(200);
        await expect(sourceRow()).toContainText('启用');
        const selectedMappings = response(page, `/api/platform/external-org-sources/${source.id}/department-mappings`);
        const selectedHistory = response(page, `/api/platform/external-org-sources/${source.id}/org-sync-runs`);
        await page.getByRole('button', { name: `选择同步源 ${sourceName}`, exact: true }).click();
        expect((await selectedMappings).status()).toBe(200);
        expect((await selectedHistory).status()).toBe(200);
        await expect(sourceRow()).toHaveClass(/bg-primary-50/);

        await invoke('plan', { key: 'h-browser-preview-run', table: 'org_sync_run', selector: { source_id: source.id }, max: 1 });
        await invoke('plan', { key: 'h-browser-mappings', table: 'external_department_mapping', selector: { source_id: source.id }, max: 3 });
        await invoke('plan-derived', { key: 'h-browser-preview-diffs', table: 'org_sync_diff_item', parentKey: 'h-browser-preview-run', column: 'run_id', max: 3 });
        const previewButton = page.getByRole('button', { name: /生成预览$/ });
        await expect(previewButton).toBeEnabled({ timeout: 15_000 });
        const [previewResult, diffResult] = await Promise.all([
            response(page, `/api/platform/external-org-sources/${source.id}/org-sync-runs`, 'POST'),
            response(page, /^\/api\/platform\/org-sync-runs\/[^/]+\/diff-items$/),
            previewButton.click()
        ]);
        expect(previewResult.status()).toBe(201);
        const preview = await previewResult.json() as { id: string; status: string; totalItemCount: number };
        expect(preview.status).toBe('previewed');
        expect(preview.totalItemCount).toBe(3);
        const diffs = await diffResult.json() as DiffItem[];
        expect(diffs).toHaveLength(3);
        expect(diffs.every((item) => item.action === 'create_org_unit')).toBe(true);
        for (const key of ['h-browser-preview-run', 'h-browser-mappings', 'h-browser-preview-diffs']) await invoke('adopt', { key });
        for (const [index, item] of diffs.entries()) {
            if (!item.candidateSnapshot.targetCode) throw new Error('Create candidate code missing');
            await invoke('plan', { key: `h-browser-generated-org-${index}`, table: 'org_unit', selector: { code: item.candidateSnapshot.targetCode }, max: 1 });
        }
        await expect(page.getByRole('button', { name: /应用选中$/ })).toBeEnabled();
        const applyResponse = response(page, `/api/platform/org-sync-runs/${preview.id}:apply`, 'POST');
        await page.getByRole('button', { name: /应用选中$/ }).click();
        const appliedResponse = await applyResponse;
        expect(appliedResponse.status()).toBe(200);
        const applied = await appliedResponse.json() as { status: string; approvedItemCount: number; failedItemCount: number };
        expect(applied).toMatchObject({ status: 'applied', approvedItemCount: 3, failedItemCount: 0 });
        for (const [index] of diffs.entries()) await invoke('adopt', { key: `h-browser-generated-org-${index}` });
        const facts = (await invoke('facts')).facts;
        if (!facts) throw new Error('Owned PG facts missing');
        const generated = facts['org_unit'].filter((org) => org['id'] !== owned.rootId);
        expect(generated).toHaveLength(3);
        expect(facts['external_department_mapping'].every((mapping) => mapping['org_unit_id'] === null)).toBe(true);
        expect(facts['org_sync_diff_item'].every((item) => item['org_unit_id'] === null && !(item['candidate_snapshot_json'] as Record<string, unknown>)['appliedOrgUnitId'])).toBe(true);
        const child = diffs.find((item) => item.candidateSnapshot.targetParentExternalDepartmentId);
        if (!child) throw new Error('Expected parent-child controlled directory');
        const childOrg = generated.find((org) => org['code'] === child.candidateSnapshot.targetCode);
        expect(childOrg?.['parent_id']).toBeNull();
        verification['applied'] = { sourceId: source.id, runId: preview.id, status: applied.status, generatedOrgIds: generated.map((org) => org['id']), originalUndefinedRelationsRetained: true };

        const mappingsResponse = response(page, `/api/platform/external-org-sources/${source.id}/department-mappings`);
        await page.reload({ waitUntil: 'domcontentloaded' });
        const mappings = await (await mappingsResponse).json() as Array<{ id: string; externalDepartmentId: string }>;
        const parentExternalId = child.candidateSnapshot.targetParentExternalDepartmentId;
        const parentDiff = diffs.find((item) => item.externalDepartmentId === parentExternalId);
        const parentMapping = mappings.find((item) => item.externalDepartmentId === parentExternalId);
        const parentOrg = generated.find((org) => org['code'] === parentDiff?.candidateSnapshot.targetCode);
        if (!parentMapping || !parentDiff?.candidateSnapshot.targetName || !parentOrg) throw new Error('Owned parent mapping unavailable');
        const mappingRow = () => page.getByRole('row').filter({ has: page.getByRole('button', { name: /映射到 POMS 组织$/ }) }).filter({ hasText: parentDiff.candidateSnapshot.targetName! });
        await mappingRow().getByRole('button', { name: /映射到 POMS 组织$/ }).click();
        const mappingDialog = page.getByRole('dialog', { name: '处理部门映射', exact: true });
        await mappingDialog.locator('#externalDepartmentMappingTarget').click();
        await page.getByRole('option', { name: new RegExp(escaped(parentDiff.candidateSnapshot.targetName)) }).click();
        const mappedResponse = response(page, `/api/platform/external-department-mappings/${parentMapping.id}:map`, 'POST');
        await mappingDialog.getByRole('button', { name: /保存映射$/ }).click();
        const mapped = await mappedResponse;
        expect(mapped.status()).toBe(200);
        expect((await mapped.json()).orgUnitId).toBe(parentOrg['id']);
        await expect(mappingDialog).not.toBeVisible();
        for (const [label, command, status, header, accept] of [
            ['解除映射', 'unmap', 'unmapped', '解除部门映射', '解除'],
            ['忽略该外部部门', 'ignore', 'ignored', '忽略外部部门', '忽略'],
            ['恢复处理', 'restore', 'unmapped', '恢复外部部门', '恢复']
        ] as const) {
            await mappingRow().getByRole('button', { name: new RegExp(`${escaped(label)}$`) }).click();
            const confirmation = page.getByRole('alertdialog').filter({ hasText: header });
            await expect(confirmation).toBeVisible();
            const [result] = await Promise.all([
                response(page, `/api/platform/external-department-mappings/${parentMapping.id}:${command}`, 'POST'),
                confirmation.getByRole('button', { name: new RegExp(`${escaped(accept)}$`) }).click()
            ]);
            expect(result.status()).toBe(200);
            expect((await result.json()).status).toBe(status);
            await expect(confirmation).not.toBeVisible();
        }
        await expect(page.getByText('映射已变更', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: '运行历史', exact: true }).click();
        await expect(page.getByRole('row').filter({ hasText: '已应用' })).toBeVisible();
        await page.getByRole('button', { name: /详情$/ }).first().click();
        const detail = page.getByRole('dialog', { name: '同步运行详情', exact: true });
        await expect(detail).toContainText('已应用');
        await expect(detail).toContainText('结果摘要');
        await detail.locator('button.p-dialog-close-button').click();
        const pause = response(page, `/api/platform/external-org-sources/${source.id}:pause`, 'POST');
        await sourceRow().getByRole('button', { name: /暂停同步源$/ }).click();
        expect((await pause).status()).toBe(200);
        const archive = response(page, `/api/platform/external-org-sources/${source.id}:archive`, 'POST');
        await sourceRow().getByRole('button', { name: /归档同步源$/ }).click();
        await page.getByRole('alertdialog', { name: '归档同步源', exact: true }).getByRole('button', { name: /归档$/ }).click();
        expect((await archive).status()).toBe(200);
        await expect(sourceRow()).toContainText('归档');
        await expect(sourceRow().getByRole('button', { name: /编辑同步源$/ })).toBeDisabled();
        verification['uiJourney'] = ['wizard-save-draft', 'activate', 'controlled-directory-preview', 'selected-apply', 'map-owned-org', 'unmap', 'ignore', 'restore', 'history-detail', 'pause', 'archive'];
        const screenshot = info.outputPath('h-organizations-final.png');
        await page.screenshot({ path: screenshot, fullPage: false });
        await info.attach('h-original-ui', { path: screenshot, contentType: 'image/png' });
    } finally {
        if (info.status !== info.expectedStatus && !page.isClosed()) {
            try { await info.attach('h-ui-failure', { body: await page.screenshot(), contentType: 'image/png' }); } catch { /* Preserve cleanup receipts. */ }
        }
        await page.close().catch(() => undefined);
        for (let pass = 0; pass < 2; pass++) {
            try {
                const result = await invoke('cleanup');
                cleanup.push(result);
                expect(result.state).toBe('cleaned');
                if (pass === 1) expect({ matched: result.matched, changed: result.changed, zero: result.zero }).toEqual({ matched: 0, changed: 0, zero: true });
            } catch { cleanupFailed = true; }
        }
        await info.attach('h-ui-owned-evidence', { contentType: 'application/json', body: Buffer.from(JSON.stringify({ formatVersion: 1, runId, backend, node: process.version, testStatus: info.status, originalAngular: true, routeMocks: false, browserHttpCommands: false, controlledProtocolIntegration: true, liveVendorCertified: false, operations, fixtureEvents, verification, cleanup: cleanup.map((result) => ({ state: result.state, matched: result.matched, changed: result.changed, zero: result.zero })), cleanupFailed }, null, 2)) });
        expect(cleanupFailed, 'Two-pass owned cleanup must complete').toBe(false);
    }
});
