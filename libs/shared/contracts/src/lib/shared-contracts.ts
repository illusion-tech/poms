import { z } from 'zod';

type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

type EnumDefinitionBase<TKey extends string = string, TValue extends string = string> = {
    key: TKey;
    value: TValue;
    label: string;
    order: number;
};

type EnumDefinitionWithSeverity<TKey extends string = string, TValue extends string = string, TSeverity extends string = string> = EnumDefinitionBase<TKey, TValue> & {
    severity: TSeverity;
};

export type EnumDefinition<TKey extends string = string, TValue extends string = string> = EnumDefinitionBase<TKey, TValue>;

export type EnumDefinitionValue<TDefinitions extends NonEmptyReadonlyArray<{ value: string }>> = TDefinitions[number]['value'];

export type EnumValueObject<TDefinitions extends NonEmptyReadonlyArray<{ key: string; value: string }>> = {
    readonly [TDefinition in TDefinitions[number] as TDefinition['key']]: TDefinition['value'];
};

export type EnumLabelMap<TDefinitions extends NonEmptyReadonlyArray<{ value: string; label: string }>> = {
    readonly [TDefinition in TDefinitions[number] as TDefinition['value']]: TDefinition['label'];
};

export type EnumSeverityMap<TDefinitions extends NonEmptyReadonlyArray<{ value: string; severity: string }>> = {
    readonly [TDefinition in TDefinitions[number] as TDefinition['value']]: TDefinition['severity'];
};

export type EnumOption<TValue extends string = string> = {
    label: string;
    value: TValue;
};

export function defineEnumDefinitions<const TDefinitions extends NonEmptyReadonlyArray<EnumDefinitionBase>>(definitions: TDefinitions): TDefinitions {
    return definitions;
}

export function defineSeverityEnumDefinitions<const TDefinitions extends NonEmptyReadonlyArray<EnumDefinitionWithSeverity>>(definitions: TDefinitions): TDefinitions {
    return definitions;
}

export function enumObjectValues<const TValueObject extends Record<string, string>>(valueObject: TValueObject): NonEmptyReadonlyArray<TValueObject[keyof TValueObject]> {
    return Object.values(valueObject) as unknown as NonEmptyReadonlyArray<TValueObject[keyof TValueObject]>;
}

export function enumDefinitionValues<const TDefinitions extends NonEmptyReadonlyArray<{ value: string }>>(definitions: TDefinitions): NonEmptyReadonlyArray<EnumDefinitionValue<TDefinitions>> {
    return definitions.map((definition) => definition.value) as unknown as NonEmptyReadonlyArray<EnumDefinitionValue<TDefinitions>>;
}

export function enumDefinitionValueObject<const TDefinitions extends NonEmptyReadonlyArray<{ key: string; value: string }>>(definitions: TDefinitions): EnumValueObject<TDefinitions> {
    return Object.fromEntries(definitions.map((definition) => [definition.key, definition.value])) as EnumValueObject<TDefinitions>;
}

export function enumDefinitionLabels<const TDefinitions extends NonEmptyReadonlyArray<{ value: string; label: string }>>(definitions: TDefinitions): EnumLabelMap<TDefinitions> {
    return Object.fromEntries(definitions.map((definition) => [definition.value, definition.label])) as EnumLabelMap<TDefinitions>;
}

export function enumDefinitionOptions<const TDefinitions extends NonEmptyReadonlyArray<{ value: string; label: string }>>(definitions: TDefinitions): ReadonlyArray<EnumOption<EnumDefinitionValue<TDefinitions>>> {
    return definitions.map((definition) => ({ label: definition.label, value: definition.value })) as ReadonlyArray<EnumOption<EnumDefinitionValue<TDefinitions>>>;
}

export function enumDefinitionSeverities<const TDefinitions extends NonEmptyReadonlyArray<{ value: string; severity: string }>>(definitions: TDefinitions): EnumSeverityMap<TDefinitions> {
    return Object.fromEntries(definitions.map((definition) => [definition.value, definition.severity])) as EnumSeverityMap<TDefinitions>;
}

// ---------------------------------------------------------------------------
// Permission Keys (SSOT)
// ---------------------------------------------------------------------------

export const PERMISSION_KEYS = [
    // 平台管理
    'platform:users:manage',
    'platform:roles:manage',
    'platform:navigation:manage',
    'platform:org-units:manage',
    'platform:dictionaries:manage',
    'platform:identity-providers:manage',
    'platform:attachment-storage-providers:manage',
    // 客户主数据
    'customer:read',
    'customer:write',
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
    'lead:assign',
    'lead:score:override',
    'lead:source:manage',
    // 项目
    'project:read',
    'project:write',
    'project:delete',
    // 导航可见性（仅影响菜单展示，不代替后端业务权限）
    'nav:dashboard:view',
    'nav:customers:view',
    'nav:platform:view',
    'nav:leads:view',
    'nav:attachments:view',
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
    'platform:dictionaries:manage': { description: '管理业务配置字典', group: '平台管理' },
    'platform:identity-providers:manage': { description: '管理外部身份提供商配置', group: '平台管理' },
    'platform:attachment-storage-providers:manage': { description: '管理附件存储 Provider 配置', group: '平台管理' },
    'customer:read': { description: '查看客户主数据', group: '客户' },
    'customer:write': { description: '创建/维护客户主数据', group: '客户' },
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
    'lead:assign': { description: '分配/改派销售线索负责人', group: '线索' },
    'lead:score:override': { description: '审批线索评分人工覆盖', group: '线索' },
    'lead:source:manage': { description: '管理线索来源字典', group: '线索' },
    'project:read': { description: '查看项目', group: '项目' },
    'project:write': { description: '创建/编辑项目', group: '项目' },
    'project:delete': { description: '删除项目', group: '项目' },
    'nav:dashboard:view': { description: '查看工作台菜单', group: '导航' },
    'nav:customers:view': { description: '查看客户菜单', group: '导航' },
    'nav:platform:view': { description: '查看平台管理菜单', group: '导航' },
    'nav:leads:view': { description: '查看线索菜单', group: '导航' },
    'nav:attachments:view': { description: '查看附件中心菜单', group: '导航' },
    'nav:projects:view': { description: '查看项目菜单', group: '导航' },
    'nav:contracts:view': { description: '查看合同菜单', group: '导航' },
    'nav:profile:view': { description: '查看个人中心菜单', group: '导航' }
};

// ---------------------------------------------------------------------------
// Sensitive Field Projection
// ---------------------------------------------------------------------------

export const SENSITIVE_FIELD_PACKAGE_KEYS = ['contract-finance', 'operating-finance', 'commission-compensation', 'labor-cost-rate', 'exception-approval-opinion'] as const;

export type SensitiveFieldPackageKey = (typeof SENSITIVE_FIELD_PACKAGE_KEYS)[number];

export const SensitiveFieldPackageKeySchema = z.enum(SENSITIVE_FIELD_PACKAGE_KEYS).meta({ id: 'SensitiveFieldPackageKey' });

export const SensitiveFieldPackageKeyValue = {
    ContractFinance: 'contract-finance',
    OperatingFinance: 'operating-finance',
    CommissionCompensation: 'commission-compensation',
    LaborCostRate: 'labor-cost-rate',
    ExceptionApprovalOpinion: 'exception-approval-opinion'
} as const satisfies Record<string, SensitiveFieldPackageKey>;

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

export const SensitiveProjectionModeValue = {
    Full: 'full',
    Summary: 'summary',
    Masked: 'masked',
    Denied: 'denied'
} as const satisfies Record<string, SensitiveProjectionMode>;

export const SENSITIVE_PROJECTION_REASON_CODES = ['allowed', 'summary-only', 'missing-sensitive-read-permission', 'field-package-not-applicable'] as const;

export type SensitiveProjectionReasonCode = (typeof SENSITIVE_PROJECTION_REASON_CODES)[number];

export const SensitiveProjectionReasonCodeSchema = z.enum(SENSITIVE_PROJECTION_REASON_CODES).meta({ id: 'SensitiveProjectionReasonCode' });

export const SensitiveProjectionReasonCodeValue = {
    Allowed: 'allowed',
    SummaryOnly: 'summary-only',
    MissingSensitiveReadPermission: 'missing-sensitive-read-permission',
    FieldPackageNotApplicable: 'field-package-not-applicable'
} as const satisfies Record<string, SensitiveProjectionReasonCode>;

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
// Shared lifecycle candidates
// ---------------------------------------------------------------------------

export const ActiveInactiveStatusValue = {
    Active: 'active',
    Inactive: 'inactive'
} as const;

export const ACTIVE_INACTIVE_STATUSES = enumObjectValues(ActiveInactiveStatusValue);
export type ActiveInactiveStatus = (typeof ACTIVE_INACTIVE_STATUSES)[number];
export const ActiveInactiveStatusSchema = z.enum(ACTIVE_INACTIVE_STATUSES).meta({ id: 'ActiveInactiveStatus' });

export const VersionLifecycleStatusValue = {
    Active: 'active',
    Superseded: 'superseded',
    Voided: 'voided'
} as const;

export const VERSION_LIFECYCLE_STATUSES = enumObjectValues(VersionLifecycleStatusValue);
export type VersionLifecycleStatus = (typeof VERSION_LIFECYCLE_STATUSES)[number];
export const VersionLifecycleStatusSchema = z.enum(VERSION_LIFECYCLE_STATUSES).meta({ id: 'VersionLifecycleStatus' });

export const EffectiveSupersededStatusValue = {
    Effective: 'effective',
    Superseded: 'superseded'
} as const;

export const EFFECTIVE_SUPERSEDED_STATUSES = enumObjectValues(EffectiveSupersededStatusValue);
export type EffectiveSupersededStatus = (typeof EFFECTIVE_SUPERSEDED_STATUSES)[number];
export const EffectiveSupersededStatusSchema = z.enum(EFFECTIVE_SUPERSEDED_STATUSES).meta({ id: 'EffectiveSupersededStatus' });

export const ReadyBlockedMissingStatusValue = {
    Ready: 'ready',
    Blocked: 'blocked',
    Missing: 'missing'
} as const;

export const READY_BLOCKED_MISSING_STATUSES = enumObjectValues(ReadyBlockedMissingStatusValue);
export type ReadyBlockedMissingStatus = (typeof READY_BLOCKED_MISSING_STATUSES)[number];
export const ReadyBlockedMissingStatusSchema = z.enum(READY_BLOCKED_MISSING_STATUSES).meta({ id: 'ReadyBlockedMissingStatus' });

export const AvailableMissingStatusValue = {
    Available: 'available',
    Missing: 'missing'
} as const;

export const AVAILABLE_MISSING_STATUSES = enumObjectValues(AvailableMissingStatusValue);
export type AvailableMissingStatus = (typeof AVAILABLE_MISSING_STATUSES)[number];
export const AvailableMissingStatusSchema = z.enum(AVAILABLE_MISSING_STATUSES).meta({ id: 'AvailableMissingStatus' });

export const PendingConfirmedClosedStatusValue = {
    Pending: 'pending',
    Confirmed: 'confirmed',
    Closed: 'closed'
} as const;

export const PENDING_CONFIRMED_CLOSED_STATUSES = enumObjectValues(PendingConfirmedClosedStatusValue);
export type PendingConfirmedClosedStatus = (typeof PENDING_CONFIRMED_CLOSED_STATUSES)[number];
export const PendingConfirmedClosedStatusSchema = z.enum(PENDING_CONFIRMED_CLOSED_STATUSES).meta({ id: 'PendingConfirmedClosedStatus' });

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

export const USER_ORG_UNIT_MEMBERSHIP_TYPES = ['primary', 'secondary'] as const;

export type UserOrgUnitMembershipType = (typeof USER_ORG_UNIT_MEMBERSHIP_TYPES)[number];

export const UserOrgUnitMembershipTypeSchema = z.enum(USER_ORG_UNIT_MEMBERSHIP_TYPES).meta({ id: 'UserOrgUnitMembershipType' });

export const UserOrgUnitMembershipTypeValue = {
    Primary: 'primary',
    Secondary: 'secondary'
} as const satisfies Record<string, UserOrgUnitMembershipType>;

export const UserOrgUnitSummarySchema = z
    .object({
        id: z.uuid(),
        name: z.string(),
        code: z.string().nullable(),
        description: z.string().nullable(),
        membershipType: UserOrgUnitMembershipTypeSchema
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

export const PlatformPermissionStatusValue = {
    Active: 'active',
    Inactive: 'inactive',
    Deprecated: 'deprecated'
} as const;

export const PLATFORM_PERMISSION_STATUSES = enumObjectValues(PlatformPermissionStatusValue);
export type PlatformPermissionStatus = (typeof PLATFORM_PERMISSION_STATUSES)[number];
export const PlatformPermissionStatusSchema = z.enum(PLATFORM_PERMISSION_STATUSES).meta({ id: 'PlatformPermissionStatus' });

export const PlatformPermissionSourceTypeValue = {
    SystemSeeded: 'system-seeded'
} as const;

export const PLATFORM_PERMISSION_SOURCE_TYPES = enumObjectValues(PlatformPermissionSourceTypeValue);
export type PlatformPermissionSourceType = (typeof PLATFORM_PERMISSION_SOURCE_TYPES)[number];
export const PlatformPermissionSourceTypeSchema = z.enum(PLATFORM_PERMISSION_SOURCE_TYPES).meta({ id: 'PlatformPermissionSourceType' });

export const PlatformPermissionSummarySchema = z
    .object({
        key: z.enum(PERMISSION_KEYS),
        name: z.string(),
        description: z.string(),
        group: z.string(),
        status: PlatformPermissionStatusSchema,
        isSystemPermission: z.boolean(),
        sourceType: PlatformPermissionSourceTypeSchema,
        deprecatedBy: z.enum(PERMISSION_KEYS).nullable()
    })
    .meta({ id: 'PlatformPermissionSummary' });

export type PlatformPermissionSummary = z.infer<typeof PlatformPermissionSummarySchema>;

export const PlatformPermissionListSchema = z.array(PlatformPermissionSummarySchema).meta({ id: 'PlatformPermissionList' });

export type PlatformPermissionList = z.infer<typeof PlatformPermissionListSchema>;

// ---------------------------------------------------------------------------
// External Identity Providers
// ---------------------------------------------------------------------------

export const IdentityProviderValue = {
    Feishu: 'feishu'
} as const;

export const IDENTITY_PROVIDERS = enumObjectValues(IdentityProviderValue);
export type IdentityProvider = (typeof IDENTITY_PROVIDERS)[number];
export const IdentityProviderSchema = z.enum(IDENTITY_PROVIDERS).meta({ id: 'IdentityProvider' });

export const IdentityProviderConfigStatusValue = {
    Draft: 'draft',
    Active: 'active',
    Disabled: 'disabled',
    Misconfigured: 'misconfigured'
} as const;

export const IDENTITY_PROVIDER_CONFIG_STATUSES = enumObjectValues(IdentityProviderConfigStatusValue);
export type IdentityProviderConfigStatus = (typeof IDENTITY_PROVIDER_CONFIG_STATUSES)[number];
export const IdentityProviderConfigStatusSchema = z.enum(IDENTITY_PROVIDER_CONFIG_STATUSES).meta({ id: 'IdentityProviderConfigStatus' });

export const IdentityProviderSearchGrantModeValue = {
    PerAdmin: 'per-admin',
    ServiceAccount: 'service-account'
} as const;

export const IDENTITY_PROVIDER_SEARCH_GRANT_MODES = enumObjectValues(IdentityProviderSearchGrantModeValue);
export type IdentityProviderSearchGrantMode = (typeof IDENTITY_PROVIDER_SEARCH_GRANT_MODES)[number];
export const IdentityProviderSearchGrantModeSchema = z.enum(IDENTITY_PROVIDER_SEARCH_GRANT_MODES).meta({ id: 'IdentityProviderSearchGrantMode' });

export const IdentityProviderConnectionTestStatusValue = {
    Success: 'success',
    Failed: 'failed'
} as const;

export const IDENTITY_PROVIDER_CONNECTION_TEST_STATUSES = enumObjectValues(IdentityProviderConnectionTestStatusValue);
export type IdentityProviderConnectionTestStatus = (typeof IDENTITY_PROVIDER_CONNECTION_TEST_STATUSES)[number];
export const IdentityProviderConnectionTestStatusSchema = z.enum(IDENTITY_PROVIDER_CONNECTION_TEST_STATUSES).meta({ id: 'IdentityProviderConnectionTestStatus' });

export const IdentityProviderScopeListSchema = z.array(z.string().trim().min(1).max(128)).max(32);
export const IdentityProviderTenantAllowlistSchema = z.array(z.string().trim().min(1).max(128)).max(32);

export const IdentityProviderConfigSummarySchema = z
    .object({
        id: z.uuid(),
        provider: IdentityProviderSchema,
        tenantId: z.string().nullable(),
        displayName: z.string(),
        status: IdentityProviderConfigStatusSchema,
        enabled: z.boolean(),
        loginEnabled: z.boolean(),
        bindingEnabled: z.boolean(),
        searchEnabled: z.boolean(),
        clientId: z.string(),
        secretConfigured: z.boolean(),
        redirectUri: z.string().url().nullable(),
        searchRedirectUri: z.string().url().nullable(),
        loginScopes: IdentityProviderScopeListSchema,
        searchScopes: IdentityProviderScopeListSchema,
        tenantAllowlist: IdentityProviderTenantAllowlistSchema,
        searchGrantMode: IdentityProviderSearchGrantModeSchema,
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'IdentityProviderConfigSummary' });

export type IdentityProviderConfigSummary = z.infer<typeof IdentityProviderConfigSummarySchema>;

export const IdentityProviderConfigDetailSchema = IdentityProviderConfigSummarySchema.meta({ id: 'IdentityProviderConfigDetail' });

export type IdentityProviderConfigDetail = z.infer<typeof IdentityProviderConfigDetailSchema>;

export const IdentityProviderConfigListSchema = z.array(IdentityProviderConfigSummarySchema).meta({ id: 'IdentityProviderConfigList' });

export type IdentityProviderConfigList = z.infer<typeof IdentityProviderConfigListSchema>;

export const IdentityProviderConfigListQuerySchema = z
    .object({
        provider: IdentityProviderSchema.optional(),
        status: IdentityProviderConfigStatusSchema.optional()
    })
    .meta({ id: 'IdentityProviderConfigListQuery' });

export type IdentityProviderConfigListQuery = z.infer<typeof IdentityProviderConfigListQuerySchema>;

export const CreateIdentityProviderConfigRequestSchema = z
    .object({
        provider: IdentityProviderSchema,
        tenantId: z.string().trim().min(1).max(128).nullable().optional(),
        displayName: z.string().trim().min(1).max(128),
        enabled: z.boolean().optional(),
        loginEnabled: z.boolean().optional(),
        bindingEnabled: z.boolean().optional(),
        searchEnabled: z.boolean().optional(),
        clientId: z.string().trim().min(1).max(255),
        clientSecret: z.string().trim().min(1).max(2048).optional(),
        redirectUri: z.string().trim().url().nullable().optional(),
        searchRedirectUri: z.string().trim().url().nullable().optional(),
        loginScopes: IdentityProviderScopeListSchema.optional(),
        searchScopes: IdentityProviderScopeListSchema.optional(),
        tenantAllowlist: IdentityProviderTenantAllowlistSchema.optional(),
        searchGrantMode: IdentityProviderSearchGrantModeSchema.optional()
    })
    .meta({ id: 'CreateIdentityProviderConfigRequest' });

export type CreateIdentityProviderConfigRequest = z.infer<typeof CreateIdentityProviderConfigRequestSchema>;

export const UpdateIdentityProviderConfigRequestSchema = z
    .object({
        displayName: z.string().trim().min(1).max(128).optional(),
        enabled: z.boolean().optional(),
        loginEnabled: z.boolean().optional(),
        bindingEnabled: z.boolean().optional(),
        searchEnabled: z.boolean().optional(),
        clientId: z.string().trim().min(1).max(255).optional(),
        clientSecret: z.string().trim().min(1).max(2048).optional(),
        redirectUri: z.string().trim().url().nullable().optional(),
        searchRedirectUri: z.string().trim().url().nullable().optional(),
        loginScopes: IdentityProviderScopeListSchema.optional(),
        searchScopes: IdentityProviderScopeListSchema.optional(),
        tenantAllowlist: IdentityProviderTenantAllowlistSchema.optional(),
        searchGrantMode: IdentityProviderSearchGrantModeSchema.optional(),
        status: IdentityProviderConfigStatusSchema.optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .refine(
        (value) =>
            value.displayName !== undefined ||
            value.enabled !== undefined ||
            value.loginEnabled !== undefined ||
            value.bindingEnabled !== undefined ||
            value.searchEnabled !== undefined ||
            value.clientId !== undefined ||
            value.clientSecret !== undefined ||
            value.redirectUri !== undefined ||
            value.searchRedirectUri !== undefined ||
            value.loginScopes !== undefined ||
            value.searchScopes !== undefined ||
            value.tenantAllowlist !== undefined ||
            value.searchGrantMode !== undefined ||
            value.status !== undefined,
        { message: 'At least one updatable field is required' }
    )
    .meta({ id: 'UpdateIdentityProviderConfigRequest' });

export type UpdateIdentityProviderConfigRequest = z.infer<typeof UpdateIdentityProviderConfigRequestSchema>;

export const TestIdentityProviderConnectionRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'TestIdentityProviderConnectionRequest' });

export type TestIdentityProviderConnectionRequest = z.infer<typeof TestIdentityProviderConnectionRequestSchema>;

export const IdentityProviderConnectionTestResultSchema = z
    .object({
        status: IdentityProviderConnectionTestStatusSchema,
        message: z.string(),
        checkedAt: z.iso.datetime()
    })
    .meta({ id: 'IdentityProviderConnectionTestResult' });

export type IdentityProviderConnectionTestResult = z.infer<typeof IdentityProviderConnectionTestResultSchema>;

export const IdentityProviderOAuthGrantStatusValue = {
    Missing: 'missing',
    Active: 'active',
    Expired: 'expired',
    Revoked: 'revoked'
} as const;

export const IDENTITY_PROVIDER_OAUTH_GRANT_STATUSES = enumObjectValues(IdentityProviderOAuthGrantStatusValue);
export type IdentityProviderOAuthGrantStatus = (typeof IDENTITY_PROVIDER_OAUTH_GRANT_STATUSES)[number];
export const IdentityProviderOAuthGrantStatusSchema = z.enum(IDENTITY_PROVIDER_OAUTH_GRANT_STATUSES).meta({ id: 'IdentityProviderOAuthGrantStatus' });

export const IdentityProviderOAuthGrantSummarySchema = z
    .object({
        id: z.uuid().nullable(),
        identityProviderConfigId: z.uuid(),
        provider: IdentityProviderSchema,
        tenantId: z.string().nullable(),
        pomsUserId: z.uuid(),
        status: IdentityProviderOAuthGrantStatusSchema,
        scopes: IdentityProviderScopeListSchema,
        grantedAt: z.iso.datetime().nullable(),
        expiresAt: z.iso.datetime().nullable(),
        refreshExpiresAt: z.iso.datetime().nullable(),
        lastUsedAt: z.iso.datetime().nullable(),
        lastError: z.string().nullable(),
        rowVersion: z.number().int().nullable(),
        updatedAt: z.iso.datetime().nullable()
    })
    .meta({ id: 'IdentityProviderOAuthGrantSummary' });

export type IdentityProviderOAuthGrantSummary = z.infer<typeof IdentityProviderOAuthGrantSummarySchema>;

export const IdentityProviderOAuthAuthorizeResultSchema = z
    .object({
        authorizeUrl: z.string().url(),
        stateExpiresAt: z.iso.datetime()
    })
    .meta({ id: 'IdentityProviderOAuthAuthorizeResult' });

export type IdentityProviderOAuthAuthorizeResult = z.infer<typeof IdentityProviderOAuthAuthorizeResultSchema>;

export const IdentityProviderOAuthCallbackQuerySchema = z
    .object({
        code: z.string().trim().min(1).max(2048).optional(),
        state: z.string().trim().min(1).max(4096),
        error: z.string().trim().min(1).max(255).optional(),
        error_description: z.string().trim().min(1).max(2048).optional()
    })
    .meta({ id: 'IdentityProviderOAuthCallbackQuery' });

export type IdentityProviderOAuthCallbackQuery = z.infer<typeof IdentityProviderOAuthCallbackQuerySchema>;

export const ExternalUserSearchQuerySchema = z
    .object({
        q: z.string().trim().min(1).max(128),
        limit: z.coerce.number().int().min(1).max(50).optional()
    })
    .meta({ id: 'ExternalUserSearchQuery' });

export type ExternalUserSearchQuery = z.infer<typeof ExternalUserSearchQuerySchema>;

export const ExternalUserCandidateSchema = z
    .object({
        identityProviderConfigId: z.uuid(),
        provider: IdentityProviderSchema,
        tenantId: z.string().nullable(),
        subjectId: z.string(),
        unionId: z.string().nullable(),
        displayName: z.string(),
        avatarUrl: z.string().url().nullable(),
        email: z.email().nullable(),
        mobile: z.string().nullable(),
        departmentNames: z.array(z.string()).max(16)
    })
    .meta({ id: 'ExternalUserCandidate' });

export type ExternalUserCandidate = z.infer<typeof ExternalUserCandidateSchema>;

export const ExternalUserSearchResultSchema = z
    .object({
        identityProviderConfigId: z.uuid(),
        provider: IdentityProviderSchema,
        tenantId: z.string().nullable(),
        query: z.string(),
        items: z.array(ExternalUserCandidateSchema),
        searchedAt: z.iso.datetime()
    })
    .meta({ id: 'ExternalUserSearchResult' });

export type ExternalUserSearchResult = z.infer<typeof ExternalUserSearchResultSchema>;

export const EnabledLoginProviderSummarySchema = z
    .object({
        id: z.uuid(),
        provider: IdentityProviderSchema,
        tenantId: z.string().nullable(),
        displayName: z.string(),
        loginScopes: IdentityProviderScopeListSchema
    })
    .meta({ id: 'EnabledLoginProviderSummary' });

export type EnabledLoginProviderSummary = z.infer<typeof EnabledLoginProviderSummarySchema>;

export const EnabledLoginProviderListSchema = z.array(EnabledLoginProviderSummarySchema).meta({ id: 'EnabledLoginProviderList' });

export type EnabledLoginProviderList = z.infer<typeof EnabledLoginProviderListSchema>;

export const ExternalLoginAuthorizeResultSchema = z
    .object({
        authorizeUrl: z.string().url(),
        stateExpiresAt: z.iso.datetime()
    })
    .meta({ id: 'ExternalLoginAuthorizeResult' });

export type ExternalLoginAuthorizeResult = z.infer<typeof ExternalLoginAuthorizeResultSchema>;

export const ExternalLoginCallbackQuerySchema = z
    .object({
        code: z.string().trim().min(1).max(2048).optional(),
        state: z.string().trim().min(1).max(4096),
        error: z.string().trim().min(1).max(255).optional(),
        error_description: z.string().trim().min(1).max(2048).optional()
    })
    .meta({ id: 'ExternalLoginCallbackQuery' });

export type ExternalLoginCallbackQuery = z.infer<typeof ExternalLoginCallbackQuerySchema>;

export const ExternalLoginCallbackResultSchema = z
    .object({
        ticket: z.string(),
        expiresAt: z.iso.datetime(),
        provider: IdentityProviderSchema,
        identityProviderConfigId: z.uuid(),
        pomsUserId: z.uuid()
    })
    .meta({ id: 'ExternalLoginCallbackResult' });

export type ExternalLoginCallbackResult = z.infer<typeof ExternalLoginCallbackResultSchema>;

export const CreateExternalLoginSessionRequestSchema = z
    .object({
        ticket: z.string().trim().min(32).max(4096)
    })
    .meta({ id: 'CreateExternalLoginSessionRequest' });

export type CreateExternalLoginSessionRequest = z.infer<typeof CreateExternalLoginSessionRequestSchema>;

export const ExternalIdentityBindingStatusValue = {
    Active: 'active',
    Revoked: 'revoked'
} as const;

export const EXTERNAL_IDENTITY_BINDING_STATUSES = enumObjectValues(ExternalIdentityBindingStatusValue);
export type ExternalIdentityBindingStatus = (typeof EXTERNAL_IDENTITY_BINDING_STATUSES)[number];
export const ExternalIdentityBindingStatusSchema = z.enum(EXTERNAL_IDENTITY_BINDING_STATUSES).meta({ id: 'ExternalIdentityBindingStatus' });

export const ExternalIdentityBindingSummarySchema = z
    .object({
        id: z.uuid(),
        identityProviderConfigId: z.uuid(),
        provider: IdentityProviderSchema,
        tenantId: z.string().nullable(),
        pomsUserId: z.uuid(),
        subjectId: z.string(),
        unionId: z.string().nullable(),
        subjectDisplayName: z.string().nullable(),
        avatarUrl: z.string().url().nullable(),
        email: z.email().nullable(),
        mobile: z.string().nullable(),
        status: ExternalIdentityBindingStatusSchema,
        boundAt: z.iso.datetime(),
        boundBy: z.uuid().nullable(),
        revokedAt: z.iso.datetime().nullable(),
        revokedBy: z.uuid().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'ExternalIdentityBindingSummary' });

export type ExternalIdentityBindingSummary = z.infer<typeof ExternalIdentityBindingSummarySchema>;

export const ExternalIdentityBindingListSchema = z.array(ExternalIdentityBindingSummarySchema).meta({ id: 'ExternalIdentityBindingList' });

export type ExternalIdentityBindingList = z.infer<typeof ExternalIdentityBindingListSchema>;

export const BindUserExternalIdentityRequestSchema = z
    .object({
        identityProviderConfigId: z.uuid(),
        tenantId: z.string().trim().min(1).max(128).nullable().optional(),
        subjectId: z.string().trim().min(1).max(255),
        unionId: z.string().trim().min(1).max(255).nullable().optional(),
        subjectDisplayName: z.string().trim().min(1).max(255).nullable().optional(),
        avatarUrl: z.string().trim().url().nullable().optional(),
        email: z.string().trim().email().nullable().optional(),
        mobile: z.string().trim().min(1).max(64).nullable().optional()
    })
    .meta({ id: 'BindUserExternalIdentityRequest' });

export type BindUserExternalIdentityRequest = z.infer<typeof BindUserExternalIdentityRequestSchema>;

export const UnbindExternalIdentityRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'UnbindExternalIdentityRequest' });

export type UnbindExternalIdentityRequest = z.infer<typeof UnbindExternalIdentityRequestSchema>;

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

export const OwnerReferenceUserSchema = z
    .object({
        id: z.uuid(),
        displayName: z.string(),
        isActive: z.boolean(),
        primaryOrgUnitId: z.uuid().nullable(),
        primaryOrgUnitName: z.string().nullable()
    })
    .meta({ id: 'OwnerReferenceUser' });

export type OwnerReferenceUser = z.infer<typeof OwnerReferenceUserSchema>;

export const OwnerReferenceOrgUnitSchema = z
    .object({
        id: z.uuid(),
        name: z.string(),
        code: z.string(),
        isActive: z.boolean()
    })
    .meta({ id: 'OwnerReferenceOrgUnit' });

export type OwnerReferenceOrgUnit = z.infer<typeof OwnerReferenceOrgUnitSchema>;

export const OwnerReferenceDataSchema = z
    .object({
        users: z.array(OwnerReferenceUserSchema),
        orgUnits: z.array(OwnerReferenceOrgUnitSchema)
    })
    .meta({ id: 'OwnerReferenceData' });

export type OwnerReferenceData = z.infer<typeof OwnerReferenceDataSchema>;

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

export const NAVIGATION_ITEM_TYPES = ['basic', 'group', 'collapsable', 'divider'] as const;

export type NavigationItemType = (typeof NAVIGATION_ITEM_TYPES)[number];

export const NavigationItemTypeSchema = z.enum(NAVIGATION_ITEM_TYPES).meta({ id: 'NavigationItemType' });

export const NavigationItemTypeValue = {
    Basic: 'basic',
    Group: 'group',
    Collapsable: 'collapsable',
    Divider: 'divider'
} as const satisfies Record<string, NavigationItemType>;

export const NavigationItemSchema: z.ZodType<NavigationItem> = z.lazy(() =>
    z
        .object({
            id: z.string(),
            key: z.string(),
            type: NavigationItemTypeSchema,
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
// Auth — Session
// ---------------------------------------------------------------------------

export const CreatePasswordAuthSessionRequestSchema = z
    .object({
        username: z.string().min(1),
        password: z.string().min(1)
    })
    .meta({ id: 'CreatePasswordAuthSessionRequest' });

export type CreatePasswordAuthSessionRequest = z.infer<typeof CreatePasswordAuthSessionRequestSchema>;

export const CurrentAuthSessionStatusValue = {
    Active: 'active'
} as const;

export const CURRENT_AUTH_SESSION_STATUSES = enumObjectValues(CurrentAuthSessionStatusValue);
export type CurrentAuthSessionStatus = (typeof CURRENT_AUTH_SESSION_STATUSES)[number];
export const CurrentAuthSessionStatusSchema = z.enum(CURRENT_AUTH_SESSION_STATUSES).meta({ id: 'CurrentAuthSessionStatus' });

export const AuthSessionCsrfHintSchema = z
    .object({
        cookieName: z.string().min(1),
        headerName: z.string().min(1)
    })
    .meta({ id: 'AuthSessionCsrfHint' });

export type AuthSessionCsrfHint = z.infer<typeof AuthSessionCsrfHintSchema>;

export const CsrfTokenViewSchema = AuthSessionCsrfHintSchema.extend({
    token: z.string().min(32),
    expiresAt: z.iso.datetime()
}).meta({ id: 'CsrfTokenView' });

export type CsrfTokenView = z.infer<typeof CsrfTokenViewSchema>;

export const CurrentAuthSessionViewSchema = z
    .object({
        authenticated: z.boolean(),
        status: CurrentAuthSessionStatusSchema.nullable(),
        user: SanitizedUserWithOrgUnitsSchema.nullable(),
        permissions: z.array(z.enum(PERMISSION_KEYS)),
        expiresAt: z.iso.datetime().nullable(),
        csrf: AuthSessionCsrfHintSchema
    })
    .meta({ id: 'CurrentAuthSessionView' });

export type CurrentAuthSessionView = z.infer<typeof CurrentAuthSessionViewSchema>;

export const LogoutAuthSessionRequestSchema = z.object({}).strict().meta({ id: 'LogoutAuthSessionRequest' });

export type LogoutAuthSessionRequest = z.infer<typeof LogoutAuthSessionRequestSchema>;

export const AuthSessionLogoutResultSchema = z
    .object({
        authenticated: z.literal(false),
        resultStatus: z.literal('logged-out'),
        revoked: z.boolean()
    })
    .meta({ id: 'AuthSessionLogoutResult' });

export type AuthSessionLogoutResult = z.infer<typeof AuthSessionLogoutResultSchema>;

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

export const AuditLogResultValue = {
    Success: 'success',
    Rejected: 'rejected',
    Failed: 'failed'
} as const;

export const AUDIT_LOG_RESULTS = enumObjectValues(AuditLogResultValue);
export type AuditLogResult = (typeof AUDIT_LOG_RESULTS)[number];
export const AuditLogResultSchema = z.enum(AUDIT_LOG_RESULTS).meta({ id: 'AuditLogResult' });

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

export const EntityAuditTargetTypeValue = {
    Lead: 'lead',
    Customer: 'customer',
    CustomerContact: 'customer-contact',
    OpportunityStakeholder: 'opportunity-stakeholder',
    CompetitorIntelligence: 'competitor-intelligence',
    SalesDiscoveryRecord: 'sales-discovery-record',
    SalesFollowUpRecord: 'sales-follow-up-record',
    Project: 'project',
    Contract: 'contract'
} as const;

export const ENTITY_AUDIT_TARGET_TYPES = enumObjectValues(EntityAuditTargetTypeValue);
export type EntityAuditTargetType = (typeof ENTITY_AUDIT_TARGET_TYPES)[number];
export const EntityAuditTargetTypeSchema = z.enum(ENTITY_AUDIT_TARGET_TYPES).meta({ id: 'EntityAuditTargetType' });

export const EntityAuditLogListQuerySchema = z
    .object({
        from: z.iso.datetime().optional(),
        to: z.iso.datetime().optional(),
        eventType: z.string().min(1).max(128).optional(),
        result: AuditLogResultSchema.optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
    })
    .meta({ id: 'EntityAuditLogListQuery' });

export type EntityAuditLogListQuery = z.infer<typeof EntityAuditLogListQuerySchema>;

export const SecurityEventResultValue = {
    Blocked: 'blocked',
    Failed: 'failed',
    Expired: 'expired'
} as const;

export const SECURITY_EVENT_RESULTS = enumObjectValues(SecurityEventResultValue);
export type SecurityEventResult = (typeof SECURITY_EVENT_RESULTS)[number];
export const SecurityEventResultSchema = z.enum(SECURITY_EVENT_RESULTS).meta({ id: 'SecurityEventResult' });

export const SecurityEventSeverityValue = {
    Info: 'info',
    Warning: 'warning',
    High: 'high'
} as const;

export const SECURITY_EVENT_SEVERITIES = enumObjectValues(SecurityEventSeverityValue);
export type SecurityEventSeverity = (typeof SECURITY_EVENT_SEVERITIES)[number];
export const SecurityEventSeveritySchema = z.enum(SECURITY_EVENT_SEVERITIES).meta({ id: 'SecurityEventSeverity' });

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
// Customer
// ---------------------------------------------------------------------------

export const CUSTOMER_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Active', value: 'active', label: '启用', severity: 'success', order: 10 },
    { key: 'Inactive', value: 'inactive', label: '停用', severity: 'secondary', order: 20 },
    { key: 'Merged', value: 'merged', label: '已合并', severity: 'contrast', order: 30 }
] as const);

export const CustomerStatusValue = enumDefinitionValueObject(CUSTOMER_STATUS_DEFINITIONS);

export const CUSTOMER_STATUSES = enumDefinitionValues(CUSTOMER_STATUS_DEFINITIONS);

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CustomerStatusSchema = z.enum(CUSTOMER_STATUSES).meta({ id: 'CustomerStatus' });

export const CustomerStatusLabel = enumDefinitionLabels(CUSTOMER_STATUS_DEFINITIONS);

export const CustomerStatusSeverity = enumDefinitionSeverities(CUSTOMER_STATUS_DEFINITIONS);

export const CustomerStatusOptions = enumDefinitionOptions(CUSTOMER_STATUS_DEFINITIONS);

export const CUSTOMER_ALIAS_TYPES = ['legal-name', 'short-name', 'legacy-input', 'import-name', 'alias'] as const;

export type CustomerAliasType = (typeof CUSTOMER_ALIAS_TYPES)[number];

export const CustomerAliasTypeSchema = z.enum(CUSTOMER_ALIAS_TYPES).meta({ id: 'CustomerAliasType' });

export const CustomerAliasTypeValue = {
    LegalName: 'legal-name',
    ShortName: 'short-name',
    LegacyInput: 'legacy-input',
    ImportName: 'import-name',
    Alias: 'alias'
} as const satisfies Record<string, CustomerAliasType>;

export const CustomerSummarySchema = z
    .object({
        id: z.uuid(),
        customerNo: z.string(),
        displayName: z.string(),
        legalName: z.string().nullable(),
        shortName: z.string().nullable(),
        status: CustomerStatusSchema,
        ownerOrgId: z.uuid().nullable(),
        ownerUserId: z.uuid().nullable(),
        sourceChannel: z.string().nullable(),
        remark: z.string().nullable(),
        mergedIntoCustomerId: z.uuid().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'CustomerSummary' });

export type CustomerSummary = z.infer<typeof CustomerSummarySchema>;

export const CustomerListViewSchema = CustomerSummarySchema.extend({
    ownerName: z.string().nullable(),
    ownerOrgName: z.string().nullable(),
    leadCount: z.number().int().nonnegative(),
    projectCount: z.number().int().nonnegative(),
    contractCount: z.number().int().nonnegative()
}).meta({ id: 'CustomerListView' });

export type CustomerListView = z.infer<typeof CustomerListViewSchema>;

export const CustomerListSchema = z.array(CustomerListViewSchema).meta({ id: 'CustomerList' });

export type CustomerList = z.infer<typeof CustomerListSchema>;

export const CustomerAliasSummarySchema = z
    .object({
        id: z.uuid(),
        customerId: z.uuid(),
        aliasName: z.string(),
        aliasType: CustomerAliasTypeSchema,
        normalizedName: z.string(),
        isPrimary: z.boolean(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable()
    })
    .meta({ id: 'CustomerAliasSummary' });

export type CustomerAliasSummary = z.infer<typeof CustomerAliasSummarySchema>;

export const CustomerAliasListSchema = z.array(CustomerAliasSummarySchema).meta({ id: 'CustomerAliasList' });

export type CustomerAliasList = z.infer<typeof CustomerAliasListSchema>;

export const CustomerDetailViewSchema = CustomerListViewSchema.extend({
    aliases: CustomerAliasListSchema
}).meta({ id: 'CustomerDetailView' });

export type CustomerDetailView = z.infer<typeof CustomerDetailViewSchema>;

export const CustomerListQuerySchema = z
    .object({
        status: CustomerStatusSchema.optional(),
        ownerOrgId: z.uuid().optional(),
        keyword: z.string().trim().min(1).max(128).optional()
    })
    .meta({ id: 'CustomerListQuery' });

export type CustomerListQuery = z.infer<typeof CustomerListQuerySchema>;

export const CreateCustomerRequestSchema = z
    .object({
        displayName: z.string().trim().min(1).max(255),
        legalName: z.string().trim().min(1).max(255).nullable().optional(),
        shortName: z.string().trim().min(1).max(128).nullable().optional(),
        ownerOrgId: z.uuid().nullable().optional(),
        ownerUserId: z.uuid().nullable().optional(),
        sourceChannel: z.string().trim().min(1).max(64).nullable().optional(),
        remark: z.string().trim().min(1).max(2000).nullable().optional()
    })
    .meta({ id: 'CreateCustomerRequest' });

export type CreateCustomerRequest = z.infer<typeof CreateCustomerRequestSchema>;

export const UpdateCustomerRequestSchema = z
    .object({
        displayName: z.string().trim().min(1).max(255).optional(),
        legalName: z.string().trim().min(1).max(255).nullable().optional(),
        shortName: z.string().trim().min(1).max(128).nullable().optional(),
        status: z.enum([CustomerStatusValue.Active, CustomerStatusValue.Inactive]).optional(),
        ownerOrgId: z.uuid().nullable().optional(),
        ownerUserId: z.uuid().nullable().optional(),
        sourceChannel: z.string().trim().min(1).max(64).nullable().optional(),
        remark: z.string().trim().min(1).max(2000).nullable().optional()
    })
    .refine(
        (value) =>
            value.displayName !== undefined ||
            value.legalName !== undefined ||
            value.shortName !== undefined ||
            value.status !== undefined ||
            value.ownerOrgId !== undefined ||
            value.ownerUserId !== undefined ||
            value.sourceChannel !== undefined ||
            value.remark !== undefined,
        {
            message: 'At least one field is required for update'
        }
    )
    .meta({ id: 'UpdateCustomerRequest' });

export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerRequestSchema>;

export const CreateCustomerAliasRequestSchema = z
    .object({
        aliasName: z.string().trim().min(1).max(255),
        aliasType: CustomerAliasTypeSchema.optional()
    })
    .meta({ id: 'CreateCustomerAliasRequest' });

export type CreateCustomerAliasRequest = z.infer<typeof CreateCustomerAliasRequestSchema>;

// ---------------------------------------------------------------------------
// Lead
// ---------------------------------------------------------------------------

export const LEAD_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Registered', value: 'registered', label: '待确认', severity: 'secondary', order: 10 },
    { key: 'Qualified', value: 'qualified', label: '已有效', severity: 'success', order: 20 },
    { key: 'Converted', value: 'converted', label: '已转项目', severity: 'info', order: 30 },
    { key: 'Closed', value: 'closed', label: '已关闭', severity: 'contrast', order: 40 }
] as const);

export const LeadStatusValue = enumDefinitionValueObject(LEAD_STATUS_DEFINITIONS);

export const LEAD_STATUSES = enumDefinitionValues(LEAD_STATUS_DEFINITIONS);

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LeadStatusSchema = z.enum(LEAD_STATUSES).meta({ id: 'LeadStatus' });

export const LeadStatusLabel = enumDefinitionLabels(LEAD_STATUS_DEFINITIONS);

export const LeadStatusSeverity = enumDefinitionSeverities(LEAD_STATUS_DEFINITIONS);

export const LeadStatusOptions = enumDefinitionOptions(LEAD_STATUS_DEFINITIONS);

export const LEAD_SOURCE_STATUSES = ['active', 'inactive'] as const;

export type LeadSourceStatus = (typeof LEAD_SOURCE_STATUSES)[number];

export const LeadSourceStatusSchema = z.enum(LEAD_SOURCE_STATUSES).meta({ id: 'LeadSourceStatus' });

export const LeadSourceStatusValue = {
    Active: 'active',
    Inactive: 'inactive'
} as const satisfies Record<string, LeadSourceStatus>;

export const LEAD_BUDGET_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Unknown', value: 'unknown', label: '预算未知', severity: 'secondary', order: 10 },
    { key: 'NoBudget', value: 'no-budget', label: '暂无预算', severity: 'warn', order: 20 },
    { key: 'RoughBudget', value: 'rough-budget', label: '初步预算', severity: 'info', order: 30 },
    { key: 'BudgetConfirmed', value: 'budget-confirmed', label: '预算已确认', severity: 'success', order: 40 },
    { key: 'BudgetApproved', value: 'budget-approved', label: '预算已批准', severity: 'success', order: 50 }
] as const);

export const LeadBudgetStatusValue = enumDefinitionValueObject(LEAD_BUDGET_STATUS_DEFINITIONS);

export const LEAD_BUDGET_STATUSES = enumDefinitionValues(LEAD_BUDGET_STATUS_DEFINITIONS);

export type LeadBudgetStatus = (typeof LEAD_BUDGET_STATUSES)[number];

export const LeadBudgetStatusSchema = z.enum(LEAD_BUDGET_STATUSES).meta({ id: 'LeadBudgetStatus' });

export const LeadBudgetStatusLabel = enumDefinitionLabels(LEAD_BUDGET_STATUS_DEFINITIONS);

export const LeadBudgetStatusSeverity = enumDefinitionSeverities(LEAD_BUDGET_STATUS_DEFINITIONS);

export const LeadBudgetStatusOptions = enumDefinitionOptions(LEAD_BUDGET_STATUS_DEFINITIONS);

export const LEAD_URGENCY_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Low', value: 'low', label: '低', severity: 'secondary', order: 10 },
    { key: 'Normal', value: 'normal', label: '一般', severity: 'info', order: 20 },
    { key: 'High', value: 'high', label: '高', severity: 'warn', order: 30 },
    { key: 'Critical', value: 'critical', label: '紧急', severity: 'danger', order: 40 }
] as const);

export const LeadUrgencyValue = enumDefinitionValueObject(LEAD_URGENCY_DEFINITIONS);

export const LEAD_URGENCIES = enumDefinitionValues(LEAD_URGENCY_DEFINITIONS);

export type LeadUrgency = (typeof LEAD_URGENCIES)[number];

export const LeadUrgencySchema = z.enum(LEAD_URGENCIES).meta({ id: 'LeadUrgency' });

export const LeadUrgencyLabel = enumDefinitionLabels(LEAD_URGENCY_DEFINITIONS);

export const LeadUrgencySeverity = enumDefinitionSeverities(LEAD_URGENCY_DEFINITIONS);

export const LeadUrgencyOptions = enumDefinitionOptions(LEAD_URGENCY_DEFINITIONS);

export const LEAD_RATING_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'A', value: 'A', label: 'A级', severity: 'success', order: 10 },
    { key: 'B', value: 'B', label: 'B级', severity: 'info', order: 20 },
    { key: 'C', value: 'C', label: 'C级', severity: 'warn', order: 30 },
    { key: 'D', value: 'D', label: 'D级', severity: 'danger', order: 40 }
] as const);

export const LeadRatingValue = enumDefinitionValueObject(LEAD_RATING_DEFINITIONS);

export const LEAD_RATINGS = enumDefinitionValues(LEAD_RATING_DEFINITIONS);

export type LeadRating = (typeof LEAD_RATINGS)[number];

export const LeadRatingSchema = z.enum(LEAD_RATINGS).meta({ id: 'LeadRating' });

export const LeadRatingLabel = enumDefinitionLabels(LEAD_RATING_DEFINITIONS);

export const LeadRatingSeverity = enumDefinitionSeverities(LEAD_RATING_DEFINITIONS);

export const LeadRatingOptions = enumDefinitionOptions(LEAD_RATING_DEFINITIONS);

export const PROJECT_STAGE_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Assessment', value: 'assessment', label: '立项评估', severity: 'secondary', order: 10 },
    { key: 'ScopeConfirmation', value: 'scope-confirmation', label: '范围确认', severity: 'info', order: 20 },
    { key: 'CommercialClosure', value: 'commercial-closure', label: '商务收口', severity: 'warn', order: 30 },
    { key: 'Contracting', value: 'contracting', label: '签约中', severity: 'warn', order: 40 },
    { key: 'Handover', value: 'handover', label: '项目移交', severity: 'warn', order: 50 },
    { key: 'Execution', value: 'execution', label: '正式执行', severity: 'success', order: 60 },
    { key: 'Acceptance', value: 'acceptance', label: '验收确认', severity: 'info', order: 70 },
    { key: 'Completed', value: 'completed', label: '已完成', severity: 'contrast', order: 80 },
    { key: 'ClosedLost', value: 'closed-lost', label: '已丢单', severity: 'danger', order: 90 },
    { key: 'ClosedTerminated', value: 'closed-terminated', label: '已终止', severity: 'danger', order: 100 }
] as const);

export const ProjectStageValue = enumDefinitionValueObject(PROJECT_STAGE_DEFINITIONS);

export const PROJECT_STAGES = enumDefinitionValues(PROJECT_STAGE_DEFINITIONS);

export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const ProjectStageSchema = z.enum(PROJECT_STAGES).meta({ id: 'ProjectStage' });

export const ProjectStageLabel = enumDefinitionLabels(PROJECT_STAGE_DEFINITIONS);

export const ProjectStageSeverity = enumDefinitionSeverities(PROJECT_STAGE_DEFINITIONS);

export const ProjectStageOptions = enumDefinitionOptions(PROJECT_STAGE_DEFINITIONS);

export const PROJECT_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Active', value: 'active', label: '进行中', severity: 'info', order: 10 },
    { key: 'PendingApproval', value: 'pending-approval', label: '待审批', severity: 'secondary', order: 20 },
    { key: 'Blocked', value: 'blocked', label: '阻塞中', severity: 'warn', order: 30 },
    { key: 'OnHold', value: 'on-hold', label: '已挂起', severity: 'warn', order: 40 },
    { key: 'Completed', value: 'completed', label: '已完成', severity: 'success', order: 50 },
    { key: 'Closed', value: 'closed', label: '已关闭', severity: 'contrast', order: 60 }
] as const);

export const ProjectStatusValue = enumDefinitionValueObject(PROJECT_STATUS_DEFINITIONS);

export const PROJECT_STATUSES = enumDefinitionValues(PROJECT_STATUS_DEFINITIONS);

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ProjectStatusSchema = z.enum(PROJECT_STATUSES).meta({ id: 'ProjectStatus' });

export const ProjectStatusLabel = enumDefinitionLabels(PROJECT_STATUS_DEFINITIONS);

export const ProjectStatusSeverity = enumDefinitionSeverities(PROJECT_STATUS_DEFINITIONS);

export const ProjectStatusOptions = enumDefinitionOptions(PROJECT_STATUS_DEFINITIONS);

export const LEAD_GATE_STATUSES = ['ready', 'blocked'] as const;

export type LeadGateStatus = (typeof LEAD_GATE_STATUSES)[number];

export const LeadGateStatusSchema = z.enum(LEAD_GATE_STATUSES).meta({ id: 'LeadGateStatus' });

export const LeadGateStatusValue = {
    Ready: 'ready',
    Blocked: 'blocked'
} as const satisfies Record<string, LeadGateStatus>;

export const LEAD_GATE_MISSING_ITEM_DEFINITIONS = defineEnumDefinitions([
    { key: 'Source', value: 'source', label: '线索来源', order: 10 },
    { key: 'DemandDescription', value: 'demand-description', label: '需求描述', order: 20 },
    { key: 'Budget', value: 'budget', label: '预算情况', order: 30 },
    { key: 'EstimatedAmount', value: 'estimated-amount', label: '预计金额', order: 40 },
    { key: 'Urgency', value: 'urgency', label: '紧迫程度', order: 50 },
    { key: 'Owner', value: 'owner', label: '销售主责人', order: 60 },
    { key: 'OwnerOrg', value: 'owner-org', label: '销售主责组织', order: 70 },
    { key: 'RegisteredStatus', value: 'registered-status', label: '待确认状态', order: 80 },
    { key: 'QualifiedStatus', value: 'qualified-status', label: '已确认有效状态', order: 90 },
    { key: 'NotConverted', value: 'not-converted', label: '未转项目状态', order: 100 },
    { key: 'NotClosed', value: 'not-closed', label: '未关闭状态', order: 110 }
] as const);

export const LeadGateMissingItemValue = enumDefinitionValueObject(LEAD_GATE_MISSING_ITEM_DEFINITIONS);

export const LEAD_GATE_MISSING_ITEMS = enumDefinitionValues(LEAD_GATE_MISSING_ITEM_DEFINITIONS);

export type LeadGateMissingItem = (typeof LEAD_GATE_MISSING_ITEMS)[number];

export const LeadGateMissingItemSchema = z.enum(LEAD_GATE_MISSING_ITEMS).meta({ id: 'LeadGateMissingItem' });

export const LeadGateMissingItemLabel = enumDefinitionLabels(LEAD_GATE_MISSING_ITEM_DEFINITIONS);

export const LeadGateMissingItemOptions = enumDefinitionOptions(LEAD_GATE_MISSING_ITEM_DEFINITIONS);

export const LEAD_OWNERSHIP_SCOPES = ['all', 'mine', 'public-pool'] as const;

export type LeadOwnershipScope = (typeof LEAD_OWNERSHIP_SCOPES)[number];

export const LeadOwnershipScopeSchema = z.enum(LEAD_OWNERSHIP_SCOPES).meta({ id: 'LeadOwnershipScope' });

export const LeadOwnershipScopeValue = {
    All: 'all',
    Mine: 'mine',
    PublicPool: 'public-pool'
} as const satisfies Record<string, LeadOwnershipScope>;

export const LEAD_ALLOWED_ACTIONS = ['claim-lead-owner', 'assign-lead-owner'] as const;

export type LeadAllowedAction = (typeof LEAD_ALLOWED_ACTIONS)[number];

export const LeadAllowedActionSchema = z.enum(LEAD_ALLOWED_ACTIONS).meta({ id: 'LeadAllowedAction' });

export const LeadAllowedActionValue = {
    ClaimLeadOwner: 'claim-lead-owner',
    AssignLeadOwner: 'assign-lead-owner'
} as const satisfies Record<string, LeadAllowedAction>;

export const LEAD_OWNER_ASSIGNMENT_TYPES = ['claimed', 'assigned', 'reassigned'] as const;

export type LeadOwnerAssignmentType = (typeof LEAD_OWNER_ASSIGNMENT_TYPES)[number];

export const LeadOwnerAssignmentTypeSchema = z.enum(LEAD_OWNER_ASSIGNMENT_TYPES).meta({ id: 'LeadOwnerAssignmentType' });

export const LeadOwnerAssignmentTypeValue = {
    Claimed: 'claimed',
    Assigned: 'assigned',
    Reassigned: 'reassigned'
} as const satisfies Record<string, LeadOwnerAssignmentType>;

export const LEAD_EFFECTIVE_SCORE_SOURCE_DEFINITIONS = defineEnumDefinitions([
    { key: 'System', value: 'system', label: '系统评分', order: 10 },
    { key: 'ManualOverride', value: 'manual-override', label: '人工覆盖', order: 20 }
] as const);

export const LeadEffectiveScoreSourceValue = enumDefinitionValueObject(LEAD_EFFECTIVE_SCORE_SOURCE_DEFINITIONS);

export const LEAD_EFFECTIVE_SCORE_SOURCES = enumDefinitionValues(LEAD_EFFECTIVE_SCORE_SOURCE_DEFINITIONS);

export type LeadEffectiveScoreSource = (typeof LEAD_EFFECTIVE_SCORE_SOURCES)[number];

export const LeadEffectiveScoreSourceSchema = z.enum(LEAD_EFFECTIVE_SCORE_SOURCES).meta({ id: 'LeadEffectiveScoreSource' });

export const LeadEffectiveScoreSourceLabel = enumDefinitionLabels(LEAD_EFFECTIVE_SCORE_SOURCE_DEFINITIONS);

export const LeadEffectiveScoreSourceOptions = enumDefinitionOptions(LEAD_EFFECTIVE_SCORE_SOURCE_DEFINITIONS);

export const LEAD_SCORE_SNAPSHOT_KIND_DEFINITIONS = defineEnumDefinitions([
    { key: 'System', value: 'system', label: '系统评分', order: 10 },
    { key: 'ManualOverride', value: 'manual-override', label: '人工覆盖', order: 20 },
    { key: 'OverrideRevoked', value: 'override-revoked', label: '覆盖撤销', order: 30 }
] as const);

export const LeadScoreSnapshotKindValue = enumDefinitionValueObject(LEAD_SCORE_SNAPSHOT_KIND_DEFINITIONS);

export const LEAD_SCORE_SNAPSHOT_KINDS = enumDefinitionValues(LEAD_SCORE_SNAPSHOT_KIND_DEFINITIONS);

export type LeadScoreSnapshotKind = (typeof LEAD_SCORE_SNAPSHOT_KINDS)[number];

export const LeadScoreSnapshotKindSchema = z.enum(LEAD_SCORE_SNAPSHOT_KINDS).meta({ id: 'LeadScoreSnapshotKind' });

export const LeadScoreSnapshotKindLabel = enumDefinitionLabels(LEAD_SCORE_SNAPSHOT_KIND_DEFINITIONS);

export const LeadScoreSnapshotKindOptions = enumDefinitionOptions(LEAD_SCORE_SNAPSHOT_KIND_DEFINITIONS);

export const LEAD_SCORE_OVERRIDE_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Pending', value: 'pending', label: '待审批', severity: 'warn', order: 10 },
    { key: 'Approved', value: 'approved', label: '已批准', severity: 'success', order: 20 },
    { key: 'Rejected', value: 'rejected', label: '已驳回', severity: 'danger', order: 30 },
    { key: 'Revoked', value: 'revoked', label: '已撤销', severity: 'secondary', order: 40 },
    { key: 'Superseded', value: 'superseded', label: '已替代', severity: 'contrast', order: 50 }
] as const);

export const LeadScoreOverrideStatusValue = enumDefinitionValueObject(LEAD_SCORE_OVERRIDE_STATUS_DEFINITIONS);

export const LEAD_SCORE_OVERRIDE_STATUSES = enumDefinitionValues(LEAD_SCORE_OVERRIDE_STATUS_DEFINITIONS);

export type LeadScoreOverrideStatus = (typeof LEAD_SCORE_OVERRIDE_STATUSES)[number];

export const LeadScoreOverrideStatusSchema = z.enum(LEAD_SCORE_OVERRIDE_STATUSES).meta({ id: 'LeadScoreOverrideStatus' });

export const LeadScoreOverrideStatusLabel = enumDefinitionLabels(LEAD_SCORE_OVERRIDE_STATUS_DEFINITIONS);

export const LeadScoreOverrideStatusSeverity = enumDefinitionSeverities(LEAD_SCORE_OVERRIDE_STATUS_DEFINITIONS);

export const LeadScoreOverrideStatusOptions = enumDefinitionOptions(LEAD_SCORE_OVERRIDE_STATUS_DEFINITIONS);

const LeadEstimatedAmountStringSchema = z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/);

export const LeadGateCheckSchema = z
    .object({
        status: LeadGateStatusSchema,
        missingItems: z.array(LeadGateMissingItemSchema),
        explanation: z.string()
    })
    .meta({ id: 'LeadGateCheck' });

export type LeadGateCheck = z.infer<typeof LeadGateCheckSchema>;

export const LeadGateSummarySchema = z
    .object({
        qualification: LeadGateCheckSchema,
        conversion: LeadGateCheckSchema
    })
    .meta({ id: 'LeadGateSummary' });

export type LeadGateSummary = z.infer<typeof LeadGateSummarySchema>;

export const LeadSourceSummarySchema = z
    .object({
        id: z.uuid(),
        code: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        status: LeadSourceStatusSchema,
        sortOrder: z.number().int(),
        usageCount: z.number().int().nonnegative(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'LeadSourceSummary' });

export type LeadSourceSummary = z.infer<typeof LeadSourceSummarySchema>;

export const LeadSourceListSchema = z.array(LeadSourceSummarySchema).meta({ id: 'LeadSourceList' });

export type LeadSourceList = z.infer<typeof LeadSourceListSchema>;

export const LeadSourceListQuerySchema = z
    .object({
        status: LeadSourceStatusSchema.optional(),
        keyword: z.string().trim().min(1).max(128).optional()
    })
    .meta({ id: 'LeadSourceListQuery' });

export type LeadSourceListQuery = z.infer<typeof LeadSourceListQuerySchema>;

export const CreateLeadSourceRequestSchema = z
    .object({
        code: z
            .string()
            .trim()
            .min(1)
            .max(64)
            .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
        name: z.string().trim().min(1).max(128),
        description: z.string().trim().min(1).max(1000).nullable().optional(),
        sortOrder: z.number().int().min(0).max(9999).optional()
    })
    .meta({ id: 'CreateLeadSourceRequest' });

export type CreateLeadSourceRequest = z.infer<typeof CreateLeadSourceRequestSchema>;

export const UpdateLeadSourceRequestSchema = z
    .object({
        name: z.string().trim().min(1).max(128).optional(),
        description: z.string().trim().min(1).max(1000).nullable().optional(),
        status: LeadSourceStatusSchema.optional(),
        sortOrder: z.number().int().min(0).max(9999).optional()
    })
    .refine((value) => value.name !== undefined || value.description !== undefined || value.status !== undefined || value.sortOrder !== undefined, {
        message: 'At least one field is required for update'
    })
    .meta({ id: 'UpdateLeadSourceRequest' });

export type UpdateLeadSourceRequest = z.infer<typeof UpdateLeadSourceRequestSchema>;

export const LeadSummarySchema = z
    .object({
        id: z.uuid(),
        leadNo: z.string(),
        leadName: z.string(),
        customerId: z.uuid(),
        customerName: z.string(),
        sourceId: z.uuid(),
        sourceName: z.string().nullable(),
        sourceChannel: z.string().nullable(),
        demandDescription: z.string().nullable(),
        budgetStatus: LeadBudgetStatusSchema,
        estimatedAmount: z.string().nullable(),
        urgency: LeadUrgencySchema,
        expectedDecisionDate: z.iso.date().nullable(),
        score: z.number().int().min(0).max(100),
        rating: LeadRatingSchema,
        scoreReason: z.string(),
        scoreUpdatedAt: z.iso.datetime(),
        effectiveScore: z.number().int().min(0).max(100),
        effectiveRating: LeadRatingSchema,
        effectiveScoreReason: z.string(),
        effectiveScoreSource: LeadEffectiveScoreSourceSchema,
        activeScoreOverrideId: z.uuid().nullable(),
        gateSummary: LeadGateSummarySchema,
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
        customerId: z.uuid(),
        customerName: z.string(),
        sourceId: z.uuid(),
        sourceName: z.string().nullable(),
        sourceChannel: z.string().nullable(),
        demandDescription: z.string().nullable(),
        budgetStatus: LeadBudgetStatusSchema,
        estimatedAmount: z.string().nullable(),
        urgency: LeadUrgencySchema,
        expectedDecisionDate: z.iso.date().nullable(),
        score: z.number().int().min(0).max(100),
        rating: LeadRatingSchema,
        scoreReason: z.string(),
        scoreUpdatedAt: z.iso.datetime(),
        effectiveScore: z.number().int().min(0).max(100),
        effectiveRating: LeadRatingSchema,
        effectiveScoreReason: z.string(),
        effectiveScoreSource: LeadEffectiveScoreSourceSchema,
        activeScoreOverrideId: z.uuid().nullable(),
        gateSummary: LeadGateSummarySchema,
        status: LeadStatusSchema,
        ownerOrgId: z.uuid().nullable(),
        ownerUserId: z.uuid().nullable(),
        ownerName: z.string().nullable(),
        ownerOrgName: z.string().nullable(),
        qualifiedAt: z.iso.datetime().nullable(),
        convertedProjectId: z.uuid().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
        allowedActions: z.array(LeadAllowedActionSchema)
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
        customerId: z.uuid().nullable(),
        status: ProjectStatusSchema,
        currentStage: ProjectStageSchema
    })
    .meta({ id: 'LeadConvertedProjectSummary' });

export type LeadConvertedProjectSummary = z.infer<typeof LeadConvertedProjectSummarySchema>;

export const LeadDetailViewSchema = LeadSummarySchema.extend({
    ownerName: z.string().nullable(),
    ownerOrgName: z.string().nullable(),
    sourceSummary: z.string().nullable(),
    convertedProjectSummary: LeadConvertedProjectSummarySchema.nullable(),
    allowedActions: z.array(LeadAllowedActionSchema)
}).meta({ id: 'LeadDetailView' });

export type LeadDetailView = z.infer<typeof LeadDetailViewSchema>;

export const CreateLeadRequestSchema = z
    .object({
        leadName: z.string().trim().min(1).max(255),
        customerId: z.uuid(),
        sourceId: z.uuid(),
        demandDescription: z.string().trim().min(1).max(4000),
        budgetStatus: LeadBudgetStatusSchema,
        estimatedAmount: LeadEstimatedAmountStringSchema.nullable().optional(),
        urgency: LeadUrgencySchema,
        expectedDecisionDate: z.iso.date().nullable().optional(),
        ownerOrgId: z.uuid().nullable().optional(),
        ownerUserId: z.uuid().nullable().optional()
    })
    .meta({ id: 'CreateLeadRequest' });

export type CreateLeadRequest = z.infer<typeof CreateLeadRequestSchema>;

export const UpdateLeadRequestSchema = z
    .object({
        leadName: z.string().trim().min(1).max(255).optional(),
        customerId: z.uuid().optional(),
        sourceId: z.uuid().optional(),
        demandDescription: z.string().trim().min(1).max(4000).optional(),
        budgetStatus: LeadBudgetStatusSchema.optional(),
        estimatedAmount: LeadEstimatedAmountStringSchema.nullable().optional(),
        urgency: LeadUrgencySchema.optional(),
        expectedDecisionDate: z.iso.date().nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .refine(
        (value) =>
            value.leadName !== undefined ||
            value.customerId !== undefined ||
            value.sourceId !== undefined ||
            value.demandDescription !== undefined ||
            value.budgetStatus !== undefined ||
            value.estimatedAmount !== undefined ||
            value.urgency !== undefined ||
            value.expectedDecisionDate !== undefined,
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

export const ClaimLeadOwnerRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ClaimLeadOwnerRequest' });

export type ClaimLeadOwnerRequest = z.infer<typeof ClaimLeadOwnerRequestSchema>;

export const AssignLeadOwnerRequestSchema = z
    .object({
        ownerUserId: z.uuid(),
        ownerOrgId: z.uuid().nullable().optional(),
        reason: z.string().trim().min(1).max(1000),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'AssignLeadOwnerRequest' });

export type AssignLeadOwnerRequest = z.infer<typeof AssignLeadOwnerRequestSchema>;

export const LeadOwnerAssignmentResultSchema = z
    .object({
        targetId: z.uuid(),
        leadOwnerAssignmentRecordId: z.uuid(),
        previousOwnerUserId: z.uuid().nullable(),
        previousOwnerOrgId: z.uuid().nullable(),
        newOwnerUserId: z.uuid(),
        newOwnerOrgId: z.uuid().nullable(),
        assignmentType: LeadOwnerAssignmentTypeSchema,
        businessStatusAfter: LeadStatusSchema
    })
    .meta({ id: 'LeadOwnerAssignmentResult' });

export type LeadOwnerAssignmentResult = z.infer<typeof LeadOwnerAssignmentResultSchema>;

export const LeadScoreOverrideSummarySchema = z
    .object({
        id: z.uuid(),
        leadId: z.uuid(),
        requestedScore: z.number().int().min(0).max(100),
        requestedRating: LeadRatingSchema,
        reason: z.string(),
        status: LeadScoreOverrideStatusSchema,
        systemScoreAtRequest: z.number().int().min(0).max(100),
        systemRatingAtRequest: LeadRatingSchema,
        requestedBy: z.uuid().nullable(),
        requestedAt: z.iso.datetime(),
        approvedBy: z.uuid().nullable(),
        approvedAt: z.iso.datetime().nullable(),
        approvalNote: z.string().nullable(),
        rejectedBy: z.uuid().nullable(),
        rejectedAt: z.iso.datetime().nullable(),
        rejectReason: z.string().nullable(),
        revokedBy: z.uuid().nullable(),
        revokedAt: z.iso.datetime().nullable(),
        revokeReason: z.string().nullable(),
        supersededById: z.uuid().nullable(),
        rowVersion: z.number().int().positive()
    })
    .meta({ id: 'LeadScoreOverrideSummary' });

export type LeadScoreOverrideSummary = z.infer<typeof LeadScoreOverrideSummarySchema>;

export const LeadScoreHistoryItemSchema = z
    .object({
        id: z.uuid(),
        leadId: z.uuid(),
        snapshotKind: LeadScoreSnapshotKindSchema,
        overrideId: z.uuid().nullable(),
        formulaVersion: z.string(),
        systemScore: z.number().int().min(0).max(100),
        systemRating: LeadRatingSchema,
        effectiveScore: z.number().int().min(0).max(100),
        effectiveRating: LeadRatingSchema,
        effectiveScoreSource: LeadEffectiveScoreSourceSchema,
        scoreReason: z.string(),
        componentBreakdown: z.record(z.string(), z.unknown()),
        gateSummarySnapshot: LeadGateSummarySchema,
        sourceCommand: z.string(),
        sourceRecordId: z.uuid().nullable(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable()
    })
    .meta({ id: 'LeadScoreHistoryItem' });

export type LeadScoreHistoryItem = z.infer<typeof LeadScoreHistoryItemSchema>;

export const LeadScoreHistoryViewSchema = z
    .object({
        leadId: z.uuid(),
        systemScore: z.number().int().min(0).max(100),
        systemRating: LeadRatingSchema,
        scoreReason: z.string(),
        scoreUpdatedAt: z.iso.datetime(),
        effectiveScore: z.number().int().min(0).max(100),
        effectiveRating: LeadRatingSchema,
        effectiveScoreReason: z.string(),
        effectiveScoreSource: LeadEffectiveScoreSourceSchema,
        activeScoreOverrideId: z.uuid().nullable(),
        activeOverride: LeadScoreOverrideSummarySchema.nullable(),
        pendingOverride: LeadScoreOverrideSummarySchema.nullable(),
        snapshots: z.array(LeadScoreHistoryItemSchema),
        overrides: z.array(LeadScoreOverrideSummarySchema)
    })
    .meta({ id: 'LeadScoreHistoryView' });

export type LeadScoreHistoryView = z.infer<typeof LeadScoreHistoryViewSchema>;

export const SubmitLeadScoreOverrideRequestSchema = z
    .object({
        score: z.number().int().min(0).max(100),
        reason: z.string().trim().min(1).max(1000),
        expectedLeadRowVersion: z.number().int().positive()
    })
    .meta({ id: 'SubmitLeadScoreOverrideRequest' });

export type SubmitLeadScoreOverrideRequest = z.infer<typeof SubmitLeadScoreOverrideRequestSchema>;

export const ApproveLeadScoreOverrideRequestSchema = z
    .object({
        expectedOverrideRowVersion: z.number().int().positive(),
        note: z.string().trim().min(1).max(1000).nullable().optional()
    })
    .meta({ id: 'ApproveLeadScoreOverrideRequest' });

export type ApproveLeadScoreOverrideRequest = z.infer<typeof ApproveLeadScoreOverrideRequestSchema>;

export const RejectLeadScoreOverrideRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(1000),
        expectedOverrideRowVersion: z.number().int().positive()
    })
    .meta({ id: 'RejectLeadScoreOverrideRequest' });

export type RejectLeadScoreOverrideRequest = z.infer<typeof RejectLeadScoreOverrideRequestSchema>;

export const RevokeLeadScoreOverrideRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(1000),
        expectedOverrideRowVersion: z.number().int().positive()
    })
    .meta({ id: 'RevokeLeadScoreOverrideRequest' });

export type RevokeLeadScoreOverrideRequest = z.infer<typeof RevokeLeadScoreOverrideRequestSchema>;

export const LeadListQuerySchema = z
    .object({
        status: LeadStatusSchema.optional(),
        sourceId: z.uuid().optional(),
        budgetStatus: LeadBudgetStatusSchema.optional(),
        urgency: LeadUrgencySchema.optional(),
        rating: LeadRatingSchema.optional(),
        ownerOrgId: z.uuid().optional(),
        ownerUserId: z.uuid().optional(),
        ownershipScope: LeadOwnershipScopeSchema.optional(),
        keyword: z.string().trim().min(1).max(128).optional()
    })
    .meta({ id: 'LeadListQuery' });

export type LeadListQuery = z.infer<typeof LeadListQuerySchema>;

// ---------------------------------------------------------------------------
// Configurable Dictionaries
// ---------------------------------------------------------------------------

export const DICTIONARY_DOMAINS = ['attachment-category', 'sales-follow-up-type', 'expense-category'] as const;

export type DictionaryDomain = (typeof DICTIONARY_DOMAINS)[number];

export const DictionaryDomainSchema = z.enum(DICTIONARY_DOMAINS).meta({ id: 'DictionaryDomain' });

export const DictionaryDomainValue = {
    AttachmentCategory: 'attachment-category',
    SalesFollowUpType: 'sales-follow-up-type',
    ExpenseCategory: 'expense-category'
} as const satisfies Record<string, DictionaryDomain>;

export type DictionaryItemStatus = ActiveInactiveStatus;

export const DictionaryItemStatusSchema = ActiveInactiveStatusSchema.meta({ id: 'DictionaryItemStatus' });

export const DictionaryItemStatusValue = ActiveInactiveStatusValue;

export const DictionaryCodeSchema = z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9-]*$/, 'Dictionary code must use lower kebab-case')
    .meta({ id: 'DictionaryCode' });

export type DictionaryCode = z.infer<typeof DictionaryCodeSchema>;

export const DictionaryItemSummarySchema = z
    .object({
        id: z.uuid(),
        domain: DictionaryDomainSchema,
        code: DictionaryCodeSchema,
        name: z.string(),
        description: z.string().nullable(),
        status: DictionaryItemStatusSchema,
        sortOrder: z.number().int(),
        isSystem: z.boolean(),
        usageCount: z.number().int().nonnegative(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'DictionaryItemSummary' });

export type DictionaryItemSummary = z.infer<typeof DictionaryItemSummarySchema>;

export const DictionaryItemListSchema = z.array(DictionaryItemSummarySchema).meta({ id: 'DictionaryItemList' });

export type DictionaryItemList = z.infer<typeof DictionaryItemListSchema>;

export const DictionaryItemListQuerySchema = z
    .object({
        domain: DictionaryDomainSchema.optional(),
        status: DictionaryItemStatusSchema.optional(),
        keyword: z.string().trim().min(1).max(128).optional()
    })
    .meta({ id: 'DictionaryItemListQuery' });

export type DictionaryItemListQuery = z.infer<typeof DictionaryItemListQuerySchema>;

export const CreateDictionaryItemRequestSchema = z
    .object({
        domain: DictionaryDomainSchema,
        code: DictionaryCodeSchema,
        name: z.string().trim().min(1).max(128),
        description: z.string().trim().min(1).max(1000).nullable().optional(),
        sortOrder: z.number().int().min(0).optional()
    })
    .meta({ id: 'CreateDictionaryItemRequest' });

export type CreateDictionaryItemRequest = z.infer<typeof CreateDictionaryItemRequestSchema>;

export const UpdateDictionaryItemRequestSchema = z
    .object({
        name: z.string().trim().min(1).max(128).optional(),
        description: z.string().trim().min(1).max(1000).nullable().optional(),
        status: DictionaryItemStatusSchema.optional(),
        sortOrder: z.number().int().min(0).optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .refine((value) => value.name !== undefined || value.description !== undefined || value.status !== undefined || value.sortOrder !== undefined, {
        message: 'At least one updatable field is required'
    })
    .meta({ id: 'UpdateDictionaryItemRequest' });

export type UpdateDictionaryItemRequest = z.infer<typeof UpdateDictionaryItemRequestSchema>;

// ---------------------------------------------------------------------------
// Sales Intelligence / Business Discussion
// ---------------------------------------------------------------------------

export const CUSTOMER_CONTACT_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Active', value: 'active', label: '有效', severity: 'success', order: 10 },
    { key: 'Inactive', value: 'inactive', label: '停用', severity: 'secondary', order: 20 }
] as const);

export const CustomerContactStatusValue = enumDefinitionValueObject(CUSTOMER_CONTACT_STATUS_DEFINITIONS);
export const CUSTOMER_CONTACT_STATUSES = enumDefinitionValues(CUSTOMER_CONTACT_STATUS_DEFINITIONS);
export type CustomerContactStatus = (typeof CUSTOMER_CONTACT_STATUSES)[number];
export const CustomerContactStatusSchema = z.enum(CUSTOMER_CONTACT_STATUSES).meta({ id: 'CustomerContactStatus' });
export const CustomerContactStatusLabel = enumDefinitionLabels(CUSTOMER_CONTACT_STATUS_DEFINITIONS);
export const CustomerContactStatusSeverity = enumDefinitionSeverities(CUSTOMER_CONTACT_STATUS_DEFINITIONS);
export const CustomerContactStatusOptions = enumDefinitionOptions(CUSTOMER_CONTACT_STATUS_DEFINITIONS);

export const CUSTOMER_CONTACT_GENDER_DEFINITIONS = defineEnumDefinitions([
    { key: 'Unknown', value: 'unknown', label: '未知', order: 10 },
    { key: 'Male', value: 'male', label: '男', order: 20 },
    { key: 'Female', value: 'female', label: '女', order: 30 }
] as const);

export const CustomerContactGenderValue = enumDefinitionValueObject(CUSTOMER_CONTACT_GENDER_DEFINITIONS);
export const CUSTOMER_CONTACT_GENDERS = enumDefinitionValues(CUSTOMER_CONTACT_GENDER_DEFINITIONS);
export type CustomerContactGender = (typeof CUSTOMER_CONTACT_GENDERS)[number];
export const CustomerContactGenderSchema = z.enum(CUSTOMER_CONTACT_GENDERS).meta({ id: 'CustomerContactGender' });
export const CustomerContactGenderLabel = enumDefinitionLabels(CUSTOMER_CONTACT_GENDER_DEFINITIONS);
export const CustomerContactGenderOptions = enumDefinitionOptions(CUSTOMER_CONTACT_GENDER_DEFINITIONS);

export const OPPORTUNITY_STAKEHOLDER_ROLE_DEFINITIONS = defineEnumDefinitions([
    { key: 'DecisionMaker', value: 'decision-maker', label: '决策人', order: 10 },
    { key: 'Influencer', value: 'influencer', label: '影响者', order: 20 },
    { key: 'EndUser', value: 'end-user', label: '使用人', order: 30 },
    { key: 'TechnicalEvaluator', value: 'technical-evaluator', label: '技术把关人', order: 40 },
    { key: 'ProcurementContact', value: 'procurement-contact', label: '采购联系人', order: 50 },
    { key: 'FinanceLegal', value: 'finance-legal', label: '财务 / 法务', order: 60 },
    { key: 'Sponsor', value: 'sponsor', label: '支持者', order: 70 },
    { key: 'Blocker', value: 'blocker', label: '反对者', order: 80 },
    { key: 'Unknown', value: 'unknown', label: '未知', order: 90 },
    { key: 'Other', value: 'other', label: '其他', order: 100 }
] as const);

export const OpportunityStakeholderRoleValue = enumDefinitionValueObject(OPPORTUNITY_STAKEHOLDER_ROLE_DEFINITIONS);
export const OPPORTUNITY_STAKEHOLDER_ROLES = enumDefinitionValues(OPPORTUNITY_STAKEHOLDER_ROLE_DEFINITIONS);
export type OpportunityStakeholderRole = (typeof OPPORTUNITY_STAKEHOLDER_ROLES)[number];
export const OpportunityStakeholderRoleSchema = z.enum(OPPORTUNITY_STAKEHOLDER_ROLES).meta({ id: 'OpportunityStakeholderRole' });
export const OpportunityStakeholderRoleLabel = enumDefinitionLabels(OPPORTUNITY_STAKEHOLDER_ROLE_DEFINITIONS);
export const OpportunityStakeholderRoleOptions = enumDefinitionOptions(OPPORTUNITY_STAKEHOLDER_ROLE_DEFINITIONS);

export const OPPORTUNITY_STAKEHOLDER_ATTITUDE_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Supportive', value: 'supportive', label: '支持', severity: 'success', order: 10 },
    { key: 'Neutral', value: 'neutral', label: '中立', severity: 'secondary', order: 20 },
    { key: 'Resistant', value: 'resistant', label: '反对', severity: 'danger', order: 30 },
    { key: 'Unknown', value: 'unknown', label: '未知', severity: 'warn', order: 40 }
] as const);

export const OpportunityStakeholderAttitudeValue = enumDefinitionValueObject(OPPORTUNITY_STAKEHOLDER_ATTITUDE_DEFINITIONS);
export const OPPORTUNITY_STAKEHOLDER_ATTITUDES = enumDefinitionValues(OPPORTUNITY_STAKEHOLDER_ATTITUDE_DEFINITIONS);
export type OpportunityStakeholderAttitude = (typeof OPPORTUNITY_STAKEHOLDER_ATTITUDES)[number];
export const OpportunityStakeholderAttitudeSchema = z.enum(OPPORTUNITY_STAKEHOLDER_ATTITUDES).meta({ id: 'OpportunityStakeholderAttitude' });
export const OpportunityStakeholderAttitudeLabel = enumDefinitionLabels(OPPORTUNITY_STAKEHOLDER_ATTITUDE_DEFINITIONS);
export const OpportunityStakeholderAttitudeSeverity = enumDefinitionSeverities(OPPORTUNITY_STAKEHOLDER_ATTITUDE_DEFINITIONS);
export const OpportunityStakeholderAttitudeOptions = enumDefinitionOptions(OPPORTUNITY_STAKEHOLDER_ATTITUDE_DEFINITIONS);

export const OPPORTUNITY_STAKEHOLDER_INFLUENCE_LEVEL_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'High', value: 'high', label: '高', severity: 'danger', order: 10 },
    { key: 'Medium', value: 'medium', label: '中', severity: 'warn', order: 20 },
    { key: 'Low', value: 'low', label: '低', severity: 'secondary', order: 30 },
    { key: 'Unknown', value: 'unknown', label: '未知', severity: 'secondary', order: 40 }
] as const);

export const OpportunityStakeholderInfluenceLevelValue = enumDefinitionValueObject(OPPORTUNITY_STAKEHOLDER_INFLUENCE_LEVEL_DEFINITIONS);
export const OPPORTUNITY_STAKEHOLDER_INFLUENCE_LEVELS = enumDefinitionValues(OPPORTUNITY_STAKEHOLDER_INFLUENCE_LEVEL_DEFINITIONS);
export type OpportunityStakeholderInfluenceLevel = (typeof OPPORTUNITY_STAKEHOLDER_INFLUENCE_LEVELS)[number];
export const OpportunityStakeholderInfluenceLevelSchema = z.enum(OPPORTUNITY_STAKEHOLDER_INFLUENCE_LEVELS).meta({ id: 'OpportunityStakeholderInfluenceLevel' });
export const OpportunityStakeholderInfluenceLevelLabel = enumDefinitionLabels(OPPORTUNITY_STAKEHOLDER_INFLUENCE_LEVEL_DEFINITIONS);
export const OpportunityStakeholderInfluenceLevelSeverity = enumDefinitionSeverities(OPPORTUNITY_STAKEHOLDER_INFLUENCE_LEVEL_DEFINITIONS);
export const OpportunityStakeholderInfluenceLevelOptions = enumDefinitionOptions(OPPORTUNITY_STAKEHOLDER_INFLUENCE_LEVEL_DEFINITIONS);

export const OPPORTUNITY_STAKEHOLDER_ACCESS_LEVEL_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Direct', value: 'direct', label: '已建立直接联系', severity: 'success', order: 10 },
    { key: 'Indirect', value: 'indirect', label: '间接联系', severity: 'warn', order: 20 },
    { key: 'Unknown', value: 'unknown', label: '未知', severity: 'secondary', order: 30 },
    { key: 'Blocked', value: 'blocked', label: '暂不可接触', severity: 'danger', order: 40 }
] as const);

export const OpportunityStakeholderAccessLevelValue = enumDefinitionValueObject(OPPORTUNITY_STAKEHOLDER_ACCESS_LEVEL_DEFINITIONS);
export const OPPORTUNITY_STAKEHOLDER_ACCESS_LEVELS = enumDefinitionValues(OPPORTUNITY_STAKEHOLDER_ACCESS_LEVEL_DEFINITIONS);
export type OpportunityStakeholderAccessLevel = (typeof OPPORTUNITY_STAKEHOLDER_ACCESS_LEVELS)[number];
export const OpportunityStakeholderAccessLevelSchema = z.enum(OPPORTUNITY_STAKEHOLDER_ACCESS_LEVELS).meta({ id: 'OpportunityStakeholderAccessLevel' });
export const OpportunityStakeholderAccessLevelLabel = enumDefinitionLabels(OPPORTUNITY_STAKEHOLDER_ACCESS_LEVEL_DEFINITIONS);
export const OpportunityStakeholderAccessLevelSeverity = enumDefinitionSeverities(OPPORTUNITY_STAKEHOLDER_ACCESS_LEVEL_DEFINITIONS);
export const OpportunityStakeholderAccessLevelOptions = enumDefinitionOptions(OPPORTUNITY_STAKEHOLDER_ACCESS_LEVEL_DEFINITIONS);

export const COMPETITOR_POSITION_DEFINITIONS = defineEnumDefinitions([
    { key: 'Incumbent', value: 'incumbent', label: '既有供应商', order: 10 },
    { key: 'ActiveCompetitor', value: 'active-competitor', label: '明确竞争对手', order: 20 },
    { key: 'PotentialCompetitor', value: 'potential-competitor', label: '潜在竞争对手', order: 30 },
    { key: 'Unknown', value: 'unknown', label: '未知', order: 40 }
] as const);

export const CompetitorPositionValue = enumDefinitionValueObject(COMPETITOR_POSITION_DEFINITIONS);
export const COMPETITOR_POSITIONS = enumDefinitionValues(COMPETITOR_POSITION_DEFINITIONS);
export type CompetitorPosition = (typeof COMPETITOR_POSITIONS)[number];
export const CompetitorPositionSchema = z.enum(COMPETITOR_POSITIONS).meta({ id: 'CompetitorPosition' });
export const CompetitorPositionLabel = enumDefinitionLabels(COMPETITOR_POSITION_DEFINITIONS);
export const CompetitorPositionOptions = enumDefinitionOptions(COMPETITOR_POSITION_DEFINITIONS);

export const CUSTOMER_PREFERENCE_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'TowardUs', value: 'toward-us', label: '倾向我方', severity: 'success', order: 10 },
    { key: 'Neutral', value: 'neutral', label: '中立', severity: 'secondary', order: 20 },
    { key: 'TowardCompetitor', value: 'toward-competitor', label: '倾向竞争对手', severity: 'danger', order: 30 },
    { key: 'Unknown', value: 'unknown', label: '未知', severity: 'warn', order: 40 }
] as const);

export const CustomerPreferenceValue = enumDefinitionValueObject(CUSTOMER_PREFERENCE_DEFINITIONS);
export const CUSTOMER_PREFERENCES = enumDefinitionValues(CUSTOMER_PREFERENCE_DEFINITIONS);
export type CustomerPreference = (typeof CUSTOMER_PREFERENCES)[number];
export const CustomerPreferenceSchema = z.enum(CUSTOMER_PREFERENCES).meta({ id: 'CustomerPreference' });
export const CustomerPreferenceLabel = enumDefinitionLabels(CUSTOMER_PREFERENCE_DEFINITIONS);
export const CustomerPreferenceSeverity = enumDefinitionSeverities(CUSTOMER_PREFERENCE_DEFINITIONS);
export const CustomerPreferenceOptions = enumDefinitionOptions(CUSTOMER_PREFERENCE_DEFINITIONS);

export const WIN_PROBABILITY_LEVEL_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'High', value: 'high', label: '高', severity: 'success', order: 10 },
    { key: 'Medium', value: 'medium', label: '中', severity: 'warn', order: 20 },
    { key: 'Low', value: 'low', label: '低', severity: 'danger', order: 30 },
    { key: 'Unknown', value: 'unknown', label: '未知', severity: 'secondary', order: 40 }
] as const);

export const WinProbabilityLevelValue = enumDefinitionValueObject(WIN_PROBABILITY_LEVEL_DEFINITIONS);
export const WIN_PROBABILITY_LEVELS = enumDefinitionValues(WIN_PROBABILITY_LEVEL_DEFINITIONS);
export type WinProbabilityLevel = (typeof WIN_PROBABILITY_LEVELS)[number];
export const WinProbabilityLevelSchema = z.enum(WIN_PROBABILITY_LEVELS).meta({ id: 'WinProbabilityLevel' });
export const WinProbabilityLevelLabel = enumDefinitionLabels(WIN_PROBABILITY_LEVEL_DEFINITIONS);
export const WinProbabilityLevelSeverity = enumDefinitionSeverities(WIN_PROBABILITY_LEVEL_DEFINITIONS);
export const WinProbabilityLevelOptions = enumDefinitionOptions(WIN_PROBABILITY_LEVEL_DEFINITIONS);

export const SALES_INTELLIGENCE_GAP_ITEM_DEFINITIONS = defineEnumDefinitions([
    { key: 'DecisionMaker', value: 'decision-maker', label: '决策人未知', order: 10 },
    { key: 'TechnicalEvaluator', value: 'technical-evaluator', label: '技术把关人未知', order: 20 },
    { key: 'ProcurementProcess', value: 'procurement-process', label: '采购流程未知', order: 30 },
    { key: 'BudgetSource', value: 'budget-source', label: '预算来源未知', order: 40 },
    { key: 'Competitor', value: 'competitor', label: '竞争对手未知', order: 50 },
    { key: 'PainPoint', value: 'pain-point', label: '客户核心痛点不明确', order: 60 },
    { key: 'NextContact', value: 'next-contact', label: '下一步接触对象不明确', order: 70 }
] as const);

export const SalesIntelligenceGapItemValue = enumDefinitionValueObject(SALES_INTELLIGENCE_GAP_ITEM_DEFINITIONS);
export const SALES_INTELLIGENCE_GAP_ITEMS = enumDefinitionValues(SALES_INTELLIGENCE_GAP_ITEM_DEFINITIONS);
export type SalesIntelligenceGapItem = (typeof SALES_INTELLIGENCE_GAP_ITEMS)[number];
export const SalesIntelligenceGapItemSchema = z.enum(SALES_INTELLIGENCE_GAP_ITEMS).meta({ id: 'SalesIntelligenceGapItem' });
export const SalesIntelligenceGapItemLabel = enumDefinitionLabels(SALES_INTELLIGENCE_GAP_ITEM_DEFINITIONS);
export const SalesIntelligenceGapItemOptions = enumDefinitionOptions(SALES_INTELLIGENCE_GAP_ITEM_DEFINITIONS);

export const SALES_INTELLIGENCE_GAP_SEVERITY_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Attention', value: 'attention', label: '提示', severity: 'secondary', order: 10 },
    { key: 'SoftBlocker', value: 'soft-blocker', label: '推进前需补齐', severity: 'warn', order: 20 }
] as const);

export const SalesIntelligenceGapSeverityValue = enumDefinitionValueObject(SALES_INTELLIGENCE_GAP_SEVERITY_DEFINITIONS);
export const SALES_INTELLIGENCE_GAP_SEVERITIES = enumDefinitionValues(SALES_INTELLIGENCE_GAP_SEVERITY_DEFINITIONS);
export type SalesIntelligenceGapSeverity = (typeof SALES_INTELLIGENCE_GAP_SEVERITIES)[number];
export const SalesIntelligenceGapSeveritySchema = z.enum(SALES_INTELLIGENCE_GAP_SEVERITIES).meta({ id: 'SalesIntelligenceGapSeverity' });
export const SalesIntelligenceGapSeverityLabel = enumDefinitionLabels(SALES_INTELLIGENCE_GAP_SEVERITY_DEFINITIONS);
export const SalesIntelligenceGapSeveritySeverity = enumDefinitionSeverities(SALES_INTELLIGENCE_GAP_SEVERITY_DEFINITIONS);
export const SalesIntelligenceGapSeverityOptions = enumDefinitionOptions(SALES_INTELLIGENCE_GAP_SEVERITY_DEFINITIONS);

export const BUSINESS_DISCUSSION_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'IntelligenceSupplement', value: 'intelligence-supplement', label: '情报补充', order: 10 },
    { key: 'DecisionChain', value: 'decision-chain', label: '决策链', order: 20 },
    { key: 'Competition', value: 'competition', label: '竞争态势', order: 30 },
    { key: 'Strategy', value: 'strategy', label: '推进策略', order: 40 },
    { key: 'Risk', value: 'risk', label: '风险提醒', order: 50 },
    { key: 'General', value: 'general', label: '一般讨论', order: 60 }
] as const);

export const BusinessDiscussionTypeValue = enumDefinitionValueObject(BUSINESS_DISCUSSION_TYPE_DEFINITIONS);
export const BUSINESS_DISCUSSION_TYPES = enumDefinitionValues(BUSINESS_DISCUSSION_TYPE_DEFINITIONS);
export type BusinessDiscussionType = (typeof BUSINESS_DISCUSSION_TYPES)[number];
export const BusinessDiscussionTypeSchema = z.enum(BUSINESS_DISCUSSION_TYPES).meta({ id: 'BusinessDiscussionType' });
export const BusinessDiscussionTypeLabel = enumDefinitionLabels(BUSINESS_DISCUSSION_TYPE_DEFINITIONS);
export const BusinessDiscussionTypeOptions = enumDefinitionOptions(BUSINESS_DISCUSSION_TYPE_DEFINITIONS);

export const BUSINESS_DISCUSSION_TARGET_OBJECT_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'Customer', value: 'customer', label: '客户', order: 10 },
    { key: 'Lead', value: 'lead', label: '线索', order: 20 },
    { key: 'Project', value: 'project', label: '项目', order: 30 }
] as const);

export const BusinessDiscussionTargetObjectTypeValue = enumDefinitionValueObject(BUSINESS_DISCUSSION_TARGET_OBJECT_TYPE_DEFINITIONS);
export const BUSINESS_DISCUSSION_TARGET_OBJECT_TYPES = enumDefinitionValues(BUSINESS_DISCUSSION_TARGET_OBJECT_TYPE_DEFINITIONS);
export type BusinessDiscussionTargetObjectType = (typeof BUSINESS_DISCUSSION_TARGET_OBJECT_TYPES)[number];
export const BusinessDiscussionTargetObjectTypeSchema = z.enum(BUSINESS_DISCUSSION_TARGET_OBJECT_TYPES).meta({ id: 'BusinessDiscussionTargetObjectType' });
export const BusinessDiscussionTargetObjectTypeLabel = enumDefinitionLabels(BUSINESS_DISCUSSION_TARGET_OBJECT_TYPE_DEFINITIONS);
export const BusinessDiscussionTargetObjectTypeOptions = enumDefinitionOptions(BUSINESS_DISCUSSION_TARGET_OBJECT_TYPE_DEFINITIONS);

const OpportunityContextQueryBaseSchema = z
    .object({
        leadId: z.uuid().optional(),
        projectId: z.uuid().optional()
    })
    .refine((value) => value.leadId !== undefined || value.projectId !== undefined, {
        message: 'At least one opportunity anchor is required'
    });

export const OpportunityContextQuerySchema = OpportunityContextQueryBaseSchema.meta({ id: 'OpportunityContextQuery' });

export type OpportunityContextQuery = z.infer<typeof OpportunityContextQuerySchema>;

export const CustomerContactSummarySchema = z
    .object({
        id: z.uuid(),
        customerId: z.uuid(),
        customerName: z.string(),
        name: z.string(),
        gender: CustomerContactGenderSchema,
        department: z.string().nullable(),
        title: z.string().nullable(),
        workPhone: z.string().nullable(),
        mobile: z.string().nullable(),
        wechat: z.string().nullable(),
        email: z.email().nullable(),
        remark: z.string().nullable(),
        status: CustomerContactStatusSchema,
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'CustomerContactSummary' });

export type CustomerContactSummary = z.infer<typeof CustomerContactSummarySchema>;

export const CustomerContactListSchema = z.array(CustomerContactSummarySchema).meta({ id: 'CustomerContactList' });

export const CustomerContactListQuerySchema = z.object({ customerId: z.uuid() }).meta({ id: 'CustomerContactListQuery' });

export type CustomerContactListQuery = z.infer<typeof CustomerContactListQuerySchema>;

export const CreateCustomerContactRequestSchema = z
    .object({
        customerId: z.uuid(),
        name: z.string().trim().min(1).max(128),
        gender: CustomerContactGenderSchema.optional(),
        department: z.string().trim().min(1).max(128).nullable().optional(),
        title: z.string().trim().min(1).max(128).nullable().optional(),
        workPhone: z.string().trim().min(1).max(64).nullable().optional(),
        mobile: z.string().trim().min(1).max(64).nullable().optional(),
        wechat: z.string().trim().min(1).max(128).nullable().optional(),
        email: z.email().nullable().optional(),
        remark: z.string().trim().min(1).max(2000).nullable().optional()
    })
    .meta({ id: 'CreateCustomerContactRequest' });

export type CreateCustomerContactRequest = z.infer<typeof CreateCustomerContactRequestSchema>;

export const UpdateCustomerContactRequestSchema = z
    .object({
        name: z.string().trim().min(1).max(128).optional(),
        gender: CustomerContactGenderSchema.optional(),
        department: z.string().trim().min(1).max(128).nullable().optional(),
        title: z.string().trim().min(1).max(128).nullable().optional(),
        workPhone: z.string().trim().min(1).max(64).nullable().optional(),
        mobile: z.string().trim().min(1).max(64).nullable().optional(),
        wechat: z.string().trim().min(1).max(128).nullable().optional(),
        email: z.email().nullable().optional(),
        remark: z.string().trim().min(1).max(2000).nullable().optional(),
        status: CustomerContactStatusSchema.optional()
    })
    .refine(
        (value) =>
            value.name !== undefined ||
            value.gender !== undefined ||
            value.department !== undefined ||
            value.title !== undefined ||
            value.workPhone !== undefined ||
            value.mobile !== undefined ||
            value.wechat !== undefined ||
            value.email !== undefined ||
            value.remark !== undefined ||
            value.status !== undefined,
        { message: 'At least one field is required for update' }
    )
    .meta({ id: 'UpdateCustomerContactRequest' });

export type UpdateCustomerContactRequest = z.infer<typeof UpdateCustomerContactRequestSchema>;

export const OpportunityStakeholderSummarySchema = z
    .object({
        id: z.uuid(),
        customerId: z.uuid(),
        customerName: z.string(),
        leadId: z.uuid().nullable(),
        leadName: z.string().nullable(),
        projectId: z.uuid().nullable(),
        projectName: z.string().nullable(),
        contactId: z.uuid(),
        contactName: z.string(),
        contactDepartment: z.string().nullable(),
        contactTitle: z.string().nullable(),
        role: OpportunityStakeholderRoleSchema,
        attitude: OpportunityStakeholderAttitudeSchema,
        influenceLevel: OpportunityStakeholderInfluenceLevelSchema,
        accessLevel: OpportunityStakeholderAccessLevelSchema,
        focusAreas: z.array(z.string()),
        communicationNotes: z.string().nullable(),
        isPrimary: z.boolean(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'OpportunityStakeholderSummary' });

export type OpportunityStakeholderSummary = z.infer<typeof OpportunityStakeholderSummarySchema>;

export const OpportunityStakeholderListSchema = z.array(OpportunityStakeholderSummarySchema).meta({ id: 'OpportunityStakeholderList' });

export const CreateOpportunityStakeholderRequestSchema = OpportunityContextQueryBaseSchema.extend({
    customerId: z.uuid(),
    contactId: z.uuid(),
    role: OpportunityStakeholderRoleSchema,
    attitude: OpportunityStakeholderAttitudeSchema.optional(),
    influenceLevel: OpportunityStakeholderInfluenceLevelSchema.optional(),
    accessLevel: OpportunityStakeholderAccessLevelSchema.optional(),
    focusAreas: z.array(z.string().trim().min(1).max(64)).max(12).optional(),
    communicationNotes: z.string().trim().min(1).max(2000).nullable().optional(),
    isPrimary: z.boolean().optional()
}).meta({ id: 'CreateOpportunityStakeholderRequest' });

export type CreateOpportunityStakeholderRequest = z.infer<typeof CreateOpportunityStakeholderRequestSchema>;

export const UpdateOpportunityStakeholderRequestSchema = z
    .object({
        role: OpportunityStakeholderRoleSchema.optional(),
        attitude: OpportunityStakeholderAttitudeSchema.optional(),
        influenceLevel: OpportunityStakeholderInfluenceLevelSchema.optional(),
        accessLevel: OpportunityStakeholderAccessLevelSchema.optional(),
        focusAreas: z.array(z.string().trim().min(1).max(64)).max(12).optional(),
        communicationNotes: z.string().trim().min(1).max(2000).nullable().optional(),
        isPrimary: z.boolean().optional()
    })
    .refine(
        (value) =>
            value.role !== undefined ||
            value.attitude !== undefined ||
            value.influenceLevel !== undefined ||
            value.accessLevel !== undefined ||
            value.focusAreas !== undefined ||
            value.communicationNotes !== undefined ||
            value.isPrimary !== undefined,
        { message: 'At least one field is required for update' }
    )
    .meta({ id: 'UpdateOpportunityStakeholderRequest' });

export type UpdateOpportunityStakeholderRequest = z.infer<typeof UpdateOpportunityStakeholderRequestSchema>;

export const CompetitorIntelligenceRecordSummarySchema = z
    .object({
        id: z.uuid(),
        customerId: z.uuid(),
        customerName: z.string(),
        leadId: z.uuid().nullable(),
        leadName: z.string().nullable(),
        projectId: z.uuid().nullable(),
        projectName: z.string().nullable(),
        competitorName: z.string(),
        position: CompetitorPositionSchema,
        customerPreference: CustomerPreferenceSchema,
        competitorStrengths: z.string().nullable(),
        competitorWeaknesses: z.string().nullable(),
        ourAdvantages: z.string().nullable(),
        ourRisks: z.string().nullable(),
        winProbability: WinProbabilityLevelSchema,
        evidence: z.string().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'CompetitorIntelligenceRecordSummary' });

export type CompetitorIntelligenceRecordSummary = z.infer<typeof CompetitorIntelligenceRecordSummarySchema>;

export const CompetitorIntelligenceRecordListSchema = z.array(CompetitorIntelligenceRecordSummarySchema).meta({ id: 'CompetitorIntelligenceRecordList' });

export const CreateCompetitorIntelligenceRecordRequestSchema = OpportunityContextQueryBaseSchema.extend({
    customerId: z.uuid(),
    competitorName: z.string().trim().min(1).max(255),
    position: CompetitorPositionSchema.optional(),
    customerPreference: CustomerPreferenceSchema.optional(),
    competitorStrengths: z.string().trim().min(1).max(2000).nullable().optional(),
    competitorWeaknesses: z.string().trim().min(1).max(2000).nullable().optional(),
    ourAdvantages: z.string().trim().min(1).max(2000).nullable().optional(),
    ourRisks: z.string().trim().min(1).max(2000).nullable().optional(),
    winProbability: WinProbabilityLevelSchema.optional(),
    evidence: z.string().trim().min(1).max(2000).nullable().optional()
}).meta({ id: 'CreateCompetitorIntelligenceRecordRequest' });

export type CreateCompetitorIntelligenceRecordRequest = z.infer<typeof CreateCompetitorIntelligenceRecordRequestSchema>;

export const UpdateCompetitorIntelligenceRecordRequestSchema = z
    .object({
        competitorName: z.string().trim().min(1).max(255).optional(),
        position: CompetitorPositionSchema.optional(),
        customerPreference: CustomerPreferenceSchema.optional(),
        competitorStrengths: z.string().trim().min(1).max(2000).nullable().optional(),
        competitorWeaknesses: z.string().trim().min(1).max(2000).nullable().optional(),
        ourAdvantages: z.string().trim().min(1).max(2000).nullable().optional(),
        ourRisks: z.string().trim().min(1).max(2000).nullable().optional(),
        winProbability: WinProbabilityLevelSchema.optional(),
        evidence: z.string().trim().min(1).max(2000).nullable().optional()
    })
    .refine(
        (value) =>
            value.competitorName !== undefined ||
            value.position !== undefined ||
            value.customerPreference !== undefined ||
            value.competitorStrengths !== undefined ||
            value.competitorWeaknesses !== undefined ||
            value.ourAdvantages !== undefined ||
            value.ourRisks !== undefined ||
            value.winProbability !== undefined ||
            value.evidence !== undefined,
        { message: 'At least one field is required for update' }
    )
    .meta({ id: 'UpdateCompetitorIntelligenceRecordRequest' });

export type UpdateCompetitorIntelligenceRecordRequest = z.infer<typeof UpdateCompetitorIntelligenceRecordRequestSchema>;

export const SalesDiscoveryRecordSummarySchema = z
    .object({
        id: z.uuid(),
        customerId: z.uuid(),
        customerName: z.string(),
        leadId: z.uuid().nullable(),
        leadName: z.string().nullable(),
        projectId: z.uuid().nullable(),
        projectName: z.string().nullable(),
        procurementProcess: z.string().nullable(),
        budgetSource: z.string().nullable(),
        customerPainPoints: z.string().nullable(),
        decisionCycle: z.string().nullable(),
        nextContactPlan: z.string().nullable(),
        remark: z.string().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'SalesDiscoveryRecordSummary' });

export type SalesDiscoveryRecordSummary = z.infer<typeof SalesDiscoveryRecordSummarySchema>;

export const SalesDiscoveryRecordListSchema = z.array(SalesDiscoveryRecordSummarySchema).meta({ id: 'SalesDiscoveryRecordList' });

export const CreateSalesDiscoveryRecordRequestSchema = OpportunityContextQueryBaseSchema.extend({
    customerId: z.uuid(),
    procurementProcess: z.string().trim().min(1).max(2000).nullable().optional(),
    budgetSource: z.string().trim().min(1).max(1000).nullable().optional(),
    customerPainPoints: z.string().trim().min(1).max(2000).nullable().optional(),
    decisionCycle: z.string().trim().min(1).max(1000).nullable().optional(),
    nextContactPlan: z.string().trim().min(1).max(1000).nullable().optional(),
    remark: z.string().trim().min(1).max(2000).nullable().optional()
}).meta({ id: 'CreateSalesDiscoveryRecordRequest' });

export type CreateSalesDiscoveryRecordRequest = z.infer<typeof CreateSalesDiscoveryRecordRequestSchema>;

export const UpdateSalesDiscoveryRecordRequestSchema = z
    .object({
        procurementProcess: z.string().trim().min(1).max(2000).nullable().optional(),
        budgetSource: z.string().trim().min(1).max(1000).nullable().optional(),
        customerPainPoints: z.string().trim().min(1).max(2000).nullable().optional(),
        decisionCycle: z.string().trim().min(1).max(1000).nullable().optional(),
        nextContactPlan: z.string().trim().min(1).max(1000).nullable().optional(),
        remark: z.string().trim().min(1).max(2000).nullable().optional()
    })
    .refine((value) => value.procurementProcess !== undefined || value.budgetSource !== undefined || value.customerPainPoints !== undefined || value.decisionCycle !== undefined || value.nextContactPlan !== undefined || value.remark !== undefined, {
        message: 'At least one field is required for update'
    })
    .meta({ id: 'UpdateSalesDiscoveryRecordRequest' });

export type UpdateSalesDiscoveryRecordRequest = z.infer<typeof UpdateSalesDiscoveryRecordRequestSchema>;

export const SalesIntelligenceGapSummarySchema = z
    .object({
        item: SalesIntelligenceGapItemSchema,
        label: z.string(),
        isMissing: z.boolean(),
        explanation: z.string(),
        severity: SalesIntelligenceGapSeveritySchema
    })
    .meta({ id: 'SalesIntelligenceGapSummary' });

export type SalesIntelligenceGapSummary = z.infer<typeof SalesIntelligenceGapSummarySchema>;

export const SalesIntelligenceGapListSchema = z.array(SalesIntelligenceGapSummarySchema).meta({ id: 'SalesIntelligenceGapList' });

export const BusinessDiscussionThreadSummarySchema = z
    .object({
        id: z.uuid(),
        targetObjectType: BusinessDiscussionTargetObjectTypeSchema,
        targetObjectId: z.uuid(),
        customerId: z.uuid().nullable(),
        leadId: z.uuid().nullable(),
        projectId: z.uuid().nullable(),
        targetTitle: z.string(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable()
    })
    .meta({ id: 'BusinessDiscussionThreadSummary' });

export type BusinessDiscussionThreadSummary = z.infer<typeof BusinessDiscussionThreadSummarySchema>;

export const BusinessDiscussionCommentSummarySchema = z
    .object({
        id: z.uuid(),
        threadId: z.uuid(),
        targetObjectType: BusinessDiscussionTargetObjectTypeSchema,
        targetObjectId: z.uuid(),
        targetTitle: z.string(),
        customerId: z.uuid().nullable(),
        leadId: z.uuid().nullable(),
        projectId: z.uuid().nullable(),
        discussionType: BusinessDiscussionTypeSchema,
        body: z.string(),
        relatedContactId: z.uuid().nullable(),
        relatedContactName: z.string().nullable(),
        relatedCompetitorRecordId: z.uuid().nullable(),
        relatedFollowUpRecordId: z.uuid().nullable(),
        isPinned: z.boolean(),
        isKeyConclusion: z.boolean(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        createdByName: z.string().nullable()
    })
    .meta({ id: 'BusinessDiscussionCommentSummary' });

export type BusinessDiscussionCommentSummary = z.infer<typeof BusinessDiscussionCommentSummarySchema>;

export const BusinessDiscussionCommentListSchema = z.array(BusinessDiscussionCommentSummarySchema).meta({ id: 'BusinessDiscussionCommentList' });

export const BusinessDiscussionListQuerySchema = z
    .object({
        customerId: z.uuid().optional(),
        leadId: z.uuid().optional(),
        projectId: z.uuid().optional()
    })
    .refine((value) => value.customerId !== undefined || value.leadId !== undefined || value.projectId !== undefined, {
        message: 'At least one discussion target anchor is required'
    })
    .meta({ id: 'BusinessDiscussionListQuery' });

export type BusinessDiscussionListQuery = z.infer<typeof BusinessDiscussionListQuerySchema>;

export const CreateBusinessDiscussionCommentRequestSchema = z
    .object({
        targetObjectType: BusinessDiscussionTargetObjectTypeSchema,
        targetObjectId: z.uuid(),
        discussionType: BusinessDiscussionTypeSchema,
        body: z.string().trim().min(1).max(8000),
        relatedContactId: z.uuid().nullable().optional(),
        relatedCompetitorRecordId: z.uuid().nullable().optional(),
        relatedFollowUpRecordId: z.uuid().nullable().optional(),
        isPinned: z.boolean().optional(),
        isKeyConclusion: z.boolean().optional()
    })
    .meta({ id: 'CreateBusinessDiscussionCommentRequest' });

export type CreateBusinessDiscussionCommentRequest = z.infer<typeof CreateBusinessDiscussionCommentRequestSchema>;

// ---------------------------------------------------------------------------
// Sales Follow Up
// ---------------------------------------------------------------------------

export type SalesFollowUpType = DictionaryCode;

export const SalesFollowUpTypeSchema = DictionaryCodeSchema.meta({ id: 'SalesFollowUpType' });

export const SALES_FOLLOW_UP_OUTCOME_DEFINITIONS = defineEnumDefinitions([
    { key: 'Progress', value: 'progress', label: '有进展', order: 10 },
    { key: 'WaitingCustomer', value: 'waiting-customer', label: '待客户反馈', order: 20 },
    { key: 'RiskDiscovered', value: 'risk-discovered', label: '发现风险', order: 30 },
    { key: 'Deferred', value: 'deferred', label: '暂缓', order: 40 },
    { key: 'CloseRecommended', value: 'close-recommended', label: '建议关闭', order: 50 },
    { key: 'NoResponse', value: 'no-response', label: '暂无回应', order: 60 },
    { key: 'Other', value: 'other', label: '其他', order: 70 }
] as const);

export const SalesFollowUpOutcomeValue = enumDefinitionValueObject(SALES_FOLLOW_UP_OUTCOME_DEFINITIONS);

export const SALES_FOLLOW_UP_OUTCOMES = enumDefinitionValues(SALES_FOLLOW_UP_OUTCOME_DEFINITIONS);

export type SalesFollowUpOutcome = (typeof SALES_FOLLOW_UP_OUTCOMES)[number];

export const SalesFollowUpOutcomeSchema = z.enum(SALES_FOLLOW_UP_OUTCOMES).meta({ id: 'SalesFollowUpOutcome' });

export const SalesFollowUpOutcomeLabel = enumDefinitionLabels(SALES_FOLLOW_UP_OUTCOME_DEFINITIONS);

export const SalesFollowUpOutcomeOptions = enumDefinitionOptions(SALES_FOLLOW_UP_OUTCOME_DEFINITIONS);

export const SALES_FOLLOW_UP_RECORD_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Active', value: 'active', label: '当前', severity: 'success', order: 10 },
    { key: 'Superseded', value: 'superseded', label: '已替代', severity: 'secondary', order: 20 },
    { key: 'Voided', value: 'voided', label: '已作废', severity: 'danger', order: 30 }
] as const);

export const SalesFollowUpRecordStatusValue = enumDefinitionValueObject(SALES_FOLLOW_UP_RECORD_STATUS_DEFINITIONS);

export const SALES_FOLLOW_UP_RECORD_STATUSES = enumDefinitionValues(SALES_FOLLOW_UP_RECORD_STATUS_DEFINITIONS);

export type SalesFollowUpRecordStatus = (typeof SALES_FOLLOW_UP_RECORD_STATUSES)[number];

export const SalesFollowUpRecordStatusSchema = z.enum(SALES_FOLLOW_UP_RECORD_STATUSES).meta({ id: 'SalesFollowUpRecordStatus' });

export const SalesFollowUpRecordStatusLabel = enumDefinitionLabels(SALES_FOLLOW_UP_RECORD_STATUS_DEFINITIONS);

export const SalesFollowUpRecordStatusSeverity = enumDefinitionSeverities(SALES_FOLLOW_UP_RECORD_STATUS_DEFINITIONS);

export const SalesFollowUpRecordStatusOptions = enumDefinitionOptions(SALES_FOLLOW_UP_RECORD_STATUS_DEFINITIONS);

export const SALES_FOLLOW_UP_RECORD_LIFECYCLE_SCOPES = ['active', 'all'] as const;

export type SalesFollowUpRecordLifecycleScope = (typeof SALES_FOLLOW_UP_RECORD_LIFECYCLE_SCOPES)[number];

export const SalesFollowUpRecordLifecycleScopeSchema = z.enum(SALES_FOLLOW_UP_RECORD_LIFECYCLE_SCOPES).meta({ id: 'SalesFollowUpRecordLifecycleScope' });

export const SalesFollowUpRecordLifecycleScopeValue = {
    Active: 'active',
    All: 'all'
} as const satisfies Record<string, SalesFollowUpRecordLifecycleScope>;

export const SalesFollowUpRecordSummarySchema = z
    .object({
        id: z.uuid(),
        customerId: z.uuid(),
        customerName: z.string(),
        leadId: z.uuid().nullable(),
        leadName: z.string().nullable(),
        projectId: z.uuid().nullable(),
        projectName: z.string().nullable(),
        followUpType: SalesFollowUpTypeSchema,
        status: SalesFollowUpRecordStatusSchema,
        occurredAt: z.iso.datetime(),
        summary: z.string(),
        detail: z.string().nullable(),
        outcome: SalesFollowUpOutcomeSchema,
        nextFollowUpAt: z.iso.datetime().nullable(),
        ownerOrgId: z.uuid().nullable(),
        ownerOrgName: z.string().nullable(),
        ownerUserId: z.uuid().nullable(),
        ownerName: z.string().nullable(),
        supersedesId: z.uuid().nullable(),
        replacedById: z.uuid().nullable(),
        replacementReason: z.string().nullable(),
        voidedAt: z.iso.datetime().nullable(),
        voidedBy: z.uuid().nullable(),
        voidedByName: z.string().nullable(),
        voidReason: z.string().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'SalesFollowUpRecordSummary' });

export type SalesFollowUpRecordSummary = z.infer<typeof SalesFollowUpRecordSummarySchema>;

export const SalesFollowUpRecordListSchema = z.array(SalesFollowUpRecordSummarySchema).meta({ id: 'SalesFollowUpRecordList' });

export type SalesFollowUpRecordList = z.infer<typeof SalesFollowUpRecordListSchema>;

export const SalesFollowUpRecordListQuerySchema = z
    .object({
        customerId: z.uuid().optional(),
        leadId: z.uuid().optional(),
        projectId: z.uuid().optional(),
        lifecycleScope: SalesFollowUpRecordLifecycleScopeSchema.optional()
    })
    .refine((value) => value.customerId !== undefined || value.leadId !== undefined || value.projectId !== undefined, {
        message: 'At least one anchor is required for sales follow-up query'
    })
    .meta({ id: 'SalesFollowUpRecordListQuery' });

export type SalesFollowUpRecordListQuery = z.infer<typeof SalesFollowUpRecordListQuerySchema>;

export const CreateSalesFollowUpRecordRequestSchema = z
    .object({
        customerId: z.uuid(),
        leadId: z.uuid().nullable().optional(),
        projectId: z.uuid().nullable().optional(),
        followUpType: SalesFollowUpTypeSchema,
        occurredAt: z.iso.datetime(),
        summary: z.string().trim().min(1).max(2000),
        detail: z.string().trim().min(1).max(8000).nullable().optional(),
        outcome: SalesFollowUpOutcomeSchema,
        nextFollowUpAt: z.iso.datetime().nullable().optional(),
        ownerOrgId: z.uuid().nullable().optional(),
        ownerUserId: z.uuid().nullable().optional()
    })
    .meta({ id: 'CreateSalesFollowUpRecordRequest' });

export type CreateSalesFollowUpRecordRequest = z.infer<typeof CreateSalesFollowUpRecordRequestSchema>;

export const ReplaceSalesFollowUpRecordRequestSchema = z
    .object({
        followUpType: SalesFollowUpTypeSchema,
        occurredAt: z.iso.datetime(),
        summary: z.string().trim().min(1).max(2000),
        detail: z.string().trim().min(1).max(8000).nullable().optional(),
        outcome: SalesFollowUpOutcomeSchema,
        nextFollowUpAt: z.iso.datetime().nullable().optional(),
        ownerOrgId: z.uuid().nullable().optional(),
        ownerUserId: z.uuid().nullable().optional(),
        replacementReason: z.string().trim().min(1).max(1000),
        expectedVersion: z.number().int().positive()
    })
    .meta({ id: 'ReplaceSalesFollowUpRecordRequest' });

export type ReplaceSalesFollowUpRecordRequest = z.infer<typeof ReplaceSalesFollowUpRecordRequestSchema>;

export const VoidSalesFollowUpRecordRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(1000),
        comment: z.string().trim().max(1000).nullable().optional(),
        expectedVersion: z.number().int().positive()
    })
    .meta({ id: 'VoidSalesFollowUpRecordRequest' });

export type VoidSalesFollowUpRecordRequest = z.infer<typeof VoidSalesFollowUpRecordRequestSchema>;

// ---------------------------------------------------------------------------
// Attachment
// ---------------------------------------------------------------------------

export const AttachmentStorageProviderTypeValue = {
    Local: 'local',
    HuaweiObsS3: 'huawei-obs-s3'
} as const;

export const ATTACHMENT_STORAGE_PROVIDER_TYPES = enumObjectValues(AttachmentStorageProviderTypeValue);
export type AttachmentStorageProviderType = (typeof ATTACHMENT_STORAGE_PROVIDER_TYPES)[number];
export const AttachmentStorageProviderTypeSchema = z.enum(ATTACHMENT_STORAGE_PROVIDER_TYPES).meta({ id: 'AttachmentStorageProviderType' });

export const AttachmentStorageProviderConfigStatusValue = {
    Draft: 'draft',
    Active: 'active',
    Disabled: 'disabled',
    Misconfigured: 'misconfigured'
} as const;

export const ATTACHMENT_STORAGE_PROVIDER_CONFIG_STATUSES = enumObjectValues(AttachmentStorageProviderConfigStatusValue);
export type AttachmentStorageProviderConfigStatus = (typeof ATTACHMENT_STORAGE_PROVIDER_CONFIG_STATUSES)[number];
export const AttachmentStorageProviderConfigStatusSchema = z.enum(ATTACHMENT_STORAGE_PROVIDER_CONFIG_STATUSES).meta({ id: 'AttachmentStorageProviderConfigStatus' });

export const AttachmentStorageProviderConnectionTestStatusValue = {
    Success: 'success',
    Failed: 'failed'
} as const;

export const ATTACHMENT_STORAGE_PROVIDER_CONNECTION_TEST_STATUSES = enumObjectValues(AttachmentStorageProviderConnectionTestStatusValue);
export type AttachmentStorageProviderConnectionTestStatus = (typeof ATTACHMENT_STORAGE_PROVIDER_CONNECTION_TEST_STATUSES)[number];
export const AttachmentStorageProviderConnectionTestStatusSchema = z.enum(ATTACHMENT_STORAGE_PROVIDER_CONNECTION_TEST_STATUSES).meta({ id: 'AttachmentStorageProviderConnectionTestStatus' });

export const AttachmentStorageProviderConfigSummarySchema = z
    .object({
        id: z.uuid(),
        providerType: AttachmentStorageProviderTypeSchema,
        displayName: z.string(),
        status: AttachmentStorageProviderConfigStatusSchema,
        enabled: z.boolean(),
        isDefault: z.boolean(),
        endpoint: z.string().nullable(),
        region: z.string().nullable(),
        bucket: z.string().nullable(),
        keyPrefix: z.string().nullable(),
        forcePathStyle: z.boolean(),
        accessKeyConfigured: z.boolean(),
        secretAccessKeyConfigured: z.boolean(),
        credentialsUpdatedAt: z.iso.datetime().nullable(),
        rowVersion: z.number().int(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime(),
        updatedBy: z.uuid().nullable()
    })
    .meta({ id: 'AttachmentStorageProviderConfigSummary' });

export type AttachmentStorageProviderConfigSummary = z.infer<typeof AttachmentStorageProviderConfigSummarySchema>;

export const AttachmentStorageProviderConfigDetailSchema = AttachmentStorageProviderConfigSummarySchema.meta({ id: 'AttachmentStorageProviderConfigDetail' });

export type AttachmentStorageProviderConfigDetail = z.infer<typeof AttachmentStorageProviderConfigDetailSchema>;

export const AttachmentStorageProviderConfigListSchema = z.array(AttachmentStorageProviderConfigSummarySchema).meta({ id: 'AttachmentStorageProviderConfigList' });

export type AttachmentStorageProviderConfigList = z.infer<typeof AttachmentStorageProviderConfigListSchema>;

export const AttachmentStorageProviderConfigListQuerySchema = z
    .object({
        providerType: AttachmentStorageProviderTypeSchema.optional(),
        status: AttachmentStorageProviderConfigStatusSchema.optional(),
        enabled: z.coerce.boolean().optional()
    })
    .meta({ id: 'AttachmentStorageProviderConfigListQuery' });

export type AttachmentStorageProviderConfigListQuery = z.infer<typeof AttachmentStorageProviderConfigListQuerySchema>;

export const CreateAttachmentStorageProviderConfigRequestSchema = z
    .object({
        providerType: AttachmentStorageProviderTypeSchema,
        displayName: z.string().trim().min(1).max(128),
        enabled: z.boolean().optional(),
        isDefault: z.boolean().optional(),
        endpoint: z.string().trim().min(1).max(512).nullable().optional(),
        region: z.string().trim().min(1).max(128).nullable().optional(),
        bucket: z.string().trim().min(1).max(255).nullable().optional(),
        keyPrefix: z.string().trim().min(1).max(512).nullable().optional(),
        forcePathStyle: z.boolean().optional(),
        accessKeyId: z.string().trim().min(1).max(2048).optional(),
        secretAccessKey: z.string().trim().min(1).max(2048).optional()
    })
    .meta({ id: 'CreateAttachmentStorageProviderConfigRequest' });

export type CreateAttachmentStorageProviderConfigRequest = z.infer<typeof CreateAttachmentStorageProviderConfigRequestSchema>;

export const UpdateAttachmentStorageProviderConfigRequestSchema = z
    .object({
        displayName: z.string().trim().min(1).max(128).optional(),
        enabled: z.boolean().optional(),
        status: AttachmentStorageProviderConfigStatusSchema.optional(),
        endpoint: z.string().trim().min(1).max(512).nullable().optional(),
        region: z.string().trim().min(1).max(128).nullable().optional(),
        bucket: z.string().trim().min(1).max(255).nullable().optional(),
        keyPrefix: z.string().trim().min(1).max(512).nullable().optional(),
        forcePathStyle: z.boolean().optional(),
        accessKeyId: z.string().trim().min(1).max(2048).nullable().optional(),
        secretAccessKey: z.string().trim().min(1).max(2048).nullable().optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .refine(
        (value) =>
            value.displayName !== undefined ||
            value.enabled !== undefined ||
            value.status !== undefined ||
            value.endpoint !== undefined ||
            value.region !== undefined ||
            value.bucket !== undefined ||
            value.keyPrefix !== undefined ||
            value.forcePathStyle !== undefined ||
            value.accessKeyId !== undefined ||
            value.secretAccessKey !== undefined,
        { message: 'At least one updatable field is required' }
    )
    .meta({ id: 'UpdateAttachmentStorageProviderConfigRequest' });

export type UpdateAttachmentStorageProviderConfigRequest = z.infer<typeof UpdateAttachmentStorageProviderConfigRequestSchema>;

export const TestAttachmentStorageProviderConnectionRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'TestAttachmentStorageProviderConnectionRequest' });

export type TestAttachmentStorageProviderConnectionRequest = z.infer<typeof TestAttachmentStorageProviderConnectionRequestSchema>;

export const SetDefaultAttachmentStorageProviderRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'SetDefaultAttachmentStorageProviderRequest' });

export type SetDefaultAttachmentStorageProviderRequest = z.infer<typeof SetDefaultAttachmentStorageProviderRequestSchema>;

export const AttachmentStorageProviderConnectionTestResultSchema = z
    .object({
        status: AttachmentStorageProviderConnectionTestStatusSchema,
        message: z.string(),
        checkedAt: z.iso.datetime()
    })
    .meta({ id: 'AttachmentStorageProviderConnectionTestResult' });

export type AttachmentStorageProviderConnectionTestResult = z.infer<typeof AttachmentStorageProviderConnectionTestResultSchema>;

export type AttachmentCategory = DictionaryCode;

export const AttachmentCategorySchema = DictionaryCodeSchema.meta({ id: 'AttachmentCategory' });

export const ATTACHMENT_SECURITY_LEVEL_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Normal', value: 'normal', label: '普通', severity: 'secondary', order: 10 },
    { key: 'Internal', value: 'internal', label: '内部', severity: 'info', order: 20 },
    { key: 'Sensitive', value: 'sensitive', label: '敏感', severity: 'warn', order: 30 },
    { key: 'Confidential', value: 'confidential', label: '机密', severity: 'danger', order: 40 },
    { key: 'Restricted', value: 'restricted', label: '高机密', severity: 'danger', order: 50 }
] as const);

export const AttachmentSecurityLevelValue = enumDefinitionValueObject(ATTACHMENT_SECURITY_LEVEL_DEFINITIONS);

export const ATTACHMENT_SECURITY_LEVELS = enumDefinitionValues(ATTACHMENT_SECURITY_LEVEL_DEFINITIONS);

export type AttachmentSecurityLevel = (typeof ATTACHMENT_SECURITY_LEVELS)[number];

export const AttachmentSecurityLevelSchema = z.enum(ATTACHMENT_SECURITY_LEVELS).meta({ id: 'AttachmentSecurityLevel' });

export const AttachmentSecurityLevelLabel = enumDefinitionLabels(ATTACHMENT_SECURITY_LEVEL_DEFINITIONS);

export const AttachmentSecurityLevelSeverity = enumDefinitionSeverities(ATTACHMENT_SECURITY_LEVEL_DEFINITIONS);

export const AttachmentSecurityLevelOptions = enumDefinitionOptions(ATTACHMENT_SECURITY_LEVEL_DEFINITIONS);

export const ATTACHMENT_STATUSES = ['active', 'voided', 'deleted', 'failed'] as const;

export type AttachmentStatus = (typeof ATTACHMENT_STATUSES)[number];

export const AttachmentStatusSchema = z.enum(ATTACHMENT_STATUSES).meta({ id: 'AttachmentStatus' });

export const AttachmentStatusValue = {
    Active: 'active',
    Voided: 'voided',
    Deleted: 'deleted',
    Failed: 'failed'
} as const satisfies Record<string, AttachmentStatus>;

export const ATTACHMENT_TARGET_TYPES = ['lead', 'customer', 'project', 'contract', 'sales-follow-up', 'project-handover'] as const;

export type AttachmentTargetType = (typeof ATTACHMENT_TARGET_TYPES)[number];

export const AttachmentTargetTypeSchema = z.enum(ATTACHMENT_TARGET_TYPES).meta({ id: 'AttachmentTargetType' });

export const AttachmentTargetTypeValue = {
    Lead: 'lead',
    Customer: 'customer',
    Project: 'project',
    Contract: 'contract',
    SalesFollowUp: 'sales-follow-up',
    ProjectHandover: 'project-handover'
} as const satisfies Record<string, AttachmentTargetType>;

export const ATTACHMENT_RELATION_TYPES = ['normal', 'source', 'evidence', 'final', 'handover'] as const;

export type AttachmentRelationType = (typeof ATTACHMENT_RELATION_TYPES)[number];

export const AttachmentRelationTypeSchema = z.enum(ATTACHMENT_RELATION_TYPES).meta({ id: 'AttachmentRelationType' });

export const AttachmentRelationTypeValue = {
    Normal: 'normal',
    Source: 'source',
    Evidence: 'evidence',
    Final: 'final',
    Handover: 'handover'
} as const satisfies Record<string, AttachmentRelationType>;

export const ATTACHMENT_LINK_STATUSES = ['active', 'unlinked'] as const;

export type AttachmentLinkStatus = (typeof ATTACHMENT_LINK_STATUSES)[number];

export const AttachmentLinkStatusSchema = z.enum(ATTACHMENT_LINK_STATUSES).meta({ id: 'AttachmentLinkStatus' });

export const AttachmentLinkStatusValue = {
    Active: 'active',
    Unlinked: 'unlinked'
} as const satisfies Record<string, AttachmentLinkStatus>;

export const AttachmentLinkSummarySchema = z
    .object({
        id: z.uuid(),
        attachmentId: z.uuid(),
        targetType: AttachmentTargetTypeSchema,
        targetId: z.uuid(),
        relationType: AttachmentRelationTypeSchema,
        status: AttachmentLinkStatusSchema,
        linkedBy: z.uuid().nullable(),
        linkedAt: z.iso.datetime(),
        unlinkedBy: z.uuid().nullable(),
        unlinkedAt: z.iso.datetime().nullable()
    })
    .meta({ id: 'AttachmentLinkSummary' });

export type AttachmentLinkSummary = z.infer<typeof AttachmentLinkSummarySchema>;

export const AttachmentSummarySchema = z
    .object({
        id: z.uuid(),
        originalName: z.string(),
        displayName: z.string(),
        extension: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number().int().nonnegative(),
        checksumSha256: z.string().length(64),
        category: AttachmentCategorySchema,
        securityLevel: AttachmentSecurityLevelSchema,
        status: AttachmentStatusSchema,
        description: z.string().nullable(),
        previousAttachmentId: z.uuid().nullable(),
        changeNote: z.string().nullable(),
        versionGroupId: z.uuid(),
        versionNo: z.number().int().positive(),
        isLatest: z.boolean(),
        isFinal: z.boolean(),
        previewSupported: z.boolean(),
        previewMimeType: z.string().nullable(),
        previewUrl: z.string().nullable(),
        thumbnailAvailable: z.boolean(),
        thumbnailUrl: z.string().nullable(),
        uploadedBy: z.uuid().nullable(),
        uploadedByName: z.string().nullable(),
        uploadedAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
        deletedAt: z.iso.datetime().nullable(),
        links: z.array(AttachmentLinkSummarySchema)
    })
    .meta({ id: 'AttachmentSummary' });

export type AttachmentSummary = z.infer<typeof AttachmentSummarySchema>;

export const AttachmentListSchema = z.array(AttachmentSummarySchema).meta({ id: 'AttachmentList' });

export type AttachmentList = z.infer<typeof AttachmentListSchema>;

export const AttachmentVersionSummarySchema = AttachmentSummarySchema.meta({ id: 'AttachmentVersionSummary' });

export type AttachmentVersionSummary = z.infer<typeof AttachmentVersionSummarySchema>;

export const AttachmentVersionListSchema = z.array(AttachmentVersionSummarySchema).meta({ id: 'AttachmentVersionList' });

export type AttachmentVersionList = z.infer<typeof AttachmentVersionListSchema>;

export const AttachmentListQuerySchema = z
    .object({
        targetType: AttachmentTargetTypeSchema,
        targetId: z.uuid(),
        category: AttachmentCategorySchema.optional(),
        status: AttachmentStatusSchema.optional()
    })
    .meta({ id: 'AttachmentListQuery' });

export type AttachmentListQuery = z.infer<typeof AttachmentListQuerySchema>;

export const AttachmentUploadSessionOperationTypeValue = {
    CreateAttachment: 'create-attachment',
    CreateVersion: 'create-version'
} as const;

export const ATTACHMENT_UPLOAD_SESSION_OPERATION_TYPES = enumObjectValues(AttachmentUploadSessionOperationTypeValue);
export type AttachmentUploadSessionOperationType = (typeof ATTACHMENT_UPLOAD_SESSION_OPERATION_TYPES)[number];
export const AttachmentUploadSessionOperationTypeSchema = z.enum(ATTACHMENT_UPLOAD_SESSION_OPERATION_TYPES).meta({ id: 'AttachmentUploadSessionOperationType' });

export const AttachmentUploadSessionStatusValue = {
    Pending: 'pending',
    Uploading: 'uploading',
    Uploaded: 'uploaded',
    Validating: 'validating',
    Completed: 'completed',
    Failed: 'failed',
    Expired: 'expired',
    Aborted: 'aborted'
} as const;

export const ATTACHMENT_UPLOAD_SESSION_STATUSES = enumObjectValues(AttachmentUploadSessionStatusValue);
export type AttachmentUploadSessionStatus = (typeof ATTACHMENT_UPLOAD_SESSION_STATUSES)[number];
export const AttachmentUploadSessionStatusSchema = z.enum(ATTACHMENT_UPLOAD_SESSION_STATUSES).meta({ id: 'AttachmentUploadSessionStatus' });

export const AttachmentUploadModeValue = {
    Proxy: 'proxy',
    PresignedPut: 'presigned-put',
    Multipart: 'multipart'
} as const;

export const ATTACHMENT_UPLOAD_MODES = enumObjectValues(AttachmentUploadModeValue);
export type AttachmentUploadMode = (typeof ATTACHMENT_UPLOAD_MODES)[number];
export const AttachmentUploadModeSchema = z.enum(ATTACHMENT_UPLOAD_MODES).meta({ id: 'AttachmentUploadMode' });

export const ATTACHMENT_UPLOAD_TARGET_METHODS = ['PUT'] as const;
export type AttachmentUploadTargetMethod = (typeof ATTACHMENT_UPLOAD_TARGET_METHODS)[number];
export const AttachmentUploadTargetMethodSchema = z.enum(ATTACHMENT_UPLOAD_TARGET_METHODS).meta({ id: 'AttachmentUploadTargetMethod' });

export const CreateAttachmentUploadSessionRequestSchema = z
    .object({
        operationType: AttachmentUploadSessionOperationTypeSchema,
        targetType: AttachmentTargetTypeSchema.optional(),
        targetId: z.uuid().optional(),
        baseAttachmentId: z.uuid().optional(),
        originalName: z.string().trim().min(1).max(255),
        displayName: z.string().trim().min(1).max(255).optional(),
        mimeType: z.string().trim().min(1).max(255).optional(),
        sizeBytes: z.number().int().positive(),
        checksumSha256: z.string().trim().length(64).optional(),
        category: AttachmentCategorySchema.optional(),
        securityLevel: AttachmentSecurityLevelSchema.optional(),
        relationType: AttachmentRelationTypeSchema.optional(),
        description: z.string().trim().max(4000).nullable().optional(),
        changeNote: z.string().trim().min(1).max(2000).optional()
    })
    .superRefine((value, ctx) => {
        if (value.operationType === AttachmentUploadSessionOperationTypeValue.CreateAttachment) {
            if (!value.targetType) {
                ctx.addIssue({ code: 'custom', path: ['targetType'], message: 'targetType is required for create-attachment upload sessions' });
            }
            if (!value.targetId) {
                ctx.addIssue({ code: 'custom', path: ['targetId'], message: 'targetId is required for create-attachment upload sessions' });
            }
            if (!value.category) {
                ctx.addIssue({ code: 'custom', path: ['category'], message: 'category is required for create-attachment upload sessions' });
            }
        }

        if (value.operationType === AttachmentUploadSessionOperationTypeValue.CreateVersion) {
            if (!value.baseAttachmentId) {
                ctx.addIssue({ code: 'custom', path: ['baseAttachmentId'], message: 'baseAttachmentId is required for create-version upload sessions' });
            }
            if (!value.changeNote) {
                ctx.addIssue({ code: 'custom', path: ['changeNote'], message: 'changeNote is required for create-version upload sessions' });
            }
        }
    })
    .meta({ id: 'CreateAttachmentUploadSessionRequest' });

export type CreateAttachmentUploadSessionRequest = z.infer<typeof CreateAttachmentUploadSessionRequestSchema>;

export const AttachmentUploadSessionSummarySchema = z
    .object({
        id: z.uuid(),
        operationType: AttachmentUploadSessionOperationTypeSchema,
        status: AttachmentUploadSessionStatusSchema,
        uploadMode: AttachmentUploadModeSchema,
        providerType: AttachmentStorageProviderTypeSchema,
        targetType: AttachmentTargetTypeSchema.nullable(),
        targetId: z.uuid().nullable(),
        baseAttachmentId: z.uuid().nullable(),
        completedAttachmentId: z.uuid().nullable(),
        originalName: z.string(),
        displayName: z.string(),
        extension: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number().int().positive(),
        checksumSha256: z.string().length(64).nullable(),
        category: AttachmentCategorySchema.nullable(),
        securityLevel: AttachmentSecurityLevelSchema.nullable(),
        relationType: AttachmentRelationTypeSchema.nullable(),
        description: z.string().nullable(),
        changeNote: z.string().nullable(),
        expiresAt: z.iso.datetime(),
        uploadedAt: z.iso.datetime().nullable(),
        completedAt: z.iso.datetime().nullable(),
        abortedAt: z.iso.datetime().nullable(),
        failedReason: z.string().nullable(),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'AttachmentUploadSessionSummary' });

export type AttachmentUploadSessionSummary = z.infer<typeof AttachmentUploadSessionSummarySchema>;

export const CreateAttachmentUploadTargetRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'CreateAttachmentUploadTargetRequest' });

export type CreateAttachmentUploadTargetRequest = z.infer<typeof CreateAttachmentUploadTargetRequestSchema>;

export const AttachmentUploadTargetSchema = z
    .object({
        sessionId: z.uuid(),
        uploadMode: AttachmentUploadModeSchema,
        method: AttachmentUploadTargetMethodSchema,
        url: z.string().min(1),
        headers: z.record(z.string(), z.string()),
        expiresAt: z.iso.datetime(),
        providerType: AttachmentStorageProviderTypeSchema,
        maxSizeBytes: z.number().int().positive()
    })
    .meta({ id: 'AttachmentUploadTarget' });

export type AttachmentUploadTarget = z.infer<typeof AttachmentUploadTargetSchema>;

export const AttachmentUploadTargetResultSchema = z
    .object({
        sessionId: z.uuid(),
        status: AttachmentUploadSessionStatusSchema,
        uploadedAt: z.iso.datetime().nullable(),
        rowVersion: z.number().int().positive()
    })
    .meta({ id: 'AttachmentUploadTargetResult' });

export type AttachmentUploadTargetResult = z.infer<typeof AttachmentUploadTargetResultSchema>;

export const CompleteAttachmentUploadSessionRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional(),
        checksumSha256: z.string().trim().length(64).optional()
    })
    .meta({ id: 'CompleteAttachmentUploadSessionRequest' });

export type CompleteAttachmentUploadSessionRequest = z.infer<typeof CompleteAttachmentUploadSessionRequestSchema>;

export const AbortAttachmentUploadSessionRequestSchema = z
    .object({
        expectedVersion: z.number().int().positive().optional(),
        reason: z.string().trim().min(1).max(1000).optional()
    })
    .meta({ id: 'AbortAttachmentUploadSessionRequest' });

export type AbortAttachmentUploadSessionRequest = z.infer<typeof AbortAttachmentUploadSessionRequestSchema>;

export const UpdateAttachmentRequestSchema = z
    .object({
        displayName: z.string().trim().min(1).max(255).optional(),
        category: AttachmentCategorySchema.optional(),
        securityLevel: AttachmentSecurityLevelSchema.optional(),
        description: z.string().trim().max(4000).nullable().optional()
    })
    .meta({ id: 'UpdateAttachmentRequest' });

export type UpdateAttachmentRequest = z.infer<typeof UpdateAttachmentRequestSchema>;

export const CreateAttachmentVersionRequestSchema = z
    .object({
        changeNote: z.string().trim().min(1).max(2000),
        displayName: z.string().trim().min(1).max(255).optional(),
        category: AttachmentCategorySchema.optional(),
        securityLevel: AttachmentSecurityLevelSchema.optional(),
        description: z.string().trim().max(4000).nullable().optional()
    })
    .meta({ id: 'CreateAttachmentVersionRequest' });

export type CreateAttachmentVersionRequest = z.infer<typeof CreateAttachmentVersionRequestSchema>;

export const MarkAttachmentFinalRequestSchema = z
    .object({
        note: z.string().trim().max(1000).nullable().optional()
    })
    .meta({ id: 'MarkAttachmentFinalRequest' });

export type MarkAttachmentFinalRequest = z.infer<typeof MarkAttachmentFinalRequestSchema>;

export const ClearAttachmentFinalRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(1000)
    })
    .meta({ id: 'ClearAttachmentFinalRequest' });

export type ClearAttachmentFinalRequest = z.infer<typeof ClearAttachmentFinalRequestSchema>;

export const CreateAttachmentLinkRequestSchema = z
    .object({
        targetType: AttachmentTargetTypeSchema,
        targetId: z.uuid(),
        relationType: AttachmentRelationTypeSchema.default(AttachmentRelationTypeValue.Normal)
    })
    .meta({ id: 'CreateAttachmentLinkRequest' });

export type CreateAttachmentLinkRequest = z.infer<typeof CreateAttachmentLinkRequestSchema>;

export const VoidAttachmentRequestSchema = z
    .object({
        reason: z.string().trim().min(1).max(1000)
    })
    .meta({ id: 'VoidAttachmentRequest' });

export type VoidAttachmentRequest = z.infer<typeof VoidAttachmentRequestSchema>;

export const PROJECT_HANDOVER_ATTACHMENT_CHECKLIST_ITEM_STATUSES = ['included', 'missing', 'excluded', 'sensitive-excluded', 'stale-version'] as const;

export type ProjectHandoverAttachmentChecklistItemStatus = (typeof PROJECT_HANDOVER_ATTACHMENT_CHECKLIST_ITEM_STATUSES)[number];

export const ProjectHandoverAttachmentChecklistItemStatusSchema = z.enum(PROJECT_HANDOVER_ATTACHMENT_CHECKLIST_ITEM_STATUSES).meta({ id: 'ProjectHandoverAttachmentChecklistItemStatus' });

export const ProjectHandoverAttachmentChecklistItemStatusValue = {
    Included: 'included',
    Missing: 'missing',
    Excluded: 'excluded',
    SensitiveExcluded: 'sensitive-excluded',
    StaleVersion: 'stale-version'
} as const satisfies Record<string, ProjectHandoverAttachmentChecklistItemStatus>;

export const ATTACHMENT_DOWNLOAD_PACKAGE_STATUSES = ['pending', 'running', 'ready', 'failed', 'expired', 'cancelled'] as const;

export type AttachmentDownloadPackageStatus = (typeof ATTACHMENT_DOWNLOAD_PACKAGE_STATUSES)[number];

export const AttachmentDownloadPackageStatusSchema = z.enum(ATTACHMENT_DOWNLOAD_PACKAGE_STATUSES).meta({ id: 'AttachmentDownloadPackageStatus' });

export const AttachmentDownloadPackageStatusValue = {
    Pending: 'pending',
    Running: 'running',
    Ready: 'ready',
    Failed: 'failed',
    Expired: 'expired',
    Cancelled: 'cancelled'
} as const satisfies Record<string, AttachmentDownloadPackageStatus>;

export const ATTACHMENT_DOWNLOAD_PACKAGE_ITEM_STATUSES = ['included', 'excluded'] as const;

export type AttachmentDownloadPackageItemStatus = (typeof ATTACHMENT_DOWNLOAD_PACKAGE_ITEM_STATUSES)[number];

export const AttachmentDownloadPackageItemStatusSchema = z.enum(ATTACHMENT_DOWNLOAD_PACKAGE_ITEM_STATUSES).meta({ id: 'AttachmentDownloadPackageItemStatus' });

export const AttachmentDownloadPackageItemStatusValue = {
    Included: 'included',
    Excluded: 'excluded'
} as const satisfies Record<string, AttachmentDownloadPackageItemStatus>;

export const ProjectHandoverAttachmentSourceRefSchema = z
    .object({
        sourceType: AttachmentTargetTypeSchema,
        sourceId: z.uuid(),
        relationType: AttachmentRelationTypeSchema.nullable(),
        label: z.string().nullable()
    })
    .meta({ id: 'ProjectHandoverAttachmentSourceRef' });

export type ProjectHandoverAttachmentSourceRef = z.infer<typeof ProjectHandoverAttachmentSourceRefSchema>;

export const ProjectHandoverAttachmentChecklistItemSchema = z
    .object({
        selectionId: z.uuid().nullable(),
        handoverId: z.uuid(),
        projectId: z.uuid(),
        attachmentId: z.uuid().nullable(),
        versionGroupId: z.uuid().nullable(),
        displayName: z.string(),
        category: AttachmentCategorySchema.nullable(),
        securityLevel: AttachmentSecurityLevelSchema.nullable(),
        status: ProjectHandoverAttachmentChecklistItemStatusSchema,
        selectionReason: z.string().nullable(),
        exclusionReason: z.string().nullable(),
        downloadEligible: z.boolean(),
        staleVersion: z.boolean(),
        sourceRefs: z.array(ProjectHandoverAttachmentSourceRefSchema),
        rowVersion: z.number().int().positive().nullable(),
        updatedAt: z.iso.datetime().nullable()
    })
    .meta({ id: 'ProjectHandoverAttachmentChecklistItem' });

export type ProjectHandoverAttachmentChecklistItem = z.infer<typeof ProjectHandoverAttachmentChecklistItemSchema>;

export const ProjectHandoverAttachmentChecklistCountsSchema = z
    .object({
        total: z.number().int().nonnegative(),
        included: z.number().int().nonnegative(),
        missing: z.number().int().nonnegative(),
        excluded: z.number().int().nonnegative(),
        sensitiveExcluded: z.number().int().nonnegative(),
        staleVersion: z.number().int().nonnegative(),
        downloadable: z.number().int().nonnegative()
    })
    .meta({ id: 'ProjectHandoverAttachmentChecklistCounts' });

export type ProjectHandoverAttachmentChecklistCounts = z.infer<typeof ProjectHandoverAttachmentChecklistCountsSchema>;

export const ProjectHandoverAttachmentChecklistViewSchema = z
    .object({
        handoverId: z.uuid(),
        projectId: z.uuid(),
        generatedAt: z.iso.datetime(),
        counts: ProjectHandoverAttachmentChecklistCountsSchema,
        items: z.array(ProjectHandoverAttachmentChecklistItemSchema)
    })
    .meta({ id: 'ProjectHandoverAttachmentChecklistView' });

export type ProjectHandoverAttachmentChecklistView = z.infer<typeof ProjectHandoverAttachmentChecklistViewSchema>;

export const RefreshProjectHandoverAttachmentChecklistRequestSchema = z
    .object({
        preserveManualExclusions: z.boolean().default(true),
        includeHistoricalSelections: z.boolean().default(true)
    })
    .meta({ id: 'RefreshProjectHandoverAttachmentChecklistRequest' });

export type RefreshProjectHandoverAttachmentChecklistRequest = z.infer<typeof RefreshProjectHandoverAttachmentChecklistRequestSchema>;

export const AttachmentDownloadPackageManifestSummarySchema = z
    .object({
        includedCount: z.number().int().nonnegative(),
        excludedCount: z.number().int().nonnegative(),
        includedAttachmentIds: z.array(z.uuid()),
        excludedAttachmentIds: z.array(z.uuid()),
        excludedReasons: z.array(z.string())
    })
    .meta({ id: 'AttachmentDownloadPackageManifestSummary' });

export type AttachmentDownloadPackageManifestSummary = z.infer<typeof AttachmentDownloadPackageManifestSummarySchema>;

export const AttachmentSelectionVersionExpectationSchema = z
    .object({
        selectionId: z.uuid(),
        rowVersion: z.number().int().positive()
    })
    .meta({ id: 'AttachmentSelectionVersionExpectation' });

export type AttachmentSelectionVersionExpectation = z.infer<typeof AttachmentSelectionVersionExpectationSchema>;

export const CreateProjectHandoverAttachmentDownloadPackageRequestSchema = z
    .object({
        selectionIds: z.array(z.uuid()).min(1).optional(),
        expectedSelectionVersions: z.array(AttachmentSelectionVersionExpectationSchema).optional(),
        confirmedSensitiveExclusion: z.boolean().default(true),
        note: z.string().trim().max(1000).nullable().optional()
    })
    .meta({ id: 'CreateProjectHandoverAttachmentDownloadPackageRequest' });

export type CreateProjectHandoverAttachmentDownloadPackageRequest = z.infer<typeof CreateProjectHandoverAttachmentDownloadPackageRequestSchema>;

export const AttachmentDownloadPackageSummarySchema = z
    .object({
        id: z.uuid(),
        handoverId: z.uuid(),
        projectId: z.uuid(),
        status: AttachmentDownloadPackageStatusSchema,
        manifestSummary: AttachmentDownloadPackageManifestSummarySchema,
        fileName: z.string().nullable(),
        expiresAt: z.iso.datetime(),
        createdBy: z.uuid().nullable(),
        createdAt: z.iso.datetime(),
        downloadedAt: z.iso.datetime().nullable(),
        downloadCount: z.number().int().nonnegative(),
        failedReason: z.string().nullable()
    })
    .meta({ id: 'AttachmentDownloadPackageSummary' });

export type AttachmentDownloadPackageSummary = z.infer<typeof AttachmentDownloadPackageSummarySchema>;

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export const ProjectSummarySchema = z
    .object({
        id: z.uuid(),
        projectNo: z.string(),
        projectName: z.string(),
        sourceLeadId: z.uuid().nullable(),
        customerId: z.uuid().nullable(),
        customerName: z.string().nullable(),
        customerProjectNo: z.string().nullable(),
        status: ProjectStatusSchema,
        currentStage: ProjectStageSchema,
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
        customerId: z.uuid().nullable(),
        customerName: z.string().nullable(),
        customerProjectNo: z.string().nullable(),
        currentStage: ProjectStageSchema,
        status: ProjectStatusSchema,
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
        currentStage: ProjectStageSchema,
        status: ProjectStatusSchema,
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
        customerId: z.uuid(),
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
        currentStage: ProjectStageSchema,
        status: ProjectStatusSchema,
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

export const TECHNICAL_FEASIBILITY_DECISION_DEFINITIONS = defineEnumDefinitions([
    { key: 'Feasible', value: 'feasible', label: '技术可行', order: 10 },
    { key: 'Conditional', value: 'conditional', label: '有条件可行', order: 20 },
    { key: 'NotFeasible', value: 'not-feasible', label: '暂不可行', order: 30 }
] as const);

export const TECHNICAL_FEASIBILITY_DECISIONS = enumDefinitionValues(TECHNICAL_FEASIBILITY_DECISION_DEFINITIONS);

export type TechnicalFeasibilityDecision = (typeof TECHNICAL_FEASIBILITY_DECISIONS)[number];

export const TechnicalFeasibilityDecisionLabel = enumDefinitionLabels(TECHNICAL_FEASIBILITY_DECISION_DEFINITIONS);

export const TECHNICAL_SCOPE_ITEM_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'InScope', value: 'in-scope', label: '范围内', order: 10 },
    { key: 'OutOfScope', value: 'out-of-scope', label: '排除项', order: 20 },
    { key: 'Assumption', value: 'assumption', label: '假设', order: 30 }
] as const);

export const TECHNICAL_SCOPE_ITEM_TYPES = enumDefinitionValues(TECHNICAL_SCOPE_ITEM_TYPE_DEFINITIONS);

export type TechnicalScopeItemType = (typeof TECHNICAL_SCOPE_ITEM_TYPES)[number];

export const TechnicalScopeItemTypeLabel = enumDefinitionLabels(TECHNICAL_SCOPE_ITEM_TYPE_DEFINITIONS);

export const PRESIGNING_RISK_LEVEL_DEFINITIONS = defineEnumDefinitions([
    { key: 'R1', value: 'R1', label: 'R1', order: 10 },
    { key: 'R2', value: 'R2', label: 'R2', order: 20 },
    { key: 'R3', value: 'R3', label: 'R3', order: 30 },
    { key: 'R4', value: 'R4', label: 'R4', order: 40 }
] as const);

export const PRESIGNING_RISK_LEVELS = enumDefinitionValues(PRESIGNING_RISK_LEVEL_DEFINITIONS);

export type PreSigningRiskLevel = (typeof PRESIGNING_RISK_LEVELS)[number];

export const PreSigningRiskLevelLabel = enumDefinitionLabels(PRESIGNING_RISK_LEVEL_DEFINITIONS);

export const PRESIGNING_RISK_STATUS_DEFINITIONS = defineEnumDefinitions([
    { key: 'Open', value: 'open', label: '打开', order: 10 },
    { key: 'Mitigating', value: 'mitigating', label: '缓解中', order: 20 },
    { key: 'Accepted', value: 'accepted', label: '已接受', order: 30 },
    { key: 'Closed', value: 'closed', label: '已关闭', order: 40 }
] as const);

export const PRESIGNING_RISK_STATUSES = enumDefinitionValues(PRESIGNING_RISK_STATUS_DEFINITIONS);

export type PreSigningRiskStatus = (typeof PRESIGNING_RISK_STATUSES)[number];

export const PreSigningRiskStatusLabel = enumDefinitionLabels(PRESIGNING_RISK_STATUS_DEFINITIONS);

export const COST_ESTIMATE_CONFIDENCE_LEVEL_DEFINITIONS = defineEnumDefinitions([
    { key: 'High', value: 'high', label: '高', order: 10 },
    { key: 'Medium', value: 'medium', label: '中', order: 20 },
    { key: 'Low', value: 'low', label: '低', order: 30 }
] as const);

export const COST_ESTIMATE_CONFIDENCE_LEVELS = enumDefinitionValues(COST_ESTIMATE_CONFIDENCE_LEVEL_DEFINITIONS);

export type CostEstimateConfidenceLevel = (typeof COST_ESTIMATE_CONFIDENCE_LEVELS)[number];

export const CostEstimateConfidenceLevelLabel = enumDefinitionLabels(COST_ESTIMATE_CONFIDENCE_LEVEL_DEFINITIONS);

export const TAX_REVIEW_STATUS_DEFINITIONS = defineEnumDefinitions([
    { key: 'Pending', value: 'pending', label: '待复核', order: 10 },
    { key: 'Reviewed', value: 'reviewed', label: '已复核', order: 20 },
    { key: 'NotRequired', value: 'not-required', label: '无需复核', order: 30 }
] as const);

export const TAX_REVIEW_STATUSES = enumDefinitionValues(TAX_REVIEW_STATUS_DEFINITIONS);

export type TaxReviewStatus = (typeof TAX_REVIEW_STATUSES)[number];

export const TaxReviewStatusLabel = enumDefinitionLabels(TAX_REVIEW_STATUS_DEFINITIONS);

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

export const ProjectTechnicalCostPackageListSchema = z.array(ProjectTechnicalCostPackageSummarySchema).meta({ id: 'ProjectTechnicalCostPackageList' });

export type ProjectTechnicalCostPackageList = z.infer<typeof ProjectTechnicalCostPackageListSchema>;

export const ProjectTechnicalCostWorkspaceViewSchema = z
    .object({
        projectId: z.uuid(),
        currentStage: ProjectStageSchema,
        status: ProjectStatusSchema,
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

export const BID_COMMERCIAL_MODE_DEFINITIONS = defineEnumDefinitions([
    { key: 'PublicTender', value: 'public-tender', label: '公开招标', order: 10 },
    { key: 'Invitation', value: 'invitation', label: '邀标', order: 20 },
    { key: 'Comparison', value: 'comparison', label: '比选', order: 30 },
    { key: 'CommercialNegotiation', value: 'commercial-negotiation', label: '商务谈判', order: 40 },
    { key: 'CompetitiveNegotiation', value: 'competitive-negotiation', label: '竞争性谈判', order: 50 },
    { key: 'DirectCommercial', value: 'direct-commercial', label: '直接商务', order: 60 },
    { key: 'NotRequired', value: 'not-required', label: '不适用', order: 70 }
] as const);

export const BID_COMMERCIAL_MODES = enumDefinitionValues(BID_COMMERCIAL_MODE_DEFINITIONS);

export type BidCommercialMode = (typeof BID_COMMERCIAL_MODES)[number];

export const BidCommercialModeLabel = enumDefinitionLabels(BID_COMMERCIAL_MODE_DEFINITIONS);

export const BID_COMMERCIAL_STAGE_DEFINITIONS = defineEnumDefinitions([
    { key: 'NotStarted', value: 'not-started', label: '未启动', order: 10 },
    { key: 'Preparation', value: 'preparation', label: '材料准备', order: 20 },
    { key: 'Submitted', value: 'submitted', label: '已提交', order: 30 },
    { key: 'Negotiating', value: 'negotiating', label: '谈判中', order: 40 },
    { key: 'ResultConfirmed', value: 'result-confirmed', label: '结果确认', order: 50 },
    { key: 'Closed', value: 'closed', label: '已关闭', order: 60 }
] as const);

export const BID_COMMERCIAL_STAGES = enumDefinitionValues(BID_COMMERCIAL_STAGE_DEFINITIONS);

export type BidCommercialStage = (typeof BID_COMMERCIAL_STAGES)[number];

export const BidCommercialStageLabel = enumDefinitionLabels(BID_COMMERCIAL_STAGE_DEFINITIONS);

export const BID_COMMERCIAL_DECISION_DEFINITIONS = defineEnumDefinitions([
    { key: 'Pending', value: 'pending', label: '待决策', order: 10 },
    { key: 'Participate', value: 'participate', label: '参与', order: 20 },
    { key: 'NoBid', value: 'no-bid', label: '不投标', order: 30 },
    { key: 'NotRequired', value: 'not-required', label: '不适用', order: 40 }
] as const);

export const BID_COMMERCIAL_DECISIONS = enumDefinitionValues(BID_COMMERCIAL_DECISION_DEFINITIONS);

export type BidCommercialDecision = (typeof BID_COMMERCIAL_DECISIONS)[number];

export const BidCommercialDecisionLabel = enumDefinitionLabels(BID_COMMERCIAL_DECISION_DEFINITIONS);

export const BID_COMMERCIAL_RESULT_STATUS_DEFINITIONS = defineEnumDefinitions([
    { key: 'Pending', value: 'pending', label: '待结果', order: 10 },
    { key: 'Won', value: 'won', label: '中标 / 成交', order: 20 },
    { key: 'Lost', value: 'lost', label: '未中标', order: 30 },
    { key: 'Cancelled', value: 'cancelled', label: '已取消', order: 40 },
    { key: 'NotApplicable', value: 'not-applicable', label: '不适用', order: 50 }
] as const);

export const BID_COMMERCIAL_RESULT_STATUSES = enumDefinitionValues(BID_COMMERCIAL_RESULT_STATUS_DEFINITIONS);

export type BidCommercialResultStatus = (typeof BID_COMMERCIAL_RESULT_STATUSES)[number];

export const BidCommercialResultStatusLabel = enumDefinitionLabels(BID_COMMERCIAL_RESULT_STATUS_DEFINITIONS);

export const BID_COMMERCIAL_MATERIAL_STATUS_DEFINITIONS = defineEnumDefinitions([
    { key: 'Missing', value: 'missing', label: '缺失', order: 10 },
    { key: 'InProgress', value: 'in-progress', label: '处理中', order: 20 },
    { key: 'Ready', value: 'ready', label: '已齐备', order: 30 },
    { key: 'NotRequired', value: 'not-required', label: '不适用', order: 40 }
] as const);

export const BID_COMMERCIAL_MATERIAL_STATUSES = enumDefinitionValues(BID_COMMERCIAL_MATERIAL_STATUS_DEFINITIONS);

export type BidCommercialMaterialStatus = (typeof BID_COMMERCIAL_MATERIAL_STATUSES)[number];

export const BidCommercialMaterialStatusLabel = enumDefinitionLabels(BID_COMMERCIAL_MATERIAL_STATUS_DEFINITIONS);

export const BID_COMMERCIAL_TIMELINE_STATUS_DEFINITIONS = defineEnumDefinitions([
    { key: 'Pending', value: 'pending', label: '待完成', order: 10 },
    { key: 'Done', value: 'done', label: '已完成', order: 20 },
    { key: 'Cancelled', value: 'cancelled', label: '已取消', order: 30 }
] as const);

export const BID_COMMERCIAL_TIMELINE_STATUSES = enumDefinitionValues(BID_COMMERCIAL_TIMELINE_STATUS_DEFINITIONS);

export type BidCommercialTimelineStatus = (typeof BID_COMMERCIAL_TIMELINE_STATUSES)[number];

export const BidCommercialTimelineStatusLabel = enumDefinitionLabels(BID_COMMERCIAL_TIMELINE_STATUS_DEFINITIONS);

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

export const ProjectBidCommercialProcessListSchema = z.array(ProjectBidCommercialProcessSummarySchema).meta({ id: 'ProjectBidCommercialProcessList' });

export type ProjectBidCommercialProcessList = z.infer<typeof ProjectBidCommercialProcessListSchema>;

export const ProjectBidCommercialWorkspaceViewSchema = z
    .object({
        projectId: z.uuid(),
        currentStage: ProjectStageSchema,
        status: ProjectStatusSchema,
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

export const PRICING_MARGIN_PATH_DEFINITIONS = defineEnumDefinitions([
    { key: 'Bid', value: 'bid', label: '竞标承接', order: 10 },
    { key: 'DirectCommercial', value: 'direct-commercial', label: '直接商务', order: 20 }
] as const);

export const PRICING_MARGIN_PATHS = enumDefinitionValues(PRICING_MARGIN_PATH_DEFINITIONS);

export type PricingMarginPath = (typeof PRICING_MARGIN_PATHS)[number];

export const PricingMarginPathLabel = enumDefinitionLabels(PRICING_MARGIN_PATH_DEFINITIONS);

export const PRICING_MARGIN_DECISION_DEFINITIONS = defineEnumDefinitions([
    { key: 'Pending', value: 'pending', label: '待评审', order: 10 },
    { key: 'Released', value: 'released', label: '已放行', order: 20 },
    { key: 'ConditionalRelease', value: 'conditional-release', label: '有条件放行', order: 30 },
    { key: 'Rejected', value: 'rejected', label: '已驳回', order: 40 },
    { key: 'EscalationRequired', value: 'escalation-required', label: '需升级', order: 50 }
] as const);

export const PRICING_MARGIN_DECISIONS = enumDefinitionValues(PRICING_MARGIN_DECISION_DEFINITIONS);

export type PricingMarginDecision = (typeof PRICING_MARGIN_DECISIONS)[number];

export const PricingMarginDecisionLabel = enumDefinitionLabels(PRICING_MARGIN_DECISION_DEFINITIONS);

export const GROSS_MARGIN_BAND_DEFINITIONS = defineEnumDefinitions([
    { key: 'BelowRedline', value: 'below-redline', label: '低于红线', order: 10 },
    { key: 'Watch', value: 'watch', label: '需关注', order: 20 },
    { key: 'Target', value: 'target', label: '达到目标', order: 30 },
    { key: 'NotCalculated', value: 'not-calculated', label: '未计算', order: 40 }
] as const);

export const GROSS_MARGIN_BANDS = enumDefinitionValues(GROSS_MARGIN_BAND_DEFINITIONS);

export type GrossMarginBand = (typeof GROSS_MARGIN_BANDS)[number];

export const GrossMarginBandLabel = enumDefinitionLabels(GROSS_MARGIN_BAND_DEFINITIONS);

export const PRICING_MARGIN_CONDITION_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'Financial', value: 'financial', label: '财务', order: 10 },
    { key: 'Tax', value: 'tax', label: '税务', order: 20 },
    { key: 'Payment', value: 'payment', label: '回款', order: 30 },
    { key: 'Scope', value: 'scope', label: '范围', order: 40 },
    { key: 'Risk', value: 'risk', label: '风险', order: 50 },
    { key: 'Approval', value: 'approval', label: '审批', order: 60 }
] as const);

export const PRICING_MARGIN_CONDITION_TYPES = enumDefinitionValues(PRICING_MARGIN_CONDITION_TYPE_DEFINITIONS);

export type PricingMarginConditionType = (typeof PRICING_MARGIN_CONDITION_TYPES)[number];

export const PricingMarginConditionTypeLabel = enumDefinitionLabels(PRICING_MARGIN_CONDITION_TYPE_DEFINITIONS);

export const PRICING_MARGIN_CONDITION_STATUS_DEFINITIONS = defineEnumDefinitions([
    { key: 'Open', value: 'open', label: '打开', order: 10 },
    { key: 'Closed', value: 'closed', label: '已关闭', order: 20 },
    { key: 'Waived', value: 'waived', label: '已豁免', order: 30 }
] as const);

export const PRICING_MARGIN_CONDITION_STATUSES = enumDefinitionValues(PRICING_MARGIN_CONDITION_STATUS_DEFINITIONS);

export type PricingMarginConditionStatus = (typeof PRICING_MARGIN_CONDITION_STATUSES)[number];

export const PricingMarginConditionStatusLabel = enumDefinitionLabels(PRICING_MARGIN_CONDITION_STATUS_DEFINITIONS);

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

export const ProjectPricingMarginReviewListSchema = z.array(ProjectPricingMarginReviewSummarySchema).meta({ id: 'ProjectPricingMarginReviewList' });

export type ProjectPricingMarginReviewList = z.infer<typeof ProjectPricingMarginReviewListSchema>;

export const ProjectPricingMarginWorkspaceViewSchema = z
    .object({
        projectId: z.uuid(),
        currentStage: ProjectStageSchema,
        status: ProjectStatusSchema,
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
        stage: ProjectStageSchema,
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
        customerId: z.uuid(),
        customerProjectNo: z.string().trim().min(1).max(128).nullable().optional(),
        currentStage: ProjectStageSchema.optional(),
        plannedSignAt: z.iso.datetime().nullable().optional()
    })
    .meta({ id: 'CreateProjectRequest' });

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const ProjectListQuerySchema = z
    .object({
        status: ProjectStatusSchema.optional(),
        currentStage: ProjectStageSchema.optional(),
        ownerOrgId: z.uuid().optional(),
        keyword: z.string().trim().min(1).max(128).optional()
    })
    .meta({ id: 'ProjectListQuery' });

export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;

export const UpdateProjectBasicInfoRequestSchema = z
    .object({
        projectName: z.string().trim().min(1).max(255).optional(),
        customerId: z.uuid().optional(),
        customerProjectNo: z.string().trim().min(1).max(128).nullable().optional(),
        plannedSignAt: z.iso.datetime().nullable().optional()
    })
    .refine((value) => value.projectName !== undefined || value.customerId !== undefined || value.customerProjectNo !== undefined || value.plannedSignAt !== undefined, {
        message: 'At least one field is required for update'
    })
    .meta({ id: 'UpdateProjectBasicInfoRequest' });

export type UpdateProjectBasicInfoRequest = z.infer<typeof UpdateProjectBasicInfoRequestSchema>;

export const ReassignProjectOwnerRequestSchema = z
    .object({
        ownerUserId: z.uuid(),
        ownerOrgId: z.uuid().nullable().optional(),
        reason: z.string().trim().min(1).max(1000),
        expectedVersion: z.number().int().positive().optional()
    })
    .meta({ id: 'ReassignProjectOwnerRequest' });

export type ReassignProjectOwnerRequest = z.infer<typeof ReassignProjectOwnerRequestSchema>;

export const ProjectOwnerReassignmentResultSchema = z
    .object({
        targetId: z.uuid(),
        projectOwnerReassignmentRecordId: z.uuid(),
        previousOwnerUserId: z.uuid().nullable(),
        previousOwnerOrgId: z.uuid().nullable(),
        newOwnerUserId: z.uuid(),
        newOwnerOrgId: z.uuid().nullable(),
        businessStatusAfter: ProjectStatusSchema
    })
    .meta({ id: 'ProjectOwnerReassignmentResult' });

export type ProjectOwnerReassignmentResult = z.infer<typeof ProjectOwnerReassignmentResultSchema>;

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export const CONTRACT_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Draft', value: 'draft', label: '草稿', severity: 'secondary', order: 10 },
    { key: 'PendingReview', value: 'pending-review', label: '待审核', severity: 'warn', order: 20 },
    { key: 'Active', value: 'active', label: '已生效', severity: 'success', order: 30 },
    { key: 'Terminated', value: 'terminated', label: '已终止', severity: 'danger', order: 40 },
    { key: 'Completed', value: 'completed', label: '已完成', severity: 'contrast', order: 50 }
] as const);

export const ContractStatusValue = enumDefinitionValueObject(CONTRACT_STATUS_DEFINITIONS);

export const CONTRACT_STATUSES = enumDefinitionValues(CONTRACT_STATUS_DEFINITIONS);

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const ContractStatusSchema = z.enum(CONTRACT_STATUSES).meta({ id: 'ContractStatus' });

export const ContractStatusLabel = enumDefinitionLabels(CONTRACT_STATUS_DEFINITIONS);

export const ContractStatusSeverity = enumDefinitionSeverities(CONTRACT_STATUS_DEFINITIONS);

export const ContractStatusOptions = enumDefinitionOptions(CONTRACT_STATUS_DEFINITIONS);

export const CONTRACT_TERM_SNAPSHOT_STATUSES = ['active', 'superseded', 'voided'] as const;

export type ContractTermSnapshotStatus = (typeof CONTRACT_TERM_SNAPSHOT_STATUSES)[number];

export const ContractTermSnapshotStatusSchema = z.enum(CONTRACT_TERM_SNAPSHOT_STATUSES).meta({ id: 'ContractTermSnapshotStatus' });

export const ContractTermSnapshotStatusValue = {
    Active: 'active',
    Superseded: 'superseded',
    Voided: 'voided'
} as const satisfies Record<string, ContractTermSnapshotStatus>;

export const ContractSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        projectName: z.string(),
        customerName: z.string().nullable(),
        contractNo: z.string(),
        customerContractNo: z.string().nullable(),
        status: ContractStatusSchema,
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
        amountTaxInclusiveProjection: SensitiveStringFieldProjectionSchema,
        amountTaxExclusiveProjection: SensitiveStringFieldProjectionSchema,
        taxRateProjection: SensitiveStringFieldProjectionSchema,
        downPaymentRateProjection: SensitiveStringFieldProjectionSchema,
        retentionRateProjection: SensitiveStringFieldProjectionSchema,
        paymentTermsProjection: SensitiveStringFieldProjectionSchema,
        sourceReadinessId: z.uuid().nullable(),
        sourceBaselineId: z.uuid().nullable(),
        version: z.number().int(),
        snapshotStatus: ContractTermSnapshotStatusSchema,
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
    .refine((value) => value.customerContractNo !== undefined || value.signedAmount !== undefined || value.currencyCode !== undefined || value.signedAt !== undefined || value.retentionDueDate !== undefined || value.updatedBy !== undefined, {
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

export const CommercialDiffLevelValue = {
    Prompt: 'prompt',
    ReviewRequired: 'review-required',
    ReapprovalRequired: 'reapproval-required'
} as const satisfies Record<string, CommercialDiffLevel>;

export const COMMERCIAL_DIFF_REVIEW_STATUSES = ['not-required', 'pending-review', 'approved', 'rejected'] as const;

export const CommercialDiffReviewStatusSchema = z.enum(COMMERCIAL_DIFF_REVIEW_STATUSES).meta({ id: 'CommercialDiffReviewStatus' });

export type CommercialDiffReviewStatus = z.infer<typeof CommercialDiffReviewStatusSchema>;

export const CommercialDiffReviewStatusValue = {
    NotRequired: 'not-required',
    PendingReview: 'pending-review',
    Approved: 'approved',
    Rejected: 'rejected'
} as const satisfies Record<string, CommercialDiffReviewStatus>;

export const COMMERCIAL_BASELINE_REVIEW_DECISIONS = ['approved', 'rejected'] as const;

export const CommercialBaselineReviewDecisionSchema = z.enum(COMMERCIAL_BASELINE_REVIEW_DECISIONS).meta({ id: 'CommercialBaselineReviewDecision' });

export type CommercialBaselineReviewDecision = z.infer<typeof CommercialBaselineReviewDecisionSchema>;

export const CommercialBaselineReviewDecisionValue = {
    Approved: 'approved',
    Rejected: 'rejected'
} as const satisfies Record<string, CommercialBaselineReviewDecision>;

export const COMMERCIAL_RELEASE_BASELINE_STATUSES = ['draft', 'effective', 'superseded'] as const;

export type CommercialReleaseBaselineStatus = (typeof COMMERCIAL_RELEASE_BASELINE_STATUSES)[number];

export const CommercialReleaseBaselineStatusSchema = z.enum(COMMERCIAL_RELEASE_BASELINE_STATUSES).meta({ id: 'CommercialReleaseBaselineStatus' });

export const CommercialReleaseBaselineStatusValue = {
    Draft: 'draft',
    Effective: 'effective',
    Superseded: 'superseded'
} as const satisfies Record<string, CommercialReleaseBaselineStatus>;

export const CONTRACT_READINESS_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Ready', value: 'ready', label: '已就绪', severity: 'success', order: 10 },
    { key: 'Conditional', value: 'conditional', label: '有条件就绪', severity: 'warn', order: 20 },
    { key: 'Blocked', value: 'blocked', label: '阻断中', severity: 'danger', order: 30 }
] as const);

export const ContractReadinessStatusValue = enumDefinitionValueObject(CONTRACT_READINESS_STATUS_DEFINITIONS);

export const CONTRACT_READINESS_STATUSES = enumDefinitionValues(CONTRACT_READINESS_STATUS_DEFINITIONS);

export const ContractReadinessStatusSchema = z.enum(CONTRACT_READINESS_STATUSES).meta({ id: 'ContractReadinessStatus' });

export type ContractReadinessStatus = z.infer<typeof ContractReadinessStatusSchema>;

export const ContractReadinessStatusLabel = enumDefinitionLabels(CONTRACT_READINESS_STATUS_DEFINITIONS);

export const ContractReadinessStatusSeverity = enumDefinitionSeverities(CONTRACT_READINESS_STATUS_DEFINITIONS);

export const CONTRACT_READINESS_GUARD_DECISION_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Allowed', value: 'allowed', label: '允许进入合同主链', severity: 'success', order: 10 },
    { key: 'ReviewRequired', value: 'review-required', label: '需要复核', severity: 'warn', order: 20 },
    { key: 'Blocked', value: 'blocked', label: '暂不可进入合同主链', severity: 'danger', order: 30 }
] as const);

export const ContractReadinessGuardDecisionValue = enumDefinitionValueObject(CONTRACT_READINESS_GUARD_DECISION_DEFINITIONS);

export const CONTRACT_READINESS_GUARD_DECISIONS = enumDefinitionValues(CONTRACT_READINESS_GUARD_DECISION_DEFINITIONS);

export const ContractReadinessGuardDecisionSchema = z.enum(CONTRACT_READINESS_GUARD_DECISIONS).meta({ id: 'ContractReadinessGuardDecision' });

export type ContractReadinessGuardDecision = z.infer<typeof ContractReadinessGuardDecisionSchema>;

export const ContractReadinessGuardDecisionLabel = enumDefinitionLabels(CONTRACT_READINESS_GUARD_DECISION_DEFINITIONS);

export const ContractReadinessGuardDecisionSeverity = enumDefinitionSeverities(CONTRACT_READINESS_GUARD_DECISION_DEFINITIONS);

export const CONTRACT_READINESS_ITEM_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'Checklist', value: 'checklist', label: '前置检查', order: 10 },
    { key: 'ReusableFact', value: 'reusable-fact', label: '可复用事实', order: 20 },
    { key: 'BlockingReason', value: 'blocking-reason', label: '阻断原因', order: 30 },
    { key: 'ReceivableSeed', value: 'receivable-seed', label: '回款种子', order: 40 }
] as const);

export const ContractReadinessItemTypeValue = enumDefinitionValueObject(CONTRACT_READINESS_ITEM_TYPE_DEFINITIONS);

export const CONTRACT_READINESS_ITEM_TYPES = enumDefinitionValues(CONTRACT_READINESS_ITEM_TYPE_DEFINITIONS);

export const ContractReadinessItemTypeSchema = z.enum(CONTRACT_READINESS_ITEM_TYPES).meta({ id: 'ContractReadinessItemType' });

export type ContractReadinessItemType = z.infer<typeof ContractReadinessItemTypeSchema>;

export const ContractReadinessItemTypeLabel = enumDefinitionLabels(CONTRACT_READINESS_ITEM_TYPE_DEFINITIONS);

export const CONTRACT_READINESS_ITEM_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Ready', value: 'ready', label: '已具备', severity: 'success', order: 10 },
    { key: 'Conditional', value: 'conditional', label: '有条件', severity: 'warn', order: 20 },
    { key: 'Blocked', value: 'blocked', label: '阻断', severity: 'danger', order: 30 },
    { key: 'NotApplicable', value: 'not-applicable', label: '不适用', severity: 'secondary', order: 40 }
] as const);

export const ContractReadinessItemStatusValue = enumDefinitionValueObject(CONTRACT_READINESS_ITEM_STATUS_DEFINITIONS);

export const CONTRACT_READINESS_ITEM_STATUSES = enumDefinitionValues(CONTRACT_READINESS_ITEM_STATUS_DEFINITIONS);

export const ContractReadinessItemStatusSchema = z.enum(CONTRACT_READINESS_ITEM_STATUSES).meta({ id: 'ContractReadinessItemStatus' });

export type ContractReadinessItemStatus = z.infer<typeof ContractReadinessItemStatusSchema>;

export const ContractReadinessItemStatusLabel = enumDefinitionLabels(CONTRACT_READINESS_ITEM_STATUS_DEFINITIONS);

export const ContractReadinessItemStatusSeverity = enumDefinitionSeverities(CONTRACT_READINESS_ITEM_STATUS_DEFINITIONS);

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

export const CommercialBaselineReviewHistorySchema = z.array(CommercialBaselineReviewRecordSummarySchema).meta({ id: 'CommercialBaselineReviewHistory' });

export type CommercialBaselineReviewHistory = z.infer<typeof CommercialBaselineReviewHistorySchema>;

export const CommercialReleaseBaselineSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        baselineCode: z.string(),
        quotationReviewId: z.uuid().nullable(),
        baselineStatus: CommercialReleaseBaselineStatusSchema,
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
        totalSignedAmountProjection: SensitiveStringFieldProjectionSchema,
        currencyCodes: z.array(z.string()),
        earliestSignedAt: z.iso.datetime().nullable(),
        latestSignedAt: z.iso.datetime().nullable(),
        contracts: z.array(ContractHandoverContractItemSummarySchema)
    })
    .meta({ id: 'ContractHandoverEffectiveContractSetSummary' });

export type ContractHandoverEffectiveContractSetSummary = z.infer<typeof ContractHandoverEffectiveContractSetSummarySchema>;

export const CONTRACT_HANDOVER_BASELINE_VALIDATION_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Ready', value: 'ready', label: '已具备', severity: 'success', order: 10 },
    { key: 'Blocked', value: 'blocked', label: '阻断中', severity: 'danger', order: 20 },
    { key: 'Missing', value: 'missing', label: '缺失', severity: 'danger', order: 30 }
] as const);

export const ContractHandoverBaselineValidationStatusValue = enumDefinitionValueObject(CONTRACT_HANDOVER_BASELINE_VALIDATION_STATUS_DEFINITIONS);

export const CONTRACT_HANDOVER_BASELINE_VALIDATION_STATUSES = enumDefinitionValues(CONTRACT_HANDOVER_BASELINE_VALIDATION_STATUS_DEFINITIONS);

export type ContractHandoverBaselineValidationStatus = (typeof CONTRACT_HANDOVER_BASELINE_VALIDATION_STATUSES)[number];

export const ContractHandoverBaselineValidationStatusSchema = z.enum(CONTRACT_HANDOVER_BASELINE_VALIDATION_STATUSES).meta({ id: 'ContractHandoverBaselineValidationStatus' });

export const ContractHandoverBaselineValidationStatusLabel = enumDefinitionLabels(CONTRACT_HANDOVER_BASELINE_VALIDATION_STATUS_DEFINITIONS);

export const ContractHandoverBaselineValidationStatusSeverity = enumDefinitionSeverities(CONTRACT_HANDOVER_BASELINE_VALIDATION_STATUS_DEFINITIONS);

export const CONTRACT_HANDOVER_CURRENT_BASELINE_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Available', value: 'available', label: '已形成', severity: 'success', order: 10 },
    { key: 'Missing', value: 'missing', label: '缺失', severity: 'danger', order: 20 }
] as const);

export const ContractHandoverCurrentBaselineStatusValue = enumDefinitionValueObject(CONTRACT_HANDOVER_CURRENT_BASELINE_STATUS_DEFINITIONS);

export const CONTRACT_HANDOVER_CURRENT_BASELINE_STATUSES = enumDefinitionValues(CONTRACT_HANDOVER_CURRENT_BASELINE_STATUS_DEFINITIONS);

export type ContractHandoverCurrentBaselineStatus = (typeof CONTRACT_HANDOVER_CURRENT_BASELINE_STATUSES)[number];

export const ContractHandoverCurrentBaselineStatusSchema = z.enum(CONTRACT_HANDOVER_CURRENT_BASELINE_STATUSES).meta({ id: 'ContractHandoverCurrentBaselineStatus' });

export const ContractHandoverCurrentBaselineStatusLabel = enumDefinitionLabels(CONTRACT_HANDOVER_CURRENT_BASELINE_STATUS_DEFINITIONS);

export const ContractHandoverCurrentBaselineStatusSeverity = enumDefinitionSeverities(CONTRACT_HANDOVER_CURRENT_BASELINE_STATUS_DEFINITIONS);

export const CONTRACT_HANDOVER_CURRENT_BASELINE_SOURCE_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'ContractReadiness', value: 'contract-readiness', label: '合同准备包', order: 10 },
    { key: 'ProjectHandover', value: 'project-handover', label: '项目移交', order: 20 },
    { key: 'HandoverRebaseline', value: 'handover-rebaseline', label: '移交再基线化', order: 30 },
    { key: 'None', value: 'none', label: '无来源', order: 40 }
] as const);

export const ContractHandoverCurrentBaselineSourceTypeValue = enumDefinitionValueObject(CONTRACT_HANDOVER_CURRENT_BASELINE_SOURCE_TYPE_DEFINITIONS);

export const CONTRACT_HANDOVER_CURRENT_BASELINE_SOURCE_TYPES = enumDefinitionValues(CONTRACT_HANDOVER_CURRENT_BASELINE_SOURCE_TYPE_DEFINITIONS);

export type ContractHandoverCurrentBaselineSourceType = (typeof CONTRACT_HANDOVER_CURRENT_BASELINE_SOURCE_TYPES)[number];

export const ContractHandoverCurrentBaselineSourceTypeSchema = z.enum(CONTRACT_HANDOVER_CURRENT_BASELINE_SOURCE_TYPES).meta({ id: 'ContractHandoverCurrentBaselineSourceType' });

export const ContractHandoverCurrentBaselineSourceTypeLabel = enumDefinitionLabels(CONTRACT_HANDOVER_CURRENT_BASELINE_SOURCE_TYPE_DEFINITIONS);

export const CONTRACT_HANDOVER_REBASELINE_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'None', value: 'none', label: '未发起', severity: 'success', order: 10 },
    { key: 'Processing', value: 'processing', label: '处理中', severity: 'warn', order: 20 },
    { key: 'PendingEffective', value: 'pending-effective', label: '待切换生效', severity: 'warn', order: 30 },
    { key: 'Effective', value: 'effective', label: '已生效', severity: 'success', order: 40 },
    { key: 'Superseded', value: 'superseded', label: '已被替代', severity: 'secondary', order: 50 },
    { key: 'Voided', value: 'voided', label: '已作废', severity: 'danger', order: 60 }
] as const);

export const ContractHandoverRebaselineStatusValue = enumDefinitionValueObject(CONTRACT_HANDOVER_REBASELINE_STATUS_DEFINITIONS);

export const CONTRACT_HANDOVER_REBASELINE_STATUSES = enumDefinitionValues(CONTRACT_HANDOVER_REBASELINE_STATUS_DEFINITIONS);

export type ContractHandoverRebaselineStatus = (typeof CONTRACT_HANDOVER_REBASELINE_STATUSES)[number];

export const ContractHandoverRebaselineStatusSchema = z.enum(CONTRACT_HANDOVER_REBASELINE_STATUSES).meta({ id: 'ContractHandoverRebaselineStatus' });

export const ContractHandoverRebaselineStatusLabel = enumDefinitionLabels(CONTRACT_HANDOVER_REBASELINE_STATUS_DEFINITIONS);

export const ContractHandoverRebaselineStatusSeverity = enumDefinitionSeverities(CONTRACT_HANDOVER_REBASELINE_STATUS_DEFINITIONS);

export const CONTRACT_HANDOVER_REBASELINE_BLOCKING_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'None', value: 'none', label: '无阻断', severity: 'secondary', order: 10 },
    { key: 'Blocking', value: 'blocking', label: '阻断中', severity: 'danger', order: 20 },
    { key: 'Effective', value: 'effective', label: '已生效', severity: 'success', order: 30 }
] as const);

export const ContractHandoverRebaselineBlockingStatusValue = enumDefinitionValueObject(CONTRACT_HANDOVER_REBASELINE_BLOCKING_STATUS_DEFINITIONS);

export const CONTRACT_HANDOVER_REBASELINE_BLOCKING_STATUSES = enumDefinitionValues(CONTRACT_HANDOVER_REBASELINE_BLOCKING_STATUS_DEFINITIONS);

export type ContractHandoverRebaselineBlockingStatus = (typeof CONTRACT_HANDOVER_REBASELINE_BLOCKING_STATUSES)[number];

export const ContractHandoverRebaselineBlockingStatusSchema = z.enum(CONTRACT_HANDOVER_REBASELINE_BLOCKING_STATUSES).meta({ id: 'ContractHandoverRebaselineBlockingStatus' });

export const ContractHandoverRebaselineBlockingStatusLabel = enumDefinitionLabels(CONTRACT_HANDOVER_REBASELINE_BLOCKING_STATUS_DEFINITIONS);

export const ContractHandoverRebaselineBlockingStatusSeverity = enumDefinitionSeverities(CONTRACT_HANDOVER_REBASELINE_BLOCKING_STATUS_DEFINITIONS);

export const CONTRACT_HANDOVER_RECEIVABLE_PLAN_INIT_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Initialized', value: 'initialized', label: '已初始化', severity: 'success', order: 10 },
    { key: 'Missing', value: 'missing', label: '缺失', severity: 'danger', order: 20 },
    { key: 'Blocked', value: 'blocked', label: '阻断中', severity: 'danger', order: 30 }
] as const);

export const ContractHandoverReceivablePlanInitStatusValue = enumDefinitionValueObject(CONTRACT_HANDOVER_RECEIVABLE_PLAN_INIT_STATUS_DEFINITIONS);

export const CONTRACT_HANDOVER_RECEIVABLE_PLAN_INIT_STATUSES = enumDefinitionValues(CONTRACT_HANDOVER_RECEIVABLE_PLAN_INIT_STATUS_DEFINITIONS);

export type ContractHandoverReceivablePlanInitStatus = (typeof CONTRACT_HANDOVER_RECEIVABLE_PLAN_INIT_STATUSES)[number];

export const ContractHandoverReceivablePlanInitStatusSchema = z.enum(CONTRACT_HANDOVER_RECEIVABLE_PLAN_INIT_STATUSES).meta({ id: 'ContractHandoverReceivablePlanInitStatus' });

export const ContractHandoverReceivablePlanInitStatusLabel = enumDefinitionLabels(CONTRACT_HANDOVER_RECEIVABLE_PLAN_INIT_STATUS_DEFINITIONS);

export const ContractHandoverReceivablePlanInitStatusSeverity = enumDefinitionSeverities(CONTRACT_HANDOVER_RECEIVABLE_PLAN_INIT_STATUS_DEFINITIONS);

export const ContractHandoverBaselineValidationSummarySchema = z
    .object({
        status: ContractHandoverBaselineValidationStatusSchema,
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
        status: ContractHandoverCurrentBaselineStatusSchema,
        baselineSnapshotId: z.uuid().nullable(),
        sourceType: ContractHandoverCurrentBaselineSourceTypeSchema,
        sourceId: z.uuid().nullable(),
        summary: z.string()
    })
    .meta({ id: 'ContractHandoverCurrentBaselineSummary' });

export type ContractHandoverCurrentBaselineSummary = z.infer<typeof ContractHandoverCurrentBaselineSummarySchema>;

export const ContractHandoverLatestRebaselineSummarySchema = z
    .object({
        status: ContractHandoverRebaselineStatusSchema,
        rebaselineRecordId: z.uuid().nullable(),
        effectiveBaselineAfterId: z.uuid().nullable(),
        handledAt: z.iso.datetime().nullable(),
        blockingStatus: ContractHandoverRebaselineBlockingStatusSchema,
        impactItemCount: z.number().int().nonnegative(),
        impactSummary: z.string().nullable()
    })
    .meta({ id: 'ContractHandoverLatestRebaselineSummary' });

export type ContractHandoverLatestRebaselineSummary = z.infer<typeof ContractHandoverLatestRebaselineSummarySchema>;

export const ContractHandoverReceivablePlanInitSummarySchema = z
    .object({
        status: ContractHandoverReceivablePlanInitStatusSchema,
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

export const PROJECT_HANDOVER_PARTICIPANT_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Pending', value: 'pending', label: '待确认', severity: 'warn', order: 10 },
    { key: 'Confirmed', value: 'confirmed', label: '已确认', severity: 'success', order: 20 },
    { key: 'Closed', value: 'closed', label: '已关闭', severity: 'secondary', order: 30 }
] as const);

export const ProjectHandoverParticipantStatusValue = enumDefinitionValueObject(PROJECT_HANDOVER_PARTICIPANT_STATUS_DEFINITIONS);

export const PROJECT_HANDOVER_PARTICIPANT_STATUSES = enumDefinitionValues(PROJECT_HANDOVER_PARTICIPANT_STATUS_DEFINITIONS);

export type ProjectHandoverParticipantStatus = (typeof PROJECT_HANDOVER_PARTICIPANT_STATUSES)[number];

export const ProjectHandoverParticipantStatusSchema = z.enum(PROJECT_HANDOVER_PARTICIPANT_STATUSES).meta({ id: 'ProjectHandoverParticipantStatus' });

export const ProjectHandoverParticipantStatusLabel = enumDefinitionLabels(PROJECT_HANDOVER_PARTICIPANT_STATUS_DEFINITIONS);

export const ProjectHandoverParticipantStatusSeverity = enumDefinitionSeverities(PROJECT_HANDOVER_PARTICIPANT_STATUS_DEFINITIONS);

export const PROJECT_HANDOVER_PARTICIPANT_CONFIRMATION_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'NotStarted', value: 'not-started', label: '未开始', severity: 'warn', order: 10 },
    { key: 'Pending', value: 'pending', label: '待确认', severity: 'warn', order: 20 },
    { key: 'Confirmed', value: 'confirmed', label: '已确认', severity: 'success', order: 30 },
    { key: 'Closed', value: 'closed', label: '已关闭', severity: 'secondary', order: 40 }
] as const);

export const ProjectHandoverParticipantConfirmationStatusValue = enumDefinitionValueObject(PROJECT_HANDOVER_PARTICIPANT_CONFIRMATION_STATUS_DEFINITIONS);

export const PROJECT_HANDOVER_PARTICIPANT_CONFIRMATION_STATUSES = enumDefinitionValues(PROJECT_HANDOVER_PARTICIPANT_CONFIRMATION_STATUS_DEFINITIONS);

export type ProjectHandoverParticipantConfirmationStatus = (typeof PROJECT_HANDOVER_PARTICIPANT_CONFIRMATION_STATUSES)[number];

export const ProjectHandoverParticipantConfirmationStatusSchema = z.enum(PROJECT_HANDOVER_PARTICIPANT_CONFIRMATION_STATUSES).meta({ id: 'ProjectHandoverParticipantConfirmationStatus' });

export const ProjectHandoverParticipantConfirmationStatusLabel = enumDefinitionLabels(PROJECT_HANDOVER_PARTICIPANT_CONFIRMATION_STATUS_DEFINITIONS);

export const ProjectHandoverParticipantConfirmationStatusSeverity = enumDefinitionSeverities(PROJECT_HANDOVER_PARTICIPANT_CONFIRMATION_STATUS_DEFINITIONS);

export const PROJECT_HANDOVER_RECEIPT_JUDGMENT_FREEZE_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'NotFrozen', value: 'not-frozen', label: '未冻结', severity: 'warn', order: 10 },
    { key: 'Frozen', value: 'frozen', label: '已冻结', severity: 'success', order: 20 }
] as const);

export const ProjectHandoverReceiptJudgmentFreezeStatusValue = enumDefinitionValueObject(PROJECT_HANDOVER_RECEIPT_JUDGMENT_FREEZE_STATUS_DEFINITIONS);

export const PROJECT_HANDOVER_RECEIPT_JUDGMENT_FREEZE_STATUSES = enumDefinitionValues(PROJECT_HANDOVER_RECEIPT_JUDGMENT_FREEZE_STATUS_DEFINITIONS);

export type ProjectHandoverReceiptJudgmentFreezeStatus = (typeof PROJECT_HANDOVER_RECEIPT_JUDGMENT_FREEZE_STATUSES)[number];

export const ProjectHandoverReceiptJudgmentFreezeStatusSchema = z.enum(PROJECT_HANDOVER_RECEIPT_JUDGMENT_FREEZE_STATUSES).meta({ id: 'ProjectHandoverReceiptJudgmentFreezeStatus' });

export const ProjectHandoverReceiptJudgmentFreezeStatusLabel = enumDefinitionLabels(PROJECT_HANDOVER_RECEIPT_JUDGMENT_FREEZE_STATUS_DEFINITIONS);

export const ProjectHandoverReceiptJudgmentFreezeStatusSeverity = enumDefinitionSeverities(PROJECT_HANDOVER_RECEIPT_JUDGMENT_FREEZE_STATUS_DEFINITIONS);

export const PROJECT_HANDOVER_RECEIPT_JUDGMENT_SOURCE_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'ProjectHandover', value: 'project-handover', label: '项目移交', order: 10 },
    { key: 'ProjectReceiptJudgmentFreeze', value: 'project-receipt-judgment-freeze', label: '回款判断冻结', order: 20 },
    { key: 'None', value: 'none', label: '无来源', order: 30 }
] as const);

export const ProjectHandoverReceiptJudgmentSourceTypeValue = enumDefinitionValueObject(PROJECT_HANDOVER_RECEIPT_JUDGMENT_SOURCE_TYPE_DEFINITIONS);

export const PROJECT_HANDOVER_RECEIPT_JUDGMENT_SOURCE_TYPES = enumDefinitionValues(PROJECT_HANDOVER_RECEIPT_JUDGMENT_SOURCE_TYPE_DEFINITIONS);

export type ProjectHandoverReceiptJudgmentSourceType = (typeof PROJECT_HANDOVER_RECEIPT_JUDGMENT_SOURCE_TYPES)[number];

export const ProjectHandoverReceiptJudgmentSourceTypeSchema = z.enum(PROJECT_HANDOVER_RECEIPT_JUDGMENT_SOURCE_TYPES).meta({ id: 'ProjectHandoverReceiptJudgmentSourceType' });

export const ProjectHandoverReceiptJudgmentSourceTypeLabel = enumDefinitionLabels(PROJECT_HANDOVER_RECEIPT_JUDGMENT_SOURCE_TYPE_DEFINITIONS);

export const PROJECT_HANDOVER_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'NotStarted', value: 'not-started', label: '未开始', severity: 'warn', order: 10 },
    { key: 'Draft', value: 'draft', label: '草稿', severity: 'warn', order: 20 },
    { key: 'Confirmed', value: 'confirmed', label: '已确认', severity: 'success', order: 30 },
    { key: 'Superseded', value: 'superseded', label: '已被替代', severity: 'secondary', order: 40 },
    { key: 'Voided', value: 'voided', label: '已作废', severity: 'danger', order: 50 }
] as const);

export const ProjectHandoverStatusValue = enumDefinitionValueObject(PROJECT_HANDOVER_STATUS_DEFINITIONS);

export const PROJECT_HANDOVER_STATUSES = enumDefinitionValues(PROJECT_HANDOVER_STATUS_DEFINITIONS);

export type ProjectHandoverStatus = (typeof PROJECT_HANDOVER_STATUSES)[number];

export const ProjectHandoverStatusSchema = z.enum(PROJECT_HANDOVER_STATUSES).meta({ id: 'ProjectHandoverStatus' });

export const ProjectHandoverStatusLabel = enumDefinitionLabels(PROJECT_HANDOVER_STATUS_DEFINITIONS);

export const ProjectHandoverStatusSeverity = enumDefinitionSeverities(PROJECT_HANDOVER_STATUS_DEFINITIONS);

export const ProjectHandoverParticipantConfirmationItemSchema = z
    .object({
        participantId: z.uuid(),
        participantRoleKey: z.string(),
        participantDisplayName: z.string().nullable(),
        participantStatus: ProjectHandoverParticipantStatusSchema,
        confirmedAt: z.iso.datetime().nullable(),
        confirmedComment: z.string().nullable()
    })
    .meta({ id: 'ProjectHandoverParticipantConfirmationItem' });

export type ProjectHandoverParticipantConfirmationItem = z.infer<typeof ProjectHandoverParticipantConfirmationItemSchema>;

export const ProjectHandoverParticipantConfirmationSummarySchema = z
    .object({
        status: ProjectHandoverParticipantConfirmationStatusSchema,
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
        status: ProjectHandoverReceiptJudgmentFreezeStatusSchema,
        receiptJudgmentMode: z.string().nullable(),
        sourceType: ProjectHandoverReceiptJudgmentSourceTypeSchema,
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
        handoverStatus: ProjectHandoverStatusSchema,
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

export type ConfirmProjectHandoverParticipantConfirmationInput = z.infer<typeof ConfirmProjectHandoverParticipantConfirmationInputSchema>;

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

export const RECEIPT_RECORD_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Draft', value: 'draft', label: '草稿', severity: 'secondary', order: 10 },
    { key: 'PendingConfirmation', value: 'pending-confirmation', label: '待确认', severity: 'warn', order: 20 },
    { key: 'Confirmed', value: 'confirmed', label: '已确认', severity: 'success', order: 30 },
    { key: 'Reversed', value: 'reversed', label: '已冲销', severity: 'danger', order: 40 },
    { key: 'Voided', value: 'voided', label: '已作废', severity: 'contrast', order: 50 }
] as const);

export const ReceiptRecordStatusValue = enumDefinitionValueObject(RECEIPT_RECORD_STATUS_DEFINITIONS);
export const RECEIPT_RECORD_STATUSES = enumDefinitionValues(RECEIPT_RECORD_STATUS_DEFINITIONS);
export type ReceiptRecordStatus = (typeof RECEIPT_RECORD_STATUSES)[number];
export const ReceiptRecordStatusSchema = z.enum(RECEIPT_RECORD_STATUSES).meta({ id: 'ReceiptRecordStatus' });
export const ReceiptRecordStatusLabel = enumDefinitionLabels(RECEIPT_RECORD_STATUS_DEFINITIONS);
export const ReceiptRecordStatusSeverity = enumDefinitionSeverities(RECEIPT_RECORD_STATUS_DEFINITIONS);
export const ReceiptRecordStatusOptions = enumDefinitionOptions(RECEIPT_RECORD_STATUS_DEFINITIONS);

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

export const ReceiptRecordListSchema = z.array(ReceiptRecordSummarySchema).meta({ id: 'ReceiptRecordList' });

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

export const PAYABLE_RECORD_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Draft', value: 'draft', label: '草稿', severity: 'secondary', order: 10 },
    { key: 'Recorded', value: 'recorded', label: '已记录', severity: 'info', order: 20 },
    { key: 'PartiallyPaid', value: 'partially-paid', label: '部分支付', severity: 'warn', order: 30 },
    { key: 'Completed', value: 'completed', label: '已完成', severity: 'success', order: 40 },
    { key: 'Closed', value: 'closed', label: '已关闭', severity: 'contrast', order: 50 },
    { key: 'Voided', value: 'voided', label: '已作废', severity: 'danger', order: 60 }
] as const);

export const PayableRecordStatusValue = enumDefinitionValueObject(PAYABLE_RECORD_STATUS_DEFINITIONS);
export const PAYABLE_RECORD_STATUSES = enumDefinitionValues(PAYABLE_RECORD_STATUS_DEFINITIONS);
export type PayableRecordStatus = (typeof PAYABLE_RECORD_STATUSES)[number];
export const PayableRecordStatusSchema = z.enum(PAYABLE_RECORD_STATUSES).meta({ id: 'PayableRecordStatus' });
export const PayableRecordStatusLabel = enumDefinitionLabels(PAYABLE_RECORD_STATUS_DEFINITIONS);
export const PayableRecordStatusSeverity = enumDefinitionSeverities(PAYABLE_RECORD_STATUS_DEFINITIONS);
export const PayableRecordStatusOptions = enumDefinitionOptions(PAYABLE_RECORD_STATUS_DEFINITIONS);

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

export const PayableRecordListSchema = z.array(PayableRecordSummarySchema).meta({ id: 'PayableRecordList' });

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

export const PAYMENT_RECORD_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Draft', value: 'draft', label: '草稿', severity: 'secondary', order: 10 },
    { key: 'Recorded', value: 'recorded', label: '已记录', severity: 'info', order: 20 },
    { key: 'Confirmed', value: 'confirmed', label: '已确认', severity: 'success', order: 30 },
    { key: 'Voided', value: 'voided', label: '已作废', severity: 'danger', order: 40 }
] as const);

export const PaymentRecordStatusValue = enumDefinitionValueObject(PAYMENT_RECORD_STATUS_DEFINITIONS);
export const PAYMENT_RECORD_STATUSES = enumDefinitionValues(PAYMENT_RECORD_STATUS_DEFINITIONS);
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];
export const PaymentRecordStatusSchema = z.enum(PAYMENT_RECORD_STATUSES).meta({ id: 'PaymentRecordStatus' });
export const PaymentRecordStatusLabel = enumDefinitionLabels(PAYMENT_RECORD_STATUS_DEFINITIONS);
export const PaymentRecordStatusSeverity = enumDefinitionSeverities(PAYMENT_RECORD_STATUS_DEFINITIONS);
export const PaymentRecordStatusOptions = enumDefinitionOptions(PAYMENT_RECORD_STATUS_DEFINITIONS);

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

export const PaymentRecordListSchema = z.array(PaymentRecordSummarySchema).meta({ id: 'PaymentRecordList' });

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

export const INVOICE_RECORD_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'Input', value: 'input', label: '进项发票', order: 10 },
    { key: 'Output', value: 'output', label: '销项发票', order: 20 }
] as const);

export const InvoiceRecordTypeValue = enumDefinitionValueObject(INVOICE_RECORD_TYPE_DEFINITIONS);
export const INVOICE_RECORD_TYPES = enumDefinitionValues(INVOICE_RECORD_TYPE_DEFINITIONS);
export type InvoiceRecordType = (typeof INVOICE_RECORD_TYPES)[number];
export const InvoiceRecordTypeSchema = z.enum(INVOICE_RECORD_TYPES).meta({ id: 'InvoiceRecordType' });
export const InvoiceRecordTypeLabel = enumDefinitionLabels(INVOICE_RECORD_TYPE_DEFINITIONS);
export const InvoiceRecordTypeOptions = enumDefinitionOptions(INVOICE_RECORD_TYPE_DEFINITIONS);

export const INVOICE_RECORD_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Draft', value: 'draft', label: '草稿', severity: 'secondary', order: 10 },
    { key: 'PendingIssue', value: 'pending-issue', label: '待开具', severity: 'warn', order: 20 },
    { key: 'Issued', value: 'issued', label: '已开具', severity: 'info', order: 30 },
    { key: 'Received', value: 'received', label: '已接收', severity: 'info', order: 40 },
    { key: 'Verified', value: 'verified', label: '已认证', severity: 'success', order: 50 },
    { key: 'Exception', value: 'exception', label: '异常', severity: 'danger', order: 60 },
    { key: 'Closed', value: 'closed', label: '已关闭', severity: 'contrast', order: 70 }
] as const);

export const InvoiceRecordStatusValue = enumDefinitionValueObject(INVOICE_RECORD_STATUS_DEFINITIONS);
export const INVOICE_RECORD_STATUSES = enumDefinitionValues(INVOICE_RECORD_STATUS_DEFINITIONS);
export type InvoiceRecordStatus = (typeof INVOICE_RECORD_STATUSES)[number];
export const InvoiceRecordStatusSchema = z.enum(INVOICE_RECORD_STATUSES).meta({ id: 'InvoiceRecordStatus' });
export const InvoiceRecordStatusLabel = enumDefinitionLabels(INVOICE_RECORD_STATUS_DEFINITIONS);
export const InvoiceRecordStatusSeverity = enumDefinitionSeverities(INVOICE_RECORD_STATUS_DEFINITIONS);
export const InvoiceRecordStatusOptions = enumDefinitionOptions(INVOICE_RECORD_STATUS_DEFINITIONS);

export const INVOICE_RECORD_EXCEPTION_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'None', value: 'none', label: '无异常', severity: 'success', order: 10 },
    { key: 'Open', value: 'open', label: '异常处理中', severity: 'danger', order: 20 },
    { key: 'Resolved', value: 'resolved', label: '异常已解决', severity: 'success', order: 30 }
] as const);

export const InvoiceRecordExceptionStatusValue = enumDefinitionValueObject(INVOICE_RECORD_EXCEPTION_STATUS_DEFINITIONS);
export const INVOICE_RECORD_EXCEPTION_STATUSES = enumDefinitionValues(INVOICE_RECORD_EXCEPTION_STATUS_DEFINITIONS);
export type InvoiceRecordExceptionStatus = (typeof INVOICE_RECORD_EXCEPTION_STATUSES)[number];
export const InvoiceRecordExceptionStatusSchema = z.enum(INVOICE_RECORD_EXCEPTION_STATUSES).meta({ id: 'InvoiceRecordExceptionStatus' });
export const InvoiceRecordExceptionStatusLabel = enumDefinitionLabels(INVOICE_RECORD_EXCEPTION_STATUS_DEFINITIONS);
export const InvoiceRecordExceptionStatusSeverity = enumDefinitionSeverities(INVOICE_RECORD_EXCEPTION_STATUS_DEFINITIONS);
export const InvoiceRecordExceptionStatusOptions = enumDefinitionOptions(INVOICE_RECORD_EXCEPTION_STATUS_DEFINITIONS);

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

export const InvoiceRecordListSchema = z.array(InvoiceRecordSummarySchema).meta({ id: 'InvoiceRecordList' });

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

export const INVOICE_RECORD_PATCHABLE_STATUSES = [InvoiceRecordStatusValue.Draft, InvoiceRecordStatusValue.PendingIssue, InvoiceRecordStatusValue.Issued, InvoiceRecordStatusValue.Received, InvoiceRecordStatusValue.Verified] as const;

export type InvoiceRecordPatchableStatus = (typeof INVOICE_RECORD_PATCHABLE_STATUSES)[number];

export const InvoiceRecordPatchableStatusSchema = z.enum(INVOICE_RECORD_PATCHABLE_STATUSES).meta({ id: 'InvoiceRecordPatchableStatus' });

export const UpdateInvoiceRecordRequestSchema = z
    .object({
        contractId: z.uuid().nullable().optional(),
        invoiceNumber: z.string().trim().min(1).max(128).optional(),
        invoiceAmount: z.string().trim().min(1).max(64).optional(),
        invoiceDate: z.iso.date().optional(),
        status: InvoiceRecordPatchableStatusSchema.optional(),
        expectedVersion: z.number().int().positive().optional()
    })
    .refine((value) => value.contractId !== undefined || value.invoiceNumber !== undefined || value.invoiceAmount !== undefined || value.invoiceDate !== undefined || value.status !== undefined, {
        message: 'At least one updatable field is required'
    })
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

export type ExpenseCategory = DictionaryCode;

export const ExpenseCategorySchema = DictionaryCodeSchema.meta({ id: 'ExpenseCategory' });

export const EXPENSE_SOURCE_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'Manual', value: 'manual', label: '手工录入', order: 10 },
    { key: 'Reimbursement', value: 'reimbursement', label: '报销同步', order: 20 },
    { key: 'Import', value: 'import', label: '批量导入', order: 30 }
] as const);

export const ExpenseSourceTypeValue = enumDefinitionValueObject(EXPENSE_SOURCE_TYPE_DEFINITIONS);
export const EXPENSE_SOURCE_TYPES = enumDefinitionValues(EXPENSE_SOURCE_TYPE_DEFINITIONS);
export type ExpenseSourceType = (typeof EXPENSE_SOURCE_TYPES)[number];
export const ExpenseSourceTypeSchema = z.enum(EXPENSE_SOURCE_TYPES).meta({ id: 'ExpenseSourceType' });
export const ExpenseSourceTypeLabel = enumDefinitionLabels(EXPENSE_SOURCE_TYPE_DEFINITIONS);
export const ExpenseSourceTypeOptions = enumDefinitionOptions(EXPENSE_SOURCE_TYPE_DEFINITIONS);

export const EXPENSE_RECORD_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Draft', value: 'draft', label: '草稿', severity: 'secondary', order: 10 },
    { key: 'Recorded', value: 'recorded', label: '已记录', severity: 'info', order: 20 },
    { key: 'Confirmed', value: 'confirmed', label: '已确认', severity: 'success', order: 30 },
    { key: 'Voided', value: 'voided', label: '已作废', severity: 'danger', order: 40 }
] as const);

export const ExpenseRecordStatusValue = enumDefinitionValueObject(EXPENSE_RECORD_STATUS_DEFINITIONS);
export const EXPENSE_RECORD_STATUSES = enumDefinitionValues(EXPENSE_RECORD_STATUS_DEFINITIONS);
export type ExpenseRecordStatus = (typeof EXPENSE_RECORD_STATUSES)[number];
export const ExpenseRecordStatusSchema = z.enum(EXPENSE_RECORD_STATUSES).meta({ id: 'ExpenseRecordStatus' });
export const ExpenseRecordStatusLabel = enumDefinitionLabels(EXPENSE_RECORD_STATUS_DEFINITIONS);
export const ExpenseRecordStatusSeverity = enumDefinitionSeverities(EXPENSE_RECORD_STATUS_DEFINITIONS);
export const ExpenseRecordStatusOptions = enumDefinitionOptions(EXPENSE_RECORD_STATUS_DEFINITIONS);

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

export const ExpenseRecordListSchema = z.array(ExpenseRecordSummarySchema).meta({ id: 'ExpenseRecordList' });

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

export const APPROVAL_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'ContractReview', value: 'contract-review', label: '合同审核', order: 10 },
    { key: 'CommissionPayoutApproval', value: 'commission-payout-approval', label: '提成发放审批', order: 20 },
    { key: 'CommissionAdjustmentApproval', value: 'commission-adjustment-approval', label: '提成调整审批', order: 30 }
] as const);

export const ApprovalTypeValue = enumDefinitionValueObject(APPROVAL_TYPE_DEFINITIONS);
export const APPROVAL_TYPES = enumDefinitionValues(APPROVAL_TYPE_DEFINITIONS);
export type ApprovalType = (typeof APPROVAL_TYPES)[number];
export const ApprovalTypeSchema = z.enum(APPROVAL_TYPES).meta({ id: 'ApprovalType' });
export const ApprovalTypeLabel = enumDefinitionLabels(APPROVAL_TYPE_DEFINITIONS);
export const ApprovalTypeOptions = enumDefinitionOptions(APPROVAL_TYPE_DEFINITIONS);

export const BUSINESS_DOMAIN_DEFINITIONS = defineEnumDefinitions([
    { key: 'ContractFinance', value: 'contract-finance', label: '合同财务', order: 10 },
    { key: 'Commission', value: 'commission', label: '提成', order: 20 },
    { key: 'Sales', value: 'sales', label: '销售', order: 30 },
    { key: 'ProjectHandover', value: 'project-handover', label: '项目移交', order: 40 }
] as const);

export const BusinessDomainValue = enumDefinitionValueObject(BUSINESS_DOMAIN_DEFINITIONS);
export const BUSINESS_DOMAINS = enumDefinitionValues(BUSINESS_DOMAIN_DEFINITIONS);
export type BusinessDomain = (typeof BUSINESS_DOMAINS)[number];
export const BusinessDomainSchema = z.enum(BUSINESS_DOMAINS).meta({ id: 'BusinessDomain' });
export const BusinessDomainLabel = enumDefinitionLabels(BUSINESS_DOMAIN_DEFINITIONS);
export const BusinessDomainOptions = enumDefinitionOptions(BUSINESS_DOMAIN_DEFINITIONS);

export const TARGET_OBJECT_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'Contract', value: 'contract', label: '合同', order: 10 },
    { key: 'CommissionPayout', value: 'commission-payout', label: '提成发放', order: 20 },
    { key: 'CommissionAdjustment', value: 'commission-adjustment', label: '提成调整', order: 30 },
    { key: 'Project', value: 'project', label: '项目', order: 40 },
    { key: 'Lead', value: 'lead', label: '线索', order: 50 },
    { key: 'Customer', value: 'customer', label: '客户', order: 60 },
    { key: 'ProjectHandover', value: 'project-handover', label: '项目移交', order: 70 }
] as const);

export const TargetObjectTypeValue = enumDefinitionValueObject(TARGET_OBJECT_TYPE_DEFINITIONS);
export const TARGET_OBJECT_TYPES = enumDefinitionValues(TARGET_OBJECT_TYPE_DEFINITIONS);
export type TargetObjectType = (typeof TARGET_OBJECT_TYPES)[number];
export const TargetObjectTypeSchema = z.enum(TARGET_OBJECT_TYPES).meta({ id: 'TargetObjectType' });
export const TargetObjectTypeLabel = enumDefinitionLabels(TARGET_OBJECT_TYPE_DEFINITIONS);
export const TargetObjectTypeOptions = enumDefinitionOptions(TARGET_OBJECT_TYPE_DEFINITIONS);

export const APPROVAL_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Pending', value: 'pending', label: '审批中', severity: 'warn', order: 10 },
    { key: 'Approved', value: 'approved', label: '已通过', severity: 'success', order: 20 },
    { key: 'Rejected', value: 'rejected', label: '已驳回', severity: 'danger', order: 30 }
] as const);

export const ApprovalStatusValue = enumDefinitionValueObject(APPROVAL_STATUS_DEFINITIONS);
export const APPROVAL_STATUSES = enumDefinitionValues(APPROVAL_STATUS_DEFINITIONS);
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export const ApprovalStatusSchema = z.enum(APPROVAL_STATUSES).meta({ id: 'ApprovalStatus' });
export const ApprovalStatusLabel = enumDefinitionLabels(APPROVAL_STATUS_DEFINITIONS);
export const ApprovalStatusSeverity = enumDefinitionSeverities(APPROVAL_STATUS_DEFINITIONS);
export const ApprovalStatusOptions = enumDefinitionOptions(APPROVAL_STATUS_DEFINITIONS);

export const APPROVAL_DECISION_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Approved', value: 'approved', label: '通过', severity: 'success', order: 10 },
    { key: 'Rejected', value: 'rejected', label: '驳回', severity: 'danger', order: 20 }
] as const);

export const ApprovalDecisionValue = enumDefinitionValueObject(APPROVAL_DECISION_DEFINITIONS);
export const APPROVAL_DECISIONS = enumDefinitionValues(APPROVAL_DECISION_DEFINITIONS);
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];
export const ApprovalDecisionSchema = z.enum(APPROVAL_DECISIONS).meta({ id: 'ApprovalDecision' });
export const ApprovalDecisionLabel = enumDefinitionLabels(APPROVAL_DECISION_DEFINITIONS);
export const ApprovalDecisionSeverity = enumDefinitionSeverities(APPROVAL_DECISION_DEFINITIONS);
export const ApprovalDecisionOptions = enumDefinitionOptions(APPROVAL_DECISION_DEFINITIONS);

export const TODO_SOURCE_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'ApprovalRecord', value: 'approval-record', label: '审批记录', order: 10 },
    { key: 'ConfirmationRecord', value: 'confirmation-record', label: '确认记录', order: 20 },
    { key: 'SalesFollowUpRecord', value: 'sales-follow-up-record', label: '销售跟进记录', order: 30 }
] as const);

export const TodoSourceTypeValue = enumDefinitionValueObject(TODO_SOURCE_TYPE_DEFINITIONS);
export const TODO_SOURCE_TYPES = enumDefinitionValues(TODO_SOURCE_TYPE_DEFINITIONS);
export type TodoSourceType = (typeof TODO_SOURCE_TYPES)[number];
export const TodoSourceTypeSchema = z.enum(TODO_SOURCE_TYPES).meta({ id: 'TodoSourceType' });
export const TodoSourceTypeLabel = enumDefinitionLabels(TODO_SOURCE_TYPE_DEFINITIONS);
export const TodoSourceTypeOptions = enumDefinitionOptions(TODO_SOURCE_TYPE_DEFINITIONS);

export const TODO_TYPE_DEFINITIONS = defineEnumDefinitions([
    { key: 'Approval', value: 'approval', label: '审批', order: 10 },
    { key: 'Confirmation', value: 'confirmation', label: '确认', order: 20 },
    { key: 'SalesFollowUpReminder', value: 'sales-follow-up-reminder', label: '销售跟进提醒', order: 30 }
] as const);

export const TodoTypeValue = enumDefinitionValueObject(TODO_TYPE_DEFINITIONS);
export const TODO_TYPES = enumDefinitionValues(TODO_TYPE_DEFINITIONS);
export type TodoType = (typeof TODO_TYPES)[number];
export const TodoTypeSchema = z.enum(TODO_TYPES).meta({ id: 'TodoType' });
export const TodoTypeLabel = enumDefinitionLabels(TODO_TYPE_DEFINITIONS);
export const TodoTypeOptions = enumDefinitionOptions(TODO_TYPE_DEFINITIONS);

export const TODO_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Open', value: 'open', label: '待处理', severity: 'warn', order: 10 },
    { key: 'Processing', value: 'processing', label: '处理中', severity: 'info', order: 20 },
    { key: 'Completed', value: 'completed', label: '已完成', severity: 'success', order: 30 },
    { key: 'Canceled', value: 'canceled', label: '已取消', severity: 'contrast', order: 40 }
] as const);

export const TodoStatusValue = enumDefinitionValueObject(TODO_STATUS_DEFINITIONS);
export const TODO_STATUSES = enumDefinitionValues(TODO_STATUS_DEFINITIONS);
export type TodoStatus = (typeof TODO_STATUSES)[number];
export const TodoStatusSchema = z.enum(TODO_STATUSES).meta({ id: 'TodoStatus' });
export const TodoStatusLabel = enumDefinitionLabels(TODO_STATUS_DEFINITIONS);
export const TodoStatusSeverity = enumDefinitionSeverities(TODO_STATUS_DEFINITIONS);
export const TodoStatusOptions = enumDefinitionOptions(TODO_STATUS_DEFINITIONS);

export const TODO_PRIORITY_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Low', value: 'low', label: '低', severity: 'secondary', order: 10 },
    { key: 'Normal', value: 'normal', label: '普通', severity: 'info', order: 20 },
    { key: 'High', value: 'high', label: '高', severity: 'warn', order: 30 },
    { key: 'Urgent', value: 'urgent', label: '紧急', severity: 'danger', order: 40 }
] as const);

export const TodoPriorityValue = enumDefinitionValueObject(TODO_PRIORITY_DEFINITIONS);
export const TODO_PRIORITIES = enumDefinitionValues(TODO_PRIORITY_DEFINITIONS);
export type TodoPriority = (typeof TODO_PRIORITIES)[number];
export const TodoPrioritySchema = z.enum(TODO_PRIORITIES).meta({ id: 'TodoPriority' });
export const TodoPriorityLabel = enumDefinitionLabels(TODO_PRIORITY_DEFINITIONS);
export const TodoPrioritySeverity = enumDefinitionSeverities(TODO_PRIORITY_DEFINITIONS);
export const TodoPriorityOptions = enumDefinitionOptions(TODO_PRIORITY_DEFINITIONS);

export const ApprovalRecordSummarySchema = z
    .object({
        id: z.uuid(),
        approvalType: ApprovalTypeSchema,
        businessDomain: BusinessDomainSchema,
        targetObjectType: TargetObjectTypeSchema,
        targetObjectId: z.uuid(),
        projectId: z.uuid().nullable(),
        currentStatus: ApprovalStatusSchema,
        currentNodeKey: z.string(),
        currentNodeName: z.string().nullable(),
        initiatorUserId: z.uuid(),
        currentApproverUserId: z.uuid().nullable(),
        decision: ApprovalDecisionSchema.nullable(),
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
        sourceType: TodoSourceTypeSchema,
        sourceId: z.uuid(),
        todoType: TodoTypeSchema,
        businessDomain: BusinessDomainSchema,
        targetObjectType: TargetObjectTypeSchema,
        targetObjectId: z.uuid(),
        projectId: z.uuid().nullable(),
        title: z.string(),
        summary: z.string().nullable(),
        targetTitle: z.string().nullable(),
        currentNodeName: z.string().nullable(),
        allowedActions: z.array(z.string()),
        assigneeUserId: z.uuid(),
        status: TodoStatusSchema,
        priority: TodoPrioritySchema,
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

export const COMMISSION_RULE_VERSION_STATUSES = ['draft', 'active', 'stopped'] as const;

export type CommissionRuleVersionStatus = (typeof COMMISSION_RULE_VERSION_STATUSES)[number];

export const CommissionRuleVersionStatusSchema = z.enum(COMMISSION_RULE_VERSION_STATUSES).meta({ id: 'CommissionRuleVersionStatus' });

export const CommissionRuleVersionStatusValue = {
    Draft: 'draft',
    Active: 'active',
    Stopped: 'stopped'
} as const satisfies Record<string, CommissionRuleVersionStatus>;

export const COMMISSION_ROLE_ASSIGNMENT_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Draft', value: 'draft', label: '草稿', severity: 'secondary', order: 10 },
    { key: 'Frozen', value: 'frozen', label: '已冻结', severity: 'success', order: 20 },
    { key: 'Superseded', value: 'superseded', label: '已被替代', severity: 'warn', order: 30 }
] as const);

export const CommissionRoleAssignmentStatusValue = enumDefinitionValueObject(COMMISSION_ROLE_ASSIGNMENT_STATUS_DEFINITIONS);
export const COMMISSION_ROLE_ASSIGNMENT_STATUSES = enumDefinitionValues(COMMISSION_ROLE_ASSIGNMENT_STATUS_DEFINITIONS);
export type CommissionRoleAssignmentStatus = (typeof COMMISSION_ROLE_ASSIGNMENT_STATUSES)[number];
export const CommissionRoleAssignmentStatusSchema = z.enum(COMMISSION_ROLE_ASSIGNMENT_STATUSES).meta({ id: 'CommissionRoleAssignmentStatus' });
export const CommissionRoleAssignmentStatusLabel = enumDefinitionLabels(COMMISSION_ROLE_ASSIGNMENT_STATUS_DEFINITIONS);
export const CommissionRoleAssignmentStatusSeverity = enumDefinitionSeverities(COMMISSION_ROLE_ASSIGNMENT_STATUS_DEFINITIONS);
export const CommissionRoleAssignmentStatusOptions = enumDefinitionOptions(COMMISSION_ROLE_ASSIGNMENT_STATUS_DEFINITIONS);

export const COMMISSION_CALCULATION_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Pending', value: 'pending', label: '待计算', severity: 'secondary', order: 10 },
    { key: 'Calculated', value: 'calculated', label: '已计算', severity: 'info', order: 20 },
    { key: 'Effective', value: 'effective', label: '已生效', severity: 'success', order: 30 },
    { key: 'Superseded', value: 'superseded', label: '已替代', severity: 'contrast', order: 40 }
] as const);

export const CommissionCalculationStatusValue = enumDefinitionValueObject(COMMISSION_CALCULATION_STATUS_DEFINITIONS);
export const COMMISSION_CALCULATION_STATUSES = enumDefinitionValues(COMMISSION_CALCULATION_STATUS_DEFINITIONS);
export type CommissionCalculationStatus = (typeof COMMISSION_CALCULATION_STATUSES)[number];
export const CommissionCalculationStatusSchema = z.enum(COMMISSION_CALCULATION_STATUSES).meta({ id: 'CommissionCalculationStatus' });
export const CommissionCalculationStatusLabel = enumDefinitionLabels(COMMISSION_CALCULATION_STATUS_DEFINITIONS);
export const CommissionCalculationStatusSeverity = enumDefinitionSeverities(COMMISSION_CALCULATION_STATUS_DEFINITIONS);
export const CommissionCalculationStatusOptions = enumDefinitionOptions(COMMISSION_CALCULATION_STATUS_DEFINITIONS);

export const COMMISSION_PAYOUT_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Draft', value: 'draft', label: '草稿', severity: 'secondary', order: 10 },
    { key: 'PendingApproval', value: 'pending-approval', label: '待审批', severity: 'warn', order: 20 },
    { key: 'Approved', value: 'approved', label: '已批准', severity: 'success', order: 30 },
    { key: 'Paid', value: 'paid', label: '已发放', severity: 'info', order: 40 },
    { key: 'Suspended', value: 'suspended', label: '已暂停', severity: 'warn', order: 50 },
    { key: 'Reversed', value: 'reversed', label: '已冲销', severity: 'danger', order: 60 }
] as const);

export const CommissionPayoutStatusValue = enumDefinitionValueObject(COMMISSION_PAYOUT_STATUS_DEFINITIONS);
export const COMMISSION_PAYOUT_STATUSES = enumDefinitionValues(COMMISSION_PAYOUT_STATUS_DEFINITIONS);
export type CommissionPayoutStatus = (typeof COMMISSION_PAYOUT_STATUSES)[number];
export const CommissionPayoutStatusSchema = z.enum(COMMISSION_PAYOUT_STATUSES).meta({ id: 'CommissionPayoutStatus' });
export const CommissionPayoutStatusLabel = enumDefinitionLabels(COMMISSION_PAYOUT_STATUS_DEFINITIONS);
export const CommissionPayoutStatusSeverity = enumDefinitionSeverities(COMMISSION_PAYOUT_STATUS_DEFINITIONS);
export const CommissionPayoutStatusOptions = enumDefinitionOptions(COMMISSION_PAYOUT_STATUS_DEFINITIONS);

export const COMMISSION_PAYOUT_STAGES = ['first', 'second', 'final', 'retention'] as const;

export type CommissionPayoutStage = (typeof COMMISSION_PAYOUT_STAGES)[number];

export const CommissionPayoutStageSchema = z.enum(COMMISSION_PAYOUT_STAGES).meta({ id: 'CommissionPayoutStage' });

export const CommissionPayoutStageValue = {
    First: 'first',
    Second: 'second',
    Final: 'final',
    Retention: 'retention'
} as const satisfies Record<string, CommissionPayoutStage>;

export const NON_RETENTION_COMMISSION_PAYOUT_STAGES = [CommissionPayoutStageValue.First, CommissionPayoutStageValue.Second, CommissionPayoutStageValue.Final] as const;

export type NonRetentionCommissionPayoutStage = (typeof NON_RETENTION_COMMISSION_PAYOUT_STAGES)[number];

export const NonRetentionCommissionPayoutStageSchema = z.enum(NON_RETENTION_COMMISSION_PAYOUT_STAGES).meta({ id: 'NonRetentionCommissionPayoutStage' });

export const COMMISSION_PAYOUT_TIERS = ['basic', 'mid', 'premium'] as const;

export type CommissionPayoutTier = (typeof COMMISSION_PAYOUT_TIERS)[number];

export const CommissionPayoutTierSchema = z.enum(COMMISSION_PAYOUT_TIERS).meta({ id: 'CommissionPayoutTier' });

export const CommissionPayoutTierValue = {
    Basic: 'basic',
    Mid: 'mid',
    Premium: 'premium'
} as const satisfies Record<string, CommissionPayoutTier>;

export const COMMISSION_PAYOUT_KINDS = ['primary', 'supplement'] as const;

export type CommissionPayoutKind = (typeof COMMISSION_PAYOUT_KINDS)[number];

export const CommissionPayoutKindSchema = z.enum(COMMISSION_PAYOUT_KINDS).meta({ id: 'CommissionPayoutKind' });

export const CommissionPayoutKindValue = {
    Primary: 'primary',
    Supplement: 'supplement'
} as const satisfies Record<string, CommissionPayoutKind>;

export const COMMISSION_ADJUSTMENT_TYPES = ['suspend-payout', 'reverse-payout', 'clawback', 'supplement', 'recalculate'] as const;

export type CommissionAdjustmentType = (typeof COMMISSION_ADJUSTMENT_TYPES)[number];

export const CommissionAdjustmentTypeSchema = z.enum(COMMISSION_ADJUSTMENT_TYPES).meta({ id: 'CommissionAdjustmentType' });

export const CommissionAdjustmentTypeValue = {
    SuspendPayout: 'suspend-payout',
    ReversePayout: 'reverse-payout',
    Clawback: 'clawback',
    Supplement: 'supplement',
    Recalculate: 'recalculate'
} as const satisfies Record<string, CommissionAdjustmentType>;

export const COMMISSION_ADJUSTMENT_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Draft', value: 'draft', label: '草稿', severity: 'secondary', order: 10 },
    { key: 'PendingApproval', value: 'pending-approval', label: '待审批', severity: 'warn', order: 20 },
    { key: 'Approved', value: 'approved', label: '已批准', severity: 'success', order: 30 },
    { key: 'Executed', value: 'executed', label: '已执行', severity: 'info', order: 40 },
    { key: 'Rejected', value: 'rejected', label: '已驳回', severity: 'danger', order: 50 },
    { key: 'Closed', value: 'closed', label: '已关闭', severity: 'contrast', order: 60 }
] as const);

export const CommissionAdjustmentStatusValue = enumDefinitionValueObject(COMMISSION_ADJUSTMENT_STATUS_DEFINITIONS);
export const COMMISSION_ADJUSTMENT_STATUSES = enumDefinitionValues(COMMISSION_ADJUSTMENT_STATUS_DEFINITIONS);
export type CommissionAdjustmentStatus = (typeof COMMISSION_ADJUSTMENT_STATUSES)[number];
export const CommissionAdjustmentStatusSchema = z.enum(COMMISSION_ADJUSTMENT_STATUSES).meta({ id: 'CommissionAdjustmentStatus' });
export const CommissionAdjustmentStatusLabel = enumDefinitionLabels(COMMISSION_ADJUSTMENT_STATUS_DEFINITIONS);
export const CommissionAdjustmentStatusSeverity = enumDefinitionSeverities(COMMISSION_ADJUSTMENT_STATUS_DEFINITIONS);
export const CommissionAdjustmentStatusOptions = enumDefinitionOptions(COMMISSION_ADJUSTMENT_STATUS_DEFINITIONS);

export const COMMISSION_FREEZE_DISPUTE_STATUSES = ['submitted', 'closed'] as const;

export type CommissionFreezeDisputeStatus = (typeof COMMISSION_FREEZE_DISPUTE_STATUSES)[number];

export const CommissionFreezeDisputeStatusSchema = z.enum(COMMISSION_FREEZE_DISPUTE_STATUSES).meta({ id: 'CommissionFreezeDisputeStatus' });

export const CommissionFreezeDisputeStatusValue = {
    Submitted: 'submitted',
    Closed: 'closed'
} as const satisfies Record<string, CommissionFreezeDisputeStatus>;

export const COMMISSION_FREEZE_DISPUTE_ARBITRATION_STATUSES = ['pending', 'arbitrated'] as const;

export type CommissionFreezeDisputeArbitrationStatus = (typeof COMMISSION_FREEZE_DISPUTE_ARBITRATION_STATUSES)[number];

export const CommissionFreezeDisputeArbitrationStatusSchema = z.enum(COMMISSION_FREEZE_DISPUTE_ARBITRATION_STATUSES).meta({ id: 'CommissionFreezeDisputeArbitrationStatus' });

export const CommissionFreezeDisputeArbitrationStatusValue = {
    Pending: 'pending',
    Arbitrated: 'arbitrated'
} as const satisfies Record<string, CommissionFreezeDisputeArbitrationStatus>;

export const COMMISSION_FREEZE_CHANGE_STATUSES = ['effective', 'closed'] as const;

export type CommissionFreezeChangeStatus = (typeof COMMISSION_FREEZE_CHANGE_STATUSES)[number];

export const CommissionFreezeChangeStatusSchema = z.enum(COMMISSION_FREEZE_CHANGE_STATUSES).meta({ id: 'CommissionFreezeChangeStatus' });

export const CommissionFreezeChangeStatusValue = {
    Effective: 'effective',
    Closed: 'closed'
} as const satisfies Record<string, CommissionFreezeChangeStatus>;

export const COMMISSION_LIFECYCLE_SNAPSHOT_STATUSES = ['active', 'superseded', 'voided'] as const;

export type CommissionLifecycleSnapshotStatus = (typeof COMMISSION_LIFECYCLE_SNAPSHOT_STATUSES)[number];

export const CommissionLifecycleSnapshotStatusSchema = z.enum(COMMISSION_LIFECYCLE_SNAPSHOT_STATUSES).meta({ id: 'CommissionLifecycleSnapshotStatus' });

export const CommissionLifecycleSnapshotStatusValue = {
    Active: 'active',
    Superseded: 'superseded',
    Voided: 'voided'
} as const satisfies Record<string, CommissionLifecycleSnapshotStatus>;

export const COMMISSION_FINAL_SETTLEMENT_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'PendingFinalSettlement', value: 'pending-final-settlement', label: '待最终结算', severity: 'warn', order: 10 },
    { key: 'PendingRetentionSettlement', value: 'pending-retention-settlement', label: '质保金待结算', severity: 'warn', order: 20 },
    { key: 'SettledAll', value: 'settled-all', label: '全部结清', severity: 'success', order: 30 }
] as const);

export const CommissionFinalSettlementStatusValue = enumDefinitionValueObject(COMMISSION_FINAL_SETTLEMENT_STATUS_DEFINITIONS);
export const COMMISSION_FINAL_SETTLEMENT_STATUSES = enumDefinitionValues(COMMISSION_FINAL_SETTLEMENT_STATUS_DEFINITIONS);
export type CommissionFinalSettlementStatus = (typeof COMMISSION_FINAL_SETTLEMENT_STATUSES)[number];
export const CommissionFinalSettlementStatusSchema = z.enum(COMMISSION_FINAL_SETTLEMENT_STATUSES).meta({ id: 'CommissionFinalSettlementStatus' });
export const CommissionFinalSettlementStatusLabel = enumDefinitionLabels(COMMISSION_FINAL_SETTLEMENT_STATUS_DEFINITIONS);
export const CommissionFinalSettlementStatusSeverity = enumDefinitionSeverities(COMMISSION_FINAL_SETTLEMENT_STATUS_DEFINITIONS);
export const CommissionFinalSettlementStatusOptions = enumDefinitionOptions(COMMISSION_FINAL_SETTLEMENT_STATUS_DEFINITIONS);

export const COMMISSION_NON_RETENTION_SETTLEMENT_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'PendingNonRetention', value: 'pending-non-retention', label: '非质保待结算', severity: 'info', order: 10 },
    { key: 'SettledNonRetention', value: 'settled-non-retention', label: '非质保已结清', severity: 'success', order: 20 }
] as const);

export const CommissionNonRetentionSettlementStatusValue = enumDefinitionValueObject(COMMISSION_NON_RETENTION_SETTLEMENT_STATUS_DEFINITIONS);
export const COMMISSION_NON_RETENTION_SETTLEMENT_STATUSES = enumDefinitionValues(COMMISSION_NON_RETENTION_SETTLEMENT_STATUS_DEFINITIONS);
export type CommissionNonRetentionSettlementStatus = (typeof COMMISSION_NON_RETENTION_SETTLEMENT_STATUSES)[number];
export const CommissionNonRetentionSettlementStatusSchema = z.enum(COMMISSION_NON_RETENTION_SETTLEMENT_STATUSES).meta({ id: 'CommissionNonRetentionSettlementStatus' });
export const CommissionNonRetentionSettlementStatusLabel = enumDefinitionLabels(COMMISSION_NON_RETENTION_SETTLEMENT_STATUS_DEFINITIONS);
export const CommissionNonRetentionSettlementStatusSeverity = enumDefinitionSeverities(COMMISSION_NON_RETENTION_SETTLEMENT_STATUS_DEFINITIONS);
export const CommissionNonRetentionSettlementStatusOptions = enumDefinitionOptions(COMMISSION_NON_RETENTION_SETTLEMENT_STATUS_DEFINITIONS);

export const COMMISSION_RETENTION_SETTLEMENT_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'WaitingRetention', value: 'waiting-retention', label: '待质保金条件', severity: 'warn', order: 10 },
    { key: 'ReadyRetention', value: 'ready-retention', label: '质保金可结算', severity: 'info', order: 20 },
    { key: 'SettledRetention', value: 'settled-retention', label: '质保金已结清', severity: 'success', order: 30 }
] as const);

export const CommissionRetentionSettlementStatusValue = enumDefinitionValueObject(COMMISSION_RETENTION_SETTLEMENT_STATUS_DEFINITIONS);
export const COMMISSION_RETENTION_SETTLEMENT_STATUSES = enumDefinitionValues(COMMISSION_RETENTION_SETTLEMENT_STATUS_DEFINITIONS);
export type CommissionRetentionSettlementStatus = (typeof COMMISSION_RETENTION_SETTLEMENT_STATUSES)[number];
export const CommissionRetentionSettlementStatusSchema = z.enum(COMMISSION_RETENTION_SETTLEMENT_STATUSES).meta({ id: 'CommissionRetentionSettlementStatus' });
export const CommissionRetentionSettlementStatusLabel = enumDefinitionLabels(COMMISSION_RETENTION_SETTLEMENT_STATUS_DEFINITIONS);
export const CommissionRetentionSettlementStatusSeverity = enumDefinitionSeverities(COMMISSION_RETENTION_SETTLEMENT_STATUS_DEFINITIONS);
export const CommissionRetentionSettlementStatusOptions = enumDefinitionOptions(COMMISSION_RETENTION_SETTLEMENT_STATUS_DEFINITIONS);

export const COMMISSION_RULE_EXPLANATION_STAGE_STATUS_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'PendingFinalSettlement', value: 'pending-final-settlement', label: '待最终结算', severity: 'warn', order: 10 },
    { key: 'BlockedRetention', value: 'blocked-retention', label: '质保金结算阻塞', severity: 'danger', order: 20 },
    { key: 'ReadyRetention', value: 'ready-retention', label: '可进入质保金结算', severity: 'info', order: 30 },
    { key: 'SettledRetention', value: 'settled-retention', label: '质保金已结清', severity: 'success', order: 40 }
] as const);

export const CommissionRuleExplanationStageStatusValue = enumDefinitionValueObject(COMMISSION_RULE_EXPLANATION_STAGE_STATUS_DEFINITIONS);
export const COMMISSION_RULE_EXPLANATION_STAGE_STATUSES = enumDefinitionValues(COMMISSION_RULE_EXPLANATION_STAGE_STATUS_DEFINITIONS);
export type CommissionRuleExplanationStageStatus = (typeof COMMISSION_RULE_EXPLANATION_STAGE_STATUSES)[number];
export const CommissionRuleExplanationStageStatusSchema = z.enum(COMMISSION_RULE_EXPLANATION_STAGE_STATUSES).meta({ id: 'CommissionRuleExplanationStageStatus' });
export const CommissionRuleExplanationStageStatusLabel = enumDefinitionLabels(COMMISSION_RULE_EXPLANATION_STAGE_STATUS_DEFINITIONS);
export const CommissionRuleExplanationStageStatusSeverity = enumDefinitionSeverities(COMMISSION_RULE_EXPLANATION_STAGE_STATUS_DEFINITIONS);
export const CommissionRuleExplanationStageStatusOptions = enumDefinitionOptions(COMMISSION_RULE_EXPLANATION_STAGE_STATUS_DEFINITIONS);

export const COMMISSION_RULE_EXPLANATION_GATE_DECISION_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'AllowFinalSettlement', value: 'allow-final-settlement', label: '允许最终结算', severity: 'success', order: 10 },
    { key: 'SettledRetention', value: 'settled-retention', label: '质保金已结清', severity: 'success', order: 20 },
    { key: 'BlockRetention', value: 'block-retention', label: '阻断质保金结算', severity: 'danger', order: 30 },
    { key: 'ReviewRetention', value: 'review-retention', label: '复核质保金结算', severity: 'warn', order: 40 },
    { key: 'AllowRetention', value: 'allow-retention', label: '允许质保金结算', severity: 'success', order: 50 }
] as const);

export const CommissionRuleExplanationGateDecisionValue = enumDefinitionValueObject(COMMISSION_RULE_EXPLANATION_GATE_DECISION_DEFINITIONS);
export const COMMISSION_RULE_EXPLANATION_GATE_DECISIONS = enumDefinitionValues(COMMISSION_RULE_EXPLANATION_GATE_DECISION_DEFINITIONS);
export type CommissionRuleExplanationGateDecision = (typeof COMMISSION_RULE_EXPLANATION_GATE_DECISIONS)[number];
export const CommissionRuleExplanationGateDecisionSchema = z.enum(COMMISSION_RULE_EXPLANATION_GATE_DECISIONS).meta({ id: 'CommissionRuleExplanationGateDecision' });
export const CommissionRuleExplanationGateDecisionLabel = enumDefinitionLabels(COMMISSION_RULE_EXPLANATION_GATE_DECISION_DEFINITIONS);
export const CommissionRuleExplanationGateDecisionSeverity = enumDefinitionSeverities(COMMISSION_RULE_EXPLANATION_GATE_DECISION_DEFINITIONS);
export const CommissionRuleExplanationGateDecisionOptions = enumDefinitionOptions(COMMISSION_RULE_EXPLANATION_GATE_DECISION_DEFINITIONS);

export const COMMISSION_RETENTION_DUE_STATUSES = ['missing', 'pending', 'due'] as const;

export type CommissionRetentionDueStatus = (typeof COMMISSION_RETENTION_DUE_STATUSES)[number];

export const CommissionRetentionDueStatusSchema = z.enum(COMMISSION_RETENTION_DUE_STATUSES).meta({ id: 'CommissionRetentionDueStatus' });

export const CommissionRetentionDueStatusValue = {
    Missing: 'missing',
    Pending: 'pending',
    Due: 'due'
} as const satisfies Record<string, CommissionRetentionDueStatus>;

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
        status: CommissionRuleVersionStatusSchema,
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
        status: CommissionRoleAssignmentStatusSchema,
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

export const CommissionDepartureExceptionDecisionStatusSchema = z.enum(COMMISSION_LIFECYCLE_SNAPSHOT_STATUSES).meta({ id: 'CommissionDepartureExceptionDecisionStatus' });

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
        status: CommissionFreezeDisputeStatusSchema,
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
        status: CommissionFreezeChangeStatusSchema,
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
        status: CommissionCalculationStatusSchema,
        recognizedRevenueTaxExclusiveProjection: SensitiveStringFieldProjectionSchema,
        recognizedCostTaxExclusiveProjection: SensitiveStringFieldProjectionSchema,
        contributionMarginProjection: SensitiveStringFieldProjectionSchema,
        contributionMarginRateProjection: SensitiveStringFieldProjectionSchema,
        commissionPoolProjection: SensitiveStringFieldProjectionSchema,
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
        theoreticalCapAmountProjection: SensitiveStringFieldProjectionSchema,
        approvedAmountProjection: SensitiveStringFieldProjectionSchema,
        paidRecordAmountProjection: SensitiveStringFieldProjectionSchema,
        status: CommissionPayoutStatusSchema,
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

export const SubmitCommissionPayoutApprovalRequestSchema = z.union([SubmitRetentionCommissionPayoutApprovalRequestSchema, SubmitNonRetentionCommissionPayoutApprovalRequestSchema]).meta({ id: 'SubmitCommissionPayoutApprovalRequest' });

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

export const RegisterCommissionPayoutRequestSchema = z.union([RegisterRetentionCommissionPayoutRequestSchema, RegisterNonRetentionCommissionPayoutRequestSchema]).meta({ id: 'RegisterCommissionPayoutRequest' });

export type RegisterRetentionCommissionPayoutRequest = z.infer<typeof RegisterRetentionCommissionPayoutRequestSchema>;

export type RegisterNonRetentionCommissionPayoutRequest = z.infer<typeof RegisterNonRetentionCommissionPayoutRequestSchema>;

export type RegisterCommissionPayoutRequest = z.infer<typeof RegisterCommissionPayoutRequestSchema>;

// ---------------------------------------------------------------------------
// Commission — Adjustment
// ---------------------------------------------------------------------------

export const CommissionAdjustmentSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        rowVersion: z.number().int().positive(),
        adjustmentType: CommissionAdjustmentTypeSchema,
        relatedPayoutId: z.uuid().nullable(),
        relatedCalculationId: z.uuid().nullable(),
        amountProjection: SensitiveStringFieldProjectionSchema,
        reasonProjection: SensitiveStringFieldProjectionSchema,
        status: CommissionAdjustmentStatusSchema,
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

export const INTERNAL_COST_RATE_VERSION_STATUSES = ['active', 'superseded', 'retired'] as const;

export type InternalCostRateVersionStatus = (typeof INTERNAL_COST_RATE_VERSION_STATUSES)[number];

export const InternalCostRateVersionStatusSchema = z.enum(INTERNAL_COST_RATE_VERSION_STATUSES).meta({ id: 'InternalCostRateVersionStatus' });

export const InternalCostRateVersionStatusValue = {
    Active: 'active',
    Superseded: 'superseded',
    Retired: 'retired'
} as const satisfies Record<string, InternalCostRateVersionStatus>;

export const INTERNAL_COST_RATE_SCOPE_TYPES = ['person', 'role'] as const;

export type InternalCostRateScopeType = (typeof INTERNAL_COST_RATE_SCOPE_TYPES)[number];

export const InternalCostRateScopeTypeSchema = z.enum(INTERNAL_COST_RATE_SCOPE_TYPES).meta({ id: 'InternalCostRateScopeType' });

export const InternalCostRateScopeTypeValue = {
    Person: 'person',
    Role: 'role'
} as const satisfies Record<string, InternalCostRateScopeType>;

export const INTERNAL_COST_RATE_UNITS = ['hour', 'day'] as const;

export type InternalCostRateUnit = (typeof INTERNAL_COST_RATE_UNITS)[number];

export const InternalCostRateUnitSchema = z.enum(INTERNAL_COST_RATE_UNITS).meta({ id: 'InternalCostRateUnit' });

export const InternalCostRateUnitValue = {
    Hour: 'hour',
    Day: 'day'
} as const satisfies Record<string, InternalCostRateUnit>;

export const InternalCostRateVersionSummarySchema = z
    .object({
        id: z.uuid(),
        rateKey: z.string().trim().min(1).max(128),
        version: z.number().int().positive(),
        status: InternalCostRateVersionStatusSchema,
        isCurrent: z.boolean(),
        rateScopeType: InternalCostRateScopeTypeSchema,
        personId: z.uuid().nullable(),
        roleCode: z.string().nullable(),
        rateUnit: InternalCostRateUnitSchema,
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
        rateScopeType: InternalCostRateScopeTypeSchema,
        personId: z.uuid().nullable().optional(),
        roleCode: z.string().nullable().optional(),
        rateUnit: InternalCostRateUnitSchema,
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

export const PROJECT_ACTUAL_COST_TYPES = ['procurement', 'invoice', 'expense', 'payment-fact', 'labor'] as const;

export type ProjectActualCostType = (typeof PROJECT_ACTUAL_COST_TYPES)[number];

export const ProjectActualCostTypeSchema = z.enum(PROJECT_ACTUAL_COST_TYPES).meta({ id: 'ProjectActualCostType' });

export const ProjectActualCostTypeValue = {
    Procurement: 'procurement',
    Invoice: 'invoice',
    Expense: 'expense',
    PaymentFact: 'payment-fact',
    Labor: 'labor'
} as const satisfies Record<string, ProjectActualCostType>;

export const PROJECT_ACTUAL_COST_RECORD_STATUSES = ['draft', 'registered', 'confirmed', 'included', 'voided', 'replaced'] as const;

export type ProjectActualCostRecordStatus = (typeof PROJECT_ACTUAL_COST_RECORD_STATUSES)[number];

export const ProjectActualCostRecordStatusSchema = z.enum(PROJECT_ACTUAL_COST_RECORD_STATUSES).meta({ id: 'ProjectActualCostRecordStatus' });

export const ProjectActualCostRecordStatusValue = {
    Draft: 'draft',
    Registered: 'registered',
    Confirmed: 'confirmed',
    Included: 'included',
    Voided: 'voided',
    Replaced: 'replaced'
} as const satisfies Record<string, ProjectActualCostRecordStatus>;

export const PROJECT_ACTUAL_COST_SOURCE_TYPES = ['payment-record', 'invoice-record', 'expense-record', 'payable-record', 'labor'] as const;

export type ProjectActualCostSourceType = (typeof PROJECT_ACTUAL_COST_SOURCE_TYPES)[number];

export const ProjectActualCostSourceTypeSchema = z.enum(PROJECT_ACTUAL_COST_SOURCE_TYPES).meta({ id: 'ProjectActualCostSourceType' });

export const ProjectActualCostSourceTypeValue = {
    PaymentRecord: 'payment-record',
    InvoiceRecord: 'invoice-record',
    ExpenseRecord: 'expense-record',
    PayableRecord: 'payable-record',
    Labor: 'labor'
} as const satisfies Record<string, ProjectActualCostSourceType>;

export const LABOR_COST_PERIOD_TYPES = ['week', 'month'] as const;

export type LaborCostPeriodType = (typeof LABOR_COST_PERIOD_TYPES)[number];

export const LaborCostPeriodTypeSchema = z.enum(LABOR_COST_PERIOD_TYPES).meta({ id: 'LaborCostPeriodType' });

export const LaborCostPeriodTypeValue = {
    Week: 'week',
    Month: 'month'
} as const satisfies Record<string, LaborCostPeriodType>;

export const ProjectActualCostRecordSummarySchema = z
    .object({
        id: z.uuid(),
        projectId: z.uuid(),
        recordNo: z.string(),
        costType: ProjectActualCostTypeSchema,
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
        recordStatus: ProjectActualCostRecordStatusSchema,
        isIncludedInProjectCost: z.boolean(),
        isHighRisk: z.boolean(),
        sourceType: ProjectActualCostSourceTypeSchema.nullable(),
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

export const ProjectActualCostRecordListViewSchema = z.array(ProjectActualCostRecordSummarySchema).meta({ id: 'ProjectActualCostRecordListView' });

export type ProjectActualCostRecordListView = z.infer<typeof ProjectActualCostRecordListViewSchema>;

export const ProjectActualCostRecordDetailViewSchema = ProjectActualCostRecordSummarySchema.extend({
    sourceStatusSummary: z.string().nullable(),
    effectivePeriodSummary: z.string().nullable(),
    measurementBasisSummary: z.string().nullable(),
    supersedesSummary: z.string().nullable(),
    allowedActions: z.array(z.string()),
    laborPersonId: z.uuid().nullable(),
    laborRole: z.string().nullable(),
    laborPeriodType: LaborCostPeriodTypeSchema.nullable(),
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

export const BASELINE_SELECTION_SOURCE_DEFINITIONS = defineEnumDefinitions([
    { key: 'Original', value: 'original', label: '原始经营基线', order: 10 },
    { key: 'HandoverRebaseline', value: 'handover-rebaseline', label: '移交再基线化', order: 20 }
] as const);

export const BaselineSelectionSourceValue = enumDefinitionValueObject(BASELINE_SELECTION_SOURCE_DEFINITIONS);
export const BASELINE_SELECTION_SOURCES = enumDefinitionValues(BASELINE_SELECTION_SOURCE_DEFINITIONS);
export type BaselineSelectionSource = (typeof BASELINE_SELECTION_SOURCES)[number];
export const BaselineSelectionSourceSchema = z.enum(BASELINE_SELECTION_SOURCES).meta({ id: 'BaselineSelectionSource' });
export const BaselineSelectionSourceLabel = enumDefinitionLabels(BASELINE_SELECTION_SOURCE_DEFINITIONS);
export const BaselineSelectionSourceOptions = enumDefinitionOptions(BASELINE_SELECTION_SOURCE_DEFINITIONS);

export const OPERATING_SNAPSHOT_ACTION_LEVEL_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Prompt', value: 'prompt', label: '提示', severity: 'info', order: 10 },
    { key: 'Review', value: 'review', label: '复核', severity: 'warn', order: 20 },
    { key: 'Block', value: 'block', label: '阻断', severity: 'danger', order: 30 }
] as const);

export const OperatingSnapshotActionLevelValue = enumDefinitionValueObject(OPERATING_SNAPSHOT_ACTION_LEVEL_DEFINITIONS);
export const OPERATING_SNAPSHOT_ACTION_LEVELS = enumDefinitionValues(OPERATING_SNAPSHOT_ACTION_LEVEL_DEFINITIONS);
export type OperatingSnapshotActionLevel = (typeof OPERATING_SNAPSHOT_ACTION_LEVELS)[number];
export const OperatingSnapshotActionLevelSchema = z.enum(OPERATING_SNAPSHOT_ACTION_LEVELS).meta({ id: 'OperatingSnapshotActionLevel' });
export const OperatingSnapshotActionLevelLabel = enumDefinitionLabels(OPERATING_SNAPSHOT_ACTION_LEVEL_DEFINITIONS);
export const OperatingSnapshotActionLevelSeverity = enumDefinitionSeverities(OPERATING_SNAPSHOT_ACTION_LEVEL_DEFINITIONS);
export const OperatingSnapshotActionLevelOptions = enumDefinitionOptions(OPERATING_SNAPSHOT_ACTION_LEVEL_DEFINITIONS);

export const OPERATING_BASELINE_PACKAGE_STATUSES = ['draft', 'active', 'superseded'] as const;

export type OperatingBaselinePackageStatus = (typeof OPERATING_BASELINE_PACKAGE_STATUSES)[number];

export const OperatingBaselinePackageStatusSchema = z.enum(OPERATING_BASELINE_PACKAGE_STATUSES).meta({ id: 'OperatingBaselinePackageStatus' });

export const OperatingBaselinePackageStatusValue = {
    Draft: 'draft',
    Active: 'active',
    Superseded: 'superseded'
} as const satisfies Record<string, OperatingBaselinePackageStatus>;

export const CHANGE_PACKAGE_BASELINE_STATUSES = ['active', 'voided'] as const;

export type ChangePackageBaselineStatus = (typeof CHANGE_PACKAGE_BASELINE_STATUSES)[number];

export const ChangePackageBaselineStatusSchema = z.enum(CHANGE_PACKAGE_BASELINE_STATUSES).meta({ id: 'ChangePackageBaselineStatus' });

export const ChangePackageBaselineStatusValue = {
    Active: 'active',
    Voided: 'voided'
} as const satisfies Record<string, ChangePackageBaselineStatus>;

export const OPERATING_LIFECYCLE_STATUSES = ['active', 'superseded', 'voided'] as const;

export type OperatingLifecycleStatus = (typeof OPERATING_LIFECYCLE_STATUSES)[number];

export const OperatingLifecycleStatusSchema = z.enum(OPERATING_LIFECYCLE_STATUSES).meta({ id: 'OperatingLifecycleStatus' });

export const OperatingLifecycleStatusValue = {
    Active: 'active',
    Superseded: 'superseded',
    Voided: 'voided'
} as const satisfies Record<string, OperatingLifecycleStatus>;

export const OPERATING_PENDING_LIFECYCLE_STATUSES = ['pending', 'active', 'superseded', 'voided'] as const;

export type OperatingPendingLifecycleStatus = (typeof OPERATING_PENDING_LIFECYCLE_STATUSES)[number];

export const OperatingPendingLifecycleStatusSchema = z.enum(OPERATING_PENDING_LIFECYCLE_STATUSES).meta({ id: 'OperatingPendingLifecycleStatus' });

export const OperatingPendingLifecycleStatusValue = {
    Pending: 'pending',
    Active: 'active',
    Superseded: 'superseded',
    Voided: 'voided'
} as const satisfies Record<string, OperatingPendingLifecycleStatus>;

export const OPERATING_SNAPSHOT_MODES = ['realtime', 'period-end', 'restated'] as const;

export type OperatingSnapshotMode = (typeof OPERATING_SNAPSHOT_MODES)[number];

export const OperatingSnapshotModeSchema = z.enum(OPERATING_SNAPSHOT_MODES).meta({ id: 'OperatingSnapshotMode' });

export const OperatingSnapshotModeValue = {
    Realtime: 'realtime',
    PeriodEnd: 'period-end',
    Restated: 'restated'
} as const satisfies Record<string, OperatingSnapshotMode>;

export const CREATABLE_OPERATING_SNAPSHOT_MODES = [OperatingSnapshotModeValue.Realtime, OperatingSnapshotModeValue.PeriodEnd] as const;

export type CreatableOperatingSnapshotMode = (typeof CREATABLE_OPERATING_SNAPSHOT_MODES)[number];

export const CreatableOperatingSnapshotModeSchema = z.enum(CREATABLE_OPERATING_SNAPSHOT_MODES).meta({ id: 'CreatableOperatingSnapshotMode' });

export const COST_STAGE_ATTRIBUTION_MODES = ['auto', 'manual', 'reclassified'] as const;

export type CostStageAttributionMode = (typeof COST_STAGE_ATTRIBUTION_MODES)[number];

export const CostStageAttributionModeSchema = z.enum(COST_STAGE_ATTRIBUTION_MODES).meta({ id: 'CostStageAttributionMode' });

export const CostStageAttributionModeValue = {
    Auto: 'auto',
    Manual: 'manual',
    Reclassified: 'reclassified'
} as const satisfies Record<string, CostStageAttributionMode>;

export const CONFIRM_COST_STAGE_ATTRIBUTION_MODES = [CostStageAttributionModeValue.Auto, CostStageAttributionModeValue.Manual] as const;

export type ConfirmCostStageAttributionMode = (typeof CONFIRM_COST_STAGE_ATTRIBUTION_MODES)[number];

export const ConfirmCostStageAttributionModeSchema = z.enum(CONFIRM_COST_STAGE_ATTRIBUTION_MODES).meta({ id: 'ConfirmCostStageAttributionMode' });

export const OPERATING_DATA_MATURITY_LEVEL_DEFINITIONS = defineEnumDefinitions([
    { key: 'Insufficient', value: 'insufficient', label: '数据不足', order: 10 },
    { key: 'Preliminary', value: 'preliminary', label: '初步可看', order: 20 },
    { key: 'Mature', value: 'mature', label: '成熟', order: 30 }
] as const);

export const OperatingDataMaturityLevelValue = enumDefinitionValueObject(OPERATING_DATA_MATURITY_LEVEL_DEFINITIONS);
export const OPERATING_DATA_MATURITY_LEVELS = enumDefinitionValues(OPERATING_DATA_MATURITY_LEVEL_DEFINITIONS);
export type OperatingDataMaturityLevel = (typeof OPERATING_DATA_MATURITY_LEVELS)[number];
export const OperatingDataMaturityLevelSchema = z.enum(OPERATING_DATA_MATURITY_LEVELS).meta({ id: 'OperatingDataMaturityLevel' });
export const OperatingDataMaturityLevelLabel = enumDefinitionLabels(OPERATING_DATA_MATURITY_LEVEL_DEFINITIONS);
export const OperatingDataMaturityLevelOptions = enumDefinitionOptions(OPERATING_DATA_MATURITY_LEVEL_DEFINITIONS);

export const OPERATING_SIGNAL_LEVEL_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Attention', value: 'attention', label: '关注', severity: 'warn', order: 10 },
    { key: 'Alert', value: 'alert', label: '警报', severity: 'danger', order: 20 }
] as const);

export const OperatingSignalLevelValue = enumDefinitionValueObject(OPERATING_SIGNAL_LEVEL_DEFINITIONS);
export const OPERATING_SIGNAL_LEVELS = enumDefinitionValues(OPERATING_SIGNAL_LEVEL_DEFINITIONS);
export type OperatingSignalLevel = (typeof OPERATING_SIGNAL_LEVELS)[number];
export const OperatingSignalLevelSchema = z.enum(OPERATING_SIGNAL_LEVELS).meta({ id: 'OperatingSignalLevel' });
export const OperatingSignalLevelLabel = enumDefinitionLabels(OPERATING_SIGNAL_LEVEL_DEFINITIONS);
export const OperatingSignalLevelSeverity = enumDefinitionSeverities(OPERATING_SIGNAL_LEVEL_DEFINITIONS);
export const OperatingSignalLevelOptions = enumDefinitionOptions(OPERATING_SIGNAL_LEVEL_DEFINITIONS);

export const OPERATING_RISK_LEVEL_DEFINITIONS = defineSeverityEnumDefinitions([
    { key: 'Attention', value: 'attention', label: '关注', severity: 'warn', order: 10 },
    { key: 'Risk', value: 'risk', label: '风险', severity: 'danger', order: 20 }
] as const);

export const OperatingRiskLevelValue = enumDefinitionValueObject(OPERATING_RISK_LEVEL_DEFINITIONS);
export const OPERATING_RISK_LEVELS = enumDefinitionValues(OPERATING_RISK_LEVEL_DEFINITIONS);
export type OperatingRiskLevel = (typeof OPERATING_RISK_LEVELS)[number];
export const OperatingRiskLevelSchema = z.enum(OPERATING_RISK_LEVELS).meta({ id: 'OperatingRiskLevel' });
export const OperatingRiskLevelLabel = enumDefinitionLabels(OPERATING_RISK_LEVEL_DEFINITIONS);
export const OperatingRiskLevelSeverity = enumDefinitionSeverities(OPERATING_RISK_LEVEL_DEFINITIONS);
export const OperatingRiskLevelOptions = enumDefinitionOptions(OPERATING_RISK_LEVEL_DEFINITIONS);

export const OPERATING_SIGNAL_REVIEW_DECISIONS = ['approve', 'manual-confirmed'] as const;

export type OperatingSignalReviewDecision = (typeof OPERATING_SIGNAL_REVIEW_DECISIONS)[number];

export const OperatingSignalReviewDecisionSchema = z.enum(OPERATING_SIGNAL_REVIEW_DECISIONS).meta({ id: 'OperatingSignalReviewDecision' });

export const OperatingSignalReviewDecisionValue = {
    Approve: 'approve',
    ManualConfirmed: 'manual-confirmed'
} as const satisfies Record<string, OperatingSignalReviewDecision>;

export const ACCOUNTING_TAX_DEDUCTIBILITY_STATUSES = ['pending', 'deductible', 'non-deductible'] as const;

export type AccountingTaxDeductibilityStatus = (typeof ACCOUNTING_TAX_DEDUCTIBILITY_STATUSES)[number];

export const AccountingTaxDeductibilityStatusSchema = z.enum(ACCOUNTING_TAX_DEDUCTIBILITY_STATUSES).meta({ id: 'AccountingTaxDeductibilityStatus' });

export const AccountingTaxDeductibilityStatusValue = {
    Pending: 'pending',
    Deductible: 'deductible',
    NonDeductible: 'non-deductible'
} as const satisfies Record<string, AccountingTaxDeductibilityStatus>;

const CommissionSharedEvidencePackageShape = {
    freezeVersionSummary: CommissionRoleAssignmentSummarySchema,
    baselineSelectionSource: BaselineSelectionSourceSchema,
    taxImpactSummaryProjection: SensitiveStringFieldProjectionSchema,
    taxImpactPendingAmountProjection: SensitiveStringFieldProjectionSchema,
    dataMaturityLevel: OperatingDataMaturityLevelSchema,
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
        finalSettlementStatus: CommissionFinalSettlementStatusSchema,
        nonRetentionSettlementStatus: CommissionNonRetentionSettlementStatusSchema,
        retentionSettlementStatus: CommissionRetentionSettlementStatusSchema,
        retentionDueDate: z.iso.date().nullable(),
        retentionDueStatus: CommissionRetentionDueStatusSchema,
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
        currentStageStatus: CommissionRuleExplanationStageStatusSchema,
        gateDecisionCode: CommissionRuleExplanationGateDecisionSchema,
        blockingReasonCategory: z.string().nullable(),
        blockingReasonCode: z.string().nullable(),
        blockingReasonSummary: z.string().nullable(),
        gateDecisionSummary: z.string(),
        nextActionSummaryProjection: SensitiveStringFieldProjectionSchema,
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
        baselineSelectionSource: BaselineSelectionSourceSchema.default(BaselineSelectionSourceValue.Original),
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
        status: OperatingBaselinePackageStatusSchema,
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

function assertOperatingSnapshotBaselineSelection(input: { baselineSelectionSource: BaselineSelectionSource; handoverRebaselineRecordId?: string | null }, ctx: z.RefinementCtx) {
    if (input.baselineSelectionSource === BaselineSelectionSourceValue.HandoverRebaseline && !input.handoverRebaselineRecordId) {
        ctx.addIssue({
            code: 'custom',
            path: ['handoverRebaselineRecordId'],
            message: 'handoverRebaselineRecordId is required when baselineSelectionSource is handover-rebaseline'
        });
    }

    if (input.baselineSelectionSource === BaselineSelectionSourceValue.Original && input.handoverRebaselineRecordId) {
        ctx.addIssue({
            code: 'custom',
            path: ['handoverRebaselineRecordId'],
            message: 'handoverRebaselineRecordId must be null when baselineSelectionSource is original'
        });
    }
}

export const CreateProjectOperatingSnapshotRequestSchema = OperatingSnapshotAmountInputSchema.extend({
    projectId: z.uuid(),
    snapshotMode: CreatableOperatingSnapshotModeSchema,
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
        snapshotMode: OperatingSnapshotModeSchema,
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
        status: OperatingLifecycleStatusSchema,
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
        snapshotMode: z.literal(OperatingSnapshotModeValue.PeriodEnd),
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
        status: OperatingLifecycleStatusSchema,
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
        status: OperatingLifecycleStatusSchema,
        handledAt: z.iso.datetime(),
        handledBy: z.uuid().nullable(),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'OperatingRestatementSummary' });

export type OperatingRestatementSummary = z.infer<typeof OperatingRestatementSummarySchema>;

export const OperatingRestatementListViewSchema = z.array(OperatingRestatementSummarySchema).meta({ id: 'OperatingRestatementListView' });

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
        status: OperatingPendingLifecycleStatusSchema,
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
        status: OperatingPendingLifecycleStatusSchema,
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

export const SharedCostAllocationResultListViewSchema = z.array(SharedCostAllocationResultSummarySchema).meta({ id: 'SharedCostAllocationResultListView' });

export type SharedCostAllocationResultListView = z.infer<typeof SharedCostAllocationResultListViewSchema>;

export const ConfirmCostStageAttributionRequestSchema = z
    .object({
        stageAttributionMode: ConfirmCostStageAttributionModeSchema,
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
        attributionMode: CostStageAttributionModeSchema,
        lockedBySnapshotId: z.uuid().nullable(),
        attributionSummary: z.string().nullable(),
        status: OperatingLifecycleStatusSchema,
        supersedesId: z.uuid().nullable(),
        handledAt: z.iso.datetime().nullable(),
        handledBy: z.uuid().nullable(),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'CostStageAttributionSnapshotSummary' });

export type CostStageAttributionSnapshotSummary = z.infer<typeof CostStageAttributionSnapshotSummarySchema>;

export const CostStageAttributionHistoryViewSchema = z.array(CostStageAttributionSnapshotSummarySchema).meta({ id: 'CostStageAttributionHistoryView' });

export type CostStageAttributionHistoryView = z.infer<typeof CostStageAttributionHistoryViewSchema>;

export const ConfirmAccountingTaxTreatmentRequestSchema = z
    .object({
        taxTreatmentType: z.string().trim().min(1).max(64),
        deductibilityStatus: AccountingTaxDeductibilityStatusSchema,
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
        deductibilityStatus: AccountingTaxDeductibilityStatusSchema,
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
        deductibilityStatus: AccountingTaxDeductibilityStatusSchema,
        taxImpactAmount: z.string(),
        taxPendingFlag: z.boolean(),
        taxImpactSummary: z.string(),
        taxImpactPendingAmount: z.string(),
        basisSummary: z.string().nullable(),
        status: OperatingPendingLifecycleStatusSchema,
        supersedesId: z.uuid().nullable(),
        confirmedAt: z.iso.datetime().nullable(),
        confirmedBy: z.uuid().nullable(),
        rowVersion: z.number().int().positive(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime()
    })
    .meta({ id: 'AccountingTaxTreatmentSnapshotSummary' });

export type AccountingTaxTreatmentSnapshotSummary = z.infer<typeof AccountingTaxTreatmentSnapshotSummarySchema>;

export const AccountingTaxTreatmentListViewSchema = z.array(AccountingTaxTreatmentSnapshotSummarySchema).meta({ id: 'AccountingTaxTreatmentListView' });

export type AccountingTaxTreatmentListView = z.infer<typeof AccountingTaxTreatmentListViewSchema>;

export const ReviewOperatingSignalEvaluationRequestSchema = z
    .object({
        reviewDecision: OperatingSignalReviewDecisionSchema,
        resolvedDataMaturityLevel: OperatingDataMaturityLevelSchema,
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
        dataMaturityLevel: OperatingDataMaturityLevelSchema,
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
        formulaBoundaryAction: OperatingSnapshotActionLevelSchema,
        signalLevel: OperatingSignalLevelSchema,
        taxImpactSummary: z.string(),
        allocationStabilitySummary: z.string().nullable(),
        unmappedCostSummary: z.string().nullable(),
        dataMaturityLevel: OperatingDataMaturityLevelSchema,
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
        dataMaturityLevel: OperatingDataMaturityLevelSchema,
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
        signalLevel: OperatingSignalLevelSchema,
        taxImpactSummary: z.string(),
        taxImpactPendingAmount: z.string(),
        dataMaturityLevel: OperatingDataMaturityLevelSchema,
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
        grossMarginAmountProjection: SensitiveStringFieldProjectionSchema,
        grossMarginRateProjection: SensitiveStringFieldProjectionSchema,
        taxImpactSummaryProjection: SensitiveStringFieldProjectionSchema,
        allocationStabilitySummary: z.string().nullable(),
        unmappedCostSummary: z.string().nullable(),
        dataMaturityLevel: OperatingDataMaturityLevelSchema,
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
        dataMaturityLevel: OperatingDataMaturityLevelSchema,
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
        riskLevel: OperatingRiskLevelSchema,
        taxImpactSummaryProjection: SensitiveStringFieldProjectionSchema,
        allocationStabilitySummary: z.string().nullable(),
        unmappedCostSummary: z.string().nullable(),
        dataMaturityLevel: OperatingDataMaturityLevelSchema,
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
        signalLevel: OperatingSignalLevelSchema,
        currentActionLevel: OperatingSnapshotActionLevelSchema,
        taxImpactSummaryProjection: SensitiveStringFieldProjectionSchema,
        allocationStabilitySummary: z.string().nullable(),
        unmappedCostSummary: z.string().nullable(),
        dataMaturityLevel: OperatingDataMaturityLevelSchema,
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
        costType: z.literal(ProjectActualCostTypeValue.PaymentFact),
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
        costType: z.literal(ProjectActualCostTypeValue.Invoice),
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
        costType: z.literal(ProjectActualCostTypeValue.Expense),
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
        costType: z.literal(ProjectActualCostTypeValue.Procurement),
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
        costType: z.literal(ProjectActualCostTypeValue.Labor),
        laborPersonId: z.uuid().nullable().optional(),
        laborRole: z.string().nullable().optional(),
        laborPeriodType: LaborCostPeriodTypeSchema,
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
