import { PERMISSION_KEYS, type PermissionKey, type UserOrgUnitSummary } from '@poms/shared-contracts';

const BUSINESS_NAVIGATION_PERMISSIONS: PermissionKey[] = ['nav:dashboard:view', 'nav:projects:view', 'nav:contracts:view', 'nav:profile:view'];
const PROJECT_READ_PERMISSIONS: PermissionKey[] = ['project:read', ...BUSINESS_NAVIGATION_PERMISSIONS];
const PROJECT_WRITE_PERMISSIONS: PermissionKey[] = ['project:read', 'project:write', ...BUSINESS_NAVIGATION_PERMISSIONS];

export interface DevRoleFixture {
    id: string;
    roleKey: string;
    name: string;
    description: string;
    isSystemRole: boolean;
    permissions: PermissionKey[];
}

export interface DevOrgUnitFixture {
    id: string;
    name: string;
    code: string;
    description: string | null;
}

export interface DevUserFixture {
    id: string;
    username: string;
    password: string;
    displayName: string;
    roles: string[];
    permissions: PermissionKey[];
    orgUnits: UserOrgUnitSummary[];
}

export const DEV_ORG_UNITS: DevOrgUnitFixture[] = [
    { id: '10000000-0000-4000-8000-000000000001', name: '销售管理中心', code: 'SALES-HQ', description: '开发环境默认销售管理归口组织' },
    { id: '10000000-0000-4000-8000-000000000002', name: '华南销售一部', code: 'SALES-SOUTH-1', description: '开发环境默认一线销售组织' },
    { id: '10000000-0000-4000-8000-000000000003', name: '平台治理中心', code: 'PLATFORM-GOV', description: '开发环境默认平台治理组织' },
    { id: '10000000-0000-4000-8000-000000000004', name: '售前支持中心', code: 'PRESALES-CENTER', description: '开发环境默认售前支持组织' },
    { id: '10000000-0000-4000-8000-000000000005', name: '商务管理部', code: 'BIZ-OPS', description: '开发环境默认商务管理组织' },
    { id: '10000000-0000-4000-8000-000000000006', name: '项目交付部', code: 'DELIVERY', description: '开发环境默认项目交付组织' },
    { id: '10000000-0000-4000-8000-000000000007', name: '财务部', code: 'FINANCE', description: '开发环境默认财务组织' },
    { id: '10000000-0000-4000-8000-000000000008', name: '管理层', code: 'MANAGEMENT', description: '开发环境默认管理层组织' },
    { id: '10000000-0000-4000-8000-000000000009', name: '审计观察席', code: 'AUDIT', description: '开发环境默认只读观察组织' }
];

const DEV_ORG_UNIT_BY_CODE = new Map(DEV_ORG_UNITS.map((orgUnit) => [orgUnit.code, orgUnit]));

function requireDevOrgUnitByCode(code: string): DevOrgUnitFixture {
    const orgUnit = DEV_ORG_UNIT_BY_CODE.get(code);
    if (!orgUnit) {
        throw new Error(`Unknown dev org unit code: ${code}`);
    }

    return orgUnit;
}

function buildOrgMembership(code: string, membershipType: 'primary' | 'secondary' = 'primary'): UserOrgUnitSummary {
    const orgUnit = requireDevOrgUnitByCode(code);
    return {
        ...orgUnit,
        membershipType
    };
}

export const DEV_ROLES: DevRoleFixture[] = [
    {
        id: '30000000-0000-4000-8000-000000000001',
        roleKey: 'platform-admin',
        name: '平台管理员',
        description: '开发环境默认平台管理员角色',
        isSystemRole: true,
        permissions: [...PERMISSION_KEYS]
    },
    {
        id: '30000000-0000-4000-8000-000000000002',
        roleKey: 'project-viewer',
        name: '项目只读角色',
        description: '开发环境默认项目只读角色',
        isSystemRole: true,
        permissions: [...PROJECT_READ_PERMISSIONS]
    },
    {
        id: '30000000-0000-4000-8000-000000000003',
        roleKey: 'sales-rep',
        name: '销售人员',
        description: '开发环境默认销售人员角色',
        isSystemRole: false,
        permissions: [...PROJECT_WRITE_PERMISSIONS]
    },
    {
        id: '30000000-0000-4000-8000-000000000004',
        roleKey: 'sales-lead',
        name: '销售负责人',
        description: '开发环境默认销售负责人角色',
        isSystemRole: false,
        permissions: [...PROJECT_WRITE_PERMISSIONS, 'commission:assignments:manage']
    },
    {
        id: '30000000-0000-4000-8000-000000000005',
        roleKey: 'presales',
        name: '售前支持',
        description: '开发环境默认售前支持角色',
        isSystemRole: false,
        permissions: [...PROJECT_WRITE_PERMISSIONS]
    },
    {
        id: '30000000-0000-4000-8000-000000000006',
        roleKey: 'business-admin',
        name: '商务行政',
        description: '开发环境默认商务行政角色',
        isSystemRole: false,
        permissions: [...PROJECT_WRITE_PERMISSIONS, 'contract:finance:manage', 'commission:assignments:manage']
    },
    {
        id: '30000000-0000-4000-8000-000000000007',
        roleKey: 'business-lead',
        name: '商务负责人',
        description: '开发环境默认商务负责人角色',
        isSystemRole: false,
        permissions: [...PROJECT_WRITE_PERMISSIONS, 'contract:finance:manage']
    },
    {
        id: '30000000-0000-4000-8000-000000000008',
        roleKey: 'vp-owner',
        name: '流程负责人',
        description: '开发环境默认副总经理 / 流程负责人角色',
        isSystemRole: false,
        permissions: [...PROJECT_WRITE_PERMISSIONS]
    },
    {
        id: '30000000-0000-4000-8000-000000000009',
        roleKey: 'executive',
        name: '公司高层',
        description: '开发环境默认公司高层角色',
        isSystemRole: false,
        permissions: [...PROJECT_WRITE_PERMISSIONS]
    },
    {
        id: '30000000-0000-4000-8000-000000000010',
        roleKey: 'project-manager',
        name: '项目负责人',
        description: '开发环境默认项目负责人角色',
        isSystemRole: false,
        permissions: [...PROJECT_WRITE_PERMISSIONS]
    },
    {
        id: '30000000-0000-4000-8000-000000000011',
        roleKey: 'sales-assistant',
        name: '销售助理',
        description: '开发环境默认销售助理角色',
        isSystemRole: false,
        permissions: [...PROJECT_READ_PERMISSIONS, 'contract:finance:manage']
    },
    {
        id: '30000000-0000-4000-8000-000000000012',
        roleKey: 'commission-policy',
        name: '制度维护角色',
        description: '开发环境默认提成制度维护角色',
        isSystemRole: false,
        permissions: [...PROJECT_READ_PERMISSIONS, 'commission:rule-versions:manage']
    },
    {
        id: '30000000-0000-4000-8000-000000000013',
        roleKey: 'finance-ops',
        name: '财务人员',
        description: '开发环境默认财务人员角色',
        isSystemRole: false,
        permissions: [
            ...PROJECT_READ_PERMISSIONS,
            'contract:finance:manage',
            'commission:calculations:manage',
            'commission:payouts:manage',
            'commission:adjustments:manage'
        ]
    },
    {
        id: '30000000-0000-4000-8000-000000000014',
        roleKey: 'finance-manager',
        name: '财务负责人',
        description: '开发环境默认财务负责人角色',
        isSystemRole: false,
        permissions: [
            ...PROJECT_WRITE_PERMISSIONS,
            'contract:finance:manage',
            'commission:rule-versions:manage',
            'commission:calculations:manage',
            'commission:payouts:manage',
            'commission:adjustments:manage'
        ]
    },
    {
        id: '30000000-0000-4000-8000-000000000015',
        roleKey: 'auditor',
        name: '审计观察',
        description: '开发环境默认审计只读角色',
        isSystemRole: false,
        permissions: [...PROJECT_READ_PERMISSIONS]
    }
];

const DEV_ROLE_BY_KEY = new Map(DEV_ROLES.map((role) => [role.roleKey, role]));

function resolvePermissionsForRoles(roleKeys: string[]): PermissionKey[] {
    return [
        ...new Set(
            roleKeys.flatMap((roleKey) => {
                const role = DEV_ROLE_BY_KEY.get(roleKey);
                if (!role) {
                    throw new Error(`Unknown dev role key: ${roleKey}`);
                }

                return role.permissions;
            })
        )
    ];
}

export const DEV_USERS: DevUserFixture[] = [
    {
        id: '00000000-0000-4000-8000-000000000001',
        username: 'admin',
        password: 'admin123',
        displayName: '平台管理员',
        roles: ['platform-admin'],
        permissions: resolvePermissionsForRoles(['platform-admin']),
        orgUnits: [buildOrgMembership('PLATFORM-GOV')]
    },
    {
        id: '00000000-0000-4000-8000-000000000002',
        username: 'viewer',
        password: 'viewer123',
        displayName: '只读用户',
        roles: ['project-viewer'],
        permissions: resolvePermissionsForRoles(['project-viewer']),
        orgUnits: [buildOrgMembership('SALES-SOUTH-1')]
    },
    {
        id: '00000000-0000-4000-8000-000000000003',
        username: 'sales_rep',
        password: 'sales_rep123',
        displayName: '销售人员',
        roles: ['sales-rep'],
        permissions: resolvePermissionsForRoles(['sales-rep']),
        orgUnits: [buildOrgMembership('SALES-SOUTH-1')]
    },
    {
        id: '00000000-0000-4000-8000-000000000004',
        username: 'sales_lead',
        password: 'sales_lead123',
        displayName: '销售负责人',
        roles: ['sales-lead'],
        permissions: resolvePermissionsForRoles(['sales-lead']),
        orgUnits: [buildOrgMembership('SALES-HQ')]
    },
    {
        id: '00000000-0000-4000-8000-000000000005',
        username: 'presales',
        password: 'presales123',
        displayName: '售前支持',
        roles: ['presales'],
        permissions: resolvePermissionsForRoles(['presales']),
        orgUnits: [buildOrgMembership('PRESALES-CENTER')]
    },
    {
        id: '00000000-0000-4000-8000-000000000006',
        username: 'biz_admin',
        password: 'biz_admin123',
        displayName: '商务行政',
        roles: ['business-admin'],
        permissions: resolvePermissionsForRoles(['business-admin']),
        orgUnits: [buildOrgMembership('BIZ-OPS')]
    },
    {
        id: '00000000-0000-4000-8000-000000000007',
        username: 'biz_lead',
        password: 'biz_lead123',
        displayName: '商务负责人',
        roles: ['business-lead'],
        permissions: resolvePermissionsForRoles(['business-lead']),
        orgUnits: [buildOrgMembership('BIZ-OPS')]
    },
    {
        id: '00000000-0000-4000-8000-000000000008',
        username: 'vp_owner',
        password: 'vp_owner123',
        displayName: '流程负责人',
        roles: ['vp-owner'],
        permissions: resolvePermissionsForRoles(['vp-owner']),
        orgUnits: [buildOrgMembership('MANAGEMENT')]
    },
    {
        id: '00000000-0000-4000-8000-000000000009',
        username: 'executive',
        password: 'executive123',
        displayName: '公司高层',
        roles: ['executive'],
        permissions: resolvePermissionsForRoles(['executive']),
        orgUnits: [buildOrgMembership('MANAGEMENT')]
    },
    {
        id: '00000000-0000-4000-8000-000000000010',
        username: 'project_mgr',
        password: 'project_mgr123',
        displayName: '项目负责人',
        roles: ['project-manager'],
        permissions: resolvePermissionsForRoles(['project-manager']),
        orgUnits: [buildOrgMembership('DELIVERY')]
    },
    {
        id: '00000000-0000-4000-8000-000000000011',
        username: 'sales_assistant',
        password: 'sales_assistant123',
        displayName: '销售助理',
        roles: ['sales-assistant'],
        permissions: resolvePermissionsForRoles(['sales-assistant']),
        orgUnits: [buildOrgMembership('SALES-HQ')]
    },
    {
        id: '00000000-0000-4000-8000-000000000012',
        username: 'commission_policy',
        password: 'commission_policy123',
        displayName: '制度维护角色',
        roles: ['commission-policy'],
        permissions: resolvePermissionsForRoles(['commission-policy']),
        orgUnits: [buildOrgMembership('SALES-HQ')]
    },
    {
        id: '00000000-0000-4000-8000-000000000013',
        username: 'finance_ops',
        password: 'finance_ops123',
        displayName: '财务人员',
        roles: ['finance-ops'],
        permissions: resolvePermissionsForRoles(['finance-ops']),
        orgUnits: [buildOrgMembership('FINANCE')]
    },
    {
        id: '00000000-0000-4000-8000-000000000014',
        username: 'finance_mgr',
        password: 'finance_mgr123',
        displayName: '财务负责人',
        roles: ['finance-manager'],
        permissions: resolvePermissionsForRoles(['finance-manager']),
        orgUnits: [buildOrgMembership('FINANCE')]
    },
    {
        id: '00000000-0000-4000-8000-000000000015',
        username: 'auditor',
        password: 'auditor123',
        displayName: '审计观察',
        roles: ['auditor'],
        permissions: resolvePermissionsForRoles(['auditor']),
        orgUnits: [buildOrgMembership('AUDIT')]
    }
];

export const CONTRACT_REVIEW_APPROVER_USERNAME = 'vp_owner';
export const COMMISSION_APPROVER_USERNAME = 'finance_mgr';

export function findDevUserByCredentials(username: string, password: string): DevUserFixture | undefined {
    return DEV_USERS.find((user) => user.username === username && user.password === password);
}

export function findDevUserById(id: string): DevUserFixture | undefined {
    return DEV_USERS.find((user) => user.id === id);
}

export function findDevUserByUsername(username: string): DevUserFixture | undefined {
    return DEV_USERS.find((user) => user.username === username);
}

export function requireDevUserByUsername(username: string): DevUserFixture {
    const user = findDevUserByUsername(username);
    if (!user) {
        throw new Error(`Unknown dev username: ${username}`);
    }

    return user;
}

export { requireDevOrgUnitByCode };
