import type { PermissionKey, UnitOrg } from '@poms/shared-contracts';

export interface DevUserFixture {
    id: string;
    username: string;
    password: string;
    displayName: string;
    roles: string[];
    permissions: PermissionKey[];
    orgUnits: UnitOrg[];
}

export const DEV_ORG_UNITS: UnitOrg[] = [
    {
        id: '10000000-0000-4000-8000-000000000001',
        name: '销售管理中心',
        code: 'SALES-HQ',
        description: '开发环境默认平台组织单元'
    },
    {
        id: '10000000-0000-4000-8000-000000000002',
        name: '华南销售一部',
        code: 'SALES-SOUTH-1',
        description: '开发环境默认业务组织单元'
    }
];

export const DEV_USERS: DevUserFixture[] = [
    {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'admin',
        password: 'admin123',
        displayName: '超级管理员',
        roles: ['platform-admin'],
        permissions: [
            'platform:users:manage',
            'platform:roles:manage',
            'platform:navigation:manage',
            'platform:org-units:manage',
            'project:read',
            'project:write',
            'project:delete',
            'nav:dashboard:view',
            'nav:platform:view',
            'nav:projects:view',
            'nav:contracts:view',
            'nav:profile:view'
        ],
        orgUnits: DEV_ORG_UNITS
    },
    {
        id: '00000000-0000-0000-0000-000000000002',
        username: 'viewer',
        password: 'viewer123',
        displayName: '只读用户',
        roles: ['project-viewer'],
        permissions: ['project:read', 'nav:dashboard:view', 'nav:projects:view', 'nav:contracts:view', 'nav:profile:view'],
        orgUnits: [DEV_ORG_UNITS[1]]
    }
];

export function findDevUserByCredentials(username: string, password: string): DevUserFixture | undefined {
    return DEV_USERS.find((user) => user.username === username && user.password === password);
}

export function findDevUserById(id: string): DevUserFixture | undefined {
    return DEV_USERS.find((user) => user.id === id);
}
