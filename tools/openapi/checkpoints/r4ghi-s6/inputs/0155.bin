import { defineEntity } from '@mikro-orm/core';
import {
    IDENTITY_PROVIDER_OAUTH_GRANT_STATUSES,
    IDENTITY_PROVIDERS,
    IdentityProviderOAuthGrantStatusValue,
    IdentityProviderValue,
    type IdentityProvider,
    type IdentityProviderOAuthGrantStatus
} from '@poms/shared-contracts';
import { PlatformUser } from '../platform/platform-user.entity';
import { IdentityProviderConfig } from './identity-provider-config.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const IdentityProviderOAuthGrantSchema = defineEntity({
    name: 'IdentityProviderOAuthGrant',
    tableName: 'identity_provider_oauth_grant',
    schema: 'poms',
    comment: '管理员对外部身份提供商的用户级搜索授权',
    indexes: [
        { name: 'idx_identity_provider_oauth_grant_user_status', properties: ['pomsUserId', 'status'] },
        { name: 'idx_identity_provider_oauth_grant_provider_user', properties: ['identityProviderConfigId', 'pomsUserId'] },
        {
            name: 'uq_identity_provider_oauth_grant_active_user_provider',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.identityProviderConfigId}", "${columns.pomsUserId}") where "${columns.status}" = 'active'`
        }
    ],
    checks: [
        {
            name: 'chk_identity_provider_oauth_grant_provider',
            expression: `"provider" in (${toSqlStringList(IDENTITY_PROVIDERS)})`
        },
        {
            name: 'chk_identity_provider_oauth_grant_status',
            expression: `"status" in (${toSqlStringList(IDENTITY_PROVIDER_OAUTH_GRANT_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('授权记录主键'),
        identityProviderConfigId: () =>
            p.manyToOne(IdentityProviderConfig).mapToPk().fieldName('identity_provider_config_id').foreignKeyName('identity_provider_oauth_grant_provider_config_id_foreign').updateRule('cascade').deleteRule('restrict').comment('外部身份提供商配置标识'),
        provider: p.string().$type<IdentityProvider>().length(32).default(IdentityProviderValue.Feishu).comment('外部身份提供商代码'),
        tenantId: p.string().length(128).nullable().fieldName('tenant_id').comment('外部租户标识'),
        pomsUserId: () => p.manyToOne(PlatformUser).mapToPk().fieldName('poms_user_id').foreignKeyName('identity_provider_oauth_grant_poms_user_id_foreign').updateRule('cascade').deleteRule('restrict').comment('授予搜索授权的 POMS 管理员'),
        encryptedAccessToken: p.text().fieldName('encrypted_access_token').comment('加密后的用户级 access token'),
        encryptedRefreshToken: p.text().nullable().fieldName('encrypted_refresh_token').comment('加密后的用户级 refresh token'),
        scopes: p.json<string[]>().default([]).fieldName('scopes_json').comment('授权 scope 快照'),
        status: p.string().$type<IdentityProviderOAuthGrantStatus>().length(32).default(IdentityProviderOAuthGrantStatusValue.Active).comment('授权状态'),
        grantedAt: p.datetime().defaultRaw('now()').fieldName('granted_at').comment('授权时间'),
        expiresAt: p.datetime().nullable().fieldName('expires_at').comment('access token 过期时间'),
        refreshExpiresAt: p.datetime().nullable().fieldName('refresh_expires_at').comment('refresh token 过期时间'),
        lastUsedAt: p.datetime().nullable().fieldName('last_used_at').comment('最近一次搜索使用时间'),
        revokedAt: p.datetime().nullable().fieldName('revoked_at').comment('授权撤销时间'),
        lastError: p.string().length(1024).nullable().fieldName('last_error').comment('最近一次 provider 调用错误摘要'),
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

export class IdentityProviderOAuthGrant extends IdentityProviderOAuthGrantSchema.class {}

IdentityProviderOAuthGrantSchema.setClass(IdentityProviderOAuthGrant);
