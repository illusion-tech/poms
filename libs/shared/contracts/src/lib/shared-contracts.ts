import { z } from 'zod';

// ---------------------------------------------------------------------------
// Permission Keys (SSOT)
// ---------------------------------------------------------------------------

export const PERMISSION_KEYS = [
    // 平台管理
    'platform:users:manage',
    'platform:roles:manage',
    'platform:navigation:manage',
    'platform:org-units:manage',
    // 提成治理
    'commission:rule-versions:manage',
    'commission:assignments:manage',
    'commission:calculations:manage',
    'commission:payouts:manage',
    'commission:adjustments:manage',
    // 合同资金
    'contract:finance:manage',
    // 项目
    'project:read',
    'project:write',
    'project:delete',
    // 导航可见性（仅影响菜单展示，不代替后端业务权限）
    'nav:dashboard:view',
    'nav:platform:view',
    'nav:projects:view',
    'nav:contracts:view',
    'nav:profile:view'
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface PermissionMeta {
    description: string;
    group: string;
}

export const PermissionsMeta: Record<PermissionKey, PermissionMeta> = {
    'platform:users:manage': { description: '管理用户账号', group: '平台管理' },
    'platform:roles:manage': { description: '管理角色与权限', group: '平台管理' },
    'platform:navigation:manage': { description: '管理导航菜单', group: '平台管理' },
    'platform:org-units:manage': { description: '管理组织单元', group: '平台管理' },
    'commission:rule-versions:manage': { description: '管理提成规则版本', group: '提成治理' },
    'commission:assignments:manage': { description: '管理提成角色分配', group: '提成治理' },
    'commission:calculations:manage': { description: '管理提成计算结果', group: '提成治理' },
    'commission:payouts:manage': { description: '管理提成发放', group: '提成治理' },
    'commission:adjustments:manage': { description: '管理提成调整', group: '提成治理' },
    'contract:finance:manage': { description: '管理合同资金事实', group: '合同资金' },
    'project:read': { description: '查看项目', group: '项目' },
    'project:write': { description: '创建/编辑项目', group: '项目' },
    'project:delete': { description: '删除项目', group: '项目' },
    'nav:dashboard:view': { description: '查看工作台菜单', group: '导航' },
    'nav:platform:view': { description: '查看平台管理菜单', group: '导航' },
    'nav:projects:view': { description: '查看项目菜单', group: '导航' },
    'nav:contracts:view': { description: '查看合同菜单', group: '导航' },
    'nav:profile:view': { description: '查看个人中心菜单', group: '导航' }
};

// ---------------------------------------------------------------------------
// Role
// ---------------------------------------------------------------------------

export const RoleSchema = z
    .object({
        id: z.string(),
        name: z.string()
    })
    .meta({ id: 'Role' });

export type Role = z.infer<typeof RoleSchema>;

// ---------------------------------------------------------------------------
// OrgUnit
// ---------------------------------------------------------------------------

export const UnitOrgSchema = z
    .object({
        id: z.uuid(),
        name: z.string(),
        code: z.string().nullable(),
        description: z.string().nullable()
    })
    .meta({ id: 'UnitOrg' });

export type UnitOrg = z.infer<typeof UnitOrgSchema>;

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export const SanitizedUserSchema = z
    .object({
        id: z.uuid(),
        displayName: z.string(),
        username: z.string(),
        roles: z.array(z.string()),
        permissions: z.array(z.enum(PERMISSION_KEYS)),
        email: z.string().email().nullable(),
        avatarUrl: z.string().url().nullable(),
        isActive: z.boolean(),
        lastLoginAt: z.iso.datetime().nullable(),
        emailVerified: z.boolean(),
        phoneVerified: z.boolean(),
        phone: z.string().nullable()
    })
    .meta({ id: 'SanitizedUser' });

export type SanitizedUser = z.infer<typeof SanitizedUserSchema>;

export const UserOrgUnitSummarySchema = z
    .object({
        id: z.uuid(),
        name: z.string(),
        code: z.string().nullable(),
        description: z.string().nullable(),
        membershipType: z.enum(['primary', 'secondary'])
    })
    .meta({ id: 'UserOrgUnitSummary' });

export type UserOrgUnitSummary = z.infer<typeof UserOrgUnitSummarySchema>;

export const SanitizedUserWithOrgUnitsSchema = SanitizedUserSchema.extend({
    orgUnits: z.array(UserOrgUnitSummarySchema)
}).meta({ id: 'SanitizedUserWithOrgUnits' });

export type SanitizedUserWithOrgUnits = z.infer<typeof SanitizedUserWithOrgUnitsSchema>;

export const PlatformUserSummarySchema = z
    .object({
        id: z.uuid(),
        username: z.string(),
        displayName: z.string(),
        email: z.string().email().nullable(),
        phone: z.string().nullable(),
        isActive: z.boolean(),
        primaryOrgUnitId: z.uuid().nullable(),
        primaryOrgUnitName: z.string().nullable(),
        roleNames: z.array(z.string()),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'PlatformUserSummary' });

export type PlatformUserSummary = z.infer<typeof PlatformUserSummarySchema>;

export const PlatformUserListSchema = z.array(PlatformUserSummarySchema).meta({ id: 'PlatformUserList' });

export type PlatformUserList = z.infer<typeof PlatformUserListSchema>;

export const PlatformUserDetailSchema = PlatformUserSummarySchema.extend({
    avatarUrl: z.string().url().nullable(),
    lastLoginAt: z.iso.datetime().nullable(),
    emailVerified: z.boolean(),
    phoneVerified: z.boolean(),
    orgUnits: z.array(UserOrgUnitSummarySchema)
}).meta({ id: 'PlatformUserDetail' });

export type PlatformUserDetail = z.infer<typeof PlatformUserDetailSchema>;

export const UpdatePlatformUserRequestSchema = z
    .object({
        displayName: z.string().min(1).max(128).optional(),
        email: z.string().email().nullable().optional(),
        phone: z.string().max(64).nullable().optional(),
        avatarUrl: z.string().url().nullable().optional()
    })
    .meta({ id: 'UpdatePlatformUserRequest' });

export type UpdatePlatformUserRequest = z.infer<typeof UpdatePlatformUserRequestSchema>;

export const PlatformPermissionSummarySchema = z
    .object({
        key: z.enum(PERMISSION_KEYS),
        name: z.string(),
        description: z.string(),
        group: z.string(),
        status: z.enum(['active', 'inactive', 'deprecated']),
        isSystemPermission: z.boolean(),
        sourceType: z.enum(['system-seeded']),
        deprecatedBy: z.enum(PERMISSION_KEYS).nullable()
    })
    .meta({ id: 'PlatformPermissionSummary' });

export type PlatformPermissionSummary = z.infer<typeof PlatformPermissionSummarySchema>;

export const PlatformPermissionListSchema = z.array(PlatformPermissionSummarySchema).meta({ id: 'PlatformPermissionList' });

export type PlatformPermissionList = z.infer<typeof PlatformPermissionListSchema>;

export const PlatformRoleSummarySchema = z
    .object({
        id: z.uuid(),
        roleKey: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        isActive: z.boolean(),
        isSystemRole: z.boolean(),
        displayOrder: z.number().int(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'PlatformRoleSummary' });

export type PlatformRoleSummary = z.infer<typeof PlatformRoleSummarySchema>;

export const PlatformRoleListSchema = z.array(PlatformRoleSummarySchema).meta({ id: 'PlatformRoleList' });

export type PlatformRoleList = z.infer<typeof PlatformRoleListSchema>;

export const PlatformRoleDetailSchema = PlatformRoleSummarySchema.extend({
    permissionKeys: z.array(z.enum(PERMISSION_KEYS)),
    assignedUserCount: z.number().int().nonnegative()
}).meta({ id: 'PlatformRoleDetail' });

export type PlatformRoleDetail = z.infer<typeof PlatformRoleDetailSchema>;

export const PlatformOrgUnitSummarySchema = z
    .object({
        id: z.uuid(),
        name: z.string(),
        code: z.string(),
        description: z.string().nullable(),
        parentId: z.uuid().nullable(),
        isActive: z.boolean(),
        displayOrder: z.number().int(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'PlatformOrgUnitSummary' });

export type PlatformOrgUnitSummary = z.infer<typeof PlatformOrgUnitSummarySchema>;

export const PlatformOrgUnitListSchema = z.array(PlatformOrgUnitSummarySchema).meta({ id: 'PlatformOrgUnitList' });

export type PlatformOrgUnitList = z.infer<typeof PlatformOrgUnitListSchema>;

export const PlatformOrgUnitDetailSchema = PlatformOrgUnitSummarySchema.extend({
    childCount: z.number().int().nonnegative(),
    activeMembershipCount: z.number().int().nonnegative(),
    canDelete: z.boolean()
}).meta({ id: 'PlatformOrgUnitDetail' });

export type PlatformOrgUnitDetail = z.infer<typeof PlatformOrgUnitDetailSchema>;

export interface OrgUnitTreeNode extends PlatformOrgUnitSummary {
    childCount: number;
    activeMembershipCount: number;
    canDelete: boolean;
    children: OrgUnitTreeNode[];
}

export const OrgUnitTreeNodeSchema: z.ZodType<OrgUnitTreeNode> = z.lazy(() =>
    PlatformOrgUnitSummarySchema.extend({
        childCount: z.number().int().nonnegative(),
        activeMembershipCount: z.number().int().nonnegative(),
        canDelete: z.boolean(),
        children: z.array(OrgUnitTreeNodeSchema)
    }).meta({ id: 'OrgUnitTreeNode' })
);

export const PlatformOrgUnitTreeSchema = z.array(OrgUnitTreeNodeSchema).meta({ id: 'PlatformOrgUnitTree' });

export type PlatformOrgUnitTree = z.infer<typeof PlatformOrgUnitTreeSchema>;

export const CreatePlatformUserRequestSchema = z
    .object({
        username: z.string().min(1).max(64),
        displayName: z.string().min(1).max(128),
        email: z.string().email().nullable().optional(),
        phone: z.string().max(64).nullable().optional(),
        primaryOrgUnitId: z.uuid().nullable(),
        initialRoleIds: z.array(z.uuid()).default([])
    })
    .meta({ id: 'CreatePlatformUserRequest' });

export type CreatePlatformUserRequest = z.infer<typeof CreatePlatformUserRequestSchema>;

export const UpdatePlatformUserActivationRequestSchema = z
    .object({
        reason: z.string().max(1000).optional(),
        comment: z.string().max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'UpdatePlatformUserActivationRequest' });

export type UpdatePlatformUserActivationRequest = z.infer<typeof UpdatePlatformUserActivationRequestSchema>;

export const AssignUserRolesRequestSchema = z
    .object({
        roleIds: z.array(z.uuid()),
        reason: z.string().max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'AssignUserRolesRequest' });

export type AssignUserRolesRequest = z.infer<typeof AssignUserRolesRequestSchema>;

export const AssignUserOrgMembershipsRequestSchema = z
    .object({
        primaryOrgUnitId: z.uuid(),
        secondaryOrgUnitIds: z.array(z.uuid()).default([]),
        reason: z.string().max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'AssignUserOrgMembershipsRequest' });

export type AssignUserOrgMembershipsRequest = z.infer<typeof AssignUserOrgMembershipsRequestSchema>;

export const CreateRoleRequestSchema = z
    .object({
        roleKey: z.string().trim().min(1).max(64),
        name: z.string().trim().min(1).max(128),
        description: z.string().max(1000).nullable().optional(),
        displayOrder: z.number().int().min(0).optional()
    })
    .meta({ id: 'CreateRoleRequest' });

export type CreateRoleRequest = z.infer<typeof CreateRoleRequestSchema>;

export const UpdateRoleRequestSchema = z
    .object({
        name: z.string().trim().min(1).max(128).optional(),
        description: z.string().max(1000).nullable().optional(),
        displayOrder: z.number().int().min(0).optional()
    })
    .refine((value) => value.name !== undefined || value.description !== undefined || value.displayOrder !== undefined, {
        message: 'At least one field is required for update'
    })
    .meta({ id: 'UpdateRoleRequest' });

export type UpdateRoleRequest = z.infer<typeof UpdateRoleRequestSchema>;

export const UpdateRoleActivationRequestSchema = z
    .object({
        reason: z.string().max(1000).optional(),
        comment: z.string().max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'UpdateRoleActivationRequest' });

export type UpdateRoleActivationRequest = z.infer<typeof UpdateRoleActivationRequestSchema>;

export const AssignRolePermissionsRequestSchema = z
    .object({
        permissionKeys: z.array(z.enum(PERMISSION_KEYS))
    })
    .meta({ id: 'AssignRolePermissionsRequest' });

export type AssignRolePermissionsRequest = z.infer<typeof AssignRolePermissionsRequestSchema>;

export const CreateOrgUnitRequestSchema = z
    .object({
        name: z.string().trim().min(1).max(128),
        code: z.string().trim().min(1).max(64),
        description: z.string().max(1000).nullable().optional(),
        parentId: z.uuid().nullable().optional(),
        displayOrder: z.number().int().min(0).optional()
    })
    .meta({ id: 'CreateOrgUnitRequest' });

export type CreateOrgUnitRequest = z.infer<typeof CreateOrgUnitRequestSchema>;

export const UpdateOrgUnitRequestSchema = z
    .object({
        name: z.string().trim().min(1).max(128).optional(),
        code: z.string().trim().min(1).max(64).optional(),
        description: z.string().max(1000).nullable().optional(),
        displayOrder: z.number().int().min(0).optional()
    })
    .refine((v) => v.name !== undefined || v.code !== undefined || v.description !== undefined || v.displayOrder !== undefined, {
        message: 'At least one field is required for update'
    })
    .meta({ id: 'UpdateOrgUnitRequest' });

export type UpdateOrgUnitRequest = z.infer<typeof UpdateOrgUnitRequestSchema>;

export const UpdateOrgUnitActivationRequestSchema = z
    .object({
        reason: z.string().max(1000).optional(),
        comment: z.string().max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'UpdateOrgUnitActivationRequest' });

export type UpdateOrgUnitActivationRequest = z.infer<typeof UpdateOrgUnitActivationRequestSchema>;

export const MoveOrgUnitRequestSchema = z
    .object({
        parentId: z.uuid().nullable().optional(),
        displayOrder: z.number().int().min(0).optional(),
        reason: z.string().max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .refine((value) => value.parentId !== undefined || value.displayOrder !== undefined, {
        message: 'At least one field is required for move'
    })
    .meta({ id: 'MoveOrgUnitRequest' });

export type MoveOrgUnitRequest = z.infer<typeof MoveOrgUnitRequestSchema>;

// ---------------------------------------------------------------------------
// JWT UserPayload（JWT 解码后注入到 Request.user 的结构）
// ---------------------------------------------------------------------------

export const UserPayloadSchema = z
    .object({
        sub: z.uuid(),
        username: z.string(),
        permissions: z.array(z.enum(PERMISSION_KEYS))
    })
    .meta({ id: 'UserPayload' });

export type UserPayload = z.infer<typeof UserPayloadSchema>;

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export type NavigationItemType = 'basic' | 'group' | 'collapsable' | 'divider';

export const NavigationItemSchema: z.ZodType<NavigationItem> = z.lazy(() =>
    z
        .object({
            id: z.string(),
            key: z.string(),
            type: z.enum(['basic', 'group', 'collapsable', 'divider']),
            title: z.string().nullable(),
            subtitle: z.string().nullable(),
            link: z.string().nullable(),
            icon: z.string().nullable(),
            displayOrder: z.number().int(),
            isHidden: z.boolean(),
            isDisabled: z.boolean(),
            requiredPermissions: z.array(z.enum(PERMISSION_KEYS)).nullable(),
            meta: z.object({}).catchall(z.unknown()).nullable(),
            children: z.array(NavigationItemSchema).nullable()
        })
        .meta({ id: 'NavigationItem' })
);

export interface NavigationItem {
    id: string;
    key: string;
    type: NavigationItemType;
    title: string | null;
    subtitle: string | null;
    link: string | null;
    icon: string | null;
    displayOrder: number;
    isHidden: boolean;
    isDisabled: boolean;
    requiredPermissions: PermissionKey[] | null;
    meta: Record<string, unknown> | null;
    children: NavigationItem[] | null;
}

// ---------------------------------------------------------------------------
// Auth — Login
// ---------------------------------------------------------------------------

export const LoginRequestSchema = z
    .object({
        username: z.string().min(1),
        password: z.string().min(1)
    })
    .meta({ id: 'LoginRequest' });

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z
    .object({
        accessToken: z.string()
    })
    .meta({ id: 'LoginResponse' });

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ---------------------------------------------------------------------------
// Runtime Audit
// ---------------------------------------------------------------------------

export const NavigationSyncSummarySchema = z
    .object({
        targetId: z.literal('platform-navigation'),
        nodeCount: z.number().int().nonnegative(),
        routeCount: z.number().int().nonnegative(),
        hiddenCount: z.number().int().nonnegative(),
        disabledCount: z.number().int().nonnegative(),
        treeChecksum: z.string().length(64),
        navigationKeys: z.array(z.string()),
        routeLinks: z.array(z.string())
    })
    .meta({ id: 'NavigationSyncSummary' });

export type NavigationSyncSummary = z.infer<typeof NavigationSyncSummarySchema>;

export const AuditSnapshotSchema = z.record(z.string(), z.unknown()).meta({ id: 'AuditSnapshot' });

export type AuditSnapshot = z.infer<typeof AuditSnapshotSchema>;

export const AuditLogResultSchema = z.enum(['success', 'rejected', 'failed']).meta({ id: 'AuditLogResult' });

export type AuditLogResult = z.infer<typeof AuditLogResultSchema>;

export const AuditLogSummarySchema = z
    .object({
        id: z.uuid(),
        eventType: z.string(),
        targetType: z.string(),
        targetId: z.string(),
        operatorId: z.uuid().nullable(),
        requestId: z.string().nullable(),
        result: AuditLogResultSchema,
        reason: z.string().nullable(),
        beforeSnapshot: AuditSnapshotSchema.nullable(),
        afterSnapshot: AuditSnapshotSchema.nullable(),
        metadata: AuditSnapshotSchema.nullable(),
        occurredAt: z.iso.datetime()
    })
    .meta({ id: 'AuditLogSummary' });

export type AuditLogSummary = z.infer<typeof AuditLogSummarySchema>;

export const AuditLogListSchema = z.array(AuditLogSummarySchema).meta({ id: 'AuditLogList' });

export type AuditLogList = z.infer<typeof AuditLogListSchema>;

export const AuditLogListQuerySchema = z
    .object({
        from: z.iso.datetime().optional(),
        to: z.iso.datetime().optional(),
        eventType: z.string().min(1).max(128).optional(),
        targetType: z.string().min(1).max(64).optional(),
        targetId: z.string().min(1).max(128).optional(),
        operatorId: z.uuid().optional(),
        result: AuditLogResultSchema.optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
    })
    .meta({ id: 'AuditLogListQuery' });

export type AuditLogListQuery = z.infer<typeof AuditLogListQuerySchema>;

export const SecurityEventResultSchema = z.enum(['blocked', 'failed', 'expired']).meta({ id: 'SecurityEventResult' });

export type SecurityEventResult = z.infer<typeof SecurityEventResultSchema>;

export const SecurityEventSeveritySchema = z.enum(['info', 'warning', 'high']).meta({ id: 'SecurityEventSeverity' });

export type SecurityEventSeverity = z.infer<typeof SecurityEventSeveritySchema>;

export const SecurityEventSummarySchema = z
    .object({
        id: z.uuid(),
        eventType: z.string(),
        severity: SecurityEventSeveritySchema,
        actorId: z.uuid().nullable(),
        principal: z.string().nullable(),
        requestId: z.string().nullable(),
        path: z.string(),
        method: z.string().nullable(),
        permissionKey: z.string().nullable(),
        result: SecurityEventResultSchema,
        ip: z.string().nullable(),
        userAgent: z.string().nullable(),
        details: AuditSnapshotSchema.nullable(),
        occurredAt: z.iso.datetime()
    })
    .meta({ id: 'SecurityEventSummary' });

export type SecurityEventSummary = z.infer<typeof SecurityEventSummarySchema>;

export const SecurityEventListSchema = z.array(SecurityEventSummarySchema).meta({ id: 'SecurityEventList' });

export type SecurityEventList = z.infer<typeof SecurityEventListSchema>;

export const SecurityEventListQuerySchema = z
    .object({
        from: z.iso.datetime().optional(),
        to: z.iso.datetime().optional(),
        eventType: z.string().min(1).max(128).optional(),
        actorId: z.uuid().optional(),
        principal: z.string().min(1).max(255).optional(),
        path: z.string().min(1).max(255).optional(),
        permissionKey: z.string().min(1).max(128).optional(),
        result: SecurityEventResultSchema.optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
    })
    .meta({ id: 'SecurityEventListQuery' });

export type SecurityEventListQuery = z.infer<typeof SecurityEventListQuerySchema>;

export const RecordRouteDeniedSecurityEventRequestSchema = z
    .object({
        path: z.string().min(1).max(255),
        returnUrl: z.string().min(1).max(255).nullable().optional(),
        requiredPermissions: z.array(z.enum(PERMISSION_KEYS)).min(1)
    })
    .meta({ id: 'RecordRouteDeniedSecurityEventRequest' });

export type RecordRouteDeniedSecurityEventRequest = z.infer<typeof RecordRouteDeniedSecurityEventRequestSchema>;

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export const ProjectSummarySchema = z
    .object({
        id: z.uuid(),
        projectCode: z.string(),
        projectName: z.string(),
        customerId: z.uuid().nullable(),
        status: z.string(),
        currentStage: z.string(),
        ownerOrgId: z.uuid().nullable(),
        ownerUserId: z.uuid().nullable(),
        plannedSignAt: z.iso.datetime().nullable(),
        closedAt: z.iso.datetime().nullable(),
        closedReason: z.string().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'ProjectSummary' });

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const ProjectListSchema = z.array(ProjectSummarySchema).meta({ id: 'ProjectList' });

export type ProjectList = z.infer<typeof ProjectListSchema>;

export const CreateProjectRequestSchema = z
    .object({
        projectCode: z.string().trim().min(1).max(64),
        projectName: z.string().trim().min(1).max(255),
        customerId: z.uuid().nullable().optional(),
        status: z.string().trim().min(1).max(32).optional(),
        currentStage: z.string().trim().min(1).max(64),
        ownerOrgId: z.uuid().nullable().optional(),
        ownerUserId: z.uuid().nullable().optional(),
        plannedSignAt: z.iso.datetime().nullable().optional(),
        createdBy: z.uuid().nullable().optional(),
        updatedBy: z.uuid().nullable().optional()
    })
    .meta({ id: 'CreateProjectRequest' });

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const ProjectListQuerySchema = z
    .object({
        status: z.string().trim().min(1).max(32).optional(),
        currentStage: z.string().trim().min(1).max(64).optional(),
        ownerOrgId: z.uuid().optional(),
        keyword: z.string().trim().min(1).max(128).optional()
    })
    .meta({ id: 'ProjectListQuery' });

export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;

export const UpdateProjectBasicInfoRequestSchema = z
    .object({
        projectName: z.string().trim().min(1).max(255).optional(),
        customerId: z.uuid().nullable().optional(),
        ownerOrgId: z.uuid().nullable().optional(),
        ownerUserId: z.uuid().nullable().optional(),
        plannedSignAt: z.iso.datetime().nullable().optional(),
        updatedBy: z.uuid().nullable().optional()
    })
    .refine((value) => value.projectName !== undefined || value.customerId !== undefined || value.ownerOrgId !== undefined || value.ownerUserId !== undefined || value.plannedSignAt !== undefined || value.updatedBy !== undefined, {
        message: 'At least one field is required for update'
    })
    .meta({ id: 'UpdateProjectBasicInfoRequest' });

export type UpdateProjectBasicInfoRequest = z.infer<typeof UpdateProjectBasicInfoRequestSchema>;

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export const CONTRACT_STATUSES = ['draft', 'pending-review', 'active', 'terminated', 'completed'] as const;

export const ContractStatusSchema = z.enum(CONTRACT_STATUSES).meta({ id: 'ContractStatus' });

export type ContractStatus = z.infer<typeof ContractStatusSchema>;

export const ContractSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        contractNo: z.string(),
        status: ContractStatusSchema,
        signedAmount: z.string(),
        currencyCode: z.string(),
        currentSnapshotId: z.uuid().nullable(),
        signedAt: z.iso.datetime().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'ContractSummary' });

export type ContractSummary = z.infer<typeof ContractSummarySchema>;

export const ContractListSchema = z.array(ContractSummarySchema).meta({ id: 'ContractList' });

export type ContractList = z.infer<typeof ContractListSchema>;

export const ContractListQuerySchema = z
    .object({
        projectId: z.uuid().optional(),
        status: ContractStatusSchema.optional(),
        keyword: z.string().trim().min(1).max(128).optional()
    })
    .meta({ id: 'ContractListQuery' });

export type ContractListQuery = z.infer<typeof ContractListQuerySchema>;

export const CreateContractRequestSchema = z
    .object({
        projectId: z.uuid(),
        contractNo: z.string().trim().min(1).max(64),
        status: ContractStatusSchema.optional(),
        signedAmount: z.string().trim().min(1).max(64),
        currencyCode: z.string().trim().min(1).max(16).optional(),
        currentSnapshotId: z.uuid().nullable().optional(),
        signedAt: z.iso.datetime().nullable().optional(),
        createdBy: z.uuid().nullable().optional(),
        updatedBy: z.uuid().nullable().optional()
    })
    .meta({ id: 'CreateContractRequest' });

export type CreateContractRequest = z.infer<typeof CreateContractRequestSchema>;

export const UpdateContractBasicInfoRequestSchema = z
    .object({
        signedAmount: z.string().trim().min(1).max(64).optional(),
        currencyCode: z.string().trim().min(1).max(16).optional(),
        currentSnapshotId: z.uuid().nullable().optional(),
        signedAt: z.iso.datetime().nullable().optional(),
        updatedBy: z.uuid().nullable().optional()
    })
    .refine((value) => value.signedAmount !== undefined || value.currencyCode !== undefined || value.currentSnapshotId !== undefined || value.signedAt !== undefined || value.updatedBy !== undefined, {
        message: 'At least one field is required for update'
    })
    .meta({ id: 'UpdateContractBasicInfoRequest' });

export type UpdateContractBasicInfoRequest = z.infer<typeof UpdateContractBasicInfoRequestSchema>;

export const ActivateContractRequestSchema = z
    .object({
        comment: z.string().trim().min(1).max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ActivateContractRequest' });

export type ActivateContractRequest = z.infer<typeof ActivateContractRequestSchema>;

export const COMMERCIAL_DIFF_LEVELS = ['prompt', 'review-required', 'reapproval-required'] as const;

export const CommercialDiffLevelSchema = z.enum(COMMERCIAL_DIFF_LEVELS).meta({ id: 'CommercialDiffLevel' });

export type CommercialDiffLevel = z.infer<typeof CommercialDiffLevelSchema>;

export const COMMERCIAL_DIFF_REVIEW_STATUSES = ['not-required', 'pending-review', 'approved', 'rejected'] as const;

export const CommercialDiffReviewStatusSchema = z
    .enum(COMMERCIAL_DIFF_REVIEW_STATUSES)
    .meta({ id: 'CommercialDiffReviewStatus' });

export type CommercialDiffReviewStatus = z.infer<typeof CommercialDiffReviewStatusSchema>;

export const COMMERCIAL_BASELINE_REVIEW_DECISIONS = ['approved', 'rejected'] as const;

export const CommercialBaselineReviewDecisionSchema = z
    .enum(COMMERCIAL_BASELINE_REVIEW_DECISIONS)
    .meta({ id: 'CommercialBaselineReviewDecision' });

export type CommercialBaselineReviewDecision = z.infer<typeof CommercialBaselineReviewDecisionSchema>;

export const CONTRACT_READINESS_STATUSES = ['ready', 'conditional', 'blocked'] as const;

export const ContractReadinessStatusSchema = z.enum(CONTRACT_READINESS_STATUSES).meta({ id: 'ContractReadinessStatus' });

export type ContractReadinessStatus = z.infer<typeof ContractReadinessStatusSchema>;

export const CONTRACT_READINESS_GUARD_DECISIONS = ['allowed', 'review-required', 'blocked'] as const;

export const ContractReadinessGuardDecisionSchema = z
    .enum(CONTRACT_READINESS_GUARD_DECISIONS)
    .meta({ id: 'ContractReadinessGuardDecision' });

export type ContractReadinessGuardDecision = z.infer<typeof ContractReadinessGuardDecisionSchema>;

export const CONTRACT_READINESS_ITEM_TYPES = ['checklist', 'reusable-fact', 'blocking-reason', 'receivable-seed'] as const;

export const ContractReadinessItemTypeSchema = z
    .enum(CONTRACT_READINESS_ITEM_TYPES)
    .meta({ id: 'ContractReadinessItemType' });

export type ContractReadinessItemType = z.infer<typeof ContractReadinessItemTypeSchema>;

export const CONTRACT_READINESS_ITEM_STATUSES = ['ready', 'conditional', 'blocked', 'not-applicable'] as const;

export const ContractReadinessItemStatusSchema = z
    .enum(CONTRACT_READINESS_ITEM_STATUSES)
    .meta({ id: 'ContractReadinessItemStatus' });

export type ContractReadinessItemStatus = z.infer<typeof ContractReadinessItemStatusSchema>;

export const CommercialBaselineDiffItemSchema = z
    .object({
        id: z.uuid(),
        fieldKey: z.string(),
        fieldLabel: z.string(),
        oldValueSummary: z.string().nullable(),
        newValueSummary: z.string().nullable(),
        diffLevel: CommercialDiffLevelSchema,
        isBlocking: z.boolean(),
        sortOrder: z.number().int().nonnegative()
    })
    .meta({ id: 'CommercialBaselineDiffItem' });

export type CommercialBaselineDiffItem = z.infer<typeof CommercialBaselineDiffItemSchema>;

export const CommercialBaselineReviewRecordSummarySchema = z
    .object({
        id: z.uuid(),
        baselineId: z.uuid(),
        diffResultId: z.uuid(),
        projectId: z.uuid(),
        decision: CommercialBaselineReviewDecisionSchema,
        reviewedFieldKeys: z.array(z.string()),
        comment: z.string().nullable(),
        reviewerUserId: z.uuid(),
        createdAt: z.iso.datetime()
    })
    .meta({ id: 'CommercialBaselineReviewRecordSummary' });

export type CommercialBaselineReviewRecordSummary = z.infer<typeof CommercialBaselineReviewRecordSummarySchema>;

export const CommercialBaselineReviewHistorySchema = z
    .array(CommercialBaselineReviewRecordSummarySchema)
    .meta({ id: 'CommercialBaselineReviewHistory' });

export type CommercialBaselineReviewHistory = z.infer<typeof CommercialBaselineReviewHistorySchema>;

export const CommercialReleaseBaselineSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        baselineCode: z.string(),
        quotationReviewId: z.uuid().nullable(),
        baselineStatus: z.enum(['draft', 'effective', 'superseded']),
        isCurrent: z.boolean(),
        grossMarginSummary: z.string().nullable(),
        paymentTermsSummary: z.string().nullable(),
        latestDiffResultId: z.uuid(),
        diffLevel: CommercialDiffLevelSchema,
        reviewStatus: CommercialDiffReviewStatusSchema,
        diffSummary: z.string().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'CommercialReleaseBaselineSummary' });

export type CommercialReleaseBaselineSummary = z.infer<typeof CommercialReleaseBaselineSummarySchema>;

export const ContractDiffReviewHistoryViewSchema = z
    .object({
        baseline: CommercialReleaseBaselineSummarySchema,
        diffItems: z.array(CommercialBaselineDiffItemSchema),
        reviewHistory: CommercialBaselineReviewHistorySchema
    })
    .meta({ id: 'ContractDiffReviewHistoryView' });

export type ContractDiffReviewHistoryView = z.infer<typeof ContractDiffReviewHistoryViewSchema>;

export const ContractReadinessItemSchema = z
    .object({
        id: z.uuid(),
        itemType: ContractReadinessItemTypeSchema,
        itemKey: z.string(),
        label: z.string(),
        summary: z.string().nullable(),
        status: ContractReadinessItemStatusSchema,
        responsibleRole: z.string().nullable(),
        navigationHint: z.string().nullable(),
        sortOrder: z.number().int().nonnegative()
    })
    .meta({ id: 'ContractReadinessItem' });

export type ContractReadinessItem = z.infer<typeof ContractReadinessItemSchema>;

export const ContractReadinessDetailSchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        sourceBaselineId: z.uuid(),
        commercialReleaseBaselineId: z.uuid(),
        latestDiffResultId: z.uuid(),
        diffLevel: CommercialDiffLevelSchema,
        reviewStatus: CommercialDiffReviewStatusSchema,
        packageStatus: ContractReadinessStatusSchema,
        guardDecision: ContractReadinessGuardDecisionSchema,
        currentEffectiveDecisionSummary: z.string().nullable(),
        blockingReasonSummary: z.string().nullable(),
        missingPrerequisiteCount: z.number().int().nonnegative(),
        initializedContractSnapshotId: z.uuid().nullable(),
        initializedReceivablePlanVersionId: z.uuid().nullable(),
        contractSnapshotInitializedAt: z.iso.datetime().nullable(),
        receivablePlanInitializedAt: z.iso.datetime().nullable(),
        isCurrent: z.boolean(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable(),
        allowedActions: z.array(z.string()),
        items: z.array(ContractReadinessItemSchema)
    })
    .meta({ id: 'ContractReadinessDetail' });

export type ContractReadinessDetail = z.infer<typeof ContractReadinessDetailSchema>;

export const ContractHandoverContractItemSummarySchema = z
    .object({
        id: z.uuid(),
        contractNo: z.string(),
        status: ContractStatusSchema,
        signedAmount: z.string(),
        currencyCode: z.string(),
        currentSnapshotId: z.uuid().nullable(),
        signedAt: z.iso.datetime().nullable()
    })
    .meta({ id: 'ContractHandoverContractItemSummary' });

export type ContractHandoverContractItemSummary = z.infer<typeof ContractHandoverContractItemSummarySchema>;

export const ContractHandoverEffectiveContractSetSummarySchema = z
    .object({
        activeContractCount: z.number().int().nonnegative(),
        activeContractIds: z.array(z.uuid()),
        contractNos: z.array(z.string()),
        totalSignedAmount: z.string(),
        currencyCodes: z.array(z.string()),
        earliestSignedAt: z.iso.datetime().nullable(),
        latestSignedAt: z.iso.datetime().nullable(),
        contracts: z.array(ContractHandoverContractItemSummarySchema)
    })
    .meta({ id: 'ContractHandoverEffectiveContractSetSummary' });

export type ContractHandoverEffectiveContractSetSummary = z.infer<typeof ContractHandoverEffectiveContractSetSummarySchema>;

export const ContractHandoverBaselineValidationSummarySchema = z
    .object({
        status: z.enum(['ready', 'blocked', 'missing']),
        readinessPackageId: z.uuid().nullable(),
        sourceBaselineId: z.uuid().nullable(),
        latestDiffResultId: z.uuid().nullable(),
        diffLevel: CommercialDiffLevelSchema.nullable(),
        reviewStatus: CommercialDiffReviewStatusSchema.nullable(),
        packageStatus: ContractReadinessStatusSchema.nullable(),
        guardDecision: ContractReadinessGuardDecisionSchema.nullable(),
        initializedContractSnapshotId: z.uuid().nullable(),
        contractSnapshotInitializedAt: z.iso.datetime().nullable(),
        blockingReasonSummary: z.string().nullable(),
        missingPrerequisiteCount: z.number().int().nonnegative()
    })
    .meta({ id: 'ContractHandoverBaselineValidationSummary' });

export type ContractHandoverBaselineValidationSummary = z.infer<typeof ContractHandoverBaselineValidationSummarySchema>;

export const ContractHandoverCurrentBaselineSummarySchema = z
    .object({
        status: z.enum(['available', 'missing']),
        baselineSnapshotId: z.uuid().nullable(),
        sourceType: z.enum(['contract-readiness', 'project-handover', 'handover-rebaseline', 'none']),
        sourceId: z.uuid().nullable(),
        summary: z.string()
    })
    .meta({ id: 'ContractHandoverCurrentBaselineSummary' });

export type ContractHandoverCurrentBaselineSummary = z.infer<typeof ContractHandoverCurrentBaselineSummarySchema>;

export const ContractHandoverLatestRebaselineSummarySchema = z
    .object({
        status: z.enum(['none', 'processing', 'pending_effective', 'effective', 'superseded', 'voided']),
        rebaselineRecordId: z.uuid().nullable(),
        effectiveBaselineAfterId: z.uuid().nullable(),
        handledAt: z.iso.datetime().nullable(),
        blockingStatus: z.enum(['none', 'blocking', 'effective']),
        impactItemCount: z.number().int().nonnegative(),
        impactSummary: z.string().nullable()
    })
    .meta({ id: 'ContractHandoverLatestRebaselineSummary' });

export type ContractHandoverLatestRebaselineSummary = z.infer<typeof ContractHandoverLatestRebaselineSummarySchema>;

export const ContractHandoverReceivablePlanInitSummarySchema = z
    .object({
        status: z.enum(['initialized', 'missing', 'blocked']),
        initializedReceivablePlanVersionId: z.uuid().nullable(),
        receivablePlanInitializedAt: z.iso.datetime().nullable(),
        summary: z.string()
    })
    .meta({ id: 'ContractHandoverReceivablePlanInitSummary' });

export type ContractHandoverReceivablePlanInitSummary = z.infer<typeof ContractHandoverReceivablePlanInitSummarySchema>;

export const ContractHandoverSummaryViewSchema = z
    .object({
        projectId: z.uuid(),
        projectCode: z.string(),
        projectName: z.string(),
        effectiveContractSetSummary: ContractHandoverEffectiveContractSetSummarySchema,
        contractBaselineValidationSummary: ContractHandoverBaselineValidationSummarySchema,
        currentHandoverBaselineSummary: ContractHandoverCurrentBaselineSummarySchema,
        latestHandoverRebaselineSummary: ContractHandoverLatestRebaselineSummarySchema,
        receivablePlanInitSummary: ContractHandoverReceivablePlanInitSummarySchema,
        contractSummarySnapshotId: z.uuid().nullable(),
        projectionLevel: z.string().nullable(),
        exportPolicy: z.string().nullable(),
        allowedActions: z.array(z.string()),
        blockingReasons: z.array(z.string()),
        generatedAt: z.iso.datetime()
    })
    .meta({ id: 'ContractHandoverSummaryView' });

export type ContractHandoverSummaryView = z.infer<typeof ContractHandoverSummaryViewSchema>;

export const ProjectHandoverParticipantConfirmationItemSchema = z
    .object({
        participantId: z.uuid(),
        participantRoleKey: z.string(),
        participantDisplayName: z.string().nullable(),
        participantStatus: z.enum(['pending', 'confirmed', 'closed']),
        confirmedAt: z.iso.datetime().nullable(),
        confirmedComment: z.string().nullable()
    })
    .meta({ id: 'ProjectHandoverParticipantConfirmationItem' });

export type ProjectHandoverParticipantConfirmationItem = z.infer<typeof ProjectHandoverParticipantConfirmationItemSchema>;

export const ProjectHandoverParticipantConfirmationSummarySchema = z
    .object({
        status: z.enum(['not_started', 'pending', 'confirmed', 'closed']),
        confirmationRecordId: z.uuid().nullable(),
        requiredCount: z.number().int().nonnegative(),
        confirmedCount: z.number().int().nonnegative(),
        pendingCount: z.number().int().nonnegative(),
        closedCount: z.number().int().nonnegative(),
        submittedAt: z.iso.datetime().nullable(),
        confirmedAt: z.iso.datetime().nullable(),
        closedAt: z.iso.datetime().nullable(),
        rowVersion: z.number().int().nullable(),
        participants: z.array(ProjectHandoverParticipantConfirmationItemSchema)
    })
    .meta({ id: 'ProjectHandoverParticipantConfirmationSummary' });

export type ProjectHandoverParticipantConfirmationSummary = z.infer<typeof ProjectHandoverParticipantConfirmationSummarySchema>;

export const ProjectHandoverReceiptJudgmentModeSummarySchema = z
    .object({
        status: z.enum(['not_frozen', 'frozen']),
        receiptJudgmentMode: z.string().nullable(),
        sourceType: z.enum(['project-handover', 'project-receipt-judgment-freeze', 'none']),
        sourceId: z.uuid().nullable(),
        summary: z.string()
    })
    .meta({ id: 'ProjectHandoverReceiptJudgmentModeSummary' });

export type ProjectHandoverReceiptJudgmentModeSummary = z.infer<typeof ProjectHandoverReceiptJudgmentModeSummarySchema>;

export const ProjectHandoverDetailViewSchema = z
    .object({
        handoverId: z.uuid().nullable(),
        projectId: z.uuid(),
        projectCode: z.string(),
        projectName: z.string(),
        handoverStatus: z.enum(['not_started', 'draft', 'confirmed', 'superseded', 'voided']),
        confirmedAt: z.iso.datetime().nullable(),
        confirmedBy: z.uuid().nullable(),
        comment: z.string().nullable(),
        rowVersion: z.number().int().nullable(),
        effectiveContractSetSummary: ContractHandoverEffectiveContractSetSummarySchema,
        contractSummarySnapshotId: z.uuid().nullable(),
        currentHandoverBaselineSummary: ContractHandoverCurrentBaselineSummarySchema,
        participantConfirmationSummary: ProjectHandoverParticipantConfirmationSummarySchema,
        receiptJudgmentModeSummary: ProjectHandoverReceiptJudgmentModeSummarySchema,
        summaryPackageKey: z.string().nullable(),
        summarySnapshotId: z.uuid().nullable(),
        projectionLevel: z.string().nullable(),
        exportPolicy: z.string().nullable(),
        allowedActions: z.array(z.string()),
        blockingReasons: z.array(z.string()),
        generatedAt: z.iso.datetime()
    })
    .meta({ id: 'ProjectHandoverDetailView' });

export type ProjectHandoverDetailView = z.infer<typeof ProjectHandoverDetailViewSchema>;

export const ConfirmProjectHandoverParticipantConfirmationInputSchema = z
    .object({
        participantId: z.uuid(),
        participantRoleKey: z.string().trim().min(1).max(64),
        participantStatus: z.literal('confirmed')
    })
    .meta({ id: 'ConfirmProjectHandoverParticipantConfirmationInput' });

export type ConfirmProjectHandoverParticipantConfirmationInput = z.infer<
    typeof ConfirmProjectHandoverParticipantConfirmationInputSchema
>;

export const ConfirmProjectHandoverRequestSchema = z
    .object({
        comment: z.string().trim().max(1000).optional(),
        participantConfirmations: z.array(ConfirmProjectHandoverParticipantConfirmationInputSchema).min(1),
        receiptJudgmentMode: z.string().trim().min(1).max(64).optional(),
        contractSummarySnapshotId: z.uuid(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ConfirmProjectHandoverRequest' });

export type ConfirmProjectHandoverRequest = z.infer<typeof ConfirmProjectHandoverRequestSchema>;

export const ConfirmProjectHandoverResultSchema = z
    .object({
        targetId: z.uuid(),
        businessStatusAfter: z.literal('confirmed'),
        confirmationRecordId: z.uuid(),
        receiptJudgmentFreezeId: z.uuid().nullable(),
        contractSummarySnapshotId: z.uuid(),
        effectiveHandoverBaselineSnapshotId: z.uuid(),
        summarySnapshotId: z.uuid(),
        projectionLevel: z.string(),
        exportPolicy: z.string()
    })
    .meta({ id: 'ConfirmProjectHandoverResult' });

export type ConfirmProjectHandoverResult = z.infer<typeof ConfirmProjectHandoverResultSchema>;

export const RebaselineContractHandoverRequestSchema = z
    .object({
        contractAmendmentId: z.uuid(),
        rebaselineReason: z.string().trim().min(1).max(1000),
        affectedHandoverItemIds: z.array(z.uuid()).min(1),
        effectiveBaselineAfterId: z.uuid(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'RebaselineContractHandoverRequest' });

export type RebaselineContractHandoverRequest = z.infer<typeof RebaselineContractHandoverRequestSchema>;

export const RebaselineContractHandoverResultSchema = z
    .object({
        targetId: z.uuid(),
        rebaselineRecordId: z.uuid(),
        effectiveBaselineAfterId: z.uuid(),
        resultStatus: z.literal('effective')
    })
    .meta({ id: 'RebaselineContractHandoverResult' });

export type RebaselineContractHandoverResult = z.infer<typeof RebaselineContractHandoverResultSchema>;

export const CreateCommercialBaselineDiffItemInputSchema = z
    .object({
        fieldKey: z.string().trim().min(1).max(128),
        fieldLabel: z.string().trim().min(1).max(128),
        oldValueSummary: z.string().max(1000).nullable().optional(),
        newValueSummary: z.string().max(1000).nullable().optional(),
        diffLevel: CommercialDiffLevelSchema,
        isBlocking: z.boolean().optional(),
        sortOrder: z.number().int().min(0).optional()
    })
    .meta({ id: 'CreateCommercialBaselineDiffItemInput' });

export type CreateCommercialBaselineDiffItemInput = z.infer<typeof CreateCommercialBaselineDiffItemInputSchema>;

export const CreateCommercialReleaseBaselineRequestSchema = z
    .object({
        projectId: z.uuid(),
        baselineCode: z.string().trim().min(1).max(64),
        quotationReviewId: z.uuid().nullable().optional(),
        grossMarginSummary: z.string().max(1000).nullable().optional(),
        paymentTermsSummary: z.string().max(1000).nullable().optional(),
        diffLevel: CommercialDiffLevelSchema,
        diffSummary: z.string().max(1000).nullable().optional(),
        diffItems: z.array(CreateCommercialBaselineDiffItemInputSchema).default([]),
        createdBy: z.uuid().nullable().optional(),
        updatedBy: z.uuid().nullable().optional()
    })
    .meta({ id: 'CreateCommercialReleaseBaselineRequest' });

export type CreateCommercialReleaseBaselineRequest = z.infer<typeof CreateCommercialReleaseBaselineRequestSchema>;

export const ReviewCommercialReleaseBaselineDiffRequestSchema = z
    .object({
        diffDecision: CommercialBaselineReviewDecisionSchema,
        reviewedFieldKeys: z.array(z.string()).default([]),
        comment: z.string().trim().max(1000).optional(),
        attachmentIds: z.array(z.string()).default([]),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ReviewCommercialReleaseBaselineDiffRequest' });

export type ReviewCommercialReleaseBaselineDiffRequest = z.infer<typeof ReviewCommercialReleaseBaselineDiffRequestSchema>;

export const ContractReadinessPackageItemInputSchema = z
    .object({
        itemType: ContractReadinessItemTypeSchema,
        itemKey: z.string().trim().min(1).max(128),
        label: z.string().trim().min(1).max(128),
        summary: z.string().max(1000).nullable().optional(),
        status: ContractReadinessItemStatusSchema,
        responsibleRole: z.string().max(128).nullable().optional(),
        navigationHint: z.string().max(255).nullable().optional(),
        sortOrder: z.number().int().min(0).optional()
    })
    .meta({ id: 'ContractReadinessPackageItemInput' });

export type ContractReadinessPackageItemInput = z.infer<typeof ContractReadinessPackageItemInputSchema>;

export const CreateContractReadinessPackageRequestSchema = z
    .object({
        projectId: z.uuid(),
        sourceBaselineId: z.uuid(),
        latestDiffResultId: z.uuid(),
        packageStatus: ContractReadinessStatusSchema,
        guardDecision: ContractReadinessGuardDecisionSchema,
        currentEffectiveDecisionSummary: z.string().max(1000).nullable().optional(),
        blockingReasonSummary: z.string().max(1000).nullable().optional(),
        missingPrerequisiteCount: z.number().int().min(0).optional(),
        items: z.array(ContractReadinessPackageItemInputSchema).default([]),
        createdBy: z.uuid().nullable().optional(),
        updatedBy: z.uuid().nullable().optional()
    })
    .meta({ id: 'CreateContractReadinessPackageRequest' });

export type CreateContractReadinessPackageRequest = z.infer<typeof CreateContractReadinessPackageRequestSchema>;

export const InitializeContractSnapshotFromReadinessPackageRequestSchema = z
    .object({
        contractReadinessPackageId: z.uuid().optional(),
        comment: z.string().trim().max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'InitializeContractSnapshotFromReadinessPackageRequest' });

export type InitializeContractSnapshotFromReadinessPackageRequest = z.infer<typeof InitializeContractSnapshotFromReadinessPackageRequestSchema>;

export const InitializeReceivablePlanFromReadinessPackageRequestSchema = z
    .object({
        contractReadinessPackageId: z.uuid().optional(),
        comment: z.string().trim().max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'InitializeReceivablePlanFromReadinessPackageRequest' });

export type InitializeReceivablePlanFromReadinessPackageRequest = z.infer<typeof InitializeReceivablePlanFromReadinessPackageRequestSchema>;

export const CommercialDiffReviewResultSchema = z
    .object({
        targetId: z.uuid(),
        diffResultId: z.uuid(),
        baselineReviewDecision: CommercialBaselineReviewDecisionSchema,
        resultStatus: z.string()
    })
    .meta({ id: 'CommercialDiffReviewResult' });

export type CommercialDiffReviewResult = z.infer<typeof CommercialDiffReviewResultSchema>;

export const ReadinessInitializationResultSchema = z
    .object({
        targetId: z.uuid(),
        targetType: z.string(),
        sourceReadinessId: z.uuid(),
        resultStatus: z.string(),
        businessStatusAfter: z.string(),
        snapshotId: z.uuid().nullable().optional(),
        newVersionId: z.uuid().nullable().optional()
    })
    .meta({ id: 'ReadinessInitializationResult' });

export type ReadinessInitializationResult = z.infer<typeof ReadinessInitializationResultSchema>;

export const RECEIPT_RECORD_STATUSES = [
    'draft',
    'pending-confirmation',
    'confirmed',
    'reversed',
    'void'
] as const;

export const ReceiptRecordStatusSchema = z
    .enum(RECEIPT_RECORD_STATUSES)
    .meta({ id: 'ReceiptRecordStatus' });

export type ReceiptRecordStatus = z.infer<typeof ReceiptRecordStatusSchema>;

export const ReceiptRecordSummarySchema = z
    .object({
        id: z.uuid(),
        contractId: z.uuid(),
        projectId: z.uuid(),
        receiptAmount: z.string(),
        receiptDate: z.iso.datetime(),
        sourceType: z.string(),
        status: ReceiptRecordStatusSchema,
        confirmedAt: z.iso.datetime().nullable(),
        confirmedBy: z.uuid().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'ReceiptRecordSummary' });

export type ReceiptRecordSummary = z.infer<typeof ReceiptRecordSummarySchema>;

export const ReceiptRecordListSchema = z
    .array(ReceiptRecordSummarySchema)
    .meta({ id: 'ReceiptRecordList' });

export type ReceiptRecordList = z.infer<typeof ReceiptRecordListSchema>;

export const CreateReceiptRecordRequestSchema = z
    .object({
        receiptAmount: z.string().trim().min(1).max(64),
        receiptDate: z.iso.datetime(),
        sourceType: z.string().trim().min(1).max(32).optional()
    })
    .meta({ id: 'CreateReceiptRecordRequest' });

export type CreateReceiptRecordRequest = z.infer<typeof CreateReceiptRecordRequestSchema>;

export const ConfirmReceiptRecordRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ConfirmReceiptRecordRequest' });

export type ConfirmReceiptRecordRequest = z.infer<typeof ConfirmReceiptRecordRequestSchema>;

export const PAYABLE_RECORD_STATUSES = ['draft', 'recorded', 'partially-paid', 'completed', 'closed', 'voided'] as const;

export const PayableRecordStatusSchema = z
    .enum(PAYABLE_RECORD_STATUSES)
    .meta({ id: 'PayableRecordStatus' });

export type PayableRecordStatus = z.infer<typeof PayableRecordStatusSchema>;

export const PayableRecordSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        contractId: z.uuid().nullable(),
        vendorName: z.string(),
        costCategory: z.string(),
        payableDescription: z.string(),
        currency: z.string(),
        amountExcludingTax: z.string(),
        taxAmount: z.string().nullable(),
        amountIncludingTax: z.string().nullable(),
        settledAmountExcludingTax: z.string(),
        expectedPaymentDate: z.iso.date(),
        status: PayableRecordStatusSchema,
        evidenceSummary: z.string().nullable(),
        attachmentCount: z.number().int().nonnegative(),
        closedAt: z.iso.datetime().nullable(),
        closeReason: z.string().nullable(),
        voidedAt: z.iso.datetime().nullable(),
        voidReason: z.string().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'PayableRecordSummary' });

export type PayableRecordSummary = z.infer<typeof PayableRecordSummarySchema>;

export const PayableRecordListSchema = z
    .array(PayableRecordSummarySchema)
    .meta({ id: 'PayableRecordList' });

export type PayableRecordList = z.infer<typeof PayableRecordListSchema>;

export const PayableRecordDetailViewSchema = PayableRecordSummarySchema.extend({
    allowedActions: z.array(z.string())
}).meta({ id: 'PayableRecordDetailView' });

export type PayableRecordDetailView = z.infer<typeof PayableRecordDetailViewSchema>;

export const CreatePayableRecordRequestSchema = z
    .object({
        contractId: z.uuid().nullable().optional(),
        vendorName: z.string().trim().min(1).max(200),
        costCategory: z.string().trim().min(1).max(64),
        payableDescription: z.string().trim().min(1).max(2000),
        currency: z.string().trim().min(1).max(16).optional(),
        amountExcludingTax: z.string().trim().min(1).max(64),
        taxAmount: z.string().trim().min(1).max(64).nullable().optional(),
        amountIncludingTax: z.string().trim().min(1).max(64).nullable().optional(),
        expectedPaymentDate: z.iso.date(),
        evidenceSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        attachmentCount: z.number().int().nonnegative().optional()
    })
    .meta({ id: 'CreatePayableRecordRequest' });

export type CreatePayableRecordRequest = z.infer<typeof CreatePayableRecordRequestSchema>;

export const UpdatePayableRecordRequestSchema = z
    .object({
        contractId: z.uuid().nullable().optional(),
        vendorName: z.string().trim().min(1).max(200).optional(),
        costCategory: z.string().trim().min(1).max(64).optional(),
        payableDescription: z.string().trim().min(1).max(2000).optional(),
        currency: z.string().trim().min(1).max(16).optional(),
        amountExcludingTax: z.string().trim().min(1).max(64).optional(),
        taxAmount: z.string().trim().min(1).max(64).nullable().optional(),
        amountIncludingTax: z.string().trim().min(1).max(64).nullable().optional(),
        expectedPaymentDate: z.iso.date().optional(),
        evidenceSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        attachmentCount: z.number().int().nonnegative().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .refine(
        (value) =>
            value.contractId !== undefined ||
            value.vendorName !== undefined ||
            value.costCategory !== undefined ||
            value.payableDescription !== undefined ||
            value.currency !== undefined ||
            value.amountExcludingTax !== undefined ||
            value.taxAmount !== undefined ||
            value.amountIncludingTax !== undefined ||
            value.expectedPaymentDate !== undefined ||
            value.evidenceSummary !== undefined ||
            value.attachmentCount !== undefined,
        {
            message: 'At least one updatable field is required'
        }
    )
    .meta({ id: 'UpdatePayableRecordRequest' });

export type UpdatePayableRecordRequest = z.infer<typeof UpdatePayableRecordRequestSchema>;

export const ClosePayableRecordRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(1000),
        comment: z.string().trim().min(1).max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ClosePayableRecordRequest' });

export type ClosePayableRecordRequest = z.infer<typeof ClosePayableRecordRequestSchema>;

export const VoidPayableRecordRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(1000),
        comment: z.string().trim().min(1).max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'VoidPayableRecordRequest' });

export type VoidPayableRecordRequest = z.infer<typeof VoidPayableRecordRequestSchema>;

export const PAYMENT_RECORD_STATUSES = ['draft', 'recorded', 'confirmed', 'void'] as const;

export const PaymentRecordStatusSchema = z
    .enum(PAYMENT_RECORD_STATUSES)
    .meta({ id: 'PaymentRecordStatus' });

export type PaymentRecordStatus = z.infer<typeof PaymentRecordStatusSchema>;

export const PaymentRecordSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        contractId: z.uuid().nullable(),
        payableRecordId: z.uuid().nullable(),
        currency: z.string(),
        amountExcludingTax: z.string(),
        taxAmount: z.string().nullable(),
        amountIncludingTax: z.string().nullable(),
        paymentDate: z.iso.datetime(),
        costCategory: z.string(),
        sourceType: z.string(),
        status: PaymentRecordStatusSchema,
        confirmedAt: z.iso.datetime().nullable(),
        confirmedBy: z.uuid().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'PaymentRecordSummary' });

export type PaymentRecordSummary = z.infer<typeof PaymentRecordSummarySchema>;

export const PaymentRecordListSchema = z
    .array(PaymentRecordSummarySchema)
    .meta({ id: 'PaymentRecordList' });

export type PaymentRecordList = z.infer<typeof PaymentRecordListSchema>;

export const CreatePaymentRecordRequestSchema = z
    .object({
        contractId: z.uuid().nullable().optional(),
        payableRecordId: z.uuid().nullable().optional(),
        currency: z.string().trim().min(1).max(16).optional(),
        amountExcludingTax: z.string().trim().min(1).max(64),
        taxAmount: z.string().trim().min(1).max(64).nullable().optional(),
        amountIncludingTax: z.string().trim().min(1).max(64).nullable().optional(),
        paymentDate: z.iso.datetime(),
        costCategory: z.string().trim().min(1).max(64),
        sourceType: z.string().trim().min(1).max(32).optional()
    })
    .meta({ id: 'CreatePaymentRecordRequest' });

export type CreatePaymentRecordRequest = z.infer<typeof CreatePaymentRecordRequestSchema>;

export const ConfirmPaymentRecordRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ConfirmPaymentRecordRequest' });

export type ConfirmPaymentRecordRequest = z.infer<typeof ConfirmPaymentRecordRequestSchema>;

export const INVOICE_RECORD_TYPES = ['input', 'output'] as const;

export const InvoiceRecordTypeSchema = z
    .enum(INVOICE_RECORD_TYPES)
    .meta({ id: 'InvoiceRecordType' });

export type InvoiceRecordType = z.infer<typeof InvoiceRecordTypeSchema>;

export const INVOICE_RECORD_STATUSES = ['draft', 'pending-issue', 'issued', 'received', 'verified', 'exception', 'closed'] as const;

export const InvoiceRecordStatusSchema = z
    .enum(INVOICE_RECORD_STATUSES)
    .meta({ id: 'InvoiceRecordStatus' });

export type InvoiceRecordStatus = z.infer<typeof InvoiceRecordStatusSchema>;

export const INVOICE_RECORD_EXCEPTION_STATUSES = ['none', 'open', 'resolved'] as const;

export const InvoiceRecordExceptionStatusSchema = z
    .enum(INVOICE_RECORD_EXCEPTION_STATUSES)
    .meta({ id: 'InvoiceRecordExceptionStatus' });

export type InvoiceRecordExceptionStatus = z.infer<typeof InvoiceRecordExceptionStatusSchema>;

export const InvoiceRecordSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        contractId: z.uuid().nullable(),
        invoiceType: InvoiceRecordTypeSchema,
        invoiceNumber: z.string(),
        invoiceAmount: z.string(),
        invoiceDate: z.iso.date(),
        status: InvoiceRecordStatusSchema,
        exceptionStatus: InvoiceRecordExceptionStatusSchema,
        exceptionReason: z.string().nullable(),
        exceptionResolution: z.string().nullable(),
        closedAt: z.iso.datetime().nullable(),
        closeReason: z.string().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'InvoiceRecordSummary' });

export type InvoiceRecordSummary = z.infer<typeof InvoiceRecordSummarySchema>;

export const InvoiceRecordListSchema = z
    .array(InvoiceRecordSummarySchema)
    .meta({ id: 'InvoiceRecordList' });

export type InvoiceRecordList = z.infer<typeof InvoiceRecordListSchema>;

export const InvoiceRecordDetailViewSchema = InvoiceRecordSummarySchema.extend({
    allowedActions: z.array(z.string())
}).meta({ id: 'InvoiceRecordDetailView' });

export type InvoiceRecordDetailView = z.infer<typeof InvoiceRecordDetailViewSchema>;

export const CreateInvoiceRecordRequestSchema = z
    .object({
        contractId: z.uuid().nullable().optional(),
        invoiceType: InvoiceRecordTypeSchema,
        invoiceNumber: z.string().trim().min(1).max(128),
        invoiceAmount: z.string().trim().min(1).max(64),
        invoiceDate: z.iso.date()
    })
    .meta({ id: 'CreateInvoiceRecordRequest' });

export type CreateInvoiceRecordRequest = z.infer<typeof CreateInvoiceRecordRequestSchema>;

const InvoiceRecordPatchableStatusSchema = z.enum(['draft', 'pending-issue', 'issued', 'received', 'verified']);

export const UpdateInvoiceRecordRequestSchema = z
    .object({
        contractId: z.uuid().nullable().optional(),
        invoiceNumber: z.string().trim().min(1).max(128).optional(),
        invoiceAmount: z.string().trim().min(1).max(64).optional(),
        invoiceDate: z.iso.date().optional(),
        status: InvoiceRecordPatchableStatusSchema.optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .refine(
        (value) =>
            value.contractId !== undefined ||
            value.invoiceNumber !== undefined ||
            value.invoiceAmount !== undefined ||
            value.invoiceDate !== undefined ||
            value.status !== undefined,
        {
            message: 'At least one updatable field is required'
        }
    )
    .meta({ id: 'UpdateInvoiceRecordRequest' });

export type UpdateInvoiceRecordRequest = z.infer<typeof UpdateInvoiceRecordRequestSchema>;

export const MarkInvoiceExceptionRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(1000),
        comment: z.string().trim().min(1).max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'MarkInvoiceExceptionRequest' });

export type MarkInvoiceExceptionRequest = z.infer<typeof MarkInvoiceExceptionRequestSchema>;

export const ResolveInvoiceExceptionRequestSchema = z
    .object({
        resolution: z.string().trim().min(1).max(1000),
        comment: z.string().trim().min(1).max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ResolveInvoiceExceptionRequest' });

export type ResolveInvoiceExceptionRequest = z.infer<typeof ResolveInvoiceExceptionRequestSchema>;

export const CloseInvoiceRecordRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(1000),
        comment: z.string().trim().min(1).max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'CloseInvoiceRecordRequest' });

export type CloseInvoiceRecordRequest = z.infer<typeof CloseInvoiceRecordRequestSchema>;

export const EXPENSE_CATEGORIES = ['travel', 'onsite-service', 'deployment-logistics', 'temporary-spend', 'misc'] as const;

export const ExpenseCategorySchema = z
    .enum(EXPENSE_CATEGORIES)
    .meta({ id: 'ExpenseCategory' });

export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;

export const EXPENSE_SOURCE_TYPES = ['manual', 'reimbursement', 'import'] as const;

export const ExpenseSourceTypeSchema = z
    .enum(EXPENSE_SOURCE_TYPES)
    .meta({ id: 'ExpenseSourceType' });

export type ExpenseSourceType = z.infer<typeof ExpenseSourceTypeSchema>;

export const EXPENSE_RECORD_STATUSES = ['draft', 'recorded', 'confirmed', 'voided'] as const;

export const ExpenseRecordStatusSchema = z
    .enum(EXPENSE_RECORD_STATUSES)
    .meta({ id: 'ExpenseRecordStatus' });

export type ExpenseRecordStatus = z.infer<typeof ExpenseRecordStatusSchema>;

export const ExpenseRecordSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        contractId: z.uuid().nullable(),
        expenseCategory: ExpenseCategorySchema,
        expenseDescription: z.string(),
        expenseDate: z.iso.date(),
        currency: z.string(),
        amountIncludingTax: z.string(),
        taxAmount: z.string().nullable(),
        amountExcludingTax: z.string().nullable(),
        sourceType: ExpenseSourceTypeSchema,
        status: ExpenseRecordStatusSchema,
        evidenceSummary: z.string().nullable(),
        attachmentCount: z.number().int().nonnegative(),
        confirmedAt: z.iso.datetime().nullable(),
        confirmedBy: z.uuid().nullable(),
        voidedAt: z.iso.datetime().nullable(),
        voidReason: z.string().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'ExpenseRecordSummary' });

export type ExpenseRecordSummary = z.infer<typeof ExpenseRecordSummarySchema>;

export const ExpenseRecordListSchema = z
    .array(ExpenseRecordSummarySchema)
    .meta({ id: 'ExpenseRecordList' });

export type ExpenseRecordList = z.infer<typeof ExpenseRecordListSchema>;

export const ExpenseRecordDetailViewSchema = ExpenseRecordSummarySchema.extend({
    allowedActions: z.array(z.string())
}).meta({ id: 'ExpenseRecordDetailView' });

export type ExpenseRecordDetailView = z.infer<typeof ExpenseRecordDetailViewSchema>;

export const CreateExpenseRecordRequestSchema = z
    .object({
        contractId: z.uuid().nullable().optional(),
        expenseCategory: ExpenseCategorySchema,
        expenseDescription: z.string().trim().min(1).max(2000),
        expenseDate: z.iso.date(),
        currency: z.string().trim().min(1).max(16).optional(),
        amountIncludingTax: z.string().trim().min(1).max(64),
        taxAmount: z.string().trim().min(1).max(64).nullable().optional(),
        amountExcludingTax: z.string().trim().min(1).max(64).nullable().optional(),
        sourceType: ExpenseSourceTypeSchema.optional(),
        evidenceSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        attachmentCount: z.number().int().nonnegative().optional()
    })
    .meta({ id: 'CreateExpenseRecordRequest' });

export type CreateExpenseRecordRequest = z.infer<typeof CreateExpenseRecordRequestSchema>;

export const UpdateExpenseRecordRequestSchema = z
    .object({
        contractId: z.uuid().nullable().optional(),
        expenseCategory: ExpenseCategorySchema.optional(),
        expenseDescription: z.string().trim().min(1).max(2000).optional(),
        expenseDate: z.iso.date().optional(),
        currency: z.string().trim().min(1).max(16).optional(),
        amountIncludingTax: z.string().trim().min(1).max(64).optional(),
        taxAmount: z.string().trim().min(1).max(64).nullable().optional(),
        amountExcludingTax: z.string().trim().min(1).max(64).nullable().optional(),
        sourceType: ExpenseSourceTypeSchema.optional(),
        evidenceSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        attachmentCount: z.number().int().nonnegative().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .refine(
        (value) =>
            value.contractId !== undefined ||
            value.expenseCategory !== undefined ||
            value.expenseDescription !== undefined ||
            value.expenseDate !== undefined ||
            value.currency !== undefined ||
            value.amountIncludingTax !== undefined ||
            value.taxAmount !== undefined ||
            value.amountExcludingTax !== undefined ||
            value.sourceType !== undefined ||
            value.evidenceSummary !== undefined ||
            value.attachmentCount !== undefined,
        {
            message: 'At least one updatable field is required'
        }
    )
    .meta({ id: 'UpdateExpenseRecordRequest' });

export type UpdateExpenseRecordRequest = z.infer<typeof UpdateExpenseRecordRequestSchema>;

export const ConfirmExpenseRecordRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ConfirmExpenseRecordRequest' });

export type ConfirmExpenseRecordRequest = z.infer<typeof ConfirmExpenseRecordRequestSchema>;

export const VoidExpenseRecordRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(1000),
        comment: z.string().trim().min(1).max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'VoidExpenseRecordRequest' });

export type VoidExpenseRecordRequest = z.infer<typeof VoidExpenseRecordRequestSchema>;

// ---------------------------------------------------------------------------
// Approval / Todo
// ---------------------------------------------------------------------------

export const ApprovalRecordSummarySchema = z
    .object({
        id: z.uuid(),
        approvalType: z.string(),
        businessDomain: z.string(),
        targetObjectType: z.string(),
        targetObjectId: z.uuid(),
        projectId: z.uuid().nullable(),
        currentStatus: z.string(),
        currentNodeKey: z.string(),
        currentNodeName: z.string().nullable(),
        initiatorUserId: z.uuid(),
        currentApproverUserId: z.uuid().nullable(),
        decision: z.string().nullable(),
        decisionComment: z.string().nullable(),
        targetTitle: z.string().nullable(),
        targetStatus: z.string().nullable(),
        submittedAt: z.iso.datetime(),
        decidedAt: z.iso.datetime().nullable(),
        closedAt: z.iso.datetime().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'ApprovalRecordSummary' });

export type ApprovalRecordSummary = z.infer<typeof ApprovalRecordSummarySchema>;

/**
 * 领域特化的审批记录类型，将 targetStatus 窄化为具体业务状态枚举。
 * 用于在领域 Store 层做一次边界断言后，下游消费者全程受益于推导。
 */
export type DomainApprovalRecord<TStatus extends string> = Omit<ApprovalRecordSummary, 'targetStatus'> & {
    targetStatus: TStatus | null;
};

export const TodoItemSummarySchema = z
    .object({
        id: z.uuid(),
        sourceType: z.string(),
        sourceId: z.uuid(),
        todoType: z.string(),
        businessDomain: z.string(),
        targetObjectType: z.string(),
        targetObjectId: z.uuid(),
        projectId: z.uuid().nullable(),
        title: z.string(),
        summary: z.string().nullable(),
        targetTitle: z.string().nullable(),
        currentNodeName: z.string().nullable(),
        allowedActions: z.array(z.string()),
        assigneeUserId: z.uuid(),
        status: z.string(),
        priority: z.string(),
        dueAt: z.iso.datetime().nullable(),
        completedAt: z.iso.datetime().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'TodoItemSummary' });

export type TodoItemSummary = z.infer<typeof TodoItemSummarySchema>;

export const TodoItemListSchema = z.array(TodoItemSummarySchema).meta({ id: 'TodoItemList' });

export type TodoItemList = z.infer<typeof TodoItemListSchema>;

export const CommandResultSchema = z
    .object({
        targetId: z.uuid(),
        targetType: z.string(),
        resultStatus: z.string(),
        businessStatusAfter: z.string(),
        approvalRecordId: z.uuid().nullable(),
        confirmationRecordId: z.uuid().nullable(),
        todoItemIds: z.array(z.uuid()),
        snapshotId: z.uuid().nullable().optional()
    })
    .meta({ id: 'CommandResult' });

export type CommandResult = z.infer<typeof CommandResultSchema>;

export const SubmitContractReviewRequestSchema = z
    .object({
        comment: z.string().trim().min(1).max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'SubmitContractReviewRequest' });

export type SubmitContractReviewRequest = z.infer<typeof SubmitContractReviewRequestSchema>;

export const ApproveRecordRequestSchema = z
    .object({
        comment: z.string().trim().min(1).max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ApproveRecordRequest' });

export type ApproveRecordRequest = z.infer<typeof ApproveRecordRequestSchema>;

export const RejectApprovalRecordRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(255),
        comment: z.string().trim().min(1).max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'RejectApprovalRecordRequest' });

export type RejectApprovalRecordRequest = z.infer<typeof RejectApprovalRecordRequestSchema>;

// ---------------------------------------------------------------------------
// Commission — Rule Version
// ---------------------------------------------------------------------------

export const CommissionTierSchema = z.object({
    minMarginRate: z.number().min(0).max(1),
    maxMarginRate: z.number().min(0).max(1).nullable(),
    commissionRate: z.number().min(0).max(1)
});

export const CommissionTierDefinitionSchema = z.object({
    tiers: z.array(CommissionTierSchema).min(1)
});

export type CommissionTierDefinition = z.infer<typeof CommissionTierDefinitionSchema>;

export const CommissionRuleVersionSummarySchema = z
    .object({
        id: z.uuid(),
        ruleCode: z.string(),
        version: z.number().int(),
        status: z.enum(['draft', 'active', 'stopped']),
        tierDefinitionJson: CommissionTierDefinitionSchema,
        effectiveFrom: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'CommissionRuleVersionSummary' });

export type CommissionRuleVersionSummary = z.infer<typeof CommissionRuleVersionSummarySchema>;

export const CreateCommissionRuleVersionRequestSchema = z
    .object({
        ruleCode: z.string().min(1).max(64),
        version: z.number().int().positive(),
        tierDefinitionJson: CommissionTierDefinitionSchema,
        firstStageCapRuleJson: z.record(z.string(), z.unknown()).nullable().optional(),
        secondStageCapRuleJson: z.record(z.string(), z.unknown()).nullable().optional(),
        retentionRuleJson: z.record(z.string(), z.unknown()).nullable().optional(),
        lowDownPaymentRuleJson: z.record(z.string(), z.unknown()).nullable().optional(),
        exceptionRuleJson: z.record(z.string(), z.unknown()).nullable().optional(),
        effectiveFrom: z.iso.datetime().nullable().optional()
    })
    .meta({ id: 'CreateCommissionRuleVersionRequest' });

export type CreateCommissionRuleVersionRequest = z.infer<typeof CreateCommissionRuleVersionRequestSchema>;

// ---------------------------------------------------------------------------
// Commission — Role Assignment
// ---------------------------------------------------------------------------

export const CommissionParticipantSchema = z.object({
    userId: z.uuid(),
    displayName: z.string().min(1),
    roleType: z.string().min(1),
    weight: z.number().min(0).max(1)
});

export type CommissionParticipant = z.infer<typeof CommissionParticipantSchema>;

export const CommissionRoleAssignmentSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        version: z.number().int(),
        rowVersion: z.number().int().positive(),
        isCurrent: z.boolean(),
        status: z.enum(['draft', 'frozen', 'superseded']),
        participantsJson: z.array(CommissionParticipantSchema),
        sourceHandoverId: z.uuid().nullable(),
        sourceHandoverRebaselineRecordId: z.uuid().nullable(),
        contractSummarySnapshotId: z.uuid().nullable(),
        handoverSummarySnapshotId: z.uuid().nullable(),
        effectiveHandoverBaselineSnapshotId: z.uuid().nullable(),
        frozenAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'CommissionRoleAssignmentSummary' });

export type CommissionRoleAssignmentSummary = z.infer<typeof CommissionRoleAssignmentSummarySchema>;

export const CreateCommissionRoleAssignmentRequestSchema = z
    .object({
        participants: z.array(CommissionParticipantSchema).min(1)
    })
    .meta({ id: 'CreateCommissionRoleAssignmentRequest' });

export type CreateCommissionRoleAssignmentRequest = z.infer<typeof CreateCommissionRoleAssignmentRequestSchema>;

export const FreezeCommissionRoleAssignmentRequestSchema = z
    .object({
        comment: z.string().trim().max(1000).optional(),
        sourceHandoverId: z.uuid(),
        handoverSummarySnapshotId: z.uuid(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'FreezeCommissionRoleAssignmentRequest' });

export type FreezeCommissionRoleAssignmentRequest = z.infer<typeof FreezeCommissionRoleAssignmentRequestSchema>;

export const FreezeCommissionRoleAssignmentResultSchema = z
    .object({
        targetId: z.uuid(),
        businessStatusAfter: z.literal('frozen'),
        newVersionId: z.uuid(),
        sourceHandoverId: z.uuid(),
        contractSummarySnapshotId: z.uuid(),
        handoverSummarySnapshotId: z.uuid(),
        effectiveHandoverBaselineSnapshotId: z.uuid(),
        summarySnapshotId: z.uuid(),
        projectionLevel: z.string(),
        exportPolicy: z.string()
    })
    .meta({ id: 'FreezeCommissionRoleAssignmentResult' });

export type FreezeCommissionRoleAssignmentResult = z.infer<typeof FreezeCommissionRoleAssignmentResultSchema>;

export const CommissionRoleAssignmentDetailViewSchema = z
    .object({
        roleAssignmentId: z.uuid(),
        projectId: z.uuid(),
        freezeVersionSummary: CommissionRoleAssignmentSummarySchema,
        sourceHandoverId: z.uuid().nullable(),
        contractSummarySnapshotId: z.uuid().nullable(),
        handoverSummarySnapshotId: z.uuid().nullable(),
        effectiveHandoverBaselineSummary: ContractHandoverCurrentBaselineSummarySchema,
        receiptJudgmentModeSummary: ProjectHandoverReceiptJudgmentModeSummarySchema,
        summaryPackageKey: z.string().nullable(),
        summarySnapshotId: z.uuid().nullable(),
        projectionLevel: z.string().nullable(),
        exportPolicy: z.string().nullable(),
        allowedActions: z.array(z.string()),
        generatedAt: z.iso.datetime()
    })
    .meta({ id: 'CommissionRoleAssignmentDetailView' });

export type CommissionRoleAssignmentDetailView = z.infer<typeof CommissionRoleAssignmentDetailViewSchema>;

// ---------------------------------------------------------------------------
// Commission — Calculation
// ---------------------------------------------------------------------------

export const CommissionCalculationSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        ruleVersionId: z.uuid(),
        version: z.number().int(),
        rowVersion: z.number().int().positive(),
        isCurrent: z.boolean(),
        status: z.enum(['pending', 'calculated', 'effective', 'superseded']),
        recognizedRevenueTaxExclusive: z.string(),
        recognizedCostTaxExclusive: z.string(),
        contributionMargin: z.string(),
        contributionMarginRate: z.string(),
        commissionPool: z.string(),
        recalculatedFromId: z.uuid().nullable(),
        approvedAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'CommissionCalculationSummary' });

export type CommissionCalculationSummary = z.infer<typeof CommissionCalculationSummarySchema>;

export const CreateCommissionCalculationRequestSchema = z
    .object({
        recognizedRevenueTaxExclusive: z.string().trim().min(1).max(64),
        recognizedCostTaxExclusive: z.string().trim().min(1).max(64)
    })
    .meta({ id: 'CreateCommissionCalculationRequest' });

export type CreateCommissionCalculationRequest = z.infer<typeof CreateCommissionCalculationRequestSchema>;

export const ConfirmCommissionCalculationRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ConfirmCommissionCalculationRequest' });

export type ConfirmCommissionCalculationRequest = z.infer<typeof ConfirmCommissionCalculationRequestSchema>;

// ---------------------------------------------------------------------------
// Commission — Payout
// ---------------------------------------------------------------------------

export const CommissionPayoutStageSchema = z.enum(['first', 'second', 'final']).meta({ id: 'CommissionPayoutStage' });

export type CommissionPayoutStage = z.infer<typeof CommissionPayoutStageSchema>;

export const CommissionPayoutTierSchema = z.enum(['basic', 'mid', 'premium']).meta({ id: 'CommissionPayoutTier' });

export type CommissionPayoutTier = z.infer<typeof CommissionPayoutTierSchema>;

export const CommissionPayoutSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        calculationId: z.uuid(),
        rowVersion: z.number().int().positive(),
        stageType: CommissionPayoutStageSchema,
        selectedTier: CommissionPayoutTierSchema,
        theoreticalCapAmount: z.string(),
        approvedAmount: z.string().nullable(),
        paidRecordAmount: z.string().nullable(),
        status: z.enum(['draft', 'pending-approval', 'approved', 'paid', 'suspended', 'reversed']),
        approvedAt: z.iso.datetime().nullable(),
        handledAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'CommissionPayoutSummary' });

export type CommissionPayoutSummary = z.infer<typeof CommissionPayoutSummarySchema>;

export const CreateCommissionPayoutRequestSchema = z
    .object({
        calculationId: z.uuid(),
        stageType: CommissionPayoutStageSchema,
        selectedTier: CommissionPayoutTierSchema.default('basic')
    })
    .meta({ id: 'CreateCommissionPayoutRequest' });

export type CreateCommissionPayoutRequest = z.infer<typeof CreateCommissionPayoutRequestSchema>;

export const SubmitCommissionPayoutApprovalRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'SubmitCommissionPayoutApprovalRequest' });

export type SubmitCommissionPayoutApprovalRequest = z.infer<typeof SubmitCommissionPayoutApprovalRequestSchema>;

export const ApproveCommissionPayoutRequestSchema = z
    .object({
        approvedAmount: z.string().trim().min(1).max(64).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ApproveCommissionPayoutRequest' });

export type ApproveCommissionPayoutRequest = z.infer<typeof ApproveCommissionPayoutRequestSchema>;

export const RegisterCommissionPayoutRequestSchema = z
    .object({
        paidRecordAmount: z.string().trim().min(1).max(64),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'RegisterCommissionPayoutRequest' });

export type RegisterCommissionPayoutRequest = z.infer<typeof RegisterCommissionPayoutRequestSchema>;

// ---------------------------------------------------------------------------
// Commission — Adjustment
// ---------------------------------------------------------------------------

export const CommissionAdjustmentTypeSchema = z
    .enum(['suspend-payout', 'reverse-payout', 'clawback', 'supplement', 'recalculate'])
    .meta({ id: 'CommissionAdjustmentType' });

export type CommissionAdjustmentType = z.infer<typeof CommissionAdjustmentTypeSchema>;

export const CommissionAdjustmentSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        rowVersion: z.number().int().positive(),
        adjustmentType: CommissionAdjustmentTypeSchema,
        relatedPayoutId: z.uuid().nullable(),
        relatedCalculationId: z.uuid().nullable(),
        amount: z.string().nullable(),
        reason: z.string(),
        status: z.enum(['draft', 'pending-approval', 'approved', 'executed', 'rejected', 'closed']),
        executedAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'CommissionAdjustmentSummary' });

export type CommissionAdjustmentSummary = z.infer<typeof CommissionAdjustmentSummarySchema>;

export const CreateCommissionAdjustmentRequestSchema = z
    .object({
        adjustmentType: CommissionAdjustmentTypeSchema,
        relatedPayoutId: z.uuid().nullable().optional(),
        relatedCalculationId: z.uuid().nullable().optional(),
        amount: z.string().trim().min(1).max(64).nullable().optional(),
        reason: z.string().trim().min(1).max(256)
    })
    .meta({ id: 'CreateCommissionAdjustmentRequest' });

export type CreateCommissionAdjustmentRequest = z.infer<typeof CreateCommissionAdjustmentRequestSchema>;

export const SubmitCommissionAdjustmentApprovalRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'SubmitCommissionAdjustmentApprovalRequest' });

export type SubmitCommissionAdjustmentApprovalRequest = z.infer<typeof SubmitCommissionAdjustmentApprovalRequestSchema>;

export const ExecuteCommissionAdjustmentRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ExecuteCommissionAdjustmentRequest' });

export type ExecuteCommissionAdjustmentRequest = z.infer<typeof ExecuteCommissionAdjustmentRequestSchema>;

export const RecalculateCommissionRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(256),
        recognizedRevenueTaxExclusive: z.string().trim().min(1).max(64).optional(),
        recognizedCostTaxExclusive: z.string().trim().min(1).max(64).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'RecalculateCommissionRequest' });

export type RecalculateCommissionRequest = z.infer<typeof RecalculateCommissionRequestSchema>;

// ---------------------------------------------------------------------------
// Project Cost
// ---------------------------------------------------------------------------

export const InternalCostRateVersionStatusSchema = z
    .enum(['active', 'superseded', 'retired'])
    .meta({ id: 'InternalCostRateVersionStatus' });

export type InternalCostRateVersionStatus = z.infer<typeof InternalCostRateVersionStatusSchema>;

export const InternalCostRateVersionSummarySchema = z
    .object({
        id: z.uuid(),
        rateKey: z.string().trim().min(1).max(128),
        version: z.number().int().positive(),
        status: InternalCostRateVersionStatusSchema,
        isCurrent: z.boolean(),
        rateScopeType: z.enum(['PERSON', 'ROLE']),
        personId: z.uuid().nullable(),
        roleCode: z.string().nullable(),
        rateUnit: z.enum(['HOUR', 'DAY']),
        rateValue: z.string(),
        currency: z.string(),
        effectiveFrom: z.iso.date(),
        effectiveTo: z.iso.date().nullable(),
        publishedAt: z.iso.datetime().nullable(),
        publishedBy: z.uuid().nullable(),
        supersedesRateVersionId: z.uuid().nullable(),
        changeReason: z.string().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'InternalCostRateVersionSummary' });

export type InternalCostRateVersionSummary = z.infer<typeof InternalCostRateVersionSummarySchema>;

export const PublishInternalCostRateVersionRequestSchema = z
    .object({
        rateScopeType: z.enum(['PERSON', 'ROLE']),
        personId: z.uuid().nullable().optional(),
        roleCode: z.string().nullable().optional(),
        rateUnit: z.enum(['HOUR', 'DAY']),
        rateValue: z.string().trim().min(1).max(64),
        currency: z.string().trim().min(1).max(16),
        effectiveFrom: z.iso.date(),
        effectiveTo: z.iso.date().nullable().optional(),
        changeReason: z.string().nullable().optional(),
        supersedesRateVersionId: z.uuid().nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'PublishInternalCostRateVersionRequest' });

export type PublishInternalCostRateVersionRequest = z.infer<typeof PublishInternalCostRateVersionRequestSchema>;

export const ProjectActualCostRecordSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        recordNo: z.string().nullable(),
        costType: z.enum(['PROCUREMENT', 'INVOICE', 'EXPENSE', 'PAYMENT_FACT', 'LABOR']),
        costSubtype: z.string().nullable(),
        occurredOn: z.iso.date().nullable(),
        accountingPeriod: z.string().nullable(),
        registeredAt: z.iso.datetime().nullable(),
        confirmedAt: z.iso.datetime().nullable(),
        includedAt: z.iso.datetime().nullable(),
        executionStageCode: z.string().nullable(),
        stageDerivedFromType: z.string().nullable(),
        stageDerivedFromId: z.string().max(64).nullable(),
        stageDerivedAt: z.iso.datetime().nullable(),
        stageLockedAt: z.iso.datetime().nullable(),
        currency: z.string(),
        amountExcludingTax: z.string().nullable(),
        taxCostAmount: z.string().nullable(),
        amountIncludingTax: z.string().nullable(),
        recordStatus: z.enum(['DRAFT', 'REGISTERED', 'CONFIRMED', 'INCLUDED', 'VOIDED', 'REPLACED']),
        isIncludedInProjectCost: z.boolean(),
        isHighRisk: z.boolean(),
        sourceType: z.string().nullable(),
        sourceId: z.string().max(64).nullable(),
        sourceRefNo: z.string().nullable(),
        evidenceSummary: z.string().nullable(),
        attachmentCount: z.number().int().nonnegative(),
        registeredBy: z.uuid().nullable(),
        confirmedBy: z.uuid().nullable(),
        includedBy: z.uuid().nullable(),
        ownerRole: z.string().nullable(),
        costDescription: z.string().nullable(),
        taxImpactSummary: z.string().nullable(),
        riskNote: z.string().nullable(),
        supersedesRecordId: z.uuid().nullable(),
        voidReason: z.string().nullable(),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'ProjectActualCostRecordSummary' });

export type ProjectActualCostRecordSummary = z.infer<typeof ProjectActualCostRecordSummarySchema>;

export const ProjectActualCostRecordListViewSchema = z
    .array(ProjectActualCostRecordSummarySchema)
    .meta({ id: 'ProjectActualCostRecordListView' });

export type ProjectActualCostRecordListView = z.infer<typeof ProjectActualCostRecordListViewSchema>;

export const ProjectActualCostRecordDetailViewSchema = ProjectActualCostRecordSummarySchema.extend({
    sourceStatusSummary: z.string().nullable(),
    effectivePeriodSummary: z.string().nullable(),
    measurementBasisSummary: z.string().nullable(),
    supersedesSummary: z.string().nullable(),
    allowedActions: z.array(z.string()),
    laborPersonId: z.uuid().nullable(),
    laborRole: z.string().nullable(),
    laborPeriodType: z.enum(['WEEK', 'MONTH']).nullable(),
    laborPeriodStart: z.iso.date().nullable(),
    laborPeriodEnd: z.iso.date().nullable(),
    actualHours: z.string().nullable(),
    actualPersonDays: z.string().nullable(),
    internalCostRate: z.string().nullable(),
    rateVersionId: z.uuid().nullable(),
    laborAmount: z.string().nullable(),
    workSummary: z.string().nullable(),
    deliveryStage: z.string().nullable()
}).meta({ id: 'ProjectActualCostRecordDetailView' });

export type ProjectActualCostRecordDetailView = z.infer<typeof ProjectActualCostRecordDetailViewSchema>;

export const BaselineSelectionSourceSchema = z
    .enum(['original', 'handover_rebaseline'])
    .meta({ id: 'BaselineSelectionSource' });

export type BaselineSelectionSource = z.infer<typeof BaselineSelectionSourceSchema>;

export const OperatingSnapshotActionLevelSchema = z
    .enum(['PROMPT', 'REVIEW', 'BLOCK'])
    .meta({ id: 'OperatingSnapshotActionLevel' });

export type OperatingSnapshotActionLevel = z.infer<typeof OperatingSnapshotActionLevelSchema>;

export const ChangePackageBaselineInputSchema = z.object({
    changePackageId: z.uuid(),
    changeAmount: z.string().trim().min(1).max(64),
    changeSummary: z.string().trim().min(1).max(1000).nullable().optional(),
    effectiveAt: z.iso.datetime().nullable().optional()
});

export const ActivateOperatingBaselinePackageRequestSchema = z
    .object({
        projectId: z.uuid(),
        originalBaselineCost: z.string().trim().min(1).max(64),
        baselineSelectionSource: BaselineSelectionSourceSchema.default('original'),
        effectiveOperatingBaselineId: z.uuid().nullable().optional(),
        baselineSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        changePackages: z.array(ChangePackageBaselineInputSchema).default([]),
        expectedCurrentPackageVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ActivateOperatingBaselinePackageRequest' });

export type ActivateOperatingBaselinePackageRequest = z.infer<typeof ActivateOperatingBaselinePackageRequestSchema>;

export const OperatingBaselinePackageSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        originalBaselineCost: z.string(),
        changePackageTotal: z.string(),
        currentEffectiveBaselineCost: z.string(),
        baselineSelectionSource: BaselineSelectionSourceSchema,
        effectiveOperatingBaselineId: z.uuid().nullable(),
        baselineSummary: z.string().nullable(),
        isCurrent: z.boolean(),
        status: z.enum(['draft', 'active', 'superseded']),
        effectiveAt: z.iso.datetime().nullable(),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'OperatingBaselinePackageSummary' });

export type OperatingBaselinePackageSummary = z.infer<typeof OperatingBaselinePackageSummarySchema>;

const OperatingSnapshotAmountInputSchema = z.object({
    effectiveContractTotal: z.string().trim().min(1).max(64),
    receivableConfirmedTotal: z.string().trim().min(1).max(64),
    includedCostTotal: z.string().trim().min(1).max(64),
    originalBaselineCost: z.string().trim().min(1).max(64),
    currentEffectiveBaselineCost: z.string().trim().min(1).max(64),
    taxImpactSummary: z.string().trim().min(1).max(2000),
    taxImpactPendingAmount: z.string().trim().min(1).max(64).default('0'),
    allocationStabilitySummary: z.string().trim().min(1).max(2000).nullable().optional(),
    unmappedCostSummary: z.string().trim().min(1).max(2000).nullable().optional(),
    currentActionLevel: OperatingSnapshotActionLevelSchema,
    referencedBaselineVersion: z.string().trim().min(1).max(64),
    baselineSelectionSource: BaselineSelectionSourceSchema,
    handoverRebaselineRecordId: z.uuid().nullable().optional()
});

function assertOperatingSnapshotBaselineSelection(
    input: { baselineSelectionSource: 'original' | 'handover_rebaseline'; handoverRebaselineRecordId?: string | null },
    ctx: z.RefinementCtx
) {
    if (input.baselineSelectionSource === 'handover_rebaseline' && !input.handoverRebaselineRecordId) {
        ctx.addIssue({
            code: 'custom',
            path: ['handoverRebaselineRecordId'],
            message: 'handoverRebaselineRecordId is required when baselineSelectionSource is handover_rebaseline'
        });
    }

    if (input.baselineSelectionSource === 'original' && input.handoverRebaselineRecordId) {
        ctx.addIssue({
            code: 'custom',
            path: ['handoverRebaselineRecordId'],
            message: 'handoverRebaselineRecordId must be null when baselineSelectionSource is original'
        });
    }
}

export const CreateProjectOperatingSnapshotRequestSchema = OperatingSnapshotAmountInputSchema.extend({
    projectId: z.uuid(),
    snapshotMode: z.enum(['realtime', 'period-end']),
    sourceWindowStart: z.iso.date().nullable().optional(),
    sourceWindowEnd: z.iso.date().nullable().optional()
})
    .superRefine(assertOperatingSnapshotBaselineSelection)
    .meta({ id: 'CreateProjectOperatingSnapshotRequest' });

export type CreateProjectOperatingSnapshotRequest = z.infer<typeof CreateProjectOperatingSnapshotRequestSchema>;

export const ProjectOperatingSnapshotSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        snapshotMode: z.enum(['realtime', 'period-end', 'restated']),
        snapshotAt: z.iso.datetime(),
        sourceWindowStart: z.iso.date().nullable(),
        sourceWindowEnd: z.iso.date().nullable(),
        effectiveContractTotal: z.string(),
        receivableConfirmedTotal: z.string(),
        includedCostTotal: z.string(),
        originalBaselineCost: z.string(),
        currentEffectiveBaselineCost: z.string(),
        grossMarginAmount: z.string(),
        grossMarginRate: z.string().nullable(),
        taxImpactSummary: z.string(),
        taxImpactPendingAmount: z.string(),
        allocationStabilitySummary: z.string().nullable(),
        unmappedCostSummary: z.string().nullable(),
        currentActionLevel: OperatingSnapshotActionLevelSchema,
        referencedBaselineVersion: z.string(),
        baselineSelectionSource: BaselineSelectionSourceSchema,
        handoverRebaselineRecordId: z.uuid().nullable(),
        status: z.enum(['active', 'superseded', 'voided']),
        supersedesId: z.uuid().nullable(),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'ProjectOperatingSnapshotSummary' });

export type ProjectOperatingSnapshotSummary = z.infer<typeof ProjectOperatingSnapshotSummarySchema>;

export const CreatePeriodClosingSnapshotRequestSchema = OperatingSnapshotAmountInputSchema.extend({
    projectId: z.uuid(),
    periodKey: z.string().trim().min(1).max(32),
    expectedCurrentSnapshotVersion: z.number().int().positive().optional()
})
    .superRefine(assertOperatingSnapshotBaselineSelection)
    .meta({ id: 'CreatePeriodClosingSnapshotRequest' });

export type CreatePeriodClosingSnapshotRequest = z.infer<typeof CreatePeriodClosingSnapshotRequestSchema>;

export const PeriodClosingSnapshotSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        periodKey: z.string(),
        snapshotMode: z.literal('period-end'),
        snapshotAt: z.iso.datetime(),
        effectiveContractTotal: z.string(),
        receivableConfirmedTotal: z.string(),
        includedCostTotal: z.string(),
        originalBaselineCost: z.string(),
        currentEffectiveBaselineCost: z.string(),
        grossMarginAmount: z.string(),
        grossMarginRate: z.string().nullable(),
        taxImpactSummary: z.string(),
        taxImpactPendingAmount: z.string(),
        allocationStabilitySummary: z.string().nullable(),
        unmappedCostSummary: z.string().nullable(),
        currentActionLevel: OperatingSnapshotActionLevelSchema,
        referencedBaselineVersion: z.string(),
        baselineSelectionSource: BaselineSelectionSourceSchema,
        handoverRebaselineRecordId: z.uuid().nullable(),
        status: z.enum(['active', 'superseded', 'voided']),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'PeriodClosingSnapshotSummary' });

export type PeriodClosingSnapshotSummary = z.infer<typeof PeriodClosingSnapshotSummarySchema>;

const OperatingRestatementOverrideSchema = OperatingSnapshotAmountInputSchema.partial().extend({
    sourceWindowStart: z.iso.date().nullable().optional(),
    sourceWindowEnd: z.iso.date().nullable().optional()
});

export const CreateOperatingRestatementRequestSchema = z
    .object({
        projectId: z.uuid(),
        periodEndSnapshotId: z.uuid(),
        restatesSnapshotId: z.uuid(),
        restatementReason: z.string().trim().min(1).max(256),
        restatementSummary: z.string().trim().min(1).max(2000),
        restatedValues: OperatingRestatementOverrideSchema,
        expectedRestatesSnapshotVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'CreateOperatingRestatementRequest' });

export type CreateOperatingRestatementRequest = z.infer<typeof CreateOperatingRestatementRequestSchema>;

export const OperatingRestatementSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        periodEndSnapshotId: z.uuid(),
        restatesSnapshotId: z.uuid(),
        restatedSnapshotId: z.uuid(),
        restatementReason: z.string(),
        restatementSummary: z.string(),
        status: z.enum(['active', 'superseded', 'voided']),
        handledAt: z.iso.datetime(),
        handledBy: z.uuid().nullable(),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'OperatingRestatementSummary' });

export type OperatingRestatementSummary = z.infer<typeof OperatingRestatementSummarySchema>;

export const OperatingRestatementListViewSchema = z
    .array(OperatingRestatementSummarySchema)
    .meta({ id: 'OperatingRestatementListView' });

export type OperatingRestatementListView = z.infer<typeof OperatingRestatementListViewSchema>;

export const SharedCostAllocationShareItemSchema = z.object({
    projectId: z.uuid(),
    allocatedAmount: z.string().trim().min(1).max(64),
    allocationRatio: z.string().trim().min(1).max(64).nullable().optional(),
    allocationSummary: z.string().trim().min(1).max(1000).nullable().optional()
});

export const ConfirmSharedCostAllocationBasisRequestSchema = z
    .object({
        basisType: z.string().trim().min(1).max(64),
        sourceCostRecordIds: z.array(z.uuid()).min(1),
        allocationMethod: z.string().trim().min(1).max(64),
        projectShareItems: z.array(SharedCostAllocationShareItemSchema).min(1),
        basisSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        comment: z.string().trim().min(1).max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ConfirmSharedCostAllocationBasisRequest' });

export type ConfirmSharedCostAllocationBasisRequest = z.infer<typeof ConfirmSharedCostAllocationBasisRequestSchema>;

export const ReplaceSharedCostAllocationResultRequestSchema = z
    .object({
        supersededAllocationResultId: z.uuid(),
        allocatedAmount: z.string().trim().min(1).max(64),
        allocationRatio: z.string().trim().min(1).max(64).nullable().optional(),
        allocationSummary: z.string().trim().min(1).max(1000).nullable().optional(),
        replacementReason: z.string().trim().min(1).max(256),
        comment: z.string().trim().min(1).max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ReplaceSharedCostAllocationResultRequest' });

export type ReplaceSharedCostAllocationResultRequest = z.infer<typeof ReplaceSharedCostAllocationResultRequestSchema>;

export const SharedCostAllocationResultSummarySchema = z
    .object({
        id: z.uuid(),
        basisId: z.uuid(),
        projectId: z.uuid(),
        allocatedAmount: z.string(),
        allocationRatio: z.string().nullable(),
        allocationSummary: z.string().nullable(),
        status: z.enum(['pending', 'active', 'superseded', 'voided']),
        effectiveAt: z.iso.datetime().nullable(),
        supersedesId: z.uuid().nullable(),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'SharedCostAllocationResultSummary' });

export type SharedCostAllocationResultSummary = z.infer<typeof SharedCostAllocationResultSummarySchema>;

export const SharedCostAllocationBasisSummarySchema = z
    .object({
        id: z.uuid(),
        sourceCostScopeKey: z.string(),
        basisType: z.string(),
        allocationMethod: z.string(),
        basisSummary: z.string().nullable(),
        status: z.enum(['pending', 'active', 'superseded', 'voided']),
        effectiveAt: z.iso.datetime().nullable(),
        effectiveBy: z.uuid().nullable(),
        supersedesId: z.uuid().nullable(),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
        results: z.array(SharedCostAllocationResultSummarySchema)
    })
    .meta({ id: 'SharedCostAllocationBasisSummary' });

export type SharedCostAllocationBasisSummary = z.infer<typeof SharedCostAllocationBasisSummarySchema>;

export const SharedCostAllocationResultListViewSchema = z
    .array(SharedCostAllocationResultSummarySchema)
    .meta({ id: 'SharedCostAllocationResultListView' });

export type SharedCostAllocationResultListView = z.infer<typeof SharedCostAllocationResultListViewSchema>;

export const ConfirmCostStageAttributionRequestSchema = z
    .object({
        costRecordId: z.uuid(),
        stageAttributionMode: z.enum(['auto', 'manual']),
        attributedStage: z.string().trim().min(1).max(64),
        lockedBySnapshotId: z.uuid().nullable().optional(),
        attributionSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        comment: z.string().trim().min(1).max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ConfirmCostStageAttributionRequest' });

export type ConfirmCostStageAttributionRequest = z.infer<typeof ConfirmCostStageAttributionRequestSchema>;

export const ReclassifyCostStageAttributionRequestSchema = z
    .object({
        supersededAttributionId: z.uuid(),
        newAttributedStage: z.string().trim().min(1).max(64),
        lockedBySnapshotId: z.uuid().nullable().optional(),
        reclassifyReason: z.string().trim().min(1).max(256),
        comment: z.string().trim().min(1).max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ReclassifyCostStageAttributionRequest' });

export type ReclassifyCostStageAttributionRequest = z.infer<typeof ReclassifyCostStageAttributionRequestSchema>;

export const CostStageAttributionSnapshotSummarySchema = z
    .object({
        id: z.uuid(),
        costRecordId: z.uuid(),
        attributedStage: z.string(),
        attributionMode: z.enum(['auto', 'manual', 'reclassified']),
        lockedBySnapshotId: z.uuid().nullable(),
        attributionSummary: z.string().nullable(),
        status: z.enum(['active', 'superseded', 'voided']),
        supersedesId: z.uuid().nullable(),
        handledAt: z.iso.datetime().nullable(),
        handledBy: z.uuid().nullable(),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'CostStageAttributionSnapshotSummary' });

export type CostStageAttributionSnapshotSummary = z.infer<typeof CostStageAttributionSnapshotSummarySchema>;

export const CostStageAttributionHistoryViewSchema = z
    .array(CostStageAttributionSnapshotSummarySchema)
    .meta({ id: 'CostStageAttributionHistoryView' });

export type CostStageAttributionHistoryView = z.infer<typeof CostStageAttributionHistoryViewSchema>;

export const ConfirmAccountingTaxTreatmentRequestSchema = z
    .object({
        projectId: z.uuid(),
        taxTreatmentType: z.string().trim().min(1).max(64),
        deductibilityStatus: z.string().trim().min(1).max(32),
        taxImpactAmount: z.string().trim().min(1).max(64),
        taxImpactSummary: z.string().trim().min(1).max(2000),
        taxPendingFlag: z.boolean().default(false),
        taxImpactPendingAmount: z.string().trim().min(1).max(64).default('0'),
        basisSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        supersedesTaxTreatmentSnapshotId: z.uuid().nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ConfirmAccountingTaxTreatmentRequest' });

export type ConfirmAccountingTaxTreatmentRequest = z.infer<typeof ConfirmAccountingTaxTreatmentRequestSchema>;

export const AccountingTaxTreatmentSnapshotSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        taxTreatmentType: z.string(),
        deductibilityStatus: z.string(),
        taxImpactAmount: z.string(),
        taxPendingFlag: z.boolean(),
        taxImpactSummary: z.string(),
        taxImpactPendingAmount: z.string(),
        basisSummary: z.string().nullable(),
        status: z.enum(['pending', 'active', 'superseded', 'voided']),
        supersedesId: z.uuid().nullable(),
        confirmedAt: z.iso.datetime().nullable(),
        confirmedBy: z.uuid().nullable(),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'AccountingTaxTreatmentSnapshotSummary' });

export type AccountingTaxTreatmentSnapshotSummary = z.infer<typeof AccountingTaxTreatmentSnapshotSummarySchema>;

export const AccountingTaxTreatmentListViewSchema = z
    .array(AccountingTaxTreatmentSnapshotSummarySchema)
    .meta({ id: 'AccountingTaxTreatmentListView' });

export type AccountingTaxTreatmentListView = z.infer<typeof AccountingTaxTreatmentListViewSchema>;

export const RegisterPaymentFactCostRecordRequestSchema = z
    .object({
        paymentRecordId: z.uuid(),
        projectId: z.uuid(),
        costDescription: z.string().trim().min(1).max(1000).nullable().optional(),
        evidenceSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'RegisterPaymentFactCostRecordRequest' });

export type RegisterPaymentFactCostRecordRequest = z.infer<typeof RegisterPaymentFactCostRecordRequestSchema>;

export const RegisterInvoiceCostRecordRequestSchema = z
    .object({
        invoiceRecordId: z.uuid(),
        projectId: z.uuid(),
        costDescription: z.string().trim().min(1).max(1000).nullable().optional(),
        evidenceSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        taxImpactSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'RegisterInvoiceCostRecordRequest' });

export type RegisterInvoiceCostRecordRequest = z.infer<typeof RegisterInvoiceCostRecordRequestSchema>;

export const RegisterExpenseCostRecordRequestSchema = z
    .object({
        expenseRecordId: z.uuid(),
        projectId: z.uuid(),
        costDescription: z.string().trim().min(1).max(1000).nullable().optional(),
        evidenceSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        taxImpactSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'RegisterExpenseCostRecordRequest' });

export type RegisterExpenseCostRecordRequest = z.infer<typeof RegisterExpenseCostRecordRequestSchema>;

export const RegisterProcurementCostRecordRequestSchema = z
    .object({
        payableRecordId: z.uuid(),
        projectId: z.uuid(),
        costDescription: z.string().trim().min(1).max(1000).nullable().optional(),
        evidenceSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        taxImpactSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'RegisterProcurementCostRecordRequest' });

export type RegisterProcurementCostRecordRequest = z.infer<typeof RegisterProcurementCostRecordRequestSchema>;

export const RegisterLaborCostRecordRequestSchema = z
    .object({
        projectId: z.uuid(),
        laborPersonId: z.uuid().nullable().optional(),
        laborRole: z.string().nullable().optional(),
        laborPeriodType: z.enum(['WEEK', 'MONTH']),
        laborPeriodStart: z.iso.date(),
        laborPeriodEnd: z.iso.date(),
        actualHours: z.string().trim().min(1).max(64).nullable().optional(),
        actualPersonDays: z.string().trim().min(1).max(64).nullable().optional(),
        workSummary: z.string().trim().min(1).max(1000).nullable().optional(),
        rateVersionId: z.uuid(),
        costDescription: z.string().nullable().optional(),
        attachmentIds: z.array(z.uuid()).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'RegisterLaborCostRecordRequest' });

export type RegisterLaborCostRecordRequest = z.infer<typeof RegisterLaborCostRecordRequestSchema>;

export const ReplaceLaborCostRecordRequestSchema = z
    .object({
        supersedesRecordId: z.uuid(),
        laborPeriodStart: z.iso.date(),
        laborPeriodEnd: z.iso.date(),
        actualHours: z.string().trim().min(1).max(64).nullable().optional(),
        actualPersonDays: z.string().trim().min(1).max(64).nullable().optional(),
        workSummary: z.string().trim().min(1).max(1000).nullable().optional(),
        rateVersionId: z.uuid(),
        replaceReason: z.string().trim().min(1).max(256),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ReplaceLaborCostRecordRequest' });

export type ReplaceLaborCostRecordRequest = z.infer<typeof ReplaceLaborCostRecordRequestSchema>;
