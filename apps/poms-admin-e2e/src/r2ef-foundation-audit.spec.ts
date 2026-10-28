import { browserJson, expect, foundationResponse, recordArray, test, type FoundationAuditRun } from './support/r2ef-foundation-audit';

interface DictionaryView {
    id: string;
    domain: string;
    code: string;
    name: string;
    description: string | null;
    status: 'active' | 'inactive';
    sortOrder: number;
    usageCount: number;
    rowVersion: number;
}

const SETTING_KEY = 'attachment.max-upload-size-mb';
const AUDIT_FIELDS = ['id', 'eventType', 'targetType', 'targetId', 'operatorId', 'requestId', 'result', 'reason', 'beforeSnapshot', 'afterSnapshot', 'metadata', 'occurredAt'];
const SECURITY_FIELDS = ['id', 'eventType', 'severity', 'actorId', 'principal', 'requestId', 'path', 'method', 'permissionKey', 'result', 'ip', 'userAgent', 'details', 'occurredAt'];
const ENTITY_TARGET_TYPES = ['lead', 'customer', 'customer-contact', 'opportunity-stakeholder', 'competitor-intelligence', 'sales-discovery-record', 'sales-follow-up-record', 'project', 'contract'];

function dictionaryCard(run: FoundationAuditRun) {
    return run.page.locator('app-dictionary-list article').filter({ has: run.page.getByRole('heading', { name: '附件分类', exact: true }) });
}

function dictionaryRow(run: FoundationAuditRun, code: string) {
    // The original card has no row test-id. Select the smallest existing div
    // that contains this exact code and the real edit button, without indices.
    return dictionaryCard(run).locator('div').filter({ has: run.page.getByText(code, { exact: true }) }).filter({ has: run.page.getByRole('button', { name: '编辑字典项', exact: true }) }).last();
}

async function dictionaryJourney(run: FoundationAuditRun): Promise<void> {
    const [loaded] = await Promise.all([foundationResponse(run.page, '/api/dictionaries'), run.page.goto('/platform/dictionaries', { waitUntil: 'domcontentloaded' })]);
    expect(loaded.status()).toBe(200);
    const card = dictionaryCard(run);
    await expect(card).toHaveCount(1);
    await expect(card.getByRole('heading', { name: '附件分类', exact: true })).toBeVisible();
    const name = `R2EF UI ${run.runId.slice(0, 8)}`;
    const editedName = `${name} edited`;
    const code = run.extension.createdCode;
    // prepare registers this exact planned code; root facts/cleanup adopts its
    // PK after the real browser POST rather than deleting by arbitrary prefix.
    // Actual PrimeNG icon text is part of the accessible name (" 新增").
    // Keep the scoped visible label, allowing its existing icon prefix.
    await card.getByRole('button', { name: /新增$/ }).click();
    const create = run.page.getByRole('dialog', { name: '新增字典项', exact: true });
    await create.getByLabel('Code *', { exact: true }).fill(code);
    await create.getByLabel('名称 *', { exact: true }).fill(`  ${name}  `);
    await create.getByLabel('说明', { exact: true }).fill(`R2EF synthetic ${run.runId}`);
    await create.getByLabel('排序', { exact: true }).fill('17');
    const [createdResponse] = await Promise.all([foundationResponse(run.page, '/api/dictionaries', 'POST'), create.getByRole('button', { name: '创建', exact: true }).click()]);
    expect(createdResponse.status()).toBe(201);
    const created = await createdResponse.json() as DictionaryView;
    expect(created).toMatchObject({ domain: 'attachment-category', code, name, status: 'active', sortOrder: 17, usageCount: 0 });
    await expect(create).toBeHidden();
    const search = run.page.getByPlaceholder('搜索 code、名称或说明', { exact: true });
    await search.fill(code);
    const [filtered] = await Promise.all([foundationResponse(run.page, '/api/dictionaries'), run.page.getByRole('button', { name: /查询$/ }).click()]);
    expect(filtered.status()).toBe(200);
    const row = dictionaryRow(run, code);
    await expect(row).toHaveCount(1);
    await expect(row.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(row).toContainText('引用 0 条');
    await row.getByRole('button', { name: '编辑字典项', exact: true }).click();
    const edit = run.page.getByRole('dialog', { name: '编辑字典项', exact: true });
    await edit.getByLabel('名称 *', { exact: true }).fill(editedName);
    await edit.getByLabel('说明', { exact: true }).fill('R2EF edited synthetic description');
    await edit.getByLabel('排序', { exact: true }).fill('13');
    const patchPath = `/api/dictionaries/${created.id}`;
    const [editedResponse] = await Promise.all([foundationResponse(run.page, patchPath, 'PATCH'), edit.getByRole('button', { name: '保存', exact: true }).click()]);
    expect(editedResponse.status()).toBe(200);
    const edited = await editedResponse.json() as DictionaryView;
    expect(edited).toMatchObject({ id: created.id, code, name: editedName, description: 'R2EF edited synthetic description', status: 'active', sortOrder: 13 });
    expect(edited.rowVersion).toBeGreaterThan(created.rowVersion);
    await expect(edit).toBeHidden();
    await expect(row.getByRole('heading', { name: editedName, exact: true })).toBeVisible();
    // The source puts this aria-label on p-button's host; the native control is
    // reached beneath it rather than assuming the host gives it a name.
    const [disabledResponse] = await Promise.all([foundationResponse(run.page, patchPath, 'PATCH'), row.locator('p-button[aria-label="停用字典项"]').getByRole('button').click()]);
    expect(disabledResponse.status()).toBe(200);
    expect(await disabledResponse.json()).toMatchObject({ id: created.id, status: 'inactive' });
    await expect(row).toHaveCount(0);
    await card.getByRole('button', { name: /显示停用项$/ }).click();
    await expect(row.getByRole('heading', { name: editedName, exact: true })).toBeVisible();
    const [enabledResponse] = await Promise.all([foundationResponse(run.page, patchPath, 'PATCH'), row.locator('p-button[aria-label="启用字典项"]').getByRole('button').click()]);
    expect(enabledResponse.status()).toBe(200);
    const enabled = await enabledResponse.json() as DictionaryView;
    expect(enabled).toMatchObject({ id: created.id, status: 'active', code, name: editedName, sortOrder: 13 });
    await expect(row).toContainText('启用');
    run.verification['dictionaryOriginalUi'] = { created, edited, enabled };
    await run.screenshot('foundation-dictionary-created-edited-active');
}

async function settingJourney(run: FoundationAuditRun): Promise<void> {
    const [loaded] = await Promise.all([foundationResponse(run.page, '/api/platform/system-settings'), run.page.goto('/platform/system-settings', { waitUntil: 'domcontentloaded' })]);
    expect(loaded.status()).toBe(200);
    await expect(run.page.getByRole('heading', { name: '系统设置', exact: true })).toBeVisible();
    const initial = recordArray(await loaded.json(), 'system-setting list').find((row) => row['key'] === SETTING_KEY);
    if (!initial || !Number.isInteger(initial['value']) || !Number.isInteger(initial['rowVersion'])) throw Error('Owned original system-setting value/version absent');
    const nextValue = initial['value'] === 61 ? 62 : 61;
    const input = run.page.getByLabel('附件上传大小上限', { exact: true });
    await input.fill(String(nextValue));
    await input.press('Tab');
    const save = run.page.getByRole('button', { name: /保存$/ });
    await expect(save).toBeEnabled();
    const [saved] = await Promise.all([foundationResponse(run.page, `/api/platform/system-settings/${SETTING_KEY}`, 'PATCH'), save.click()]);
    expect(saved.status()).toBe(200);
    const updated = await saved.json() as Record<string, unknown>;
    expect(updated['key']).toBe(SETTING_KEY);
    expect(updated['value']).toBe(nextValue);
    expect(Number(updated['rowVersion'])).toBeGreaterThan(Number(initial['rowVersion']));
    const [refreshed] = await Promise.all([foundationResponse(run.page, '/api/platform/system-settings'), run.page.getByRole('button', { name: /刷新$/ }).click()]);
    expect(refreshed.status()).toBe(200);
    expect(recordArray(await refreshed.json(), 'system-setting reread').find((row) => row['key'] === SETTING_KEY)?.['value']).toBe(nextValue);
    await expect(input).toHaveValue(new RegExp(`^${nextValue}(?:\\s*MB)?$`));
    const facts = await run.facts();
    const adminId = run.owned.accounts.find((account) => account.account === 'admin')?.userId;
    const audits = recordArray(facts.extension.audits, 'owned setting audit facts').filter((row) => row['event_type'] === 'platform.system_setting.updated' && row['target_id'] === SETTING_KEY && row['operator_id'] === adminId);
    expect(audits).toHaveLength(1);
    expect(audits[0]['request_id']).toBe(run.identity.requestId);
    expect(audits[0]['before_snapshot']).toMatchObject({ value: initial['value'] });
    expect(audits[0]['after_snapshot']).toMatchObject({ value: nextValue });
    run.verification['systemSettingOriginalUi'] = { initial, updated, audit: audits[0], exactSnapshotRestoreOwner: 'root batch cleanup' };
    await run.screenshot('foundation-system-setting-updated');
}

async function auditBrowserHttp(run: FoundationAuditRun): Promise<void> {
    const audit = await browserJson(run.page, `/api/audit-logs?eventType=${encodeURIComponent(run.extension.auditEventType)}&limit=100`);
    const security = await browserJson(run.page, `/api/security-events?eventType=${encodeURIComponent(run.extension.securityEventType)}&limit=100`);
    expect(audit.status).toBe(200);
    expect(security.status).toBe(200);
    const audits = recordArray(audit.body, 'browser audit HTTP');
    const securityEvents = recordArray(security.body, 'browser security HTTP');
    expect(audits.length).toBeGreaterThan(0);
    expect(securityEvents.length).toBeGreaterThan(0);
    for (const row of audits) {
        expect(Object.keys(row).sort()).toEqual([...AUDIT_FIELDS].sort());
        expect(row['eventType']).toBe(run.extension.auditEventType);
    }
    for (const row of securityEvents) {
        expect(Object.keys(row).sort()).toEqual([...SECURITY_FIELDS].sort());
        expect(row['eventType']).toBe(run.extension.securityEventType);
    }
    const target = audits.find((row) => typeof row['targetType'] === 'string' && ENTITY_TARGET_TYPES.includes(row['targetType']) && typeof row['targetId'] === 'string');
    if (!target) throw Error('Owned F fixture has no supported entity-audit target');
    const entity = await browserJson(run.page, `/api/audit-logs/targets/${encodeURIComponent(String(target['targetType']))}/${encodeURIComponent(String(target['targetId']))}?eventType=${encodeURIComponent(run.extension.auditEventType)}`);
    expect(entity.status).toBe(200);
    const entityAudits = recordArray(entity.body, 'browser entity-audit HTTP');
    expect(entityAudits.length).toBeGreaterThan(0);
    expect(entityAudits.every((row) => row['targetType'] === target['targetType'] && row['targetId'] === target['targetId'])).toBe(true);
    const facts = await run.facts();
    const ownedAuditIds = new Set(recordArray(facts.extension.audits, 'owned audit facts').map((row) => row['id']));
    const ownedSecurityIds = new Set(recordArray(facts.extension.securityEvents, 'owned security facts').map((row) => row['id']));
    expect(audits.every((row) => ownedAuditIds.has(row['id']))).toBe(true);
    expect(securityEvents.every((row) => ownedSecurityIds.has(row['id']))).toBe(true);
    run.verification['browserHttpExistingAuditEndpoints'] = { audit, security, entity, boundary: 'Real same-browser HTTP; original global audit/security Angular pages do not exist, and business audit panels depend on R3/R4' };
}

async function frontendRouteDenied(run: FoundationAuditRun): Promise<void> {
    await run.permissions('viewer', []);
    await run.login('viewer');
    const target = `/platform/system-settings?r2ef=${run.runId}`;
    const eventResponse = foundationResponse(run.page, '/api/security-events:recordRouteDenied', 'POST');
    await run.page.goto(target, { waitUntil: 'domcontentloaded' });
    const response = await eventResponse;
    expect(response.status()).toBe(202);
    expect((await response.body()).length).toBe(0);
    expect(await response.headerValue('content-type')).toBeNull();
    await expect.poll(() => new URL(run.page.url()).pathname).toBe('/auth/access');
    expect(new URL(run.page.url()).searchParams.get('returnUrl')).toBe(target);
    await expect(run.page.getByRole('heading', { name: '无权访问', exact: true })).toBeVisible();
    expect(response.request().postDataJSON()).toEqual({ path: target, returnUrl: target, requiredPermissions: ['platform:system-settings:manage'] });
    const viewerId = run.owned.accounts.find((account) => account.account === 'viewer')?.userId;
    const facts = await run.facts();
    const events = recordArray(facts.extension.securityEvents, 'owned routeDenied facts').filter((row) => row['event_type'] === 'authz.route.denied' && row['actor_id'] === viewerId && row['path'] === target);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ request_id: run.identity.requestId, severity: 'warning', result: 'blocked', method: 'ROUTE', permission_key: 'platform:system-settings:manage', user_agent: run.identity.userAgent, details: { requiredPermissions: ['platform:system-settings:manage'], returnUrl: target } });
    run.verification['frontendPermissionGuardAndPersistedEvent'] = { httpStatus: response.status(), emptyResponseBody: true, event: events[0] };
    await run.screenshot('foundation-viewer-original-access-denied');
}

async function journey(run: FoundationAuditRun): Promise<void> {
    await run.login();
    await dictionaryJourney(run);
    await settingJourney(run);
    await auditBrowserHttp(run);
    await frontendRouteDenied(run);
}

test.describe.configure({ timeout: 600_000 });

test('UI desktop: original dictionary/settings and browser audit endpoints preserve real writes and route-denied evidence', async ({ foundationRun }) => {
    await journey(foundationRun);
});

test('UI 390x844: original dictionary/settings and the same browser permission flow preserve the same evidence', async ({ foundationRun }) => {
    await foundationRun.page.setViewportSize({ width: 390, height: 844 });
    await journey(foundationRun);
});
