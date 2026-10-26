import { assertMeNavigation, expandMenuGroup, expect, golden, navigationResponse, openGovernance, test, type NavigationRun } from './support/r2a-navigation';

async function adminJourney(run: NavigationRun): Promise<void> {
    const { page } = run;
    const { userId } = await run.login('admin', 'authority-all-permissions');
    run.mark('phase:admin-audit-before');
    const before = await run.snapshot('admin');
    expect(before.audits).toHaveLength(0);
    await openGovernance(run);
    const governance = page.locator('app-navigation-governance');
    const rows = governance.locator('tbody tr');
    await expect(rows).toHaveCount(golden.original.snapshot.nodeCount);
    const search = governance.getByPlaceholder('搜索导航键、标题或路由');
    run.mark('phase:admin-search');
    run.mark('actual-page-search');
    await search.fill('platform.navigation');
    await expect(rows).toHaveCount(1);
    await expect(rows.getByText('platform.navigation', { exact: true })).toBeVisible();
    await search.fill(`r2a-no-match-${run.runId}`);
    await expect(governance.getByText('没有匹配的导航项', { exact: true })).toBeVisible();
    await search.clear();
    await expect(rows).toHaveCount(golden.original.snapshot.nodeCount);
    run.verification.search = true;

    run.mark('phase:admin-refresh');
    run.mark('actual-page-refresh');
    const [refreshedResponse] = await Promise.all([navigationResponse(page, '/api/platform/navigation'), governance.getByRole('button', { name: /刷新$/ }).click({ timeout: 10_000 })]);
    expect(refreshedResponse.status()).toBe(200);
    expect(await refreshedResponse.json()).toEqual(golden.original.fullTree);
    await expect(rows).toHaveCount(golden.original.snapshot.nodeCount);
    run.verification.refresh = true;

    run.mark('phase:admin-sync-and-reload');
    run.mark('actual-page-sync-button');
    const [syncResponse, reloadResponse] = await Promise.all([
        navigationResponse(page, '/api/platform/navigation:sync', 'POST'),
        navigationResponse(page, '/api/platform/navigation'),
        governance.getByRole('button', { name: /记录同步审计$/ }).click({ timeout: 10_000 })
    ]);
    expect(syncResponse.status()).toBe(200);
    expect(await syncResponse.json()).toEqual(golden.original.snapshot);
    await expect(page.getByText('已记录同步审计', { exact: true })).toBeVisible();
    expect(reloadResponse.status()).toBe(200);
    expect(await reloadResponse.json()).toEqual(golden.original.fullTree);

    run.mark('phase:admin-audit-after');
    const after = await run.snapshot('admin');
    expect(after.audits).toHaveLength(before.audits.length + 1);
    const inserted = after.audits.filter((row) => !before.audits.some((old) => old.id === row.id));
    expect(inserted).toHaveLength(1);
    const audit = inserted[0];
    if (!audit) throw new Error('Exactly one committed navigation audit is required');
    expect(Object.keys(audit).sort()).toEqual(['id', 'eventType', 'targetType', 'targetId', 'operatorId', 'requestId', 'result', 'reason', 'beforeSnapshot', 'afterSnapshot', 'metadata', 'occurredAt'].sort());
    expect(audit.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(audit.eventType).toBe('platform.navigation.synced');
    expect(audit.targetType).toBe('NavigationTree');
    expect(audit.targetId).toBe('platform-navigation');
    expect(audit.operatorId).toBe(userId);
    expect(audit.requestId).toBe(run.identity.requestId);
    expect(audit.result).toBe('success');
    expect(audit.reason).toBeNull();
    expect(audit.beforeSnapshot).toBeNull();
    expect(audit.afterSnapshot).toEqual(golden.original.snapshot);
    expect(audit.metadata).toEqual({ source: 'static-navigation-ssot' });
    expect(Number.isFinite(Date.parse(audit.occurredAt))).toBe(true);
    expect(new Date(audit.occurredAt).toISOString()).toBe(audit.occurredAt);
    run.verification.syncSummary = golden.original.snapshot;
    run.verification.insertedAudit = audit;
    run.mark('phase:admin-audit-verified');
}

test('UI: admin desktop reads, searches, refreshes and syncs original navigation with one committed audit', async ({ navigationRun }) => {
    await adminJourney(navigationRun);
    await navigationRun.screenshot('navigation-desktop');
});

test('UI: admin 390x844 reads, searches, refreshes and syncs original navigation with one committed audit', async ({ navigationRun }) => {
    await navigationRun.page.setViewportSize({ width: 390, height: 844 });
    await adminJourney(navigationRun);
    await navigationRun.screenshot('navigation-narrow');
});

test('UI/HTTP: partial viewer is denied governance and gains the AND menu only after actual permission reload', async ({ navigationRun: run }) => {
    const { page } = run;
    await run.login('viewer', 'authority-shell-org');
    run.mark('phase:viewer-partial-denial');
    await expect(page.locator('.layout-menu a[href="/platform/navigation"]')).toHaveCount(0);
    await expect(page.locator('.layout-menu a[href="/platform/external-org-sync"]')).toHaveCount(0);
    run.mark('readonly-same-origin-browser-fetch');
    const denied = await page.evaluate(async () => {
        const response = await fetch('/api/platform/navigation', { credentials: 'include' });
        const value: unknown = await response.json();
        const code = value && typeof value === 'object' && 'code' in value && typeof value.code === 'string' ? value.code : null;
        return { status: response.status, code };
    });
    expect(denied).toEqual({ status: 403, code: 'permission_denied' });
    run.verification.forbiddenFetch = denied;

    await run.enableAndPermissions();
    run.mark('phase:viewer-permission-reload');
    run.mark('actual-browser-reload');
    const [navigation] = await Promise.all([navigationResponse(page, '/api/me/navigation'), page.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 })]);
    await assertMeNavigation(run, navigation, 'authority-shell-org-and-sync');
    await expect(page).toHaveURL((url) => url.pathname === '/dashboard');
    await expect(page.locator('.layout-menu a[href="/platform/navigation"]')).toHaveCount(0);
    run.mark('phase:viewer-expand-and-menu');
    await expandMenuGroup(run, '组织架构');
    const andLink = page.locator('.layout-menu a[href="/platform/external-org-sync"]');
    await expect(andLink.getByText('外部组织同步', { exact: true })).toBeVisible();
    run.verification.andMenuVisible = true;
    run.mark('phase:viewer-and-menu-verified');
    // The link is intentionally not followed: the R2H business is not delivered here.
});
