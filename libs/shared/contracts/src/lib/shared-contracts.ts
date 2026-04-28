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
    'contract:finance:sensitive:read',
    'operating:finance:sensitive:read',
    'commission:amount:sensitive:read',
    'labor-cost-rate:sensitive:read',
    'exception-approval-opinion:sensitive:read',
    // 线索
    'lead:read',
    'lead:write',
    // 项目
    'project:read',
    'project:write',
    'project:delete',
    // 导航可见性（仅影响菜单展示，不代替后端业务权限）
    'nav:dashboard:view',
    'nav:platform:view',
    'nav:leads:view',
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
    'contract:finance:sensitive:read': { description: '查看合同资金敏感字段', group: '敏感字段' },
    'operating:finance:sensitive:read': { description: '查看经营核算敏感字段', group: '敏感字段' },
    'commission:amount:sensitive:read': { description: '查看提成金额敏感字段', group: '敏感字段' },
    'labor-cost-rate:sensitive:read': { description: '查看人力成本率敏感字段', group: '敏感字段' },
    'exception-approval-opinion:sensitive:read': { description: '查看例外审批与保留意见敏感字段', group: '敏感字段' },
    'lead:read': { description: '查看销售线索', group: '线索' },
    'lead:write': { description: '登记/维护销售线索', group: '线索' },
    'project:read': { description: '查看项目', group: '项目' },
    'project:write': { description: '创建/编辑项目', group: '项目' },
    'project:delete': { description: '删除项目', group: '项目' },
    'nav:dashboard:view': { description: '查看工作台菜单', group: '导航' },
    'nav:platform:view': { description: '查看平台管理菜单', group: '导航' },
    'nav:leads:view': { description: '查看线索菜单', group: '导航' },
    'nav:projects:view': { description: '查看项目菜单', group: '导航' },
    'nav:contracts:view': { description: '查看合同菜单', group: '导航' },
    'nav:profile:view': { description: '查看个人中心菜单', group: '导航' }
};

// ---------------------------------------------------------------------------
// Sensitive Field Projection
// ---------------------------------------------------------------------------

export const SENSITIVE_FIELD_PACKAGE_KEYS = [
    'contract-finance',
    'operating-finance',
    'commission-compensation',
    'labor-cost-rate',
    'exception-approval-opinion'
] as const;

export type SensitiveFieldPackageKey = (typeof SENSITIVE_FIELD_PACKAGE_KEYS)[number];

export const SensitiveFieldPackageKeySchema = z.enum(SENSITIVE_FIELD_PACKAGE_KEYS).meta({ id: 'SensitiveFieldPackageKey' });

export const SENSITIVE_FIELD_PACKAGE_REQUIRED_PERMISSIONS: Record<SensitiveFieldPackageKey, PermissionKey> = {
    'contract-finance': 'contract:finance:sensitive:read',
    'operating-finance': 'operating:finance:sensitive:read',
    'commission-compensation': 'commission:amount:sensitive:read',
    'labor-cost-rate': 'labor-cost-rate:sensitive:read',
    'exception-approval-opinion': 'exception-approval-opinion:sensitive:read'
};

export const SENSITIVE_PROJECTION_MODES = ['full', 'summary', 'masked', 'denied'] as const;

export type SensitiveProjectionMode = (typeof SENSITIVE_PROJECTION_MODES)[number];

export const SensitiveProjectionModeSchema = z.enum(SENSITIVE_PROJECTION_MODES).meta({ id: 'SensitiveProjectionMode' });

export const SENSITIVE_PROJECTION_REASON_CODES = ['allowed', 'summary-only', 'missing-sensitive-read-permission', 'field-package-not-applicable'] as const;

export type SensitiveProjectionReasonCode = (typeof SENSITIVE_PROJECTION_REASON_CODES)[number];

export const SensitiveProjectionReasonCodeSchema = z.enum(SENSITIVE_PROJECTION_REASON_CODES).meta({ id: 'SensitiveProjectionReasonCode' });

export const SensitiveStringFieldProjectionSchema = z
    .object({
        fieldPackageKey: SensitiveFieldPackageKeySchema,
        mode: SensitiveProjectionModeSchema,
        value: z.string().nullable(),
        displayText: z.string().min(1).max(2000),
        reasonCode: SensitiveProjectionReasonCodeSchema
    })
    .superRefine((input, ctx) => {
        if ((input.mode === 'masked' || input.mode === 'denied') && input.value !== null) {
            ctx.addIssue({
                code: 'custom',
                path: ['value'],
                message: 'value must be null when sensitive projection mode is masked or denied'
            });
        }

        if ((input.mode === 'masked' || input.mode === 'denied') && input.reasonCode === 'allowed') {
            ctx.addIssue({
                code: 'custom',
                path: ['reasonCode'],
                message: 'reasonCode cannot be allowed when sensitive projection mode is masked or denied'
            });
        }
    })
    .meta({ id: 'SensitiveStringFieldProjection' });

export type SensitiveStringFieldProjection = z.infer<typeof SensitiveStringFieldProjectionSchema>;

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

export const UpdateCurrentUserProfileRequestSchema = z
    .object({
        displayName: z.string().trim().min(1).max(128).optional(),
        email: z.string().trim().email().nullable().optional(),
        phone: z.string().trim().min(1).max(64).nullable().optional()
    })
    .strict()
    .meta({ id: 'UpdateCurrentUserProfileRequest' });

export type UpdateCurrentUserProfileRequest = z.infer<typeof UpdateCurrentUserProfileRequestSchema>;

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
// Lead
// ---------------------------------------------------------------------------

export const LEAD_STATUSES = ['registered', 'qualified', 'converted', 'closed'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LeadStatusSchema = z.enum(LEAD_STATUSES).meta({ id: 'LeadStatus' });

export const LeadSummarySchema = z
    .object({
        id: z.uuid(),
        leadNo: z.string(),
        leadName: z.string(),
        customerName: z.string(),
        sourceChannel: z.string().nullable(),
        status: LeadStatusSchema,
        ownerOrgId: z.uuid().nullable(),
        ownerUserId: z.uuid().nullable(),
        qualificationSummary: z.string().nullable(),
        qualifiedAt: z.iso.datetime().nullable(),
        qualifiedBy: z.uuid().nullable(),
        closedReason: z.string().nullable(),
        closedAt: z.iso.datetime().nullable(),
        closedBy: z.uuid().nullable(),
        convertedProjectId: z.uuid().nullable(),
        convertedAt: z.iso.datetime().nullable(),
        convertedBy: z.uuid().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'LeadSummary' });

export type LeadSummary = z.infer<typeof LeadSummarySchema>;

export const LeadListViewSchema = z
    .object({
        id: z.uuid(),
        leadNo: z.string(),
        leadName: z.string(),
        customerName: z.string(),
        sourceChannel: z.string().nullable(),
        status: LeadStatusSchema,
        ownerName: z.string().nullable(),
        ownerOrgName: z.string().nullable(),
        qualifiedAt: z.iso.datetime().nullable(),
        convertedProjectId: z.uuid().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'LeadListView' });

export type LeadListView = z.infer<typeof LeadListViewSchema>;

export const LeadListSchema = z.array(LeadListViewSchema).meta({ id: 'LeadList' });

export type LeadList = z.infer<typeof LeadListSchema>;

export const LeadConvertedProjectSummarySchema = z
    .object({
        id: z.uuid(),
        projectNo: z.string(),
        projectName: z.string(),
        status: z.string(),
        currentStage: z.string()
    })
    .meta({ id: 'LeadConvertedProjectSummary' });

export type LeadConvertedProjectSummary = z.infer<typeof LeadConvertedProjectSummarySchema>;

export const LeadDetailViewSchema = LeadSummarySchema.extend({
    ownerName: z.string().nullable(),
    ownerOrgName: z.string().nullable(),
    sourceSummary: z.string().nullable(),
    convertedProjectSummary: LeadConvertedProjectSummarySchema.nullable()
}).meta({ id: 'LeadDetailView' });

export type LeadDetailView = z.infer<typeof LeadDetailViewSchema>;

export const CreateLeadRequestSchema = z
    .object({
        leadName: z.string().trim().min(1).max(255),
        customerName: z.string().trim().min(1).max(255),
        sourceChannel: z.string().trim().min(1).max(64).nullable().optional(),
        ownerOrgId: z.uuid().nullable().optional(),
        ownerUserId: z.uuid().nullable().optional()
    })
    .meta({ id: 'CreateLeadRequest' });

export type CreateLeadRequest = z.infer<typeof CreateLeadRequestSchema>;

export const UpdateLeadRequestSchema = z
    .object({
        leadName: z.string().trim().min(1).max(255).optional(),
        customerName: z.string().trim().min(1).max(255).optional(),
        sourceChannel: z.string().trim().min(1).max(64).nullable().optional(),
        ownerOrgId: z.uuid().nullable().optional(),
        ownerUserId: z.uuid().nullable().optional()
    })
    .refine(
        (value) =>
            value.leadName !== undefined ||
            value.customerName !== undefined ||
            value.sourceChannel !== undefined ||
            value.ownerOrgId !== undefined ||
            value.ownerUserId !== undefined,
        {
            message: 'At least one field is required for update'
        }
    )
    .meta({ id: 'UpdateLeadRequest' });

export type UpdateLeadRequest = z.infer<typeof UpdateLeadRequestSchema>;

export const QualifyLeadRequestSchema = z
    .object({
        qualificationSummary: z.string().trim().min(1).max(2000)
    })
    .meta({ id: 'QualifyLeadRequest' });

export type QualifyLeadRequest = z.infer<typeof QualifyLeadRequestSchema>;

export const CloseLeadRequestSchema = z
    .object({
        closedReason: z.string().trim().min(1).max(1000)
    })
    .meta({ id: 'CloseLeadRequest' });

export type CloseLeadRequest = z.infer<typeof CloseLeadRequestSchema>;

export const ConvertLeadToProjectRequestSchema = z
    .object({
        projectName: z.string().trim().min(1).max(255).optional(),
        customerProjectNo: z.string().trim().min(1).max(128).nullable().optional(),
        plannedSignAt: z.iso.datetime().nullable().optional()
    })
    .meta({ id: 'ConvertLeadToProjectRequest' });

export type ConvertLeadToProjectRequest = z.infer<typeof ConvertLeadToProjectRequestSchema>;

export const LeadListQuerySchema = z
    .object({
        status: LeadStatusSchema.optional(),
        ownerOrgId: z.uuid().optional(),
        keyword: z.string().trim().min(1).max(128).optional()
    })
    .meta({ id: 'LeadListQuery' });

export type LeadListQuery = z.infer<typeof LeadListQuerySchema>;

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export const PROJECT_STAGES = [
    'assessment',
    'scope-confirmation',
    'commercial-closure',
    'contracting',
    'handover',
    'execution',
    'acceptance',
    'completed',
    'closed-lost',
    'closed-terminated'
] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const PROJECT_STATUSES = ['active', 'pending-approval', 'blocked', 'on-hold', 'completed', 'closed'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ProjectSummarySchema = z
    .object({
        id: z.uuid(),
        projectNo: z.string(),
        projectName: z.string(),
        sourceLeadId: z.uuid().nullable(),
        customerId: z.uuid().nullable(),
        customerName: z.string().nullable(),
        customerProjectNo: z.string().nullable(),
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

export const ProjectListViewSchema = z
    .object({
        id: z.uuid(),
        projectNo: z.string(),
        projectName: z.string(),
        customerName: z.string().nullable(),
        customerProjectNo: z.string().nullable(),
        currentStage: z.string(),
        status: z.string(),
        ownerOrgName: z.string().nullable(),
        ownerName: z.string().nullable(),
        latestMilestoneAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime()
    })
    .meta({ id: 'ProjectListView' });

export type ProjectListView = z.infer<typeof ProjectListViewSchema>;

export const ProjectListSchema = z.array(ProjectListViewSchema).meta({ id: 'ProjectList' });

export type ProjectList = z.infer<typeof ProjectListSchema>;

export const ProjectDetailStageSummarySchema = z
    .object({
        currentStage: z.string(),
        status: z.string(),
        plannedSignAt: z.iso.datetime().nullable(),
        closedAt: z.iso.datetime().nullable(),
        closedReason: z.string().nullable(),
        blockingReasons: z.array(z.string())
    })
    .meta({ id: 'ProjectDetailStageSummary' });

export type ProjectDetailStageSummary = z.infer<typeof ProjectDetailStageSummarySchema>;

export const ProjectDetailBidSummarySchema = z
    .object({
        bidProcessId: z.uuid().nullable(),
        bidStatus: z.string(),
        resultStatus: z.string().nullable(),
        tenderNo: z.string().nullable(),
        bidPackageNo: z.string().nullable(),
        summary: z.string().nullable()
    })
    .meta({ id: 'ProjectDetailBidSummary' });

export type ProjectDetailBidSummary = z.infer<typeof ProjectDetailBidSummarySchema>;

export const ProjectDetailContractSummarySchema = z
    .object({
        activeContractCount: z.number().int().nonnegative(),
        latestContractId: z.uuid().nullable(),
        latestContractNo: z.string().nullable(),
        latestContractStatus: z.string().nullable(),
        signedAmount: z.string().nullable(),
        signedAmountProjection: SensitiveStringFieldProjectionSchema,
        currencyCode: z.string().nullable(),
        signedAt: z.iso.datetime().nullable(),
        currentSnapshotId: z.uuid().nullable()
    })
    .meta({ id: 'ProjectDetailContractSummary' });

export type ProjectDetailContractSummary = z.infer<typeof ProjectDetailContractSummarySchema>;

export const ProjectDetailApprovalSummarySchema = z
    .object({
        summarySnapshotId: z.uuid().nullable(),
        summaryPackageKey: z.string().nullable(),
        projectionLevel: z.string().nullable(),
        exportPolicy: z.string().nullable(),
        generatedAt: z.iso.datetime().nullable()
    })
    .meta({ id: 'ProjectDetailApprovalSummary' });

export type ProjectDetailApprovalSummary = z.infer<typeof ProjectDetailApprovalSummarySchema>;

export const ProjectDetailConfirmationSummarySchema = z
    .object({
        confirmationRecordId: z.uuid().nullable(),
        status: z.string(),
        requiredCount: z.number().int().nonnegative(),
        confirmedCount: z.number().int().nonnegative(),
        pendingCount: z.number().int().nonnegative(),
        confirmedAt: z.iso.datetime().nullable()
    })
    .meta({ id: 'ProjectDetailConfirmationSummary' });

export type ProjectDetailConfirmationSummary = z.infer<typeof ProjectDetailConfirmationSummarySchema>;

export const ProjectSourceLeadSummarySchema = z
    .object({
        id: z.uuid(),
        leadNo: z.string(),
        leadName: z.string(),
        customerName: z.string(),
        status: LeadStatusSchema
    })
    .meta({ id: 'ProjectSourceLeadSummary' });

export type ProjectSourceLeadSummary = z.infer<typeof ProjectSourceLeadSummarySchema>;

export const ProjectDetailViewSchema = ProjectSummarySchema.extend({
    ownerName: z.string().nullable(),
    ownerOrgName: z.string().nullable(),
    sourceLeadSummary: ProjectSourceLeadSummarySchema.nullable(),
    stageSummary: ProjectDetailStageSummarySchema,
    currentBidSummary: ProjectDetailBidSummarySchema,
    currentContractSummary: ProjectDetailContractSummarySchema,
    currentApprovalSummary: ProjectDetailApprovalSummarySchema,
    currentConfirmationSummary: ProjectDetailConfirmationSummarySchema,
    summarySnapshotId: z.uuid().nullable(),
    projectionLevel: z.string().nullable(),
    exportPolicy: z.string().nullable(),
    allowedActions: z.array(z.string()),
    generatedAt: z.iso.datetime()
}).meta({ id: 'ProjectDetailView' });

export type ProjectDetailView = z.infer<typeof ProjectDetailViewSchema>;

export const ProjectWorkspaceBasisSummarySchema = z
    .object({
        summarySnapshotId: z.uuid().nullable(),
        projectionLevel: z.string().nullable(),
        exportPolicy: z.string().nullable(),
        generatedAt: z.iso.datetime().nullable()
    })
    .meta({ id: 'ProjectWorkspaceBasisSummary' });

export type ProjectWorkspaceBasisSummary = z.infer<typeof ProjectWorkspaceBasisSummarySchema>;

export const ProjectWorkspaceEntryViewSchema = z
    .object({
        key: z.string(),
        label: z.string(),
        description: z.string(),
        route: z.string().nullable(),
        enabled: z.boolean(),
        disabledReason: z.string().nullable(),
        actionKey: z.string().nullable()
    })
    .meta({ id: 'ProjectWorkspaceEntryView' });

export type ProjectWorkspaceEntryView = z.infer<typeof ProjectWorkspaceEntryViewSchema>;

export const ProjectWorkspaceGuidanceViewSchema = z
    .object({
        projectId: z.uuid(),
        currentStage: z.string(),
        status: z.string(),
        currentStageLabel: z.string(),
        statusLabel: z.string(),
        headline: z.string(),
        currentFocus: z.string(),
        currentGap: z.string(),
        nextStep: z.string(),
        ownerLabel: z.string(),
        blockingReasons: z.array(z.string()),
        basisSummary: ProjectWorkspaceBasisSummarySchema,
        recommendedEntries: z.array(ProjectWorkspaceEntryViewSchema),
        generatedAt: z.iso.datetime()
    })
    .meta({ id: 'ProjectWorkspaceGuidanceView' });

export type ProjectWorkspaceGuidanceView = z.infer<typeof ProjectWorkspaceGuidanceViewSchema>;

export const TECHNICAL_FEASIBILITY_DECISIONS = ['feasible', 'conditional', 'not-feasible'] as const;

export type TechnicalFeasibilityDecision = (typeof TECHNICAL_FEASIBILITY_DECISIONS)[number];

export const TECHNICAL_SCOPE_ITEM_TYPES = ['in-scope', 'out-of-scope', 'assumption'] as const;

export type TechnicalScopeItemType = (typeof TECHNICAL_SCOPE_ITEM_TYPES)[number];

export const PRESIGNING_RISK_LEVELS = ['R1', 'R2', 'R3', 'R4'] as const;

export type PreSigningRiskLevel = (typeof PRESIGNING_RISK_LEVELS)[number];

export const PRESIGNING_RISK_STATUSES = ['open', 'mitigating', 'accepted', 'closed'] as const;

export type PreSigningRiskStatus = (typeof PRESIGNING_RISK_STATUSES)[number];

export const COST_ESTIMATE_CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;

export type CostEstimateConfidenceLevel = (typeof COST_ESTIMATE_CONFIDENCE_LEVELS)[number];

export const TAX_REVIEW_STATUSES = ['pending', 'reviewed', 'not-required'] as const;

export type TaxReviewStatus = (typeof TAX_REVIEW_STATUSES)[number];

export const PROJECT_TECHNICAL_COST_PACKAGE_STATUSES = ['effective', 'superseded'] as const;

export type ProjectTechnicalCostPackageStatus = (typeof PROJECT_TECHNICAL_COST_PACKAGE_STATUSES)[number];

const NonNegativeDecimalStringSchema = z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/);

const NonNegativeMoneyStringSchema = z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/);

const NonNegativeRatioStringSchema = z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,8})?$/);

const SignedRatioStringSchema = z
    .string()
    .trim()
    .regex(/^-?\d+(\.\d{1,8})?$/);

export const ProjectTechnicalScopeItemInputSchema = z
    .object({
        scopeType: z.enum(TECHNICAL_SCOPE_ITEM_TYPES),
        label: z.string().trim().min(1).max(255),
        description: z.string().trim().min(1).max(2000),
        sortOrder: z.number().int().nonnegative().optional()
    })
    .meta({ id: 'ProjectTechnicalScopeItemInput' });

export type ProjectTechnicalScopeItemInput = z.infer<typeof ProjectTechnicalScopeItemInputSchema>;

export const ProjectTechnicalRiskItemInputSchema = z
    .object({
        riskCategory: z.string().trim().min(1).max(128),
        riskLevel: z.enum(PRESIGNING_RISK_LEVELS),
        riskDescription: z.string().trim().min(1).max(2000),
        impactScope: z.string().trim().min(1).max(1000),
        mitigationPlan: z.string().trim().min(1).max(2000),
        ownerRole: z.string().trim().min(1).max(128),
        riskStatus: z.enum(PRESIGNING_RISK_STATUSES),
        blocksNextStage: z.boolean(),
        sortOrder: z.number().int().nonnegative().optional()
    })
    .meta({ id: 'ProjectTechnicalRiskItemInput' });

export type ProjectTechnicalRiskItemInput = z.infer<typeof ProjectTechnicalRiskItemInputSchema>;

export const ProjectTechnicalCostItemInputSchema = z
    .object({
        costCategory: z.string().trim().min(1).max(128),
        costSubcategory: z.string().trim().min(1).max(128).nullable().optional(),
        costDescription: z.string().trim().min(1).max(2000),
        estimationBasis: z.string().trim().min(1).max(2000),
        quantity: NonNegativeDecimalStringSchema.nullable().optional(),
        unit: z.string().trim().min(1).max(32).nullable().optional(),
        unitPrice: NonNegativeDecimalStringSchema.nullable().optional(),
        amountExcludingTax: NonNegativeMoneyStringSchema,
        taxCostAmount: NonNegativeMoneyStringSchema,
        amountIncludingTax: NonNegativeMoneyStringSchema,
        currencyCode: z.string().trim().min(3).max(16),
        confidenceLevel: z.enum(COST_ESTIMATE_CONFIDENCE_LEVELS),
        highUncertainty: z.boolean(),
        responsibleRole: z.string().trim().min(1).max(128).nullable().optional(),
        sortOrder: z.number().int().nonnegative().optional()
    })
    .meta({ id: 'ProjectTechnicalCostItemInput' });

export type ProjectTechnicalCostItemInput = z.infer<typeof ProjectTechnicalCostItemInputSchema>;

export const CreateProjectTechnicalCostPackageRequestSchema = z
    .object({
        technicalFeasibilityDecision: z.enum(TECHNICAL_FEASIBILITY_DECISIONS),
        technicalConclusionSummary: z.string().trim().min(1).max(2000),
        allowNextStage: z.boolean(),
        currencyCode: z.string().trim().min(3).max(16),
        taxAssumptionSummary: z.string().trim().min(1).max(2000),
        taxReviewStatus: z.enum(TAX_REVIEW_STATUSES),
        scopeItems: z.array(ProjectTechnicalScopeItemInputSchema).default([]),
        riskItems: z.array(ProjectTechnicalRiskItemInputSchema).default([]),
        costItems: z.array(ProjectTechnicalCostItemInputSchema).min(1)
    })
    .meta({ id: 'CreateProjectTechnicalCostPackageRequest' });

export type CreateProjectTechnicalCostPackageRequest = z.infer<typeof CreateProjectTechnicalCostPackageRequestSchema>;

export const ProjectTechnicalScopeItemViewSchema = ProjectTechnicalScopeItemInputSchema.extend({
    id: z.uuid(),
    packageId: z.uuid(),
    sortOrder: z.number().int().nonnegative()
}).meta({ id: 'ProjectTechnicalScopeItemView' });

export type ProjectTechnicalScopeItemView = z.infer<typeof ProjectTechnicalScopeItemViewSchema>;

export const ProjectTechnicalRiskItemViewSchema = ProjectTechnicalRiskItemInputSchema.extend({
    id: z.uuid(),
    packageId: z.uuid(),
    sortOrder: z.number().int().nonnegative()
}).meta({ id: 'ProjectTechnicalRiskItemView' });

export type ProjectTechnicalRiskItemView = z.infer<typeof ProjectTechnicalRiskItemViewSchema>;

export const ProjectTechnicalCostItemViewSchema = ProjectTechnicalCostItemInputSchema.extend({
    id: z.uuid(),
    packageId: z.uuid(),
    costSubcategory: z.string().nullable(),
    quantity: z.string().nullable(),
    unit: z.string().nullable(),
    unitPrice: z.string().nullable(),
    responsibleRole: z.string().nullable(),
    sortOrder: z.number().int().nonnegative()
}).meta({ id: 'ProjectTechnicalCostItemView' });

export type ProjectTechnicalCostItemView = z.infer<typeof ProjectTechnicalCostItemViewSchema>;

export const ProjectTechnicalCostPackageSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        version: z.number().int().positive(),
        isCurrent: z.boolean(),
        supersedesId: z.uuid().nullable(),
        status: z.enum(PROJECT_TECHNICAL_COST_PACKAGE_STATUSES),
        technicalFeasibilityDecision: z.enum(TECHNICAL_FEASIBILITY_DECISIONS),
        technicalConclusionSummary: z.string(),
        allowNextStage: z.boolean(),
        currencyCode: z.string(),
        totalEstimatedAmountExcludingTax: z.string(),
        totalTaxCostAmount: z.string(),
        totalEstimatedAmountIncludingTax: z.string(),
        taxAssumptionSummary: z.string(),
        taxReviewStatus: z.enum(TAX_REVIEW_STATUSES),
        highestRiskLevel: z.enum(PRESIGNING_RISK_LEVELS).nullable(),
        blockerCount: z.number().int().nonnegative(),
        effectiveAt: z.iso.datetime(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable(),
        rowVersion: z.number().int()
    })
    .meta({ id: 'ProjectTechnicalCostPackageSummary' });

export type ProjectTechnicalCostPackageSummary = z.infer<typeof ProjectTechnicalCostPackageSummarySchema>;

export const ProjectTechnicalCostPackageListSchema = z
    .array(ProjectTechnicalCostPackageSummarySchema)
    .meta({ id: 'ProjectTechnicalCostPackageList' });

export type ProjectTechnicalCostPackageList = z.infer<typeof ProjectTechnicalCostPackageListSchema>;

export const ProjectTechnicalCostWorkspaceViewSchema = z
    .object({
        projectId: z.uuid(),
        currentStage: z.string(),
        status: z.string(),
        currentPackage: ProjectTechnicalCostPackageSummarySchema.nullable(),
        scopeItems: z.array(ProjectTechnicalScopeItemViewSchema),
        riskItems: z.array(ProjectTechnicalRiskItemViewSchema),
        costItems: z.array(ProjectTechnicalCostItemViewSchema),
        blockingReasons: z.array(z.string()),
        nextStep: z.string(),
        ownerLabel: z.string(),
        allowedActions: z.array(z.string()),
        generatedAt: z.iso.datetime()
    })
    .meta({ id: 'ProjectTechnicalCostWorkspaceView' });

export type ProjectTechnicalCostWorkspaceView = z.infer<typeof ProjectTechnicalCostWorkspaceViewSchema>;

export const BID_COMMERCIAL_MODES = [
    'public-tender',
    'invitation',
    'comparison',
    'commercial-negotiation',
    'competitive-negotiation',
    'direct-commercial',
    'not-required'
] as const;

export type BidCommercialMode = (typeof BID_COMMERCIAL_MODES)[number];

export const BID_COMMERCIAL_STAGES = [
    'not-started',
    'preparation',
    'submitted',
    'negotiating',
    'result-confirmed',
    'closed'
] as const;

export type BidCommercialStage = (typeof BID_COMMERCIAL_STAGES)[number];

export const BID_COMMERCIAL_DECISIONS = ['pending', 'participate', 'no-bid', 'not-required'] as const;

export type BidCommercialDecision = (typeof BID_COMMERCIAL_DECISIONS)[number];

export const BID_COMMERCIAL_RESULT_STATUSES = ['pending', 'won', 'lost', 'cancelled', 'not-applicable'] as const;

export type BidCommercialResultStatus = (typeof BID_COMMERCIAL_RESULT_STATUSES)[number];

export const BID_COMMERCIAL_MATERIAL_STATUSES = ['missing', 'in-progress', 'ready', 'not-required'] as const;

export type BidCommercialMaterialStatus = (typeof BID_COMMERCIAL_MATERIAL_STATUSES)[number];

export const BID_COMMERCIAL_TIMELINE_STATUSES = ['pending', 'done', 'cancelled'] as const;

export type BidCommercialTimelineStatus = (typeof BID_COMMERCIAL_TIMELINE_STATUSES)[number];

export const PROJECT_BID_COMMERCIAL_PROCESS_STATUSES = ['effective', 'superseded'] as const;

export type ProjectBidCommercialProcessStatus = (typeof PROJECT_BID_COMMERCIAL_PROCESS_STATUSES)[number];

export const ProjectBidCommercialMaterialItemInputSchema = z
    .object({
        materialKey: z.string().trim().min(1).max(128),
        label: z.string().trim().min(1).max(255),
        materialStatus: z.enum(BID_COMMERCIAL_MATERIAL_STATUSES),
        responsibleRole: z.string().trim().min(1).max(128).nullable().optional(),
        dueAt: z.iso.datetime().nullable().optional(),
        blocksNextStep: z.boolean().optional(),
        navigationHint: z.string().trim().min(1).max(255).nullable().optional(),
        sortOrder: z.number().int().nonnegative().optional()
    })
    .meta({ id: 'ProjectBidCommercialMaterialItemInput' });

export type ProjectBidCommercialMaterialItemInput = z.infer<typeof ProjectBidCommercialMaterialItemInputSchema>;

export const ProjectBidCommercialTimelineItemInputSchema = z
    .object({
        eventKey: z.string().trim().min(1).max(128),
        label: z.string().trim().min(1).max(255),
        summary: z.string().trim().min(1).max(1000).nullable().optional(),
        timelineStatus: z.enum(BID_COMMERCIAL_TIMELINE_STATUSES),
        occurredAt: z.iso.datetime().nullable().optional(),
        dueAt: z.iso.datetime().nullable().optional(),
        responsibleRole: z.string().trim().min(1).max(128).nullable().optional(),
        sortOrder: z.number().int().nonnegative().optional()
    })
    .meta({ id: 'ProjectBidCommercialTimelineItemInput' });

export type ProjectBidCommercialTimelineItemInput = z.infer<typeof ProjectBidCommercialTimelineItemInputSchema>;

export const CreateProjectBidCommercialProcessRequestSchema = z
    .object({
        bidMode: z.enum(BID_COMMERCIAL_MODES),
        currentStage: z.enum(BID_COMMERCIAL_STAGES),
        decision: z.enum(BID_COMMERCIAL_DECISIONS),
        resultStatus: z.enum(BID_COMMERCIAL_RESULT_STATUSES),
        processSummary: z.string().trim().min(1).max(2000),
        decisionSummary: z.string().trim().min(1).max(1000).nullable().optional(),
        resultSummary: z.string().trim().min(1).max(1000).nullable().optional(),
        tenderNo: z.string().trim().min(1).max(128).nullable().optional(),
        bidPackageNo: z.string().trim().min(1).max(128).nullable().optional(),
        ownerRole: z.string().trim().min(1).max(128).nullable().optional(),
        materialItems: z.array(ProjectBidCommercialMaterialItemInputSchema).default([]),
        timelineItems: z.array(ProjectBidCommercialTimelineItemInputSchema).default([])
    })
    .meta({ id: 'CreateProjectBidCommercialProcessRequest' });

export type CreateProjectBidCommercialProcessRequest = z.infer<typeof CreateProjectBidCommercialProcessRequestSchema>;

export const ProjectBidCommercialMaterialItemViewSchema = ProjectBidCommercialMaterialItemInputSchema.extend({
    id: z.uuid(),
    processId: z.uuid(),
    responsibleRole: z.string().nullable(),
    dueAt: z.iso.datetime().nullable(),
    blocksNextStep: z.boolean(),
    navigationHint: z.string().nullable(),
    sortOrder: z.number().int().nonnegative()
}).meta({ id: 'ProjectBidCommercialMaterialItemView' });

export type ProjectBidCommercialMaterialItemView = z.infer<typeof ProjectBidCommercialMaterialItemViewSchema>;

export const ProjectBidCommercialTimelineItemViewSchema = ProjectBidCommercialTimelineItemInputSchema.extend({
    id: z.uuid(),
    processId: z.uuid(),
    summary: z.string().nullable(),
    occurredAt: z.iso.datetime().nullable(),
    dueAt: z.iso.datetime().nullable(),
    responsibleRole: z.string().nullable(),
    sortOrder: z.number().int().nonnegative()
}).meta({ id: 'ProjectBidCommercialTimelineItemView' });

export type ProjectBidCommercialTimelineItemView = z.infer<typeof ProjectBidCommercialTimelineItemViewSchema>;

export const ProjectBidCommercialProcessSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        version: z.number().int().positive(),
        isCurrent: z.boolean(),
        supersedesId: z.uuid().nullable(),
        status: z.enum(PROJECT_BID_COMMERCIAL_PROCESS_STATUSES),
        bidMode: z.enum(BID_COMMERCIAL_MODES),
        currentStage: z.enum(BID_COMMERCIAL_STAGES),
        decision: z.enum(BID_COMMERCIAL_DECISIONS),
        resultStatus: z.enum(BID_COMMERCIAL_RESULT_STATUSES),
        processSummary: z.string(),
        decisionSummary: z.string().nullable(),
        resultSummary: z.string().nullable(),
        tenderNo: z.string().nullable(),
        bidPackageNo: z.string().nullable(),
        ownerRole: z.string().nullable(),
        blockerCount: z.number().int().nonnegative(),
        effectiveAt: z.iso.datetime(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable(),
        rowVersion: z.number().int()
    })
    .meta({ id: 'ProjectBidCommercialProcessSummary' });

export type ProjectBidCommercialProcessSummary = z.infer<typeof ProjectBidCommercialProcessSummarySchema>;

export const ProjectBidCommercialProcessListSchema = z
    .array(ProjectBidCommercialProcessSummarySchema)
    .meta({ id: 'ProjectBidCommercialProcessList' });

export type ProjectBidCommercialProcessList = z.infer<typeof ProjectBidCommercialProcessListSchema>;

export const ProjectBidCommercialWorkspaceViewSchema = z
    .object({
        projectId: z.uuid(),
        currentStage: z.string(),
        status: z.string(),
        currentProcess: ProjectBidCommercialProcessSummarySchema.nullable(),
        materialItems: z.array(ProjectBidCommercialMaterialItemViewSchema),
        timelineItems: z.array(ProjectBidCommercialTimelineItemViewSchema),
        blockingReasons: z.array(z.string()),
        nextStep: z.string(),
        ownerLabel: z.string(),
        allowedActions: z.array(z.string()),
        generatedAt: z.iso.datetime()
    })
    .meta({ id: 'ProjectBidCommercialWorkspaceView' });

export type ProjectBidCommercialWorkspaceView = z.infer<typeof ProjectBidCommercialWorkspaceViewSchema>;

export const PRICING_MARGIN_PATHS = ['bid', 'direct-commercial'] as const;

export type PricingMarginPath = (typeof PRICING_MARGIN_PATHS)[number];

export const PRICING_MARGIN_DECISIONS = ['pending', 'released', 'conditional-release', 'rejected', 'escalation-required'] as const;

export type PricingMarginDecision = (typeof PRICING_MARGIN_DECISIONS)[number];

export const GROSS_MARGIN_BANDS = ['below-redline', 'watch', 'target', 'not-calculated'] as const;

export type GrossMarginBand = (typeof GROSS_MARGIN_BANDS)[number];

export const PRICING_MARGIN_CONDITION_TYPES = ['financial', 'tax', 'payment', 'scope', 'risk', 'approval'] as const;

export type PricingMarginConditionType = (typeof PRICING_MARGIN_CONDITION_TYPES)[number];

export const PRICING_MARGIN_CONDITION_STATUSES = ['open', 'closed', 'waived'] as const;

export type PricingMarginConditionStatus = (typeof PRICING_MARGIN_CONDITION_STATUSES)[number];

export const PROJECT_PRICING_MARGIN_REVIEW_STATUSES = ['effective', 'superseded'] as const;

export type ProjectPricingMarginReviewStatus = (typeof PROJECT_PRICING_MARGIN_REVIEW_STATUSES)[number];

export const ProjectPricingMarginConditionItemInputSchema = z
    .object({
        conditionKey: z.string().trim().min(1).max(128),
        conditionType: z.enum(PRICING_MARGIN_CONDITION_TYPES),
        label: z.string().trim().min(1).max(255),
        conditionSummary: z.string().trim().min(1).max(2000),
        conditionStatus: z.enum(PRICING_MARGIN_CONDITION_STATUSES),
        requiredForContracting: z.boolean().optional(),
        responsibleRole: z.string().trim().min(1).max(128).nullable().optional(),
        dueAt: z.iso.datetime().nullable().optional(),
        resolutionSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        sortOrder: z.number().int().nonnegative().optional()
    })
    .meta({ id: 'ProjectPricingMarginConditionItemInput' });

export type ProjectPricingMarginConditionItemInput = z.infer<typeof ProjectPricingMarginConditionItemInputSchema>;

export const CreateProjectPricingMarginReviewRequestSchema = z
    .object({
        technicalCostPackageId: z.uuid(),
        bidCommercialProcessId: z.uuid().nullable().optional(),
        commercialReleaseBaselineId: z.uuid().nullable().optional(),
        pricingPath: z.enum(PRICING_MARGIN_PATHS),
        quoteVersion: z.string().trim().min(1).max(64),
        currencyCode: z.string().trim().min(3).max(16),
        quoteAmountTaxInclusive: NonNegativeMoneyStringSchema,
        quoteAmountTaxExclusive: NonNegativeMoneyStringSchema,
        taxRate: NonNegativeRatioStringSchema,
        taxConditionSummary: z.string().trim().min(1).max(2000),
        paymentTermsSummary: z.string().trim().min(1).max(2000),
        grossMarginRate: SignedRatioStringSchema.nullable().optional(),
        grossMarginBand: z.enum(GROSS_MARGIN_BANDS),
        grossMarginSummary: z.string().trim().min(1).max(2000),
        decision: z.enum(PRICING_MARGIN_DECISIONS),
        decisionSummary: z.string().trim().min(1).max(2000),
        approvalScenarioKey: z.string().trim().min(1).max(128).nullable().optional(),
        summaryPackageKey: z.string().trim().min(1).max(64).nullable().optional(),
        summarySnapshotId: z.uuid().nullable().optional(),
        projectionLevel: z.string().trim().min(1).max(32).nullable().optional(),
        exportPolicy: z.string().trim().min(1).max(32).nullable().optional(),
        ownerRole: z.string().trim().min(1).max(128).nullable().optional(),
        conditionItems: z.array(ProjectPricingMarginConditionItemInputSchema).default([])
    })
    .meta({ id: 'CreateProjectPricingMarginReviewRequest' });

export type CreateProjectPricingMarginReviewRequest = z.infer<typeof CreateProjectPricingMarginReviewRequestSchema>;

export const ProjectPricingMarginConditionItemViewSchema = ProjectPricingMarginConditionItemInputSchema.extend({
    id: z.uuid(),
    reviewId: z.uuid(),
    requiredForContracting: z.boolean(),
    responsibleRole: z.string().nullable(),
    dueAt: z.iso.datetime().nullable(),
    resolutionSummary: z.string().nullable(),
    sortOrder: z.number().int().nonnegative()
}).meta({ id: 'ProjectPricingMarginConditionItemView' });

export type ProjectPricingMarginConditionItemView = z.infer<typeof ProjectPricingMarginConditionItemViewSchema>;

export const ProjectPricingMarginReviewSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        version: z.number().int().positive(),
        isCurrent: z.boolean(),
        supersedesId: z.uuid().nullable(),
        status: z.enum(PROJECT_PRICING_MARGIN_REVIEW_STATUSES),
        technicalCostPackageId: z.uuid(),
        bidCommercialProcessId: z.uuid().nullable(),
        commercialReleaseBaselineId: z.uuid().nullable(),
        pricingPath: z.enum(PRICING_MARGIN_PATHS),
        quoteVersion: z.string(),
        currencyCode: z.string(),
        quoteAmountTaxInclusive: z.string(),
        quoteAmountTaxExclusive: z.string(),
        taxRate: z.string(),
        taxConditionSummary: z.string(),
        paymentTermsSummary: z.string(),
        grossMarginRate: z.string().nullable(),
        grossMarginBand: z.enum(GROSS_MARGIN_BANDS),
        grossMarginSummary: z.string(),
        decision: z.enum(PRICING_MARGIN_DECISIONS),
        decisionSummary: z.string(),
        approvalScenarioKey: z.string().nullable(),
        summaryPackageKey: z.string().nullable(),
        summarySnapshotId: z.uuid().nullable(),
        projectionLevel: z.string().nullable(),
        exportPolicy: z.string().nullable(),
        readyForContracting: z.boolean(),
        ownerRole: z.string().nullable(),
        blockerCount: z.number().int().nonnegative(),
        effectiveAt: z.iso.datetime(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable(),
        rowVersion: z.number().int()
    })
    .meta({ id: 'ProjectPricingMarginReviewSummary' });

export type ProjectPricingMarginReviewSummary = z.infer<typeof ProjectPricingMarginReviewSummarySchema>;

export const ProjectPricingMarginReviewListSchema = z
    .array(ProjectPricingMarginReviewSummarySchema)
    .meta({ id: 'ProjectPricingMarginReviewList' });

export type ProjectPricingMarginReviewList = z.infer<typeof ProjectPricingMarginReviewListSchema>;

export const ProjectPricingMarginWorkspaceViewSchema = z
    .object({
        projectId: z.uuid(),
        currentStage: z.string(),
        status: z.string(),
        currentReview: ProjectPricingMarginReviewSummarySchema.nullable(),
        technicalCostPackage: ProjectTechnicalCostPackageSummarySchema.nullable(),
        bidCommercialProcess: ProjectBidCommercialProcessSummarySchema.nullable(),
        conditionItems: z.array(ProjectPricingMarginConditionItemViewSchema),
        blockingReasons: z.array(z.string()),
        nextStep: z.string(),
        readyForContracting: z.boolean(),
        ownerLabel: z.string(),
        allowedActions: z.array(z.string()),
        generatedAt: z.iso.datetime()
    })
    .meta({ id: 'ProjectPricingMarginWorkspaceView' });

export type ProjectPricingMarginWorkspaceView = z.infer<typeof ProjectPricingMarginWorkspaceViewSchema>;

export const ACCEPTANCE_RECORD_TYPES = ['stage-outcome', 'stage-acceptance', 'final-acceptance'] as const;

export type AcceptanceRecordType = (typeof ACCEPTANCE_RECORD_TYPES)[number];

export const ACCEPTANCE_RECORD_STATUSES = ['confirmed', 'voided'] as const;

export type AcceptanceRecordStatus = (typeof ACCEPTANCE_RECORD_STATUSES)[number];

export const ACCEPTANCE_RECORD_RESULTS = ['accepted', 'conditional', 'rejected'] as const;

export type AcceptanceRecordResult = (typeof ACCEPTANCE_RECORD_RESULTS)[number];

export const AcceptanceRecordSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        acceptanceType: z.enum(ACCEPTANCE_RECORD_TYPES),
        acceptanceResult: z.enum(ACCEPTANCE_RECORD_RESULTS),
        status: z.enum(ACCEPTANCE_RECORD_STATUSES),
        scopeSummary: z.string(),
        evidenceSummary: z.string(),
        comment: z.string().nullable(),
        confirmationRecordId: z.uuid().nullable(),
        confirmedAt: z.iso.datetime(),
        confirmedBy: z.uuid().nullable(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable(),
        rowVersion: z.number().int()
    })
    .meta({ id: 'AcceptanceRecordSummary' });

export type AcceptanceRecordSummary = z.infer<typeof AcceptanceRecordSummarySchema>;

export const AcceptanceRecordListSchema = z.array(AcceptanceRecordSummarySchema).meta({ id: 'AcceptanceRecordList' });

export type AcceptanceRecordList = z.infer<typeof AcceptanceRecordListSchema>;

export const CreateAcceptanceRecordRequestSchema = z
    .object({
        acceptanceType: z.enum(ACCEPTANCE_RECORD_TYPES),
        acceptanceResult: z.enum(ACCEPTANCE_RECORD_RESULTS),
        scopeSummary: z.string().trim().min(1).max(2000),
        evidenceSummary: z.string().trim().min(1).max(2000),
        comment: z.string().trim().min(1).max(1000).nullable().optional()
    })
    .meta({ id: 'CreateAcceptanceRecordRequest' });

export type CreateAcceptanceRecordRequest = z.infer<typeof CreateAcceptanceRecordRequestSchema>;

export const PROJECT_COMPLETION_RECORD_RESULTS = ['completed', 'conditional-completed'] as const;

export type ProjectCompletionRecordResult = (typeof PROJECT_COMPLETION_RECORD_RESULTS)[number];

export const PROJECT_COMPLETION_RECORD_STATUSES = ['confirmed'] as const;

export type ProjectCompletionRecordStatus = (typeof PROJECT_COMPLETION_RECORD_STATUSES)[number];

export const ProjectCompletionRecordSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        acceptanceRecordId: z.uuid(),
        completionResult: z.enum(PROJECT_COMPLETION_RECORD_RESULTS),
        status: z.enum(PROJECT_COMPLETION_RECORD_STATUSES),
        completedAt: z.iso.datetime(),
        completedBy: z.uuid().nullable(),
        completedByName: z.string().nullable(),
        completionSummary: z.string(),
        evidenceSummary: z.string(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable(),
        rowVersion: z.number().int()
    })
    .meta({ id: 'ProjectCompletionRecordSummary' });

export type ProjectCompletionRecordSummary = z.infer<typeof ProjectCompletionRecordSummarySchema>;

export const ProjectCompletionRecordListSchema = z.array(ProjectCompletionRecordSummarySchema).meta({ id: 'ProjectCompletionRecordList' });

export type ProjectCompletionRecordList = z.infer<typeof ProjectCompletionRecordListSchema>;

export const CreateProjectCompletionRecordRequestSchema = z
    .object({
        acceptanceRecordId: z.uuid(),
        completionResult: z.enum(PROJECT_COMPLETION_RECORD_RESULTS),
        completedAt: z.iso.datetime(),
        completionSummary: z.string().trim().min(1).max(2000),
        evidenceSummary: z.string().trim().min(1).max(2000)
    })
    .meta({ id: 'CreateProjectCompletionRecordRequest' });

export type CreateProjectCompletionRecordRequest = z.infer<typeof CreateProjectCompletionRecordRequestSchema>;

export const PROJECT_ARCHIVE_ANCHOR_STAGES = ['completed', 'closed-lost', 'closed-terminated'] as const;

export type ProjectArchiveAnchorStage = (typeof PROJECT_ARCHIVE_ANCHOR_STAGES)[number];

export const PROJECT_ARCHIVE_ANCHOR_SOURCE_TYPES = ['project', 'project-completion-record'] as const;

export type ProjectArchiveAnchorSourceType = (typeof PROJECT_ARCHIVE_ANCHOR_SOURCE_TYPES)[number];

export const PROJECT_ARCHIVE_RECORD_STATUSES = ['recorded', 'voided', 'superseded'] as const;

export type ProjectArchiveRecordStatus = (typeof PROJECT_ARCHIVE_RECORD_STATUSES)[number];

export const ProjectArchiveRecordSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        archiveAnchorStage: z.enum(PROJECT_ARCHIVE_ANCHOR_STAGES),
        archiveAnchorSourceType: z.enum(PROJECT_ARCHIVE_ANCHOR_SOURCE_TYPES),
        archiveAnchorSourceId: z.uuid(),
        status: z.enum(PROJECT_ARCHIVE_RECORD_STATUSES),
        archivedAt: z.iso.datetime(),
        archivedBy: z.uuid().nullable(),
        archivedByName: z.string().nullable(),
        archiveSummary: z.string(),
        evidenceSummary: z.string(),
        supersedesArchiveRecordId: z.uuid().nullable(),
        replacementReason: z.string().nullable(),
        voidedAt: z.iso.datetime().nullable(),
        voidedBy: z.uuid().nullable(),
        voidedByName: z.string().nullable(),
        voidReason: z.string().nullable(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable(),
        rowVersion: z.number().int(),
        allowedActions: z.array(z.string())
    })
    .meta({ id: 'ProjectArchiveRecordSummary' });

export type ProjectArchiveRecordSummary = z.infer<typeof ProjectArchiveRecordSummarySchema>;

export const ProjectArchiveRecordListSchema = z.array(ProjectArchiveRecordSummarySchema).meta({ id: 'ProjectArchiveRecordList' });

export type ProjectArchiveRecordList = z.infer<typeof ProjectArchiveRecordListSchema>;

export const CreateProjectArchiveRecordRequestSchema = z
    .object({
        archivedAt: z.iso.datetime(),
        archiveSummary: z.string().trim().min(1).max(2000),
        evidenceSummary: z.string().trim().min(1).max(2000)
    })
    .meta({ id: 'CreateProjectArchiveRecordRequest' });

export type CreateProjectArchiveRecordRequest = z.infer<typeof CreateProjectArchiveRecordRequestSchema>;

export const ReplaceProjectArchiveRecordRequestSchema = z
    .object({
        archivedAt: z.iso.datetime(),
        archiveSummary: z.string().trim().min(1).max(2000),
        evidenceSummary: z.string().trim().min(1).max(2000),
        replacementReason: z.string().trim().min(1).max(1000),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ReplaceProjectArchiveRecordRequest' });

export type ReplaceProjectArchiveRecordRequest = z.infer<typeof ReplaceProjectArchiveRecordRequestSchema>;

export const VoidProjectArchiveRecordRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(1000),
        comment: z.string().trim().max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'VoidProjectArchiveRecordRequest' });

export type VoidProjectArchiveRecordRequest = z.infer<typeof VoidProjectArchiveRecordRequestSchema>;

export const PROJECT_TIMELINE_EVENT_TYPES = ['stage-entered', 'stage-completed', 'milestone'] as const;

export type ProjectTimelineEventType = (typeof PROJECT_TIMELINE_EVENT_TYPES)[number];

export const PROJECT_TIMELINE_SOURCE_TYPES = ['project', 'contract', 'project-handover', 'acceptance-record', 'project-completion-record', 'project-archive-record'] as const;

export type ProjectTimelineSourceType = (typeof PROJECT_TIMELINE_SOURCE_TYPES)[number];

export const ProjectTimelineEventSchema = z
    .object({
        eventKey: z.string(),
        stage: z.string(),
        stageLabel: z.string(),
        eventType: z.enum(PROJECT_TIMELINE_EVENT_TYPES),
        occurredAt: z.iso.datetime(),
        actorUserId: z.uuid().nullable(),
        actorName: z.string().nullable(),
        resultLabel: z.string(),
        sourceType: z.enum(PROJECT_TIMELINE_SOURCE_TYPES),
        sourceId: z.uuid().nullable(),
        evidenceLabel: z.string().nullable(),
        isAuthoritative: z.boolean()
    })
    .meta({ id: 'ProjectTimelineEvent' });

export type ProjectTimelineEvent = z.infer<typeof ProjectTimelineEventSchema>;

export const ProjectTimelineViewSchema = z
    .object({
        projectId: z.uuid(),
        events: z.array(ProjectTimelineEventSchema),
        generatedAt: z.iso.datetime()
    })
    .meta({ id: 'ProjectTimelineView' });

export type ProjectTimelineView = z.infer<typeof ProjectTimelineViewSchema>;

export const CreateProjectRequestSchema = z
    .object({
        projectName: z.string().trim().min(1).max(255),
        customerName: z.string().trim().min(1).max(255),
        customerProjectNo: z.string().trim().min(1).max(128).nullable().optional(),
        currentStage: z.enum(PROJECT_STAGES).optional(),
        plannedSignAt: z.iso.datetime().nullable().optional()
    })
    .meta({ id: 'CreateProjectRequest' });

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const ProjectListQuerySchema = z
    .object({
        status: z.enum(PROJECT_STATUSES).optional(),
        currentStage: z.enum(PROJECT_STAGES).optional(),
        ownerOrgId: z.uuid().optional(),
        keyword: z.string().trim().min(1).max(128).optional()
    })
    .meta({ id: 'ProjectListQuery' });

export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;

export const UpdateProjectBasicInfoRequestSchema = z
    .object({
        projectName: z.string().trim().min(1).max(255).optional(),
        customerName: z.string().trim().min(1).max(255).nullable().optional(),
        customerProjectNo: z.string().trim().min(1).max(128).nullable().optional(),
        plannedSignAt: z.iso.datetime().nullable().optional()
    })
    .refine((value) => value.projectName !== undefined || value.customerName !== undefined || value.customerProjectNo !== undefined || value.plannedSignAt !== undefined, {
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
        projectName: z.string(),
        customerName: z.string().nullable(),
        contractNo: z.string(),
        customerContractNo: z.string().nullable(),
        status: ContractStatusSchema,
        signedAmount: z.string().nullable(),
        signedAmountProjection: SensitiveStringFieldProjectionSchema,
        currencyCode: z.string(),
        currentSnapshotId: z.uuid().nullable(),
        signedAt: z.iso.datetime().nullable(),
        retentionDueDate: z.iso.date().nullable(),
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

export const ContractTermSnapshotSummarySchema = z
    .object({
        id: z.uuid(),
        contractId: z.uuid(),
        effectiveAt: z.iso.datetime(),
        effectiveBy: z.uuid().nullable(),
        retentionDueDate: z.iso.date().nullable(),
        amountTaxInclusive: z.string().nullable(),
        amountTaxInclusiveProjection: SensitiveStringFieldProjectionSchema,
        amountTaxExclusive: z.string().nullable(),
        amountTaxExclusiveProjection: SensitiveStringFieldProjectionSchema,
        taxRate: z.string().nullable(),
        downPaymentRate: z.string().nullable(),
        retentionRate: z.string().nullable(),
        paymentTerms: z.string().nullable(),
        sourceReadinessId: z.uuid().nullable(),
        sourceBaselineId: z.uuid().nullable(),
        version: z.number().int(),
        snapshotStatus: z.enum(['active', 'superseded', 'voided']),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        rowVersion: z.number().int()
    })
    .meta({ id: 'ContractTermSnapshotSummary' });

export type ContractTermSnapshotSummary = z.infer<typeof ContractTermSnapshotSummarySchema>;

export const ContractDetailViewSchema = ContractSummarySchema.extend({
    currentTermSnapshot: ContractTermSnapshotSummarySchema.nullable()
}).meta({ id: 'ContractDetailView' });

export type ContractDetailView = z.infer<typeof ContractDetailViewSchema>;

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
        customerContractNo: z.string().trim().min(1).max(128).nullable().optional(),
        status: ContractStatusSchema.optional(),
        signedAmount: z.string().trim().min(1).max(64),
        currencyCode: z.string().trim().min(1).max(16).optional(),
        signedAt: z.iso.datetime().nullable().optional(),
        retentionDueDate: z.iso.date().nullable().optional(),
        createdBy: z.uuid().nullable().optional(),
        updatedBy: z.uuid().nullable().optional()
    })
    .meta({ id: 'CreateContractRequest' });

export type CreateContractRequest = z.infer<typeof CreateContractRequestSchema>;

export const UpdateContractBasicInfoRequestSchema = z
    .object({
        customerContractNo: z.string().trim().min(1).max(128).nullable().optional(),
        signedAmount: z.string().trim().min(1).max(64).optional(),
        currencyCode: z.string().trim().min(1).max(16).optional(),
        signedAt: z.iso.datetime().nullable().optional(),
        retentionDueDate: z.iso.date().nullable().optional(),
        updatedBy: z.uuid().nullable().optional()
    })
    .refine(
        (value) =>
            value.customerContractNo !== undefined ||
            value.signedAmount !== undefined ||
            value.currencyCode !== undefined ||
            value.signedAt !== undefined ||
            value.retentionDueDate !== undefined ||
            value.updatedBy !== undefined,
        {
            message: 'At least one field is required for update'
        }
    )
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
        amountTaxInclusive: z.string().nullable(),
        amountTaxExclusive: z.string().nullable(),
        taxRate: z.string().nullable(),
        downPaymentRate: z.string().nullable(),
        retentionRate: z.string().nullable(),
        paymentTerms: z.string().nullable(),
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
        signedAmount: z.string().nullable(),
        signedAmountProjection: SensitiveStringFieldProjectionSchema,
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
        totalSignedAmount: z.string().nullable(),
        totalSignedAmountProjection: SensitiveStringFieldProjectionSchema,
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
        projectNo: z.string(),
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
        projectNo: z.string(),
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
        amountTaxInclusive: z.string().max(64).nullable().optional(),
        amountTaxExclusive: z.string().max(64).nullable().optional(),
        taxRate: z.string().max(64).nullable().optional(),
        downPaymentRate: z.string().max(64).nullable().optional(),
        retentionRate: z.string().max(64).nullable().optional(),
        paymentTerms: z.string().max(1000).nullable().optional(),
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

export const CommissionDepartureExceptionDecisionStatusSchema = z
    .enum(['active', 'superseded', 'voided'])
    .meta({ id: 'CommissionDepartureExceptionDecisionStatus' });

export type CommissionDepartureExceptionDecisionStatus = z.infer<typeof CommissionDepartureExceptionDecisionStatusSchema>;

export const CommissionDepartureExceptionDecisionSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        freezeVersionId: z.uuid(),
        version: z.number().int().positive(),
        rowVersion: z.number().int().positive(),
        isCurrent: z.boolean(),
        departureScenarioCode: z.string(),
        decisionCode: z.string(),
        decisionSummary: z.string(),
        confirmationRequirementSummary: z.string().nullable(),
        summaryPackageKey: z.string(),
        summarySnapshotId: z.uuid(),
        projectionLevel: z.string(),
        exportPolicy: z.string(),
        status: CommissionDepartureExceptionDecisionStatusSchema,
        handledAt: z.iso.datetime(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'CommissionDepartureExceptionDecisionSummary' });

export type CommissionDepartureExceptionDecisionSummary = z.infer<typeof CommissionDepartureExceptionDecisionSummarySchema>;

export const CreateCommissionDepartureExceptionDecisionRequestSchema = z
    .object({
        freezeVersionId: z.uuid(),
        departureScenarioCode: z.string().trim().min(1).max(64),
        decisionCode: z.string().trim().min(1).max(32),
        decisionSummary: z.string().trim().min(1).max(2000),
        confirmationRequirementSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        summarySnapshotId: z.uuid()
    })
    .meta({ id: 'CreateCommissionDepartureExceptionDecisionRequest' });

export type CreateCommissionDepartureExceptionDecisionRequest = z.infer<typeof CreateCommissionDepartureExceptionDecisionRequestSchema>;

export const CommissionFreezeDisputeArbitrationStatusSchema = z
    .enum(['pending', 'arbitrated'])
    .meta({ id: 'CommissionFreezeDisputeArbitrationStatus' });

export type CommissionFreezeDisputeArbitrationStatus = z.infer<typeof CommissionFreezeDisputeArbitrationStatusSchema>;

export const ReplacementCommissionRoleAssignmentPayloadSchema = z
    .object({
        participants: z.array(CommissionParticipantSchema).min(1)
    })
    .meta({ id: 'ReplacementCommissionRoleAssignmentPayload' });

export type ReplacementCommissionRoleAssignmentPayload = z.infer<typeof ReplacementCommissionRoleAssignmentPayloadSchema>;

export const SubmitCommissionFreezeDisputeRequestSchema = z
    .object({
        freezeVersionId: z.uuid(),
        disputeReason: z.string().trim().min(1).max(1000),
        affectedAssignmentIds: z.array(z.uuid()).min(1),
        recalculationImpactMode: z.string().trim().min(1).max(64),
        comment: z.string().trim().max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'SubmitCommissionFreezeDisputeRequest' });

export type SubmitCommissionFreezeDisputeRequest = z.infer<typeof SubmitCommissionFreezeDisputeRequestSchema>;

export const SubmitCommissionFreezeDisputeResultSchema = z
    .object({
        targetId: z.uuid(),
        disputeRecordId: z.uuid(),
        freezeVersionId: z.uuid(),
        summarySnapshotId: z.uuid(),
        projectionLevel: z.string(),
        exportPolicy: z.string(),
        businessStatusAfter: z.string().min(1)
    })
    .meta({ id: 'SubmitCommissionFreezeDisputeResult' });

export type SubmitCommissionFreezeDisputeResult = z.infer<typeof SubmitCommissionFreezeDisputeResultSchema>;

export const CommissionFreezeDisputeDetailViewSchema = z
    .object({
        disputeRecordId: z.uuid(),
        projectId: z.uuid(),
        freezeVersionId: z.uuid(),
        rowVersion: z.number().int().positive(),
        disputeReason: z.string(),
        affectedAssignmentSummary: z.string(),
        arbitrationStatus: CommissionFreezeDisputeArbitrationStatusSchema,
        recalculationImpactMode: z.string(),
        impactAssessmentSummary: z.string().nullable(),
        summaryPackageKey: z.string(),
        summarySnapshotId: z.uuid(),
        projectionLevel: z.string(),
        exportPolicy: z.string(),
        status: z.string(),
        handledAt: z.iso.datetime(),
        allowedActions: z.array(z.string()),
        generatedAt: z.iso.datetime()
    })
    .meta({ id: 'CommissionFreezeDisputeDetailView' });

export type CommissionFreezeDisputeDetailView = z.infer<typeof CommissionFreezeDisputeDetailViewSchema>;

export const ArbitrateCommissionFreezeDisputeRequestSchema = z
    .object({
        arbitrationDecision: z.string().trim().min(1).max(64),
        replacementAssignmentPayload: ReplacementCommissionRoleAssignmentPayloadSchema.nullable().optional(),
        recalculationImpactMode: z.string().trim().min(1).max(64),
        comment: z.string().trim().max(1000).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ArbitrateCommissionFreezeDisputeRequest' });

export type ArbitrateCommissionFreezeDisputeRequest = z.infer<typeof ArbitrateCommissionFreezeDisputeRequestSchema>;

export const ArbitrateCommissionFreezeDisputeResultSchema = z
    .object({
        targetId: z.uuid(),
        disputeRecordId: z.uuid(),
        changeRequestId: z.uuid(),
        supersededFreezeVersionId: z.uuid(),
        replacementFreezeVersionId: z.uuid().nullable(),
        affectedCalculationSummary: z.string().nullable(),
        affectedPayoutSummary: z.string().nullable(),
        riskFlagSummary: z.string().nullable(),
        resultStatus: z.string().min(1)
    })
    .meta({ id: 'ArbitrateCommissionFreezeDisputeResult' });

export type ArbitrateCommissionFreezeDisputeResult = z.infer<typeof ArbitrateCommissionFreezeDisputeResultSchema>;

export const CommissionFreezeChangeRequestDetailViewSchema = z
    .object({
        changeRequestId: z.uuid(),
        disputeRecordId: z.uuid(),
        supersededFreezeVersionId: z.uuid(),
        replacementFreezeVersionId: z.uuid().nullable(),
        arbitrationDecision: z.string(),
        recalculationImpactMode: z.string(),
        affectedCalculationSummary: z.string().nullable(),
        affectedPayoutSummary: z.string().nullable(),
        riskFlagSummary: z.string().nullable(),
        summaryPackageKey: z.string(),
        summarySnapshotId: z.uuid(),
        projectionLevel: z.string(),
        exportPolicy: z.string(),
        status: z.string(),
        handledAt: z.iso.datetime(),
        generatedAt: z.iso.datetime()
    })
    .meta({ id: 'CommissionFreezeChangeRequestDetailView' });

export type CommissionFreezeChangeRequestDetailView = z.infer<typeof CommissionFreezeChangeRequestDetailViewSchema>;

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
        ruleVersionId: z.uuid(),
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

export const CommissionPayoutStageSchema = z.enum(['first', 'second', 'final', 'retention']).meta({ id: 'CommissionPayoutStage' });

export type CommissionPayoutStage = z.infer<typeof CommissionPayoutStageSchema>;

const NonRetentionCommissionPayoutStageSchema = z.enum(['first', 'second', 'final']);

export const CommissionPayoutTierSchema = z.enum(['basic', 'mid', 'premium']).meta({ id: 'CommissionPayoutTier' });

export type CommissionPayoutTier = z.infer<typeof CommissionPayoutTierSchema>;

export const CommissionPayoutKindSchema = z.enum(['primary', 'supplement']).meta({ id: 'CommissionPayoutKind' });

export type CommissionPayoutKind = z.infer<typeof CommissionPayoutKindSchema>;

export const CommissionPayoutSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        calculationId: z.uuid(),
        rowVersion: z.number().int().positive(),
        stageType: CommissionPayoutStageSchema,
        payoutKind: CommissionPayoutKindSchema,
        sourcePayoutId: z.uuid().nullable(),
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

const SubmitCommissionPayoutApprovalRequestBaseSchema = z.object({
    freezeVersionId: z.uuid().optional(),
    baselineSelectionSource: z.string().trim().min(1).max(32).optional(),
    comment: z.string().trim().min(1).max(2000).optional(),
    expectedVersion: z.number().int().positive().optional()
});

export const SubmitRetentionCommissionPayoutApprovalRequestSchema = SubmitCommissionPayoutApprovalRequestBaseSchema.extend({
    payoutStage: z.literal('retention'),
    gateReviewRecordId: z.uuid(),
    summarySnapshotId: z.uuid(),
    retentionReceiptRecordId: z.uuid(),
    departureExceptionDecisionId: z.uuid()
}).meta({ id: 'SubmitRetentionCommissionPayoutApprovalRequest' });

export const SubmitNonRetentionCommissionPayoutApprovalRequestSchema = SubmitCommissionPayoutApprovalRequestBaseSchema.extend({
    payoutStage: NonRetentionCommissionPayoutStageSchema,
    gateReviewRecordId: z.uuid().optional(),
    summarySnapshotId: z.uuid().optional(),
    retentionReceiptRecordId: z.uuid().optional(),
    departureExceptionDecisionId: z.uuid().optional()
}).meta({ id: 'SubmitNonRetentionCommissionPayoutApprovalRequest' });

export const SubmitCommissionPayoutApprovalRequestSchema = z
    .union([SubmitRetentionCommissionPayoutApprovalRequestSchema, SubmitNonRetentionCommissionPayoutApprovalRequestSchema])
    .meta({ id: 'SubmitCommissionPayoutApprovalRequest' });

export type SubmitRetentionCommissionPayoutApprovalRequest = z.infer<typeof SubmitRetentionCommissionPayoutApprovalRequestSchema>;

export type SubmitNonRetentionCommissionPayoutApprovalRequest = z.infer<typeof SubmitNonRetentionCommissionPayoutApprovalRequestSchema>;

export type SubmitCommissionPayoutApprovalRequest = z.infer<typeof SubmitCommissionPayoutApprovalRequestSchema>;

export const ApproveCommissionPayoutRequestSchema = z
    .object({
        approvedAmount: z.string().trim().min(1).max(64).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ApproveCommissionPayoutRequest' });

export type ApproveCommissionPayoutRequest = z.infer<typeof ApproveCommissionPayoutRequestSchema>;

const RegisterCommissionPayoutRequestBaseSchema = z.object({
    approvalRecordId: z.uuid().optional(),
    paidRecordAmount: z.string().trim().min(1).max(64),
    paidAt: z.iso.datetime().optional(),
    comment: z.string().trim().min(1).max(2000).optional(),
    expectedVersion: z.number().int().positive().optional()
});

export const RegisterRetentionCommissionPayoutRequestSchema = RegisterCommissionPayoutRequestBaseSchema.extend({
    payoutStage: z.literal('retention'),
    summarySnapshotId: z.uuid()
}).meta({ id: 'RegisterRetentionCommissionPayoutRequest' });

export const RegisterNonRetentionCommissionPayoutRequestSchema = RegisterCommissionPayoutRequestBaseSchema.extend({
    payoutStage: NonRetentionCommissionPayoutStageSchema,
    summarySnapshotId: z.uuid().optional()
}).meta({ id: 'RegisterNonRetentionCommissionPayoutRequest' });

export const RegisterCommissionPayoutRequestSchema = z
    .union([RegisterRetentionCommissionPayoutRequestSchema, RegisterNonRetentionCommissionPayoutRequestSchema])
    .meta({ id: 'RegisterCommissionPayoutRequest' });

export type RegisterRetentionCommissionPayoutRequest = z.infer<typeof RegisterRetentionCommissionPayoutRequestSchema>;

export type RegisterNonRetentionCommissionPayoutRequest = z.infer<typeof RegisterNonRetentionCommissionPayoutRequestSchema>;

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
        recordNo: z.string(),
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

const CommissionSharedEvidencePackageShape = {
    freezeVersionSummary: CommissionRoleAssignmentSummarySchema,
    baselineSelectionSource: BaselineSelectionSourceSchema,
    taxImpactSummary: z.string(),
    taxImpactPendingAmount: z.string(),
    dataMaturityLevel: z.string(),
    costActionRecommendation: OperatingSnapshotActionLevelSchema,
    currentActionLevel: OperatingSnapshotActionLevelSchema,
    referencedBaselineVersion: z.string(),
    referencedSnapshotVersion: z.string(),
    summaryPackageKey: z.string(),
    summarySnapshotId: z.uuid(),
    projectionLevel: z.string(),
    exportPolicy: z.string()
};

export const CommissionFinalSettlementViewSchema = z
    .object({
        projectId: z.uuid(),
        finalSettlementStatus: z.string(),
        nonRetentionSettlementStatus: z.string(),
        retentionSettlementStatus: z.string(),
        retentionDueDate: z.iso.date().nullable(),
        retentionDueStatus: z.enum(['missing', 'pending', 'due']),
        retentionRequirementSummary: z.string().nullable(),
        retentionReceiptSummary: z.string().nullable(),
        departureExceptionSummary: z.string().nullable(),
        ...CommissionSharedEvidencePackageShape,
        allowedActions: z.array(z.string())
    })
    .meta({ id: 'CommissionFinalSettlementView' });

export type CommissionFinalSettlementView = z.infer<typeof CommissionFinalSettlementViewSchema>;

export const CommissionRuleExplanationViewSchema = z
    .object({
        projectId: z.uuid(),
        currentStageStatus: z.string(),
        gateDecisionCode: z.string(),
        blockingReasonCategory: z.string().nullable(),
        blockingReasonCode: z.string().nullable(),
        blockingReasonSummary: z.string().nullable(),
        gateDecisionSummary: z.string(),
        nextActionSummary: z.string().nullable(),
        ...CommissionSharedEvidencePackageShape,
        allowedActions: z.array(z.string())
    })
    .meta({ id: 'CommissionRuleExplanationView' });

export type CommissionRuleExplanationView = z.infer<typeof CommissionRuleExplanationViewSchema>;

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
        comment: z.string().trim().min(1).max(1000).nullable().optional()
    })
    .meta({ id: 'ConfirmSharedCostAllocationBasisRequest' });

export type ConfirmSharedCostAllocationBasisRequest = z.infer<typeof ConfirmSharedCostAllocationBasisRequestSchema>;

export const ReplaceSharedCostAllocationResultRequestSchema = z
    .object({
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
        taxTreatmentType: z.string().trim().min(1).max(64),
        deductibilityStatus: z.string().trim().min(1).max(32),
        taxImpactAmount: z.string().trim().min(1).max(64),
        taxImpactSummary: z.string().trim().min(1).max(2000),
        taxPendingFlag: z.boolean().default(false),
        taxImpactPendingAmount: z.string().trim().min(1).max(64).default('0'),
        basisSummary: z.string().trim().min(1).max(2000).nullable().optional()
    })
    .meta({ id: 'ConfirmAccountingTaxTreatmentRequest' });

export type ConfirmAccountingTaxTreatmentRequest = z.infer<typeof ConfirmAccountingTaxTreatmentRequestSchema>;

export const ReplaceAccountingTaxTreatmentRequestSchema = z
    .object({
        taxTreatmentType: z.string().trim().min(1).max(64),
        deductibilityStatus: z.string().trim().min(1).max(32),
        taxImpactAmount: z.string().trim().min(1).max(64),
        taxImpactSummary: z.string().trim().min(1).max(2000),
        taxPendingFlag: z.boolean().default(false),
        taxImpactPendingAmount: z.string().trim().min(1).max(64).default('0'),
        basisSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ReplaceAccountingTaxTreatmentRequest' });

export type ReplaceAccountingTaxTreatmentRequest = z.infer<typeof ReplaceAccountingTaxTreatmentRequestSchema>;

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

export const ReviewOperatingSignalEvaluationRequestSchema = z
    .object({
        reviewDecision: z.string().trim().min(1).max(32),
        resolvedDataMaturityLevel: z.string().trim().min(1).max(32),
        costActionRecommendation: OperatingSnapshotActionLevelSchema,
        referencedBaselineVersion: z.string().trim().min(1).max(64),
        referencedSnapshotVersion: z.string().trim().min(1).max(64),
        reviewComment: z.string().trim().min(1).max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ReviewOperatingSignalEvaluationRequest' });

export type ReviewOperatingSignalEvaluationRequest = z.infer<typeof ReviewOperatingSignalEvaluationRequestSchema>;

export const ReviewOperatingSignalEvaluationResultSchema = z
    .object({
        targetId: z.uuid(),
        signalEvaluationId: z.uuid(),
        reviewRecordId: z.uuid(),
        taxImpactSummary: z.string(),
        dataMaturityLevel: z.string(),
        costActionRecommendation: OperatingSnapshotActionLevelSchema,
        currentActionLevel: OperatingSnapshotActionLevelSchema,
        referencedBaselineVersion: z.string(),
        referencedSnapshotVersion: z.string(),
        resultStatus: z.string().min(1)
    })
    .meta({ id: 'ReviewOperatingSignalEvaluationResult' });

export type ReviewOperatingSignalEvaluationResult = z.infer<typeof ReviewOperatingSignalEvaluationResultSchema>;

export const OperatingSignalEvaluationViewSchema = z
    .object({
        signalEvaluationId: z.uuid(),
        projectId: z.uuid(),
        formulaBoundaryAction: z.string(),
        signalLevel: z.string(),
        taxImpactSummary: z.string(),
        allocationStabilitySummary: z.string().nullable(),
        unmappedCostSummary: z.string().nullable(),
        dataMaturityLevel: z.string(),
        costActionRecommendation: OperatingSnapshotActionLevelSchema,
        currentActionLevel: OperatingSnapshotActionLevelSchema,
        referencedBaselineVersion: z.string(),
        referencedSnapshotVersion: z.string(),
        reviewRequired: z.boolean(),
        reviewSummary: z.string().nullable()
    })
    .meta({ id: 'OperatingSignalEvaluationView' });

export type OperatingSignalEvaluationView = z.infer<typeof OperatingSignalEvaluationViewSchema>;

export const ReviewCommissionGateBindingRequestSchema = z
    .object({
        bindingAction: OperatingSnapshotActionLevelSchema,
        gateReviewDecision: z.string().trim().min(1).max(32),
        blockingReasonCode: z.string().trim().min(1).max(64).nullable().optional(),
        baselineSelectionSource: BaselineSelectionSourceSchema,
        summaryPackageKey: z.string().trim().min(1).max(64),
        summarySnapshotId: z.uuid(),
        referencedBaselineVersion: z.string().trim().min(1).max(64),
        referencedSnapshotVersion: z.string().trim().min(1).max(64),
        comment: z.string().trim().min(1).max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ReviewCommissionGateBindingRequest' });

export type ReviewCommissionGateBindingRequest = z.infer<typeof ReviewCommissionGateBindingRequestSchema>;

export const ReviewCommissionGateBindingResultSchema = z
    .object({
        targetId: z.uuid(),
        bindingResultId: z.uuid(),
        gateReviewRecordId: z.uuid(),
        taxImpactSummary: z.string(),
        taxImpactPendingAmount: z.string(),
        dataMaturityLevel: z.string(),
        costActionRecommendation: OperatingSnapshotActionLevelSchema,
        currentActionLevel: OperatingSnapshotActionLevelSchema,
        baselineSelectionSource: BaselineSelectionSourceSchema,
        referencedBaselineVersion: z.string(),
        referencedSnapshotVersion: z.string(),
        summaryPackageKey: z.string(),
        summarySnapshotId: z.uuid(),
        projectionLevel: z.string(),
        exportPolicy: z.string(),
        nextActionSummary: z.string().nullable(),
        businessStatusAfter: z.string().min(1)
    })
    .meta({ id: 'ReviewCommissionGateBindingResult' });

export type ReviewCommissionGateBindingResult = z.infer<typeof ReviewCommissionGateBindingResultSchema>;

export const CommissionGateBindingHistoryViewSchema = z
    .object({
        bindingId: z.uuid(),
        projectId: z.uuid(),
        signalEvaluationId: z.uuid(),
        gateStageType: z.string(),
        signalLevel: z.string(),
        taxImpactSummary: z.string(),
        taxImpactPendingAmount: z.string(),
        dataMaturityLevel: z.string(),
        costActionRecommendation: OperatingSnapshotActionLevelSchema,
        currentActionLevel: OperatingSnapshotActionLevelSchema,
        baselineSelectionSource: BaselineSelectionSourceSchema,
        referencedBaselineVersion: z.string(),
        referencedSnapshotVersion: z.string(),
        bindingAction: OperatingSnapshotActionLevelSchema,
        gateReviewDecision: z.string().nullable(),
        blockingReasonSummary: z.string().nullable(),
        summaryPackageKey: z.string().nullable(),
        summarySnapshotId: z.uuid().nullable(),
        projectionLevel: z.string().nullable(),
        exportPolicy: z.string().nullable(),
        nextActionSummary: z.string().nullable(),
        handledBy: z.uuid().nullable(),
        handledAt: z.iso.datetime().nullable(),
        allowedActions: z.array(z.string())
    })
    .meta({ id: 'CommissionGateBindingHistoryView' });

export type CommissionGateBindingHistoryView = z.infer<typeof CommissionGateBindingHistoryViewSchema>;

export const ProjectBusinessOutcomeOverviewViewSchema = z
    .object({
        projectId: z.uuid(),
        effectiveContractSetSummaryProjection: SensitiveStringFieldProjectionSchema,
        receivableConfirmedAmountSummaryProjection: SensitiveStringFieldProjectionSchema,
        includedCostTotalSummaryProjection: SensitiveStringFieldProjectionSchema,
        currentEffectiveBaselineCostSummaryProjection: SensitiveStringFieldProjectionSchema,
        grossMarginSummaryProjection: SensitiveStringFieldProjectionSchema,
        taxImpactSummaryProjection: SensitiveStringFieldProjectionSchema,
        allocationStabilitySummary: z.string().nullable(),
        unmappedCostSummary: z.string().nullable(),
        dataMaturityLevel: z.string(),
        currentActionLevel: OperatingSnapshotActionLevelSchema,
        referencedBaselineVersion: z.string(),
        referencedSnapshotVersion: z.string(),
        allowedActions: z.array(z.string())
    })
    .meta({ id: 'ProjectBusinessOutcomeOverviewView' });

export type ProjectBusinessOutcomeOverviewView = z.infer<typeof ProjectBusinessOutcomeOverviewViewSchema>;

export const ProjectUnifiedAccountingViewSchema = z
    .object({
        projectId: z.uuid(),
        snapshotId: z.uuid(),
        originalBaselineCostSummaryProjection: SensitiveStringFieldProjectionSchema,
        currentEffectiveBaselineCostSummaryProjection: SensitiveStringFieldProjectionSchema,
        includedCostTotalSummaryProjection: SensitiveStringFieldProjectionSchema,
        receivableConfirmedAmountSummaryProjection: SensitiveStringFieldProjectionSchema,
        taxImpactSummaryProjection: SensitiveStringFieldProjectionSchema,
        taxImpactPendingAmountProjection: SensitiveStringFieldProjectionSchema,
        allocationStabilitySummary: z.string().nullable(),
        unmappedCostSummary: z.string().nullable(),
        dataMaturityLevel: z.string(),
        costActionRecommendation: OperatingSnapshotActionLevelSchema,
        referencedBaselineVersion: z.string(),
        referencedSnapshotVersion: z.string(),
        allowedActions: z.array(z.string())
    })
    .meta({ id: 'ProjectUnifiedAccountingView' });

export type ProjectUnifiedAccountingView = z.infer<typeof ProjectUnifiedAccountingViewSchema>;

export const ProjectVarianceRiskExplanationViewSchema = z
    .object({
        projectId: z.uuid(),
        signalEvaluationId: z.uuid(),
        varianceSourceSummaryProjection: SensitiveStringFieldProjectionSchema,
        riskLevel: z.string(),
        taxImpactSummaryProjection: SensitiveStringFieldProjectionSchema,
        allocationStabilitySummary: z.string().nullable(),
        unmappedCostSummary: z.string().nullable(),
        dataMaturityLevel: z.string(),
        costActionRecommendation: OperatingSnapshotActionLevelSchema,
        currentActionLevel: OperatingSnapshotActionLevelSchema,
        referencedBaselineVersion: z.string(),
        referencedSnapshotVersion: z.string(),
        recommendedActionSummary: z.string().nullable(),
        allowedActions: z.array(z.string())
    })
    .meta({ id: 'ProjectVarianceRiskExplanationView' });

export type ProjectVarianceRiskExplanationView = z.infer<typeof ProjectVarianceRiskExplanationViewSchema>;

export const BusinessAccountingFeedbackViewSchema = z
    .object({
        projectId: z.uuid(),
        signalLevel: z.string(),
        currentActionLevel: OperatingSnapshotActionLevelSchema,
        taxImpactSummaryProjection: SensitiveStringFieldProjectionSchema,
        allocationStabilitySummary: z.string().nullable(),
        unmappedCostSummary: z.string().nullable(),
        dataMaturityLevel: z.string(),
        costActionRecommendation: OperatingSnapshotActionLevelSchema,
        referencedBaselineVersion: z.string(),
        referencedSnapshotVersion: z.string(),
        nextActionSummaryProjection: SensitiveStringFieldProjectionSchema,
        downstreamConsumerSummaryProjection: SensitiveStringFieldProjectionSchema,
        allowedActions: z.array(z.string())
    })
    .meta({ id: 'BusinessAccountingFeedbackView' });

export type BusinessAccountingFeedbackView = z.infer<typeof BusinessAccountingFeedbackViewSchema>;

export const CreatePaymentFactProjectActualCostRecordRequestSchema = z
    .object({
        costType: z.literal('PAYMENT_FACT'),
        paymentRecordId: z.uuid(),
        costDescription: z.string().trim().min(1).max(1000).nullable().optional(),
        evidenceSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        expectedSourceVersion: z.number().int().positive().optional()
    })
    .strict()
    .meta({ id: 'CreatePaymentFactProjectActualCostRecordRequest' });

export type CreatePaymentFactProjectActualCostRecordRequest = z.infer<typeof CreatePaymentFactProjectActualCostRecordRequestSchema>;

export const CreateInvoiceProjectActualCostRecordRequestSchema = z
    .object({
        costType: z.literal('INVOICE'),
        invoiceRecordId: z.uuid(),
        costDescription: z.string().trim().min(1).max(1000).nullable().optional(),
        evidenceSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        taxImpactSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        expectedSourceVersion: z.number().int().positive().optional()
    })
    .strict()
    .meta({ id: 'CreateInvoiceProjectActualCostRecordRequest' });

export type CreateInvoiceProjectActualCostRecordRequest = z.infer<typeof CreateInvoiceProjectActualCostRecordRequestSchema>;

export const CreateExpenseProjectActualCostRecordRequestSchema = z
    .object({
        costType: z.literal('EXPENSE'),
        expenseRecordId: z.uuid(),
        costDescription: z.string().trim().min(1).max(1000).nullable().optional(),
        evidenceSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        taxImpactSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        expectedSourceVersion: z.number().int().positive().optional()
    })
    .strict()
    .meta({ id: 'CreateExpenseProjectActualCostRecordRequest' });

export type CreateExpenseProjectActualCostRecordRequest = z.infer<typeof CreateExpenseProjectActualCostRecordRequestSchema>;

export const CreateProcurementProjectActualCostRecordRequestSchema = z
    .object({
        costType: z.literal('PROCUREMENT'),
        payableRecordId: z.uuid(),
        costDescription: z.string().trim().min(1).max(1000).nullable().optional(),
        evidenceSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        taxImpactSummary: z.string().trim().min(1).max(2000).nullable().optional(),
        expectedSourceVersion: z.number().int().positive().optional()
    })
    .strict()
    .meta({ id: 'CreateProcurementProjectActualCostRecordRequest' });

export type CreateProcurementProjectActualCostRecordRequest = z.infer<typeof CreateProcurementProjectActualCostRecordRequestSchema>;

export const CreateLaborProjectActualCostRecordRequestSchema = z
    .object({
        costType: z.literal('LABOR'),
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
        attachmentIds: z.array(z.uuid()).optional()
    })
    .strict()
    .meta({ id: 'CreateLaborProjectActualCostRecordRequest' });

export type CreateLaborProjectActualCostRecordRequest = z.infer<typeof CreateLaborProjectActualCostRecordRequestSchema>;

export const CreateProjectActualCostRecordRequestSchema = z
    .discriminatedUnion('costType', [
        CreatePaymentFactProjectActualCostRecordRequestSchema,
        CreateInvoiceProjectActualCostRecordRequestSchema,
        CreateExpenseProjectActualCostRecordRequestSchema,
        CreateProcurementProjectActualCostRecordRequestSchema,
        CreateLaborProjectActualCostRecordRequestSchema
    ])
    .meta({ id: 'CreateProjectActualCostRecordRequest' });

export type CreateProjectActualCostRecordRequest = z.infer<typeof CreateProjectActualCostRecordRequestSchema>;

export const ReplaceLaborCostRecordRequestSchema = z
    .object({
        laborPeriodStart: z.iso.date(),
        laborPeriodEnd: z.iso.date(),
        actualHours: z.string().trim().min(1).max(64).nullable().optional(),
        actualPersonDays: z.string().trim().min(1).max(64).nullable().optional(),
        workSummary: z.string().trim().min(1).max(1000).nullable().optional(),
        rateVersionId: z.uuid(),
        replaceReason: z.string().trim().min(1).max(256),
        expectedSupersededRecordVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ReplaceLaborCostRecordRequest' });

export type ReplaceLaborCostRecordRequest = z.infer<typeof ReplaceLaborCostRecordRequestSchema>;
