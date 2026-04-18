import { defineEntity } from '@mikro-orm/core';
import { Project } from '../project/project.entity';
import { ProjectOperatingSnapshot } from './project-operating-snapshot.entity';

const p = defineEntity.properties;

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
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.referencedSnapshotId}") where "${columns.status}" = 'active'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        referencedSnapshotId: () =>
            p.manyToOne(ProjectOperatingSnapshot).mapToPk().fieldName('referenced_snapshot_id').comment('引用经营快照'),
        dataMaturityLevel: p.string().length(32).fieldName('data_maturity_level').comment('数据成熟度等级'),
        costActionRecommendation: p.string().length(32).fieldName('cost_action_recommendation').comment('成本侧动作建议'),
        taxImpactPendingAmount: p.decimal().precision(18).scale(2).default(0).fieldName('tax_impact_pending_amount').comment('待闭合税务影响金额'),
        allocationStabilitySummary: p.text().nullable().fieldName('allocation_stability_summary').comment('分摊稳定性摘要'),
        unmappedCostSummary: p.text().nullable().fieldName('unmapped_cost_summary').comment('未映射成本摘要'),
        evaluationBasisJson: p.json<Record<string, unknown>>().defaultRaw(`'{}'::jsonb`).fieldName('evaluation_basis_json').comment('成熟度判定依据'),
        evaluatedAt: p.datetime().defaultRaw('now()').fieldName('evaluated_at').comment('评估时间'),
        status: p.string().length(32).default('active').comment('状态：active/superseded/voided'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class DataMaturityEvaluationResult extends DataMaturityEvaluationResultSchema.class {}

DataMaturityEvaluationResultSchema.setClass(DataMaturityEvaluationResult);
