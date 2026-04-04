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

export const SanitizedUserWithOrgUnitsSchema = SanitizedUserSchema.extend({
    orgUnits: z.array(UnitOrgSchema)
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
        paymentAmount: z.string(),
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
        paymentAmount: z.string().trim().min(1).max(64),
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
        isCurrent: z.boolean(),
        status: z.enum(['draft', 'frozen', 'superseded']),
        participantsJson: z.array(CommissionParticipantSchema),
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
