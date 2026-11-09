import { defineEntity } from '@mikro-orm/core';
import { ORG_SYNC_DIFF_ACTIONS, ORG_SYNC_DIFF_ITEM_STATUSES, OrgSyncDiffActionValue, OrgSyncDiffItemStatusValue, type OrgSyncDiffAction, type OrgSyncDiffItemStatus } from '@poms/shared-contracts';
import { OrgUnit } from '../platform/org-unit.entity';
import { OrgSyncRun } from './org-sync-run.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const OrgSyncDiffItemSchema = defineEntity({
    name: 'OrgSyncDiffItem',
    tableName: 'org_sync_diff_item',
    schema: 'poms',
    comment: '外部组织同步候选变更项',
    indexes: [
        { name: 'idx_org_sync_diff_item_run_status', properties: ['runId', 'status'] },
        { name: 'idx_org_sync_diff_item_action_status', properties: ['action', 'status'] },
        { name: 'idx_org_sync_diff_item_org_unit_id', properties: ['orgUnitId'] }
    ],
    uniques: [{ name: 'uq_org_sync_diff_item_run_department_action', properties: ['runId', 'externalDepartmentId', 'action'] }],
    checks: [
        {
            name: 'chk_org_sync_diff_item_action',
            expression: `"action" in (${toSqlStringList(ORG_SYNC_DIFF_ACTIONS)})`
        },
        {
            name: 'chk_org_sync_diff_item_status',
            expression: `"status" in (${toSqlStringList(ORG_SYNC_DIFF_ITEM_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        runId: () =>
            p
                .manyToOne(OrgSyncRun)
                .mapToPk()
                .fieldName('run_id')
                .foreignKeyName('org_sync_diff_item_run_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        externalDepartmentId: p.string().length(255).fieldName('external_department_id'),
        action: p.string().$type<OrgSyncDiffAction>().length(64).default(OrgSyncDiffActionValue.Conflict),
        status: p.string().$type<OrgSyncDiffItemStatus>().length(32).default(OrgSyncDiffItemStatusValue.Pending),
        orgUnitId: () =>
            p
                .manyToOne(OrgUnit)
                .mapToPk()
                .nullable()
                .fieldName('org_unit_id')
                .foreignKeyName('org_sync_diff_item_org_unit_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        beforeSnapshot: p.json<Record<string, unknown>>().nullable().fieldName('before_snapshot_json'),
        candidateSnapshot: p.json<Record<string, unknown>>().defaultRaw(`'{}'::jsonb`).fieldName('candidate_snapshot_json'),
        errorMessage: p.text().nullable().fieldName('error_message'),
        appliedAt: p.datetime().nullable().fieldName('applied_at'),
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

export class OrgSyncDiffItem extends OrgSyncDiffItemSchema.class {}

OrgSyncDiffItemSchema.setClass(OrgSyncDiffItem);
