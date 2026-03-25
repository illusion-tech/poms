export interface CreatePlatformUserRequest {
    username: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    primaryOrgUnitId: string | null;
    initialRoleIds: string[];
}
