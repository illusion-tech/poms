import { expect, openUsers, test, userAction, userResponse, type UsersRun } from './support/r2d-users';
// eslint-disable-next-line @nx/enforce-module-boundaries -- R2D deterministic synthetic names; creation remains real HTTP.
import { userFixtureSpec } from '../../../tools/rust-r2d/fixture-protocol.cjs';

async function profileJourney(run: UsersRun, name: string) {
    await run.page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(run.page.getByRole('heading', { name: '个人中心', exact: true })).toBeVisible();
    const profile = await run.page.evaluate(async () => {
        const response = await fetch('/api/auth/profile', { credentials: 'include' });
        return { status: response.status, body: await response.json() };
    });
    expect(profile.status).toBe(200);
    run.verification['explicitProfileHttpRead'] = profile;
    const edit = async (email: string, phone: string) => {
        await run.page.getByRole('button', { name: /编辑资料$/ }).click();
        const dialog = run.page.getByRole('dialog', { name: '编辑资料', exact: true });
        await dialog.getByLabel('姓名 *', { exact: true }).fill(`  ${name}  `);
        await dialog.getByLabel('邮箱', { exact: true }).fill(email);
        await dialog.getByLabel('手机', { exact: true }).fill(phone);
        const [saved] = await Promise.all([userResponse(run.page, '/api/auth/profile', 'PATCH'), dialog.getByRole('button', { name: '保存', exact: true }).click()]);
        expect(saved.status()).toBe(200);
        const body = (await saved.json()) as Record<string, unknown>;
        expect(body['displayName']).toBe(name);
        expect(body['email']).toBe(email.trim() || null);
        expect(body['phone']).toBe(phone.trim() || null);
        expect(body['emailVerified']).toBe(false);
        expect(body['phoneVerified']).toBe(false);
        await expect(dialog).toBeHidden();
        await expect(run.page.locator('.profile-item')).toContainText(name);
        return body;
    };
    run.verification['profileUpdated'] = await edit('ui-r2d@example.test', ' 555-0101 ');
    run.verification['profileCleared'] = await edit('', '');
    await run.screenshot('profile-cleared-topbar-identity');
}

async function journey(run: UsersRun) {
    await run.login();
    await openUsers(run);
    const spec = userFixtureSpec(run.runId, 'u240');
    await run.fixture('user-plan', 'u240');
    await run.page.getByRole('button', { name: '新建用户', exact: true }).click();
    const create = run.page.getByRole('dialog', { name: '新建用户', exact: true });
    await create.getByPlaceholder('登录用户名', { exact: true }).fill(spec.username);
    await create.getByPlaceholder('显示名称', { exact: true }).fill(spec.displayName);
    const [created] = await Promise.all([userResponse(run.page, '/api/platform/users', 'POST'), create.getByRole('button', { name: '创建', exact: true }).click()]);
    expect(created.status()).toBe(201);
    const user = (await created.json()) as { id: string; displayName: string };
    expect((await run.fixture('user-adopt', 'u240')).user?.userId).toBe(user.id);
    await expect(create).toBeHidden();
    await userAction(run, spec.username, '编辑信息');
    const edit = run.page.getByRole('dialog', { name: '编辑用户信息', exact: true });
    const editedName = `R2D edited ${run.runId.slice(0, 8)}`;
    await edit.getByPlaceholder('显示名称', { exact: true }).fill(editedName);
    await edit.getByPlaceholder('可选', { exact: true }).nth(0).fill('target-r2d@example.test');
    await edit.getByPlaceholder('可选', { exact: true }).nth(1).fill('555-0202');
    await edit.getByPlaceholder('可选', { exact: true }).nth(2).fill('https://example.test/avatar.png');
    const [updated] = await Promise.all([userResponse(run.page, `/api/platform/users/${user.id}`, 'PATCH'), edit.getByRole('button', { name: '保存', exact: true }).click()]);
    expect(updated.status()).toBe(200);
    await expect(edit).toBeHidden();

    const roleLabel = `R2D role alpha ${run.runId.slice(0, 8)}`;
    for (const selected of [true, false]) {
        await userAction(run, spec.username, '分配角色');
        const dialog = run.page.getByRole('dialog', { name: '分配角色', exact: true });
        await dialog.locator('p-multiselect').click();
        await run.page.getByRole('option', { name: roleLabel, exact: true }).click();
        const roleSelect = dialog.locator('p-multiselect').getByRole('combobox');
        await roleSelect.press('Escape');
        await expect(roleSelect).toHaveAttribute('aria-expanded', 'false');
        const [assigned] = await Promise.all([userResponse(run.page, `/api/platform/users/${user.id}/roles`, 'PUT'), dialog.getByRole('button', { name: '保存', exact: true }).click()]);
        expect(assigned.status()).toBe(200);
        await expect(dialog).toBeHidden();
        const body = (await assigned.json()) as { roles: string[]; permissions: string[] };
        expect(body.roles).toEqual(selected ? [roleLabel] : []);
        expect(body.permissions).toEqual([]);
    }
    const orgLabel = (slot: string) => `R2D org ${slot} ${run.runId.slice(0, 8)}`;
    for (const secondary of [true, false]) {
        await userAction(run, spec.username, '分配组织');
        const dialog = run.page.getByRole('dialog', { name: '分配组织', exact: true });
        await dialog.locator('p-select').click();
        await run.page.getByRole('option', { name: orgLabel(secondary ? 'alpha' : 'viewer'), exact: true }).click();
        await dialog.locator('p-multiselect').click();
        await run.page.getByRole('option', { name: orgLabel('admin'), exact: true }).click();
        const secondarySelect = dialog.locator('p-multiselect').getByRole('combobox');
        await secondarySelect.press('Escape');
        await expect(secondarySelect).toHaveAttribute('aria-expanded', 'false');
        const [assigned] = await Promise.all([userResponse(run.page, `/api/platform/users/${user.id}/org-memberships`, 'PUT'), dialog.getByRole('button', { name: '保存', exact: true }).click()]);
        expect(assigned.status()).toBe(200);
        await expect(dialog).toBeHidden();
        const body = (await assigned.json()) as { orgUnits: { name: string; membershipType: string }[]; permissions: string[] };
        expect(body.orgUnits).toHaveLength(secondary ? 2 : 1);
        expect(body.orgUnits.find((o) => o.membershipType === 'primary')?.name).toBe(orgLabel(secondary ? 'alpha' : 'viewer'));
        expect(body.permissions).toEqual([]);
    }
    await userAction(run, spec.username, '停用');
    const confirm = run.page.getByRole('alertdialog', { name: '确认停用', exact: true });
    const [deactivated] = await Promise.all([userResponse(run.page, `/api/platform/users/${user.id}:deactivate`, 'POST'), confirm.getByRole('button', { name: '停用', exact: true }).click()]);
    expect(deactivated.status()).toBe(200);
    const [activated] = await Promise.all([userResponse(run.page, `/api/platform/users/${user.id}:activate`, 'POST'), userAction(run, spec.username, '启用')]);
    expect(activated.status()).toBe(200);
    const [detail] = await Promise.all([userResponse(run.page, `/api/platform/users/${user.id}`), userAction(run, spec.username, '查看详情')]);
    expect(detail.status()).toBe(200);
    const details = run.page.getByRole('dialog', { name: '用户详情', exact: true });
    await expect(details).toContainText(editedName);
    await expect(details).toContainText(orgLabel('viewer'));
    await run.screenshot('user-details-with-real-external-identity-panel');
    await details.getByRole('button', { name: '关闭', exact: true }).click();
    const facts = (await run.fixture('facts')).facts;
    if (!facts) throw Error('User journey facts absent');
    expect(facts['local_credential'].filter((row) => row['user_id'] === user.id)).toHaveLength(0);
    expect(facts['user_role_assignment'].filter((row) => row['user_id'] === user.id)).toHaveLength(0);
    expect(facts['user_org_membership'].filter((row) => row['user_id'] === user.id)).toHaveLength(1);
    const audits = facts['audit_log'].filter((row) => row['target_id'] === user.id);
    expect(audits).toHaveLength(8);
    expect(audits.every((row) => row['result'] === 'success' && row['target_type'] === 'PlatformUser' && row['request_id'] === null)).toBe(true);
    run.verification['userJourney'] = { userId: user.id, detail: await detail.json(), audits, credentialCreated: false };
    await run.screenshot('users-after-commands');
    await profileJourney(run, `R2D self ${run.runId.slice(0, 8)}`);
}

test('UI desktop: original user and profile pages complete create, edit, replacements, activation and identity refresh', async ({ usersRun }) => {
    await journey(usersRun);
});
test('UI 390x844: original user and profile pages complete the same journey', async ({ usersRun }) => {
    await usersRun.page.setViewportSize({ width: 390, height: 844 });
    await journey(usersRun);
});
test('UI and HTTP: zero-permission profile remains usable while user access and missing CSRF are rejected', async ({ usersRun: run }) => {
    await run.login();
    const cookie = async () => (await run.page.context().cookies()).find((value) => value.name === 'poms_session')?.value;
    const initial = await cookie();
    expect(!!initial).toBe(true);
    await run.access(false);
    await profileJourney(run, `R2D zero ${run.runId.slice(0, 8)}`);
    const denied = await run.page.evaluate(async () => {
        const read = await fetch('/api/platform/users', { credentials: 'include' });
        const write = await fetch('/api/auth/profile', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: '{}' });
        return { users: { status: read.status, body: await read.json() }, missingCsrf: { status: write.status, body: await write.json() } };
    });
    expect(denied.users.status).toBe(403);
    expect(denied.users.body.code).toBe('permission_denied');
    expect(denied.missingCsrf.status).toBe(403);
    expect(await cookie()).toBe(initial);
    await run.access(true);
    await openUsers(run);
    expect(await cookie()).toBe(initial);
    run.verification['sameSessionPermissionsAndCsrf'] = denied;
});
