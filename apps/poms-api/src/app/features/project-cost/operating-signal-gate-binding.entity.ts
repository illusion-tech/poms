import { defineEntity } from '@mikro-orm/core';
import { Project } from '../project/project.entity';
import { OperatingSignalEvaluationResult } from './operating-signal-evaluation-result.entity';

const p = defineEntity.properties;

export const OperatingSignalToCommissionGateBindingSchema = defineEntity({
    name: 'OperatingSignalToCommissionGateBinding',
    tableName: 'operating_signal_gate_binding',
    schema: 'poms',
    comment: '经营信号到提成 gate 的绑定结果',
    indexes: [
        {
            name: 'idx_osgb_project_generated_at',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.generatedAt}" desc)`
        },
        { name: 'idx_osgb_binding_status', properties: ['bindingAction', 'status'] },
        { name: 'idx_osgb_signal_evaluation', properties: ['signalEvaluationId'] }
    ],
    uniques: [
        {
            name: 'uq_osgb_project_gate_stage_active',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.gateStageType}") where "${columns.status}" = 'active'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        signalEvaluationId: () =>
            p.manyToOne(OperatingSignalEvaluationResult).mapToPk().fieldName('signal_evaluation_id').comment('关联经营信号结果'),
        bindingAction: p.string().length(32).fieldName('binding_action').comment('绑定动作'),
        gateStageType: p.string().length(32).fieldName('gate_stage_type').comment('gate 阶段类型'),
        baselineSelectionSource: p.string().length(32).fieldName('baseline_selection_source').comment('基线选择来源'),
        taxImpactSummary: p.text().fieldName('tax_impact_summary').comment('税务影响摘要'),
        taxImpactPendingAmount: p.decimal().precision(18).scale(2).default(0).fieldName('tax_impact_pending_amount').comment('待闭合税务影响金额'),
        allocationStabilitySummary: p.text().nullable().fieldName('allocation_stability_summary').comment('分摊稳定性摘要'),
        unmappedCostSummary: p.text().nullable().fieldName('unmapped_cost_summary').comment('未映射成本摘要'),
        dataMaturityLevel: p.string().length(32).fieldName('data_maturity_level').comment('数据成熟度等级'),
        costActionRecommendation: p.string().length(32).fieldName('cost_action_recommendation').comment('成本侧动作建议'),
        currentActionLevel: p.string().length(32).fieldName('current_action_level').comment('当前动作等级'),
        nextActionSummary: p.text().nullable().fieldName('next_action_summary').comment('下一步动作摘要'),
        downstreamConsumerSummary: p.text().nullable().fieldName('downstream_consumer_summary').comment('下游消费摘要'),
        referencedBaselineVersion: p.string().length(64).fieldName('referenced_baseline_version').comment('引用基线版本'),
        referencedSnapshotVersion: p.string().length(64).fieldName('referenced_snapshot_version').comment('引用快照版本'),
        generatedAt: p.datetime().defaultRaw('now()').fieldName('generated_at').comment('生成时间'),
        status: p.string().length(32).default('active').comment('状态：active/superseded/voided'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class OperatingSignalToCommissionGateBinding extends OperatingSignalToCommissionGateBindingSchema.class {}

OperatingSignalToCommissionGateBindingSchema.setClass(OperatingSignalToCommissionGateBinding);
