import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    AssignRolePermissionsRequest,
    AssignUserOrgMembershipsRequest,
    AssignUserRolesRequest,
    CreateOrgUnitRequest,
    CreateRoleRequest,
    NavigationItem,
    NavigationSyncSummary,
    PlatformOrgUnitSummary,
    PlatformRoleSummary,
    PlatformUserList,
    PlatformUserSummary,
    SanitizedUserWithOrgUnits,
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
