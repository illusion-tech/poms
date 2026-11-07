import { defineEntity } from '@mikro-orm/core';
import { EXTERNAL_IDENTITY_BINDING_STATUSES, IDENTITY_PROVIDERS, ExternalIdentityBindingStatusValue, IdentityProviderValue, type ExternalIdentityBindingStatus, type IdentityProvider } from '@poms/shared-contracts';
import { PlatformUser } from '../platform/platform-user.entity';
import { IdentityProviderConfig } from './identity-provider-config.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const ExternalIdentitySchema = defineEntity({
    name: 'ExternalIdentity',
    tableName: 'external_identity',
    schema: 'poms',
    comment: 'POMS 用户与外部身份主体绑定',
    indexes: [
        { name: 'idx_external_identity_user_status', properties: ['pomsUserId', 'status'] },
        { name: 'idx_external_identity_provider_subject', properties: ['identityProviderConfigId', 'subjectId', 'status'] },
        {
            name: 'uq_external_identity_active_subject',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.identityProviderConfigId}", coalesce("${columns.tenantId}", ''), "${columns.subjectId}") where "${columns.status}" = 'active'`
        },
        {
            name: 'uq_external_identity_active_user_provider',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.pomsUserId}", "${columns.identityProviderConfigId}") where "${columns.status}" = 'active'`
        }
    ],
    checks: [
        {
            name: 'chk_external_identity_provider',
            expression: `"provider" in (${toSqlStringList(IDENTITY_PROVIDERS)})`
        },
        {
            name: 'chk_external_identity_status',
            expression: `"status" in (${toSqlStringList(EXTERNAL_IDENTITY_BINDING_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('外部身份绑定主键'),
        identityProviderConfigId: () =>
            p.manyToOne(IdentityProviderConfig).mapToPk().fieldName('identity_provider_config_id').foreignKeyName('external_identity_provider_config_id_foreign').updateRule('cascade').deleteRule('restrict').comment('外部身份提供商配置标识'),
        provider: p.string().$type<IdentityProvider>().length(32).default(IdentityProviderValue.Feishu).comment('外部身份提供商代码'),
        tenantId: p.string().length(128).nullable().fieldName('tenant_id').comment('外部租户标识'),
        pomsUserId: () => p.manyToOne(PlatformUser).mapToPk().fieldName('poms_user_id').foreignKeyName('external_identity_poms_user_id_foreign').updateRule('cascade').deleteRule('restrict').comment('绑定的 POMS 用户标识'),
        subjectId: p.string().length(255).fieldName('subject_id').comment('外部用户主体标识'),
        unionId: p.string().length(255).nullable().fieldName('union_id').comment('外部统一用户标识'),
        subjectDisplayName: p.string().length(255).nullable().fieldName('subject_display_name').comment('外部用户展示名快照'),
        avatarUrl: p.string().length(512).nullable().fieldName('avatar_url').comment('外部头像地址快照'),
        email: p.string().length(255).nullable().comment('外部邮箱快照'),
        mobile: p.string().length(64).nullable().comment('外部手机号快照'),
        status: p.string().$type<ExternalIdentityBindingStatus>().length(32).default(ExternalIdentityBindingStatusValue.Active).comment('绑定状态'),
        boundAt: p.datetime().defaultRaw('now()').fieldName('bound_at').comment('绑定时间'),
        boundBy: p.uuid().nullable().fieldName('bound_by').comment('绑定操作人'),
        revokedAt: p.datetime().nullable().fieldName('revoked_at').comment('解绑时间'),
        revokedBy: p.uuid().nullable().fieldName('revoked_by').comment('解绑操作人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at')
            .comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
            .comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人标识')
    }
});

export class ExternalIdentity extends ExternalIdentitySchema.class {}

ExternalIdentitySchema.setClass(ExternalIdentity);
