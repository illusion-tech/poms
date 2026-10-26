import { assignPermissions, createRole, expect, openRoles, type RolesRun, roleResponse, test, toggleRole } from './support/r2b-roles';

async function journey(run: RolesRun) {
    await run.login(run.page, 'admin');
    await openRoles(run);
    const role = await createRole(run);
    const row = run.page.locator('tbody tr').filter({ hasText: role.key });
    const [detail] = await Promise.all([roleResponse(run.page, `/api/platform/roles/${role.id}`), row.getByRole('button', { name: `编辑角色 ${role.name}`, exact: true }).click()]);
    expect(detail.status()).toBe(200);
    const dialog = run.page.getByRole('dialog').filter({ has: run.page.locator('#edit-role-name') });
    role.name = 'R2B ui edited';
    await dialog.locator('#edit-role-name').fill(role.name);
    await dialog.locator('#edit-role-description').fill('原页面角色验收');
    await dialog.locator('#edit-role-order').fill('6');
    const [updated] = await Promise.all([roleResponse(run.page, `/api/platform/roles/${role.id}`, 'PATCH'), dialog.getByRole('button', { name: '保存', exact: true }).click()]);
    expect(updated.status()).toBe(200);
    await expect(dialog).toBeHidden();
    await expect(row).toContainText(role.name);
    await assignPermissions(run, role, ['project:read']);
    const first = (await run.fixture('role-snapshot', 'ui')).roleSnapshot;
    if (!first) throw Error('Role snapshot required');
    const originalGrant = first.permissions.find((p) => p['permission_key'] === 'project:read');
    if (!originalGrant) throw Error('Grant missing');
    await assignPermissions(run, role, ['nav:profile:view']);
    await assignPermissions(run, role, ['nav:profile:view', 'project:read']);
    const after = (await run.fixture('role-snapshot', 'ui')).roleSnapshot;
    if (!after) throw Error('Role snapshot required');
    const grants = after.permissions.filter((p) => p['permission_key'] === 'project:read');
    expect(grants).toHaveLength(2);
    expect(grants.some((p) => p['id'] === originalGrant['id'] && p['status'] === 'revoked' && p['revoked_at'] !== null)).toBe(true);
    expect(grants.some((p) => p['id'] !== originalGrant['id'] && p['status'] === 'active')).toBe(true);
    expect(after.role['row_version']).toBe(first.role['row_version']);
    expect(after.role['updated_at']).toBe(first.role['updated_at']);
    await toggleRole(run, role, false);
    await toggleRole(run, role, true);
    const audit = await run.snapshot(run.page, 'admin');
    const writes = audit.audits.filter((a) => a.targetId === role.id);
    expect(writes).toHaveLength(7);
    expect(writes.every((a) => a.targetType === 'PlatformRole' && a.result === 'success' && a.requestId === null)).toBe(true);
    run.verification['roleId'] = role.id;
    run.verification['writeAudits'] = writes;
    run.verification['history'] = after.permissions;
    await run.screenshot('roles-after-journey');
    // Original navigation page is exercised against the same new R2B copy.
    const [navigation] = await Promise.all([roleResponse(run.page, '/api/platform/navigation'), run.page.goto('/platform/navigation', { waitUntil: 'domcontentloaded' })]);
    expect(navigation.status()).toBe(200);
    const [synced] = await Promise.all([roleResponse(run.page, '/api/platform/navigation:sync', 'POST'), run.page.getByRole('button', { name: /记录同步审计$/ }).click()]);
    expect(synced.status()).toBe(200);
    const final = await run.snapshot(run.page, 'admin');
    expect(final.audits.filter((a) => a.eventType === 'platform.navigation.synced')).toHaveLength(1);
    run.verification['navigationRegression'] = true;
}
test('UI desktop: original role page creates, edits, replaces history and toggles, with committed audits', async ({ rolesRun }) => {
    await journey(rolesRun);
});
test('UI 390x844: original role page completes the same role and navigation journey', async ({ rolesRun }) => {
    await rolesRun.page.setViewportSize({ width: 390, height: 844 });
    await journey(rolesRun);
});
test('UI and HTTP: same viewer session gains and loses role access after real role commands', async ({ rolesRun: run }) => {
    await run.login(run.page, 'admin');
    await openRoles(run);
    const role = await createRole(run);
    await run.fixture('role-bind-viewer', 'ui');
    const viewer = await run.viewer();
    await run.login(viewer, 'viewer');
    const cookie = () =>
        viewer
            .context()
            .cookies()
            .then((c) => c.find((item) => item.name === 'poms_session')?.value);
    const initialCookie = await cookie();
    expect(!!initialCookie).toBe(true);
    const access = () =>
        viewer.evaluate(async () => {
            const response = await fetch('/api/platform/roles', { credentials: 'include' });
            const body: unknown = await response.json();
            return { status: response.status, code: body && typeof body === 'object' && 'code' in body ? body.code : null };
        });
    expect(await access()).toEqual({ status: 403, code: 'permission_denied' });
    await expect(viewer.locator('.layout-menu a[href="/platform/roles"]')).toHaveCount(0);
    await assignPermissions(run, role, ['platform:roles:manage']);
    expect((await access()).status).toBe(200);
    await Promise.all([roleResponse(viewer, '/api/me/navigation'), viewer.reload({ waitUntil: 'domcontentloaded' })]);
    await expect(viewer.locator('.layout-menu a[href="/platform/roles"]')).toHaveCount(1);
    expect((await cookie()) === initialCookie).toBe(true);
    await toggleRole(run, role, false);
    expect(await access()).toEqual({ status: 403, code: 'permission_denied' });
    await toggleRole(run, role, true);
    expect((await access()).status).toBe(200);
    await assignPermissions(run, role, []);
    expect(await access()).toEqual({ status: 403, code: 'permission_denied' });
    await Promise.all([roleResponse(viewer, '/api/me/navigation'), viewer.reload({ waitUntil: 'domcontentloaded' })]);
    await expect(viewer.locator('.layout-menu a[href="/platform/roles"]')).toHaveCount(0);
    expect((await cookie()) === initialCookie).toBe(true);
    const after = await run.snapshot(viewer, 'viewer');
    expect(after.session.status).toBe('active');
    run.verification['sameSessionLivePermission'] = true;
    run.verification['sessionStatus'] = after.session.status;
});
