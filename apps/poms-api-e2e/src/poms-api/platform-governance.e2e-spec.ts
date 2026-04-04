import { createApiClient, loginAsAdmin, loginAsViewer, VIEWER_CREDENTIALS } from '../support/api-client';
import { expectErrorStatus, expectStatus } from '../support/http';
import {
    activateOrgUnit,
    activateRole,
    activatePlatformUser,
    assignRolePermissions,
    assignUserOrgMemberships,
    assignUserRoles,
    createOrgUnit,
    createRole,
    deactivateOrgUnit,
    deactivateRole,
    deactivatePlatformUser,
    findPlatformOrgUnitByCode,
    findPlatformRoleByKey,
    findPlatformUserByUsername,
    getPlatformOrgUnit,
    getPlatformRole,
    getMyNavigation,
    listPlatformPermissions,
    listPlatformOrgUnitTree,
    listPlatformRoles,
    moveOrgUnit,
    syncPlatformNavigation
} from '../support/platform-api';
import { listAuditLogs, listSecurityEvents } from '../support/runtime-audit-api';
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

    it('returns permission dictionary and role detail, and stops authorization when a role is deactivated', async () => {
        const { client: adminClient } = await loginAsAdmin();
        const viewer = await findPlatformUserByUsername(adminClient, 'viewer');
        const projectViewerRole = await findPlatformRoleByKey(adminClient, 'project-viewer');
        const unique = makeUniqueSuffix('role-detail');
        const tempRole = await createRole(adminClient, {
            roleKey: `e2e-role-detail-${Date.now().toString(36)}`,
            name: `E2E 角色详情 ${unique}`,
            description: '用于验证角色详情、权限字典与停用后授权收敛',
            displayOrder: 98
        });

        try {
            const permissions = await listPlatformPermissions(adminClient);
            expect(permissions.some((permission) => permission.key === 'platform:roles:manage')).toBe(true);

            await assignRolePermissions(adminClient, tempRole.id, {
                permissionKeys: ['platform:roles:manage']
            });

            const detailAfterAssign = await getPlatformRole(adminClient, tempRole.id);
            expect(detailAfterAssign.permissionKeys).toEqual(['platform:roles:manage']);
            expect(detailAfterAssign.assignedUserCount).toBe(0);

            await assignUserRoles(adminClient, viewer.id, {
                roleIds: [projectViewerRole.id, tempRole.id]
            });

            const viewerSession = await loginAsViewer();
            const rolesAfterGrant = await viewerSession.client.get('/platform/roles');
            expectStatus(rolesAfterGrant, 200);

            await deactivateRole(adminClient, tempRole.id);

            const rolesAfterDeactivate = await viewerSession.client.get('/platform/roles');
            expectErrorStatus(rolesAfterDeactivate, 403);

            await activateRole(adminClient, tempRole.id);

            const rolesAfterReactivate = await viewerSession.client.get('/platform/roles');
            expectStatus(rolesAfterReactivate, 200);
        } finally {
            await assignUserRoles(adminClient, viewer.id, {
                roleIds: [projectViewerRole.id]
            });
            await activateRole(adminClient, tempRole.id);
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

    it('returns org tree/detail and supports activate deactivate move lifecycle', async () => {
        const { client: adminClient } = await loginAsAdmin();
        const unique = Date.now().toString(36).toUpperCase();

        const parent = await createOrgUnit(adminClient, {
            name: `E2E 根组织 ${unique}`,
            code: `E2EROOT${unique}`,
            description: '用于验证组织树、详情与生命周期命令',
            displayOrder: 200
        });
        const child = await createOrgUnit(adminClient, {
            name: `E2E 子组织 ${unique}`,
            code: `E2ECHILD${unique}`,
            description: '用于验证组织移动与停启',
            parentId: parent.id,
            displayOrder: 201
        });
        const target = await createOrgUnit(adminClient, {
            name: `E2E 目标组织 ${unique}`,
            code: `E2ETARGET${unique}`,
            description: '用于验证组织移动目标',
            displayOrder: 202
        });

        const tree = await listPlatformOrgUnitTree(adminClient);
        const parentNode = tree.find((node) => node.id === parent.id);
        expect(parentNode).toBeDefined();
        expect(parentNode?.children.some((node) => node.id === child.id)).toBe(true);

        const childDetail = await getPlatformOrgUnit(adminClient, child.id);
        expect(childDetail.parentId).toBe(parent.id);
        expect(childDetail.childCount).toBe(0);
        expect(childDetail.activeMembershipCount).toBe(0);
        expect(childDetail.canDelete).toBe(true);

        await deactivateOrgUnit(adminClient, parent.id);

        const deactivatedParent = await findPlatformOrgUnitByCode(adminClient, parent.code);
        const deactivatedChild = await findPlatformOrgUnitByCode(adminClient, child.code);
        expect(deactivatedParent.isActive).toBe(false);
        expect(deactivatedChild.isActive).toBe(false);

        const activateChildResponse = await adminClient.post(`/platform/org-units/${child.id}/activate`, {});
        expectErrorStatus(activateChildResponse, 409);

        await activateOrgUnit(adminClient, parent.id);
        await activateOrgUnit(adminClient, child.id);

        const movedChild = await moveOrgUnit(adminClient, child.id, {
            parentId: target.id,
            displayOrder: 7
        });
        expect(movedChild.parentId).toBe(target.id);
        expect(movedChild.displayOrder).toBe(7);

        const refreshedTarget = await getPlatformOrgUnit(adminClient, target.id);
        expect(refreshedTarget.childCount).toBe(1);
    });

    it('rejects assigning users to inactive org units', async () => {
        const { client: adminClient } = await loginAsAdmin();
        const viewer = await findPlatformUserByUsername(adminClient, 'viewer');
        const originalPrimaryOrgUnitId = viewer.primaryOrgUnitId;
        expect(originalPrimaryOrgUnitId).toBeTruthy();

        const unique = Date.now().toString(36).toUpperCase();
        const inactiveOrg = await createOrgUnit(adminClient, {
            name: `E2E 停用组织 ${unique}`,
            code: `E2EDISABLED${unique}`,
            description: '用于验证停用组织拒绝绑定',
            displayOrder: 203
        });

        await deactivateOrgUnit(adminClient, inactiveOrg.id);

        const assignResponse = await adminClient.post(`/platform/users/${viewer.id}/org-memberships`, {
            primaryOrgUnitId: inactiveOrg.id,
            secondaryOrgUnitIds: []
        });
        expectErrorStatus(assignResponse, 409);

        const refreshedViewer = await findPlatformUserByUsername(adminClient, 'viewer');
        expect(refreshedViewer.primaryOrgUnitId).toBe(originalPrimaryOrgUnitId);
    });

    it('exposes persisted audit logs and security events through the minimal query endpoints', async () => {
        const { client: adminClient } = await loginAsAdmin();
        const from = new Date().toISOString();
        const unique = Date.now().toString(36).toUpperCase();
        const navigationSync = await syncPlatformNavigation(adminClient);

        const createdOrg = await createOrgUnit(adminClient, {
            name: `E2E 审计组织 ${unique}`,
            code: `E2EAUDIT${unique}`,
            description: '用于验证运行时审计查询接口',
            displayOrder: 100
        });

        const failedLoginResponse = await createApiClient().post('/auth/login', {
            username: 'admin',
            password: 'wrong-password'
        });
        expectErrorStatus(failedLoginResponse, 401, '用户名或密码错误');

        const invalidTokenClient = createApiClient('malformed-token');
        const invalidTokenResponse = await invalidTokenClient.get('/auth/profile');
        expectErrorStatus(invalidTokenResponse, 401);

        const auditLogs = await listAuditLogs(adminClient, {
            from,
            eventType: 'platform.org-unit.created',
            targetId: createdOrg.id,
            limit: 5
        });
        expect(
            auditLogs.some(
                (event) =>
                    event.eventType === 'platform.org-unit.created' &&
                    event.targetId === createdOrg.id &&
                    event.result === 'success'
            )
        ).toBe(true);

        const navigationAuditLogs = await listAuditLogs(adminClient, {
            from,
            eventType: 'platform.navigation.synced',
            targetId: navigationSync.targetId,
            limit: 5
        });
        expect(
            navigationAuditLogs.some(
                (event) =>
                    event.eventType === 'platform.navigation.synced' &&
                    event.targetId === navigationSync.targetId &&
                    event.afterSnapshot?.['treeChecksum'] === navigationSync.treeChecksum
            )
        ).toBe(true);

        const loginFailures = await listSecurityEvents(adminClient, {
            from,
            eventType: 'auth.login.failed',
            principal: 'admin',
            result: 'failed',
            limit: 5
        });
        expect(
            loginFailures.some(
                (event) =>
                    event.eventType === 'auth.login.failed' &&
                    event.principal === 'admin' &&
                    event.result === 'failed'
            )
        ).toBe(true);

        const invalidTokenEvents = await listSecurityEvents(adminClient, {
            from,
            eventType: 'auth.token.invalid',
            path: '/api/auth/profile',
            limit: 5
        });
        expect(
            invalidTokenEvents.some(
                (event) =>
                    event.eventType === 'auth.token.invalid' &&
                    event.path === '/api/auth/profile' &&
                    (event.result === 'failed' || event.result === 'expired')
            )
        ).toBe(true);

        const viewerSession = await loginAsViewer();
        const routeDeniedResponse = await viewerSession.client.post('/security-events/route-denied', {
            path: '/platform/users',
            returnUrl: '/platform/users',
            requiredPermissions: ['platform:users:manage']
        });
        expect(routeDeniedResponse.status).toBe(202);

        const routeDeniedEvents = await listSecurityEvents(adminClient, {
            from,
            eventType: 'authz.route.denied',
            actorId: viewerSession.profile.id,
            path: '/platform/users',
            limit: 5
        });
        expect(
            routeDeniedEvents.some(
                (event) =>
                    event.eventType === 'authz.route.denied' &&
                    event.actorId === viewerSession.profile.id &&
                    event.path === '/platform/users' &&
                    event.result === 'blocked'
            )
        ).toBe(true);
    });
});
