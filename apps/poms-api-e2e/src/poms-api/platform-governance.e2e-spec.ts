import { createApiClient, loginAsAdmin, loginAsViewer, VIEWER_CREDENTIALS } from '../support/api-client';
import { expectErrorStatus, expectStatus } from '../support/http';
import {
    activatePlatformUser,
    assignRolePermissions,
    assignUserOrgMemberships,
    assignUserRoles,
    createOrgUnit,
    createRole,
    deactivatePlatformUser,
    findPlatformRoleByKey,
    findPlatformUserByUsername,
    getMyNavigation,
    listPlatformRoles
} from '../support/platform-api';
import { makeUniqueSuffix } from '../support/test-data';
import type { NavigationItem } from '../support/types';

jest.setTimeout(120_000);

function hasNavigationKey(items: NavigationItem[], key: string): boolean {
    for (const item of items) {
        if (item.key === key) return true;
        if (item.children && hasNavigationKey(item.children, key)) {
            return true;
        }
    }
    return false;
}

describe('poms-api platform governance e2e', () => {
    it('invalidates an existing session and blocks re-login when a user is deactivated', async () => {
        const { client: adminClient } = await loginAsAdmin();
        const viewer = await findPlatformUserByUsername(adminClient, 'viewer');
        const viewerSession = await loginAsViewer();

        try {
            const profileBefore = await viewerSession.client.get('/auth/profile');
            expectStatus(profileBefore, 200);

            await activatePlatformUser(adminClient, viewer.id);
            await deactivatePlatformUser(adminClient, viewer.id);

            const staleSessionResponse = await viewerSession.client.get('/auth/profile');
            expectErrorStatus(staleSessionResponse, 401);

            const loginResponse = await createApiClient().post('/auth/login', VIEWER_CREDENTIALS);
            expectErrorStatus(loginResponse, 401, '用户名或密码错误');
        } finally {
            await activatePlatformUser(adminClient, viewer.id);
        }
    });

    it('applies role permission changes to navigation and protected APIs for an existing session', async () => {
        const { client: adminClient } = await loginAsAdmin();
        const viewer = await findPlatformUserByUsername(adminClient, 'viewer');
        const projectViewerRole = await findPlatformRoleByKey(adminClient, 'project-viewer');
        const unique = makeUniqueSuffix('platform-role');
        const tempRole = await createRole(adminClient, {
            roleKey: `e2e-platform-${Date.now().toString(36)}`,
            name: `E2E 平台治理角色 ${unique}`,
            description: '用于验证角色权限变化对导航与接口的即时影响',
            displayOrder: 99
        });
        await assignRolePermissions(adminClient, tempRole.id, {
            permissionKeys: ['platform:roles:manage', 'platform:navigation:manage']
        });

        const viewerSession = await loginAsViewer();

        try {
            const rolesDeniedResponse = await viewerSession.client.get('/platform/roles');
            expectErrorStatus(rolesDeniedResponse, 403);

            const navBefore = await getMyNavigation(viewerSession.client);
            expect(hasNavigationKey(navBefore, 'platform.roles')).toBe(false);
            expect(hasNavigationKey(navBefore, 'platform.navigation')).toBe(false);

            await assignUserRoles(adminClient, viewer.id, {
                roleIds: [projectViewerRole.id, tempRole.id]
            });

            const rolesAfterGrant = await listPlatformRoles(viewerSession.client);
            expect(rolesAfterGrant.some((role) => role.id === tempRole.id)).toBe(true);

            const navAfterGrant = await getMyNavigation(viewerSession.client);
            expect(hasNavigationKey(navAfterGrant, 'platform.roles')).toBe(true);
            expect(hasNavigationKey(navAfterGrant, 'platform.navigation')).toBe(true);

            const fullNavigationResponse = await viewerSession.client.get('/platform/navigation');
            expectStatus(fullNavigationResponse, 200);

            await assignUserRoles(adminClient, viewer.id, {
                roleIds: [projectViewerRole.id]
            });

            const rolesAfterRevokeResponse = await viewerSession.client.get('/platform/roles');
            expectErrorStatus(rolesAfterRevokeResponse, 403);

            const navAfterRevoke = await getMyNavigation(viewerSession.client);
            expect(hasNavigationKey(navAfterRevoke, 'platform.roles')).toBe(false);
            expect(hasNavigationKey(navAfterRevoke, 'platform.navigation')).toBe(false);

            const fullNavigationDeniedResponse = await viewerSession.client.get('/platform/navigation');
            expectErrorStatus(fullNavigationDeniedResponse, 403);
        } finally {
            await assignUserRoles(adminClient, viewer.id, {
                roleIds: [projectViewerRole.id]
            });
        }
    });

    it('reflects org membership changes in both profile and platform list queries', async () => {
        const { client: adminClient } = await loginAsAdmin();
        const viewer = await findPlatformUserByUsername(adminClient, 'viewer');
        expect(viewer.primaryOrgUnitId).toBeTruthy();

        const unique = Date.now().toString(36).toUpperCase();
        const newOrg = await createOrgUnit(adminClient, {
            name: `E2E 平台组织 ${unique}`,
            code: `E2EORG${unique}`,
            description: '用于验证组织变更对 profile 与列表读侧的即时影响',
            displayOrder: 99
        });

        const viewerSession = await loginAsViewer();

        try {
            await assignUserOrgMemberships(adminClient, viewer.id, {
                primaryOrgUnitId: newOrg.id,
                secondaryOrgUnitIds: []
            });

            const profileResponse = await viewerSession.client.get('/auth/profile');
            const profile = expectStatus(profileResponse, 200);
            expect(profile.orgUnits.some((orgUnit) => orgUnit.id === newOrg.id && orgUnit.name === newOrg.name)).toBe(true);

            const refreshedViewer = await findPlatformUserByUsername(adminClient, 'viewer');
            expect(refreshedViewer.primaryOrgUnitId).toBe(newOrg.id);
            expect(refreshedViewer.primaryOrgUnitName).toBe(newOrg.name);
        } finally {
            await assignUserOrgMemberships(adminClient, viewer.id, {
                primaryOrgUnitId: viewer.primaryOrgUnitId!,
                secondaryOrgUnitIds: []
            });
        }
    });
});
