import { defineEntity } from '@mikro-orm/core';
import {
    IDENTITY_PROVIDERS,
    IDENTITY_PROVIDER_CONFIG_STATUSES,
    IDENTITY_PROVIDER_SEARCH_GRANT_MODES,
    IdentityProviderConfigStatusValue,
    IdentityProviderSearchGrantModeValue,
    IdentityProviderValue,
    type IdentityProvider,
    type IdentityProviderConfigStatus,
    type IdentityProviderSearchGrantMode
} from '@poms/shared-contracts';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const IdentityProviderConfigSchema = defineEntity({
    name: 'IdentityProviderConfig',
    tableName: 'identity_provider_config',
    schema: 'poms',
    comment: '外部身份提供商配置',
    indexes: [
        {
            name: 'uq_identity_provider_config_provider_tenant',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.provider}", coalesce("${columns.tenantId}", ''))`
        },
        { name: 'idx_identity_provider_config_provider_status', properties: ['provider', 'status'] },
        { name: 'idx_identity_provider_config_enabled_login', properties: ['enabled', 'loginEnabled'] }
    ],
    checks: [
        {
            name: 'chk_identity_provider_config_provider',
            expression: `"provider" in (${toSqlStringList(IDENTITY_PROVIDERS)})`
        },
        {
            name: 'chk_identity_provider_config_status',
            expression: `"status" in (${toSqlStringList(IDENTITY_PROVIDER_CONFIG_STATUSES)})`
        },
        {
            name: 'chk_identity_provider_config_search_grant_mode',
            expression: `"search_grant_mode" in (${toSqlStringList(IDENTITY_PROVIDER_SEARCH_GRANT_MODES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        provider: p.string().$type<IdentityProvider>().length(32).default(IdentityProviderValue.Feishu),
        tenantId: p.string().length(128).nullable().fieldName('tenant_id'),
        displayName: p.string().length(128).fieldName('display_name'),
        status: p.string().$type<IdentityProviderConfigStatus>().length(32).default(IdentityProviderConfigStatusValue.Draft),
        enabled: p.boolean().default(false),
        loginEnabled: p.boolean().default(false).fieldName('login_enabled'),
        bindingEnabled: p.boolean().default(false).fieldName('binding_enabled'),
        searchEnabled: p.boolean().default(false).fieldName('search_enabled'),
        clientId: p.string().length(255).fieldName('client_id'),
        encryptedClientSecret: p.text().nullable().fieldName('encrypted_client_secret').comment('加密后的 provider client secret，API 不返回明文'),
        secretUpdatedAt: p.datetime().nullable().fieldName('secret_updated_at'),
        redirectUri: p.string().length(512).nullable().fieldName('redirect_uri').comment('外部登录 OAuth redirect URI'),
        searchRedirectUri: p.string().length(512).nullable().fieldName('search_redirect_uri').comment('管理员搜索授权 OAuth redirect URI'),
        loginScopes: p.json<string[]>().default([]).fieldName('login_scopes_json'),
        searchScopes: p.json<string[]>().default([]).fieldName('search_scopes_json'),
        tenantAllowlist: p.json<string[]>().default([]).fieldName('tenant_allowlist_json'),
        searchGrantMode: p.string().$type<IdentityProviderSearchGrantMode>().length(32).default(IdentityProviderSearchGrantModeValue.PerAdmin).fieldName('search_grant_mode'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class IdentityProviderConfig extends IdentityProviderConfigSchema.class {}

IdentityProviderConfigSchema.setClass(IdentityProviderConfig);
