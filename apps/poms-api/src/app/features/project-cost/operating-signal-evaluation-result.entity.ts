import { defineEntity } from '@mikro-orm/core';
import { Project } from '../project/project.entity';
import { DataMaturityEvaluationResult } from './data-maturity-evaluation-result.entity';
import { ProjectOperatingSnapshot } from './project-operating-snapshot.entity';

const p = defineEntity.properties;

export const OperatingSignalEvaluationResultSchema = defineEntity({
    name: 'OperatingSignalEvaluationResult',
    tableName: 'operating_signal_evaluation_result',
    schema: 'poms',
    comment: '经营信号与偏差解释结果',
    indexes: [
        {
            name: 'idx_oser_project_evaluated_at',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.evaluatedAt}" desc)`
        },
        { name: 'idx_oser_signal_status', properties: ['signalLevel', 'status'] },
        { name: 'idx_oser_data_maturity', properties: ['dataMaturityEvaluationId'] },
        { name: 'idx_oser_referenced_snapshot', properties: ['referencedSnapshotId'] }
    ],
    uniques: [
        {
            name: 'uq_oser_project_snapshot_active',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.referencedSnapshotId}") where "${columns.status}" = 'active'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        referencedSnapshotId: () =>
            p
                .manyToOne(ProjectOperatingSnapshot)
                .mapToPk()
                .fieldName('referenced_snapshot_id')
                .foreignKeyName('oser_referenced_snapshot_fk')
                .comment('引用经营快照'),
        dataMaturityEvaluationId: () =>
            p
                .manyToOne(DataMaturityEvaluationResult)
                .mapToPk()
                .fieldName('data_maturity_evaluation_id')
                .foreignKeyName('oser_data_maturity_evaluation_fk')
                .comment('引用数据成熟度结果'),
        signalLevel: p.string().length(32).fieldName('signal_level').comment('经营信号等级'),
        riskLevel: p.string().length(32).fieldName('risk_level').comment('风险等级'),
        formulaBoundaryAction: p.string().length(32).fieldName('formula_boundary_action').comment('公式边界动作'),
        varianceSourceSummary: p.text().fieldName('variance_source_summary').comment('偏差来源摘要'),
        taxImpactSummary: p.text().fieldName('tax_impact_summary').comment('税务影响摘要'),
        allocationStabilitySummary: p.text().nullable().fieldName('allocation_stability_summary').comment('分摊稳定性摘要'),
        unmappedCostSummary: p.text().nullable().fieldName('unmapped_cost_summary').comment('未映射成本摘要'),
        currentActionLevel: p.string().length(32).fieldName('current_action_level').comment('当前动作等级'),
        recommendedActionSummary: p.text().nullable().fieldName('recommended_action_summary').comment('建议动作摘要'),
        referencedBaselineVersion: p.string().length(64).fieldName('referenced_baseline_version').comment('引用基线版本'),
        referencedSnapshotVersion: p.string().length(64).fieldName('referenced_snapshot_version').comment('引用快照版本'),
        reviewRequired: p.boolean().default(false).fieldName('review_required').comment('是否需要人工复核'),
        evaluatedAt: p.datetime().defaultRaw('now()').fieldName('evaluated_at').comment('评估时间'),
        status: p.string().length(32).default('active').comment('状态：active/superseded/voided'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class OperatingSignalEvaluationResult extends OperatingSignalEvaluationResultSchema.class {}

OperatingSignalEvaluationResultSchema.setClass(OperatingSignalEvaluationResult);
