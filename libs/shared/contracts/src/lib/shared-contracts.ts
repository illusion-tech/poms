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
        description: z.string().max(1000).nullable().optional(),
        displayOrder: z.number().int().min(0).optional()
    })
    .refine((v) => v.name !== undefined || v.description !== undefined || v.displayOrder !== undefined, {
        message: 'At least one field is required for update'
    })
    .meta({ id: 'UpdateOrgUnitRequest' });

export type UpdateOrgUnitRequest = z.infer<typeof UpdateOrgUnitRequestSchema>;

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
