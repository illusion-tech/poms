import { defineEntity } from '@mikro-orm/core';
import { ORG_SYNC_RUN_STATUSES, OrgSyncRunStatusValue, type OrgSyncRunStatus } from '@poms/shared-contracts';
import { PlatformUser } from '../platform/platform-user.entity';
import { ExternalOrgSource } from './external-org-source.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const OrgSyncRunSchema = defineEntity({
    name: 'OrgSyncRun',
    tableName: 'org_sync_run',
    schema: 'poms',
    comment: '外部组织同步预览或应用运行记录',
    indexes: [
        { name: 'idx_org_sync_run_source_status', properties: ['sourceId', 'status'] },
        { name: 'idx_org_sync_run_status_started_at', properties: ['status', 'startedAt'] },
        { name: 'idx_org_sync_run_requested_by', properties: ['requestedBy'] }
    ],
    checks: [
        {
            name: 'chk_org_sync_run_status',
            expression: `"status" in (${toSqlStringList(ORG_SYNC_RUN_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        sourceId: () =>
            p
                .manyToOne(ExternalOrgSource)
                .mapToPk()
                .fieldName('source_id')
                .foreignKeyName('org_sync_run_source_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        status: p.string().$type<OrgSyncRunStatus>().length(32).default(OrgSyncRunStatusValue.Previewing),
        requestedBy: () =>
            p
                .manyToOne(PlatformUser)
                .mapToPk()
                .nullable()
                .fieldName('requested_by')
                .foreignKeyName('org_sync_run_requested_by_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        startedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('started_at'),
        finishedAt: p.datetime().nullable().fieldName('finished_at'),
        totalItemCount: p.integer().default(0).fieldName('total_item_count'),
        approvedItemCount: p.integer().default(0).fieldName('approved_item_count'),
        skippedItemCount: p.integer().default(0).fieldName('skipped_item_count'),
        failedItemCount: p.integer().default(0).fieldName('failed_item_count'),
        errorSummary: p.text().nullable().fieldName('error_summary'),
        requestSnapshot: p.json<Record<string, unknown>>().defaultRaw(`'{}'::jsonb`).fieldName('request_snapshot_json'),
        resultSummary: p.json<Record<string, unknown>>().defaultRaw(`'{}'::jsonb`).fieldName('result_summary_json'),
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

export class OrgSyncRun extends OrgSyncRunSchema.class {}

OrgSyncRunSchema.setClass(OrgSyncRun);
