import { OperatingEvaluationEvidence } from './rust-r4ghi-entities.entity';
import { defineEntity } from '@mikro-orm/core';
import {
    OPERATING_DATA_MATURITY_LEVELS,
    OPERATING_LIFECYCLE_STATUSES,
    OPERATING_SNAPSHOT_ACTION_LEVELS,
    OperatingDataMaturityLevelValue,
    OperatingLifecycleStatusValue,
    OperatingSnapshotActionLevelValue,
    type OperatingDataMaturityLevel,
    type OperatingLifecycleStatus,
    type OperatingSnapshotActionLevel
} from '@poms/shared-contracts';
import { Project } from '../project/project.entity';
import { ProjectOperatingSnapshot } from './project-operating-snapshot.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const DataMaturityEvaluationResultSchema = defineEntity({
    name: 'DataMaturityEvaluationResult',
    tableName: 'data_maturity_evaluation_result',
    schema: 'poms',
    comment: '经营数据成熟度结果',
    indexes: [
        {
            name: 'idx_dmer_project_evaluated_at',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.evaluatedAt}" desc)`
        },
        { name: 'idx_dmer_level_status', properties: ['dataMaturityLevel', 'status'] },
        { name: 'idx_dmer_referenced_snapshot', properties: ['referencedSnapshotId'] }
    ],
    uniques: [
        {
            name: 'uq_dmer_project_snapshot_active',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.referencedSnapshotId}") where "${columns.status}" = '${OperatingLifecycleStatusValue.Active}'`
        },
        {"name":"uq_jghi_dmer_scope","properties":["id","projectId","referencedSnapshotId"]}
    ],
    checks: [
        {
            name: 'chk_data_maturity_evaluation_result_data_maturity_level',
            expression: `"data_maturity_level" in (${toSqlStringList(OPERATING_DATA_MATURITY_LEVELS)})`
        },
        {
            name: 'chk_data_maturity_evaluation_result_cost_action_recommendation',
            expression: `"cost_action_recommendation" in (${toSqlStringList(OPERATING_SNAPSHOT_ACTION_LEVELS)})`
        },
        {
            name: 'chk_data_maturity_evaluation_result_status',
            expression: `"status" in (${toSqlStringList(OPERATING_LIFECYCLE_STATUSES)})`
        },
        {"name":"ck_jghi_dmer_v1","expression":"producer_version=0 OR (producer_version=1 AND evidence_id IS NOT NULL\n  AND tax_pending_knowledge IS NOT NULL AND tax_pending_knowledge IN ('known','unknown')\n  AND ((tax_pending_knowledge='known' AND tax_impact_pending_amount IS NOT NULL)\n    OR (tax_pending_knowledge='unknown' AND tax_impact_pending_amount IS NULL)))"}
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        referencedSnapshotId: () =>
            p.manyToOne(ProjectOperatingSnapshot).mapToPk().fieldName('referenced_snapshot_id').comment('引用经营快照'),
        dataMaturityLevel: p.string().$type<OperatingDataMaturityLevel>().length(32).default(OperatingDataMaturityLevelValue.Insufficient).fieldName('data_maturity_level').comment('数据成熟度等级'),
        costActionRecommendation: p.string().$type<OperatingSnapshotActionLevel>().length(32).default(OperatingSnapshotActionLevelValue.Review).fieldName('cost_action_recommendation').comment('成本侧动作建议'),
        taxImpactPendingAmount: p.decimal().precision(18).scale(2).default(0).fieldName('tax_impact_pending_amount').comment('待闭合税务影响金额').nullable(),
        allocationStabilitySummary: p.text().nullable().fieldName('allocation_stability_summary').comment('分摊稳定性摘要'),
        unmappedCostSummary: p.text().nullable().fieldName('unmapped_cost_summary').comment('未映射成本摘要'),
        evaluationBasisJson: p.json<Record<string, unknown>>().defaultRaw(`'{}'::jsonb`).fieldName('evaluation_basis_json').comment('成熟度判定依据'),
        evaluatedAt: p.datetime().defaultRaw('now()').fieldName('evaluated_at').comment('评估时间'),
        status: p.string().$type<OperatingLifecycleStatus>().length(32).default(OperatingLifecycleStatusValue.Active).comment('状态：active/superseded/voided'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    ,
        producerVersion: p.smallint().default(0).fieldName("producer_version"),
        evidenceId: p.uuid().nullable().fieldName("evidence_id"),
        taxPendingKnowledge: p.string().length(16).nullable().fieldName("tax_pending_knowledge"),
        jghiScopeConstraint1: () => p.manyToOne(OperatingEvaluationEvidence).mapToPk().joinColumns("evidence_id","project_id","referenced_snapshot_id").referencedColumnNames("id","project_id","snapshot_id").columnTypes("uuid","uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_jghi_dmer_evidence").deleteRule("no action").updateRule("no action").nullable()
    }
});

export class DataMaturityEvaluationResult extends DataMaturityEvaluationResultSchema.class {}

DataMaturityEvaluationResultSchema.setClass(DataMaturityEvaluationResult);
