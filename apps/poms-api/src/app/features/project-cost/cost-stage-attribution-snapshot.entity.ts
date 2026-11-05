import { CostGovernanceEvidence } from "./cost-governance-evidence.entity";
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
        },
        { name: "uq_r4f_stage_successor", expression: "CREATE UNIQUE INDEX uq_r4f_stage_successor ON poms.cost_stage_attribution_snapshot USING btree (supersedes_id) WHERE (supersedes_id IS NOT NULL)" }
    ],
    checks: [
        {
            name: 'chk_cost_stage_attribution_snapshot_attribution_mode',
            expression: `"attribution_mode" in (${toSqlStringList(COST_STAGE_ATTRIBUTION_MODES)})`
        },
        {
            name: 'chk_cost_stage_attribution_snapshot_status',
            expression: `"status" in (${toSqlStringList(OPERATING_LIFECYCLE_STATUSES)})`
        },
        { name: "chk_r4f_stage_v1", expression: "(((governance_schema_version = 0) OR ((governance_schema_version = 1) AND (evidence_business_date IS NOT NULL) AND (governance_evidence_id IS NOT NULL) AND (handled_at IS NOT NULL) AND (handled_by IS NOT NULL))))" }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        costRecordId: () => p.manyToOne(ProjectActualCostRecord).mapToPk().fieldName('cost_record_id').comment('关联成本记录'),
        attributedStage: p.string().length(64).fieldName('attributed_stage').comment('归属执行阶段'),
        attributionMode: p.string().$type<CostStageAttributionMode>().length(64).default(CostStageAttributionModeValue.Manual).fieldName('attribution_mode').comment('归属模式：auto/manual/reclassified'),
        lockedBySnapshotId: p.uuid().nullable().fieldName('locked_by_snapshot_id').comment('锁定快照 ID'),
        attributionSummary: p.text().nullable().fieldName('attribution_summary').comment('归属依据说明'),
        status: p.string().$type<OperatingLifecycleStatus>().length(32).default(OperatingLifecycleStatusValue.Active).comment('状态：active/superseded/voided'),
        supersedesId: () => p.manyToOne(CostStageAttributionSnapshot).mapToPk().nullable().fieldName("supersedes_id").foreignKeyName("fk_r4f_stage_supersedes").updateRule('no action').deleteRule("no action").comment('被替代的旧归属快照 ID'),
        handledAt: p.datetime().nullable().fieldName('handled_at').comment('操作时间'),
        handledBy: p.uuid().nullable().fieldName('handled_by').comment('操作人'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        evidenceBusinessDate: p.date().nullable().fieldName("evidence_business_date"),
        governanceEvidenceId: () => p.manyToOne(CostGovernanceEvidence).mapToPk().nullable().fieldName("governance_evidence_id").foreignKeyName("cost_stage_attribution_snapshot_governance_evidence_id_fkey").updateRule('no action').deleteRule("no action"),
        governanceSchemaVersion: p.integer().columnType('smallint').default(1).fieldName("governance_schema_version")
    }
});

export class CostStageAttributionSnapshot extends CostStageAttributionSnapshotSchema.class {}

CostStageAttributionSnapshotSchema.setClass(CostStageAttributionSnapshot);
