import { defineEntity } from '@mikro-orm/core';
import {
    COST_STAGE_ATTRIBUTION_MODES,
    OPERATING_LIFECYCLE_STATUSES,
    CostStageAttributionModeValue,
    OperatingLifecycleStatusValue,
    type CostStageAttributionMode,
    type OperatingLifecycleStatus
} from '@poms/shared-contracts';
import { ProjectActualCostRecord } from './project-actual-cost-record.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const CostStageAttributionSnapshotSchema = defineEntity({
    name: 'CostStageAttributionSnapshot',
    tableName: 'cost_stage_attribution_snapshot',
    schema: 'poms',
    comment: '成本阶段归属锁定与重分类快照',
    indexes: [
        {
            name: 'idx_csas_cost_record_handled',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.costRecordId}", "${columns.handledAt}" desc)`
        },
        { name: 'idx_csas_stage_status', properties: ['attributedStage', 'status'] }
    ],
    uniques: [
        {
            name: 'uq_csas_cost_record_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.costRecordId}") where "${columns.status}" = '${OperatingLifecycleStatusValue.Active}'`
        }
    ],
    checks: [
        {
            name: 'chk_cost_stage_attribution_snapshot_attribution_mode',
            expression: `"attribution_mode" in (${toSqlStringList(COST_STAGE_ATTRIBUTION_MODES)})`
        },
        {
            name: 'chk_cost_stage_attribution_snapshot_status',
            expression: `"status" in (${toSqlStringList(OPERATING_LIFECYCLE_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        costRecordId: () => p.manyToOne(ProjectActualCostRecord).mapToPk().fieldName('cost_record_id').comment('关联成本记录'),
        attributedStage: p.string().length(64).fieldName('attributed_stage').comment('归属执行阶段'),
        attributionMode: p.string().$type<CostStageAttributionMode>().length(64).default(CostStageAttributionModeValue.Manual).fieldName('attribution_mode').comment('归属模式：auto/manual/reclassified'),
        lockedBySnapshotId: p.uuid().nullable().fieldName('locked_by_snapshot_id').comment('锁定快照 ID'),
        attributionSummary: p.text().nullable().fieldName('attribution_summary').comment('归属依据说明'),
        status: p.string().$type<OperatingLifecycleStatus>().length(32).default(OperatingLifecycleStatusValue.Active).comment('状态：active/superseded/voided'),
        supersedesId: p.uuid().nullable().fieldName('supersedes_id').comment('被替代的旧归属快照 ID'),
        handledAt: p.datetime().nullable().fieldName('handled_at').comment('操作时间'),
        handledBy: p.uuid().nullable().fieldName('handled_by').comment('操作人'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class CostStageAttributionSnapshot extends CostStageAttributionSnapshotSchema.class {}

CostStageAttributionSnapshotSchema.setClass(CostStageAttributionSnapshot);
