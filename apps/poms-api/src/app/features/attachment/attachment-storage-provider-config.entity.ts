import { defineEntity } from '@mikro-orm/core';
import {
    ATTACHMENT_STORAGE_PROVIDER_CONFIG_STATUSES,
    ATTACHMENT_STORAGE_PROVIDER_TYPES,
    AttachmentStorageProviderConfigStatusValue,
    AttachmentStorageProviderTypeValue,
    type AttachmentStorageProviderConfigStatus,
    type AttachmentStorageProviderType
} from '@poms/shared-contracts';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const AttachmentStorageProviderConfigSchema = defineEntity({
    name: 'AttachmentStorageProviderConfig',
    tableName: 'attachment_storage_provider_config',
    schema: 'poms',
    comment: '附件存储 Provider 配置',
    indexes: [
        {
            name: 'uq_attachment_storage_provider_enabled_location',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.providerType}", coalesce("${columns.bucket}", ''), coalesce("${columns.keyPrefix}", '')) where "${columns.enabled}" = true`
        },
        {
            name: 'uq_attachment_storage_provider_default',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.isDefault}") where "${columns.enabled}" = true and "${columns.isDefault}" = true`
        },
        { name: 'idx_attachment_storage_provider_type_status', properties: ['providerType', 'status'] },
        { name: 'idx_attachment_storage_provider_enabled_default', properties: ['enabled', 'isDefault'] }
    ],
    checks: [
        {
            name: 'chk_attachment_storage_provider_type',
            expression: `"provider_type" in (${toSqlStringList(ATTACHMENT_STORAGE_PROVIDER_TYPES)})`
        },
        {
            name: 'chk_attachment_storage_provider_status',
            expression: `"status" in (${toSqlStringList(ATTACHMENT_STORAGE_PROVIDER_CONFIG_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        providerType: p.string().$type<AttachmentStorageProviderType>().length(32).default(AttachmentStorageProviderTypeValue.Local).fieldName('provider_type'),
        displayName: p.string().length(128).fieldName('display_name'),
        status: p.string().$type<AttachmentStorageProviderConfigStatus>().length(32).default(AttachmentStorageProviderConfigStatusValue.Draft),
        enabled: p.boolean().default(false),
        isDefault: p.boolean().default(false).fieldName('is_default'),
        endpoint: p.string().length(512).nullable(),
        region: p.string().length(128).nullable(),
        bucket: p.string().length(255).nullable(),
        keyPrefix: p.string().length(512).nullable().fieldName('key_prefix'),
        forcePathStyle: p.boolean().default(false).fieldName('force_path_style'),
        encryptedAccessKeyId: p.text().nullable().fieldName('encrypted_access_key_id').comment('加密后的 OBS access key id，API 不返回明文'),
        encryptedSecretAccessKey: p.text().nullable().fieldName('encrypted_secret_access_key').comment('加密后的 OBS secret access key，API 不返回明文'),
        credentialsUpdatedAt: p.datetime().nullable().fieldName('credentials_updated_at'),
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

export class AttachmentStorageProviderConfig extends AttachmentStorageProviderConfigSchema.class {}

AttachmentStorageProviderConfigSchema.setClass(AttachmentStorageProviderConfig);
