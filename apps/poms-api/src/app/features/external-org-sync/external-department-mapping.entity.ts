import { defineEntity } from '@mikro-orm/core';
import { EXTERNAL_DEPARTMENT_MAPPING_STATUSES, ExternalDepartmentMappingStatusValue, type ExternalDepartmentMappingStatus } from '@poms/shared-contracts';
import { OrgUnit } from '../platform/org-unit.entity';
import { ExternalOrgSource } from './external-org-source.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const ExternalDepartmentMappingSchema = defineEntity({
    name: 'ExternalDepartmentMapping',
    tableName: 'external_department_mapping',
    schema: 'poms',
    comment: '外部部门到 POMS 组织单元的映射',
    indexes: [
        {
            name: 'uq_external_department_mapping_mapped_org',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.sourceId}", "${columns.orgUnitId}") where "${columns.orgUnitId}" is not null and "${columns.status}" = 'mapped'`
        },
        { name: 'idx_external_department_mapping_source_status', properties: ['sourceId', 'status'] },
        { name: 'idx_external_department_mapping_org_unit_id', properties: ['orgUnitId'] },
        { name: 'idx_external_department_mapping_last_seen_at', properties: ['lastSeenAt'] }
    ],
    uniques: [{ name: 'uq_external_department_mapping_source_department', properties: ['sourceId', 'externalDepartmentId'] }],
    checks: [
        {
            name: 'chk_external_department_mapping_status',
            expression: `"status" in (${toSqlStringList(EXTERNAL_DEPARTMENT_MAPPING_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        sourceId: () =>
            p
                .manyToOne(ExternalOrgSource)
                .mapToPk()
                .fieldName('source_id')
                .foreignKeyName('external_department_mapping_source_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        externalDepartmentId: p.string().length(255).fieldName('external_department_id'),
        externalParentDepartmentId: p.string().length(255).nullable().fieldName('external_parent_department_id'),
        externalDepartmentName: p.string().length(255).fieldName('external_department_name'),
        orgUnitId: () =>
            p
                .manyToOne(OrgUnit)
                .mapToPk()
                .nullable()
                .fieldName('org_unit_id')
                .foreignKeyName('external_department_mapping_org_unit_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        status: p.string().$type<ExternalDepartmentMappingStatus>().length(32).default(ExternalDepartmentMappingStatusValue.Unmapped),
        externalSnapshot: p.json<Record<string, unknown>>().defaultRaw(`'{}'::jsonb`).fieldName('external_snapshot_json'),
        lastSeenAt: p.datetime().nullable().fieldName('last_seen_at'),
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

export class ExternalDepartmentMapping extends ExternalDepartmentMappingSchema.class {}

ExternalDepartmentMappingSchema.setClass(ExternalDepartmentMapping);
