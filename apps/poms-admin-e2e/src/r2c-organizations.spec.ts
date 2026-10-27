import { createOrganization, expect, openOrganizations, organizationRow, orgResponse, test, toggleOrganization, type OrganizationsRun } from './support/r2c-organizations';

async function journey(run: OrganizationsRun) {
    await run.login(run.page, 'admin');
    await openOrganizations(run);
    const root = await createOrganization(run, 'ui-root');
    const child = await createOrganization(run, 'ui-child', root);
    const grandchild = await createOrganization(run, 'ui-grandchild', child);
    const target = await createOrganization(run, 'ui-target');
    const row = await organizationRow(run, child);
    await row.getByRole('button', { name: '编辑组织', exact: true }).click();
    const edit = run.page.getByRole('dialog', { name: '编辑组织', exact: true });
    child.name = `R2C edited child ${run.runId.slice(0, 8)}`;
    await edit.getByLabel('编辑组织名称', { exact: true }).fill(child.name);
    await edit.getByLabel('编辑组织描述', { exact: true }).fill('原页面组织树验收');
    await edit.getByLabel('编辑组织排序', { exact: true }).fill('6');
    const [updated] = await Promise.all([orgResponse(run.page, `/api/platform/org-units/${child.id}`, 'PATCH'), edit.getByRole('button', { name: '保存', exact: true }).click()]);
    expect(updated.status()).toBe(200);
    await expect(edit).toBeHidden();
    await expect(row).toContainText(child.name);
    await row.getByRole('button', { name: '移动组织', exact: true }).click();
    const move = run.page.getByRole('dialog', { name: '移动组织', exact: true });
    const parent = move.getByLabel('移动组织上级组织', { exact: true });
    await expect(parent.locator('option').filter({ hasText: grandchild.name })).toHaveCount(0);
    await parent.selectOption({ label: target.name });
    await move.getByLabel('移动组织排序', { exact: true }).fill('7');
    const [moved] = await Promise.all([orgResponse(run.page, `/api/platform/org-units/${child.id}:move`, 'POST'), move.getByRole('button', { name: '保存位置', exact: true }).click()]);
    expect(moved.status()).toBe(200);
    await expect(move).toBeHidden();
    await organizationRow(run, grandchild);
    await expect(run.page.locator('tbody tr').filter({ hasText: target.code })).toHaveCount(1);
    await expect(run.page.locator('tbody tr').filter({ hasText: child.code })).toHaveCount(1);
    await expect(run.page.locator('tbody tr').filter({ hasText: root.code })).toHaveCount(0);
    await run.screenshot('organization-search-ancestors');
    await toggleOrganization(run, target, false);
    for (const organization of [target, child, grandchild]) {
        const snapshot = (await run.fixture('org-snapshot', organization.slot)).orgSnapshot;
        expect(snapshot?.org['is_active']).toBe(false);
    }
    await toggleOrganization(run, grandchild, true, 409);
    await toggleOrganization(run, target, true);
    expect((await run.fixture('org-snapshot', child.slot)).orgSnapshot?.org['is_active']).toBe(false);
    await toggleOrganization(run, child, true);
    await toggleOrganization(run, grandchild, true);
    const detail = await run.page.evaluate(async (id) => {
        const response = await fetch(`/api/platform/org-units/${id}`, { credentials: 'include' });
        return { status: response.status, body: (await response.json()) as Record<string, unknown> };
    }, child.id);
    expect(detail.status).toBe(200);
    expect(detail.body['parentId']).toBe(target.id);
    expect(detail.body['displayOrder']).toBe(7);
    expect(detail.body['description']).toBe('原页面组织树验收');
    const audit = await run.snapshot(run.page, 'admin');
    const ownIds = new Set([root.id, child.id, grandchild.id, target.id]);
    const writes = audit.audits.filter((value) => ownIds.has(value.targetId));
    expect(writes).toHaveLength(11);
    expect(writes.filter((value) => value.result === 'rejected')).toHaveLength(1);
    expect(writes.every((value) => value.targetType === 'OrgUnit' && value.requestId === null)).toBe(true);
    run.verification['organizationIds'] = [...ownIds];
    run.verification['audits'] = writes;
    run.verification['detail'] = detail.body;
    run.verification['hierarchySearch'] = true;
    await run.screenshot('organizations-after-journey');
}
test('UI desktop: original organization page creates a tree, edits, moves and cascades with committed audits', async ({ organizationsRun }) => {
    await journey(organizationsRun);
});
test('UI 390x844: original organization page completes the same tree and command journey', async ({ organizationsRun }) => {
    await organizationsRun.page.setViewportSize({ width: 390, height: 844 });
    await journey(organizationsRun);
});

test('UI and HTTP: the same viewer session loses and regains organization access', async ({ organizationsRun: run }) => {
    await run.login(run.page, 'viewer');
    await openOrganizations(run);
    const cookie = async () => (await run.page.context().cookies()).find((value) => value.name === 'poms_session')?.value;
    const initial = await cookie();
    expect(!!initial).toBe(true);
    const access = () =>
        run.page.evaluate(async () => {
            const response = await fetch('/api/platform/org-units', { credentials: 'include' });
            const body: unknown = await response.json();
            return { status: response.status, code: body && typeof body === 'object' && 'code' in body ? body.code : null };
        });
    await run.setAccess('viewer', false);
    expect(await access()).toEqual({ status: 403, code: 'permission_denied' });
    await Promise.all([orgResponse(run.page, '/api/me/navigation'), run.page.reload({ waitUntil: 'domcontentloaded' })]);
    await expect.poll(() => new URL(run.page.url()).pathname).toBe('/auth/access');
    await expect(run.page.locator('.layout-menu a[href="/platform/org-units"]')).toHaveCount(0);
    expect(await cookie()).toBe(initial);
    await run.setAccess('viewer', true);
    expect((await access()).status).toBe(200);
    await Promise.all([orgResponse(run.page, '/api/me/navigation'), orgResponse(run.page, '/api/platform/org-units'), orgResponse(run.page, '/api/platform/org-unit-tree'), run.page.goto('/platform/org-units', { waitUntil: 'domcontentloaded' })]);
    await expect(run.page.locator('.layout-menu a[href="/platform/org-units"]')).toHaveCount(1);
    expect(await cookie()).toBe(initial);
    const final = await run.snapshot(run.page, 'viewer');
    expect(final.session.status).toBe('active');
    expect(final.securityEvents.filter((value) => value.eventType === 'authz.permission.denied').length).toBeGreaterThan(0);
    run.verification['sameSessionPermissionRejection'] = true;
});
