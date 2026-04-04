import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    AssignRolePermissionsRequest,
    AssignUserOrgMembershipsRequest,
    AssignUserRolesRequest,
    CreateOrgUnitRequest,
    CreateRoleRequest,
    MoveOrgUnitRequest,
    NavigationItem,
    NavigationSyncSummary,
    OrgUnitTreeNode,
    PlatformOrgUnitDetail,
    PlatformOrgUnitSummary,
    PlatformRoleSummary,
    PlatformUserList,
    PlatformUserSummary,
    SanitizedUserWithOrgUnits,
    UpdateOrgUnitActivationRequest,
    UpdatePlatformUserActivationRequest
} from './types';

export async function listPlatformUsers(client: AxiosInstance): Promise<PlatformUserList> {
    const response = await client.get<PlatformUserList>('/platform/users');
    return expectStatus(response, 200);
}

export async function listPlatformRoles(client: AxiosInstance): Promise<PlatformRoleSummary[]> {
    const response = await client.get<PlatformRoleSummary[]>('/platform/roles');
    return expectStatus(response, 200);
}

export async function createRole(
    client: AxiosInstance,
    input: CreateRoleRequest
): Promise<PlatformRoleSummary> {
    const response = await client.post<PlatformRoleSummary>('/platform/roles', input);
    return expectStatus(response, 201);
}

export async function assignRolePermissions(
    client: AxiosInstance,
    roleId: string,
    input: AssignRolePermissionsRequest
): Promise<PlatformRoleSummary> {
    const response = await client.post<PlatformRoleSummary>(
        `/platform/roles/${roleId}/permissions`,
        input
    );
    return expectStatus(response, 200);
}

export async function assignUserRoles(
    client: AxiosInstance,
    userId: string,
    input: AssignUserRolesRequest
): Promise<SanitizedUserWithOrgUnits> {
    const response = await client.post<SanitizedUserWithOrgUnits>(
        `/platform/users/${userId}/roles`,
        input
    );
    return expectStatus(response, 200);
}

export async function assignUserOrgMemberships(
    client: AxiosInstance,
    userId: string,
    input: AssignUserOrgMembershipsRequest
): Promise<SanitizedUserWithOrgUnits> {
    const response = await client.post<SanitizedUserWithOrgUnits>(
        `/platform/users/${userId}/org-memberships`,
        input
    );
    return expectStatus(response, 200);
}

export async function deactivatePlatformUser(
    client: AxiosInstance,
    userId: string,
    input: UpdatePlatformUserActivationRequest = {}
): Promise<PlatformUserSummary> {
    const response = await client.post<PlatformUserSummary>(
        `/platform/users/${userId}/deactivate`,
        input
    );
    return expectStatus(response, 200);
}

export async function activatePlatformUser(
    client: AxiosInstance,
    userId: string,
    input: UpdatePlatformUserActivationRequest = {}
): Promise<PlatformUserSummary> {
    const response = await client.post<PlatformUserSummary>(
        `/platform/users/${userId}/activate`,
        input
    );
    return expectStatus(response, 200);
}

export async function listPlatformOrgUnits(client: AxiosInstance): Promise<PlatformOrgUnitSummary[]> {
    const response = await client.get<PlatformOrgUnitSummary[]>('/platform/org-units');
    return expectStatus(response, 200);
}

export async function createOrgUnit(
    client: AxiosInstance,
    input: CreateOrgUnitRequest
): Promise<PlatformOrgUnitSummary> {
    const response = await client.post<PlatformOrgUnitSummary>('/platform/org-units', input);
    return expectStatus(response, 201);
}

export async function listPlatformOrgUnitTree(client: AxiosInstance): Promise<OrgUnitTreeNode[]> {
    const response = await client.get<OrgUnitTreeNode[]>('/platform/org-units/tree');
    return expectStatus(response, 200);
}

export async function getPlatformOrgUnit(client: AxiosInstance, orgUnitId: string): Promise<PlatformOrgUnitDetail> {
    const response = await client.get<PlatformOrgUnitDetail>(`/platform/org-units/${orgUnitId}`);
    return expectStatus(response, 200);
}

export async function activateOrgUnit(
    client: AxiosInstance,
    orgUnitId: string,
    input: UpdateOrgUnitActivationRequest = {}
): Promise<PlatformOrgUnitSummary> {
    const response = await client.post<PlatformOrgUnitSummary>(`/platform/org-units/${orgUnitId}/activate`, input);
    return expectStatus(response, 200);
}

export async function deactivateOrgUnit(
    client: AxiosInstance,
    orgUnitId: string,
    input: UpdateOrgUnitActivationRequest = {}
): Promise<PlatformOrgUnitSummary> {
    const response = await client.post<PlatformOrgUnitSummary>(`/platform/org-units/${orgUnitId}/deactivate`, input);
    return expectStatus(response, 200);
}

export async function moveOrgUnit(
    client: AxiosInstance,
    orgUnitId: string,
    input: MoveOrgUnitRequest
): Promise<PlatformOrgUnitSummary> {
    const response = await client.post<PlatformOrgUnitSummary>(`/platform/org-units/${orgUnitId}/move`, input);
    return expectStatus(response, 200);
}

export async function getMyNavigation(client: AxiosInstance): Promise<NavigationItem[]> {
    const response = await client.get<NavigationItem[]>('/me/navigation');
    return expectStatus(response, 200);
}

export async function syncPlatformNavigation(client: AxiosInstance): Promise<NavigationSyncSummary> {
    const response = await client.post<NavigationSyncSummary>('/platform/navigation/sync', {});
    return expectStatus(response, 200);
}

export async function findPlatformUserByUsername(
    client: AxiosInstance,
    username: string
): Promise<PlatformUserSummary> {
    const users = await listPlatformUsers(client);
    const user = users.find((item) => item.username === username);
    expect(user).toBeDefined();
    return user!;
}

export async function findPlatformRoleByKey(
    client: AxiosInstance,
    roleKey: string
): Promise<PlatformRoleSummary> {
    const roles = await listPlatformRoles(client);
    const role = roles.find((item) => item.roleKey === roleKey);
    expect(role).toBeDefined();
    return role!;
}

export async function findPlatformOrgUnitByCode(
    client: AxiosInstance,
    code: string
): Promise<PlatformOrgUnitSummary> {
    const orgUnits = await listPlatformOrgUnits(client);
    const orgUnit = orgUnits.find((item) => item.code === code);
    expect(orgUnit).toBeDefined();
    return orgUnit!;
}
