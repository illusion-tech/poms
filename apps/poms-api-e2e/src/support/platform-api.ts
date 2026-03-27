import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    AssignRolePermissionsRequest,
    AssignUserRolesRequest,
    CreateRoleRequest,
    PlatformRoleSummary,
    PlatformUserList,
    PlatformUserSummary,
    SanitizedUserWithOrgUnits
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
