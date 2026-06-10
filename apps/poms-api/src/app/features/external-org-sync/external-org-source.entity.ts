import { defineEntity } from '@mikro-orm/core';
import { EXTERNAL_ORG_PROVIDERS, EXTERNAL_ORG_SOURCE_STATUSES, ExternalOrgProviderValue, ExternalOrgSourceStatusValue, type ExternalOrgProvider, type ExternalOrgSourceStatus } from '@poms/shared-contracts';
import { IdentityProviderConfig } from '../identity-provider/identity-provider-config.entity';
import { OrgUnit } from '../platform/org-unit.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const ExternalOrgSourceSchema = defineEntity({
    name: 'ExternalOrgSource',
    tableName: 'external_org_source',
    schema: 'poms',
    comment: '外部组织同步源',
    indexes: [
        {
            name: 'uq_external_org_source_provider_tenant',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.provider}", coalesce("${columns.externalTenantId}", ''))`
        },
        {
            name: 'uq_external_org_source_active_authoritative_org',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" (coalesce("${columns.authoritativeOrgUnitId}", '00000000-0000-0000-0000-000000000000'::uuid)) where "${columns.status}" = 'active'`
        },
        { name: 'idx_external_org_source_provider_status', properties: ['provider', 'status'] },
        { name: 'idx_external_org_source_provider_config_id', properties: ['providerConfigId'] },
        { name: 'idx_external_org_source_authoritative_org', properties: ['authoritativeOrgUnitId'] }
    ],
    checks: [
        {
            name: 'chk_external_org_source_provider',
            expression: `"provider" in (${toSqlStringList(EXTERNAL_ORG_PROVIDERS)})`
        },
        {
            name: 'chk_external_org_source_status',
            expression: `"status" in (${toSqlStringList(EXTERNAL_ORG_SOURCE_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        provider: p.string().$type<ExternalOrgProvider>().length(32).default(ExternalOrgProviderValue.Feishu),
        externalTenantId: p.string().length(128).nullable().fieldName('external_tenant_id'),
        displayName: p.string().length(128).fieldName('display_name'),
        status: p.string().$type<ExternalOrgSourceStatus>().length(32).default(ExternalOrgSourceStatusValue.Draft),
        providerConfigId: () =>
            p
                .manyToOne(IdentityProviderConfig)
                .mapToPk()
                .nullable()
                .fieldName('provider_config_id')
                .foreignKeyName('external_org_source_provider_config_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        authoritativeOrgUnitId: () =>
            p
                .manyToOne(OrgUnit)
                .mapToPk()
                .nullable()
                .fieldName('authoritative_org_unit_id')
                .foreignKeyName('external_org_source_authoritative_org_unit_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict'),
        externalRootDepartmentId: p.string().length(255).nullable().fieldName('external_root_department_id'),
        syncScopes: p.json<string[]>().default([]).fieldName('sync_scopes_json'),
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

export class ExternalOrgSource extends ExternalOrgSourceSchema.class {}

ExternalOrgSourceSchema.setClass(ExternalOrgSource);
