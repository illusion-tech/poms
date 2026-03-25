export interface PlatformUserListItem {
    id: string;
    username: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    primaryOrgUnitId: string | null;
    primaryOrgUnitName: string | null;
    roleNames: string[];
    createdAt: string;
    updatedAt: string;
}

export type PlatformUserList = PlatformUserListItem[];
